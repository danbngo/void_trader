/**
 * Shipyard Menu
 * Manage player ships, refuel/repair, and buy new ships
 */

const ShipyardMenu = (() => {
    let gameState = null;
    let mode = 'manage'; // 'manage', 'buy', 'sell', 'confirm-buy', 'confirm-sell', 'confirm-tradein'
    let selectedShipIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    let pendingTransaction = null;
    
    /**
     * Get effective fees after barter skill
     */
    function getEffectiveFees() {
        const currentSystem = gameState.getCurrentSystem();
        const playerOfficer = gameState.officers[0];
        const barterLevel = playerOfficer ? (playerOfficer.skills.barter || 0) : 0;
        return SkillEffects.getModifiedFees(currentSystem.fees, barterLevel);
    }
    
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
        
        if (mode.startsWith('confirm-')) {
            renderConfirmation(onReturn);
            return;
        }
        
        // Title
        UI.addTitleLineCentered(3, `${currentSystem.name}: SHIPYARD`);
        TableRenderer.renderKeyValueList(5, 5, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'System Fees:', value: `${(currentSystem.fees * 100).toFixed(1)}%`, valueColor: COLORS.TEXT_DIM }
        ]);
        
        if (mode === 'manage') {
            renderManageMode(onReturn, grid);
        } else if (mode === 'buy') {
            renderBuyMode(onReturn, grid);
        } else if (mode === 'sell') {
            renderSellMode(onReturn, grid);
        }
    }
    
    /**
     * Render manage mode (player's ships)
     */
    function renderManageMode(onReturn, grid) {
        // Player ships table (* marks the active ship)
        const startY = 8;
        const rows = gameState.ships.map((ship, index) => {
            //const isActive = (index === gameState.activeShipIndex);
            //const marker = isActive ? '*' : '';
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const fuelRatio = ship.fuel / ship.maxFuel;
            const hullRatio = ship.hull / ship.maxHull;
            const shieldRatio = ship.shields / ship.maxShields;
            const laserRatio = ship.lasers / AVERAGE_SHIP_LASER_LEVEL;
            const engineRatio = ship.engine / AVERAGE_SHIP_ENGINE_LEVEL;
            const radarRatio = ship.radar / AVERAGE_SHIP_RADAR_LEVEL;
            return [
                //{ text: marker, color: COLORS.TEXT_NORMAL },
                { text: ship.name, color: COLORS.TEXT_NORMAL },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.fuel}/${ship.maxFuel}`, color: UI.calcStatColor(fuelRatio, true) },
                { text: `${ship.hull}/${ship.maxHull}`, color: UI.calcStatColor(hullRatio, true) },
                { text: `${ship.shields}/${ship.maxShields}`, color: UI.calcStatColor(shieldRatio, true) },
                { text: String(ship.lasers), color: UI.calcStatColor(laserRatio) },
                { text: String(ship.engine), color: UI.calcStatColor(engineRatio) },
                { text: String(ship.radar), color: UI.calcStatColor(radarRatio) },
                { text: String(ship.cargoCapacity), color: COLORS.TEXT_NORMAL },
                { text: `${ship.getValue()}`, color: COLORS.TEXT_NORMAL }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Ship', 'Type', 'Fuel', 'Hull', 'Shield', 'Lsr', 'Eng', 'Rdr', 'Cgo', 'Value'], rows, selectedShipIndex, 2, (rowIndex) => {
            // When a row is clicked, select that ship
            selectedShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Buttons
        const buttonY = grid.height - 4;
        UI.addButton(5, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON, 'Select next ship in your fleet');
        UI.addButton(5, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON, 'Select previous ship in your fleet');
        
        // Sell Ship - gray out if it's the last ship
        const isLastShip = gameState.ships.length === 1;
        const sellColor = isLastShip ? COLORS.TEXT_DIM : COLORS.TEXT_ERROR;
        const sellHelpText = isLastShip ? 'Cannot sell your last ship' : 'Sell selected ship for credits';
        UI.addButton(25, buttonY, '3', 'Sell Ship', () => initiateSell(onReturn), sellColor, sellHelpText);
        
        UI.addButton(40, buttonY, '4', 'Buy Ships', () => switchToBuyMode(onReturn), COLORS.BUTTON, 'Browse ships available for purchase');
        UI.addButton(5, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON);
        
        // Set output message in UI output row system if there's a message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
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
        
        const rows = currentSystem.ships.map((ship, index) => {
            const basePrice = ship.getValue();
            const price = Math.round(basePrice * (1 + getEffectiveFees()));
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            
            // Check if player has license for this ship type
            const hasLicense = gameState.enabledShipTypes.some(st => st.id === ship.type);
            
            const laserRatio = ship.lasers / AVERAGE_SHIP_LASER_LEVEL;
            const engineRatio = ship.engine / AVERAGE_SHIP_ENGINE_LEVEL;
            const radarRatio = ship.radar / AVERAGE_SHIP_RADAR_LEVEL;
            
            // Calculate trade-in value (first ship's value with fees)
            const tradeInValue = gameState.ships.length > 0 ? Math.round(gameState.ships[0].getValue() / (1 + getEffectiveFees())) : 0;
            const netCost = price - tradeInValue;
            
            // If no license, make entire row grey
            const textColor = hasLicense ? COLORS.TEXT_NORMAL : COLORS.TEXT_DIM;
            const statColor = (ratio) => hasLicense ? UI.calcStatColor(ratio) : COLORS.TEXT_DIM;
            const priceColor = hasLicense ? (netCost > 0 ? COLORS.TEXT_ERROR : COLORS.GREEN) : COLORS.TEXT_DIM;
            
            return [
                { text: shipType.name, color: textColor },
                { text: `${ship.maxHull}`, color: textColor },
                { text: `${ship.maxShields}`, color: textColor },
                { text: String(ship.lasers), color: statColor(laserRatio) },
                { text: String(ship.engine), color: statColor(engineRatio) },
                { text: String(ship.radar), color: statColor(radarRatio) },
                { text: String(ship.cargoCapacity), color: textColor },
                { text: `${price}`, color: textColor },
                { text: `${netCost}`, color: priceColor }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Type', 'Hull', 'Shield', 'Lsr', 'Eng', 'Rdr', 'Cgo', 'Price', 'Trade-In'], rows, selectedShipIndex, 2, (rowIndex) => {
            selectedShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Buttons
        const buttonY = grid.height - 5;
        UI.addButton(5, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON, 'Browse next available ship');
        UI.addButton(5, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON, 'Browse previous available ship');
        
        // Buy Ship - gray out if insufficient credits or no license
        const selectedShip = currentSystem.ships[selectedShipIndex];
        const shipPrice = Math.round(selectedShip.getValue() * (1 + getEffectiveFees()));
        const hasLicense = gameState.enabledShipTypes.some(st => st.id === selectedShip.type);
        const canAfford = gameState.credits >= shipPrice;
        const canBuy = hasLicense && canAfford;
        
        let buyHelpText = 'Purchase selected ship';
        if (!hasLicense) {
            buyHelpText = 'Requires ship license - Visit the Guild';
        } else if (!canAfford) {
            buyHelpText = `Not enough credits (need ${shipPrice} CR)`;
        }
        
        const buyColor = canBuy ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(25, buttonY, '3', 'Buy Ship', () => initiateBuy(onReturn), buyColor, buyHelpText);
        
        // Trade In - gray out if insufficient credits for net cost or no license
        const canTradeIn = gameState.ships.length > 0 && hasLicense;
        let tradeInHelpText = 'Trade in one of your ships for this one';
        if (!hasLicense) {
            tradeInHelpText = 'Requires ship license - Visit the Guild';
        } else if (gameState.ships.length === 0) {
            tradeInHelpText = 'No ships to trade in';
        }
        
        const tradeInColor = canTradeIn ? COLORS.BUTTON : COLORS.TEXT_DIM;
        UI.addButton(25, buttonY + 1, '4', 'Trade In', () => initiateTradeIn(onReturn), tradeInColor, tradeInHelpText);
        
        UI.addButton(5, buttonY + 2, '0', 'Back to Fleet', () => switchToManageMode(onReturn), COLORS.BUTTON);
        
        // Set output message in UI output row system if there's a message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Render sell mode (select which ship to sell)
     */
    function renderSellMode(onReturn, grid) {
        // Player ships table (for selling)
        const startY = 8;
        UI.addText(5, 7, 'Select a ship to sell:', COLORS.YELLOW);
        
        const rows = gameState.ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const sellValue = Math.round(ship.getValue() / (1 + getEffectiveFees()));
            return [
                { text: ship.name, color: COLORS.TEXT_NORMAL },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.hull}/${ship.maxHull}`, color: COLORS.TEXT_NORMAL },
                { text: String(ship.cargoCapacity), color: COLORS.TEXT_NORMAL },
                { text: `${sellValue}`, color: COLORS.GREEN }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Ship', 'Type', 'Hull', 'Cargo', 'Sell Value'], rows, selectedShipIndex, 2, (rowIndex) => {
            selectedShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Buttons
        const buttonY = grid.height - 4;
        UI.addButton(5, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON);
        UI.addButton(5, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON);
        UI.addButton(25, buttonY, '3', 'Confirm Sell', () => confirmSellFromSellMode(onReturn), COLORS.TEXT_ERROR, 'Sell selected ship');
        UI.addButton(5, buttonY + 2, '0', 'Cancel', () => switchToManageMode(onReturn), COLORS.BUTTON);
        
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Render confirmation screen
     */
    function renderConfirmation(onReturn) {
        const grid = UI.getGridSize();
        
        UI.addHeaderLineCentered(10, 'Confirm Transaction');
        
        let y = 13;
        
        if (mode === 'confirm-buy') {
            UI.addText(10, y++, `Ship: ${pendingTransaction.ship.name}`, COLORS.TEXT_NORMAL);
            UI.addText(10, y++, `Cost: ${pendingTransaction.cost} CR`, COLORS.TEXT_ERROR);
            y++;
            UI.addText(10, y++, `Your Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
            UI.addText(10, y++, `After Purchase: ${gameState.credits - pendingTransaction.cost} CR`, COLORS.GREEN);
        } else if (mode === 'confirm-sell') {
            UI.addText(10, y++, `Selling: ${pendingTransaction.ship.name}`, COLORS.TEXT_NORMAL);
            UI.addText(10, y++, `Sell Value: ${pendingTransaction.value} CR`, COLORS.GREEN);
            y++;
            UI.addText(10, y++, `Your Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
            UI.addText(10, y++, `After Sale: ${gameState.credits + pendingTransaction.value} CR`, COLORS.GREEN);
        } else if (mode === 'confirm-tradein') {
            UI.addText(10, y++, `Trading In: ${pendingTransaction.oldShip.name}`, COLORS.TEXT_NORMAL);
            UI.addText(10, y++, `Trade-In Value: ${pendingTransaction.tradeInValue} CR`, COLORS.GREEN);
            y++;
            UI.addText(10, y++, `New Ship: ${pendingTransaction.newShip.name}`, COLORS.TEXT_NORMAL);
            UI.addText(10, y++, `Cost: ${pendingTransaction.cost} CR`, COLORS.TEXT_ERROR);
            y++;
            UI.addText(10, y++, `Net Cost: ${pendingTransaction.netCost} CR`, pendingTransaction.netCost > 0 ? COLORS.TEXT_ERROR : COLORS.GREEN);
            y++;
            UI.addText(10, y++, `Your Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
            UI.addText(10, y++, `After Trade: ${gameState.credits - pendingTransaction.netCost} CR`, COLORS.GREEN);
        }
        
        const buttonY = grid.height - 4;
        UI.addButton(10, buttonY, '1', 'Confirm', () => executeTransaction(onReturn), COLORS.GREEN);
        UI.addButton(10, buttonY + 1, '0', 'Cancel', () => cancelTransaction(onReturn), COLORS.BUTTON);
        
        UI.draw();
    }
    
    function nextShip(onReturn) {
        let maxIndex;
        if (mode === 'manage' || mode === 'sell') {
            maxIndex = gameState.ships.length - 1;
        } else if (mode === 'buy') {
            maxIndex = gameState.getCurrentSystem().ships.length - 1;
        }
        selectedShipIndex = (selectedShipIndex + 1) % (maxIndex + 1);
        outputMessage = '';
        render(onReturn);
    }
    
    function prevShip(onReturn) {
        let maxIndex;
        if (mode === 'manage' || mode === 'sell') {
            maxIndex = gameState.ships.length - 1;
        } else if (mode === 'buy') {
            maxIndex = gameState.getCurrentSystem().ships.length - 1;
        }
        selectedShipIndex = (selectedShipIndex - 1 + (maxIndex + 1)) % (maxIndex + 1);
        outputMessage = '';
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
        pendingTransaction = null;
        UI.resetSelection();
        render(onReturn);
    }
    
    // Buy ship (outright purchase)
    function initiateBuy(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        if (!currentSystem.ships || currentSystem.ships.length === 0) {
            outputMessage = 'No ships available!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        const ship = currentSystem.ships[selectedShipIndex];
        
        // Check if player has license for this ship type
        const hasLicense = gameState.enabledShipTypes.some(st => st.id === ship.type);
        if (!hasLicense) {
            outputMessage = 'You lack a license to pilot this ship type. Visit the Guild!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        const cost = Math.round(ship.getValue() * (1 + getEffectiveFees()));
        
        if (cost > gameState.credits) {
            outputMessage = `Not enough credits! Need ${cost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        pendingTransaction = { ship, cost };
        mode = 'confirm-buy';
        UI.resetSelection();
        render(onReturn);
    }
    
    // Sell ship
    function initiateSell(onReturn) {
        // Check if this is the last ship
        if (gameState.ships.length === 1) {
            outputMessage = 'Cannot sell your last ship! Use Trade In instead.';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        mode = 'sell';
        selectedShipIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    function confirmSellFromSellMode(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        const ship = gameState.ships[selectedShipIndex];
        const value = Math.round(ship.getValue() / (1 + getEffectiveFees()));
        
        pendingTransaction = { ship, value, shipIndex: selectedShipIndex };
        mode = 'confirm-sell';
        UI.resetSelection();
        render(onReturn);
    }
    
    // Trade in (replace a ship)
    function initiateTradeIn(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        if (!currentSystem.ships || currentSystem.ships.length === 0) {
            outputMessage = 'No ships available!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        const newShip = currentSystem.ships[selectedShipIndex];
        
        // Check if player has license for this ship type
        const hasLicense = gameState.enabledShipTypes.some(st => st.id === newShip.type);
        if (!hasLicense) {
            outputMessage = 'You lack a license to pilot this ship type. Visit the Guild!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Trade in the first ship (could be enhanced to let player choose)
        const oldShip = gameState.ships[0];
        
        const tradeInValue = Math.round(oldShip.getValue() / (1 + getEffectiveFees()));
        const cost = Math.round(newShip.getValue() * (1 + getEffectiveFees()));
        const netCost = cost - tradeInValue;
        
        if (netCost > gameState.credits) {
            outputMessage = `Not enough credits! Need ${netCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        pendingTransaction = { oldShip, newShip, tradeInValue, cost, netCost, buyShipIndex: selectedShipIndex };
        mode = 'confirm-tradein';
        UI.resetSelection();
        render(onReturn);
    }
    
    // Execute transaction
    function executeTransaction(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        
        if (mode === 'confirm-buy') {
            // Buy ship
            gameState.credits -= pendingTransaction.cost;
            gameState.ships.push(pendingTransaction.ship);
            currentSystem.ships.splice(currentSystem.ships.indexOf(pendingTransaction.ship), 1);
            
            outputMessage = `Purchased ${pendingTransaction.ship.name}!`;
            outputColor = COLORS.TEXT_SUCCESS;
            
        } else if (mode === 'confirm-sell') {
            // Sell ship
            gameState.credits += pendingTransaction.value;
            gameState.ships.splice(pendingTransaction.shipIndex, 1);
            
            outputMessage = `Sold ${pendingTransaction.ship.name} for ${pendingTransaction.value} CR!`;
            outputColor = COLORS.TEXT_SUCCESS;
            
        } else if (mode === 'confirm-tradein') {
            // Trade in
            gameState.credits -= pendingTransaction.netCost;
            gameState.ships[0] = pendingTransaction.newShip; // Replace first ship
            currentSystem.ships.splice(pendingTransaction.buyShipIndex, 1);
            
            outputMessage = `Traded in ${pendingTransaction.oldShip.name} for ${pendingTransaction.newShip.name}!`;
            outputColor = COLORS.TEXT_SUCCESS;
        }
        
        switchToManageMode(onReturn);
    }
    
    function cancelTransaction(onReturn) {
        if (mode === 'confirm-buy' || mode === 'confirm-tradein') {
            // Go back to buy mode
            mode = 'buy';
        } else if (mode === 'confirm-sell') {
            // Go back to manage mode
            mode = 'manage';
        }
        
        pendingTransaction = null;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    return {
        show
    };
})();
