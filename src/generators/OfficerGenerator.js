/**
 * Officer Generator
 */

const OfficerGenerator = (() => {
    const firstNames = [
        'Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Quinn',
        'Sage', 'River', 'Sky', 'Nova', 'Ash', 'Phoenix', 'Blake'
    ];
    
    const lastNames = [
        'Chen', 'Patel', 'Johnson', 'Kim', 'Garcia', 'Silva', 'Okoye',
        'Novak', 'Ivanov', 'Nakamura', 'Santos', 'Ahmed', 'Mwangi'
    ];
    
    const roles = ['Pilot', 'Engineer', 'Navigator', 'Gunner', 'Medic', 'Trader'];
    
    const skillNames = ['piloting', 'barter', 'gunnery', 'smuggling', 'engineering'];
    
    /**
     * Generate a random officer
     * @param {number} level - Officer level (default 1)
     * @returns {Officer}
     */
    function generate(level = 1) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const name = `${firstName} ${lastName}`;
        const role = roles[Math.floor(Math.random() * roles.length)];
        const skill = Math.floor(Math.random() * 7) + 3; // 3-10
        
        const officer = new Officer(name, role, skill);
        
        // Set level and calculate skill points for that level
        if (level > 1) {
            officer.level = level;
            officer.experience = 0;
            // Calculate total skill points earned from leveling
            const totalSkillPoints = 5 + ((level - 1) * SKILL_POINTS_PER_LEVEL);
            
            // Distribute skill points randomly among skills
            let remainingPoints = totalSkillPoints;
            while (remainingPoints > 0) {
                const randomSkill = skillNames[Math.floor(Math.random() * skillNames.length)];
                const currentLevel = officer.skills[randomSkill];
                
                // Don't exceed max skill level
                if (currentLevel >= Officer.MAX_SKILL_LEVEL) continue;
                
                const cost = officer.getSkillUpgradeCost(randomSkill);
                
                // Can we afford this upgrade?
                if (remainingPoints >= cost) {
                    officer.skills[randomSkill]++;
                    remainingPoints -= cost;
                } else {
                    // If we can't afford any upgrade, stop
                    let canAffordAny = false;
                    for (const skillName of skillNames) {
                        if (officer.skills[skillName] < Officer.MAX_SKILL_LEVEL) {
                            const testCost = officer.getSkillUpgradeCost(skillName);
                            if (remainingPoints >= testCost) {
                                canAffordAny = true;
                                break;
                            }
                        }
                    }
                    if (!canAffordAny) break;
                }
            }
            
            // Store any leftover points
            officer.skillPoints = remainingPoints;
        }
        
        return officer;
    }
    
    
    return {
        generate,
    };
})();
