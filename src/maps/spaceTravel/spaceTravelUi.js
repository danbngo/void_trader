/**
 * Space Travel Map UI helpers
 */

const SpaceTravelUi = (() => {
    function setLocalDestinationFromPick(pick, state, config) {
        const { currentGameState } = state;
        if (!currentGameState) {
            return state.localDestination;
        }
        const system = currentGameState.getCurrentSystem();
        if (!system) {
            return state.localDestination;
        }

        if (pick.bodyRef && pick.bodyRef.type === 'STATION') {
            const stationOrbit = typeof system.stationOrbitAU === 'number'
                ? system.stationOrbitAU
                : SYSTEM_PLANET_ORBIT_MAX_AU + SYSTEM_STATION_ORBIT_BUFFER_AU;
            const stationDir = ThreeDUtils.normalizeVec(config.STATION_ENTRANCE_DIR);
            currentGameState.localDestination = {
                type: 'STATION',
                positionWorld: {
                    x: system.x * config.LY_TO_AU + stationDir.x * stationOrbit,
                    y: system.y * config.LY_TO_AU + stationDir.y * stationOrbit,
                    z: stationDir.z * stationOrbit
                },
                id: system.stationName || `${system.name} Station`,
                name: system.stationName || `${system.name} Station`,
                orbit: {
                    semiMajorAU: stationOrbit,
                    periodDays: Number.POSITIVE_INFINITY,
                    percentOffset: 0,
                    progress: 0
                }
            };
        } else if (pick.bodyRef) {
            currentGameState.localDestination = pick.bodyRef;
        }

        currentGameState.localDestinationSystemIndex = currentGameState.currentSystemIndex;
        state.localDestination = currentGameState.localDestination;
        return state.localDestination;
    }

    function getActiveTargetInfo(state, config) {
        const { localDestination, targetSystem, currentGameState } = state;
        if (localDestination && targetSystem) {
            const systemCenter = {
                x: targetSystem.x * config.LY_TO_AU,
                y: targetSystem.y * config.LY_TO_AU,
                z: 0
            };
            let rel = { x: 0, y: 0, z: 0 };
            if (localDestination.type === 'STATION' && localDestination.positionWorld) {
                return {
                    position: localDestination.positionWorld,
                    isLocal: true,
                    name: localDestination.id || localDestination.name || localDestination.type || 'Destination',
                    type: localDestination.type || 'LOCAL'
                };
            }
            if (localDestination.orbit) {
                rel = SystemOrbitUtils.getOrbitPosition(localDestination.orbit, currentGameState.date);
            }
            return {
                position: ThreeDUtils.addVec(systemCenter, rel),
                isLocal: true,
                name: localDestination.id || localDestination.name || localDestination.type || 'Destination',
                type: localDestination.type || 'LOCAL'
            };
        }

        if (targetSystem) {
            return {
                position: {
                    x: targetSystem.x * config.LY_TO_AU,
                    y: targetSystem.y * config.LY_TO_AU,
                    z: 0
                },
                isLocal: false,
                name: targetSystem.name,
                type: 'SYSTEM'
            };
        }

        return null;
    }

    return {
        setLocalDestinationFromPick,
        getActiveTargetInfo
    };
})();
