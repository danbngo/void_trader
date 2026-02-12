/**
 * Tow Menu
 * Handles being towed back to previous system after being stranded
 */

const TowMenu = (() => {
    let currentGameState = null;
    let towContext = null;
    
    /**
     * Show the tow menu after being stranded
     * @param {GameState} gameState - Current game state
     * @param {object|string} options - Tow options or legacy system name string
     */
    function show(gameState, options = null) {
        currentGameState = gameState;
        if (typeof options === 'string') {
            towContext = { systemName: options };
        } else {
            towContext = options;
        }
        render();
    }
    
    /**
     * Render the tow menu
     */
    function render() {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        let y = 0;
        UI.addTextCentered(y++, 'Calling for Assistance', COLORS.GREEN);
        y += 1;
        
        const previousSystem = currentGameState.systems[currentGameState.previousSystemIndex];
        const towSystemName = towContext?.systemName || previousSystem?.name || 'the previous system';
        const towLocationName = towContext?.location?.name || null;
        const towText = towLocationName ? `${towLocationName}` : towSystemName;
        
        UI.addText(10, y++, `You call for a tow ship...`, COLORS.TEXT);
        UI.addText(10, y++, `The tow ship recovers your disabled vessels.`, COLORS.TEXT);
        UI.addText(10, y++, `You are towed back to ${towText}.`, COLORS.TEXT);
        UI.addText(10, y++, `All ships and cargo have been lost.`, COLORS.TEXT_ERROR);
        y += 1;
        UI.addText(10, y++, `The tow ship crew repairs your weakest vessel to minimal function.`, COLORS.TEXT);
        UI.addText(10, y++, `You can limp back to port with 1 hull remaining.`, COLORS.TEXT);
        y += 1;
        
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
        
        // Find weakest ship (lowest getValue()) - don't filter by disabled since ships might still be flashing
        // Sort by ship value to find the weakest/cheapest ship
        currentGameState.ships.sort((a, b) => a.getValue() - b.getValue());
        const weakestShip = currentGameState.ships[0];
        
        if (weakestShip) {
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
            // Fallback: if no ships exist, this shouldn't happen
            currentGameState.ships = [];
        }
        
        // End encounter and return to previous system
        currentGameState.encounter = false;
        currentGameState.encounterShips = [];
        currentGameState.encounterCargo = {};
        const targetSystemIndex = typeof towContext?.systemIndex === 'number'
            ? towContext.systemIndex
            : currentGameState.previousSystemIndex;
        if (typeof currentGameState.setCurrentSystem === 'function') {
            currentGameState.setCurrentSystem(targetSystemIndex);
        } else {
            currentGameState.currentSystemIndex = targetSystemIndex;
        }

        if (towContext?.location) {
            if (typeof currentGameState.setCurrentLocation === 'function') {
                currentGameState.setCurrentLocation(towContext.location);
            } else {
                currentGameState.currentLocation = towContext.location;
            }
        }
        
        DockMenu.show(currentGameState, currentGameState.getCurrentLocation ? currentGameState.getCurrentLocation() : currentGameState.currentLocation);
    }
    
    return {
        show
    };
})();
