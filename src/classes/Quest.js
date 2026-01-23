/**
 * Quest Class
 * Represents a quest/challenge for the player
 */

class Quest {
    /**
     * @param {string} id - Unique quest identifier
     * @param {string} name - Quest name
     * @param {string} description - Quest description
     * @param {number} creditReward - Credits awarded on completion
     * @param {Function} checkCompleted - Function to check if quest is completed
     * @param {string} messageOnComplete - Message ID to add when quest objectives are met
     * @param {Array<string>} relatedSystems - Array of system names related to this quest
     */
    constructor(id, name, description, creditReward, checkCompleted, messageOnComplete = null, relatedSystems = []) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.creditReward = creditReward;
        this.checkCompleted = checkCompleted;
        this.messageOnComplete = messageOnComplete; // Message ID to add when complete
        this.relatedSystems = relatedSystems;
    }
}
