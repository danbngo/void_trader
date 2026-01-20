/**
 * Ship Generator
 */

const ShipGenerator = (() => {
    const shipNames = [
        'Wanderer', 'Voyager', 'Explorer', 'Pioneer', 'Venture',
        'Nomad', 'Pathfinder', 'Seeker', 'Drifter', 'Stargazer',
        'Horizon', 'Infinity', 'Endeavor', 'Discovery', 'Fortune'
    ];
    
    /**
     * Apply stat variation to a base stat
     * @param {number} baseStat - Base stat value
     * @returns {number} - Varied stat value
     */
    function applyStatVariation(baseStat) {
        const range = SHIP_MAX_STAT_VARIATION - SHIP_MIN_STAT_VARIATION;
        const multiplier = SHIP_MIN_STAT_VARIATION + Math.random() * range;
        return Math.floor(baseStat * multiplier);
    }
    
    /**
     * Generate a starting ship for the player
     * @returns {Ship}
     */
    function generateStartingShip() {
        const name = shipNames[Math.floor(Math.random() * shipNames.length)];
        const shipType = SHIP_TYPES.SCOUT;
        
        const maxFuel = shipType.baseMaxFuel;
        const fuel = maxFuel;
        const cargoCapacity = shipType.baseCargoCapacity;
        const maxHull = shipType.baseMaxHull;
        const hull = maxHull;
        const maxShields = shipType.baseMaxShields;
        const shields = maxShields;
        const lasers = shipType.baseLasers;
        const engine = shipType.baseEngine;
        const radar = shipType.baseRadar;
        
        return new Ship(name, fuel, maxFuel, cargoCapacity, hull, maxHull, shipType.id, shields, maxShields, lasers, engine, radar);
    }
    
    /**
     * Generate a random ship for sale
     * @returns {Ship}
     */
    function generateRandomShip() {
        const name = shipNames[Math.floor(Math.random() * shipNames.length)];
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
        
        return new Ship(name, fuel, maxFuel, cargoCapacity, hull, maxHull, shipType.id, shields, maxShields, lasers, engine, radar);
    }
    
    /**
     * Generate a ship of a specific type
     * @param {string} shipTypeId - ID of the ship type
     * @returns {Ship}
     */
    function generateShipOfType(shipTypeId) {
        const name = shipNames[Math.floor(Math.random() * shipNames.length)];
        const shipType = SHIP_TYPES[shipTypeId] || SHIP_TYPES.FREIGHTER;
        
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
        
        return new Ship(name, fuel, maxFuel, cargoCapacity, hull, maxHull, shipType.id, shields, maxShields, lasers, engine, radar);
    }
    
    return {
        generateStartingShip,
        generateRandomShip,
        generateShipOfType
    };
})();
