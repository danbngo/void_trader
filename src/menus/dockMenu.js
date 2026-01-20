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
        
        // Get player's rank at this system
        const currentRank = gameState.getRankAtCurrentSystem();
        UI.addTextCentered(7, `Citizenship: ${currentRank.name}`, COLORS.CYAN);
        
        // Menu buttons
        const menuX = Math.floor(grid.width / 2) - 12;
        let menuY = 10;
        
        // Define all possible buildings (always shown)
        const allBuildings = [
            {
                id: 'MARKET',
                name: 'Market',
                buildingType: BUILDING_TYPES.MARKET,
                openMenu: () => MarketMenu.show(gameState, () => show(gameState))
            },
            {
                id: 'COURTHOUSE',
                name: 'Courthouse',
                buildingType: BUILDING_TYPES.COURTHOUSE,
                openMenu: () => CourthouseMenu.show(gameState, () => show(gameState))
            },
            {
                id: 'SHIPYARD',
                name: 'Shipyard',
                buildingType: BUILDING_TYPES.SHIPYARD,
                openMenu: () => ShipyardMenu.show(gameState, () => show(gameState))
            },
            {
                id: 'TAVERN',
                name: 'Tavern',
                buildingType: BUILDING_TYPES.TAVERN,
                openMenu: () => UI.setOutputRow('Tavern not yet implemented', COLORS.TEXT_DIM)
            },
            {
                id: 'GUILD',
                name: 'Guild',
                buildingType: BUILDING_TYPES.GUILD,
                openMenu: () => GuildMenu.show(gameState, () => show(gameState))
            }
        ];
        
        // Add building buttons (always show all, gray out if unavailable)
        allBuildings.forEach((building, index) => {
            const hasBuilding = currentSystem.buildings.includes(building.id);
            const hasRank = currentRank.level >= building.buildingType.minRankLevel;
            const isAccessible = hasBuilding && hasRank;
            
            const color = isAccessible ? COLORS.BUTTON : COLORS.TEXT_DIM;
            const key = String(index + 1);
            
            UI.addButton(menuX, menuY++, key, building.name, 
                () => tryOpenBuilding(gameState, building, hasBuilding, hasRank),
                color, '');
        });
        
        menuY++; // Spacing
        
        // Always available buttons
        UI.addButton(menuX, menuY++, '8', 'Depart', () => checkAndDepart(gameState), COLORS.GREEN, 'Leave station and travel to another system');
        
        // Highlight assistant button if there are unread messages
        const hasUnreadMessages = gameState.messages && gameState.messages.length > 0 && gameState.messages.some(m => !m.isRead);
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
        
        // Check for unread messages that haven't been suppressed
        const unreadMessages = gameState.messages.filter(m => !m.isRead && !m.suppressWarning);
        if (unreadMessages.length > 0) {
            showUnreadMessageWarning(gameState, unreadMessages[0]);
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
     * Show warning about unread messages
     * @param {GameState} gameState - Current game state
     * @param {Message} message - The unread message
     */
    function showUnreadMessageWarning(gameState, message) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title at top
        let y = 3;
        UI.addTextCentered(y++, '=== Unread Message ===', COLORS.YELLOW);
        y += 2;
        
        UI.addTextCentered(y++, 'You have an unread message:', COLORS.TEXT_NORMAL);
        UI.addTextCentered(y++, message.title, COLORS.CYAN);
        
        // Buttons at bottom
        const buttonY = grid.height - 6;
        const menuX = Math.floor(grid.width / 2) - 15;
        
        UI.addButton(menuX, buttonY, '1', 'Read Message', () => {
            readMessageDirect(gameState, message);
        }, COLORS.GREEN, 'Read the message now');
        
        UI.addButton(menuX, buttonY + 1, '2', 'Ignore Message', () => {
            proceedToGalaxyMap(gameState);
        }, COLORS.BUTTON, 'Continue to galaxy map');
        
        UI.addButton(menuX, buttonY + 2, '9', 'Don\'t Show This Warning Again', () => {
            message.suppressWarning = true;
            proceedToGalaxyMap(gameState);
        }, COLORS.TEXT_DIM, 'Suppress this warning for this message');
        
        UI.addButton(menuX, buttonY + 3, '0', 'Back', () => {
            show(gameState);
        }, COLORS.BUTTON, 'Return to dock');
        
        UI.draw();
    }
    
    /**
     * Read a message directly and return to dock
     * @param {GameState} gameState - Current game state
     * @param {Message} message - The message to read
     */
    function readMessageDirect(gameState, message) {
        // Mark as read and trigger onRead
        const wasUnread = !message.isRead;
        message.read(gameState);
        
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        let y = 5;
        UI.addTextCentered(y++, `=== ${message.title} ===`, COLORS.CYAN);
        y += 2;
        
        // Content
        const leftX = 10;
        if (Array.isArray(message.content)) {
            message.content.forEach(line => {
                UI.addText(leftX, y++, line, COLORS.TEXT_NORMAL);
            });
        } else {
            UI.addText(leftX, y++, message.content, COLORS.TEXT_NORMAL);
        }
        
        y += 2;
        
        // Show quest added notification if message was unread
        if (wasUnread && message.onRead) {
            UI.addText(leftX, y++, 'Quest added!', COLORS.GREEN);
            y++;
        }
        
        // Continue button
        const buttonY = grid.height - 4;
        UI.addButton(10, buttonY, '1', 'Continue', () => {
            show(gameState);
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Proceed to galaxy map (handling resupply check)
     * @param {GameState} gameState - Current game state
     */
    function proceedToGalaxyMap(gameState) {
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
    
    /**
     * Try to open a building, checking availability and rank requirements
     * @param {GameState} gameState - Current game state
     * @param {Object} building - Building definition with id, name, buildingType, openMenu
     * @param {boolean} hasBuilding - Whether system has this building
     * @param {boolean} hasRank - Whether player has required rank
     */
    function tryOpenBuilding(gameState, building, hasBuilding, hasRank) {
        if (!hasBuilding) {
            // System doesn't have this building
            UI.setOutputRow(`${building.name} not available in this system!`, COLORS.TEXT_ERROR);
            show(gameState);
        } else if (!hasRank) {
            // Player lacks required rank
            const requiredRank = ALL_RANKS.find(r => r.level === building.buildingType.minRankLevel);
            UI.setOutputRow(`Requires ${requiredRank.name} citizenship!`, COLORS.TEXT_ERROR);
            show(gameState);
        } else {
            // Player has access
            building.openMenu();
        }
    }
    
    return {
        show
    };
})();
