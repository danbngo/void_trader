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
                officers: gameState.officers,
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
                // Save rank system
                systemRanks: gameState.systemRanks,
                reputation: gameState.reputation,
                bounty: gameState.bounty,
                // Save perk system
                perks: Array.from(gameState.perks),
                enabledCargoTypes: gameState.enabledCargoTypes,
                enabledShipTypes: gameState.enabledShipTypes
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
        gameState.encounterShips = data.encounterShips || [];
        gameState.encounter = data.encounter || false;
        
        // Reconstruct ships
        gameState.ships = (data.ships || []).map(s => {
            const ship = new Ship(s.name, s.fuel, s.maxFuel, s.cargoCapacity);
            ship.cargo = s.cargo || {};
            ship.hull = s.hull !== undefined ? s.hull : s.maxHull;
            ship.maxHull = s.maxHull || 100;
            ship.shields = s.shields !== undefined ? s.shields : s.maxShields;
            ship.maxShields = s.maxShields || 0;
            ship.engine = s.engine || 5;
            ship.radar = s.radar || 5;
            ship.lasers = s.lasers || 5;
            ship.type = s.type || 'FREIGHTER';
            return ship;
        });
        
        // Reconstruct officers
        gameState.officers = data.officers.map(o => 
            new Officer(o.name, o.role, o.skill)
        );
        
        // Reconstruct systems
        gameState.systems = data.systems.map(s => {
            const system = new StarSystem(s.name, s.x, s.y, s.population, s.economy);
            system.cargoStock = s.cargoStock || {};
            system.cargoPriceModifier = s.cargoPriceModifier || {};
            system.ships = s.ships || [];
            system.pirateWeight = s.pirateWeight || 0;
            system.policeWeight = s.policeWeight || 0;
            system.merchantWeight = s.merchantWeight || 0;
            system.buildings = s.buildings || [];
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
        
        // Restore rank system
        gameState.systemRanks = data.systemRanks || {};
        gameState.reputation = data.reputation !== undefined ? data.reputation : 0;
        gameState.bounty = data.bounty !== undefined ? data.bounty : 0;
        
        // Restore perk system
        gameState.perks = new Set(data.perks || []);
        gameState.enabledCargoTypes = data.enabledCargoTypes || [...CARGO_TYPES_SAFE];
        gameState.enabledShipTypes = data.enabledShipTypes || [...SHIP_TYPES_BASIC];
        
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
