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
        
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(3, 'Load Game', COLORS.TITLE);
        
        // Get save list
        const saves = SaveLoadManager.getSaveList();
        
        // Show saves or message
        if (saves.length === 0) {
            UI.addTextCentered(10, 'No save files found', COLORS.TEXT_DIM);
        } else {
            UI.addText(5, 6, 'Select a save to load:', COLORS.TEXT_NORMAL);
        }
        
        // Create load buttons
        const startY = 8;
        
        // Show existing saves
        saves.forEach((save, index) => {
            if (index < 9) { // Limit to 9 saves (keys 1-9)
                const dateStr = save.date.toLocaleString();
                UI.addButton(5, startY + index, String(index + 1), `${save.name} - ${dateStr}`, () => loadFromSlot(save.id), COLORS.BUTTON);
            }
        });
        
        // Back button
        UI.addButton(5, grid.height - 4, '0', 'Back', () => {
            if (returnCallback) returnCallback();
        }, COLORS.BUTTON);
        
        UI.draw();
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
            UI.clear();
            UI.addTextCentered(15, 'Game Loaded!', COLORS.TEXT_SUCCESS);
            UI.draw();
            
            setTimeout(() => {
                // Return to galaxy map
                GalaxyMap.show(gameState);
            }, 1000);
        } else {
            UI.clear();
            UI.addTextCentered(15, 'Failed to load game', COLORS.TEXT_ERROR);
            UI.draw();
            
            setTimeout(() => {
                show(returnCallback);
            }, 1500);
        }
    }
    
    return {
        show
    };
})();
