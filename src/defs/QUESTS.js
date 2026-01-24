/**
 * Quest Definitions
 * Pre-defined quests for the game
 */

const QUESTS = {
    LEARN_TO_TRADE: new Quest(
        'LEARN_TO_TRADE',
        'Learn to Trade',
        'Sell at least 1000 credits worth of goods',
        500,
        (gameState) => {
            // Check if player has bought AND sold at least 1000cr worth of goods
            //const totalBought = gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_BOUGHT] || 0;
            const totalSold = gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD] || 0;
            return totalSold >= 1000; //totalBought >= 1000 && 
        },
        'TRADING_BASICS_COMPLETE', // Message to add when complete
        [] // No specific related systems
    ),
    
    REACH_GUILD: new Quest(
        'REACH_GUILD',
        'Reach the Guild',
        'Travel to Proxima, a star system with a Merchant\'s Guild',
        1000,
        (gameState) => {
            // Check if current system has a guild
            const currentSystem = gameState.getCurrentSystem();
            return currentSystem && currentSystem.buildings.includes('GUILD');
        },
        'GUILD_REACHED', // Message to add when complete
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
        'VISA_ATTAINED', // Message to add when complete
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
        'CARGO_HANDLING_ATTAINED', // Message to add when complete
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
        null, // No completion message yet
        ['Proxima'] // Related systems
    )
};
