/**
 * Officer Generator
 */

const OfficerGenerator = (() => {
    const firstNames = [
        'Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Sam', 'Quinn',
        'Sage', 'River', 'Sky', 'Nova', 'Ash', 'Blake', 'Lee',
        'Kai', 'Max', 'Rio', 'Zara', 'Finn', 'Jade', 'Cole', 'Dana',
        'Eden', 'Jax', 'Kit', 'Luna', 'Milo', 'Nico', 'Rory', 'Zoe',
        'Alix', 'Bo', 'Drew', 'Ezra', 'Gray', 'Iris', 'Jazz', 'Kyo',
        'Ari', 'Bay', 'Cal', 'Dell', 'Eli', 'Fox', 'Gale', 'Hal',
        'Ian', 'Jen', 'Kat', 'Len', 'Mae', 'Nye', 'Ona', 'Paz',
        'Quin', 'Rae', 'Sev', 'Tal', 'Uma', 'Val', 'Wei', 'Xan',
        'Yael', 'Zen', 'Ace', 'Bex', 'Cy', 'Dax', 'Eve', 'Fay',
        'Gil', 'Hex', 'Io', 'Jin', 'Kes', 'Lux', 'Mav', 'Nyx',
        'Oz', 'Penn', 'Rey', 'Sol', 'Tau', 'Uri', 'Vex', 'Wren',
        'Yuki', 'Zev', 'Arin', 'Brin', 'Ciel', 'Dara', 'Echo', 'Faye'
    ];
    
    const lastNames = [
        'Chen', 'Patel', 'Kim', 'Garcia', 'Silva', 'Okoye', 'Cruz',
        'Novak', 'Ivanov', 'Santos', 'Ahmed', 'Mwangi', 'Wong',
        'Singh', 'Ramos', 'Khan', 'Diaz', 'Tan', 'Vega', 'Sato',
        'Dunn', 'Reyes', 'Park', 'Lee', 'Ito', 'Ross', 'Ali',
        'Das', 'Liu', 'Malik', 'Vera', 'Zhao', 'Solis', 'Wu',
        'Yuki', 'Bao', 'Cole', 'Hale', 'Moss', 'Pike', 'Reed',
        'Sage', 'Wade', 'York', 'Ash', 'Bell', 'Clay', 'Ford',
        'Gray', 'Hunt', 'Jett', 'Kane', 'Lane', 'Nash', 'Pace',
        'Quinn', 'Rowe', 'Shaw', 'Tate', 'Vale', 'West', 'Zane',
        'Adler', 'Beck', 'Cain', 'Dean', 'Ellis', 'Frost', 'Grant',
        'Hayes', 'Iyer', 'James', 'Kwan', 'Luna', 'Mills', 'Nair',
        'Owen', 'Price', 'Roth', 'Stone', 'Tran', 'Voss', 'Webb',
        'Yang', 'Zeng', 'Amin', 'Berg', 'Chou', 'Deng', 'Esposito'
    ];
    
    const usedNames = new Set();
    
    const skillNames = ['piloting', 'barter', 'gunnery', 'smuggling', 'engineering'];
    
    /**
     * Generate a unique officer name
     * @returns {string}
     */
    function generateUniqueName() {
        let name;
        let attempts = 0;
        
        do {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            name = `${firstName} ${lastName}`;
            
            attempts++;
            if (attempts > 100) {
                // Fallback: add a number suffix
                name = `${firstName} ${lastName} ${Math.floor(Math.random() * 100)}`;
            }
        } while (usedNames.has(name));
        
        usedNames.add(name);
        return name;
    }
    
    /**
     * Generate a random officer
     * @param {number} level - Officer level (default 1)
     * @returns {Officer}
     */
    function generate(level = 1) {
        const name = generateUniqueName();
        const skill = Math.floor(Math.random() * 7) + 3; // 3-10
        
        const officer = new Officer(name, skill);
        
        // Set level and calculate skill points for that level
        if (level > 1) {
            officer.level = level;
            officer.experience = 0;
            // Calculate total skill points earned from leveling
            const totalSkillPoints = 5 + ((level - 1) * OFFICER_SKILL_POINTS_PER_LEVEL);
            
            // Distribute skill points randomly among skills
            let remainingPoints = totalSkillPoints;
            while (remainingPoints > 0) {
                const randomSkill = skillNames[Math.floor(Math.random() * skillNames.length)];
                const currentLevel = officer.skills[randomSkill];
                
                // Don't exceed max skill level
                if (currentLevel >= OFFICER_MAX_SKILL_LEVEL) continue;
                
                const cost = officer.getSkillUpgradeCost(randomSkill);
                
                // Can we afford this upgrade?
                if (remainingPoints >= cost) {
                    officer.skills[randomSkill]++;
                    remainingPoints -= cost;
                } else {
                    // If we can't afford any upgrade, stop
                    let canAffordAny = false;
                    for (const skillName of skillNames) {
                        if (officer.skills[skillName] < OFFICER_MAX_SKILL_LEVEL) {
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
