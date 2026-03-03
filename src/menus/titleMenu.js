/**
 * Title Menu
 * Main menu screen for Void Trader
 */

const TitleMenu = (() => {
    const LY_TO_AU = 63241; // 1 LY = 63,241 AU
    let animationInterval = null;
    let titleScene = null;

    const TITLE_TICK_MS = 33;
    const TITLE_STAR_COUNT = 400;
    const TITLE_PORTAL_AUTONAV_SPEED_AU_PER_SEC = 0.03;
    const TITLE_PORTAL_STOP_DISTANCE_AU = 0.0002;
    const TITLE_DUST_IDLE_SPEED_AU_PER_SEC = 0.01;
    const TITLE_DUST_SHIP_SIZE_AU = 0.0012;

    function logTitleTransitionPhase(phase, extra = {}) {
        const nowMs = performance.now();
        const sinceStartMs = (titleScene && Number.isFinite(titleScene.transitionStartMs))
            ? (nowMs - titleScene.transitionStartMs)
            : null;
        console.log('[TitleTransition]', {
            phase,
            nowMs: Number(nowMs.toFixed(2)),
            sinceStartMs: sinceStartMs === null ? null : Number(sinceStartMs.toFixed(2)),
            ...extra
        });
    }

    function runAfterUiPaint(phasePrefix, callback) {
        logTitleTransitionPhase(`${phasePrefix}_wait_for_paint`);
        const raf = (typeof requestAnimationFrame === 'function')
            ? requestAnimationFrame
            : (fn) => setTimeout(fn, 16);
        raf(() => {
            logTitleTransitionPhase(`${phasePrefix}_painted`);
            setTimeout(callback, 0);
        });
    }

    function getTitleDustConfig() {
        return {
            ...SpaceTravelConfig,
            DUST_PARTICLE_COUNT: 140,
            DUST_PARTICLE_RANGE_SHIP_LENGTHS: 10,
            DUST_PARTICLE_SPAWN_RADIUS_SHIP_LENGTHS: 5,
            DUST_PARTICLE_MIN_DISTANCE_SHIP_LENGTHS: 0.6,
            DUST_PARTICLE_MAX_DISTANCE_SHIP_LENGTHS: 10,
            DUST_PARTICLE_EDGE_BAND_SHIP_LENGTHS: 2.2,
            DUST_PARTICLE_VELOCITY_BIAS: 0.55
        };
    }
    
    /**
     * Show the title screen
     */
    function show() {
        stopAnimation();
        UI.resetSelection();
        titleScene = createTitleScene();
        refreshContinuePortal();
        setupTitleInputHandlers();
        renderTitleScene();

        animationInterval = setInterval(() => {
            updateTitleScene(performance.now());
            if (!titleScene || titleScene.isWarping) {
                return;
            }
            renderTitleScene();
        }, TITLE_TICK_MS);
    }
    
    /**
     * Stop the starfield animation
     */
    function stopAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        teardownTitleInputHandlers();
    }

    function createTitleScene() {
        return {
            mode: 'select',
            selectedIndex: 0,
            activePortalIndex: 0,
            autoNavActive: false,
            continueAvailable: false,
            continueCount: 0,
            playerShip: {
                position: { x: 0, y: 0, z: 0.0675 },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                velocity: { x: 0, y: 0, z: 0 }
            },
            dustCameraPosition: { x: 0, y: 0, z: 0.0675 },
            dustParticles: [],
            shipStart: { x: 0, y: 0, z: 0 },
            phaseStartMs: performance.now(),
            lastTimestampMs: performance.now(),
            actionTriggered: false,
            isWarping: false,
            pressedKeys: new Set(),
            keyDownHandler: null,
            keyUpHandler: null,
            transientMessage: '',
            transientMessageUntilMs: 0,
            transitionStartMs: null,
            portalTintLastLogMs: 0,
            lastPortalScreenLogMs: 0,
            starfield: ThreeDUtils.buildStarfield(TITLE_STAR_COUNT),
            portals: [
                {
                    id: 'new-game',
                    label: 'NEW GAME',
                    color: COLORS.CYAN,
                    world: { x: -0.008, y: 0, z: 0.09 },
                    action: () => {
                        stopAnimation();
                        newGame();
                    }
                },
                {
                    id: 'continue',
                    label: 'CONTINUE',
                    color: COLORS.MAGENTA,
                    world: { x: 0.008, y: 0, z: 0.09 },
                    action: () => {
                        stopAnimation();
                        LoadMenu.show(() => TitleMenu.show());
                    }
                }
            ]
        };
    }

    function orientShipToward(targetPos) {
        if (!titleScene || !titleScene.playerShip || !targetPos) {
            return;
        }
        const toTarget = ThreeDUtils.subVec(targetPos, titleScene.playerShip.position);
        const forward = ThreeDUtils.normalizeVec(toTarget);
        if (ThreeDUtils.vecLength(forward) <= 0.000001) {
            return;
        }
        const up = { x: 0, y: 0, z: 1 };
        titleScene.playerShip.rotation = ThreeDUtils.quatNormalize(ThreeDUtils.quatFromForwardUp(forward, up));
    }

    function setupTitleInputHandlers() {
        if (!titleScene) {
            return;
        }
        teardownTitleInputHandlers();

        titleScene.keyDownHandler = (event) => {
            if (!titleScene || titleScene.isWarping) return;
            const key = String(event.key || '').toLowerCase();

            if (key === '1') {
                event.preventDefault();
                beginPortalAutoNav(0);
                return;
            }
            if (key === '2') {
                event.preventDefault();
                beginPortalAutoNav(1);
                return;
            }

            if (key === 'arrowleft' || key === 'arrowup') {
                event.preventDefault();
                titleScene.selectedIndex = (titleScene.selectedIndex - 1 + titleScene.portals.length) % titleScene.portals.length;
                return;
            }

            if (key === 'arrowright' || key === 'arrowdown') {
                event.preventDefault();
                titleScene.selectedIndex = (titleScene.selectedIndex + 1) % titleScene.portals.length;
                return;
            }

            if (key === 'enter') {
                event.preventDefault();
                beginPortalAutoNav(titleScene.selectedIndex);
            }
        };

        titleScene.keyUpHandler = (event) => {
            if (!titleScene) return;
        };

        document.addEventListener('keydown', titleScene.keyDownHandler);
        document.addEventListener('keyup', titleScene.keyUpHandler);
    }

    function teardownTitleInputHandlers() {
        if (!titleScene) {
            return;
        }
        if (titleScene.keyDownHandler) {
            document.removeEventListener('keydown', titleScene.keyDownHandler);
            titleScene.keyDownHandler = null;
        }
        if (titleScene.keyUpHandler) {
            document.removeEventListener('keyup', titleScene.keyUpHandler);
            titleScene.keyUpHandler = null;
        }
        if (titleScene.pressedKeys) titleScene.pressedKeys.clear();
    }

    function refreshContinuePortal() {
        if (!titleScene) return;
        const saves = SaveLoadManager.getSaveList();
        titleScene.continueCount = saves.length;
        titleScene.continueAvailable = saves.length > 0;
    }

    function easeInOut(t) {
        const x = Math.max(0, Math.min(1, t));
        return x < 0.5 ? (2 * x * x) : (1 - Math.pow(-2 * x + 2, 2) / 2);
    }

    function updateTitleScene(timestampMs) {
        if (!titleScene) return;

        const dt = Math.max(0, Math.min(0.05, (timestampMs - titleScene.lastTimestampMs) / 1000));
        titleScene.lastTimestampMs = timestampMs;

        if (!titleScene.isWarping) {
            updatePortalAutoNav(dt);
            checkTitlePortalEntry();
        }

        updateTitleDust(dt);
    }

    function updateTitleDust(dt) {
        if (!titleScene) {
            return;
        }

        const titleDustConfig = getTitleDustConfig();

        const currentSpeed = ThreeDUtils.vecLength(titleScene.playerShip.velocity);
        const dustVelocity = (currentSpeed > 0.000001)
            ? { ...titleScene.playerShip.velocity }
            : ThreeDUtils.scaleVec(ThreeDUtils.getLocalAxes(titleScene.playerShip.rotation).forward, TITLE_DUST_IDLE_SPEED_AU_PER_SEC);

        const dustShip = {
            ...titleScene.playerShip,
            position: { ...titleScene.dustCameraPosition },
            velocity: dustVelocity,
            size: TITLE_DUST_SHIP_SIZE_AU
        };

        titleScene.dustCameraPosition = ThreeDUtils.addVec(
            titleScene.dustCameraPosition,
            ThreeDUtils.scaleVec(dustVelocity, dt)
        );

        titleScene.dustParticles = SpaceTravelParticles.updateDustParticles({
            playerShip: dustShip,
            dustParticles: Array.isArray(titleScene.dustParticles) ? titleScene.dustParticles : [],
            config: titleDustConfig,
            getVelocityWorldDirection: () => ThreeDUtils.normalizeVec(dustVelocity)
        });
    }

    function updatePortalAutoNav(dt) {
        if (!titleScene || !titleScene.autoNavActive || titleScene.isWarping) {
            return;
        }

        const portal = titleScene.portals[titleScene.activePortalIndex];
        if (!portal) {
            titleScene.autoNavActive = false;
            return;
        }

        const toPortal = ThreeDUtils.subVec(portal.world, titleScene.playerShip.position);
        const distance = ThreeDUtils.vecLength(toPortal);
        if (distance <= TITLE_PORTAL_STOP_DISTANCE_AU) {
            titleScene.autoNavActive = false;
            return;
        }

        const direction = ThreeDUtils.scaleVec(toPortal, 1 / Math.max(0.000001, distance));
        titleScene.playerShip.velocity = ThreeDUtils.scaleVec(direction, TITLE_PORTAL_AUTONAV_SPEED_AU_PER_SEC);
        titleScene.playerShip.position = ThreeDUtils.addVec(
            titleScene.playerShip.position,
            ThreeDUtils.scaleVec(titleScene.playerShip.velocity, dt)
        );
    }

    function getPortalScreenInfo(portalWorld, viewWidth, viewHeight) {
        const relative = ThreeDUtils.subVec(portalWorld, titleScene.playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(titleScene.playerShip.rotation));
        if (cameraSpace.z <= SpaceTravelConfig.NEAR_PLANE) {
            return null;
        }

        const center = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, SpaceTravelConfig.VIEW_FOV);
        if (!center) {
            return null;
        }

        const right = RasterUtils.projectCameraSpacePointRaw({
            x: cameraSpace.x + SpaceTravelConfig.PORTAL_RADIUS_AU,
            y: cameraSpace.y,
            z: cameraSpace.z
        }, viewWidth, viewHeight, SpaceTravelConfig.VIEW_FOV);
        const up = RasterUtils.projectCameraSpacePointRaw({
            x: cameraSpace.x,
            y: cameraSpace.y + (SpaceTravelConfig.PORTAL_RADIUS_AU * SpaceTravelPortal.getWorldRadiusYScale(viewWidth, viewHeight, SpaceTravelConfig)),
            z: cameraSpace.z
        }, viewWidth, viewHeight, SpaceTravelConfig.VIEW_FOV);
        if (!right || !up) {
            return null;
        }

        return {
            centerX: center.x,
            centerY: center.y,
            radiusX: Math.max(1, Math.abs(right.x - center.x)),
            radiusY: Math.max(1, Math.abs(up.y - center.y))
        };
    }

    function renderTravelStyleScene(depthBuffer, viewWidth, viewHeight, timestampMs) {
        const titleDustConfig = getTitleDustConfig();

        SpaceTravelParticles.renderStars({
            viewWidth,
            viewHeight,
            depthBuffer,
            timestampMs,
            playerShip: titleScene.playerShip,
            starfield: titleScene.starfield,
            boostActive: titleScene.isWarping,
            boostStartTimestampMs: titleScene.phaseStartMs,
            boostEndTimestampMs: 0,
            config: SpaceTravelConfig,
            isPaused: false,
            pauseTimestampMs: 0
        });

        const currentSpeed = ThreeDUtils.vecLength(titleScene.playerShip.velocity);
        const dustVelocity = (currentSpeed > 0.000001)
            ? { ...titleScene.playerShip.velocity }
            : ThreeDUtils.scaleVec(ThreeDUtils.getLocalAxes(titleScene.playerShip.rotation).forward, TITLE_DUST_IDLE_SPEED_AU_PER_SEC);
        const dustShip = {
            ...titleScene.playerShip,
            position: { ...titleScene.dustCameraPosition },
            velocity: dustVelocity,
            size: TITLE_DUST_SHIP_SIZE_AU
        };

        SpaceTravelParticles.renderDust({
            viewWidth,
            viewHeight,
            depthBuffer,
            playerShip: dustShip,
            dustParticles: Array.isArray(titleScene.dustParticles) ? titleScene.dustParticles : [],
            config: titleDustConfig,
            targetSystem: null,
            currentGameState: { date: new Date() },
            getVelocityCameraSpace: () => ThreeDUtils.rotateVecByQuat(dustVelocity, ThreeDUtils.quatConjugate(titleScene.playerShip.rotation))
        });

        titleScene.portals.forEach((portal) => {
            const params = {
                playerShip: titleScene.playerShip,
                config: SpaceTravelConfig,
                isPaused: false,
                portalPausedTimestampMs: 0,
                portalActive: true,
                portalPosition: portal.world,
                portalPrimaryColor: portal.id === 'continue' ? COLORS.MAGENTA : COLORS.CYAN,
                portalSecondaryColor: portal.id === 'continue' ? COLORS.PURPLE : COLORS.BLUE,
                portalTintColor: portal.id === 'continue' ? COLORS.MAGENTA : COLORS.CYAN,
                portalOpenTimestampMs: timestampMs - ((SpaceTravelConfig.PORTAL_EXPAND_DURATION_MS || 2000) + 250),
                portalTintLastLogMs: titleScene.portalTintLastLogMs
            };
            SpaceTravelPortal.render(params, depthBuffer, viewWidth, viewHeight, timestampMs);
            titleScene.portalTintLastLogMs = params.portalTintLastLogMs || titleScene.portalTintLastLogMs;
        });
    }

    function beginPortalAutoNav(portalIndex) {
        if (!titleScene || titleScene.isWarping) return;

        if (portalIndex === 1 && !titleScene.continueAvailable) {
            titleScene.transientMessage = 'No save found. Start a new game first.';
            titleScene.transientMessageUntilMs = performance.now() + 1800;
            return;
        }

        const portal = titleScene.portals[portalIndex];
        if (!portal) return;

        titleScene.transitionStartMs = performance.now();
        titleScene.selectedIndex = portalIndex;
        titleScene.activePortalIndex = portalIndex;
        titleScene.autoNavActive = true;
        logTitleTransitionPhase('autonav_start', {
            portalIndex,
            portalId: portal.id,
            portalWorld: { ...portal.world },
            playerPos: { ...titleScene.playerShip.position }
        });
    }

    function checkTitlePortalEntry() {
        if (!titleScene || titleScene.isWarping) return;

        const radius = SpaceTravelConfig.PORTAL_RADIUS_AU;
        for (let i = 0; i < titleScene.portals.length; i++) {
            const portal = titleScene.portals[i];
            if (i === 1 && !titleScene.continueAvailable) {
                continue;
            }
            const distance = ThreeDUtils.distance(titleScene.playerShip.position, portal.world);
            if (distance <= radius) {
                logTitleTransitionPhase('portal_entry_detected', {
                    portalIndex: i,
                    portalId: portal.id,
                    distance,
                    radius,
                    playerPos: { ...titleScene.playerShip.position }
                });
                startTitleWarpAnimation(i);
                return;
            }
        }
    }

    function startTitleWarpAnimation(portalIndex) {
        if (!titleScene || titleScene.isWarping) return;

        titleScene.isWarping = true;
        titleScene.autoNavActive = false;
        titleScene.activePortalIndex = portalIndex;

        const portal = titleScene.portals[portalIndex] || null;
        logTitleTransitionPhase('transition_begin', {
            portalIndex,
            portalId: portal?.id || null
        });

        stopAnimation();
        logTitleTransitionPhase('animation_stopped', {
            portalIndex,
            portalId: portal?.id || null
        });
        executeActivePortalAction();
    }

    function executeActivePortalAction() {
        if (!titleScene) return;
        const portal = titleScene.portals[titleScene.activePortalIndex] || titleScene.portals[0];
        if (!portal || typeof portal.action !== 'function') {
            logTitleTransitionPhase('action_missing', {
                activePortalIndex: titleScene.activePortalIndex
            });
            return;
        }
        logTitleTransitionPhase('action_dispatch', {
            portalId: portal.id,
            label: portal.label,
            continueAvailable: titleScene.continueAvailable,
            continueCount: titleScene.continueCount
        });
        portal.action();
    }
    
    /**
     * Render the title screen with starfield background
     */
    function renderTitleScene() {
        if (!titleScene) {
            return;
        }

        refreshContinuePortal();
        UI.clear();

        const grid = UI.getGridSize();
        const viewHeight = Math.max(5, grid.height - 7);
        const timestampMs = performance.now();
        const depthBuffer = RasterUtils.createDepthBuffer(grid.width, viewHeight);

        const clickables = [];

        renderTravelStyleScene(depthBuffer, grid.width, viewHeight, timestampMs);
        RasterUtils.flushDepthBuffer(depthBuffer);

        titleScene.portals.forEach((portal, portalIndex) => {
            const projected = getPortalScreenInfo(portal.world, grid.width, viewHeight);
            if (!projected) {
                return;
            }

            const nowMs = timestampMs;
            if ((nowMs - (titleScene.lastPortalScreenLogMs || 0)) >= 500) {
                console.log('[TitlePortalScreen]', {
                    id: portal.id,
                    selected: titleScene.selectedIndex === portalIndex,
                    centerX: Number(projected.centerX.toFixed(2)),
                    centerY: Number(projected.centerY.toFixed(2)),
                    radiusX: Number(projected.radiusX.toFixed(2)),
                    radiusY: Number(projected.radiusY.toFixed(2)),
                    width: Number((projected.radiusX * 2).toFixed(2)),
                    height: Number((projected.radiusY * 2).toFixed(2)),
                    world: portal.world
                });
            }

            const isSelected = titleScene.selectedIndex === portalIndex;
            const keyPrefix = `${portalIndex + 1}. `;
            const label = portalIndex === 1 && !titleScene.continueAvailable
                ? `${keyPrefix}${portal.label} (NO SAVE)`
                : `${keyPrefix}${portal.label}`;
            const labelColor = (portalIndex === 1 && !titleScene.continueAvailable)
                ? COLORS.TEXT_DIM
                : (isSelected ? COLORS.YELLOW : COLORS.TEXT_NORMAL);
            const labelWidth = label.length;
            const centeredLabelX = Math.round(projected.centerX - ((labelWidth - 1) / 2));
            const labelX = Math.max(0, Math.min(grid.width - labelWidth, centeredLabelX));
            const labelY = Math.round(projected.centerY + projected.radiusY + 1);

            if (labelY >= 0 && labelY < viewHeight) {
                UI.addText(labelX, labelY, label, labelColor);
            }

            if (!titleScene.isWarping) {
                const minY = Math.max(0, Math.floor(projected.centerY - projected.radiusY));
                const maxY = Math.min(viewHeight - 1, Math.ceil(projected.centerY + projected.radiusY));
                for (let y = minY; y <= maxY; y++) {
                    const dy = (y - projected.centerY) / projected.radiusY;
                    const halfW = Math.floor(projected.radiusX * Math.sqrt(Math.max(0, 1 - (dy * dy))));
                    const startX = Math.max(0, Math.floor(projected.centerX - halfW));
                    const endX = Math.min(grid.width - 1, Math.ceil(projected.centerX + halfW));
                    const width = endX - startX + 1;
                    if (width > 0) {
                        clickables.push({ x: startX, y, width, portalIndex });
                    }
                }
            }
        });

        if ((timestampMs - (titleScene.lastPortalScreenLogMs || 0)) >= 500) {
            titleScene.lastPortalScreenLogMs = timestampMs;
        }

        UI.addTitleLineCentered(viewHeight, 'V O I D   T R A D E R');
        UI.addTextCentered(viewHeight + 1, 'Arrow Keys select portal | Enter to confirm', COLORS.TEXT_DIM);
        UI.addTextCentered(viewHeight + 2, 'Click a portal to start', COLORS.TEXT_DIM);

        if (titleScene.transientMessage && timestampMs <= titleScene.transientMessageUntilMs) {
            UI.addTextCentered(viewHeight + 3, titleScene.transientMessage, COLORS.TEXT_ERROR);
        }

        clickables.forEach(hitbox => {
            UI.addClickable(hitbox.x, hitbox.y, hitbox.width, () => {
                beginPortalAutoNav(hitbox.portalIndex);
            });
        });

        UI.draw();
    }

    function setupStartingFleet(gameState, options = {}) {
        if (!options.debug) {
            const shuttle = ShipGenerator.generateShipOfType('SHUTTLE');
            shuttle.modules = [];
            shuttle.cargo = {};
            shuttle.hull = shuttle.maxHull;
            shuttle.shields = shuttle.maxShields;
            shuttle.fuel = shuttle.maxFuel;
            gameState.ships.push(shuttle);
            return;
        }

        const battleship = ShipGenerator.generateShipOfType('BATTLESHIP');
        const scout = ShipGenerator.generateShipOfType('SCOUT');

        battleship.modules = [];
        scout.modules = [];

        const modules = Array.isArray(SHIP_MODULES_ARRAY) ? SHIP_MODULES_ARRAY : [];
        const modulesBySlot = {};
        modules.forEach(module => {
            if (!module.slot) return;
            if (!modulesBySlot[module.slot]) modulesBySlot[module.slot] = [];
            modulesBySlot[module.slot].push(module);
        });

        const installModuleOnShip = (ship, module) => {
            if (!module) return false;
            const hasSlot = ship.modules.some(id => {
                const existing = SHIP_MODULES[id];
                return existing && existing.slot === module.slot;
            });
            if (hasSlot) return false;
            ship.modules.push(module.id);
            if (module.onInstall) module.onInstall(ship);
            return true;
        };

        if (options.debug) {
            [battleship, scout].forEach(ship => {
                SHIP_MODULE_SLOTS.forEach(slot => {
                    const slotModules = modulesBySlot[slot] || [];
                    if (slotModules.length === 0) return;
                    const module = slotModules[Math.floor(Math.random() * slotModules.length)];
                    installModuleOnShip(ship, module);
                });
            });
        } else {
            SHIP_MODULE_SLOTS.forEach((slot, index) => {
                const slotModules = modulesBySlot[slot] || [];
                if (slotModules.length === 0) return;
                const module = slotModules[Math.floor(Math.random() * slotModules.length)];
                const targetShip = (index % 2 === 0) ? battleship : scout;
                installModuleOnShip(targetShip, module);
            });
        }

        [battleship, scout].forEach(ship => {
            ship.hull = ship.maxHull;
            ship.shields = ship.maxShields;
            ship.fuel = ship.maxFuel;
        });

        const cargoTypes = Array.isArray(ALL_CARGO_TYPES)
            ? ALL_CARGO_TYPES.filter(type => type && type.id)
            : [];
        [battleship, scout].forEach((ship, index) => {
            if (cargoTypes.length === 0) return;
            const first = cargoTypes[index % cargoTypes.length];
            const second = cargoTypes[(index + 1) % cargoTypes.length];
            if (ship.getAvailableCargoSpace() > 0 && first) {
                ship.cargo[first.id] = (ship.cargo[first.id] || 0) + 1;
            }
            if (ship.getAvailableCargoSpace() > 0 && second && second.id !== first.id) {
                ship.cargo[second.id] = (ship.cargo[second.id] || 0) + 1;
            }
        });

        gameState.ships.push(battleship, scout);

        const maxConsumables = gameState.getMaxConsumables();
        if (maxConsumables > 0 && Array.isArray(CONSUMABLES_ARRAY) && CONSUMABLES_ARRAY.length > 0) {
            const targetConsumables = Math.min(maxConsumables, gameState.ships.length * 2);
            let added = 0;
            let safety = 0;
            while (added < targetConsumables && safety < 50) {
                const item = CONSUMABLES_ARRAY[safety % CONSUMABLES_ARRAY.length];
                added += gameState.addConsumable(item.id, 1);
                safety++;
            }
        }
    }
    
    /**
     * Start a new game
     */
    function newGame() {
        logTitleTransitionPhase('new_game_start');
        UI.clear();
        const grid = UI.getGridSize();
        const centerY = Math.floor(grid.height / 2);
        
        UI.addTextCentered(centerY, 'Initializing new game...', COLORS.TEXT_SUCCESS);
        UI.draw();
        UI.draw();
        
        // Initialize game state (after one guaranteed paint)
        runAfterUiPaint('new_game', () => {
            logTitleTransitionPhase('new_game_init_enter');
            // Clear used ship names for new game
            ShipGenerator.clearUsedNames();
            
            // Create game state
            const gameState = new GameState();
            gameState.debug = true;
            
            // Generate galaxy with valid path from Nexus to Proxima
            let galaxyValid = false;
            let attempts = 0;
            
            while (!galaxyValid) {
                attempts++;
                
                // Generate systems
                const numSystems = Math.floor(Math.random() * (MAX_NUM_SYSTEMS - MIN_NUM_SYSTEMS + 1)) + MIN_NUM_SYSTEMS;
                gameState.systems = SystemGenerator.generateMany(numSystems);
                
                // Place player at system with most neighbors within 10ly
                let bestSystemIndex = 0;
                let maxNeighbors = 0;
                
                gameState.systems.forEach((system, index) => {
                    // Count neighbors within 10ly
                    let neighborCount = 0;
                    gameState.systems.forEach((otherSystem, otherIndex) => {
                        if (index !== otherIndex) {
                            const distance = system.distanceTo(otherSystem);
                            if (distance <= 10) {
                                neighborCount++;
                            }
                        }
                    });
                    
                    // Update best system if this one has more neighbors
                    if (neighborCount > maxNeighbors) {
                        maxNeighbors = neighborCount;
                        bestSystemIndex = index;
                    }
                });
                
                gameState.setCurrentSystem(bestSystemIndex);
                setStationLocalDestination(gameState);
                
                // Validate galaxy: name starting system, remove its guild, name nearest guild system
                // Returns true if there's a valid path from Nexus to Proxima
                galaxyValid = SystemGenerator.validateGalaxy(gameState.systems, bestSystemIndex);
                
                if (!galaxyValid) {
                    console.log(`Galaxy generation attempt ${attempts} failed - no valid path from Nexus to Proxima. Retrying...`);
                }
            }

            logTitleTransitionPhase('new_game_galaxy_ready', {
                attempts,
                systemCount: Array.isArray(gameState.systems) ? gameState.systems.length : 0
            });
            
            console.log(`Galaxy generated successfully after ${attempts} attempt(s)`);
            
            // Generate jobs for all systems after galaxy is finalized
            SystemGenerator.generateJobsForAllSystems(gameState.systems);
            
            // No initial news events; let news generate through normal gameplay
            gameState.newsEvents = [];
            
            // Adjust encounter weights based on alien proximity (after initial conquests)
            AlienUtils.adjustEncounterWeights(gameState.systems);
            
            // Messages will be added when player first docks (via checkShouldAdd)
            
            // Create player as first officer (captain) with starting stats
            const playerOfficer = new Officer('Captain', 'Commander', 10);
            // Player starts at level 1 with 0 experience and 5 skill points
            playerOfficer.level = 1;
            playerOfficer.experience = 0;
            playerOfficer.skillPoints = 0;
            gameState.captain = playerOfficer
            
            // Generate player ships (no initial crew - will be hired at tavern)
            setupStartingFleet(gameState);
            
            // Record starting score for later comparison
            const startingScoreData = ScoreMenu.calculateScore(gameState);
            gameState.startingScore = startingScoreData.totalScore;
            
            // Store game state globally for access
            window.gameState = gameState;
            
            // Show introduction screen
            logTitleTransitionPhase('new_game_show_intro');
            IntroScreen.show(gameState);
        });
    }
    
    /**
     * Start a new game with debug mode enabled
     */
    function newGameDebug() {
        logTitleTransitionPhase('new_game_debug_start');
        UI.clear();
        const grid = UI.getGridSize();
        const centerY = Math.floor(grid.height / 2);
        
        UI.addTextCentered(centerY, 'Initializing debug game...', COLORS.YELLOW);
        UI.draw();
        UI.draw();
        
        // Initialize game state (after one guaranteed paint)
        runAfterUiPaint('new_game_debug', () => {
            logTitleTransitionPhase('new_game_debug_init_enter');
            // Clear used ship names for new game
            ShipGenerator.clearUsedNames();
            
            // Create game state
            const gameState = new GameState();
            
            // Generate galaxy with valid path from Nexus to Proxima
            let galaxyValid = false;
            let attempts = 0;
            
            while (!galaxyValid) {
                attempts++;
                
                // Generate systems
                const numSystems = Math.floor(Math.random() * (MAX_NUM_SYSTEMS - MIN_NUM_SYSTEMS + 1)) + MIN_NUM_SYSTEMS;
                gameState.systems = SystemGenerator.generateMany(numSystems);
                
                // Place player at system with most neighbors within 10ly
                let bestSystemIndex = 0;
                let maxNeighbors = 0;
                
                gameState.systems.forEach((system, index) => {
                    // Count neighbors within 10ly
                    let neighborCount = 0;
                    gameState.systems.forEach((otherSystem, otherIndex) => {
                        if (index !== otherIndex) {
                            const distance = system.distanceTo(otherSystem);
                            if (distance <= 10) {
                                neighborCount++;
                            }
                        }
                    });
                    
                    // Update best system if this one has more neighbors
                    if (neighborCount > maxNeighbors) {
                        maxNeighbors = neighborCount;
                        bestSystemIndex = index;
                    }
                });
                
                gameState.setCurrentSystem(bestSystemIndex);
                setStationLocalDestination(gameState);
                
                // Validate galaxy: name starting system, remove its guild, name nearest guild system
                // Returns true if there's a valid path from Nexus to Proxima
                galaxyValid = SystemGenerator.validateGalaxy(gameState.systems, bestSystemIndex);
                
                if (!galaxyValid) {
                    console.log(`Galaxy generation attempt ${attempts} failed - no valid path from Nexus to Proxima. Retrying...`);
                }
            }

            logTitleTransitionPhase('new_game_debug_galaxy_ready', {
                attempts,
                systemCount: Array.isArray(gameState.systems) ? gameState.systems.length : 0
            });
            
            console.log(`Galaxy generated successfully after ${attempts} attempt(s)`);
            
            // Generate jobs for all systems after galaxy is finalized
            SystemGenerator.generateJobsForAllSystems(gameState.systems);
            
            // No initial news events; let news generate through normal gameplay
            gameState.newsEvents = [];
            
            // Adjust encounter weights based on alien proximity (after initial conquests)
            AlienUtils.adjustEncounterWeights(gameState.systems);
            
            // Messages will be added when player first docks (via checkShouldAdd)
            
            // Create player as first officer (captain) with starting stats
            const playerOfficer = new Officer('Captain', 'Commander', 10);
            // Player starts at level 1 with 0 experience and 5 skill points
            playerOfficer.level = 1;
            playerOfficer.experience = 0;
            playerOfficer.skillPoints = 0;
            gameState.captain = playerOfficer
            
            // Generate player ships (debug start)
            setupStartingFleet(gameState, { debug: true });
            
            // === DEBUG MODE CHEATS ===
            // Give 1 million credits
            gameState.credits = 1000000;
            
            // Give 50 skill points
            playerOfficer.skillPoints = 50;
            
            // Give all perks
            ALL_PERKS.forEach(perk => {
                gameState.perks.add(perk.id);
            });
            
            // Update enabled cargo types based on perks
            if (gameState.perks.has('CARGO_PERISHABLE')) {
                gameState.enabledCargoTypes = [...gameState.enabledCargoTypes, ...CARGO_TYPES_PERISHABLE];
            }
            if (gameState.perks.has('CARGO_FRAGILE')) {
                gameState.enabledCargoTypes = [...gameState.enabledCargoTypes, ...CARGO_TYPES_FRAGILE];
            }
            if (gameState.perks.has('CARGO_DANGEROUS')) {
                gameState.enabledCargoTypes = [...gameState.enabledCargoTypes, ...CARGO_TYPES_DANGEROUS];
            }
            if (gameState.perks.has('CARGO_ILLEGAL')) {
                gameState.enabledCargoTypes = [...gameState.enabledCargoTypes, ...CARGO_TYPES_ILLEGAL];
            }
            
            // Update enabled ship types based on perks
            if (gameState.perks.has('SHIP_MERCANTILE')) {
                gameState.enabledShipTypes = [...gameState.enabledShipTypes, ...SHIP_TYPES_MERCANTILE];
            }
            if (gameState.perks.has('SHIP_PARAMILITARY')) {
                gameState.enabledShipTypes = [...gameState.enabledShipTypes, ...SHIP_TYPES_PARAMILITARY];
            }
            if (gameState.perks.has('SHIP_MILITARY')) {
                gameState.enabledShipTypes = [...gameState.enabledShipTypes, ...SHIP_TYPES_MILITARY];
            }

            // Starter consumables handled in setupStartingFleet
            
            // Give elite status at every system
            gameState.systems.forEach((system, index) => {
                gameState.systemRanks[index] = 'ELITE';
            });
            
            // Record starting score for later comparison
            const startingScoreData = ScoreMenu.calculateScore(gameState);
            gameState.startingScore = startingScoreData.totalScore;
            
            // Store game state globally for access
            window.gameState = gameState;
            
            // Show introduction screen
            logTitleTransitionPhase('new_game_debug_show_intro');
            IntroScreen.show(gameState);
        });
    }

    function setStationLocalDestination(gameState) {
        const system = gameState.getCurrentSystem();
        if (!system || !system.station || typeof system.station.orbit?.semiMajorAU !== 'number') {
            return;
        }
        const stationDir = ThreeDUtils.normalizeVec({ x: 0, y: 0, z: 1 });
        const stationOrbit = system.station.orbit.semiMajorAU;
        gameState.localDestination = {
            id: system.station.id || `${system.name}-STATION`,
            type: 'STATION',
            name: system.station.name || `${system.name} Station`,
            positionWorld: {
                x: system.x * LY_TO_AU + stationDir.x * stationOrbit,
                y: system.y * LY_TO_AU + stationDir.y * stationOrbit,
                z: stationDir.z * stationOrbit
            },
            orbit: {
                semiMajorAU: stationOrbit,
                periodDays: Number.POSITIVE_INFINITY,
                percentOffset: 0,
                progress: 0
            }
        };
        gameState.localDestinationSystemIndex = gameState.currentSystemIndex;
    }
    
    // Public API
    return {
        show
    };
})();
