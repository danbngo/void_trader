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
        UI.clearAll();
        UI.clearButtons();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(3, '=== THE VOID BECKONS ===', COLORS.TITLE);
        
        // Story text
        UI.addTextCentered(6, 'You are a novice trader, fresh from the', COLORS.TEXT_NORMAL);
        UI.addTextCentered(7, 'academy, with dreams of fortune and glory.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(9, 'Your uncle, a legendary void trader, has', COLORS.TEXT_NORMAL);
        UI.addTextCentered(10, 'passed away, leaving you his ship and', COLORS.TEXT_NORMAL);
        UI.addTextCentered(11, 'a modest sum of credits.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(13, 'The galaxy is vast and dangerous, but', COLORS.TEXT_NORMAL);
        UI.addTextCentered(14, 'opportunity awaits those bold enough to', COLORS.TEXT_NORMAL);
        UI.addTextCentered(15, 'traverse the void between stars.', COLORS.TEXT_NORMAL);
        
        // Ship and credit info
        UI.addTextCentered(18, `Your Ship: ${gameState.ship.name}`, COLORS.CYAN);
        UI.addTextCentered(19, `Starting Credits: ${gameState.credits} CR`, COLORS.GREEN);
        
        UI.addTextCentered(21, 'Will you make your fortune in the void?', COLORS.TEXT_DIM);
        UI.addTextCentered(22, 'Or perish among the stars?', COLORS.TEXT_DIM);
        
        // Continue button
        UI.setButtons([
            {
                label: 'Begin Your Journey',
                callback: () => GalaxyMap.show(gameState),
                color: COLORS.BUTTON,
                x: Math.floor(grid.width / 2) - 12,
                y: grid.height - 4
            }
        ]);
        
        // Set this screen as the redraw target
        UI.setRedrawCallback(() => show(gameState));
        
        // Debug output
        UI.debugUI();
    }
    
    return {
        show
    };
})();
