/**
 * System Utils
 * Helper functions for system state and travel calculations
 */

const SystemUtils = (() => {
    function isHabitedSystem(system) {
        if (!system) return false;
        if (Array.isArray(system.features)) {
            if (system.features.includes(SYSTEM_FEATURES.HABITED.id)) return true;
        }
        return (system.population || 0) > 0;
    }

    function getNearestHabitedSystem(systems, fromSystem) {
        if (!fromSystem || !Array.isArray(systems)) return null;
        let nearest = null;
        let nearestDistance = Infinity;
        systems.forEach(system => {
            if (!isHabitedSystem(system)) return;
            const dist = fromSystem.distanceTo(system);
            if (dist < nearestDistance) {
                nearest = system;
                nearestDistance = dist;
            }
        });
        return nearest ? { system: nearest, distance: nearestDistance } : null;
    }

    function getOneWayFuelCost(gameState, fromSystem, toSystem, navigationLevel = 0) {
        const distance = fromSystem.distanceTo(toSystem);
        return Ship.calculateFleetFuelCost(distance, gameState.ships.length, navigationLevel);
    }

    function getRequiredFuelCost(gameState, fromSystem, toSystem, navigationLevel = 0) {
        const oneWay = getOneWayFuelCost(gameState, fromSystem, toSystem, navigationLevel);
        if (isHabitedSystem(toSystem)) {
            return oneWay;
        }

        if (isHabitedSystem(fromSystem)) {
            return oneWay * 2;
        }

        const nearestHabited = getNearestHabitedSystem(gameState.systems, toSystem);
        if (!nearestHabited) {
            return oneWay * 2;
        }

        const returnCost = Ship.calculateFleetFuelCost(nearestHabited.distance, gameState.ships.length, navigationLevel);
        return oneWay + returnCost;
    }

    return {
        isHabitedSystem,
        getNearestHabitedSystem,
        getOneWayFuelCost,
        getRequiredFuelCost
    };
})();
