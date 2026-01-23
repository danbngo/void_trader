/**
 * DIALOGUE.js
 * Consolidated dialogue and message text for encounters
 */

const DIALOGUE = (() => {
    /**
     * Get radar advantage warning messages (enemy detected player first)
     * @param {string} enemyName - Name of enemy type (e.g., "Pirates", "Police", "Merchants")
     * @returns {Array<Object>} Array of message objects with text and color
     */
    function getEnemyRadarAdvantageMessages(enemyName = "Enemy") {
        return [
            { text: `WARNING: Your radar did not detect the ${enemyName} aproaching!`, color: COLORS.YELLOW },
            { text: `Your shields have not been raised!`, color: COLORS.TEXT_ERROR }
        ];
    }

    /**
     * Get player radar advantage messages (player caught enemy unaware)
     * @param {string} enemyName - Name of enemy type (e.g., "Pirates", "Police", "Merchants")
     * @returns {Array<Object>} Array of message objects with text and color
     */
    function getPlayerRadarAdvantageMessages(enemyName = "Enemy") {
        return [
            { text: `SUCCESS: You caught the ${enemyName} unaware!`, color: COLORS.GREEN },
            { text: `Their shields are down!`, color: COLORS.CYAN }
        ];
    }

    return {
        getEnemyRadarAdvantageMessages,
        getPlayerRadarAdvantageMessages
    };
})();
