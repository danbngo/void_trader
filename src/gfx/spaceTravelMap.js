/**
 * Space Travel Map
 * 3D space view used during travel (initial prototype)
 */

const SpaceTravelMap = (() => {
    // === Tunable constants ===
    const VIEW_FOV = 75; // degrees
    const NEAR_PLANE = 0.0001;
    const PANEL_HEIGHT = 7; // rows for HUD + buttons

    const LY_TO_AU = 63241; // 1 LY = 63,241 AU

    const EARTH_SIZE_AU = 1; // Relative scale baseline
    const SHIP_SIZE_AU = EARTH_SIZE_AU / 10000;
    const STATION_SIZE_AU = EARTH_SIZE_AU / 100;

    const SHIP_SPEED_PER_ENGINE = 1; // ship sizes per second per engine point
    const SHIP_ACCEL_PER_ENGINE = 2; // ship sizes per second^2 per engine point
    const TURN_DEG_PER_SEC = 90; // turn rate

    const STAR_RENDER_DISTANCE_AU = 2_000_000; // distance to render stars
    const STARFIELD_RADIUS_AU = 8_000_000;
    const STARFIELD_COUNT = 1200;

    const DUST_PARTICLE_COUNT = 20;
    const DUST_PARTICLE_RANGE_SHIP_LENGTHS = 100;
    const DUST_PARTICLE_SPAWN_RADIUS_SHIP_LENGTHS = 60;
    const DUST_PARTICLE_SYMBOL = '·';
    const DUST_PARTICLE_LINE_SYMBOLS = true;
    const DUST_PARTICLE_LINE_SPEED_THRESHOLD = 0.0002;
    const DUST_PARTICLE_VELOCITY_BIAS = 0.25;
    const DUST_PARTICLE_MIN_DISTANCE_SHIP_LENGTHS = 5;
    const DUST_PARTICLE_MAX_DISTANCE_SHIP_LENGTHS = 80;
    const DUST_PARTICLE_EDGE_BAND_SHIP_LENGTHS = 15;
    const DUST_SCREEN_SPEED_EPSILON = 0.00005;
    const DUST_DEPTH_THRESHOLD = 0.0002;
    const DUST_RADIAL_DEPTH_SCALE = 3.5;
    const STATION_POSSIBLE_RANGE_AU = 5_000_000;
    const STATION_VISIBLE_RANGE_AU = 1_500_000;

    const DEBUG_STATION_LOG = false;
    const DEBUG_STATION_VISIBILITY = true;
    const STATION_FACE_DEPTH_BIAS = 0.0005;
    const STATION_EDGE_DEPTH_BIAS = 0.0005;

    const POSSIBLE_STATION_CHECK_FRAMES = 300;
    const VISIBLE_STATION_CHECK_FRAMES = 30;

    // === State ===
    let currentGameState = null;
    let targetSystem = null;
    let playerShip = null;
    let currentStation = null;

    let starSystems = [];
    let starfield = [];
    let dustParticles = [];
    let possibleStations = [];
    let visibleStations = [];

    let frameCount = 0;
    let lastTimestamp = 0;
    let animationId = null;

    const keyState = new Set();
    let keyDownHandler = null;
    let keyUpHandler = null;

    function show(gameState, destination) {
        stop();
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();

        currentGameState = gameState;
        targetSystem = destination || gameState.destination || getNearestSystem(gameState);
        playerShip = gameState.ships[0];

        if (!playerShip.size || playerShip.size === 1) {
            playerShip.size = SHIP_SIZE_AU;
        }

        // Initialize ship position and velocity
        const currentSystem = gameState.getCurrentSystem();
        const currentSystemPos = {
            x: currentSystem.x * LY_TO_AU,
            y: currentSystem.y * LY_TO_AU,
            z: 0
        };
        playerShip.velocity = { x: 0, y: 0, z: 0 };

        // Create station at destination system
        currentStation = null;
        if (targetSystem) {
            currentStation = new SpaceStation('DESTINATION', STATION_SIZE_AU);
            currentStation.position = {
                x: targetSystem.x * LY_TO_AU,
                y: targetSystem.y * LY_TO_AU,
                z: 0
            };
        }

        if (currentStation) {
            const towardCurrent = subVec(currentSystemPos, currentStation.position);
            const offsetDir = vecLength(towardCurrent) > 0 ? normalizeVec(towardCurrent) : { x: 1, y: 0, z: 0 };
            const startOffset = scaleVec(offsetDir, 0.05);
            playerShip.position = addVec(currentStation.position, startOffset);
        } else {
            playerShip.position = currentSystemPos;
        }

        // Face the station on entry
        if (currentStation) {
            faceToward(playerShip, currentStation.position);
        }

        // Cache star system positions in AU
        starSystems = gameState.systems.map(system => ({
            id: system.name,
            position: {
                x: system.x * LY_TO_AU,
                y: system.y * LY_TO_AU,
                z: 0
            }
        }));

        // Build starfield sphere (background stars)
        starfield = buildStarfield(STARFIELD_COUNT);
        dustParticles = [];

        possibleStations = [];
        visibleStations = [];
        frameCount = 0;
        lastTimestamp = 0;

        updateStationVisibility();

        setupInput();
        startLoop();
    }

    function stop() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (keyDownHandler) {
            document.removeEventListener('keydown', keyDownHandler);
            keyDownHandler = null;
        }
        if (keyUpHandler) {
            document.removeEventListener('keyup', keyUpHandler);
            keyUpHandler = null;
        }
        keyState.clear();
    }

    function setupInput() {
        keyDownHandler = (e) => {
            keyState.add(e.key);
        };
        keyUpHandler = (e) => {
            keyState.delete(e.key);
        };
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);
    }

    function startLoop() {
        const loop = (timestamp) => {
            if (!lastTimestamp) {
                lastTimestamp = timestamp;
            }
            const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
            lastTimestamp = timestamp;

            update(dt);
            render();

            animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);
    }

    function update(dt) {
        if (!playerShip) {
            return;
        }

        frameCount++;

        // Recompute possible/visible stations periodically
        if (frameCount % POSSIBLE_STATION_CHECK_FRAMES === 0 || frameCount % VISIBLE_STATION_CHECK_FRAMES === 0) {
            updateStationVisibility();
        }

        // Rotation controls (relative to current orientation)
        const turnRad = degToRad(TURN_DEG_PER_SEC) * dt;
        const yawLeft = keyState.has('a') || keyState.has('A') || keyState.has('ArrowLeft');
        const yawRight = keyState.has('d') || keyState.has('D') || keyState.has('ArrowRight');
        const pitchUp = keyState.has('ArrowUp');
        const pitchDown = keyState.has('ArrowDown');

        if (yawLeft || yawRight || pitchUp || pitchDown) {
            let newRotation = playerShip.rotation;

            if (yawLeft) {
                newRotation = quatMultiply(newRotation, quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -turnRad));
            }
            if (yawRight) {
                newRotation = quatMultiply(newRotation, quatFromAxisAngle({ x: 0, y: 1, z: 0 }, turnRad));
            }
            if (pitchUp) {
                newRotation = quatMultiply(newRotation, quatFromAxisAngle({ x: 1, y: 0, z: 0 }, -turnRad));
            }
            if (pitchDown) {
                newRotation = quatMultiply(newRotation, quatFromAxisAngle({ x: 1, y: 0, z: 0 }, turnRad));
            }

            playerShip.rotation = quatNormalize(newRotation);
        }

        // Movement controls
        const accelerate = keyState.has('w') || keyState.has('W');
        const brake = keyState.has('s') || keyState.has('S');

        const engine = playerShip.engine || 10;
        const maxSpeed = playerShip.size * engine * SHIP_SPEED_PER_ENGINE;
        const accel = playerShip.size * engine * SHIP_ACCEL_PER_ENGINE;

        const forward = getLocalAxes(playerShip.rotation).forward;

        if (accelerate) {
            playerShip.velocity = addVec(playerShip.velocity, scaleVec(forward, accel * dt));
        }
        if (brake) {
            const currentSpeed = vecLength(playerShip.velocity);
            if (currentSpeed > 0) {
                const decel = accel * dt;
                if (currentSpeed <= decel) {
                    playerShip.velocity = { x: 0, y: 0, z: 0 };
                } else {
                    const brakeDir = normalizeVec(playerShip.velocity);
                    playerShip.velocity = subVec(playerShip.velocity, scaleVec(brakeDir, decel));
                }
            }
        }

        // Clamp speed
        const speed = vecLength(playerShip.velocity);
        if (speed > maxSpeed) {
            playerShip.velocity = scaleVec(playerShip.velocity, maxSpeed / speed);
        }

        // Update position
        playerShip.position = addVec(playerShip.position, scaleVec(playerShip.velocity, dt));

        updateDustParticles();

        if (DEBUG_STATION_LOG) {
            logNearestStationDebug();
        }
    }

    function render() {
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const viewHeight = grid.height - PANEL_HEIGHT;
        const viewWidth = grid.width;

        const depthBuffer = createDepthBuffer(viewWidth, viewHeight);

        renderStars(viewWidth, viewHeight, depthBuffer);
        renderStations(viewWidth, viewHeight, depthBuffer);
        flushDepthBuffer(depthBuffer);
        renderDust(viewWidth, viewHeight);
        renderHud(viewWidth, viewHeight);

        UI.draw();
    }

    function renderStars(viewWidth, viewHeight, depthBuffer) {
        if (!playerShip) {
            return;
        }

        const maxStars = 1000;
        let drawn = 0;

        for (const star of starfield) {
            if (drawn >= maxStars) {
                break;
            }

            const worldPos = addVec(playerShip.position, scaleVec(star.direction, STARFIELD_RADIUS_AU));

            if (distance(playerShip.position, worldPos) > STAR_RENDER_DISTANCE_AU + STARFIELD_RADIUS_AU) {
                continue;
            }

            const projected = projectPoint(worldPos, viewWidth, viewHeight);
            if (!projected) {
                continue;
            }

            const { x, y } = projected;
            if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
                plotDepthText(depthBuffer, x, y, projected.z, '.', COLORS.TEXT_DIM);
                drawn++;
            }
        }
    }

    function renderStations(viewWidth, viewHeight, depthBuffer) {
        if (visibleStations.length === 0) {
            return;
        }

        visibleStations.forEach(station => {
            const size = station.size;
            const half = size / 2;

            const cameraPos = playerShip.position;
            const cameraRot = playerShip.rotation;

            const vertices = [
                { x: -half, y: -half, z: -half },
                { x: half, y: -half, z: -half },
                { x: half, y: half, z: -half },
                { x: -half, y: half, z: -half },
                { x: -half, y: -half, z: half },
                { x: half, y: -half, z: half },
                { x: half, y: half, z: half },
                { x: -half, y: half, z: half }
            ].map(v => addVec(station.position, v));

            const projectedVertices = vertices.map(v => {
                const cameraSpace = rotateVecByQuat(subVec(v, cameraPos), quatConjugate(cameraRot));
                const projected = projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight);
                return { cameraSpace, projected };
            });

            const faces = [
                [0, 1, 2, 3],
                [4, 5, 6, 7],
                [0, 1, 5, 4],
                [1, 2, 6, 5],
                [2, 3, 7, 6],
                [3, 0, 4, 7]
            ];

            faces.forEach(face => {
                const cameraFace = face.map(idx => projectedVertices[idx].cameraSpace);
                const clipped = clipPolygonToNearPlane(cameraFace, NEAR_PLANE);
                if (clipped.length < 3) {
                    return;
                }

                const projected = clipped
                    .map(v => projectCameraSpacePointRaw(v, viewWidth, viewHeight))
                    .filter(p => p !== null);
                if (projected.length < 3) {
                    return;
                }

                for (let i = 1; i < projected.length - 1; i++) {
                    fillDepthTriangle(
                        depthBuffer,
                        { x: projected[0].x, y: projected[0].y, z: clipped[0].z },
                        { x: projected[i].x, y: projected[i].y, z: clipped[i].z },
                        { x: projected[i + 1].x, y: projected[i + 1].y, z: clipped[i + 1].z },
                        '░',
                        COLORS.TEXT_DIM,
                        STATION_FACE_DEPTH_BIAS
                    );
                }
            });

            const edges = [
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7]
            ];

            edges.forEach(([a, b]) => {
                const p1 = projectedVertices[a].projected;
                const p2 = projectedVertices[b].projected;
                if (!p1 || !p2) {
                    return;
                }

                const linePoints = LineDrawer.drawLine(Math.round(p1.x), Math.round(p1.y), Math.round(p2.x), Math.round(p2.y), true, COLORS.TEXT_NORMAL);
                linePoints.forEach(point => {
                    if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                        const total = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
                        const current = Math.hypot(point.x - p1.x, point.y - p1.y);
                        const t = current / total;
                        const z = (p1.z + (p2.z - p1.z) * t) - STATION_EDGE_DEPTH_BIAS;
                        plotDepthText(depthBuffer, point.x, point.y, z, point.symbol, point.color);
                    }
                });
            });
        });
    }

    function renderDust(viewWidth, viewHeight) {
        if (!playerShip || dustParticles.length === 0) {
            return;
        }

        const speed = vecLength(playerShip.velocity);
        const velocityView = getVelocityCameraSpace();
        const cameraPos = playerShip.position;
        const cameraRot = playerShip.rotation;
        const charDims = UI.getCharDimensions();
        const fovRad = degToRad(VIEW_FOV);
        const fovScale = Math.tan(fovRad / 2);
        const viewPixelWidth = viewWidth * charDims.width;
        const viewPixelHeight = viewHeight * charDims.height;
        const centerPxX = viewPixelWidth / 2;
        const centerPxY = viewPixelHeight / 2;

        dustParticles.forEach(particle => {
            const relative = subVec(particle.position, cameraPos);
            const cameraSpacePos = rotateVecByQuat(relative, quatConjugate(cameraRot));
            if (cameraSpacePos.z <= NEAR_PLANE) {
                return;
            }

            const normX = (cameraSpacePos.x / cameraSpacePos.z) / fovScale;
            const normY = (cameraSpacePos.y / cameraSpacePos.z) / fovScale;
            const screenPxX = normX * (viewPixelWidth / 2);
            const screenPxY = normY * (viewPixelHeight / 2);
            const x = Math.floor((centerPxX + screenPxX) / charDims.width);
            const y = Math.floor((centerPxY - screenPxY) / charDims.height);

            if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
                let symbol = DUST_PARTICLE_SYMBOL;
                if (DUST_PARTICLE_LINE_SYMBOLS && speed >= DUST_PARTICLE_LINE_SPEED_THRESHOLD) {
                    const denom = cameraSpacePos.z * cameraSpacePos.z;
                    const vx = (velocityView.x * cameraSpacePos.z - cameraSpacePos.x * velocityView.z) / denom;
                    const vy = (velocityView.y * cameraSpacePos.z - cameraSpacePos.y * velocityView.z) / denom;
                    const screenSpeed = Math.sqrt(vx * vx + vy * vy);
                    if (screenSpeed >= DUST_SCREEN_SPEED_EPSILON) {
                        symbol = getLineSymbolFromDirection(vx, vy);
                    }
                }
                UI.addText(x, y, symbol, COLORS.TEXT_DIM, 1.0);
            }
        });
    }

    function renderHud(viewWidth, viewHeight) {
        const startY = viewHeight;
        const panelWidth = viewWidth;

        // Divider line
        UI.addText(0, startY, '─'.repeat(panelWidth), COLORS.GRAY);

        const ship = playerShip;
        if (!ship) {
            return;
        }

        const fuelRatio = ship.fuel / ship.maxFuel;
        const shieldRatio = ship.maxShields ? (ship.shields / ship.maxShields) : 0;
        const hullRatio = ship.hull / ship.maxHull;

        UI.addText(2, startY + 1, `Fuel: ${ship.fuel}/${ship.maxFuel}`, UI.calcStatColor(fuelRatio, true));
        UI.addText(2, startY + 2, `Shields: ${ship.shields}/${ship.maxShields}`, UI.calcStatColor(shieldRatio, true));
        UI.addText(2, startY + 3, `Hull: ${ship.hull}/${ship.maxHull}`, UI.calcStatColor(hullRatio, true));

        const speed = vecLength(ship.velocity);
        UI.addText(2, startY + 4, `Speed: ${speed.toFixed(4)} AU/s`, COLORS.TEXT_DIM);

        if (targetSystem) {
            const targetPos = {
                x: targetSystem.x * LY_TO_AU,
                y: targetSystem.y * LY_TO_AU,
                z: 0
            };
            const distanceToTarget = vecLength(subVec(targetPos, ship.position));
            UI.addText(2, startY + 5, `Distance: ${distanceToTarget.toFixed(2)} AU (${(distanceToTarget / LY_TO_AU).toFixed(3)} LY)`, COLORS.TEXT_DIM);
        } else {
            UI.addText(2, startY + 5, 'Distance: --', COLORS.TEXT_DIM);
        }

        // Placeholder button
        renderCompass(viewWidth, viewHeight, startY);

        const menuText = 'MENU';
        const buttonText = `[m] ${menuText}`;
        const menuX = Math.max(0, panelWidth - buttonText.length - 1);
        UI.addButton(menuX, startY + 6, 'm', menuText, () => {
            stop();
            GalaxyMap.show(currentGameState);
        }, COLORS.CYAN, '');
    }

    function projectPoint(worldPos, viewWidth, viewHeight) {
        const cameraPos = playerShip.position;
        const cameraRot = playerShip.rotation;

        const relative = subVec(worldPos, cameraPos);
        const cameraSpace = rotateVecByQuat(relative, quatConjugate(cameraRot));
        return projectCameraSpacePoint(cameraSpace, viewWidth, viewHeight);
    }

    function projectCameraSpacePoint(cameraSpace, viewWidth, viewHeight) {
        const raw = projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight);
        if (!raw) {
            return null;
        }
        return {
            x: Math.floor(raw.x),
            y: Math.floor(raw.y),
            z: raw.z
        };
    }

    function projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight) {
        if (cameraSpace.z <= NEAR_PLANE) {
            return null;
        }

        const charDims = UI.getCharDimensions();

        const fovRad = degToRad(VIEW_FOV);
        const fovScale = Math.tan(fovRad / 2);

        const viewPixelWidth = viewWidth * charDims.width;
        const viewPixelHeight = viewHeight * charDims.height;

        const normX = (cameraSpace.x / cameraSpace.z) / fovScale;
        const normY = (cameraSpace.y / cameraSpace.z) / fovScale;

        const centerPxX = viewPixelWidth / 2;
        const centerPxY = viewPixelHeight / 2;

        const screenPxX = normX * (viewPixelWidth / 2);
        const screenPxY = normY * (viewPixelHeight / 2);

        const gridX = (centerPxX + screenPxX) / charDims.width;
        const gridY = (centerPxY - screenPxY) / charDims.height;

        return {
            x: gridX,
            y: gridY,
            z: cameraSpace.z
        };
    }

    function createDepthBuffer(width, height) {
        return {
            width,
            height,
            depth: new Float32Array(width * height).fill(Infinity),
            chars: new Array(width * height).fill(null),
            colors: new Array(width * height).fill(null)
        };
    }

    function plotDepthText(buffer, x, y, z, symbol, color) {
        if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) {
            return;
        }
        const index = y * buffer.width + x;
        if (z < buffer.depth[index]) {
            buffer.depth[index] = z;
            buffer.chars[index] = symbol;
            buffer.colors[index] = color;
        }
    }

    function flushDepthBuffer(buffer) {
        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const index = y * buffer.width + x;
                const symbol = buffer.chars[index];
                if (symbol) {
                    UI.addText(x, y, symbol, buffer.colors[index]);
                }
            }
        }
    }

    function fillDepthQuad(buffer, quad, symbol, color, bias = 0) {
        if (quad.length !== 4) {
            return;
        }
        fillDepthTriangle(buffer, quad[0], quad[1], quad[2], symbol, color, bias);
        fillDepthTriangle(buffer, quad[0], quad[2], quad[3], symbol, color, bias);
    }

    function fillDepthTriangle(buffer, v0, v1, v2, symbol, color, bias = 0) {
        const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
        const maxX = Math.min(buffer.width - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
        const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
        const maxY = Math.min(buffer.height - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

        const denom = ((v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y));
        if (denom === 0) {
            return;
        }

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const px = x + 0.5;
                const py = y + 0.5;
                const w1 = ((v1.y - v2.y) * (px - v2.x) + (v2.x - v1.x) * (py - v2.y)) / denom;
                const w2 = ((v2.y - v0.y) * (px - v2.x) + (v0.x - v2.x) * (py - v2.y)) / denom;
                const w3 = 1 - w1 - w2;
                if ((w1 >= 0 && w2 >= 0 && w3 >= 0) || (w1 <= 0 && w2 <= 0 && w3 <= 0)) {
                    const z = (w1 * v0.z + w2 * v1.z + w3 * v2.z) + bias;
                    plotDepthText(buffer, x, y, z, symbol, color);
                }
            }
        }
    }

    function clipPolygonToNearPlane(vertices, nearPlane) {
        const clipped = [];
        for (let i = 0; i < vertices.length; i++) {
            const current = vertices[i];
            const next = vertices[(i + 1) % vertices.length];
            const currentInside = current.z > nearPlane;
            const nextInside = next.z > nearPlane;

            if (currentInside && nextInside) {
                clipped.push(next);
            } else if (currentInside && !nextInside) {
                const t = (nearPlane - current.z) / (next.z - current.z);
                clipped.push({
                    x: current.x + (next.x - current.x) * t,
                    y: current.y + (next.y - current.y) * t,
                    z: nearPlane
                });
            } else if (!currentInside && nextInside) {
                const t = (nearPlane - current.z) / (next.z - current.z);
                clipped.push({
                    x: current.x + (next.x - current.x) * t,
                    y: current.y + (next.y - current.y) * t,
                    z: nearPlane
                });
                clipped.push(next);
            }
        }
        return clipped;
    }

    // === Quaternion & Vector helpers ===
    function faceToward(ship, targetPos) {
        const forward = normalizeVec(subVec(targetPos, ship.position));
        if (vecLength(forward) === 0) {
            return;
        }
        const up = { x: 0, y: 1, z: 0 };
        ship.rotation = quatNormalize(quatFromForwardUp(forward, up));
    }

    function getLocalAxes(rotation) {
        const forward = rotateVecByQuat({ x: 0, y: 0, z: 1 }, rotation);
        const right = rotateVecByQuat({ x: 1, y: 0, z: 0 }, rotation);
        const up = rotateVecByQuat({ x: 0, y: 1, z: 0 }, rotation);
        return { forward, right, up };
    }

    function quatFromForwardUp(forward, up) {
        const f = normalizeVec(forward);
        let r = normalizeVec(crossVec(up, f));
        if (vecLength(r) === 0) {
            r = { x: 1, y: 0, z: 0 };
        }
        const u = crossVec(f, r);

        const m00 = r.x, m01 = u.x, m02 = f.x;
        const m10 = r.y, m11 = u.y, m12 = f.y;
        const m20 = r.z, m21 = u.z, m22 = f.z;

        const trace = m00 + m11 + m22;
        let q = { x: 0, y: 0, z: 0, w: 1 };

        if (trace > 0) {
            const s = Math.sqrt(trace + 1.0) * 2;
            q.w = 0.25 * s;
            q.x = (m21 - m12) / s;
            q.y = (m02 - m20) / s;
            q.z = (m10 - m01) / s;
        } else if (m00 > m11 && m00 > m22) {
            const s = Math.sqrt(1.0 + m00 - m11 - m22) * 2;
            q.w = (m21 - m12) / s;
            q.x = 0.25 * s;
            q.y = (m01 + m10) / s;
            q.z = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = Math.sqrt(1.0 + m11 - m00 - m22) * 2;
            q.w = (m02 - m20) / s;
            q.x = (m01 + m10) / s;
            q.y = 0.25 * s;
            q.z = (m12 + m21) / s;
        } else {
            const s = Math.sqrt(1.0 + m22 - m00 - m11) * 2;
            q.w = (m10 - m01) / s;
            q.x = (m02 + m20) / s;
            q.y = (m12 + m21) / s;
            q.z = 0.25 * s;
        }

        return q;
    }

    function quatFromAxisAngle(axis, angle) {
        const half = angle / 2;
        const s = Math.sin(half);
        const n = normalizeVec(axis);
        return quatNormalize({
            x: n.x * s,
            y: n.y * s,
            z: n.z * s,
            w: Math.cos(half)
        });
    }

    function quatMultiply(a, b) {
        return {
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
        };
    }

    function quatConjugate(q) {
        return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
    }

    function quatNormalize(q) {
        const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
        if (len === 0) {
            return { x: 0, y: 0, z: 0, w: 1 };
        }
        return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
    }

    function rotateVecByQuat(v, q) {
        const qv = { x: v.x, y: v.y, z: v.z, w: 0 };
        const qConj = quatConjugate(q);
        const result = quatMultiply(quatMultiply(q, qv), qConj);
        return { x: result.x, y: result.y, z: result.z };
    }

    function addVec(a, b) {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    }

    function subVec(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }

    function scaleVec(v, s) {
        return { x: v.x * s, y: v.y * s, z: v.z * s };
    }

    function vecLength(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    function normalizeVec(v) {
        const len = vecLength(v);
        if (len === 0) {
            return { x: 0, y: 0, z: 0 };
        }
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    }

    function crossVec(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    function dotVec(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    function distance(a, b) {
        return vecLength(subVec(a, b));
    }

    function buildStarfield(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.sin(phi) * Math.sin(theta);
            const z = Math.cos(phi);
            stars.push({ direction: { x, y, z } });
        }
        return stars;
    }

    function updateDustParticles() {
        if (!playerShip) {
            return;
        }

        const shipRange = playerShip.size * DUST_PARTICLE_RANGE_SHIP_LENGTHS;
        const spawnRadius = playerShip.size * DUST_PARTICLE_SPAWN_RADIUS_SHIP_LENGTHS;
        const minDistance = playerShip.size * DUST_PARTICLE_MIN_DISTANCE_SHIP_LENGTHS;
        const maxDistance = playerShip.size * DUST_PARTICLE_MAX_DISTANCE_SHIP_LENGTHS;
        const edgeBand = playerShip.size * DUST_PARTICLE_EDGE_BAND_SHIP_LENGTHS;

        dustParticles = dustParticles.filter(particle => {
            return distance(playerShip.position, particle.position) <= shipRange;
        });

        if (dustParticles.length >= DUST_PARTICLE_COUNT) {
            return;
        }

        const speed = vecLength(playerShip.velocity);
        if (speed <= 0.000001) {
            return;
        }

        const velocityDirection = getVelocityWorldDirection();

        while (dustParticles.length < DUST_PARTICLE_COUNT) {
            const offset = randomPointInSphereShellBiased(minDistance, maxDistance, edgeBand, velocityDirection, DUST_PARTICLE_VELOCITY_BIAS);
            dustParticles.push({
                position: addVec(playerShip.position, offset)
            });
        }

    }

    function getNearestSystem(gameState) {
        if (!gameState || !gameState.systems || gameState.systems.length === 0) {
            return null;
        }
        const current = gameState.getCurrentSystem();
        if (!current) {
            return gameState.systems[0];
        }
        let nearest = null;
        let nearestDist = Infinity;
        gameState.systems.forEach(system => {
            if (system === current) {
                return;
            }
            const dist = current.distanceTo(system);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = system;
            }
        });
        return nearest;
    }

    function updateStationVisibility() {
        if (currentStation) {
            possibleStations = [currentStation].filter(station => {
                return distance(playerShip.position, station.position) <= STATION_POSSIBLE_RANGE_AU;
            });
        } else {
            possibleStations = [];
        }

        const grid = UI.getGridSize();
        const viewHeight = grid.height - PANEL_HEIGHT;
        const viewWidth = grid.width;
        visibleStations = possibleStations.filter(station => {
            const dist = distance(playerShip.position, station.position);
            if (dist > STATION_VISIBLE_RANGE_AU) {
                if (DEBUG_STATION_VISIBILITY) {
                    console.log('[SpaceTravelMap] Station visibility', {
                        stationId: station.id,
                        distanceAU: dist,
                        distanceLY: dist / LY_TO_AU,
                        visible: false,
                        reason: 'range'
                    });
                }
                return false;
            }
            const area = stationScreenAreaChars(station, viewWidth, viewHeight);
            const visible = area >= 0.01;
            if (DEBUG_STATION_VISIBILITY) {
                console.log('[SpaceTravelMap] Station visibility', {
                    stationId: station.id,
                    distanceAU: dist,
                    distanceLY: dist / LY_TO_AU,
                    area,
                    threshold: 0.01,
                    visible
                });
            }
            return visible;
        });
    }

    function logNearestStationDebug() {
        if (!playerShip) {
            return;
        }
    }

    function stationScreenAreaChars(station, viewWidth, viewHeight) {
        if (!playerShip || !station) {
            return 0;
        }

        const cameraPos = playerShip.position;
        const cameraRot = playerShip.rotation;
        const half = station.size / 2;
        const vertices = [
            { x: -half, y: -half, z: -half },
            { x: half, y: -half, z: -half },
            { x: half, y: half, z: -half },
            { x: -half, y: half, z: -half },
            { x: -half, y: -half, z: half },
            { x: half, y: -half, z: half },
            { x: half, y: half, z: half },
            { x: -half, y: half, z: half }
        ].map(v => addVec(station.position, v));

        const projected = vertices
            .map(v => rotateVecByQuat(subVec(v, cameraPos), quatConjugate(cameraRot)))
            .map(v => projectCameraSpacePointRaw(v, viewWidth, viewHeight))
            .filter(p => p !== null);

        if (projected.length === 0) {
            return 0;
        }

        const minX = Math.min(...projected.map(p => p.x));
        const maxX = Math.max(...projected.map(p => p.x));
        const minY = Math.min(...projected.map(p => p.y));
        const maxY = Math.max(...projected.map(p => p.y));

        const width = Math.max(0, maxX - minX);
        const height = Math.max(0, maxY - minY);
        return width * height;
    }

    function renderCompass(viewWidth, viewHeight, startY) {
        if (!playerShip || !targetSystem) {
            return;
        }

        const targetPos = {
            x: targetSystem.x * LY_TO_AU,
            y: targetSystem.y * LY_TO_AU,
            z: 0
        };
        const toTarget = subVec(targetPos, playerShip.position);
        const distanceToTarget = vecLength(toTarget);
        if (distanceToTarget <= 0.000001) {
            return;
        }

        const cameraSpaceDir = rotateVecByQuat(toTarget, quatConjugate(playerShip.rotation));
        const screenDx = cameraSpaceDir.x;
        const screenDy = cameraSpaceDir.z;

        const compassCenterX = Math.floor(viewWidth / 2);
        const compassCenterY = startY + 3;

        UI.addText(compassCenterX, compassCenterY, 'o', COLORS.CYAN);

        const arrow = getCompassArrowFromDirection(screenDx, screenDy);
        if (arrow) {
            UI.addText(compassCenterX + arrow.dx, compassCenterY + arrow.dy, arrow.symbol, COLORS.CYAN);
        }

        const verticalRatio = cameraSpaceDir.y / distanceToTarget;
        let verticalLabel = 'LVL';
        if (verticalRatio > 0.2) {
            verticalLabel = 'ABV';
        } else if (verticalRatio < -0.2) {
            verticalLabel = 'BLW';
        }
        UI.addText(compassCenterX - 2, compassCenterY + 2, verticalLabel, COLORS.TEXT_DIM);
    }

    function getCompassArrowFromDirection(dx, dy) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag <= 0.000001) {
            return null;
        }

        const angle = Math.atan2(dy, dx);
        const sector = Math.round(angle / (Math.PI / 4));
        const index = (sector + 8) % 8;
        const offsets = [
            { dx: 1, dy: 0, symbol: '→' },
            { dx: 1, dy: -1, symbol: '↗' },
            { dx: 0, dy: -1, symbol: '↑' },
            { dx: -1, dy: -1, symbol: '↖' },
            { dx: -1, dy: 0, symbol: '←' },
            { dx: -1, dy: 1, symbol: '↙' },
            { dx: 0, dy: 1, symbol: '↓' },
            { dx: 1, dy: 1, symbol: '↘' }
        ];
        return offsets[index];
    }

    function randomPointInSphereShellBiased(minDistance, maxDistance, edgeBand, direction, bias) {
        const distance = Math.max(minDistance, maxDistance - Math.random() * edgeBand);
        for (let i = 0; i < 20; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const point = {
                x: distance * Math.sin(phi) * Math.cos(theta),
                y: distance * Math.sin(phi) * Math.sin(theta),
                z: distance * Math.cos(phi)
            };
            if (dotVec(normalizeVec(point), direction) >= bias) {
                return point;
            }
        }

        const fallbackTheta = Math.random() * Math.PI * 2;
        const fallbackPhi = Math.acos(2 * Math.random() - 1);
        return {
            x: distance * Math.sin(fallbackPhi) * Math.cos(fallbackTheta),
            y: distance * Math.sin(fallbackPhi) * Math.sin(fallbackTheta),
            z: distance * Math.cos(fallbackPhi)
        };
    }

    function getVelocityWorldDirection() {
        const speed = vecLength(playerShip.velocity);
        if (speed > 0.000001) {
            return normalizeVec(playerShip.velocity);
        }
        return getLocalAxes(playerShip.rotation).forward;
    }

    function getVelocityCameraSpace() {
        const relativeVelocity = scaleVec(playerShip.velocity, -1);
        return rotateVecByQuat(relativeVelocity, quatConjugate(playerShip.rotation));
    }

    function getLineSymbolFromDirection(dx, dy) {
        const angle = Math.atan2(dy, dx);
        const sector = Math.round(angle / (Math.PI / 4));
        const index = (sector + 8) % 8;
        const chars = ['-', '/', '|', '\\', '-', '/', '|', '\\'];
        return chars[index];
    }

    function randomPointInSphere(radius) {
        const u = Math.random();
        const v = Math.random();
        const w = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = radius * Math.cbrt(w);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        };
    }

    function degToRad(deg) {
        return deg * (Math.PI / 180);
    }

    return {
        show,
        stop
    };
})();
