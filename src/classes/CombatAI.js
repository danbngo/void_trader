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
        
        if (nearestShip) {
            // Check if we should flee (low hull)
            const hullRatio = enemyShip.hull / enemyShip.maxHull;
            if (hullRatio <= ENEMY_FLEE_AT_HULL_RATIO) {
                return new CombatAction(enemyShip, COMBAT_ACTIONS.FLEE, nearestShip);
            }
            
            // Calculate hit chance if we were to fire laser
            const hitChance = Math.min(1, enemyShip.radar / nearestDistance);
            
            // Fire laser if hit chance meets minimum threshold
            if (hitChance >= ENEMY_MIN_LASER_HIT_CHANCE) {
                return new CombatAction(enemyShip, COMBAT_ACTIONS.FIRE_LASER, nearestShip);
            }
            
            // Otherwise pursue to get closer
            return new CombatAction(enemyShip, COMBAT_ACTIONS.PURSUE, nearestShip);
        }
        
        // No valid targets, do nothing (shouldn't happen in normal gameplay)
        return null;
    }
}
