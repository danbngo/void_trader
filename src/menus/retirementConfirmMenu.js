/**
 * Retirement Confirmation Menu
 * Asks player to confirm early retirement
 */

const RetirementConfirmMenu = (() => {
    /**
     * Show retirement confirmation menu
     * @param {GameState} gameState - Current game state
     * @param {number} score - Player's current score
     * @param {Function} onRetire - Callback when player confirms retirement
     * @param {Function} onCancel - Callback when player cancels
     */
    function show(gameState, score, onRetire, onCancel) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const centerX = Math.floor(grid.width / 2);
        let y = 8;
        
        // Warning header
        UI.addTextCentered(y++, '╔═══════════════════════════════════════════╗', COLORS.TEXT_ERROR);
        UI.addTextCentered(y++, '║   EARLY RETIREMENT CONFIRMATION           ║', COLORS.TEXT_ERROR);
        UI.addTextCentered(y++, '╚═══════════════════════════════════════════╝', COLORS.TEXT_ERROR);
        
        y += 2;
        
        // Warning message
        UI.addTextCentered(y++, 'Are you sure you want to retire early?', COLORS.TEXT_ERROR);
        y++;
        UI.addTextCentered(y++, 'This will end your current game and', COLORS.TEXT_NORMAL);
        UI.addTextCentered(y++, 'calculate your final score.', COLORS.TEXT_NORMAL);
        
        y += 2;
        
        // Show current stats
        const leftX = centerX - 20;
        UI.addText(leftX, y, 'Current Score:', COLORS.CYAN);
        UI.addText(leftX + 20, y++, score.toString(), COLORS.YELLOW);
        
        // Calculate years elapsed
        const startDate = new Date(3000, 0, 1);
        const yearsPassed = (gameState.date - startDate) / (1000 * 60 * 60 * 24 * 365.25);
        
        UI.addText(leftX, y, 'Years Elapsed:', COLORS.CYAN);
        UI.addText(leftX + 20, y++, `${yearsPassed.toFixed(1)} / 50.0`, COLORS.YELLOW);
        
        // Buttons at bottom
        const buttonY = grid.height - 4;
        UI.addCenteredButtons(buttonY, [
            { key: 'Y', label: 'Yes, retire early', callback: () => {
                if (onRetire) onRetire();
            }, color: COLORS.TEXT_ERROR, helpText: 'End your career and see final rank' },
            { key: '0', label: 'Cancel', callback: () => {
                if (onCancel) onCancel();
            }, color: COLORS.BUTTON, helpText: 'Continue playing' }
        ]);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
