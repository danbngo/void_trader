/**
 * StarSystem Class
 * Represents a star system in the galaxy
 */

class StarSystem {
    /**
     * @param {string} name - Name of the star system
     * @param {number} x - X coordinate in galaxy
     * @param {number} y - Y coordinate in galaxy
     * @param {number} population - Population in millions
     * @param {string} economy - Economy type (Agricultural, Industrial, High-Tech, etc.)
     */
    constructor(name, x, y, population, economy) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.population = population;
        this.economy = economy;
        
        // Market data
        this.cargoStock = {}; // Amount of each cargo type available
        this.cargoPriceModifier = {}; // Price multipliers for each cargo type
    }
    
    /**
     * Calculate distance to another star system
     * @param {StarSystem} other - Another star system
     * @returns {number} Distance between systems
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
