/**
 * Space Travel Map
 * 3D space view used during travel (initial prototype)
 */

class SpaceTravelMapClass {
    constructor() {
        this.config = SpaceTravelConfig;
        this.deathTow = SpaceTravelDeathTow.create(this.config);
        this.docking = SpaceTravelDocking.create(this.config);
        this.laser = SpaceTravelLaser.create();
        this.hazards = SpaceTravelHazards.create(this.config);
        this.animation = SpaceTravelAnimation.create(this.config);
        this.messages = SpaceTravelMessages.create(this.config);

        // === State ===
        this.currentGameState = null;
        this.targetSystem = null;
        this.localDestination = null;
        this.playerShip = null;
        this.currentStation = null;

        this.inputState = {
            keyState: new Set(),
            codeState: new Set(),
            keyDownHandler: null,
            keyUpHandler: null,
            mouseMoveHandler: null,
            mouseDownHandler: null,
            mouseTarget: { x: 0, y: 0 },
            mouseTargetActive: false,
            windowBlurHandler: null,
            windowFocusHandler: null
        };
        this.lastHoverPick = null;
        this.isPaused = false;
        this.pausedByFocus = false;
        this.pauseTimestampMs = 0;
        this.pausedDurationMs = 0;

        // Animation and rendering state
        this.isActive = false;
        this.animationId = null;
        this.lastTimestamp = 0;
        this.lastAsciiLogTimestamp = 0;
        this.lastRollLogMs = 0;
        this.lastAutoNavLogMs = 0;
        this.lastAutoNavBoostDesired = null;
        this.lastAutoNavBoostActive = null;

        // Particle and visual state
        this.starSystems = [];
        this.starfield = [];
        this.dustParticles = [];
        this.possibleStations = [];
        this.visibleStations = [];

        // Laser state
        this.laserEmptyTimestampMs = 0;
        this.laserRegenTimer = 0;

        // Shield state
        this.shieldRegenTimer = 0;

        // Boost state
        this.boostActive = false;
        this.boostStartTimestampMs = 0;
        this.boostEndTimestampMs = 0;
        this.boostCooldownRemaining = 0;
        this.boostCooldownStartSpeed = 0;
        this.boostBlockMessage = '';
        this.boostTurnMessage = '';
        this.boostBlockMessageTimestampMs = 0;
        this.boostTurnMessageTimestampMs = 0;
        this.boostNoFuelTimestampMs = 0;

        // Auto navigation state
        this.autoNavActive = false;
        this.autoNavInput = null;
        this.autoNavBoostBreakpointDistance = 0; // Fixed boost engagement distance, calculated once when starting autonav

        // Portal / warp state
        this.portalActive = false;
        this.portalPosition = null;
        this.portalRadius = 0;
        this.portalOpenTimestampMs = 0;
        this.portalCloseTimestampMs = 0;
        this.portalTargetSystem = null;
        this.warpFadeOutStartMs = 0;

        // Emergence momentum state (when warping into a system)
        this.emergenceMomentumActive = false;
        this.emergenceMomentumStartMs = 0;
        this.emergenceMomentumDirection = null;
        this.emergenceMomentumMaxSpeed = 0;
        const EMERGENCE_MOMENTUM_DURATION_MS = 3000;
        const EMERGENCE_MOMENTUM_MULTIPLIER = 10;

        // Damage and collision state
        this.damageFlashStartMs = 0;
        this.lastStationCollisionMs = 0;
    }

    setPaused(nextPaused, byFocus = false) {
        const now = performance.now();
        if (nextPaused && !this.isPaused) {
            this.pauseTimestampMs = now;
        }
        if (!nextPaused && this.isPaused) {
            if (this.pauseTimestampMs) {
                this.pausedDurationMs += (now - this.pauseTimestampMs);
            }
            this.pauseTimestampMs = 0;
        }
        this.isPaused = nextPaused;
        this.pausedByFocus = nextPaused && byFocus;
    }

    _getRenderTimestampMs(timestampMs) {
        if (this.isPaused) {
            return this.pauseTimestampMs || timestampMs;
        }
        return Math.max(0, timestampMs - this.pausedDurationMs);
    }

    togglePause() {
        this.setPaused(!this.isPaused, false);
    }

    applyPauseColor(color) {
        return this.isPaused ? ColorUtils.toMonochrome(color) : color;
    }

    getBaseMaxSpeed(ship) {
        const engine = ship?.engine || 10;
        return engine * this.config.SHIP_SPEED_PER_ENGINE;
    }

    getMaxSpeed(ship, isBoosting) {
        const baseMaxSpeed = this.getBaseMaxSpeed(ship);
        return baseMaxSpeed * (isBoosting ? this.config.BOOST_MAX_SPEED_MULT : 1);
    }

    addHudText(x, y, text, color) {
        UI.addText(x, y, text, this.applyPauseColor(color));
    }

    getActiveTargetInfo() {
        return SpaceTravelUi.getActiveTargetInfo({
            localDestination: this.localDestination,
            targetSystem: this.targetSystem,
            currentGameState: this.currentGameState,
            playerShip: this.playerShip
        }, this.config);
    }

    openTravelPortal(targetSystem, timestampMs = performance.now()) {
        if (!this.playerShip || !targetSystem) {
            return;
        }
        const forward = ThreeDUtils.getLocalAxes(this.playerShip.rotation).forward;
        const distance = this.config.PORTAL_DISTANCE_AU;
        const position = ThreeDUtils.addVec(this.playerShip.position, ThreeDUtils.scaleVec(forward, distance));

        this.portalActive = true;
        this.portalPosition = position;
        this.portalRadius = this.config.PORTAL_RADIUS_AU;
        this.portalOpenTimestampMs = timestampMs;
        this.portalCloseTimestampMs = timestampMs + (this.config.PORTAL_DURATION_MS || 5000);
        this.portalTargetSystem = targetSystem;
    }

