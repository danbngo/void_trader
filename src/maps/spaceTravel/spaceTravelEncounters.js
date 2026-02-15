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

        const shouldPursue = typeConfig.pursuesPlayer ? (Math.random() < 0.5) : false;

        const fleet = {
            id: fleetId,
            typeId: chosenRate.typeId,
            ships,
            encounterType: typeConfig.encounterType,
            shipColor: typeConfig.shipColor,
            state: shouldPursue ? 'pursuing' : 'ignoring',
            isHostile: false,
            hasHailedPlayer: false,
            lastFireMs: 0,
            sourcePlanetName: chosenRate.planet?.name || `Planet ${chosenRate.planetIndex + 1}`,
            destinationPoint: null,
            destinationPlanetName: null,
            completedBusiness: false
        };

        setFleetRandomPlanetDestination(mapInstance, fleet);

        mapInstance.npcEncounterFleets = [fleet];
        mapInstance.npcEncounterSpawnUnlocked = false;

        console.log('[SpaceTravelEncounter] Spawned fleet:', {
            fleetId,
            type: chosenRate.typeId,
            shipCount,
            sourcePlanet: fleet.sourcePlanetName,
            distanceToSourceAU: Number(chosenRate.distanceAU.toFixed(3)),
            state: fleet.state
        });
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
        const forward = { x: 0, y: 0, z: -1 };
        const normalized = ThreeDUtils.normalizeVec(direction);
        const dot = Math.max(-1, Math.min(1, ThreeDUtils.dotVec(forward, normalized)));
        const angle = Math.acos(dot);
        const cross = {
            x: forward.y * normalized.z - forward.z * normalized.y,
            y: forward.z * normalized.x - forward.x * normalized.z,
            z: forward.x * normalized.y - forward.y * normalized.x
        };
        const crossLen = ThreeDUtils.vecLength(cross);
        if (crossLen < 0.00001) {
            return { x: 0, y: 0, z: 0, w: 1 };
        }
        return ThreeDUtils.quatFromAxisAngle(ThreeDUtils.scaleVec(cross, 1 / crossLen), angle);
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

    function buildEncounterPromptText(fleet) {
        const typeName = (fleet?.encounterType?.name || fleet?.typeId || 'Unknown').toString();
        return `${typeName} fleet hailing...`;
    }

    function triggerHail(mapInstance, fleet, timestampMs, source = 'npc') {
        if (!mapInstance || !fleet || mapInstance.npcEncounterHailPrompt) {
            return;
        }

        fleet.hasHailedPlayer = true;
        mapInstance.npcEncounterHailPrompt = {
            fleetId: fleet.id,
            text: 'You are being hailed',
            subtext: buildEncounterPromptText(fleet),
            source,
            createdMs: timestampMs,
            openAtMs: timestampMs + Math.max(300, mapInstance.config.NPC_HAIL_POPOVER_MS || 800)
        };

        console.log('[SpaceTravelEncounter] Hail triggered:', {
            fleetId: fleet.id,
            type: fleet.typeId,
            source,
            openAtMs: mapInstance.npcEncounterHailPrompt.openAtMs
        });
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

    function applyNpcCombatShots(mapInstance, fleet, timestampMs) {
        const fireInterval = Math.max(200, mapInstance.config.NPC_FLEET_FIRE_INTERVAL_MS || 1000);
        if ((timestampMs - (fleet.lastFireMs || 0)) < fireInterval) {
            return;
        }

        const playerShip = mapInstance.playerShip;
        const weaponRange = Math.max(0.1, mapInstance.config.NPC_FLEET_WEAPON_RANGE_AU || 2);
        const shooters = fleet.ships.filter(ship => ship && (ship.hull || 0) > 0 && ThreeDUtils.distance(ship.position, playerShip.position) <= weaponRange);

        if (shooters.length === 0) {
            return;
        }

        fleet.lastFireMs = timestampMs;

        let totalDamage = 0;
        shooters.forEach(ship => {
            const perShotMin = Math.max(1, mapInstance.config.NPC_SHOT_MIN_DAMAGE || 2);
            const perShotMax = Math.max(perShotMin, mapInstance.config.NPC_SHOT_MAX_DAMAGE || 6);
            totalDamage += perShotMin + Math.floor(Math.random() * (perShotMax - perShotMin + 1));
        });

        let remaining = totalDamage;
        if (typeof playerShip.shields === 'number' && playerShip.shields > 0) {
            const absorbed = Math.min(playerShip.shields, remaining);
            playerShip.shields = Math.max(0, playerShip.shields - absorbed);
            remaining -= absorbed;
        }
        if (remaining > 0 && typeof playerShip.hull === 'number') {
            playerShip.hull = Math.max(0, playerShip.hull - remaining);
        }

        mapInstance.damageFlashStartMs = timestampMs;

        console.log('[SpaceTravelEncounter] NPC volley hit player:', {
            fleetId: fleet.id,
            shooters: shooters.length,
            totalDamage,
            playerHull: playerShip.hull,
            playerShields: playerShip.shields
        });
    }

    function updateFleetBehavior(mapInstance, fleet, dt, timestampMs) {
        const playerShip = mapInstance.playerShip;
        const hailRange = Math.max(0.1, mapInstance.config.NPC_HAIL_RANGE_AU || 1);
        const despawnRange = Math.max(1, mapInstance.config.NPC_FLEET_DESPAWN_DISTANCE_AU || 10);

        const activeShips = fleet.ships.filter(ship => ship && (ship.hull || 0) > 0);
        if (activeShips.length === 0) {
            mapInstance.npcEncounterFleets = [];
            mapInstance.npcEncounterSpawnUnlocked = true;
            console.log('[SpaceTravelEncounter] Fleet removed (all ships disabled):', { fleetId: fleet.id, type: fleet.typeId });
            return;
        }

        const distanceToPlayer = getFleetDistanceToPlayer(fleet, playerShip);

        if (distanceToPlayer > despawnRange) {
            mapInstance.npcEncounterFleets = [];
            mapInstance.npcEncounterSpawnUnlocked = true;
            console.log('[SpaceTravelEncounter] Fleet despawned by distance:', {
                fleetId: fleet.id,
                type: fleet.typeId,
                distanceToPlayerAU: Number(distanceToPlayer.toFixed(3))
            });
            return;
        }

        if (fleet.isHostile) {
            fleet.state = 'hostile';
            activeShips.forEach(ship => steerShipToward(ship, playerShip.position, dt, mapInstance.config, mapInstance.config.NPC_HOSTILE_SPEED_MULT || 1.1));
            applyNpcCombatShots(mapInstance, fleet, timestampMs);
            return;
        }

        if ((fleet.state === 'pursuing') && distanceToPlayer <= hailRange && !fleet.hasHailedPlayer) {
            triggerHail(mapInstance, fleet, timestampMs, 'npc');
        }

        if (fleet.typeId === 'MERCHANT' && distanceToPlayer <= hailRange && !fleet.hasHailedPlayer) {
            triggerHail(mapInstance, fleet, timestampMs, 'npc');
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

    function updateHailState(mapInstance, timestampMs) {
        const fleet = (mapInstance.npcEncounterFleets || [])[0] || null;
        const hailRange = Math.max(0.1, mapInstance.config.NPC_HAIL_RANGE_AU || 1);
        mapInstance.npcEncounterHailAvailable = !!fleet
            && !fleet.isHostile
            && !fleet.completedBusiness
            && !fleet.hasHailedPlayer
            && getFleetDistanceToPlayer(fleet, mapInstance.playerShip) <= hailRange;

        const prompt = mapInstance.npcEncounterHailPrompt;
        if (!prompt) {
            return;
        }

        if (timestampMs >= prompt.openAtMs) {
            const targetFleet = (mapInstance.npcEncounterFleets || []).find(candidate => candidate.id === prompt.fleetId);
            mapInstance.npcEncounterHailPrompt = null;
            if (targetFleet) {
                beginEncounterMenu(mapInstance, targetFleet);
            }
        }
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

        updateHailState(mapInstance, timestampMs);
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
        const fleet = (mapInstance?.npcEncounterFleets || [])[0] || null;
        if (!fleet || fleet.isHostile || fleet.completedBusiness || fleet.hasHailedPlayer || mapInstance.npcEncounterHailPrompt) {
            return false;
        }

        const distance = getFleetDistanceToPlayer(fleet, mapInstance.playerShip);
        const hailRange = Math.max(0.1, mapInstance.config.NPC_HAIL_RANGE_AU || 1);
        if (distance > hailRange) {
            return false;
        }

        triggerHail(mapInstance, fleet, timestampMs || performance.now(), 'player');
        return true;
    }

    function renderHailPrompt({ mapInstance, viewWidth, viewHeight, timestampMs, addHudText }) {
        const prompt = mapInstance?.npcEncounterHailPrompt;
        if (!prompt || !addHudText) {
            return;
        }

        const title = prompt.text || 'You are being hailed';
        const sub = prompt.subtext || '';
        const width = Math.min(viewWidth - 4, Math.max(24, title.length + 6, sub.length + 6));
        const height = 5;
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

        const remainMs = Math.max(0, prompt.openAtMs - timestampMs);
        const status = `Opening channel... ${Math.ceil(remainMs / 100) / 10}s`;
        const statusX = left + Math.max(1, Math.floor((width - status.length) / 2));
        addHudText(statusX, top + 3, status, COLORS.YELLOW);
    }

    return {
        ensureState,
        update,
        getRenderableShips,
        handlePlayerAttackTarget,
        playerInitiateHail,
        renderHailPrompt,
        setFleetHostile
    };
})();
