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
    
    /**
     * Generate a random officer
     * @returns {Officer}
     */
    function generate() {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const name = `${firstName} ${lastName}`;
        const role = roles[Math.floor(Math.random() * roles.length)];
        const skill = Math.floor(Math.random() * 7) + 3; // 3-10
        
        return new Officer(name, role, skill);
    }
    
    /**
     * Generate starting crew
     * @param {number} count - Number of officers to generate
     * @returns {Array<Officer>}
     */
    function generateCrew(count = 2) {
        const officers = [];
        for (let i = 0; i < count; i++) {
            officers.push(generate());
        }
        return officers;
    }
    
    return {
        generate,
        generateCrew
    };
})();
