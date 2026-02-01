/**
 * System Industry Levels
 */

const SYSTEM_INDUSTRY_LEVELS = {
    LOW: { id: 'INDUSTRY_LOW', name: 'Low Industry', stockMultiplier: 0.8, priceMultiplier: 1.2 },
    MODERATE: { id: 'INDUSTRY_MODERATE', name: 'Moderate Industry', stockMultiplier: 1.0, priceMultiplier: 1.0 },
    HIGH: { id: 'INDUSTRY_HIGH', name: 'High Industry', stockMultiplier: 1.4, priceMultiplier: 0.8 },
    EXTREME: { id: 'INDUSTRY_EXTREME', name: 'Industrial Core', stockMultiplier: 1.8, priceMultiplier: 0.65 }
};

const SYSTEM_INDUSTRY_LEVELS_ALL = Object.values(SYSTEM_INDUSTRY_LEVELS);
