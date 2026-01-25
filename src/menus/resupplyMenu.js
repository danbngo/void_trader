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
        UI.addTitleLineCentered(3, 'Ship Status');
        UI.addTextCentered(5, 'Some ships need attention before departure', COLORS.YELLOW);
        
        // Use ship table utility (without cargo column)
        const endY = ShipTableRenderer.addPlayerFleet(5, 8, null, gameState.ships, true);
        
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
        
        // Buttons in 3 columns
        const buttonY = grid.height - 7;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        if (allReady) {
            // All ships ready - show simple Depart button
            UI.addButton(leftX, buttonY, '1', 'Depart', () => {
                outputMessage = '';
                onDepart();
            }, COLORS.GREEN, 'Leave the station');
            
            UI.addButton(rightX, buttonY, '0', 'Cancel', () => {
                outputMessage = '';
                onReturn();
            }, COLORS.BUTTON, 'Return to dock');
        } else {
            // Ships need attention - show resupply options
            // Column 1: Refuel and Repair All / Depart, Refuel All, Repair All
            UI.addButton(leftX, buttonY, '1', 'Full Service', () => {
                refuelAndRepairAll(gameState, onReturn, onDepart);
            }, COLORS.GREEN, 'Refuel and repair all ships');
            
            UI.addButton(leftX, buttonY + 1, '2', 'Refuel Only', () => {
                refuelAll(gameState, onReturn, onDepart);
            }, COLORS.BUTTON, 'Refuel all ships to maximum');
            
            UI.addButton(leftX, buttonY + 2, '3', 'Repair Only', () => {
                repairAll(gameState, onReturn, onDepart);
            }, COLORS.BUTTON, 'Repair all ships to maximum');
            
            // Column 2: Depart Anyway
            UI.addButton(middleX, buttonY, '4', 'Depart Anyway', () => {
                outputMessage = '';
                onDepart();
            }, COLORS.TEXT_NORMAL, 'Leave without resupplying', COLORS.TEXT_ERROR);
            
            // Column 3: Cancel
            UI.addButton(rightX, buttonY, '0', 'Cancel', () => {
                outputMessage = '';
                onReturn();
            }, COLORS.BUTTON, 'Return to dock');
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
