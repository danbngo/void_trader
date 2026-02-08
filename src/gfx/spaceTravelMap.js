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

        currentGameState = gameState;
        targetSystem = destination;
        playerShip = gameState.ships[0];

        if (!playerShip.size || playerShip.size === 1) {
            playerShip.size = SHIP_SIZE_AU;
        }

        // Initialize ship position and velocity
        const currentSystem = gameState.getCurrentSystem();
        playerShip.position = {
            x: currentSystem.x * LY_TO_AU,
            y: currentSystem.y * LY_TO_AU,
            z: 0
        };
        playerShip.velocity = { x: 0, y: 0, z: 0 };

        // Create station at destination system
        currentStation = new SpaceStation('DESTINATION', STATION_SIZE_AU);
        currentStation.position = {
            x: destination.x * LY_TO_AU,
            y: destination.y * LY_TO_AU,
            z: 0
        };

        // Face the station on entry
        faceToward(playerShip, currentStation.position);

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
        if (frameCount % POSSIBLE_STATION_CHECK_FRAMES === 0) {
            possibleStations = [currentStation].filter(station => {
                return distance(playerShip.position, station.position) <= STATION_POSSIBLE_RANGE_AU;
            });
        }

        if (frameCount % VISIBLE_STATION_CHECK_FRAMES === 0) {
            visibleStations = possibleStations.filter(station => {
                return distance(playerShip.position, station.position) <= STATION_VISIBLE_RANGE_AU;
            });
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
            const forwardSpeed = dotVec(playerShip.velocity, forward);
            if (forwardSpeed > 0) {
                const nextSpeed = Math.max(0, forwardSpeed - accel * dt);
                const speedDelta = nextSpeed - forwardSpeed;
                playerShip.velocity = addVec(playerShip.velocity, scaleVec(forward, speedDelta));
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
    }

    function render() {
        UI.clear();

        const grid = UI.getGridSize();
        const viewHeight = grid.height - PANEL_HEIGHT;
        const viewWidth = grid.width;

        renderStars(viewWidth, viewHeight);
        renderDust(viewWidth, viewHeight);
        renderStations(viewWidth, viewHeight);
        renderHud(viewWidth, viewHeight);

        UI.draw();
    }

    function renderStars(viewWidth, viewHeight) {
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
                UI.addText(x, y, '.', COLORS.TEXT_DIM, 0.9);
                drawn++;
            }
        }
    }

    function renderStations(viewWidth, viewHeight) {
        if (visibleStations.length === 0) {
            return;
        }

        visibleStations.forEach(station => {
            const size = station.size;
            const half = size / 2;

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

            const edges = [
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7]
            ];

            edges.forEach(([a, b]) => {
                const p1 = projectPoint(vertices[a], viewWidth, viewHeight);
                const p2 = projectPoint(vertices[b], viewWidth, viewHeight);
                if (!p1 || !p2) {
                    return;
                }

                const linePoints = LineDrawer.drawLine(p1.x, p1.y, p2.x, p2.y, true, COLORS.TEXT_NORMAL);
                linePoints.forEach(point => {
                    if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                        UI.addText(point.x, point.y, point.symbol, point.color);
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

        // Placeholder button
        const menuText = '[M] MENU';
        const menuX = Math.max(2, Math.floor((panelWidth - menuText.length) / 2));
        UI.addText(menuX, startY + 5, menuText, COLORS.CYAN);
    }

    function projectPoint(worldPos, viewWidth, viewHeight) {
        const cameraPos = playerShip.position;
        const cameraRot = playerShip.rotation;

        const relative = subVec(worldPos, cameraPos);
        const cameraSpace = rotateVecByQuat(relative, quatConjugate(cameraRot));

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

        const gridX = Math.floor((centerPxX + screenPxX) / charDims.width);
        const gridY = Math.floor((centerPxY - screenPxY) / charDims.height);

        return {
            x: gridX,
            y: gridY,
            z: cameraSpace.z
        };
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

        console.log('[SpaceTravelMap] Dust debug', {
            speed,
            dustCount: dustParticles.length,
            range: shipRange,
            spawnRadius,
            shipSize: playerShip.size,
            minDistance,
            maxDistance,
            edgeBand
        });
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
