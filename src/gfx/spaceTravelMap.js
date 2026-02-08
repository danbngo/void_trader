/**
 * Space Travel Map
 * 3D space view used during travel (initial prototype)
 */

const SpaceTravelMap = (() => {
    const {
        addVec,
        subVec,
        scaleVec,
        vecLength,
        normalizeVec,
        distance,
        quatFromAxisAngle,
        quatMultiply,
        quatConjugate,
        quatNormalize,
        rotateVecByQuat,
        getLocalAxes,
        faceToward,
        buildStarfield,
        randomPointInSphereShellBiased,
        degToRad
    } = ThreeDUtils;

    const {
        applyAcceleration,
        applyBrake,
        clampSpeed
    } = PhysicsUtils;

    const {
        createDepthBuffer,
        plotDepthText,
        flushDepthBuffer,
        projectCameraSpacePointRaw
    } = RasterUtils;
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
    //const DUST_DEPTH_THRESHOLD = 0.0002;
    //const DUST_RADIAL_DEPTH_SCALE = 3.5;
    const STATION_POSSIBLE_RANGE_AU = 5_000_000;
    const STATION_VISIBLE_RANGE_AU = 1_500_000;

    const DEBUG_STATION_LOG = false;
    const DEBUG_STATION_VISIBILITY = false;
    const STATION_FACE_DEPTH_BIAS = 0.0005;
    const STATION_EDGE_DEPTH_BIAS = 0.0005;
    const STATION_ENTRANCE_DIR = { x: 0, y: 0, z: 1 };

    const ASCII_LOG_INTERVAL_MS = 2000;

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
    let lastAsciiLogTimestamp = 0;
    let animationId = null;

    const keyState = new Set();
    let keyDownHandler = null;
    let keyUpHandler = null;

    function show(gameState, destination, options = {}) {
        stop();
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();

        const resetPosition = options.resetPosition !== false;

        currentGameState = gameState;
        targetSystem = destination || gameState.destination || getNearestSystem(gameState);
        playerShip = gameState.ships[0];

        if (!playerShip.size || playerShip.size === 1) {
            playerShip.size = SHIP_SIZE_AU;
        }

        const currentSystem = gameState.getCurrentSystem();
        const currentSystemPos = {
            x: currentSystem.x * LY_TO_AU,
            y: currentSystem.y * LY_TO_AU,
            z: 0
        };

        const hasPosition = playerShip.position && typeof playerShip.position.x === 'number';
        if (resetPosition || !hasPosition) {
            playerShip.velocity = { x: 0, y: 0, z: 0 };
        }

        currentStation = null;
        if (targetSystem) {
            currentStation = new SpaceStation('DESTINATION', STATION_SIZE_AU);
            currentStation.position = {
                x: targetSystem.x * LY_TO_AU,
                y: targetSystem.y * LY_TO_AU,
                z: 0
            };
        }

        if (resetPosition || !hasPosition) {
            if (currentStation) {
                const offsetDir = normalizeVec(STATION_ENTRANCE_DIR);
                const startOffset = scaleVec(offsetDir, 0.05);
                playerShip.position = addVec(currentStation.position, startOffset);
            } else {
                playerShip.position = currentSystemPos;
            }

            if (currentStation) {
                faceToward(playerShip, currentStation.position);
            }
        }

        starSystems = gameState.systems.map(system => ({
            id: system.name,
            position: {
                x: system.x * LY_TO_AU,
                y: system.y * LY_TO_AU,
                z: 0
            }
        }));

        starfield = buildStarfield(STARFIELD_COUNT);
        dustParticles = [];

        possibleStations = [];
        visibleStations = [];
        frameCount = 0;
        lastTimestamp = 0;
        lastAsciiLogTimestamp = 0;

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
            playerShip.velocity = applyAcceleration(playerShip.velocity, forward, accel, dt);
        }
        if (brake) {
            playerShip.velocity = applyBrake(playerShip.velocity, accel, dt);
        }

        // Clamp speed
        playerShip.velocity = clampSpeed(playerShip.velocity, maxSpeed);

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

        SpaceStationGfx.renderStationOccluders(visibleStations, playerShip, viewWidth, viewHeight, depthBuffer, NEAR_PLANE, STATION_FACE_DEPTH_BIAS);
        renderStars(viewWidth, viewHeight, depthBuffer);
        SpaceStationGfx.renderStationEdges(visibleStations, playerShip, viewWidth, viewHeight, depthBuffer, STATION_EDGE_DEPTH_BIAS);
        flushDepthBuffer(depthBuffer);
        renderDust(viewWidth, viewHeight);
        renderHud(viewWidth, viewHeight);

        UI.draw();

        const now = Date.now();
        if (!lastAsciiLogTimestamp || (now - lastAsciiLogTimestamp) >= ASCII_LOG_INTERVAL_MS) {
            lastAsciiLogTimestamp = now;
            UI.logScreenToConsole();
        }
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

    function renderDust(viewWidth, viewHeight) {
        if (!playerShip || dustParticles.length === 0) {
            return;
        }

        const speed = vecLength(playerShip.velocity);
        const velocityView = getVelocityCameraSpace();
        const cameraPos = playerShip.position;
        const cameraRot = playerShip.rotation;
        dustParticles.forEach(particle => {
            const relative = subVec(particle.position, cameraPos);
            const cameraSpacePos = rotateVecByQuat(relative, quatConjugate(cameraRot));
            const projected = projectCameraSpacePointRaw(cameraSpacePos, viewWidth, viewHeight, VIEW_FOV);
            if (!projected) {
                return;
            }

            const x = Math.floor(projected.x);
            const y = Math.floor(projected.y);

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
        const raw = projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, VIEW_FOV);
        if (!raw) {
            return null;
        }
        return {
            x: Math.floor(raw.x),
            y: Math.floor(raw.y),
            z: raw.z
        };
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
            const area = SpaceStationGfx.stationScreenAreaChars(station, playerShip, viewWidth, viewHeight);
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

    return {
        show,
        stop
    };
})();
