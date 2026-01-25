/**
 * Abandoned Ship Encounter
 */

const AbandonedShipEncounter = {
    /**
     * Show abandoned ship encounter
     */
    show: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Abandoned Ship');
        let y = 2;
        
        UI.addText(10, y++, `Your sensors detect a derelict vessel floating in space.`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `No life signs detected. The ship appears to be abandoned.`, COLORS.TEXT_DIM);
        y++;
        
        // Silently set all player shields to 0 (not ready for potential ambush)
        gameState.ships.forEach(ship => {
            ship.shields = 0;
        });
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;
        
        // Show abandoned ship
        y = ShipTableRenderer.addNPCFleet(10, y, 'Derelict Vessel:', gameState.encounterShips);
        
        // Buttons centered at bottom
        const buttonY = grid.height - 4;
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Ignore', callback: () => {
                // Return to travel menu safely
                TravelMenu.resume();
            }, color: COLORS.BUTTON, helpText: 'Continue journey without investigating' },
            { key: '2', label: 'Approach & Loot', callback: () => {
                this.handleApproach(gameState, encType);
            }, color: COLORS.GREEN, helpText: 'Board the derelict and salvage cargo' }
        ]);
        
        UI.draw();
    },
    
    /**
     * Handle approaching the abandoned ship
     */
    handleApproach: function(gameState, encType) {
        // Check for ambush
        if (Math.random() < ABANDONED_SHIP_AMBUSH_CHANCE) {
            // It's a trap!
            this.triggerAmbush(gameState, encType);
        } else {
            // Safe to loot
            this.handleLoot(gameState, encType);
        }
    },
    
    /**
     * Trigger pirate ambush
     */
    triggerAmbush: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Ambush!');
        let y = 2;
        
        UI.addText(10, y++, `As you approach the derelict, multiple ships decloak around you!`, COLORS.TEXT_ERROR);
        UI.addText(10, y++, `"Heh, another fool falls for the bait!" - Pirates!`, COLORS.TEXT_ERROR);
        y++;
        UI.addText(10, y++, `Your shields are down! You're vulnerable!`, COLORS.YELLOW);
        
        // Generate pirate ships for ambush (1-3 ships)
        const numPirateShips = Math.floor(Math.random() * 3) + 1;
        gameState.encounterShips = [];
        
        for (let i = 0; i < numPirateShips; i++) {
            const pirateShipTypes = ENCOUNTER_TYPES.PIRATE.shipTypes;
            const randomShipType = pirateShipTypes[Math.floor(Math.random() * pirateShipTypes.length)];
            const ship = ShipGenerator.generateShipOfType(randomShipType);
            
            // Optionally damage the ship
            if (Math.random() < ENEMY_SHIP_HULL_DAMAGED_CHANCE) {
                const hullRatio = ENEMY_DAMAGED_SHIP_MIN_HULL_RATIO + 
                    Math.random() * (ENEMY_DAMAGED_SHIP_MAX_HULL_RATIO - ENEMY_DAMAGED_SHIP_MIN_HULL_RATIO);
                ship.hull = Math.floor(ship.maxHull * hullRatio);
            }
            
            gameState.encounterShips.push(ship);
        }
        
        // Generate pirate cargo
        const totalCargoCapacity = gameState.encounterShips.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
        const cargoRatio = ENEMY_MIN_CARGO_RATIO + Math.random() * (ENEMY_MAX_CARGO_RATIO - ENEMY_MIN_CARGO_RATIO);
        const totalCargoAmount = Math.floor(totalCargoCapacity * cargoRatio);
        
        gameState.encounterCargo = {};
        
        if (totalCargoAmount > 0) {
            const cargoTypes = Object.keys(CARGO_TYPES);
            cargoTypes.forEach(cargoTypeId => {
                if (Math.random() < ENEMY_HAS_CARGO_TYPE_CHANCE) {
                    const amount = Math.floor(Math.random() * totalCargoAmount) + 1;
                    gameState.encounterCargo[cargoTypeId] = amount;
                }
            });
        }
        
        // Set shields to 0 for all player ships (ambushed!)
        gameState.ships.forEach(ship => {
            ship.shields = 0;
        });
        
        const buttonY = grid.height - 4;
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Continue', callback: () => {
                // Show pirate encounter with neverIgnore flag
                PirateEncounter.show(gameState, ENCOUNTER_TYPES.PIRATE, true);
            }, color: COLORS.TEXT_ERROR, helpText: 'Face the pirates' }
        ]);
        
        UI.draw();
    },
    
    /**
     * Handle looting the abandoned ship
     */
    handleLoot: function(gameState, encType) {
        // Use the standard loot menu with the abandoned ship's cargo
        // The encounterShips array should already contain the abandoned ship with cargo
        LootMenu.show(gameState, gameState.encounterShips, encType, () => {
            // Clear encounter and return to travel after looting
            gameState.encounter = false;
            gameState.encounterShips = [];
            gameState.encounterCargo = {};
            TravelMenu.resume();
        });
    }
};
