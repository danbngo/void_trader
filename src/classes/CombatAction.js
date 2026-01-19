/**
 * CombatAction - Represents a discrete combat action
 */

class CombatAction {
    /**
     * Create a combat action
     * @param {Object} ship - The ship performing the action
     * @param {string} actionType - Action type from COMBAT_ACTIONS
     * @param {Object} targetShip - Optional target ship (for PURSUE)
     * @param {number} knockbackDistance - Optional knockback distance (for GET_RAMMED)
     * @param {number} knockbackAngle - Optional knockback angle (for GET_RAMMED)
     */
    constructor(ship, actionType, targetShip = null, knockbackDistance = 0, knockbackAngle = 0) {
        this.ship = ship;
        this.actionType = actionType;
        this.targetShip = targetShip;
        this.knockbackDistance = knockbackDistance;
        this.knockbackAngle = knockbackAngle;
        this.completed = false;
    }
    
    /**
     * Mark action as completed
     */
    complete() {
        this.completed = true;
    }
}
