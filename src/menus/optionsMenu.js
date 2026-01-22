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
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title at top
        UI.addTextCentered(5, 'Options', COLORS.TITLE);
        
        // Menu buttons at bottom, centered
        const buttonY = grid.height - 6;
        const menuX = Math.floor(grid.width / 2) - 15;
        
        UI.addButton(menuX, buttonY, '1', 'Save Game', () => SaveMenu.show(() => show(returnCallback)), COLORS.BUTTON, 'Save your current game');
        UI.addButton(menuX, buttonY + 1, '2', 'Load Game', () => LoadMenu.show(() => show(returnCallback)), COLORS.BUTTON, 'Load a saved game');
        UI.addButton(menuX, buttonY + 2, '3', 'Return to Title Screen', () => TitleMenu.show(), COLORS.BUTTON, 'Quit to main menu');
        UI.addButton(menuX, buttonY + 3, '0', 'Back', () => {
            if (returnCallback) returnCallback();
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