    toggleAutoNav() {
        const targetInfo = this.getActiveTargetInfo();
        if (!targetInfo) {
            return;
        }
        this.autoNavActive = !this.autoNavActive;
        if (!this.autoNavActive) {
            this.autoNavInput = null;
            this.autoNavBoostBreakpointDistance = 0;
        } else {
            // Calculate boost breakpoint distance once when activating auto-nav
            // This prevents oscillation caused by dynamic stopping distance recalculation
            if (this.playerShip) {
                const engine = this.playerShip.engine || 10;
                const baseAccel = this.playerShip.size * engine * this.config.SHIP_ACCEL_PER_ENGINE * this.config.BASE_ACCEL_MULT;
                const brakeAccel = baseAccel * 2;
                const boostMaxSpeed = this.getMaxSpeed(this.playerShip, true);
                const desiredDistance = this._getAutoNavDesiredDistance(targetInfo);
                
                // Calculate stopping distance at boost speed
                const boostStoppingDist = (boostMaxSpeed * boostMaxSpeed) / (2 * brakeAccel);
                this.autoNavBoostBreakpointDistance = desiredDistance + boostStoppingDist;
            }
        }
        if (this.inputState?.keyState?.clear) {
            this.inputState.keyState.clear();
        }
        if (this.inputState?.codeState?.clear) {
            this.inputState.codeState.clear();
        }
    }

    show(gameState, destination, options = {}) {
        this.stop();
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();
        UI.setButtonNavigationEnabled?.(true);

        this.deathTow.reset();
        this.docking.reset();
        this.laser.reset();

        const resetPosition = options.resetPosition !== false;

        this.currentGameState = gameState;
        this.targetSystem = destination || SpaceTravelLogic.getNearestSystem(gameState);
        this.localDestination = options.localDestination || gameState.localDestination || null;
        if (this.localDestination && gameState.localDestinationSystemIndex !== null
            && gameState.localDestinationSystemIndex !== gameState.currentSystemIndex) {
            this.localDestination = null;
        }
        this.playerShip = gameState.ships[0];

        this._initializePlayerShip();
        this._initializeStation();
        this._positionPlayerShip(resetPosition, options.warpFadeOut);
        this._initializeStarfield();
        this._updateVisibility();

        // Initialize emergence momentum if warping in
        if (options.warpFadeOut) {
            this._initializeEmergenceMomentum();
        }

        this.portalActive = false;
        this.portalPosition = null;
        this.portalTargetSystem = null;
        this.warpFadeOutStartMs = options.warpFadeOut ? performance.now() : 0;

        if (options.openPortalTargetSystem) {
            this.openTravelPortal(options.openPortalTargetSystem, performance.now());
        }

        SpaceTravelInput.initializeInputHandlers(this);
        this.isActive = true;
        this.startLoop();
    }

    _initializePlayerShip() {
        if (!Array.isArray(this.playerShip.lasers)) {
            const laserMax = Ship.getLaserMax(this.playerShip);
            Ship.setLaserMax(this.playerShip, laserMax);
            Ship.setLaserCurrent(this.playerShip, laserMax);
        }
        if (!this.playerShip.size || this.playerShip.size <= 0) {
            this.playerShip.size = Ship.DEFAULT_SIZE_AU;
        }
    }

    _initializeStation() {
        this.currentStation = null;
        if (!this.targetSystem) return;

        this.currentStation = this.targetSystem.station;
        const stationOrbit = this.currentStation.orbit.semiMajorAU;
        const stationDir = ThreeDUtils.normalizeVec(this.config.STATION_ENTRANCE_DIR);
        this.currentStation.position = {
            x: this.targetSystem.x * this.config.LY_TO_AU + stationDir.x * stationOrbit,
            y: this.targetSystem.y * this.config.LY_TO_AU + stationDir.y * stationOrbit,
            z: stationDir.z * stationOrbit
        };
        if (!this.currentStation.name) {
            this.currentStation.name = `${this.targetSystem.name} Station`;
        }
        this.currentStation.dataRef = this.targetSystem.primaryBody || (this.targetSystem.planets && this.targetSystem.planets[0]) || null;
        
        if (this.currentGameState && this.currentGameState.date) {
            const gameSeconds = this.currentGameState.date.getTime() / 1000;
            const dayT = (gameSeconds % this.config.GAME_SECONDS_PER_DAY) / this.config.GAME_SECONDS_PER_DAY;
            const angle = (dayT * Math.PI * 2) + (this.currentStation.rotationPhase || 0);
            this.currentStation.rotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
        }

        if (!this.localDestination && this.currentStation && this.currentGameState) {
            this.currentGameState.localDestination = {
                type: 'STATION',
                positionWorld: { ...this.currentStation.position },
                id: this.currentStation.name || 'Station',
                name: this.currentStation.name || 'Station',
                orbit: this.currentStation.orbit
            };
            this.currentGameState.localDestinationSystemIndex = this.currentGameState.currentSystemIndex;
            this.localDestination = this.currentGameState.localDestination;
        }
    }

