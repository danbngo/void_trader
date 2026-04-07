/**
 * Alien Defense Encounter - Aliens defending their territory
 */

const AlienDefenseEncounter = {
    /**
     * Show alien defense encounter - immediate attack
     * @param {GameState} gameState - Current game state
     * @param {Object} encType - Encounter type
     */
    show: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        UI.resetSelection(); // Clear alert from in-transit screen
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Alien Defense Forces!');
        let y = 2;
        
        UI.addText(10, y++, `Alien defense vessels converge on your position!`, COLORS.TEXT_ERROR);
        UI.addText(10, y++, `They regard you as an intruder and attack immediately!`, COLORS.TEXT_ERROR);
        y += 2;
        
        // Show radar advantage messages
        y = EncounterUtils.showPlayerRadarAdvantage(gameState, y, "Aliens");
        y = EncounterUtils.showRadarAdvantageWarning(gameState, y, "Aliens");
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;
        
        // Show alien ships
        y = ShipTableRenderer.addNPCFleet(10, y, 'Alien Defense Fleet:', gameState.encounterShips);
        
        // Single button - Fight (no negotiation possible)
        const buttonY = grid.height - 3;
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Engage in Combat', callback: () => {
                this.startCombat(gameState, encType);
            }, color: COLORS.TEXT_ERROR, helpText: 'Battle the alien defenders!' }
        ]);
        
        // Clear any lingering output row messages
        UI.setOutputRow('Press 1 to engage in combat', COLORS.TEXT_DIM);
        
        UI.draw();
    },
    
    /**
     * Start combat immediately
     */
    startCombat: function(gameState, encType) {
        // Set encounter type
        gameState.encounterType = encType;
        
        // Start combat
        EncounterMenu.show(gameState, encType);
    }
};
