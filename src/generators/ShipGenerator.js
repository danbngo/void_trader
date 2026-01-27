/**
 * Ship Generator
 */

const ShipGenerator = (() => {
    // Two-part ship names for non-encounter ships (shipyard, starting ship)
    const shipPrefixes = [
        'Solar', 'Stellar', 'Cosmic', 'Astral', 'Void', 'Star', 'Quantum',
        'Nebula', 'Eclipse', 'Aurora', 'Nova', 'Comet', 'Meteor', 'Pulsar',
        'Galactic', 'Celestial', 'Orbital', 'Lunar', 'Radiant', 'Crimson',
        'Azure', 'Golden', 'Silver', 'Iron', 'Swift', 'Bold', 'Brave',
        'Silent', 'Ghost', 'Shadow', 'Thunder', 'Lightning', 'Storm',
        'Wild', 'Free', 'Lone', 'Lost', 'Eternal', 'Ancient', 'Last',
        'First', 'Rising', 'Fallen', 'Broken', 'Shining', 'Burning'
    ];
    
    const shipSuffixes = [
        'Wanderer', 'Voyager', 'Explorer', 'Pioneer', 'Venture', 'Nomad',
        'Pathfinder', 'Seeker', 'Drifter', 'Stargazer', 'Horizon', 'Infinity',
        'Endeavor', 'Discovery', 'Fortune', 'Destiny', 'Phoenix', 'Dragon',
        'Eagle', 'Hawk', 'Falcon', 'Raven', 'Wolf', 'Lion', 'Tiger',
        'Serpent', 'Arrow', 'Lance', 'Sword', 'Shield', 'Crown', 'Jewel',
        'Pearl', 'Diamond', 'Ruby', 'Sapphire', 'Dream', 'Hope', 'Glory',
        'Pride', 'Spirit', 'Soul', 'Heart', 'Wind', 'Wave', 'Tide',
        'Flame', 'Spark', 'Light', 'Dawn', 'Dusk', 'Night', 'Star'
    ];
    
    // Track used names to ensure uniqueness
    let usedNames = new Set();
    
    /**
     * Generate a unique 2-part ship name for shipyard/starting ships
     * @returns {string} - Unique ship name
     */
    function generateUniqueName() {
        let attempts = 0;
        const maxAttempts = 1000; // Prevent infinite loop
        
        while (attempts < maxAttempts) {
            const prefix = shipPrefixes[Math.floor(Math.random() * shipPrefixes.length)];
            const suffix = shipSuffixes[Math.floor(Math.random() * shipSuffixes.length)];
            const name = `${prefix} ${suffix}`;
            
            if (!usedNames.has(name)) {
                usedNames.add(name);
                return name;
            }
            
            attempts++;
        }
        
        // Fallback: add a number if all combinations exhausted
        const prefix = shipPrefixes[Math.floor(Math.random() * shipPrefixes.length)];
        const suffix = shipSuffixes[Math.floor(Math.random() * shipSuffixes.length)];
        const name = `${prefix} ${suffix} ${Math.floor(Math.random() * 1000)}`;
        usedNames.add(name);
        return name;
    }
    
    /**
     * Clear used names (useful for new game)
     */
    function clearUsedNames() {
        usedNames.clear();
    }
    
    /**
     * Apply stat variation to a base stat
     * @param {number} baseStat - Base stat value
     * @returns {number} - Varied stat value
     */
    function applyStatVariation(baseStat) {
        const range = SHIP_MAX_STAT_VARIATION - SHIP_MIN_STAT_VARIATION;
        const multiplier = SHIP_MIN_STAT_VARIATION + Math.random() * range;
        const val = Math.round(baseStat * multiplier);
        return Math.max(val, 1) // Ensure at least 1
    }
    
    /**
     * Generate a starting ship for the player
     * @returns {Ship}
     */
    function generateStartingShip() {
        const shipType = SHIP_TYPES.SHUTTLE;
        
        const maxFuel = Math.floor(shipType.baseMaxFuel);
        const fuel = maxFuel;
        const cargoCapacity = Math.floor(shipType.baseCargoCapacity);
        const maxHull = Math.floor(shipType.baseMaxHull);
        const hull = maxHull;
        const maxShields = Math.floor(shipType.baseMaxShields);
        const shields = maxShields;
        const lasers = Math.floor(shipType.baseLasers);
        const engine = Math.floor(shipType.baseEngine);
        const radar = Math.floor(shipType.baseRadar);
        
        return new Ship(fuel, maxFuel, cargoCapacity, hull, maxHull, shipType.id, shields, maxShields, lasers, engine, radar);
    }
    
    /**
     * Generate a random ship for sale (shipyard)
     * @returns {Ship}
     */
    function generateRandomShip() {
        const shipType = ALL_SHIP_TYPES[Math.floor(Math.random() * ALL_SHIP_TYPES.length)];
        
        const maxFuel = applyStatVariation(shipType.baseMaxFuel);
        const fuel = maxFuel;
        const cargoCapacity = applyStatVariation(shipType.baseCargoCapacity);
        const maxHull = applyStatVariation(shipType.baseMaxHull);
        const hull = maxHull;
        const maxShields = applyStatVariation(shipType.baseMaxShields);
        const shields = maxShields;
        const lasers = Math.max(1, applyStatVariation(shipType.baseLasers)); // At least 1 laser
        const engine = Math.max(1, applyStatVariation(shipType.baseEngine));
        const radar = Math.max(1, applyStatVariation(shipType.baseRadar)); // At least 1 radar
        
        return new Ship(fuel, maxFuel, cargoCapacity, hull, maxHull, shipType.id, shields, maxShields, lasers, engine, radar);
    }
    
    /**
     * Generate a ship of a specific type (for encounters)
     * @param {string} shipTypeId - ID of the ship type
     * @returns {Ship}
     */
    function generateShipOfType(shipTypeId) {
        // Check both SHIP_TYPES and ALIEN_SHIP_TYPES
        const shipType = SHIP_TYPES[shipTypeId] || ALIEN_SHIP_TYPES[shipTypeId] || SHIP_TYPES.FREIGHTER;
        
        const maxFuel = applyStatVariation(shipType.baseMaxFuel);
        const fuel = maxFuel;
        const cargoCapacity = applyStatVariation(shipType.baseCargoCapacity);
        const maxHull = applyStatVariation(shipType.baseMaxHull);
        const hull = maxHull;
        const maxShields = applyStatVariation(shipType.baseMaxShields);
        const shields = maxShields;
        const lasers = Math.max(1, applyStatVariation(shipType.baseLasers)); // At least 1 laser
        const engine = Math.max(1, applyStatVariation(shipType.baseEngine));
        const radar = Math.max(1, applyStatVariation(shipType.baseRadar)); // At least 1 radar
        
        return new Ship(fuel, maxFuel, cargoCapacity, hull, maxHull, shipType.id, shields, maxShields, lasers, engine, radar);
    }
    
    return {
        generateStartingShip,
        generateRandomShip,
        generateShipOfType,
        clearUsedNames
    };
})();
