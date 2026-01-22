/**
 * Encounter Utilities - Shared functions for encounter screens
 */

const EncounterUtils = (() => {
    /**
     * Display radar advantage warning if enemy detected player first
     * Shows warning message and explains shields are disabled
     * @param {GameState} gameState - Current game state
     * @param {number} y - Current y position for rendering
     * @param {string} enemyName - Name of enemy type (e.g., "Pirates", "Police", "Enemy")
     * @returns {number} Updated y position after rendering warning
     */
    function showRadarAdvantageWarning(gameState, y, enemyName = "Enemy") {
        if (gameState.enemyRadarAdvantage) {
            UI.addText(10, y++, `WARNING: Your radar did not detect the ${enemyName} aproaching!`, COLORS.YELLOW);
            UI.addText(10, y++, `Your shields have not been raised!`, COLORS.TEXT_ERROR);
            y++;
        }
        return y;
    }

    return {
        showRadarAdvantageWarning
    };
})();
