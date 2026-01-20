/**
 * Assistant Menu
 * Shows information about ship, cargo, and captain
 */

const AssistantMenu = (() => {
    let returnCallback = null;
    let currentGameState = null;
    
    /**
     * Show the assistant menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        returnCallback = onReturn;
        currentGameState = gameState;
        
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(5, 'Assistant', COLORS.TITLE);
        UI.addTextCentered(7, 'What would you like to review?', COLORS.TEXT_NORMAL);
        
        // Check for unread messages
        const hasUnreadMessages = gameState.messages.some(m => !m.isRead);
        if (hasUnreadMessages) {
            UI.addTextCentered(8, 'You have unread messages!', COLORS.YELLOW);
        }
        
        // Menu buttons
        const menuX = Math.floor(grid.width / 2) - 12;
        const menuY = 11;
        
        UI.addButton(menuX, menuY, '1', 'Ship Status', () => ShipInfoMenu.show(() => show(gameState, returnCallback)), COLORS.BUTTON, 'View detailed ship specifications');
        UI.addButton(menuX, menuY + 1, '2', 'Cargo Manifest', () => CargoInfoMenu.show(() => show(gameState, returnCallback)), COLORS.BUTTON, 'View cargo hold contents and capacity');
        UI.addButton(menuX, menuY + 2, '3', 'Captain Info', () => CaptainInfoMenu.show(() => show(gameState, returnCallback)), COLORS.BUTTON, 'View captain and perk details');
        UI.addButton(menuX, menuY + 3, '4', 'Crew', () => CrewInfoMenu.show(() => show(gameState, returnCallback)), COLORS.BUTTON, 'View crew and officer details');
        
        const messagesColor = hasUnreadMessages ? COLORS.YELLOW : COLORS.BUTTON;
        UI.addButton(menuX, menuY + 4, '5', 'Messages', () => MessagesMenu.show(gameState, () => show(gameState, returnCallback)), messagesColor, 'View messages and communications');
        
        UI.addButton(menuX, menuY + 5, '6', 'Quests', () => QuestsMenu.show(gameState, () => show(gameState, returnCallback)), COLORS.BUTTON, 'View active and completed quests');
        UI.addButton(menuX, menuY + 6, '9', 'Score', () => ScoreMenu.show(gameState, () => show(gameState, returnCallback)), COLORS.BUTTON, 'View your current score and rank');
        UI.addButton(menuX, menuY + 7, '0', 'Back', () => { if (returnCallback) returnCallback(); }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
