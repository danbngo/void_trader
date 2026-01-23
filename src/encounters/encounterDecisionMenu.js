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
        
        // Different messages based on encounter type
        let ignoreMessage = '';
        switch(encType.id) {
            case 'POLICE':
                ignoreMessage = `The police speed past in a hurry. They seem too busy to worry about you.`;
                break;
            case 'PIRATE':
                ignoreMessage = `The pirates scan your fleet briefly, then veer off. Maybe they're hunting bigger game.`;
                break;
            case 'MERCHANT':
                ignoreMessage = `The merchant ships alter course to avoid you. Perhaps they suspect you're a threat.`;
                break;
            default:
                ignoreMessage = `The ${encType.name.toLowerCase()} ships pass by without incident.`;
        }
        
        UI.addText(10, y++, ignoreMessage, COLORS.TEXT_NORMAL);
        y++;
        
        // Show warning if enemy gained radar advantage (but chose to ignore)
        if (gameState.enemyRadarAdvantage) {
            UI.addText(10, y++, `Your radar failed to detect them in time to raise your shields.`, COLORS.YELLOW);
            UI.addText(10, y++, `(Fortunately, they ignored you)`, COLORS.TEXT_DIM);
            y++;
        }
        
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
            UI.addTextCentered(y++, `=== Surprise Attack ===`, COLORS.CYAN);
            y += 2;
            UI.addText(10, y++, `You launch an unprovoked attack!`, COLORS.TEXT_NORMAL);
            y++;
            
            // Build key-value pairs for consequences
            const consequences = [];
            if (reputationEffect !== 0) {
                const sign = reputationEffect > 0 ? '+' : '';
                consequences.push({
                    label: 'Reputation:',
                    value: `${sign}${reputationEffect}`,
                    valueColor: reputationEffect > 0 ? COLORS.GREEN : COLORS.TEXT_ERROR
                });
            }
            if (bountyEffect > 0) {
                consequences.push({
                    label: 'Bounty:',
                    value: `+${bountyEffect} credits`,
                    valueColor: COLORS.TEXT_ERROR
                });
            }
            y = TableRenderer.renderKeyValueList(10, y, consequences);
            
            const buttonY = grid.height - 2;
            const buttonX = Math.floor((grid.width - 25) / 2);
            UI.addButton(buttonX, buttonY, '1', 'Continue to Combat', () => {
                EncounterMenu.show(gameState, encType);
            }, COLORS.TEXT_ERROR);
            
            UI.draw();
        }, COLORS.TEXT_ERROR, hoverText);
        
        UI.draw();
    }
};