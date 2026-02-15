/**
 * Space Travel Map UI helpers
 */

const SpaceTravelUi = (() => {
    function setLocalDestinationFromPick(pick, state, config) {
        console.log('[SpaceTravelUi] setLocalDestinationFromPick called with pick:', pick);
        const { currentGameState, mapInstance } = state;
        if (!currentGameState) {
            console.log('[SpaceTravelUi] No currentGameState, returning existing localDestination');
            return state.localDestination;
        }
        const system = currentGameState.getCurrentSystem();
        if (!system) {
            console.log('[SpaceTravelUi] No current system, returning existing localDestination');
            return state.localDestination;
        }
        console.log('[SpaceTravelUi] Current system:', system.name, 'Pick bodyRef:', pick.bodyRef);

        // Cancel autonav and stop boost when setting a new destination
        if (mapInstance) {
            if (mapInstance.autoNavActive) {
                console.log('[SpaceTravelUi] Cancelling autonav due to new destination');
                mapInstance.autoNavActive = false;
                mapInstance.autoNavInput = null;
            }
            if (mapInstance.boostActive) {
                console.log('[SpaceTravelUi] Stopping boost due to new destination');
                mapInstance.boostActive = false;
            }
        }

        if (pick.kind === 'ESCORT_SHIP') {
            // Handle escort ship destination
            const escort = pick.bodyRef;
            const shipData = escort.shipData || {};
            currentGameState.localDestination = {
                type: 'ESCORT_SHIP',
                positionWorld: escort.position,
                id: `escort-${escort.shipIndex}`,
                name: shipData.name || `Allied Ship ${escort.shipIndex}`,
                escort: escort,
                orbit: null
            };
            console.log('[SpaceTravelUi] Set escort destination:', {
                escortIndex: escort.shipIndex,
                escortName: shipData.name,
                escortPos: escort.position,
                destinationPos: currentGameState.localDestination.positionWorld
            });
        } else if (pick.kind === 'NPC_SHIP') {
            const npcShip = pick.bodyRef;
            const npcName = npcShip?.name || npcShip?.shipData?.name || 'Enemy Ship';
            currentGameState.localDestination = {
                type: 'NPC_SHIP',
                kind: 'NPC_SHIP',
                positionWorld: npcShip?.position,
                id: npcShip?.id || `npc-${Date.now()}`,
                name: npcName,
                npcShip,
                orbit: null
            };
        } else if (pick.bodyRef && pick.bodyRef.type === 'STATION') {
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
            console.log('[SpaceTravelUi] Setting localDestination to bodyRef:', pick.bodyRef.name, pick.bodyRef.type);
            currentGameState.localDestination = pick.bodyRef;
        }

        currentGameState.localDestinationSystemIndex = currentGameState.currentSystemIndex;
        state.localDestination = currentGameState.localDestination;
        console.log('[SpaceTravelUi] Final localDestination:', state.localDestination);
        return state.localDestination;
    }

    function getActiveTargetInfo(state, config) {
        const { localDestination, targetSystem, currentGameState } = state;
        
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
        
        if (localDestination && targetSystem) {
            const systemCenter = {
                x: targetSystem.x * config.LY_TO_AU,
                y: targetSystem.y * config.LY_TO_AU,
                z: 0
            };
            
            // For escort ships, get current position from the escort object
            if (localDestination.type === 'ESCORT_SHIP' && localDestination.escort && localDestination.escort.position) {
                const escortPos = localDestination.escort.position;
                const liveEscortName = localDestination.escort.name
                    || localDestination.escort.shipData?.name
                    || localDestination.name;
                const liveLocalDestination = {
                    ...localDestination,
                    name: liveEscortName
                };
                // Log at 1% sample rate to avoid spam
                if (Math.random() < 0.01) {
                    console.log('[SpaceTravelUi.getActiveTargetInfo] Escort position:', {
                        escortIndex: localDestination.escort.shipIndex,
                        escortName: liveEscortName,
                        escortPos: escortPos,
                        targetDistance: Math.sqrt((escortPos.x)*(escortPos.x) + (escortPos.y)*(escortPos.y) + (escortPos.z)*(escortPos.z)).toFixed(0)
                    });
                }
                return buildTargetInfo(liveLocalDestination, escortPos, true);
            }

            // For NPC ships, use live ship position so labels/indicators track the ship
            if (localDestination.type === 'NPC_SHIP') {
                const npcPos = localDestination.npcShip?.position || localDestination.positionWorld || null;
                if (npcPos) {
                    return buildTargetInfo(localDestination, npcPos, true);
                }
            }
            
            // Always recalculate position from orbit if available (handles moving objects)
            if (localDestination.orbit) {
                const rel = SystemOrbitUtils.getOrbitPosition(localDestination.orbit, currentGameState.date);
                return buildTargetInfo(localDestination, ThreeDUtils.addVec(systemCenter, rel), true);
            }
            
            // Fallback to static position for non-orbiting objects (like stations without orbits)
            if ((localDestination.type === 'STATION' || localDestination.type === 'ESCORT_SHIP' || localDestination.type === 'NPC_SHIP') && localDestination.positionWorld) {
                return buildTargetInfo(localDestination, localDestination.positionWorld, true);
            }
            
            // Default to system center if no position info available
            return buildTargetInfo(localDestination, systemCenter, true);
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

        // Escort ships are always green
        if (body.kind === 'ESCORT_SHIP' || body.type === 'ESCORT_SHIP') {
            return COLORS.GREEN;
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
