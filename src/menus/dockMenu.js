/**
 * Dock Menu
 * Main menu when docked at a station
 */

const DockMenu = (() => {
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the dock menu
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        // Check for completed quests when docking
        checkQuestCompletion(gameState);
        
        outputMessage = '';
        outputColor = COLORS.TEXT_NORMAL;
        
        UI.resetSelection(); // Only reset selection when first entering menu
        render(gameState);
    }
    
    /**
     * Render the dock menu
     * @param {GameState} gameState - Current game state
     */
    function render(gameState) {
        console.log(`[DockMenu] render called. outputMessage:`, outputMessage, `outputColor:`, outputColor);
        
        UI.clear();
        // Don't reset selection here - preserve it across re-renders
        
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
        
        // Menu buttons - 3 column layout at bottom
        const buttonY = grid.height - 5;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Define all possible buildings (always shown)
        // Column 1: Dock Services, Market, Courthouse
        // Column 2: Shipyard, Tavern, Guild
        const allBuildings = [
            {
                id: 'DOCK',
                name: 'Dock Services',
                buildingType: BUILDING_TYPES.DOCK,
                openMenu: () => DockServicesMenu.show(gameState, () => show(gameState))
            },
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
        
        // Add building buttons in 3 columns (3 per column)
        allBuildings.forEach((building, index) => {
            const hasBuilding = currentSystem.buildings.includes(building.id);
            const hasRank = currentRank.level >= building.buildingType.minRankLevel;
            let isAccessible = hasBuilding && hasRank;
            
            // Special check for Dock Services: also gray out if all ships are at full fuel and hull
            if (building.id === 'DOCK' && isAccessible) {
                const allShipsFull = gameState.ships.every(ship => ship.fuel === ship.maxFuel && ship.hull === ship.maxHull);
                if (allShipsFull) {
                    isAccessible = false;
                }
            }
            
            const color = isAccessible ? COLORS.BUTTON : COLORS.TEXT_DIM;
            const key = String(index + 1);
            
            // Build help text
            let helpText = building.buildingType.description;
            
            if (!hasBuilding) {
                helpText += ' - Not available in this system';
            } else if (!hasRank) {
                const requiredRank = ALL_RANKS.find(r => r.level === building.buildingType.minRankLevel);
                helpText += ` - Requires ${requiredRank.name} citizenship`;
            } else if (building.id === 'DOCK') {
                const allShipsFull = gameState.ships.every(ship => ship.fuel === ship.maxFuel && ship.hull === ship.maxHull);
                if (allShipsFull) {
                    helpText += ' - All ships at full fuel and hull';
                }
            }
            
            // Determine column and row for 3-column layout (3 items per column)
            const column = Math.floor(index / 3); // 0 or 1
            const row = index % 3; // 0, 1, or 2
            const buttonX = column === 0 ? leftX : middleX;
            const btnY = buttonY + row;
            
            UI.addButton(buttonX, btnY, key, building.name, 
                () => tryOpenBuilding(gameState, building, hasBuilding, hasRank),
                color, helpText);
        });
        
        // Always available buttons in third column
        UI.addButton(rightX, buttonY + 0, '7', 'Depart', () => checkAndDepart(gameState), COLORS.GREEN, 'Leave station and travel to another system');
        
        // Highlight assistant button if there are unread messages
        const hasUnreadMessages = gameState.messages && gameState.messages.length > 0 && gameState.messages.some(m => !m.isRead);
        const assistantColor = hasUnreadMessages ? COLORS.YELLOW : COLORS.BUTTON;
        UI.addButton(rightX, buttonY + 1, 'a', 'Assistant', () => AssistantMenu.show(gameState, () => show(gameState)), assistantColor, 'View ship, cargo, and captain information');
        
        UI.addButton(rightX, buttonY + 2, '0', 'Options', () => OptionsMenu.show(() => show(gameState)), COLORS.BUTTON, 'Game settings and save/load');
        
        // Set output message if there is one
        if (outputMessage) {
            console.log(`[DockMenu] Setting output row with message:`, outputMessage, `color:`, outputColor);
            UI.setOutputRow(outputMessage, outputColor);
        } else {
            console.log(`[DockMenu] No output message to display`);
        }
        
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
        
        const unreadTextY = y++;
        const messageTitleY = y++;
        
        // Add message title (static)
        UI.addTextCentered(messageTitleY, message.title, COLORS.CYAN);
        
        // Flash "You have an unread message:" text
        UI.startFlashing(() => {
            UI.clear();
            UI.addTextCentered(3, '=== Unread Message ===', COLORS.YELLOW);
            UI.addTextCentered(unreadTextY, 'You have an unread message:', UI.getFlashState() ? COLORS.GREEN : COLORS.WHITE);
            UI.addTextCentered(messageTitleY, message.title, COLORS.CYAN);
            
            // Re-add buttons
            const buttonY = grid.height - 6;
            const menuX = Math.floor(grid.width / 2) - 15;
            
            UI.addButton(menuX, buttonY, '1', 'Read Message', () => {
                readMessageDirect(gameState, message);
            }, COLORS.YELLOW, 'Read the message now');
            
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
        }, 200, 2000, true);
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
            // Check if there are more unread messages
            const nextUnreadMessage = gameState.messages.find(m => !m.isRead && !m.suppressWarning);
            
            if (nextUnreadMessage) {
                // Show next unread message warning
                showUnreadMessageWarning(gameState, nextUnreadMessage);
            } else {
                // No more unread messages, proceed to galaxy map
                proceedToGalaxyMap(gameState);
            }
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
                
                // Note: Credits are awarded via the message system, not here
                // quest.creditReward is only used for display purposes
                
                // Call onCompleted callback (which typically adds a message)
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
        console.log(`[DockMenu] tryOpenBuilding called:`, {
            buildingName: building.name,
            buildingId: building.id,
            hasBuilding,
            hasRank
        });
        
        if (!hasBuilding) {
            // System doesn't have this building
            outputMessage = `${building.name} not available in this system!`;
            outputColor = COLORS.TEXT_ERROR;
            console.log(`[DockMenu] Building not available. Setting outputMessage:`, outputMessage);
            render(gameState);
        } else if (!hasRank) {
            // Player lacks required rank
            const requiredRank = ALL_RANKS.find(r => r.level === building.buildingType.minRankLevel);
            outputMessage = `Requires ${requiredRank.name} citizenship!`;
            outputColor = COLORS.TEXT_ERROR;
            console.log(`[DockMenu] Insufficient rank. Setting outputMessage:`, outputMessage);
            render(gameState);
        } else if (building.id === 'DOCK') {
            // Special check for Dock Services: if all ships are at full fuel and hull
            const allShipsFull = gameState.ships.every(ship => ship.fuel === ship.maxFuel && ship.hull === ship.maxHull);
            if (allShipsFull) {
                outputMessage = 'All ships at full fuel and hull!';
                outputColor = COLORS.TEXT_ERROR;
                render(gameState);
            } else {
                // Player has access
                console.log(`[DockMenu] Player has access, opening menu`);
                building.openMenu();
            }
        } else {
            // Player has access
            console.log(`[DockMenu] Player has access, opening menu`);
            building.openMenu();
        }
    }
    
    return {
        show
    };
})();
