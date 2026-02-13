/**
 * Star System Name Generator
 * Refactored to use modular generators and utilities
 */

const SystemGenerator = (() => {
    const prefixes = [
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Zeta', 'Eta', 'Theta', 'Iota',
        'Nova', 'Void', 'Dark', 'Bright', 'Silent', 'Deep', 'Far', 'Near',
        'New', 'Old', 'Prime', 'Omega', 'Stellar', 'Cosmic', 'Nebula', 'Star',
        'Red', 'Blue', 'White', 'Gold', 'Silver', 'Iron', 'Black', 'Grey',
        'Swift', 'Lost', 'Wild', 'Cold', 'Hot', 'Lone', 'Twin', 'High',
        'Low', 'East', 'West', 'North', 'South', 'Core', 'Edge', 'Last',
        'Aurora', 'Hollow', 'Radiant', 'Fading', 'Vast', 'Quiet', 'Shattered',
        'Gilded', 'Emerald', 'Crimson', 'Azure', 'Obsidian', 'Ivory', 'Verdant',
        'Harrow', 'Gleam', 'Distant', 'Hidden', 'Sundered', 'Verdigris'
    ];
    
    const roots = [
        'Centuri', 'Draco', 'Aquila', 'Lyra', 'Vega', 'Sirius', 'Rigel',
        'Artur', 'Spica', 'Antares', 'Aldebar', 'Pollux', 'Regulus',
        'Castor', 'Procyon', 'Deneb', 'Altair', 'Capella', 'Mira',
        'Haven', 'Point', 'Station', 'Post', 'Gate', 'Reach', 'Hope',
        'Dawn', 'Dusk', 'Shadow', 'Light', 'Ember', 'Frost', 'Storm',
        'Crest', 'Vale', 'Ridge', 'Forge', 'Port', 'Bay', 'Harbor',
        'Cove', 'Cross', 'Run', 'Pass', 'Rest', 'Hold', 'Keep',
        'Watch', 'Guard', 'Shield', 'Spire', 'Tower', 'Crown', 'Pike',
        'Hollow', 'Kestrel', 'Arc', 'Bastion', 'Eclipse', 'Horizon', 'Aegis',
        'Drift', 'Sable', 'Myriad', 'Astral', 'Beacon', 'Caldera', 'Cinder',
        'Ravel', 'Zephyr', 'Quill', 'Sunder', 'Helix', 'Jade', 'Auric'
    ];
    
    const suffixes = [
        'Prime', 'Major', 'Minor', 'Alpha', 'Beta', 'Gamma',
        'One', 'Two', 'Three', 'Four', 'Five', 'Six',
        'East', 'West', 'North', 'South', 'Core', 'Reach', 'Rise', 'Fall'
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
            
            const root = RandomUtils.randomElement(roots);
            
            // Only allow 2-part names max (prefix+root OR root+suffix OR just root)
            if (usePrefix && !useSuffix) {
                const prefix = RandomUtils.randomElement(prefixes);
                name = `${prefix} ${root}`;
            } else if (useSuffix && !usePrefix) {
                const suffix = RandomUtils.randomElement(suffixes);
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
        const x = RandomUtils.randomInt(MIN_SYSTEM_X, MAX_SYSTEM_X);
        const y = RandomUtils.randomInt(MIN_SYSTEM_Y, MAX_SYSTEM_Y);
        const population = Math.floor(Math.random() * (MAX_SYSTEM_POPULATION + 1));
        
        const system = new StarSystem(name, x, y, population);
        assignSystemBodies(system);
        system.features = [SYSTEM_FEATURES.HABITED.id];

        assignSystemLevels(system);
        assignGovernmentType(system);
        
        // Generate fees (random value between min and max)
        system.fees = STAR_SYSTEM_MIN_FEES + Math.random() * (STAR_SYSTEM_MAX_FEES - STAR_SYSTEM_MIN_FEES);
        
        // Generate market, buildings, and settlements using SettlementGenerator
        SettlementGenerator.populateSystem(system);
        
        // Jobs will be generated later during postGenerateJobs after all systems are created
        system.jobs = [];
        
        return system;
    }

    function randomBodyEntry(bodyList) {
        return RandomUtils.randomElement(bodyList);
    }

    function assignSystemBodies(system) {
        // Generate stars using StarGenerator
        system.stars = StarGenerator.generateStars(system.name);
        
        // Generate planets using PlanetGenerator
        system.planets = PlanetGenerator.generatePlanets(system.name);
        
        // Select and configure primary planet
        const primaryPlanet = PlanetGenerator.selectPrimaryPlanet(system.planets);
        if (primaryPlanet) {
            system.setPrimaryBody(primaryPlanet);
        }

        // Generate belts and moons
        const beltCount = RandomUtils.randomInt(MIN_SYSTEM_BELTS, MAX_SYSTEM_BELTS);
        const moonCount = RandomUtils.randomInt(MIN_SYSTEM_MOONS, MAX_SYSTEM_MOONS);
        
        system.belts = Array.from({ length: beltCount }, () => randomBodyEntry(BELT_BODY_TYPES)).filter(Boolean);
        system.moons = Array.from({ length: moonCount }, () => randomBodyEntry(MOON_BODY_TYPES)).filter(Boolean);

        // Generate station
        const farthestOrbit = system.planets.length > 0 
            ? system.planets[system.planets.length - 1].orbit.semiMajorAU 
            : SYSTEM_PLANET_ORBIT_MIN_AU;
        const stationOrbit = farthestOrbit + SYSTEM_STATION_ORBIT_BUFFER_AU;
        const station = new SpaceStation(`${system.name}-STATION`, SPACE_STATION_SIZE_AU);
        station.name = `${system.name} Station`;
        station.orbit = {
            semiMajorAU: stationOrbit,
            periodDays: Number.POSITIVE_INFINITY,
            percentOffset: 0,
            progress: 0,
            inclinationRad: 0
        };
        station.rotationPhase = 0;
        system.station = station;
    }

    function assignSystemLevels(system) {
        system.cultureLevel = RandomUtils.randomElement(SYSTEM_CULTURE_LEVELS_ALL).id;
        system.technologyLevel = RandomUtils.randomElement(SYSTEM_TECHNOLOGY_LEVELS_ALL).id;
        system.industryLevel = RandomUtils.randomElement(SYSTEM_INDUSTRY_LEVELS_ALL).id;

        const popRatio = system.population / Math.max(1, MAX_SYSTEM_POPULATION);
        if (popRatio < 0.25) system.populationLevel = SYSTEM_POPULATION_LEVELS.LOW.id;
        else if (popRatio < 0.5) system.populationLevel = SYSTEM_POPULATION_LEVELS.MODERATE.id;
        else if (popRatio < 0.8) system.populationLevel = SYSTEM_POPULATION_LEVELS.HIGH.id;
        else system.populationLevel = SYSTEM_POPULATION_LEVELS.MEGA.id;
    }

    function assignGovernmentType(system) {
        const randomGov = RandomUtils.randomElement(SYSTEM_GOVERNMENT_TYPES_ALL);
        system.governmentType = randomGov ? randomGov.id : null;
    }

    function isHabitedSystem(system) {
        return Array.isArray(system.features) && system.features.includes(SYSTEM_FEATURES.HABITED.id);
    }

    function generateUninhabitedSystems(habitedSystems, count) {
        const uninhabited = [];
        let attempts = 0;
        while (uninhabited.length < count && attempts < count * 50) {
            attempts++;
            const anchor = RandomUtils.randomElement(habitedSystems);
            const distanceFromHabited = RandomUtils.randomInt(UNINHABITED_SYSTEM_MIN_DISTANCE_FROM_HABITED, UNINHABITED_SYSTEM_MAX_DISTANCE_FROM_HABITED);
            const angle = Math.random() * Math.PI * 2;
            const x = Math.round(anchor.x + Math.cos(angle) * distanceFromHabited);
            const y = Math.round(anchor.y + Math.sin(angle) * distanceFromHabited);

            let nearestHabitedDistance = Infinity;
            const tooCloseToHabited = habitedSystems.some(system => {
                const dist = UniqueSystemGenerator.distance(x, y, system.x, system.y);
                nearestHabitedDistance = Math.min(nearestHabitedDistance, dist);
                return dist < UNINHABITED_SYSTEM_MIN_DISTANCE_FROM_HABITED;
            });
            if (tooCloseToHabited) continue;
            if (nearestHabitedDistance > UNINHABITED_SYSTEM_MAX_DISTANCE_FROM_HABITED) continue;

            const tooCloseToUninhabited = uninhabited.some(system => {
                const dist = UniqueSystemGenerator.distance(x, y, system.x, system.y);
                return dist < STAR_SYSTEM_MIN_DISTANCE_FROM_NEIGHBORS;
            });
            if (tooCloseToUninhabited) continue;

            const name = generateName();
            const system = new StarSystem(name, x, y, 0);
            system.features = [];
            system.fees = 0;
            system.buildings = [];
            assignSystemBodies(system);
            assignSystemLevels(system);
            system.governmentType = null;
            SettlementGenerator.generateMarket(system);
            system.ships = [];
            system.modules = [];
            system.officers = [];
            system.jobs = [];

            uninhabited.push(system);
        }
        return uninhabited;
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
                const dist = UniqueSystemGenerator.distance(system.x, system.y, other.x, other.y);
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
                const dist = UniqueSystemGenerator.distance(newSystem.x, newSystem.y, existing.x, existing.y);
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

        const uninhabitedCount = RandomUtils.randomInt(UNINHABITED_SYSTEMS_MIN_NUM, UNINHABITED_SYSTEMS_MAX_NUM);
        const uninhabitedSystems = generateUninhabitedSystems(connectedSystems, uninhabitedCount);
        connectedSystems.push(...uninhabitedSystems);
        
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
     * @returns {Object} Path result with pathExists, hops, and path array
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
                if (i !== targetIndex && !isHabitedSystem(systems[i])) continue;
                const otherSystem = systems[i];
                const dist = UniqueSystemGenerator.distance(currentSystem.x, currentSystem.y, otherSystem.x, otherSystem.y);
                
                if (dist <= maxJumpDistance) {
                    const newPath = [...current.path, i];
                    if (i === targetIndex) {
                        return { pathExists: true, hops: current.hops + 1, path: newPath };
                    }
                    visited.add(i);
                    queue.push({ index: i, hops: current.hops + 1, path: newPath });
                }
            }
        }
        
        return { pathExists: false, hops: -1, path: [] };
    }
    
    /**
     * Check if there's a valid profitable trade at Nexus (starting system)
     * @param {Object} gameState - Minimal game state with systems, currentSystemIndex, enabledCargoTypes, ships
     * @returns {boolean} True if there's at least one profitable buy-and-sell opportunity
     */
    function checkForValidTradeAtNexus(gameState) {
        const currentSystem = gameState.getCurrentSystem();
        const activeShip = gameState.ships[0];
        const maxFuel = activeShip.maxFuel;
        
        let bestProfit = 0;
        
        for (const cargoType of gameState.enabledCargoTypes) {
            const currentBasePrice = cargoType.baseValue * currentSystem.cargoPriceModifier[cargoType.id];
            const currentBuyPrice = Math.floor(currentBasePrice * (1 + currentSystem.fees));
            const currentStock = currentSystem.cargoStock[cargoType.id];
            if (currentStock <= 0) continue;
            
            for (let i = 0; i < gameState.systems.length; i++) {
                if (i === gameState.currentSystemIndex) continue;
                
                const targetSystem = gameState.systems[i];
                const dist = UniqueSystemGenerator.distance(currentSystem.x, currentSystem.y, targetSystem.x, targetSystem.y);
                const fuelCost = Ship.calculateFleetFuelCost(dist, gameState.ships.length);
                
                if (maxFuel < fuelCost) continue;
                
                const targetBasePrice = cargoType.baseValue * targetSystem.cargoPriceModifier[cargoType.id];
                const targetSellPrice = Math.floor(targetBasePrice / (1 + targetSystem.fees));
                const profit = targetSellPrice - currentBuyPrice;
                
                if (profit > bestProfit) {
                    bestProfit = profit;
                }
            }
        }
        
        return bestProfit > 0;
    }
    
    /**
     * Validate and adjust galaxy for game start
     * Configures Nexus, Proxima, Terra, and Blackreach using UniqueSystemGenerator
     * @param {Array<StarSystem>} systems - All star systems
     * @param {number} startSystemIndex - Index of starting system
     * @returns {boolean} True if galaxy is valid
     */
    function validateGalaxy(systems, startSystemIndex) {
        const startingSystem = systems[startSystemIndex];
        
        // Configure Nexus using UniqueSystemGenerator
        UniqueSystemGenerator.configureNexus(startingSystem, usedNames);
        
        // Find and configure Proxima
        const proximaIndex = UniqueSystemGenerator.findProximaIndex(systems, startSystemIndex);
        
        if (proximaIndex >= 0) {
            const proximaSystem = systems[proximaIndex];
            UniqueSystemGenerator.configureProxima(proximaSystem, usedNames);
            
            // Generate Terra and Blackreach
            const terraSystem = UniqueSystemGenerator.generateTerra(systems, startSystemIndex, usedNames);
            if (!terraSystem) {
                console.log('[Galaxy Validation] Failed to generate Terra system');
                return false;
            }
            
            const blackreachSystem = UniqueSystemGenerator.generateBlackreach(systems, startSystemIndex, usedNames);
            if (!blackreachSystem) {
                console.log('[Galaxy Validation] Failed to generate Blackreach system');
                return false;
            }
            
            // Check path from Nexus to Proxima
            const pathResult = hasPathBetweenSystems(systems, startSystemIndex, proximaIndex, 10);
            const pathNames = pathResult.path.map(idx => systems[idx].name || `System ${idx}`).join(' -> ');
            console.log(`[Galaxy Validation] Path to Proxima: ${pathNames} (${pathResult.hops} hops)`);
            
            // Validate path requirements
            if (pathResult.pathExists && pathResult.hops > 0 && pathResult.hops <= 4) {
                // Check for valid trade at Nexus
                const tempGameState = {
                    systems: systems,
                    currentSystemIndex: startSystemIndex,
                    enabledCargoTypes: ALL_CARGO_TYPES.slice(0, 3),
                    ships: [{
                        maxFuel: 20,
                        engine: AVERAGE_SHIP_ENGINE
                    }],
                    getCurrentSystem: function() { return this.systems[this.currentSystemIndex]; }
                };
                
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
        
        console.log('[Galaxy Validation] No suitable guild system found');
        return false;
    }
    
    /**
     * Generate jobs for all systems after galaxy generation
     * @param {Array<StarSystem>} systems - All systems in the galaxy
     */
    function generateJobsForAllSystems(systems) {
        systems.forEach((system, systemIndex) => {
            if (!isHabitedSystem(system)) return;
            const jobCount = RandomUtils.randomInt(TAVERN_MIN_NUM_JOBS, TAVERN_MAX_NUM_JOBS);
            
            for (let i = 0; i < jobCount; i++) {
                const jobType = RandomUtils.randomElement(ALL_JOB_TYPES);
                const minDistance = jobType.minJumps * 10;
                const maxDistance = jobType.maxJumps * 10;
                
                const validTargets = systems.filter((target, targetIndex) => {
                    if (!isHabitedSystem(target)) return false;
                    if (targetIndex === systemIndex) return false;
                    const dist = system.distanceTo(target);
                    return dist >= minDistance && dist <= maxDistance;
                });
                
                if (validTargets.length === 0) continue;
                
                const targetSystem = RandomUtils.randomElement(validTargets);
                const deadline = RandomUtils.randomInt(jobType.minDeadline, jobType.maxDeadline);
                const distance = system.distanceTo(targetSystem);
                const jumps = Math.ceil(distance / 10);
                
                const avgJumps = (jobType.minJumps + jobType.maxJumps) / 2;
                const avgDeadline = (jobType.minDeadline + jobType.maxDeadline) / 2;
                const actualRatio = jumps / deadline;
                const avgRatio = avgJumps / avgDeadline;
                const difficultyMult = actualRatio / avgRatio;
                
                const awardCredits = Math.floor(jobType.baseCredits * difficultyMult);
                const awardExp = Math.floor(jobType.baseExp * difficultyMult);
                const awardReputation = Math.floor(jobType.baseReputation * difficultyMult);
                
                const job = new Job(
                    jobType,
                    targetSystem,
                    system,
                    null,
                    deadline,
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
        const habitedSystems = systems.filter(system => isHabitedSystem(system));
        
        for (let i = 0; i < NEWS_NUM_ON_START; i++) {
            const originSystem = (i === 0) ? nexusSystem : RandomUtils.randomElement(habitedSystems);
            
            const hasActiveNews = newsEvents.some(n => 
                n.originSystem === originSystem || n.targetSystem === originSystem
            );
            
            if (hasActiveNews) {
                i--;
                continue;
            }
            
            const newsType = RandomUtils.randomElement(RANDOM_NEWS_TYPES);
            
            let targetSystem;
            do {
                targetSystem = RandomUtils.randomElement(habitedSystems);
            } while (targetSystem === originSystem);
            
            const duration = (i === 0) ? 1 : newsType.minDuration + Math.random() * (newsType.maxDuration - newsType.minDuration);
            
            const news = new News(newsType, originSystem, targetSystem, currentYear, duration);
            news.markAsRead();
            newsEvents.push(news);
        }
        
        return newsEvents;
    }
    
    /**
     * Adjust encounter weights based on proximity to alien-controlled systems
     * Delegates to AlienUtils
     * @param {Array<StarSystem>} systems - All star systems
     */
    function adjustEncounterWeightsForAliens(systems) {
        AlienUtils.adjustEncounterWeights(systems);
    }
    
    return {
        generate,
        generateMany,
        validateGalaxy,
        generateJobsForAllSystems,
        generateInitialNews,
        adjustEncounterWeightsForAliens
    };
})();

