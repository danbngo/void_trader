/**
 * Planet Features
 */

const PLANET_FEATURES = {
    RING: {
        id: 'RING',
        name: 'Ring',
        bodyTypes: [
            BODY_TYPES.PLANET_GAS_GIANT.id,
            BODY_TYPES.PLANET_ICE_GIANT.id
        ],
        probability: 0.5
    }
};

const PLANET_FEATURES_ALL = Object.values(PLANET_FEATURES);
