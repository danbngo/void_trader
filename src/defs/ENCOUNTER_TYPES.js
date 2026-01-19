/**
 * Encounter Type Definitions
 * Defines types of encounters the player can have in space
 */

const ENCOUNTER_TYPES = {
    POLICE: {
        id: 'POLICE',
        name: 'Police',
        description: 'Law enforcement patrol scanning for illegal cargo and fugitives',
        shipTypes: ['CORVETTE', 'DESTROYER'],
        onGreet: function(gameState) {
            // TODO: Implement police encounter logic
        }
    },
    MERCHANT: {
        id: 'MERCHANT',
        name: 'Merchant',
        description: 'Fellow trader looking to exchange goods or information',
        shipTypes: ['FREIGHTER', 'TRADER', 'HAULER'],
        onGreet: function(gameState) {
            // TODO: Implement merchant encounter logic
        }
    },
    PIRATE: {
        id: 'PIRATE',
        name: 'Pirate',
        description: 'Hostile vessel demanding cargo or credits',
        shipTypes: ['SCOUT', 'RAIDER', 'CORVETTE'],
        onGreet: function(gameState) {
            // TODO: Implement pirate encounter logic
        }
    }
};

// Array of all encounter types for iteration
const ALL_ENCOUNTER_TYPES = Object.values(ENCOUNTER_TYPES);
