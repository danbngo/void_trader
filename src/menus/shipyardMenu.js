/**
 * Shipyard Menu
 * Manage player ships, refuel/repair, and buy new ships
 */

const ShipyardMenu = (() => {
    let gameState = null;
    let mode = 'manage'; // 'manage', 'buy', 'sell', 'select-tradein-ship', 'confirm-buy', 'confirm-sell', 'confirm-tradein'
    let selectedShipIndex = 0;
    let selectedTradeInShipIndex = 0; // Index of ship to trade in
    let buyShipForTradeIn = null; // Ship to buy when doing trade-in
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    let pendingTransaction = null;
    
    /**
     * Get maximum skill level from all crew members (captain + subordinates)
     */
    function getMaxCrewSkill(skillName) {
        let maxSkill = 0;
        
        if (gameState.captain && gameState.captain.skills[skillName]) {
            maxSkill = Math.max(maxSkill, gameState.captain.skills[skillName]);
        }
        
        if (gameState.subordinates) {
            gameState.subordinates.forEach(officer => {
                if (officer.skills[skillName]) {
                    maxSkill = Math.max(maxSkill, officer.skills[skillName]);
                }
            });
        }
        
        return maxSkill;
    }
    
    /**
     * Get effective fees after barter skill (uses max from all crew)
     */
    function getEffectiveFees() {
        const currentSystem = gameState.getCurrentSystem();
        const barterLevel = getMaxCrewSkill('barter');
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
        UI.addTitleLineCentered(1, `${currentSystem.name}: Shipyard`);
        TableRenderer.renderKeyValueList(5, 3, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'System Fees:', value: `${(currentSystem.fees * 100).toFixed(1)}%`, valueColor: COLORS.TEXT_DIM }
        ]);
        
        if (mode === 'manage') {
            renderManageMode(onReturn, grid);
        } else if (mode === 'buy') {
            renderBuyMode(onReturn, grid);
        } else if (mode === 'sell') {
            renderSellMode(onReturn, grid);
        } else if (mode === 'select-tradein-ship') {
            renderSelectTradeInShipMode(onReturn, grid);
        } else if (mode === 'install-modules') {
            renderInstallModulesMode(onReturn, grid);
        } else if (mode === 'select-module-ship') {
            renderSelectModuleShipMode(onReturn, grid);
        }
    }
    
    /**
     * Render manage mode (player's ships)
     */
    function renderManageMode(onReturn, grid) {
        // Player ships table (* marks the active ship)
        const startY = 6;
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
            const numModules = ship.modules ? ship.modules.length : 0;
            return [
                //{ text: marker, color: COLORS.TEXT_NORMAL },
                { text: shipType.name, color: COLORS.TEXT_NORMAL },
                { text: `${ship.fuel}/${ship.maxFuel}`, color: UI.calcStatColor(fuelRatio, true) },
                { text: `${ship.hull}/${ship.maxHull}`, color: UI.calcStatColor(hullRatio, true) },
                { text: `${ship.maxShields}`, color: UI.calcStatColor(shieldRatio, true) },
                { text: String(ship.lasers), color: UI.calcStatColor(laserRatio) },
                { text: String(ship.engine), color: UI.calcStatColor(engineRatio) },
                { text: String(ship.radar), color: UI.calcStatColor(radarRatio) },
                { text: String(ship.cargoCapacity), color: COLORS.TEXT_NORMAL },
                { text: String(numModules), color: COLORS.TEXT_NORMAL },
                { text: `${ship.getValue()}`, color: COLORS.TEXT_NORMAL }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Type', 'Fuel', 'Hull', 'Shld', 'Lsr', 'Eng', 'Rdr', 'Cgo', 'Mod', 'Value'], rows, selectedShipIndex, 2, (rowIndex) => {
            // When a row is clicked, select that ship
            selectedShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Buttons
        const buttonY = grid.height - 4;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Only show next/previous buttons if player has more than 1 ship
        if (gameState.ships.length > 1) {
            UI.addButton(leftX, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON, 'Select next ship in your fleet');
            UI.addButton(leftX, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON, 'Select previous ship in your fleet');
        }
        
        // Sell Ship - gray out if it's the last ship
        const isLastShip = gameState.ships.length === 1;
        const sellColor = isLastShip ? COLORS.TEXT_DIM : COLORS.TEXT_ERROR;
        const sellHelpText = isLastShip ? 'Cannot sell your last ship' : 'Sell selected ship for credits';
        UI.addButton(middleX, buttonY, '3', 'Sell Ship', () => initiateSell(onReturn), sellColor, sellHelpText);
        
        UI.addButton(middleX, buttonY + 1, '4', 'Buy Ships', () => switchToBuyMode(onReturn), COLORS.BUTTON, 'Browse ships available for purchase');
        
        // Install Modules - gray out if no modules available at this shipyard
        const currentSystem = gameState.getCurrentSystem();
        const hasModules = currentSystem.modules && currentSystem.modules.length > 0;
        const modulesColor = hasModules ? COLORS.BUTTON : COLORS.TEXT_DIM;
        const modulesHelpText = hasModules ? 'Install ship modules' : 'No modules available at this shipyard!';
        UI.addButton(rightX, buttonY, '5', 'Install Modules', () => switchToInstallModulesMode(onReturn), modulesColor, modulesHelpText);
        
        UI.addButton(rightX, buttonY + 1, '0', 'Back', onReturn, COLORS.BUTTON);
        
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
        const startY = 6;
        
        const rows = currentSystem.ships.map((ship, index) => {
            const basePrice = ship.getValue();
            const price = Math.round(basePrice * (1 + getEffectiveFees()));
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            
            // Check if player has license for this ship type
            const hasLicense = gameState.enabledShipTypes.some(st => st.id === ship.type);
            
            const laserRatio = ship.lasers / AVERAGE_SHIP_LASER_LEVEL;
            const engineRatio = ship.engine / AVERAGE_SHIP_ENGINE_LEVEL;
            const radarRatio = ship.radar / AVERAGE_SHIP_RADAR_LEVEL;
            
            // If no license, make entire row grey
            const textColor = hasLicense ? COLORS.TEXT_NORMAL : COLORS.TEXT_DIM;
            const statColor = (ratio) => hasLicense ? UI.calcStatColor(ratio) : COLORS.TEXT_DIM;
            
            return [
                { text: shipType.name, color: textColor },
                { text: `${ship.maxHull}`, color: textColor },
                { text: `${ship.maxShields}`, color: textColor },
                { text: String(ship.lasers), color: statColor(laserRatio) },
                { text: String(ship.engine), color: statColor(engineRatio) },
                { text: String(ship.radar), color: statColor(radarRatio) },
                { text: String(ship.cargoCapacity), color: textColor },
                { text: `${price}`, color: textColor }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Type', 'Hull', 'Shld', 'Lsr', 'Eng', 'Rdr', 'Cgo', 'Price'], rows, selectedShipIndex, 2, (rowIndex) => {
            selectedShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Buttons
        const buttonY = grid.height - 5;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        UI.addButton(leftX, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON, 'Browse next available ship');
        UI.addButton(leftX, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON, 'Browse previous available ship');
        
        // Buy Ship - gray out if insufficient credits, no license, or insufficient officers
        const selectedShip = currentSystem.ships[selectedShipIndex];
        const shipPrice = Math.round(selectedShip.getValue() * (1 + getEffectiveFees()));
        const hasLicense = gameState.enabledShipTypes.some(st => st.id === selectedShip.type);
        const canAfford = gameState.credits >= shipPrice;
        const hasEnoughOfficers = gameState.subordinates.length >= gameState.ships.length;
        const canBuy = hasLicense && canAfford && hasEnoughOfficers;
        
        let buyHelpText = 'Purchase selected ship';
        if (!hasEnoughOfficers) {
            buyHelpText = 'Need 1 officer per ship - Hire more at Tavern';
        } else if (!hasLicense) {
            buyHelpText = 'Requires ship license - Visit the Guild';
        } else if (!canAfford) {
            buyHelpText = `Not enough credits (need ${shipPrice} CR)`;
        }
        
        const buyColor = canBuy ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY, '3', 'Buy Ship', () => initiateBuy(onReturn), buyColor, buyHelpText);
        
        // Trade In - gray out if insufficient credits for net cost or no license
        const canTradeIn = gameState.ships.length > 0 && hasLicense;
        let tradeInHelpText = 'Trade in one of your ships for this one';
        if (!hasLicense) {
            tradeInHelpText = 'Requires ship license - Visit the Guild';
        } else if (gameState.ships.length === 0) {
            tradeInHelpText = 'No ships to trade in';
        }
        
        const tradeInColor = canTradeIn ? COLORS.BUTTON : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY + 1, '4', 'Trade In', () => initiateTradeIn(onReturn), tradeInColor, tradeInHelpText);
        
        UI.addButton(rightX, buttonY, '0', 'Back to Fleet', () => switchToManageMode(onReturn), COLORS.BUTTON);
        
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
        const startY = 6;
        UI.addText(5, 5, 'Select a ship to sell:', COLORS.YELLOW);
        
        const rows = gameState.ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const sellValue = Math.round(ship.getValue() / (1 + getEffectiveFees()));
            return [
                { text: shipType.name, color: COLORS.TEXT_NORMAL },
                { text: `${ship.hull}/${ship.maxHull}`, color: COLORS.TEXT_NORMAL },
                { text: String(ship.cargoCapacity), color: COLORS.TEXT_NORMAL },
                { text: `${sellValue}`, color: COLORS.GREEN }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Type', 'Hull', 'Cargo', 'Sell Value'], rows, selectedShipIndex, 2, (rowIndex) => {
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
     * Render select trade-in ship mode (choose which ship to trade in)
     */
    function renderSelectTradeInShipMode(onReturn, grid) {
        const startY = 6;
        const newShipType = SHIP_TYPES[buyShipForTradeIn.type] || { name: 'Unknown' };
        
        UI.addText(5, 5, `Trading for: ${newShipType.name}`, COLORS.YELLOW);
        UI.addText(5, 6, 'Select a ship to trade in:', COLORS.TEXT_NORMAL);
        
        const rows = gameState.ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const tradeInValue = Math.round(ship.getValue() / (1 + getEffectiveFees()));
            const textColor = index === selectedTradeInShipIndex ? COLORS.TEXT_NORMAL : COLORS.TEXT_DIM;
            
            return [
                { text: shipType.name, color: textColor },
                { text: `${ship.hull}/${ship.maxHull}`, color: textColor },
                { text: String(ship.cargoCapacity), color: textColor },
                { text: `${tradeInValue}`, color: index === selectedTradeInShipIndex ? COLORS.GREEN : COLORS.TEXT_DIM }
            ];
        });
        
        TableRenderer.renderTable(5, startY + 2, ['Type', 'Hull', 'Cargo', 'Trade Value'], rows, selectedTradeInShipIndex, 2, (rowIndex) => {
            selectedTradeInShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Show trade-in calculation
        const selectedShip = gameState.ships[selectedTradeInShipIndex];
        const tradeInValue = Math.round(selectedShip.getValue() / (1 + getEffectiveFees()));
        const cost = Math.round(buyShipForTradeIn.getValue() * (1 + getEffectiveFees()));
        const netCost = cost - tradeInValue;
        
        const calcY = startY + 2 + rows.length + 3;
        TableRenderer.renderKeyValueList(5, calcY, [
            { label: 'New Ship Cost:', value: `${cost} CR`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Trade-In Value:', value: `${tradeInValue} CR`, valueColor: COLORS.GREEN },
            { label: 'Net Cost:', value: `${netCost} CR`, valueColor: netCost > 0 ? COLORS.TEXT_ERROR : COLORS.GREEN },
            { label: 'Your Credits:', value: `${gameState.credits} CR`, valueColor: gameState.credits >= netCost ? COLORS.GREEN : COLORS.TEXT_ERROR }
        ]);
        
        // Buttons
        const buttonY = grid.height - 4;
        UI.addButton(5, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON, 'Select next ship to trade in');
        UI.addButton(5, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON, 'Select previous ship to trade in');
        
        const canAfford = gameState.credits >= netCost;
        const confirmColor = canAfford ? COLORS.GREEN : COLORS.TEXT_DIM;
        const confirmHelp = canAfford ? 'Confirm trade-in' : `Not enough credits (need ${netCost} CR)`;
        UI.addButton(25, buttonY, '3', 'Confirm Trade', () => confirmTradeInSelection(onReturn), confirmColor, confirmHelp);
        
        UI.addButton(5, buttonY + 2, '0', 'Cancel', () => cancelTradeInSelection(onReturn), COLORS.BUTTON, 'Return to ship browsing');
        
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
        const currentSystem = gameState.getCurrentSystem();
        
        // Title
        UI.addTitleLineCentered(0, `${currentSystem.name}: Shipyard - Confirm Transaction`);
        
        let y = 2;
        
        if (mode === 'confirm-buy') {
            const shipType = SHIP_TYPES[pendingTransaction.ship.type] || { name: 'Unknown' };
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Ship:', value: shipType.name, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Cost:', value: `${pendingTransaction.cost} CR`, valueColor: COLORS.TEXT_NORMAL }
            ]);
            y++;
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Your Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'After Purchase:', value: `${gameState.credits - pendingTransaction.cost} CR`, valueColor: COLORS.TEXT_NORMAL }
            ]);
        } else if (mode === 'confirm-sell') {
            const shipType = SHIP_TYPES[pendingTransaction.ship.type] || { name: 'Unknown' };
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Selling:', value: shipType.name, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Sell Value:', value: `${pendingTransaction.value} CR`, valueColor: COLORS.TEXT_NORMAL }
            ]);
            y++;
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Your Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'After Sale:', value: `${gameState.credits + pendingTransaction.value} CR`, valueColor: COLORS.TEXT_NORMAL }
            ]);
        } else if (mode === 'confirm-tradein') {
            const oldShipType = SHIP_TYPES[pendingTransaction.oldShip.type] || { name: 'Unknown' };
            const newShipType = SHIP_TYPES[pendingTransaction.newShip.type] || { name: 'Unknown' };
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Trading In:', value: oldShipType.name, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Trade-In Value:', value: `${pendingTransaction.tradeInValue} CR`, valueColor: COLORS.TEXT_NORMAL }
            ]);
            y++;
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'New Ship:', value: newShipType.name, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Cost:', value: `${pendingTransaction.cost} CR`, valueColor: COLORS.TEXT_NORMAL }
            ]);
            y++;
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Your Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Net Cost:', value: `${pendingTransaction.netCost} CR`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'After Trade:', value: `${gameState.credits - pendingTransaction.netCost} CR`, valueColor: COLORS.TEXT_NORMAL }
            ]);
        }
        
        const buttonY = grid.height - 4;
        UI.addButton(5, buttonY, '1', 'Confirm', () => executeTransaction(onReturn), COLORS.GREEN);
        UI.addButton(5, buttonY + 1, '0', 'Cancel', () => cancelTransaction(onReturn), COLORS.BUTTON);
        
        UI.draw();
    }
    
    function nextShip(onReturn) {
        let maxIndex;
        if (mode === 'manage' || mode === 'sell') {
            maxIndex = gameState.ships.length - 1;
        } else if (mode === 'buy') {
            maxIndex = gameState.getCurrentSystem().ships.length - 1;
        } else if (mode === 'select-tradein-ship') {
            maxIndex = gameState.ships.length - 1;
        }
        
        if (mode === 'select-tradein-ship') {
            selectedTradeInShipIndex = (selectedTradeInShipIndex + 1) % (maxIndex + 1);
        } else {
            selectedShipIndex = (selectedShipIndex + 1) % (maxIndex + 1);
        }
        outputMessage = '';
        render(onReturn);
    }
    
    function prevShip(onReturn) {
        let maxIndex;
        if (mode === 'manage' || mode === 'sell') {
            maxIndex = gameState.ships.length - 1;
        } else if (mode === 'buy') {
            maxIndex = gameState.getCurrentSystem().ships.length - 1;
        } else if (mode === 'select-tradein-ship') {
            maxIndex = gameState.ships.length - 1;
        }
        
        if (mode === 'select-tradein-ship') {
            selectedTradeInShipIndex = (selectedTradeInShipIndex - 1 + (maxIndex + 1)) % (maxIndex + 1);
        } else {
            selectedShipIndex = (selectedShipIndex - 1 + (maxIndex + 1)) % (maxIndex + 1);
        }
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
        
        // Check if player has enough officers to crew another ship
        const officerCount = gameState.subordinates.length;
        const currentShipCount = gameState.ships.length;
        if (officerCount < currentShipCount) {
            outputMessage = 'Need at least 1 officer per ship! Hire more officers at the Tavern.';
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
    
    // Trade in (replace a ship) - step 1: store ship to buy, go to ship selection
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
        
        // Store the ship to buy and switch to ship selection mode
        buyShipForTradeIn = newShip;
        selectedTradeInShipIndex = 0;
        mode = 'select-tradein-ship';
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    // Trade in - step 2: confirm the trade-in with selected ship
    function confirmTradeInSelection(onReturn) {
        const oldShip = gameState.ships[selectedTradeInShipIndex];
        const newShip = buyShipForTradeIn;
        
        const tradeInValue = Math.round(oldShip.getValue() / (1 + getEffectiveFees()));
        const cost = Math.round(newShip.getValue() * (1 + getEffectiveFees()));
        const netCost = cost - tradeInValue;
        
        if (netCost > gameState.credits) {
            outputMessage = `Not enough credits! Need ${netCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            mode = 'select-tradein-ship';
            render(onReturn);
            return;
        }
        
        pendingTransaction = { oldShip, newShip, tradeInValue, cost, netCost, tradeInShipIndex: selectedTradeInShipIndex };
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
            
            const shipType = SHIP_TYPES[pendingTransaction.ship.type] || { name: 'Ship' };
            outputMessage = `Purchased ${shipType.name}!`;
            outputColor = COLORS.TEXT_SUCCESS;
            
        } else if (mode === 'confirm-sell') {
            // Sell ship
            gameState.credits += pendingTransaction.value;
            gameState.ships.splice(pendingTransaction.shipIndex, 1);
            
            const shipType = SHIP_TYPES[pendingTransaction.ship.type] || { name: 'Ship' };
            outputMessage = `Sold ${shipType.name} for ${pendingTransaction.value} CR!`;
            outputColor = COLORS.TEXT_SUCCESS;
            
        } else if (mode === 'confirm-tradein') {
            // Trade in
            gameState.credits -= pendingTransaction.netCost;
            gameState.ships[pendingTransaction.tradeInShipIndex] = pendingTransaction.newShip; // Replace selected ship
            // Remove the new ship from system inventory
            const shipIndexInSystem = currentSystem.ships.indexOf(pendingTransaction.newShip);
            if (shipIndexInSystem !== -1) {
                currentSystem.ships.splice(shipIndexInSystem, 1);
            }
            
            const oldShipType = SHIP_TYPES[pendingTransaction.oldShip.type] || { name: 'Ship' };
            const newShipType = SHIP_TYPES[pendingTransaction.newShip.type] || { name: 'Ship' };
            outputMessage = `Traded in ${oldShipType.name} for ${newShipType.name}!`;
            outputColor = COLORS.TEXT_SUCCESS;
        }
        
        // After buying or trading in, stay on buy mode; after selling, go to manage mode
        if (mode === 'confirm-buy' || mode === 'confirm-tradein') {
            mode = 'buy';
            selectedShipIndex = 0;
            pendingTransaction = null;
            UI.resetSelection();
            render(onReturn);
        } else {
            switchToManageMode(onReturn);
        }
    }
    
    function cancelTransaction(onReturn) {
        if (mode === 'confirm-buy') {
            // Go back to buy mode
            mode = 'buy';
        } else if (mode === 'confirm-tradein') {
            // Go back to trade-in ship selection
            mode = 'select-tradein-ship';
        } else if (mode === 'confirm-sell') {
            // Go back to manage mode
            mode = 'manage';
        }
        
        pendingTransaction = null;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    function cancelTradeInSelection(onReturn) {
        mode = 'buy';
        buyShipForTradeIn = null;
        selectedTradeInShipIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    // Install Modules functionality
    let selectedModuleIndex = 0;
    let selectedModuleShipIndex = 0;
    let selectedModule = null;
    
    function switchToInstallModulesMode(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        if (!currentSystem.modules || currentSystem.modules.length === 0) {
            // Error is shown in button helptext, don't switch modes
            return;
        }
        
        mode = 'install-modules';
        selectedModuleIndex = 0;
        selectedModule = null;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    function renderInstallModulesMode(onReturn, grid) {
        const currentSystem = gameState.getCurrentSystem();
        
        UI.addText(5, 6, 'Available Modules:', COLORS.TEXT_NORMAL);
        
        const startY = 8;
        const rows = currentSystem.modules.map((moduleId, index) => {
            const module = SHIP_MODULES[moduleId];
            const cost = Math.round(module.value * (1 + getEffectiveFees()));
            const canAfford = cost <= gameState.credits;
            
            return [
                { text: module.name, color: canAfford ? COLORS.TEXT_NORMAL : COLORS.TEXT_DIM },
                { text: module.description, color: COLORS.TEXT_NORMAL },
                { text: `${cost} CR`, color: canAfford ? COLORS.GREEN : COLORS.TEXT_ERROR }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Module', 'Effect', 'Price'], rows, selectedModuleIndex, 2, (rowIndex) => {
            selectedModuleIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        const buttonY = grid.height - 4;
        
        // Only show next/prev module buttons if more than 1 module
        let buttonYOffset = buttonY;
        if (currentSystem.modules.length > 1) {
            UI.addButton(5, buttonYOffset, '1', 'Next Module', () => nextModule(onReturn), COLORS.BUTTON, 'Select next module');
            UI.addButton(5, buttonYOffset + 1, '2', 'Prev Module', () => prevModule(onReturn), COLORS.BUTTON, 'Select previous module');
        }
        
        UI.addButton(28, buttonY, '3', 'Install on Ship', () => initiateModuleInstall(onReturn), COLORS.GREEN, 'Choose a ship to install this module');
        UI.addButton(28, buttonY + 1, '0', 'Back', () => switchToManageMode(onReturn), COLORS.BUTTON);
        
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    function renderSelectModuleShipMode(onReturn, grid) {
        UI.addText(5, 5, `Select ship to install ${selectedModule.name}:`, COLORS.YELLOW);
        
        const startY = 7;
        const rows = gameState.ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const numModules = ship.modules ? ship.modules.length : 0;
            const canInstall = numModules < SHIP_MAX_NUM_MODULES;
            const statusText = canInstall ? `${numModules}/${SHIP_MAX_NUM_MODULES}` : 'FULL';
            const statusColor = canInstall ? COLORS.TEXT_NORMAL : COLORS.TEXT_ERROR;
            
            return [
                { text: shipType.name, color: canInstall ? COLORS.TEXT_NORMAL : COLORS.TEXT_DIM },
                { text: `${ship.hull}/${ship.maxHull}`, color: COLORS.TEXT_NORMAL },
                { text: String(ship.cargoCapacity), color: COLORS.TEXT_NORMAL },
                { text: statusText, color: statusColor }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Type', 'Hull', 'Cargo', 'Modules'], rows, selectedModuleShipIndex, 2, (rowIndex) => {
            selectedModuleShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        const buttonY = grid.height - 4;
        
        // Only show next/prev ship buttons if more than 1 ship
        if (gameState.ships.length > 1) {
            UI.addButton(5, buttonY, '1', 'Next Ship', () => nextModuleShip(onReturn), COLORS.BUTTON);
            UI.addButton(5, buttonY + 1, '2', 'Prev Ship', () => prevModuleShip(onReturn), COLORS.BUTTON);
        }
        
        UI.addButton(28, buttonY, '3', 'Confirm Install', () => confirmModuleInstall(onReturn), COLORS.GREEN);
        UI.addButton(28, buttonY + 1, '0', 'Cancel', () => cancelModuleInstall(onReturn), COLORS.BUTTON);
        
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    function nextModule(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        const maxIndex = currentSystem.modules.length - 1;
        selectedModuleIndex = (selectedModuleIndex + 1) % (maxIndex + 1);
        outputMessage = '';
        render(onReturn);
    }
    
    function prevModule(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        const maxIndex = currentSystem.modules.length - 1;
        selectedModuleIndex = (selectedModuleIndex - 1 + (maxIndex + 1)) % (maxIndex + 1);
        outputMessage = '';
        render(onReturn);
    }
    
    function nextModuleShip(onReturn) {
        const maxIndex = gameState.ships.length - 1;
        selectedModuleShipIndex = (selectedModuleShipIndex + 1) % (maxIndex + 1);
        outputMessage = '';
        render(onReturn);
    }
    
    function prevModuleShip(onReturn) {
        const maxIndex = gameState.ships.length - 1;
        selectedModuleShipIndex = (selectedModuleShipIndex - 1 + (maxIndex + 1)) % (maxIndex + 1);
        outputMessage = '';
        render(onReturn);
    }
    
    function initiateModuleInstall(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        const moduleId = currentSystem.modules[selectedModuleIndex];
        selectedModule = SHIP_MODULES[moduleId];
        const cost = Math.round(selectedModule.value * (1 + getEffectiveFees()));
        
        if (cost > gameState.credits) {
            outputMessage = `Not enough credits! Need ${cost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        mode = 'select-module-ship';
        selectedModuleShipIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    function confirmModuleInstall(onReturn) {
        const ship = gameState.ships[selectedModuleShipIndex];
        const numModules = ship.modules ? ship.modules.length : 0;
        
        if (numModules >= SHIP_MAX_NUM_MODULES) {
            outputMessage = `Ship already has maximum modules (${SHIP_MAX_NUM_MODULES})!`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        const cost = Math.round(selectedModule.value * (1 + getEffectiveFees()));
        
        // Deduct credits
        gameState.credits -= cost;
        
        // Install module
        if (!ship.modules) {
            ship.modules = [];
        }
        ship.modules.push(selectedModule.id);
        
        // Apply module effect
        selectedModule.onInstall(ship);
        
        // Remove module from system inventory
        const currentSystem = gameState.getCurrentSystem();
        currentSystem.modules.splice(selectedModuleIndex, 1);
        
        const shipType = SHIP_TYPES[ship.type] || { name: 'Ship' };
        outputMessage = `Installed ${selectedModule.name} on ${shipType.name}!`;
        outputColor = COLORS.TEXT_SUCCESS;
        
        // Return to module selection or manage if no modules left
        if (currentSystem.modules.length === 0) {
            mode = 'manage';
        } else {
            mode = 'install-modules';
            selectedModuleIndex = Math.min(selectedModuleIndex, currentSystem.modules.length - 1);
        }
        
        selectedModule = null;
        selectedModuleShipIndex = 0;
        UI.resetSelection();
        render(onReturn);
    }
    
    function cancelModuleInstall(onReturn) {
        mode = 'install-modules';
        selectedModule = null;
        selectedModuleShipIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    return {
        show
    };
})();
