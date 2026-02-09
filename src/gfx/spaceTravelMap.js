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
    const STATION_COLLISION_MIN_SPEED = 0.2 / 60;
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
    let mouseMoveHandler = null;
    let mouseDownHandler = null;
    let mouseTarget = { x: 0, y: 0 };
    let mouseTargetActive = false;
    let lastHoverPick = null;
    let windowBlurHandler = null;
    let windowFocusHandler = null;
    let isPaused = false;
    let pausedByFocus = false;

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

    function getLocalMapBodySymbol(body) {
        if (!body) {
            return '•';
        }
        if (body.kind === 'STATION' || body.type === 'STATION') {
            return '□';
        }
        if (body.kind === 'STAR') {
            if (body.type === BODY_TYPES.STAR_RED_GIANT.id || body.type === BODY_TYPES.STAR_BLUE_GIANT.id) {
                return '☼';
            }
            if (body.type === BODY_TYPES.STAR_NEUTRON.id) {
                return '+';
            }
            if (body.type === BODY_TYPES.STAR_BLACK_HOLE.id) {
                return '@';
            }
            return '⋆';
        }
        const hasRing = Array.isArray(body.features)
            ? body.features.includes('RING') || body.features.includes(PLANET_FEATURES?.RING?.id)
            : false;
        switch (body.type) {
            case BODY_TYPES.PLANET_GAS_GIANT.id:
                return hasRing ? 'Ø' : 'O';
            case BODY_TYPES.PLANET_GAS_DWARF.id:
                return '○';
            case BODY_TYPES.PLANET_ICE_GIANT.id:
                return hasRing ? 'ʘ' : '⓿';
            case BODY_TYPES.PLANET_ICE_DWARF.id:
                return '*';
            case BODY_TYPES.PLANET_EARTHLIKE.id:
            case BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id:
                return '●';
            case BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id:
                return '•';
            default:
                return '•';
        }
    }

    function setPaused(nextPaused, byFocus = false) {
        isPaused = nextPaused;
        pausedByFocus = nextPaused && byFocus;
    }

    function togglePause() {
        setPaused(!isPaused, false);
    }

    function toMonochrome(color) {
        if (!color || typeof color !== 'string' || color[0] !== '#' || color.length !== 7) {
            if (color === 'white') {
                return '#ffffff';
            }
            if (color === 'black') {
                return '#000000';
            }
            return color;
        }
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const luminance = Math.round((r * 0.3) + (g * 0.59) + (b * 0.11));
        const hex = luminance.toString(16).padStart(2, '0');
        return `#${hex}${hex}${hex}`;
    }

    function applyPauseColor(color) {
        return isPaused ? toMonochrome(color) : color;
    }

    function addHudText(x, y, text, color) {
        UI.addText(x, y, text, applyPauseColor(color));
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
            currentStation.name = targetSystem.stationName || `${targetSystem.name} Station`;
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
        setupMouseTargeting();
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
        if (windowBlurHandler) {
            window.removeEventListener('blur', windowBlurHandler);
            windowBlurHandler = null;
        }
        if (windowFocusHandler) {
            window.removeEventListener('focus', windowFocusHandler);
            windowFocusHandler = null;
        }
        if (mouseMoveHandler) {
            document.removeEventListener('mousemove', mouseMoveHandler);
            mouseMoveHandler = null;
        }
        if (mouseDownHandler) {
            document.removeEventListener('mousedown', mouseDownHandler);
            mouseDownHandler = null;
        }
        mouseTargetActive = false;
        isPaused = false;
        pausedByFocus = false;
        keyState.clear();
        lastHoverPick = null;
    }

    function setupInput() {
        keyDownHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                stop();
                SpaceTravelMenu.show(currentGameState, () => {
                    const destination = targetSystem || getNearestSystem(currentGameState);
                    show(currentGameState, destination, {
                        resetPosition: false,
                        localDestination
                    });
                });
                return;
            }
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                togglePause();
                return;
            }
            keyState.add(e.key);
        };
        keyUpHandler = (e) => {
            keyState.delete(e.key);
        };
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);

        windowBlurHandler = () => {
            if (!isPaused) {
                setPaused(true, true);
            }
        };
        windowFocusHandler = () => {
            if (pausedByFocus) {
                setPaused(false, false);
            }
        };
        window.addEventListener('blur', windowBlurHandler);
        window.addEventListener('focus', windowFocusHandler);
    }

    function setupMouseTargeting() {
        const canvas = UI.getCanvas?.();
        if (!canvas) {
            return;
        }
        const grid = UI.getGridSize();
        const viewWidth = grid.width;
        const viewHeight = grid.height - PANEL_HEIGHT;
        mouseTarget = {
            x: Math.floor(viewWidth / 2),
            y: Math.floor(viewHeight / 2)
        };
        mouseTargetActive = true;
        mouseMoveHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const charDims = UI.getCharDimensions();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;
            const gridX = Math.floor(pixelX / charDims.width);
            const gridY = Math.floor(pixelY / charDims.height);
            mouseTarget = { x: gridX, y: gridY };
            mouseTargetActive = true;
        };
        document.addEventListener('mousemove', mouseMoveHandler);

        mouseDownHandler = (e) => {
            if (e.button !== 0) {
                return;
            }
            if (lastHoverPick) {
                setLocalDestinationFromPick(lastHoverPick);
            }
        };
        document.addEventListener('mousedown', mouseDownHandler);
    }

    function getMouseTargetState(viewWidth, viewHeight) {
        if (!mouseTargetActive) {
            return { active: false };
        }
        const rawX = mouseTarget.x;
        const rawY = mouseTarget.y;
        const inView = rawX >= 0 && rawX < viewWidth && rawY >= 0 && rawY < viewHeight;
        const displayX = Math.max(0, Math.min(viewWidth - 1, rawX));
        const displayY = Math.max(0, Math.min(viewHeight - 1, rawY));
        return {
            active: true,
            rawX,
            rawY,
            inView,
            displayX,
            displayY,
            offLeft: rawX < 0,
            offRight: rawX >= viewWidth,
            offTop: rawY < 0,
            offBottom: rawY >= viewHeight
        };
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

        if (isPaused) {
            return;
        }

        frameCount++;

        // Recompute possible/visible stations periodically
        if (frameCount % POSSIBLE_STATION_CHECK_FRAMES === 0 || frameCount % VISIBLE_STATION_CHECK_FRAMES === 0) {
            updateStationVisibility();
        }

        // Rotation controls (relative to current orientation)
        const turnRad = degToRad(TURN_DEG_PER_SEC) * dt;
        const grid = UI.getGridSize();
        const viewHeight = grid.height - PANEL_HEIGHT;
        const viewWidth = grid.width;
        const mouseState = getMouseTargetState(viewWidth, viewHeight);
        const yawLeft = keyState.has('a') || keyState.has('A') || keyState.has('ArrowLeft') || mouseState.offLeft;
        const yawRight = keyState.has('d') || keyState.has('D') || keyState.has('ArrowRight') || mouseState.offRight;
        const pitchUp = keyState.has('ArrowUp') || mouseState.offTop;
        const pitchDown = keyState.has('ArrowDown') || mouseState.offBottom;

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

        const mouseState = getMouseTargetState(viewWidth, viewHeight);
        SpaceStationGfx.renderStationOccluders(visibleStations, playerShip, viewWidth, viewHeight, depthBuffer, NEAR_PLANE, STATION_FACE_DEPTH_BIAS);
        const bodyLabels = renderSystemBodies(viewWidth, viewHeight, depthBuffer, timestampMs, mouseState);
        renderStars(viewWidth, viewHeight, depthBuffer);
        // Edge rendering disabled in favor of face shading
        renderDust(viewWidth, viewHeight, depthBuffer);
        if (isPaused) {
            for (let i = 0; i < depthBuffer.colors.length; i++) {
                const color = depthBuffer.colors[i];
                if (color) {
                    depthBuffer.colors[i] = toMonochrome(color);
                }
            }
        }
        flushDepthBuffer(depthBuffer);
        renderHud(viewWidth, viewHeight);
        renderSystemBodyLabels(bodyLabels, viewWidth, viewHeight);
        renderDestinationIndicator(viewWidth, viewHeight);

        if (isPaused) {
            const label = '=== PAUSED ===';
            const x = Math.floor((viewWidth - label.length) / 2);
            const y = Math.floor(viewHeight / 2);
            UI.addText(x, y, label, COLORS.TEXT_NORMAL);
        }

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

    function renderSystemBodies(viewWidth, viewHeight, depthBuffer, timestampMs = 0, mouseState = null) {
        if (!targetSystem || !playerShip) {
            return [];
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
            return [];
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

        const labels = [];
        const hoverInfos = [];

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
            let flickerT = 1;
            if (body.kind === 'STAR') {
                const flickerIntervalMs = 500;
                const flickerStep = Math.floor(timestampMs / flickerIntervalMs);
                const flickerSeed = `${body.id || body.type}-${flickerStep}`;
                const flickerHash = hashString(flickerSeed);
                const flickerRand = (((flickerHash % 1000) + 1000) % 1000) / 1000;
                flickerT = 0.1 + (0.7 * flickerRand);
            }
            const color = lerpColorHex('#000000', baseColor, shadeT * flickerT);

            let fillSymbol = '█';
            if (body.kind === 'STAR') {
                fillSymbol = '░';
            } else if (isGasPlanet(body.type)) {
                fillSymbol = '▒';
            } else if (body.type === BODY_TYPES.PLANET_ICE_GIANT.id || body.type === BODY_TYPES.PLANET_ICE_DWARF.id) {
                fillSymbol = '▓';
            }

            const charDims = UI.getCharDimensions();
            const fovScale = Math.tan(degToRad(VIEW_FOV) / 2);
            const viewPixelWidth = viewWidth * charDims.width;
            const viewPixelHeight = viewHeight * charDims.height;
            const pixelsPerUnitX = viewPixelWidth / (2 * fovScale * cameraSpace.z);
            const pixelsPerUnitY = viewPixelHeight / (2 * fovScale * cameraSpace.z);
            const radiusPx = body.radiusAU * pixelsPerUnitX;
            const radiusPy = body.radiusAU * pixelsPerUnitY;
            const minRadiusChars = body.kind === 'STAR' ? 1 : 0;
            const radiusCharsX = Math.max(minRadiusChars, Math.round(radiusPx / charDims.width));
            const radiusCharsY = Math.max(minRadiusChars, Math.round(radiusPy / charDims.height));
            const radiusChars = Math.max(radiusCharsX, radiusCharsY);

            const centerX = Math.round(projected.x);
            const centerY = Math.round(projected.y);
            const hoverActive = mouseState && mouseState.active && mouseState.inView;
            const hoverDx = hoverActive ? (mouseState.rawX - centerX) : 0;
            const hoverDy = hoverActive ? (mouseState.rawY - centerY) : 0;

            if (radiusCharsX === 0 && radiusCharsY === 0) {
                const symbol = getLocalMapBodySymbol(body);
                RasterUtils.plotDepthText(depthBuffer, centerX, centerY, projected.z, symbol, color);
                const bboxLeft = centerX;
                const bboxRight = centerX;
                const bboxTop = centerY;
                const bboxBottom = centerY;
                const isOnScreen = bboxRight >= 0 && bboxLeft < viewWidth && bboxBottom >= 0 && bboxTop < viewHeight;
                if (isOnScreen) {
                    const isDestination = isDestinationBody(body);
                    if (isDestination) {
                        addDestinationLabel(labels, centerX, centerY, 0, body.name || BODY_TYPES[body.type]?.name || body.type, viewWidth, viewHeight);
                    }
                    hoverInfos.push({
                        name: body.name || BODY_TYPES[body.type]?.name || body.type,
                        centerX,
                        centerY,
                        radiusChars: 0,
                        depth: projected.z,
                        isOnScreen,
                        labelColor: isDestination ? COLORS.CYAN : color,
                        bodyRef: body,
                        kind: body.kind
                    });
                }
                return;
            }

            let craterData = null;
            if (isTerrestrialPlanet(body.type)) {
                const rng = makeRng(hashString(body.id || body.type));
                const craterCount = Math.max(2, Math.min(8, Math.round(Math.max(radiusCharsX, radiusCharsY) * 1.2)));
                craterData = Array.from({ length: craterCount }, () => {
                    const angle = rng() * Math.PI * 2;
                    const dist = rng() * Math.max(radiusCharsX, radiusCharsY) * 0.6;
                    return {
                        x: Math.cos(angle) * dist,
                        y: Math.sin(angle) * dist,
                        r: Math.max(1, rng() * Math.max(radiusCharsX, radiusCharsY) * 0.35)
                    };
                });
            }

            const stripeSize = Math.max(1, Math.round(Math.max(radiusCharsX, radiusCharsY) * 0.35));
            const stripePhase = Math.floor((hashString(body.id || body.type) % 100) / 100 * stripeSize);

            for (let dy = -radiusCharsY; dy <= radiusCharsY; dy++) {
                for (let dx = -radiusCharsX; dx <= radiusCharsX; dx++) {
                    const nx = radiusCharsX > 0 ? (dx / radiusCharsX) : 0;
                    const ny = radiusCharsY > 0 ? (dy / radiusCharsY) : 0;
                    if ((nx * nx + ny * ny) > 1) {
                        continue;
                    }
                    const x = centerX + dx;
                    const y = centerY + dy;
                    let pixelColor = color;

                    if (isGasPlanet(body.type)) {
                        const band = Math.floor((dy + radiusCharsY + stripePhase) / stripeSize);
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

                    RasterUtils.plotDepthText(depthBuffer, x, y, projected.z, fillSymbol, pixelColor);
                }
            }

            const bboxLeft = centerX - radiusCharsX;
            const bboxRight = centerX + radiusCharsX;
            const bboxTop = centerY - radiusCharsY;
            const bboxBottom = centerY + radiusCharsY;
            const isOnScreen = bboxRight >= 0 && bboxLeft < viewWidth && bboxBottom >= 0 && bboxTop < viewHeight;

            if (isOnScreen) {
                const isDestination = isDestinationBody(body);
                if (isDestination) {
                    addDestinationLabel(labels, centerX, centerY, Math.max(radiusCharsX, radiusCharsY), body.name || BODY_TYPES[body.type]?.name || body.type, viewWidth, viewHeight);
                }
                hoverInfos.push({
                    name: body.name || BODY_TYPES[body.type]?.name || body.type,
                    centerX,
                    centerY,
                    radiusChars: Math.max(radiusCharsX, radiusCharsY),
                    depth: projected.z,
                    isOnScreen,
                    labelColor: isDestination ? COLORS.CYAN : color,
                    bodyRef: body,
                    kind: body.kind
                });
            }
        });

        if (currentStation) {
            const stationCamera = rotateVecByQuat(subVec(currentStation.position, playerShip.position), quatConjugate(playerShip.rotation));
            const stationProjected = projectCameraSpacePointRaw(stationCamera, viewWidth, viewHeight, VIEW_FOV);
            if (stationProjected) {
                const charDims = UI.getCharDimensions();
                const fovScale = Math.tan(degToRad(VIEW_FOV) / 2);
                const viewPixelWidth = viewWidth * charDims.width;
                const pixelsPerUnit = viewPixelWidth / (2 * fovScale * stationCamera.z);
                const stationRadiusPx = (currentStation.size * 0.5) * pixelsPerUnit;
                const stationRadiusChars = Math.max(1, Math.round(stationRadiusPx / charDims.width));
                const stationCenterX = Math.round(stationProjected.x);
                const stationCenterY = Math.round(stationProjected.y);
                if (stationRadiusChars <= 1) {
                    RasterUtils.plotDepthText(depthBuffer, stationCenterX, stationCenterY, stationCamera.z, getLocalMapBodySymbol({ type: 'STATION' }), COLORS.GRAY);
                }
                const bboxLeft = stationCenterX - stationRadiusChars;
                const bboxRight = stationCenterX + stationRadiusChars;
                const bboxTop = stationCenterY - stationRadiusChars;
                const bboxBottom = stationCenterY + stationRadiusChars;
                const isOnScreen = bboxRight >= 0 && bboxLeft < viewWidth && bboxBottom >= 0 && bboxTop < viewHeight;

                if (isOnScreen) {
                    const stationName = currentStation.name || 'Station';
                    const isDestination = isDestinationBody({ type: 'STATION', kind: 'STATION' });
                    if (isDestination) {
                        addDestinationLabel(labels, stationCenterX, stationCenterY, stationRadiusChars, stationName, viewWidth, viewHeight);
                    }
                    hoverInfos.push({
                        name: stationName,
                        centerX: stationCenterX,
                        centerY: stationCenterY,
                        radiusChars: stationRadiusChars,
                        depth: stationCamera.z,
                        isOnScreen,
                        depthEpsilon: currentStation.size * 2,
                        labelColor: isDestination ? COLORS.CYAN : COLORS.GRAY,
                        bodyRef: currentStation,
                        kind: 'STATION',
                        type: 'STATION'
                    });
                }
            }
        }

        if (mouseState && mouseState.active && mouseState.inView) {
            const cursorX = mouseState.rawX;
            const cursorY = mouseState.rawY;
            const depthIndex = cursorY * depthBuffer.width + cursorX;
            const depthAtCursor = depthBuffer.depth[depthIndex];

            if (Number.isFinite(depthAtCursor)) {
                let best = null;
                hoverInfos.forEach(info => {
                    const dx = cursorX - info.centerX;
                    const dy = cursorY - info.centerY;
                    const radius = info.radiusChars;
                    const within = radius === 0 ? (dx === 0 && dy === 0) : ((dx * dx + dy * dy) <= (radius * radius));
                    if (!within) {
                        return;
                    }
                    const epsilon = typeof info.depthEpsilon === 'number' ? info.depthEpsilon : 0.002;
                    if (Math.abs(info.depth - depthAtCursor) > epsilon) {
                        return;
                    }
                    if (!best || info.depth < best.depth) {
                        best = info;
                    }
                });

                if (best) {
                    lastHoverPick = best;
                    const labelText = best.name.length > viewWidth ? best.name.slice(0, viewWidth) : best.name;
                    const labelWidth = labelText.length;
                    const rawLabelX = best.centerX - Math.floor(labelWidth / 2);
                    const labelX = Math.max(0, Math.min(viewWidth - labelWidth, rawLabelX));
                    const topY = best.centerY - best.radiusChars - 1;
                    const bottomY = best.centerY + best.radiusChars + 1;
                    let labelY = null;

                    if (topY >= 0) {
                        labelY = Math.min(topY, viewHeight - 1);
                    } else if (bottomY <= viewHeight - 1) {
                        labelY = bottomY;
                    } else {
                        labelY = 0;
                    }

                    labels.push({ x: labelX, y: labelY, text: labelText, color: best.labelColor || COLORS.TEXT_NORMAL });
                } else {
                    lastHoverPick = null;
                }
            }
        } else {
            lastHoverPick = null;
        }

        return labels;
    }


    function renderSystemBodyLabels(labels, viewWidth, viewHeight) {
        if (!labels || labels.length === 0) {
            return;
        }

        labels.forEach(label => {
            if (!label) {
                return;
            }
            const x = Math.max(0, Math.min(viewWidth - Math.max(1, label.text.length), label.x));
            const y = Math.max(0, Math.min(viewHeight - 1, label.y));
            addHudText(x, y, label.text, label.color || COLORS.TEXT_NORMAL);
        });
    }

    function isDestinationBody(body) {
        if (!localDestination || !body) {
            return false;
        }
        if (localDestination.type === 'STATION') {
            return body.type === 'STATION' || body.kind === 'STATION';
        }
        if (localDestination === body) {
            return true;
        }
        if (localDestination.id && body.id && localDestination.id === body.id) {
            return true;
        }
        if (localDestination.name && body.name && localDestination.name === body.name) {
            return true;
        }
        return false;
    }

    function addDestinationLabel(labels, centerX, centerY, radiusChars, name, viewWidth, viewHeight) {
        if (!name) {
            return;
        }
        const labelText = name.length > viewWidth ? name.slice(0, viewWidth) : name;
        const labelWidth = labelText.length;
        const rawLabelX = centerX - Math.floor(labelWidth / 2);
        const labelX = Math.max(0, Math.min(viewWidth - labelWidth, rawLabelX));
        const topY = centerY - radiusChars - 1;
        const bottomY = centerY + radiusChars + 1;
        let labelY = null;

        if (topY >= 0) {
            labelY = Math.min(topY, viewHeight - 1);
        } else if (bottomY <= viewHeight - 1) {
            labelY = bottomY;
        } else {
            labelY = 0;
        }

        labels.push({ x: labelX, y: labelY, text: labelText, color: COLORS.CYAN });
    }

    function getDirectionalArrow(dx, dy) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag <= 0.000001) {
            return '▲';
        }
        const angle = Math.atan2(dy, dx);
        const degrees = (angle * (180 / Math.PI) + 360) % 360;
        if (degrees >= 337.5 || degrees < 22.5) {
            return '▶';
        } else if (degrees >= 22.5 && degrees < 67.5) {
            return '◥';
        } else if (degrees >= 67.5 && degrees < 112.5) {
            return '▲';
        } else if (degrees >= 112.5 && degrees < 157.5) {
            return '◤';
        } else if (degrees >= 157.5 && degrees < 202.5) {
            return '◀';
        } else if (degrees >= 202.5 && degrees < 247.5) {
            return '◣';
        } else if (degrees >= 247.5 && degrees < 292.5) {
            return '▼';
        }
        return '◢';
    }

    function renderDestinationIndicator(viewWidth, viewHeight) {
        const targetInfo = getActiveTargetInfo();
        if (!targetInfo || !playerShip) {
            return;
        }
        const cameraSpace = rotateVecByQuat(subVec(targetInfo.position, playerShip.position), quatConjugate(playerShip.rotation));
        console.log('[DestinationIndicator] cameraSpace', {
            x: cameraSpace.x,
            y: cameraSpace.y,
            z: cameraSpace.z
        });
        let projected = projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, VIEW_FOV);
        if (!projected) {
            const forwardPlane = 0.0001;
            const scale = forwardPlane / Math.abs(cameraSpace.z || forwardPlane);
            projected = projectCameraSpacePointRaw(
                {
                    x: cameraSpace.x * scale,
                    y: cameraSpace.y * scale,
                    z: forwardPlane
                },
                viewWidth,
                viewHeight,
                VIEW_FOV
            );
        }
        console.log('[DestinationIndicator] projected', {
            x: projected?.x,
            y: projected?.y,
            z: projected?.z,
            valid: Boolean(projected)
        });
        if (!projected) {
            return;
        }
        const inView = projected.x >= 0 && projected.x < viewWidth && projected.y >= 0 && projected.y < viewHeight;
        if (inView) {
            console.log('[DestinationIndicator] inView', { inView });
            return;
        }

        const centerX = (viewWidth - 1) / 2;
        const centerY = (viewHeight - 1) / 2;
        let dx = projected.x - centerX;
        let dy = projected.y - centerY;
        if (cameraSpace.z <= 0) {
            dx = -dx;
            dy = -dy;
        }
        console.log('[DestinationIndicator] delta', { dx, dy, behind: cameraSpace.z <= 0 });

        const bounds = {
            minX: 0,
            maxX: viewWidth - 1,
            minY: 0,
            maxY: viewHeight - 1
        };
        const tValues = [];
        if (dx !== 0) {
            tValues.push((bounds.minX - centerX) / dx);
            tValues.push((bounds.maxX - centerX) / dx);
        }
        if (dy !== 0) {
            tValues.push((bounds.minY - centerY) / dy);
            tValues.push((bounds.maxY - centerY) / dy);
        }
        const t = tValues.filter(val => val > 0).reduce((min, val) => Math.min(min, val), Infinity);
        console.log('[DestinationIndicator] tValues', { tValues, t });
        if (!Number.isFinite(t)) {
            return;
        }
        const edgeX = Math.max(bounds.minX, Math.min(bounds.maxX, Math.round(centerX + dx * t)));
        const edgeY = Math.max(bounds.minY, Math.min(bounds.maxY, Math.round(centerY + dy * t)));
        const arrow = getDirectionalArrow(dx, -dy);
        console.log('[DestinationIndicator] edge', { edgeX, edgeY, arrow });
        addHudText(edgeX, edgeY, arrow, COLORS.CYAN);
    }

    function setLocalDestinationFromPick(pick) {
        if (!currentGameState) {
            return;
        }
        const system = currentGameState.getCurrentSystem();
        if (!system) {
            return;
        }

        if (pick.type === 'STATION' || pick.kind === 'STATION') {
            const stationDir = normalizeVec(STATION_ENTRANCE_DIR);
            const stationOrbit = system.stationOrbitAU || SYSTEM_PLANET_ORBIT_MIN_AU;
            const positionWorld = currentStation?.position || {
                x: system.x * LY_TO_AU + stationDir.x * stationOrbit,
                y: system.y * LY_TO_AU + stationDir.y * stationOrbit,
                z: stationDir.z * stationOrbit
            };
            currentGameState.localDestination = {
                id: `${system.name}-STATION`,
                type: 'STATION',
                name: currentStation?.name || `${system.name} Station`,
                positionWorld,
                orbit: {
                    semiMajorAU: stationOrbit,
                    periodDays: Number.POSITIVE_INFINITY,
                    percentOffset: 0,
                    progress: 0
                }
            };
        } else if (pick.bodyRef) {
            currentGameState.localDestination = pick.bodyRef;
        }

        currentGameState.localDestinationSystemIndex = currentGameState.currentSystemIndex;
        localDestination = currentGameState.localDestination;
    }

    function getActiveTargetInfo() {
        if (localDestination && targetSystem) {
            const systemCenter = {
                x: targetSystem.x * LY_TO_AU,
                y: targetSystem.y * LY_TO_AU,
                z: 0
            };
            let rel = { x: 0, y: 0, z: 0 };
            if (localDestination.type === 'STATION' && localDestination.positionWorld) {
                return {
                    position: localDestination.positionWorld,
                    isLocal: true,
                    name: localDestination.id || localDestination.name || localDestination.type || 'Destination',
                    type: localDestination.type || 'LOCAL'
                };
            }
            if (localDestination.orbit) {
                rel = SystemOrbitUtils.getOrbitPosition(localDestination.orbit, currentGameState.date);
            }
            return {
                position: addVec(systemCenter, rel),
                isLocal: true,
                name: localDestination.id || localDestination.name || localDestination.type || 'Destination',
                type: localDestination.type || 'LOCAL'
            };
        }

        if (targetSystem) {
            return {
                position: {
                    x: targetSystem.x * LY_TO_AU,
                    y: targetSystem.y * LY_TO_AU,
                    z: 0
                },
                isLocal: false,
                name: targetSystem.name,
                type: 'SYSTEM'
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
        addHudText(0, startY, '─'.repeat(panelWidth), COLORS.GRAY);

        const ship = playerShip;
        if (!ship) {
            return;
        }

        const fuelRatio = ship.fuel / ship.maxFuel;
        const shieldRatio = ship.maxShields ? (ship.shields / ship.maxShields) : 0;
        const hullRatio = ship.hull / ship.maxHull;

        const speed = vecLength(ship.velocity);
        const speedPerMinute = speed * 60;
        const engine = ship.engine || 10;
        const maxSpeed = ship.size * engine * SHIP_SPEED_PER_ENGINE;
        const speedRatio = maxSpeed > 0 ? (1 + (3 * Math.min(1, speed / maxSpeed))) : 1;

        const targetInfo = getActiveTargetInfo();
        const destinationLabel = targetInfo && targetInfo.name ? targetInfo.name : '--';
        const distanceToTarget = targetInfo ? vecLength(subVec(targetInfo.position, ship.position)) : null;
        const distanceLabel = targetInfo
            ? (targetInfo.isLocal
                ? `${distanceToTarget.toFixed(2)} AU`
                : `${distanceToTarget.toFixed(2)} AU (${(distanceToTarget / LY_TO_AU).toFixed(3)} LY)`)
            : '--';

        TableRenderer.renderKeyValueList(2, startY + 1, [
            {
                label: 'Fuel:',
                value: `${ship.fuel}/${ship.maxFuel}`,
                labelColor: applyPauseColor(COLORS.TEXT_NORMAL),
                valueColor: applyPauseColor(UI.calcStatColor(fuelRatio, true))
            },
            {
                label: 'Shields:',
                value: `${ship.shields}/${ship.maxShields}`,
                labelColor: applyPauseColor(COLORS.TEXT_NORMAL),
                valueColor: applyPauseColor(UI.calcStatColor(shieldRatio, true))
            },
            {
                label: 'Hull:',
                value: `${ship.hull}/${ship.maxHull}`,
                labelColor: applyPauseColor(COLORS.TEXT_NORMAL),
                valueColor: applyPauseColor(UI.calcStatColor(hullRatio, true))
            },
            {
                label: 'Speed:',
                value: `${speedPerMinute.toFixed(2)} AU/m`,
                labelColor: applyPauseColor(COLORS.TEXT_NORMAL),
                valueColor: applyPauseColor(UI.calcStatColor(speedRatio))
            },
            {
                label: 'Destination:',
                value: destinationLabel,
                labelColor: applyPauseColor(COLORS.TEXT_NORMAL),
                valueColor: applyPauseColor(COLORS.TEXT_NORMAL)
            },
            {
                label: 'Distance:',
                value: distanceLabel,
                labelColor: applyPauseColor(COLORS.TEXT_NORMAL),
                valueColor: applyPauseColor(COLORS.TEXT_NORMAL)
            }
        ]);

        // Placeholder button
        renderCompass(viewWidth, viewHeight, startY);

        const menuText = 'MENU';
        const buttonText = `[m] ${menuText}`;
        const menuX = Math.max(0, panelWidth - buttonText.length - 1);
        UI.addButton(menuX, startY + 6, 'm', menuText, () => {
            stop();
            SpaceTravelMenu.show(currentGameState, () => {
                const destination = targetSystem || getNearestSystem(currentGameState);
                show(currentGameState, destination, {
                    resetPosition: false,
                    localDestination
                });
            });
        }, applyPauseColor(COLORS.CYAN), '');
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

        if (entranceDot >= STATION_ENTRANCE_DOT) {
            if (DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Entrance approach - collision suppressed', collisionDebug);
            }
            return false;
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

        addHudText(compassCenterX, compassCenterY, 'o', COLORS.CYAN);

        const arrow = getCompassArrowFromDirection(screenDx, screenDy);
        if (arrow) {
            addHudText(compassCenterX + arrow.dx, compassCenterY + arrow.dy, arrow.symbol, COLORS.CYAN);
        }

        const verticalRatio = cameraSpaceDir.y / distanceToTarget;
        let verticalLabel = 'LVL';
        if (verticalRatio > 0.2) {
            verticalLabel = 'ABV';
        } else if (verticalRatio < -0.2) {
            verticalLabel = 'BLW';
        }
        addHudText(compassCenterX - 2, compassCenterY + 2, verticalLabel, COLORS.CYAN);
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
