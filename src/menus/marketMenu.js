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
        UI.addTextCentered(3, `${currentSystem.name}: Market`, COLORS.TITLE);
        
        // Player info
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const totalCargo = Object.values(fleetCargo).reduce((sum, amt) => sum + amt, 0);
        const totalCapacity = gameState.ships.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
        UI.addText(5, 5, `Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
        UI.addText(5, 6, `Cargo: ${totalCargo} / ${totalCapacity}`, COLORS.TEXT_NORMAL);
        
        // Use ALL cargo types (not just enabled ones)
        const allCargoTypes = ALL_CARGO_TYPES;
        
        // Ensure selectedCargoIndex is valid
        if (selectedCargoIndex >= allCargoTypes.length) {
            selectedCargoIndex = Math.max(0, allCargoTypes.length - 1);
        }
        
        // Market table
        const startY = 9;
        const rows = allCargoTypes.map((cargoType, index) => {
            const stock = currentSystem.cargoStock[cargoType.id];
            const buyPrice = Math.floor(cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id]);
            const sellPrice = Math.floor(buyPrice * 0.8); // Sell at 80% of buy price
            const playerQuantity = fleetCargo[cargoType.id] || 0;
            
            // Check if player has training for this cargo type
            const hasTraining = gameState.enabledCargoTypes.some(ct => ct.id === cargoType.id);
            
            // Calculate ratios for color coding
            const buyRatio = cargoType.baseValue / buyPrice; // Lower buy price = higher ratio = better
            const sellRatio = sellPrice / cargoType.baseValue; // Higher sell price = higher ratio = better
            
            const buyColor = hasTraining ? UI.calcStatColor(buyRatio) : COLORS.TEXT_DIM;
            const sellColor = hasTraining ? UI.calcStatColor(sellRatio) : COLORS.TEXT_DIM;
            const nameColor = hasTraining ? COLORS.TEXT_NORMAL : COLORS.TEXT_DIM;
            const stockColor = hasTraining ? COLORS.TEXT_NORMAL : COLORS.TEXT_DIM;
            const baseValueColor = hasTraining ? COLORS.TEXT_DIM : COLORS.TEXT_DIM;
            const playerQuantityColor = hasTraining ? COLORS.TEXT_NORMAL : COLORS.TEXT_DIM;
            
            return [
                { text: cargoType.name, color: nameColor },
                { text: String(stock), color: stockColor },
                { text: String(cargoType.baseValue), color: baseValueColor },
                { text: `${buyPrice}`, color: buyColor },
                { text: `${sellPrice}`, color: sellColor },
                { text: String(playerQuantity), color: playerQuantityColor }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Cargo', 'Market Stock', 'Base Value', 'Buy Price', 'Sell Price', 'Your Stock'], rows, selectedCargoIndex, 2, (rowIndex) => {
            // When a row is clicked, select that cargo
            selectedCargoIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
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
        const buyPrice = Math.floor(selectedCargoType.baseValue * currentSystem.cargoPriceModifier[selectedCargoType.id]);
        const sellPrice = Math.floor(buyPrice * 0.8);
        const marketStock = currentSystem.cargoStock[selectedCargoType.id];
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        const playerStock = fleetCargo[selectedCargoType.id] || 0;
        
        // Check if this cargo type is enabled (player has training for it)
        const hasTraining = gameState.enabledCargoTypes.some(ct => ct.id === selectedCargoType.id);
        
        // Build help text for buy buttons
        let buy1HelpText = 'Purchase 1 unit of selected cargo';
        let buy10HelpText = 'Purchase 10 units of selected cargo';
        if (!hasTraining) {
            buy1HelpText = 'No training for this cargo type (visit Guild to learn)';
            buy10HelpText = 'No training for this cargo type (visit Guild to learn)';
        } else if (marketStock === 0) {
            buy1HelpText = 'No stock available in market';
            buy10HelpText = 'No stock available in market';
        } else if (availableSpace === 0) {
            buy1HelpText = 'No cargo space available';
            buy10HelpText = 'No cargo space available';
        } else if (gameState.credits < buyPrice) {
            buy1HelpText = `Not enough credits (need ${buyPrice} CR)`;
            buy10HelpText = `Not enough credits (need ${buyPrice * 10} CR)`;
        }
        
        // Build help text for sell buttons
        let sell1HelpText = 'Sell 1 unit of selected cargo';
        let sell10HelpText = 'Sell 10 units of selected cargo';
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
        const canBuy1 = hasTraining && marketStock >= 1 && availableSpace >= 1 && gameState.credits >= buyPrice;
        const buy1Color = canBuy1 ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY, '3', 'Buy 1', () => buyCargo(1, onReturn), buy1Color, buy1HelpText);
        
        // Buy 10 - gray out if no training, no stock, no space, or insufficient credits
        const canBuy10 = hasTraining && marketStock >= 1 && availableSpace >= 1 && gameState.credits >= buyPrice;
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
     * Select next cargo type (only enabled ones)
     */
    function nextCargo(onReturn) {
        selectedCargoIndex = (selectedCargoIndex + 1) % ALL_CARGO_TYPES.length;
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Select previous cargo type (all cargo types, not just enabled ones)
     */
    function prevCargo(onReturn) {
        selectedCargoIndex = (selectedCargoIndex - 1 + ALL_CARGO_TYPES.length) % ALL_CARGO_TYPES.length;
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
        
        const buyPrice = Math.floor(cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id]);
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
            
            const message = actualAmount < amount ? `Bought all ${actualAmount}x ${cargoType.name} for ${totalCost} CR!` : `Bought ${actualAmount}x ${cargoType.name} for ${totalCost} CR!`;
            outputMessage = message;
            outputColor = COLORS.TEXT_SUCCESS;
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
        
        const buyPrice = Math.floor(cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id]);
        const sellPrice = Math.floor(buyPrice * 0.8);
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
            
            const message = actualAmount < amount ? `Sold all ${actualAmount}x ${cargoType.name} for ${totalValue} CR!` : `Sold ${actualAmount}x ${cargoType.name} for ${totalValue} CR!`;
            outputMessage = message;
            outputColor = COLORS.TEXT_SUCCESS;
        }
        
        render(onReturn);
    }
    
    return {
        show
    };
})();
