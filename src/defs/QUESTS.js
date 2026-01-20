/**
 * Quest Definitions
 * Pre-defined quests for the game
 */

const QUESTS = {
    REACH_GUILD: new Quest(
        'REACH_GUILD',
        'Reach the Guild',
        'Travel to the nearest star system with a Merchant\'s Guild',
        1000,
        (gameState) => {
            // Check if current system has a guild
            const currentSystem = gameState.getCurrentSystem();
            return currentSystem && currentSystem.buildings.includes('GUILD');
        },
        (gameState) => {
            // Add completion message
            gameState.messages.push(MESSAGES.GUILD_REACHED);
        }
    ),
    
    PLACEHOLDER_QUEST: new Quest(
        'PLACEHOLDER_QUEST',
        'To Be Determined',
        'More challenges await... (Placeholder quest)',
        5000,
        (gameState) => {
            // Placeholder - never completes
            return false;
        },
        null
    )
};
