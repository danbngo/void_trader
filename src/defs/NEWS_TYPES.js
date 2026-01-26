/**
 * News Types - Define different types of news events
 */

const NEWS_TYPES = {
    AIR_SHORTAGE: {
        id: 'AIR_SHORTAGE',
        cargoType: 'AIR',
        name: 'Life Support Crisis',
        minDuration: 30, // days
        maxDuration: 90,
        priceMultiplier: 3.0, // Triple the price
        descriptionGenerator: function(news) {
            return `${news.originSystem.name} air processor issues. Air prices surging.`;
        },
        endDescriptionGenerator: function(news) {
            return `Life support crisis at ${news.originSystem.name} resolved.`;
        },
        onStart: function(news) {
            // Multiply the price modifier
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier * this.priceMultiplier;
        },
        onEnd: function(news) {
            // Divide the price modifier to restore original
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier / this.priceMultiplier;
        }
    },
    WATER_SHORTAGE: {
        id: 'WATER_SHORTAGE',
        cargoType: 'WATER',
        name: 'Water Contamination',
        minDuration: 30,
        maxDuration: 90,
        priceMultiplier: 3.0,
        descriptionGenerator: function(news) {
            return `${news.originSystem.name} water contamination crisis. Water prices soaring.`;
        },
        endDescriptionGenerator: function(news) {
            return `Water contamination at ${news.originSystem.name} cleared.`;
        },
        onStart: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier * this.priceMultiplier;
        },
        onEnd: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier / this.priceMultiplier;
        }
    },
    FOOD_SHORTAGE: {
        id: 'FOOD_SHORTAGE',
        cargoType: 'FOOD',
        name: 'Agricultural Failure',
        minDuration: 60,
        maxDuration: 120,
        priceMultiplier: 3.0,
        descriptionGenerator: function(news) {
            return `${news.originSystem.name} crop failure. Food prices skyrocketing.`;
        },
        endDescriptionGenerator: function(news) {
            return `Agricultural production at ${news.originSystem.name} recovered.`;
        },
        onStart: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier * this.priceMultiplier;
        },
        onEnd: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier / this.priceMultiplier;
        }
    },
    HOLOCUBE_DEMAND: {
        id: 'HOLOCUBE_DEMAND',
        cargoType: 'HOLOCUBES',
        name: 'Entertainment Boom',
        minDuration: 30,
        maxDuration: 60,
        priceMultiplier: 2.5,
        descriptionGenerator: function(news) {
            return `${news.originSystem.name} hosting cultural festival. Holocube prices rising.`;
        },
        endDescriptionGenerator: function(news) {
            return `Cultural festival at ${news.originSystem.name} concluded.`;
        },
        onStart: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier * this.priceMultiplier;
        },
        onEnd: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier / this.priceMultiplier;
        }
    },
    MEDICINE_OUTBREAK: {
        id: 'MEDICINE_OUTBREAK',
        cargoType: 'MEDICINE',
        name: 'Plague Outbreak',
        minDuration: 45,
        maxDuration: 90,
        priceMultiplier: 4.0,
        descriptionGenerator: function(news) {
            return `${news.originSystem.name} plague outbreak. Medicine prices surging.`;
        },
        endDescriptionGenerator: function(news) {
            return `Plague outbreak at ${news.originSystem.name} contained.`;
        },
        onStart: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier * this.priceMultiplier;
        },
        onEnd: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier / this.priceMultiplier;
        }
    },
    NANITES_DEMAND: {
        id: 'NANITES_DEMAND',
        cargoType: 'NANITES',
        name: 'Construction Boom',
        minDuration: 60,
        maxDuration: 120,
        priceMultiplier: 2.5,
        descriptionGenerator: function(news) {
            return `${news.originSystem.name} infrastructure boom. Nanite prices rising.`;
        },
        endDescriptionGenerator: function(news) {
            return `Construction boom at ${news.originSystem.name} slowed.`;
        },
        onStart: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier * this.priceMultiplier;
        },
        onEnd: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier / this.priceMultiplier;
        }
    },
    PLASMA_SHORTAGE: {
        id: 'PLASMA_SHORTAGE',
        cargoType: 'PLASMA',
        name: 'Energy Crisis',
        minDuration: 30,
        maxDuration: 90,
        priceMultiplier: 3.5,
        descriptionGenerator: function(news) {
            return `${news.originSystem.name} reactor crisis. Plasma prices surging.`;
        },
        endDescriptionGenerator: function(news) {
            return `Energy crisis at ${news.originSystem.name} resolved.`;
        },
        onStart: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier * this.priceMultiplier;
        },
        onEnd: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier / this.priceMultiplier;
        }
    },
    FUEL_SHORTAGE: {
        id: 'FUEL_SHORTAGE',
        cargoType: 'FUEL',
        name: 'Fuel Shortage',
        minDuration: 30,
        maxDuration: 75,
        priceMultiplier: 3.0,
        descriptionGenerator: function(news) {
            return `${news.originSystem.name} refinery issues. Fuel prices high.`;
        },
        endDescriptionGenerator: function(news) {
            return `Fuel production at ${news.originSystem.name} resumed.`;
        },
        onStart: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier * this.priceMultiplier;
        },
        onEnd: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier / this.priceMultiplier;
        }
    },
    ISOTOPES_DEMAND: {
        id: 'ISOTOPES_DEMAND',
        cargoType: 'ISOTOPES',
        name: 'Research Breakthrough',
        minDuration: 45,
        maxDuration: 90,
        priceMultiplier: 2.5,
        descriptionGenerator: function(news) {
            return `${news.originSystem.name} research project. Isotope prices rising.`;
        },
        endDescriptionGenerator: function(news) {
            return `Research project at ${news.originSystem.name} concluded.`;
        },
        onStart: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier * this.priceMultiplier;
        },
        onEnd: function(news) {
            const currentModifier = news.originSystem.cargoPriceModifier[this.cargoType];
            news.originSystem.cargoPriceModifier[this.cargoType] = currentModifier / this.priceMultiplier;
        }
    }
};

// Array of all news types
const ALL_NEWS_TYPES = Object.values(NEWS_TYPES);
