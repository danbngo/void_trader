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
        baseCost: 10000,
        requiredPerks: [] // First ship perk - no requirements
    },
    SHIP_PARAMILITARY: {
        id: 'SHIP_PARAMILITARY',
        name: 'Ship License: Paramilitary',
        description: 'License to pilot paramilitary vessels (Corvette, Raider)',
        baseCost: 20000,
        requiredPerks: ['SHIP_MERCANTILE'] // Requires mercantile license first
    },
    SHIP_MILITARY: {
        id: 'SHIP_MILITARY',
        name: 'Ship License: Military',
        description: 'License to pilot military capital ships (Destroyer, Battleship)',
        baseCost: 40000,
        requiredPerks: ['SHIP_PARAMILITARY'] // Requires paramilitary license first
    },
    LEADERSHIP_I: {
        id: 'LEADERSHIP_I',
        name: 'Leadership I',
        description: 'Increase maximum number of officers you can hire to 2',
        baseCost: 15000,
    },
    LEADERSHIP_II: {
        id: 'LEADERSHIP_II',
        name: 'Leadership II',
        description: 'Increase maximum number of officers you can hire to 3',
        baseCost: 30000,
        requiredPerks: ['LEADERSHIP_I']
    },
    LEADERSHIP_III: {
        id: 'LEADERSHIP_III',
        name: 'Leadership III',
        description: 'Increase maximum number of officers you can hire to 4',
        baseCost: 60000,
        requiredPerks: ['LEADERSHIP_II']
    },
    ENGINEERING_I: {
        id: 'ENGINEERING_I',
        name: 'Engineering I',
        description: 'Enable installation of 1 module per ship',
        baseCost: 15000,
        requiredPerks: []
    },
    ENGINEERING_II: {
        id: 'ENGINEERING_II',
        name: 'Engineering II',
        description: 'Enable installation of 2 modules per ship',
        baseCost: 30000,
        requiredPerks: ['ENGINEERING_I']
    },
    ENGINEERING_III: {
        id: 'ENGINEERING_III',
        name: 'Engineering III',
        description: 'Enable installation of 3 modules per ship',
        baseCost: 60000,
        requiredPerks: ['ENGINEERING_II']
    },
};

// Array of all perks for iteration
const ALL_PERKS = Object.values(PERKS);
