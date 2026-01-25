/**
 * Skills Definitions
 * Each skill the player can invest in
 */

const SKILLS = {
    PILOTING: {
        id: 'piloting',
        name: 'Piloting',
        description: 'Reduces travel time by 2.5% per level. Makes your ships 2.5% harder to hit in combat.',
        color: COLORS.CYAN,
        maxLevel: 20
    },
    BARTER: {
        id: 'barter',
        name: 'Barter',
        description: 'Reduces fees when buying/selling cargo and ships by 5% per level.',
        color: COLORS.GREEN,
        maxLevel: 20
    },
    GUNNERY: {
        id: 'gunnery',
        name: 'Gunnery',
        description: 'Increases laser damage by 5% per level. Improves accuracy by 5% per level.',
        color: COLORS.TEXT_ERROR,
        maxLevel: 20
    },
    SMUGGLING: {
        id: 'smuggling',
        name: 'Smuggling',
        description: 'Increases stealth by 5% per level. Reduces chance police find illegal cargo by 5% per level.',
        color: COLORS.PURPLE,
        maxLevel: 20
    },
    ENGINEERING: {
        id: 'engineering',
        name: 'Engineering',
        description: 'Grants 5% chance per level to restore 1 hull to each ship per day of travel.',
        color: COLORS.YELLOW,
        maxLevel: 20
    }
};
