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
        },
        ['Proxima'] // Related systems
    ),
    
    ATTAIN_VISA: new Quest(
        'ATTAIN_VISA',
        'Attain Proxima Visa',
        'Upgrade your citizenship to Visa status at Proxima',
        2000,
        (gameState) => {
            // Check if player has Visa or higher at Proxima
            const proximaIndex = gameState.systems.findIndex(s => s.name === 'Proxima');
            if (proximaIndex !== -1) {
                const proximaRankId = gameState.systemRanks[proximaIndex] || 'NONE';
                const proximaRank = RANKS[proximaRankId] || RANKS.NONE;
                return proximaRank.level >= RANKS.VISA.level;
            }
            return false;
        },
        (gameState) => {
            // Add completion message
            gameState.messages.push(MESSAGES.VISA_ATTAINED);
        },
        ['Proxima'] // Related systems
    ),
    
    LEARN_CARGO_HANDLING: new Quest(
        'LEARN_CARGO_HANDLING',
        'Learn Cargo Handling',
        'Visit the Guild and learn the Cargo Handling: Fragile skill',
        4000,
        (gameState) => {
            // Check if player has learned CARGO_FRAGILE perk
            return gameState.perks.has('CARGO_FRAGILE');
        },
        (gameState) => {
            // Add completion message
            gameState.messages.push(MESSAGES.CARGO_HANDLING_ATTAINED);
        },
        ['Proxima'] // Related systems
    ),
    
    LEARN_SHIP_HANDLING: new Quest(
        'LEARN_SHIP_HANDLING',
        'Learn Ship Handling',
        'Visit the Guild and learn the Ship License: Mercantile',
        8000,
        (gameState) => {
            // Check if player has learned SHIP_MERCANTILE perk
            return gameState.perks.has('SHIP_MERCANTILE');
        },
        (gameState) => {
            // TODO: Add next message when ready
        },
        ['Proxima'] // Related systems
    )
};
