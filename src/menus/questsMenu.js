/**
 * Quests Menu
 * Shows active and completed quests
 */

const QuestsMenu = (() => {
    let returnCallback = null;
    let currentGameState = null;
    let showingActive = true; // true = active quests, false = completed quests
    let currentPage = 0;
    const ACTIVE_QUESTS_PER_PAGE = 3; // Fewer active quests per page due to progress bars
    const COMPLETED_QUESTS_PER_PAGE = 10;
    
    /**
     * Show the quests menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        returnCallback = onReturn;
        currentGameState = gameState;
        showingActive = true;
        currentPage = 0;
        
        render();
    }
    
    /**
     * Render the quests menu
     */
    function render() {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        let y = 2;
        const title = showingActive ? '=== Active Quests ===' : '=== Completed Quests ===';
        UI.addTextCentered(y++, title, COLORS.TITLE);
        y += 2;
        
        // Get quest IDs to display
        let questIds = showingActive ? currentGameState.activeQuests : currentGameState.completedQuests;
        
        // Sort active quests to show unread quests first
        if (showingActive) {
            questIds = [...questIds].sort((a, b) => {
                const aRead = currentGameState.readQuests.includes(a);
                const bRead = currentGameState.readQuests.includes(b);
                if (aRead === bRead) return 0;
                return aRead ? 1 : -1; // Unread (false) comes before read (true)
            });
        }
        
        if (questIds.length === 0) {
            const message = showingActive ? 'No active quests' : 'No completed quests';
            UI.addTextCentered(y++, message, COLORS.TEXT_DIM);
        } else {
            // Calculate pagination
            const questsPerPage = showingActive ? ACTIVE_QUESTS_PER_PAGE : COMPLETED_QUESTS_PER_PAGE;
            const totalPages = Math.ceil(questIds.length / questsPerPage);
            const startIndex = currentPage * questsPerPage;
            const endIndex = Math.min(startIndex + questsPerPage, questIds.length);
            const pageQuestIds = questIds.slice(startIndex, endIndex);
            
            // Display quests
            const leftX = 5;
            let questNumber = startIndex + 1; // Start numbering from the first quest on this page
            pageQuestIds.forEach(questId => {
                const quest = Object.values(QUESTS).find(q => q.id === questId);
                if (quest) {
                    // Mark active quests as read when displayed
                    if (showingActive && !currentGameState.readQuests.includes(questId)) {
                        currentGameState.readQuests.push(questId);
                    }
                    
                    // Quest number (cyan), name (white), and description (gray) on one line
                    let xOffset = leftX;
                    UI.addText(xOffset, y, `#${questNumber}: `, COLORS.CYAN);
                    xOffset += `#${questNumber}: `.length;
                    UI.addText(xOffset, y, quest.name, COLORS.TEXT_NORMAL);
                    xOffset += quest.name.length;
                    UI.addText(xOffset, y, `: ${quest.description}`, COLORS.TEXT_DIM);
                    y++;
                    
                    // Reward - label in white, value in green
                    if (quest.creditReward > 0) {
                        UI.addText(leftX + 4, y, `Reward: `, COLORS.TEXT_NORMAL);
                        UI.addText(leftX + 4 + 'Reward: '.length, y, `${quest.creditReward} CR`, COLORS.GREEN);
                        y++;
                    }
                    
                    // Show progress bar for active quests with tracking
                    if (showingActive && quest.getQuestProgress) {
                        y++; // Empty row before progress bar
                        const progress = quest.getQuestProgress(currentGameState);
                        const progressBarWidth = 50;
                        // ProgressBar.render expects x to be the CENTER of the bar
                        const progressBarCenterX = leftX + 4 + Math.floor(progressBarWidth / 2);
                        
                        // Render progress bar without label
                        y = ProgressBar.render(progressBarCenterX, y, progress, progressBarWidth, null);
                        
                        // Generate and render custom colored progress label
                        let currentValue, maxValue, descriptor, unit;
                        
                        if (quest.id === 'ATTAIN_VISA') {
                            descriptor = 'Credits vs Visa Cost';
                            currentValue = currentGameState.credits;
                            maxValue = RANKS.VISA.fee;
                            unit = '';
                        } else if (quest.id === 'LEARN_TO_TRADE') {
                            descriptor = 'Goods Sold';
                            currentValue = currentGameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD] || 0;
                            maxValue = 1000;
                            unit = ' CR';
                        } else if (quest.id === 'LEARN_CARGO_HANDLING') {
                            descriptor = 'Credits';
                            currentValue = currentGameState.credits;
                            maxValue = PERKS.CARGO_FRAGILE.cost;
                            unit = '';
                        } else if (quest.id === 'LEARN_SHIP_HANDLING') {
                            descriptor = 'Credits';
                            currentValue = currentGameState.credits;
                            maxValue = PERKS.SHIP_LICENSE_FRIGATE.cost;
                            unit = '';
                        }
                        
                        // Calculate stat color for current value (ratio based on progress)
                        const currentRatio = 1.0 + progress * 3.0; // 1.0 to 4.0 range
                        const currentColor = UI.calcStatColor(currentRatio);
                        
                        // Render centered label with multiple colors
                        const labelText = `${descriptor}: ${currentValue}/${maxValue}${unit}`;
                        const labelX = Math.floor((UI.getGridSize().width - labelText.length) / 2);
                        
                        let xPos = labelX;
                        // Descriptor in gray
                        UI.addText(xPos, y, `${descriptor}: `, COLORS.TEXT_DIM);
                        xPos += `${descriptor}: `.length;
                        // Current value in stat color
                        UI.addText(xPos, y, `${currentValue}`, currentColor);
                        xPos += `${currentValue}`.length;
                        // Slash, max value and unit in white
                        UI.addText(xPos, y, `/${maxValue}${unit}`, COLORS.TEXT_NORMAL);
                        
                        y++;
                    }
                    
                    y++; // Empty row between quests
                    questNumber++;
                }
            });
            
            // Pagination info
            if (totalPages > 1) {
                y++;
                UI.addTextCentered(y++, `Page ${currentPage + 1} / ${totalPages}`, COLORS.TEXT_DIM);
            }
        }
        
        // Buttons
        const buttonY = grid.height - 5;
        
        // Build button array dynamically
        const buttons = [];
        
        // Toggle between active/completed
        const toggleLabel = showingActive ? 'Show Completed' : 'Show Active';
        buttons.push({ key: 'T', label: toggleLabel, callback: () => {
            showingActive = !showingActive;
            currentPage = 0;
            render();
        }, color: COLORS.BUTTON, helpText: 'Toggle between active and completed quests' });
        
        // Pagination buttons
        if (currentPage > 0) {
            buttons.push({ key: '8', label: 'Previous Page', callback: () => {
                currentPage--;
                render();
            }, color: COLORS.BUTTON });
        }
        
        const pageQuestIds = showingActive ? currentGameState.activeQuests : currentGameState.completedQuests;
        const questsPerPage = showingActive ? ACTIVE_QUESTS_PER_PAGE : COMPLETED_QUESTS_PER_PAGE;
        const totalPages = Math.ceil(pageQuestIds.length / questsPerPage);
        if (currentPage < totalPages - 1) {
            buttons.push({ key: '9', label: 'Next Page', callback: () => {
                currentPage++;
                render();
            }, color: COLORS.BUTTON });
        }
        
        // Back button
        buttons.push({ key: '0', label: 'Back', callback: () => {
            if (returnCallback) returnCallback();
        }, color: COLORS.BUTTON });
        
        UI.addCenteredButtons(buttonY, buttons);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
