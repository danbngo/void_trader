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
        
        return new Ship(name, fuel, maxFuel, cargoCapacity);
    }
    
    return {
        generateStartingShip
    };
})();
