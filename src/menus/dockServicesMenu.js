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
        UI.addTitleLineCentered(3, `${currentSystem.name}: Dock Services`);
        UI.addText(5, 5, `Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
        
        // Player ships table
        const startY = 8;
        const rows = gameState.ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const fuelRatio = ship.fuel / ship.maxFuel;
            const hullRatio = ship.hull / ship.maxHull;
            const shieldRatio = ship.shields / ship.maxShields;
            const fuelCostForShip = Math.floor((ship.maxFuel - ship.fuel) * FUEL_COST_PER_UNIT);
            const repairCostForShip = Math.floor((ship.maxHull - ship.hull + ship.maxShields - ship.shields) * HULL_REPAIR_COST_PER_UNIT);
            return [
                { text: ship.name, color: COLORS.TEXT_NORMAL },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.fuel}/${ship.maxFuel}`, color: UI.calcStatColor(fuelRatio, true) },
                { text: `${ship.hull}/${ship.maxHull}`, color: UI.calcStatColor(hullRatio, true) },
                { text: `${ship.shields}/${ship.maxShields}`, color: UI.calcStatColor(shieldRatio, true) },
                { text: `${fuelCostForShip} CR`, color: fuelCostForShip > 0 ? COLORS.YELLOW : COLORS.TEXT_DIM },
                { text: `${repairCostForShip} CR`, color: repairCostForShip > 0 ? COLORS.YELLOW : COLORS.TEXT_DIM }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Ship', 'Type', 'Fuel', 'Hull', 'Shields', 'Refuel', 'Repair'], rows, selectedShipIndex, 2, (rowIndex) => {
            // When a row is clicked, select that ship
            selectedShipIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Buttons in 3 columns
        const buttonY = grid.height - 6;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Column 1: Next Ship, Previous Ship (only show if player has multiple ships)
        if (gameState.ships.length > 1) {
            UI.addButton(leftX, buttonY, '1', 'Next Ship', () => nextShip(onReturn), COLORS.BUTTON, 'Select next ship in your fleet');
            UI.addButton(leftX, buttonY + 1, '2', 'Previous Ship', () => prevShip(onReturn), COLORS.BUTTON, 'Select previous ship in your fleet');
        }
        
        // Column 2: Refuel, Repair
        const ship = gameState.ships[selectedShipIndex];
        const fuelNeeded = ship.maxFuel - ship.fuel;
        const fuelCost = Math.floor(fuelNeeded * FUEL_COST_PER_UNIT);
        const canRefuel = fuelNeeded > 0; // Always allow refuel if fuel is needed (pity refuel if no credits)
        const refuelColor = canRefuel ? COLORS.GREEN : COLORS.TEXT_DIM;
        const refuelHelpText = fuelNeeded > 0 ? `Refuel to max capacity for ${fuelCost} CR` : 'Already at max fuel';
        UI.addButton(middleX, buttonY, '3', 'Refuel', () => refuel(onReturn), refuelColor, refuelHelpText);
        
        // Repair - gray out if already full or insufficient credits (includes shields)
        const hullNeeded = ship.maxHull - ship.hull;
        const shieldNeeded = ship.maxShields - ship.shields;
        const repairCost = Math.floor((hullNeeded + shieldNeeded) * HULL_REPAIR_COST_PER_UNIT);
        const canRepair = (hullNeeded > 0 || shieldNeeded > 0) && gameState.credits >= repairCost;
        const repairColor = canRepair ? COLORS.GREEN : COLORS.TEXT_DIM;
        const repairHelpText = (hullNeeded > 0 || shieldNeeded > 0) ? `Repair hull and shields for ${repairCost} CR` : 'Already at max hull and shields';
        UI.addButton(middleX, buttonY + 1, '4', 'Repair', () => repair(onReturn), repairColor, repairHelpText);
        
        // Column 3: Back
        UI.addButton(rightX, buttonY, '0', 'Back', onReturn, COLORS.BUTTON);
        
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
        const totalCost = Math.floor(fuelNeeded * FUEL_COST_PER_UNIT);
        
        if (fuelNeeded === 0) {
            outputMessage = 'Ship is already fully fueled!';
            outputColor = COLORS.TEXT_ERROR;
        } else if (gameState.credits < totalCost) {
            // Pity refuel - they take what the player has and refuel anyway
            ship.fuel = ship.maxFuel;
            gameState.credits = 0;
            outputMessage = `The mechanics take pity on you and refuel your ship for free.`;
            outputColor = COLORS.CYAN;
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
        const shieldNeeded = ship.maxShields - ship.shields;
        const totalCost = Math.floor((hullNeeded + shieldNeeded) * HULL_REPAIR_COST_PER_UNIT);
        
        if (hullNeeded === 0 && shieldNeeded === 0) {
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
