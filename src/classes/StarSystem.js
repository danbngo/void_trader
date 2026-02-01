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
        
        // Buildings available in this system
        this.buildings = []; // Array of building IDs (e.g., 'MARKET', 'SHIPYARD', 'GUILD')

        // Celestial bodies
        this.stars = [];
        this.planets = [];
        this.moons = [];
        this.belts = [];

        // System features
        this.features = [];
        
        // Market data
        this.cargoStock = {}; // Amount of each cargo type available
        this.cargoPriceModifier = {}; // Price multipliers for each cargo type
        this.fees = 0; // Trading fees ratio (affects buy/sell prices)
        
        // Shipyard data
        this.ships = []; // Ships available for purchase
        this.modules = []; // Ship modules available for purchase
        
        // Tavern data
        this.officers = []; // Officers available for hire
        
        // Encounter weights
        this.pirateWeight = 0;
        this.policeWeight = 0;
        this.merchantWeight = 0;
        
        // Alien conquest state
        this.conqueredByAliens = false; // Whether this system is under alien control
        this.conqueredYear = null; // Year when system was conquered (if conquered)
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
