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
     */
    constructor(name, x, y, population) {
        this.name = name;
        this.x = x;
        this.y = y;

        this.primaryBody = null;
        this._pendingBodyData = {};
                
        // Buildings available in this system (stored on primary body)
        this.buildings = []; // Array of building IDs (e.g., 'MARKET', 'SHIPYARD', 'GUILD')

        // Celestial bodies
        this.stars = [];
        this.planets = [];
        this.moons = [];
        this.belts = [];
        this.station = null;

        // System features
        this.features = [];
        
        // Market data (stored on primaryBody)
        this.population = population;
        this.governmentType = null;
        this.cultureLevel = null;
        this.technologyLevel = null;
        this.industryLevel = null;
        this.populationLevel = null;
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

    _getPrimaryBodyProp(key, fallback) {
        if (this.primaryBody) {
            return this.primaryBody[key] ?? fallback;
        }
        if (this._pendingBodyData[key] !== undefined) {
            return this._pendingBodyData[key];
        }
        return fallback;
    }

    _setPrimaryBodyProp(key, value) {
        if (this.primaryBody) {
            this.primaryBody[key] = value;
        } else {
            this._pendingBodyData[key] = value;
        }
    }

    setPrimaryBody(body) {
        this.primaryBody = body;
        if (this.primaryBody) {
            Object.keys(this._pendingBodyData).forEach(key => {
                this.primaryBody[key] = this._pendingBodyData[key];
            });
        }
        this._pendingBodyData = {};
    }

    get population() { return this._getPrimaryBodyProp('population', 0); }
    set population(value) { this._setPrimaryBodyProp('population', value); }

    get governmentType() { return this._getPrimaryBodyProp('governmentType', null); }
    set governmentType(value) { this._setPrimaryBodyProp('governmentType', value); }

    get cultureLevel() { return this._getPrimaryBodyProp('cultureLevel', null); }
    set cultureLevel(value) { this._setPrimaryBodyProp('cultureLevel', value); }

    get technologyLevel() { return this._getPrimaryBodyProp('technologyLevel', null); }
    set technologyLevel(value) { this._setPrimaryBodyProp('technologyLevel', value); }

    get industryLevel() { return this._getPrimaryBodyProp('industryLevel', null); }
    set industryLevel(value) { this._setPrimaryBodyProp('industryLevel', value); }

    get populationLevel() { return this._getPrimaryBodyProp('populationLevel', null); }
    set populationLevel(value) { this._setPrimaryBodyProp('populationLevel', value); }

    get cargoStock() { return this._getPrimaryBodyProp('cargoStock', {}); }
    set cargoStock(value) { this._setPrimaryBodyProp('cargoStock', value); }

    get cargoPriceModifier() { return this._getPrimaryBodyProp('cargoPriceModifier', {}); }
    set cargoPriceModifier(value) { this._setPrimaryBodyProp('cargoPriceModifier', value); }

    get fees() { return this._getPrimaryBodyProp('fees', 0); }
    set fees(value) { this._setPrimaryBodyProp('fees', value); }

    get ships() { return this._getPrimaryBodyProp('ships', []); }
    set ships(value) { this._setPrimaryBodyProp('ships', value); }

    get modules() { return this._getPrimaryBodyProp('modules', []); }
    set modules(value) { this._setPrimaryBodyProp('modules', value); }

    get officers() { return this._getPrimaryBodyProp('officers', []); }
    set officers(value) { this._setPrimaryBodyProp('officers', value); }

    get buildings() { return this._getPrimaryBodyProp('buildings', []); }
    set buildings(value) { this._setPrimaryBodyProp('buildings', value); }

    get pirateWeight() { return this._getPrimaryBodyProp('pirateWeight', 0); }
    set pirateWeight(value) { this._setPrimaryBodyProp('pirateWeight', value); }

    get policeWeight() { return this._getPrimaryBodyProp('policeWeight', 0); }
    set policeWeight(value) { this._setPrimaryBodyProp('policeWeight', value); }

    get merchantWeight() { return this._getPrimaryBodyProp('merchantWeight', 0); }
    set merchantWeight(value) { this._setPrimaryBodyProp('merchantWeight', value); }

    get smugglersWeight() { return this._getPrimaryBodyProp('smugglersWeight', 0); }
    set smugglersWeight(value) { this._setPrimaryBodyProp('smugglersWeight', value); }

    get soldiersWeight() { return this._getPrimaryBodyProp('soldiersWeight', 0); }
    set soldiersWeight(value) { this._setPrimaryBodyProp('soldiersWeight', value); }

    get alienWeight() { return this._getPrimaryBodyProp('alienWeight', 0); }
    set alienWeight(value) { this._setPrimaryBodyProp('alienWeight', value); }

    get conqueredByAliens() { return this._getPrimaryBodyProp('conqueredByAliens', false); }
    set conqueredByAliens(value) { this._setPrimaryBodyProp('conqueredByAliens', value); }

    get conqueredYear() { return this._getPrimaryBodyProp('conqueredYear', null); }
    set conqueredYear(value) { this._setPrimaryBodyProp('conqueredYear', value); }
    
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
