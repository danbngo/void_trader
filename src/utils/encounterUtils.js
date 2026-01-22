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
            UI.addText(10, y++, `WARNING: ${enemyName} detected you first!`, COLORS.TEXT_ERROR);
            UI.addText(10, y++, `All shields disabled by surprise approach.`, COLORS.TEXT_ERROR);
            y++;
        }
        return y;
    }

    return {
        showRadarAdvantageWarning
    };
})();
