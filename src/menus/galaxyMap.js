/**
 * Galaxy Map Menu
 * Shows the star map and system information
 */

const GalaxyMap = (() => {
    let selectedIndex = 0;
    let nearbySystems = [];
    let mapViewRange = MAP_VIEW_RANGE; // Current zoom level
    let outputMessage = ''; // Output area message
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the galaxy map
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        UI.clear();
        UI.resetSelection();
        
        // Clear output message when showing fresh
        outputMessage = '';
        
        // Set up wheel zoom handler
        UI.setWheelZoomHandler((delta) => {
            if (delta > 0) {
                // Zoom out (PageDown / wheel down)
                mapViewRange = Math.min(MAX_MAP_VIEW_RANGE, mapViewRange * 1.5);
            } else {
                // Zoom in (PageUp / wheel up)
                mapViewRange = Math.max(MIN_MAP_VIEW_RANGE, mapViewRange / 1.5);
            }
            render(gameState);
        });
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        if (!currentSystem) {
            UI.addTextCentered(grid.height / 2, 'No current system', COLORS.TEXT_ERROR);
            return;
        }
        
        // Get nearby systems (all visible systems, not filtered by reachability)
        nearbySystems = gameState.getNearbySystems(mapViewRange);
        
        // Ensure we don't go out of bounds
        if (selectedIndex >= nearbySystems.length) {
            selectedIndex = Math.max(0, nearbySystems.length - 1);
        }
        
        // Draw map on left side (50% of width + 5)
        const mapWidth = GALAXY_MAP_WIDTH;
        const mapHeight = GALAXY_MAP_HEIGHT;
        
        drawMap(gameState, mapWidth, mapHeight);
        
        // Draw system info on right side
        drawSystemInfo(gameState, mapWidth + 2);
        
        // Draw buttons at bottom
        drawButtons(gameState, mapWidth + 2, mapHeight);
        
        UI.draw();
    }
    
    /**
     * Draw the star map
     */
    function drawMap(gameState, mapWidth, mapHeight) {
        const currentSystem = gameState.getCurrentSystem();
        
        // Draw border with double-line corners and single-line edges
        UI.addText(0, 0, '╔' + '═'.repeat(mapWidth - 2) + '╗', COLORS.GRAY);
        for (let y = 1; y < mapHeight - 1; y++) {
            UI.addText(0, y, '║', COLORS.GRAY);
            UI.addText(mapWidth - 1, y, '║', COLORS.GRAY);
        }
        UI.addText(0, mapHeight - 1, '╚' + '═'.repeat(mapWidth - 2) + '╝', COLORS.GRAY);
        
        // Title with date and zoom level
        UI.addText(2, 0, 'GALAXY MAP', COLORS.TITLE);
        
        // Format and display current date in center
        const dateStr = formatDate(gameState.date);
        const dateCenterX = Math.floor(mapWidth / 2) - Math.floor(dateStr.length / 2);
        UI.addText(dateCenterX, 0, dateStr, COLORS.TEXT_NORMAL);
        
        UI.addText(mapWidth - 12, 0, `Zoom: ${mapViewRange.toFixed(1)}`, COLORS.TEXT_DIM);
        
        // Calculate scale to fit systems in map
        const mapCenterX = Math.floor(mapWidth / 2);
        const mapCenterY = Math.floor(mapHeight / 2);
        const scale = Math.min((mapWidth - 4) / (mapViewRange * 2), (mapHeight - 4) / (mapViewRange * 2));
        
        // Draw current system (center)
        UI.addText(mapCenterX, mapCenterY, '@', COLORS.GREEN);
        
        // Use first ship for display purposes
        const activeShip = gameState.ships[0];
        
        // Store selected system screen coordinates for line drawing
        let selectedScreenX = null;
        let selectedScreenY = null;
        let selectedCanReach = false;
        
        // Draw nearby systems
        nearbySystems.forEach((item, index) => {
            const dx = item.system.x - currentSystem.x;
            const dy = item.system.y - currentSystem.y;
            
            const screenX = Math.floor(mapCenterX + dx * scale);
            const screenY = Math.floor(mapCenterY - dy * scale); // Negate Y because screen Y increases downward
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                const isSelected = index === selectedIndex;
                
                // Check if reachable and visited
                const systemIndex = gameState.systems.indexOf(item.system);
                const isVisited = gameState.visitedSystems.includes(systemIndex);
                const canReach = Ship.canFleetReach(gameState.ships, currentSystem.x, currentSystem.y, item.system.x, item.system.y);
                const hasQuest = gameState.systemsWithQuests.includes(systemIndex);
                
                // Determine symbol and color
                let symbol = isVisited ? '★' : '☆'; // Filled star for visited, unfilled for unvisited
                let color = COLORS.GRAY; // Unreachable default
                
                // Prioritize selection color over everything else
                if (isSelected) {
                    // Selected: yellow if reachable, red if not
                    color = canReach ? COLORS.YELLOW : COLORS.TEXT_ERROR;
                } else if (hasQuest) {
                    // Systems with quests are cyan (whether reachable or not)
                    color = COLORS.CYAN;
                } else if (canReach) {
                    // Reachable systems are white
                    color = COLORS.TEXT_NORMAL;
                }
                
                // Only draw if not overlapping current system
                if (screenX !== mapCenterX || screenY !== mapCenterY) {
                    UI.addText(screenX, screenY, symbol, color, 0.7); // Render stars at 70% size
                    
                    // Register as clickable
                    UI.registerTableRow(screenX, screenY, 1, index, (rowIndex) => {
                        selectedIndex = rowIndex;
                        render(gameState);
                    });
                    
                    // Store selected system coordinates
                    if (isSelected) {
                        selectedScreenX = screenX;
                        selectedScreenY = screenY;
                        selectedCanReach = canReach;
                    }
                }
            }
        });
        
        // Draw line between current and selected system
        if (selectedScreenX !== null && selectedScreenY !== null) {
            const lineColor = selectedCanReach ? COLORS.YELLOW : COLORS.TEXT_ERROR;
            const linePoints = LineDrawer.drawLine(
                mapCenterX, mapCenterY,
                selectedScreenX, selectedScreenY,
                false, // Don't include endpoints (they have their own symbols)
                lineColor
            );
            
            // Draw each line point
            linePoints.forEach(point => {
                // Only draw if within map bounds and not overlapping a system
                if (point.x > 0 && point.x < mapWidth - 1 && 
                    point.y > 0 && point.y < mapHeight - 1) {
                    UI.addText(point.x, point.y, point.symbol, point.color);
                }
            });
        }
    }
    
    /**
     * Draw system information panel
     */
    function drawSystemInfo(gameState, startX) {
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Merged Fleet Info section
        UI.addText(startX, 0, '=== Fleet Info ===', COLORS.TITLE);
        
        // Calculate fleet totals
        const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
        const totalMaxFuel = gameState.ships.reduce((sum, ship) => sum + ship.maxFuel, 0);
        const totalHull = gameState.ships.reduce((sum, ship) => sum + ship.hull, 0);
        const totalMaxHull = gameState.ships.reduce((sum, ship) => sum + ship.maxHull, 0);
        const numShips = gameState.ships.length;
        
        let y = 2;
        UI.addText(startX, y++, 'Sys.:', COLORS.TEXT_DIM);
        UI.addText(startX + 6, y - 1, currentSystem.name, COLORS.TEXT_NORMAL);
        UI.addText(startX, y++, 'Coords:', COLORS.TEXT_DIM);
        UI.addText(startX + 8, y - 1, `(${currentSystem.x}, ${currentSystem.y})`, COLORS.TEXT_NORMAL);
        UI.addText(startX, y++, 'Ships:', COLORS.TEXT_DIM);
        UI.addText(startX + 7, y - 1, String(numShips), COLORS.TEXT_NORMAL);
        UI.addText(startX, y++, 'Fuel Cost Mult.:', COLORS.TEXT_DIM);
        UI.addText(startX + 17, y - 1, `${numShips}x`, COLORS.TEXT_NORMAL);
        UI.addText(startX, y++, 'Fuel:', COLORS.TEXT_DIM);
        const fuelRatio = totalFuel / totalMaxFuel;
        UI.addText(startX + 6, y - 1, `${totalFuel}/${totalMaxFuel}`, UI.calcStatColor(fuelRatio, true));
        UI.addText(startX, y++, 'Hull:', COLORS.TEXT_DIM);
        const hullRatio = totalHull / totalMaxHull;
        UI.addText(startX + 6, y - 1, `${totalHull}/${totalMaxHull}`, UI.calcStatColor(hullRatio, true));
        
        y++; // Empty row
        
        // Selected nearby system info
        if (nearbySystems.length > 0 && selectedIndex < nearbySystems.length) {
            const selected = nearbySystems[selectedIndex];
            const fuelCost = Ship.calculateFleetFuelCost(selected.distance, gameState.ships.length);
            const canReach = Ship.canFleetReach(gameState.ships, currentSystem.x, currentSystem.y, selected.system.x, selected.system.y);
            
            UI.addText(startX, y++, '=== Target System ===', COLORS.YELLOW);
            y++; // Empty row
            UI.addText(startX, y++, 'Name:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, y - 1, selected.system.name, COLORS.TEXT_NORMAL);
            
            UI.addText(startX, y++, 'Coords:', COLORS.TEXT_DIM);
            UI.addText(startX + 8, y - 1, `(${selected.system.x}, ${selected.system.y})`, COLORS.TEXT_NORMAL);
            
            UI.addText(startX, y++, 'Distance:', COLORS.TEXT_DIM);
            UI.addText(startX + 10, y - 1, `${selected.distance.toFixed(1)} LY`, COLORS.TEXT_NORMAL);
            
            UI.addText(startX, y++, 'Fuel Cost:', COLORS.TEXT_DIM);
            UI.addText(startX + 11, y - 1, `${fuelCost}`, COLORS.TEXT_NORMAL);
            
            UI.addText(startX, y++, 'Reachable:', COLORS.TEXT_DIM);
            UI.addText(startX + 11, y - 1, canReach ? 'Yes' : 'No', canReach ? COLORS.GREEN : COLORS.TEXT_ERROR);
            
            // Has Quest
            const systemIndex = gameState.systems.indexOf(selected.system);
            const hasQuest = gameState.systemsWithQuests.includes(systemIndex);
            UI.addText(startX, y++, 'Has Quest:', COLORS.TEXT_DIM);
            UI.addText(startX + 11, y - 1, hasQuest ? 'Yes' : 'No', hasQuest ? COLORS.CYAN : COLORS.GRAY);
            
            // Visited
            const isVisited = gameState.visitedSystems.includes(systemIndex);
            UI.addText(startX, y++, 'Visited:', COLORS.TEXT_DIM);
            UI.addText(startX + 9, y - 1, isVisited ? 'Yes' : 'No', isVisited ? COLORS.TEXT_NORMAL : COLORS.GRAY);
            
            UI.addText(startX, y++, 'Pop:', COLORS.TEXT_DIM);
            UI.addText(startX + 5, y - 1, `${selected.system.population}M`, COLORS.TEXT_NORMAL);
            
            UI.addText(startX, y++, 'Economy:', COLORS.TEXT_DIM);
            UI.addText(startX + 9, y - 1, selected.system.economy, COLORS.TEXT_NORMAL);
        } else {
            UI.addText(startX, y, 'No nearby systems', COLORS.TEXT_DIM);
        }
    }
    
    /**
     * Render the galaxy map without resetting button selection
     */
    function render(gameState) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        if (!currentSystem) {
            return;
        }
        
        // Get nearby systems
        const oldNearbySystems = nearbySystems;
        nearbySystems = gameState.getNearbySystems(mapViewRange);
        
        // Check if selected system is still visible after zoom
        if (oldNearbySystems.length > 0 && selectedIndex < oldNearbySystems.length) {
            const previouslySelected = oldNearbySystems[selectedIndex].system;
            const stillVisible = nearbySystems.find(item => item.system === previouslySelected);
            
            if (!stillVisible) {
                // Selected system went off screen, reset to first
                selectedIndex = 0;
            } else {
                // Update selectedIndex to match new position
                selectedIndex = nearbySystems.findIndex(item => item.system === previouslySelected);
            }
        }
        
        // Ensure we don't go out of bounds
        if (selectedIndex >= nearbySystems.length) {
            selectedIndex = Math.max(0, nearbySystems.length - 1);
        }
        
        // Draw map on left side (50% of width + 5)
        const mapWidth = GALAXY_MAP_WIDTH;
        const mapHeight = GALAXY_MAP_HEIGHT;

        drawMap(gameState, mapWidth, mapHeight);
        
        // Draw system info on right side
        drawSystemInfo(gameState, mapWidth + 2);
        
        // Draw buttons at bottom
        drawButtons(gameState, mapWidth + 2, mapHeight);
        
        // Debug: Log all registered texts to see what's happening
        console.log('=== Registered UI Elements Before Draw ===');
        console.log('Map dimensions:', { mapWidth, mapHeight });
        console.log('Looking for legend at row:', mapHeight);
        UI.debugRegisteredTexts();
        
        UI.draw();
    }
    
    /**
     * Get travel recommendation for galaxy map
     * Focuses on where to travel next based on trade opportunities
     * @param {GameState} gameState - Current game state
     * @returns {Object|null} Travel recommendation or null
     */
    function getTravelRecommendation(gameState) {
        const currentSystem = gameState.getCurrentSystem();
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const enabledCargoIds = gameState.enabledCargoTypes.map(ct => ct.id);
        
        let bestSellProfit = -Infinity;
        let bestSellRecommendation = null;
        let bestBuyDiscount = 0;
        let bestBuyRecommendation = null;
        
        // Check all reachable systems
        for (let i = 0; i < gameState.systems.length; i++) {
            if (i === gameState.currentSystemIndex) continue;
            
            const targetSystem = gameState.systems[i];
            const distance = currentSystem.distanceTo(targetSystem);
            const fuelCost = Ship.calculateFleetFuelCost(distance, gameState.ships.length);
            const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
            
            // Only consider reachable systems
            if (totalFuel < fuelCost) continue;
            
            // Priority 1: Check if player can sell cargo for profit (sell price > base value)
            for (const cargoType of ALL_CARGO_TYPES) {
                if (!enabledCargoIds.includes(cargoType.id)) continue;
                
                const playerQuantity = fleetCargo[cargoType.id] || 0;
                if (playerQuantity <= 0) continue;
                
                // Calculate sell price at target system
                const targetBasePrice = cargoType.baseValue * targetSystem.cargoPriceModifier[cargoType.id];
                const targetSellPrice = Math.floor(targetBasePrice / (1 + targetSystem.fees));
                
                // Check if selling at target is profitable (above base value)
                const profitPerUnit = targetSellPrice - cargoType.baseValue;
                
                if (profitPerUnit > bestSellProfit) {
                    bestSellProfit = profitPerUnit;
                    bestSellRecommendation = {
                        type: 'sell',
                        targetSystem: targetSystem,
                        cargoType: cargoType,
                        profitPerUnit: profitPerUnit,
                        quantity: playerQuantity
                    };
                }
            }
            
            // Priority 2: Check for good buy prices (cheaper than base value)
            for (const cargoType of ALL_CARGO_TYPES) {
                if (!enabledCargoIds.includes(cargoType.id)) continue;
                
                // Calculate buy price at target system
                const targetBasePrice = cargoType.baseValue * targetSystem.cargoPriceModifier[cargoType.id];
                const targetBuyPrice = Math.floor(targetBasePrice * (1 + targetSystem.fees));
                
                // Check if stock is available
                const stock = targetSystem.cargoStock[cargoType.id];
                if (stock <= 0) continue;
                
                // Calculate discount percentage compared to base value
                const discountPercent = ((cargoType.baseValue - targetBuyPrice) / cargoType.baseValue) * 100;
                
                if (discountPercent > bestBuyDiscount) {
                    bestBuyDiscount = discountPercent;
                    bestBuyRecommendation = {
                        type: 'buy',
                        targetSystem: targetSystem,
                        cargoType: cargoType,
                        discountPercent: Math.floor(discountPercent)
                    };
                }
            }
        }
        
        // Return best sell recommendation first
        if (bestSellRecommendation && bestSellProfit > 0) {
            return bestSellRecommendation;
        }
        
        // Return best buy recommendation if discount is positive
        if (bestBuyRecommendation && bestBuyDiscount > 0) {
            return bestBuyRecommendation;
        }
        
        return null;
    }
    
    /**
     * Draw navigation buttons
     */
    function drawButtons(gameState, startX, mapHeight) {
        const grid = UI.getGridSize();
        const buttonY = grid.height - 3;
        
        // Legend positioned right after map border
        UI.addText(2, mapHeight, '@ = You  ★ = Visited  ☆ = Unvisited', COLORS.GRAY);
        
        // Travel recommendation - positioned in the middle of empty space
        const recommendationY = mapHeight + 2;
        const recommendation = getTravelRecommendation(gameState);
        
        if (recommendation) {
            if (recommendation.type === 'sell') {
                // "Travel to x to sell y (z profit/unit)"
                UI.addText(5, recommendationY, 'Travel to ', COLORS.TEXT_DIM);
                let xOffset = 5 + 'Travel to '.length;
                UI.addText(xOffset, recommendationY, recommendation.targetSystem.name, COLORS.TEXT_NORMAL);
                xOffset += recommendation.targetSystem.name.length;
                UI.addText(xOffset, recommendationY, ' to sell ', COLORS.TEXT_DIM);
                xOffset += ' to sell '.length;
                UI.addText(xOffset, recommendationY, recommendation.cargoType.name, recommendation.cargoType.color);
                xOffset += recommendation.cargoType.name.length;
                UI.addText(xOffset, recommendationY, ` (+${recommendation.profitPerUnit} profit/unit)`, COLORS.GREEN);
            } else if (recommendation.type === 'buy') {
                // "Travel to x to buy y (z% cheaper than average)"
                UI.addText(5, recommendationY, 'Travel to ', COLORS.TEXT_DIM);
                let xOffset = 5 + 'Travel to '.length;
                UI.addText(xOffset, recommendationY, recommendation.targetSystem.name, COLORS.TEXT_NORMAL);
                xOffset += recommendation.targetSystem.name.length;
                UI.addText(xOffset, recommendationY, ' to buy ', COLORS.TEXT_DIM);
                xOffset += ' to buy '.length;
                UI.addText(xOffset, recommendationY, recommendation.cargoType.name, recommendation.cargoType.color);
                xOffset += recommendation.cargoType.name.length;
                UI.addText(xOffset, recommendationY, ` (${recommendation.discountPercent}% cheaper than average)`, COLORS.GREEN);
            }
        } else {
            UI.addText(5, recommendationY, 'No recommendation available, try traveling to another system', COLORS.TEXT_DIM);
        }
        
        // 3-column layout
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // First column: Previous System, Next System, Scan System
        UI.addButton(leftX, buttonY, '1', 'Previous System', () => {
            if (nearbySystems.length > 0) {
                selectedIndex = (selectedIndex - 1 + nearbySystems.length) % nearbySystems.length;
                outputMessage = ''; // Clear error messages when navigating
                render(gameState);
            }
        }, COLORS.BUTTON, 'Select the previous system in the list');
        
        UI.addButton(leftX, buttonY + 1, '2', 'Next System', () => {
            if (nearbySystems.length > 0) {
                selectedIndex = (selectedIndex + 1) % nearbySystems.length;
                outputMessage = ''; // Clear error messages when navigating
                render(gameState);
            }
        }, COLORS.BUTTON, 'Select the next system in the list');
        
        UI.addButton(leftX, buttonY + 2, '3', 'Scan System', () => {
            if (nearbySystems.length > 0 && selectedIndex < nearbySystems.length) {
                const selectedSystem = nearbySystems[selectedIndex].system;
                outputMessage = '';
                ScanSystemMenu.show(selectedSystem, () => show(gameState));
            }
        }, COLORS.BUTTON, 'View detailed information about the selected system');
        
        // Second column: Travel, Zoom In, Zoom Out
        // Travel button - calculate if travel is possible before using
        let canTravel = false;
        let travelHelpText = 'Begin travel to the selected system';
        
        if (nearbySystems.length > 0 && selectedIndex < nearbySystems.length) {
            const targetSystem = nearbySystems[selectedIndex].system;
            const currentSystem = gameState.getCurrentSystem();
            const distance = currentSystem.distanceTo(targetSystem);
            const fuelCost = Ship.calculateFleetFuelCost(distance, gameState.ships.length);
            const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
            
            canTravel = totalFuel >= fuelCost;
            if (!canTravel) {
                travelHelpText = `Insufficient fuel (need ${fuelCost}, have ${totalFuel})`;
            }
        }
        
        const travelColor = canTravel ? COLORS.GREEN : COLORS.TEXT_DIM;
        
        UI.addButton(middleX, buttonY, '4', 'Travel', () => {
            if (nearbySystems.length > 0 && selectedIndex < nearbySystems.length) {
                // Check if retirement time has passed (50 years)
                if (gameState.hasRetirementTimePassed()) {
                    outputMessage = '50 years have passed. Time for retirement!';
                    outputColor = COLORS.TEXT_ERROR;
                    render(gameState);
                    const score = ScoreMenu.calculateScore(gameState);
                    ScoreMenu.showGameOver(gameState, score.totalScore, false);
                    return;
                }
                
                const targetSystem = nearbySystems[selectedIndex].system;
                const currentSystem = gameState.getCurrentSystem();
                const distance = currentSystem.distanceTo(targetSystem);
                const fuelCost = Ship.calculateFleetFuelCost(distance, gameState.ships.length);
                const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
                
                if (totalFuel < fuelCost) {
                    outputMessage = `Insufficient fuel! Need ${fuelCost}, have ${totalFuel}`;
                    outputColor = COLORS.TEXT_ERROR;
                    render(gameState);
                } else {
                    outputMessage = '';
                    TravelConfirmMenu.show(gameState, targetSystem);
                }
            }
        }, travelColor, travelHelpText);

        UI.addButton(middleX, buttonY + 1, '5', 'Zoom In', () => {
            mapViewRange = Math.max(MIN_MAP_VIEW_RANGE, mapViewRange / 1.5);
            render(gameState);
        }, COLORS.BUTTON, 'Decrease map view range to see fewer, closer systems');
        
        UI.addButton(middleX, buttonY + 2, '6', 'Zoom Out', () => {
            mapViewRange = Math.min(MAX_MAP_VIEW_RANGE, mapViewRange * 1.5);
            render(gameState);
        }, COLORS.BUTTON, 'Increase map view range to see more distant systems');
        
        // Third column: Dock
        UI.addButton(rightX, buttonY, '0', 'Dock', () => DockMenu.show(gameState), COLORS.BUTTON, 'Return to the docking menu');
        
        // Set output message in UI output row system if there's a message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
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
        show,
        render
    };
})();
