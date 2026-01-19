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
     */
    constructor(name, fuel, maxFuel, cargoCapacity) {
        this.name = name;
        this.fuel = fuel;
        this.maxFuel = maxFuel;
        this.cargoCapacity = cargoCapacity;
        // Cargo is now stored as counts per type
        this.cargo = {
            AIR: 0,
            WATER: 0,
            FOOD: 0
        };
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
}
