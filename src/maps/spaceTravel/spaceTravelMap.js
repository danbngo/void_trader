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

        // Animation and rendering state
        this.isActive = false;
        this.animationId = null;
        this.lastTimestamp = 0;
        this.lastAsciiLogTimestamp = 0;
        this.lastRollLogMs = 0;

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

        // Damage and collision state
        this.damageFlashStartMs = 0;
        this.lastStationCollisionMs = 0;
    }

    setPaused(nextPaused, byFocus = false) {
        this.isPaused = nextPaused;
        this.pausedByFocus = nextPaused && byFocus;
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

    show(gameState, destination, options = {}) {
        this.stop();
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();

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
        this._positionPlayerShip(resetPosition);
        this._initializeStarfield();
        this._updateVisibility();

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

    _positionPlayerShip(resetPosition) {
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
                const minSpawnDistance = typeof this.config.STATION_SPAWN_MIN_DISTANCE_AU === 'number'
                    ? this.config.STATION_SPAWN_MIN_DISTANCE_AU
                    : 0;
                const offsetDistance = Math.max(
                    minSpawnDistance,
                    stationRadius * stationSpawnScale * spawnMult
                );
                const startOffset = ThreeDUtils.scaleVec(entranceDir, offsetDistance);
                this.playerShip.position = ThreeDUtils.addVec(this.currentStation.position, startOffset);
                ThreeDUtils.faceToward(this.playerShip, this.currentStation.position);
            } else {
                this.playerShip.position = currentSystemPos;
            }
        }
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
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        SpaceTravelInput.teardownInputHandlers(this.inputState);
        this.isPaused = false;
        this.pausedByFocus = false;
        this.lastHoverPick = null;
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
        this._updateMovement(dt, timestampMs);
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
        const accelerate = this.inputState.keyState.has('w') || this.inputState.keyState.has('W');
        const brake = this.inputState.keyState.has('s') || this.inputState.keyState.has('S');
        const boostKey = this.inputState.keyState.has('Shift');
        const wasBoosting = this.boostActive;

        const engine = this.playerShip.engine || 10;
        const baseMaxSpeed = this.getBaseMaxSpeed(this.playerShip);
        const baseAccel = this.playerShip.size * engine * this.config.SHIP_ACCEL_PER_ENGINE * this.config.BASE_ACCEL_MULT;
        const speedNow = ThreeDUtils.vecLength(this.playerShip.velocity);
        const hasFuel = (this.playerShip.fuel ?? 0) > 0;
        const boostReady = speedNow >= (baseMaxSpeed * this.config.BOOST_READY_SPEED_RATIO);

        this.boostActive = boostKey && hasFuel && this.boostCooldownRemaining <= 0 && boostReady;

        if (this.boostActive && !wasBoosting) this.boostStartTimestampMs = timestampMs;
        if (!this.boostActive && wasBoosting) this.boostEndTimestampMs = timestampMs;

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
        UI.setGameCursorEnabled?.(!this.isPaused);
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const viewHeight = grid.height - this.config.PANEL_HEIGHT;
        const viewWidth = grid.width;
        const depthBuffer = RasterUtils.createDepthBuffer(viewWidth, viewHeight);

        this._renderSceneDepthBuffer(depthBuffer, timestampMs, viewWidth, viewHeight);
        this._renderVisualEffects(depthBuffer, timestampMs);
        this._addDebugMessages(timestampMs, viewWidth, viewHeight);

        UI.draw();

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

        SpaceTravelHud.renderHud({
            ...renderParams,
            baseMaxSpeed: this.getBaseMaxSpeed(this.playerShip),
            maxSpeed: this.getMaxSpeed(this.playerShip, this.boostActive),
            helpers: {
                applyPauseColor: (color) => this.applyPauseColor(color),
                addHudText: (x, y, text, color) => this.addHudText(x, y, text, color),
                getActiveTargetInfo: () => SpaceTravelUi.getActiveTargetInfo({
                    localDestination: this.localDestination,
                    targetSystem: this.targetSystem,
                    currentGameState: this.currentGameState,
                    playerShip: this.playerShip
                }, this.config)
            },
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
