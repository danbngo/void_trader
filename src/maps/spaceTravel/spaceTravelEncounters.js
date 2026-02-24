/**
 * Space Travel NPC Encounters
 * Spawns and updates in-world NPC fleets (merchant/pirate/police)
 */

const SpaceTravelEncounters = (() => {
    function ensureState(mapInstance) {
        if (!mapInstance) {
            return;
        }
        if (!Array.isArray(mapInstance.npcEncounterFleets)) {
            mapInstance.npcEncounterFleets = [];
        }
        if (typeof mapInstance.npcEncounterSpawnUnlocked !== 'boolean') {
            mapInstance.npcEncounterSpawnUnlocked = true;
        }
        if (!mapInstance.npcEncounterHailPrompt) {
            mapInstance.npcEncounterHailPrompt = null;
        }
        if (typeof mapInstance.npcEncounterHailAvailable !== 'boolean') {
            mapInstance.npcEncounterHailAvailable = false;
        }
        if (!Array.isArray(mapInstance.npcCombatLaserBursts)) {
            mapInstance.npcCombatLaserBursts = [];
        }
        if (mapInstance.currentGameState && !mapInstance.currentGameState.spaceTravelEncounterIgnoreByFleetId) {
            mapInstance.currentGameState.spaceTravelEncounterIgnoreByFleetId = {};
        }
    }

    function clearEncounterState(mapInstance, reason = 'manual') {
        if (!mapInstance) {
            return;
        }

        const hadFleet = Array.isArray(mapInstance.npcEncounterFleets) && mapInstance.npcEncounterFleets.length > 0;
        const clearedFleetIds = hadFleet
            ? mapInstance.npcEncounterFleets.map(fleet => fleet?.id).filter(Boolean)
            : [];
        const hadHailPrompt = !!mapInstance.npcEncounterHailPrompt;
        mapInstance.npcEncounterFleets = [];
        mapInstance.npcEncounterSpawnUnlocked = true;
        mapInstance.npcEncounterHailPrompt = null;
        mapInstance.npcEncounterHailAvailable = false;
        mapInstance.npcCombatLaserBursts = [];

        if (hadHailPrompt && mapInstance.isPaused && typeof mapInstance.setPaused === 'function') {
            mapInstance.setPaused(false, false);
        }

        if (hadFleet) {
            const ignoreByFleetId = mapInstance.currentGameState?.spaceTravelEncounterIgnoreByFleetId;
            if (ignoreByFleetId && typeof ignoreByFleetId === 'object') {
                clearedFleetIds.forEach(fleetId => {
                    delete ignoreByFleetId[fleetId];
                });
            }
            console.log('[SpaceTravelEncounter] Encounter state cleared:', { reason });
        }
    }

    function getSystemCenter(system, config) {
        return {
            x: (system?.x || 0) * config.LY_TO_AU,
            y: (system?.y || 0) * config.LY_TO_AU,
            z: 0
        };
    }

    function getPlanetWorldPosition(system, planet, gameDate, config) {
        const systemCenter = getSystemCenter(system, config);
        const orbitOffset = planet?.orbit
            ? SystemOrbitUtils.getOrbitPosition(planet.orbit, gameDate)
            : { x: 0, y: 0, z: 0 };
        return ThreeDUtils.addVec(systemCenter, orbitOffset);
    }

    function ensurePlanetEncounterWeights(system) {
        if (!system || !Array.isArray(system.planets)) {
            return;
        }

        system.planets.forEach((planet, planetIndex) => {
            if (!planet.encounterWeights) {
                planet.encounterWeights = {
                    merchant: Number.isFinite(system.merchantWeight) ? system.merchantWeight : 1,
                    pirate: Number.isFinite(system.pirateWeight) ? system.pirateWeight : 1,
                    police: Number.isFinite(system.policeWeight) ? system.policeWeight : 1
                };
                console.log('[SpaceTravelEncounter] Assigned planet encounter weights:', {
                    planet: planet.name || `Planet ${planetIndex + 1}`,
                    weights: planet.encounterWeights
                });
            }
        });
    }

    function getFleetTypeConfig(typeId) {
        switch (typeId) {
            case 'MERCHANT':
                return {
                    encounterType: ENCOUNTER_TYPES.MERCHANT,
                    shipColor: COLORS.YELLOW,
                    pursuesPlayer: false,
                    canInitiateHail: true
                };
            case 'PIRATE':
                return {
                    encounterType: ENCOUNTER_TYPES.PIRATE,
                    shipColor: COLORS.RED,
                    pursuesPlayer: true,
                    canInitiateHail: true
                };
            case 'POLICE':
                return {
                    encounterType: ENCOUNTER_TYPES.POLICE,
                    shipColor: COLORS.BLUE,
                    pursuesPlayer: true,
                    canInitiateHail: true
                };
            default:
                return null;
        }
    }

    function getSpawnRates(mapInstance) {
        const rates = [];
        const { targetSystem, playerShip, currentGameState, config } = mapInstance;
        if (!targetSystem || !playerShip || !currentGameState) {
            return rates;
        }

        ensurePlanetEncounterWeights(targetSystem);

        const minDistance = Math.max(0.05, config.NPC_ENCOUNTER_MIN_DISTANCE_FOR_RATE_AU || 0.1);
        const perWeightDivisor = Math.max(1, config.NPC_ENCOUNTER_WEIGHT_DIVISOR || 60);

        targetSystem.planets.forEach((planet, planetIndex) => {
            const planetPos = getPlanetWorldPosition(targetSystem, planet, currentGameState.date, config);
            const distanceAU = Math.max(minDistance, ThreeDUtils.distance(playerShip.position, planetPos));

            const entries = [
                { typeId: 'MERCHANT', weight: Number(planet.encounterWeights?.merchant || 0) },
                { typeId: 'PIRATE', weight: Number(planet.encounterWeights?.pirate || 0) },
                { typeId: 'POLICE', weight: Number(planet.encounterWeights?.police || 0) }
            ];

            entries.forEach(entry => {
                if (!Number.isFinite(entry.weight) || entry.weight <= 0) {
                    return;
                }
                const ratePerSecond = entry.weight / (distanceAU * perWeightDivisor);
                if (!Number.isFinite(ratePerSecond) || ratePerSecond <= 0) {
                    return;
                }
                rates.push({
                    typeId: entry.typeId,
                    planet,
                    planetIndex,
                    planetPos,
                    distanceAU,
                    ratePerSecond
                });
            });
        });

        return rates;
    }

    function chooseWeightedRate(rates) {
        const total = rates.reduce((sum, rate) => sum + rate.ratePerSecond, 0);
        if (total <= 0) {
            return null;
        }
        const roll = Math.random() * total;
        let cumulative = 0;
        for (let i = 0; i < rates.length; i++) {
            cumulative += rates[i].ratePerSecond;
            if (roll <= cumulative) {
                return rates[i];
            }
        }
        return rates[rates.length - 1] || null;
    }

    function randomShipCount(config) {
        const minShips = Math.max(1, Math.floor(config.NPC_FLEET_MIN_SHIPS || 1));
        const maxShips = Math.max(minShips, Math.floor(config.NPC_FLEET_MAX_SHIPS || 3));
        return minShips + Math.floor(Math.random() * (maxShips - minShips + 1));
    }

    function createNpcShipFromData(shipData, fleetId, fleetTypeId, fleetColor, playerShip, config, index) {
        const geometry = ShipGeometry.getShip('FIGHTER');
        const spawnRadius = (config.NPC_FLEET_SPAWN_RADIUS_AU || 1.2) + (Math.random() * (config.NPC_FLEET_SPAWN_SPREAD_AU || 0.6));
        const angle = Math.random() * Math.PI * 2;
        const zJitter = (Math.random() - 0.5) * (config.NPC_FLEET_SPAWN_Z_SPREAD_AU || 0.4);

        const offset = {
            x: Math.cos(angle) * spawnRadius,
            y: Math.sin(angle) * spawnRadius,
            z: zJitter
        };

        return {
            id: shipData.id || `${fleetTypeId.toLowerCase()}-${fleetId}-${index}`,
            shipData,
            name: shipData.name || `${fleetTypeId} Ship ${index + 1}`,
            position: ThreeDUtils.addVec(playerShip.position, offset),
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            geometry,
            hull: typeof shipData.hull === 'number' ? shipData.hull : (shipData.maxHull || 100),
            maxHull: typeof shipData.maxHull === 'number' ? shipData.maxHull : (shipData.hull || 100),
            shields: typeof shipData.shields === 'number' ? shipData.shields : (shipData.maxShields || 0),
            maxShields: typeof shipData.maxShields === 'number' ? shipData.maxShields : (shipData.shields || 0),
            cargo: shipData.cargo || {},
            isNpcEncounterShip: true,
            npcFleetId: fleetId,
            shipColor: fleetColor
        };
    }

    function setFleetRandomPlanetDestination(mapInstance, fleet) {
        const planets = Array.isArray(mapInstance?.targetSystem?.planets) ? mapInstance.targetSystem.planets : [];
        if (planets.length === 0) {
            return;
        }

        const idx = Math.floor(Math.random() * planets.length);
        const planet = planets[idx];
        const targetPos = getPlanetWorldPosition(mapInstance.targetSystem, planet, mapInstance.currentGameState?.date || new Date(), mapInstance.config);
        fleet.destinationPlanetName = planet.name || `Planet ${idx + 1}`;
        fleet.destinationPoint = targetPos;

        console.log('[SpaceTravelEncounter] Fleet destination set:', {
            fleetId: fleet.id,
            type: fleet.typeId,
            destinationPlanet: fleet.destinationPlanetName,
            destinationPoint: {
                x: Number(targetPos.x.toFixed(3)),
                y: Number(targetPos.y.toFixed(3)),
                z: Number(targetPos.z.toFixed(3))
            }
        });
    }

    function spawnFleetFromRate(mapInstance, chosenRate, timestampMs) {
        const typeConfig = getFleetTypeConfig(chosenRate.typeId);
        if (!typeConfig || !typeConfig.encounterType) {
            return;
        }

        const fleetId = `npc-fleet-${Math.floor(timestampMs)}-${Math.floor(Math.random() * 10000)}`;
        const shipCount = randomShipCount(mapInstance.config);

        const ships = [];
        for (let i = 0; i < shipCount; i++) {
            const randomShipType = typeConfig.encounterType.shipTypes[Math.floor(Math.random() * typeConfig.encounterType.shipTypes.length)];
            const shipTypeId = typeof randomShipType === 'string' ? randomShipType : randomShipType?.id;
            const shipData = ShipGenerator.generateShipOfType(shipTypeId || 'FIGHTER');
            shipData.faction = typeConfig.encounterType.id;
            shipData.isNeutralToPlayer = true;
            ships.push(createNpcShipFromData(shipData, fleetId, chosenRate.typeId, typeConfig.shipColor, mapInstance.playerShip, mapInstance.config, i));
        }

        const ignorePlayer = Math.random() < 0.5;

        const fleet = {
            id: fleetId,
            typeId: chosenRate.typeId,
            ships,
            encounterType: typeConfig.encounterType,
            shipColor: typeConfig.shipColor,
            ignorePlayer,
            state: ignorePlayer ? 'ignoring' : 'pursuing',
            isHostile: false,
            hasHailedPlayer: false,
            lastFireMs: 0,
            sourcePlanetName: chosenRate.planet?.name || `Planet ${chosenRate.planetIndex + 1}`,
            destinationPoint: null,
            destinationPlanetName: null,
            completedBusiness: false
        };

        if (mapInstance.currentGameState?.spaceTravelEncounterIgnoreByFleetId) {
            mapInstance.currentGameState.spaceTravelEncounterIgnoreByFleetId[fleetId] = ignorePlayer;
        }

        setFleetRandomPlanetDestination(mapInstance, fleet);

        mapInstance.npcEncounterFleets = [fleet];
        mapInstance.npcEncounterSpawnUnlocked = false;

        console.log('[SpaceTravelEncounter] Spawned fleet:', {
            fleetId,
            type: chosenRate.typeId,
            shipCount,
            sourcePlanet: fleet.sourcePlanetName,
            distanceToSourceAU: Number(chosenRate.distanceAU.toFixed(3)),
            state: fleet.state,
            ignorePlayer: fleet.ignorePlayer
        });
    }

    function normalizeFleetBehaviorFlags(fleet, mapInstance = null) {
        if (!fleet) {
            return;
        }

        const rememberedIgnore = mapInstance?.currentGameState?.spaceTravelEncounterIgnoreByFleetId?.[fleet.id];

        if (typeof fleet.ignorePlayer !== 'boolean') {
            if (typeof rememberedIgnore === 'boolean') {
                fleet.ignorePlayer = rememberedIgnore;
            } else {
                fleet.ignorePlayer = fleet.state === 'ignoring';
            }
        }

        if (mapInstance?.currentGameState?.spaceTravelEncounterIgnoreByFleetId && fleet.id) {
            mapInstance.currentGameState.spaceTravelEncounterIgnoreByFleetId[fleet.id] = fleet.ignorePlayer;
        }

        if (!fleet.isHostile && !fleet.hasHailedPlayer && fleet.state !== 'disabled') {
            fleet.state = fleet.ignorePlayer ? 'ignoring' : 'pursuing';
        }
    }

    function setFleetHostile(fleet, reason = 'unknown') {
        if (!fleet || fleet.isHostile) {
            return;
        }
        fleet.isHostile = true;
        fleet.state = 'hostile';
        fleet.hasHailedPlayer = true;
        fleet.ships.forEach(ship => {
            if (ship.shipData) {
                ship.shipData.isNeutralToPlayer = false;
            }
        });

        console.log('[SpaceTravelEncounter] Fleet turned hostile:', {
            fleetId: fleet.id,
            type: fleet.typeId,
            reason
        });
    }

    function steerShipToward(ship, targetPoint, dt, config, speedMult = 1) {
        if (!ship || !targetPoint || dt <= 0) {
            return;
        }

        const toTarget = ThreeDUtils.subVec(targetPoint, ship.position);
        const distance = ThreeDUtils.vecLength(toTarget);
        if (distance <= 0.000001) {
            ship.velocity = ThreeDUtils.scaleVec(ship.velocity, 0.9);
            return;
        }

        const dir = ThreeDUtils.normalizeVec(toTarget);
        const engine = ship.shipData?.engine || 10;
        const maxSpeed = engine * (config.SHIP_SPEED_PER_ENGINE || (1 / 600)) * speedMult;
        const accel = engine * (config.SHIP_ACCEL_PER_ENGINE || (1 / 60)) * 1.2;

        ship.velocity = ThreeDUtils.addVec(ship.velocity, ThreeDUtils.scaleVec(dir, accel * dt));

        const speed = ThreeDUtils.vecLength(ship.velocity);
        if (speed > maxSpeed) {
            ship.velocity = ThreeDUtils.scaleVec(ship.velocity, maxSpeed / speed);
        }

        ship.position = ThreeDUtils.addVec(ship.position, ThreeDUtils.scaleVec(ship.velocity, dt));

        if (ThreeDUtils.vecLength(ship.velocity) > 0.00001) {
            ship.rotation = directionToQuaternion(ThreeDUtils.normalizeVec(ship.velocity));
        }
    }

    function directionToQuaternion(direction) {
        const normalized = ThreeDUtils.normalizeVec(direction);
        if (ThreeDUtils.vecLength(normalized) <= 0.00001) {
            return { x: 0, y: 0, z: 0, w: 1 };
        }

        // Keep wings level with the system plane (XY), i.e. constrain roll around forward axis.
        // quatFromForwardUp assumes +Z forward, but ship flight logic uses -Z as forward,
        // so pass the negated direction to align local -Z toward movement.
        const worldUp = { x: 0, y: 0, z: 1 };
        const quatForward = ThreeDUtils.scaleVec(normalized, -1);
        return ThreeDUtils.quatNormalize(ThreeDUtils.quatFromForwardUp(quatForward, worldUp));
    }

    function getShipForwardDirection(ship) {
        if (!ship) {
            return { x: 0, y: 0, z: -1 };
        }

        if (ship.rotation) {
            return ThreeDUtils.normalizeVec(ThreeDUtils.rotateVecByQuat({ x: 0, y: 0, z: -1 }, ship.rotation));
        }

        if (ship.velocity && ThreeDUtils.vecLength(ship.velocity) > 0.00001) {
            return ThreeDUtils.normalizeVec(ship.velocity);
        }

        return { x: 0, y: 0, z: -1 };
    }

    function canFireWithinFov(shooter, targetPos, config) {
        if (!shooter || !targetPos || !shooter.position) {
            return false;
        }

        const toTarget = ThreeDUtils.subVec(targetPos, shooter.position);
        const toTargetLen = ThreeDUtils.vecLength(toTarget);
        if (toTargetLen <= 0.000001) {
            return true;
        }

        const toTargetDir = ThreeDUtils.scaleVec(toTarget, 1 / toTargetLen);
        const shooterForward = getShipForwardDirection(shooter);
        const fovDeg = Math.max(1, config.NPC_COMBAT_FIRE_FOV_DEG || 60);
        const minDot = Math.cos((fovDeg * Math.PI / 180) * 0.5);
        const dot = ThreeDUtils.dotVec(shooterForward, toTargetDir);
        return dot >= minDot;
    }

    function addCombatLaserBurst(mapInstance, fromPos, toPos, color, timestampMs) {
        if (!mapInstance || !fromPos || !toPos) {
            return;
        }
        if (!Array.isArray(mapInstance.npcCombatLaserBursts)) {
            mapInstance.npcCombatLaserBursts = [];
        }

        mapInstance.npcCombatLaserBursts.push({
            from: { ...fromPos },
            to: { ...toPos },
            color: color || COLORS.RED,
            createdMs: timestampMs,
            ttlMs: Math.max(60, mapInstance.config.NPC_COMBAT_LASER_VISIBLE_MS || 180)
        });

        if (mapInstance.npcCombatLaserBursts.length > 80) {
            mapInstance.npcCombatLaserBursts.splice(0, mapInstance.npcCombatLaserBursts.length - 80);
        }
    }

    function applyDamageToShip(target, damage, mapInstance, timestampMs) {
        if (!target || typeof damage !== 'number' || damage <= 0) {
            return;
        }

        let remaining = damage;
        if (typeof target.shields === 'number' && target.shields > 0) {
            const absorbed = Math.min(target.shields, remaining);
            target.shields = Math.max(0, target.shields - absorbed);
            remaining -= absorbed;
        }
        if (remaining > 0 && typeof target.hull === 'number') {
            target.hull = Math.max(0, target.hull - remaining);
        }

        if (typeof target.hull === 'number' && target.hull <= 0) {
            target.name = 'Abandoned Ship';
            if (target.shipData) {
                target.shipData.name = 'Abandoned Ship';
            }
        }

        target.flashStartMs = timestampMs;
        const shieldOnlyHit = (typeof target.shields === 'number' && target.shields > 0 && remaining <= 0);
        target.flashColor = shieldOnlyHit
            ? (mapInstance.config.SHIP_FLASH_SHIELD_COLOR || '#ffffff')
            : ((typeof target.hull === 'number' && target.hull <= 0)
                ? (mapInstance.config.SHIP_FLASH_ABANDONED_COLOR || '#8b0000')
                : (mapInstance.config.SHIP_FLASH_HULL_COLOR || '#ff0000'));
    }

    function getFleetDistanceToPlayer(fleet, playerShip) {
        if (!fleet || !playerShip || !Array.isArray(fleet.ships) || fleet.ships.length === 0) {
            return Infinity;
        }
        let best = Infinity;
        fleet.ships.forEach(ship => {
            if (!ship || typeof ship.hull === 'number' && ship.hull <= 0) {
                return;
            }
            const dist = ThreeDUtils.distance(ship.position, playerShip.position);
            if (dist < best) {
                best = dist;
            }
        });
        return best;
    }

    function getFleetDistanceToPlayerAnyShip(fleet, playerShip) {
        if (!fleet || !playerShip || !Array.isArray(fleet.ships) || fleet.ships.length === 0) {
            return Infinity;
        }

        let best = Infinity;
        fleet.ships.forEach(ship => {
            if (!ship || !ship.position) {
                return;
            }
            const dist = ThreeDUtils.distance(ship.position, playerShip.position);
            if (dist < best) {
                best = dist;
            }
        });
        return best;
    }

    function buildEncounterPromptTitle(fleet) {
        const rawName = (fleet?.encounterType?.name || fleet?.typeId || 'Unknown').toString().trim();
        if (!rawName) {
            return 'Incoming hail';
        }
        const factionName = /s$/i.test(rawName) ? rawName : `${rawName}s`;
        return `${factionName} are hailing you`;
    }

    function buildEncounterAlertText(fleet) {
        const rawName = (fleet?.encounterType?.name || fleet?.typeId || 'Unknown').toString().trim();
        const singularName = rawName.replace(/s$/i, '') || 'Unknown';
        return `${singularName} fleet is hailing you [H to accept]`;
    }

    function shouldEscalateIgnoredHailToHostile(fleet) {
        const typeId = (fleet?.typeId || '').toString().toUpperCase();
        return typeId === 'PIRATE' || typeId === 'POLICE';
    }

    function triggerHail(mapInstance, fleet, timestampMs, source = 'npc') {
        if (!mapInstance || !fleet || mapInstance.npcEncounterHailPrompt) {
            return;
        }

        fleet.hasHailedPlayer = true;
        mapInstance.npcEncounterHailPrompt = {
            fleetId: fleet.id,
            text: buildEncounterPromptTitle(fleet),
            alertText: buildEncounterAlertText(fleet),
            subtext: '',
            source,
            createdMs: timestampMs
        };

        console.log('[SpaceTravelEncounter] Hail triggered:', {
            fleetId: fleet.id,
            type: fleet.typeId,
            source
        });
    }

    function updatePendingHailPrompt(mapInstance, timestampMs) {
        const prompt = mapInstance?.npcEncounterHailPrompt;
        if (!prompt) {
            return;
        }

        const fleet = (mapInstance.npcEncounterFleets || []).find(candidate => candidate.id === prompt.fleetId);
        if (!fleet) {
            mapInstance.npcEncounterHailPrompt = null;
            return;
        }

        const responseTimeoutMs = Math.max(0, mapInstance.config.NPC_HAIL_RESPONSE_TIMEOUT_MS || 5000);
        if (!Number.isFinite(prompt.createdMs) || (timestampMs - prompt.createdMs) < responseTimeoutMs) {
            return;
        }

        if (prompt.source === 'npc' && !fleet.isHostile && shouldEscalateIgnoredHailToHostile(fleet)) {
            setFleetHostile(fleet, 'ignored_hail_timeout');
            mapInstance.lastErrorMessage = `${fleet.encounterType?.name || fleet.typeId || 'Fleet'} turned hostile (no hail response)`;
            mapInstance.lastErrorTimestampMs = performance.now();
            UI.startFlashing?.(COLORS.TEXT_ERROR, COLORS.BLACK, 900);
        }

        mapInstance.npcEncounterHailPrompt = null;
    }

    function canOpenPendingHail(mapInstance) {
        const prompt = mapInstance?.npcEncounterHailPrompt;
        if (!prompt) {
            return false;
        }

        const fleetId = prompt.fleetId;
        if (!fleetId) {
            return false;
        }

        return !!(mapInstance.npcEncounterFleets || []).find(candidate => candidate.id === fleetId);
    }

    function openPendingHail(mapInstance) {
        if (!mapInstance || !canOpenPendingHail(mapInstance)) {
            return false;
        }

        const prompt = mapInstance.npcEncounterHailPrompt;
        const targetFleet = (mapInstance.npcEncounterFleets || []).find(candidate => candidate.id === prompt.fleetId);
        mapInstance.npcEncounterHailPrompt = null;
        if (!targetFleet) {
            return false;
        }

        beginEncounterMenu(mapInstance, targetFleet);
        return true;
    }

    function beginEncounterMenu(mapInstance, fleet) {
        if (!mapInstance || !fleet || !fleet.encounterType || !mapInstance.currentGameState) {
            return;
        }

        if (!fleet.hasHailedPlayer) {
            console.log('[SpaceTravelEncounter] Ignoring beginEncounterMenu without prior hail:', {
                fleetId: fleet.id,
                type: fleet.typeId
            });
            return;
        }

        const gameState = mapInstance.currentGameState;
        const runtimeState = mapInstance.getRuntimeStateSnapshot?.() || null;
        const portalState = SpaceTravelPortal.getState(mapInstance);

        const onReturn = () => {
            const returningFleet = (mapInstance.npcEncounterFleets || []).find(candidate => candidate.id === fleet.id);

            if (returningFleet) {
                returningFleet.state = returningFleet.isHostile ? 'hostile' : 'business_done';
                returningFleet.completedBusiness = true;
                if (!returningFleet.isHostile) {
                    setFleetRandomPlanetDestination(mapInstance, returningFleet);
                }
            }

            const latestState = mapInstance.getRuntimeStateSnapshot?.() || {};
            const finalRuntimeState = {
                ...(runtimeState || {}),
                npcEncounterFleets: latestState.npcEncounterFleets || (runtimeState?.npcEncounterFleets || []),
                npcEncounterSpawnUnlocked: latestState.npcEncounterSpawnUnlocked,
                npcEncounterHailPrompt: latestState.npcEncounterHailPrompt || null,
                npcEncounterHailAvailable: !!latestState.npcEncounterHailAvailable
            };

            const destination = mapInstance.targetSystem || SpaceTravelLogic.getNearestSystem(gameState);
            mapInstance.show(gameState, destination, {
                resetPosition: false,
                localDestination: mapInstance.localDestination,
                portalState,
                runtimeState: finalRuntimeState
            });
        };

        mapInstance.stop(true);

        console.log('[SpaceTravelEncounter] Opening encounter menu:', {
            fleetId: fleet.id,
            type: fleet.typeId,
            ships: fleet.ships.length
        });

        if (typeof HailingMenu !== 'undefined' && HailingMenu.show) {
            HailingMenu.show(gameState, fleet, onReturn);
        } else {
            console.log('[SpaceTravelEncounter] HailingMenu missing; returning to flight immediately');
            onReturn();
        }
    }

    function beginAllyHailMenu(mapInstance, escort) {
        if (!mapInstance || !escort || !mapInstance.currentGameState) {
            return false;
        }

        const gameState = mapInstance.currentGameState;
        const runtimeState = mapInstance.getRuntimeStateSnapshot?.() || null;
        const portalState = SpaceTravelPortal.getState(mapInstance);

        const onReturn = () => {
            const destination = mapInstance.targetSystem || SpaceTravelLogic.getNearestSystem(gameState);
            mapInstance.show(gameState, destination, {
                resetPosition: false,
                localDestination: mapInstance.localDestination,
                portalState,
                runtimeState
            });
        };

        mapInstance.stop(true);

        if (typeof HailingMenu !== 'undefined' && HailingMenu.show) {
            HailingMenu.show(gameState, {
                encounterType: { name: escort.name || escort.shipData?.name || 'Allied Ship' },
                ships: [escort]
            }, onReturn);
            return true;
        }

        onReturn();
        return true;
    }

    function beginIgnoredHailMenu(mapInstance, selectedShip) {
        if (!mapInstance || !mapInstance.currentGameState) {
            return false;
        }

        const gameState = mapInstance.currentGameState;
        const runtimeState = mapInstance.getRuntimeStateSnapshot?.() || null;
        const portalState = SpaceTravelPortal.getState(mapInstance);
        const shipName = (selectedShip?.name || selectedShip?.shipData?.name || 'The ship').toString();

        const onReturn = () => {
            const destination = mapInstance.targetSystem || SpaceTravelLogic.getNearestSystem(gameState);
            mapInstance.show(gameState, destination, {
                resetPosition: false,
                localDestination: mapInstance.localDestination,
                portalState,
                runtimeState
            });
        };

        mapInstance.stop(true);

        if (typeof HailingMenu !== 'undefined' && HailingMenu.show) {
            HailingMenu.show(gameState, {
                encounterType: { name: shipName },
                ships: [selectedShip || {}]
            }, onReturn, {
                line1: `${shipName} receives your hail.`,
                line2: `"${shipName} ignores you."`,
                line3: null,
                footer: 'No response is transmitted.',
                closeLabel: 'Continue',
                closeHelp: 'Return to 3D travel'
            });
            return true;
        }

        onReturn();
        return true;
    }

    function canPlayerHailSelectedTarget(mapInstance) {
        if (!mapInstance || mapInstance.npcEncounterHailPrompt) {
            return false;
        }

        const selectedDestination = mapInstance.currentGameState?.localDestination || mapInstance.localDestination || null;
        if (!selectedDestination) {
            return false;
        }

        if (selectedDestination.type === 'ESCORT_SHIP') {
            const escort = selectedDestination.escort || null;
            return !!escort && (escort.hull || 0) > 0;
        }

        if (selectedDestination.type !== 'NPC_SHIP' && selectedDestination.kind !== 'NPC_SHIP') {
            return false;
        }

        const fleet = (mapInstance.npcEncounterFleets || [])[0] || null;
        if (!fleet || fleet.isHostile) {
            return false;
        }

        const selectedShip = selectedDestination.npcShip || null;
        if (!selectedShip || !selectedShip.id) {
            return false;
        }

        const targetShip = (fleet.ships || []).find(ship => ship && ship.id === selectedShip.id);
        return !!targetShip && (targetShip.hull || 0) > 0;
    }

    function applyNpcCombatShots(mapInstance, fleet, timestampMs) {
        const fireInterval = Math.max(200, mapInstance.config.NPC_FLEET_FIRE_INTERVAL_MS || 1000);
        if ((timestampMs - (fleet.lastFireMs || 0)) < fireInterval) {
            return;
        }

        const playerShip = mapInstance.playerShip;
        const weaponRange = Math.max(0.1, mapInstance.config.NPC_FLEET_WEAPON_RANGE_AU || 2);
        const shooters = fleet.ships.filter(ship => {
            if (!ship || (ship.hull || 0) <= 0) {
                return false;
            }
            if (ThreeDUtils.distance(ship.position, playerShip.position) > weaponRange) {
                return false;
            }
            return canFireWithinFov(ship, playerShip.position, mapInstance.config);
        });

        if (shooters.length === 0) {
            return;
        }

        fleet.lastFireMs = timestampMs;

        const jitterRadiusAu = Math.max(0, Number(mapInstance.config.NPC_COMBAT_AIM_JITTER_AU) || 0);
        const getNpcShotTargetPoint = () => {
            if (jitterRadiusAu <= 0) {
                return playerShip.position;
            }

            const axes = ThreeDUtils.getLocalAxes(playerShip.rotation);
            const angle = Math.random() * Math.PI * 2;
            const radius = jitterRadiusAu * Math.sqrt(Math.random());
            const offsetRight = Math.cos(angle) * radius;
            const offsetUp = Math.sin(angle) * radius;

            return {
                x: playerShip.position.x + (axes.right.x * offsetRight) + (axes.up.x * offsetUp),
                y: playerShip.position.y + (axes.right.y * offsetRight) + (axes.up.y * offsetUp),
                z: playerShip.position.z + (axes.right.z * offsetRight) + (axes.up.z * offsetUp)
            };
        };

        let shotsFired = 0;
        shooters.forEach(ship => {
            const perShotMin = Math.max(1, mapInstance.config.NPC_SHOT_MIN_DAMAGE || 2);
            const perShotMax = Math.max(perShotMin, mapInstance.config.NPC_SHOT_MAX_DAMAGE || 6);
            const targetPoint = getNpcShotTargetPoint();
            const fired = mapInstance.laser?.fireWorldLaser?.({
                mapInstance,
                shooter: ship,
                targetPoint,
                damageMin: perShotMin,
                damageMax: perShotMax,
                color: mapInstance.config.LASER_COLOR || '#ff4d4d',
                timestampMs
            });
            if (fired) {
                shotsFired += 1;
            }
        });

        console.log('[SpaceTravelEncounter] NPC volley fired:', {
            fleetId: fleet.id,
            shooters: shooters.length,
            shotsFired
        });
    }

    function applyAllyCombatShots(mapInstance, fleet, timestampMs) {
        const fireInterval = Math.max(200, mapInstance.config.NPC_FLEET_FIRE_INTERVAL_MS || 1000);
        if ((timestampMs - (fleet.lastAllyFireMs || 0)) < fireInterval) {
            return;
        }

        const allies = (Array.isArray(mapInstance.escortShips) ? mapInstance.escortShips : []).filter(ship => ship && (ship.hull || 0) > 0);
        const hostileShips = (Array.isArray(fleet.ships) ? fleet.ships : []).filter(ship => ship && (ship.hull || 0) > 0);
        if (allies.length === 0 || hostileShips.length === 0) {
            return;
        }

        const weaponRange = Math.max(0.1, mapInstance.config.NPC_FLEET_WEAPON_RANGE_AU || 2);
        const perShotMin = Math.max(1, mapInstance.config.NPC_SHOT_MIN_DAMAGE || 2);
        const perShotMax = Math.max(perShotMin, mapInstance.config.NPC_SHOT_MAX_DAMAGE || 6);

        let shotsFired = 0;
        allies.forEach(ally => {
            let bestTarget = null;
            let bestDistance = Infinity;

            hostileShips.forEach(target => {
                const dist = ThreeDUtils.distance(ally.position, target.position);
                if (dist > weaponRange || dist >= bestDistance) {
                    return;
                }
                if (!canFireWithinFov(ally, target.position, mapInstance.config)) {
                    return;
                }
                bestDistance = dist;
                bestTarget = target;
            });

            if (!bestTarget) {
                return;
            }

            const fired = mapInstance.laser?.fireWorldLaser?.({
                mapInstance,
                shooter: ally,
                targetPoint: bestTarget.position,
                damageMin: perShotMin,
                damageMax: perShotMax,
                color: COLORS.GREEN,
                timestampMs
            });
            if (fired) {
                shotsFired += 1;
            }
        });

        if (shotsFired > 0) {
            fleet.lastAllyFireMs = timestampMs;
        }
    }

    function updateFleetBehavior(mapInstance, fleet, dt, timestampMs) {
        normalizeFleetBehaviorFlags(fleet, mapInstance);

        const playerShip = mapInstance.playerShip;
        const hailRange = Math.max(0.1, mapInstance.config.NPC_HAIL_RANGE_AU || 1);
        const despawnRange = Math.max(1, mapInstance.config.NPC_FLEET_DESPAWN_DISTANCE_AU || 10);

        const activeShips = fleet.ships.filter(ship => ship && (ship.hull || 0) > 0);
        const distanceToPlayer = getFleetDistanceToPlayerAnyShip(fleet, playerShip);

        if (distanceToPlayer > despawnRange) {
            clearEncounterState(mapInstance, 'distance');
            console.log('[SpaceTravelEncounter] Fleet despawned by distance:', {
                fleetId: fleet.id,
                type: fleet.typeId,
                distanceToPlayerAU: Number(distanceToPlayer.toFixed(3))
            });
            return;
        }

        if (activeShips.length === 0) {
            if (!fleet.allShipsDisabledLogged) {
                fleet.allShipsDisabledLogged = true;
                fleet.state = 'disabled';
                fleet.completedBusiness = true;
                console.log('[SpaceTravelEncounter] Fleet disabled and now lootable until out of range:', {
                    fleetId: fleet.id,
                    type: fleet.typeId
                });
            }
            return;
        }

        if (fleet.isHostile) {
            fleet.state = 'hostile';
            activeShips.forEach(ship => steerShipToward(ship, playerShip.position, dt, mapInstance.config, mapInstance.config.NPC_HOSTILE_SPEED_MULT || 1.1));
            applyNpcCombatShots(mapInstance, fleet, timestampMs);
            applyAllyCombatShots(mapInstance, fleet, timestampMs);
            return;
        }

        if ((fleet.state === 'pursuing') && distanceToPlayer <= hailRange && !fleet.hasHailedPlayer && !fleet.ignorePlayer) {
            triggerHail(mapInstance, fleet, timestampMs, 'npc');
            fleet.state = 'ignoring';
        }

        if (fleet.state === 'pursuing') {
            activeShips.forEach(ship => steerShipToward(ship, playerShip.position, dt, mapInstance.config, mapInstance.config.NPC_PURSUIT_SPEED_MULT || 1));
            return;
        }

        if (!fleet.destinationPoint) {
            setFleetRandomPlanetDestination(mapInstance, fleet);
        }

        activeShips.forEach(ship => steerShipToward(ship, fleet.destinationPoint, dt, mapInstance.config, mapInstance.config.NPC_CRUISE_SPEED_MULT || 0.8));

        const fleetToDestination = getFleetDistanceToPoint(fleet, fleet.destinationPoint);
        if (fleetToDestination <= Math.max(0.2, mapInstance.config.NPC_FLEET_DESTINATION_REACHED_AU || 0.5)) {
            setFleetRandomPlanetDestination(mapInstance, fleet);
        }
    }

    function getFleetDistanceToPoint(fleet, point) {
        if (!fleet || !point || !Array.isArray(fleet.ships) || fleet.ships.length === 0) {
            return Infinity;
        }
        let best = Infinity;
        fleet.ships.forEach(ship => {
            if (!ship || (ship.hull || 0) <= 0) {
                return;
            }
            const dist = ThreeDUtils.distance(ship.position, point);
            if (dist < best) {
                best = dist;
            }
        });
        return best;
    }

    function trySpawn(mapInstance, dt, timestampMs) {
        if (!mapInstance.npcEncounterSpawnUnlocked) {
            return;
        }

        if (Array.isArray(mapInstance.npcEncounterFleets) && mapInstance.npcEncounterFleets.length > 0) {
            return;
        }

        const rates = getSpawnRates(mapInstance);
        if (rates.length === 0) {
            return;
        }

        const totalRate = rates.reduce((sum, rate) => sum + rate.ratePerSecond, 0);
        const chance = Math.max(0, Math.min(1, totalRate * dt));

        if (Math.random() < chance) {
            const choice = chooseWeightedRate(rates);
            if (choice) {
                spawnFleetFromRate(mapInstance, choice, timestampMs);
            }
        }
    }

    function spawnInitialEncounter(mapInstance, timestampMs = performance.now()) {
        ensureState(mapInstance);
        if (!mapInstance || !mapInstance.playerShip || !mapInstance.targetSystem || !mapInstance.currentGameState) {
            return false;
        }

        if (Array.isArray(mapInstance.npcEncounterFleets) && mapInstance.npcEncounterFleets.length > 0) {
            return false;
        }

        const rates = getSpawnRates(mapInstance);
        if (!Array.isArray(rates) || rates.length === 0) {
            return false;
        }

        const choice = chooseWeightedRate(rates) || rates[0];
        if (!choice) {
            return false;
        }

        spawnFleetFromRate(mapInstance, choice, timestampMs);
        console.log('[SpaceTravelEncounter] Forced initial encounter spawn on travel start');
        return true;
    }

    function updateHailState(mapInstance, timestampMs) {
        const fleet = (mapInstance.npcEncounterFleets || [])[0] || null;
        normalizeFleetBehaviorFlags(fleet, mapInstance);
        mapInstance.npcEncounterHailAvailable = !!fleet
            && !fleet.isHostile
            && !fleet.completedBusiness
            && !fleet.hasHailedPlayer;
    }

    function update(mapInstance, dt, timestampMs) {
        ensureState(mapInstance);
        if (!mapInstance || !mapInstance.playerShip || !mapInstance.targetSystem || !mapInstance.currentGameState) {
            return;
        }

        const activeFleet = (mapInstance.npcEncounterFleets || [])[0] || null;
        if (activeFleet) {
            updateFleetBehavior(mapInstance, activeFleet, dt, timestampMs);
        } else {
            trySpawn(mapInstance, dt, timestampMs);
        }

        updatePendingHailPrompt(mapInstance, timestampMs);

        updateHailState(mapInstance, timestampMs);

        if (Array.isArray(mapInstance.npcCombatLaserBursts) && mapInstance.npcCombatLaserBursts.length > 0) {
            mapInstance.npcCombatLaserBursts = mapInstance.npcCombatLaserBursts.filter(burst => burst && (timestampMs - (burst.createdMs || 0)) <= (burst.ttlMs || 0));
        }
    }

    function renderCombatLasers({ mapInstance, depthBuffer, playerShip, viewWidth, viewHeight, config }) {
        if (!mapInstance || !playerShip || !Array.isArray(mapInstance.npcCombatLaserBursts) || mapInstance.npcCombatLaserBursts.length === 0) {
            return;
        }

        mapInstance.npcCombatLaserBursts.forEach(burst => {
            if (!burst?.from || !burst?.to) {
                return;
            }

            const fromRelative = ThreeDUtils.subVec(burst.from, playerShip.position);
            const toRelative = ThreeDUtils.subVec(burst.to, playerShip.position);
            const fromCamera = ThreeDUtils.rotateVecByQuat(fromRelative, ThreeDUtils.quatConjugate(playerShip.rotation));
            const toCamera = ThreeDUtils.rotateVecByQuat(toRelative, ThreeDUtils.quatConjugate(playerShip.rotation));

            if (fromCamera.z <= config.NEAR_PLANE || toCamera.z <= config.NEAR_PLANE) {
                return;
            }

            const fromProjected = RasterUtils.projectCameraSpacePointRaw(fromCamera, viewWidth, viewHeight, config.VIEW_FOV);
            const toProjected = RasterUtils.projectCameraSpacePointRaw(toCamera, viewWidth, viewHeight, config.VIEW_FOV);
            if (!fromProjected || !toProjected) {
                return;
            }

            const x1 = Math.round(fromProjected.x);
            const y1 = Math.round(fromProjected.y);
            const x2 = Math.round(toProjected.x);
            const y2 = Math.round(toProjected.y);
            const points = LineDrawer.drawLine(x1, y1, x2, y2, true, burst.color || COLORS.RED);
            points.forEach(point => {
                RasterUtils.plotDepthText(depthBuffer, point.x, point.y, config.LASER_DEPTH, point.symbol, burst.color || COLORS.RED);
            });
        });
    }

    function getRenderableShips(mapInstance) {
        const fleet = (mapInstance?.npcEncounterFleets || [])[0] || null;
        if (!fleet || !Array.isArray(fleet.ships)) {
            return [];
        }
        return fleet.ships;
    }

    function handlePlayerAttackTarget(mapInstance, target, timestampMs = 0) {
        const fleetId = target?.npcFleetId || target?.fleetId || target?.shipData?.npcFleetId;
        if (!fleetId) {
            return;
        }

        const fleet = (mapInstance?.npcEncounterFleets || []).find(candidate => candidate.id === fleetId);
        if (!fleet) {
            return;
        }

        setFleetHostile(fleet, 'player_attack');
        mapInstance.npcEncounterHailPrompt = null;

        console.log('[SpaceTravelEncounter] Player attack forced hostility:', {
            fleetId,
            timestampMs
        });
    }

    function playerInitiateHail(mapInstance, timestampMs = 0) {
        if (!mapInstance || mapInstance.npcEncounterHailPrompt) {
            return false;
        }

        const selectedDestination = mapInstance.currentGameState?.localDestination || mapInstance.localDestination || null;
        if (selectedDestination?.type === 'ESCORT_SHIP') {
            const escort = selectedDestination.escort || null;
            if (!escort || (escort.hull || 0) <= 0) {
                return false;
            }
            return beginAllyHailMenu(mapInstance, escort);
        }

        const fleet = (mapInstance?.npcEncounterFleets || [])[0] || null;
        if (!fleet || fleet.isHostile) {
            return false;
        }

        const selectedShip = selectedDestination && (selectedDestination.type === 'NPC_SHIP' || selectedDestination.kind === 'NPC_SHIP')
            ? (selectedDestination.npcShip || null)
            : null;

        if (!selectedShip || !selectedShip.id) {
            return false;
        }

        const targetShip = (fleet.ships || []).find(ship => ship && ship.id === selectedShip.id);
        if (!targetShip || (targetShip.hull || 0) <= 0) {
            return false;
        }

        if (fleet.hasHailedPlayer) {
            return beginIgnoredHailMenu(mapInstance, targetShip);
        }

        triggerHail(mapInstance, fleet, timestampMs || performance.now(), 'player');
        return true;
    }

    function renderHailPrompt({ mapInstance, viewWidth, viewHeight, timestampMs, addHudText, onOpenChannel }) {
        const prompt = mapInstance?.npcEncounterHailPrompt;
        if (!prompt || !addHudText) {
            return;
        }

        const title = prompt.text || 'Incoming hail';
        const sub = prompt.subtext || '';
        const buttonLabel = 'Open Channel';
        const buttonText = `[1] ${buttonLabel}`;
        const width = Math.min(viewWidth - 4, Math.max(28, title.length + 6, sub.length + 6, buttonText.length + 6));
        const height = sub ? 6 : 5;
        const left = Math.max(1, Math.floor((viewWidth - width) / 2));
        const top = Math.max(1, Math.floor((viewHeight - height) / 2));

        const horizontal = '─'.repeat(Math.max(0, width - 2));
        addHudText(left, top, `┌${horizontal}┐`, COLORS.CYAN);
        for (let y = 1; y < height - 1; y++) {
            addHudText(left, top + y, `│${' '.repeat(width - 2)}│`, COLORS.CYAN);
        }
        addHudText(left, top + height - 1, `└${horizontal}┘`, COLORS.CYAN);

        const titleX = left + Math.max(1, Math.floor((width - title.length) / 2));
        addHudText(titleX, top + 1, title, COLORS.WHITE);

        if (sub) {
            const subX = left + Math.max(1, Math.floor((width - sub.length) / 2));
            addHudText(subX, top + 2, sub, COLORS.TEXT_DIM);
        }

        const buttonX = Math.max(0, left + Math.floor((width - buttonText.length) / 2));
        const buttonY = top + height - 2;
        UI.addButton(buttonX, buttonY, '1', buttonLabel, () => {
            onOpenChannel?.();
        }, COLORS.YELLOW, '');
    }

    return {
        ensureState,
        clearEncounterState,
        canPlayerHailSelectedTarget,
        spawnInitialEncounter,
        update,
        getRenderableShips,
        handlePlayerAttackTarget,
        playerInitiateHail,
        canOpenPendingHail,
        openPendingHail,
        renderHailPrompt,
        renderCombatLasers,
        setFleetHostile
    };
})();
