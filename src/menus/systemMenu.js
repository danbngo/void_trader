/**
 * Dock Menu
 * Main menu when docked at a station
 */

const DockMenu = (() => {
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    let currentNewNews = []; // Persist new news within the current system visit
    let currentExpiredNews = []; // Persist expired news within the current system visit
    let lastSystemIndex = -1; // Track which system we're at
    
    /**
     * Show the dock menu
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        if (!SystemUtils.isHabitedSystem(gameState.getCurrentSystem())) {
            UninhabitedSystemMenu.show(gameState, () => GalaxyMap.show(gameState));
            return;
        }
        // If we changed systems, reset the news arrays
        if (gameState.currentSystemIndex !== lastSystemIndex) {
            currentNewNews = [];
            currentExpiredNews = [];
            lastSystemIndex = gameState.currentSystemIndex;
        }
        
        // Clear news tracking for this system (we'll rebuild it below)
        const currentSystemIndex = gameState.currentSystemIndex;
        const systemIdxInArray = gameState.systemsWithNewNews.indexOf(currentSystemIndex);
        if (systemIdxInArray !== -1) {
            gameState.systemsWithNewNews.splice(systemIdxInArray, 1);
        }
        
        // Check validity of active news events and terminate invalid ones
        const invalidNews = [];
        gameState.newsEvents.forEach(news => {
            if (!news.completed && !news.isValid(gameState)) {
                news.complete(gameState);
                invalidNews.push(news);
                // Track that systems have new news
                if (news.originSystem && !gameState.systemsWithNewNews.includes(news.originSystem.index)) {
                    gameState.systemsWithNewNews.push(news.originSystem.index);
                }
                if (news.targetSystem && !gameState.systemsWithNewNews.includes(news.targetSystem.index)) {
                    gameState.systemsWithNewNews.push(news.targetSystem.index);
                }
            }
        });
        
        // Check for expired news and complete them
        const expiredNews = [];
        gameState.newsEvents.forEach(news => {
            if (!news.completed && news.shouldExpire(gameState.currentYear)) {
                news.complete(gameState);
                expiredNews.push(news);
                // Track that this system has new news
                if (news.originSystem && !gameState.systemsWithNewNews.includes(news.originSystem.index)) {
                    gameState.systemsWithNewNews.push(news.originSystem.index);
                }
                if (news.targetSystem && !gameState.systemsWithNewNews.includes(news.targetSystem.index)) {
                    gameState.systemsWithNewNews.push(news.targetSystem.index);
                }
            }
        });
        
        // Generate new news events based on time traveled since last dock
        // Calculate probability based on time spent traveling
        const timeSinceDock = gameState.timeSinceDock || 0; // In milliseconds
        const yearsSinceDock = timeSinceDock / (1000 * 60 * 60 * 24 * 365);
        
        // Simulate alien conquest behavior
        const instantlyCompletedNews = simulateAlienConquest(gameState, yearsSinceDock);
        currentExpiredNews.push(...instantlyCompletedNews);
        
        const newsChance = NEWS_CHANCE_PER_SYSTEM_PER_YEAR * yearsSinceDock;
        
        if (Math.random() < newsChance) {
            // Generate a news event for a random system
            const randomSystem = gameState.systems[Math.floor(Math.random() * gameState.systems.length)];
            
            // Check if system already has an active news event
            const hasActiveNews = gameState.newsEvents.some(n => 
                !n.completed && (n.originSystem === randomSystem || n.targetSystem === randomSystem)
            );
            
            if (!hasActiveNews) {
                // Pick a random news type (only random types, not alien)
                const newsType = RANDOM_NEWS_TYPES[Math.floor(Math.random() * RANDOM_NEWS_TYPES.length)];
                
                // Pick a different random system as target
                let targetSystem;
                do {
                    targetSystem = gameState.systems[Math.floor(Math.random() * gameState.systems.length)];
                } while (targetSystem === randomSystem);
                
                // Create the news event
                const news = new News(newsType, randomSystem, targetSystem, gameState.currentYear, newsType.minDuration + Math.random() * (newsType.maxDuration - newsType.minDuration));
                gameState.newsEvents.push(news);
                currentNewNews.push(news);
                
                // Track that this system has new news
                if (!gameState.systemsWithNewNews.includes(news.originSystem.index)) {
                    gameState.systemsWithNewNews.push(news.originSystem.index);
                }
                if (!gameState.systemsWithNewNews.includes(news.targetSystem.index)) {
                    gameState.systemsWithNewNews.push(news.targetSystem.index);
                }
            }
        }
        
        // Reset time since dock
        gameState.timeSinceDock = 0;
        
        // Check for expired/completed jobs when docking
        const showedJobReward = checkJobs(gameState);
        if (showedJobReward) {
            // Job reward screen is being shown, don't render dock menu
            return;
        }
        
        // Check for completed quests when docking
        checkQuestCompletion(gameState);
        
        // Check for new messages that should be added
        checkNewMessages(gameState);
        
        // Clear output message before paying salaries
        outputMessage = '';
        outputColor = COLORS.TEXT_NORMAL;
        
        // Pay officer salaries if this is first landing at this system
        paySalaries(gameState);
        
        UI.resetSelection(); // Only reset selection when first entering menu
        render(gameState, currentNewNews, currentExpiredNews);
    }
    
    /**
     * Render the dock menu
     * @param {GameState} gameState - Current game state
     * @param {Array<News>} newNews - News events that just started
     * @param {Array<News>} expiredNews - News events that just expired
     */
    function render(gameState, newNews = [], expiredNews = []) {
        console.log(`[DockMenu] render called. outputMessage:`, outputMessage, `outputColor:`, outputColor);
        
        UI.clear();
        // Don't reset selection here - preserve it across re-renders
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Title at top edge
        UI.addTitleLineCentered(0, `${currentSystem.name}`);
        
        // Two-column layout for info
        const leftColumnX = 5;
        const rightColumnX = 42;
        const startY = 2;
        
        // Left column title
        UI.addHeaderLine(leftColumnX, startY, 'System Info');
        
        // Left column: System info
        TableRenderer.renderKeyValueList(leftColumnX, startY + 1, [
            { label: 'Population:', value: `${currentSystem.population}M`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Government:', value: SYSTEM_GOVERNMENT_TYPES[currentSystem.governmentType]?.name || 'Unknown', valueColor: COLORS.TEXT_NORMAL }
        ]);
        
        // Right column title
        UI.addHeaderLine(rightColumnX, startY, 'Captain Status');
        
        // Right column: Player info
        const currentRank = gameState.getRankAtCurrentSystem();
        
        TableRenderer.renderKeyValueList(rightColumnX, startY + 1, [
            { label: 'Citizenship:', value: currentRank.name, valueColor: currentRank.color }
        ]);
        
        // News section - show newly started news, newly expired news, active news for this system, and unread news
        const newsStartY = startY + 4;
        UI.addHeaderLine(leftColumnX, newsStartY, 'News');
        
        let newsY = newsStartY + 1;
        const maxNewsLines = 5; // Max lines to show
        let newsCount = 0;
        
        // Filter function: only show news where player has visited origin or target system, or it's global
        const hasVisitedNewsSystem = (news) => {
            return news.globalNews || 
                   (news.originSystem && gameState.visitedSystems.includes(news.originSystem.index)) || 
                   (news.targetSystem && gameState.visitedSystems.includes(news.targetSystem.index));
        };
        
        // Helper function to determine news color based on type
        const getNewsColor = (news) => {
            const isAlienNews = news.newsType.id === 'ALIEN_INVASION_ANNOUNCEMENT' || 
                               news.newsType.id === 'ALIEN_INSTA_CONQUEST' ||
                               news.newsType.id === 'ALIEN_CONQUEST' ||
                               news.newsType.id === 'ALIEN_LIBERATION';
            return isAlienNews ? COLORS.TEXT_ERROR : COLORS.TEXT_NORMAL;
        };
        
        // Show newly started news first (filtered) - red for alien, white for other
        newNews.filter(hasVisitedNewsSystem).forEach(news => {
            if (newsCount < maxNewsLines) {
                UI.addText(leftColumnX, newsY++, news.description, getNewsColor(news));
                newsCount++;
            }
        });
        
        // Show recently completed news (within 1 day) - not just news that expired this session
        const ONE_DAY_IN_YEARS = 1 / 365.25;
        const recentlyCompletedNews = gameState.newsEvents.filter(news => 
            news.completed && 
            news.completionYear && 
            (gameState.currentYear - news.completionYear) <= ONE_DAY_IN_YEARS &&
            hasVisitedNewsSystem(news)
        );
        
        recentlyCompletedNews.forEach(news => {
            if (newsCount < maxNewsLines) {
                UI.addText(leftColumnX, newsY++, news.endDescription, getNewsColor(news));
                newsCount++;
            }
        });
        
        // Show active news for this system (origin or target) - already filtered by visited
        const currentSystemIndex = gameState.currentSystemIndex;
        const activeNewsForSystem = gameState.newsEvents.filter(news => 
            !news.completed && (
                (news.originSystem && news.originSystem.index === currentSystemIndex) || 
                (news.targetSystem && news.targetSystem.index === currentSystemIndex)
            )
        );
        
        activeNewsForSystem.forEach(news => {
            if (newsCount < maxNewsLines && !newNews.includes(news)) { // Don't duplicate if just started
                UI.addText(leftColumnX, newsY++, news.description, getNewsColor(news));
                newsCount++;
            }
        });
        
        // Show unread news from other systems (filtered by visited)
        const otherSystemsNews = gameState.newsEvents.filter(news => 
            !news.completed && 
            (!news.originSystem || news.originSystem.index !== currentSystemIndex) && 
            (!news.targetSystem || news.targetSystem.index !== currentSystemIndex) &&
            hasVisitedNewsSystem(news)
        );
        
        otherSystemsNews.forEach(news => {
            if (newsCount < maxNewsLines && !newNews.includes(news)) { // Don't duplicate if just started
                if (news.globalNews) {
                    UI.addText(leftColumnX, newsY++, news.description, getNewsColor(news));
                } else {
                    UI.addText(leftColumnX, newsY++, news.description, getNewsColor(news));
                }
                newsCount++;
            }
        });
        
        // If there are more news items, show overflow indicator
        const totalNews = newNews.length + recentlyCompletedNews.length + activeNewsForSystem.length + otherSystemsNews.length;
        if (totalNews > maxNewsLines) {
            UI.addText(leftColumnX, newsY++, '...', COLORS.TEXT_DIM);
            UI.addText(leftColumnX, newsY++, '(See Assistant > News for more)', COLORS.TEXT_DIM);
        } else if (totalNews === 0) {
            UI.addText(leftColumnX, newsY++, 'No active news', COLORS.TEXT_DIM);
        } else if (newsCount > 0) {
            // Show hint if any news was displayed
            UI.addText(leftColumnX, newsY++, '(See Assistant > News for more)', COLORS.TEXT_DIM);
        }
        
        // Menu buttons - 3 column layout at bottom edge
        const buttonY = grid.height - 5;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Define all possible buildings (always shown)
        // Column 1: Dock Services, Market, Black Market, Courthouse
        // Column 2: Shipyard, Tavern, Guild
        const allBuildings = [
            {
                id: 'DOCK',
                name: 'Dock',
                key: '1',
                buildingType: BUILDING_TYPES.DOCK,
                openMenu: () => DockServicesMenu.show(gameState, () => show(gameState))
            },
            {
                id: 'MARKET',
                name: 'Market',
                key: '2',
                buildingType: BUILDING_TYPES.MARKET,
                openMenu: () => MarketMenu.show(gameState, () => show(gameState))
            },
            {
                id: 'BLACK_MARKET',
                name: 'Black Market',
                key: 'b',
                buildingType: BUILDING_TYPES.BLACK_MARKET,
                openMenu: () => BlackMarketMenu.show(gameState, () => show(gameState))
            },
            {
                id: 'COURTHOUSE',
                name: 'Courthouse',
                key: '3',
                buildingType: BUILDING_TYPES.COURTHOUSE,
                openMenu: () => CourthouseMenu.show(gameState, () => show(gameState))
            },
            {
                id: 'SHIPYARD',
                name: 'Shipyard',
                key: '4',
                buildingType: BUILDING_TYPES.SHIPYARD,
                openMenu: () => ShipyardMenu.show(gameState, () => show(gameState))
            },
            {
                id: 'TAVERN',
                name: 'Tavern',
                key: '5',
                buildingType: BUILDING_TYPES.TAVERN,
                openMenu: () => TavernMenu.show(gameState, () => show(gameState))
            },
            {
                id: 'GUILD',
                name: 'Guild',
                key: '6',
                buildingType: BUILDING_TYPES.GUILD,
                openMenu: () => GuildMenu.show(gameState, () => show(gameState))
            }
        ].filter(building => building.id !== 'BLACK_MARKET' || currentSystem.name === 'Blackreach');
        
        // Add building buttons in 3 columns (3 per column)
        allBuildings.forEach((building, index) => {
            let hasBuilding = currentSystem.buildings.includes(building.id);
            if (building.id === 'BLACK_MARKET') {
                hasBuilding = hasBuilding && currentSystem.name === 'Blackreach';
            }
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
            const key = building.key || String(index + 1);
            
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
            
            // Determine column and row for 2-column layout (4 items per column)
            const rowsPerColumn = 4;
            const column = Math.floor(index / rowsPerColumn); // 0 or 1
            const row = index % rowsPerColumn; // 0..3
            const buttonX = column === 0 ? leftX : middleX;
            const btnY = buttonY + row;
            
            UI.addButton(buttonX, btnY, key, building.name, 
                () => tryOpenBuilding(gameState, building, hasBuilding, hasRank),
                color, helpText);
        });
        
        // Always available buttons in third column
        UI.addButton(rightX, buttonY + 0, '7', 'Depart', () => checkAndDepart(gameState), COLORS.GREEN, 'Leave station and travel to another system');
        
        // Highlight assistant button if there are unread messages or skill points
        const hasUnreadMessages = gameState.messages && gameState.messages.length > 0 && gameState.messages.some(m => !m.isRead);
        const hasSkillPoints = gameState.captain.hasSpendableSkillPoints();
        const assistantColor = (hasUnreadMessages || hasSkillPoints) ? COLORS.YELLOW : COLORS.BUTTON;
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
        
        // Check for unread messages and handle departure flow
        UnreadMessagesMenu.show(
            gameState,
            show, // onReturn to dock
            proceedToGalaxyMap // onProceed with departure
        );
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
                () => beginSpaceTravel(gameState) // onDepart
            );
        } else {
            // All good, go straight to space travel
            beginSpaceTravel(gameState);
        }
    }

    function beginSpaceTravel(gameState) {
        const destination = gameState.getCurrentSystem() || getNearestSystem(gameState);
        if (destination) {
            gameState.previousSystemIndex = gameState.currentSystemIndex;
            SpaceTravelMap.show(gameState, destination, { resetPosition: true });
        } else {
            GalaxyMap.show(gameState);
        }
    }

    function getNearestSystem(gameState) {
        if (!gameState || !gameState.systems || gameState.systems.length === 0) {
            return null;
        }
        const current = gameState.getCurrentSystem();
        if (!current) {
            return gameState.systems[0];
        }
        let nearest = null;
        let nearestDist = Infinity;
        gameState.systems.forEach(system => {
            if (system === current) {
                return;
            }
            const dist = current.distanceTo(system);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = system;
            }
        });
        return nearest;
    }
    
    /**
     * Pay salaries to officers if this is first landing at current system
     * @param {GameState} gameState - Current game state
     */
    function paySalaries(gameState) {
        // Only pay if we're at a different system than last payment
        if (gameState.lastSalaryPaymentSystemIndex === gameState.currentSystemIndex) {
            return;
        }
        
        if (gameState.subordinates.length === 0) {
            gameState.lastSalaryPaymentSystemIndex = gameState.currentSystemIndex;
            return;
        }
        
        let totalSalary = 0;
        
        // Calculate total salary
        gameState.subordinates.forEach(officer => {
            totalSalary += officer.getSalary();
        });
        
        // Check if player can afford salaries
        if (gameState.credits >= totalSalary) {
            gameState.credits -= totalSalary;
            outputMessage = `Paid ${totalSalary} CR in officer salaries`;
            outputColor = COLORS.YELLOW;
        } else {
            // Can't afford full salaries - show warning
            outputMessage = `Warning: Cannot afford officer salaries (${totalSalary} CR)! Release officers or earn credits.`;
            outputColor = COLORS.TEXT_ERROR;
        }
        
        gameState.lastSalaryPaymentSystemIndex = gameState.currentSystemIndex;
    }
    
    /**
     * Check for expired or completed jobs when docking
     * @param {GameState} gameState - Current game state
     */
    function checkJobs(gameState) {
        console.log('[DockMenu] checkJobs called');
        // Check if player has an active job
        if (!gameState.currentJob) {
            console.log('[DockMenu] No active job');
            return false;
        }
        
        const job = gameState.currentJob;
        const currentDate = gameState.date.getTime();
        console.log('[DockMenu] Checking job:', {
            description: job.description,
            targetSystem: job.targetSystem.name,
            currentSystem: gameState.getCurrentSystem().name,
            currentDate: new Date(currentDate),
            deadlineDate: new Date(job.deadlineDate),
            isExpired: job.isExpired(currentDate)
        });
        
        // Check if job is expired
        if (job.isExpired(currentDate)) {
            // Job failed - remove it
            gameState.currentJob = null;
            console.log('[DockMenu] Job expired and removed');
            return false;
        }
        
        // Check if job is completed
        const isCompleted = job.jobType.checkCompleted(job, gameState);
        console.log('[DockMenu] Job completion check:', {
            isCompleted,
            currentSystemIndex: gameState.currentSystemIndex,
            targetSystemIndex: gameState.systems.indexOf(job.targetSystem)
        });
        
        if (isCompleted) {
            console.log('[DockMenu] Job completed! Showing reward screen');
            // Mark job as completed and waiting for reward collection
            job.completed = true;
            gameState.completedJobReward = job;
            gameState.currentJob = null; // Remove from active job
            
            // Show reward collection screen
            showJobRewardCollection(gameState);
            return true; // Indicate that we showed a screen
        }
        
        console.log('[DockMenu] Job still in progress');
        return false;
    }
    
    /**
     * Show job reward collection screen (similar to quest completion)
     * @param {GameState} gameState - Current game state
     */
    function showJobRewardCollection(gameState) {
        const job = gameState.completedJobReward;
        
        UI.clear();
        UI.clearOutputRow();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Job Completed!');
        
        let y = 2;
        UI.addText(10, y++, job.description, job.jobType.color);
        y++;
        UI.addText(10, y++, 'You have successfully completed the job!', COLORS.TEXT_GREEN);
        y += 2;
        
        // Show rewards
        UI.addHeaderLine(10, y++, 'Rewards');
        y++;
        
        const rewards = [];
        if (job.awardCredits > 0) {
            rewards.push({ label: 'Credits:', value: `+${job.awardCredits} CR`, valueColor: COLORS.GREEN });
        }
        if (job.awardExp > 0) {
            rewards.push({ label: 'Experience:', value: `+${job.awardExp} XP`, valueColor: COLORS.GREEN });
        }
        if (job.awardReputation > 0) {
            rewards.push({ label: 'Reputation:', value: `+${job.awardReputation}`, valueColor: COLORS.GREEN });
        }
        
        y = TableRenderer.renderKeyValueList(10, y, rewards);
        y += 2;
        
        // Button to collect rewards
        const buttonY = grid.height - 3;
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Collect Rewards', callback: () => {
                // Award the rewards
                gameState.credits += job.awardCredits;
                gameState.captain.addExperience(job.awardExp);
                gameState.reputation += job.awardReputation;
                
                // Clear the completed job reward
                gameState.completedJobReward = null;
                
                // Return to dock menu
                show(gameState);
            }, color: COLORS.GREEN, helpText: 'Collect your rewards and continue' }
        ]);
        
        UI.draw();
    }
    
    /**
     * Check if any active quests have been completed
     * When quest objectives are met, add the completion message
     * Quest is only moved to completedQuests when player reads the message
     * @param {GameState} gameState - Current game state
     */
    function checkQuestCompletion(gameState) {
        const completedThisDock = [];
        
        // Check each active quest
        gameState.activeQuests.forEach(questId => {
            const quest = Object.values(QUESTS).find(q => q.id === questId);
            if (quest && quest.checkCompleted(gameState)) {
                // Check if we have a completion message to add
                if (quest.messageOnComplete) {
                    const messageToAdd = MESSAGES[quest.messageOnComplete];
                    if (messageToAdd) {
                        // Only add if not already in messages
                        const alreadyAdded = gameState.messages.some(m => m.id === messageToAdd.id);
                        if (!alreadyAdded) {
                            gameState.messages.push(messageToAdd);
                            completedThisDock.push(quest);
                        }
                    }
                }
            }
        });
        
        return completedThisDock;
    }
    
    /**
     * Check if any messages should be added to player's inbox
     * Iterates through all message templates and adds those that pass checkShouldAdd
     * @param {GameState} gameState - Current game state
     */
    function checkNewMessages(gameState) {
        // Iterate through all message templates
        Object.values(MESSAGES).forEach(messageTemplate => {
            // Check if message is already in player's inbox
            const alreadyHas = gameState.messages.some(m => m.id === messageTemplate.id);
            
            if (!alreadyHas) {
                // Check if message should be added
                if (messageTemplate.shouldBeAdded(gameState)) {
                    gameState.messages.push(messageTemplate);
                }
            }
        });
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
            render(gameState, currentNewNews, currentExpiredNews);
        } else if (!hasRank) {
            // Player lacks required rank
            const requiredRank = ALL_RANKS.find(r => r.level === building.buildingType.minRankLevel);
            outputMessage = `Requires ${requiredRank.name} citizenship!`;
            outputColor = COLORS.TEXT_ERROR;
            console.log(`[DockMenu] Insufficient rank. Setting outputMessage:`, outputMessage);
            render(gameState, currentNewNews, currentExpiredNews);
        } else if (building.id === 'DOCK') {
            // Special check for Dock Services: if all ships are at full fuel and hull
            const allShipsFull = gameState.ships.every(ship => ship.fuel === ship.maxFuel && ship.hull === ship.maxHull);
            if (allShipsFull) {
                outputMessage = 'All ships at full fuel and hull!';
                outputColor = COLORS.TEXT_ERROR;
                render(gameState, currentNewNews, currentExpiredNews);
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
    
    /**
     * Simulate alien conquest behavior
     * @param {GameState} gameState - Current game state
     * @param {number} yearsSinceDock - Years since last dock
     */
    function simulateAlienConquest(gameState, yearsSinceDock) {
        const instantlyCompletedNews = [];
        // Check if aliens should spawn
        if (!gameState.aliensSpawned && gameState.currentYear >= ALIENS_SPAWN_AFTER_X_YEARS) {
            gameState.aliensSpawned = true;
            
            // Initial alien conquest - conquer ALIENS_CONQUER_X_SYSTEMS_AT_START systems instantly
            const humanSystems = gameState.systems.filter(sys => 
                !sys.conqueredByAliens && 
                !sys.immuneToAlienConquest &&
                sys.name !== 'Nexus' && 
                sys.name !== 'Proxima' &&
                sys.index !== gameState.currentSystemIndex
            );
            
            const systemsToConquer = [];
            
            // First, find and conquer the nearest system to Nexus
            const nexus = gameState.systems.find(sys => sys.name === 'Nexus');
            if (nexus && humanSystems.length > 0) {
                let nearestToNexus = null;
                let nearestDistance = Infinity;
                
                humanSystems.forEach(sys => {
                    const dist = nexus.distanceTo(sys);
                    if (dist < nearestDistance) {
                        nearestDistance = dist;
                        nearestToNexus = sys;
                    }
                });
                
                if (nearestToNexus) {
                    systemsToConquer.push(nearestToNexus);
                    // Remove from humanSystems pool
                    const index = humanSystems.indexOf(nearestToNexus);
                    if (index > -1) humanSystems.splice(index, 1);
                }
            }
            
            // Then conquer random systems for the rest
            const remainingCount = ALIENS_CONQUER_X_SYSTEMS_AT_START - systemsToConquer.length;
            const randomSystems = humanSystems
                .sort(() => Math.random() - 0.5)
                .slice(0, remainingCount);
            systemsToConquer.push(...randomSystems);
            
            // Create instant conquest news events (duration = 0) for each system
            systemsToConquer.forEach(system => {
                const news = new News(
                    NEWS_TYPES.ALIEN_INSTA_CONQUEST,
                    null, // No origin for initial spawn
                    system,
                    gameState.currentYear,
                    0, // Instant
                    gameState
                );
                gameState.newsEvents.push(news);
                
                // Track new news
                if (!gameState.systemsWithNewNews.includes(system.index)) {
                    gameState.systemsWithNewNews.push(system.index);
                }
            });
            
            // Create ONE global announcement news event AFTER individual events
            const globalNews = new News(
                NEWS_TYPES.ALIEN_INVASION_ANNOUNCEMENT,
                null,
                null,
                gameState.currentYear, // Same timestamp as individual conquest events
                0, // Instant
                gameState,
                true // globalNews flag
            );
            gameState.newsEvents.push(globalNews);
            
            // Complete instantly since duration is 0
            globalNews.complete(gameState);
            instantlyCompletedNews.push(globalNews);
        }
        
        // If aliens haven't spawned yet, return any completed news
        if (!gameState.aliensSpawned) {
            return instantlyCompletedNews;
        }
        
        // Spontaneous conquests
        const spontaneousConquestChance = ALIENS_SPONTANEOUS_CONQUESTS_PER_YEAR * yearsSinceDock;
        if (Math.random() < spontaneousConquestChance) {
            const humanSystems = gameState.systems.filter(sys => 
                !sys.conqueredByAliens && 
                !sys.immuneToAlienConquest &&
                sys.name !== 'Nexus' && 
                sys.name !== 'Proxima' &&
                sys.index !== gameState.currentSystemIndex
            );
            
            if (humanSystems.length > 0) {
                const targetSystem = humanSystems[Math.floor(Math.random() * humanSystems.length)];
                const news = new News(
                    NEWS_TYPES.ALIEN_INSTA_CONQUEST,
                    null,
                    targetSystem,
                    gameState.currentYear,
                    0,
                    gameState
                );
                gameState.newsEvents.push(news);
                
                if (!gameState.systemsWithNewNews.includes(targetSystem.index)) {
                    gameState.systemsWithNewNews.push(targetSystem.index);
                }
            }
        }
        
        // Alien expansion from conquered systems
        const alienSystems = gameState.systems.filter(sys => sys.conqueredByAliens);
        alienSystems.forEach(alienSystem => {
            // Find nearby human systems within max attack distance
            const nearbyHumans = [];
            
            gameState.systems.forEach(sys => {
                if (!sys.conqueredByAliens && !sys.immuneToAlienConquest && sys.name !== 'Nexus' && sys.name !== 'Proxima' && sys.index !== gameState.currentSystemIndex) {
                    const dist = alienSystem.distanceTo(sys);
                    if (dist <= ALIENS_MAX_ATTACK_DISTANCE) {
                        nearbyHumans.push({ system: sys, distance: dist });
                    }
                }
            });
            
            // Sort by distance and try to attack the nearest that's not already under attack
            nearbyHumans.sort((a, b) => a.distance - b.distance);
            
            for (const { system: nearestHuman } of nearbyHumans) {
                // Check if already being attacked
                const alreadyUnderAttack = gameState.newsEvents.some(n => 
                    !n.completed && 
                    n.newsType.id === 'ALIEN_CONQUEST' && 
                    n.targetSystem === nearestHuman
                );
                
                if (!alreadyUnderAttack) {
                    const conquestChance = ALIENS_CONQUER_CHANCE_PER_YEAR * yearsSinceDock;
                    if (Math.random() < conquestChance) {
                        // Start conquest news event
                        const duration = NEWS_TYPES.ALIEN_CONQUEST.minDuration + 
                            Math.random() * (NEWS_TYPES.ALIEN_CONQUEST.maxDuration - NEWS_TYPES.ALIEN_CONQUEST.minDuration);
                        
                        const news = new News(
                            NEWS_TYPES.ALIEN_CONQUEST,
                            alienSystem,
                            nearestHuman,
                            gameState.currentYear,
                            duration,
                            gameState
                        );
                        gameState.newsEvents.push(news);
                        
                        if (!gameState.systemsWithNewNews.includes(nearestHuman.index)) {
                            gameState.systemsWithNewNews.push(nearestHuman.index);
                        }
                    }
                    break; // Only attack one system per alien system per dock
                }
            }
        });
        
        // Human liberation efforts
        const humanSystems = gameState.systems.filter(sys => !sys.conqueredByAliens);
        humanSystems.forEach(humanSystem => {
            // Find nearest alien neighbor
            let nearestAlien = null;
            let nearestDistance = Infinity;
            
            gameState.systems.forEach(sys => {
                if (sys.conqueredByAliens) {
                    const dist = humanSystem.distanceTo(sys);
                    if (dist < nearestDistance) {
                        nearestDistance = dist;
                        nearestAlien = sys;
                    }
                }
            });
            
            if (nearestAlien) {
                // Check if already being liberated
                const alreadyBeingLiberated = gameState.newsEvents.some(n => 
                    !n.completed && 
                    n.newsType.id === 'ALIEN_LIBERATION' && 
                    n.targetSystem === nearestAlien
                );
                
                if (!alreadyBeingLiberated) {
                    const liberationChance = ALIENS_LIBERATED_CHANCE_PER_YEARS * yearsSinceDock;
                    if (Math.random() < liberationChance) {
                        // Start liberation news event
                        const duration = NEWS_TYPES.ALIEN_LIBERATION.minDuration + 
                            Math.random() * (NEWS_TYPES.ALIEN_LIBERATION.maxDuration - NEWS_TYPES.ALIEN_LIBERATION.minDuration);
                        
                        const news = new News(
                            NEWS_TYPES.ALIEN_LIBERATION,
                            humanSystem,
                            nearestAlien,
                            gameState.currentYear,
                            duration,
                            gameState
                        );
                        gameState.newsEvents.push(news);
                        
                        if (!gameState.systemsWithNewNews.includes(nearestAlien.index)) {
                            gameState.systemsWithNewNews.push(nearestAlien.index);
                        }
                    }
                }
            }
        });
        
        return instantlyCompletedNews;
    }
    
    return {
        show
    };
})();
