/**
 * Ship Class
 * Represents the player's ship
 */

class Ship {
    /**
     * @param {string} name - Name of the ship
     * @param {number} fuel - Current fuel amount
     * @param {number} maxFuel - Maximum fuel capacity
     * @param {number} cargoCapacity - Maximum cargo capacity
     * @param {number} hull - Current hull integrity
     * @param {number} maxHull - Maximum hull integrity
     * @param {string} type - Ship type ID (optional)
     * @param {number} shields - Current shield strength
     * @param {number} maxShields - Maximum shield capacity
     * @param {number} lasers - Number of laser weapons
     * @param {number} engine - Engine level (affects travel speed)
     */
    constructor(name, fuel, maxFuel, cargoCapacity, hull = 100, maxHull = 100, type = 'TRADER', shields = 0, maxShields = 0, lasers = 0, engine = 5) {
        this.name = name;
        this.type = type;
        this.fuel = fuel;
        this.maxFuel = maxFuel;
        this.cargoCapacity = cargoCapacity;
        this.hull = hull;
        this.maxHull = maxHull;
        this.shields = shields;
        this.maxShields = maxShields;
        this.lasers = lasers;
        this.engine = engine;
        // Initialize cargo for all types
        this.cargo = {};
        ALL_CARGO_TYPES.forEach(cargoType => {
            this.cargo[cargoType.id] = 0;
        });
    }
    
    /**
     * Get total cargo count
     * @returns {number}
     */
    getTotalCargo() {
        return Object.values(this.cargo).reduce((sum, count) => sum + count, 0);
    }
    
    /**
     * Get available cargo space
     * @returns {number}
     */
    getAvailableCargoSpace() {
        return this.cargoCapacity - this.getTotalCargo();
    }
    
    /**
     * Calculate ship value based on stats
     * @returns {number}
     */
    getValue() {
        // Base value calculation: fuel * 10 + cargo * 50 + hull * 5 + shields * 15 + lasers * 500
        const fuelValue = this.maxFuel * 10;
        const cargoValue = this.cargoCapacity * 50;
        const hullValue = this.maxHull * 5;
        const shieldValue = this.maxShields * 15;
        const laserValue = this.lasers * 500;
        const conditionMultiplier = (this.hull / this.maxHull); // Degraded value based on current hull
        
        return Math.floor((fuelValue + cargoValue + hullValue + shieldValue + laserValue) * conditionMultiplier);
    }
    
    /**
     * Check if ship can reach a destination
     * @param {number} fromX - Starting X coordinate
     * @param {number} fromY - Starting Y coordinate
     * @param {number} toX - Destination X coordinate
     * @param {number} toY - Destination Y coordinate
     * @returns {boolean}
     */
    canReach(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return this.fuel >= distance;
    }
}
