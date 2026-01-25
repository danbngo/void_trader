/**
 * Skills Definitions
 * Each skill the player can invest in
 */

const SKILLS = {
    PILOTING: {
        id: 'piloting',
        shortName: 'Pilot',
        name: 'Piloting',
        description: 'Reduces travel time, makes your ships harder to hit.',
        color: COLORS.BLUE,
        maxLevel: 20
    },
    BARTER: {
        id: 'barter',
        shortName: 'Barter',
        name: 'Barter',
        description: 'Reduces fees when trading goods and ships.',
        color: COLORS.GREEN,
        maxLevel: 20
    },
    GUNNERY: {
        id: 'gunnery',
        shortName: 'Gunner',
        name: 'Gunnery',
        description: 'Increases laser damage and accuracy.',
        color: COLORS.RED,
        maxLevel: 20
    },
    SMUGGLING: {
        id: 'smuggling',
        shortName: 'Smuggle',
        name: 'Smuggling',
        description: 'Increases chance to be undetected by other fleets.',
        color: COLORS.DARK_GRAY,
        maxLevel: 20
    },
    ENGINEERING: {
        id: 'engineering',
        shortName: 'Repair',
        name: 'Repair',
        description: 'Repairs some hull during travel.',
        color: COLORS.YELLOW,
        maxLevel: 20
    }
};

const SKILLS_ALL = Object.values(SKILLS)