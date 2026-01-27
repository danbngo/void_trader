/**
 * Soldiers Encounter - Military patrol
 */

const SoldiersEncounter = {
    /**
     * Show soldiers encounter - military patrol
     */
    show: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Military Patrol');
        let y = 2;
        
        UI.addText(10, y++, `A military patrol approaches and hails your fleet.`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `"This is a military security patrol. Stand by."`, COLORS.CYAN);
        y++;
        UI.addText(10, y++, `"Seen any alien activity in this sector, captain?"`, COLORS.CYAN);
        UI.addText(10, y++, `"How about pirates or other hostiles?"`, COLORS.CYAN);
        y++;
        
        // Show radar advantage messages
        y = EncounterUtils.showPlayerRadarAdvantage(gameState, y, "Military");
        y = EncounterUtils.showRadarAdvantageWarning(gameState, y, "Military");
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;
        
        // Show military ships
        y = ShipTableRenderer.addNPCFleet(10, y, 'Military Forces:', gameState.encounterShips);
        
        // Buttons centered at bottom
        const buttonY = grid.height - 4;
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Report Nothing Unusual', callback: () => {
                this.handleReport(gameState, encType);
            }, color: COLORS.GREEN, helpText: 'Give a brief report and continue on your way' },
            { key: '2', label: 'Attack', callback: () => {
                this.showAttackConsequences(gameState, encType);
            }, color: COLORS.TEXT_ERROR, helpText: 'Attack military forces (-10 reputation, +2000 bounty)' }
        ]);
        
        UI.draw();
    },
    
    /**
     * Handle reporting to soldiers
     */
    handleReport: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        
        UI.addTitleLineCentered(0, 'Military Patrol');
        let y = 2;
        
        UI.addText(10, y++, `You provide a brief status report.`, COLORS.TEXT_NORMAL);
        y++;
        UI.addText(10, y++, `"Copy that. Stay vigilant out there, captain."`, COLORS.CYAN);
        UI.addText(10, y++, `"The void is getting more dangerous every day."`, COLORS.CYAN);
        y++;
        UI.addText(10, y++, `The military patrol continues on its route.`, COLORS.TEXT_DIM);
        
        const grid = UI.getGridSize();
        const buttonY = grid.height - 2;
        UI.addCenteredButton(buttonY, '1', 'Continue Journey', () => {
            // Return to travel menu
            TravelMenu.resume();
        }, COLORS.GREEN, 'Resume your journey');
        
        UI.draw();
    },
    
    /**
     * Show consequences of attacking soldiers
     */
    showAttackConsequences: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Attacking Military Forces');
        let y = 2;
        
        // Apply reputation and bounty penalties
        gameState.reputation += REPUTATION_EFFECT_ON_ATTACK_AUTHORITIES;
        gameState.bounty += BOUNTY_INCREASE_ON_ATTACK_AUTHORITIES;
        
        UI.addText(10, y++, `You open fire on the military patrol!`, COLORS.TEXT_ERROR);
        y++;
        
        y = TableRenderer.renderKeyValueList(10, y, [
            { label: 'Reputation:', value: `${REPUTATION_EFFECT_ON_ATTACK_AUTHORITIES}`, valueColor: COLORS.TEXT_ERROR },
            { label: 'Bounty:', value: `+${BOUNTY_INCREASE_ON_ATTACK_AUTHORITIES} credits`, valueColor: COLORS.TEXT_ERROR }
        ]);
        y++;
        
        UI.addText(10, y++, `The soldiers respond with overwhelming force!`, COLORS.TEXT_ERROR);
        
        const buttonY = grid.height - 4;
        UI.addCenteredButton(buttonY, '1', 'Continue to Combat', () => {
            EncounterMenu.show(gameState, encType);
        }, COLORS.TEXT_ERROR, 'Enter combat with military forces');
        
        UI.draw();
    }
};
