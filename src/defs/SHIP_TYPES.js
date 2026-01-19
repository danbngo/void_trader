/**
 * Ship Type Definitions
 * Defines different ship types with base stats
 */

const SHIP_TYPES = {
    SHUTTLE: {
        id: 'SHUTTLE',
        name: 'Shuttle',
        description: 'Small personal transport craft',
        baseMaxFuel: 10,
        baseCargoCapacity: 30,
        baseMaxHull: 60,
        baseMaxShields: 20,
        baseLasers: 1
    },
    FREIGHTER: {
        id: 'FREIGHTER',
        name: 'Freighter',
        description: 'Medium cargo hauler with good capacity',
        baseMaxFuel: 15,
        baseCargoCapacity: 100,
        baseMaxHull: 100,
        baseMaxShields: 40,
        baseLasers: 2
    },
    SCOUT: {
        id: 'SCOUT',
        name: 'Scout',
        description: 'Fast and efficient with extended range',
        baseMaxFuel: 15,
        baseCargoCapacity: 40,
        baseMaxHull: 70,
        baseMaxShields: 50,
        baseLasers: 3
    },
    HAULER: {
        id: 'HAULER',
        name: 'Hauler',
        description: 'Massive cargo capacity, slow but durable',
        baseMaxFuel: 10,
        baseCargoCapacity: 150,
        baseMaxHull: 120,
        baseMaxShields: 30,
        baseLasers: 2
    },
    CORVETTE: {
        id: 'CORVETTE',
        name: 'Corvette',
        description: 'Military surplus with strong hull',
        baseMaxFuel: 5,
        baseCargoCapacity: 35,
        baseMaxHull: 150,
        baseMaxShields: 80,
        baseLasers: 4
    },
    RAIDER: {
        id: 'RAIDER',
        name: 'Raider',
        description: 'Fast attack vessel with heavy firepower',
        baseMaxFuel: 10,
        baseCargoCapacity: 40,
        baseMaxHull: 180,
        baseMaxShields: 100,
        baseLasers: 6
    },
    DESTROYER: {
        id: 'DESTROYER',
        name: 'Destroyer',
        description: 'Heavy military warship with superior defenses',
        baseMaxFuel: 10,
        baseCargoCapacity: 50,
        baseMaxHull: 250,
        baseMaxShields: 150,
        baseLasers: 8
    },
    BATTLESHIP: {
        id: 'BATTLESHIP',
        name: 'Battleship',
        description: 'Massive capital ship with devastating firepower',
        baseMaxFuel: 15,
        baseCargoCapacity: 60,
        baseMaxHull: 350,
        baseMaxShields: 200,
        baseLasers: 12
    }
};

// Array of all ship types for iteration
const ALL_SHIP_TYPES = Object.values(SHIP_TYPES);
