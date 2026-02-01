/**
 * System Population Levels
 */

const SYSTEM_POPULATION_LEVELS = {
    LOW: { id: 'POP_LOW', name: 'Low Population', stockMultiplier: 1.3, priceMultiplier: 0.8 },
    MODERATE: { id: 'POP_MODERATE', name: 'Moderate Population', stockMultiplier: 1.0, priceMultiplier: 1.0 },
    HIGH: { id: 'POP_HIGH', name: 'High Population', stockMultiplier: 0.75, priceMultiplier: 1.25 },
    MEGA: { id: 'POP_MEGA', name: 'Mega Population', stockMultiplier: 0.5, priceMultiplier: 1.5 }
};

const SYSTEM_POPULATION_LEVELS_ALL = Object.values(SYSTEM_POPULATION_LEVELS);
