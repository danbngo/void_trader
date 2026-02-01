/**
 * Save/Load Manager
 * Handles saving and loading game state to localStorage
 */

const SaveLoadManager = (() => {
    const SAVE_KEY_PREFIX = SAVE_FILE_PREFIX;
    const SAVE_LIST_KEY = 'voidtrader_saves';
    
    /**
     * Get list of all saves
     * @returns {Array<{id: string, name: string, date: Date}>}
     */
    function getSaveList() {
        const savesJson = localStorage.getItem(SAVE_LIST_KEY);
        if (!savesJson) return [];
        
        const saves = JSON.parse(savesJson);
        // Convert date strings back to Date objects
        return saves.map(save => ({
            ...save,
            date: new Date(save.date)
        }));
    }
    
    /**
     * Save the current game state
     * @param {string} saveName - Name for the save file
     * @param {GameState} gameState - Current game state
     */
    function saveGame(saveName, gameState) {
        const saveId = saveName.replace(/[^a-zA-Z0-9]/g, '_');
        const saveKey = SAVE_KEY_PREFIX + saveId;
        
        // Create save data
        const saveData = {
            gameState: {
                credits: gameState.credits,
                currentSystemIndex: gameState.currentSystemIndex,
                x: gameState.x,
                y: gameState.y,
                ships: gameState.ships,
                subordinates: gameState.subordinates,
                systems: gameState.systems,
                visitedSystems: gameState.visitedSystems,
                date: gameState.date.toISOString(),
                encounterShips: gameState.encounterShips,
                encounter: gameState.encounter,
                // Save message states (ID, isRead, suppressWarning)
                messages: gameState.messages.map(m => ({
                    id: m.id,
                    isRead: m.isRead,
                    suppressWarning: m.suppressWarning
                })),
                // Quest arrays are already just IDs
                activeQuests: gameState.activeQuests,
                completedQuests: gameState.completedQuests,
                readQuests: gameState.readQuests || [],
                questCompletedDates: gameState.questCompletedDates || {},
                questAddedDates: gameState.questAddedDates || {},
                systemsWithQuests: gameState.systemsWithQuests || [],
                // Save news events
                newsEvents: gameState.newsEvents ? gameState.newsEvents.map(n => n.serialize()) : [],
                systemsWithNewNews: gameState.systemsWithNewNews || [],
                aliensSpawned: gameState.aliensSpawned || false,
                // Save job system
                currentJob: gameState.currentJob ? gameState.currentJob.serialize() : null,
                completedJobReward: gameState.completedJobReward ? gameState.completedJobReward.serialize() : null,
                timeSinceDock: gameState.timeSinceDock || 0,
                // Save rank system
                systemRanks: gameState.systemRanks,
                reputation: gameState.reputation,
                bounty: gameState.bounty,
                // Save perk system
                perks: Array.from(gameState.perks),
                enabledCargoTypes: gameState.enabledCargoTypes,
                enabledShipTypes: gameState.enabledShipTypes,
                // Save consumables and job board state
                consumables: gameState.consumables || {},
                jobsBoardSeenSignatures: gameState.jobsBoardSeenSignatures || {},
                activeCombatEffect: gameState.activeCombatEffect || null
            },
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        
        // Update save list
        let saves = getSaveList();
        const existingIndex = saves.findIndex(s => s.id === saveId);
        
        if (existingIndex >= 0) {
            // Update existing save
            saves[existingIndex].date = new Date();
        } else {
            // Add new save
            saves.push({
                id: saveId,
                name: saveName,
                date: new Date()
            });
        }
        
        // Sort by date (newest first)
        saves.sort((a, b) => b.date - a.date);
        
        localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(saves));
    }
    
    /**
     * Load a saved game
     * @param {string} saveId - ID of the save to load
     * @returns {GameState|null}
     */
    function loadGame(saveId) {
        const saveKey = SAVE_KEY_PREFIX + saveId;
        const saveJson = localStorage.getItem(saveKey);
        
        if (!saveJson) return null;
        
        const saveData = JSON.parse(saveJson);
        const data = saveData.gameState;
        
        // Reconstruct game state
        const gameState = new GameState();
        gameState.credits = data.credits;
        gameState.currentSystemIndex = data.currentSystemIndex;
        gameState.x = data.x;
        gameState.y = data.y;
        gameState.visitedSystems = data.visitedSystems || [];
        gameState.date = data.date ? new Date(data.date) : new Date(3000, 0, 1);
        
        // Reconstruct encounter ships
        gameState.encounterShips = (data.encounterShips || []).map(s => {
            const ship = new Ship(
                s.fuel, 
                s.maxFuel, 
                s.cargoCapacity, 
                s.hull !== undefined ? s.hull : (s.maxHull || 100),
                s.maxHull || 100,
                s.type || 'FREIGHTER',
                s.shields !== undefined ? s.shields : (s.maxShields || 0),
                s.maxShields || 0,
                s.lasers || 5,
                s.engine || 5,
                s.radar || 5
            );
            ship.cargo = s.cargo || {};
            ship.modules = s.modules || [];
            // Restore combat state
            ship.x = s.x || 0;
            ship.y = s.y || 0;
            ship.vx = s.vx || 0;
            ship.vy = s.vy || 0;
            ship.angle = s.angle || 0;
            ship.fled = s.fled || false;
            ship.disabled = s.disabled || false;
            ship.escaped = s.escaped || false;
            ship.acted = s.acted || false;
            return ship;
        });
        
        gameState.encounter = data.encounter || false;
        
        // Reconstruct ships
        gameState.ships = (data.ships || []).map(s => {
            const ship = new Ship(
                s.fuel, 
                s.maxFuel, 
                s.cargoCapacity, 
                s.hull !== undefined ? s.hull : (s.maxHull || 100),
                s.maxHull || 100,
                s.type || 'FREIGHTER',
                s.shields !== undefined ? s.shields : (s.maxShields || 0),
                s.maxShields || 0,
                s.lasers || 5,
                s.engine || 5,
                s.radar || 5
            );
            ship.cargo = s.cargo || {};
            ship.modules = s.modules || [];
            return ship;
        });
        
        // Reconstruct subordinates
        gameState.subordinates = data.subordinates.map(o => {
            const officer = new Officer(o.name, o.role, o.skill);
            // Restore experience system properties
            officer.level = o.level || 1;
            officer.experience = o.experience || 0;
            officer.skillPoints = o.skillPoints || 0;
            officer.skills = o.skills || {
                piloting: 0,
                navigation: 0,
                barter: 0,
                gunnery: 0,
                smuggling: 0,
                engineering: 0
            };
            if (officer.skills.navigation === undefined) {
                officer.skills.navigation = 0;
            }
            return officer;
        });
        
        // Reconstruct systems
        gameState.systems = data.systems.map((s, index) => {
            const system = new StarSystem(s.name, s.x, s.y, s.population);
            system.index = index; // Restore index
            system.governmentType = s.governmentType || null;
            system.cultureLevel = s.cultureLevel || null;
            system.technologyLevel = s.technologyLevel || null;
            system.industryLevel = s.industryLevel || null;
            system.populationLevel = s.populationLevel || null;
            system.stars = s.stars || [];
            system.planets = s.planets || [];
            system.moons = s.moons || [];
            system.belts = s.belts || [];
            system.features = s.features || [];
            system.cargoStock = s.cargoStock || {};
            system.cargoPriceModifier = s.cargoPriceModifier || {};
            
            // Reconstruct ships in the system
            system.ships = (s.ships || []).map(shipData => {
                const ship = new Ship(
                    shipData.fuel, 
                    shipData.maxFuel, 
                    shipData.cargoCapacity, 
                    shipData.hull !== undefined ? shipData.hull : (shipData.maxHull || 100),
                    shipData.maxHull || 100,
                    shipData.type || 'FREIGHTER',
                    shipData.shields !== undefined ? shipData.shields : (shipData.maxShields || 0),
                    shipData.maxShields || 0,
                    shipData.lasers || 5,
                    shipData.engine || 5,
                    shipData.radar || 5
                );
                ship.cargo = shipData.cargo || {};
                ship.modules = shipData.modules || [];
                return ship;
            });
            
            system.modules = s.modules || [];
            
            system.pirateWeight = s.pirateWeight || 0;
            system.policeWeight = s.policeWeight || 0;
            system.merchantWeight = s.merchantWeight || 0;
            system.buildings = s.buildings || [];
            system.conqueredByAliens = s.conqueredByAliens || false;
            system.conqueredYear = s.conqueredYear || null;
            return system;
        });
        
        // Reconstruct messages from MESSAGES definitions
        gameState.messages = [];
        if (data.messages && Array.isArray(data.messages)) {
            data.messages.forEach(msgData => {
                const messageTemplate = MESSAGES[msgData.id];
                if (messageTemplate) {
                    // Create a new Message instance from the template
                    const message = new Message(
                        messageTemplate.id,
                        messageTemplate.title,
                        messageTemplate.content,
                        messageTemplate.onRead,
                        msgData.suppressWarning || false
                    );
                    // Restore the read state
                    if (msgData.isRead) {
                        message.isRead = true;
                    }
                    gameState.messages.push(message);
                }
            });
        }
        
        // Restore quest arrays (already just IDs)
        gameState.activeQuests = data.activeQuests || [];
        gameState.completedQuests = data.completedQuests || [];
        gameState.readQuests = data.readQuests || [];
        gameState.questCompletedDates = data.questCompletedDates || {};
        gameState.questAddedDates = data.questAddedDates || {};
        gameState.systemsWithQuests = data.systemsWithQuests || [];
        
        // Restore news events
        gameState.newsEvents = [];
        if (data.newsEvents && Array.isArray(data.newsEvents)) {
            data.newsEvents.forEach(newsData => {
                const news = News.deserialize(newsData, gameState.systems);
                if (news) {
                    gameState.newsEvents.push(news);
                }
            });
        }
        gameState.systemsWithNewNews = data.systemsWithNewNews || [];
        gameState.aliensSpawned = data.aliensSpawned || false;
        
        // Restore job system
        gameState.currentJob = null;
        if (data.currentJob) {
            gameState.currentJob = Job.deserialize(data.currentJob, gameState.systems);
        }
        gameState.completedJobReward = null;
        if (data.completedJobReward) {
            gameState.completedJobReward = Job.deserialize(data.completedJobReward, gameState.systems);
        }
        gameState.timeSinceDock = data.timeSinceDock || 0;
        
        // Restore rank system
        gameState.systemRanks = data.systemRanks || {};
        gameState.reputation = data.reputation !== undefined ? data.reputation : 0;
        gameState.bounty = data.bounty !== undefined ? data.bounty : 0;
        
        // Restore perk system
        gameState.perks = new Set(data.perks || []);
        gameState.enabledCargoTypes = data.enabledCargoTypes || [...CARGO_TYPES_SAFE];
        gameState.enabledShipTypes = data.enabledShipTypes || [...SHIP_TYPES_BASIC];
        gameState.consumables = data.consumables || {};
        gameState.jobsBoardSeenSignatures = data.jobsBoardSeenSignatures || {};
        gameState.activeCombatEffect = data.activeCombatEffect || null;
        
        return gameState;
    }
    
    /**
     * Delete a save
     * @param {string} saveId - ID of the save to delete
     */
    function deleteSave(saveId) {
        const saveKey = SAVE_KEY_PREFIX + saveId;
        localStorage.removeItem(saveKey);
        
        // Update save list
        let saves = getSaveList();
        saves = saves.filter(s => s.id !== saveId);
        localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(saves));
    }
    
    return {
        getSaveList,
        saveGame,
        loadGame,
        deleteSave
    };
})();
