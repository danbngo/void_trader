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
     * Generate a starting ship for the player
     * @returns {Ship}
     */
    function generateStartingShip() {
        const name = shipNames[Math.floor(Math.random() * shipNames.length)];
        const maxFuel = 100;
        const fuel = maxFuel;
        const cargoCapacity = 50;
        const maxHull = 100;
        const hull = maxHull;
        
        return new Ship(name, fuel, maxFuel, cargoCapacity, hull, maxHull);
    }
    
    /**
     * Generate a random ship for sale
     * @returns {Ship}
     */
    function generateRandomShip() {
        const name = shipNames[Math.floor(Math.random() * shipNames.length)];
        const maxFuel = 50 + Math.floor(Math.random() * 151); // 50-200
        const fuel = maxFuel;
        const cargoCapacity = 20 + Math.floor(Math.random() * 81); // 20-100
        const maxHull = 50 + Math.floor(Math.random() * 151); // 50-200
        const hull = maxHull;
        
        return new Ship(name, fuel, maxFuel, cargoCapacity, hull, maxHull);
    }
    
    return {
        generateStartingShip,
        generateRandomShip
    };
})();
