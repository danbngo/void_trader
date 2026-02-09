/**
 * Main Game File
 * Void Trader - A text-based space trading game
 */

// Game state
const Game = {
    /**
     * Initialize the game
     */
    init() {
        UI.init();
        if (UI.testMonospaceFont) {
            const fontTest = UI.testMonospaceFont();
            console.log('[FontTest] Monospace check:', fontTest);
        }
        TitleMenu.show();
    }
};

// Start the game when the page loads
window.addEventListener('load', () => {
    Game.init();
});
