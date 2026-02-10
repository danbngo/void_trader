/**
 * Planet Features
 */

const PLANET_FEATURES = {
    HABITED: {
        id: 'HABITED',
        name: 'Habited',
        description: 'Permanent settlements are present.',
        probability: 0.5
    },
    RING: {
        id: 'RING',
        name: 'Ring',
        bodyTypes: [
            BODY_TYPES.PLANET_GAS_GIANT.id,
            BODY_TYPES.PLANET_ICE_GIANT.id
        ],
        probability: 0.35
    },
    HAS_MOONS: {
        id: 'HAS_MOONS',
        name: 'Moons',
        description: 'Natural satellites orbit this planet.',
        probability: 0.5
    },
    HAS_ATMOSPHERE: {
        id: 'HAS_ATMOSPHERE',
        name: 'Atmosphere',
        description: 'An atmosphere surrounds the planet.',
        probability: 0.5
    },
    HAS_ICE_CAPS: {
        id: 'HAS_ICE_CAPS',
        name: 'Ice Caps',
        description: 'Permanent polar ice caps are present.',
        probability: 0.5
    }
};

const PLANET_FEATURES_ALL = Object.values(PLANET_FEATURES);
