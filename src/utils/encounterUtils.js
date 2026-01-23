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
            const messages = DIALOGUE.getEnemyRadarAdvantageMessages(enemyName);
            messages.forEach(msg => {
                UI.addText(10, y++, msg.text, msg.color);
            });
            y++;
        }
        return y;
    }

    /**
     * Display player radar advantage message
     * Shows success message and explains enemy shields are down
     * @param {GameState} gameState - Current game state
     * @param {number} y - Current y position for rendering
     * @param {string} enemyName - Name of enemy type (e.g., "Pirates", "Police", "Merchants")
     * @returns {number} Updated y position after rendering message
     */
    function showPlayerRadarAdvantage(gameState, y, enemyName = "Enemy") {
        if (gameState.playerRadarAdvantage) {
            const messages = DIALOGUE.getPlayerRadarAdvantageMessages(enemyName);
            messages.forEach(msg => {
                UI.addText(10, y++, msg.text, msg.color);
            });
            y++;
        }
        return y;
    }

    return {
        showRadarAdvantageWarning,
        showPlayerRadarAdvantage
    };
})();
