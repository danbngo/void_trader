/**
 * Introduction Screen
 * Shows the game intro story
 */

const IntroScreen = (() => {
    /**
     * Show the introduction
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(3, 'The Void Beckons', COLORS.TITLE);
        
        // Story text
        UI.addTextCentered(6, 'You are a novice trader, fresh from the', COLORS.TEXT_NORMAL);
        UI.addTextCentered(7, 'academy, with dreams of fortune and glory.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(9, 'Your uncle, a legendary void trader, has', COLORS.TEXT_NORMAL);
        UI.addTextCentered(10, 'passed away, leaving you his ship and', COLORS.TEXT_NORMAL);
        UI.addTextCentered(11, 'a modest sum of credits.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(13, 'The galaxy is vast and dangerous, but', COLORS.TEXT_NORMAL);
        UI.addTextCentered(14, 'opportunity awaits those bold enough to', COLORS.TEXT_NORMAL);
        UI.addTextCentered(15, 'traverse the void between stars.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(17, 'You have 50 years until retirement.', COLORS.YELLOW);
        UI.addTextCentered(18, 'Accumulate as many credits as possible!', COLORS.YELLOW);
        
        // Ship and credit info
        UI.addTextCentered(21, `Your Ship: ${gameState.ship.name}`, COLORS.CYAN);
        UI.addTextCentered(22, `Starting Credits: ${gameState.credits} CR`, COLORS.GREEN);
        
        UI.addTextCentered(24, 'Will you make your fortune in the void?', COLORS.TEXT_DIM);
        UI.addTextCentered(25, 'Or perish among the stars?', COLORS.TEXT_DIM);
        
        // Continue button
        UI.addButton(Math.floor(grid.width / 2) - 12, grid.height - 4, '1', 'Begin Your Journey', () => DockMenu.show(gameState), COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
