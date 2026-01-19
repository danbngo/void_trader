/**
 * CombatAI - Decides actions for enemy ships
 */

class CombatAI {
    /**
     * Generate action for an enemy ship
     * @param {Object} enemyShip - The enemy ship
     * @param {Array} playerShips - Array of player ships
     * @returns {CombatAction} The action to take
     */
    static generateAction(enemyShip, playerShips) {
        // Find nearest active player ship
        let nearestShip = null;
        let nearestDistance = Infinity;
        
        playerShips.forEach(ship => {
            if (!ship.fled && !ship.disabled) {
                const dx = ship.x - enemyShip.x;
                const dy = ship.y - enemyShip.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestShip = ship;
                }
            }
        });
        
        // Default: pursue nearest player ship
        if (nearestShip) {
            return new CombatAction(enemyShip, COMBAT_ACTIONS.PURSUE, nearestShip);
        }
        
        // No valid targets, do nothing (shouldn't happen in normal gameplay)
        return null;
    }
}
