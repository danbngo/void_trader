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
     */
    constructor(id, title, content, onRead = null) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.onRead = onRead;
        this.isRead = false;
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
}
