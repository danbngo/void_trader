/**
 * Planet Generation Module
 */

const PlanetGenerator = (() => {
    const PLANET_TYPE_WEIGHTS = [
        { type: BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id, weight: 0.25 },
        { type: BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id, weight: 0.1 },
        { type: BODY_TYPES.PLANET_EARTHLIKE.id, weight: 0.08 },
        { type: BODY_TYPES.PLANET_GAS_GIANT.id, weight: 0.2 },
        { type: BODY_TYPES.PLANET_GAS_DWARF.id, weight: 0.12 },
        { type: BODY_TYPES.PLANET_ICE_GIANT.id, weight: 0.12 },
        { type: BODY_TYPES.PLANET_ICE_DWARF.id, weight: 0.13 }
    ];

    const PLANET_RADIUS_RANGES_AU = {
        [BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id]: [0.00002, 0.00004],
        [BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id]: [0.00008, 0.00015],
        [BODY_TYPES.PLANET_EARTHLIKE.id]: [0.00004, 0.00008],
        [BODY_TYPES.PLANET_GAS_GIANT.id]: [0.0007, 0.0015],
        [BODY_TYPES.PLANET_GAS_DWARF.id]: [0.0002, 0.0004],
        [BODY_TYPES.PLANET_ICE_GIANT.id]: [0.0003, 0.0006],
        [BODY_TYPES.PLANET_ICE_DWARF.id]: [0.00005, 0.00012]
    };

    /**
     * Check if planet type is gas
     * @param {string} typeId - Planet type ID
     * @returns {boolean}
     */
    function isGasPlanetType(typeId) {
        return typeId === BODY_TYPES.PLANET_GAS_GIANT.id
            || typeId === BODY_TYPES.PLANET_GAS_DWARF.id;
    }

    /**
     * Check if planet type is ice
     * @param {string} typeId - Planet type ID
     * @returns {boolean}
     */
    function isIcePlanetType(typeId) {
        return typeId === BODY_TYPES.PLANET_ICE_GIANT.id
            || typeId === BODY_TYPES.PLANET_ICE_DWARF.id;
    }

    /**
     * Check if planet type is terrestrial
     * @param {string} typeId - Planet type ID
     * @returns {boolean}
     */
    function isTerrestrialPlanetType(typeId) {
        return typeId === BODY_TYPES.PLANET_EARTHLIKE.id
            || typeId === BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id
            || typeId === BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id;
    }

    /**
     * Add a feature to a planet
     * @param {Planet} planet - Planet object
     * @param {string} featureId - Feature ID to add
     */
    function addPlanetFeature(planet, featureId) {
        if (!planet.features) {
            planet.features = [];
        }
        if (!planet.features.includes(featureId)) {
            planet.features.push(featureId);
        }
    }

    /**
     * Assign traits/features to a planet based on its type
     * @param {Planet} planet - Planet to assign traits to
     */
    function assignPlanetTraits(planet) {
        planet.features = planet.features || [];

        const isGas = isGasPlanetType(planet.type);
        const isIce = isIcePlanetType(planet.type);
        const isTerrestrial = isTerrestrialPlanetType(planet.type);

        // Ring feature
        const ringFeature = PLANET_FEATURES.RING;
        if (ringFeature?.bodyTypes?.includes(planet.type) && Math.random() < (ringFeature.probability || 0)) {
            addPlanetFeature(planet, ringFeature.id);
        }

        // Moons
        if (Math.random() < (PLANET_FEATURES.HAS_MOONS?.probability || 0)) {
            addPlanetFeature(planet, PLANET_FEATURES.HAS_MOONS.id);
            planet.moonCount = RandomUtils.randomInt(1, 4);
        }

        // Type-specific features
        if (isGas || isIce) {
            addPlanetFeature(planet, PLANET_FEATURES.HAS_ATMOSPHERE.id);
            planet.surfaceType = PLANET_SURFACE_TYPES.GASEOUS.id;
        } else if (isTerrestrial) {
            if (Math.random() < (PLANET_FEATURES.HAS_ATMOSPHERE?.probability || 0)) {
                addPlanetFeature(planet, PLANET_FEATURES.HAS_ATMOSPHERE.id);
            }
            if (Math.random() < (PLANET_FEATURES.HAS_ICE_CAPS?.probability || 0)) {
                addPlanetFeature(planet, PLANET_FEATURES.HAS_ICE_CAPS.id);
            }
            const terrestrialSurfaces = [
                PLANET_SURFACE_TYPES.MAGMA.id,
                PLANET_SURFACE_TYPES.BARREN.id,
                PLANET_SURFACE_TYPES.FROZEN.id,
                PLANET_SURFACE_TYPES.OCEANIC.id,
                PLANET_SURFACE_TYPES.EARTHLIKE.id,
                PLANET_SURFACE_TYPES.DESERT.id,
                PLANET_SURFACE_TYPES.CRYSTALLINE.id
            ];
            planet.surfaceType = RandomUtils.randomElement(terrestrialSurfaces);
        }

        // Habitation
        if (Math.random() < (PLANET_FEATURES.HABITED?.probability || 0)) {
            addPlanetFeature(planet, PLANET_FEATURES.HABITED.id);
        }
    }

    /**
     * Generate planets for a system
     * @param {string} systemName - Name of the system
     * @returns {Array<Planet>} Array of Planet objects
     */
    function generatePlanets(systemName) {
        const planetCount = RandomUtils.randomInt(MIN_SYSTEM_PLANETS, MAX_SYSTEM_PLANETS);
        const planets = [];
        
        let orbitRadius = SYSTEM_PLANET_ORBIT_MIN_AU;
        for (let i = 0; i < planetCount; i++) {
            const gap = RandomUtils.randomRange(SYSTEM_PLANET_ORBIT_GAP_MIN_AU, SYSTEM_PLANET_ORBIT_GAP_MAX_AU);
            if (i > 0) {
                orbitRadius += gap;
            }
            if (orbitRadius > SYSTEM_PLANET_ORBIT_MAX_AU) {
                break;
            }
            
            const type = RandomUtils.pickWeighted(PLANET_TYPE_WEIGHTS);
            const range = PLANET_RADIUS_RANGES_AU[type] || [0.00005, 0.00012];
            const radiusAU = RandomUtils.randomRange(range[0], range[1]);
            const periodDays = 365.25 * Math.pow(orbitRadius, 1.5);
            const progress = Math.random();
            const inclinationDeg = RandomUtils.randomRange(0, 25);
            const inclinationRad = inclinationDeg * (Math.PI / 180);
            
            const planet = new Planet({
                id: `${systemName}-PLANET-${i + 1}`,
                type,
                radiusAU,
                rotationDurationHours: RandomUtils.randomRange(8, 40),
                rotationPhase: RandomUtils.randomRange(0, Math.PI * 2),
                axialTiltDeg: RandomUtils.randomRange(0, 35),
                orbit: {
                    semiMajorAU: orbitRadius,
                    periodDays,
                    percentOffset: progress,
                    progress,
                    inclinationRad
                }
            });
            assignPlanetTraits(planet);
            planets.push(planet);
        }
        
        // Ensure at least one planet
        if (planets.length === 0) {
            const type = RandomUtils.pickWeighted(PLANET_TYPE_WEIGHTS);
            const range = PLANET_RADIUS_RANGES_AU[type] || [0.00005, 0.00012];
            const radiusAU = RandomUtils.randomRange(range[0], range[1]);
            const periodDays = 365.25 * Math.pow(SYSTEM_PLANET_ORBIT_MIN_AU, 1.5);
            const progress = Math.random();
            const inclinationDeg = RandomUtils.randomRange(0, 25);
            const inclinationRad = inclinationDeg * (Math.PI / 180);
            
            const planet = new Planet({
                id: `${systemName}-PLANET-1`,
                type,
                radiusAU,
                rotationDurationHours: RandomUtils.randomRange(8, 40),
                rotationPhase: RandomUtils.randomRange(0, Math.PI * 2),
                axialTiltDeg: RandomUtils.randomRange(0, 35),
                orbit: {
                    semiMajorAU: SYSTEM_PLANET_ORBIT_MIN_AU,
                    periodDays,
                    percentOffset: progress,
                    progress,
                    inclinationRad
                }
            });
            assignPlanetTraits(planet);
            planets.push(planet);
        }
        
        // Name planets with Roman numerals based on orbital order
        const orderedPlanets = [...planets].sort((a, b) => (a.orbit?.semiMajorAU || 0) - (b.orbit?.semiMajorAU || 0));
        orderedPlanets.forEach((planet, index) => {
            const numeral = NumberUtils.toRomanNumeral(index + 1);
            planet.name = `${systemName} ${numeral}`;
        });
        
        return planets;
    }

    /**
     * Select primary planet (habitable if possible, otherwise closest)
     * @param {Array<Planet>} planets - Array of planets
     * @returns {Planet|null} Primary planet or null
     */
    function selectPrimaryPlanet(planets) {
        const orderedPlanets = [...planets].sort((a, b) => (a.orbit?.semiMajorAU || 0) - (b.orbit?.semiMajorAU || 0));
        const primaryPlanet = orderedPlanets.find(planet => planet.type === BODY_TYPES.PLANET_EARTHLIKE.id)
            || orderedPlanets[0]
            || null;
        
        if (primaryPlanet && PLANET_FEATURES?.HABITED?.id) {
            if (!primaryPlanet.features?.includes(PLANET_FEATURES.HABITED.id)) {
                addPlanetFeature(primaryPlanet, PLANET_FEATURES.HABITED.id);
            }
        }
        
        return primaryPlanet;
    }

    return {
        generatePlanets,
        selectPrimaryPlanet,
        assignPlanetTraits,
        isGasPlanetType,
        isIcePlanetType,
        isTerrestrialPlanetType,
        PLANET_TYPE_WEIGHTS,
        PLANET_RADIUS_RANGES_AU
    };
})();
