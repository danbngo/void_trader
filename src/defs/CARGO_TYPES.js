/**
 * Cargo Type Definitions
 * Defines all tradeable cargo types in the game
 */

const CARGO_TYPES = {
    AIR: {
        id: 'AIR',
        name: 'Air',
        description: 'Compressed breathable atmosphere for life support systems',
        baseValue: 50
    },
    WATER: {
        id: 'WATER',
        name: 'Water',
        description: 'Purified water essential for human survival',
        baseValue: 30
    },
    FOOD: {
        id: 'FOOD',
        name: 'Food',
        description: 'Preserved rations and nutrition supplies',
        baseValue: 40
    },
};

// Array of all cargo types for iteration
const ALL_CARGO_TYPES = Object.values(CARGO_TYPES);
