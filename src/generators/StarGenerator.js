/**
 * Star Generation Module
 */

const StarGenerator = (() => {
    const STAR_TYPE_WEIGHTS = [
        { type: BODY_TYPES.STAR_RED_DWARF.id, weight: 0.45 },
        { type: BODY_TYPES.STAR_YELLOW_DWARF.id, weight: 0.25 },
        { type: BODY_TYPES.STAR_WHITE_DWARF.id, weight: 0.1 },
        { type: BODY_TYPES.STAR_RED_GIANT.id, weight: 0.08 },
        { type: BODY_TYPES.STAR_BLUE_GIANT.id, weight: 0.04 },
        { type: BODY_TYPES.STAR_NEUTRON.id, weight: 0.05 },
        { type: BODY_TYPES.STAR_BLACK_HOLE.id, weight: 0.03 }
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

    /**
     * Generate stars for a system
     * @param {string} systemName - Name of the system
     * @returns {Array} Array of star objects
     */
    function generateStars(systemName) {
        const starCount = RandomUtils.randomInt(MIN_SYSTEM_STARS, MAX_SYSTEM_STARS);
        return Array.from({ length: starCount }, (_, index) => {
            const type = RandomUtils.pickWeighted(STAR_TYPE_WEIGHTS);
            const range = STAR_RADIUS_RANGES_AU[type] || [0.00005, 0.0002];
            const radiusAU = RandomUtils.randomRange(range[0], range[1]);
            
            return {
                id: `${systemName}-STAR-${index + 1}`,
                name: starCount === 1 ? `${systemName}` : `${systemName} ${index + 1}`,
                type,
                radiusAU,
                orbit: null
            };
        });
    }

    return {
        generateStars,
        STAR_TYPE_WEIGHTS,
        STAR_RADIUS_RANGES_AU
    };
})();
