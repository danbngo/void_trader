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
        shipTypes: ['CORVETTE', 'DESTROYER', 'FIGHTER'],
        cargoTypes: [],
        possibleItems: [],
        maxCredits: 500,
        minShips: 1,
        maxShips: 3,
        surrenderPermitted: true,
        onGreet: function(gameState, encType) {
            // Check if police should auto-attack based on bounty
            const bounty = gameState.bounty || 0;
            if (bounty >= BOUNTY_POLICE_ALWAYS_ATTACK_THRESHOLD) {
                // Always attack
                EncounterMenu.show(gameState, encType);
            } else if (bounty >= BOUNTY_POLICE_MIN_ATTACK_THRESHOLD) {
                // Scale attack chance from 0% to 100%
                const attackRange = BOUNTY_POLICE_ALWAYS_ATTACK_THRESHOLD - BOUNTY_POLICE_MIN_ATTACK_THRESHOLD;
                const bountyOverMin = bounty - BOUNTY_POLICE_MIN_ATTACK_THRESHOLD;
                const attackChance = bountyOverMin / attackRange;
                
                if (Math.random() < attackChance) {
                    EncounterMenu.show(gameState, encType);
                } else {
                    EncounterDecisionMenu.show(gameState, encType);
                }
            } else {
                // No auto-attack, show decision menu
                EncounterDecisionMenu.show(gameState, encType);
            }
        }
    },
    MERCHANT: {
        id: 'MERCHANT',
        name: 'Merchant',
        color: COLORS.YELLOW,
        description: 'Legitimate trader looking to exchange goods - prefers reputable captains',
        shipTypes: ['FREIGHTER', 'HAULER', 'TANKER'],
        cargoTypes: [...ALL_CARGO_TYPES.filter(ct=>(!ct.illegal))],
        possibleItems: [],
        maxCredits: 2000,
        minShips: 1,
        maxShips: 3,
        surrenderPermitted: true,
        onGreet: function(gameState, encType) {
            // Merchants only trade with neutral/positive reputation
            const reputation = gameState.reputation || 0;
            if (reputation < 0) {
                // Refuse to trade
                EncounterDecisionMenu.show(gameState, encType);
            } else {
                EncounterDecisionMenu.show(gameState, encType);
            }
        }
    },
    SMUGGLERS: {
        id: 'SMUGGLERS',
        name: 'Smugglers',
        color: COLORS.DARK_MAGENTA,
        description: 'Black market dealers trading in illegal goods - only deal with criminals',
        shipTypes: ['SCOUT', 'STEALTH_SHIP', 'FREIGHTER'],
        cargoTypes: [...ALL_CARGO_TYPES.filter(ct=>(ct.illegal))],
        possibleItems: CONSUMABLES_ARRAY.map(item => item.id),
        maxCredits: 3000,
        minShips: 1,
        maxShips: 3,
        surrenderPermitted: true,
        onGreet: function(gameState, encType) {
            // Smugglers only trade with negative reputation
            const reputation = gameState.reputation || 0;
            if (reputation >= 0) {
                // Refuse to trade
                EncounterDecisionMenu.show(gameState, encType);
            } else {
                EncounterDecisionMenu.show(gameState, encType);
            }
        }
    },
    SOLDIERS: {
        id: 'SOLDIERS',
        name: 'Soldiers',
        color: COLORS.GREEN,
        description: 'Military patrol defending human space - hostile to known criminals',
        shipTypes: ['CORVETTE', 'DESTROYER', 'FIGHTER', 'BATTLESHIP'],
        cargoTypes: [CARGO_TYPES.WEAPONS, CARGO_TYPES.ANTIMATTER],
        possibleItems: [],
        maxCredits: 1000,
        minShips: 3,
        maxShips: 6,
        surrenderPermitted: false,
        onGreet: function(gameState, encType) {
            // Soldiers auto-attack based on negative reputation
            const reputation = gameState.reputation || 0;
            if (reputation <= REPUTATION_SOLDIERS_ALWAYS_ATTACK_THRESHOLD) {
                // Always attack
                EncounterMenu.show(gameState, encType);
            } else if (reputation < REPUTATION_SOLDIERS_MIN_ATTACK_THRESHOLD) {
                // Scale attack chance from 0% to 100%
                const attackRange = REPUTATION_SOLDIERS_MIN_ATTACK_THRESHOLD - REPUTATION_SOLDIERS_ALWAYS_ATTACK_THRESHOLD;
                const repBelowMin = REPUTATION_SOLDIERS_MIN_ATTACK_THRESHOLD - reputation;
                const attackChance = repBelowMin / attackRange;
                
                if (Math.random() < attackChance) {
                    EncounterMenu.show(gameState, encType);
                } else {
                    EncounterDecisionMenu.show(gameState, encType);
                }
            } else {
                // Neutral/positive reputation, no auto-attack
                EncounterDecisionMenu.show(gameState, encType);
            }
        }
    },
    PIRATE: {
        id: 'PIRATE',
        name: 'Pirate',
        color: COLORS.TEXT_ERROR,
        description: 'Hostile vessel demanding cargo or credits',
        shipTypes: ['SCOUT', 'RAIDER', 'CORVETTE', 'STEALTH_SHIP'],
        cargoTypes: [...ALL_CARGO_TYPES.filter(ct=>(ct.illegal))],
        possibleItems: CONSUMABLES_ARRAY.map(item => item.id),
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
        shipTypes: ['SHUTTLE', 'SCOUT', 'FREIGHTER', 'HAULER', 'TANKER', 'RAIDER', 'CORVETTE', 'DESTROYER', 'STEALTH_SHIP', 'FIGHTER'],
        cargoTypes: [...ALL_CARGO_TYPES],
        possibleItems: [],
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
        cargoTypes: [CARGO_TYPES.ALIEN_ARTIFACTS],
        possibleItems: [],
        maxCredits: 0,
        minShips: 3,
        maxShips: 6,
        surrenderPermitted: false,
        onGreet: function(gameState, encType) {
            AlienSkirmishEncounter.show(gameState, encType);
        }
    },
};

// Array of all encounter types for iteration
const ALL_ENCOUNTER_TYPES = Object.values(ENCOUNTER_TYPES);
