/**
 * Skill Effects
 * Calculates effects of player skills on various game mechanics
 */

const SkillEffects = (() => {
    /**
     * Get modified travel time based on piloting skill
     * @param {number} baseDuration - Base travel duration in days
     * @param {number} pilotingLevel - Piloting skill level (0-20)
     * @returns {number} Modified travel duration
     */
    function getTravelDuration(baseDuration, pilotingLevel) {
        // Each level reduces travel time by 2.5%
        // At level 20, reduction is 50%
        const reduction = pilotingLevel * 0.025;
        return baseDuration * (1 - reduction);
    }
    
    /**
     * Get modified distance for to-hit calculation (piloting - dodging)
     * @param {number} baseDistance - Base distance
     * @param {number} pilotingLevel - Piloting skill level (0-20)
     * @returns {number} Modified distance (higher = harder to hit)
     */
    function getDodgeDistance(baseDistance, pilotingLevel) {
        // Each level makes ship 2.5% harder to hit
        // At level 20, distance is doubled
        const multiplier = 1 + (pilotingLevel * 0.025);
        return baseDistance * multiplier;
    }
    
    /**
     * Get modified distance for to-hit calculation (gunnery - accuracy)
     * @param {number} baseDistance - Base distance
     * @param {number} gunneryLevel - Gunnery skill level (0-20)
     * @returns {number} Modified distance (lower = easier to hit)
     */
    function getAccuracyDistance(baseDistance, gunneryLevel) {
        // Each level improves accuracy by 5%
        // At level 20, distance is halved
        const divisor = 1 + (gunneryLevel * 0.05);
        return baseDistance / divisor;
    }
    
    /**
     * Get modified laser damage based on gunnery skill
     * @param {number} baseDamage - Base damage value
     * @param {number} gunneryLevel - Gunnery skill level (0-20)
     * @returns {number} Modified damage
     */
    function getLaserDamage(baseDamage, gunneryLevel) {
        // Each level increases damage by 5%
        // At level 20, damage is doubled
        const multiplier = 1 + (gunneryLevel * 0.05);
        return Math.floor(baseDamage * multiplier);
    }
    
    /**
     * Get modified fees based on barter skill
     * @param {number} baseFees - Base fee percentage (e.g., 0.15 for 15%)
     * @param {number} barterLevel - Barter skill level (0-20)
     * @returns {number} Modified fees (minimum 0)
     */
    function getModifiedFees(baseFees, barterLevel) {
        // Each level reduces fees by 5%
        // At level 20, fees are 0
        const reduction = barterLevel * 0.05;
        return Math.max(0, baseFees * (1 - reduction));
    }
    
    /**
     * Get modified radar score for stealth based on smuggling skill
     * @param {number} baseRadar - Base radar score
     * @param {number} smugglingLevel - Smuggling skill level (0-20)
     * @returns {number} Modified radar (higher = harder to detect)
     */
    function getStealthRadar(baseRadar, smugglingLevel) {
        // Each level increases stealth by 5%
        // At level 20, radar is doubled
        const multiplier = 1 + (smugglingLevel * 0.05);
        return baseRadar * multiplier;
    }

    /**
     * Get fuel cost multiplier based on navigation skill
     * @param {number} navigationLevel - Navigation skill level (0-20)
     * @returns {number} Fuel cost multiplier
     */
    function getFuelCostMultiplier(navigationLevel) {
        const clamped = Math.max(0, Math.min(20, navigationLevel || 0));
        const reduction = 0.5 * (clamped / 20); // up to 50% reduction at level 20
        return 1 - reduction;
    }
    
    /**
     * Check if police find illegal cargo based on smuggling skill
     * @param {number} smugglingLevel - Smuggling skill level (0-20)
     * @returns {boolean} True if illegal cargo is found
     */
    function policeFoundIllegalCargo(smugglingLevel) {
        // Each level reduces chance by 5%
        // At level 20, illegal cargo is never found (0% chance)
        const findChance = 1 - (smugglingLevel * 0.05);
        return Math.random() < findChance;
    }
    
    /**
     * Apply engineering hull repair during travel
     * @param {Ship[]} ships - Array of ships
     * @param {number} engineeringLevel - Engineering skill level (0-20)
     * @param {number} days - Number of days traveled
     * @returns {Object} Repair results { repairsApplied: number, shipsRepaired: string[] }
     */
    function applyEngineeringRepairs(ships, engineeringLevel, days) {
        // Each level gives 5% chance per day to restore 1 hull to each ship
        // At level 20, 100% chance per day
        const repairChance = engineeringLevel * 0.05;
        
        let repairsApplied = 0;
        const shipsRepaired = [];
        
        // For each day of travel
        for (let day = 0; day < Math.floor(days); day++) {
            if (Math.random() < repairChance) {
                // Repair 1 hull on each ship
                ships.forEach(ship => {
                    if (ship.hull < ship.maxHull) {
                        ship.hull = Math.min(ship.maxHull, ship.hull + 1);
                        const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
                        if (!shipsRepaired.includes(shipType.name)) {
                            shipsRepaired.push(shipType.name);
                        }
                        repairsApplied++;
                    }
                });
            }
        }
        
        return { repairsApplied, shipsRepaired };
    }
    
    // Public API
    return {
        getTravelDuration,
        getDodgeDistance,
        getAccuracyDistance,
        getLaserDamage,
        getModifiedFees,
        getStealthRadar,
        getFuelCostMultiplier,
        policeFoundIllegalCargo,
        applyEngineeringRepairs
    };
})();
