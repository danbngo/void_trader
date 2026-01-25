/**
 * Ship Info Menu
 * Shows ship status and specifications
 */

const ShipInfoMenu = (() => {
    /**
     * Show ship information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTitleLineCentered(0, 'Fleet Status');
        
        // Fleet summary
        const totalShips = gameState.ships.length;
        const maxShips = 5; // TODO: Make this dynamic based on perks if needed
        
        const totalOfficers = gameState.subordinates.length;
        const maxOfficers = 1 + (gameState.perks.has('LEADERSHIP_I') ? 1 : 0) 
                              + (gameState.perks.has('LEADERSHIP_II') ? 1 : 0) 
                              + (gameState.perks.has('LEADERSHIP_III') ? 1 : 0);
        
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const totalCargo = Object.values(fleetCargo).reduce((sum, amt) => sum + amt, 0);
        const maxCargo = Ship.getFleetCargoCapacity(gameState.ships);
        
        const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
        const maxFuel = gameState.ships.reduce((sum, ship) => sum + ship.maxFuel, 0);
        
        let y = TableRenderer.renderKeyValueList(5, 2, [
            { label: 'Ships:', value: `${totalShips} / ${maxShips}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Officers:', value: `${totalOfficers} / ${maxOfficers}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Cargo:', value: `${totalCargo} / ${maxCargo}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Fuel:', value: `${totalFuel} / ${maxFuel}`, valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;
        
        // Use ship table utility (no active ship highlighting)
        const endY = ShipTableRenderer.addPlayerFleet(5, y, null, gameState.ships, true, -1);
        
        // Back button
        UI.addCenteredButton(grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
