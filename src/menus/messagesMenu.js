/**
 * Messages Menu
 * Shows player messages
 */

const MessagesMenu = (() => {
    let returnCallback = null;
    let currentGameState = null;
    let selectedIndex = 0;
    
    /**
     * Show the messages menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        returnCallback = onReturn;
        currentGameState = gameState;
        selectedIndex = 0;
        
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
        UI.addTextCentered(y++, '=== Messages ===', COLORS.TITLE);
        y += 2;
        
        if (currentGameState.messages.length === 0) {
            UI.addTextCentered(y++, 'No messages', COLORS.TEXT_DIM);
        } else {
            // Show list of messages
            const leftX = 10;
            UI.addText(leftX, y++, 'Press number to read message:', COLORS.TEXT_DIM);
            y++;
            
            currentGameState.messages.forEach((message, index) => {
                const num = index + 1;
                const status = message.isRead ? '' : '[NEW] ';
                const color = message.isRead ? COLORS.TEXT_DIM : COLORS.YELLOW;
                
                UI.addButton(leftX, y++, num.toString(), `${status}${message.title}`, () => {
                    readMessage(index);
                }, color);
            });
        }
        
        // Back button
        const buttonY = grid.height - 4;
        UI.addButton(10, buttonY, '0', 'Back', () => {
            if (returnCallback) returnCallback();
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Read a specific message
     * @param {number} index - Message index
     */
    function readMessage(index) {
        const message = currentGameState.messages[index];
        if (!message) return;
        
        // Mark as read and trigger onRead
        const wasUnread = !message.isRead;
        message.read(currentGameState);
        
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
            render();
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
