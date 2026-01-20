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
        illegal: false,
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
    HOLOCUBES: {
        id: 'HOLOCUBES',
        name: 'Holocubes',
        description: 'Entertainment and data storage cubes',
        baseValue: 100,
        illegal: false
    },
    MEDICINE: {
        id: 'MEDICINE',
        name: 'Medicine',
        description: 'Medical supplies and pharmaceuticals',
        baseValue: 150,
        illegal: false
    },
    NANITES: {
        id: 'NANITES',
        name: 'Nanites',
        description: 'Programmable nanomachines for advanced manufacturing',
        baseValue: 200,
        illegal: false
    },
    PLASMA: {
        id: 'PLASMA',
        name: 'Plasma',
        description: 'Ionized gas used in advanced energy systems',
        baseValue: 500,
        illegal: false
    },
    FUEL: {
        id: 'FUEL',
        name: 'Fuel',
        description: 'Refined starship fuel for FTL drives',
        baseValue: 750,
        illegal: false
    },
    ISOTOPES: {
        id: 'ISOTOPES',
        name: 'Isotopes',
        description: 'Radioactive heavy metals for power generation and research',
        baseValue: 1000,
        illegal: false
    },
    WEAPONS: {
        id: 'WEAPONS',
        name: 'Weapons',
        description: 'Military-grade weaponry - illegal in most systems',
        baseValue: 4000,
        illegal: true
    },
    DRUGS: {
        id: 'DRUGS',
        name: 'Drugs',
        description: 'Illegal narcotics - heavily restricted',
        baseValue: 6000,
        illegal: true
    },
    ANTIMATTER: {
        id: 'ANTIMATTER',
        name: 'Antimatter',
        description: 'Highly volatile antimatter fuel - illegal to transport',
        baseValue: 8000,
        illegal: true
    }
};

// Array of all cargo types for iteration
const ALL_CARGO_TYPES = Object.values(CARGO_TYPES);

const CARGO_TYPES_SAFE = [CARGO_TYPES.AIR, CARGO_TYPES.WATER, CARGO_TYPES.FOOD];
const CARGO_TYPES_FRAGILE = [CARGO_TYPES.HOLOCUBES, CARGO_TYPES.MEDICINE, CARGO_TYPES.NANITES];
const CARGO_TYPES_DANGEROUS = [CARGO_TYPES.PLASMA, CARGO_TYPES.FUEL, CARGO_TYPES.ISOTOPES];
const CARGO_TYPES_ILLEGAL = [CARGO_TYPES.WEAPONS, CARGO_TYPES.DRUGS, CARGO_TYPES.ANTIMATTER];