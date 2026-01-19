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
        
        UI.clearAll();
        UI.clearButtons();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(3, '=== SAVE GAME ===', COLORS.TITLE);
        
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
        const buttons = [];
        const startY = 8;
        
        // Show existing saves
        saves.forEach((save, index) => {
            if (index < 9) { // Limit to 9 saves (keys 1-9)
                const dateStr = save.date.toLocaleString();
                buttons.push({
                    key: String(index + 1),
                    label: `${save.name} - ${dateStr}`,
                    callback: () => saveToSlot(save.name),
                    color: COLORS.BUTTON,
                    x: 5,
                    y: startY + index
                });
            }
        });
        
        // Add option to create new save if less than 9 saves
        if (saves.length < 9) {
            buttons.push({
                key: String(saves.length + 1),
                label: '<New Save>',
                callback: () => promptNewSave(),
                color: COLORS.GREEN,
                x: 5,
                y: startY + saves.length
            });
        }
        
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
     * Save to a specific slot
     */
    function saveToSlot(saveName) {
        if (window.gameState) {
            SaveLoadManager.saveGame(saveName, window.gameState);
            
            // Show confirmation
            UI.clearAll();
            UI.addTextCentered(15, 'Game Saved!', COLORS.TEXT_SUCCESS);
            
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
