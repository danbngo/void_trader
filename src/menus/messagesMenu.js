/**
 * Messages Menu
 * Shows player messages
 */

const MessagesMenu = (() => {
    let returnCallback = null;
    let currentGameState = null;
    let selectedIndex = 0;
    let showingUnread = true; // true = unread messages, false = read messages
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the messages menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        returnCallback = onReturn;
        currentGameState = gameState;
        selectedIndex = 0;
        showingUnread = true;
        outputMessage = '';
        
        render();
    }
    
    /**
     * Render the messages menu
     */
    function render() {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        let y = 2;
        const title = showingUnread ? 'Unread Messages' : 'Read Messages';
        UI.addHeaderLineCentered(3, title);
        y += 2;
        
        // Filter messages by read status
        const filteredMessages = currentGameState.messages.filter(m => 
            showingUnread ? !m.isRead : m.isRead
        );
        
        if (filteredMessages.length === 0) {
            const message = showingUnread ? 'No unread messages' : 'No read messages';
            UI.addTextCentered(y++, message, COLORS.TEXT_DIM);
        } else {
            // Ensure selectedIndex is valid
            if (selectedIndex >= filteredMessages.length) {
                selectedIndex = Math.max(0, filteredMessages.length - 1);
            }
            
            // Show messages in table format
            const rows = filteredMessages.map((message, displayIndex) => {
                const status = showingUnread ? '[NEW] ' : '';
                const color = showingUnread ? COLORS.YELLOW : COLORS.TEXT_DIM;
                
                return [
                    { text: `${status}${message.title}`, color: color }
                ];
            });
            
            TableRenderer.renderTable(5, y, ['Message'], rows, selectedIndex, 2, (rowIndex) => {
                selectedIndex = rowIndex;
                outputMessage = ''; // Clear error when selecting
                render();
            });
        }
        
        // Buttons
        const buttonY = grid.height - 3;
        const leftX = 5;
        const middleX = 28;
        
        // Check if there are any read messages
        const hasReadMessages = currentGameState.messages.some(m => m.isRead);
        const hasUnreadMessages = currentGameState.messages.some(m => !m.isRead);
        
        // Read Message button
        const canRead = filteredMessages.length > 0;
        const readColor = canRead ? COLORS.BUTTON : COLORS.TEXT_DIM;
        const readHelpText = canRead ? 'Read the selected message' : (showingUnread ? 'No unread messages to read' : 'No read messages available');
        
        UI.addButton(leftX, buttonY, '1', 'Read Message', () => {
            if (canRead && selectedIndex < filteredMessages.length) {
                const message = filteredMessages[selectedIndex];
                const originalIndex = currentGameState.messages.indexOf(message);
                readMessage(originalIndex);
            } else {
                outputMessage = showingUnread ? 'No unread messages to read!' : 'No read messages available!';
                outputColor = COLORS.TEXT_ERROR;
                render();
            }
        }, readColor, readHelpText);
        
        // Show Read/Unread toggle
        const toggleLabel = showingUnread ? 'Show Read' : 'Show Unread';
        const canToggle = showingUnread ? hasReadMessages : hasUnreadMessages;
        const toggleColor = canToggle ? COLORS.BUTTON : COLORS.TEXT_DIM;
        const toggleHelpText = canToggle 
            ? 'Toggle between unread and read messages' 
            : (showingUnread ? 'No read messages' : 'No unread messages');
        
        UI.addButton(leftX, buttonY + 1, '2', toggleLabel, () => {
            if (canToggle) {
                showingUnread = !showingUnread;
                selectedIndex = 0;
                outputMessage = '';
                render();
            } else {
                outputMessage = showingUnread ? 'No read messages!' : 'No unread messages!';
                outputColor = COLORS.TEXT_ERROR;
                render();
            }
        }, toggleColor, toggleHelpText);
        
        // Back button
        UI.addButton(middleX, buttonY, '0', 'Back', () => {
            if (returnCallback) returnCallback();
        }, COLORS.BUTTON);
        
        // Set output message if present
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Read a specific message
     * @param {number} index - Message index
     */
    function readMessage(index) {
        const message = currentGameState.messages[index];
        if (!message) return;
        
        // Track active quests before reading to detect new quest
        const questsBefore = [...currentGameState.activeQuests];
        
        // Check if this message completes a quest
        let completedQuest = null;
        if (message.completesQuestId) {
            const questId = message.completesQuestId;
            // Complete the quest if it's active and not already completed
            if (currentGameState.activeQuests.includes(questId) && !currentGameState.completedQuests.includes(questId)) {
                completedQuest = Object.values(QUESTS).find(q => q.id === questId);
                
                // Move quest from active to completed
                currentGameState.activeQuests = currentGameState.activeQuests.filter(id => id !== questId);
                currentGameState.completedQuests.push(questId);
                
                // Track completion date
                currentGameState.questCompletedDates[questId] = new Date(currentGameState.date);
                
                // Award credits programmatically
                if (completedQuest && completedQuest.creditReward > 0) {
                    currentGameState.credits += completedQuest.creditReward;
                }
                
                // Award experience programmatically
                if (completedQuest && completedQuest.expReward > 0 && currentGameState.officers.length > 0) {
                    currentGameState.officers[0].grantExperience(completedQuest.expReward);
                }
            } else {
                // Quest already completed - still show the quest info for display purposes
                completedQuest = Object.values(QUESTS).find(q => q.id === questId);
            }
        }
        
        // Mark as read and trigger onRead
        const wasUnread = !message.isRead;
        message.read(currentGameState);
        
        // Check if new quest was added
        let addedQuestId = null;
        if (wasUnread && message.onRead) {
            const questsAfter = currentGameState.activeQuests;
            const newQuest = questsAfter.find(qid => !questsBefore.includes(qid));
            if (newQuest) {
                addedQuestId = newQuest;
                // Track quest added date
                if (!currentGameState.questAddedDates) {
                    currentGameState.questAddedDates = {};
                }
                currentGameState.questAddedDates[newQuest] = new Date(currentGameState.date);
            }
        }
        
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        let y = 5;
        UI.addTextCentered(y++, `=== ${message.title} ===`, COLORS.CYAN);
        y++;
        
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
        
        // Show quest completion and reward
        if (completedQuest) {
            UI.addText(leftX, y++, `Quest completed: ${completedQuest.name}!`, COLORS.GREEN);
            if (completedQuest.creditReward > 0) {
                UI.addText(leftX, y++, `Credits awarded: ${completedQuest.creditReward} CR`, COLORS.YELLOW);
            }
            if (completedQuest.expReward > 0) {
                UI.addText(leftX, y++, `Experience awarded: ${completedQuest.expReward} XP`, COLORS.GREEN);
            }
        }
        
        // Show quest added notification with quest name
        if (addedQuestId) {
            const addedQuest = QUESTS[addedQuestId];
            if (addedQuest) {
                UI.addText(leftX, y++, `Quest added: ${addedQuest.name}!`, COLORS.GREEN);
                y++;
            }
        }
        
        // Continue button
        const buttonY = grid.height - 4;
        UI.addCenteredButton(buttonY, '1', 'Continue', () => {
            render();
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
