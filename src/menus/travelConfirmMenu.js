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
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        const activeShip = gameState.ship;
        
        // Calculate journey details
        const distance = currentSystem.distanceTo(targetSystem);
        const fuelCost = Math.ceil(distance);
        const fuelAfter = activeShip.fuel - fuelCost;
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
        
        let y = 5;
        
        // Journey details
        UI.addText(5, y++, `From: ${currentSystem.name}`, COLORS.TEXT_NORMAL);
        UI.addText(5, y++, `To: ${targetSystem.name}`, COLORS.TEXT_NORMAL);
        y++;
        
        UI.addText(5, y++, `Distance: ${distance.toFixed(1)} LY`, COLORS.TEXT_NORMAL);
        UI.addText(5, y++, `Fuel Cost: ${fuelCost}`, fuelAfter >= 0 ? COLORS.TEXT_NORMAL : COLORS.TEXT_ERROR);
        UI.addText(5, y++, `Fuel After: ${fuelAfter}`, fuelAfter >= 0 ? COLORS.TEXT_NORMAL : COLORS.TEXT_ERROR);
        y++;
        
        UI.addText(5, y++, `Duration: ${durationDays} days`, COLORS.TEXT_NORMAL);
        UI.addText(5, y++, `Current Date: ${formatDate(gameState.date)}`, COLORS.TEXT_DIM);
        UI.addText(5, y++, `Arrival Date: ${formatDate(dateAfter)}`, COLORS.TEXT_DIM);
        y++;
        
        // Encounter weights
        UI.addText(5, y++, '=== Encounter Probability ===', COLORS.TITLE);
        UI.addText(5, y++, `Pirates: ${pirateWeightRange}`, COLORS.TEXT_NORMAL);
        UI.addText(5, y++, `Police: ${policeWeightRange}`, COLORS.TEXT_NORMAL);
        UI.addText(5, y++, `Merchants: ${merchantWeightRange}`, COLORS.TEXT_NORMAL);
        y++;
        
        if (!isVisited) {
            UI.addText(5, y++, 'Target system unvisited - exact encounter', COLORS.TEXT_DIM);
            UI.addText(5, y++, 'rates unknown until arrival.', COLORS.TEXT_DIM);
            y++;
        }
        
        // Warnings
        if (fuelAfter < 0) {
            UI.addText(5, y++, 'WARNING: Insufficient fuel for journey!', COLORS.TEXT_ERROR);
            y++;
        }
        
        // Buttons
        const buttonY = grid.height - 5;
        
        if (fuelAfter >= 0) {
            UI.addButton(5, buttonY, '1', 'Launch', () => {
                TravelMenu.show(gameState, targetSystem);
            }, COLORS.GREEN);
        }
        
        UI.addButton(5, buttonY + 1, '0', 'Cancel', () => {
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
