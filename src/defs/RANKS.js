/**
 * Rank Definitions
 * Citizenship ranks that unlock buildings and services
 */

const RANKS = {
    NONE: {
        id: 'NONE',
        name: 'None',
        description: 'No citizenship status',
        level: 0,
        fee: 0,
        minReputation: 0
    },
    VISA: {
        id: 'VISA',
        name: 'Visa',
        description: 'Basic visitor status - unlocks Shipyard, Tavern, and Guild',
        level: 1,
        fee: 2000,
        minReputation: 0
    },
    CITIZEN: {
        id: 'CITIZEN',
        name: 'Citizen',
        description: 'Full citizenship status - unlocks additional services and privileges',
        level: 2,
        fee: 5000,
        minReputation: 50
    },
    ELITE: {
        id: 'ELITE',
        name: 'Elite',
        description: 'Elite status with highest privileges',
        level: 3,
        fee: 20000,
        minReputation: 100
    }
};

// Array of all ranks for iteration
const ALL_RANKS = Object.values(RANKS);
