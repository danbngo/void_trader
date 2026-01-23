/**
 * Pirate Encounter - Boarding threat
 */

const PirateEncounter = {
    /**
     * Show pirate encounter - boarding threat
     */
    show: function(gameState, encType) {
        UI.clear();
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== Pirate Threat ===`, COLORS.TEXT_ERROR);
        y += 2;
        
        UI.addText(10, y++, `Pirate vessels close in on your fleet!`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `"Hand over your cargo or we'll take it by force!"`, COLORS.TEXT_ERROR);
        y += 2;
        
        // Show warning if enemy gained radar advantage
        y = EncounterUtils.showRadarAdvantageWarning(gameState, y, "Pirates");
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, true);
        y++;
        
        // Show pirate ships
        y = ShipTableRenderer.addNPCFleet(10, y, 'Pirate Forces:', gameState.encounterShips);
        
        const buttonY = grid.height - 3;
        UI.addButton(10, buttonY, '1', 'Allow Boarding', () => {
            this.handleBoarding(gameState, encType);
        }, COLORS.BUTTON, 'Surrender cargo to pirates');
        
        UI.addButton(10, buttonY + 1, '2', 'Resist', () => {
            this.showAttackConsequences(gameState, encType);
        }, COLORS.TEXT_ERROR, 'Attack criminals (+5 reputation, no bounty)');
        
        UI.draw();
    },
    
    /**
     * Handle pirate boarding and looting
     */
    handleBoarding: function(gameState, encType) {
        UI.clear();
        
        let y = 5;
        UI.addTextCentered(y++, `=== Pirate Boarding ===`, COLORS.TEXT_ERROR);
        y += 2;
        
        const playerCargo = Ship.getFleetCargo(gameState.ships);
        const hasAnyCargo = Object.values(playerCargo).some(amount => amount > 0);
        
        if (!hasAnyCargo) {
            // Player has no cargo
            UI.addText(10, y++, `The pirates board your ships and search for cargo...`, COLORS.TEXT_NORMAL);
            y++;
            UI.addText(10, y++, `"Nothing? You got NOTHING?!"`, COLORS.TEXT_ERROR);
            y++;
            UI.addText(10, y++, `The pirates sourly note you carry no cargo.`, COLORS.TEXT_DIM);
            UI.addText(10, y++, `They furiously instruct you to work harder,`, COLORS.TEXT_DIM);
            UI.addText(10, y++, `so they can rob you next time!`, COLORS.TEXT_DIM);
            y += 2;
            
            UI.addButton(10, y++, '1', 'Continue Journey', () => {
                TravelMenu.resume();
            }, COLORS.GREEN, 'Resume your journey');
            
            UI.draw();
            return;
        }
        
        // Calculate pirate cargo capacity
        const pirateCapacity = gameState.encounterShips.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
        
        // Sort cargo by value (most valuable first)
        const cargoByValue = Object.keys(playerCargo)
            .filter(cargoId => playerCargo[cargoId] > 0)
            .map(cargoId => ({
                id: cargoId,
                type: CARGO_TYPES[cargoId],
                amount: playerCargo[cargoId],
                value: CARGO_TYPES[cargoId].baseValue
            }))
            .sort((a, b) => b.value - a.value);
        
        // Loot cargo up to pirate capacity
        let remainingCapacity = pirateCapacity;
        const lootedCargo = [];
        
        for (const cargo of cargoByValue) {
            if (remainingCapacity <= 0) break;
            
            const amountToLoot = Math.min(cargo.amount, remainingCapacity);
            Ship.removeCargoFromFleet(gameState.ships, cargo.id, amountToLoot);
            lootedCargo.push({ type: cargo.type, amount: amountToLoot });
            remainingCapacity -= amountToLoot;
        }
        
        UI.addText(10, y++, `The pirates board your ships and loot your cargo!`, COLORS.TEXT_ERROR);
        y++;
        
        lootedCargo.forEach(loot => {
            UI.addText(10, y++, `Stolen: ${loot.amount} ${loot.type.name}`, COLORS.TEXT_ERROR);
        });
        
        y++;
        UI.addText(10, y++, `"Much obliged, captain! Yohohoho!"`, COLORS.TEXT_ERROR);
        y += 2;
        
        UI.addButton(10, y++, '1', 'Continue Journey', () => {
            TravelMenu.resume();
        }, COLORS.GREEN, 'Resume your journey');
        
        UI.draw();
    },
    
    /**
     * Show consequences of attacking pirates
     */
    showAttackConsequences: function(gameState, encType) {
        UI.clear();
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== Attacking Criminals ===`, COLORS.GREEN);
        y += 2;
        
        // Apply reputation gain (attacking criminals is good)
        gameState.reputation += REPUTATION_EFFECT_ON_ATTACK_CRIMINALS;
        
        UI.addText(10, y++, `You attack the pirate vessels!`, COLORS.GREEN);
        y++;
        UI.addText(10, y++, `Reputation: +${REPUTATION_EFFECT_ON_ATTACK_CRIMINALS}`, COLORS.GREEN);
        y++;
        UI.addText(10, y++, `Fighting criminals improves your standing!`, COLORS.TEXT_NORMAL);
        
        const buttonY = grid.height - 4;
        UI.addButton(10, buttonY, '1', 'Continue to Combat', () => {
            EncounterMenu.show(gameState, encType);
        }, COLORS.GREEN);
        
        UI.draw();
    }
};
