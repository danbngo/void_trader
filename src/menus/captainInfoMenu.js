/**
 * Captain Info Menu
 * Shows captain and crew information
 */

const CaptainInfoMenu = (() => {
    /**
     * Show captain information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTextCentered(3, '=== CAPTAIN INFO ===', COLORS.TITLE);
        
        // Captain details
        const currentSystem = gameState.getCurrentSystem();
        TableRenderer.renderKeyValueList(5, 6, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.YELLOW },
            { label: 'Location:', value: currentSystem.name, valueColor: COLORS.CYAN }
        ]);
        
        // Crew section
        UI.addText(5, 10, '=== CREW ===', COLORS.TITLE);
        
        if (gameState.officers.length === 0) {
            UI.addText(5, 12, 'No crew members', COLORS.TEXT_DIM);
        } else {
            const rows = gameState.officers.map(officer => [
                { text: officer.name, color: COLORS.TEXT_NORMAL },
                { text: officer.role, color: COLORS.TEXT_NORMAL },
                { text: String(officer.skill), color: COLORS.GREEN }
            ]);
            TableRenderer.renderTable(5, 12, ['Name', 'Role', 'Skill'], rows);
        }
        
        // Back button
        UI.addButton(5, grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
