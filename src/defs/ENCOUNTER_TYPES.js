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
        onGreet: function(gameState, encType) {
            AbandonedShipEncounter.show(gameState, encType);
        }
    }
};

// Array of all encounter types for iteration
const ALL_ENCOUNTER_TYPES = Object.values(ENCOUNTER_TYPES);
