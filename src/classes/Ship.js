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
        this.cargo = [];
    }
}
