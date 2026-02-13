/**
 * Unique System Generator
 * Handles generation of special systems: Nexus, Proxima, Terra, Blackreach
 */

const UniqueSystemGenerator = (() => {
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
     * Generate Terra - the capital world immune to alien conquest
     * @param {Array<StarSystem>} systems - All star systems
     * @param {number} nexusIndex - Index of Nexus system
     * @param {Set<string>} usedNames - Set of used system names
     * @returns {StarSystem} Terra system or null if failed
     */
    function generateTerra(systems, nexusIndex, usedNames) {
        const nexus = systems[nexusIndex];
        
        const candidateSystems = systems.filter((system, index) => {
            if (index === nexusIndex || system.name === 'Proxima') return false;
            const dist = distance(nexus.x, nexus.y, system.x, system.y);
            return dist >= MIN_DISTANCE_NEXUS_TO_TERRA;
        });
        
        if (candidateSystems.length === 0) return null;
        
        const terraSystem = RandomUtils.randomElement(candidateSystems);
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
        terraSystem.fees = STAR_SYSTEM_MIN_FEES;
        terraSystem.immuneToAlienConquest = true;
        
        // Give Terra all buildings except Courthouse
        terraSystem.buildings = Object.values(BUILDING_TYPES)
            .filter(building => building.id !== 'COURTHOUSE')
            .map(building => building.id);
        
        // Stock Terra's market with half to full capacity of LEGAL cargo types only
        const legalCargoTypes = CARGO_TYPES_TRADEABLE.filter(ct => !ct.illegal);
        legalCargoTypes.forEach(cargoType => {
            const minAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * TERRA_MIN_CARGO_RATIO);
            const maxAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * TERRA_MAX_CARGO_RATIO);
            terraSystem.cargoStock[cargoType.id] = RandomUtils.randomInt(minAmount, maxAmount);
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
        const numOfficers = RandomUtils.randomInt(TERRA_MIN_OFFICERS, TERRA_MAX_OFFICERS);
        for (let i = 0; i < numOfficers; i++) {
            terraSystem.officers.push(OfficerGenerator.generate());
        }
        
        // Generate maximum ships for Terra's shipyard
        const numShips = RandomUtils.randomInt(TERRA_MIN_SHIPS, TERRA_MAX_SHIPS);
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
     * @param {Set<string>} usedNames - Set of used system names
     * @returns {StarSystem} Blackreach system or null if failed
     */
    function generateBlackreach(systems, nexusIndex, usedNames) {
        const nexus = systems[nexusIndex];
        
        const candidateSystems = systems.filter((system, index) => {
            if (index === nexusIndex || system.name === 'Proxima' || system.name === 'Terra') return false;
            const dist = distance(nexus.x, nexus.y, system.x, system.y);
            return dist >= MIN_DISTANCE_NEXUS_TO_BLACKREACH;
        });
        
        if (candidateSystems.length === 0) return null;
        
        const blackreachSystem = RandomUtils.randomElement(candidateSystems);
        const oldName = blackreachSystem.name;
        blackreachSystem.name = 'Blackreach';
        usedNames.delete(oldName);
        usedNames.add('Blackreach');
        
        blackreachSystem.immuneToAlienConquest = true;
        
        // Give Blackreach all buildings except Courthouse
        blackreachSystem.buildings = Object.values(BUILDING_TYPES)
            .filter(building => building.id !== 'COURTHOUSE')
            .map(building => building.id);
        
        // Illegal cargo focus, no bonuses for legal cargo
        const illegalCargoTypes = CARGO_TYPES_TRADEABLE.filter(ct => ct.illegal);
        illegalCargoTypes.forEach(cargoType => {
            const minAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * BLACKREACH_MIN_ILLEGAL_CARGO_RATIO);
            const maxAmount = Math.floor(MAX_CARGO_AMOUNT_IN_MARKET * BLACKREACH_MAX_ILLEGAL_CARGO_RATIO);
            blackreachSystem.cargoStock[cargoType.id] = RandomUtils.randomInt(minAmount, maxAmount);
            blackreachSystem.cargoPriceModifier[cargoType.id] = 0.5 + Math.random() * 0.5;
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
        const numOfficers = RandomUtils.randomInt(BLACKREACH_MIN_OFFICERS, BLACKREACH_MAX_OFFICERS);
        for (let i = 0; i < numOfficers; i++) {
            blackreachSystem.officers.push(OfficerGenerator.generate());
        }
        
        // Generate ships for Blackreach's shipyard
        const numShips = RandomUtils.randomInt(BLACKREACH_MIN_SHIPS, BLACKREACH_MAX_SHIPS);
        for (let i = 0; i < numShips; i++) {
            blackreachSystem.ships.push(ShipGenerator.generateRandomShip());
        }
        
        console.log(`[Galaxy Generation] Blackreach created at distance ${distance(nexus.x, nexus.y, blackreachSystem.x, blackreachSystem.y).toFixed(1)} LY from Nexus`);
        
        return blackreachSystem;
    }

    /**
     * Configure Nexus (starting system)
     * @param {StarSystem} nexusSystem - The system to configure as Nexus
     * @param {Set<string>} usedNames - Set of used system names
     */
    function configureNexus(nexusSystem, usedNames) {
        const oldName = nexusSystem.name;
        nexusSystem.name = 'Nexus';
        usedNames.delete(oldName);
        usedNames.add('Nexus');
        
        nexusSystem.fees = STAR_SYSTEM_MIN_FEES;
        
        // Ensure Nexus has ALL buildings except Guild
        const allBuildingsExceptGuild = Object.values(BUILDING_TYPES)
            .filter(building => building.id !== 'GUILD')
            .map(building => building.id);
        nexusSystem.buildings = allBuildingsExceptGuild;
        
        // Ensure Nexus has at least one below-average and one above-average cargo price
        const cargoIds = Object.keys(nexusSystem.cargoPriceModifier);
        let hasBelowAverage = cargoIds.some(id => nexusSystem.cargoPriceModifier[id] < 1.0);
        let hasAboveAverage = cargoIds.some(id => nexusSystem.cargoPriceModifier[id] > 1.0);
        
        if (!hasBelowAverage && cargoIds.length > 0) {
            nexusSystem.cargoPriceModifier[cargoIds[0]] = 0.5 + Math.random() * 0.5;
        }
        
        if (!hasAboveAverage && cargoIds.length > 1) {
            nexusSystem.cargoPriceModifier[cargoIds[1]] = 1.0 + Math.random() * 1.0;
        }
    }

    /**
     * Configure Proxima (nearest guild system to Nexus)
     * @param {StarSystem} proximaSystem - The system to configure as Proxima
     * @param {Set<string>} usedNames - Set of used system names
     */
    function configureProxima(proximaSystem, usedNames) {
        const oldName = proximaSystem.name;
        proximaSystem.name = 'Proxima';
        usedNames.delete(oldName);
        usedNames.add('Proxima');
    }

    /**
     * Find nearest guild system to Nexus (>10ly away)
     * @param {Array<StarSystem>} systems - All systems
     * @param {number} nexusIndex - Index of Nexus
     * @returns {number} Index of Proxima system, or -1 if not found
     */
    function findProximaIndex(systems, nexusIndex) {
        const nexus = systems[nexusIndex];
        let nearestIndex = -1;
        let nearestDistance = Infinity;
        
        systems.forEach((system, index) => {
            if (index !== nexusIndex && system.buildings.includes('GUILD')) {
                const dist = distance(nexus.x, nexus.y, system.x, system.y);
                if (dist > 10 && dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestIndex = index;
                }
            }
        });
        
        return nearestIndex;
    }

    return {
        generateTerra,
        generateBlackreach,
        configureNexus,
        configureProxima,
        findProximaIndex,
        distance
    };
})();
