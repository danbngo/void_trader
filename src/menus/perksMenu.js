/**
 * Perks Menu
 * Shows learned perks
 */

const PerksMenu = (() => {
    /**
     * Show perks menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTitleLineCentered(0, 'Perks');
        
        // Perks section
        UI.addHeaderLine(5, 6, 'Learned Perks');
        
        if (gameState.perks.size === 0) {
            UI.addText(5, 8, 'No perks learned yet', COLORS.TEXT_DIM);
        } else {
            let y = 8;
            gameState.perks.forEach(perkId => {
                const perk = PERKS[perkId];
                if (perk) {
                    UI.addText(7, y++, `${perk.name}`, COLORS.GREEN);
                    UI.addText(9, y++, perk.description, COLORS.TEXT_DIM);
                }
            });
        }
        
        // Back button
        UI.addCenteredButton(grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
