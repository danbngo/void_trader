/**
 * Ship Class
 * Represents the player's ship
 */

class Ship {
    /**
     * @param {number} fuel - Current fuel amount
     * @param {number} maxFuel - Maximum fuel capacity
     * @param {number} cargoCapacity - Maximum cargo capacity
     * @param {number} hull - Current hull integrity
     * @param {number} maxHull - Maximum hull integrity
     * @param {string} type - Ship type ID
     * @param {number} shields - Current shield strength
     * @param {number} maxShields - Maximum shield capacity
     * @param {number} lasers - Number of laser weapons
     * @param {number} engine - Engine level (affects travel speed)
     * @param {number} radar - Radar level (affects targeting accuracy)
     */
    constructor(fuel, maxFuel, cargoCapacity, hull = 100, maxHull = 100, type = 'SCOUT', shields = 0, maxShields = 0, lasers = 0, engine = 5, radar = 5, size = 0.01) {
        this.type = type;
        this.fuel = fuel;
        this.maxFuel = maxFuel;
        this.cargoCapacity = cargoCapacity;
        this.hull = hull;
        this.maxHull = maxHull;
        this.shields = shields;
        this.maxShields = maxShields;
        if (Array.isArray(lasers)) {
            const current = Number.isFinite(lasers[0]) ? lasers[0] : 0;
            const max = Number.isFinite(lasers[1]) ? lasers[1] : current;
            this.lasers = [current, Math.max(current, max)];
        } else {
            const laserValue = Number.isFinite(lasers) ? lasers : 0;
            this.lasers = [laserValue, laserValue];
        }
        this.engine = engine;
        this.radar = radar;
        this.size = size;
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0, w: 1 };
        this.modules = []; // Installed modules
        // Initialize cargo for all types
        this.cargo = {};
        ALL_CARGO_TYPES.forEach(cargoType => {
            this.cargo[cargoType.id] = 0;
        });
    }

    static DEFAULT_SIZE_AU = 0.01;
    
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
        // Base value calculation: fuel * 10 + cargo * 50 + hull * 5 + shields * 15 + lasers * 500 + radar * 100
        const fuelValue = this.maxFuel / AVERAGE_SHIP_FUEL;
        const cargoValue = this.cargoCapacity / AVERAGE_SHIP_CARGO;
        const hullValue = this.maxHull / AVERAGE_SHIP_HULL;
        const shieldValue = this.maxShields / AVERAGE_SHIP_SHIELDS;
        const laserValue = Ship.getLaserMax(this) / AVERAGE_SHIP_LASER;
        const radarValue = this.radar / AVERAGE_SHIP_RADAR;
        
        const baseValue = (fuelValue + cargoValue + hullValue + shieldValue + laserValue + radarValue) / 6 * AVERAGE_SHIP_VALUE;
        return Math.ceil(Math.pow(baseValue, 1.5));
    }

    static getLaserCurrent(ship) {
        if (!ship) {
            return 0;
        }
        if (Array.isArray(ship.lasers)) {
            return Number.isFinite(ship.lasers[0]) ? ship.lasers[0] : 0;
        }
        return Number.isFinite(ship.lasers) ? ship.lasers : 0;
    }

    static getLaserMax(ship) {
        if (!ship) {
            return 0;
        }
        if (Array.isArray(ship.lasers)) {
            const max = Number.isFinite(ship.lasers[1]) ? ship.lasers[1] : 0;
            return Math.max(Ship.getLaserCurrent(ship), max);
        }
        return Number.isFinite(ship.lasers) ? ship.lasers : 0;
    }

    static setLaserCurrent(ship, value) {
        if (!ship) {
            return;
        }
        const max = Ship.getLaserMax(ship);
        const next = Math.max(0, Math.min(max, Math.floor(value)));
        ship.lasers = [next, max];
    }

    static setLaserMax(ship, value) {
        if (!ship) {
            return;
        }
        const nextMax = Math.max(0, Math.floor(value));
        const current = Ship.getLaserCurrent(ship);
        ship.lasers = [Math.min(current, nextMax), nextMax];
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
    static calculateFleetFuelCost(distance, numShips, navigationLevel = 0) {
        const baseCost = Ship.calculateBaseFuelCost(distance) * numShips;
        const multiplier = SkillEffects.getFuelCostMultiplier(navigationLevel);
        return Math.ceil(baseCost * multiplier);
    }

    /**
     * Calculate fleet travel duration (days), factoring engine and piloting
     * @param {number} distance - Distance to travel
     * @param {Array<Ship>} ships - Fleet ships
     * @param {number} pilotingLevel - Max piloting skill level
     * @returns {number} Travel duration in days
     */
    static calculateFleetTravelDuration(distance, ships, pilotingLevel = 0) {
        const activeShip = ships[0];
        const engineMultiplier = AVERAGE_SHIP_ENGINE / activeShip.engine;
        const baseDuration = distance * AVERAGE_JOURNEY_DAYS_PER_LY * engineMultiplier;
        return SkillEffects.getTravelDuration(baseDuration, pilotingLevel);
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
    static canFleetReach(ships, fromX, fromY, toX, toY, navigationLevel = 0) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const fleetFuelCost = Ship.calculateFleetFuelCost(distance, ships.length, navigationLevel);
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
    
    /**
     * Get base max speed for a ship (without boost)
     * Central source of truth for speed calculations across all systems
     * @param {Ship} ship - The ship
     * @param {number} speedPerEngine - Units per second per engine level (AU/s per engine)
     * @returns {number} Base max speed in AU/s
     */
    static getBaseMaxSpeed(ship, speedPerEngine = 1 / 600) {
        if (!ship) return 0;
        const engine = ship.engine || 10;
        return engine * speedPerEngine;
    }
    
    /**
     * Get max speed for a ship (with optional boost multiplier)
     * Central source of truth for speed calculations across all systems
     * @param {Ship} ship - The ship
     * @param {boolean} isBoosting - Whether boost is active
     * @param {number} speedPerEngine - Units per second per engine level (AU/s per engine)
     * @param {number} boostMultiplier - Boost speed multiplier
     * @returns {number} Max speed in AU/s
     */
    static getMaxSpeed(ship, isBoosting = false, speedPerEngine = 1 / 600, boostMultiplier = 100) {
        const baseMaxSpeed = Ship.getBaseMaxSpeed(ship, speedPerEngine);
        return baseMaxSpeed * (isBoosting ? boostMultiplier : 1);
    }
}
