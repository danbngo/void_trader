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
        
        // Build table data
        const startY = 8;
        const headers = ['Ship', 'Type', 'Hull', 'Shields', 'Fuel'];
        const rows = gameState.ships.map((ship) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const hullRatio = ship.hull / ship.maxHull;
            const shieldRatio = ship.shields / ship.maxShields;
            const fuelRatio = ship.fuel / ship.maxFuel;
            
            return [
                { text: ship.name, color: COLORS.TEXT_NORMAL },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.hull}/${ship.maxHull}`, color: UI.calcStatColor(hullRatio) },
                { text: `${ship.shields}/${ship.maxShields}`, color: UI.calcStatColor(shieldRatio) },
                { text: `${ship.fuel}/${ship.maxFuel}`, color: UI.calcStatColor(fuelRatio) }
            ];
        });
        
        // Render the table
        TableRenderer.renderTable(5, startY, headers, rows, -1, 2, null);
        
        // Check if all ships are ready
        const allRepaired = gameState.ships.every(ship => ship.hull >= ship.maxHull && ship.shields >= ship.maxShields);
        const allRefueled = gameState.ships.every(ship => ship.fuel >= ship.maxFuel);
        const allReady = allRepaired && allRefueled;
        
        // Buttons
        const buttonY = grid.height - 7;
        
        if (allReady) {
            // All ships ready - show simple Depart button
            UI.addButton(5, buttonY, '1', 'Depart', () => {
                outputMessage = '';
                onDepart();
            }, COLORS.GREEN, 'Leave the station');
        } else {
            // Ships need attention - show resupply options
            UI.addButton(5, buttonY, '1', 'Refuel and Repair All', () => {
                refuelAndRepairAll(gameState, onReturn, onDepart);
            }, COLORS.GREEN, 'Refuel and repair all ships');
            
            UI.addButton(5, buttonY + 1, '2', 'Refuel All', () => {
                refuelAll(gameState, onReturn, onDepart);
            }, COLORS.BUTTON, 'Refuel all ships to maximum');
            
            UI.addButton(5, buttonY + 2, '3', 'Repair All', () => {
                repairAll(gameState, onReturn, onDepart);
            }, COLORS.BUTTON, 'Repair all ships to maximum');
            
            UI.addButton(5, buttonY + 3, '4', 'Depart Anyway', () => {
                outputMessage = '';
                onDepart();
            }, COLORS.YELLOW, 'Leave without resupplying');
        }
        
        UI.addButton(5, buttonY + 4, '0', 'Cancel', () => {
            outputMessage = '';
            onReturn();
        }, COLORS.BUTTON, 'Return to dock');
        
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
            const repairCost = (hullDamage + shieldDamage) * currentSystem.repairCostPerPoint;
            if (repairCost > 0) anyRepaired = true;
            
            // Refuel cost
            const fuelNeeded = ship.maxFuel - ship.fuel;
            const refuelCost = fuelNeeded * currentSystem.fuelCostPerUnit;
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
            outputMessage = `Insufficient funds. Need ${totalCost} CR (have ${gameState.credits} CR)`;
            outputColor = COLORS.TEXT_ERROR;
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
                totalCost += fuelNeeded * currentSystem.fuelCostPerUnit;
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
            outputMessage = `Insufficient funds. Need ${totalCost} CR (have ${gameState.credits} CR)`;
            outputColor = COLORS.TEXT_ERROR;
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
            const repairCost = (hullDamage + shieldDamage) * currentSystem.repairCostPerPoint;
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
