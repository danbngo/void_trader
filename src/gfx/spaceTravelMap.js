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

    const SHIP_SPEED_PER_ENGINE = 10; // ship sizes per second per engine point
    const SHIP_ACCEL_PER_ENGINE = 0.8; // ship sizes per second^2 per engine point
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
    const STATION_ENTRANCE_DOT = 0.85;
    const STATION_BOUNCE_DAMPING = 0.6;
    const STATION_COLLISION_COOLDOWN_MS = 600;
    const STATION_COLLISION_RADIUS_MULT = 0.8;
    const STATION_COLLISION_MIN_SPEED = 0.1 / 60;
    const STATION_COLLISION_MAX_ENTRANCE_DOT = 0.7;
    const STATION_COLLISION_SPEED_PER_HULL = 5;
    const DAMAGE_FLASH_DURATION_MS = 500;
    const DAMAGE_FLASH_ALPHA = 0.5;
    const SYSTEM_BODY_SHADE_MAX_DISTANCE_AU = 50;
    const SYSTEM_BODY_LABEL_DISTANCE_AU = 8;

    const ASCII_LOG_INTERVAL_MS = 2000;

    const POSSIBLE_STATION_CHECK_FRAMES = 300;
    const VISIBLE_STATION_CHECK_FRAMES = 30;

    // === State ===
    let currentGameState = null;
    let targetSystem = null;
    let localDestination = null;
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
    let isActive = false;
    let lastStationCollisionMs = -Infinity;
    let damageFlashStartMs = -Infinity;
    const DEBUG_STATION_COLLISION = true;

    const keyState = new Set();
    let keyDownHandler = null;
    let keyUpHandler = null;

    function lerpColorHex(a, b, t) {
        const ar = parseInt(a.slice(1, 3), 16);
        const ag = parseInt(a.slice(3, 5), 16);
        const ab = parseInt(a.slice(5, 7), 16);
        const br = parseInt(b.slice(1, 3), 16);
        const bg = parseInt(b.slice(3, 5), 16);
        const bb = parseInt(b.slice(5, 7), 16);
        const rr = Math.round(ar + (br - ar) * t);
        const rg = Math.round(ag + (bg - ag) * t);
        const rb = Math.round(ab + (bb - ab) * t);
        return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
    }

    function hashString(seed) {
        let h = 2166136261;
        for (let i = 0; i < seed.length; i++) {
            h ^= seed.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function makeRng(seed) {
        let state = seed >>> 0;
        return () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 0x100000000;
        };
    }

    function isGasPlanet(typeId) {
        return typeId === BODY_TYPES.PLANET_GAS_GIANT.id
            || typeId === BODY_TYPES.PLANET_GAS_DWARF.id;
    }

    function isTerrestrialPlanet(typeId) {
        return typeId === BODY_TYPES.PLANET_EARTHLIKE.id
            || typeId === BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id
            || typeId === BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id;
    }

    function show(gameState, destination, options = {}) {
        stop();
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();

        const resetPosition = options.resetPosition !== false;

        currentGameState = gameState;
        targetSystem = destination || getNearestSystem(gameState);
        localDestination = options.localDestination || gameState.localDestination || null;
        if (localDestination && gameState.localDestinationSystemIndex !== null
            && gameState.localDestinationSystemIndex !== gameState.currentSystemIndex) {
            localDestination = null;
        }
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
            const stationOrbit = typeof targetSystem.stationOrbitAU === 'number'
                ? targetSystem.stationOrbitAU
                : SYSTEM_PLANET_ORBIT_MAX_AU + SYSTEM_STATION_ORBIT_BUFFER_AU;
            const stationDir = normalizeVec(STATION_ENTRANCE_DIR);
            currentStation.position = {
                x: targetSystem.x * LY_TO_AU + stationDir.x * stationOrbit,
                y: targetSystem.y * LY_TO_AU + stationDir.y * stationOrbit,
                z: stationDir.z * stationOrbit
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
        isActive = true;
        startLoop();
    }

    function stop() {
        isActive = false;
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
            if (!isActive) {
                return;
            }
            if (!lastTimestamp) {
                lastTimestamp = timestamp;
            }
            const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
            lastTimestamp = timestamp;

            update(dt, timestamp);
            if (!isActive) {
                return;
            }
            render(timestamp);

            animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);
    }

    function update(dt, timestampMs = 0) {
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

        if (currentStation && checkStationDocking(currentStation, timestampMs)) {
            return;
        }

        updateDustParticles();

        if (DEBUG_STATION_LOG) {
            logNearestStationDebug();
        }
    }

    function render(timestampMs = 0) {
        if (!isActive) {
            return;
        }
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const viewHeight = grid.height - PANEL_HEIGHT;
        const viewWidth = grid.width;

        const depthBuffer = createDepthBuffer(viewWidth, viewHeight);

        SpaceStationGfx.renderStationOccluders(visibleStations, playerShip, viewWidth, viewHeight, depthBuffer, NEAR_PLANE, STATION_FACE_DEPTH_BIAS);
        renderSystemBodies(viewWidth, viewHeight, depthBuffer);
        renderStars(viewWidth, viewHeight, depthBuffer);
        // Edge rendering disabled in favor of face shading
        renderDust(viewWidth, viewHeight, depthBuffer);
        flushDepthBuffer(depthBuffer);
        renderHud(viewWidth, viewHeight);

        UI.draw();

        const flashElapsed = timestampMs - damageFlashStartMs;
        if (flashElapsed >= 0 && flashElapsed <= DAMAGE_FLASH_DURATION_MS) {
            const t = flashElapsed / DAMAGE_FLASH_DURATION_MS;
            const alpha = t < 0.5
                ? (DAMAGE_FLASH_ALPHA * (t / 0.5))
                : (DAMAGE_FLASH_ALPHA * (1 - ((t - 0.5) / 0.5)));
            const ctx = UI.getContext?.();
            const canvas = UI.getCanvas?.();
            if (ctx && canvas) {
                const rect = canvas.getBoundingClientRect();
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, rect.width, rect.height);
                ctx.restore();
            }
        }

        const now = Date.now();
        if (!lastAsciiLogTimestamp || (now - lastAsciiLogTimestamp) >= ASCII_LOG_INTERVAL_MS) {
            lastAsciiLogTimestamp = now;
            UI.logScreenToConsole();
        }
    }

    function renderSystemBodies(viewWidth, viewHeight, depthBuffer) {
        if (!targetSystem || !playerShip) {
            return;
        }

        const systemCenter = {
            x: targetSystem.x * LY_TO_AU,
            y: targetSystem.y * LY_TO_AU,
            z: 0
        };

        const bodies = [];
        if (Array.isArray(targetSystem.stars)) {
            targetSystem.stars.forEach(star => bodies.push({ ...star, kind: 'STAR' }));
        }
        if (Array.isArray(targetSystem.planets)) {
            targetSystem.planets.forEach(planet => bodies.push({ ...planet, kind: 'PLANET' }));
        }

        if (bodies.length === 0) {
            return;
        }

        const bodyColors = {
            [BODY_TYPES.STAR_RED_DWARF.id]: '#ff6655',
            [BODY_TYPES.STAR_YELLOW_DWARF.id]: '#ffd479',
            [BODY_TYPES.STAR_WHITE_DWARF.id]: '#ffffff',
            [BODY_TYPES.STAR_RED_GIANT.id]: '#ff7755',
            [BODY_TYPES.STAR_BLUE_GIANT.id]: '#66aaff',
            [BODY_TYPES.STAR_NEUTRON.id]: '#cfcfff',
            [BODY_TYPES.STAR_BLACK_HOLE.id]: '#222222',
            [BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id]: '#8a7a6a',
            [BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id]: '#7a9b6f',
            [BODY_TYPES.PLANET_EARTHLIKE.id]: '#5fbf6b',
            [BODY_TYPES.PLANET_GAS_GIANT.id]: '#d9a45b',
            [BODY_TYPES.PLANET_GAS_DWARF.id]: '#b88a55',
            [BODY_TYPES.PLANET_ICE_GIANT.id]: '#7fc6d9',
            [BODY_TYPES.PLANET_ICE_DWARF.id]: '#9fc7d9'
        };

        bodies.forEach(body => {
            const rel = body.orbit ? SystemOrbitUtils.getOrbitPosition(body.orbit, currentGameState.date) : { x: 0, y: 0, z: 0 };
            const worldPos = addVec(systemCenter, rel);
            const cameraSpace = rotateVecByQuat(subVec(worldPos, playerShip.position), quatConjugate(playerShip.rotation));
            const projected = projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, VIEW_FOV);
            if (!projected) {
                return;
            }

            const dist = distance(playerShip.position, worldPos);
            const shadeT = Math.max(0, Math.min(1, 1 - (dist / SYSTEM_BODY_SHADE_MAX_DISTANCE_AU)));
            const baseColor = bodyColors[body.type] || COLORS.TEXT_NORMAL;
            const color = lerpColorHex('#000000', baseColor, shadeT);

            const charDims = UI.getCharDimensions();
            const fovScale = Math.tan(degToRad(VIEW_FOV) / 2);
            const viewPixelWidth = viewWidth * charDims.width;
            const pixelsPerUnit = viewPixelWidth / (2 * fovScale * cameraSpace.z);
            const radiusPx = Math.max(1, body.radiusAU * pixelsPerUnit);
            const radiusChars = Math.max(1, Math.round(radiusPx / charDims.width));

            const centerX = Math.round(projected.x);
            const centerY = Math.round(projected.y);

            let craterData = null;
            if (isTerrestrialPlanet(body.type)) {
                const rng = makeRng(hashString(body.id || body.type));
                const craterCount = Math.max(2, Math.min(8, Math.round(radiusChars * 1.2)));
                craterData = Array.from({ length: craterCount }, () => {
                    const angle = rng() * Math.PI * 2;
                    const dist = rng() * radiusChars * 0.6;
                    return {
                        x: Math.cos(angle) * dist,
                        y: Math.sin(angle) * dist,
                        r: Math.max(1, rng() * radiusChars * 0.35)
                    };
                });
            }

            const stripeSize = Math.max(1, Math.round(radiusChars * 0.35));
            const stripePhase = Math.floor((hashString(body.id || body.type) % 100) / 100 * stripeSize);

            for (let dy = -radiusChars; dy <= radiusChars; dy++) {
                for (let dx = -radiusChars; dx <= radiusChars; dx++) {
                    if (dx * dx + dy * dy > radiusChars * radiusChars) {
                        continue;
                    }
                    const x = centerX + dx;
                    const y = centerY + dy;
                    let pixelColor = color;

                    if (isGasPlanet(body.type)) {
                        const band = Math.floor((dy + radiusChars + stripePhase) / stripeSize);
                        const bandT = (band % 2 === 0) ? 0.15 : -0.2;
                        if (bandT >= 0) {
                            pixelColor = lerpColorHex(pixelColor, '#ffffff', bandT);
                        } else {
                            pixelColor = lerpColorHex(pixelColor, '#000000', Math.abs(bandT));
                        }
                    } else if (craterData) {
                        for (let i = 0; i < craterData.length; i++) {
                            const crater = craterData[i];
                            const dxr = dx - crater.x;
                            const dyr = dy - crater.y;
                            if (dxr * dxr + dyr * dyr <= crater.r * crater.r) {
                                pixelColor = lerpColorHex(pixelColor, '#000000', 0.35);
                                break;
                            }
                        }
                    }

                    RasterUtils.plotDepthText(depthBuffer, x, y, projected.z, '█', pixelColor);
                }
            }

            const bboxLeft = centerX - radiusChars;
            const bboxRight = centerX + radiusChars;
            const bboxTop = centerY - radiusChars;
            const bboxBottom = centerY + radiusChars;
            const isOnScreen = bboxRight >= 0 && bboxLeft < viewWidth && bboxBottom >= 0 && bboxTop < viewHeight;

            if (isOnScreen && dist <= SYSTEM_BODY_LABEL_DISTANCE_AU) {
                const name = BODY_TYPES[body.type]?.name || body.type;
                const label = `${name}`;
                const labelWidth = label.length;
                const rawLabelX = centerX - Math.floor(labelWidth / 2);
                const labelX = Math.max(0, Math.min(viewWidth - labelWidth, rawLabelX));
                const labelY = Math.max(0, Math.min(viewHeight - 1, centerY - radiusChars - 1));
                UI.addText(labelX, labelY, label, COLORS.TEXT_NORMAL);
            }
        });
    }

    function getActiveTargetInfo() {
        if (localDestination && targetSystem) {
            const systemCenter = {
                x: targetSystem.x * LY_TO_AU,
                y: targetSystem.y * LY_TO_AU,
                z: 0
            };
            const rel = localDestination.orbit
                ? SystemOrbitUtils.getOrbitPosition(localDestination.orbit, currentGameState.date)
                : { x: 0, y: 0, z: 0 };
            return {
                position: addVec(systemCenter, rel),
                isLocal: true
            };
        }

        if (targetSystem) {
            return {
                position: {
                    x: targetSystem.x * LY_TO_AU,
                    y: targetSystem.y * LY_TO_AU,
                    z: 0
                },
                isLocal: false
            };
        }

        return null;
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

    function renderDust(viewWidth, viewHeight, depthBuffer) {
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
                const bufferIndex = y * depthBuffer.width + x;
                const existingChar = depthBuffer.chars[bufferIndex];
                if (existingChar && existingChar !== '.') {
                    return;
                }

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
                plotDepthText(depthBuffer, x, y, cameraSpacePos.z, symbol, COLORS.TEXT_DIM);
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
        const speedPerMinute = speed * 60;
        UI.addText(2, startY + 4, `Speed: ${speedPerMinute.toFixed(2)} AU/m`, COLORS.TEXT_DIM);

        const targetInfo = getActiveTargetInfo();
        if (targetInfo) {
            const distanceToTarget = vecLength(subVec(targetInfo.position, ship.position));
            const distanceLabel = targetInfo.isLocal
                ? `Distance: ${distanceToTarget.toFixed(2)} AU`
                : `Distance: ${distanceToTarget.toFixed(2)} AU (${(distanceToTarget / LY_TO_AU).toFixed(3)} LY)`;
            UI.addText(2, startY + 5, distanceLabel, COLORS.TEXT_DIM);
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

    function checkStationDocking(station, timestampMs = 0) {
        if (!station || !playerShip) {
            return false;
        }

        const dockRadius = station.size * 0.6;
        const collisionRadius = station.size * STATION_COLLISION_RADIUS_MULT;
        const dist = distance(playerShip.position, station.position);
        if (dist > collisionRadius) {
            return false;
        }

        const entranceDir = normalizeVec(STATION_ENTRANCE_DIR);
        const toShip = normalizeVec(subVec(playerShip.position, station.position));
        const entranceDot = ThreeDUtils.dotVec(toShip, entranceDir);
        const toStation = normalizeVec(subVec(station.position, playerShip.position));
        const approachingSpeed = ThreeDUtils.dotVec(playerShip.velocity, toStation);
        const rawSpeed = vecLength(playerShip.velocity);
        const collisionDebug = {
            timestampMs: Math.floor(timestampMs),
            stationId: station.id,
            distAU: dist,
            dockRadiusAU: dockRadius,
            collisionRadiusAU: collisionRadius,
            entranceDot,
            approachingSpeedAUps: approachingSpeed,
            speedAUps: rawSpeed,
            speedAUpm: rawSpeed * 60,
            minSpeedAUps: STATION_COLLISION_MIN_SPEED,
            minSpeedAUpm: STATION_COLLISION_MIN_SPEED * 60,
            maxEntranceDot: STATION_COLLISION_MAX_ENTRANCE_DOT,
            isInsideDockRadius: dist <= dockRadius,
            isInsideCollisionRadius: dist <= collisionRadius
        };

        if (dist <= dockRadius && entranceDot >= STATION_ENTRANCE_DOT && approachingSpeed > 0) {
            if (DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Docking conditions met', collisionDebug);
            }
            stop();
            const dockGameState = currentGameState;
            const dockTarget = targetSystem;
            DockingAnimation.show(dockGameState, () => {
                if (dockGameState && dockTarget) {
                    const systemIndex = dockGameState.systems.findIndex(system => system === dockTarget || system.name === dockTarget.name);
                    if (systemIndex >= 0) {
                        dockGameState.setCurrentSystem(systemIndex);
                    }
                    dockGameState.destination = null;
                }
                DockMenu.show(dockGameState);
            });
            return true;
        }

        if (approachingSpeed < STATION_COLLISION_MIN_SPEED) {
            const v = playerShip.velocity;
            const dotVN = ThreeDUtils.dotVec(v, toShip);
            if (dotVN > 0) {
                playerShip.velocity = subVec(v, scaleVec(toShip, dotVN));
            }
            playerShip.position = addVec(station.position, scaleVec(toShip, collisionRadius));
            if (DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Soft collision clamp (below min speed)', {
                    ...collisionDebug,
                    dotVN,
                    newVelocity: playerShip.velocity
                });
            }
            return false;
        }

        const v = playerShip.velocity;
        const dotVN = ThreeDUtils.dotVec(v, toShip);
        const reflected = subVec(v, scaleVec(toShip, 2 * dotVN));
        playerShip.velocity = scaleVec(reflected, STATION_BOUNCE_DAMPING);
        playerShip.position = addVec(station.position, scaleVec(toShip, collisionRadius));
        if (DEBUG_STATION_COLLISION) {
            console.log('[SpaceTravelMap] Bounce collision', {
                ...collisionDebug,
                dotVN,
                reflectedVelocity: reflected,
                postVelocity: playerShip.velocity
            });
        }

        if (timestampMs - lastStationCollisionMs >= STATION_COLLISION_COOLDOWN_MS) {
            const damage = Math.max(1, Math.floor((approachingSpeed * 60) / 0.1));
            playerShip.hull = Math.max(0, (playerShip.hull ?? 0) - damage);
            lastStationCollisionMs = timestampMs;
            damageFlashStartMs = timestampMs;
            if (DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Collision damage', {
                    ...collisionDebug,
                    damage,
                    hullAfter: playerShip.hull,
                    cooldownMs: STATION_COLLISION_COOLDOWN_MS
                });
            }
        } else if (DEBUG_STATION_COLLISION) {
            console.log('[SpaceTravelMap] Collision no damage (cooldown)', {
                ...collisionDebug,
                lastCollisionMs: lastStationCollisionMs,
                cooldownMs: STATION_COLLISION_COOLDOWN_MS
            });
        }
        return false;

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
        const targetInfo = getActiveTargetInfo();
        if (!playerShip || !targetInfo) {
            return;
        }
        const toTarget = subVec(targetInfo.position, playerShip.position);
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
