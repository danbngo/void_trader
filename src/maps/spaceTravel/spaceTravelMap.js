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
        this.rocketTrailClouds = [];
        this.rocketTrailLastSpawnByShip = {};
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
        this.autoNavBoostStopDistance = 0;
        this.autoNavBoostDisabled = false;
        this.autoNavBoostEngagedOnce = false; // Track if boost has ever been engaged during this journey
        this.lastIndicatorLogMs = 0;
        this.lastLabelLogMs = 0;

        // Portal / warp state
        this.portalActive = false;
        this.portalPosition = null;
        this.portalRadius = 0;
        this.portalOpenTimestampMs = 0;
        this.portalCloseTimestampMs = 0;
        this.portalTargetSystem = null;
        this.portalBlockMessage = '';
        this.portalBlockMessageTimestampMs = 0;
        this.portalPausedTimestampMs = 0;
        this.portalTintLastLogMs = 0;
        this.warpFadeOutStartMs = 0;

        // Emergence momentum state (when warping into a system)
        this.emergenceMomentumActive = false;
        this.emergenceMomentumStartMs = 0;
        this.emergenceMomentumDirection = null;
        this.emergenceMomentumMaxSpeed = 0;
        const EMERGENCE_MOMENTUM_DURATION_MS = 3000;
        const EMERGENCE_MOMENTUM_MULTIPLIER = 10;

        // Error message state (for displaying transient errors like menu-while-moving)
        this.lastErrorMessage = null;
        this.lastErrorTimestampMs = 0;

        // Damage and collision state
        this.damageFlashStartMs = 0;
        this.lastStationCollisionMs = 0;

        // Escort ships state
        this.escortShips = [];
        this.escortLastCollisionMs = {}; // Track collision cooldown per escort

        // NPC encounter fleet state
        this.npcEncounterFleets = [];
        this.npcEncounterSpawnUnlocked = true;
        this.npcEncounterHailPrompt = null;
        this.npcEncounterHailAvailable = false;
    }

    setPaused(nextPaused, byFocus = false) {
        const now = performance.now();
        if (nextPaused && !this.isPaused) {
            this.pauseTimestampMs = now;
            this.portalPausedTimestampMs = this.pauseTimestampMs;
        }
        if (!nextPaused && this.isPaused) {
            if (this.pauseTimestampMs) {
                this.pausedDurationMs += (now - this.pauseTimestampMs);
            }
            this.pauseTimestampMs = 0;
            this.portalPausedTimestampMs = 0;
            
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
        this._initializeEscortShips();
        if (typeof SpaceTravelEncounters !== 'undefined' && SpaceTravelEncounters.ensureState) {
            SpaceTravelEncounters.ensureState(this);
        }
        SpaceTravelPhysics.positionShip(this, resetPosition, options.warpFadeOut);
        this._initializeStarfield();

        const runtimeState = options.runtimeState || null;
        const hasRuntimeState = !!runtimeState && resetPosition === false;
        if (hasRuntimeState) {
            this.escortShips = Array.isArray(runtimeState.escortShips) ? runtimeState.escortShips : this.escortShips;
            this.escortLastCollisionMs = runtimeState.escortLastCollisionMs ? { ...runtimeState.escortLastCollisionMs } : {};
            this.rocketTrailClouds = Array.isArray(runtimeState.rocketTrailClouds) ? runtimeState.rocketTrailClouds : [];
            this.rocketTrailLastSpawnByShip = runtimeState.rocketTrailLastSpawnByShip ? { ...runtimeState.rocketTrailLastSpawnByShip } : {};
            this.npcEncounterFleets = Array.isArray(runtimeState.npcEncounterFleets) ? runtimeState.npcEncounterFleets : [];
            this.npcEncounterSpawnUnlocked = runtimeState.npcEncounterSpawnUnlocked !== false;
            this.npcEncounterHailPrompt = runtimeState.npcEncounterHailPrompt || null;
            this.npcEncounterHailAvailable = !!runtimeState.npcEncounterHailAvailable;
        } else {
            this.rocketTrailClouds = [];
            this.rocketTrailLastSpawnByShip = {};
            this.npcEncounterFleets = [];
            this.npcEncounterSpawnUnlocked = true;
            this.npcEncounterHailPrompt = null;
            this.npcEncounterHailAvailable = false;
        }
        this._updateVisibility();

        // Initialize emergence momentum if warping in
        if (options.warpFadeOut) {
            SpaceTravelPhysics.initializeEmergenceMomentum(this);
        }

        this.portalActive = false;
        this.portalPosition = null;
        this.portalTargetSystem = null;
        this.portalRadius = 0;
        this.portalOpenTimestampMs = 0;
        this.portalCloseTimestampMs = 0;
        this.portalBlockMessage = '';
        this.portalBlockMessageTimestampMs = 0;
        this.warpFadeOutStartMs = options.warpFadeOut ? performance.now() : 0;

        if (options.portalState && options.portalState.portalActive) {
            this.portalActive = true;
            this.portalPosition = options.portalState.portalPosition;
            this.portalRadius = options.portalState.portalRadius;
            this.portalOpenTimestampMs = options.portalState.portalOpenTimestampMs;
            this.portalCloseTimestampMs = options.portalState.portalCloseTimestampMs;
            this.portalTargetSystem = options.portalState.portalTargetSystem;
            this.portalPausedTimestampMs = options.portalState.portalPausedTimestampMs || 0;
        } else if (options.openPortalTargetSystem) {
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
        
        this.currentStation.position = {
            x: this.targetSystem.x * this.config.LY_TO_AU + stationDir.x * stationOrbit,
            y: this.targetSystem.y * this.config.LY_TO_AU + stationDir.y * stationOrbit,
            z: stationDir.z * stationOrbit
        };
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
        
        // Entrance is along +Z in local space (top face of cuboctahedron)
        // First tip it 90° around Y-axis to point +X, then rotate to face radially
        this.currentStation.rotationPhase = radialAngle;
        
        // Station rotation should be STATIC based on radial direction, not spinning throughout the day
        // 1. Tip entrance from +Z to +X (rotate -90° around Y-axis)
        // 2. Rotate around Z-axis to face radially
        const tipRotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.PI / 2);
        const radialRotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 0, z: 1 }, radialAngle);
        this.currentStation.rotation = ThreeDUtils.quatMultiply(radialRotation, tipRotation);
        
        if (!this.localDestination?.name && this.currentStation && this.currentGameState) {
            console.log('[SpaceTravelMap._initializeStation] Setting default station destination:', this.currentStation.name);
            this.currentGameState.localDestination = {
                type: 'STATION',
                // Don't store positionWorld here - let it be calculated from orbit on each frame
                id: this.currentStation.name || 'Station',
                name: this.currentStation.name || 'Station',
                orbit: this.currentStation.orbit
            };
            this.currentGameState.localDestinationSystemIndex = this.currentGameState.currentSystemIndex;
            this.localDestination = this.currentGameState.localDestination;
            console.log('[SpaceTravelMap._initializeStation] localDestination now set to:', this.localDestination.name);
        } else {
            console.log('[SpaceTravelMap._initializeStation] NOT setting default station');
        }
    }

    _initializeEscortShips() {
        // Initialize escort ships from gameState.ships[1+] (all ships except the player ship at index 0)
        if (!this.currentGameState || !Array.isArray(this.currentGameState.ships) || this.currentGameState.ships.length <= 1) {
            this.escortShips = [];
            return;
        }

        // Only call AI initialization if EscortShipAI is available
        if (typeof EscortShipAI !== 'undefined' && EscortShipAI.initializeEscortShips) {
            this.escortShips = EscortShipAI.initializeEscortShips(
                this.currentGameState,
                this.playerShip,
                this.targetSystem,
                this.config
            );
            this.escortLastCollisionMs = {};
        } else {
            this.escortShips = [];
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

    getRuntimeStateSnapshot() {
        const escortShips = Array.isArray(this.escortShips)
            ? this.escortShips
            : [];
        const rocketTrailClouds = Array.isArray(this.rocketTrailClouds)
            ? this.rocketTrailClouds.map(cloud => ({
                ...cloud,
                position: cloud?.position ? { ...cloud.position } : cloud?.position
            }))
            : [];

        return {
            escortShips,
            escortLastCollisionMs: { ...(this.escortLastCollisionMs || {}) },
            rocketTrailClouds,
            rocketTrailLastSpawnByShip: { ...(this.rocketTrailLastSpawnByShip || {}) },
            npcEncounterFleets: Array.isArray(this.npcEncounterFleets) ? this.npcEncounterFleets : [],
            npcEncounterSpawnUnlocked: this.npcEncounterSpawnUnlocked !== false,
            npcEncounterHailPrompt: this.npcEncounterHailPrompt ? { ...this.npcEncounterHailPrompt } : null,
            npcEncounterHailAvailable: !!this.npcEncounterHailAvailable
        };
    }

    stop(preservePortal = false) {
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
        this.escortShips = [];
        this.escortLastCollisionMs = {};
        if (!preservePortal) {
            this.portalActive = false;
            this.portalPosition = null;
            this.portalRadius = 0;
            this.portalOpenTimestampMs = 0;
            this.portalCloseTimestampMs = 0;
            this.portalTargetSystem = null;
            this.portalBlockMessage = '';
            this.portalBlockMessageTimestampMs = 0;
            this.portalPausedTimestampMs = 0;
            this.warpFadeOutStartMs = 0;
        }
        this.lastErrorMessage = null;
        this.lastErrorTimestampMs = 0;
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

            // RENDER FIRST to update hover state before processing input
            if (!this.isActive) {
                return;
            }
            this.render(timestamp);

            this.update(dt, timestamp);
            if (!this.isActive) {
                return;
            }

            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }

    update(dt, timestampMs = 0) {
        this.timestampMs = timestampMs;
        
        // SYNC HOVER PICK BEFORE PROCESSING INPUT
        // This captures the fresh hover data from the render that just completed
        if (this._lastHoverPickForSync !== undefined) {
            this.lastHoverPick = this._lastHoverPickForSync;  // Can be null or a pick object
            this._lastHoverPickForSync = undefined;
        }
        
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
        
        // Update escort ships AI
        if (this.escortShips.length > 0 && typeof EscortShipAI !== 'undefined' && EscortShipAI.update) {
            EscortShipAI.update(
                this.escortShips,
                this.playerShip,
                this.targetSystem,
                dt,
                this.config
            );
        }

        if (typeof SpaceTravelEncounters !== 'undefined' && SpaceTravelEncounters.update) {
            SpaceTravelEncounters.update(this, dt, timestampMs);
        }

        if (SpaceTravelPortal.update(this, timestampMs)) return;
        const killed = this.hazards.checkHazardsAndCollisions(this, timestampMs);
        if (killed && this._handleDeathSequence(timestampMs)) return;
        
        // Check collisions with escort ships
        this._checkEscortCollisions(timestampMs);
        
        // Check for disabled ship looting
        this._checkDisabledShipLooting(timestampMs);
        
        this.docking.checkDocking(this);
        SpaceTravelParticles.updateParticles(this, this._getRenderTimestampMs(timestampMs));
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

    _checkEscortCollisions(timestampMs) {
        if (!this.escortShips || this.escortShips.length === 0) {
            return;
        }
        if (typeof EscortShipAI === 'undefined' || !EscortShipAI.checkPlayerCollision) {
            return;
        }

        // Use global constants defined in CONSTS.js (with fallback defaults)
        const collisionDamageDivisor = (typeof globalThis.COLLISION_DAMAGE_DIVISOR !== 'undefined') ? globalThis.COLLISION_DAMAGE_DIVISOR : 10;
        const collisionMinDamage = (typeof globalThis.COLLISION_MIN_DAMAGE !== 'undefined') ? globalThis.COLLISION_MIN_DAMAGE : 1;
        const collisionCooldownMs = (typeof globalThis.COLLISION_COOLDOWN_MS !== 'undefined') ? globalThis.COLLISION_COOLDOWN_MS : 500;
        const allyVsPlayerCollisionDamage = (typeof globalThis.ALLY_VS_PLAYER_COLLISION_DAMAGE !== 'undefined') ? globalThis.ALLY_VS_PLAYER_COLLISION_DAMAGE : true;

        this.escortShips.forEach((escort, index) => {
            if (!escort) return;

            // Check if collision cooldown is active for this escort
            const lastCollision = this.escortLastCollisionMs[index] || 0;
            if (timestampMs - lastCollision < collisionCooldownMs) {
                return;
            }

            // Check collision between player and this escort ship
            if (EscortShipAI.checkPlayerCollision(escort, this.playerShip, this.config)) {
                const damage = EscortShipAI.getCollisionDamage(escort, this.playerShip, this.config);
                
                // Calculate ram damage based on player velocity
                const playerVelocity = this.playerShip.velocity || { x: 0, y: 0, z: 0 };
                const speed = Math.sqrt(playerVelocity.x ** 2 + playerVelocity.y ** 2 + playerVelocity.z ** 2);
                const ramDamageRatio = this.config.RAM_DAMAGE_RATIO || 0.3;
                const ramDamageMin = this.config.RAM_DAMAGE_MIN || 5;
                const ramDamage = Math.max(ramDamageMin, Math.ceil(speed * 1000 * ramDamageRatio)); // Convert AU/s to relative damage
                
                let escortHullDamaged = false;
                
                // Apply ram damage to escort
                if (typeof escort.shields === 'number' && escort.shields > 0) {
                    const shieldDamage = Math.min(escort.shields, ramDamage);
                    escort.shields = Math.max(0, escort.shields - shieldDamage);
                    const overflow = ramDamage - shieldDamage;
                    if (overflow > 0 && typeof escort.hull === 'number') {
                        escort.hull = Math.max(0, escort.hull - overflow);
                        escortHullDamaged = true;
                    }
                } else if (typeof escort.hull === 'number') {
                    escort.hull = Math.max(0, escort.hull - ramDamage);
                    escortHullDamaged = true;
                }

                if (typeof escort.hull === 'number' && escort.hull <= 0) {
                    escort.name = 'Abandoned Ship';
                    if (escort.shipData) {
                        escort.shipData.name = 'Abandoned Ship';
                    }
                }
                
                // Always set red flash for ram damage
                if (escortHullDamaged || escort.shields < (escort.maxShields || 100)) {
                    escort.flashStartMs = timestampMs;
                    escort.flashColor = (typeof escort.hull === 'number' && escort.hull <= 0)
                        ? (this.config.SHIP_FLASH_ABANDONED_COLOR || '#8b0000')
                        : (this.config.SHIP_FLASH_HULL_COLOR || '#ff0000');
                }
                
                // Both player and ally take damage on collision
                if (allyVsPlayerCollisionDamage) {
                    // Apply damage to player
                    if (this.playerShip.shields !== undefined) {
                        const shieldDamage = Math.min(this.playerShip.shields, damage);
                        this.playerShip.shields = Math.max(0, this.playerShip.shields - shieldDamage);
                    }
                    if (this.playerShip.shields <= 0 && this.playerShip.health !== undefined) {
                        const healthDamage = damage - (this.playerShip.shields + Math.max(0, this.playerShip.shields));
                        this.playerShip.health = Math.max(0, this.playerShip.health - healthDamage);
                    }

                    // Flash screen on collision
                    this.damageFlashStartMs = timestampMs;
                }

                // Apply bounce physics to player ship
                this._applyShipBounce(this.playerShip, escort, this.config);

                // Set cooldown for this escort
                this.escortLastCollisionMs[index] = timestampMs;
            }

            // Also check ship-to-ship collisions between escorts
            for (let j = index + 1; j < this.escortShips.length; j++) {
                const otherEscort = this.escortShips[j];
                if (!otherEscort) continue;

                if (this._checkShipToShipCollision(escort, otherEscort)) {
                    // Apply bounce physics to both ships
                    this._applyShipToShipBounce(escort, otherEscort, this.config);
                }
            }
        });
    }

    _checkShipToShipCollision(ship1, ship2) {
        if (!ship1.position || !ship2.position) {
            return false;
        }

        // If SHIP_PHYSICS_SCALE is 0, disable collisions
        if (this.config?.SHIP_PHYSICS_SCALE === 0) {
            return false;
        }

        const toOther = ThreeDUtils.subVec(ship2.position, ship1.position);
        const distance = ThreeDUtils.vecLength(toOther);
        
        // Use SHIP_SIZE_AU from global constants and apply collision radius multiplier
        const baseRadius = (typeof SHIP_SIZE_AU !== 'undefined') ? SHIP_SIZE_AU : 0.00000043;
        const radiusMult = this.config?.SHIP_COLLISION_RADIUS_MULT || 1.2;
        const collisionRadius1 = baseRadius * radiusMult;
        const collisionRadius2 = baseRadius * radiusMult;
        const collisionDistance = collisionRadius1 + collisionRadius2;

        return distance < collisionDistance;
    }

    _applyShipBounce(playerShip, otherShip, config) {
        if (!playerShip.velocity || !otherShip.position || !playerShip.position) {
            return;
        }

        const toShip = ThreeDUtils.subVec(otherShip.position, playerShip.position);
        const normalize = 1 / (ThreeDUtils.vecLength(toShip) || 0.001);
        const normal = ThreeDUtils.scaleVec(toShip, normalize);

        // Reflect velocity off the collision surface
        const v = playerShip.velocity;
        const dotVN = ThreeDUtils.dotVec(v, normal);
        const reflected = ThreeDUtils.subVec(v, ThreeDUtils.scaleVec(normal, 2 * dotVN));
        
        const bounceDamping = config?.SHIP_BOUNCE_DAMPING || 0.7;
        playerShip.velocity = ThreeDUtils.scaleVec(reflected, bounceDamping);
    }

    _applyShipToShipBounce(ship1, ship2, config) {
        if (!ship1.position || !ship2.position || !ship1.velocity || !ship2.velocity) {
            return;
        }

        const relPos = ThreeDUtils.subVec(ship2.position, ship1.position);
        const normalize = 1 / (ThreeDUtils.vecLength(relPos) || 0.001);
        const normal = ThreeDUtils.scaleVec(relPos, normalize);

        // Relative velocity
        const relVel = ThreeDUtils.subVec(ship2.velocity, ship1.velocity);
        const velAlongNormal = ThreeDUtils.dotVec(relVel, normal);

        // Don't collide if moving apart
        if (velAlongNormal >= 0) {
            return;
        }

        const bounceDamping = config?.SHIP_BOUNCE_DAMPING || 0.7;
        const impulse = ThreeDUtils.scaleVec(normal, -velAlongNormal * bounceDamping);

        // Apply impulse to both ships (simple equal mass assumption)
        ship1.velocity = ThreeDUtils.subVec(ship1.velocity, impulse);
        ship2.velocity = ThreeDUtils.addVec(ship2.velocity, impulse);
    }

    _checkDisabledShipLooting(timestampMs) {
        const npcShips = (Array.isArray(this.npcEncounterFleets) && this.npcEncounterFleets.length > 0)
            ? this.npcEncounterFleets[0].ships || []
            : [];
        const lootableShips = [
            ...(Array.isArray(this.escortShips) ? this.escortShips : []),
            ...npcShips
        ];

        if (lootableShips.length === 0) {
            return;
        }
        
        // Check if player collides with any disabled escort ship
        lootableShips.forEach((escort, index) => {
            if (!escort) return;
            
            // Only check disabled ships (hull = 0)
            if (typeof escort.hull !== 'number' || escort.hull > 0) {
                return;
            }
            
            // Check if player is close enough to loot
            if (typeof EscortShipAI === 'undefined' || !EscortShipAI.checkPlayerCollision) {
                return;
            }
            
            if (EscortShipAI.checkPlayerCollision(escort, this.playerShip, this.config)) {
                // Check cooldown to prevent re-opening immediately
                const lastLoot = this.lastDisabledShipLootMs || 0;
                const lootCooldown = 2000; // 2 second cooldown between loots
                
                if (timestampMs - lastLoot < lootCooldown) {
                    return;
                }
                
                // Stop the map and open loot menu
                this.stop(true); // Preserve portal if active
                this.lastDisabledShipLootMs = timestampMs;
                
                // Open loot menu for this specific ship
                if (typeof LootMenu !== 'undefined' && LootMenu.showIndividualShip) {
                    LootMenu.showIndividualShip(this.currentGameState, escort, () => {
                        // After looting, move player back
                        const toShip = ThreeDUtils.subVec(escort.position, this.playerShip.position);
                        const distance = ThreeDUtils.vecLength(toShip);
                        if (distance > 0) {
                            const normalize = 1 / distance;
                            const direction = ThreeDUtils.scaleVec(toShip, normalize);
                            const pushBackDistance = 0.1; // Push back 0.1 AU
                            const pushBack = ThreeDUtils.scaleVec(direction, -pushBackDistance);
                            this.playerShip.position = ThreeDUtils.addVec(this.playerShip.position, pushBack);
                        }
                        
                        // Resume travel
                        this.start();
                    });
                }
            }
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
        const renderParams = { 
            ...this, 
            timestampMs,
            localDestination: this.localDestination,  // Override stale spread copy with fresh value
            getActiveTargetInfo: () => this.getActiveTargetInfo(),  // Override stale spread copy with fresh method
            stop: (preservePortal) => this.stop(preservePortal), // Explicitly pass method since spread doesn't copy prototype methods
            setPaused: (paused, byFocus) => this.setPaused(paused, byFocus),
            toggleAutoNav: () => this.toggleAutoNav(),  // Pass toggleAutoNav callback
            mapInstance: this  // Pass mapInstance reference for callbacks to use
        };
        SpaceTravelRender.render(renderParams);
        
        // Store hover pick DIRECTLY from mapInstance (NOT from renderParams which is stale)
        // Must do this AFTER render so callback has time to set mapInstance.lastHoverPick
        this._lastHoverPickForSync = this.lastHoverPick;
        
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
