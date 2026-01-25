/**
 * Job Types - Define different types of jobs available in taverns
 */

const JOB_TYPES = {
    MESSAGE_DELIVERY: {
        id: 'MESSAGE_DELIVERY',
        name: 'Message Delivery',
        color: COLORS.CYAN,
        baseCredits: 500,
        baseExp: 50,
        baseReputation: 2,
        minDeadline: 10, // Minimum days to complete
        maxDeadline: 30, // Maximum days to complete
        minJumps: 1, // Minimum jumps away (1 jump = up to 10 LY)
        maxJumps: 3, // Maximum jumps away
        
        /**
         * Generate a description for this job type
         * @param {Object} job - The job instance
         * @returns {string} Job description
         */
        descriptionGenerator: function(job) {
            return `Deliver an encoded message to ${job.targetSystem.name}`;
        },
        
        /**
         * Check if the job is completed
         * @param {Object} job - The job instance
         * @param {GameState} gameState - Current game state
         * @returns {boolean} True if job is completed
         */
        checkCompleted: function(job, gameState) {
            // Job is completed when player docks at the target system
            return gameState.currentSystemIndex === gameState.systems.indexOf(job.targetSystem);
        }
    }
};

// Array of all job types for iteration
const ALL_JOB_TYPES = Object.values(JOB_TYPES);
