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
        baseLasers: AVERAGE_SHIP_LASER * 0.25,
        baseEngine: AVERAGE_SHIP_ENGINE * 1.5,
        baseRadar: AVERAGE_SHIP_RADAR * 0.25
    },
    SCOUT: {
        id: 'SCOUT',
        name: 'Scout',
        description: 'Fast and efficient with extended range',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER * 1,
        baseEngine: AVERAGE_SHIP_ENGINE * 2,
        baseRadar: AVERAGE_SHIP_RADAR * 2,
        defaultModule: 'ENHANCED_SCANNER'
    },
    FREIGHTER: {
        id: 'FREIGHTER',
        name: 'Freighter',
        description: 'Medium cargo hauler with good capacity',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 0.5,
        baseLasers: AVERAGE_SHIP_LASER * 0.25,
        baseEngine: AVERAGE_SHIP_ENGINE * 1,
        baseRadar: AVERAGE_SHIP_RADAR * 0.5
    },
    HAULER: {
        id: 'HAULER',
        name: 'Hauler',
        description: 'Massive cargo capacity, slow but durable',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 2,
        baseMaxHull: AVERAGE_SHIP_HULL * 1.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER * 0.5,
        baseEngine: AVERAGE_SHIP_ENGINE * 0.5,
        baseRadar: AVERAGE_SHIP_RADAR * 0.5,
        defaultModule: 'SOLAR_COLLECTORS'
    },
    CORVETTE: {
        id: 'CORVETTE',
        name: 'Corvette',
        description: 'Military surplus with strong hull',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 0.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1,
        baseMaxHull: AVERAGE_SHIP_HULL * 1.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1.5,
        baseLasers: AVERAGE_SHIP_LASER * 1.5,
        baseEngine: AVERAGE_SHIP_ENGINE * 1,
        baseRadar: AVERAGE_SHIP_RADAR * 1
    },
    RAIDER: {
        id: 'RAIDER',
        name: 'Raider',
        description: 'Fast attack vessel with heavy firepower',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 0.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER * 2,
        baseEngine: AVERAGE_SHIP_ENGINE * 1.5,
        baseRadar: AVERAGE_SHIP_RADAR * 1.5,
        defaultModule: 'SELF_DESTRUCT'
    },
    DESTROYER: {
        id: 'DESTROYER',
        name: 'Destroyer',
        description: 'Heavy military warship with superior defenses',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1,
        baseMaxHull: AVERAGE_SHIP_HULL * 2,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1.5,
        baseLasers: AVERAGE_SHIP_LASER * 3,
        baseEngine: AVERAGE_SHIP_ENGINE * 1,
        baseRadar: AVERAGE_SHIP_RADAR * 3,
        defaultModule: 'DISRUPTER'
    },
    BATTLESHIP: {
        id: 'BATTLESHIP',
        name: 'Battleship',
        description: 'Massive capital ship with devastating firepower',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 2,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 4,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 3,
        baseLasers: AVERAGE_SHIP_LASER * 2,
        baseEngine: AVERAGE_SHIP_ENGINE * 2,
        baseRadar: AVERAGE_SHIP_RADAR * 2,
        defaultModule: 'WARHEAD'
    },
    TANKER: {
        id: 'TANKER',
        name: 'Tanker',
        description: 'Sturdy commercial vessel with massive fuel reserves',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 3,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 2,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER * 0.5,
        baseEngine: AVERAGE_SHIP_ENGINE * 0.5,
        baseRadar: AVERAGE_SHIP_RADAR * 0.5,
        defaultModule: 'DRILL'
    },
    STEALTH_SHIP: {
        id: 'STEALTH_SHIP',
        name: 'Stealth Ship',
        description: 'Fast blockade runner with advanced shielding',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.75,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 2,
        baseLasers: AVERAGE_SHIP_LASER * 1,
        baseEngine: AVERAGE_SHIP_ENGINE * 2,
        baseRadar: AVERAGE_SHIP_RADAR * 1,
        defaultModule: 'CLOAK'
    },
    FIGHTER: {
        id: 'FIGHTER',
        name: 'Fighter',
        description: 'High-speed military attack craft with devastating DPS',
        baseMaxFuel: AVERAGE_SHIP_FUEL * 0.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 1,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER * 2.5,
        baseEngine: AVERAGE_SHIP_ENGINE * 2.5,
        baseRadar: AVERAGE_SHIP_RADAR * 2
    },
    PRESTIGE_TITAN: {
        id: 'PRESTIGE_TITAN',
        name: 'Titan',
        description: 'Prestige capital ship built with unrivaled craftsmanship',
        isPrestige: true,
        baseMaxFuel: AVERAGE_SHIP_FUEL * 3,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 2.25,
        baseMaxHull: AVERAGE_SHIP_HULL * 6,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 4.5,
        baseLasers: AVERAGE_SHIP_LASER * 3,
        baseEngine: AVERAGE_SHIP_ENGINE * 3,
        baseRadar: AVERAGE_SHIP_RADAR * 3,
        defaultModule: 'WARHEAD'
    },
    PRESTIGE_GUARDIAN: {
        id: 'PRESTIGE_GUARDIAN',
        name: 'Guardian',
        description: 'Prestige warship with superior armor and shields',
        isPrestige: true,
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1.5,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 1.5,
        baseMaxHull: AVERAGE_SHIP_HULL * 3,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 2.25,
        baseLasers: AVERAGE_SHIP_LASER * 4.5,
        baseEngine: AVERAGE_SHIP_ENGINE * 1.5,
        baseRadar: AVERAGE_SHIP_RADAR * 4.5,
        defaultModule: 'DISRUPTER'
    },
    PRESTIGE_RAPTOR: {
        id: 'PRESTIGE_RAPTOR',
        name: 'Raptor',
        description: 'Prestige interceptor engineered for overwhelming firepower',
        isPrestige: true,
        baseMaxFuel: AVERAGE_SHIP_FUEL * 0.75,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.75,
        baseMaxHull: AVERAGE_SHIP_HULL * 1.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1.5,
        baseLasers: AVERAGE_SHIP_LASER * 3.75,
        baseEngine: AVERAGE_SHIP_ENGINE * 3.75,
        baseRadar: AVERAGE_SHIP_RADAR * 3,
        defaultModule: 'ENHANCED_SCANNER'
    },
};

