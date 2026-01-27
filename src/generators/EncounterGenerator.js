/**
 * Encounter Generator
 * Generates encounter ships, cargo, and special drops
 */

const EncounterGenerator = (() => {
    /**
     * Generate encounter ships, cargo, and ship modules
     * @param {GameState} gameState
     * @param {Object} encounterType
     * @returns {Object} metadata for debugging
     */
    function generateEncounter(gameState, encounterType) {
        gameState.encounterShips = [];
        gameState.encounterCargo = {};
        gameState.encounterShipModules = [];
        
        if (!encounterType || !encounterType.shipTypes) {
            return { retryCount: 0, totalCargoCapacity: 0, totalCargoAmount: 0, cargoRatio: 0 };
        }
        
        // For abandoned ships, generate exactly 1 ship. For others, use encounter type's min/max
        let numShips;
        if (encounterType.id === 'ABANDONED_SHIP') {
            numShips = 1;
        } else {
            const minShips = encounterType.minShips || 1;
            const maxShips = encounterType.maxShips || 3;
            numShips = minShips + Math.floor(Math.random() * (maxShips - minShips + 1));
        }
        
        for (let i = 0; i < numShips; i++) {
            const randomShipType = encounterType.shipTypes[
                Math.floor(Math.random() * encounterType.shipTypes.length)
            ];
            
            // Handle both string IDs and ship type objects
            const shipTypeId = typeof randomShipType === 'string' ? randomShipType : randomShipType.id;
            const ship = ShipGenerator.generateShipOfType(shipTypeId);
            
            // Optionally damage the ship
            if (Math.random() < ENEMY_SHIP_HULL_DAMAGED_CHANCE) {
                const hullRatio = ENEMY_DAMAGED_SHIP_MIN_HULL_RATIO + 
                    Math.random() * (ENEMY_DAMAGED_SHIP_MAX_HULL_RATIO - ENEMY_DAMAGED_SHIP_MIN_HULL_RATIO);
                ship.hull = Math.floor(ship.maxHull * hullRatio);
            }
            
            gameState.encounterShips.push(ship);
        }
        
        // Calculate total cargo capacity and generate encounter cargo
        const totalCargoCapacity = gameState.encounterShips.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
        const cargoRatio = ENEMY_MIN_CARGO_RATIO + Math.random() * (ENEMY_MAX_CARGO_RATIO - ENEMY_MIN_CARGO_RATIO);
        const totalCargoAmount = Math.floor(totalCargoCapacity * cargoRatio);
        
        let retryCount = 0;
        
        // Special handling for alien encounters - they only carry RELICS
        if (encounterType.id === 'ALIEN_SKIRMISH' || encounterType.id === 'ALIEN_DEFENSE') {
            if (totalCargoAmount > 0) {
                gameState.encounterCargo['RELICS'] = totalCargoAmount;
            }
        } else {
            // Generate cargo (with retry logic for merchants and abandoned ships)
            const maxRetries = (encounterType.id === 'MERCHANT' || encounterType.id === 'ABANDONED_SHIP') ? 100 : 1;
            let cargoGenerated = false;
            
            while (!cargoGenerated && retryCount < maxRetries) {
                retryCount++;
                gameState.encounterCargo = {};
                
                if (totalCargoAmount > 0 || encounterType.id === 'ABANDONED_SHIP') {
                    // Use CARGO_TYPES_TRADEABLE to exclude RELICS from encounter cargo
                    const cargoTypes = CARGO_TYPES_TRADEABLE.map(ct => ct.id);
                    
                    // Distribute cargo amount across types
                    let remainingCargo = totalCargoAmount;
                    
                    cargoTypes.forEach(cargoTypeId => {
                        if (remainingCargo > 0 && Math.random() < ENEMY_HAS_CARGO_TYPE_CHANCE) {
                            const amount = Math.min(remainingCargo, Math.floor(Math.random() * Math.max(1, remainingCargo)) + 1);
                            gameState.encounterCargo[cargoTypeId] = amount;
                            remainingCargo -= amount;
                        }
                    });
                }
                
                const hasAnyCargo = Object.values(gameState.encounterCargo).some(amount => amount > 0);
                if (encounterType.id === 'MERCHANT' || encounterType.id === 'ABANDONED_SHIP') {
                    cargoGenerated = hasAnyCargo;
                } else {
                    cargoGenerated = true;
                }
            }
        }
        
        // Transfer encounterCargo to the first ship's cargo (for LootMenu compatibility)
        if (gameState.encounterShips.length > 0) {
            const firstShip = gameState.encounterShips[0];
            for (const cargoId in gameState.encounterCargo) {
                if (gameState.encounterCargo[cargoId] > 0) {
                    firstShip.cargo[cargoId] = gameState.encounterCargo[cargoId];
                }
            }
        }
        
        // Module drops (alien defense fleets)
        let shipModules = Array.isArray(encounterType.shipModules) ? [...encounterType.shipModules] : [];
        if (encounterType.id === 'ALIEN_DEFENSE') {
            const defenseFleetsDefeated = gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_DEFENSE_FLEETS_DEFEATED] || 0;
            if (shipModules.length === 0) {
                const forceDrop = defenseFleetsDefeated === 0;
                const shouldDrop = forceDrop || Math.random() < ALIEN_DEFENSE_FLEET_DROP_MODULE_CHANCE;
                const alienModules = SHIP_MODULES_ARRAY.filter(module => module.alienTechnology);
                if (shouldDrop && alienModules.length > 0) {
                    const module = alienModules[Math.floor(Math.random() * alienModules.length)];
                    shipModules = [module.id];
                }
            }
            gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_DEFENSE_FLEETS_DEFEATED] = defenseFleetsDefeated + 1;
        }
        
        gameState.encounterShipModules = shipModules;
        
        return { retryCount, totalCargoCapacity, totalCargoAmount, cargoRatio };
    }
    
    return {
        generateEncounter
    };
})();
