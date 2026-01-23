/**
 * Resupply Menu
 * Shows ships needing repair/refuel and allows player to resupply or depart
 */

const ResupplyMenu = (() => {
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the resupply menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous menu
     * @param {Function} onDepart - Callback when player chooses to depart
     */
    function show(gameState, onReturn, onDepart) {
        render(gameState, onReturn, onDepart);
    }
    
    /**
     * Render the menu
     */
    function render(gameState, onReturn, onDepart) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Title
        UI.addTextCentered(3, 'Ship Status', COLORS.TITLE);
        UI.addTextCentered(5, 'Some ships need attention before departure', COLORS.YELLOW);
        
        // Use ship table utility (without cargo column)
        const endY = ShipTableRenderer.addPlayerFleet(5, 8, null, gameState.ships, false);
        
        // Calculate total costs
        let totalRefuelCost = 0;
        let totalRepairCost = 0;
        
        gameState.ships.forEach(ship => {
            const fuelNeeded = ship.maxFuel - ship.fuel;
            const hullDamage = ship.maxHull - ship.hull;
            const shieldDamage = ship.maxShields - ship.shields;
            totalRefuelCost += fuelNeeded * FUEL_COST_PER_UNIT;
            totalRepairCost += (hullDamage + shieldDamage) * HULL_REPAIR_COST_PER_UNIT;
        });
        
        // Display costs using renderKeyValueList
        let y = endY + 2;
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Total Refuel Cost:', value: `${totalRefuelCost} CR`, valueColor: totalRefuelCost > 0 ? COLORS.YELLOW : COLORS.TEXT_DIM },
            { label: 'Total Repair Cost:', value: `${totalRepairCost} CR`, valueColor: totalRepairCost > 0 ? COLORS.YELLOW : COLORS.TEXT_DIM }
        ]);
        
        // Check if all ships are ready
        const allRepaired = gameState.ships.every(ship => ship.hull >= ship.maxHull && ship.shields >= ship.maxShields);
        const allRefueled = gameState.ships.every(ship => ship.fuel >= ship.maxFuel);
        const allReady = allRepaired && allRefueled;
        
        // Buttons
        const buttonY = grid.height - 7;
        
        if (allReady) {
            // All ships ready - show simple Depart button
            UI.addCenteredButtons(buttonY, [
                { key: '1', label: 'Depart', callback: () => {
                    outputMessage = '';
                    onDepart();
                }, color: COLORS.GREEN, helpText: 'Leave the station' },
                { key: '0', label: 'Cancel', callback: () => {
                    outputMessage = '';
                    onReturn();
                }, color: COLORS.BUTTON, helpText: 'Return to dock' }
            ]);
        } else {
            // Ships need attention - show resupply options
            UI.addCenteredButtons(buttonY, [
                { key: '1', label: 'Refuel and Repair All', callback: () => {
                    refuelAndRepairAll(gameState, onReturn, onDepart);
                }, color: COLORS.GREEN, helpText: 'Refuel and repair all ships' },
                { key: '2', label: 'Refuel All', callback: () => {
                    refuelAll(gameState, onReturn, onDepart);
                }, color: COLORS.BUTTON, helpText: 'Refuel all ships to maximum' },
                { key: '3', label: 'Repair All', callback: () => {
                    repairAll(gameState, onReturn, onDepart);
                }, color: COLORS.BUTTON, helpText: 'Repair all ships to maximum' },
                { key: '4', label: 'Depart Anyway', callback: () => {
                    outputMessage = '';
                    onDepart();
                }, color: COLORS.TEXT_NORMAL, helpText: 'Leave without resupplying', keyColor: COLORS.TEXT_ERROR },
                { key: '0', label: 'Cancel', callback: () => {
                    outputMessage = '';
                    onReturn();
                }, color: COLORS.BUTTON, helpText: 'Return to dock' }
            ]);
        }
        
        // Set output message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Refuel and repair all ships
     */
    function refuelAndRepairAll(gameState, onReturn, onDepart) {
        const currentSystem = gameState.getCurrentSystem();
        let totalCost = 0;
        let anyRepaired = false;
        let anyRefueled = false;
        
        // Calculate costs
        gameState.ships.forEach(ship => {
            // Repair cost
            const hullDamage = ship.maxHull - ship.hull;
            const shieldDamage = ship.maxShields - ship.shields;
            const repairCost = (hullDamage + shieldDamage) * HULL_REPAIR_COST_PER_UNIT;
            if (repairCost > 0) anyRepaired = true;
            
            // Refuel cost
            const fuelNeeded = ship.maxFuel - ship.fuel;
            const refuelCost = fuelNeeded * FUEL_COST_PER_UNIT;
            if (fuelNeeded > 0) anyRefueled = true;
            
            totalCost += repairCost + refuelCost;
        });
        
        // Check if already done
        if (!anyRepaired && !anyRefueled) {
            outputMessage = 'All ships are already fully repaired and refueled';
            outputColor = COLORS.TEXT_DIM;
            render(gameState, onReturn, onDepart);
            return;
        }
        
        // Check if player has enough money
        if (gameState.credits < totalCost) {
            // Pity refuel - they take what the player has and refuel anyway (but no repair)
            gameState.ships.forEach(ship => {
                ship.fuel = ship.maxFuel;
            });
            
            gameState.credits = 0;
            
            outputMessage = `The mechanics take pity on you and refuel all ships for free (no repairs).`;
            outputColor = COLORS.CYAN;
            render(gameState, onReturn, onDepart);
            return;
        }
        
        // Apply repairs and refueling
        gameState.ships.forEach(ship => {
            ship.hull = ship.maxHull;
            ship.shields = ship.maxShields;
            ship.fuel = ship.maxFuel;
        });
        
        gameState.credits -= totalCost;
        
        outputMessage = `Refueled and repaired all ships for ${totalCost} CR`;
        outputColor = COLORS.GREEN;
        render(gameState, onReturn, onDepart);
    }
    
    /**
     * Refuel all ships
     */
    function refuelAll(gameState, onReturn, onDepart) {
        const currentSystem = gameState.getCurrentSystem();
        let totalCost = 0;
        let anyRefueled = false;
        
        // Calculate costs
        gameState.ships.forEach(ship => {
            const fuelNeeded = ship.maxFuel - ship.fuel;
            if (fuelNeeded > 0) {
                anyRefueled = true;
                totalCost += fuelNeeded * FUEL_COST_PER_UNIT;
            }
        });
        
        // Check if already done
        if (!anyRefueled) {
            outputMessage = 'All ships are already fully refueled';
            outputColor = COLORS.TEXT_DIM;
            render(gameState, onReturn, onDepart);
            return;
        }
        
        // Check if player has enough money
        if (gameState.credits < totalCost) {
            // Pity refuel - they take what the player has and refuel anyway
            gameState.ships.forEach(ship => {
                ship.fuel = ship.maxFuel;
            });
            
            gameState.credits = 0;
            
            outputMessage = `The mechanics take pity on you and refuel all ships for free.`;
            outputColor = COLORS.CYAN;
            render(gameState, onReturn, onDepart);
            return;
        }
        
        // Apply refueling
        gameState.ships.forEach(ship => {
            ship.fuel = ship.maxFuel;
        });
        
        gameState.credits -= totalCost;
        
        outputMessage = `Refueled all ships for ${totalCost} CR`;
        outputColor = COLORS.GREEN;
        render(gameState, onReturn, onDepart);
    }
    
    /**
     * Repair all ships
     */
    function repairAll(gameState, onReturn, onDepart) {
        const currentSystem = gameState.getCurrentSystem();
        let totalCost = 0;
        let anyRepaired = false;
        
        // Calculate costs
        gameState.ships.forEach(ship => {
            const hullDamage = ship.maxHull - ship.hull;
            const shieldDamage = ship.maxShields - ship.shields;
            const repairCost = (hullDamage + shieldDamage) * HULL_REPAIR_COST_PER_UNIT;
            if (repairCost > 0) {
                anyRepaired = true;
                totalCost += repairCost;
            }
        });
        
        // Check if already done
        if (!anyRepaired) {
            outputMessage = 'All ships are already fully repaired';
            outputColor = COLORS.TEXT_DIM;
            render(gameState, onReturn, onDepart);
            return;
        }
        
        // Check if player has enough money
        if (gameState.credits < totalCost) {
            outputMessage = `Insufficient funds. Need ${totalCost} CR (have ${gameState.credits} CR)`;
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn, onDepart);
            return;
        }
        
        // Apply repairs
        gameState.ships.forEach(ship => {
            ship.hull = ship.maxHull;
            ship.shields = ship.maxShields;
        });
        
        gameState.credits -= totalCost;
        
        outputMessage = `Repaired all ships for ${totalCost} CR`;
        outputColor = COLORS.GREEN;
        render(gameState, onReturn, onDepart);
    }
    
    return {
        show
    };
})();
