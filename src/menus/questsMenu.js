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
        let y = 5;
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
            
            // Table header
            const leftX = 10;
            UI.addText(leftX, y, 'Quest Name', COLORS.CYAN);
            UI.addText(leftX + 40, y++, 'Status', COLORS.CYAN);
            UI.addText(leftX, y++, '─'.repeat(60), COLORS.TEXT_DIM);
            
            // Display quests
            pageQuestIds.forEach(questId => {
                const quest = Object.values(QUESTS).find(q => q.id === questId);
                if (quest) {
                    // Mark active quests as read when displayed
                    if (showingActive && !currentGameState.readQuests.includes(questId)) {
                        currentGameState.readQuests.push(questId);
                    }
                    
                    const status = showingActive ? 'Active' : 'Completed';
                    const statusColor = showingActive ? COLORS.YELLOW : COLORS.GREEN;
                    
                    UI.addText(leftX, y, quest.name, COLORS.TEXT_NORMAL);
                    UI.addText(leftX + 40, y++, status, statusColor);
                    
                    // Show description below
                    UI.addText(leftX + 2, y++, quest.description, COLORS.TEXT_DIM);
                    y++; // Empty row between description and progress bar
                    
                    // Show progress bar for active quests with tracking
                    if (showingActive && quest.getQuestProgress) {
                        const progress = quest.getQuestProgress(currentGameState);
                        const progressBarWidth = 50;
                        // ProgressBar.render expects x to be the CENTER of the bar
                        const progressBarCenterX = leftX + 2 + Math.floor(progressBarWidth / 2);
                        y = ProgressBar.render(progressBarCenterX, y, progress, progressBarWidth, quest.questProgressLabel);
                        y++; // Extra spacing after progress bar
                    }
                    
                    if (showingActive && quest.creditReward > 0) {
                        UI.addText(leftX + 2, y, `Reward: ${quest.creditReward} CR`, COLORS.GREEN);
                    }
                    y++;
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
