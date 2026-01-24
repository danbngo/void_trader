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
                    
                    // Quest number, name, and description on one line
                    const questLine = `#${questNumber}: ${quest.name}: ${quest.description}`;
                    UI.addText(leftX, y++, questLine, COLORS.TEXT_NORMAL);
                    
                    // Reward
                    if (quest.creditReward > 0) {
                        UI.addText(leftX + 4, y++, `Reward: ${quest.creditReward} CR`, COLORS.GREEN);
                    }
                    
                    // Show progress bar for active quests with tracking
                    if (showingActive && quest.getQuestProgress) {
                        y++; // Empty row before progress bar
                        const progress = quest.getQuestProgress(currentGameState);
                        const progressBarWidth = 50;
                        // ProgressBar.render expects x to be the CENTER of the bar
                        const progressBarCenterX = leftX + 4 + Math.floor(progressBarWidth / 2);
                        
                        // Generate dynamic progress label with current/max values
                        let progressLabel = quest.questProgressLabel;
                        if (quest.id === 'ATTAIN_VISA') {
                            const visaCost = RANKS.VISA.fee;
                            progressLabel = `Credits vs Visa Cost: ${currentGameState.credits}/${visaCost}`;
                        } else if (quest.id === 'LEARN_TO_TRADE') {
                            const totalSold = currentGameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD] || 0;
                            progressLabel = `Goods Sold: ${totalSold}/1000 CR`;
                        } else if (quest.id === 'LEARN_CARGO_HANDLING') {
                            const perk = PERKS.CARGO_FRAGILE;
                            progressLabel = `Credits: ${currentGameState.credits}/${perk.cost}`;
                        } else if (quest.id === 'LEARN_SHIP_HANDLING') {
                            const perk = PERKS.SHIP_LICENSE_FRIGATE;
                            progressLabel = `Credits: ${currentGameState.credits}/${perk.cost}`;
                        }
                        
                        y = ProgressBar.render(progressBarCenterX, y, progress, progressBarWidth, progressLabel);
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
