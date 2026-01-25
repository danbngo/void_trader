/**
 * Quest Definitions
 * Pre-defined quests for the game
 */

const QUESTS = {
    LEARN_TO_TRADE: new Quest(
        'LEARN_TO_TRADE',
        'Learn to Trade',
        'Sell at least 1000 CR of goods',
        500,
        100,
        (gameState) => {
            // Check if player has bought AND sold at least 1000cr worth of goods
            //const totalBought = gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_BOUGHT] || 0;
            const totalSold = gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD] || 0;
            return totalSold >= 1000; //totalBought >= 1000 && 
        },
        'TRADING_BASICS_COMPLETE', // Message to add when complete
        [], // No specific related systems
        (gameState) => {
            const totalSold = gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD] || 0;
            return Math.min(1.0, totalSold / 1000);
        },
        'Goods Sold: 1000 CR'
    ),
    
    REACH_GUILD: new Quest(
        'REACH_GUILD',
        'Reach the Guild',
        'Travel to Proxima',
        1000,
        200,
        (gameState) => {
            // Check if current system has a guild
            const currentSystem = gameState.getCurrentSystem();
            return currentSystem && currentSystem.buildings.includes('GUILD');
        },
        'GUILD_REACHED', // Message to add when complete
        ['Proxima'], // Related systems
        null, // No progress tracking
        null
    ),
    
    ATTAIN_VISA: new Quest(
        'ATTAIN_VISA',
        'Gain Visa',
        'Acquire Visa at Proxima to use Guild services',
        2000,
        400,
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
        ['Proxima'], // Related systems
        (gameState) => {
            const visaCost = RANKS.VISA.fee;
            return Math.min(1.0, gameState.credits / visaCost);
        },
        'Credits vs Visa Cost'
    ),
    
    LEARN_CARGO_HANDLING: new Quest(
        'LEARN_CARGO_HANDLING',
        'Learn Cargo Handling',
        'Buy Cargo Handling: Fragile at Guild',
        4000,
        800,
        (gameState) => {
            // Check if player has learned CARGO_FRAGILE perk
            return gameState.perks.has('CARGO_FRAGILE');
        },
        'CARGO_HANDLING_ATTAINED', // Message to add when complete
        ['Proxima'], // Related systems
        (gameState) => {
            const perk = PERKS.CARGO_FRAGILE;
            const currentSystem = gameState.getCurrentSystem();
            const totalCost = Math.floor(perk.baseCost * (1 + currentSystem.fees));
            return Math.min(1.0, gameState.credits / totalCost);
        },
        (gameState) => {
            const perk = PERKS.CARGO_FRAGILE;
            const currentSystem = gameState.getCurrentSystem();
            const totalCost = Math.floor(perk.baseCost * (1 + currentSystem.fees));
            return `Credits: ${gameState.credits}/${totalCost}`;
        }
    ),
    
    LEARN_SHIP_HANDLING: new Quest(
        'LEARN_SHIP_HANDLING',
        'Learn Ship Handling',
        'Buy Ship License: Mercantile at Guild',
        8000,
        1600,
        (gameState) => {
            // Check if player has learned SHIP_MERCANTILE perk
            return gameState.perks.has('SHIP_MERCANTILE');
        },
        null, // No completion message yet
        ['Proxima'], // Related systems
        (gameState) => {
            const perk = PERKS.SHIP_MERCANTILE;
            const currentSystem = gameState.getCurrentSystem();
            const totalCost = Math.floor(perk.baseCost * (1 + currentSystem.fees));
            return Math.min(1.0, gameState.credits / totalCost);
        },
        (gameState) => {
            const perk = PERKS.SHIP_MERCANTILE;
            const currentSystem = gameState.getCurrentSystem();
            const totalCost = Math.floor(perk.baseCost * (1 + currentSystem.fees));
            return `Credits: ${gameState.credits}/${totalCost}`;
        }
    )
};
