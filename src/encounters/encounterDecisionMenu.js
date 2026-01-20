/**
 * EncounterDecisionMenu - Handles pre-combat encounter decisions
 */

const EncounterDecisionMenu = {
    show: function(gameState, encType) {
        const encounterIgnores = Math.random() < 0.5;
        
        if (encounterIgnores) {
            // Encounter ignores the player
            this.showIgnoreEncounter(gameState, encType);
        } else {
            // Encounter engages with player
            switch(encType.id) {
                case 'POLICE':
                    PoliceEncounter.show(gameState, encType);
                    break;
                case 'MERCHANT':
                    MerchantEncounter.show(gameState, encType);
                    break;
                case 'PIRATE':
                    PirateEncounter.show(gameState, encType);
                    break;
                default:
                    // Unknown encounter type, go straight to combat
                    EncounterMenu.show(gameState, encType);
                    break;
            }
        }
    },
    
    /**
     * Show encounter ignoring the player
     */
    showIgnoreEncounter: function(gameState, encType) {
        UI.clear();
        
        let y = 5;
        UI.addTextCentered(y++, `=== ${encType.name} Encounter ===`, COLORS.CYAN);
        y += 2;
        
        UI.addText(10, y++, `The ${encType.name.toLowerCase()} ships pass by without incident.`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `They don't seem interested in you.`, COLORS.TEXT_DIM);
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