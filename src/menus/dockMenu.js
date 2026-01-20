/**
 * Dock Menu
 * Main menu when docked at a station
 */

const DockMenu = (() => {
    /**
     * Show the dock menu
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        // Check for completed quests when docking
        checkQuestCompletion(gameState);
        
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Title
        UI.addTextCentered(3, `${currentSystem.name}: Dock`, COLORS.TITLE);
        
        // System info
        UI.addTextCentered(5, `Population: ${currentSystem.population}M`, COLORS.TEXT_DIM);
        UI.addTextCentered(6, `Economy: ${currentSystem.economy}`, COLORS.TEXT_DIM);
        
        // Menu buttons
        const menuX = Math.floor(grid.width / 2) - 12;
        let menuY = 10;
        
        UI.addButton(menuX, menuY++, '1', 'Shipyard', () => ShipyardMenu.show(gameState, () => show(gameState)), COLORS.BUTTON, 'Manage and purchase ships');
        
        UI.addButton(menuX, menuY++, '2', 'Market', () => MarketMenu.show(gameState, () => show(gameState)), COLORS.BUTTON, 'Buy and sell cargo');
        
        UI.addButton(menuX, menuY++, '3', 'Depart', () => checkAndDepart(gameState), COLORS.GREEN, 'Leave station and travel to another system');
        
        // Highlight assistant button if there are unread messages
        const hasUnreadMessages = gameState.messages.some(m => !m.isRead);
        const assistantColor = hasUnreadMessages ? COLORS.YELLOW : COLORS.BUTTON;
        UI.addButton(menuX, menuY++, 'a', 'Assistant', () => AssistantMenu.show(gameState, () => show(gameState)), assistantColor, 'View ship, cargo, and captain information');
        
        UI.addButton(menuX, menuY++, '0', 'Options', () => OptionsMenu.show(() => show(gameState)), COLORS.BUTTON, 'Game settings and save/load');
        
        UI.draw();
    }
    
    /**
     * Check if ships need resupply before departing
     */
    function checkAndDepart(gameState) {
        // Check if retirement time has passed (50 years)
        if (gameState.hasRetirementTimePassed()) {
            UI.setOutputRow('50 years have passed. Time for retirement!', COLORS.TEXT_ERROR);
            const score = ScoreMenu.calculateScore(gameState);
            ScoreMenu.showGameOver(gameState, score.totalScore, false);
            return;
        }
        
        // Check if any ships need repair or refuel
        const needsRepair = gameState.ships.some(ship => 
            ship.hull < ship.maxHull || ship.shields < ship.maxShields
        );
        const needsRefuel = gameState.ships.some(ship => 
            ship.fuel < ship.maxFuel
        );
        
        if (needsRepair || needsRefuel) {
            // Show resupply menu
            ResupplyMenu.show(
                gameState,
                () => show(gameState), // onReturn
                () => GalaxyMap.show(gameState) // onDepart
            );
        } else {
            // All good, go straight to galaxy map
            GalaxyMap.show(gameState);
        }
    }
    
    /**
     * Check if any active quests have been completed
     * @param {GameState} gameState - Current game state
     */
    function checkQuestCompletion(gameState) {
        const completedThisDock = [];
        
        // Check each active quest
        gameState.activeQuests.forEach(questId => {
            const quest = Object.values(QUESTS).find(q => q.id === questId);
            if (quest && quest.checkCompleted(gameState)) {
                // Move from active to completed
                gameState.activeQuests = gameState.activeQuests.filter(id => id !== questId);
                gameState.completedQuests.push(questId);
                
                // Award credits
                gameState.credits += quest.creditReward;
                
                // Call onCompleted callback
                if (quest.onCompleted) {
                    quest.onCompleted(gameState);
                }
                
                completedThisDock.push(quest);
            }
        });
        
        return completedThisDock;
    }
    
    return {
        show
    };
})();
