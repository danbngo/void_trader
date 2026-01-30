/**
 * Combat Action Types
 */

const COMBAT_ACTIONS = {
    PURSUE: 'PURSUE',        // Move toward target
    FLEE: 'FLEE',           // Move away from target
    GET_RAMMED: 'GET_RAMMED', // Pseudo-action: being knocked back after collision
    FIRE_LASER: 'FIRE_LASER', // Fire laser at target
    RECHARGE_SHIELDS: 'RECHARGE_SHIELDS' // Recharge shields
};
