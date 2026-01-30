/**
 * Combat Consumables
 * Defines consumable combat items and their effects
 */

const CONSUMABLES = {
    SMOKE_BOMB: {
        id: 'SMOKE_BOMB',
        name: 'Smoke Bomb',
        description: 'All ships have 0.5x chance to hit with lasers for 2 turns',
        durationTurns: 2,
        price: 1500
    },
    EMP_BLASTER: {
        id: 'EMP_BLASTER',
        name: 'EMP Blaster',
        description: 'Shields drop to 0 and cannot regenerate for 2 turns',
        durationTurns: 2,
        price: 2500
    },
    GRAVITY_BOMB: {
        id: 'GRAVITY_BOMB',
        name: 'Gravity Bomb',
        description: 'Retreat is 0.25x as effective for 2 turns',
        durationTurns: 2,
        price: 2000
    }
};

const CONSUMABLES_ARRAY = Object.values(CONSUMABLES);
