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
        UI.addTitleLineCentered(0, 'The Void Beckons');
        
        // Story text
        UI.addTextCentered(2, 'You are a novice trader, fresh from the', COLORS.TEXT_NORMAL);
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
        UI.addTextCentered(21, `Your Ships: ${gameState.ships.length}`, COLORS.CYAN);
        UI.addTextCentered(22, `Starting Credits: ${gameState.credits} CR`, COLORS.GREEN);
        
        UI.addTextCentered(24, 'Will you make your fortune in the void?', COLORS.TEXT_DIM);
        UI.addTextCentered(25, 'Or perish among the stars?', COLORS.TEXT_DIM);
        
        // Continue button
        UI.addCenteredButton(grid.height - 4, '1', 'Begin Your Journey', () => {
            const destination = getNearestSystem(gameState);
            if (destination) {
                gameState.destination = destination;
                SpaceTravelMap.show(gameState, destination);
            } else {
                DockMenu.show(gameState);
            }
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();

function getNearestSystem(gameState) {
    if (!gameState || !gameState.systems || gameState.systems.length === 0) {
        return null;
    }
    const current = gameState.getCurrentSystem();
    if (!current) {
        return gameState.systems[0];
    }
    let nearest = null;
    let nearestDist = Infinity;
    gameState.systems.forEach(system => {
        if (system === current) {
            return;
        }
        const dist = current.distanceTo(system);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = system;
        }
    });
    return nearest;
}
