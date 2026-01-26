/**
 * Ship Type Definitions
 * Defines different ship types with base stats
 */

const SHIP_TYPES = {
    SHUTTLE: {
        id: 'SHUTTLE',
        name: 'Shuttle',
        description: 'Basic starter ship with minimal capabilities',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.25,
        baseMaxHull: AVERAGE_SHIP_HULL * 0.25,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 0.25,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.25,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1.5,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 0.25
    },
    SCOUT: {
        id: 'SCOUT',
        name: 'Scout',
        description: 'Fast and efficient with extended range',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 1,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 2,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 2
    },
    FREIGHTER: {
        id: 'FREIGHTER',
        name: 'Freighter',
        description: 'Medium cargo hauler with good capacity',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 0.5,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.25,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 0.5
    },
    HAULER: {
        id: 'HAULER',
        name: 'Hauler',
        description: 'Massive cargo capacity, slow but durable',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 2,
        baseMaxHull: AVERAGE_SHIP_HULL * 1.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.5,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 0.5,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 0.5
    },
    CORVETTE: {
        id: 'CORVETTE',
        name: 'Corvette',
        description: 'Military surplus with strong hull',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 0.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1,
        baseMaxHull: AVERAGE_SHIP_HULL * 1.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1.5,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 1.5,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 1
    },
    RAIDER: {
        id: 'RAIDER',
        name: 'Raider',
        description: 'Fast attack vessel with heavy firepower',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 0.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 2,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1.5,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 1.5
    },
    DESTROYER: {
        id: 'DESTROYER',
        name: 'Destroyer',
        description: 'Heavy military warship with superior defenses',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1,
        baseMaxHull: AVERAGE_SHIP_HULL * 2,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1.5,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 3,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 3
    },
    BATTLESHIP: {
        id: 'BATTLESHIP',
        name: 'Battleship',
        description: 'Massive capital ship with devastating firepower',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 2,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 4,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 3,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 2,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 2,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 2
    },
};

const ALIEN_SHIP_TYPES = {
    
    // Alien ship types (33% weaker than human ships)
    ALIEN_FIGHTER: {
        id: 'ALIEN_FIGHTER',
        name: 'Fighter',
        description: 'Small alien fighter craft',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: 0,
        baseMaxHull: AVERAGE_SHIP_HULL * 0.25,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 0.5,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.5,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1.5,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 0.5
    },
    ALIEN_BOMBER: {
        id: 'ALIEN_BOMBER',
        name: 'Bomber',
        description: 'Heavily armed alien bomber',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.1,
        baseMaxHull: AVERAGE_SHIP_HULL * 0.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 1.5,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 1,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 1.5
    },
    ALIEN_MOTHERSHIP: {
        id: 'ALIEN_MOTHERSHIP',
        name: 'Mothership',
        description: 'Large alien command vessel',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.25,
        baseMaxHull: AVERAGE_SHIP_HULL * 1.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 2,
        baseLasers: AVERAGE_SHIP_LASER_LEVEL * 0.5,
        baseEngine: AVERAGE_SHIP_ENGINE_LEVEL * 0.5,
        baseRadar: AVERAGE_SHIP_RADAR_LEVEL * 0.5
    }
}

// Array of all ship types for iteration
const ALL_SHIP_TYPES = Object.values(SHIP_TYPES);

const SHIP_TYPES_BASIC = [SHIP_TYPES.SHUTTLE, SHIP_TYPES.SCOUT]
const SHIP_TYPES_MERCANTILE = [SHIP_TYPES.FREIGHTER, SHIP_TYPES.HAULER]
const SHIP_TYPES_PARAMILITARY = [SHIP_TYPES.CORVETTE, SHIP_TYPES.RAIDER]
const SHIP_TYPES_MILITARY = [SHIP_TYPES.DESTROYER, SHIP_TYPES.BATTLESHIP]
const SHIP_TYPES_ALIEN = [ALIEN_SHIP_TYPES.ALIEN_FIGHTER, ALIEN_SHIP_TYPES.ALIEN_BOMBER, ALIEN_SHIP_TYPES.ALIEN_MOTHERSHIP]