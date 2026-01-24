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
     * @param {number} radar - Radar level (affects targeting accuracy)
     */
    constructor(name, fuel, maxFuel, cargoCapacity, hull = 100, maxHull = 100, type = 'SCOUT', shields = 0, maxShields = 0, lasers = 0, engine = 5, radar = 5) {
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
        this.radar = radar;
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
        
        const baseValue = (fuelValue + cargoValue + hullValue + shieldValue + laserValue) * conditionMultiplier;
        return Math.floor(Math.pow(baseValue, 1.5) / 10);
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
    
    /**
     * Calculate base fuel cost for a distance
     * @param {number} distance - Distance to travel
     * @returns {number} Base fuel cost
     */
    static calculateBaseFuelCost(distance) {
        return Math.ceil(distance);
    }
    
    /**
     * Calculate fleet fuel cost (multiplied by number of ships)
     * @param {number} distance - Distance to travel
     * @param {number} numShips - Number of ships in fleet
     * @returns {number} Total fuel cost for fleet
     */
    static calculateFleetFuelCost(distance, numShips) {
        return Ship.calculateBaseFuelCost(distance) * numShips;
    }
    
    /**
     * Check if fleet can reach a destination based on total fuel
     * @param {Array<Ship>} ships - Array of ships in fleet
     * @param {number} fromX - Starting X coordinate
     * @param {number} fromY - Starting Y coordinate
     * @param {number} toX - Destination X coordinate
     * @param {number} toY - Destination Y coordinate
     * @returns {boolean}
     */
    static canFleetReach(ships, fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const fleetFuelCost = Ship.calculateFleetFuelCost(distance, ships.length);
        const totalFuel = ships.reduce((sum, ship) => sum + ship.fuel, 0);
        return totalFuel >= fleetFuelCost;
    }
    
    /**
     * Get total cargo capacity across fleet
     * @param {Array<Ship>} ships - Array of ships
     * @returns {number} Total cargo capacity
     */
    static getFleetCargoCapacity(ships) {
        return ships.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
    }
    
    /**
     * Get total available cargo space across fleet
     * @param {Array<Ship>} ships - Array of ships
     * @returns {number} Total available cargo space
     */
    static getFleetAvailableCargoSpace(ships) {
        return ships.reduce((sum, ship) => sum + ship.getAvailableCargoSpace(), 0);
    }
    
    /**
     * Get all cargo across fleet
     * @param {Array<Ship>} ships - Array of ships
     * @returns {Object} Object with cargo type IDs as keys and total amounts as values
     */
    static getFleetCargo(ships) {
        const totalCargo = {};
        ships.forEach(ship => {
            Object.keys(ship.cargo).forEach(cargoId => {
                totalCargo[cargoId] = (totalCargo[cargoId] || 0) + ship.cargo[cargoId];
            });
        });
        return totalCargo;
    }
    
    /**
     * Add cargo to fleet (distributes across ships with available space)
     * @param {Array<Ship>} ships - Array of ships
     * @param {string} cargoId - Cargo type ID
     * @param {number} amount - Amount to add
     * @returns {number} Amount actually added
     */
    static addCargoToFleet(ships, cargoId, amount) {
        let remainingAmount = amount;
        
        for (const ship of ships) {
            if (remainingAmount <= 0) break;
            
            const availableSpace = ship.getAvailableCargoSpace();
            const amountToAdd = Math.min(availableSpace, remainingAmount);
            
            ship.cargo[cargoId] = (ship.cargo[cargoId] || 0) + amountToAdd;
            remainingAmount -= amountToAdd;
        }
        
        return amount - remainingAmount;
    }
    
    /**
     * Remove cargo from fleet (removes from ships that have it)
     * @param {Array<Ship>} ships - Array of ships
     * @param {string} cargoId - Cargo type ID
     * @param {number} amount - Amount to remove
     * @returns {number} Amount actually removed
     */
    static removeCargoFromFleet(ships, cargoId, amount) {
        let remainingAmount = amount;
        
        for (const ship of ships) {
            if (remainingAmount <= 0) break;
            
            const currentAmount = ship.cargo[cargoId] || 0;
            const amountToRemove = Math.min(currentAmount, remainingAmount);
            
            ship.cargo[cargoId] = currentAmount - amountToRemove;
            remainingAmount -= amountToRemove;
        }
        
        return amount - remainingAmount;
    }
}
