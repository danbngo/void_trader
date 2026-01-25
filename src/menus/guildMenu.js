/**
 * Guild Menu
 * Learn perks and accept missions
 */

const GuildMenu = (() => {
    let gameState = null;
    let selectedPerkIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the guild menu
     * @param {GameState} state - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(state, onReturn) {
        gameState = state;
        selectedPerkIndex = 0;
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Render the guild menu
     */
    function render(onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Title
        UI.addTitleLineCentered(0, `${currentSystem.name}: MERCHANT'S GUILD`);
        UI.addText(5, 5, `Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
        
        // Available perks table
        const startY = 8;
        UI.addText(5, 7, 'Available Training:', COLORS.YELLOW);
        
        const rows = ALL_PERKS.map(perk => {
            const alreadyLearned = gameState.perks.has(perk.id);
            // Calculate total cost with system fees
            const totalCost = Math.floor(perk.baseCost * (1 + currentSystem.fees));
            const canAfford = gameState.credits >= totalCost;
            
            // Check if player has all required perks
            const hasRequiredPerks = perk.requiredPerks.every(reqPerkId => gameState.perks.has(reqPerkId));
            
            let statusText = '';
            let statusColor = COLORS.TEXT_NORMAL;
            
            if (alreadyLearned) {
                statusText = 'Learned';
                statusColor = COLORS.TEXT_DIM;
            } else if (!hasRequiredPerks) {
                statusText = 'Locked';
                statusColor = COLORS.TEXT_ERROR;
            } else if (canAfford) {
                statusText = 'Available';
                statusColor = COLORS.GREEN;
            } else {
                statusText = 'Cannot Afford';
                statusColor = COLORS.TEXT_ERROR;
            }
            
            return [
                { text: perk.name, color: alreadyLearned ? COLORS.TEXT_DIM : COLORS.TEXT_NORMAL },
                { text: perk.description, color: COLORS.TEXT_DIM },
                { text: `${totalCost} CR`, color: alreadyLearned ? COLORS.TEXT_DIM : COLORS.TEXT_NORMAL },
                { text: statusText, color: statusColor }
            ];
        });
        
        TableRenderer.renderTable(5, startY, ['Perk', 'Description', 'Cost', 'Status'], rows, selectedPerkIndex, 2, (rowIndex) => {
            selectedPerkIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });
        
        // Buttons
        const buttonY = grid.height - 5;
        UI.addButton(5, buttonY, '1', 'Next Perk', () => nextPerk(onReturn), COLORS.BUTTON, 'Select next perk');
        UI.addButton(5, buttonY + 1, '2', 'Previous Perk', () => prevPerk(onReturn), COLORS.BUTTON, 'Select previous perk');
        
        // Learn button - gray out if already learned, locked, or can't afford
        const selectedPerk = ALL_PERKS[selectedPerkIndex];
        const alreadyLearned = gameState.perks.has(selectedPerk.id);
        const selectedPerkTotalCost = Math.floor(selectedPerk.baseCost * (1 + currentSystem.fees));
        const canAfford = gameState.credits >= selectedPerkTotalCost;
        const hasRequiredPerks = selectedPerk.requiredPerks.every(reqPerkId => gameState.perks.has(reqPerkId));
        const canLearn = !alreadyLearned && canAfford && hasRequiredPerks;
        const learnColor = canLearn ? COLORS.GREEN : COLORS.TEXT_DIM;
        
        let learnHelpText = 'Learn selected perk';
        if (alreadyLearned) {
            learnHelpText = 'Already learned this perk';
        } else if (!hasRequiredPerks) {
            learnHelpText = 'Must learn prerequisite perks first';
        } else if (!canAfford) {
            learnHelpText = `Need ${selectedPerkTotalCost} CR`;
        }
        
        UI.addButton(25, buttonY, '3', 'Learn Perk', () => learnPerk(onReturn), learnColor, learnHelpText);
        UI.addButton(5, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON);
        
        // Set output message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    function nextPerk(onReturn) {
        selectedPerkIndex = (selectedPerkIndex + 1) % ALL_PERKS.length;
        outputMessage = '';
        render(onReturn);
    }
    
    function prevPerk(onReturn) {
        selectedPerkIndex = (selectedPerkIndex - 1 + ALL_PERKS.length) % ALL_PERKS.length;
        outputMessage = '';
        render(onReturn);
    }
    
    function learnPerk(onReturn) {
        const perk = ALL_PERKS[selectedPerkIndex];
        const currentSystem = gameState.getCurrentSystem();
        const totalCost = Math.floor(perk.baseCost * (1 + currentSystem.fees));
        
        if (gameState.perks.has(perk.id)) {
            outputMessage = 'You already know this perk!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Check if player has all required perks
        const missingPerks = perk.requiredPerks.filter(reqPerkId => !gameState.perks.has(reqPerkId));
        if (missingPerks.length > 0) {
            const missingPerkNames = missingPerks.map(id => PERKS[id].name).join(', ');
            outputMessage = `Must learn ${missingPerkNames} first!`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        if (gameState.credits < totalCost) {
            outputMessage = `Not enough credits! Need ${totalCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Learn the perk
        gameState.credits -= totalCost;
        gameState.perks.add(perk.id);
        
        // Unlock corresponding cargo types
        if (perk.id === 'CARGO_FRAGILE') {
            gameState.enabledCargoTypes.push(...CARGO_TYPES_FRAGILE);
        } else if (perk.id === 'CARGO_DANGEROUS') {
            gameState.enabledCargoTypes.push(...CARGO_TYPES_DANGEROUS);
        } else if (perk.id === 'CARGO_ILLEGAL') {
            gameState.enabledCargoTypes.push(...CARGO_TYPES_ILLEGAL);
        }
        
        // Unlock corresponding ship types
        if (perk.id === 'SHIP_MERCANTILE') {
            gameState.enabledShipTypes.push(...SHIP_TYPES_MERCANTILE);
        } else if (perk.id === 'SHIP_PARAMILITARY') {
            gameState.enabledShipTypes.push(...SHIP_TYPES_PARAMILITARY);
        } else if (perk.id === 'SHIP_MILITARY') {
            gameState.enabledShipTypes.push(...SHIP_TYPES_MILITARY);
        }
        
        outputMessage = `Learned ${perk.name}!`;
        outputColor = COLORS.TEXT_SUCCESS;
        render(onReturn);
    }
    
    return {
        show
    };
})();
