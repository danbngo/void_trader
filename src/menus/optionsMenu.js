/**
 * Options Menu
 * Main options screen with save, load, return to title
 */

const OptionsMenu = (() => {
    let returnCallback = null;
    
    /**
     * Show the options menu
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        returnCallback = onReturn;
        
        UI.clearAll();
        UI.clearButtons();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(5, '=== OPTIONS ===', COLORS.TITLE);
        
        // Menu buttons
        const menuX = Math.floor(grid.width / 2) - 12;
        const menuY = 10;
        
        UI.setButtons([
            {
                label: 'Save Game',
                callback: () => SaveMenu.show(() => show(returnCallback)),
                color: COLORS.BUTTON
            },
            {
                label: 'Load Game',
                callback: () => LoadMenu.show(() => show(returnCallback)),
                color: COLORS.BUTTON
            },
            {
                label: 'Return to Title Screen',
                callback: () => TitleMenu.show(),
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
