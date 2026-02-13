/**
 * Trade Recommendations Menu
 * Shows best trade opportunities for different cargo types across planets in current system
 */

const TradeRecommendationsMenu = (() => {
    let returnCallback = null;
    let currentGameState = null;
    let selectedCargoIndex = 0;
    let currentPage = 0;
    const PLANETS_PER_PAGE = 10;
    
    /**
     * Show the trade recommendations menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        returnCallback = onReturn;
        currentGameState = gameState;
        
        // Mark recommendation as seen when player visits this screen
        gameState.recommendationSeen = true;
        
        // Find first enabled cargo type
        const enabledCargoIds = gameState.enabledCargoTypes.map(ct => ct.id);
        selectedCargoIndex = ALL_CARGO_TYPES.findIndex(ct => enabledCargoIds.includes(ct.id));
        if (selectedCargoIndex === -1) selectedCargoIndex = 0; // Fallback
        
        currentPage = 0;
        
        UI.clear();
        UI.resetSelection();
        render();
    }
    
    /**
     * Render the trade recommendations screen
     */
    function render() {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = currentGameState.getCurrentSystem();
        const selectedCargoType = ALL_CARGO_TYPES[selectedCargoIndex];
        
        // Title
        UI.addTitleLineCentered(0, 'Trade Recommendations');

        if (!selectedCargoType) {
            UI.addTextCentered(4, 'No cargo types available.', COLORS.TEXT_DIM);
            UI.addTextCentered(6, 'Unlock cargo perks to view trade recommendations.', COLORS.TEXT_DIM);
            UI.addButton(25, grid.height - 3, '0', 'Back', () => { if (returnCallback) returnCallback(); }, COLORS.BUTTON);
            UI.draw();
            return;
        }
        
        // Cargo type info
        let y = 2;
        const fleetCargo = Ship.getFleetCargo(currentGameState.ships);
        const playerQuantity = fleetCargo[selectedCargoType.id] || 0;
        const totalCargoCapacity = Ship.getFleetCargoCapacity(currentGameState.ships);
        
        // Calculate stock ratio: 1.0 at 0 stock, 4.0 at full capacity
        const stockRatio = totalCargoCapacity > 0 
            ? 1.0 + (playerQuantity / totalCargoCapacity) * 3.0 
            : 1.0;
        const stockColor = UI.calcStatColor(stockRatio);
        
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Cargo Type:', value: selectedCargoType.name, valueColor: selectedCargoType.color },
            { label: 'Your Stock:', value: String(playerQuantity), valueColor: stockColor },
            { label: 'Base Value:', value: `${selectedCargoType.baseValue} CR`, valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;
        
        // Get planets in current system
        const reachablePlanets = getReachablePlanets();
        
        if (reachablePlanets.length === 0) {
            UI.addTextCentered(y + 2, 'No planets found in this system!', COLORS.TEXT_ERROR);
        } else {
            // Pagination
            const totalPages = Math.ceil(reachablePlanets.length / PLANETS_PER_PAGE);
            const startIdx = currentPage * PLANETS_PER_PAGE;
            const endIdx = Math.min(startIdx + PLANETS_PER_PAGE, reachablePlanets.length);
            const pageData = reachablePlanets.slice(startIdx, endIdx);
            
            // Display page info if there are multiple pages
            if (totalPages > 1) {
                UI.addText(5, y++, `Page ${currentPage + 1} of ${totalPages}`, COLORS.TEXT_DIM);
                y++;
            }
            
            // Table header
            const headers = ['Planet', 'Visited', 'Stock', 'Buy $', 'Sell $'];
            const rows = pageData.map(planetData => {
                const isVisited = currentGameState.visitedPlanets.includes(planetData.planet.id);
                
                const buyPrice = planetData.buyPrice;
                const sellPrice = planetData.sellPrice;
                const stock = planetData.stock;
                
                // Show ? for unvisited planets
                if (!isVisited) {
                    return [
                        { text: planetData.planet.name, color: COLORS.TEXT_NORMAL },
                        { text: 'No', color: COLORS.TEXT_DIM },
                        { text: '?', color: COLORS.TEXT_DIM },
                        { text: '?', color: COLORS.TEXT_DIM },
                        { text: '?', color: COLORS.TEXT_DIM }
                    ];
                }
                
                // Calculate ratios for color coding (same as market menu)
                const buyRatio = selectedCargoType.baseValue / buyPrice; // Lower buy price = higher ratio = better
                const sellRatio = sellPrice / selectedCargoType.baseValue; // Higher sell price = higher ratio = better
                
                const buyColor = UI.calcStatColor(buyRatio);
                const sellColor = UI.calcStatColor(sellRatio);
                const stockColor = stock > 0 ? COLORS.TEXT_NORMAL : COLORS.TEXT_DIM;
                
                return [
                    { text: planetData.planet.name, color: COLORS.TEXT_NORMAL },
                    { text: 'Yes', color: COLORS.GREEN },
                    { text: String(stock), color: stockColor },
                    { text: String(buyPrice), color: buyColor },
                    { text: String(sellPrice), color: sellColor }
                ];
            });
            
            TableRenderer.renderTable(5, y, headers, rows, -1, 1);
            y += rows.length + 3; // Move past the table
            
            // Add trade recommendation
            const recommendation = getBestTradeRecommendation();
            if (recommendation) {
                UI.addText(5, y, 'Recommendation: ', COLORS.TEXT_DIM);
                let xOffset = 5 + 'Recommendation: '.length;
                
                if (recommendation.type === 'sell') {
                    UI.addText(xOffset, y, `Sell all ${recommendation.quantity} `, COLORS.TEXT_NORMAL);
                    xOffset += `Sell all ${recommendation.quantity} `.length;
                    UI.addText(xOffset, y, recommendation.cargoName, recommendation.cargoColor);
                    xOffset += recommendation.cargoName.length;
                    UI.addText(xOffset, y, ` here `, COLORS.TEXT_NORMAL);
                    xOffset += ' here '.length;
                    UI.addText(xOffset, y, `(+${recommendation.profitPerUnit} profit/unit)`, COLORS.GREEN);
                } else {
                    UI.addText(xOffset, y, 'Buy ', COLORS.TEXT_NORMAL);
                    xOffset += 'Buy '.length;
                    UI.addText(xOffset, y, recommendation.cargoName, recommendation.cargoColor);
                    xOffset += recommendation.cargoName.length;
                    UI.addText(xOffset, y, ` here and sell at ${recommendation.targetPlanet.name} `, COLORS.TEXT_NORMAL);
                    xOffset += ` here and sell at ${recommendation.targetPlanet.name} `.length;
                    UI.addText(xOffset, y, `(+${recommendation.profitPerUnit} profit/unit)`, COLORS.GREEN);
                }
                y++;
            } else {
                y = TableRenderer.renderKeyValueList(5, y, [
                    { label: 'Recommendation:', value: 'No profitable trades available', valueColor: COLORS.TEXT_DIM }
                ]);
            }
        }
        
        // Buttons
        const buttonY = grid.height - 6;
        UI.addButton(5, buttonY, '1', 'Next Cargo', nextCargo, COLORS.BUTTON, 'View next cargo type');
        UI.addButton(5, buttonY + 1, '2', 'Prev Cargo', prevCargo, COLORS.BUTTON, 'View previous cargo type');
        
        // Pagination buttons
        if (reachablePlanets.length > PLANETS_PER_PAGE) {
            const totalPages = Math.ceil(reachablePlanets.length / PLANETS_PER_PAGE);
            const canNextPage = currentPage < totalPages - 1;
            const canPrevPage = currentPage > 0;
            
            const nextPageColor = canNextPage ? COLORS.BUTTON : COLORS.TEXT_DIM;
            const prevPageColor = canPrevPage ? COLORS.BUTTON : COLORS.TEXT_DIM;
            
            UI.addButton(25, buttonY, '8', 'Next Page', nextPage, nextPageColor, canNextPage ? 'View next page of planets' : 'Already on last page');
            UI.addButton(25, buttonY + 1, '9', 'Prev Page', prevPage, prevPageColor, canPrevPage ? 'View previous page of planets' : 'Already on first page');
        }
        
        UI.addButton(25, buttonY + 3, '0', 'Back', () => { if (returnCallback) returnCallback(); }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Get all planets in the current system with trade data
     * @returns {Array} Array of planet data objects
     */
    function getReachablePlanets() {
        const currentSystem = currentGameState.getCurrentSystem();
        const selectedCargoType = ALL_CARGO_TYPES[selectedCargoIndex];
        const reachablePlanets = [];
        
        if (!currentSystem || !currentSystem.planets) {
            return reachablePlanets;
        }
        
        // Get all planets in current system
        for (const planet of currentSystem.planets) {
            if (!planet) continue;
            
            // Calculate prices with fees
            const basePrice = selectedCargoType.baseValue * currentSystem.cargoPriceModifier[selectedCargoType.id];
            const buyPrice = Math.floor(basePrice * (1 + currentSystem.fees));
            const sellPrice = Math.floor(basePrice / (1 + currentSystem.fees));
            const stock = currentSystem.cargoStock[selectedCargoType.id];
            
            reachablePlanets.push({
                planet: planet,
                buyPrice: buyPrice,
                sellPrice: sellPrice,
                stock: stock
            });
        }
        
        return reachablePlanets;
    }
    
    /**
     * Get the best trade recommendation from current location
     * Prioritizes selling cargo the player already has where sell price > base value
     * Only considers visited planets in the current system
     * @returns {Object|null} Best trade opportunity or null if none found
     */
    function getBestTradeRecommendation() {
        const currentSystem = currentGameState.getCurrentSystem();
        const enabledCargoIds = currentGameState.enabledCargoTypes.map(ct => ct.id);
        const fleetCargo = Ship.getFleetCargo(currentGameState.ships);
        
        if (!currentSystem || !currentSystem.planets || currentSystem.planets.length === 0) {
            return null;
        }
        
        let bestSaleProfit = -Infinity;
        let bestSale = null;
        let bestBuyProfit = -Infinity;
        let bestBuy = null;
        
        // First priority: Check if player has any cargo to sell at current location above base value
        for (const cargoType of ALL_CARGO_TYPES) {
            if (!enabledCargoIds.includes(cargoType.id)) continue;
            
            const playerQuantity = fleetCargo[cargoType.id] || 0;
            if (playerQuantity <= 0) continue; // Skip cargo player doesn't have
            
            // Calculate sell price at current system
            const currentBasePrice = cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id];
            const currentSellPrice = Math.floor(currentBasePrice / (1 + currentSystem.fees));
            
            // Check if selling here is profitable (above base value)
            const profitPerUnit = currentSellPrice - cargoType.baseValue;
            
            if (profitPerUnit > 0 && profitPerUnit > bestSaleProfit) {
                bestSaleProfit = profitPerUnit;
                const totalProfit = profitPerUnit * playerQuantity;
                bestSale = {
                    type: 'sell',
                    cargoType: cargoType,
                    quantity: playerQuantity,
                    sellPrice: currentSellPrice,
                    baseValue: cargoType.baseValue,
                    profitPerUnit: profitPerUnit,
                    totalProfit: totalProfit,
                    cargoName: cargoType.name,
                    cargoColor: cargoType.color,
                    text: `Sell all ${playerQuantity} ${cargoType.name} here (+${profitPerUnit} profit/unit)`
                };
            }
        }
        
        // If we have a profitable sale, return that as priority
        if (bestSale) {
            return bestSale;
        }
        
        // Second priority: Find best buy-and-sell opportunity (only among visited planets in current system)
        // Check each enabled cargo type
        for (const cargoType of ALL_CARGO_TYPES) {
            if (!enabledCargoIds.includes(cargoType.id)) continue;
            
            // Calculate buy price at current system
            const currentBasePrice = cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id];
            const currentBuyPrice = Math.floor(currentBasePrice * (1 + currentSystem.fees));
            
            // Check if there's stock available at current system
            const currentStock = currentSystem.cargoStock[cargoType.id];
            if (currentStock <= 0) continue;
            
            // Check all VISITED planets in current system for best sell price
            for (const targetPlanet of currentSystem.planets) {
                if (!targetPlanet) continue;
                
                // Only consider visited planets
                if (!currentGameState.visitedPlanets.includes(targetPlanet.id)) continue;
                
                // Calculate sell price at target planet
                const targetBasePrice = cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id];
                const targetSellPrice = Math.floor(targetBasePrice / (1 + currentSystem.fees));
                
                // Calculate profit
                const profit = targetSellPrice - currentBuyPrice;
                
                // Update best trade if this is better
                if (profit > bestBuyProfit) {
                    bestBuyProfit = profit;
                    bestBuy = {
                        type: 'buy',
                        cargoType: cargoType,
                        targetPlanet: targetPlanet,
                        buyPrice: currentBuyPrice,
                        sellPrice: targetSellPrice,
                        profitPerUnit: profit,
                        cargoName: cargoType.name,
                        cargoColor: cargoType.color,
                        text: `Buy ${cargoType.name} here and sell at ${targetPlanet.name} (+${profit} profit/unit)`
                    };
                }
            }
        }
        
        // Only return if profit is positive
        return (bestBuy && bestBuy.profitPerUnit > 0) ? bestBuy : null;
    }
    
    /**
     * Select next cargo type (only enabled ones)
     */
    function nextCargo() {
        const enabledCargoIds = currentGameState.enabledCargoTypes.map(ct => ct.id);
        let nextIndex = selectedCargoIndex;
        
        // Find next enabled cargo type
        do {
            nextIndex = (nextIndex + 1) % ALL_CARGO_TYPES.length;
        } while (!enabledCargoIds.includes(ALL_CARGO_TYPES[nextIndex].id) && nextIndex !== selectedCargoIndex);
        
        selectedCargoIndex = nextIndex;
        currentPage = 0; // Reset to first page when changing cargo
        render();
    }
    
    /**
     * Select previous cargo type (only enabled ones)
     */
    function prevCargo() {
        const enabledCargoIds = currentGameState.enabledCargoTypes.map(ct => ct.id);
        let prevIndex = selectedCargoIndex;
        
        // Find previous enabled cargo type
        do {
            prevIndex = (prevIndex - 1 + ALL_CARGO_TYPES.length) % ALL_CARGO_TYPES.length;
        } while (!enabledCargoIds.includes(ALL_CARGO_TYPES[prevIndex].id) && prevIndex !== selectedCargoIndex);
        
        selectedCargoIndex = prevIndex;
        currentPage = 0; // Reset to first page when changing cargo
        render();
    }
    
    /**
     * Go to next page
     */
    function nextPage() {
        const reachablePlanets = getReachablePlanets();
        const totalPages = Math.ceil(reachablePlanets.length / PLANETS_PER_PAGE);
        if (currentPage < totalPages - 1) {
            currentPage++;
            render();
        }
    }
    
    /**
     * Go to previous page
     */
    function prevPage() {
        if (currentPage > 0) {
            currentPage--;
            render();
        }
    }


    return {
        show,
        getBestTradeRecommendation: function(gameState) {
            // Set the game state temporarily for the function to work
            currentGameState = gameState;
            return getBestTradeRecommendation();
        }
    };
})();
