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
        UI.addTitleLineCentered(5, 'Options');
        
        // Menu buttons at bottom, centered
        const buttonY = grid.height - 6;
        
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Save Game', callback: () => SaveMenu.show(() => show(returnCallback)), color: COLORS.BUTTON, helpText: 'Save your current game' },
            { key: '2', label: 'Load Game', callback: () => LoadMenu.show(() => show(returnCallback)), color: COLORS.BUTTON, helpText: 'Load a saved game' },
            { key: '3', label: 'Return to Title Screen', callback: () => TitleMenu.show(), color: COLORS.BUTTON, helpText: 'Quit to main menu' },
            { key: '0', label: 'Back', callback: () => {
                if (returnCallback) returnCallback();
            }, color: COLORS.BUTTON }
        ]);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
