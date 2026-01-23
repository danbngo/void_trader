/**
 * Travel Confirmation Menu
 * Shows journey details and confirms travel to selected system
 */

const TravelConfirmMenu = (() => {
    /**
     * Show the travel confirmation menu
     * @param {GameState} gameState - Current game state
     * @param {StarSystem} targetSystem - Target star system
     */
    function show(gameState, targetSystem) {
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Calculate journey details
        const distance = currentSystem.distanceTo(targetSystem);
        const fuelCost = Ship.calculateFleetFuelCost(distance, gameState.ships.length);
        const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
        const fuelAfter = totalFuel - fuelCost;
        const durationDays = Math.ceil(distance * AVERAGE_JOURNEY_DAYS_PER_LY);
        
        // Calculate date after journey
        const dateAfter = new Date(gameState.date);
        dateAfter.setDate(dateAfter.getDate() + durationDays);
        
        // Check if target system is visited
        const targetSystemIndex = gameState.systems.indexOf(targetSystem);
        const isVisited = gameState.visitedSystems.includes(targetSystemIndex);
        
        // Calculate encounter weight ranges along journey
        let pirateWeightRange = '?';
        let policeWeightRange = '?';
        let merchantWeightRange = '?';
        
        if (isVisited) {
            // Show range between current and target system
            const minPirate = Math.min(currentSystem.pirateWeight, targetSystem.pirateWeight).toFixed(1);
            const maxPirate = Math.max(currentSystem.pirateWeight, targetSystem.pirateWeight).toFixed(1);
            pirateWeightRange = `${minPirate} - ${maxPirate}`;
            
            const minPolice = Math.min(currentSystem.policeWeight, targetSystem.policeWeight).toFixed(1);
            const maxPolice = Math.max(currentSystem.policeWeight, targetSystem.policeWeight).toFixed(1);
            policeWeightRange = `${minPolice} - ${maxPolice}`;
            
            const minMerchant = Math.min(currentSystem.merchantWeight, targetSystem.merchantWeight).toFixed(1);
            const maxMerchant = Math.max(currentSystem.merchantWeight, targetSystem.merchantWeight).toFixed(1);
            merchantWeightRange = `${minMerchant} - ${maxMerchant}`;
        } else {
            // Only know current system weights
            pirateWeightRange = `${currentSystem.pirateWeight.toFixed(1)} - ?`;
            policeWeightRange = `${currentSystem.policeWeight.toFixed(1)} - ?`;
            merchantWeightRange = `${currentSystem.merchantWeight.toFixed(1)} - ?`;
        }
        
        // Draw title
        UI.addTextCentered(2, 'Travel Confirmation', COLORS.TITLE);
        
        let y = 6;
        
        // Journey details section
        UI.addText(5, y++, '=== Journey Details ===', COLORS.TITLE);
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'From:', value: currentSystem.name, valueColor: COLORS.TEXT_NORMAL },
            { label: 'To:', value: targetSystem.name, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Distance:', value: `${distance.toFixed(1)} LY`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Fuel Cost:', value: `${fuelCost} / ${totalFuel}`, valueColor: fuelAfter >= 0 ? COLORS.TEXT_NORMAL : COLORS.TEXT_ERROR },
            { label: 'Fuel After:', value: String(fuelAfter), valueColor: fuelAfter >= 0 ? COLORS.TEXT_NORMAL : COLORS.TEXT_ERROR },
            { label: 'Duration:', value: `${durationDays} days`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Current Date:', value: formatDate(gameState.date), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Arrival Date:', value: formatDate(dateAfter), valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;
        
        // Encounter weights section
        UI.addText(5, y++, '=== Encounter Probability ===', COLORS.TITLE);
        
        // Calculate average weights for color coding
        const avgPirateWeight = (currentSystem.pirateWeight + (isVisited ? targetSystem.pirateWeight : currentSystem.pirateWeight)) / 2;
        const avgPoliceWeight = (currentSystem.policeWeight + (isVisited ? targetSystem.policeWeight : currentSystem.policeWeight)) / 2;
        const avgMerchantWeight = (currentSystem.merchantWeight + (isVisited ? targetSystem.merchantWeight : currentSystem.merchantWeight)) / 2;
        
        // Pirates: 2x weight = 0.5x ratio (bad), Police/Merchants: 2x weight = 2x ratio (good)
        const pirateColor = UI.calcStatColor(1 / Math.max(0.5, avgPirateWeight));
        const policeColor = COLORS.WHITE // UI.calcStatColor(avgPoliceWeight); //police dont actually do anything good for the player per-se
        const merchantColor = UI.calcStatColor(avgMerchantWeight);
        
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Pirates:', value: pirateWeightRange, valueColor: pirateColor },
            { label: 'Police:', value: policeWeightRange, valueColor: policeColor },
            { label: 'Merchants:', value: merchantWeightRange, valueColor: merchantColor }
        ]);
        y++;
        
        if (!isVisited) {
            UI.addText(5, y++, 'Target system unvisited - exact encounter', COLORS.YELLOW);
            UI.addText(5, y++, 'rates unknown until arrival.', COLORS.YELLOW);
            y++;
        }
        
        // Warnings
        if (fuelAfter < 0) {
            UI.addText(5, y++, 'WARNING: Insufficient fuel for journey!', COLORS.TEXT_ERROR);
            y++;
        }
        
        // Buttons - centered at bottom
        const buttonY = grid.height - 5;
        const buttonX = Math.floor((grid.width - '[0] Cancel'.length) / 2);
        
        if (fuelAfter >= 0) {
            UI.addButton(buttonX, buttonY, '1', 'Launch', () => {
                TravelMenu.show(gameState, targetSystem);
            }, COLORS.GREEN);
        }
        
        UI.addButton(buttonX, buttonY + 1, '0', 'Cancel', () => {
            GalaxyMap.show(gameState);
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Format date for display
     * @param {Date} date 
     * @returns {string}
     */
    function formatDate(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    
    return {
        show
    };
})();
