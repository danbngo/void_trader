/**
 * Skills Definitions
 * Each skill the player can invest in
 */

const SKILLS = {
    PILOTING: {
        id: 'piloting',
        name: 'Piloting',
        description: 'Reduces travel time, makes your ships harder to hit.',
        color: COLORS.BLUE,
        maxLevel: 20
    },
    BARTER: {
        id: 'barter',
        name: 'Barter',
        description: 'Reduces fees when trading goods and ships.',
        color: COLORS.GREEN,
        maxLevel: 20
    },
    GUNNERY: {
        id: 'gunnery',
        name: 'Gunnery',
        description: 'Increases laser damage and accuracy.',
        color: COLORS.RED,
        maxLevel: 20
    },
    SMUGGLING: {
        id: 'smuggling',
        name: 'Smuggling',
        description: 'Increases chance to be undetected by other fleets.',
        color: COLORS.DARK_GRAY,
        maxLevel: 20
    },
    ENGINEERING: {
        id: 'engineering',
        name: 'Repair',
        description: 'Repairs some hull during travel.',
        color: COLORS.YELLOW,
        maxLevel: 20
    }
};
