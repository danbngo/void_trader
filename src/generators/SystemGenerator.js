/**
 * Star System Name Generator
 */

const SystemGenerator = (() => {
    const prefixes = [
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Zeta', 'Eta', 'Theta', 'Iota',
        'Nova', 'Void', 'Dark', 'Bright', 'Silent', 'Deep', 'Far', 'Near',
        'New', 'Old', 'Prime', 'Omega', 'Stellar', 'Cosmic', 'Nebula', 'Star',
        'Red', 'Blue', 'White', 'Gold', 'Silver', 'Iron', 'Black', 'Grey',
        'Swift', 'Lost', 'Wild', 'Cold', 'Hot', 'Lone', 'Twin', 'High',
        'Low', 'East', 'West', 'North', 'South', 'Core', 'Edge', 'Last'
    ];
    
    const roots = [
        'Centuri', 'Draco', 'Aquila', 'Lyra', 'Vega', 'Sirius', 'Rigel',
        'Artur', 'Spica', 'Antares', 'Aldebar', 'Pollux', 'Regulus',
        'Castor', 'Procyon', 'Deneb', 'Altair', 'Capella', 'Mira',
        'Haven', 'Point', 'Station', 'Post', 'Gate', 'Reach', 'Hope',
        'Dawn', 'Dusk', 'Shadow', 'Light', 'Ember', 'Frost', 'Storm',
        'Crest', 'Vale', 'Ridge', 'Forge', 'Port', 'Bay', 'Harbor',
        'Cove', 'Cross', 'Run', 'Pass', 'Rest', 'Hold', 'Keep',
        'Watch', 'Guard', 'Shield', 'Spire', 'Tower', 'Crown', 'Pike'
    ];
    
    const suffixes = [
        'Prime', 'Major', 'Minor', 'Alpha', 'Beta', 'Gamma',
        'One', 'Two', 'Three', 'Four', 'Five', 'Six',
        'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'
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
            const usePrefix = Math.random() > 0.4;
            const useSuffix = Math.random() > 0.5;
            
            const root = roots[Math.floor(Math.random() * roots.length)];
            
            // Only allow 2-part names max (prefix+root OR root+suffix OR just root)
            if (usePrefix && !useSuffix) {
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                name = `${prefix} ${root}`;
            } else if (useSuffix && !usePrefix) {
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
        
        // Generate fees (random value between min and max)
        system.fees = STAR_SYSTEM_MIN_FEES + Math.random() * (STAR_SYSTEM_MAX_FEES - STAR_SYSTEM_MIN_FEES);
        
        // Generate market data for each cargo type (excludes RELICS)
        CARGO_TYPES_TRADEABLE.forEach(cargoType => {
            // Stock: random amount based on constants
            const stockRange = MAX_CARGO_AMOUNT_IN_MARKET - MIN_CARGO_AMOUNT_IN_MARKET + 1;
            system.cargoStock[cargoType.id] = Math.floor(Math.random() * stockRange) + MIN_CARGO_AMOUNT_IN_MARKET;
            
            // Price modifier: logarithmic distribution for equal chance above/below 1.0
            // Range is [0.25, 4.0] which is symmetric around 1.0 in log space
            system.cargoPriceModifier[cargoType.id] = Math.pow(MAX_CARGO_PRICE_MODIFIER, Math.random() * 2 - 1);
        });
        
        // Also add RELICS even though they're not tradeable (for news system)
        system.cargoPriceModifier[CARGO_TYPES.RELICS.id] = Math.pow(MAX_CARGO_PRICE_MODIFIER, Math.random() * 2 - 1);
        
        // Generate ships for shipyard
        const shipCount = Math.floor(Math.random() * (MAX_NUM_SHIPS_IN_SHIPYARD - MIN_NUM_SHIPS_IN_SHIPYARD + 1)) + MIN_NUM_SHIPS_IN_SHIPYARD;
        for (let i = 0; i < shipCount; i++) {
            system.ships.push(ShipGenerator.generateRandomShip());
        }
        
        // Generate modules for shipyard
        const moduleCount = Math.floor(Math.random() * (SHIPYARD_MAX_NUM_MODULES - SHIPYARD_MIN_NUM_MODULES + 1)) + SHIPYARD_MIN_NUM_MODULES;
        system.modules = [];
        for (let i = 0; i < moduleCount; i++) {
            const randomModule = SHIP_MODULES_ARRAY[Math.floor(Math.random() * SHIP_MODULES_ARRAY.length)];
            system.modules.push(randomModule.id);
        }
        
        // Generate officers for tavern
        const officerCount = Math.floor(Math.random() * (TAVERN_MAX_NUM_OFFICERS - TAVERN_MIN_NUM_OFFICERS + 1)) + TAVERN_MIN_NUM_OFFICERS;
        for (let i = 0; i < officerCount; i++) {
            // Generate officers with random levels - use minimum of two rolls to favor lower levels
            const roll1 = Math.floor(Math.random() * (MAX_OFFICER_LEVEL - MIN_OFFICER_LEVEL + 1)) + MIN_OFFICER_LEVEL;
            const roll2 = Math.floor(Math.random() * (MAX_OFFICER_LEVEL - MIN_OFFICER_LEVEL + 1)) + MIN_OFFICER_LEVEL;
            const officerLevel = Math.min(roll1, roll2);
            system.officers.push(OfficerGenerator.generate(officerLevel));
        }
        
        // Jobs will be generated later during postGenerateJobs after all systems are created
        system.jobs = [];
        
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
        
        // Assign index to each system
        connectedSystems.forEach((system, index) => {
            system.index = index;
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
        if (startIndex === targetIndex) return { pathExists: true, hops: 0, path: [startIndex] };
        
        const visited = new Set();
        const queue = [{ index: startIndex, hops: 0, path: [startIndex] }];
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
                    const newPath = [...current.path, i];
                    if (i === targetIndex) {
                        return { pathExists: true, hops: current.hops + 1, path: newPath }; // Found path to target
                    }
                    visited.add(i);
                    queue.push({ index: i, hops: current.hops + 1, path: newPath });
                }
            }
        }
        
        return { pathExists: false, hops: -1, path: [] }; // No path found
    }
    
    /**
     * Check if there's a valid profitable trade at Nexus (starting system)
     * This ensures the player has something to trade right from the start
     * @param {Object} gameState - Minimal game state with systems, currentSystemIndex, enabledCargoTypes, ships
     * @returns {boolean} True if there's at least one profitable buy-and-sell opportunity
     */
    function checkForValidTradeAtNexus(gameState) {
        const currentSystem = gameState.getCurrentSystem();
        const activeShip = gameState.ships[0];
        const maxFuel = activeShip.maxFuel;
        
        let bestProfit = 0;
        
        // Check each enabled cargo type
        for (const cargoType of gameState.enabledCargoTypes) {
            // Calculate buy price at Nexus
            const currentBasePrice = cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id];
            const currentBuyPrice = Math.floor(currentBasePrice * (1 + currentSystem.fees));
            
            // Check if there's stock available at Nexus
            const currentStock = currentSystem.cargoStock[cargoType.id];
            if (currentStock <= 0) continue;
            
            // Check all reachable systems for best sell price
            for (let i = 0; i < gameState.systems.length; i++) {
                if (i === gameState.currentSystemIndex) continue; // Skip Nexus itself
                
                const targetSystem = gameState.systems[i];
                const dist = distance(currentSystem.x, currentSystem.y, targetSystem.x, targetSystem.y);
                const fuelCost = Ship.calculateFleetFuelCost(dist, gameState.ships.length);
                
                // Only consider reachable systems
                if (maxFuel < fuelCost) continue;
                
                // Calculate sell price at target system
                const targetBasePrice = cargoType.baseValue * targetSystem.cargoPriceModifier[cargoType.id];
                const targetSellPrice = Math.floor(targetBasePrice / (1 + targetSystem.fees));
                
                // Calculate profit
                const profit = targetSellPrice - currentBuyPrice;
                
                // Track best profit found
                if (profit > bestProfit) {
                    bestProfit = profit;
                }
            }
        }
        
        // Return true if we found at least one profitable trade (profit > 0)
        return bestProfit > 0;
    }
    
    /**
     * Generate Terra - the capital world immune to alien conquest
     * @param {Array<StarSystem>} systems - All star systems
     * @param {number} nexusIndex - Index of Nexus system
     * @returns {StarSystem} Terra system or null if failed
     */
    function generateTerraSystem(systems, nexusIndex) {
        const nexus = systems[nexusIndex];
        
        // Find a suitable system that is at least MIN_DISTANCE_NEXUS_TO_TERRA from Nexus
        // and is not Nexus or Proxima
        const candidateSystems = systems.filter((system, index) => {
            if (index === nexusIndex || system.name === 'Proxima') return false;
            const dist = distance(nexus.x, nexus.y, system.x, system.y);
            return dist >= MIN_DISTANCE_NEXUS_TO_TERRA;
        });
        
        if (candidateSystems.length === 0) {
            return null;
        }
        
        // Pick a random candidate
        const terraSystem = candidateSystems[Math.floor(Math.random() * candidateSystems.length)];
        
        // Rename to "Terra"
        const oldName = terraSystem.name;
        terraSystem.name = 'Terra';
        usedNames.delete(oldName);
        usedNames.add('Terra');
        
        // Set minimum fees
        terraSystem.fees = STAR_SYSTEM_MIN_FEES;
        
        // Give Terra ALL buildings
        terraSystem.buildings = Object.values(BUILDING_TYPES).map(building => building.id);
        
        // Mark Terra as immune to alien conquest
        terraSystem.immuneToAlienConquest = true;
        
        // Stock Terra's market with half to full capacity of every cargo type (excluding RELICS)
        CARGO_TYPES_TRADEABLE.forEach(cargoType => {
            const minAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * TERRA_MIN_CARGO_RATIO);
            const maxAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * TERRA_MAX_CARGO_RATIO);
            terraSystem.cargoStock[cargoType.id] = minAmount + Math.floor(Math.random() * (maxAmount - minAmount + 1));
            
            // Set reasonable price modifiers (between 0.5 and 2.0)
            terraSystem.cargoPriceModifier[cargoType.id] = 0.5 + Math.random() * 1.5;
        });
        
        // Generate maximum officers for Terra's tavern
        const numOfficers = TERRA_MIN_OFFICERS + Math.floor(Math.random() * (TERRA_MAX_OFFICERS - TERRA_MIN_OFFICERS + 1));
        for (let i = 0; i < numOfficers; i++) {
            terraSystem.officers.push(OfficerGenerator.generate());
        }
        
        // Generate maximum ships for Terra's shipyard
        const numShips = TERRA_MIN_SHIPS + Math.floor(Math.random() * (TERRA_MAX_SHIPS - TERRA_MIN_SHIPS + 1));
        for (let i = 0; i < numShips; i++) {
            terraSystem.ships.push(ShipGenerator.generateRandomShip());
        }
        
        console.log(`[Galaxy Generation] Terra created at distance ${distance(nexus.x, nexus.y, terraSystem.x, terraSystem.y).toFixed(1)} LY from Nexus`);
        
        return terraSystem;
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
        
        // Name starting system "Nexus" (remove from usedNames set if it exists elsewhere)
        const oldStartName = startingSystem.name;
        startingSystem.name = 'Nexus';
        usedNames.delete(oldStartName);
        usedNames.add('Nexus');
        
        // Set Nexus to have minimum fees
        startingSystem.fees = STAR_SYSTEM_MIN_FEES;
        
        // Ensure Nexus has ALL buildings except Guild
        const allBuildingsExceptGuild = Object.values(BUILDING_TYPES)
            .filter(building => building.id !== 'GUILD')
            .map(building => building.id);
        startingSystem.buildings = allBuildingsExceptGuild;
        
        // Ensure Nexus has at least one below-average and one above-average cargo price
        const cargoIds = Object.keys(startingSystem.cargoPriceModifier);
        let hasBelowAverage = cargoIds.some(id => startingSystem.cargoPriceModifier[id] < 1.0);
        let hasAboveAverage = cargoIds.some(id => startingSystem.cargoPriceModifier[id] > 1.0);
        
        // If no below-average prices, set first cargo type to below average
        if (!hasBelowAverage && cargoIds.length > 0) {
            startingSystem.cargoPriceModifier[cargoIds[0]] = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
        }
        
        // If no above-average prices, set second cargo type to above average
        if (!hasAboveAverage && cargoIds.length > 1) {
            startingSystem.cargoPriceModifier[cargoIds[1]] = 1.0 + Math.random() * 1.0; // 1.0 to 2.0
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
            // Rename to "Proxima" (update usedNames set)
            const oldProximaName = nearestGuildSystem.name;
            nearestGuildSystem.name = 'Proxima';
            usedNames.delete(oldProximaName);
            usedNames.add('Proxima');
            
            // Generate Terra system - capital world immune to alien conquest
            const terraSystem = generateTerraSystem(systems, startSystemIndex);
            if (!terraSystem) {
                console.log('[Galaxy Validation] Failed to generate Terra system');
                return false;
            }
            
            // Check if there's a valid path from Nexus to Proxima using 10ly jumps
            // This ensures it's reachable even though it's >10ly direct distance
            const pathResult = hasPathBetweenSystems(systems, startSystemIndex, nearestGuildIndex, 10);
            
            // Build path string with system names
            const pathNames = pathResult.path.map(idx => systems[idx].name || `System ${idx}`).join(' -> ');
            console.log(`[Galaxy Validation] Path to Proxima: ${pathNames} (${pathResult.hops} hops)`);
            
            // Path must exist and require at most 4 hops
            if (pathResult.pathExists && pathResult.hops > 0 && pathResult.hops <= 4) {
                // Additionally check if there's a valid trade recommendation at Nexus
                // Create a temporary minimal game state to test trade recommendations
                const tempGameState = {
                    systems: systems,
                    currentSystemIndex: startSystemIndex,
                    enabledCargoTypes: ALL_CARGO_TYPES.slice(0, 3), // Basic cargo types only
                    ships: [{
                        maxFuel: 20, // Starting ship fuel
                        engine: AVERAGE_SHIP_ENGINE_LEVEL
                    }],
                    getCurrentSystem: function() { return this.systems[this.currentSystemIndex]; }
                };
                
                // Check if there's a valid trade recommendation using TradeRecommendationsMenu logic
                const hasValidTrade = checkForValidTradeAtNexus(tempGameState);
                
                if (!hasValidTrade) {
                    console.log('[Galaxy Validation] Invalid: no profitable trade opportunities at Nexus');
                    return false;
                }
                
                return true;
            }
            
            console.log(`[Galaxy Validation] Invalid: requires ${pathResult.hops} hops (max 4 allowed)`);
            return false;
        }
        
        // No guild system found that meets criteria - galaxy is invalid
        console.log('[Galaxy Validation] No suitable guild system found');
        return false;
    }
    
    /**
     * Generate jobs for all systems after galaxy generation
     * Must be called after all systems are created
     * @param {Array<StarSystem>} systems - All systems in the galaxy
     */
    function generateJobsForAllSystems(systems) {
        systems.forEach((system, systemIndex) => {
            const jobCount = Math.floor(Math.random() * (TAVERN_MAX_NUM_JOBS - TAVERN_MIN_NUM_JOBS + 1)) + TAVERN_MIN_NUM_JOBS;
            
            for (let i = 0; i < jobCount; i++) {
                // Pick a random job type
                const jobType = ALL_JOB_TYPES[Math.floor(Math.random() * ALL_JOB_TYPES.length)];
                
                // Find systems within jump range (1 jump = up to 10 LY)
                const minDistance = jobType.minJumps * 10;
                const maxDistance = jobType.maxJumps * 10;
                
                const validTargets = systems.filter((target, targetIndex) => {
                    if (targetIndex === systemIndex) return false; // Don't target self
                    const dist = system.distanceTo(target);
                    return dist >= minDistance && dist <= maxDistance;
                });
                
                // If no valid targets, skip this job
                if (validTargets.length === 0) continue;
                
                // Pick random target
                const targetSystem = validTargets[Math.floor(Math.random() * validTargets.length)];
                
                // Random deadline within range
                const deadline = Math.floor(Math.random() * (jobType.maxDeadline - jobType.minDeadline + 1)) + jobType.minDeadline;
                
                // Calculate difficulty multiplier based on jumps/deadline ratio
                const distance = system.distanceTo(targetSystem);
                const jumps = Math.ceil(distance / 10);
                
                // Calculate average jumps and deadline for this job type
                const avgJumps = (jobType.minJumps + jobType.maxJumps) / 2;
                const avgDeadline = (jobType.minDeadline + jobType.maxDeadline) / 2;
                
                // Difficulty = (actualJumps/actualDeadline) / (avgJumps/avgDeadline)
                // This rewards jobs that require more jumps per day
                const actualRatio = jumps / deadline;
                const avgRatio = avgJumps / avgDeadline;
                const difficultyMult = actualRatio / avgRatio;
                
                // Calculate rewards
                const awardCredits = Math.floor(jobType.baseCredits * difficultyMult);
                const awardExp = Math.floor(jobType.baseExp * difficultyMult);
                const awardReputation = Math.floor(jobType.baseReputation * difficultyMult);
                
                // Create job (without start date since it's not accepted yet)
                const job = new Job(
                    jobType,
                    targetSystem,
                    system,
                    null, // startDate - set when accepted
                    deadline, // This is stored as duration for now, converted to absolute date when accepted
                    awardCredits,
                    awardExp,
                    awardReputation
                );
                
                system.jobs.push(job);
            }
        });
    }
    
    /**
     * Generate initial news events for a new game
     * @param {Array<StarSystem>} systems - All star systems
     * @param {number} currentYear - Current game year
     * @param {number} startingSystemIndex - Index of the starting system (Nexus)
     * @returns {Array<News>} Array of generated news events
     */
    function generateInitialNews(systems, currentYear, startingSystemIndex) {
        const newsEvents = [];
        const nexusSystem = systems[startingSystemIndex];
        let nexusHasNews = false;
        
        for (let i = 0; i < NEWS_NUM_ON_START; i++) {
            // For first news event, always use Nexus as origin
            // For remaining events, pick random systems
            const originSystem = (i === 0) ? nexusSystem : systems[Math.floor(Math.random() * systems.length)];
            
            // Check if this system already has a news event
            const hasActiveNews = newsEvents.some(n => 
                n.originSystem === originSystem || n.targetSystem === originSystem
            );
            
            if (hasActiveNews) {
                // Try again with a different system
                i--;
                continue;
            }
            
            // Pick a random news type (only random news types, not alien news)
            const newsType = RANDOM_NEWS_TYPES[Math.floor(Math.random() * RANDOM_NEWS_TYPES.length)];
            
            // Pick a different random system as target
            let targetSystem;
            do {
                targetSystem = systems[Math.floor(Math.random() * systems.length)];
            } while (targetSystem === originSystem);
            
            // Random duration within the news type's range
            // For the first news (Nexus news), set duration to 1 day for testing
            const duration = (i === 0) ? 1 : newsType.minDuration + Math.random() * (newsType.maxDuration - newsType.minDuration);
            
            // Create the news event
            const news = new News(newsType, originSystem, targetSystem, currentYear, duration);
            news.markAsRead(); // Mark as read so initial news doesn't overwhelm player
            newsEvents.push(news);
            
            // Track if Nexus has news
            if (originSystem === nexusSystem || targetSystem === nexusSystem) {
                nexusHasNews = true;
            }
        }
        
        return newsEvents;
    }
    
    return {
        generate,
        generateMany,
        validateGalaxy,
        generateJobsForAllSystems,
        generateInitialNews
    };
})();
