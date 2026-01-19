/**
 * Title Menu
 * Main menu screen for Void Trader
 */

const TitleMenu = (() => {
    /**
     * Show the title screen
     */
    function show() {
        UI.clearAll();
        UI.clearButtons();
        
        const grid = UI.getGridSize();
        const centerX = Math.floor(grid.width / 2);
        
        // Title
        UI.addTextCentered(5, 'V O I D   T R A D E R', COLORS.TITLE);
        UI.addTextCentered(7, 'A Text-Based Space Trading Game', COLORS.TEXT_DIM);
        
        // Menu buttons - auto-arranged vertically with auto-generated keys
        const menuX = centerX - 10;
        const menuY = 12;
        
        UI.setButtons([
            {
                label: 'New Game',
                callback: () => newGame(),
                color: COLORS.BUTTON
            },
            {
                label: 'Continue',
                callback: () => continueGame(),
                color: COLORS.BUTTON
            },
            {
                label: 'About',
                callback: () => showAbout(),
                color: COLORS.BUTTON
            }
        ], menuX, menuY);
        
        // Footer
        UI.addTextCentered(grid.height - 2, '(Press number keys to select)', COLORS.TEXT_DIM);
        
        // Set this screen as the redraw target
        UI.setRedrawCallback(() => show());
    }
    
    /**
     * Start a new game
     */
    function newGame() {
        UI.clearAll();
        const grid = UI.getGridSize();
        const centerY = Math.floor(grid.height / 2);
        
        UI.addTextCentered(centerY, 'Starting new game...', COLORS.TEXT_SUCCESS);
        
        // TODO: Implement game start
        setTimeout(() => {
            UI.addTextCentered(centerY + 2, '(Game logic to be implemented)', COLORS.TEXT_WARNING);
            UI.addTextCentered(centerY + 4, 'Press ESC to return', COLORS.TEXT_DIM);
            
            UI.setButtons([
                {
                    key: 'Escape',
                    label: 'Back to Title',
                    callback: () => show(),
                    color: COLORS.BUTTON_DANGER,
                    x: Math.floor(grid.width / 2) - 10,
                    y: centerY + 6
                }
            ]);
        }, 500);
    }
    
    /**
     * Continue existing game
     */
    function continueGame() {
        UI.clearAll();
        const grid = UI.getGridSize();
        const centerY = Math.floor(grid.height / 2);
        
        UI.addTextCentered(centerY, 'No saved game found', COLORS.TEXT_ERROR);
        
        setTimeout(() => {
            show();
        }, 2000);
    }
    
    /**
     * Show about screen
     */
    function showAbout() {
        UI.clearAll();
        const grid = UI.getGridSize();
        
        UI.addTextCentered(8, 'V O I D   T R A D E R', COLORS.TITLE);
        UI.addTextCentered(11, 'A text-based space trading adventure', COLORS.TEXT_NORMAL);
        UI.addTextCentered(13, 'Navigate the cosmos, trade goods, and', COLORS.TEXT_NORMAL);
        UI.addTextCentered(14, 'build your interstellar trading empire.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(17, 'Controls: Number keys', COLORS.BUTTON);
        UI.addTextCentered(18, 'Version: 0.1.0', COLORS.TEXT_DIM);
        
        UI.setButtons([
            {
                label: 'Back to Title',
                callback: () => show(),
                color: COLORS.BUTTON,
                x: Math.floor(grid.width / 2) - 10,
                y: 22
            }
        ]);
    }
    
    // Public API
    return {
        show
    };
})();
