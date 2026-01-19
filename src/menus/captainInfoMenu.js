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
        UI.clearAll();
        UI.clearButtons();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTextCentered(3, '=== CAPTAIN INFO ===', COLORS.TITLE);
        
        // Credits
        UI.addText(5, 6, 'Credits:', COLORS.TEXT_DIM);
        UI.addText(20, 6, `${gameState.credits} CR`, COLORS.YELLOW);
        
        // Current location
        const currentSystem = gameState.getCurrentSystem();
        UI.addText(5, 8, 'Location:', COLORS.TEXT_DIM);
        UI.addText(20, 8, currentSystem.name, COLORS.CYAN);
        
        // Crew section
        UI.addText(5, 11, '=== CREW ===', COLORS.TITLE);
        
        if (gameState.officers.length === 0) {
            UI.addText(5, 13, 'No crew members', COLORS.TEXT_DIM);
        } else {
            const startY = 13;
            UI.addText(5, startY, 'Name', COLORS.TEXT_DIM);
            UI.addText(25, startY, 'Role', COLORS.TEXT_DIM);
            UI.addText(40, startY, 'Skill', COLORS.TEXT_DIM);
            
            gameState.officers.forEach((officer, index) => {
                const y = startY + 2 + index;
                UI.addText(5, y, officer.name, COLORS.TEXT_NORMAL);
                UI.addText(25, y, officer.role, COLORS.TEXT_NORMAL);
                UI.addText(40, y, String(officer.skill), COLORS.GREEN);
            });
        }
        
        // Back button
        UI.setButtons([
            {
                key: '0',
                label: 'Back',
                callback: onReturn,
                color: COLORS.BUTTON,
                x: 5,
                y: grid.height - 4
            }
        ]);
        
        // Set this screen as the redraw target
        UI.setRedrawCallback(() => show(onReturn));
        
        // Debug output
        UI.debugUI();
    }
    
    return {
        show
    };
})();
