/**
 * Perk Definitions
 * Defines perks that can be learned to unlock new capabilities
 */

const PERKS = {
    CARGO_FRAGILE: {
        id: 'CARGO_FRAGILE',
        name: 'Cargo Handling: Fragile',
        description: 'Learn to handle fragile cargo types (Holocubes, Medicine, Nanites)',
        baseCost: 5000,
        requiredPerks: [] // First cargo perk - no requirements
    },
    CARGO_DANGEROUS: {
        id: 'CARGO_DANGEROUS',
        name: 'Cargo Handling: Dangerous',
        description: 'Learn to handle dangerous cargo types (Plasma, Fuel, Isotopes)',
        baseCost: 10000,
        requiredPerks: ['CARGO_FRAGILE'] // Requires fragile handling first
    },
    CARGO_ILLEGAL: {
        id: 'CARGO_ILLEGAL',
        name: 'Cargo Handling: Illegal',
        description: 'Learn to handle illegal cargo types (Weapons, Drugs, Antimatter)',
        baseCost: 20000,
        requiredPerks: ['CARGO_DANGEROUS'] // Requires dangerous handling first
    },
    SHIP_MERCANTILE: {
        id: 'SHIP_MERCANTILE',
        name: 'Ship License: Mercantile',
        description: 'License to pilot mercantile vessels (Freighter, Hauler)',
        baseCost: 5000,
        requiredPerks: [] // First ship perk - no requirements
    },
    SHIP_PARAMILITARY: {
        id: 'SHIP_PARAMILITARY',
        name: 'Ship License: Paramilitary',
        description: 'License to pilot paramilitary vessels (Corvette, Raider)',
        baseCost: 10000,
        requiredPerks: ['SHIP_MERCANTILE'] // Requires mercantile license first
    },
    SHIP_MILITARY: {
        id: 'SHIP_MILITARY',
        name: 'Ship License: Military',
        description: 'License to pilot military capital ships (Destroyer, Battleship)',
        baseCost: 20000,
        requiredPerks: ['SHIP_PARAMILITARY'] // Requires paramilitary license first
    }
};

// Array of all perks for iteration
const ALL_PERKS = Object.values(PERKS);
