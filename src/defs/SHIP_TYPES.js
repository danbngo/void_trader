/**
 * Ship Type Definitions
 * Defines different ship types with base stats
 */

const SHIP_TYPES = {
    SHUTTLE: {
        id: 'SHUTTLE',
        name: 'Shuttle',
        description: 'Small personal transport craft',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.0,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 1.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 0.5,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.2
    },
    FREIGHTER: {
        id: 'FREIGHTER',
        name: 'Freighter',
        description: 'Medium cargo hauler with good capacity',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 5.0,
        baseMaxHull: AVERAGE_SHIP_HULL * 2.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1.0,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.4
    },
    SCOUT: {
        id: 'SCOUT',
        name: 'Scout',
        description: 'Fast and efficient with extended range',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 2.0,
        baseMaxHull: AVERAGE_SHIP_HULL * 1.75,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1.25,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.6
    },
    HAULER: {
        id: 'HAULER',
        name: 'Hauler',
        description: 'Massive cargo capacity, slow but durable',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.0,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 7.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 3.0,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 0.75,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.4
    },
    CORVETTE: {
        id: 'CORVETTE',
        name: 'Corvette',
        description: 'Military surplus with strong hull',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 0.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1.75,
        baseMaxHull: AVERAGE_SHIP_HULL * 3.75,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 2.0,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.8
    },
    RAIDER: {
        id: 'RAIDER',
        name: 'Raider',
        description: 'Fast attack vessel with heavy firepower',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.0,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 2.0,
        baseMaxHull: AVERAGE_SHIP_HULL * 4.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 2.5,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 1.2
    },
    DESTROYER: {
        id: 'DESTROYER',
        name: 'Destroyer',
        description: 'Heavy military warship with superior defenses',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.0,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 2.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 6.25,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 3.75,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 1.6
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
