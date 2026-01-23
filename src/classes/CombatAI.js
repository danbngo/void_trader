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
            
            // Calculate desperation factor based on target distance from center
            // Target at center (0,0) = 0% desperation bonus
            // Target at max radius = 100% desperation (will always shoot)
            const targetDistanceFromCenter = Math.sqrt(nearestShip.x * nearestShip.x + nearestShip.y * nearestShip.y);
            const desperationFactor = Math.min(1, targetDistanceFromCenter / ENCOUNTER_MAX_RADIUS);
            
            // Effective threshold decreases as target gets closer to edge
            // At center: threshold = ENEMY_MIN_LASER_HIT_CHANCE (0.5)
            // At edge: threshold = 0 (will always shoot)
            const effectiveThreshold = ENEMY_MIN_LASER_HIT_CHANCE * (1 - desperationFactor);
            
            // Fire laser if hit chance meets the (potentially reduced) threshold
            if (hitChance >= effectiveThreshold) {
                return new CombatAction(enemyShip, COMBAT_ACTIONS.FIRE_LASER, nearestShip);
            }
            
            // Otherwise pursue to get closer
            return new CombatAction(enemyShip, COMBAT_ACTIONS.PURSUE, nearestShip);
        }
        
        // No valid targets, do nothing (shouldn't happen in normal gameplay)
        return null;
    }
}
