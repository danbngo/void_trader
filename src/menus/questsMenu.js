/**
 * Quests Menu
 * Shows active and completed quests
 */

const QuestsMenu = (() => {
    let returnCallback = null;
    let currentGameState = null;
    let showingActive = true; // true = active quests, false = completed quests
    let currentPage = 0;
    const QUESTS_PER_PAGE = 10;
    
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
        const questIds = showingActive ? currentGameState.activeQuests : currentGameState.completedQuests;
        
        if (questIds.length === 0) {
            const message = showingActive ? 'No active quests' : 'No completed quests';
            UI.addTextCentered(y++, message, COLORS.TEXT_DIM);
        } else {
            // Calculate pagination
            const totalPages = Math.ceil(questIds.length / QUESTS_PER_PAGE);
            const startIndex = currentPage * QUESTS_PER_PAGE;
            const endIndex = Math.min(startIndex + QUESTS_PER_PAGE, questIds.length);
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
                    const status = showingActive ? 'Active' : 'Completed';
                    const statusColor = showingActive ? COLORS.YELLOW : COLORS.GREEN;
                    
                    UI.addText(leftX, y, quest.name, COLORS.TEXT_NORMAL);
                    UI.addText(leftX + 40, y++, status, statusColor);
                    
                    // Show description below
                    UI.addText(leftX + 2, y++, quest.description, COLORS.TEXT_DIM);
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
        
        // Toggle between active/completed
        const toggleLabel = showingActive ? 'Show Completed' : 'Show Active';
        UI.addButton(10, buttonY, 'T', toggleLabel, () => {
            showingActive = !showingActive;
            currentPage = 0;
            render();
        }, COLORS.BUTTON, 'Toggle between active and completed quests');
        
        // Pagination buttons
        if (currentPage > 0) {
            UI.addButton(10, buttonY + 1, '8', 'Previous Page', () => {
                currentPage--;
                render();
            }, COLORS.BUTTON);
        }
        
        const pageQuestIds = showingActive ? currentGameState.activeQuests : currentGameState.completedQuests;
        const totalPages = Math.ceil(pageQuestIds.length / QUESTS_PER_PAGE);
        if (currentPage < totalPages - 1) {
            UI.addButton(10, buttonY + 2, '9', 'Next Page', () => {
                currentPage++;
                render();
            }, COLORS.BUTTON);
        }
        
        // Back button
        UI.addButton(10, grid.height - 4, '0', 'Back', () => {
            if (returnCallback) returnCallback();
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
