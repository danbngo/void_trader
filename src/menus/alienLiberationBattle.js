/**
 * Alien Liberation Battle
 * Handles combat when player arrives at alien-conquered system
 */

const AlienLiberationBattle = (() => {
    let currentGameState = null;
    let currentSystem = null;
    let originSystem = null; // System player traveled from
    
    /**
     * Show liberation battle screen
     * @param {GameState} gameState - Current game state
     * @param {StarSystem} system - Conquered system to liberate
     */
    function show(gameState, system) {
        currentGameState = gameState;
        currentSystem = system;
        originSystem = gameState.systems[gameState.previousSystemIndex];
        
        UI.clear();
        UI.clearOutputRow();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Liberation Battle!');
        let y = 2;
        
        UI.addText(10, y++, `${currentSystem.name} is under alien control!`, COLORS.TEXT_ERROR);
        UI.addText(10, y++, `Alien defense forces move to intercept your fleet!`, COLORS.TEXT_ERROR);
        y++;
        
        UI.addText(10, y++, `You must fight to liberate this system.`, COLORS.YELLOW);
        UI.addText(10, y++, `Surrender is not an option against the aliens.`, COLORS.TEXT_DIM);
        y += 2;
        
        // Generate alien defense fleet
        EncounterGenerator.generateEncounter(currentGameState, ENCOUNTER_TYPES.ALIEN_DEFENSE);
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;
        
        // Show alien ships
        y = ShipTableRenderer.addNPCFleet(10, y, 'Alien Defense Fleet:', gameState.encounterShips);
        
        // Single button - Fight
        const buttonY = grid.height - 3;
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Engage Aliens', callback: () => {
                startLiberationBattle();
            }, color: COLORS.TEXT_ERROR, helpText: 'Fight to liberate the system!' }
        ]);
        
        UI.setOutputRow('Press 1 to begin combat', COLORS.TEXT_DIM);
        
        UI.draw();
    }
    
    /**
     * Start the liberation battle
     */
    function startLiberationBattle() {
        // Set encounter type to ALIEN_DEFENSE (no surrender allowed)
        currentGameState.encounterType = ENCOUNTER_TYPES.ALIEN_DEFENSE;
        currentGameState.encounter = true;
        
        // Override encounter menu's victory/defeat handlers
        currentGameState.liberationBattle = {
            system: currentSystem,
            originSystem: originSystem
        };
        
        // Start combat
        EncounterMenu.show(currentGameState, ENCOUNTER_TYPES.ALIEN_DEFENSE);
    }
    
    /**
     * Handle liberation victory
     * @param {GameState} gameState - Current game state
     */
    function handleVictory(gameState) {
        UI.clear();
        UI.clearOutputRow();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Liberation Successful!');
        let y = 2;
        
        UI.addText(10, y++, `The alien forces have been defeated!`, COLORS.GREEN);
        UI.addText(10, y++, `${currentSystem.name} is now free from alien control!`, COLORS.GREEN);
        y++;
        
        // Liberate the system
        currentSystem.conqueredByAliens = false;
        currentSystem.conqueredYear = null;
        
        // Grant reputation for liberation
        gameState.reputation += 10;
        
        // Track alien ships defeated
        const alienShipsDefeated = gameState.encounterShips.filter(ship => ship.disabled).length;
        gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] = 
            (gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] || 0) + alienShipsDefeated;
        
        // Track systems liberated
        gameState.playerRecord[PLAYER_RECORD_TYPES.SYSTEMS_LIBERATED] = 
            (gameState.playerRecord[PLAYER_RECORD_TYPES.SYSTEMS_LIBERATED] || 0) + 1;
        
        // Create instant news event about liberation
        const news = new News(
            NEWS_TYPES.ALIEN_LIBERATION,
            originSystem,
            currentSystem,
            gameState.currentYear,
            0, // Instant completion
            gameState
        );
        news.completed = true; // Already completed
        news.endDescription = `${currentSystem.name} liberated by player forces!`;
        gameState.newsEvents.push(news);
        
        UI.addText(10, y++, `You may now loot the alien wreckage for artifacts...`, COLORS.YELLOW);
        y++;
        
        const buttonY = grid.height - 3;
        UI.addCenteredButton(buttonY, '1', 'Continue', () => {
            // Show loot menu if there are ships to loot
            if (gameState.encounterShips.length > 0) {
                LootMenu.show(gameState, gameState.encounterShips, ENCOUNTER_TYPES.ALIEN_DEFENSE, () => {
                    // After looting, restore shields and go to dock
                    gameState.ships.forEach(ship => {
                        ship.shields = ship.maxShields;
                    });
                    gameState.encounter = false;
                    gameState.liberationBattle = null;
                    DockMenu.show(gameState);
                });
            } else {
                // No ships to loot, restore shields and go to dock
                gameState.ships.forEach(ship => {
                    ship.shields = ship.maxShields;
                });
                gameState.encounter = false;
                gameState.liberationBattle = null;
                DockMenu.show(gameState);
            }
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Handle liberation defeat - player is towed back to origin
     * @param {GameState} gameState - Current game state
     */
    function handleDefeat(gameState) {
        // Player is towed back to origin system
        gameState.setCurrentSystem(gameState.previousSystemIndex);
        
        // Restore all ships to minimal functionality
        gameState.ships.forEach(ship => {
            ship.hull = 1;
            ship.shields = 0;
            ship.fuel = Math.floor(ship.maxFuel * 0.1); // 10% fuel
        });
        
        // Clear encounter state
        gameState.encounter = false;
        gameState.encounterShips = [];
        gameState.encounterCargo = {};
        gameState.liberationBattle = null;
        
        // Show tow message
        TowMenu.show(gameState, currentSystem.name);
    }
    
    /**
     * Handle fleeing from liberation battle - player returns to origin
     * @param {GameState} gameState - Current game state
     */
    function handleFlee(gameState) {
        // Player flees back to origin system
        gameState.setCurrentSystem(gameState.previousSystemIndex);
        
        // Restore shields to max (successful flee)
        gameState.ships.forEach(ship => {
            ship.shields = ship.maxShields;
        });
        
        // Clear encounter state
        gameState.encounter = false;
        gameState.encounterShips = [];
        gameState.encounterCargo = {};
        gameState.liberationBattle = null;
        
        // Show flee message
        UI.clear();
        UI.clearOutputRow();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Retreat');
        let y = 2;
        
        UI.addText(10, y++, `You have fled from the alien forces.`, COLORS.YELLOW);
        UI.addText(10, y++, `Your fleet returns to ${originSystem.name}.`, COLORS.TEXT_NORMAL);
        y++;
        
        UI.addText(10, y++, `${currentSystem.name} remains under alien control.`, COLORS.TEXT_DIM);
        
        const buttonY = grid.height - 3;
        UI.addCenteredButton(buttonY, '1', 'Continue', () => {
            DockMenu.show(gameState);
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show,
        handleVictory,
        handleDefeat,
        handleFlee
    };
})();
