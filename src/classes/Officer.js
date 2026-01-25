/**
 * Officer Class
 * Represents a crew officer
 */

class Officer {
    // Experience system constants
    static SKILL_POINTS_PER_LEVEL = 5;
    static EXP_POINTS_FOR_FIRST_LEVEL_UP = 100;
    static EXP_POINTS_LEVEL_MULTIPLIER = 2.5;
    static MAX_SKILL_LEVEL = 20;
    static SKILL_COST_INCREASE_FACTOR = 1;
    
    /**
     * @param {string} name - Name of the officer
     * @param {string} role - Role (Pilot, Engineer, Navigator, etc.)
     * @param {number} skill - Skill level (1-10)
     */
    constructor(name, role, skill) {
        this.name = name;
        this.role = role;
        this.skill = skill;
        
        // Experience system
        this.level = 1;
        this.experience = 0;
        this.skillPoints = 5; // Starting skill points
        
        // Skill levels (corresponds to SKILLS.js)
        this.skills = {
            piloting: 0,
            barter: 0,
            gunnery: 0,
            smuggling: 0,
            engineering: 0
        };
    }
    
    /**
     * Calculate experience needed to reach next level
     * @returns {number} Experience required for next level
     */
    calcExpToNextLevel() {
        // Level 1->2 = 100
        // Level 2->3 = 250
        // Level 3->4 = 625
        // etc.
        return Math.floor(Officer.EXP_POINTS_FOR_FIRST_LEVEL_UP * Math.pow(Officer.EXP_POINTS_LEVEL_MULTIPLIER, this.level - 1));
    }
    
    /**
     * Grant experience to the officer
     * @param {number} exp - Amount of experience to grant
     * @returns {boolean} True if leveled up
     */
    grantExperience(exp) {
        this.experience += exp;
        let leveledUp = false;
        
        while (this.canLevelUp()) {
            this.levelUp();
            leveledUp = true;
        }
        
        return leveledUp;
    }
    
    /**
     * Check if officer can level up
     * @returns {boolean} True if can level up
     */
    canLevelUp() {
        return this.experience >= this.calcExpToNextLevel();
    }
    
    /**
     * Level up the officer
     */
    levelUp() {
        const expNeeded = this.calcExpToNextLevel();
        this.experience -= expNeeded;
        this.level++;
        this.skillPoints += Officer.SKILL_POINTS_PER_LEVEL;
    }
    
    /**
     * Get the cost to upgrade a skill
     * @param {string} skillName - Name of the skill
     * @returns {number} Skill point cost
     */
    getSkillUpgradeCost(skillName) {
        const currentLevel = this.skills[skillName] || 0;
        return 1 + (currentLevel * Officer.SKILL_COST_INCREASE_FACTOR);
    }
    
    /**
     * Check if officer can upgrade a skill
     * @param {string} skillName - Name of the skill
     * @returns {boolean} True if can upgrade
     */
    canUpgradeSkill(skillName) {
        const currentLevel = this.skills[skillName] || 0;
        if (currentLevel >= Officer.MAX_SKILL_LEVEL) return false;
        
        const cost = this.getSkillUpgradeCost(skillName);
        return this.skillPoints >= cost;
    }
    
    /**
     * Check if officer has skill points that can be spent on any skill
     * @returns {boolean} True if any skill can be upgraded with current points
     */
    hasSpendableSkillPoints() {
        if (this.skillPoints === 0) return false;
        
        // Check if any skill can be upgraded with current points
        for (const skillName in this.skills) {
            if (this.canUpgradeSkill(skillName)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Upgrade a skill
     * @param {string} skillName - Name of the skill
     * @returns {boolean} True if successful
     */
    upgradeSkill(skillName) {
        if (!this.canUpgradeSkill(skillName)) return false;
        
        const cost = this.getSkillUpgradeCost(skillName);
        this.skillPoints -= cost;
        this.skills[skillName]++;
        return true;
    }
    
    /**
     * Get the hiring cost for this officer
     * @returns {number} Credits required to hire
     */
    getHireCost() {
        return this.level * OFFICER_HIRE_COST_PER_LEVEL;
    }
    
    /**
     * Get the salary for this officer (paid per landing)
     * @returns {number} Credits paid per landing
     */
    getSalary() {
        return this.level * OFFICER_SALARY_PER_LEVEL;
    }
}
