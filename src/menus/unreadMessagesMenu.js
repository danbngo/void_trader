/**
 * Unread Messages Menu
 * Handles the flow of warning the player about unread messages before departure
 */

const UnreadMessagesMenu = (() => {
    /**
     * Show warning about unread messages and loop through them
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to dock
     * @param {Function} onProceed - Callback to proceed with departure
     */
    function show(gameState, onReturn, onProceed) {
        // Find first unread message that hasn't been suppressed
        const unreadMessage = gameState.messages.find(m => !m.isRead && !m.suppressWarning);
        
        if (unreadMessage) {
            showUnreadMessageWarning(gameState, unreadMessage, onReturn, onProceed);
        } else {
            // No unread messages, proceed
            onProceed(gameState);
        }
    }
    
    /**
     * Show warning about unread messages
     * @param {GameState} gameState - Current game state
     * @param {Message} message - The unread message
     * @param {Function} onReturn - Callback to return to dock
     * @param {Function} onProceed - Callback to proceed with departure
     */
    function showUnreadMessageWarning(gameState, message, onReturn, onProceed) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title at top
        UI.addTitleLineCentered(0, 'Unread Message');
        let y = 2;
        
        const unreadTextY = y++;
        const messageTitleY = y++;
        
        // Add message title (static)
        UI.addTextCentered(messageTitleY, message.title, COLORS.CYAN);
        
        // Flash "You have an unread message:" text
        UI.startFlashing(() => {
            UI.clear();
            UI.addTitleLineCentered(0, 'Unread Message');
            UI.addTextCentered(unreadTextY, 'You have an unread message:', UI.getFlashState() ? COLORS.GREEN : COLORS.WHITE);
            UI.addTextCentered(messageTitleY, message.title, COLORS.CYAN);
            
            // Re-add buttons
            const buttonY = grid.height - 6;
            const menuX = Math.floor(grid.width / 2) - 15;
            
            UI.addButton(menuX, buttonY, '1', 'Read Message', () => {
                readMessageDirect(gameState, message, onReturn, onProceed);
            }, COLORS.YELLOW, 'Read the message now');
            
            UI.addButton(menuX, buttonY + 1, '2', 'Ignore Message', () => {
                onProceed(gameState);
            }, COLORS.BUTTON, 'Continue to galaxy map');
            
            UI.addButton(menuX, buttonY + 2, '9', 'Don\'t Show This Warning Again', () => {
                message.suppressWarning = true;
                onProceed(gameState);
            }, COLORS.TEXT_DIM, 'Suppress this warning for this message');
            
            UI.addButton(menuX, buttonY + 3, '0', 'Back', () => {
                onReturn(gameState);
            }, COLORS.BUTTON, 'Return to dock');
            
            UI.draw();
        }, 200, 2000, true);
    }
    
    /**
     * Read a message directly and return to dock
     * @param {GameState} gameState - Current game state
     * @param {Message} message - The message to read
     * @param {Function} onReturn - Callback to return to dock
     * @param {Function} onProceed - Callback to proceed with departure
     */
    function readMessageDirect(gameState, message, onReturn, onProceed) {
        // Track active quests before reading to detect new quest
        const questsBefore = [...gameState.activeQuests];
        
        // Check if this message completes a quest
        let completedQuest = null;
        if (message.completesQuestId) {
            const questId = message.completesQuestId;
            // Complete the quest if it's active and not already completed
            if (gameState.activeQuests.includes(questId) && !gameState.completedQuests.includes(questId)) {
                completedQuest = Object.values(QUESTS).find(q => q.id === questId);
                
                // Move quest from active to completed
                gameState.activeQuests = gameState.activeQuests.filter(id => id !== questId);
                gameState.completedQuests.push(questId);
                
                // Track completion date
                gameState.questCompletedDates[questId] = new Date(gameState.date);
                
                // Award credits programmatically
                if (completedQuest && completedQuest.creditReward > 0) {
                    gameState.credits += completedQuest.creditReward;
                }
                
                // Award experience programmatically
                if (completedQuest && completedQuest.expReward > 0) {
                    gameState.captain.grantExperience(completedQuest.expReward);
                }
            } else {
                // Quest already completed - still show the quest info for display purposes
                completedQuest = Object.values(QUESTS).find(q => q.id === questId);
            }
        }
        
        // Mark as read and trigger onRead
        const wasUnread = !message.isRead;
        message.read(gameState);
        
        // Check if new quest was added
        let addedQuestId = null;
        if (wasUnread && message.onRead) {
            const questsAfter = gameState.activeQuests;
            const newQuest = questsAfter.find(qid => !questsBefore.includes(qid));
            if (newQuest) {
                addedQuestId = newQuest;
                // Track quest added date
                if (!gameState.questAddedDates) {
                    gameState.questAddedDates = {};
                }
                gameState.questAddedDates[newQuest] = new Date(gameState.date);
            }
        }
        
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTitleLineCentered(0, message.title);
        let y = 2;
        
        // Content
        const leftX = 10;
        if (Array.isArray(message.content)) {
            message.content.forEach(line => {
                UI.addText(leftX, y++, line, COLORS.TEXT_NORMAL);
            });
        } else {
            UI.addText(leftX, y++, message.content, COLORS.TEXT_NORMAL);
        }
        
        y++;
        
        // Show quest completion and reward using renderKeyValueList
        if (completedQuest || addedQuestId) {
            const questItems = [];
            
            if (completedQuest) {
                questItems.push({ label: 'Quest completed:', value: `${completedQuest.name}!`, valueColor: COLORS.GREEN });
                if (completedQuest.creditReward > 0) {
                    questItems.push({ label: 'Credits awarded:', value: `${completedQuest.creditReward} CR`, valueColor: COLORS.YELLOW });
                }
                if (completedQuest.expReward > 0) {
                    questItems.push({ label: 'Experience awarded:', value: `${completedQuest.expReward} XP`, valueColor: COLORS.YELLOW });
                }
            }
            
            if (addedQuestId) {
                const addedQuest = QUESTS[addedQuestId];
                if (addedQuest) {
                    questItems.push({ label: 'Quest added:', value: `${addedQuest.name}!`, valueColor: COLORS.GREEN });
                }
            }
            
            y = TableRenderer.renderKeyValueList(leftX, y, questItems);
            y++;
        }
        
        // Continue button
        const buttonY = grid.height - 4;
        UI.addButton(10, buttonY, '1', 'Continue', () => {
            // Check if there are more unread messages
            const nextUnreadMessage = gameState.messages.find(m => !m.isRead && !m.suppressWarning);
            
            if (nextUnreadMessage) {
                // Show next unread message warning
                showUnreadMessageWarning(gameState, nextUnreadMessage, onReturn, onProceed);
            } else {
                // No more unread messages, proceed to galaxy map
                onProceed(gameState);
            }
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
