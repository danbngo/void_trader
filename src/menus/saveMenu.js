/**
 * Save Menu
 * Shows list of save files and allows saving
 */

const SaveMenu = (() => {
    let returnCallback = null;
    
    /**
     * Show the save menu
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        returnCallback = onReturn;
        
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTitleLineCentered(3, 'Save Game');
        
        // Get save list
        const saves = SaveLoadManager.getSaveList();
        
        // Show saves or message
        if (saves.length === 0) {
            UI.addTextCentered(8, 'No save files found', COLORS.TEXT_DIM);
            UI.addTextCentered(10, 'Press a number key to create a new save', COLORS.TEXT_NORMAL);
        } else {
            UI.addText(5, 6, 'Select a save slot to overwrite:', COLORS.TEXT_NORMAL);
        }
        
        // Create save slot buttons
        const startY = 8;
        
        // Show existing saves
        saves.forEach((save, index) => {
            if (index < MAX_SAVES) {
                const dateStr = save.date.toLocaleString();
                UI.addButton(5, startY + index, String(index + 1), `${save.name} - ${dateStr}`, () => saveToSlot(save.name), COLORS.BUTTON);
            }
        });
        
        // Add option to create new save if less than max saves
        if (saves.length < MAX_SAVES) {
            UI.addButton(5, startY + saves.length, String(saves.length + 1), '<New Save>', () => promptNewSave(), COLORS.GREEN);
        }
        
        // Back button
        UI.addButton(5, grid.height - 4, '0', 'Back', () => {
            if (returnCallback) returnCallback();
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Save to a specific slot
     */
    function saveToSlot(saveName) {
        if (window.gameState) {
            SaveLoadManager.saveGame(saveName, window.gameState);
            
            // Show confirmation
            UI.clear();
            UI.addTextCentered(15, 'Game Saved!', COLORS.TEXT_SUCCESS);
            UI.draw();
            
            setTimeout(() => {
                show(returnCallback);
            }, 1000);
        }
    }
    
    /**
     * Prompt for new save name
     */
    function promptNewSave() {
        const saveName = prompt('Enter save name:', 'Save ' + (new Date().toLocaleDateString()));
        if (saveName) {
            saveToSlot(saveName);
        }
    }
    
    return {
        show
    };
})();
