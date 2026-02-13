/**
 * Settlement Generation Module
 * Handles market, shipyard, tavern, and building generation for systems
 */

const SettlementGenerator = (() => {
    /**
     * Count bodies of specific types in a list
     * @param {Array} list - List of bodies
     * @param {Array<string>} typeIds - Type IDs to count
     * @returns {number} Count of matching bodies
     */
    function countBodies(list, typeIds) {
        if (!Array.isArray(list) || list.length === 0) return 0;
        return list.reduce((sum, body) => sum + (typeIds.includes(body.type) ? 1 : 0), 0);
    }

    /**
     * Get level object by ID
     * @param {Array} levels - Array of level objects
     * @param {string} id - Level ID
     * @returns {Object} Level object or first level as default
     */
    function getLevelById(levels, id) {
        return levels.find(level => level.id === id) || levels[0];
    }

    /**
     * Apply level effect to cargo stock and price
     * @param {Object} system - Star system
     * @param {string} cargoId - Cargo type ID
     * @param {Object} level - Level object with multipliers
     * @param {number} stock - Base stock amount
     * @param {number} price - Base price modifier
     * @returns {Object} Adjusted stock and price
     */
    function applyLevelEffect(system, cargoId, level, stock, price) {
        const adjustedStock = Math.round(stock * level.stockMultiplier);
        const adjustedPrice = price * level.priceMultiplier;
        return {
            stock: NumberUtils.clamp(adjustedStock, 0, MAX_CARGO_AMOUNT_IN_MARKET),
            price: NumberUtils.clamp(adjustedPrice, 1 / MAX_CARGO_PRICE_MODIFIER, MAX_CARGO_PRICE_MODIFIER)
        };
    }

    /**
     * Generate market data from system bodies and levels
     * @param {StarSystem} system - Star system object
     */
    function generateMarket(system) {
        const baseStock = Math.round(MAX_CARGO_AMOUNT_IN_MARKET * 0.2);

        // Count resource-producing bodies
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
            FUEL: CARGO_TYPES.HYDROCARBONS.id,
            PLASMA: CARGO_TYPES.PLASMA.id,
            ANTIMATTER: CARGO_TYPES.ANTIMATTER.id
        };

        const cultureLevel = getLevelById(SYSTEM_CULTURE_LEVELS_ALL, system.cultureLevel);
        const techLevel = getLevelById(SYSTEM_TECHNOLOGY_LEVELS_ALL, system.technologyLevel);
        const industryLevel = getLevelById(SYSTEM_INDUSTRY_LEVELS_ALL, system.industryLevel);
        const populationLevel = getLevelById(SYSTEM_POPULATION_LEVELS_ALL, system.populationLevel);

        const isHabited = Array.isArray(system.features) && system.features.includes(SYSTEM_FEATURES.HABITED.id);

        // Generate base stock and prices
        CARGO_TYPES_TRADEABLE.forEach(cargoType => {
            let stock = baseStock;
            let priceModifier = 1.0;

            const resourceKey = Object.keys(resourceToCargo).find(key => resourceToCargo[key] === cargoType.id);
            if (resourceKey) {
                const maxCount = Math.max(1, resourceMax[resourceKey]);
                const abundance = NumberUtils.clamp(resourceCounts[resourceKey] / maxCount, 0, 1);
                stock = Math.round(abundance * MAX_CARGO_AMOUNT_IN_MARKET);
                priceModifier = NumberUtils.lerp(MAX_CARGO_PRICE_MODIFIER, 1 / MAX_CARGO_PRICE_MODIFIER, abundance);
            }

            const finalStock = isHabited ? stock : 0;
            system.cargoStock[cargoType.id] = NumberUtils.clamp(finalStock, 0, MAX_CARGO_AMOUNT_IN_MARKET);
            system.cargoPriceModifier[cargoType.id] = NumberUtils.clamp(priceModifier, 1 / MAX_CARGO_PRICE_MODIFIER, MAX_CARGO_PRICE_MODIFIER);
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

    /**
     * Generate ships for shipyard
     * @param {StarSystem} system - Star system object
     */
    function generateShipyard(system) {
        const shipCount = RandomUtils.randomInt(MIN_NUM_SHIPS_IN_SHIPYARD, MAX_NUM_SHIPS_IN_SHIPYARD);
        for (let i = 0; i < shipCount; i++) {
            system.ships.push(ShipGenerator.generateRandomShip());
        }
        
        // Generate modules for shipyard (exclude alien technology)
        const moduleCount = RandomUtils.randomInt(SHIPYARD_MIN_NUM_MODULES, SHIPYARD_MAX_NUM_MODULES);
        const availableModules = SHIP_MODULES_ARRAY.filter(module => !module.alienTechnology);
        system.modules = [];
        for (let i = 0; i < moduleCount; i++) {
            if (availableModules.length === 0) break;
            const randomModule = RandomUtils.randomElement(availableModules);
            system.modules.push(randomModule.id);
        }
    }

    /**
     * Generate officers for tavern
     * @param {StarSystem} system - Star system object
     */
    function generateTavern(system) {
        const officerCount = RandomUtils.randomInt(TAVERN_MIN_NUM_OFFICERS, TAVERN_MAX_NUM_OFFICERS);
        for (let i = 0; i < officerCount; i++) {
            // Generate officers with random levels - use minimum of two rolls to favor lower levels
            const roll1 = RandomUtils.randomInt(MIN_OFFICER_LEVEL, MAX_OFFICER_LEVEL);
            const roll2 = RandomUtils.randomInt(MIN_OFFICER_LEVEL, MAX_OFFICER_LEVEL);
            const officerLevel = Math.min(roll1, roll2);
            system.officers.push(OfficerGenerator.generate(officerLevel));
        }
    }

    /**
     * Generate buildings based on generation chances
     * @param {StarSystem} system - Star system object
     */
    function generateBuildings(system) {
        Object.values(BUILDING_TYPES).forEach(buildingType => {
            if (Math.random() < buildingType.generationChance) {
                system.buildings.push(buildingType.id);
            }
        });
    }

    /**
     * Generate encounter weights using logarithmic distribution
     * @param {StarSystem} system - Star system object
     */
    function generateEncounterWeights(system) {
        system.pirateWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        system.policeWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        system.merchantWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        system.smugglersWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        system.soldiersWeight = Math.pow(MAX_ENCOUNTER_WEIGHT, Math.random() * 2 - 1);
        system.alienWeight = 0; // Initially 0, adjusted based on alien proximity
    }

    /**
     * Populate a system with all settlement features
     * @param {StarSystem} system - Star system object
     */
    function populateSystem(system) {
        generateMarket(system);
        generateShipyard(system);
        generateTavern(system);
        generateBuildings(system);
        generateEncounterWeights(system);
    }

    return {
        generateMarket,
        generateShipyard,
        generateTavern,
        generateBuildings,
        generateEncounterWeights,
        populateSystem
    };
})();
