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
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        const ship = gameState.ship;
        
        // Title
        UI.addTextCentered(3, '=== SHIP STATUS ===', COLORS.TITLE);
        
        // Ship details
        const startY = 6;
        UI.addText(5, startY, 'Ship Name:', COLORS.TEXT_DIM);
        UI.addText(20, startY, ship.name, COLORS.CYAN);
        
        UI.addText(5, startY + 2, 'Fuel:', COLORS.TEXT_DIM);
        UI.addText(20, startY + 2, `${ship.fuel} / ${ship.maxFuel}`, COLORS.TEXT_NORMAL);
        
        UI.addText(5, startY + 4, 'Cargo Space:', COLORS.TEXT_DIM);
        UI.addText(20, startY + 4, `${ship.getTotalCargo()} / ${ship.cargoCapacity}`, COLORS.TEXT_NORMAL);
        
        UI.addText(5, startY + 6, 'Available Space:', COLORS.TEXT_DIM);
        UI.addText(20, startY + 6, `${ship.getAvailableCargoSpace()} units`, COLORS.GREEN);
        
        // Back button
        UI.addButton(5, grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
