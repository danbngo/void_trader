/**
 * Perk Definitions
 * Defines perks that can be learned to unlock new capabilities
 */

const PERKS = {
    CARGO_FRAGILE: {
        id: 'CARGO_FRAGILE',
        name: 'Cargo Handling: Fragile',
        description: 'Learn to handle fragile cargo types (Holocubes, Medicine, Nanites)',
        baseCost: 2000
    },
    CARGO_DANGEROUS: {
        id: 'CARGO_DANGEROUS',
        name: 'Cargo Handling: Dangerous',
        description: 'Learn to handle dangerous cargo types (Plasma, Fuel, Isotopes)',
        baseCost: 5000
    },
    CARGO_ILLEGAL: {
        id: 'CARGO_ILLEGAL',
        name: 'Cargo Handling: Illegal',
        description: 'Learn to handle illegal cargo types (Weapons, Drugs, Antimatter)',
        baseCost: 10000
    }
};

// Array of all perks for iteration
const ALL_PERKS = Object.values(PERKS);
