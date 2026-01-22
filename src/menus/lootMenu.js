/**
 * Loot Menu
 * Allows player to loot cargo from defeated enemy ships
 */

const LootMenu = (() => {
    let gameState = null;
    let selectedCargoIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    let lootCargo = {}; // Combined cargo from all enemy ships
    let creditReward = 0; // One-time credit reward
    
    /**
     * Show the loot menu
     * @param {GameState} state - Current game state
     * @param {Array<Ship>} defeatedShips - Array of defeated enemy ships
     * @param {Object} encounterType - The encounter type for credit rewards
     * @param {Function} onContinue - Callback when player continues journey
     */
    function show(state, defeatedShips, encounterType, onContinue) {
        gameState = state;
        selectedCargoIndex = 0;
        outputMessage = '';
        
        // Combine cargo from all defeated ships
        lootCargo = {};
        defeatedShips.forEach(ship => {
            for (const cargoId in ship.cargo) {
                const amount = ship.cargo[cargoId];
                if (amount > 0) {
                    lootCargo[cargoId] = (lootCargo[cargoId] || 0) + amount;
                }
            }
        });
        
        // Calculate credit reward (random between 1 and maxCredits)
        creditReward = Math.floor(Math.random() * encounterType.maxCredits) + 1;
        
        // Award credits immediately
        gameState.credits += creditReward;
        
        UI.resetSelection();
        render(onContinue);
    }
    
    /**
     * Render the loot screen
     */
    function render(onContinue) {
        UI.clear();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(3, 'Victory: Salvage Operations', COLORS.TITLE);
        
        // Credits awarded
        UI.addText(5, 5, `Credits found: +${creditReward} CR`, COLORS.GREEN);
        
        // Player cargo info
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const totalPlayerCargo = Object.values(fleetCargo).reduce((sum, amt) => sum + amt, 0);
        const totalPlayerCapacity = gameState.ships.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
        UI.addText(5, 6, `Your Cargo: ${totalPlayerCargo} / ${totalPlayerCapacity}`, COLORS.TEXT_NORMAL);
        
        // Check if there's any loot
        const hasLoot = Object.keys(lootCargo).length > 0;
        
        if (!hasLoot) {
            UI.addText(5, 9, 'No cargo found on enemy ships.', COLORS.TEXT_DIM);
            
            const buttonY = grid.height - 4;
            UI.addButton(5, buttonY, '0', 'Continue Journey', onContinue, COLORS.GREEN);
            
            if (outputMessage) {
                UI.setOutputRow(outputMessage, outputColor);
            }
            
            UI.draw();
            return;
        }
        
        // Loot table - filter to only enabled cargo types with loot
        const startY = 9;
        const rows = ALL_CARGO_TYPES
            .filter(cargoType => lootCargo[cargoType.id] > 0 && 
                gameState.enabledCargoTypes.some(ct => ct.id === cargoType.id))
            .map((cargoType, index) => {
                const lootQuantity = lootCargo[cargoType.id] || 0;
                
                return [
                    { text: cargoType.name, color: COLORS.TEXT_NORMAL },
                    { text: String(lootQuantity), color: COLORS.TEXT_NORMAL }
                ];
            });
        
        // Ensure selectedCargoIndex is valid
        if (selectedCargoIndex >= rows.length) {
            selectedCargoIndex = Math.max(0, rows.length - 1);
        }
        
        TableRenderer.renderTable(5, startY, ['Cargo Type', 'Available'], rows, selectedCargoIndex, 2, (rowIndex) => {
            // When a row is clicked, select that cargo
            selectedCargoIndex = rowIndex;
            outputMessage = '';
            render(onContinue);
        });
        
        // Buttons
        const buttonY = grid.height - 4;
        
        // Get selected cargo type and check training
        const availableCargoTypes = ALL_CARGO_TYPES.filter(ct => 
            lootCargo[ct.id] > 0 && gameState.enabledCargoTypes.some(ect => ect.id === ct.id)
        );
        const selectedCargoType = availableCargoTypes[selectedCargoIndex];
        const lootQuantity = selectedCargoType ? (lootCargo[selectedCargoType.id] || 0) : 0;
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        
        // Build help text for Take buttons
        let take1HelpText = 'Take 1 unit of selected cargo';
        let take10HelpText = 'Take 10 units of selected cargo';
        if (lootQuantity === 0) {
            take1HelpText = 'No cargo available';
            take10HelpText = 'No cargo available';
        } else if (availableSpace === 0) {
            take1HelpText = 'No cargo space available';
            take10HelpText = 'No cargo space available';
        }
        
        // Build help text for Dump buttons
        let dump1HelpText = 'Dump 1 unit of selected cargo into space';
        let dump10HelpText = 'Dump 10 units of selected cargo into space';
        if (lootQuantity === 0) {
            dump1HelpText = 'No cargo available';
            dump10HelpText = 'No cargo available';
        }
        
        // Take buttons - gray out if no training, no loot, or no space
        const canTake = hasTraining && lootQuantity > 0 && availableSpace > 0;
        const takeColor = canTake ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(5, buttonY, '1', 'Take 1', () => takeCargo(1, onContinue), takeColor, take1HelpText);
        UI.addButton(5, buttonY + 1, '2', 'Take 10', () => takeCargo(10, onContinue), takeColor, take10HelpText);
        
        // Dump buttons - only gray out if no loot
        const canDump = lootQuantity > 0;
        const dumpColor = canDump ? COLORS.TEXT_ERROR : COLORS.TEXT_DIM;
        UI.addButton(25, buttonY, '3', 'Dump 1', () => dumpCargo(1, onContinue), dumpColor, dump1HelpText);
        UI.addButton(25, buttonY + 1, '4', 'Dump 10', () => dumpCargo(10, onContinue), dumpColor, dump10HelpText);
        
        UI.addButton(5, buttonY + 2, '0', 'Continue Journey', onContinue, COLORS.BUTTON);
        
        // Set output message in UI output row system if there's a message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Take cargo from loot
     */
    function takeCargo(amount, onContinue) {
        // Get the selected cargo type from filtered list (only enabled cargo with loot)
        const availableCargoTypes = ALL_CARGO_TYPES.filter(ct => 
            lootCargo[ct.id] > 0 && gameState.enabledCargoTypes.some(ect => ect.id === ct.id)
        );
        if (selectedCargoIndex >= availableCargoTypes.length) {
            outputMessage = 'Invalid cargo selection.';
            outputColor = COLORS.TEXT_ERROR;
            render(onContinue);
            return;
        }
        
        const cargoType = availableCargoTypes[selectedCargoIndex];
        
        const availableLoot = lootCargo[cargoType.id] || 0;
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        
        // Adjust amount based on availability and space
        const actualAmount = Math.min(amount, availableLoot, availableSpace);
        
        if (actualAmount === 0) {
            if (availableLoot === 0) {
                outputMessage = 'No cargo available!';
            } else if (availableSpace === 0) {
                outputMessage = 'No cargo space available!';
            } else {
                outputMessage = 'Cannot take any cargo.';
            }
            outputColor = COLORS.TEXT_ERROR;
        } else {
            // Take the cargo
            lootCargo[cargoType.id] -= actualAmount;
            Ship.addCargoToFleet(gameState.ships, cargoType.id, actualAmount);
            
            const message = actualAmount < amount 
                ? `Took all ${actualAmount}x ${cargoType.name}!` 
                : `Took ${actualAmount}x ${cargoType.name}!`;
            outputMessage = message;
            outputColor = COLORS.TEXT_SUCCESS;
        }
        
        render(onContinue);
    }
    
    /**
     * Dump cargo from loot into space
     */
    function dumpCargo(amount, onContinue) {
        // Get the selected cargo type from filtered list (only enabled cargo with loot)
        const availableCargoTypes = ALL_CARGO_TYPES.filter(ct => 
            lootCargo[ct.id] > 0 && gameState.enabledCargoTypes.some(ect => ect.id === ct.id)
        );
        if (selectedCargoIndex >= availableCargoTypes.length) {
            outputMessage = 'Invalid cargo selection.';
            outputColor = COLORS.TEXT_ERROR;
            render(onContinue);
            return;
        }
        
        const cargoType = availableCargoTypes[selectedCargoIndex];
        const availableLoot = lootCargo[cargoType.id] || 0;
        
        // Adjust amount based on availability (no capacity limit for dumping)
        const actualAmount = Math.min(amount, availableLoot);
        
        if (actualAmount === 0) {
            outputMessage = 'No cargo to dump!';
            outputColor = COLORS.TEXT_ERROR;
        } else {
            // Dump the cargo
            lootCargo[cargoType.id] -= actualAmount;
            
            const message = actualAmount < amount 
                ? `Dumped all ${actualAmount}x ${cargoType.name} into space.` 
                : `Dumped ${actualAmount}x ${cargoType.name} into space.`;
            outputMessage = message;
            outputColor = COLORS.TEXT_NORMAL;
        }
        
        render(onContinue);
    }
    
    return {
        show
    };
})();
