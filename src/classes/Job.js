/**
 * Job - Represents a tavern job/mission
 */

class Job {
    /**
     * Create a new job
     * @param {Object} jobType - The job type from JOB_TYPES
     * @param {StarSystem} targetSystem - Target system for the job
     * @param {StarSystem} originSystem - System where job was posted
     * @param {number} startDate - Game date when job was accepted
     * @param {number} deadlineDate - Game date when job expires
     * @param {number} awardCredits - Credits awarded on completion
     * @param {number} awardExp - Experience awarded on completion
     * @param {number} awardReputation - Reputation awarded on completion
     */
    constructor(jobType, targetSystem, originSystem, startDate, deadlineDate, awardCredits, awardExp, awardReputation) {
        this.jobType = jobType;
        this.targetSystem = targetSystem;
        this.originSystem = originSystem;
        this.startDate = startDate;
        this.deadlineDate = deadlineDate;
        this.awardCredits = awardCredits;
        this.awardExp = awardExp;
        this.awardReputation = awardReputation;
        this.description = jobType.descriptionGenerator(this);
        this.completed = false; // Set to true when completed, waiting for reward collection
    }
    
    /**
     * Check if the job is expired
     * @param {number} currentDate - Current game date
     * @returns {boolean} True if job is expired
     */
    isExpired(currentDate) {
        return currentDate > this.deadlineDate;
    }
    
    /**
     * Get days remaining until deadline
     * @param {number} currentDate - Current game date
     * @returns {number} Days remaining (can be negative if expired)
     */
    getDaysRemaining(currentDate) {
        return Math.floor(this.deadlineDate - currentDate);
    }
    
    /**
     * Serialize job for saving
     * @returns {Object} Serialized job data
     */
    serialize() {
        return {
            jobTypeId: this.jobType.id,
            targetSystemIndex: this.targetSystem ? this.targetSystem.index : null,
            originSystemIndex: this.originSystem ? this.originSystem.index : null,
            startDate: this.startDate,
            deadlineDate: this.deadlineDate,
            awardCredits: this.awardCredits,
            awardExp: this.awardExp,
            awardReputation: this.awardReputation,
            completed: this.completed
        };
    }
    
    /**
     * Deserialize job from saved data
     * @param {Object} data - Serialized job data
     * @param {Array<StarSystem>} systems - Array of all systems
     * @returns {Job} Deserialized job
     */
    static deserialize(data, systems) {
        const jobType = JOB_TYPES[data.jobTypeId];
        const targetSystem = data.targetSystemIndex !== null ? systems[data.targetSystemIndex] : null;
        const originSystem = data.originSystemIndex !== null ? systems[data.originSystemIndex] : null;
        
        const job = new Job(
            jobType,
            targetSystem,
            originSystem,
            data.startDate,
            data.deadlineDate,
            data.awardCredits,
            data.awardExp,
            data.awardReputation
        );
        
        job.completed = data.completed || false;
        
        return job;
    }
}
