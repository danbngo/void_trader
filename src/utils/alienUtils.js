/**
 * Alien Utilities
 * Handles alien conquest and encounter weight adjustments
 */

const AlienUtils = (() => {
    /**
     * Calculate distance between two points
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {number}
     */
    function distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Adjust encounter weights based on proximity to alien-controlled systems
     * Should be called after alien conquests occur
     * @param {Array<StarSystem>} systems - All star systems
     */
    function adjustEncounterWeights(systems) {
        // Find all alien-conquered systems
        const conqueredSystems = systems.filter(system => system.conqueredByAliens);
        
        // Reset all alien weights and soldier bonuses first
        systems.forEach(system => {
            if (!system.conqueredByAliens) {
                system.alienWeight = 0;
            }
        });
        
        // For each unconquered system, check if it's within attack distance of a conquered system
        systems.forEach(system => {
            if (system.conqueredByAliens) {
                return; // Skip conquered systems
            }
            
            // Check distance to nearest conquered system
            let nearestConqueredDistance = Infinity;
            for (const conqueredSystem of conqueredSystems) {
                const dist = distance(system.x, system.y, conqueredSystem.x, conqueredSystem.y);
                if (dist < nearestConqueredDistance) {
                    nearestConqueredDistance = dist;
                }
            }
            
            // If within attack distance, increase military presence
            if (nearestConqueredDistance <= ALIENS_MAX_ATTACK_DISTANCE) {
                // Store base soldier weight if not already stored
                if (!system.baseSoldiersWeight) {
                    system.baseSoldiersWeight = system.soldiersWeight;
                }
                system.soldiersWeight = system.baseSoldiersWeight * 2.0; // Double soldier presence
                system.alienWeight = 1.0; // Add base alien encounter weight
            } else {
                // Reset to base if previously boosted
                if (system.baseSoldiersWeight) {
                    system.soldiersWeight = system.baseSoldiersWeight;
                }
            }
        });
    }

    /**
     * Get all alien-conquered systems
     * @param {Array<StarSystem>} systems - All star systems
     * @returns {Array<StarSystem>} Array of conquered systems
     */
    function getConqueredSystems(systems) {
        return systems.filter(system => system.conqueredByAliens);
    }

    /**
     * Get systems within attack range of conquered systems
     * @param {Array<StarSystem>} systems - All star systems
     * @returns {Array<StarSystem>} Array of systems in danger
     */
    function getSystemsInDanger(systems) {
        const conqueredSystems = getConqueredSystems(systems);
        if (conqueredSystems.length === 0) return [];
        
        return systems.filter(system => {
            if (system.conqueredByAliens || system.immuneToAlienConquest) return false;
            
            for (const conquered of conqueredSystems) {
                const dist = distance(system.x, system.y, conquered.x, conquered.y);
                if (dist <= ALIENS_MAX_ATTACK_DISTANCE) {
                    return true;
                }
            }
            return false;
        });
    }

    return {
        adjustEncounterWeights,
        getConqueredSystems,
        getSystemsInDanger
    };
})();
