/**
 * Title Menu
 * Main menu screen for Void Trader
 */

const TitleMenu = (() => {
    const LY_TO_AU = 63241; // 1 LY = 63,241 AU
    let animationInterval = null;
    let mouseMoveLogger = null;
    
    /**
     * Show the title screen
     */
    function show() {
        // Initialize starfield
        Starfield.init();
        
        // Start animation loop
        screenController = startAnimation();
        if (screenController) screenController.setScreen('title');
        
        // Initial render
        renderTitleScreen();
        setupMouseLogging();
    }
    
    /**
     * Start the starfield animation loop
     */
    function startAnimation() {
        // Clear any existing animation
        if (animationInterval) {
            clearInterval(animationInterval);
        }
        
        // Track which screen we're on
        let currentScreen = 'title';
        
        // Animate at ~30 FPS
        animationInterval = setInterval(() => {
            Starfield.update();
            
            // Re-render the appropriate screen
            // We need to check which screen is active
            if (currentScreen === 'title') {
                renderTitleScreen();
            } else if (currentScreen === 'about') {
                renderAboutScreen();
            }
        }, 33);
        
        return {
            setScreen: (screen) => { currentScreen = screen; }
        };
    }
    
    let screenController = null;
    
    /**
     * Stop the starfield animation
     */
    function stopAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        if (mouseMoveLogger) {
            const canvas = UI.getCanvas?.();
            if (canvas) {
                canvas.removeEventListener('mousemove', mouseMoveLogger);
            }
            mouseMoveLogger = null;
        }
    }
    
    function setupMouseLogging() {
        const canvas = UI.getCanvas?.();
        if (!canvas) {
            return;
        }
        mouseMoveLogger = (e) => {
            const rect = canvas.getBoundingClientRect();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;
            const charDims = UI.getCharDimensions();
            const gridX = Math.floor(pixelX / charDims.width);
            const gridY = Math.floor(pixelY / charDims.height);
            const underChar = UI.getScreenCharAt ? UI.getScreenCharAt(gridX, gridY) : ' ';
            console.log('[TitleMenu Mouse]', {
                pixelX: Math.round(pixelX),
                pixelY: Math.round(pixelY),
                gridX,
                gridY,
                underChar,
                underCharGridX: gridX,
                underCharGridY: gridY
            });
        };
        canvas.addEventListener('mousemove', mouseMoveLogger);
    }
    
    /**
     * Render the title screen with starfield background
     */
    function renderTitleScreen() {
        UI.clear();
        
        // Render starfield FIRST (background layer)
        Starfield.render();
        
        // Don't reset selection here - it causes buttons to reset every frame
        // UI.resetSelection();
        
        const grid = UI.getGridSize();
        const centerX = Math.floor(grid.width / 2);
        
        // Title
        UI.addTitleLineCentered(5, 'V O I D   T R A D E R');
        UI.addTextCentered(7, 'A Text-Based Space Trading Game', COLORS.TEXT_DIM);
        
        // Menu buttons positioned at bottom
        const buttonY = grid.height - 5;
        
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'New Game', callback: () => {
                stopAnimation();
                newGame();
            }, color: COLORS.BUTTON, helpText: 'Start a new adventure' },
            { key: '2', label: 'Load Game', callback: () => {
                stopAnimation();
                LoadMenu.show(() => TitleMenu.show());
            }, color: COLORS.BUTTON, helpText: 'Load a previously saved game' },
            { key: '3', label: 'About', callback: () => {
                stopAnimation();
                showAbout();
            }, color: COLORS.BUTTON, helpText: 'Learn about the game' },
            { key: '4', label: 'Debug Mode', callback: () => {
                stopAnimation();
                newGameDebug();
            }, color: COLORS.YELLOW, helpText: 'Start a new game with debug cheats (1M CR, all perks, elite status)' }
        ]);
        
        UI.addTextCentered(grid.height - 1, '(Use mouse, arrow keys or numbers to select)', COLORS.TEXT_DIM);
        
        // Draw everything
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
        UI.clear();
        const grid = UI.getGridSize();
        const centerY = Math.floor(grid.height / 2);
        
        UI.addTextCentered(centerY, 'Initializing new game...', COLORS.TEXT_SUCCESS);
        UI.draw();
        UI.draw();
        
        // Initialize game state
        setTimeout(() => {
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
            
            console.log(`Galaxy generated successfully after ${attempts} attempt(s)`);
            
            // Generate jobs for all systems after galaxy is finalized
            SystemGenerator.generateJobsForAllSystems(gameState.systems);
            
            // No initial news events; let news generate through normal gameplay
            gameState.newsEvents = [];
            
            // Adjust encounter weights based on alien proximity (after initial conquests)
            SystemGenerator.adjustEncounterWeightsForAliens(gameState.systems);
            
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
            IntroScreen.show(gameState);
        }, 500);
    }
    
    /**
     * Start a new game with debug mode enabled
     */
    function newGameDebug() {
        UI.clear();
        const grid = UI.getGridSize();
        const centerY = Math.floor(grid.height / 2);
        
        UI.addTextCentered(centerY, 'Initializing debug game...', COLORS.YELLOW);
        UI.draw();
        UI.draw();
        
        // Initialize game state
        setTimeout(() => {
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
            
            console.log(`Galaxy generated successfully after ${attempts} attempt(s)`);
            
            // Generate jobs for all systems after galaxy is finalized
            SystemGenerator.generateJobsForAllSystems(gameState.systems);
            
            // No initial news events; let news generate through normal gameplay
            gameState.newsEvents = [];
            
            // Adjust encounter weights based on alien proximity (after initial conquests)
            SystemGenerator.adjustEncounterWeightsForAliens(gameState.systems);
            
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
            IntroScreen.show(gameState);
        }, 500);
    }

    function setStationLocalDestination(gameState) {
        const system = gameState.getCurrentSystem();
        if (!system || typeof system.stationOrbitAU !== 'number') {
            return;
        }
        const stationDir = ThreeDUtils.normalizeVec({ x: 0, y: 0, z: 1 });
        gameState.localDestination = {
            id: `${system.name}-STATION`,
            type: 'STATION',
            positionWorld: {
                x: system.x * LY_TO_AU + stationDir.x * system.stationOrbitAU,
                y: system.y * LY_TO_AU + stationDir.y * system.stationOrbitAU,
                z: stationDir.z * system.stationOrbitAU
            },
            orbit: {
                semiMajorAU: system.stationOrbitAU,
                periodDays: Number.POSITIVE_INFINITY,
                percentOffset: 0,
                progress: 0
            }
        };
        gameState.localDestinationSystemIndex = gameState.currentSystemIndex;
    }
    
    /**
     * Show about screen
     */
    function showAbout() {
        // Keep starfield running
        if (!animationInterval) {
            Starfield.init();
            screenController = startAnimation();
        }
        
        if (screenController) screenController.setScreen('about');
        
        renderAboutScreen();
    }
    
    /**
     * Render the about screen
     */
    function renderAboutScreen() {
        UI.clear();
        
        // Render starfield background
        Starfield.render();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(8, 'V O I D   T R A D E R');
        UI.addTextCentered(11, 'A text-based space trading adventure', COLORS.TEXT_NORMAL);
        UI.addTextCentered(13, 'Navigate the cosmos, trade goods, and', COLORS.TEXT_NORMAL);
        UI.addTextCentered(14, 'build your interstellar trading empire.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(17, 'Controls: Number keys', COLORS.BUTTON);
        UI.addTextCentered(18, 'Version: 0.1.0', COLORS.TEXT_DIM);
        
        UI.addCenteredButton(22, '1', 'Back to Title', () => show(), COLORS.BUTTON);
        
        UI.draw();
    }
    
    // Public API
    return {
        show
    };
})();
