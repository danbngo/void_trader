/**
 * Space Travel Map
 * 3D space view used during travel (initial prototype)
 */

const SpaceTravelMap = (() => {
    const config = SpaceTravelConfig;

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

    let lastTimestamp = 0;
    let lastAsciiLogTimestamp = 0;
    let animationId = null;
    let isActive = false;
    let lastStationCollisionMs = -Infinity;
    let damageFlashStartMs = -Infinity;
    let laserFireUntilMs = 0;
    let laserFireStartMs = 0;
    let laserTarget = { x: 0, y: 0 };
    let laserTargetWorldDir = { x: 0, y: 0, z: 1 };
    let laserRegenTimer = 0;
    let shieldRegenTimer = 0;

    const inputState = {
        keyState: new Set(),
        keyDownHandler: null,
        keyUpHandler: null,
        mouseMoveHandler: null,
        mouseDownHandler: null,
        mouseTarget: { x: 0, y: 0 },
        mouseTargetActive: false,
        windowBlurHandler: null,
        windowFocusHandler: null
    };
    let lastHoverPick = null;
    let isPaused = false;
    let pausedByFocus = false;
    let boostActive = false;
    let boostCooldownRemaining = 0;
    let boostCooldownStartSpeed = 0;
    let boostStartTimestampMs = 0;
    let boostBlockMessage = '';
    let boostTurnMessage = '';

    function setPaused(nextPaused, byFocus = false) {
        isPaused = nextPaused;
        pausedByFocus = nextPaused && byFocus;
    }

    function togglePause() {
        setPaused(!isPaused, false);
    }

    function applyPauseColor(color) {
        return isPaused ? ColorUtils.toMonochrome(color) : color;
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
        targetSystem = destination || SpaceTravelLogic.getNearestSystem(gameState);
        localDestination = options.localDestination || gameState.localDestination || null;
        if (localDestination && gameState.localDestinationSystemIndex !== null
            && gameState.localDestinationSystemIndex !== gameState.currentSystemIndex) {
            localDestination = null;
        }
        playerShip = gameState.ships[0];

        if (!Array.isArray(playerShip.lasers)) {
            const laserMax = Ship.getLaserMax(playerShip);
            Ship.setLaserMax(playerShip, laserMax);
            Ship.setLaserCurrent(playerShip, laserMax);
        }

        if (!playerShip.size || playerShip.size <= 0) {
            playerShip.size = Ship.DEFAULT_SIZE_AU;
        }

        const currentSystem = gameState.getCurrentSystem();
        const currentSystemPos = {
            x: currentSystem.x * config.LY_TO_AU,
            y: currentSystem.y * config.LY_TO_AU,
            z: 0
        };

        const hasPosition = playerShip.position && typeof playerShip.position.x === 'number';
        if (resetPosition || !hasPosition) {
            playerShip.velocity = { x: 0, y: 0, z: 0 };
        }

        currentStation = null;
        if (targetSystem) {
            const stationSize = typeof targetSystem.stationSizeAU === 'number'
                ? targetSystem.stationSizeAU
                : 1;
            currentStation = new SpaceStation('DESTINATION', stationSize);
            const stationOrbit = typeof targetSystem.stationOrbitAU === 'number'
                ? targetSystem.stationOrbitAU
                : SYSTEM_PLANET_ORBIT_MAX_AU + SYSTEM_STATION_ORBIT_BUFFER_AU;
            const stationDir = ThreeDUtils.normalizeVec(config.STATION_ENTRANCE_DIR);
            currentStation.position = {
                x: targetSystem.x * config.LY_TO_AU + stationDir.x * stationOrbit,
                y: targetSystem.y * config.LY_TO_AU + stationDir.y * stationOrbit,
                z: stationDir.z * stationOrbit
            };
            currentStation.name = targetSystem.stationName || `${targetSystem.name} Station`;
            currentStation.dataRef = targetSystem.primaryBody || (targetSystem.planets && targetSystem.planets[0]) || null;
            if (currentGameState && currentGameState.date) {
                const gameSeconds = currentGameState.date.getTime() / 1000;
                const dayT = (gameSeconds % config.GAME_SECONDS_PER_DAY) / config.GAME_SECONDS_PER_DAY;
                const angle = (dayT * Math.PI * 2) + (currentStation.rotationPhase || 0);
                currentStation.rotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
            }
        }

        if (resetPosition || !hasPosition) {
            if (currentStation) {
                const baseEntranceDir = ThreeDUtils.normalizeVec(config.STATION_ENTRANCE_DIR);
                const entranceYaw = ThreeDUtils.degToRad(config.STATION_ENTRANCE_YAW_DEG || 0);
                const yawRot = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, entranceYaw);
                const yawedEntranceDir = ThreeDUtils.rotateVecByQuat(baseEntranceDir, yawRot);
                const entranceDir = currentStation.rotation
                    ? ThreeDUtils.rotateVecByQuat(yawedEntranceDir, currentStation.rotation)
                    : yawedEntranceDir;
                const stationRadius = Math.max(0.0001, currentStation.radiusAU ?? currentStation.size ?? 0);
                const shipRadius = Math.max(0.0001, playerShip.size || 0);
                const offsetDistance = (stationRadius * 1.1) + shipRadius;
                const startOffset = ThreeDUtils.scaleVec(entranceDir, offsetDistance);
                playerShip.position = ThreeDUtils.addVec(currentStation.position, startOffset);
            } else {
                playerShip.position = currentSystemPos;
            }

            if (currentStation) {
                const baseEntranceDir = ThreeDUtils.normalizeVec(config.STATION_ENTRANCE_DIR);
                const entranceYaw = ThreeDUtils.degToRad(config.STATION_ENTRANCE_YAW_DEG || 0);
                const yawRot = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, entranceYaw);
                const yawedEntranceDir = ThreeDUtils.rotateVecByQuat(baseEntranceDir, yawRot);
                const entranceDir = currentStation.rotation
                    ? ThreeDUtils.rotateVecByQuat(yawedEntranceDir, currentStation.rotation)
                    : yawedEntranceDir;
                const entrancePoint = ThreeDUtils.addVec(currentStation.position, entranceDir);
                ThreeDUtils.faceToward(playerShip, entrancePoint);
            }
        }

        starSystems = gameState.systems.map(system => ({
            id: system.name,
            position: {
                x: system.x * config.LY_TO_AU,
                y: system.y * config.LY_TO_AU,
                z: 0
            }
        }));

        starfield = ThreeDUtils.buildStarfield(config.STARFIELD_COUNT);
        dustParticles = [];

        possibleStations = [];
        visibleStations = [];
        lastTimestamp = 0;
        lastAsciiLogTimestamp = 0;
        laserFireUntilMs = 0;
        laserFireStartMs = 0;
        laserTarget = { x: 0, y: 0 };
        laserTargetWorldDir = { x: 0, y: 0, z: 1 };
        laserRegenTimer = 0;
        shieldRegenTimer = 0;

        {
            const grid = UI.getGridSize();
            const viewHeight = grid.height - config.PANEL_HEIGHT;
            const viewWidth = grid.width;
            const visibility = SpaceTravelLogic.updateStationVisibility({
                currentStation,
                playerShip,
                viewWidth,
                viewHeight,
                config
            });
            possibleStations = visibility.possibleStations;
            visibleStations = visibility.visibleStations;
        }

        SpaceTravelInput.setupInput({
            keyState: inputState.keyState,
            handlers: inputState,
            setPaused,
            getPaused: () => isPaused,
            getPausedByFocus: () => pausedByFocus,
            onEscape: () => {
                stop();
                SpaceTravelMenu.show(currentGameState, () => {
                    const destination = targetSystem || SpaceTravelLogic.getNearestSystem(currentGameState);
                    show(currentGameState, destination, {
                        resetPosition: false,
                        localDestination
                    });
                });
            },
            onTogglePause: togglePause
        });
        SpaceTravelInput.setupMouseTargeting({
            handlers: inputState,
            config,
            getLastHoverPick: () => lastHoverPick,
            onPick: (pick) => {
                localDestination = SpaceTravelUi.setLocalDestinationFromPick(pick, {
                    currentGameState,
                    localDestination
                }, config);
            },
            onFire: () => {
                fireLaser();
            }
        });
        isActive = true;
        startLoop();
    }

    function stop() {
        isActive = false;
        UI.setGameCursorEnabled?.(true);
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (inputState.keyDownHandler) {
            document.removeEventListener('keydown', inputState.keyDownHandler);
            inputState.keyDownHandler = null;
        }
        if (inputState.keyUpHandler) {
            document.removeEventListener('keyup', inputState.keyUpHandler);
            inputState.keyUpHandler = null;
        }
        if (inputState.windowBlurHandler) {
            window.removeEventListener('blur', inputState.windowBlurHandler);
            inputState.windowBlurHandler = null;
        }
        if (inputState.windowFocusHandler) {
            window.removeEventListener('focus', inputState.windowFocusHandler);
            inputState.windowFocusHandler = null;
        }
        if (inputState.mouseMoveHandler) {
            document.removeEventListener('mousemove', inputState.mouseMoveHandler);
            inputState.mouseMoveHandler = null;
        }
        if (inputState.mouseDownHandler) {
            document.removeEventListener('mousedown', inputState.mouseDownHandler);
            inputState.mouseDownHandler = null;
        }
        inputState.mouseTargetActive = false;
        isPaused = false;
        pausedByFocus = false;
        inputState.keyState.clear();
        lastHoverPick = null;
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

        if (currentGameState && currentGameState.date) {
            const gameSecondsAdvance = dt * config.TIME_SCALE_GAME_SECONDS_PER_REAL_SECOND;
            currentGameState.date = new Date(currentGameState.date.getTime() + (gameSecondsAdvance * 1000));
            currentGameState.timeSinceDock = (currentGameState.timeSinceDock || 0) + (gameSecondsAdvance * 1000);
        }

        {
            const grid = UI.getGridSize();
            const viewHeight = grid.height - config.PANEL_HEIGHT;
            const viewWidth = grid.width;
            const visibility = SpaceTravelLogic.updateStationVisibility({
                currentStation,
                playerShip,
                viewWidth,
                viewHeight,
                config
            });
            possibleStations = visibility.possibleStations;
            visibleStations = visibility.visibleStations;
        }

        if (currentStation && currentGameState && currentGameState.date) {
            const gameSeconds = currentGameState.date.getTime() / 1000;
            const dayT = (gameSeconds % config.GAME_SECONDS_PER_DAY) / config.GAME_SECONDS_PER_DAY;
            const angle = (dayT * Math.PI * 2) + (currentStation.rotationPhase || 0);
            currentStation.rotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
        }

        const turnRad = ThreeDUtils.degToRad(config.TURN_DEG_PER_SEC) * dt;
        const grid = UI.getGridSize();
        const viewHeight = grid.height - config.PANEL_HEIGHT;
        const viewWidth = grid.width;
        const mouseState = SpaceTravelInput.getMouseTargetState(viewWidth, viewHeight, inputState);
        const keyYawLeft = inputState.keyState.has('a') || inputState.keyState.has('A') || inputState.keyState.has('ArrowLeft');
        const keyYawRight = inputState.keyState.has('d') || inputState.keyState.has('D') || inputState.keyState.has('ArrowRight');
        const keyPitchUp = inputState.keyState.has('ArrowUp');
        const keyPitchDown = inputState.keyState.has('ArrowDown');

        const yawLeft = keyYawLeft || mouseState.offLeft;
        const yawRight = keyYawRight || mouseState.offRight;
        const pitchUp = keyPitchUp || mouseState.offTop;
        const pitchDown = keyPitchDown || mouseState.offBottom;

        const accelerate = inputState.keyState.has('w') || inputState.keyState.has('W');
        const brake = inputState.keyState.has('s') || inputState.keyState.has('S');
        const boostKey = inputState.keyState.has('Shift');
        const wasBoosting = boostActive;

        const engine = playerShip.engine || 10;
        const baseMaxSpeed = playerShip.size * engine * config.SHIP_SPEED_PER_ENGINE;
        const baseAccel = playerShip.size * engine * config.SHIP_ACCEL_PER_ENGINE * config.BASE_ACCEL_MULT;
        const speedNow = ThreeDUtils.vecLength(playerShip.velocity);
        const hasFuel = (playerShip.fuel ?? 0) > 0;
        const boostReady = speedNow >= (baseMaxSpeed * config.BOOST_READY_SPEED_RATIO);
        const boostAvailable = hasFuel && boostCooldownRemaining <= 0 && boostReady;
        const requestedBoost = boostKey;
        boostActive = requestedBoost && boostAvailable;
        if (boostActive && !wasBoosting) {
            boostStartTimestampMs = timestampMs;
        }

        boostBlockMessage = '';
        boostTurnMessage = '';
        if (boostKey && !boostActive) {
            if (boostCooldownRemaining > 0 || wasBoosting) {
                boostBlockMessage = 'BOOSTER DISABLED: COOLDOWN';
            } else if (!hasFuel) {
                boostBlockMessage = 'BOOSTER DISABLED: NO FUEL';
            } else if (!boostReady) {
                boostBlockMessage = 'BOOSTER DISABLED: MAX SPEED REQUIRED';
            }
        }
        if (boostActive && (keyYawLeft || keyYawRight || keyPitchUp || keyPitchDown)) {
            boostTurnMessage = 'BOOSTING: TURNING DISABLED';
        }

        if (!boostActive && (yawLeft || yawRight || pitchUp || pitchDown)) {
            let newRotation = playerShip.rotation;

            if (yawLeft) {
                newRotation = ThreeDUtils.quatMultiply(newRotation, ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -turnRad));
            }
            if (yawRight) {
                newRotation = ThreeDUtils.quatMultiply(newRotation, ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, turnRad));
            }
            if (pitchUp) {
                newRotation = ThreeDUtils.quatMultiply(newRotation, ThreeDUtils.quatFromAxisAngle({ x: 1, y: 0, z: 0 }, -turnRad));
            }
            if (pitchDown) {
                newRotation = ThreeDUtils.quatMultiply(newRotation, ThreeDUtils.quatFromAxisAngle({ x: 1, y: 0, z: 0 }, turnRad));
            }

            playerShip.rotation = ThreeDUtils.quatNormalize(newRotation);
        }

        const pendingCooldown = (!boostActive && wasBoosting) ? config.BOOST_COOLDOWN_SEC : boostCooldownRemaining;
        const inBoostCooldown = !boostActive && pendingCooldown > 0;
        const accel = baseAccel * (boostActive ? config.BOOST_ACCEL_MULT : 1);
        const brakeAccel = baseAccel * (boostActive ? config.BOOST_ACCEL_MULT : (inBoostCooldown ? config.BOOST_BRAKE_MULT : 1));
        const maxSpeed = baseMaxSpeed * (boostActive ? config.BOOST_MAX_SPEED_MULT : 1);

        const forward = ThreeDUtils.getLocalAxes(playerShip.rotation).forward;

        if (boostActive) {
            playerShip.velocity = PhysicsUtils.applyAcceleration(playerShip.velocity, forward, accel, dt);
        } else {
            if (accelerate && !inBoostCooldown) {
                playerShip.velocity = PhysicsUtils.applyAcceleration(playerShip.velocity, forward, accel, dt);
            }
            if (brake) {
                playerShip.velocity = PhysicsUtils.applyBrake(playerShip.velocity, brakeAccel, dt);
            }
        }

        if (boostActive) {
            playerShip.fuel = Math.max(0, (playerShip.fuel ?? 0) - (config.BOOST_FUEL_PER_SEC * dt));
            if (playerShip.fuel <= 0) {
                playerShip.fuel = 0;
                boostActive = false;
            }
        }

        if (!boostActive && wasBoosting) {
            boostCooldownRemaining = config.BOOST_COOLDOWN_SEC;
            boostCooldownStartSpeed = ThreeDUtils.vecLength(playerShip.velocity);
        }

        const effectiveMaxSpeed = (!boostActive && boostCooldownRemaining > 0)
            ? Math.max(baseMaxSpeed, boostCooldownStartSpeed)
            : maxSpeed;
        playerShip.velocity = PhysicsUtils.clampSpeed(playerShip.velocity, effectiveMaxSpeed);

        if (!boostActive && boostCooldownRemaining > 0) {
            boostCooldownRemaining = Math.max(0, boostCooldownRemaining - dt);
            const elapsedCooldown = config.BOOST_COOLDOWN_SEC - boostCooldownRemaining;
            const decelT = config.BOOST_COOLDOWN_DECEL_SEC > 0
                ? Math.min(1, elapsedCooldown / config.BOOST_COOLDOWN_DECEL_SEC)
                : 1;
            const targetSpeed = boostCooldownStartSpeed * (1 - decelT);
            const speedNowCooldown = ThreeDUtils.vecLength(playerShip.velocity);
            if (speedNowCooldown > targetSpeed && speedNowCooldown > 0) {
                playerShip.velocity = ThreeDUtils.scaleVec(playerShip.velocity, targetSpeed / speedNowCooldown);
            }
            if (ThreeDUtils.vecLength(playerShip.velocity) <= (baseMaxSpeed * config.BOOST_COOLDOWN_END_SPEED_MULT)) {
                boostCooldownRemaining = 0;
            }
        }

        playerShip.position = ThreeDUtils.addVec(playerShip.position, ThreeDUtils.scaleVec(playerShip.velocity, dt));

        if (applyStarHazards(dt, timestampMs)) {
            return;
        }

        if (targetSystem && Array.isArray(targetSystem.planets)) {
            for (let i = 0; i < targetSystem.planets.length; i++) {
                const planet = targetSystem.planets[i];
                const dockingResult = SpaceTravelLogic.checkPlanetDocking({
                    planet,
                    playerShip,
                    currentGameState,
                    targetSystem,
                    onStop: stop,
                    onDock: ({ currentGameState: dockGameState, targetSystem: dockTarget, planet: dockPlanet }) => {
                        DockingAnimation.show(dockGameState, () => {
                            handleDock({ dockGameState, dockTarget, location: dockPlanet });
                        });
                    },
                    config,
                    debug: true
                });
                if (dockingResult.didDock) {
                    return;
                }
            }
        }

        if (currentStation) {
            const dockingResult = SpaceTravelLogic.checkStationDocking({
                station: currentStation,
                timestampMs,
                playerShip,
                currentGameState,
                targetSystem,
                lastStationCollisionMs,
                damageFlashStartMs,
                onStop: stop,
                onDock: ({ currentGameState: dockGameState, targetSystem: dockTarget }) => {
                    DockingAnimation.show(dockGameState, () => {
                        handleDock({ dockGameState, dockTarget, location: currentStation });
                    });
                },
                config
            });
            lastStationCollisionMs = dockingResult.lastStationCollisionMs;
            damageFlashStartMs = dockingResult.damageFlashStartMs;
            if (dockingResult.didDock) {
                return;
            }
        }

        dustParticles = SpaceTravelParticles.updateDustParticles({
            playerShip,
            dustParticles,
            config,
            getVelocityWorldDirection
        });

        if (config.DEBUG_STATION_LOG) {
            SpaceTravelLogic.logNearestStationDebug({ playerShip });
        }

        regenShipStats(dt);
    }

    function handleDock({ dockGameState, dockTarget, location }) {
        if (dockGameState && dockTarget) {
            const systemIndex = dockGameState.systems.findIndex(system => system === dockTarget || system.name === dockTarget.name);
            if (systemIndex >= 0) {
                dockGameState.setCurrentSystem(systemIndex);
            }
            dockGameState.destination = null;
            dockGameState.localDestination = null;
            dockGameState.localDestinationSystemIndex = null;
        }
        if (dockGameState && typeof dockGameState.setCurrentLocation === 'function') {
            dockGameState.setCurrentLocation(location || dockGameState.getCurrentLocation());
        } else if (dockGameState) {
            dockGameState.currentLocation = location || dockGameState.currentLocation;
        }
        DockMenu.show(dockGameState, location);
    }

    function regenShipStats(dt) {
        const laserMax = Ship.getLaserMax(playerShip);
        const laserCurrent = Ship.getLaserCurrent(playerShip);
        if (laserCurrent < laserMax) {
            laserRegenTimer += dt;
            while (laserRegenTimer >= config.LASER_REGEN_SEC) {
                Ship.setLaserCurrent(playerShip, Ship.getLaserCurrent(playerShip) + 1);
                laserRegenTimer -= config.LASER_REGEN_SEC;
            }
        } else {
            laserRegenTimer = 0;
        }

        if (playerShip.maxShields > 0 && playerShip.shields < playerShip.maxShields) {
            shieldRegenTimer += dt;
            while (shieldRegenTimer >= config.SHIELD_REGEN_SEC) {
                playerShip.shields = Math.min(playerShip.maxShields, playerShip.shields + 1);
                shieldRegenTimer -= config.SHIELD_REGEN_SEC;
            }
        } else {
            shieldRegenTimer = 0;
        }
    }

    function fireLaser() {
        if (!playerShip || isPaused) {
            return;
        }
        const currentLaser = Ship.getLaserCurrent(playerShip);
        if (currentLaser <= 0) {
            return;
        }

        const now = performance.now();
        laserFireStartMs = now;
        laserFireUntilMs = now + config.LASER_FIRE_DURATION_MS;
        laserTarget = getLaserTarget();
        laserTargetWorldDir = getLaserTargetWorldDirection(laserTarget);
        Ship.setLaserCurrent(playerShip, 0);

        if (lastHoverPick && lastHoverPick.bodyRef) {
            const target = lastHoverPick.bodyRef;
            const damage = Ship.getLaserMax(playerShip);
            if (typeof target.shields === 'number' && target.shields > 0) {
                const remaining = Math.max(0, target.shields - damage);
                const overflow = Math.max(0, damage - target.shields);
                target.shields = remaining;
                if (overflow > 0 && typeof target.hull === 'number') {
                    target.hull = Math.max(0, target.hull - overflow);
                }
            } else if (typeof target.hull === 'number') {
                target.hull = Math.max(0, target.hull - damage);
            }
        }
    }

    function applyStarHazards(dt, timestampMs) {
        if (!targetSystem || !playerShip) {
            return false;
        }
        const stars = Array.isArray(targetSystem.stars) ? targetSystem.stars : [];
        if (stars.length === 0) {
            return false;
        }

        const systemCenter = {
            x: targetSystem.x * config.LY_TO_AU,
            y: targetSystem.y * config.LY_TO_AU,
            z: 0
        };

        let tookDamage = false;

        for (let i = 0; i < stars.length; i++) {
            const star = { ...stars[i], kind: 'STAR' };
            const orbitOffset = star.orbit ? SystemOrbitUtils.getOrbitPosition(star.orbit, currentGameState.date) : { x: 0, y: 0, z: 0 };
            const worldPos = ThreeDUtils.addVec(systemCenter, orbitOffset);
            const dist = ThreeDUtils.distance(playerShip.position, worldPos);
            const radius = star.radiusAU || 0;

            if (radius > 0 && dist <= radius) {
                playerShip.shields = 0;
                playerShip.hull = 0;
                damageFlashStartMs = timestampMs;
                return true;
            }

            const heatRange = radius * config.STAR_HEAT_RANGE_MULT;
            if (radius > 0 && dist <= heatRange && config.STAR_HEAT_DAMAGE_PER_SEC > 0) {
                const t = 1 - Math.min(1, (dist - radius) / Math.max(0.000001, heatRange - radius));
                const damage = config.STAR_HEAT_DAMAGE_PER_SEC * t * dt;
                if (damage > 0) {
                    applyDamageToPlayer(damage);
                    tookDamage = true;
                }
            }
        }

        if (tookDamage) {
            if ((timestampMs - damageFlashStartMs) > config.DAMAGE_FLASH_DURATION_MS) {
                damageFlashStartMs = timestampMs;
            }
        }

        return false;
    }

    function applyDamageToPlayer(damage) {
        let remaining = damage;
        if (playerShip.shields > 0) {
            const shieldDamage = Math.min(playerShip.shields, remaining);
            playerShip.shields -= shieldDamage;
            remaining -= shieldDamage;
        }
        if (remaining > 0) {
            playerShip.hull = Math.max(0, playerShip.hull - remaining);
        }
    }

    function render(timestampMs = 0) {
        if (!isActive) {
            return;
        }
        UI.setGameCursorEnabled?.(!isPaused);
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const viewHeight = grid.height - config.PANEL_HEIGHT;
        const viewWidth = grid.width;

        const depthBuffer = RasterUtils.createDepthBuffer(viewWidth, viewHeight);

        const mouseState = SpaceTravelInput.getMouseTargetState(viewWidth, viewHeight, inputState);
        SpaceStationGfx.renderStationOccluders(visibleStations, playerShip, viewWidth, viewHeight, depthBuffer, config.NEAR_PLANE, config.STATION_FACE_DEPTH_BIAS);
        const bodyLabels = SpaceTravelRender.renderSystemBodies({
            viewWidth,
            viewHeight,
            depthBuffer,
            timestampMs,
            mouseState,
            state: {
                targetSystem,
                playerShip,
                localDestination,
                currentGameState,
                currentStation
            },
            config,
            setLastHoverPick: (pick) => {
                lastHoverPick = pick;
            }
        });
        SpaceTravelParticles.renderStars({
            viewWidth,
            viewHeight,
            depthBuffer,
            timestampMs,
            playerShip,
            starfield,
            boostActive,
            boostStartTimestampMs,
            config
        });
        if (!boostActive) {
            SpaceTravelParticles.renderDust({
                viewWidth,
                viewHeight,
                depthBuffer,
                playerShip,
                dustParticles,
                config,
                getVelocityCameraSpace
            });
        }
        renderLaserFire(depthBuffer, viewWidth, viewHeight, timestampMs);
        if (isPaused) {
            for (let i = 0; i < depthBuffer.colors.length; i++) {
                const color = depthBuffer.colors[i];
                if (color) {
                    depthBuffer.colors[i] = ColorUtils.toMonochrome(color);
                }
            }
        }
        RasterUtils.flushDepthBuffer(depthBuffer);
        SpaceTravelHud.renderHud({
            viewWidth,
            viewHeight,
            state: {
                playerShip,
                boostActive,
                boostCooldownRemaining,
                currentGameState
            },
            config,
            helpers: {
                applyPauseColor,
                addHudText,
                getActiveTargetInfo: () => SpaceTravelUi.getActiveTargetInfo({
                    localDestination,
                    targetSystem,
                    currentGameState
                }, config)
            },
            onMenu: () => {
                stop();
                SpaceTravelMenu.show(currentGameState, () => {
                    const destination = targetSystem || SpaceTravelLogic.getNearestSystem(currentGameState);
                    show(currentGameState, destination, {
                        resetPosition: false,
                        localDestination
                    });
                });
            }
        });
        SpaceTravelRender.renderSystemBodyLabels(bodyLabels, viewWidth, viewHeight, addHudText);
        SpaceTravelRender.renderDestinationIndicator(
            viewWidth,
            viewHeight,
            { playerShip },
            config,
            addHudText,
            () => SpaceTravelUi.getActiveTargetInfo({
                localDestination,
                targetSystem,
                currentGameState
            }, config)
        );

        if (isPaused) {
            const label = '=== PAUSED ===';
            const x = Math.floor((viewWidth - label.length) / 2);
            const y = Math.floor(viewHeight / 2);
            UI.addText(x, y, label, COLORS.TEXT_NORMAL);
        } else if (boostTurnMessage || boostBlockMessage) {
            const message = boostTurnMessage || boostBlockMessage;
            const x = Math.floor((viewWidth - message.length) / 2);
            const y = Math.floor(viewHeight / 2);
            UI.addText(x, y, message, COLORS.ORANGE);
        }

        UI.draw();

        if (boostActive || boostCooldownRemaining > 0) {
            const engine = playerShip.engine || 10;
            const baseMaxSpeed = playerShip.size * engine * config.SHIP_SPEED_PER_ENGINE;
            const maxSpeed = baseMaxSpeed * config.BOOST_MAX_SPEED_MULT;
            const speedRatio = maxSpeed > 0 ? Math.min(1, ThreeDUtils.vecLength(playerShip.velocity) / maxSpeed) : 0;
            const cooldownFactor = boostActive
                ? 1
                : (config.BOOST_COOLDOWN_SEC > 0
                    ? Math.min(1, (boostCooldownRemaining / config.BOOST_COOLDOWN_SEC) * 2)
                    : 0);
            let timeRatio = 1;
            if (boostActive) {
                const rampSec = Math.max(0.1, config.BOOST_TINT_RAMP_SEC || 1);
                const elapsedSec = Math.max(0, (timestampMs - boostStartTimestampMs) / 1000);
                timeRatio = Math.min(1, elapsedSec / rampSec);
            }
            let alpha = config.BOOST_TINT_MAX * timeRatio * cooldownFactor;
            if (boostActive) {
                alpha = Math.max(alpha, config.BOOST_TINT_MIN);
            }
            const ctx = UI.getContext?.();
            const canvas = UI.getCanvas?.();
            if (ctx && canvas && alpha > 0) {
                const rect = canvas.getBoundingClientRect();
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ff8a00';
                ctx.fillRect(0, 0, rect.width, rect.height);
                ctx.restore();
            }
        }

        const flashElapsed = timestampMs - damageFlashStartMs;
        if (flashElapsed >= 0 && flashElapsed <= config.DAMAGE_FLASH_DURATION_MS) {
            const t = flashElapsed / config.DAMAGE_FLASH_DURATION_MS;
            const alpha = t < 0.5
                ? (config.DAMAGE_FLASH_ALPHA * (t / 0.5))
                : (config.DAMAGE_FLASH_ALPHA * (1 - ((t - 0.5) / 0.5)));
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
        if (!lastAsciiLogTimestamp || (now - lastAsciiLogTimestamp) >= config.ASCII_LOG_INTERVAL_MS) {
            lastAsciiLogTimestamp = now;
            UI.logScreenToConsole();
        }
    }

    function renderLaserFire(depthBuffer, viewWidth, viewHeight, timestampMs) {
        if (timestampMs < laserFireStartMs || timestampMs > laserFireUntilMs) {
            return;
        }
        const duration = Math.max(1, config.LASER_FIRE_DURATION_MS);
        const progress = Math.min(1, Math.max(0, (timestampMs - laserFireStartMs) / duration));
        const targetScreen = getLaserTargetScreenPosition(viewWidth, viewHeight);
        const targetX = Math.max(0, Math.min(viewWidth - 1, Math.floor(targetScreen.x)));
        const targetY = Math.max(0, Math.min(viewHeight - 1, Math.floor(targetScreen.y)));
        let pulseT = 0;
        if (progress >= 0.25 && progress < 0.5) {
            pulseT = (progress - 0.25) / 0.25;
        } else if (progress >= 0.5 && progress < 0.75) {
            pulseT = 1 - ((progress - 0.5) / 0.25);
        }
        const laserColor = SpaceTravelShared.lerpColorHex(config.LASER_COLOR, '#ffffff', pulseT);

        const leftPoints = LineDrawer.drawLine(0, viewHeight - 1, targetX, targetY, true, config.LASER_COLOR);
        const rightPoints = LineDrawer.drawLine(viewWidth - 1, viewHeight - 1, targetX, targetY, true, config.LASER_COLOR);

        const renderPoints = (points) => {
            if (points.length === 0) {
                return;
            }
            if (progress < 0.5) {
                const growT = progress / 0.5;
                const endIndex = Math.max(0, Math.floor(points.length * growT) - 1);
                for (let i = 0; i <= endIndex; i++) {
                    const point = points[i];
                    RasterUtils.plotDepthText(depthBuffer, point.x, point.y, config.LASER_DEPTH, point.symbol, laserColor);
                }
            } else {
                const shrinkT = (progress - 0.5) / 0.5;
                const startIndex = Math.min(points.length, Math.floor(points.length * shrinkT));
                for (let i = startIndex; i < points.length; i++) {
                    const point = points[i];
                    RasterUtils.plotDepthText(depthBuffer, point.x, point.y, config.LASER_DEPTH, point.symbol, laserColor);
                }
            }
        };

        renderPoints(leftPoints);
        renderPoints(rightPoints);
    }

    function getLaserTarget() {
        const grid = UI.getGridSize();
        const viewWidth = grid.width;
        const viewHeight = grid.height - config.PANEL_HEIGHT;
        const mouseState = SpaceTravelInput.getMouseTargetState(viewWidth, viewHeight, inputState);
        if (mouseState && mouseState.active) {
            return { x: mouseState.displayX, y: mouseState.displayY };
        }
        return {
            x: Math.floor(viewWidth / 2),
            y: Math.floor(viewHeight / 2)
        };
    }

    function getLaserTargetWorldDirection(target) {
        const grid = UI.getGridSize();
        const viewWidth = grid.width;
        const viewHeight = grid.height - config.PANEL_HEIGHT;
        const cameraDir = RasterUtils.screenRayDirection(target.x, target.y, viewWidth, viewHeight, config.VIEW_FOV);
        return ThreeDUtils.rotateVecByQuat(cameraDir, playerShip.rotation);
    }

    function getLaserTargetScreenPosition(viewWidth, viewHeight) {
        if (!laserTargetWorldDir) {
            return laserTarget;
        }
        const cameraDir = ThreeDUtils.rotateVecByQuat(laserTargetWorldDir, ThreeDUtils.quatConjugate(playerShip.rotation));
        const projected = RasterUtils.projectCameraSpacePointRaw(cameraDir, viewWidth, viewHeight, config.VIEW_FOV);
        if (!projected) {
            return { x: viewWidth / 2, y: viewHeight / 2 };
        }
        return { x: projected.x, y: projected.y };
    }

    function getVelocityWorldDirection() {
        const speed = ThreeDUtils.vecLength(playerShip.velocity);
        if (speed > 0.000001) {
            return ThreeDUtils.normalizeVec(playerShip.velocity);
        }
        return ThreeDUtils.getLocalAxes(playerShip.rotation).forward;
    }

    function getVelocityCameraSpace() {
        const relativeVelocity = ThreeDUtils.scaleVec(playerShip.velocity, -1);
        return ThreeDUtils.rotateVecByQuat(relativeVelocity, ThreeDUtils.quatConjugate(playerShip.rotation));
    }

    return {
        show,
        stop
    };
})();
