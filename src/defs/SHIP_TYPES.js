/**
 * Ship Type Definitions
 * Defines different ship types with base stats
 */

const SHIP_TYPES = {
    FREIGHTER: {
        id: 'FREIGHTER',
        name: 'Freighter',
        description: 'Medium cargo hauler with good capacity',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 3,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 0.5,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.25,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 0.5
    },
    SCOUT: {
        id: 'SCOUT',
        name: 'Scout',
        description: 'Fast and efficient with extended range',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 1,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 3,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 2
    },
    HAULER: {
        id: 'HAULER',
        name: 'Hauler',
        description: 'Massive cargo capacity, slow but durable',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 2,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 4,
        baseMaxHull: AVERAGE_SHIP_HULL * 2,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.25,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 0.5,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 0.5
    },
    CORVETTE: {
        id: 'CORVETTE',
        name: 'Corvette',
        description: 'Military surplus with strong hull',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 0.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 1.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 2,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 2,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 1
    },
    RAIDER: {
        id: 'RAIDER',
        name: 'Raider',
        description: 'Fast attack vessel with heavy firepower',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 0.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 2,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 2,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 1.5
    },
    DESTROYER: {
        id: 'DESTROYER',
        name: 'Destroyer',
        description: 'Heavy military warship with superior defenses',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.25,
        baseMaxHull: AVERAGE_SHIP_HULL * 2,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 2,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 4,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 3
    },
    BATTLESHIP: {
        id: 'BATTLESHIP',
        name: 'Battleship',
        description: 'Massive capital ship with devastating firepower',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 3,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1,
        baseMaxHull: AVERAGE_SHIP_HULL * 3,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 3,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 3,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 2,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 2
    }
};

// Array of all ship types for iteration
const ALL_SHIP_TYPES = Object.values(SHIP_TYPES);
