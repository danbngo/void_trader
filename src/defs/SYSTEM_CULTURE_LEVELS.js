/**
 * System Culture Levels
 */

const SYSTEM_CULTURE_LEVELS = {
    LOW: { id: 'CULTURE_LOW', name: 'Low Culture', stockMultiplier: 0.8, priceMultiplier: 1.2 },
    MODERATE: { id: 'CULTURE_MODERATE', name: 'Moderate Culture', stockMultiplier: 1.0, priceMultiplier: 1.0 },
    HIGH: { id: 'CULTURE_HIGH', name: 'High Culture', stockMultiplier: 1.4, priceMultiplier: 0.8 },
    EXTREME: { id: 'CULTURE_EXTREME', name: 'Cultural Hub', stockMultiplier: 1.8, priceMultiplier: 0.65 }
};

const SYSTEM_CULTURE_LEVELS_ALL = Object.values(SYSTEM_CULTURE_LEVELS);
