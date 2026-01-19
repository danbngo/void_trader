/**
 * Cargo Type Definitions
 * Defines all tradeable cargo types in the game
 */

const CARGO_TYPES = {
    AIR: {
        id: 'AIR',
        name: 'Air',
        description: 'Compressed breathable atmosphere for life support systems',
        baseValue: 20,
        illegal: false
    },
    WATER: {
        id: 'WATER',
        name: 'Water',
        description: 'Purified water essential for human survival',
        baseValue: 30,
        illegal: false
    },
    FOOD: {
        id: 'FOOD',
        name: 'Food',
        description: 'Preserved rations and nutrition supplies',
        baseValue: 40,
        illegal: false
    },
    ISOTOPES: {
        id: 'ISOTOPES',
        name: 'Isotopes',
        description: 'Radioactive isotopes for power generation and research',
        baseValue: 80,
        illegal: false
    },
    FUEL: {
        id: 'FUEL',
        name: 'Fuel',
        description: 'Refined starship fuel for FTL drives',
        baseValue: 100,
        illegal: false
    },
    METAL: {
        id: 'METAL',
        name: 'Metal',
        description: 'Refined metals for construction and manufacturing',
        baseValue: 120,
        illegal: false
    },
    HOLOCUBES: {
        id: 'HOLOCUBES',
        name: 'Holocubes',
        description: 'Entertainment and data storage cubes',
        baseValue: 150,
        illegal: false
    },
    MEDICINE: {
        id: 'MEDICINE',
        name: 'Medicine',
        description: 'Medical supplies and pharmaceuticals',
        baseValue: 180,
        illegal: false
    },
    NANITES: {
        id: 'NANITES',
        name: 'Nanites',
        description: 'Programmable nanomachines for advanced manufacturing',
        baseValue: 250,
        illegal: false
    },
    WEAPONS: {
        id: 'WEAPONS',
        name: 'Weapons',
        description: 'Military-grade weaponry - illegal in most systems',
        baseValue: 350,
        illegal: true
    },
    DRUGS: {
        id: 'DRUGS',
        name: 'Drugs',
        description: 'Illegal narcotics - heavily restricted',
        baseValue: 500,
        illegal: true
    },
    ANTIMATTER: {
        id: 'ANTIMATTER',
        name: 'Antimatter',
        description: 'Highly volatile antimatter fuel - illegal to transport',
        baseValue: 1000,
        illegal: true
    }
};

// Array of all cargo types for iteration
const ALL_CARGO_TYPES = Object.values(CARGO_TYPES);
