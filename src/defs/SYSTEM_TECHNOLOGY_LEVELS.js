/**
 * System Technology Levels
 */

const SYSTEM_TECHNOLOGY_LEVELS = {
    LOW: { id: 'TECH_LOW', name: 'Low Tech', stockMultiplier: 0.8, priceMultiplier: 1.2 },
    MODERATE: { id: 'TECH_MODERATE', name: 'Moderate Tech', stockMultiplier: 1.0, priceMultiplier: 1.0 },
    HIGH: { id: 'TECH_HIGH', name: 'High Tech', stockMultiplier: 1.4, priceMultiplier: 0.8 },
    EXTREME: { id: 'TECH_EXTREME', name: 'Cutting Edge', stockMultiplier: 1.8, priceMultiplier: 0.65 }
};

const SYSTEM_TECHNOLOGY_LEVELS_ALL = Object.values(SYSTEM_TECHNOLOGY_LEVELS);
