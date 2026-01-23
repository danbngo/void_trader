/**
 * Messages Menu
 * Shows player messages
 */

const MessagesMenu = (() => {
    let returnCallback = null;
    let currentGameState = null;
    let selectedIndex = 0;
    let showingUnread = true; // true = unread messages, false = read messages
    
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
        let y = 5;
        const title = showingUnread ? '=== Unread Messages ===' : '=== Read Messages ===';
        UI.addTextCentered(y++, title, COLORS.TITLE);
        y += 2;
        
        // Filter messages by read status
        const filteredMessages = currentGameState.messages.filter(m => 
            showingUnread ? !m.isRead : m.isRead
        );
        
        if (filteredMessages.length === 0) {
            const message = showingUnread ? 'No unread messages' : 'No read messages';
            UI.addTextCentered(y++, message, COLORS.TEXT_DIM);
        } else {
            // Show list of messages
            const leftX = 10;
            UI.addText(leftX, y++, 'Press number to read message:', COLORS.TEXT_DIM);
            y++;
            
            filteredMessages.forEach((message, displayIndex) => {
                const num = displayIndex + 1;
                const status = message.isRead ? '' : '[NEW] ';
                const color = message.isRead ? COLORS.TEXT_DIM : COLORS.YELLOW;
                
                // Get original index for readMessage function
                const originalIndex = currentGameState.messages.indexOf(message);
                
                UI.addButton(leftX, y++, num.toString(), `${status}${message.title}`, () => {
                    readMessage(originalIndex);
                }, color);
            });
        }
        
        // Buttons - centered at bottom
        const buttonY = grid.height - 3;
        
        // Toggle between unread/read
        const toggleLabel = showingUnread ? 'Show Read' : 'Show Unread';
        UI.addCenteredButton(buttonY, 'T', toggleLabel, () => {
            showingUnread = !showingUnread;
            render();
        }, COLORS.BUTTON);
        
        // Back button
        UI.addCenteredButton(buttonY + 1, '0', 'Back', () => {
            if (returnCallback) returnCallback();
        }, COLORS.BUTTON);
        
        // Set help text in output row
        UI.setOutputRow('Toggle between unread and read messages', COLORS.TEXT_DIM);
        
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
            }
        }
        
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
