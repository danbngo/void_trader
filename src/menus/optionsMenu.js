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
        
        UI.clear();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(5, '=== OPTIONS ===', COLORS.TITLE);
        
        // Menu buttons
        const menuX = Math.floor(grid.width / 2) - 12;
        let menuY = 10;
        
        UI.addButton(menuX, menuY++, '1', 'Save Game', () => SaveMenu.show(() => show(returnCallback)), COLORS.BUTTON);
        UI.addButton(menuX, menuY++, '2', 'Load Game', () => LoadMenu.show(() => show(returnCallback)), COLORS.BUTTON);
        UI.addButton(menuX, menuY++, '3', 'Return to Title Screen', () => TitleMenu.show(), COLORS.BUTTON);
        UI.addButton(menuX, menuY++, '0', 'Back', () => {
            if (returnCallback) returnCallback();
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
