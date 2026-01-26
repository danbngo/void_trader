/**
 * Alien Skirmish Encounter - Hostile aliens attack without negotiation
 */

const AlienSkirmishEncounter = {
    /**
     * Show alien skirmish encounter - immediate attack
     * @param {GameState} gameState - Current game state
     * @param {Object} encType - Encounter type
     */
    show: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        UI.resetSelection(); // Clear alert from in-transit screen
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Alien Skirmish!');
        let y = 2;
        
        UI.addText(10, y++, `Unidentified alien vessels emerge from the void!`, COLORS.TEXT_ERROR);
        UI.addText(10, y++, `They open fire without warning or communication!`, COLORS.TEXT_ERROR);
        y += 2;
        
        // Show radar advantage messages
        y = EncounterUtils.showPlayerRadarAdvantage(gameState, y, "Aliens");
        y = EncounterUtils.showRadarAdvantageWarning(gameState, y, "Aliens");
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;
        
        // Show alien ships
        y = ShipTableRenderer.addNPCFleet(10, y, 'Alien Forces:', gameState.encounterShips);
        
        // Single button - Defend (no negotiation possible)
        const buttonY = grid.height - 3;
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Defend Yourself!', callback: () => {
                this.startCombat(gameState, encType);
            }, color: COLORS.TEXT_ERROR, helpText: 'Fight for survival against the alien threat!' }
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
        EncounterMenu.show(gameState);
    }
};
