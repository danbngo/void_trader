/**
 * Market Menu
 * Buy and sell cargo at the current system
 */

const MarketMenu = (() => {
    let gameState = null;
    let selectedCargoIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the market menu
     * @param {GameState} state - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(state, onReturn) {
        gameState = state;
        selectedCargoIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    /**
     * Render the market screen
     */
    function render(onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Title
        UI.addTitleLineCentered(3, `${currentSystem.name}: Market`);
        
        // Player info
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const totalCargo = Object.values(fleetCargo).reduce((sum, amt) => sum + amt, 0);
        const totalCapacity = gameState.ships.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
        TableRenderer.renderKeyValueList(5, 5, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Cargo:', value: `${totalCargo} / ${totalCapacity}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'System Fees:', value: `${(currentSystem.fees * 100).toFixed(1)}%`, valueColor: COLORS.TEXT_DIM }
        ]);
        
        // Use ALL cargo types (not just enabled ones)
        const allCargoTypes = ALL_CARGO_TYPES;
        
        // Ensure selectedCargoIndex is valid
        if (selectedCargoIndex >= allCargoTypes.length) {
            selectedCargoIndex = Math.max(0, allCargoTypes.length - 1);
        }
        
        // Get total fleet cargo capacity for stock ratio calculation
        const totalCargoCapacity = Ship.getFleetCargoCapacity(gameState.ships);
        
        // Apply barter skill to fees
        const playerOfficer = gameState.officers[0];
        const barterLevel = playerOfficer ? (playerOfficer.skills.barter || 0) : 0;
        const effectiveFees = SkillEffects.getModifiedFees(currentSystem.fees, barterLevel);
        
        // Market table
        let startY = 10;
        const rows = allCargoTypes.map((cargoType, index) => {
            const stock = currentSystem.cargoStock[cargoType.id];
            const basePrice = cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id];
            const buyPrice = Math.floor(basePrice * (1 + effectiveFees));
            const sellPrice = Math.floor(basePrice / (1 + effectiveFees));
            const playerQuantity = fleetCargo[cargoType.id] || 0;
            
            // Check if player has training for this cargo type
            const hasTraining = gameState.enabledCargoTypes.some(ct => ct.id === cargoType.id);
            
            // Calculate ratios for color coding
            const buyRatio = cargoType.baseValue / buyPrice; // Lower buy price = higher ratio = better
            const sellRatio = sellPrice / cargoType.baseValue; // Higher sell price = higher ratio = better
            
            // Calculate market stock ratio: stock * 4 / MAX_CARGO_AMOUNT_IN_MARKET
            let marketStockColor;
            if (stock === 0) {
                marketStockColor = COLORS.GRAY;
            } else if (hasTraining) {
                const marketStockRatio = (stock * 4) / MAX_CARGO_AMOUNT_IN_MARKET;
                marketStockColor = UI.calcStatColor(marketStockRatio);
            } else {
                marketStockColor = COLORS.TEXT_DIM;
            }
            
            // Calculate player stock ratio: 0 stock = 1.0, max capacity = 4.0
            const stockRatio = totalCargoCapacity > 0 
                ? 1.0 + (playerQuantity / totalCargoCapacity) * 3.0 
                : 1.0;
            
            const buyColor = hasTraining ? UI.calcStatColor(buyRatio) : COLORS.TEXT_DIM;
            const sellColor = hasTraining ? UI.calcStatColor(sellRatio) : COLORS.TEXT_DIM;
            const nameColor = hasTraining ? cargoType.color : COLORS.TEXT_DIM;
            const baseValueColor = hasTraining ? COLORS.WHITE : COLORS.TEXT_DIM;
            const playerQuantityColor = hasTraining ? UI.calcStatColor(stockRatio) : COLORS.TEXT_DIM;
            
            return [
                { text: cargoType.name, color: nameColor },
                { text: String(stock), color: marketStockColor },
                { text: String(cargoType.baseValue), color: baseValueColor },
                { text: `${buyPrice}`, color: buyColor },
                { text: `${sellPrice}`, color: sellColor },
                { text: String(playerQuantity), color: playerQuantityColor }
            ];
        });
        
        const tableEndY = TableRenderer.renderTable(5, startY, ['Cargo', 'Stock', 'Base Value', 'Buy Price', 'Sell Price', 'Your Stock'], rows, selectedCargoIndex, 2, (rowIndex) => {
            // Only select cargo types the player has training for
            const cargoType = allCargoTypes[rowIndex];
            const hasTraining = gameState.enabledCargoTypes.some(ct => ct.id === cargoType.id);
            if (hasTraining) {
                selectedCargoIndex = rowIndex;
                outputMessage = '';
                render(onReturn);
            }
        });
        
        // Show trade recommendation below the table
        const recommendation = TradeRecommendationsMenu.getBestTradeRecommendation(gameState);
        if (recommendation) {
            UI.addText(5, tableEndY + 1, 'Recommendation: ', COLORS.TEXT_DIM);
            let xOffset = 5 + 'Recommendation: '.length;
            
            if (recommendation.type === 'sell') {
                UI.addText(xOffset, tableEndY + 1, `Sell all ${recommendation.quantity} `, COLORS.TEXT_NORMAL);
                xOffset += `Sell all ${recommendation.quantity} `.length;
                UI.addText(xOffset, tableEndY + 1, recommendation.cargoName, recommendation.cargoColor);
                xOffset += recommendation.cargoName.length;
                UI.addText(xOffset, tableEndY + 1, ` here `, COLORS.TEXT_NORMAL);
                xOffset += ' here '.length;
                UI.addText(xOffset, tableEndY + 1, `(+${recommendation.profitPerUnit} profit/unit)`, COLORS.GREEN);
            } else {
                UI.addText(xOffset, tableEndY + 1, 'Buy ', COLORS.TEXT_NORMAL);
                xOffset += 'Buy '.length;
                UI.addText(xOffset, tableEndY + 1, recommendation.cargoName, recommendation.cargoColor);
                xOffset += recommendation.cargoName.length;
                UI.addText(xOffset, tableEndY + 1, ` here and sell at ${recommendation.targetSystem.name} `, COLORS.TEXT_NORMAL);
                xOffset += ` here and sell at ${recommendation.targetSystem.name} `.length;
                UI.addText(xOffset, tableEndY + 1, `(+${recommendation.profitPerUnit} profit/unit)`, COLORS.GREEN);
            }
        } else {
            TableRenderer.renderKeyValueList(5, tableEndY + 1, [
                { label: 'Recommendation:', value: 'No profitable trades available', valueColor: COLORS.TEXT_DIM }
            ]);
        }
        
        // Buttons - 3 column layout
        const buttonY = grid.height - 4;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Column 1: Previous Cargo, Next Cargo
        UI.addButton(leftX, buttonY, '1', 'Previous Cargo', () => prevCargo(onReturn), COLORS.BUTTON, 'Select previous cargo type');
        UI.addButton(leftX, buttonY + 1, '2', 'Next Cargo', () => nextCargo(onReturn), COLORS.BUTTON, 'Select next cargo type');
        
        // Get cargo info for selected type (use allCargoTypes from above)
        const selectedCargoType = allCargoTypes[selectedCargoIndex];
        const selectedBasePrice = selectedCargoType.baseValue * currentSystem.cargoPriceModifier[selectedCargoType.id];
        
        // Reuse already calculated effectiveFees from above
        const selectedBuyPrice = Math.floor(selectedBasePrice * (1 + effectiveFees));
        const selectedSellPrice = Math.floor(selectedBasePrice / (1 + effectiveFees));
        const marketStock = currentSystem.cargoStock[selectedCargoType.id];
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        const playerStock = fleetCargo[selectedCargoType.id] || 0;
        
        // Check if this cargo type is enabled (player has training for it)
        const hasTraining = gameState.enabledCargoTypes.some(ct => ct.id === selectedCargoType.id);
        
        // Build help text for buy buttons
        let buy1HelpText = `Purchase 1 unit for ${selectedBuyPrice} CR`;
        let buy10HelpText = `Purchase 10 units for ${selectedBuyPrice * 10} CR`;
        if (!hasTraining) {
            buy1HelpText = 'No training for this cargo type (visit Guild to learn)';
            buy10HelpText = 'No training for this cargo type (visit Guild to learn)';
        } else if (marketStock === 0) {
            buy1HelpText = 'No stock available in market';
            buy10HelpText = 'No stock available in market';
        } else if (availableSpace === 0) {
            buy1HelpText = 'No cargo space available';
            buy10HelpText = 'No cargo space available';
        } else if (gameState.credits < selectedBuyPrice) {
            buy1HelpText = `Not enough credits (need ${selectedBuyPrice} CR)`;
            buy10HelpText = `Not enough credits (need ${selectedBuyPrice * 10} CR)`;
        }
        
        // Build help text for sell buttons
        let sell1HelpText = `Sell 1 unit for ${selectedSellPrice} CR`;
        let sell10HelpText = `Sell 10 units for ${selectedSellPrice * 10} CR`;
        if (!hasTraining) {
            sell1HelpText = 'No training for this cargo type (visit Guild to learn)';
            sell10HelpText = 'No training for this cargo type (visit Guild to learn)';
        } else if (playerStock === 0) {
            sell1HelpText = 'You have none to sell';
            sell10HelpText = 'You have none to sell';
        } else if (playerStock < 10) {
            sell10HelpText = `Only have ${playerStock} to sell`;
        }
        
        // Column 2: Buy 1, Buy 10, Sell 1, Sell 10
        // Buy 1 - gray out if no training, no stock, no space, or insufficient credits
        const canBuy1 = hasTraining && marketStock >= 1 && availableSpace >= 1 && gameState.credits >= selectedBuyPrice;
        const buy1Color = canBuy1 ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY, '3', 'Buy 1', () => buyCargo(1, onReturn), buy1Color, buy1HelpText);
        
        // Buy 10 - gray out if no training, no stock, no space, or insufficient credits
        const canBuy10 = hasTraining && marketStock >= 1 && availableSpace >= 1 && gameState.credits >= selectedBuyPrice;
        const buy10Color = canBuy10 ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY + 1, '4', 'Buy 10', () => buyCargo(10, onReturn), buy10Color, buy10HelpText);
        
        // Sell 1 - gray out if no player stock
        const canSell1 = playerStock >= 1;
        const sell1Color = canSell1 ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY + 2, '5', 'Sell 1', () => sellCargo(1, onReturn), sell1Color, sell1HelpText);
        
        // Sell 10 - gray out if no player stock
        const canSell10 = playerStock >= 1;
        const sell10Color = canSell10 ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY + 3, '6', 'Sell 10', () => sellCargo(10, onReturn), sell10Color, sell10HelpText);
        
        // Column 3: Back
        UI.addButton(rightX, buttonY, '0', 'Back', onReturn, COLORS.BUTTON);
        
        // Set output message in UI output row system if there's a message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Select next cargo type (skip untrained cargo types)
     */
    function nextCargo(onReturn) {
        const startIndex = selectedCargoIndex;
        do {
            selectedCargoIndex = (selectedCargoIndex + 1) % ALL_CARGO_TYPES.length;
            const cargoType = ALL_CARGO_TYPES[selectedCargoIndex];
            const hasTraining = gameState.enabledCargoTypes.some(ct => ct.id === cargoType.id);
            if (hasTraining) break;
        } while (selectedCargoIndex !== startIndex);
        
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Select previous cargo type (skip untrained cargo types)
     */
    function prevCargo(onReturn) {
        const startIndex = selectedCargoIndex;
        do {
            selectedCargoIndex = (selectedCargoIndex - 1 + ALL_CARGO_TYPES.length) % ALL_CARGO_TYPES.length;
            const cargoType = ALL_CARGO_TYPES[selectedCargoIndex];
            const hasTraining = gameState.enabledCargoTypes.some(ct => ct.id === cargoType.id);
            if (hasTraining) break;
        } while (selectedCargoIndex !== startIndex);
        
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Buy cargo
     */
    function buyCargo(amount, onReturn) {
        const enabledCargoTypes = ALL_CARGO_TYPES.filter(cargoType => 
            gameState.enabledCargoTypes.some(ct => ct.id === cargoType.id)
        );
        const cargoType = enabledCargoTypes[selectedCargoIndex];
        const currentSystem = gameState.getCurrentSystem();
        
        // Apply barter skill to fees
        const playerOfficer = gameState.officers[0];
        const barterLevel = playerOfficer ? (playerOfficer.skills.barter || 0) : 0;
        const effectiveFees = SkillEffects.getModifiedFees(currentSystem.fees, barterLevel);
        
        const basePrice = cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id];
        const buyPrice = Math.floor(basePrice * (1 + effectiveFees));
        const availableStock = currentSystem.cargoStock[cargoType.id];
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        
        // Adjust amount if not enough stock or space
        const actualAmount = Math.min(amount, availableStock, availableSpace);
        const totalCost = buyPrice * actualAmount;
        
        // Check if we can buy
        if (actualAmount === 0) {
            if (availableStock === 0) {
                outputMessage = `No stock available!`;
            } else if (availableSpace === 0) {
                outputMessage = `No cargo space available!`;
            } else {
                outputMessage = `Cannot buy any cargo.`;
            }
            outputColor = COLORS.TEXT_ERROR;
        } else if (gameState.credits < totalCost) {
            outputMessage = `Not enough credits! Need ${totalCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
        } else {
            // Execute purchase
            gameState.credits -= totalCost;
            currentSystem.cargoStock[cargoType.id] -= actualAmount;
            Ship.addCargoToFleet(gameState.ships, cargoType.id, actualAmount);
            
            // Track player records
            gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_CARGO_BOUGHT] = (gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_CARGO_BOUGHT] || 0) + actualAmount;
            gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_BOUGHT] = (gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_BOUGHT] || 0) + totalCost;
            
            // Grant trading experience
            const tradingExpFraction = totalCost / 1000;
            const tradingExp = ExperienceUtils.calculateFractionalExp(EXP_POINTS_FROM_TRADING_1000CR, tradingExpFraction);
            
            const baseMessage = actualAmount < amount ? `Bought all ${actualAmount}x ${cargoType.name} for ${totalCost} CR!` : `Bought ${actualAmount}x ${cargoType.name} for ${totalCost} CR!`;
            
            if (tradingExp > 0) {
                const expComponents = ExperienceUtils.getExperienceMessageComponents(gameState, tradingExp, 'Trading');
                if (expComponents) {
                    // Use color array for output row to show exp in yellow
                    outputMessage = [
                        { text: baseMessage + ' ', color: COLORS.TEXT_SUCCESS },
                        { text: '(' + expComponents.baseMessage, color: COLORS.YELLOW },
                        { text: expComponents.levelUpText + ')', color: expComponents.levelUpText ? COLORS.YELLOW : COLORS.YELLOW }
                    ];
                    outputColor = COLORS.TEXT_SUCCESS; // Not used when outputMessage is array
                } else {
                    outputMessage = baseMessage;
                    outputColor = COLORS.TEXT_SUCCESS;
                }
            } else {
                outputMessage = baseMessage;
                outputColor = COLORS.TEXT_SUCCESS;
            }
        }
        
        render(onReturn);
    }
    
    /**
     * Sell cargo
     */
    function sellCargo(amount, onReturn) {
        const enabledCargoTypes = ALL_CARGO_TYPES.filter(cargoType => 
            gameState.enabledCargoTypes.some(ct => ct.id === cargoType.id)
        );
        const cargoType = enabledCargoTypes[selectedCargoIndex];
        const currentSystem = gameState.getCurrentSystem();
        
        // Apply barter skill to fees
        const playerOfficer = gameState.officers[0];
        const barterLevel = playerOfficer ? (playerOfficer.skills.barter || 0) : 0;
        const effectiveFees = SkillEffects.getModifiedFees(currentSystem.fees, barterLevel);
        
        const basePrice = cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id];
        const sellPrice = Math.floor(basePrice / (1 + effectiveFees));
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const playerQuantity = fleetCargo[cargoType.id] || 0;
        
        // Adjust amount if player doesn't have enough
        const actualAmount = Math.min(amount, playerQuantity);
        const totalValue = sellPrice * actualAmount;
        
        // Check if we can sell
        if (actualAmount === 0) {
            outputMessage = `You don't have any ${cargoType.name} to sell!`;
            outputColor = COLORS.TEXT_ERROR;
        } else {
            // Execute sale
            gameState.credits += totalValue;
            Ship.removeCargoFromFleet(gameState.ships, cargoType.id, actualAmount);
            currentSystem.cargoStock[cargoType.id] += actualAmount;
            
            // Track player records
            gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_CARGO_SOLD] = (gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_CARGO_SOLD] || 0) + actualAmount;
            gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD] = (gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD] || 0) + totalValue;
            
            // Grant trading experience
            const tradingExpFraction = totalValue / 1000;
            const tradingExp = ExperienceUtils.calculateFractionalExp(EXP_POINTS_FROM_TRADING_1000CR, tradingExpFraction);
            
            const baseMessage = actualAmount < amount ? `Sold all ${actualAmount}x ${cargoType.name} for ${totalValue} CR!` : `Sold ${actualAmount}x ${cargoType.name} for ${totalValue} CR!`;
            
            if (tradingExp > 0) {
                const expComponents = ExperienceUtils.getExperienceMessageComponents(gameState, tradingExp, 'Trading');
                if (expComponents) {
                    // Use color array for output row to show exp in yellow
                    outputMessage = [
                        { text: baseMessage + ' ', color: COLORS.TEXT_SUCCESS },
                        { text: '(' + expComponents.baseMessage, color: COLORS.YELLOW },
                        { text: expComponents.levelUpText + ')', color: expComponents.levelUpText ? COLORS.YELLOW : COLORS.YELLOW }
                    ];
                    outputColor = COLORS.TEXT_SUCCESS; // Not used when outputMessage is array
                } else {
                    outputMessage = baseMessage;
                    outputColor = COLORS.TEXT_SUCCESS;
                }
            } else {
                outputMessage = baseMessage;
                outputColor = COLORS.TEXT_SUCCESS;
            }
        }
        
        render(onReturn);
    }
    
    return {
        show
    };
})();
