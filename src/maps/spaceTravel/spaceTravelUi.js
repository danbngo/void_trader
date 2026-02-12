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
            const stationOrbit = typeof system.station?.orbit?.semiMajorAU === 'number'
                ? system.station.orbit.semiMajorAU
                : SYSTEM_PLANET_ORBIT_MAX_AU + SYSTEM_STATION_ORBIT_BUFFER_AU;
            const stationDir = ThreeDUtils.normalizeVec(config.STATION_ENTRANCE_DIR);
            currentGameState.localDestination = {
                type: 'STATION',
                positionWorld: {
                    x: system.x * config.LY_TO_AU + stationDir.x * stationOrbit,
                    y: system.y * config.LY_TO_AU + stationDir.y * stationOrbit,
                    z: stationDir.z * stationOrbit
                },
                id: system.station?.id || `${system.name} Station`,
                name: system.station?.name || `${system.name} Station`,
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
        const normalizeName = (raw) => {
            if (!raw || typeof raw !== 'string') {
                return 'Destination';
            }
            return raw
                .replace(/-(STAR|PLANET)-\d+$/i, '')
                .replace(/-STATION$/i, '');
        };
        const buildTargetInfo = (body, position, isLocal) => {
            const name = normalizeName(body?.name || body?.id || body?.type || 'Destination');
            const symbol = body ? SpaceTravelShared.getLocalMapBodySymbol(body) : null;
            return {
                position,
                isLocal,
                name,
                symbol,
                type: body?.type || body?.kind || 'LOCAL'
            };
        };
        const { localDestination, targetSystem, currentGameState } = state;
        if (localDestination && targetSystem) {
            const systemCenter = {
                x: targetSystem.x * config.LY_TO_AU,
                y: targetSystem.y * config.LY_TO_AU,
                z: 0
            };
            let rel = { x: 0, y: 0, z: 0 };
            if (localDestination.type === 'STATION' && localDestination.positionWorld) {
                return buildTargetInfo(localDestination, localDestination.positionWorld, true);
            }
            if (localDestination.orbit) {
                rel = SystemOrbitUtils.getOrbitPosition(localDestination.orbit, currentGameState.date);
            }
            return buildTargetInfo(localDestination, ThreeDUtils.addVec(systemCenter, rel), true);
        }

        if (targetSystem) {
            const position = {
                x: targetSystem.x * config.LY_TO_AU,
                y: targetSystem.y * config.LY_TO_AU,
                z: 0
            };
            const systemBody = targetSystem.primaryBody || (targetSystem.stars && targetSystem.stars[0]) || null;
            const name = normalizeName(targetSystem.name || systemBody?.name || systemBody?.id || 'Destination');
            const symbol = systemBody ? SpaceTravelShared.getLocalMapBodySymbol(systemBody) : null;
            return {
                position,
                isLocal: false,
                name,
                symbol,
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
