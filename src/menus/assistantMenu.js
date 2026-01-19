/**
 * Assistant Menu
 * Shows information about ship, cargo, and captain
 */

const AssistantMenu = (() => {
    let returnCallback = null;
    
    /**
     * Show the assistant menu
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        returnCallback = onReturn;
        
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(5, 'Assistant', COLORS.TITLE);
        UI.addTextCentered(7, 'What would you like to review?', COLORS.TEXT_NORMAL);
        
        // Menu buttons
        const menuX = Math.floor(grid.width / 2) - 12;
        const menuY = 11;
        
        UI.addButton(menuX, menuY, '1', 'Ship Status', () => ShipInfoMenu.show(() => show(returnCallback)), COLORS.BUTTON, 'View detailed ship specifications');
        UI.addButton(menuX, menuY + 1, '2', 'Cargo Manifest', () => CargoInfoMenu.show(() => show(returnCallback)), COLORS.BUTTON, 'View cargo hold contents and capacity');
        UI.addButton(menuX, menuY + 2, '3', 'Captain Info', () => CaptainInfoMenu.show(() => show(returnCallback)), COLORS.BUTTON, 'View captain and officer details');
        UI.addButton(menuX, menuY + 3, '0', 'Back', () => { if (returnCallback) returnCallback(); }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
