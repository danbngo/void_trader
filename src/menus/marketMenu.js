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
        const ship = gameState.ship;
        
        // Title
        UI.addTextCentered(3, `${currentSystem.name}: Market`, COLORS.TITLE);
        
        // Player info
        UI.addText(5, 5, `Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
        UI.addText(5, 6, `Cargo: ${ship.getTotalCargo()} / ${ship.cargoCapacity}`, COLORS.TEXT_NORMAL);
        
        // Market table
        const startY = 9;
        const rows = ALL_CARGO_TYPES.map((cargoType, index) => {
            const stock = currentSystem.cargoStock[cargoType.id];
            const buyPrice = Math.floor(cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id]);
            const sellPrice = Math.floor(buyPrice * 0.8); // Sell at 80% of buy price
            const playerQuantity = ship.cargo[cargoType.id] || 0;
            
            return [
                { text: cargoType.name, color: COLORS.TEXT_NORMAL },
                { text: String(stock), color: COLORS.TEXT_NORMAL },
                { text: `${buyPrice} CR`, color: COLORS.TEXT_NORMAL },
                { text: `${sellPrice} CR`, color: COLORS.TEXT_NORMAL },
                { text: String(playerQuantity), color: COLORS.TEXT_NORMAL }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Cargo', 'Stock', 'Buy', 'Sell', 'You Have'], rows, selectedCargoIndex);
        
        // Output message row (just above buttons)
        const outputY = grid.height - 6;
        if (outputMessage) {
            UI.addTextCentered(outputY, outputMessage, outputColor);
        }
        
        // Buttons
        const buttonY = grid.height - 4;
        UI.addButton(5, buttonY, '1', 'Next Cargo', () => nextCargo(onReturn), COLORS.BUTTON);
        UI.addButton(5, buttonY + 1, '2', 'Previous Cargo', () => prevCargo(onReturn), COLORS.BUTTON);
        UI.addButton(25, buttonY, '3', 'Buy 1', () => buyCargo(1, onReturn), COLORS.GREEN);
        UI.addButton(25, buttonY + 1, '4', 'Sell 1', () => sellCargo(1, onReturn), COLORS.GREEN);
        UI.addButton(40, buttonY, '5', 'Buy 10', () => buyCargo(10, onReturn), COLORS.GREEN);
        UI.addButton(40, buttonY + 1, '6', 'Sell 10', () => sellCargo(10, onReturn), COLORS.GREEN);
        UI.addButton(5, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Select next cargo type
     */
    function nextCargo(onReturn) {
        selectedCargoIndex = (selectedCargoIndex + 1) % ALL_CARGO_TYPES.length;
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Select previous cargo type
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
        const cargoType = ALL_CARGO_TYPES[selectedCargoIndex];
        const currentSystem = gameState.getCurrentSystem();
        const ship = gameState.ship;
        
        const buyPrice = Math.floor(cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id]);
        const totalCost = buyPrice * amount;
        const availableStock = currentSystem.cargoStock[cargoType.id];
        const availableSpace = ship.getAvailableCargoSpace();
        
        // Check if we can buy
        if (availableStock < amount) {
            outputMessage = `Not enough stock! Only ${availableStock} available.`;
            outputColor = COLORS.TEXT_ERROR;
        } else if (gameState.credits < totalCost) {
            outputMessage = `Not enough credits! Need ${totalCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
        } else if (availableSpace < amount) {
            outputMessage = `Not enough cargo space! Only ${availableSpace} slots available.`;
            outputColor = COLORS.TEXT_ERROR;
        } else {
            // Execute purchase
            gameState.credits -= totalCost;
            currentSystem.cargoStock[cargoType.id] -= amount;
            ship.cargo[cargoType.id] = (ship.cargo[cargoType.id] || 0) + amount;
            
            outputMessage = `Bought ${amount}x ${cargoType.name} for ${totalCost} CR!`;
            outputColor = COLORS.TEXT_SUCCESS;
        }
        
        render(onReturn);
    }
    
    /**
     * Sell cargo
     */
    function sellCargo(amount, onReturn) {
        const cargoType = ALL_CARGO_TYPES[selectedCargoIndex];
        const currentSystem = gameState.getCurrentSystem();
        const ship = gameState.ship;
        
        const buyPrice = Math.floor(cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id]);
        const sellPrice = Math.floor(buyPrice * 0.8);
        const totalValue = sellPrice * amount;
        const playerQuantity = ship.cargo[cargoType.id] || 0;
        
        // Check if we can sell
        if (playerQuantity < amount) {
            outputMessage = `Not enough cargo! You only have ${playerQuantity}x ${cargoType.name}.`;
            outputColor = COLORS.TEXT_ERROR;
        } else {
            // Execute sale
            gameState.credits += totalValue;
            ship.cargo[cargoType.id] -= amount;
            currentSystem.cargoStock[cargoType.id] += amount;
            
            outputMessage = `Sold ${amount}x ${cargoType.name} for ${totalValue} CR!`;
            outputColor = COLORS.TEXT_SUCCESS;
        }
        
        render(onReturn);
    }
    
    return {
        show
    };
})();
