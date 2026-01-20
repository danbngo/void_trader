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
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== ${encType.name} Encounter ===`, COLORS.CYAN);
        y += 2;
        
        UI.addText(10, y++, `The ${encType.name.toLowerCase()} ships pass by without incident.`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `They don't seem interested in you.`, COLORS.TEXT_DIM);
        y += 2;
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, true);
        y++;
        
        // Show encounter ships
        y = ShipTableRenderer.addNPCFleet(10, y, `${encType.name} Ships:`, gameState.encounterShips);
        
        const buttonY = grid.height - 4;
        UI.addButton(10, buttonY, '1', 'Continue Journey', () => {
            // Return to travel menu
            TravelMenu.resume();
        }, COLORS.GREEN, 'Resume your journey');
        
        // Add attack option for ignored encounters
        let hoverText = '';
        let reputationEffect = 0;
        let bountyEffect = 0;
        
        switch(encType.id) {
            case 'POLICE':
                hoverText = 'Attack authorities (-10 reputation, +2000 bounty)';
                reputationEffect = REPUTATION_EFFECT_ON_ATTACK_AUTHORITIES;
                bountyEffect = BOUNTY_INCREASE_ON_ATTACK_AUTHORITIES;
                break;
            case 'MERCHANT':
                hoverText = 'Attack civilians (-5 reputation, +1000 bounty)';
                reputationEffect = REPUTATION_EFFECT_ON_ATTACK_CIVILIAN;
                bountyEffect = BOUNTY_INCREASE_ON_ATTACK_CIVILIANS;
                break;
            case 'PIRATE':
                hoverText = 'Attack criminals (+5 reputation, no bounty)';
                reputationEffect = REPUTATION_EFFECT_ON_ATTACK_CRIMINALS;
                bountyEffect = 0;
                break;
        }
        
        UI.addButton(10, buttonY + 1, '2', 'Attack', () => {
            // Apply consequences
            gameState.reputation += reputationEffect;
            gameState.bounty += bountyEffect;
            
            // Show attack consequence screen
            UI.clear();
            let y = 5;
            UI.addTextCentered(y++, `=== Surprise Attack ===`, COLORS.TEXT_ERROR);
            y += 2;
            UI.addText(10, y++, `You launch an unprovoked attack!`, COLORS.TEXT_ERROR);
            y++;
            if (reputationEffect !== 0) {
                const sign = reputationEffect > 0 ? '+' : '';
                UI.addText(10, y++, `Reputation: ${sign}${reputationEffect}`, reputationEffect > 0 ? COLORS.GREEN : COLORS.TEXT_ERROR);
            }
            if (bountyEffect > 0) {
                UI.addText(10, y++, `Bounty: +${bountyEffect} credits`, COLORS.TEXT_ERROR);
            }
            
            const continueY = grid.height - 4;
            UI.addButton(10, continueY, '1', 'Continue to Combat', () => {
                EncounterMenu.show(gameState, encType);
            }, COLORS.TEXT_ERROR);
            
            UI.draw();
        }, COLORS.TEXT_ERROR, hoverText);
        
        UI.draw();
    }
};