    _positionPlayerShip(resetPosition, isWarpArrival = false) {
        const currentSystem = this.currentGameState.getCurrentSystem();
        const currentSystemPos = {
            x: currentSystem.x * this.config.LY_TO_AU,
            y: currentSystem.y * this.config.LY_TO_AU,
            z: 0
        };

        const hasPosition = this.playerShip.position && typeof this.playerShip.position.x === 'number';
        if (resetPosition || !hasPosition) {
            this.playerShip.velocity = { x: 0, y: 0, z: 0 };
        }

        if (resetPosition || !hasPosition) {
            if (this.currentStation) {
                const baseEntranceDir = ThreeDUtils.normalizeVec(this.config.STATION_ENTRANCE_DIR);
                const entranceYaw = ThreeDUtils.degToRad(this.config.STATION_ENTRANCE_YAW_DEG || 0);
                const yawRot = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, entranceYaw);
                const yawedEntranceDir = ThreeDUtils.rotateVecByQuat(baseEntranceDir, yawRot);
                const entranceDir = this.currentStation.rotation
                    ? ThreeDUtils.rotateVecByQuat(yawedEntranceDir, this.currentStation.rotation)
                    : yawedEntranceDir;
                const stationRadius = Math.max(0, this.currentStation.radiusAU ?? this.currentStation.size ?? 0);
                const stationVisualScale = this.config.STATION_SCREEN_SCALE || 1;
                const stationPhysicsScale = (typeof this.config.STATION_PHYSICS_SCALE === 'number' && this.config.STATION_PHYSICS_SCALE > 0)
                    ? this.config.STATION_PHYSICS_SCALE
                    : 1;
                const stationSpawnScale = Math.max(stationPhysicsScale, stationVisualScale);
                const spawnMult = typeof this.config.STATION_SPAWN_DISTANCE_MULT === 'number'
                    ? this.config.STATION_SPAWN_DISTANCE_MULT
                    : 1.1;
                // Apply extra distance for warp arrival
                const warpDistanceMult = isWarpArrival ? 3 : 1;
                const minSpawnDistance = typeof this.config.STATION_SPAWN_MIN_DISTANCE_AU === 'number'
                    ? this.config.STATION_SPAWN_MIN_DISTANCE_AU
                    : 0;
                const offsetDistance = Math.max(
                    minSpawnDistance,
                    stationRadius * stationSpawnScale * spawnMult * warpDistanceMult
                );
                const startOffset = ThreeDUtils.scaleVec(entranceDir, offsetDistance);
                this.playerShip.position = ThreeDUtils.addVec(this.currentStation.position, startOffset);
                ThreeDUtils.faceToward(this.playerShip, this.currentStation.position);
            } else {
                this.playerShip.position = currentSystemPos;
            }
        }
    }

    _initializeEmergenceMomentum() {
        if (!this.currentStation || !this.playerShip) {
            return;
        }

        const towards = ThreeDUtils.subVec(this.currentStation.position, this.playerShip.position);
        const direction = ThreeDUtils.normalizeVec(towards);
        const maxSpeed = this.getMaxSpeed(this.playerShip, false) || this.config.SHIP_MAX_SPEED_AU_PER_MS || 0;
        const momentumSpeed = maxSpeed * 10; // 10x max speed

        this.emergenceMomentumActive = true;
        this.emergenceMomentumStartMs = performance.now();
        this.emergenceMomentumDirection = direction;
        this.emergenceMomentumMaxSpeed = momentumSpeed;
        
        // Apply initial velocity
        this.playerShip.velocity = ThreeDUtils.scaleVec(direction, momentumSpeed);
    }

    _updateEmergenceMomentum(timestampMs) {
        if (!this.emergenceMomentumActive) {
            return false;
        }

        const EMERGENCE_MOMENTUM_DURATION_MS = 3000;
        const elapsed = timestampMs - this.emergenceMomentumStartMs;

        if (elapsed >= EMERGENCE_MOMENTUM_DURATION_MS) {
            this.emergenceMomentumActive = false;
            this.emergenceMomentumDirection = null;
            this.emergenceMomentumMaxSpeed = 0;
            return false;
        }

        // Taper off momentum (similar to boost cooldown deceleration)
        const remaining = EMERGENCE_MOMENTUM_DURATION_MS - elapsed;
        const progress = 1 - (remaining / EMERGENCE_MOMENTUM_DURATION_MS);
        const tapering = Math.pow(1 - progress, 2); // Smooth taper
        const speed = this.emergenceMomentumMaxSpeed * tapering;

        if (this.emergenceMomentumDirection) {
            this.playerShip.velocity = ThreeDUtils.scaleVec(this.emergenceMomentumDirection, speed);
        }

        return true;
    }

    _getEmergenceMomentumCooldownRemaining() {
        if (!this.emergenceMomentumActive) {
            return 0;
        }
        const EMERGENCE_MOMENTUM_DURATION_MS = 3000;
        const elapsed = performance.now() - this.emergenceMomentumStartMs;
        return Math.max(0, EMERGENCE_MOMENTUM_DURATION_MS - elapsed);
    }

    _initializeStarfield() {
        this.starSystems = this.currentGameState.systems.map(system => ({
            id: system.name,
            x: system.x,
            y: system.y,
            z: 0
        }));
        this.starfield = ThreeDUtils.buildStarfield(this.config.STARFIELD_COUNT);
        this.dustParticles = [];
        this.possibleStations = [];
        this.visibleStations = [];
        this.lastTimestamp = 0;
        this.lastAsciiLogTimestamp = 0;
        this.laserEmptyTimestampMs = 0;
        this.laserRegenTimer = 0;
        this.shieldRegenTimer = 0;
    }

    _updateVisibility() {
        const grid = UI.getGridSize();
        const viewHeight = grid.height - this.config.PANEL_HEIGHT;
        const viewWidth = grid.width;
        const visibility = SpaceTravelLogic.updateStationVisibility({
            currentStation: this.currentStation,
            playerShip: this.playerShip,
            viewWidth,
            viewHeight,
            config: this.config
        });
        this.possibleStations = visibility.possibleStations;
        this.visibleStations = visibility.visibleStations;
    }

    stop() {
        this.isActive = false;
        UI.setGameCursorEnabled?.(true);
        UI.setButtonNavigationEnabled?.(true);
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        SpaceTravelInput.teardownInputHandlers(this.inputState);
        this.isPaused = false;
        this.pausedByFocus = false;
        this.lastHoverPick = null;
        this.autoNavActive = false;
        this.autoNavInput = null;
        this.portalActive = false;
        this.portalPosition = null;
        this.portalTargetSystem = null;
        this.warpFadeOutStartMs = 0;
    }

    startLoop() {
        const loop = (timestamp) => {
            if (!this.isActive) {
                return;
            }
            if (!this.lastTimestamp) {
                this.lastTimestamp = timestamp;
            }
            const dt = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000);
            this.lastTimestamp = timestamp;

            this.update(dt, timestamp);
            if (!this.isActive) {
                return;
            }
            this.render(timestamp);

            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }

    update(dt, timestampMs = 0) {
        if (!this.playerShip || this.isPaused) {
            return;
        }

        if (this.docking.isDockSequenceActive()) {
            this.docking.updateDocking(this, timestampMs);
            return;
        }

        if (this.deathTow.isDeathSequenceActive()) {
            if (this._handleDeathSequence(timestampMs)) return;
            return;
        }

        this._advanceTime(dt);
        this._updateVisibility();
        this._updateStationRotation();
        SpaceTravelInput.handleInput(this, dt, timestampMs, this.messages);
        if (this.autoNavActive) {
            this._updateAutoNav(dt, timestampMs);
        }
        this._updateMovement(dt, timestampMs);
        this._updateEmergenceMomentum(timestampMs);
        if (this._updatePortal(timestampMs)) return;
        const killed = this.hazards.checkHazardsAndCollisions(this, timestampMs);
        if (killed && this._handleDeathSequence(timestampMs)) return;
        this.docking.checkDocking(this);
        SpaceTravelParticles.updateParticles(this);
        this.regenShipStats(dt);
    }

    _handleDeathSequence(timestampMs) {
        return this.deathTow.handleTowFromSpace({
            ...this,
            timestampMs,
            stop: () => this.stop(),
            TowMenu,
            onCancelBoost: () => { this.boostActive = false; }
        });
    }

    _advanceTime(dt) {
        if (this.currentGameState && this.currentGameState.date) {
            const gameSecondsAdvance = dt * this.config.TIME_SCALE_GAME_SECONDS_PER_REAL_SECOND;
            this.currentGameState.date = new Date(this.currentGameState.date.getTime() + (gameSecondsAdvance * 1000));
            this.currentGameState.timeSinceDock = (this.currentGameState.timeSinceDock || 0) + (gameSecondsAdvance * 1000);
        }
    }

    _updateStationRotation() {
        if (this.currentStation && this.currentGameState && this.currentGameState.date) {
            const gameSeconds = this.currentGameState.date.getTime() / 1000;
            const dayT = (gameSeconds % this.config.GAME_SECONDS_PER_DAY) / this.config.GAME_SECONDS_PER_DAY;
            const angle = (dayT * Math.PI * 2) + (this.currentStation.rotationPhase || 0);
            this.currentStation.rotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
        }
    }

    _updateMovement(dt, timestampMs = 0) {
        const autoNavInput = this.autoNavActive ? this.autoNavInput : null;
        const codeState = this.inputState.codeState || this.inputState.keyState;
        const accelerate = (this.emergenceMomentumActive) // Block acceleration during emergence
            ? false
            : (autoNavInput
                ? !!autoNavInput.accelerate
                : (codeState.has('KeyW') || this.inputState.keyState.has('w') || this.inputState.keyState.has('W')));
        const brake = autoNavInput
            ? !!autoNavInput.brake
            : (codeState.has('KeyS') || this.inputState.keyState.has('s') || this.inputState.keyState.has('S'));
        const boostKey = (this.emergenceMomentumActive) // Block boost during emergence
            ? false
            : (autoNavInput
                ? !!autoNavInput.boost
                : (codeState.has('ShiftLeft') || codeState.has('ShiftRight') || this.inputState.keyState.has('Shift')));
        const wasBoosting = this.boostActive;

        const engine = this.playerShip.engine || 10;
        const baseMaxSpeed = this.getBaseMaxSpeed(this.playerShip);
        const baseAccel = this.playerShip.size * engine * this.config.SHIP_ACCEL_PER_ENGINE * this.config.BASE_ACCEL_MULT;
        const speedNow = ThreeDUtils.vecLength(this.playerShip.velocity);
        const hasFuel = (this.playerShip.fuel ?? 0) > 0;
        const boostReady = speedNow >= (baseMaxSpeed * this.config.BOOST_READY_SPEED_RATIO);

        this.boostActive = boostKey && hasFuel && this.boostCooldownRemaining <= 0 && boostReady;

        if (this.boostActive && !wasBoosting) {
            this.boostStartTimestampMs = timestampMs;
            console.log('[SpaceTravel] Boost started:', { timestampMs, boostStartTimestampMs: this.boostStartTimestampMs });
        }
        if (!this.boostActive && wasBoosting) {
            this.boostEndTimestampMs = timestampMs;
            console.log('[SpaceTravel] Boost ended:', { timestampMs, boostEndTimestampMs: this.boostEndTimestampMs });
        }

        const pendingCooldown = (!this.boostActive && wasBoosting) ? this.config.BOOST_COOLDOWN_SEC : this.boostCooldownRemaining;
        const inBoostCooldown = !this.boostActive && pendingCooldown > 0;
        const accel = baseAccel * (this.boostActive ? this.config.BOOST_ACCEL_MULT : 1);
        const brakeAccel = baseAccel * (this.boostActive ? this.config.BOOST_ACCEL_MULT : (inBoostCooldown ? this.config.BOOST_BRAKE_MULT : 2));
        const maxSpeed = this.getMaxSpeed(this.playerShip, this.boostActive);
        const forward = ThreeDUtils.getLocalAxes(this.playerShip.rotation).forward;

        if (this.boostActive) {
            this.playerShip.velocity = PhysicsUtils.applyAcceleration(this.playerShip.velocity, forward, accel, dt);
        } else {
            if (accelerate && !inBoostCooldown) {
                this.playerShip.velocity = PhysicsUtils.applyAcceleration(this.playerShip.velocity, forward, accel, dt);
            }
            if (brake) {
                this.playerShip.velocity = PhysicsUtils.applyBrake(this.playerShip.velocity, brakeAccel, dt);
            }
        }

        if (this.boostActive) {
            this.playerShip.fuel = Math.max(0, (this.playerShip.fuel ?? 0) - (this.config.BOOST_FUEL_PER_SEC * dt));
            if (this.playerShip.fuel <= 0) {
                this.playerShip.fuel = 0;
                this.boostActive = false;
                this.boostEndTimestampMs = timestampMs;
            }
        }

        if (!this.boostActive && wasBoosting) {
            this.boostCooldownRemaining = this.config.BOOST_COOLDOWN_SEC;
            this.boostCooldownStartSpeed = ThreeDUtils.vecLength(this.playerShip.velocity);
        }

        const effectiveMaxSpeed = (!this.boostActive && this.boostCooldownRemaining > 0)
            ? Math.max(baseMaxSpeed, this.boostCooldownStartSpeed)
            : maxSpeed;
        this.playerShip.velocity = PhysicsUtils.clampSpeed(this.playerShip.velocity, effectiveMaxSpeed);

        if (!this.boostActive && this.boostCooldownRemaining > 0) {
            this.boostCooldownRemaining = Math.max(0, this.boostCooldownRemaining - dt);
            const elapsedCooldown = this.config.BOOST_COOLDOWN_SEC - this.boostCooldownRemaining;
            const decelT = this.config.BOOST_COOLDOWN_DECEL_SEC > 0
                ? Math.min(1, elapsedCooldown / this.config.BOOST_COOLDOWN_DECEL_SEC)
                : 1;
            const targetSpeed = this.boostCooldownStartSpeed * (1 - decelT);
            const speedNowCooldown = ThreeDUtils.vecLength(this.playerShip.velocity);
            if (speedNowCooldown > targetSpeed && speedNowCooldown > 0) {
                this.playerShip.velocity = ThreeDUtils.scaleVec(this.playerShip.velocity, targetSpeed / speedNowCooldown);
            }
            if (ThreeDUtils.vecLength(this.playerShip.velocity) <= (baseMaxSpeed * this.config.BOOST_COOLDOWN_END_SPEED_MULT)) {
                this.boostCooldownRemaining = 0;
            }
        }

        this.playerShip.position = ThreeDUtils.addVec(this.playerShip.position, ThreeDUtils.scaleVec(this.playerShip.velocity, dt));
    }

    _updatePortal(timestampMs) {
        if (!this.portalActive || !this.portalPosition || !this.portalTargetSystem) {
            return false;
        }

        // Portal is now persistent - doesn't expire after duration
        // if (timestampMs >= this.portalCloseTimestampMs) {
        //     this.portalActive = false;
        //     this.portalPosition = null;
        //     this.portalTargetSystem = null;
        //     return false;
        // }

        const distance = ThreeDUtils.distance(this.playerShip.position, this.portalPosition);
        if (distance <= this.portalRadius) {
            this._startWarp(this.portalTargetSystem);
            return true;
        }

        return false;
    }

    _startWarp(targetSystem) {
        if (!targetSystem || !this.currentGameState) {
            return;
        }

        const gameState = this.currentGameState;
        const previousIndex = gameState.currentSystemIndex;

        this.portalActive = false;
        this.portalPosition = null;
        this.portalTargetSystem = null;
        this.autoNavActive = false;
        this.autoNavInput = null;

        this.stop();

        WarpAnimation.show(gameState, targetSystem, (state, destination) => {
            const targetIndex = state.systems.findIndex(system => system === destination || system.name === destination?.name);
            if (targetIndex >= 0) {
                if (typeof state.setCurrentSystem === 'function') {
                    state.setCurrentSystem(targetIndex);
                } else {
                    state.currentSystemIndex = targetIndex;
                }
            }
            state.previousSystemIndex = previousIndex;
            state.destination = null;
            state.localDestination = null;
            state.localDestinationSystemIndex = null;

            SpaceTravelMap.show(state, destination, {
                resetPosition: true,
                warpFadeOut: true
            });
        });
    }

    _renderPortal(depthBuffer, viewWidth, viewHeight, timestampMs = performance.now()) {
        if (!this.portalActive || !this.portalPosition) {
            return;
        }

        const relative = ThreeDUtils.subVec(this.portalPosition, this.playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(this.playerShip.rotation));
        if (cameraSpace.z <= this.config.NEAR_PLANE) {
            return;
        }

        const charDims = UI.getCharDimensions();
        const aspectFromMetrics = charDims.height / Math.max(0.000001, charDims.width);
        const aspectOverride = this.config.CHAR_CELL_ASPECT_RATIO;
        const resolvedAspect = (typeof aspectOverride === 'number' && Number.isFinite(aspectOverride))
            ? aspectOverride
            : aspectFromMetrics;

        const segments = Math.max(8, this.config.PORTAL_SEGMENTS || 32);
        const radiusX = this.portalRadius;
        const radiusY = this.portalRadius / resolvedAspect;
        const step = (Math.PI * 2) / segments;
        
        // Rotation speed in radians per millisecond
        const rotationSpeed = Math.PI / 3000; // Full rotation in ~3 seconds
        const rotationOffset = (timestampMs % 6000) * rotationSpeed; // Loop every 6 seconds
        
        for (let i = 0; i < segments; i++) {
            const angle = i * step + rotationOffset;
            const point = {
                x: cameraSpace.x + Math.cos(angle) * radiusX,
                y: cameraSpace.y + Math.sin(angle) * radiusY,
                z: cameraSpace.z
            };
            const projected = RasterUtils.projectCameraSpacePointRaw(point, viewWidth, viewHeight, this.config.VIEW_FOV);
            if (!projected) {
                continue;
            }
            const x = Math.round(projected.x);
            const y = Math.round(projected.y);
            if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
                // Calculate color based on angle
                // Cyan at top/bottom (0° and 180°), blue at left/right (90° and 270°)
                const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const angleDeg = (normalizedAngle * 180 / Math.PI) % 360;
                
                let color = COLORS.CYAN;
                // Smooth gradient: 0-45°=cyan, 45-90°=cyan→blue, 90-135°=blue, 135-180°=blue→cyan, etc.
                const intervalAngle = (angleDeg % 180); // 0-180 range (due to symmetry)
                if (intervalAngle > 45 && intervalAngle < 135) {
                    // Interpolate between cyan and blue
                    const t = (intervalAngle - 45) / 90; // 0-1
                    const midpoint = Math.abs(t - 0.5);
                    color = midpoint < 0.25 ? COLORS.BLUE : COLORS.CYAN;
                }
                
                RasterUtils.plotDepthText(depthBuffer, x, y, point.z, 'o', color);
            }
        }
    }

    _getAutoNavDesiredDistance(targetInfo) {
        if (!targetInfo) {
            return 0;
        }

        const body = this.localDestination;
        const type = body?.type || body?.kind || targetInfo.type;

        if (type === 'STAR') {
            const bodyDockScale = (typeof this.config.SYSTEM_BODY_PHYSICS_SCALE === 'number' && this.config.SYSTEM_BODY_PHYSICS_SCALE > 0)
                ? this.config.SYSTEM_BODY_PHYSICS_SCALE
                : 1;
            const radius = (body?.radiusAU || 0) * bodyDockScale;
            const maxHeatDist = this.config.STAR_HEAT_MAX_DISTANCE_AU;
            const heatMargin = Number.isFinite(maxHeatDist) ? Math.max(0.01, maxHeatDist * 0.05) : 0.05;
            if (Number.isFinite(maxHeatDist)) {
                return Math.max(radius + heatMargin, maxHeatDist + heatMargin);
            }
            return radius + heatMargin;
        }

        if (type === 'STATION') {
            const stationRadius = Math.max(0, this.currentStation?.radiusAU ?? this.currentStation?.size ?? 0);
            const stationDockScale = (typeof this.config.STATION_PHYSICS_SCALE === 'number' && this.config.STATION_PHYSICS_SCALE > 0)
                ? this.config.STATION_PHYSICS_SCALE
                : 1;
            const dockRadius = stationRadius * stationDockScale * (this.config.STATION_DOCK_RADIUS_MULT ?? 0.6);
            return Math.max(0, dockRadius * 0.7);
        }

        if (body?.radiusAU) {
            const bodyDockScale = (typeof this.config.SYSTEM_BODY_PHYSICS_SCALE === 'number' && this.config.SYSTEM_BODY_PHYSICS_SCALE > 0)
                ? this.config.SYSTEM_BODY_PHYSICS_SCALE
                : 1;
            const dockRadius = body.radiusAU * (this.config.PLANET_DOCK_RADIUS_MULT || 1) * bodyDockScale;
            return Math.max(0, dockRadius * 0.7);
        }

        return 0;
    }

    _updateAutoNav(dt, timestampMs = 0) {
        if (!this.autoNavActive || !this.playerShip) {
            return;
        }

        const targetInfo = this.getActiveTargetInfo();
        if (!targetInfo || !targetInfo.position) {
            this.autoNavActive = false;
            this.autoNavInput = null;
            return;
        }

        const toTarget = ThreeDUtils.subVec(targetInfo.position, this.playerShip.position);
        const distance = ThreeDUtils.vecLength(toTarget);
        if (!Number.isFinite(distance) || distance <= 0.000001) {
            this.autoNavInput = { accelerate: false, brake: true, boost: false };
            return;
        }

        const toTargetDir = ThreeDUtils.normalizeVec(toTarget);
        if (!this.boostActive) {
            SpaceTravelInput.applyAutoNavRotation(this, dt, timestampMs, toTargetDir);
        }

        const engine = this.playerShip.engine || 10;
        const baseMaxSpeed = this.getBaseMaxSpeed(this.playerShip);
        const baseAccel = this.playerShip.size * engine * this.config.SHIP_ACCEL_PER_ENGINE * this.config.BASE_ACCEL_MULT;
        const brakeAccel = baseAccel * 2;
        const desiredDistance = this._getAutoNavDesiredDistance(targetInfo);
        const distanceToStop = Math.max(0, distance - desiredDistance);
        const maxSpeed = this.getMaxSpeed(this.playerShip, false);
        const boostMaxSpeed = this.getMaxSpeed(this.playerShip, true);
        const speedNow = ThreeDUtils.vecLength(this.playerShip.velocity);
        
        // Calculate stopping distance with realistic physics
        let stoppingDistance = brakeAccel > 0 ? (speedNow * speedNow) / (2 * brakeAccel) : Number.POSITIVE_INFINITY;
        
        const brakeBuffer = 1.15;
        const shouldCruise = distanceToStop > (stoppingDistance * brakeBuffer);

        const forward = ThreeDUtils.getLocalAxes(this.playerShip.rotation).forward;
        const alignment = ThreeDUtils.dotVec(forward, toTargetDir);

        const boostReady = speedNow >= (baseMaxSpeed * this.config.BOOST_READY_SPEED_RATIO);
        const hasFuel = (this.playerShip.fuel ?? 0) > 0;
        const canBoost = hasFuel && this.boostCooldownRemaining <= 0;
        const wantsBoostSpeed = shouldCruise && boostMaxSpeed > (baseMaxSpeed * 1.05);
        const cruiseMaxSpeed = wantsBoostSpeed ? boostMaxSpeed : maxSpeed;
        const desiredSpeed = shouldCruise
            ? cruiseMaxSpeed
            : Math.min(maxSpeed, Math.sqrt(Math.max(0, 2 * brakeAccel * distanceToStop)));

        const alignedSpeedCap = alignment < 0.2
            ? Math.min(desiredSpeed, baseMaxSpeed * 0.2)
            : desiredSpeed;
        const speedDeadband = Math.max(0.0002, baseMaxSpeed * 0.01);
        const accelerate = alignment > 0.3 && (shouldCruise
            ? speedNow < alignedSpeedCap
            : speedNow < (alignedSpeedCap - speedDeadband));
        const brake = shouldCruise
            ? (speedNow > alignedSpeedCap + speedDeadband && alignment < 0.95)
            : (speedNow > (alignedSpeedCap + speedDeadband) || alignment < -0.1);
        // Boost as soon as max speed is reached, stop at breakpoint
        // Don't require strict alignment change during boost engagement vs maintenance
        const boostDesired = canBoost
            && alignment > 0.6
            && distanceToStop > this.autoNavBoostBreakpointDistance
            && !brake
            && (speedNow >= maxSpeed * 0.95 || this.boostActive);

        this.autoNavInput = {
            accelerate,
            brake,
            boost: boostDesired
        };

        const boostStateChanged = (this.lastAutoNavBoostDesired !== boostDesired)
            || (this.lastAutoNavBoostActive !== this.boostActive);
        if (boostStateChanged) {
            console.log('[AutoNavBoost]', {
                boostActive: this.boostActive,
                boostDesired,
                canBoost,
                boostReady,
                wantsBoostSpeed,
                alignment: Number(alignment.toFixed(3)),
                distanceToStop: Number(distanceToStop.toFixed(4)),
                speedNow: Number(speedNow.toFixed(4)),
                desiredSpeed: Number(desiredSpeed.toFixed(4)),
                maxSpeed: Number(maxSpeed.toFixed(4)),
                inCooldown: this.boostCooldownRemaining > 0
            });
            this.lastAutoNavBoostDesired = boostDesired;
            this.lastAutoNavBoostActive = this.boostActive;
        }

        if (timestampMs && (timestampMs - this.lastAutoNavLogMs) >= 250) {
            console.log('[AutoNav]', {
                distance: Number(distance.toFixed(4)),
                distanceToStop: Number(distanceToStop.toFixed(4)),
                desiredDistance: Number(desiredDistance.toFixed(4)),
                alignment: Number(alignment.toFixed(3)),
                speedNow: Number(speedNow.toFixed(4)),
                desiredSpeed: Number(desiredSpeed.toFixed(4)),
                maxSpeed: Number(maxSpeed.toFixed(4)),
                boostReady,
                wantsBoostSpeed,
                boostDesired,
                accelerate,
                brake
            });
            this.lastAutoNavLogMs = timestampMs;
        }
    }

    regenShipStats(dt) {
        const laserMax = Ship.getLaserMax(this.playerShip);
        const laserCurrent = Ship.getLaserCurrent(this.playerShip);
        if (laserCurrent < laserMax) {
            this.laserRegenTimer += dt;
            while (this.laserRegenTimer >= this.config.LASER_REGEN_SEC) {
                Ship.setLaserCurrent(this.playerShip, Ship.getLaserCurrent(this.playerShip) + 1);
                this.laserRegenTimer -= this.config.LASER_REGEN_SEC;
            }
        } else {
            this.laserRegenTimer = 0;
        }

        if (this.playerShip.maxShields > 0 && this.playerShip.shields < this.playerShip.maxShields) {
            this.shieldRegenTimer += dt;
            while (this.shieldRegenTimer >= this.config.SHIELD_REGEN_SEC) {
                this.playerShip.shields = Math.min(this.playerShip.maxShields, this.playerShip.shields + 1);
                this.shieldRegenTimer -= this.config.SHIELD_REGEN_SEC;
            }
        } else {
            this.shieldRegenTimer = 0;
        }
    }

    render(timestampMs = 0) {
        if (!this.isActive) {
            return;
        }
        const renderTimestampMs = this._getRenderTimestampMs(timestampMs);
        UI.setGameCursorEnabled?.(!this.isPaused);
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const viewHeight = grid.height - this.config.PANEL_HEIGHT;
        const viewWidth = grid.width;
        const depthBuffer = RasterUtils.createDepthBuffer(viewWidth, viewHeight);

        this._renderSceneDepthBuffer(depthBuffer, renderTimestampMs, viewWidth, viewHeight);
        this._addDebugMessages(renderTimestampMs, viewWidth, viewHeight);

        UI.draw();

        // Render visual effects AFTER UI.draw() so they appear on top
        this._renderVisualEffects(depthBuffer, renderTimestampMs);

        if (this.config.ASCII_LOG_INTERVAL_MS && (!this.lastAsciiLogTimestamp || (Date.now() - this.lastAsciiLogTimestamp) >= this.config.ASCII_LOG_INTERVAL_MS)) {
            this.lastAsciiLogTimestamp = Date.now();
            UI.logScreenToConsole();
        }
    }

    _renderSceneDepthBuffer(depthBuffer, timestampMs, viewWidth, viewHeight) {
        const mouseState = SpaceTravelInput.getMouseTargetState(viewWidth, viewHeight, this.inputState);
        
        // Consolidated render params: spread this + additional transient params
        const renderParams = {
            ...this,
            depthBuffer,
            timestampMs,
            viewWidth,
            viewHeight,
            mouseState
        };

        SpaceStationGfx.renderStationOccluders(renderParams);

        const bodyLabels = SpaceTravelRender.renderSystemBodies({
            ...renderParams,
            setLastHoverPick: (pick) => { this.lastHoverPick = pick; }
        });

        this._renderPortal(depthBuffer, viewWidth, viewHeight, timestampMs);

        SpaceTravelParticles.renderStars(renderParams);

        if (!this.boostActive) {
            SpaceTravelParticles.renderDust({
                ...renderParams,
                getVelocityCameraSpace: () => this.getVelocityCameraSpace()
            });
        }

        this.laser.renderLaserFire(renderParams);

        if (this.isPaused) {
            for (let i = 0; i < depthBuffer.colors.length; i++) {
                const color = depthBuffer.colors[i];
                if (color) {
                    depthBuffer.colors[i] = ColorUtils.toMonochrome(color);
                }
            }
        }

        RasterUtils.flushDepthBuffer(depthBuffer);

        const emergenceCooldownMs = this._getEmergenceMomentumCooldownRemaining();
        const emergenceSpeedOverride = this.emergenceMomentumActive
            ? `${(ThreeDUtils.vecLength(this.playerShip.velocity) * 60).toFixed(2)} AU/m [Cooldown]`
            : null;

        SpaceTravelHud.renderHud({
            ...renderParams,
            baseMaxSpeed: this.getBaseMaxSpeed(this.playerShip),
            maxSpeed: this.getMaxSpeed(this.playerShip, this.boostActive),
            autoNavActive: this.autoNavActive,
            speedOverrideText: emergenceSpeedOverride,
            speedOverrideColor: emergenceSpeedOverride ? COLORS.TEXT_DIM : undefined,
            helpers: {
                applyPauseColor: (color) => this.applyPauseColor(color),
                addHudText: (x, y, text, color) => this.addHudText(x, y, text, color),
                getActiveTargetInfo: () => this.getActiveTargetInfo()
            },
            onAutoNavToggle: () => this.toggleAutoNav(),
            onMenu: () => {
                this.stop();
                SpaceTravelMenu.show(this.currentGameState, () => {
                    const destination = this.targetSystem || SpaceTravelLogic.getNearestSystem(this.currentGameState);
                    this.show(this.currentGameState, destination, {
                        resetPosition: false,
                        localDestination: this.localDestination
                    });
                });
            }
        });

        SpaceTravelRender.renderSystemBodyLabels(bodyLabels, viewWidth, viewHeight, (x, y, text, color) => this.addHudText(x, y, text, color));
        SpaceTravelRender.renderDestinationIndicator({
            ...renderParams,
            addHudText: (x, y, text, color) => this.addHudText(x, y, text, color),
            getActiveTargetInfo: () => SpaceTravelUi.getActiveTargetInfo({
                localDestination: this.localDestination,
                targetSystem: this.targetSystem,
                currentGameState: this.currentGameState,
                playerShip: this.playerShip
            }, this.config)
        });
    }

    _addDebugMessages(timestampMs, viewWidth, viewHeight) {
        if (this.isPaused) {
            const label = '=== PAUSED ===';
            const x = Math.floor((viewWidth - label.length) / 2);
            const y = Math.floor(viewHeight / 2);
            UI.addText(x, y, label, COLORS.TEXT_NORMAL);
        } else if (this.boostTurnMessage || this.boostBlockMessage) {
            const message = this.boostTurnMessage || this.boostBlockMessage;
            const messageTimestampMs = this.boostTurnMessage
                ? this.boostTurnMessageTimestampMs
                : this.boostBlockMessageTimestampMs;
            const flashPhase = Math.floor((timestampMs - messageTimestampMs) / 250) % 2;
            const messageColor = flashPhase === 0 ? COLORS.ORANGE : COLORS.WHITE;
            const x = Math.floor((viewWidth - message.length) / 2);
            const y = Math.floor(viewHeight / 2);
            UI.addText(x, y, message, messageColor);
        }
    }

    _renderVisualEffects(depthBuffer, timestampMs) {
        this.animation.renderBoostTint(this, timestampMs);
        this.animation.renderDamageFlash(this, timestampMs);
        this._renderDockingFade(timestampMs);
        this.animation.renderDeathSequence(this, timestampMs);
        this.animation.renderWarpFade(this, timestampMs);
    }

    _renderDockingFade(timestampMs) {
        if (this.docking.isDockSequenceActive()) {
            this.docking.renderDockFade(timestampMs);
        }
    }

    getVelocityWorldDirection() {
        const speed = ThreeDUtils.vecLength(this.playerShip.velocity);
        if (speed > 0.000001) {
            return ThreeDUtils.normalizeVec(this.playerShip.velocity);
        }
        return ThreeDUtils.getLocalAxes(this.playerShip.rotation).forward;
    }

    getVelocityCameraSpace() {
        const relativeVelocity = ThreeDUtils.scaleVec(this.playerShip.velocity, -1);
        return ThreeDUtils.rotateVecByQuat(relativeVelocity, ThreeDUtils.quatConjugate(this.playerShip.rotation));
    }
}

// Create singleton instance and export as SpaceTravelMap for backward compatibility
const SpaceTravelMap = new SpaceTravelMapClass();