const ALIEN_SHIP_TYPES = {
    // Alien ship types (33% weaker than human ships)
    ALIEN_FIGHTER: {
        id: 'ALIEN_FIGHTER',
        name: 'Wasp',
        symbol: '҈',  // Alternatives: ◊ ◈ ⬧ ◇ ⟡ ⬥ ◆
        description: 'Small, fast alien fighter craft',
        isAlien: true,
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: 0,
        baseMaxHull: AVERAGE_SHIP_HULL * 0.25,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 0.5,
        baseLasers: AVERAGE_SHIP_LASER * 0.25,
        baseEngine: AVERAGE_SHIP_ENGINE * 1.5,
        baseRadar: AVERAGE_SHIP_RADAR * 0.5,
        defaultModule: 'BLINK'
    },
    ALIEN_BOMBER: {
        id: 'ALIEN_BOMBER',
        name: 'Hornet',
        symbol: 'Ѧ',  // Alternatives: ▲ ▼ ◄ ► ⯁ ⮝ ⯅ △
        description: 'Slow, heavily armed alien bomber',
        isAlien: true,
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.1,
        baseMaxHull: AVERAGE_SHIP_HULL * 0.25,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 1,
        baseLasers: AVERAGE_SHIP_LASER * 1,
        baseEngine: AVERAGE_SHIP_ENGINE * 0.5,
        baseRadar: AVERAGE_SHIP_RADAR * 1,
        defaultModule: 'TRACTOR_BEAM'
    },
    ALIEN_MOTHERSHIP: {
        id: 'ALIEN_MOTHERSHIP',
        name: 'Queen',
        symbol: '⊙',  // Alternatives: ● ◉ ◯ ⬤ ⭕ ◙ ◘ ⊙
        description: 'Sturdy alien command vessel',
        isAlien: true,
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: AVERAGE_SHIP_CARGO * 0.25,
        baseMaxHull: AVERAGE_SHIP_HULL * 0.5,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 3,
        baseLasers: AVERAGE_SHIP_LASER * 0.5,
        baseEngine: AVERAGE_SHIP_ENGINE * 1,
        baseRadar: AVERAGE_SHIP_RADAR * 1.5,
        defaultModule: 'SHIELD_RECHARGER'
    },
    ALIEN_GUARDIAN: {
        id: 'ALIEN_GUARDIAN',
        name: 'Beetle',
        symbol: '◙',  // Alternatives: ◙ ⬢ ⬡ ◘
        description: 'Heavily shielded alien defender',
        isAlien: true,
        baseMaxFuel: AVERAGE_SHIP_FUEL * 1,
        baseCargoCapacity: 0,
        baseMaxHull: AVERAGE_SHIP_HULL * 0.3,
        baseMaxShields: AVERAGE_SHIP_SHIELDS * 2.5,
        baseLasers: AVERAGE_SHIP_LASER * 0.5,
        baseEngine: AVERAGE_SHIP_ENGINE * 0.5,
        baseRadar: AVERAGE_SHIP_RADAR * 1,
        defaultModule: 'REPULSOR'
    },
}

// Array of all ship types for iteration
const ALL_SHIP_TYPES = Object.values(SHIP_TYPES).filter(type => !type.isPrestige);
const PRESTIGE_SHIP_TYPES = [SHIP_TYPES.PRESTIGE_TITAN, SHIP_TYPES.PRESTIGE_GUARDIAN, SHIP_TYPES.PRESTIGE_RAPTOR];

const SHIP_TYPES_BASIC = [SHIP_TYPES.SHUTTLE, SHIP_TYPES.SCOUT]
const SHIP_TYPES_MERCANTILE = [SHIP_TYPES.FREIGHTER, SHIP_TYPES.HAULER, SHIP_TYPES.TANKER]
const SHIP_TYPES_PARAMILITARY = [SHIP_TYPES.CORVETTE, SHIP_TYPES.RAIDER, SHIP_TYPES.STEALTH_SHIP]
const SHIP_TYPES_MILITARY = [
    SHIP_TYPES.DESTROYER,
    SHIP_TYPES.BATTLESHIP,
    SHIP_TYPES.FIGHTER,
    SHIP_TYPES.PRESTIGE_TITAN,
    SHIP_TYPES.PRESTIGE_GUARDIAN,
    SHIP_TYPES.PRESTIGE_RAPTOR
]
const SHIP_TYPES_ALIEN = [ALIEN_SHIP_TYPES.ALIEN_FIGHTER, ALIEN_SHIP_TYPES.ALIEN_BOMBER, ALIEN_SHIP_TYPES.ALIEN_MOTHERSHIP, ALIEN_SHIP_TYPES.ALIEN_GUARDIAN, ALIEN_SHIP_TYPES.ALIEN_GNAT]