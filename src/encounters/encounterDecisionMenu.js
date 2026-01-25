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
        
        UI.addTitleLineCentered(0, `${encType.name} Encounter`);
        let y = 2;
        
        // Different messages based on encounter type
        switch(encType.id) {
            case 'POLICE':
                UI.addText(10, y++, `The police speed past in a hurry.`, COLORS.TEXT_NORMAL);
                UI.addText(10, y++, `They seem too busy to worry about you.`, COLORS.TEXT_NORMAL);
                break;
            case 'PIRATE':
                UI.addText(10, y++, `The pirates scan your fleet briefly, then veer off.`, COLORS.TEXT_NORMAL);
                UI.addText(10, y++, `Maybe they're hunting bigger game.`, COLORS.TEXT_NORMAL);
                break;
            case 'MERCHANT':
                UI.addText(10, y++, `The merchant ships alter course to avoid you.`, COLORS.TEXT_NORMAL);
                UI.addText(10, y++, `Perhaps they suspect you're a threat.`, COLORS.TEXT_NORMAL);
                break;
            default:
                UI.addText(10, y++, `The ${encType.name.toLowerCase()} ships pass by without incident.`, COLORS.TEXT_NORMAL);
        }
        y++;
        
        // Show warning if enemy gained radar advantage (but chose to ignore)
        if (gameState.enemyRadarAdvantage) {
            UI.addText(10, y++, `Your radar failed to detect them in time to raise your shields.`, COLORS.YELLOW);
            UI.addText(10, y++, `(Fortunately, they ignored you)`, COLORS.TEXT_DIM);
            y++;
        }
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;
        
        // Show encounter ships
        y = ShipTableRenderer.addNPCFleet(10, y, `${encType.name} Ships:`, gameState.encounterShips);
        
        const buttonY = grid.height - 4;
        
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
        
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Continue Journey', callback: () => {
                // Return to travel menu
                TravelMenu.resume();
            }, color: COLORS.GREEN, helpText: 'Resume your journey' },
            { key: '2', label: 'Attack', callback: () => {
                // Apply consequences
                gameState.reputation += reputationEffect;
                gameState.bounty += bountyEffect;
                
                // Show attack consequence screen
                UI.clear();
                
                UI.addTitleLineCentered(0, 'Surprise Attack');
                let y = 2;
                UI.addText(10, y++, `You launch an unprovoked attack!`, COLORS.TEXT_NORMAL);
                y++;
                
                // Build key-value pairs for consequences
                const consequences = [];
                if (reputationEffect !== 0) {
                    const sign = reputationEffect > 0 ? '+' : '';
                    let repLabel = 'Reputation:';
                    let repValue = `${sign}${reputationEffect}`;
                    
                    // Add descriptive text based on encounter type
                    if (encType.id === 'PIRATE') {
                        repValue = `${sign}${reputationEffect} for attacking criminals`;
                    } else if (encType.id === 'POLICE') {
                        repValue = `${sign}${reputationEffect} for attacking authorities`;
                    } else if (encType.id === 'MERCHANT') {
                        repValue = `${sign}${reputationEffect} for attacking civilians`;
                    }
                    
                    consequences.push({
                        label: repLabel,
                        value: repValue,
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
                UI.addCenteredButton(buttonY, '1', 'Continue to Combat', () => {
                    EncounterMenu.show(gameState, encType);
                }, COLORS.TEXT_ERROR, 'Enter combat');
                
                UI.draw();
            }, color: COLORS.TEXT_ERROR, helpText: hoverText }
        ]);

        
        UI.draw();
    }
};