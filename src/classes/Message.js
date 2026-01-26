/**
 * Message Class
 * Represents a message that can be read by the player
 */

class Message {
    /**
     * @param {string} id - Unique message identifier
     * @param {string} title - Message title
     * @param {string} content - Message content (can be array of lines)
     * @param {Function} onRead - Function called when message is read
     * @param {string} completesQuestId - Quest ID that this message completes when read
     * @param {Function} checkShouldAdd - Function that checks if message should be added to inbox (receives gameState)
     */
    constructor(id, title, content, onRead = null, completesQuestId = null, checkShouldAdd = null) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.onRead = onRead;
        this.completesQuestId = completesQuestId; // Quest ID this message completes
        this.checkShouldAdd = checkShouldAdd; // Function to check if message should be added
        this.isRead = false;
        this.suppressWarning = false; // Don't warn when departing with this unread
    }
    
    /**
     * Mark this message as read and trigger onRead callback
     * @param {GameState} gameState - Current game state
     */
    read(gameState) {
        if (!this.isRead) {
            this.isRead = true;
            if (this.onRead) {
                this.onRead(gameState);
            }
        }
    }
    
    /**
     * Check if this message should be added to the player's inbox
     * @param {GameState} gameState - Current game state
     * @returns {boolean} True if message should be added
     */
    shouldBeAdded(gameState) {
        // If no checkShouldAdd function provided, don't add automatically
        if (!this.checkShouldAdd) {
            return false;
        }
        return this.checkShouldAdd(gameState);
    }
}
