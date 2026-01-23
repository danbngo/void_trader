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
        const x = Math.floor(Math.random() * (MAX_SYSTEM_X - MIN_SYSTEM_X + 1)) + MIN_SYSTEM_X;
        const y = Math.floor(Math.random() * (MAX_SYSTEM_Y - MIN_SYSTEM_Y + 1)) + MIN_SYSTEM_Y;
        const population = Math.floor(Math.random() * (MAX_SYSTEM_POPULATION + 1));
        const economy = economies[Math.floor(Math.random() * economies.length)];
        
        const system = new StarSystem(name, x, y, population, economy);
        
        // Generate market data for each cargo type
        ALL_CARGO_TYPES.forEach(cargoType => {
            // Stock: random amount based on constants
            const stockRange = MAX_CARGO_AMOUNT_IN_MARKET - MIN_CARGO_AMOUNT_IN_MARKET + 1;
            system.cargoStock[cargoType.id] = Math.floor(Math.random() * stockRange) + MIN_CARGO_AMOUNT_IN_MARKET;
            
            // Price modifier: logarithmic distribution for equal chance above/below 1.0
            // Range is [0.25, 4.0] which is symmetric around 1.0 in log space
            system.cargoPriceModifier[cargoType.id] = Math.pow(MAX_CARGO_PRICE_MODIFIER, Math.random() * 2 - 1);
        });
        
        // Generate ships for shipyard
        const shipCount = Math.floor(Math.random() * (MAX_NUM_SHIPS_IN_SHIPYARD - MIN_NUM_SHIPS_IN_SHIPYARD + 1)) + MIN_NUM_SHIPS_IN_SHIPYARD;
        for (let i = 0; i < shipCount; i++) {
            system.ships.push(ShipGenerator.generateRandomShip());
        }
        
        // Generate encounter weights using logarithmic distribution
        // Range is [0.25, 4.0] with average 1.0, symmetric around 1.0 in log space
        system.pirateWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        system.policeWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        system.merchantWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        
        // Generate buildings based on generation chances
        Object.values(BUILDING_TYPES).forEach(buildingType => {
            if (Math.random() < buildingType.generationChance) {
                system.buildings.push(buildingType.id);
            }
        });
        
        return system;
    }
    
    /**
     * Calculate distance between two points
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {number}
     */
    function distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Find the nearest neighbor distance for a system
     * @param {StarSystem} system 
     * @param {Array<StarSystem>} otherSystems 
     * @returns {number}
     */
    function findNearestNeighborDistance(system, otherSystems) {
        let minDistance = Infinity;
        for (const other of otherSystems) {
            if (other !== system) {
                const dist = distance(system.x, system.y, other.x, other.y);
                if (dist < minDistance) {
                    minDistance = dist;
                }
            }
        }
        return minDistance;
    }
    
    /**
     * Generate multiple star systems
     * @param {number} count - Number of systems to generate
     * @returns {Array<StarSystem>}
     */
    function generateMany(count) {
        usedNames.clear();
        const systems = [];
        
        // Generate initial systems
        for (let i = 0; i < count; i++) {
            const newSystem = generate();
            
            // Check if system is too close to existing systems
            const tooClose = systems.some(existing => {
                const dist = distance(newSystem.x, newSystem.y, existing.x, existing.y);
                return dist < STAR_SYSTEM_MIN_DISTANCE_FROM_NEIGHBORS;
            });
            
            // Only add if not too close to any existing system
            if (!tooClose) {
                systems.push(newSystem);
            }
        }
        
        // Remove isolated systems (further than STAR_SYSTEM_MAX_DISTANCE_FROM_NEIGHBORS from nearest neighbor)
        const connectedSystems = systems.filter(system => {
            const nearestDistance = findNearestNeighborDistance(system, systems);
            return nearestDistance <= STAR_SYSTEM_MAX_DISTANCE_FROM_NEIGHBORS;
        });
        
        return connectedSystems;
    }
    
    /**
     * Check if there's a valid path between two systems using BFS
     * @param {Array<StarSystem>} systems - All star systems
     * @param {number} startIndex - Starting system index
     * @param {number} targetIndex - Target system index
     * @param {number} maxJumpDistance - Maximum jump distance in ly
     * @returns {boolean} True if path exists
     */
    function hasPathBetweenSystems(systems, startIndex, targetIndex, maxJumpDistance) {
        if (startIndex === targetIndex) return { pathExists: true, hops: 0 };
        
        const visited = new Set();
        const queue = [{ index: startIndex, hops: 0 }];
        visited.add(startIndex);
        
        while (queue.length > 0) {
            const current = queue.shift();
            const currentSystem = systems[current.index];
            
            // Check all other systems
            for (let i = 0; i < systems.length; i++) {
                if (visited.has(i)) continue;
                
                const otherSystem = systems[i];
                const dist = distance(currentSystem.x, currentSystem.y, otherSystem.x, otherSystem.y);
                
                if (dist <= maxJumpDistance) {
                    if (i === targetIndex) {
                        return { pathExists: true, hops: current.hops + 1 }; // Found path to target
                    }
                    visited.add(i);
                    queue.push({ index: i, hops: current.hops + 1 });
                }
            }
        }
        
        return { pathExists: false, hops: -1 }; // No path found
    }
    
    /**
     * Validate and adjust galaxy for game start
     * Names the starting system "Nexus", removes its guild,
     * and names the nearest guild system "Proxima"
     * @param {Array<StarSystem>} systems - All star systems
     * @param {number} startSystemIndex - Index of starting system
     * @returns {boolean} True if galaxy is valid (path exists from Nexus to Proxima)
     */
    function validateGalaxy(systems, startSystemIndex) {
        const startingSystem = systems[startSystemIndex];
        
        // Name starting system "Nexus"
        startingSystem.name = 'Nexus';
        
        // Remove guild from Nexus if present
        if (startingSystem.buildings.includes('GUILD')) {
            startingSystem.buildings = startingSystem.buildings.filter(b => b !== 'GUILD');
        }
        
        // Find nearest system with a guild that is >10ly away (requiring at least 2 jumps)
        // and name it "Proxima"
        let nearestGuildSystem = null;
        let nearestGuildIndex = -1;
        let nearestDistance = Infinity;
        
        systems.forEach((system, index) => {
            if (index !== startSystemIndex && system.buildings.includes('GUILD')) {
                const dist = distance(startingSystem.x, startingSystem.y, system.x, system.y);
                // Only consider systems that are >10ly away (can't be reached in 1 jump)
                if (dist > 10 && dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestGuildSystem = system;
                    nearestGuildIndex = index;
                }
            }
        });
        
        if (nearestGuildSystem) {
            nearestGuildSystem.name = 'Proxima';
            
            // Check if there's a valid path from Nexus to Proxima using 10ly jumps
            // This ensures it's reachable even though it's >10ly direct distance
            const pathResult = hasPathBetweenSystems(systems, startSystemIndex, nearestGuildIndex, 10);
            
            console.log(`[Galaxy Validation] Proxima is ${pathResult.hops} hops from Nexus`);
            
            // Path must exist and require at most 4 hops
            if (pathResult.pathExists && pathResult.hops > 0 && pathResult.hops <= 4) {
                return true;
            }
            
            console.log(`[Galaxy Validation] Invalid: requires ${pathResult.hops} hops (max 4 allowed)`);
            return false;
        }
        
        // No guild system found that meets criteria - galaxy is invalid
        console.log('[Galaxy Validation] No suitable guild system found');
        return false;
    }
    
    return {
        generate,
        generateMany,
        validateGalaxy
    };
})();
