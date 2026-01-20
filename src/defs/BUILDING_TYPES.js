/**
 * Building Types
 * Defines different types of buildings that can appear in star systems
 */

const BUILDING_TYPES = {
    MARKET: {
        id: 'MARKET',
        name: 'Market',
        description: 'Buy and sell cargo',
        generationChance: 1.0, // 100% chance
        minRankLevel: 0
    },
    COURTHOUSE: {
        id: 'COURTHOUSE',
        name: 'Courthouse',
        description: 'Pay bounties and upgrade citizenship rank',
        generationChance: 1.0, // 100% chance
        minRankLevel: 0
    },
    SHIPYARD: {
        id: 'SHIPYARD',
        name: 'Shipyard',
        description: 'Manage and purchase ships',
        generationChance: 0.5, // 50% chance
        minRankLevel: 1
    },
    TAVERN: {
        id: 'TAVERN',
        name: 'Tavern',
        description: 'Gather information and rumors',
        generationChance: 0.5, // 50% chance
        minRankLevel: 1
    },
    GUILD: {
        id: 'GUILD',
        name: 'Merchant\'s Guild',
        description: 'Quest hub and trading organization',
        generationChance: 0.25, // 25% chance
        minRankLevel: 1
    }
};
