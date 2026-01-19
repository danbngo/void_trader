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
                { text: String(cargoType.baseValue), color: COLORS.TEXT_DIM },
                { text: String(stock), color: COLORS.TEXT_NORMAL },
                { text: `${buyPrice} CR`, color: COLORS.TEXT_NORMAL },
                { text: `${sellPrice} CR`, color: COLORS.TEXT_NORMAL },
                { text: String(playerQuantity), color: COLORS.TEXT_NORMAL }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Cargo', 'Base', 'Stock', 'Buy', 'Sell', 'You Have'], rows, selectedCargoIndex, 2, (rowIndex) => {
            // When a row is clicked, select that cargo
            selectedCargoIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Buttons
        const buttonY = grid.height - 4;
        UI.addButton(5, buttonY, '1', 'Next Cargo', () => nextCargo(onReturn), COLORS.BUTTON, 'Select next cargo type');
        UI.addButton(5, buttonY + 1, '2', 'Previous Cargo', () => prevCargo(onReturn), COLORS.BUTTON, 'Select previous cargo type');
        UI.addButton(25, buttonY, '3', 'Buy 1', () => buyCargo(1, onReturn), COLORS.GREEN, 'Purchase 1 unit of selected cargo');
        UI.addButton(25, buttonY + 1, '4', 'Sell 1', () => sellCargo(1, onReturn), COLORS.GREEN, 'Sell 1 unit of selected cargo');
        UI.addButton(40, buttonY, '5', 'Buy 10', () => buyCargo(10, onReturn), COLORS.GREEN, 'Purchase 10 units of selected cargo');
        UI.addButton(40, buttonY + 1, '6', 'Sell 10', () => sellCargo(10, onReturn), COLORS.GREEN, 'Sell 10 units of selected cargo');
        UI.addButton(5, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON);
        
        // Set output message in UI output row system if there's a message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
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
        const availableStock = currentSystem.cargoStock[cargoType.id];
        const availableSpace = ship.getAvailableCargoSpace();
        
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
            ship.cargo[cargoType.id] = (ship.cargo[cargoType.id] || 0) + actualAmount;
            
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
        const cargoType = ALL_CARGO_TYPES[selectedCargoIndex];
        const currentSystem = gameState.getCurrentSystem();
        const ship = gameState.ship;
        
        const buyPrice = Math.floor(cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id]);
        const sellPrice = Math.floor(buyPrice * 0.8);
        const playerQuantity = ship.cargo[cargoType.id] || 0;
        
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
            ship.cargo[cargoType.id] -= actualAmount;
            currentSystem.cargoStock[cargoType.id] += actualAmount;
            
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
