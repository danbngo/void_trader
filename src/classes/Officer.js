/**
 * Officer Class
 * Represents a crew officer
 */

class Officer {
    /**
     * @param {string} name - Name of the officer
     * @param {string} role - Role (Pilot, Engineer, Navigator, etc.)
     * @param {number} skill - Skill level (1-10)
     */
    constructor(name, role, skill) {
        this.name = name;
        this.role = role;
        this.skill = skill;
    }
}
