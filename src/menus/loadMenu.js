/**
 * Load Menu
 * Shows list of save files and allows loading
 */

const LoadMenu = (() => {
    let returnCallback = null;
    
    /**
     * Show the load menu
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        returnCallback = onReturn;
        
        UI.clearAll();
        UI.clearButtons();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(3, '=== LOAD GAME ===', COLORS.TITLE);
        
        // Get save list
        const saves = SaveLoadManager.getSaveList();
        
        // Show saves or message
        if (saves.length === 0) {
            UI.addTextCentered(10, 'No save files found', COLORS.TEXT_DIM);
        } else {
            UI.addText(5, 6, 'Select a save to load:', COLORS.TEXT_NORMAL);
        }
        
        // Create load buttons
        const buttons = [];
        const startY = 8;
        
        // Show existing saves
        saves.forEach((save, index) => {
            if (index < 9) { // Limit to 9 saves (keys 1-9)
                const dateStr = save.date.toLocaleString();
                buttons.push({
                    key: String(index + 1),
                    label: `${save.name} - ${dateStr}`,
                    callback: () => loadFromSlot(save.id),
                    color: COLORS.BUTTON,
                    x: 5,
                    y: startY + index
                });
            }
        });
        
        // Back button
        buttons.push({
            key: '0',
            label: 'Back',
            callback: () => {
                if (returnCallback) returnCallback();
            },
            color: COLORS.BUTTON,
            x: 5,
            y: grid.height - 4
        });
        
        UI.setButtons(buttons);
        
        // Set this screen as the redraw target
        UI.setRedrawCallback(() => show(returnCallback));
        
        // Debug output
        UI.debugUI();
    }
    
    /**
     * Load from a specific save slot
     */
    function loadFromSlot(saveId) {
        const gameState = SaveLoadManager.loadGame(saveId);
        
        if (gameState) {
            // Update global game state
            window.gameState = gameState;
            
            // Show confirmation
            UI.clearAll();
            UI.addTextCentered(15, 'Game Loaded!', COLORS.TEXT_SUCCESS);
            
            setTimeout(() => {
                // Return to galaxy map
                GalaxyMap.show(gameState);
            }, 1000);
        } else {
            UI.clearAll();
            UI.addTextCentered(15, 'Failed to load game', COLORS.TEXT_ERROR);
            
            setTimeout(() => {
                show(returnCallback);
            }, 1500);
        }
    }
    
    return {
        show
    };
})();
