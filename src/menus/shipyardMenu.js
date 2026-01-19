/**
 * Shipyard Menu
 * Manage player ships, refuel/repair, and buy new ships
 */

const ShipyardMenu = (() => {
    let gameState = null;
    let mode = 'manage'; // 'manage' or 'buy' or 'confirm'
    let selectedShipIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    let pendingPurchase = null; // {ship, tradeInValue, cost, netCost}
    
    /**
     * Show the shipyard menu
     * @param {GameState} state - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(state, onReturn) {
        gameState = state;
        mode = 'manage';
        selectedShipIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    /**
     * Render the shipyard screen
     */
    function render(onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        if (mode === 'confirm') {
            renderConfirmation(onReturn);
            return;
        }
        
        // Title
        UI.addTextCentered(3, `${currentSystem.name}: SHIPYARD`, COLORS.TITLE);
        UI.addText(5, 5, `Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
        
        if (mode === 'manage') {
            renderManageMode(onReturn, grid);
        } else if (mode === 'buy') {
            renderBuyMode(onReturn, grid);
        }
    }
    
    /**
     * Render manage mode (player's ships)
     */
    function renderManageMode(onReturn, grid) {
        // Player ships table (* marks the active ship)
        const startY = 8;
        const rows = gameState.ships.map((ship, index) => {
            const isActive = (index === gameState.activeShipIndex);
            const marker = isActive ? '*' : '';
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            return [
                { text: marker, color: COLORS.TEXT_NORMAL },
                { text: ship.name, color: COLORS.TEXT_NORMAL },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.fuel}/${ship.maxFuel}`, color: COLORS.TEXT_NORMAL },
                { text: `${ship.hull}/${ship.maxHull}`, color: COLORS.TEXT_NORMAL },
                { text: `${ship.shields}/${ship.maxShields}`, color: COLORS.TEXT_NORMAL },
                { text: String(ship.lasers), color: COLORS.TEXT_NORMAL },
                { text: String(ship.engine), color: COLORS.TEXT_NORMAL },
                { text: String(ship.cargoCapacity), color: COLORS.TEXT_NORMAL },
                { text: `${ship.getValue()} CR`, color: COLORS.TEXT_NORMAL }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['', 'Ship', 'Type', 'Fuel', 'Hull', 'Shield', 'Laser', 'Engine', 'Cargo', 'Value'], rows, selectedShipIndex, 2, (rowIndex) => {
            // When a row is clicked, select that ship
            selectedShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Output message
        const outputY = grid.height - 7;
        if (outputMessage) {
            UI.addTextCentered(outputY, outputMessage, outputColor);
        }
        
        // Buttons
        const buttonY = grid.height - 5;
        UI.addButton(5, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON, 'Select next ship in your fleet');
        UI.addButton(5, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON, 'Select previous ship in your fleet');
        UI.addButton(25, buttonY, '3', 'Refuel', () => refuel(onReturn), COLORS.GREEN, 'Refuel selected ship to maximum capacity');
        UI.addButton(25, buttonY + 1, '4', 'Repair', () => repair(onReturn), COLORS.GREEN, 'Repair hull and shields to maximum');
        UI.addButton(40, buttonY, '5', 'Buy Ships', () => switchToBuyMode(onReturn), COLORS.BUTTON, 'Browse ships available for purchase');
        UI.addButton(5, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Render buy mode (system ships)
     */
    function renderBuyMode(onReturn, grid) {
        const currentSystem = gameState.getCurrentSystem();
        
        if (currentSystem.ships.length === 0) {
            UI.addTextCentered(10, 'No ships available for sale', COLORS.TEXT_DIM);
            UI.addButton(5, grid.height - 4, '0', 'Back', () => switchToManageMode(onReturn), COLORS.BUTTON);
            UI.draw();
            return;
        }
        
        // Available ships table
        const startY = 8;
        const currentShip = gameState.ships[gameState.activeShipIndex];
        const tradeInValue = currentShip.getValue();
        
        const rows = currentSystem.ships.map((ship, index) => {
            const price = ship.getValue();
            const netCost = price - tradeInValue;
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            return [
                { text: ship.name, color: COLORS.TEXT_NORMAL },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.hull}/${ship.maxHull}`, color: COLORS.TEXT_NORMAL },
                { text: `${ship.shields}/${ship.maxShields}`, color: COLORS.TEXT_NORMAL },
                { text: String(ship.lasers), color: COLORS.TEXT_NORMAL },
                { text: String(ship.engine), color: COLORS.TEXT_NORMAL },
                { text: String(ship.cargoCapacity), color: COLORS.TEXT_NORMAL },
                { text: `${price} CR`, color: COLORS.TEXT_NORMAL },
                { text: `${netCost} CR`, color: netCost > 0 ? COLORS.TEXT_NORMAL : COLORS.GREEN }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Ship', 'Type', 'Hull', 'Shield', 'Laser', 'Engine', 'Cargo', 'Price', 'After Trade'], rows, selectedShipIndex, 2, (rowIndex) => {
            // When a row is clicked, select that ship
            selectedShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Output message
        const outputY = grid.height - 6;
        if (outputMessage) {
            UI.addTextCentered(outputY, outputMessage, outputColor);
        }
        
        // Buttons
        const buttonY = grid.height - 4;
        UI.addButton(5, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON, 'Browse next available ship');
        UI.addButton(5, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON, 'Browse previous available ship');
        UI.addButton(25, buttonY, '3', 'Buy Ship', () => initiatePurchase(onReturn), COLORS.GREEN, 'Purchase selected ship (trades in active ship)');
        UI.addButton(5, buttonY + 2, '0', 'Back', () => switchToManageMode(onReturn), COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Render confirmation screen
     */
    function renderConfirmation(onReturn) {
        const grid = UI.getGridSize();
        
        UI.addTextCentered(8, 'Confirm Purchase', COLORS.TITLE);
        
        UI.addText(10, 11, `Ship: ${pendingPurchase.ship.name}`, COLORS.TEXT_NORMAL);
        UI.addText(10, 12, `Price: ${pendingPurchase.cost} CR`, COLORS.TEXT_NORMAL);
        UI.addText(10, 13, `Your Ship Trade-In: ${pendingPurchase.tradeInValue} CR`, COLORS.GREEN);
        UI.addText(10, 14, `Net Cost: ${pendingPurchase.netCost} CR`, COLORS.YELLOW);
        
        if (pendingPurchase.netCost > 0) {
            UI.addText(10, 16, `Remaining Credits: ${gameState.credits - pendingPurchase.netCost} CR`, COLORS.TEXT_NORMAL);
        } else {
            UI.addText(10, 16, `Credits After Sale: ${gameState.credits + Math.abs(pendingPurchase.netCost)} CR`, COLORS.GREEN);
        }
        
        UI.addButton(10, grid.height - 4, '1', 'Confirm', () => confirmPurchase(onReturn), COLORS.GREEN);
        UI.addButton(10, grid.height - 3, '0', 'Cancel', () => switchToBuyMode(onReturn), COLORS.BUTTON);
        
        UI.draw();
    }
    
    function nextShip(onReturn) {
        const maxIndex = mode === 'manage' ? gameState.ships.length - 1 : gameState.getCurrentSystem().ships.length - 1;
        selectedShipIndex = (selectedShipIndex + 1) % (maxIndex + 1);
        outputMessage = '';
        render(onReturn);
    }
    
    function prevShip(onReturn) {
        const maxIndex = mode === 'manage' ? gameState.ships.length - 1 : gameState.getCurrentSystem().ships.length - 1;
        selectedShipIndex = (selectedShipIndex - 1 + (maxIndex + 1)) % (maxIndex + 1);
        outputMessage = '';
        render(onReturn);
    }
    
    function refuel(onReturn) {
        const ship = gameState.ships[selectedShipIndex];
        const fuelNeeded = ship.maxFuel - ship.fuel;
        const fuelCost = 5; // 5 CR per fuel unit
        const totalCost = fuelNeeded * fuelCost;
        
        if (fuelNeeded === 0) {
            outputMessage = 'Ship is already fully fueled!';
            outputColor = COLORS.TEXT_ERROR;
        } else if (gameState.credits < totalCost) {
            outputMessage = `Not enough credits! Need ${totalCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
        } else {
            gameState.credits -= totalCost;
            ship.fuel = ship.maxFuel;
            outputMessage = `Refueled for ${totalCost} CR!`;
            outputColor = COLORS.TEXT_SUCCESS;
        }
        
        render(onReturn);
    }
    
    function repair(onReturn) {
        const ship = gameState.ships[selectedShipIndex];
        const hullNeeded = ship.maxHull - ship.hull;
        const repairCost = 10; // 10 CR per hull point
        const totalCost = hullNeeded * repairCost;
        
        if (hullNeeded === 0) {
            outputMessage = 'Ship is already fully repaired!';
            outputColor = COLORS.TEXT_ERROR;
        } else if (gameState.credits < totalCost) {
            outputMessage = `Not enough credits! Need ${totalCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
        } else {
            gameState.credits -= totalCost;
            ship.hull = ship.maxHull;
            outputMessage = `Repaired for ${totalCost} CR!`;
            outputColor = COLORS.TEXT_SUCCESS;
        }
        
        render(onReturn);
    }
    
    function switchToBuyMode(onReturn) {
        mode = 'buy';
        selectedShipIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    function switchToManageMode(onReturn) {
        mode = 'manage';
        selectedShipIndex = 0;
        outputMessage = '';
        pendingPurchase = null;
        UI.resetSelection();
        render(onReturn);
    }
    
    function initiatePurchase(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        const newShip = currentSystem.ships[selectedShipIndex];
        const currentShip = gameState.ships[gameState.activeShipIndex];
        
        const tradeInValue = currentShip.getValue();
        const cost = newShip.getValue();
        const netCost = cost - tradeInValue;
        
        if (netCost > gameState.credits) {
            outputMessage = `Not enough credits! Need ${netCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        pendingPurchase = { ship: newShip, tradeInValue, cost, netCost };
        mode = 'confirm';
        UI.resetSelection();
        render(onReturn);
    }
    
    function confirmPurchase(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        
        // Apply credits change
        gameState.credits -= pendingPurchase.netCost;
        
        // Replace active ship with new ship
        gameState.ships[gameState.activeShipIndex] = pendingPurchase.ship;
        
        // Remove ship from system
        currentSystem.ships.splice(selectedShipIndex, 1);
        
        outputMessage = `Purchased ${pendingPurchase.ship.name}!`;
        outputColor = COLORS.TEXT_SUCCESS;
        
        switchToManageMode(onReturn);
    }
    
    return {
        show
    };
})();
