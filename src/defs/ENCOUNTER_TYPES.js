/**
 * Encounter Type Definitions
 * Defines types of encounters the player can have in space
 */

const ENCOUNTER_TYPES = {
    POLICE: {
        id: 'POLICE',
        name: 'Police',
        color: COLORS.BLUE,
        description: 'Law enforcement patrol scanning for illegal cargo and fugitives',
        shipTypes: ['CORVETTE', 'DESTROYER'],
        cargoTypes: [],
        maxCredits: 500,
        minShips: 1,
        maxShips: 3,
        surrenderPermitted: true,
        onGreet: function(gameState, encType) {
            EncounterDecisionMenu.show(gameState, encType);
        }
    },
    MERCHANT: {
        id: 'MERCHANT',
        name: 'Merchant',
        color: COLORS.YELLOW,
        description: 'Fellow trader looking to exchange goods or information',
        shipTypes: ['FREIGHTER', 'HAULER'],
        cargoTypes: [...ALL_CARGO_TYPES.filter(ct=>(!ct.illegal))],
        maxCredits: 2000,
        minShips: 1,
        maxShips: 3,
        surrenderPermitted: true,
        onGreet: function(gameState, encType) {
            EncounterDecisionMenu.show(gameState, encType);
        }
    },
    PIRATE: {
        id: 'PIRATE',
        name: 'Pirate',
        color: COLORS.TEXT_ERROR,
        description: 'Hostile vessel demanding cargo or credits',
        shipTypes: ['SCOUT', 'RAIDER', 'CORVETTE'],
        cargoTypes: [...ALL_CARGO_TYPES.filter(ct=>(ct.illegal))],
        maxCredits: 1000,
        minShips: 1,
        maxShips: 3,
        surrenderPermitted: true,
        onGreet: function(gameState, encType) {
            EncounterDecisionMenu.show(gameState, encType);
        }
    },
    ABANDONED_SHIP: {
        id: 'ABANDONED_SHIP',
        name: 'Abandoned Ship',
        color: COLORS.TEXT_DIM,
        description: 'Derelict vessel floating in space with salvageable cargo',
        shipTypes: ['SHUTTLE', 'SCOUT', 'FREIGHTER', 'HAULER', 'RAIDER', 'CORVETTE', 'DESTROYER'],
        cargoTypes: [...ALL_CARGO_TYPES],
        maxCredits: 0,
        minShips: 1,
        maxShips: 3,
        surrenderPermitted: true,
        onGreet: function(gameState, encType) {
            AbandonedShipEncounter.show(gameState, encType);
        }
    },
    ALIEN_SKIRMISH: {
        id: 'ALIEN_SKIRMISH',
        name: 'Alien Skirmish',
        color: COLORS.PURPLE,
        description: 'Hostile alien vessels attacking without warning',
        shipTypes: SHIP_TYPES_ALIEN,
        cargoTypes: [CARGO_TYPES.RELICS],
        maxCredits: 0,
        minShips: 3,
        maxShips: 6,
        surrenderPermitted: false,
        onGreet: function(gameState, encType) {
            AlienSkirmishEncounter.show(gameState, encType);
        }
    },
    ALIEN_DEFENSE: {
        id: 'ALIEN_DEFENSE',
        name: 'Alien Defense',
        color: COLORS.PURPLE,
        description: 'Alien defense forces protecting their territory',
        shipTypes: SHIP_TYPES_ALIEN,
        cargoTypes: [CARGO_TYPES.RELICS],
        maxCredits: 0,
        minShips: 6,
        maxShips: 9,
        surrenderPermitted: false,
        onGreet: function(gameState, encType) {
            AlienDefenseEncounter.show(gameState, encType);
        }
    }
};

// Array of all encounter types for iteration
const ALL_ENCOUNTER_TYPES = Object.values(ENCOUNTER_TYPES);
