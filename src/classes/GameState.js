/**
 * GameState Class
 * Manages the overall game state
 */

class GameState {
    constructor() {
        this.ships = []; // Player's ships
        this.activeShipIndex = 0; // Index of currently active ship
        this.officers = [];
        this.systems = [];
        this.currentSystemIndex = 0;
        this.previousSystemIndex = 0; // Track system player departed from (for jail mechanic)
        this.x = 0; // Player's current x position
        this.y = 0; // Player's current y position
        this.credits = 1000; // Player's money
        this.reputation = 0; // Player's reputation (-100 to 100)
        this.bounty = 0; // Player's bounty (credits)
        this.visitedSystems = []; // Array of visited system indices
        this.date = new Date(3000, 0, 1); // Game date set to January 1, 3000 AD
        this.encounterShips = []; // Ships involved in current encounter
        this.encounter = false; // Whether an encounter is active
        this.asteroids = []; // Asteroids in current combat encounter
        this.encounterCargo = {}; // Cargo held by encounter ships
        
        // Quest and message system
        this.messages = []; // Array of Message objects
        this.activeQuests = []; // Array of active quest IDs
        this.completedQuests = []; // Array of completed quest IDs
        
        // Perk system
        this.perks = new Set(); // Set of perk IDs the player has learned
        this.enabledCargoTypes = [...CARGO_TYPES_SAFE]; // Array of cargo types player can buy/loot
        this.enabledShipTypes = [...SHIP_TYPES_BASIC]; // Array of ship types player can buy
        
        // Rank system - maps system index to rank ID
        this.systemRanks = {}; // { systemIndex: 'RANK_ID' }
        
        // Combat state
        this.combatAction = null; // Current combat action being executed
        this.combatHandler = null; // Current combat action handler
        this.activeShipCombatIndex = 0; // Index of current active ship in combat
    }
    
    /**
     * Get the current star system the player is in
     * @returns {StarSystem|null}
     */
    getCurrentSystem() {
        return this.systems[this.currentSystemIndex] || null;
    }
    
    /**
     * Set player position to a specific system
     * @param {number} systemIndex - Index of the system
     */
    setCurrentSystem(systemIndex) {
        if (systemIndex >= 0 && systemIndex < this.systems.length) {
            this.currentSystemIndex = systemIndex;
            const system = this.systems[systemIndex];
            this.x = system.x;
            this.y = system.y;
            
            // Mark system as visited
            if (!this.visitedSystems.includes(systemIndex)) {
                this.visitedSystems.push(systemIndex);
            }
        }
    }
    
    /**
     * Get nearby systems within a certain range
     * @param {number} range - Maximum distance
     * @returns {Array<{system: StarSystem, distance: number}>}
     */
    getNearbySystems(range) {
        const currentSystem = this.getCurrentSystem();
        if (!currentSystem) return [];
        
        return this.systems
            .map(system => ({
                system,
                distance: currentSystem.distanceTo(system)
            }))
            .filter(item => item.distance <= range && item.distance > 0)
            .sort((a, b) => a.distance - b.distance);
    }
    
    /**
     * Check if 50 years have passed (retirement time)
     * @returns {boolean}
     */
    hasRetirementTimePassed() {
        const startDate = new Date(3000, 0, 1);
        const currentDate = this.date;
        const yearsPassed = (currentDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
        return yearsPassed >= 50;
    }
    
    /**
     * Get player's rank at current system
     * @returns {Object} Rank object (defaults to RANKS.NONE)
     */
    getRankAtCurrentSystem() {
        const rankId = this.systemRanks[this.currentSystemIndex] || 'NONE';
        return RANKS[rankId] || RANKS.NONE;
    }
    
    /**
     * Set player's rank at current system
     * @param {string} rankId - Rank ID to set
     */
    setRankAtCurrentSystem(rankId) {
        this.systemRanks[this.currentSystemIndex] = rankId;
    }
}
