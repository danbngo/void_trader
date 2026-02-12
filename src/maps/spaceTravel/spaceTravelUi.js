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
            const color = getBodyColor(body, position, state, config);
            return {
                position,
                isLocal,
                name,
                symbol,
                type: body?.type || body?.kind || 'LOCAL',
                color
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

    function getBodyColor(body, position, state, config) {
        if (!body || !position || !state?.playerShip?.position || !config) {
            return null;
        }

        const dist = ThreeDUtils.vecLength(ThreeDUtils.subVec(position, state.playerShip.position));
        const shadeMax = config.SYSTEM_BODY_SHADE_MAX_DISTANCE_AU || 1;
        const shadeT = Math.max(0.2, 1 - (dist / shadeMax));

        const bodyColors = {
            STAR: '#ffeeaa',
            GAS: '#d6b27a',
            ICE: '#d7f7ff',
            TERRESTRIAL: '#c4a484'
        };
        const gasBasePalette = ['#d6b27a', '#c9a06a', '#d1bb8a', '#c08a5a', '#b57a4a'];

        let baseColor = bodyColors.TERRESTRIAL;
        if (body.kind === 'STAR') {
            baseColor = bodyColors.STAR;
        } else if (SpaceTravelShared.isGasPlanet(body.type)) {
            const gasSeed = SpaceTravelShared.hashString(body.id || body.type || 'GAS');
            baseColor = gasBasePalette[Math.abs(gasSeed) % gasBasePalette.length];
        } else if (body.type === BODY_TYPES.PLANET_ICE_GIANT.id || body.type === BODY_TYPES.PLANET_ICE_DWARF.id) {
            baseColor = bodyColors.ICE;
        }

        if (body.kind === 'STAR') {
            const starShadeT = Math.max(0.6, shadeT);
            return SpaceTravelShared.lerpColorHex('#000000', baseColor, starShadeT);
        }
        return SpaceTravelShared.lerpColorHex('#000000', baseColor, shadeT);
    }

    return {
        setLocalDestinationFromPick,
        getActiveTargetInfo
    };
})();
