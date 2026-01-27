/**
 * News - Represents a news event affecting the galaxy
 */

class News {
    /**
     * Create a new news event
     * @param {Object} newsType - The news type from NEWS_TYPES
     * @param {StarSystem} originSystem - System where news originates
     * @param {StarSystem} targetSystem - Target system (null for local events)
     * @param {number} startYear - Year when news event starts
     * @param {number} duration - Duration in days
     * @param {GameState} gameState - Current game state (optional, for alien news)
     */
    constructor(newsType, originSystem, targetSystem, startYear, duration, gameState = null, globalNews = false) {
        this.newsType = newsType;
        this.originSystem = originSystem;
        this.targetSystem = targetSystem;
        this.startYear = startYear;
        this.duration = duration;
        this.endYear = startYear + (duration / 365.25); // Convert days to years
        this.completed = false;
        this.readByPlayer = false;
        this.globalNews = globalNews; // Global news shows up everywhere
        
        // Generate descriptions
        this.name = newsType.name;
        this.description = newsType.descriptionGenerator(this);
        // endDescription will be generated when completing
        
        // Call onStart to apply effects
        if (gameState) {
            newsType.onStart(this, gameState);
        } else {
            newsType.onStart(this);
        }
    }
    
    /**
     * Check if news event is still valid
     * @param {GameState} gameState - Current game state
     * @returns {boolean} True if news is still valid
     */
    isValid(gameState) {
        if (this.newsType.checkValidity) {
            return this.newsType.checkValidity(this, gameState);
        }
        return true; // News types without checkValidity are always valid
    }
    
    /**
     * Check if news event should expire
     * @param {number} currentYear - Current game year
     * @returns {boolean} True if news should expire
     */
    shouldExpire(currentYear) {
        return currentYear >= this.endYear && !this.completed;
    }
    
    /**
     * Mark news as completed and apply end effects
     * @param {GameState} gameState - Current game state
     */
    complete(gameState) {
        if (!this.completed) {
            this.completed = true;
            this.completionYear = gameState ? gameState.currentYear : this.endYear;
            
            // Generate end description based on current state
            if (this.newsType.endDescriptionGenerator) {
                this.endDescription = this.newsType.endDescriptionGenerator(this, gameState);
            }
            
            // Apply end effects
            if (gameState) {
                this.newsType.onEnd(this, gameState);
                
                // If this was an alien conquest or liberation event, adjust encounter weights
                const alienNewsTypes = ['ALIEN_CONQUEST', 'ALIEN_LIBERATION', 'ALIEN_INSTA_CONQUEST'];
                if (alienNewsTypes.includes(this.newsType.id)) {
                    SystemGenerator.adjustEncounterWeightsForAliens(gameState.systems);
                }
            } else {
                this.newsType.onEnd(this);
            }
        }
    }
    
    /**
     * Mark news as read by player
     */
    markAsRead() {
        this.readByPlayer = true;
    }
    
    /**
     * Serialize news for saving
     * @returns {Object} Serialized news data
     */
    serialize() {
        return {
            newsTypeId: this.newsType.id,
            originSystemIndex: this.originSystem ? this.originSystem.index : null,
            targetSystemIndex: this.targetSystem ? this.targetSystem.index : null,
            startYear: this.startYear,
            duration: this.duration,
            endYear: this.endYear,
            completed: this.completed,
            completionYear: this.completionYear,
            readByPlayer: this.readByPlayer
        };
    }
    
    /**
     * Deserialize news from saved data
     * @param {Object} data - Serialized news data
     * @param {Array<StarSystem>} systems - Array of all systems
     * @returns {News} Deserialized news
     */
    static deserialize(data, systems) {
        const newsType = NEWS_TYPES[data.newsTypeId];
        const originSystem = data.originSystemIndex !== null ? systems[data.originSystemIndex] : null;
        const targetSystem = data.targetSystemIndex !== null ? systems[data.targetSystemIndex] : null;
        
        const news = new News(newsType, originSystem, targetSystem, data.startYear, data.duration);
        news.endYear = data.endYear;
        news.completed = data.completed;
        news.completionYear = data.completionYear;
        news.readByPlayer = data.readByPlayer;
        
        return news;
    }
}
