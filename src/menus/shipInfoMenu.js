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
        UI.addTextCentered(3, 'Fleet Status', COLORS.TITLE);
        
        // Use ship table utility
        const endY = ShipTableRenderer.addPlayerFleet(5, 6, null, gameState.ships, true, gameState.activeShipIndex);
        
        // Legend
        UI.addText(5, endY, 'Active ship shown in green', COLORS.TEXT_DIM);
        
        // Back button
        UI.addButton(5, grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
