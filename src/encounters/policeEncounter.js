/**
 * Police Encounter - Routine inspection
 */

const PoliceEncounter = {
    /**
     * Show police encounter - routine inspection
     */
    show: function(gameState, encType) {
        // Check if player has any illegal cargo
        let hasIllegalCargo = false;
        
        gameState.ships.forEach(ship => {
            Object.keys(ship.cargo).forEach(cargoId => {
                const amount = ship.cargo[cargoId];
                if (amount > 0) {
                    const cargoType = CARGO_TYPES[cargoId];
                    if (cargoType && cargoType.illegal) {
                        hasIllegalCargo = true;
                    }
                }
            });
        });
        
        if (!hasIllegalCargo) {
            // Police don't pull over if there's nothing illegal
            this.showNoIllegalPolice(gameState);
            return;
        }
        
        UI.clear();
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== Police Inspection ===`, COLORS.CYAN);
        y += 2;
        
        UI.addText(10, y++, `Police cruisers approach and hail your fleet.`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `"This is System Authority. Prepare for routine inspection."`, COLORS.YELLOW);
        y += 2;
        
        // Show radar advantage messages
        y = EncounterUtils.showPlayerRadarAdvantage(gameState, y, "Police");
        y = EncounterUtils.showRadarAdvantageWarning(gameState, y, "Police");
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, true);
        y++;
        
        // Show enemy ships
        y = ShipTableRenderer.addNPCFleet(10, y, 'Police Forces:', gameState.encounterShips);
        
        // Buttons centered at bottom
        const buttonY = grid.height - 3;
        UI.addCenteredButton(buttonY, '1', 'Allow Inspection', () => {
            this.handleInspection(gameState, encType);
        }, COLORS.GREEN, 'Let police scan your cargo (50% chance to find illegal goods)');
        
        UI.addCenteredButton(buttonY + 1, '2', 'Resist', () => {
            this.showResistConsequences(gameState, encType);
        }, COLORS.TEXT_ERROR, 'Refuse inspection and fight (-10 reputation, +2000 bounty)');
        
        UI.draw();
    },
    
    /**
     * Show police passing by when player has no illegal cargo
     */
    showNoIllegalPolice: function(gameState) {
        UI.clear();
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== Police Encounter ===`, COLORS.CYAN);
        y += 2;
        
        UI.addText(10, y++, `Police cruisers approach and scan your fleet.`, COLORS.TEXT_NORMAL);
        y++;
        UI.addText(10, y++, `The police scan your ships, then pass by without hailing you.`, COLORS.GREEN);
        y++;
        UI.addText(10, y++, `Their scanners found nothing suspicious.`, COLORS.TEXT_DIM);
        y += 2;
        
        // Show warning if enemy gained radar advantage
        y = EncounterUtils.showRadarAdvantageWarning(gameState, y, "Police");
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, true);
        y++;
        
        // Show police ships
        y = ShipTableRenderer.addNPCFleet(10, y, 'Police Forces:', gameState.encounterShips);
        
        // Buttons centered at bottom
        const buttonY = grid.height - 3;
        UI.addCenteredButton(buttonY, '1', 'Continue Journey', () => {
            TravelMenu.resume();
        }, COLORS.GREEN, 'Resume your journey');
        
        UI.addCenteredButton(buttonY + 1, '2', 'Attack', () => {
            this.showResistConsequences(gameState, ENCOUNTER_TYPES.POLICE);
        }, COLORS.TEXT_ERROR, 'Attack authorities (-10 reputation, +2000 bounty)');
        
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
        
        const grid = UI.getGridSize();
        const buttonY = grid.height - 2;
        UI.addCenteredButton(buttonY, '1', 'Continue Journey', () => {
            // Return to travel menu
            TravelMenu.resume();
        }, COLORS.GREEN, 'Resume your journey');
        
        UI.draw();
    },
    
    /**
     * Show consequences of resisting police
     */
    showResistConsequences: function(gameState, encType) {
        UI.clear();
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== Resisting Arrest ===`, COLORS.TEXT_ERROR);
        y += 2;
        
        // Apply reputation and bounty penalties
        gameState.reputation += REPUTATION_EFFECT_ON_ATTACK_AUTHORITIES;
        gameState.bounty += BOUNTY_INCREASE_ON_ATTACK_AUTHORITIES;
        
        UI.addText(10, y++, `You refuse to submit to inspection!`, COLORS.TEXT_ERROR);
        UI.addText(10, y++, `The police open fire!`, COLORS.TEXT_NORMAL);
        y++;
        
        y = TableRenderer.renderKeyValueList(10, y, [
            { label: 'Reputation:', value: `${REPUTATION_EFFECT_ON_ATTACK_AUTHORITIES}`, valueColor: COLORS.TEXT_ERROR },
            { label: 'Bounty:', value: `+${BOUNTY_INCREASE_ON_ATTACK_AUTHORITIES} credits`, valueColor: COLORS.TEXT_ERROR }
        ]);
        y++;
        
        const buttonY = grid.height - 4;
        UI.addCenteredButton(buttonY, '1', 'Continue to Combat', () => {
            EncounterMenu.show(gameState, encType);
        }, COLORS.TEXT_ERROR);
        
        UI.draw();
    },
    
    /**
     * Show consequences of attacking police
     */
    showAttackConsequences: function(gameState, encType) {
        UI.clear();
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== Attacking Authorities ===`, COLORS.TEXT_ERROR);
        y += 2;
        
        // Apply reputation and bounty penalties
        gameState.reputation += REPUTATION_EFFECT_ON_ATTACK_AUTHORITIES;
        gameState.bounty += BOUNTY_INCREASE_ON_ATTACK_AUTHORITIES;
        
        UI.addText(10, y++, `You launch an unprovoked attack on law enforcement!`, COLORS.TEXT_ERROR);
        y++;
        
        y = TableRenderer.renderKeyValueList(10, y, [
            { label: 'Reputation:', value: `${REPUTATION_EFFECT_ON_ATTACK_AUTHORITIES}`, valueColor: COLORS.TEXT_ERROR },
            { label: 'Bounty:', value: `+${BOUNTY_INCREASE_ON_ATTACK_AUTHORITIES} credits`, valueColor: COLORS.TEXT_ERROR }
        ]);
        y++;
        
        UI.addText(10, y++, `You are now a wanted criminal!`, COLORS.TEXT_ERROR);
        
        const buttonY = grid.height - 4;
        UI.addCenteredButton(buttonY, '1', 'Continue to Combat', () => {
            EncounterMenu.show(gameState, encType);
        }, COLORS.TEXT_ERROR);
        
        UI.draw();
    }
};
