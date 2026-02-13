/**
 * System Orbit Utils
 * Computes orbital positions for stars and planets
 */

const SystemOrbitUtils = (() => {
    const DAY_MS = 1000 * 60 * 60 * 24;
    const EPOCH_DATE = new Date(3000, 0, 1);

    function getDaysSinceEpoch(date) {
        const d = date instanceof Date ? date : new Date(date);
        return (d - EPOCH_DATE) / DAY_MS;
    }

    function getOrbitProgress(orbit, date) {
        if (!orbit || !orbit.periodDays) {
            return 0;
        }
        const days = getDaysSinceEpoch(date);
        const base = (days / orbit.periodDays) + (orbit.percentOffset || 0);
        return ((base % 1) + 1) % 1;
    }

    function getOrbitPosition(orbit, date) {
        if (!orbit) {
            return { x: 0, y: 0, z: 0, progress: 0 };
        }
        const progress = getOrbitProgress(orbit, date);
        const angle = progress * Math.PI * 2;
        const radius = orbit.semiMajorAU || 0;
        
        // Apply orbital inclination for realistic 3D distribution
        // Inclination is stored per orbit for variety (0-25 degrees typical for solar system)
        const inclination = orbit.inclinationRad || 0;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * Math.cos(inclination);
        const z = Math.sin(angle) * radius * Math.sin(inclination);
        
        return {
            x,
            y,
            z,
            progress
        };
    }

    function getBodyPosition(system, body, date) {
        if (!system || !body) {
            return { x: 0, y: 0, z: 0, progress: 0 };
        }
        if (!body.orbit) {
            return { x: 0, y: 0, z: 0, progress: 0 };
        }
        return getOrbitPosition(body.orbit, date);
    }

    return {
        getDaysSinceEpoch,
        getOrbitProgress,
        getOrbitPosition,
        getBodyPosition
    };
})();
