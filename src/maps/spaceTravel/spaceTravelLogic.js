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
        onDamage,
        onStop,
        onDock,
        config
    }) {
        if (!station || !playerShip) {
            return { didDock: false, lastStationCollisionMs, damageFlashStartMs };
        }

        const stationRadius = Math.max(0, station.radiusAU ?? station.size ?? 0);
        const stationVisualScale = config.STATION_SCREEN_SCALE || 1;
        const stationDockScale = (typeof config.STATION_PHYSICS_SCALE === 'number' && config.STATION_PHYSICS_SCALE > 0)
            ? config.STATION_PHYSICS_SCALE
            : 1;
        const dockRadius = stationRadius * stationDockScale * (config.STATION_DOCK_RADIUS_MULT ?? 0.6);
        const collisionRadius = stationRadius * stationDockScale * config.STATION_COLLISION_RADIUS_MULT;
        const dist = ThreeDUtils.distance(playerShip.position, station.position);
        if (dist > collisionRadius) {
            return { didDock: false, lastStationCollisionMs, damageFlashStartMs };
        }

        // Model's entrance is at +Z, transform by station rotation to get world direction
        const baseEntranceDir = { x: 0, y: 0, z: 1 };
        const entranceYaw = ThreeDUtils.degToRad(config.STATION_ENTRANCE_YAW_DEG || 0);
        const yawRot = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 0, z: 1 }, entranceYaw);
        const yawedEntranceDir = ThreeDUtils.rotateVecByQuat(baseEntranceDir, yawRot);
        const entranceDir = station.rotation
            ? ThreeDUtils.rotateVecByQuat(yawedEntranceDir, station.rotation)
            : yawedEntranceDir;
        let entrancePlaneDistance = null;
        let isInEntranceAperture = true;
        const entranceGeometrySize = stationRadius * stationDockScale;
        if (SpaceStationGfx && typeof SpaceStationGfx.buildCuboctahedronGeometry === 'function') {
            const geometry = SpaceStationGfx.buildCuboctahedronGeometry(station, entranceGeometrySize);
            const entranceFace = geometry.entranceFace || [];
            if (entranceFace.length >= 3) {
                const faceVerts = entranceFace.map(idx => geometry.vertices[idx]);
                const faceCenter = faceVerts.reduce((acc, v) => ThreeDUtils.addVec(acc, v), { x: 0, y: 0, z: 0 });
                faceCenter.x /= faceVerts.length;
                faceCenter.y /= faceVerts.length;
                faceCenter.z /= faceVerts.length;
                const normal = ThreeDUtils.crossVec(
                    ThreeDUtils.subVec(faceVerts[1], faceVerts[0]),
                    ThreeDUtils.subVec(faceVerts[2], faceVerts[0])
                );
                const normalUnit = ThreeDUtils.normalizeVec(normal);
                const toShipFromPlane = ThreeDUtils.subVec(playerShip.position, faceCenter);
                entrancePlaneDistance = ThreeDUtils.dotVec(toShipFromPlane, normalUnit);
                const basis = PolygonUtils.buildPlaneBasis(normalUnit);
                const inset = 0.45;
                const insetVerts = faceVerts.map(v => {
                    const offset = ThreeDUtils.subVec(v, faceCenter);
                    return ThreeDUtils.addVec(faceCenter, ThreeDUtils.scaleVec(offset, inset));
                });
                const to2D = (v) => {
                    const rel = ThreeDUtils.subVec(v, faceCenter);
                    return {
                        x: ThreeDUtils.dotVec(rel, basis.u),
                        y: ThreeDUtils.dotVec(rel, basis.v)
                    };
                };
                const polygon2D = insetVerts.map(to2D);
                const projectedOnPlane = ThreeDUtils.subVec(
                    playerShip.position,
                    ThreeDUtils.scaleVec(normalUnit, entrancePlaneDistance)
                );
                const ship2D = to2D(projectedOnPlane);
                isInEntranceAperture = PolygonUtils.isPointInPolygon2D(ship2D, polygon2D);
            }
        }
        const toShip = ThreeDUtils.normalizeVec(ThreeDUtils.subVec(playerShip.position, station.position));
        const entranceDot = ThreeDUtils.dotVec(toShip, entranceDir);
        const toStation = ThreeDUtils.normalizeVec(ThreeDUtils.subVec(station.position, playerShip.position));
        const approachingSpeed = ThreeDUtils.dotVec(playerShip.velocity, toStation);
        const rawSpeed = ThreeDUtils.vecLength(playerShip.velocity);
        const minCollisionSpeed = (config.STATION_COLLISION_MIN_SPEED || 0) * stationDockScale;
        const dotVNPre = ThreeDUtils.dotVec(playerShip.velocity, toShip);
        const impactSpeed = Math.max(0, -dotVNPre);
        const impactNormalRatio = rawSpeed > 0 ? (impactSpeed / rawSpeed) : 0;
        const collisionDebug = {
            timestampMs: Math.floor(timestampMs),
            stationId: station.id,
            distAU: dist,
            stationRadiusAU: stationRadius,
            stationVisualScale,
            stationPhysicsScale: stationDockScale,
            stationVisualRadiusAU: stationRadius * stationVisualScale,
            stationPhysicsRadiusAU: stationRadius * stationDockScale,
            entranceGeometrySizeAU: entranceGeometrySize,
            dockRadiusAU: dockRadius,
            collisionRadiusAU: collisionRadius,
            isInEntranceAperture,
            entrancePlaneDistanceAU: entrancePlaneDistance,
            entranceDot,
            approachingSpeedAUps: approachingSpeed,
            speedAUps: rawSpeed,
            speedAUpm: rawSpeed * 60,
            dotVN: dotVNPre,
            impactSpeedAUps: impactSpeed,
            impactNormalRatio,
            minSpeedAUps: minCollisionSpeed,
            minSpeedAUpm: minCollisionSpeed * 60,
            maxEntranceDot: config.STATION_COLLISION_MAX_ENTRANCE_DOT,
            isInsideDockRadius: dist <= dockRadius,
            isInsideCollisionRadius: dist <= collisionRadius
        };

        if (dist <= dockRadius && entranceDot >= config.STATION_ENTRANCE_DOT && isInEntranceAperture && approachingSpeed > 0) {
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

        if (entranceDot >= config.STATION_ENTRANCE_DOT && isInEntranceAperture) {
            if (config.DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Entrance approach - collision suppressed', collisionDebug);
            }
            return { didDock: false, lastStationCollisionMs, damageFlashStartMs };
        }

        if (approachingSpeed < minCollisionSpeed) {
            const v = playerShip.velocity;
            const dotVN = ThreeDUtils.dotVec(v, toShip);
            if (dotVN > 0) {
                // Remove normal component (prevent penetration) but keep tangential (sliding) velocity
                playerShip.velocity = ThreeDUtils.subVec(v, ThreeDUtils.scaleVec(toShip, dotVN));
            }
            // Don't apply damping - let player slide along station at full speed
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

        const damageNormalRatio = typeof config.STATION_COLLISION_DAMAGE_NORMAL_RATIO === 'number'
            ? config.STATION_COLLISION_DAMAGE_NORMAL_RATIO
            : 0;
        if (impactNormalRatio >= damageNormalRatio
            && timestampMs - lastStationCollisionMs >= config.STATION_COLLISION_COOLDOWN_MS) {
            const speedPerMinute = approachingSpeed * 60;
            const damage = Math.max(1, Math.floor(speedPerMinute / 10));
            playerShip.hull = Math.max(0, (playerShip.hull ?? 0) - damage);
            lastStationCollisionMs = timestampMs;
            damageFlashStartMs = timestampMs;
            if (onDamage) {
                onDamage({
                    type: 'STATION_COLLISION',
                    station,
                    damage,
                    hullAfter: playerShip.hull
                });
            }
            if (config.DEBUG_STATION_COLLISION) {
                console.log('[SpaceTravelMap] Collision damage', {
                    ...collisionDebug,
                    damage,
                    hullAfter: playerShip.hull,
                    cooldownMs: config.STATION_COLLISION_COOLDOWN_MS
                });
            }
        } else if (impactNormalRatio < damageNormalRatio && config.DEBUG_STATION_COLLISION) {
            console.log('[SpaceTravelMap] Collision no damage (glancing impact)', {
                ...collisionDebug,
                damageNormalRatio
            });
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
        const bodyDockScale = (typeof config.SYSTEM_BODY_PHYSICS_SCALE === 'number' && config.SYSTEM_BODY_PHYSICS_SCALE > 0)
            ? config.SYSTEM_BODY_PHYSICS_SCALE
            : 1;
        const dockRadius = planet.radiusAU * (config.PLANET_DOCK_RADIUS_MULT || 1) * bodyDockScale;
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
            const bounds = SpaceStationGfx.stationScreenBoundsChars(
                station,
                playerShip,
                viewWidth,
                viewHeight,
                config.VIEW_FOV,
                config.STATION_SCREEN_SCALE || 1
            );
            const area = bounds ? bounds.area : 0;
            const visible = area >= 0.01;
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
