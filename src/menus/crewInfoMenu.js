/**
 * Crew Info Menu
 * Shows crew and officer information
 */

const CrewInfoMenu = (() => {
    /**
     * Show crew information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTextCentered(3, 'Crew', COLORS.TITLE);
        
        if (gameState.officers.length === 0) {
            UI.addTextCentered(10, 'No crew members', COLORS.TEXT_DIM);
        } else {
            const rows = gameState.officers.map(officer => [
                { text: officer.name, color: COLORS.TEXT_NORMAL },
                { text: officer.role, color: COLORS.TEXT_NORMAL },
                { text: String(officer.skill), color: COLORS.GREEN }
            ]);
            TableRenderer.renderTable(5, 8, ['Name', 'Role', 'Skill'], rows, -1);
        }
        
        // Back button
        UI.addCenteredButton(grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
