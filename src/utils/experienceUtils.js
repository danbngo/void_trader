/**
 * Experience Utilities
 * Helper functions for granting experience and managing level ups
 */

const ExperienceUtils = (() => {
    /**
     * Grant experience to the player officer and generate a message
     * @param {GameState} gameState - Current game state
     * @param {number} expAmount - Amount of experience to grant
     * @param {string} reason - Reason for the experience (e.g., "Trading", "Combat Victory")
     * @returns {string} Formatted message for display (with color codes)
     */
    function grantExperience(gameState, expAmount, reason) {
        const playerOfficer = gameState.captain;
        if (!playerOfficer) return '';
        
        const roundedExp = Math.floor(expAmount);
        if (roundedExp <= 0) return '';
        
        const leveledUp = playerOfficer.grantExperience(roundedExp);
        
        let message = `+${roundedExp} XP (${reason})`;
        if (leveledUp) {
            message += ' (Level Up!)';
        }
        
        return message;
    }
    
    /**
     * Get colored components for experience message
     * @param {GameState} gameState - Current game state
     * @param {number} expAmount - Amount of experience to grant
     * @param {string} reason - Reason for the experience
     * @returns {Object|null} Object with { baseMessage, baseMsgColor, levelUpText, levelUpColor } or null if no exp granted
     */
    function getExperienceMessageComponents(gameState, expAmount, reason) {
        const playerOfficer = gameState.captain;
        if (!playerOfficer) return null;
        
        const roundedExp = Math.floor(expAmount);
        if (roundedExp <= 0) return null;
        
        const leveledUp = playerOfficer.grantExperience(roundedExp);
        
        return {
            baseMessage: `+${roundedExp} XP (${reason})`,
            baseMsgColor: COLORS.GREEN,
            levelUpText: leveledUp ? ' (Level Up!)' : '',
            levelUpColor: COLORS.YELLOW
        };
    }
    
    /**
     * Calculate fractional experience award
     * Grants experience probabilistically based on fraction
     * @param {number} baseExp - Base experience amount
     * @param {number} fraction - Fraction of the base (0-1)
     * @returns {number} Experience to grant (0 or baseExp based on probability)
     */
    function calculateFractionalExp(baseExp, fraction) {
        if (fraction >= 1) return baseExp;
        if (fraction <= 0) return 0;
        
        // Deterministic approach: grant exp in chunks
        const fullChunks = Math.floor(fraction);
        const remainder = fraction - fullChunks;
        
        let totalExp = fullChunks * baseExp;
        
        // Roll for the fractional part
        if (remainder > 0 && Math.random() < remainder) {
            totalExp += baseExp;
        }
        
        return totalExp;
    }
    
    return {
        grantExperience,
        getExperienceMessageComponents,
        calculateFractionalExp
    };
})();
