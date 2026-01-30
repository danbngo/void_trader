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
        UI.addTitleLineCentered(0, 'Assistant');
        
        let y = 2;
        
        // Quest Status section
        y = UI.addHeaderLine(5, y, 'Quest Status');
        
        // Calculate retirement info
        const startDate = new Date(3000, 0, 1);
        const currentDate = gameState.date;
        const daysPassed = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
        const retirementDays = Math.floor(50 * 365.25);
        const daysUntilRetirement = Math.max(0, retirementDays - daysPassed);
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentDateStr = `${months[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
        
        // Calculate retirement date
        const retirementDate = new Date(startDate);
        retirementDate.setDate(retirementDate.getDate() + retirementDays);
        const retirementDateStr = `${months[retirementDate.getMonth()]} ${retirementDate.getDate()}, ${retirementDate.getFullYear()}`;
        
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Date:', value: currentDateStr, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Retirement Date:', value: retirementDateStr, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Days to Retirement:', value: String(daysUntilRetirement), valueColor: COLORS.TEXT_NORMAL }
        ]);
        
        y++; // Empty row
        
        // Retirement progress bar
        const retirementProgress = daysPassed / retirementDays;
        const barWidth = Math.floor(grid.width * 0.6);
        const barCenterX = Math.floor(grid.width / 2);
        const progressLabel = `${(retirementProgress * 100).toFixed(1)}% of career completed`;
        y = ProgressBar.render(barCenterX, y, retirementProgress, barWidth, progressLabel);
        y += 2;
        
        // Check criteria for buttons
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const totalCargo = Object.values(fleetCargo).reduce((sum, amt) => sum + amt, 0);
        const hasCargo = totalCargo > 0;
        const hasCrew = gameState.subordinates && gameState.subordinates.length > 0;
        const hasQuests = (gameState.activeQuests && gameState.activeQuests.length > 0) || 
                          (gameState.completedQuests && gameState.completedQuests.length > 0);
        const hasUnreadMessages = gameState.messages.some(m => !m.isRead);
        
        // Menu buttons - 3 column layout at bottom
        const buttonY = grid.height - 5;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Column 1: Ship Status, Cargo Manifest, Crew
        UI.addButton(leftX, buttonY, '1', 'Ship Status', () => ShipInfoMenu.show(() => show(gameState, returnCallback)), COLORS.BUTTON, 'View detailed ship specifications');
        
        // Cargo Manifest - gray out if no cargo
        const cargoHelpText = hasCargo ? 'View cargo hold contents and capacity' : 'No cargo to display';
        const cargoColor = hasCargo ? COLORS.BUTTON : COLORS.TEXT_DIM;
        UI.addButton(leftX, buttonY + 1, '2', 'Cargo Manifest', () => tryOpenCargo(gameState, onReturn), cargoColor, cargoHelpText);
        
        // Crew - gray out if no crew
        const crewHelpText = hasCrew ? 'View crew and officer details' : 'No crew members (hire at Tavern)';
        const crewColor = hasCrew ? COLORS.BUTTON : COLORS.TEXT_DIM;
        UI.addButton(leftX, buttonY + 2, '3', 'Crew', () => tryOpenCrew(gameState, onReturn), crewColor, crewHelpText);
        
        // Column 2: Captain Info, Quests, Messages, Trade Recs
        const hasSkillPoints = gameState.captain.hasSpendableSkillPoints();
        const shouldHighlightCaptainInfo = hasSkillPoints && gameState.captainInfoSeenAtLevel !== gameState.captain.level;
        const captainInfoColor = shouldHighlightCaptainInfo ? COLORS.YELLOW : COLORS.BUTTON;
        const captainInfoHelp = hasSkillPoints ? 'Skill points available! View captain info and skills' : 'View captain info, skills, and perks';
        UI.addButton(middleX, buttonY, '4', 'Captain Info', () => CaptainInfoMenu.show(() => show(gameState, returnCallback)), captainInfoColor, captainInfoHelp);
        
        // Quests - yellow if unread, gray out if no quests
        const hasUnreadQuests = gameState.activeQuests && gameState.activeQuests.some(qid => !gameState.readQuests.includes(qid));
        const questsHelpText = hasQuests ? (hasUnreadQuests ? 'View quests (new quests available)' : 'View active and completed quests') : 'No active or completed quests';
        const questsColor = hasUnreadQuests ? COLORS.YELLOW : (hasQuests ? COLORS.BUTTON : COLORS.TEXT_DIM);
        UI.addButton(middleX, buttonY + 1, '5', 'Quests', () => tryOpenQuests(gameState, onReturn), questsColor, questsHelpText);
        
        // Jobs - gray out if no active job
        const hasActiveJob = gameState.currentJob !== null;
        const jobsHelpText = hasActiveJob ? 'View active job details' : 'No active jobs';
        const jobsColor = hasActiveJob ? COLORS.BUTTON : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY + 2, '6', 'Jobs', () => tryOpenJobs(gameState, onReturn), jobsColor, jobsHelpText);
        
        // News - highlight if there are unread news events that player can see
        const hasUnreadNews = gameState.newsEvents.some(news => {
            if (news.readByPlayer || news.completed) return false;
            // Only count news from visited systems or global news
            const hasVisited = news.globalNews || 
                             (news.originSystem && gameState.visitedSystems.includes(news.originSystem.index)) || 
                             (news.targetSystem && gameState.visitedSystems.includes(news.targetSystem.index));
            return hasVisited;
        });
        const newsHelpText = hasUnreadNews ? 'View news (new events available)' : 'View active news events';
        const newsColor = hasUnreadNews ? COLORS.YELLOW : COLORS.BUTTON;
        UI.addButton(middleX, buttonY + 3, '7', 'News', () => NewsMenu.show(gameState, () => show(gameState, returnCallback)), newsColor, newsHelpText);
        
        const messagesColor = hasUnreadMessages ? COLORS.YELLOW : COLORS.BUTTON;
        UI.addButton(middleX, buttonY + 4, '8', 'Messages', () => MessagesMenu.show(gameState, () => show(gameState, returnCallback)), messagesColor, 'View messages and communications');
        
        // Column 3: Trade Recs, Score, Back
        // Trade recs - never highlight (removed recommendation highlight behavior)
        const recommendation = TradeRecommendationsMenu.getBestTradeRecommendation(gameState);
        const hasRecommendation = recommendation !== null && recommendation.type !== 'nodata';
        const tradeRecsHelp = hasRecommendation ? 'Trade opportunities available! View recommendations' : 'View trade opportunities in nearby systems';
        UI.addButton(rightX, buttonY, '9', 'Trade Recs', () => TradeRecommendationsMenu.show(gameState, () => show(gameState, returnCallback)), COLORS.BUTTON, tradeRecsHelp);
        
        UI.addButton(rightX, buttonY + 1, 's', 'Score', () => tryOpenScore(gameState, returnCallback), COLORS.BUTTON, 'View your current score and rank');
        UI.addButton(rightX, buttonY + 2, '0', 'Back', () => { if (returnCallback) returnCallback(); }, COLORS.BUTTON);
        
        // Alert messages 2 rows above output row
        const alertY = grid.height - 7; // 2 rows above buttonY
        
        // Check for unread messages or unviewed quests
        if (hasUnreadMessages) {
            // Flash between white and green, ending in white
            const flashColor = UI.getFlashState() ? COLORS.GREEN : COLORS.WHITE;
            UI.addTextCentered(alertY, 'You have unread messages!', flashColor);
        } else {
            // Check for unviewed quests if no unread messages
            const hasUnviewedQuests = gameState.activeQuests && gameState.activeQuests.some(qid => !gameState.readQuests.includes(qid));
            if (hasUnviewedQuests) {
                const flashColor = UI.getFlashState() ? COLORS.GREEN : COLORS.WHITE;
                UI.addTextCentered(alertY, 'You have unviewed quests!', flashColor);
            }
        }
        
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
        if (!gameState.subordinates || gameState.subordinates.length === 0) {
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
    
    /**
     * Try to open jobs menu
     */
    function tryOpenJobs(gameState, onReturn) {
        if (!gameState.currentJob) {
            UI.setOutputRow('No active jobs! Visit a tavern to find work.', COLORS.TEXT_ERROR);
            return;
        }
        JobsMenu.show(gameState, () => show(gameState, returnCallback));
    }
    
    /**
     * Try to open score menu
     */
    function tryOpenScore(gameState, onReturn) {
        // Calculate current score
        const currentScoreData = ScoreMenu.calculateScore(gameState);
        const currentScore = currentScoreData.totalScore;
        
        // Compare against starting score (with 1000 CR threshold)
        const startingScore = gameState.startingScore || 0;
        const scoreDifference = currentScore - startingScore;
        
        if (Math.abs(scoreDifference) <= 1000) {
            outputMessage = "Accomplish more to see your score.";
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn);
            return;
        }
        
        ScoreMenu.show(gameState, () => show(gameState, returnCallback));
    }
    
    return {
        show
    };
})();