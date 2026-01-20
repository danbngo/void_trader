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
                ship: gameState.ship,
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
                completedQuests: gameState.completedQuests
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
        
        // Reconstruct ship
        gameState.ship = new Ship(
            data.ship.name,
            data.ship.fuel,
            data.ship.maxFuel,
            data.ship.cargoCapacity
        );
        gameState.ship.cargo = data.ship.cargo;
        
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
