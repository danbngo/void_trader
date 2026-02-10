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

    const STAR_TYPE_WEIGHTS = [
        { type: BODY_TYPES.STAR_RED_DWARF.id, weight: 0.45 },
        { type: BODY_TYPES.STAR_YELLOW_DWARF.id, weight: 0.25 },
        { type: BODY_TYPES.STAR_WHITE_DWARF.id, weight: 0.1 },
        { type: BODY_TYPES.STAR_RED_GIANT.id, weight: 0.08 },
        { type: BODY_TYPES.STAR_BLUE_GIANT.id, weight: 0.04 },
        { type: BODY_TYPES.STAR_NEUTRON.id, weight: 0.05 },
        { type: BODY_TYPES.STAR_BLACK_HOLE.id, weight: 0.03 }
    ];

    const PLANET_TYPE_WEIGHTS = [
        { type: BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id, weight: 0.25 },
        { type: BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id, weight: 0.1 },
        { type: BODY_TYPES.PLANET_EARTHLIKE.id, weight: 0.08 },
        { type: BODY_TYPES.PLANET_GAS_GIANT.id, weight: 0.2 },
        { type: BODY_TYPES.PLANET_GAS_DWARF.id, weight: 0.12 },
        { type: BODY_TYPES.PLANET_ICE_GIANT.id, weight: 0.12 },
        { type: BODY_TYPES.PLANET_ICE_DWARF.id, weight: 0.13 }
    ];

    const STAR_RADIUS_RANGES_AU = {
        [BODY_TYPES.STAR_RED_DWARF.id]: [0.004, 0.02],
        [BODY_TYPES.STAR_YELLOW_DWARF.id]: [0.004, 0.01],
        [BODY_TYPES.STAR_WHITE_DWARF.id]: [0.002, 0.005],
        [BODY_TYPES.STAR_RED_GIANT.id]: [0.1, 0.6],
        [BODY_TYPES.STAR_BLUE_GIANT.id]: [0.2, 0.9],
        [BODY_TYPES.STAR_NEUTRON.id]: [0.00002, 0.00008],
        [BODY_TYPES.STAR_BLACK_HOLE.id]: [0.00005, 0.0002]
    };

    const PLANET_RADIUS_RANGES_AU = {
        [BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id]: [0.00002, 0.00005],
        [BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id]: [0.00005, 0.00012],
        [BODY_TYPES.PLANET_EARTHLIKE.id]: [0.00004, 0.00007],
        [BODY_TYPES.PLANET_GAS_GIANT.id]: [0.0003, 0.0007],
        [BODY_TYPES.PLANET_GAS_DWARF.id]: [0.00015, 0.0003],
        [BODY_TYPES.PLANET_ICE_GIANT.id]: [0.0002, 0.00045],
        [BODY_TYPES.PLANET_ICE_DWARF.id]: [0.00005, 0.00015]
    };
    
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
        
        const system = new StarSystem(name, x, y, population);
        assignSystemBodies(system);
        system.features = [SYSTEM_FEATURES.HABITED.id];

        assignSystemLevels(system);
        assignGovernmentType(system);
        
        // Generate fees (random value between min and max)
        system.fees = STAR_SYSTEM_MIN_FEES + Math.random() * (STAR_SYSTEM_MAX_FEES - STAR_SYSTEM_MIN_FEES);
        
        // Generate market data from bodies and system levels
        generateMarketFromBodies(system);
        
        // Generate ships for shipyard
        const shipCount = Math.floor(Math.random() * (MAX_NUM_SHIPS_IN_SHIPYARD - MIN_NUM_SHIPS_IN_SHIPYARD + 1)) + MIN_NUM_SHIPS_IN_SHIPYARD;
        for (let i = 0; i < shipCount; i++) {
            system.ships.push(ShipGenerator.generateRandomShip());
        }
        
        // Generate modules for shipyard (exclude alien technology)
        const moduleCount = Math.floor(Math.random() * (SHIPYARD_MAX_NUM_MODULES - SHIPYARD_MIN_NUM_MODULES + 1)) + SHIPYARD_MIN_NUM_MODULES;
        const availableModules = SHIP_MODULES_ARRAY.filter(module => !module.alienTechnology);
        system.modules = [];
        for (let i = 0; i < moduleCount; i++) {
            if (availableModules.length === 0) {
                break;
            }
            const randomModule = availableModules[Math.floor(Math.random() * availableModules.length)];
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
        system.smugglersWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        system.soldiersWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        system.alienWeight = 0; // Initially 0, adjusted based on alien proximity
        
        // Generate buildings based on generation chances
        Object.values(BUILDING_TYPES).forEach(buildingType => {
            if (Math.random() < buildingType.generationChance) {
                system.buildings.push(buildingType.id);
            }
        });
        
        return system;
    }

    function randomInt(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function pickWeighted(list) {
        const total = list.reduce((sum, entry) => sum + entry.weight, 0);
        const roll = Math.random() * total;
        let acc = 0;
        for (const entry of list) {
            acc += entry.weight;
            if (roll <= acc) {
                return entry.type;
            }
        }
        return list[list.length - 1].type;
    }

    function getRadiusForType(typeId, ranges) {
        const range = ranges[typeId] || [0.00005, 0.0002];
        return randomRange(range[0], range[1]);
    }

    function randomBodyEntry(bodyList) {
        const bodyType = bodyList[Math.floor(Math.random() * bodyList.length)];
        return bodyType ? { type: bodyType.id } : null;
    }

    function toRomanNumeral(value) {
        if (value <= 0) {
            return '';
        }
        const map = [
            { value: 1000, symbol: 'M' },
            { value: 900, symbol: 'CM' },
            { value: 500, symbol: 'D' },
            { value: 400, symbol: 'CD' },
            { value: 100, symbol: 'C' },
            { value: 90, symbol: 'XC' },
            { value: 50, symbol: 'L' },
            { value: 40, symbol: 'XL' },
            { value: 10, symbol: 'X' },
            { value: 9, symbol: 'IX' },
            { value: 5, symbol: 'V' },
            { value: 4, symbol: 'IV' },
            { value: 1, symbol: 'I' }
        ];
        let remaining = value;
        let result = '';
        for (const entry of map) {
            while (remaining >= entry.value) {
                result += entry.symbol;
                remaining -= entry.value;
            }
        }
        return result;
    }

    function assignSystemBodies(system) {
        const starCount = randomInt(MIN_SYSTEM_STARS, MAX_SYSTEM_STARS);
        const planetCount = randomInt(MIN_SYSTEM_PLANETS, MAX_SYSTEM_PLANETS);
        const beltCount = randomInt(MIN_SYSTEM_BELTS, MAX_SYSTEM_BELTS);
        const moonCount = randomInt(MIN_SYSTEM_MOONS, MAX_SYSTEM_MOONS);

        system.stars = Array.from({ length: starCount }, (_, index) => {
            const type = pickWeighted(STAR_TYPE_WEIGHTS);
            return {
                id: `${system.name}-STAR-${index + 1}`,
                name: starCount === 1 ? `${system.name}` : `${system.name} ${index + 1}`,
                type,
                radiusAU: getRadiusForType(type, STAR_RADIUS_RANGES_AU),
                orbit: null
            };
        });

        const planets = [];
        let orbitRadius = SYSTEM_PLANET_ORBIT_MIN_AU;
        for (let i = 0; i < planetCount; i++) {
            const gap = randomRange(SYSTEM_PLANET_ORBIT_GAP_MIN_AU, SYSTEM_PLANET_ORBIT_GAP_MAX_AU);
            if (i > 0) {
                orbitRadius += gap;
            }
            if (orbitRadius > SYSTEM_PLANET_ORBIT_MAX_AU) {
                break;
            }
            const type = pickWeighted(PLANET_TYPE_WEIGHTS);
            const periodDays = 365.25 * Math.pow(orbitRadius, 1.5);
            const progress = Math.random();
            planets.push(new Planet({
                id: `${system.name}-PLANET-${i + 1}`,
                type,
                radiusAU: getRadiusForType(type, PLANET_RADIUS_RANGES_AU),
                rotationDurationHours: randomRange(8, 40),
                rotationPhase: randomRange(0, Math.PI * 2),
                axialTiltDeg: randomRange(0, 35),
                orbit: {
                    semiMajorAU: orbitRadius,
                    periodDays,
                    percentOffset: progress,
                    progress
                }
            }));
        }
        if (planets.length === 0) {
            const type = pickWeighted(PLANET_TYPE_WEIGHTS);
            const periodDays = 365.25 * Math.pow(SYSTEM_PLANET_ORBIT_MIN_AU, 1.5);
            const progress = Math.random();
            planets.push(new Planet({
                id: `${system.name}-PLANET-1`,
                type,
                radiusAU: getRadiusForType(type, PLANET_RADIUS_RANGES_AU),
                rotationDurationHours: randomRange(8, 40),
                rotationPhase: randomRange(0, Math.PI * 2),
                axialTiltDeg: randomRange(0, 35),
                orbit: {
                    semiMajorAU: SYSTEM_PLANET_ORBIT_MIN_AU,
                    periodDays,
                    percentOffset: progress,
                    progress
                }
            }));
        }
        const orderedPlanets = [...planets].sort((a, b) => (a.orbit?.semiMajorAU || 0) - (b.orbit?.semiMajorAU || 0));
        orderedPlanets.forEach((planet, index) => {
            const numeral = toRomanNumeral(index + 1);
            planet.name = `${system.name} ${numeral}`;
        });
        system.planets = planets;

        const primaryPlanet = orderedPlanets.find(planet => planet.type === BODY_TYPES.PLANET_EARTHLIKE.id)
            || orderedPlanets[0]
            || null;
        if (primaryPlanet) {
            system.setPrimaryBody(primaryPlanet);
        }

        system.belts = Array.from({ length: beltCount }, () => randomBodyEntry(BELT_BODY_TYPES)).filter(Boolean);
        system.moons = Array.from({ length: moonCount }, () => randomBodyEntry(MOON_BODY_TYPES)).filter(Boolean);

        const farthestOrbit = planets.length > 0 ? planets[planets.length - 1].orbit.semiMajorAU : SYSTEM_PLANET_ORBIT_MIN_AU;
        system.stationOrbitAU = farthestOrbit + SYSTEM_STATION_ORBIT_BUFFER_AU;
        system.stationName = `${system.name} Station`;
    }

    function assignSystemLevels(system) {
        system.cultureLevel = SYSTEM_CULTURE_LEVELS_ALL[Math.floor(Math.random() * SYSTEM_CULTURE_LEVELS_ALL.length)].id;
        system.technologyLevel = SYSTEM_TECHNOLOGY_LEVELS_ALL[Math.floor(Math.random() * SYSTEM_TECHNOLOGY_LEVELS_ALL.length)].id;
        system.industryLevel = SYSTEM_INDUSTRY_LEVELS_ALL[Math.floor(Math.random() * SYSTEM_INDUSTRY_LEVELS_ALL.length)].id;

        const popRatio = system.population / Math.max(1, MAX_SYSTEM_POPULATION);
        if (popRatio < 0.25) system.populationLevel = SYSTEM_POPULATION_LEVELS.LOW.id;
        else if (popRatio < 0.5) system.populationLevel = SYSTEM_POPULATION_LEVELS.MODERATE.id;
        else if (popRatio < 0.8) system.populationLevel = SYSTEM_POPULATION_LEVELS.HIGH.id;
        else system.populationLevel = SYSTEM_POPULATION_LEVELS.MEGA.id;
    }

    function assignGovernmentType(system) {
        const randomGov = SYSTEM_GOVERNMENT_TYPES_ALL[Math.floor(Math.random() * SYSTEM_GOVERNMENT_TYPES_ALL.length)];
        system.governmentType = randomGov ? randomGov.id : null;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function countBodies(list, typeIds) {
        if (!Array.isArray(list) || list.length === 0) return 0;
        return list.reduce((sum, body) => sum + (typeIds.includes(body.type) ? 1 : 0), 0);
    }

    function getLevelById(levels, id) {
        return levels.find(level => level.id === id) || levels[0];
    }

    function applyLevelEffect(system, cargoId, level, stock, price) {
        const adjustedStock = Math.round(stock * level.stockMultiplier);
        const adjustedPrice = price * level.priceMultiplier;
        return {
            stock: clamp(adjustedStock, 0, MAX_CARGO_AMOUNT_IN_MARKET),
            price: clamp(adjustedPrice, 1 / MAX_CARGO_PRICE_MODIFIER, MAX_CARGO_PRICE_MODIFIER)
        };
    }

    function generateMarketFromBodies(system) {
        const baseStock = Math.round(MAX_CARGO_AMOUNT_IN_MARKET * 0.2);

        const resourceCounts = {
            AIR: countBodies(system.planets, [BODY_TYPES.PLANET_GAS_GIANT.id]),
            WATER: countBodies(system.planets, [BODY_TYPES.PLANET_ICE_GIANT.id]),
            FOOD: countBodies(system.planets, [BODY_TYPES.PLANET_EARTHLIKE.id]),
            NANITES: countBodies(system.planets, [BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id]),
            ISOTOPES: countBodies(system.planets, [BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id])
                + countBodies(system.belts, [BODY_TYPES.BELT_ASTEROID.id])
                + countBodies(system.stars, [BODY_TYPES.STAR_NEUTRON.id]),
            FUEL: countBodies(system.planets, [BODY_TYPES.PLANET_ICE_DWARF.id])
                + countBodies(system.belts, [BODY_TYPES.BELT_ICY.id]),
            PLASMA: countBodies(system.planets, [BODY_TYPES.PLANET_GAS_DWARF.id])
                + countBodies(system.belts, [BODY_TYPES.BELT_GAS.id])
                + countBodies(system.stars, [BODY_TYPES.STAR_RED_GIANT.id, BODY_TYPES.STAR_BLUE_GIANT.id]),
            ANTIMATTER: countBodies(system.stars, [BODY_TYPES.STAR_BLACK_HOLE.id])
        };

        const resourceMax = {
            AIR: MAX_SYSTEM_PLANETS,
            WATER: MAX_SYSTEM_PLANETS,
            FOOD: MAX_SYSTEM_PLANETS,
            NANITES: MAX_SYSTEM_PLANETS,
            ISOTOPES: MAX_SYSTEM_PLANETS + MAX_SYSTEM_BELTS + MAX_SYSTEM_STARS,
            FUEL: MAX_SYSTEM_PLANETS + MAX_SYSTEM_BELTS,
            PLASMA: MAX_SYSTEM_PLANETS + MAX_SYSTEM_BELTS + MAX_SYSTEM_STARS,
            ANTIMATTER: MAX_SYSTEM_STARS
        };

        const resourceToCargo = {
            AIR: CARGO_TYPES.AIR.id,
            WATER: CARGO_TYPES.WATER.id,
            FOOD: CARGO_TYPES.FOOD.id,
            NANITES: CARGO_TYPES.NANITES.id,
            ISOTOPES: CARGO_TYPES.ISOTOPES.id,
            FUEL: CARGO_TYPES.FUEL.id,
            PLASMA: CARGO_TYPES.PLASMA.id,
            ANTIMATTER: CARGO_TYPES.ANTIMATTER.id
        };

        const cultureLevel = getLevelById(SYSTEM_CULTURE_LEVELS_ALL, system.cultureLevel);
        const techLevel = getLevelById(SYSTEM_TECHNOLOGY_LEVELS_ALL, system.technologyLevel);
        const industryLevel = getLevelById(SYSTEM_INDUSTRY_LEVELS_ALL, system.industryLevel);
        const populationLevel = getLevelById(SYSTEM_POPULATION_LEVELS_ALL, system.populationLevel);

        CARGO_TYPES_TRADEABLE.forEach(cargoType => {
            let stock = baseStock;
            let priceModifier = 1.0;

            const resourceKey = Object.keys(resourceToCargo).find(key => resourceToCargo[key] === cargoType.id);
            if (resourceKey) {
                const maxCount = Math.max(1, resourceMax[resourceKey]);
                const abundance = clamp(resourceCounts[resourceKey] / maxCount, 0, 1);
                stock = Math.round(abundance * MAX_CARGO_AMOUNT_IN_MARKET);
                priceModifier = lerp(MAX_CARGO_PRICE_MODIFIER, 1 / MAX_CARGO_PRICE_MODIFIER, abundance);
            }

            const finalStock = isHabitedSystem(system) ? stock : 0;
            system.cargoStock[cargoType.id] = clamp(finalStock, 0, MAX_CARGO_AMOUNT_IN_MARKET);
            system.cargoPriceModifier[cargoType.id] = clamp(priceModifier, 1 / MAX_CARGO_PRICE_MODIFIER, MAX_CARGO_PRICE_MODIFIER);
        });

        // Apply culture effects
        [CARGO_TYPES.HOLOCUBES.id, CARGO_TYPES.DRUGS.id].forEach(cargoId => {
            if (system.cargoStock[cargoId] === undefined) return;
            const adjusted = applyLevelEffect(system, cargoId, cultureLevel, system.cargoStock[cargoId], system.cargoPriceModifier[cargoId]);
            system.cargoStock[cargoId] = adjusted.stock;
            system.cargoPriceModifier[cargoId] = adjusted.price;
        });

        // Apply technology effects
        [CARGO_TYPES.MEDICINE.id, CARGO_TYPES.ANTIMATTER.id].forEach(cargoId => {
            if (system.cargoStock[cargoId] === undefined) return;
            const adjusted = applyLevelEffect(system, cargoId, techLevel, system.cargoStock[cargoId], system.cargoPriceModifier[cargoId]);
            system.cargoStock[cargoId] = adjusted.stock;
            system.cargoPriceModifier[cargoId] = adjusted.price;
        });

        // Apply industry effects
        [CARGO_TYPES.NANITES.id, CARGO_TYPES.WEAPONS.id].forEach(cargoId => {
            if (system.cargoStock[cargoId] === undefined) return;
            const adjusted = applyLevelEffect(system, cargoId, industryLevel, system.cargoStock[cargoId], system.cargoPriceModifier[cargoId]);
            system.cargoStock[cargoId] = adjusted.stock;
            system.cargoPriceModifier[cargoId] = adjusted.price;
        });

        // Apply population effects (scarcity) to air, food, water
        [CARGO_TYPES.AIR.id, CARGO_TYPES.FOOD.id, CARGO_TYPES.WATER.id].forEach(cargoId => {
            if (system.cargoStock[cargoId] === undefined) return;
            const adjusted = applyLevelEffect(system, cargoId, populationLevel, system.cargoStock[cargoId], system.cargoPriceModifier[cargoId]);
            system.cargoStock[cargoId] = adjusted.stock;
            system.cargoPriceModifier[cargoId] = adjusted.price;
        });

        // Ensure ALIEN_ARTIFACTS exists but remains untradeable
        system.cargoStock[CARGO_TYPES.ALIEN_ARTIFACTS.id] = 0;
        system.cargoPriceModifier[CARGO_TYPES.ALIEN_ARTIFACTS.id] = 1.0;
    }

    function isHabitedSystem(system) {
        return Array.isArray(system.features) && system.features.includes(SYSTEM_FEATURES.HABITED.id);
    }

    function generateUninhabitedSystems(habitedSystems, count) {
        const uninhabited = [];
        let attempts = 0;
        while (uninhabited.length < count && attempts < count * 50) {
            attempts++;
            const anchor = habitedSystems[Math.floor(Math.random() * habitedSystems.length)];
            const distanceFromHabited = randomInt(UNINHABITED_SYSTEM_MIN_DISTANCE_FROM_HABITED, UNINHABITED_SYSTEM_MAX_DISTANCE_FROM_HABITED);
            const angle = Math.random() * Math.PI * 2;
            const x = Math.round(anchor.x + Math.cos(angle) * distanceFromHabited);
            const y = Math.round(anchor.y + Math.sin(angle) * distanceFromHabited);

            let nearestHabitedDistance = Infinity;
            const tooCloseToHabited = habitedSystems.some(system => {
                const dist = distance(x, y, system.x, system.y);
                nearestHabitedDistance = Math.min(nearestHabitedDistance, dist);
                return dist < UNINHABITED_SYSTEM_MIN_DISTANCE_FROM_HABITED;
            });
            if (tooCloseToHabited) continue;
            if (nearestHabitedDistance > UNINHABITED_SYSTEM_MAX_DISTANCE_FROM_HABITED) continue;

            const tooCloseToUninhabited = uninhabited.some(system => {
                const dist = distance(x, y, system.x, system.y);
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
            generateMarketFromBodies(system);
            system.ships = [];
            system.modules = [];
            system.officers = [];
            system.jobs = [];

            uninhabited.push(system);
        }
        return uninhabited;
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

        const uninhabitedCount = randomInt(UNINHABITED_SYSTEMS_MIN_NUM, UNINHABITED_SYSTEMS_MAX_NUM);
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
                if (i !== targetIndex && !isHabitedSystem(systems[i])) continue;
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

        terraSystem.stars = [{ type: BODY_TYPES.STAR_YELLOW_DWARF.id }];
        terraSystem.planets = [
            { type: BODY_TYPES.PLANET_EARTHLIKE.id },
            { type: BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id },
            { type: BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id },
            { type: BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id },
            { type: BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id },
            { type: BODY_TYPES.PLANET_GAS_GIANT.id },
            { type: BODY_TYPES.PLANET_GAS_GIANT.id },
            { type: BODY_TYPES.PLANET_ICE_GIANT.id },
            { type: BODY_TYPES.PLANET_ICE_GIANT.id },
            { type: BODY_TYPES.PLANET_ICE_DWARF.id },
            { type: BODY_TYPES.PLANET_ICE_DWARF.id }
        ];
        terraSystem.belts = [
            { type: BODY_TYPES.BELT_ASTEROID.id },
            { type: BODY_TYPES.BELT_ICY.id }
        ];
        terraSystem.moons = [
            { type: BODY_TYPES.MOON_ROCKY.id },
            { type: BODY_TYPES.MOON_ROCKY.id },
            { type: BODY_TYPES.MOON_ICE.id },
            { type: BODY_TYPES.MOON_ICE.id },
            { type: BODY_TYPES.MOON_VOLCANIC.id },
            { type: BODY_TYPES.MOON_ROCKY.id }
        ];
        terraSystem.features = [SYSTEM_FEATURES.HABITED.id];
        
        // Set minimum fees
        terraSystem.fees = STAR_SYSTEM_MIN_FEES;
        
        // Give Terra all buildings except Courthouse
        terraSystem.buildings = Object.values(BUILDING_TYPES)
            .filter(building => building.id !== 'COURTHOUSE')
            .map(building => building.id);
        
        // Mark Terra as immune to alien conquest
        terraSystem.immuneToAlienConquest = true;
        
        // Stock Terra's market with half to full capacity of LEGAL cargo types only
        const legalCargoTypes = CARGO_TYPES_TRADEABLE.filter(ct => !ct.illegal);
        legalCargoTypes.forEach(cargoType => {
            const minAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * TERRA_MIN_CARGO_RATIO);
            const maxAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * TERRA_MAX_CARGO_RATIO);
            terraSystem.cargoStock[cargoType.id] = minAmount + Math.floor(Math.random() * (maxAmount - minAmount + 1));
            
            // Set reasonable price modifiers (between 0.5 and 2.0)
            terraSystem.cargoPriceModifier[cargoType.id] = 0.5 + Math.random() * 1.5;
        });
        // Remove illegal cargo from Terra
        CARGO_TYPES_TRADEABLE.filter(ct => ct.illegal).forEach(cargoType => {
            terraSystem.cargoStock[cargoType.id] = 0;
            terraSystem.cargoPriceModifier[cargoType.id] = 1.0;
        });
        
        // Set encounter weights for Terra (lawful)
        terraSystem.policeWeight = TERRA_POLICE_WEIGHT;
        terraSystem.soldiersWeight = TERRA_SOLDIERS_WEIGHT;
        terraSystem.pirateWeight = 0;
        terraSystem.smugglersWeight = 0;
        
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

        // Add prestige ships to Terra's shipyard only
        PRESTIGE_SHIP_TYPES.forEach(shipType => {
            terraSystem.ships.push(ShipGenerator.generateShipOfType(shipType.id));
        });
        
        console.log(`[Galaxy Generation] Terra created at distance ${distance(nexus.x, nexus.y, terraSystem.x, terraSystem.y).toFixed(1)} LY from Nexus`);
        
        return terraSystem;
    }

    /**
     * Generate Blackreach - an outlaw hub immune to alien conquest
     * @param {Array<StarSystem>} systems - All star systems
     * @param {number} nexusIndex - Index of Nexus system
     * @returns {StarSystem} Blackreach system or null if failed
     */
    function generateBlackreachSystem(systems, nexusIndex) {
        const nexus = systems[nexusIndex];
        
        const candidateSystems = systems.filter((system, index) => {
            if (index === nexusIndex || system.name === 'Proxima' || system.name === 'Terra') return false;
            const dist = distance(nexus.x, nexus.y, system.x, system.y);
            return dist >= MIN_DISTANCE_NEXUS_TO_BLACKREACH;
        });
        
        if (candidateSystems.length === 0) {
            return null;
        }
        
        const blackreachSystem = candidateSystems[Math.floor(Math.random() * candidateSystems.length)];
        const oldName = blackreachSystem.name;
        blackreachSystem.name = 'Blackreach';
        usedNames.delete(oldName);
        usedNames.add('Blackreach');
        
        // Give Blackreach all buildings except Courthouse
        blackreachSystem.buildings = Object.values(BUILDING_TYPES)
            .filter(building => building.id !== 'COURTHOUSE')
            .map(building => building.id);
        
        // Mark Blackreach as immune to alien conquest
        blackreachSystem.immuneToAlienConquest = true;
        
        // Illegal cargo focus, no bonuses for legal cargo
        const illegalCargoTypes = CARGO_TYPES_TRADEABLE.filter(ct => ct.illegal);
        illegalCargoTypes.forEach(cargoType => {
            const minAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * BLACKREACH_MIN_ILLEGAL_CARGO_RATIO);
            const maxAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * BLACKREACH_MAX_ILLEGAL_CARGO_RATIO);
            blackreachSystem.cargoStock[cargoType.id] = minAmount + Math.floor(Math.random() * (maxAmount - minAmount + 1));
            blackreachSystem.cargoPriceModifier[cargoType.id] = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
        });
        const legalCargoTypes = CARGO_TYPES_TRADEABLE.filter(ct => !ct.illegal);
        legalCargoTypes.forEach(cargoType => {
            blackreachSystem.cargoPriceModifier[cargoType.id] = 1.0;
        });
        
        // Set encounter weights for Blackreach (lawless)
        blackreachSystem.policeWeight = 0;
        blackreachSystem.soldiersWeight = 0;
        blackreachSystem.pirateWeight = BLACKREACH_PIRATE_WEIGHT;
        blackreachSystem.smugglersWeight = BLACKREACH_SMUGGLERS_WEIGHT;
        
        // Generate officers for Blackreach's tavern
        const numOfficers = BLACKREACH_MIN_OFFICERS + Math.floor(Math.random() * (BLACKREACH_MAX_OFFICERS - BLACKREACH_MIN_OFFICERS + 1));
        for (let i = 0; i < numOfficers; i++) {
            blackreachSystem.officers.push(OfficerGenerator.generate());
        }
        
        // Generate ships for Blackreach's shipyard
        const numShips = BLACKREACH_MIN_SHIPS + Math.floor(Math.random() * (BLACKREACH_MAX_SHIPS - BLACKREACH_MIN_SHIPS + 1));
        for (let i = 0; i < numShips; i++) {
            blackreachSystem.ships.push(ShipGenerator.generateRandomShip());
        }
        
        console.log(`[Galaxy Generation] Blackreach created at distance ${distance(nexus.x, nexus.y, blackreachSystem.x, blackreachSystem.y).toFixed(1)} LY from Nexus`);
        
        return blackreachSystem;
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
            
            // Generate Blackreach system - outlaw hub immune to alien conquest
            const blackreachSystem = generateBlackreachSystem(systems, startSystemIndex);
            if (!blackreachSystem) {
                console.log('[Galaxy Validation] Failed to generate Blackreach system');
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
                        engine: AVERAGE_SHIP_ENGINE
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
            if (!isHabitedSystem(system)) return;
            const jobCount = Math.floor(Math.random() * (TAVERN_MAX_NUM_JOBS - TAVERN_MIN_NUM_JOBS + 1)) + TAVERN_MIN_NUM_JOBS;
            
            for (let i = 0; i < jobCount; i++) {
                // Pick a random job type
                const jobType = ALL_JOB_TYPES[Math.floor(Math.random() * ALL_JOB_TYPES.length)];
                
                // Find systems within jump range (1 jump = up to 10 LY)
                const minDistance = jobType.minJumps * 10;
                const maxDistance = jobType.maxJumps * 10;
                
                const validTargets = systems.filter((target, targetIndex) => {
                    if (!isHabitedSystem(target)) return false;
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
        const habitedSystems = systems.filter(system => isHabitedSystem(system));
        let nexusHasNews = false;
        
        for (let i = 0; i < NEWS_NUM_ON_START; i++) {
            // For first news event, always use Nexus as origin
            // For remaining events, pick random systems
            const originSystem = (i === 0) ? nexusSystem : habitedSystems[Math.floor(Math.random() * habitedSystems.length)];
            
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
                targetSystem = habitedSystems[Math.floor(Math.random() * habitedSystems.length)];
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
    
    /**
     * Adjust encounter weights based on proximity to alien-controlled systems
     * Should be called after alien conquests occur
     * @param {Array<StarSystem>} systems - All star systems
     */
    function adjustEncounterWeightsForAliens(systems) {
        // Find all alien-conquered systems
        const conqueredSystems = systems.filter(system => system.conqueredByAliens);
        
        // Reset all alien weights and soldier bonuses first
        systems.forEach(system => {
            if (!system.conqueredByAliens) {
                system.alienWeight = 0;
                // Note: We don't reset soldiersWeight here since we're multiplying it
                // Instead we'll need to track the base value
            }
        });
        
        // For each unconquered system, check if it's within attack distance of a conquered system
        systems.forEach(system => {
            if (system.conqueredByAliens) {
                return; // Skip conquered systems
            }
            
            // Check distance to nearest conquered system
            let nearestConqueredDistance = Infinity;
            for (const conqueredSystem of conqueredSystems) {
                const dist = distance(system.x, system.y, conqueredSystem.x, conqueredSystem.y);
                if (dist < nearestConqueredDistance) {
                    nearestConqueredDistance = dist;
                }
            }
            
            // If within attack distance, increase military presence
            if (nearestConqueredDistance <= ALIENS_MAX_ATTACK_DISTANCE) {
                // Store base soldier weight if not already stored
                if (!system.baseSoldiersWeight) {
                    system.baseSoldiersWeight = system.soldiersWeight;
                }
                system.soldiersWeight = system.baseSoldiersWeight * 2.0; // Double soldier presence
                system.alienWeight = 1.0; // Add base alien encounter weight
            } else {
                // Reset to base if previously boosted
                if (system.baseSoldiersWeight) {
                    system.soldiersWeight = system.baseSoldiersWeight;
                }
            }
        });
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
