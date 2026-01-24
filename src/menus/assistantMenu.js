/**
 * Assistant Menu
 * Shows information about ship, cargo, and captain
 */

const AssistantMenu = (() => {
    let returnCallback = null;
    let currentGameState = null;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the assistant menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        returnCallback = onReturn;
        currentGameState = gameState;
        outputMessage = '';
        
        UI.clear();
        UI.resetSelection();
        
        // Start flashing if there are unread messages
        const hasUnreadMessages = gameState.messages.some(m => !m.isRead);
        if (hasUnreadMessages) {
            UI.startFlashing(() => render(gameState, onReturn), 300, 2000, true); // Flash for 2 seconds
        } else {
            render(gameState, onReturn);
        }
    }
    
    /**
     * Render the assistant menu
     */
    function render(gameState, onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(5, 'Assistant', COLORS.TITLE);
        UI.addTextCentered(7, 'What would you like to review?', COLORS.TEXT_NORMAL);
        
        // Check for unread messages
        const hasUnreadMessages = gameState.messages.some(m => !m.isRead);
        if (hasUnreadMessages) {
            // Flash between white and green, ending in white
            const flashColor = UI.getFlashState() ? COLORS.GREEN : COLORS.WHITE;
            UI.addTextCentered(8, 'You have unread messages!', flashColor);
        }
        
        // Check criteria for buttons
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const totalCargo = Object.values(fleetCargo).reduce((sum, amt) => sum + amt, 0);
        const hasCargo = totalCargo > 0;
        const hasCrew = gameState.officers && gameState.officers.length > 0;
        const hasQuests = (gameState.activeQuests && gameState.activeQuests.length > 0) || 
                          (gameState.completedQuests && gameState.completedQuests.length > 0);
        
        // Menu buttons - 3 column layout at bottom
        const buttonY = grid.height - 5;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Column 1: Ship Status, Cargo Manifest, Captain Info
        UI.addButton(leftX, buttonY, '1', 'Ship Status', () => ShipInfoMenu.show(() => show(gameState, returnCallback)), COLORS.BUTTON, 'View detailed ship specifications');
        
        // Cargo Manifest - gray out if no cargo
        const cargoHelpText = hasCargo ? 'View cargo hold contents and capacity' : 'No cargo to display';
        const cargoColor = hasCargo ? COLORS.BUTTON : COLORS.TEXT_DIM;
        UI.addButton(leftX, buttonY + 1, '2', 'Cargo Manifest', () => tryOpenCargo(gameState, onReturn), cargoColor, cargoHelpText);
        
        UI.addButton(leftX, buttonY + 2, '3', 'Captain Info', () => CaptainInfoMenu.show(() => show(gameState, returnCallback)), COLORS.BUTTON, 'View captain and perk details');
        
        // Column 2: Crew, Messages, Quests
        // Crew - gray out if no crew
        const crewHelpText = hasCrew ? 'View crew and officer details' : 'No crew members (hire at Tavern)';
        const crewColor = hasCrew ? COLORS.BUTTON : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY, '4', 'Crew', () => tryOpenCrew(gameState, onReturn), crewColor, crewHelpText);
        
        const messagesColor = hasUnreadMessages ? COLORS.YELLOW : COLORS.BUTTON;
        UI.addButton(middleX, buttonY + 1, '5', 'Messages', () => MessagesMenu.show(gameState, () => show(gameState, returnCallback)), messagesColor, 'View messages and communications');
        
        // Quests - gray out if no quests
        const questsHelpText = hasQuests ? 'View active and completed quests' : 'No active or completed quests';
        const questsColor = hasQuests ? COLORS.BUTTON : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY + 2, '6', 'Quests', () => tryOpenQuests(gameState, onReturn), questsColor, questsHelpText);
        
        // Column 3: Trade Recs, Score, Back
        // Check if there's a trade recommendation available and player hasn't seen it yet
        const hasRecommendation = TradeRecommendationsMenu.getBestTradeRecommendation(gameState) !== null;
        const shouldHighlight = hasRecommendation && !gameState.recommendationSeen;
        const tradeRecsColor = shouldHighlight ? COLORS.YELLOW : COLORS.BUTTON;
        const tradeRecsHelp = hasRecommendation ? 'Trade opportunities available! View recommendations' : 'View trade opportunities in nearby systems';
        UI.addButton(rightX, buttonY, '7', 'Trade Recs', () => TradeRecommendationsMenu.show(gameState, () => show(gameState, returnCallback)), tradeRecsColor, tradeRecsHelp);
        UI.addButton(rightX, buttonY + 1, '8', 'Score', () => ScoreMenu.show(gameState, () => show(gameState, returnCallback)), COLORS.BUTTON, 'View your current score and rank');
        UI.addButton(rightX, buttonY + 2, '0', 'Back', () => { if (returnCallback) returnCallback(); }, COLORS.BUTTON);
        
        // Set output message in UI output row system if there's a message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Try to open cargo manifest
     */
    function tryOpenCargo(gameState, onReturn) {
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const totalCargo = Object.values(fleetCargo).reduce((sum, amt) => sum + amt, 0);
        
        if (totalCargo === 0) {
            outputMessage = 'No cargo to display. Your cargo holds are empty.';
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn);
            return;
        }
        
        CargoInfoMenu.show(() => show(gameState, returnCallback));
    }
    
    /**
     * Try to open crew info
     */
    function tryOpenCrew(gameState, onReturn) {
        if (!gameState.officers || gameState.officers.length === 0) {
            outputMessage = 'No crew members. Visit the Tavern to hire crew!';
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn);
            return;
        }
        
        CrewInfoMenu.show(() => show(gameState, returnCallback));
    }
    
    /**
     * Try to open quests menu
     */
    function tryOpenQuests(gameState, onReturn) {
        const hasQuests = (gameState.activeQuests && gameState.activeQuests.length > 0) || 
                          (gameState.completedQuests && gameState.completedQuests.length > 0);
        
        if (!hasQuests) {
            outputMessage = 'No active or completed quests to display.';
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn);
            return;
        }
        
        QuestsMenu.show(gameState, () => show(gameState, returnCallback));
    }
    
    return {
        show
    };
})();
