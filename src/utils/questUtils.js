/**
 * Quest Utility Functions
 * Helper functions for quest-related operations
 */

/**
 * Update the systemsWithQuests array based on active quests
 * @param {GameState} gameState - Current game state
 */
function updateSystemsWithQuests(gameState) {
    const questSystemNames = new Set();
    
    // Collect all system names from active quests
    gameState.activeQuests.forEach(questId => {
        const quest = QUESTS[questId];
        if (quest && quest.relatedSystems) {
            quest.relatedSystems.forEach(systemName => {
                questSystemNames.add(systemName);
            });
        }
    });
    
    // Convert system names to indices
    gameState.systemsWithQuests = [];
    gameState.systems.forEach((system, index) => {
        if (questSystemNames.has(system.name)) {
            gameState.systemsWithQuests.push(index);
        }
    });
}
