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
        const ship = gameState.ship;
        
        // Title
        UI.addTextCentered(3, 'Ship Status', COLORS.TITLE);
        
        // Ship details
        const startY = 6;
        TableRenderer.renderKeyValueList(5, startY, [
            { label: 'Ship Name:', value: ship.name, valueColor: COLORS.CYAN },
            { label: 'Fuel:', value: `${ship.fuel} / ${ship.maxFuel}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Cargo Space:', value: `${ship.getTotalCargo()} / ${ship.cargoCapacity}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Available Space:', value: `${ship.getAvailableCargoSpace()} units`, valueColor: COLORS.GREEN }
        ]);
        
        // Back button
        UI.addButton(5, grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
