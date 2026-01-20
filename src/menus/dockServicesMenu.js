/**
 * Dock Services Menu
 * Refuel and repair ships
 */

const DockServicesMenu = (() => {
    let gameState = null;
    let selectedShipIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the dock services menu
     * @param {GameState} state - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(state, onReturn) {
        gameState = state;
        selectedShipIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    /**
     * Render the dock services screen
     */
    function render(onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Title
        UI.addTextCentered(3, `${currentSystem.name}: DOCK SERVICES`, COLORS.TITLE);
        UI.addText(5, 5, `Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
        
        // Player ships table
        const startY = 8;
        const rows = gameState.ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const fuelRatio = ship.fuel / ship.maxFuel;
            const hullRatio = ship.hull / ship.maxHull;
            const shieldRatio = ship.shields / ship.maxShields;
            return [
                { text: ship.name, color: COLORS.TEXT_NORMAL },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.fuel}/${ship.maxFuel}`, color: UI.calcStatColor(fuelRatio, true) },
                { text: `${ship.hull}/${ship.maxHull}`, color: UI.calcStatColor(hullRatio, true) },
                { text: `${ship.shields}/${ship.maxShields}`, color: UI.calcStatColor(shieldRatio, true) }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Ship', 'Type', 'Fuel', 'Hull', 'Shields'], rows, selectedShipIndex, 2, (rowIndex) => {
            // When a row is clicked, select that ship
            selectedShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Buttons
        const buttonY = grid.height - 6;
        UI.addButton(5, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON, 'Select next ship in your fleet');
        UI.addButton(5, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON, 'Select previous ship in your fleet');
        
        // Refuel - gray out if already full or insufficient credits
        const ship = gameState.ships[selectedShipIndex];
        const fuelNeeded = ship.maxFuel - ship.fuel;
        const fuelCost = fuelNeeded * 5;
        const canRefuel = fuelNeeded > 0 && gameState.credits >= fuelCost;
        const refuelColor = canRefuel ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(25, buttonY, '3', 'Refuel', () => refuel(onReturn), refuelColor, 'Refuel selected ship to maximum capacity');
        
        // Repair - gray out if already full or insufficient credits
        const hullNeeded = ship.maxHull - ship.hull;
        const repairCost = hullNeeded * 10;
        const canRepair = hullNeeded > 0 && gameState.credits >= repairCost;
        const repairColor = canRepair ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(25, buttonY + 1, '4', 'Repair', () => repair(onReturn), repairColor, 'Repair hull and shields to maximum');
        
        UI.addButton(5, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON);
        
        // Set output message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    function nextShip(onReturn) {
        selectedShipIndex = (selectedShipIndex + 1) % gameState.ships.length;
        outputMessage = '';
        render(onReturn);
    }
    
    function prevShip(onReturn) {
        selectedShipIndex = (selectedShipIndex - 1 + gameState.ships.length) % gameState.ships.length;
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
            ship.shields = ship.maxShields;
            outputMessage = `Repaired for ${totalCost} CR!`;
            outputColor = COLORS.TEXT_SUCCESS;
        }
        
        render(onReturn);
    }
    
    return {
        show
    };
})();
