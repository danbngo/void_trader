/**
 * CombatAI - Decides actions for enemy ships
 */

class CombatAI {
    /**
     * Generate action for an enemy ship
     * @param {Object} enemyShip - The enemy ship
     * @param {Array} playerShips - Array of player ships
     * @param {Array} encounterShips - Array of encounter ships (for faction conflicts)
     * @returns {CombatAction} The action to take
     */
    static generateAction(enemyShip, playerShips, encounterShips = []) {
        const isActiveTarget = (ship) => !ship.fled && !ship.disabled && !ship.escaped;

        const neutralTargets = encounterShips.filter(ship => ship.isNeutralToPlayer && ship.faction !== enemyShip.faction && isActiveTarget(ship));
        const enemyTargets = encounterShips.filter(ship => !ship.isNeutralToPlayer && ship.faction !== enemyShip.faction && isActiveTarget(ship));

        const potentialTargets = enemyShip.isNeutralToPlayer
            ? enemyTargets
            : [...playerShips.filter(isActiveTarget), ...neutralTargets];

        // Find nearest valid target
        let nearestShip = null;
        let nearestDistance = Infinity;
        
        potentialTargets.forEach(ship => {
            const dx = ship.x - enemyShip.x;
            const dy = ship.y - enemyShip.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestShip = ship;
            }
        });
        
        if (nearestShip) {
            // Recharge shields if low and not fleeing
            const shieldRatio = enemyShip.maxShields > 0 ? enemyShip.shields / enemyShip.maxShields : 1;
            if (enemyShip.maxShields > 0 && shieldRatio < 0.25) {
                return new CombatAction(enemyShip, COMBAT_ACTIONS.RECHARGE_SHIELDS, nearestShip);
            }

            // Check if we should flee (low hull) - aliens never flee
            const shipType = SHIP_TYPES[enemyShip.type] || ALIEN_SHIP_TYPES[enemyShip.type];
            const hullRatio = enemyShip.hull / enemyShip.maxHull;
            if (hullRatio <= ENEMY_FLEE_AT_HULL_RATIO && !(shipType && shipType.isAlien)) {
                return new CombatAction(enemyShip, COMBAT_ACTIONS.FLEE, nearestShip);
            }
            
            // Calculate hit chance if we were to fire laser
            const hitChance = Math.min(1, enemyShip.radar / nearestDistance);
            
            // Calculate desperation factor based on target distance from center
            // BUT only if target is facing AWAY from center (prevents camping exploit)
            let desperationFactor = 0;
            
            const targetDistanceFromCenter = Math.sqrt(nearestShip.x * nearestShip.x + nearestShip.y * nearestShip.y);
            
            // Only apply desperation if target is near edge AND facing away from center
            if (targetDistanceFromCenter > ENCOUNTER_MAX_RADIUS * 0.5) {
                // Calculate angle from target to center (0,0)
                const angleToCenter = Math.atan2(-nearestShip.y, -nearestShip.x);
                
                // Normalize angles to [0, 2π]
                const normalizedTargetAngle = ((nearestShip.angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
                const normalizedAngleToCenter = ((angleToCenter % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
                
                // Calculate angle difference (absolute shortest path)
                let angleDiff = Math.abs(normalizedTargetAngle - normalizedAngleToCenter);
                if (angleDiff > Math.PI) {
                    angleDiff = 2 * Math.PI - angleDiff;
                }
                
                // If target is facing away from center (angle difference > 90 degrees)
                const facingAwayThreshold = Math.PI / 2; // 90 degrees
                if (angleDiff > facingAwayThreshold) {
                    // Target is facing away - apply desperation based on distance
                    desperationFactor = Math.min(1, targetDistanceFromCenter / ENCOUNTER_MAX_RADIUS);
                }
            }
            
            // Effective threshold decreases as target gets closer to edge (when facing away)
            // At center or facing toward center: threshold = ENEMY_MIN_LASER_HIT_CHANCE (0.5)
            // At edge facing away: threshold = 0 (will always shoot)
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
