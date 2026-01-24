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
     * @param {Function} getQuestProgress - Function to get quest progress (0.0 to 1.0), null if no progress
     * @param {string} questProgressLabel - Label for the progress bar
     */
    constructor(id, name, description, creditReward, checkCompleted, messageOnComplete = null, relatedSystems = [], getQuestProgress = null, questProgressLabel = null) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.creditReward = creditReward;
        this.checkCompleted = checkCompleted;
        this.messageOnComplete = messageOnComplete; // Message ID to add when complete
        this.relatedSystems = relatedSystems;
        this.getQuestProgress = getQuestProgress; // Function to calculate progress (0.0 to 1.0)
        this.questProgressLabel = questProgressLabel; // Label for progress bar
    }
}
