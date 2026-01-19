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
        
        UI.clearAll();
        UI.clearButtons();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(5, '=== ASSISTANT ===', COLORS.TITLE);
        UI.addTextCentered(7, 'What would you like to review?', COLORS.TEXT_NORMAL);
        
        // Menu buttons
        const menuX = Math.floor(grid.width / 2) - 12;
        const menuY = 11;
        
        UI.setButtons([
            {
                label: 'Ship Status',
                callback: () => ShipInfoMenu.show(() => show(returnCallback)),
                color: COLORS.BUTTON
            },
            {
                label: 'Cargo Manifest',
                callback: () => CargoInfoMenu.show(() => show(returnCallback)),
                color: COLORS.BUTTON
            },
            {
                label: 'Captain Info',
                callback: () => CaptainInfoMenu.show(() => show(returnCallback)),
                color: COLORS.BUTTON
            },
            {
                key: '0',
                label: 'Back',
                callback: () => {
                    if (returnCallback) returnCallback();
                },
                color: COLORS.BUTTON
            }
        ], menuX, menuY);
        
        // Set this screen as the redraw target
        UI.setRedrawCallback(() => show(returnCallback));
        
        // Debug output
        UI.debugUI();
    }
    
    return {
        show
    };
})();
