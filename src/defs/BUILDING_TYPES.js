/**
 * Building Types
 * Defines different types of buildings that can appear in star systems
 */

const BUILDING_TYPES = {
    DOCK: {
        id: 'DOCK',
        name: 'Dock',
        description: 'Repair and refuel ships',
        generationChance: 1, // 100% chance - otherwise how to repair?
        minRankLevel: 0
    },
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
        description: 'Sell and purchase ships',
        generationChance: 1, // 100% chance - otherwise how to repair?
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
