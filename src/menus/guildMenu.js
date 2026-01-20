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
        UI.addTextCentered(3, `${currentSystem.name}: MERCHANT'S GUILD`, COLORS.TITLE);
        UI.addText(5, 5, `Credits: ${gameState.credits} CR`, COLORS.TEXT_NORMAL);
        
        // Available perks table
        const startY = 8;
        UI.addText(5, 7, 'Available Training:', COLORS.YELLOW);
        
        const rows = ALL_PERKS.map(perk => {
            const alreadyLearned = gameState.perks.has(perk.id);
            const canAfford = gameState.credits >= perk.baseCost;
            
            let statusText = '';
            let statusColor = COLORS.TEXT_NORMAL;
            
            if (alreadyLearned) {
                statusText = 'Learned';
                statusColor = COLORS.TEXT_DIM;
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
                { text: `${perk.baseCost} CR`, color: alreadyLearned ? COLORS.TEXT_DIM : COLORS.TEXT_NORMAL },
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
        
        // Learn button - gray out if already learned or can't afford
        const selectedPerk = ALL_PERKS[selectedPerkIndex];
        const alreadyLearned = gameState.perks.has(selectedPerk.id);
        const canAfford = gameState.credits >= selectedPerk.baseCost;
        const canLearn = !alreadyLearned && canAfford;
        const learnColor = canLearn ? COLORS.GREEN : COLORS.TEXT_DIM;
        
        UI.addButton(25, buttonY, '3', 'Learn Perk', () => learnPerk(onReturn), learnColor, 'Learn selected perk');
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
        
        if (gameState.perks.has(perk.id)) {
            outputMessage = 'You already know this perk!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        if (gameState.credits < perk.baseCost) {
            outputMessage = `Not enough credits! Need ${perk.baseCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Learn the perk
        gameState.credits -= perk.baseCost;
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
