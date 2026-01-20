/**
 * Guild Menu
 * Accept quests and missions
 */

const GuildMenu = (() => {
    /**
     * Show the guild menu
     * @param {GameState} state - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(state, onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const currentSystem = state.getCurrentSystem();
        
        // Title
        UI.addTextCentered(3, `${currentSystem.name}: GUILD`, COLORS.TITLE);
        
        // Placeholder content
        UI.addTextCentered(10, 'Guild missions coming soon...', COLORS.TEXT_DIM);
        
        // Back button
        const buttonY = grid.height - 4;
        UI.addButton(5, buttonY, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
