/**
 * Tow Menu
 * Handles being towed back to previous system after being stranded
 */

const TowMenu = (() => {
    let currentGameState = null;
    
    /**
     * Show the tow menu after being stranded
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        currentGameState = gameState;
        render();
    }
    
    /**
     * Render the tow menu
     */
    function render() {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        let y = 5;
        UI.addTextCentered(y++, '=== Calling for Assistance ===', COLORS.TITLE);
        y += 2;
        
        const previousSystem = currentGameState.systems[currentGameState.previousSystemIndex];
        
        UI.addText(10, y++, `You call for a tow ship...`, COLORS.CYAN);
        y++;
        UI.addText(10, y++, `The tow ship recovers your disabled vessels.`, COLORS.CYAN);
        UI.addText(10, y++, `You are towed back to ${previousSystem.name}.`, COLORS.CYAN);
        UI.addText(10, y++, `All ships and cargo have been lost.`, COLORS.TEXT_ERROR);
        y += 2;
        UI.addText(10, y++, `The tow ship crew repairs your weakest vessel to minimal function.`, COLORS.CYAN);
        UI.addText(10, y++, `You can limp back to port with 1 hull remaining.`, COLORS.CYAN);
        y += 2;
        
        const buttonY = grid.height - 3;
        UI.addCenteredButton(buttonY, '1', 'Continue', () => {
            completeTow();
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Complete the tow operation and return to dock
     */
    function completeTow() {
        // Consume fuel based on progress made before defeat
        TravelMenu.handleTowedBack();
        
        // Find weakest disabled ship (lowest maxHull)
        const disabledShips = currentGameState.ships.filter(s => s.disabled);
        if (disabledShips.length > 0) {
            disabledShips.sort((a, b) => a.maxHull - b.maxHull);
            const weakestShip = disabledShips[0];
            
            // Resurrect with 1 hull
            weakestShip.hull = 1;
            weakestShip.disabled = false;
            weakestShip.shields = 0;
            
            // Remove all cargo from this ship
            if (weakestShip.cargo) {
                Object.keys(weakestShip.cargo).forEach(cargoId => {
                    weakestShip.cargo[cargoId] = 0;
                });
            }
            
            // Keep only this ship
            currentGameState.ships = [weakestShip];
        } else {
            // Fallback: if no disabled ships, keep nothing
            currentGameState.ships = [];
        }
        
        // End encounter and return to previous system
        currentGameState.encounter = false;
        currentGameState.encounterShips = [];
        currentGameState.encounterCargo = {};
        currentGameState.setCurrentSystem(currentGameState.previousSystemIndex);
        
        DockMenu.show(currentGameState);
    }
    
    return {
        show
    };
})();
