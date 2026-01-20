/**
 * Police Encounter - Routine inspection
 */

const PoliceEncounter = {
    /**
     * Show police encounter - routine inspection
     */
    show: function(gameState, encType) {
        UI.clear();
        
        let y = 5;
        UI.addTextCentered(y++, `=== Police Inspection ===`, COLORS.CYAN);
        y += 2;
        
        UI.addText(10, y++, `Police cruisers approach and hail your fleet.`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `"This is System Authority. Prepare for routine inspection."`, COLORS.YELLOW);
        y += 2;
        
        UI.addButton(10, y++, '1', 'Allow Inspection', () => {
            this.handleInspection(gameState, encType);
        }, COLORS.GREEN);
        
        UI.addButton(10, y++, '2', 'Resist', () => {
            EncounterMenu.show(gameState, encType);
        }, COLORS.TEXT_ERROR);
        
        UI.draw();
    },
    
    /**
     * Handle police inspection result
     */
    handleInspection: function(gameState, encType) {
        UI.clear();
        
        let y = 5;
        UI.addTextCentered(y++, `=== Police Inspection ===`, COLORS.CYAN);
        y += 2;
        
        // Check if player has illegal cargo
        const illegalCargo = {};
        let hasIllegalCargo = false;
        
        gameState.ships.forEach(ship => {
            Object.keys(ship.cargo).forEach(cargoId => {
                const amount = ship.cargo[cargoId];
                if (amount > 0) {
                    const cargoType = CARGO_TYPES[cargoId];
                    if (cargoType && cargoType.illegal) {
                        hasIllegalCargo = true;
                        illegalCargo[cargoId] = (illegalCargo[cargoId] || 0) + amount;
                    }
                }
            });
        });
        
        const foundIllegal = Math.random() < 0.5;
        
        if (hasIllegalCargo && foundIllegal) {
            // Police find illegal cargo
            UI.addText(10, y++, `The police scan your cargo holds...`, COLORS.TEXT_NORMAL);
            y++;
            UI.addText(10, y++, `"ILLEGAL CARGO DETECTED!"`, COLORS.TEXT_ERROR);
            y++;
            
            // Remove illegal cargo from all ships
            gameState.ships.forEach(ship => {
                Object.keys(ship.cargo).forEach(cargoId => {
                    const cargoType = CARGO_TYPES[cargoId];
                    if (cargoType && cargoType.illegal) {
                        ship.cargo[cargoId] = 0;
                    }
                });
            });
            
            // Fine the player
            const fine = Math.min(1000, gameState.credits);
            gameState.credits -= fine;
            
            Object.keys(illegalCargo).forEach(cargoId => {
                const cargoType = CARGO_TYPES[cargoId];
                UI.addText(10, y++, `Confiscated: ${illegalCargo[cargoId]} ${cargoType.name}`, COLORS.TEXT_ERROR);
            });
            y++;
            UI.addText(10, y++, `Fine imposed: ${fine} credits`, COLORS.TEXT_ERROR);
            y++;
            UI.addText(10, y++, `"Consider this a warning, captain."`, COLORS.YELLOW);
        } else {
            // Police find nothing (or player has no illegal cargo)
            UI.addText(10, y++, `The police scan your cargo holds...`, COLORS.TEXT_NORMAL);
            y++;
            UI.addText(10, y++, `"Everything appears to be in order."`, COLORS.GREEN);
            y++;
            UI.addText(10, y++, `"Safe travels, captain."`, COLORS.TEXT_NORMAL);
        }
        
        y += 2;
        
        UI.addButton(10, y++, '1', 'Continue Journey', () => {
            // Return to travel menu
            gameState.encounter = false;
            gameState.encounterShips = [];
            gameState.encounterCargo = {};
            TravelMenu.show(gameState);
        }, COLORS.GREEN);
        
        UI.draw();
    }
};
