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
        this.lastAutoNavBoostLogMs = 0;
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
            
            // Adjust boost timing when unpausing to maintain proper fade timing
            if (this.boostStartTimestampMs > 0) {
                this.boostStartTimestampMs += this.pausedDurationMs;
            }
            if (this.boostEndTimestampMs > 0) {
                this.boostEndTimestampMs += this.pausedDurationMs;
            }
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
        SpaceTravelAutoNav.toggle(this);
    }

    show(gameState, destination, options = {}) {
        this.stop();
        UI.clear();
        UI.resetSelection();
        UI.setSelectedButtonIndex(1); // Select Menu button by default (index 1)
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
        SpaceTravelPhysics.positionShip(this, resetPosition, options.warpFadeOut);
        this._initializeStarfield();
        this._updateVisibility();

        // Initialize emergence momentum if warping in
        if (options.warpFadeOut) {
            SpaceTravelPhysics.initializeEmergenceMomentum(this);
        }

        this.portalActive = false;
        this.portalPosition = null;
        this.portalTargetSystem = null;
        this.warpFadeOutStartMs = options.warpFadeOut ? performance.now() : 0;

        if (options.openPortalTargetSystem) {
            SpaceTravelPortal.open(this, options.openPortalTargetSystem, performance.now());
        }

        SpaceTravelInput.initializeInputHandlers(this);
        this.isActive = true;
        UI.setArrowKeysNavigationDisabled(true);
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
        
        console.log('[SpaceTravelMap._initializeStation] Initial values:');
        console.log('  stationOrbit:', stationOrbit);
        console.log('  STATION_ENTRANCE_DIR:', this.config.STATION_ENTRANCE_DIR);
        console.log('  stationDir (normalized):', stationDir);
        console.log('  targetSystem position (LY):', { x: this.targetSystem.x, y: this.targetSystem.y });
        console.log('  targetSystem position (AU):', { x: this.targetSystem.x * this.config.LY_TO_AU, y: this.targetSystem.y * this.config.LY_TO_AU });
        
        this.currentStation.position = {
            x: this.targetSystem.x * this.config.LY_TO_AU + stationDir.x * stationOrbit,
            y: this.targetSystem.y * this.config.LY_TO_AU + stationDir.y * stationOrbit,
            z: stationDir.z * stationOrbit
        };
        console.log('  station position:', this.currentStation.position);
        
        if (!this.currentStation.name) {
            this.currentStation.name = `${this.targetSystem.name} Station`;
        }
        this.currentStation.dataRef = this.targetSystem.primaryBody || (this.targetSystem.planets && this.targetSystem.planets[0]) || null;
        
        // Calculate rotation to make entrance face radially (toward/away from star)
        // Station position relative to system center (in XY plane)
        const systemCenter = {
            x: this.targetSystem.x * this.config.LY_TO_AU,
            y: this.targetSystem.y * this.config.LY_TO_AU,
            z: 0
        };
        const radialDir = {
            x: this.currentStation.position.x - systemCenter.x,
            y: this.currentStation.position.y - systemCenter.y
        };
        const radialAngle = Math.atan2(radialDir.y, radialDir.x);
        console.log('  systemCenter:', systemCenter);
        console.log('  radialDir:', radialDir);
        console.log('  radialAngle (rad):', radialAngle);
        console.log('  radialAngle (deg):', radialAngle * 180 / Math.PI);
        
        // Entrance is along +Z in local space (top face of cuboctahedron)
        // First tip it 90° around Y-axis to point +X, then rotate to face radially
        this.currentStation.rotationPhase = radialAngle;
        console.log('  rotationPhase:', this.currentStation.rotationPhase);
        
        // Station rotation should be STATIC based on radial direction, not spinning throughout the day
        // 1. Tip entrance from +Z to +X (rotate -90° around Y-axis)
        // 2. Rotate around Z-axis to face radially
        const tipRotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.PI / 2);
        const radialRotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 0, z: 1 }, radialAngle);
        this.currentStation.rotation = ThreeDUtils.quatMultiply(radialRotation, tipRotation);
        console.log('  station rotation quaternion:', this.currentStation.rotation);

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

    _initializeEmergenceMomentum() {
        // Moved to SpaceTravelPhysics
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
        UI.setArrowKeysNavigationDisabled?.(false);
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
        this.timestampMs = timestampMs;
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
            SpaceTravelAutoNav.update(this, dt, timestampMs);
        }
        SpaceTravelPhysics.updateMovement(this, dt, timestampMs);
        SpaceTravelPhysics.updateEmergenceMomentum(this, timestampMs);
        if (SpaceTravelPortal.update(this, timestampMs)) return;
        const killed = this.hazards.checkHazardsAndCollisions(this, timestampMs);
        if (killed && this._handleDeathSequence(timestampMs)) return;
        this.docking.checkDocking(this);
        SpaceTravelParticles.updateParticles(this);
        SpaceTravelPhysics.regenStats(this, dt);
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
        SpaceTravelPhysics.advanceTime(this, dt);
    }

    _updateStationRotation() {
        // Station rotation is now STATIC - no longer updates with time
        // Entrance always faces radially (calculated once in _initializeStation)
    }

    openTravelPortal(targetSystem, timestampMs = performance.now()) {
        // Moved to SpaceTravelPortal
        SpaceTravelPortal.open(this, targetSystem, timestampMs);
    }

    _getAutoNavDesiredDistance(targetInfo) {
        // Moved to SpaceTravelAutoNav
        return SpaceTravelAutoNav.getDesiredDistance(this);
    }

    _updateAutoNav(dt, timestampMs = 0) {
        // Moved to SpaceTravelAutoNav
        SpaceTravelAutoNav.update(this, dt, timestampMs);
    }

    regenShipStats(dt) {
        // Moved to SpaceTravelPhysics
        SpaceTravelPhysics.regenStats(this, dt);
    }

    render(timestampMs = 0) {
        // Delegated to SpaceTravelRender
        SpaceTravelRender.render({ 
            ...this, 
            timestampMs,
            stop: () => this.stop(), // Explicitly pass method since spread doesn't copy prototype methods
            setPaused: (paused, byFocus) => this.setPaused(paused, byFocus)
        });
        
        // Check ASCII log interval after render (must be here so this.lastAsciiLogTimestamp persists)
        if (this.config.ASCII_LOG_INTERVAL_MS && (!this.lastAsciiLogTimestamp || (Date.now() - this.lastAsciiLogTimestamp) >= this.config.ASCII_LOG_INTERVAL_MS)) {
            this.lastAsciiLogTimestamp = Date.now();
            UI.logScreenToConsole();
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
