/**
 * Star System Name Generator
 */

const SystemGenerator = (() => {
    const prefixes = [
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
        'Nova', 'Void', 'Dark', 'Bright', 'Silent', 'Deep', 'Far', 'Near',
        'New', 'Old', 'Prime', 'Omega', 'Stellar', 'Cosmic', 'Nebula', 'Star'
    ];
    
    const roots = [
        'Centauri', 'Draconis', 'Aquila', 'Lyra', 'Vega', 'Sirius', 'Rigel',
        'Arcturus', 'Spica', 'Antares', 'Aldebaran', 'Pollux', 'Regulus',
        'Castor', 'Procyon', 'Deneb', 'Altair', 'Betelgeuse', 'Capella',
        'Haven', 'Point', 'Station', 'Outpost', 'Gate', 'Reach', 'Hope',
        'Dawn', 'Dusk', 'Shadow', 'Light', 'Ember', 'Frost', 'Storm'
    ];
    
    const suffixes = [
        'Prime', 'Secundus', 'Tertius', 'Major', 'Minor', 'Alpha', 'Beta',
        'One', 'Two', 'Three', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'
    ];
    
    const economies = [
        'Agricultural', 'Industrial', 'High-Tech', 'Mining', 'Trading',
        'Military', 'Research', 'Colonial', 'Tourism', 'Frontier'
    ];
    
    const usedNames = new Set();
    
    /**
     * Generate a unique star system name
     * @returns {string}
     */
    function generateName() {
        let name;
        let attempts = 0;
        
        do {
            const usePrefix = Math.random() > 0.3;
            const useSuffix = Math.random() > 0.5;
            
            const root = roots[Math.floor(Math.random() * roots.length)];
            
            if (usePrefix && useSuffix) {
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
                name = `${prefix} ${root} ${suffix}`;
            } else if (usePrefix) {
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                name = `${prefix} ${root}`;
            } else if (useSuffix) {
                const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
                name = `${root} ${suffix}`;
            } else {
                name = root;
            }
            
            attempts++;
            if (attempts > 100) {
                name = `${root}-${Math.floor(Math.random() * 1000)}`;
            }
        } while (usedNames.has(name));
        
        usedNames.add(name);
        return name;
    }
    
    /**
     * Generate a random star system
     * @returns {StarSystem}
     */
    function generate() {
        const name = generateName();
        const x = Math.floor(Math.random() * 201) - 100; // -100 to 100
        const y = Math.floor(Math.random() * 201) - 100; // -100 to 100
        const population = Math.floor(Math.random() * 10000); // 0 to 10000 million
        const economy = economies[Math.floor(Math.random() * economies.length)];
        
        return new StarSystem(name, x, y, population, economy);
    }
    
    /**
     * Generate multiple star systems
     * @param {number} count - Number of systems to generate
     * @returns {Array<StarSystem>}
     */
    function generateMany(count) {
        usedNames.clear();
        const systems = [];
        for (let i = 0; i < count; i++) {
            systems.push(generate());
        }
        return systems;
    }
    
    return {
        generate,
        generateMany
    };
})();
