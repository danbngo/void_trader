/**
 * Space Travel Map Logic
 */

const SpaceTravelLogic = (() => {
    function checkStationDocking({
        station,
        timestampMs = 0,
        playerShip,
        currentGameState,
        targetSystem,
        lastStationCollisionMs,
        damageFlashStartMs,
        onStop,
        onDock,
        config
    }) {
        if (!station || !playerShip) {
            return { didDock: false, lastStationCollisionMs, damageFlashStartMs };
        }

        const stationRadius = Math.max(0.0001, station.radiusAU ?? station.size ?? 0);
        const dockRadius = stationRadius * (config.STATION_DOCK_RADIUS_MULT ?? 0.6);
        const collisionRadius = stationRadius * config.STATION_COLLISION_RADIUS_MULT;
        const dist = ThreeDUtils.distance(playerShip.position, station.position);
        if (dist > collisionRadius) {
            return { didDock: false, lastStationCollisionMs, damageFlashStartMs };
        }

        const baseEntranceDir = ThreeDUtils.normalizeVec(config.STATION_ENTRANCE_DIR);
        const entranceYaw = ThreeDUtils.degToRad(config.STATION_ENTRANCE_YAW_DEG || 0);
        const yawRot = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, entranceYaw);
        const yawedEntranceDir = ThreeDUtils.rotateVecByQuat(baseEntranceDir, yawRot);
        const entranceDir = station.rotation
            ? ThreeDUtils.rotateVecByQuat(yawedEntranceDir, station.rotation)
            : yawedEntranceDir;
        const toShip = ThreeDUtils.normalizeVec(ThreeDUtils.subVec(playerShip.position, station.position));
        const entranceDot = ThreeDUtils.dotVec(toShip, entranceDir);
        const toStation = ThreeDUtils.normalizeVec(ThreeDUtils.subVec(station.position, playerShip.position));
        const approachingSpeed = ThreeDUtils.dotVec(playerShip.velocity, toStation);
        const rawSpeed = ThreeDUtils.vecLength(playerShip.velocity);
        const collisionDebug = {
            timestampMs: Math.floor(timestampMs),
            stationId: station.id,
            distAU: dist,
            dockRadiusAU: dockRadius,
            collisionRadiusAU: collisionRadius,
            entranceDot,
            approachingSpeedAUps: approachingSpeed,
            speedAUps: rawSpeed,
            speedAUpm: rawSpeed * 60,
            minSpeedAUps: config.STATION_COLLISION_MIN_SPEED,
            minSpeedAUpm: config.STATION_COLLISION_MIN_SPEED * 60,
            maxEntranceDot: config.STATION_COLLISION_MAX_ENTRANCE_DOT,
            isInsideDockRadius: dist <= dockRadius,
            isInsideCollisionRadius: dist <= collisionRadius
        };

        if (dist <= dockRadius && entranceDot >= config.STATION_ENTRANCE_DOT && approachingSpeed > 0) {
            if (config.DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Docking conditions met', collisionDebug);
            }
            if (onStop) {
                onStop();
            }
            if (onDock) {
                onDock({ currentGameState, targetSystem });
            }
            return { didDock: true, lastStationCollisionMs, damageFlashStartMs };
        }

        if (entranceDot >= config.STATION_ENTRANCE_DOT) {
            if (config.DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Entrance approach - collision suppressed', collisionDebug);
            }
            return { didDock: false, lastStationCollisionMs, damageFlashStartMs };
        }

        if (approachingSpeed < config.STATION_COLLISION_MIN_SPEED) {
            const v = playerShip.velocity;
            const dotVN = ThreeDUtils.dotVec(v, toShip);
            if (dotVN > 0) {
                playerShip.velocity = ThreeDUtils.subVec(v, ThreeDUtils.scaleVec(toShip, dotVN));
            }
            playerShip.position = ThreeDUtils.addVec(station.position, ThreeDUtils.scaleVec(toShip, collisionRadius));
            if (config.DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Soft collision clamp (below min speed)', {
                    ...collisionDebug,
                    dotVN,
                    newVelocity: playerShip.velocity
                });
            }
            return { didDock: false, lastStationCollisionMs, damageFlashStartMs };
        }

        const v = playerShip.velocity;
        const dotVN = ThreeDUtils.dotVec(v, toShip);
        const reflected = ThreeDUtils.subVec(v, ThreeDUtils.scaleVec(toShip, 2 * dotVN));
        playerShip.velocity = ThreeDUtils.scaleVec(reflected, config.STATION_BOUNCE_DAMPING);
        playerShip.position = ThreeDUtils.addVec(station.position, ThreeDUtils.scaleVec(toShip, collisionRadius));
        if (config.DEBUG_STATION_COLLISION) {
            console.log('[SpaceTravelMap] Bounce collision', {
                ...collisionDebug,
                dotVN,
                reflectedVelocity: reflected,
                postVelocity: playerShip.velocity
            });
        }

        if (timestampMs - lastStationCollisionMs >= config.STATION_COLLISION_COOLDOWN_MS) {
            const speedPerMinute = approachingSpeed * 60;
            const damage = Math.max(1, Math.floor(speedPerMinute / 10));
            playerShip.hull = Math.max(0, (playerShip.hull ?? 0) - damage);
            lastStationCollisionMs = timestampMs;
            damageFlashStartMs = timestampMs;
            if (config.DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Collision damage', {
                    ...collisionDebug,
                    damage,
                    hullAfter: playerShip.hull,
                    cooldownMs: config.STATION_COLLISION_COOLDOWN_MS
                });
            }
        } else if (config.DEBUG_STATION_COLLISION) {
            console.log('[SpaceTravelMap] Collision no damage (cooldown)', {
                ...collisionDebug,
                lastCollisionMs: lastStationCollisionMs,
                cooldownMs: config.STATION_COLLISION_COOLDOWN_MS
            });
        }

        return { didDock: false, lastStationCollisionMs, damageFlashStartMs };
    }

    function checkPlanetDocking({
        planet,
        playerShip,
        currentGameState,
        targetSystem,
        onStop,
        onDock,
        config,
        debug = false
    }) {
        if (!planet || !playerShip || !targetSystem) {
            return { didDock: false };
        }

        const systemCenter = {
            x: targetSystem.x * config.LY_TO_AU,
            y: targetSystem.y * config.LY_TO_AU,
            z: 0
        };
        const orbitOffset = planet.orbit
            ? SystemOrbitUtils.getOrbitPosition(planet.orbit, currentGameState?.date)
            : { x: 0, y: 0, z: 0 };
        const worldPos = ThreeDUtils.addVec(systemCenter, orbitOffset);
        const dist = ThreeDUtils.distance(playerShip.position, worldPos);
        const dockRadius = planet.radiusAU * (config.PLANET_DOCK_RADIUS_MULT || 1);
        if (debug && dist <= dockRadius * 1.5) {
            console.log('[SpaceTravelMap] Planet docking check', {
                planetId: planet.id,
                planetName: planet.name,
                distAU: dist,
                dockRadiusAU: dockRadius,
                playerPos: playerShip.position,
                planetPos: worldPos
            });
        }

        if (dist > dockRadius) {
            return { didDock: false };
        }

        if (onStop) {
            onStop();
        }
        if (onDock) {
            onDock({ currentGameState, targetSystem, planet });
        }
        return { didDock: true };
    }

    function getNearestSystem(gameState) {
        if (!gameState || !gameState.systems || gameState.systems.length === 0) {
            return null;
        }
        const current = gameState.getCurrentSystem();
        if (!current) {
            return gameState.systems[0];
        }
        let nearest = null;
        let nearestDist = Infinity;
        gameState.systems.forEach(system => {
            if (system === current) {
                return;
            }
            const dist = current.distanceTo(system);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = system;
            }
        });
        return nearest;
    }

    function updateStationVisibility({ currentStation, playerShip, viewWidth, viewHeight, config }) {
        let possibleStations = [];
        if (currentStation) {
            possibleStations = [currentStation].filter(station => {
                return ThreeDUtils.distance(playerShip.position, station.position) <= config.STATION_POSSIBLE_RANGE_AU;
            });
        }

        const visibleStations = possibleStations.filter(station => {
            const dist = ThreeDUtils.distance(playerShip.position, station.position);
            if (dist > config.STATION_VISIBLE_RANGE_AU) {
                if (config.DEBUG_STATION_VISIBILITY) {
                    console.log('[SpaceTravelMap] Station visibility', {
                        stationId: station.id,
                        distanceAU: dist,
                        distanceLY: dist / config.LY_TO_AU,
                        visible: false,
                        reason: 'range'
                    });
                }
                return false;
            }
            const area = SpaceStationGfx.stationScreenAreaChars(station, playerShip, viewWidth, viewHeight);
            const visible = area >= 0.01;
            if (config.DEBUG_STATION_VISIBILITY) {
                console.log('[SpaceTravelMap] Station visibility', {
                    stationId: station.id,
                    distanceAU: dist,
                    distanceLY: dist / config.LY_TO_AU,
                    area,
                    threshold: 0.01,
                    visible
                });
            }
            return visible;
        });

        return { possibleStations, visibleStations };
    }

    function logNearestStationDebug({ playerShip }) {
        if (!playerShip) {
            return;
        }
    }

    return {
        checkStationDocking,
        checkPlanetDocking,
        getNearestSystem,
        updateStationVisibility,
        logNearestStationDebug
    };
})();
