/**
 * Ship Type Definitions
 * Defines different ship types with base stats
 */

const SHIP_TYPES = {
    SHUTTLE: {
        id: 'SHUTTLE',
        name: 'Shuttle',
        description: 'Small personal transport craft',
        baseMaxFuel: 80,
        baseCargoCapacity: 30,
        baseMaxHull: 60
    },
    FREIGHTER: {
        id: 'FREIGHTER',
        name: 'Freighter',
        description: 'Medium cargo hauler with good capacity',
        baseMaxFuel: 120,
        baseCargoCapacity: 100,
        baseMaxHull: 100
    },
    TRADER: {
        id: 'TRADER',
        name: 'Trader',
        description: 'Balanced vessel for commerce',
        baseMaxFuel: 100,
        baseCargoCapacity: 50,
        baseMaxHull: 80
    },
    SCOUT: {
        id: 'SCOUT',
        name: 'Scout',
        description: 'Fast and efficient with extended range',
        baseMaxFuel: 150,
        baseCargoCapacity: 40,
        baseMaxHull: 70
    },
    HAULER: {
        id: 'HAULER',
        name: 'Hauler',
        description: 'Massive cargo capacity, slow but durable',
        baseMaxFuel: 100,
        baseCargoCapacity: 150,
        baseMaxHull: 120
    },
    CORVETTE: {
        id: 'CORVETTE',
        name: 'Corvette',
        description: 'Military surplus with strong hull',
        baseMaxFuel: 90,
        baseCargoCapacity: 35,
        baseMaxHull: 150
    }
};

// Array of all ship types for iteration
const ALL_SHIP_TYPES = Object.values(SHIP_TYPES);
