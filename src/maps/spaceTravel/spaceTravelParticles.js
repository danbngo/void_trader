/**
 * Space Travel Map Particles
 */

const SpaceTravelParticles = (() => {
    function getTrailRearOffset(ship, config) {
        const fallbackShipSize = ship?.size || SHIP_SIZE_AU || 0.00000043;
        const minOffset = Math.max(fallbackShipSize * 0.75, 0.0000004);

        const shipGeometry = ship?.geometry || ShipGeometry?.getShip?.('FIGHTER') || null;
        const verts = Array.isArray(shipGeometry?.vertices) ? shipGeometry.vertices : null;
        if (!verts || verts.length === 0) {
            return minOffset;
        }

        let maxRadiusLocal = 0;
        verts.forEach(v => {
            if (!v) {
                return;
            }
            const r = Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
            if (r > maxRadiusLocal) {
                maxRadiusLocal = r;
            }
        });

        const screenScale = Math.max(1, Number(config?.SHIP_SCREEN_SCALE) || 1);
        const radiusFromVisualModel = maxRadiusLocal * screenScale;
        const desiredOffset = Math.max(minOffset, radiusFromVisualModel * 0.35);

        // Keep trail reasonably close even with extreme debug/experimental scales.
        const maxOffset = Math.max(0.06, minOffset * 12);
        return Math.min(desiredOffset, maxOffset);
    }

    function renderRocketTrails({ viewWidth, viewHeight, depthBuffer, timestampMs = 0, playerShip, rocketTrailClouds, config, shipOccupancyMask = null }) {
        if (!playerShip || !Array.isArray(rocketTrailClouds) || rocketTrailClouds.length === 0) {
            return;
        }
        if (!config.ROCKET_TRAIL_ENABLED) {
            return;
        }

        const fadeMs = config.ROCKET_TRAIL_FADE_MS || 4000;
        const visibleDistanceAU = config.ROCKET_TRAIL_VISIBLE_DISTANCE_AU || 1;
        const cloudChar = config.ROCKET_TRAIL_CHAR || '*';
        const startColor = config.ROCKET_TRAIL_COLOR || '#ff8a00';

        rocketTrailClouds.forEach(cloud => {
            const ageMs = timestampMs - cloud.spawnMs;
            if (ageMs < 0 || ageMs > fadeMs) {
                return;
            }

            const distToPlayer = ThreeDUtils.distance(playerShip.position, cloud.position);
            if (distToPlayer > visibleDistanceAU) {
                return;
            }

            const relative = ThreeDUtils.subVec(cloud.position, playerShip.position);
            const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
            if (cameraSpace.z < config.NEAR_PLANE) {
                return;
            }

            const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
            if (!projected) {
                return;
            }

            const x = Math.round(projected.x);
            const y = Math.round(projected.y);
            if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) {
                return;
            }

            if (shipOccupancyMask && shipOccupancyMask[(y * viewWidth) + x]) {
                return;
            }

            const t = Math.max(0, Math.min(1, ageMs / fadeMs));
            const color = SpaceTravelShared.lerpColorHex(startColor, '#000000', t);
            RasterUtils.plotDepthText(depthBuffer, x, y, cameraSpace.z, cloudChar, color);
        });
    }

    function renderStars({ viewWidth, viewHeight, depthBuffer, timestampMs = 0, playerShip, starfield, boostActive, boostStartTimestampMs, boostEndTimestampMs, config, isPaused, pauseTimestampMs }) {
        if (!playerShip) {
            return;
        }

        const animTimestampMs = (isPaused && Number.isFinite(pauseTimestampMs) && pauseTimestampMs > 0)
            ? pauseTimestampMs
            : timestampMs;

        const maxStars = 1000;
        let drawn = 0;

        for (let starIndex = 0; starIndex < starfield.length; starIndex++) {
            const star = starfield[starIndex];
            if (drawn >= maxStars) {
                break;
            }

            const worldPos = ThreeDUtils.addVec(playerShip.position, ThreeDUtils.scaleVec(star.direction, config.STARFIELD_RADIUS_AU));

            if (ThreeDUtils.distance(playerShip.position, worldPos) > config.STAR_RENDER_DISTANCE_AU + config.STARFIELD_RADIUS_AU) {
                continue;
            }

            const projected = RasterUtils.projectCameraSpacePointRaw(
                ThreeDUtils.rotateVecByQuat(
                    ThreeDUtils.subVec(worldPos, playerShip.position),
                    ThreeDUtils.quatConjugate(playerShip.rotation)
                ),
                viewWidth,
                viewHeight,
                config.VIEW_FOV
            );
            if (!projected) {
                continue;
            }

            const baseX = Math.round(projected.x);
            const baseY = Math.round(projected.y);
            
            const starSeed = Math.abs(Math.floor((star.direction.x * 100000) + (star.direction.y * 310000) + (star.direction.z * 730000) + (starIndex * 1997)));
            const starSymbol = (starSeed % 2 === 0) ? '·' : '.';
            const brightnessSeed = starSeed;
            const brightnessVariance = (Math.sin(brightnessSeed * 0.001 + animTimestampMs * 0.0003) + 1) / 2;
            const minBrightness = 0.15;
            const maxBrightness = 1.0;
            const brightness = minBrightness + (brightnessVariance * (maxBrightness - minBrightness));
            let starColor = SpaceTravelShared.lerpColorHex('#000000', COLORS.TEXT_DIM, brightness);
            
            // Check if we're in streak mode (active boost or within 1s after boost)
            const streakPersistMs = config.BOOST_STREAK_PERSIST_MS || 1000;
            const isInStreakMode = boostActive || (boostEndTimestampMs && boostEndTimestampMs > 0 && (animTimestampMs - boostEndTimestampMs) < streakPersistMs);
            
            if (isInStreakMode) {
                // Calculate streak parameters
                const offsetMs = starSeed % config.BOOST_STREAK_GROWTH_MS;
                const delayMs = config.BOOST_STREAK_DELAY_MS + (starSeed % config.BOOST_STREAK_DELAY_MS);
                
                // Determine base length based on boost state
                let baseLength;
                if (boostActive) {
                    // During boost: grow normally
                    if ((animTimestampMs - boostStartTimestampMs) < delayMs) {
                        // Still in delay period, draw only center if visible
                        if (baseX >= 0 && baseX < viewWidth && baseY >= 0 && baseY < viewHeight) {
                            RasterUtils.plotDepthText(depthBuffer, baseX, baseY, projected.z, starSymbol, starColor);
                            drawn++;
                        }
                        continue;
                    }
                    const streakElapsed = Math.max(0, animTimestampMs - boostStartTimestampMs - delayMs);
                    baseLength = 1 + Math.floor(Math.max(0, streakElapsed - offsetMs) / config.BOOST_STREAK_GROWTH_MS);
                } else {
                    // After boost: calculate length at boost end, then shrink
                    const lengthAtBoostEnd = Math.max(0, boostEndTimestampMs - boostStartTimestampMs - delayMs);
                    const maxLength = 1 + Math.floor(Math.max(0, lengthAtBoostEnd - offsetMs) / config.BOOST_STREAK_GROWTH_MS);
                    
                    // Shrink from maxLength to 0 over 1 second
                    const shrinkElapsed = animTimestampMs - boostEndTimestampMs;
                    const shrinkProgress = Math.min(1, shrinkElapsed / streakPersistMs);
                    baseLength = Math.max(1, Math.ceil(maxLength * (1 - shrinkProgress)));
                }
                
                // Draw streak from center outward toward screen center
                const centerX = (viewWidth - 1) / 2;
                const centerY = (viewHeight - 1) / 2;
                const dx = baseX - centerX;
                const dy = baseY - centerY;
                const mag = Math.sqrt(dx * dx + dy * dy) || 1;
                const dirX = dx / mag;
                const dirY = dy / mag;
                const symbol = SpaceTravelShared.getLineSymbolFromDirection(dirX, -dirY);
                
                let streakDrawn = false;
                for (let i = 0; i < baseLength; i++) {
                    const sx = Math.round(baseX + dirX * i);
                    const sy = Math.round(baseY + dirY * i);
                    if (sx >= 0 && sx < viewWidth && sy >= 0 && sy < viewHeight) {
                        RasterUtils.plotDepthText(depthBuffer, sx, sy, projected.z, symbol, starColor);
                        streakDrawn = true;
                    }
                }
                if (streakDrawn) {
                    drawn++;
                }
            } else {
                // Normal mode: draw star only if center is visible
                if (baseX >= 0 && baseX < viewWidth && baseY >= 0 && baseY < viewHeight) {
                    RasterUtils.plotDepthText(depthBuffer, baseX, baseY, projected.z, starSymbol, starColor);
                    drawn++;
                }
            }
        }
    }

    function renderDust({ viewWidth, viewHeight, depthBuffer, playerShip, dustParticles, config, targetSystem, currentGameState, getVelocityCameraSpace }) {
        if (!playerShip || dustParticles.length === 0) {
            return;
        }

        const speed = ThreeDUtils.vecLength(playerShip.velocity);
        // Calculate velocity in camera space directly instead of relying on passed function
        const velocityView = ThreeDUtils.rotateVecByQuat(playerShip.velocity, ThreeDUtils.quatConjugate(playerShip.rotation));
        const cameraPos = playerShip.position;
        const cameraRot = playerShip.rotation;
        
        // Calculate distance to nearest star for temperature-based coloring
        let minDistanceToStar = Infinity;
        if (targetSystem && targetSystem.stars) {
            const systemCenter = {
                x: targetSystem.x * config.LY_TO_AU,
                y: targetSystem.y * config.LY_TO_AU,
                z: 0
            };
            targetSystem.stars.forEach(star => {
                const orbitOffset = star.orbit ? SystemOrbitUtils.getOrbitPosition(star.orbit, currentGameState.date) : { x: 0, y: 0, z: 0 };
                const starPos = ThreeDUtils.addVec(systemCenter, orbitOffset);
                const dist = ThreeDUtils.distance(playerShip.position, starPos);
                if (dist < minDistanceToStar) {
                    minDistanceToStar = dist;
                }
            });
        }
        const baseHeatDamageRange = 0.1; // AU - range where heat damage occurs (yellowish-white)
        const brownRange = baseHeatDamageRange * 100; // 10 AU (brownish-white)
        const blueRange = baseHeatDamageRange * 10000; // 1000 AU (blueish-white)
        
        let loggedOnce = false;
        dustParticles.forEach(particle => {
            const relative = ThreeDUtils.subVec(particle.position, cameraPos);
            const cameraSpacePos = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(cameraRot));
            const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpacePos, viewWidth, viewHeight, config.VIEW_FOV);
            if (!projected) {
                return;
            }

            const x = Math.floor(projected.x);
            const y = Math.floor(projected.y);

            if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
                const bufferIndex = y * depthBuffer.width + x;
                const existingChar = depthBuffer.chars[bufferIndex];
                if (existingChar && existingChar !== '.') {
                    return;
                }

                let symbol = config.DUST_PARTICLE_SYMBOL;
                const speedPerMinute = speed * 60;
                const lineSpeedMin = config.DUST_PARTICLE_LINE_SPEED_THRESHOLD || 0.25;
                if (config.DUST_PARTICLE_LINE_SYMBOLS && speedPerMinute >= lineSpeedMin) {
                    // Calculate perspective-corrected screen-space velocity for this particle
                    // This creates radial motion patterns as particles at different positions
                    // have different apparent screen velocities due to perspective
                    const denom = cameraSpacePos.z * cameraSpacePos.z;
                    const vx = (velocityView.x * cameraSpacePos.z - cameraSpacePos.x * velocityView.z) / denom;
                    const vy = (velocityView.y * cameraSpacePos.z - cameraSpacePos.y * velocityView.z) / denom;
                    const screenSpeed = Math.sqrt(vx * vx + vy * vy);
                    
                    if (screenSpeed >= config.DUST_SCREEN_SPEED_EPSILON) {
                        symbol = SpaceTravelShared.getLineSymbolFromDirection(vx, vy);
                    }
                }
                
                // Temperature-based dust coloring: yellow/white near star, gray in middle, blue/white in deep space
                // All colors heavily desaturated to be subtle gray tones
                const dustColorVariance = (Math.sin(particle.position.x * 0.1 + particle.position.y * 0.15) + 1) / 2;
                let dustColor;
                let colorType = '';
                
                if (minDistanceToStar < baseHeatDamageRange) {
                    // Very close to star (0-0.1 AU) - very dark yellowish-white
                    dustColor = SpaceTravelShared.lerpColorHex('#5a5a48', '#626250', dustColorVariance);
                    colorType = 'yellowish-white';
                } else if (minDistanceToStar < brownRange) {
                    // Medium distance (0.1-10 AU) - transition from yellowish to brownish-white
                    const t = Math.min(1, (minDistanceToStar - baseHeatDamageRange) / (brownRange - baseHeatDamageRange));
                    const yellowish = SpaceTravelShared.lerpColorHex('#5a5a48', '#626250', dustColorVariance);
                    const brownish = SpaceTravelShared.lerpColorHex('#5a5550', '#625d58', dustColorVariance);
                    dustColor = SpaceTravelShared.lerpColorHex(yellowish, brownish, t);
                    colorType = `transition-yellow-brown(${t.toFixed(2)})`;
                } else if (minDistanceToStar < blueRange) {
                    // Far from star (10-1000 AU) - transition from brownish to blueish-white
                    const t = Math.min(1, (minDistanceToStar - brownRange) / (blueRange - brownRange));
                    const brownish = SpaceTravelShared.lerpColorHex('#5a5550', '#625d58', dustColorVariance);
                    const blueish = SpaceTravelShared.lerpColorHex('#50555a', '#585d62', dustColorVariance);
                    dustColor = SpaceTravelShared.lerpColorHex(brownish, blueish, t);
                    colorType = `transition-brown-blue(${t.toFixed(2)})`;
                } else {
                    // Deep space (>1000 AU) - very dark blueish-white
                    dustColor = SpaceTravelShared.lerpColorHex('#50555a', '#585d62', dustColorVariance);
                    colorType = 'blueish-white';
                }
                
                RasterUtils.plotDepthText(depthBuffer, x, y, cameraSpacePos.z, symbol, dustColor);
            }
        });
    }

    function updateDustParticles({ playerShip, dustParticles, config, getVelocityWorldDirection }) {
        if (!playerShip) {
            return dustParticles;
        }

        const shipRange = playerShip.size * config.DUST_PARTICLE_RANGE_SHIP_LENGTHS;
        const spawnRadius = playerShip.size * config.DUST_PARTICLE_SPAWN_RADIUS_SHIP_LENGTHS;
        const minDistance = playerShip.size * config.DUST_PARTICLE_MIN_DISTANCE_SHIP_LENGTHS;
        const maxDistance = playerShip.size * config.DUST_PARTICLE_MAX_DISTANCE_SHIP_LENGTHS;
        const edgeBand = playerShip.size * config.DUST_PARTICLE_EDGE_BAND_SHIP_LENGTHS;

        let nextParticles = dustParticles.filter(particle => {
            return ThreeDUtils.distance(playerShip.position, particle.position) <= shipRange;
        });

        if (nextParticles.length >= config.DUST_PARTICLE_COUNT) {
            return nextParticles;
        }

        const speed = ThreeDUtils.vecLength(playerShip.velocity);
        if (speed <= 0.000001) {
            return nextParticles;
        }

        const velocityDirection = getVelocityWorldDirection();

        while (nextParticles.length < config.DUST_PARTICLE_COUNT) {
            const offset = ThreeDUtils.randomPointInSphereShellBiased(minDistance, maxDistance, edgeBand, velocityDirection, config.DUST_PARTICLE_VELOCITY_BIAS);
            nextParticles.push({
                position: ThreeDUtils.addVec(playerShip.position, offset)
            });
        }

        return nextParticles;
    }

    function updateRocketTrails(mapInstance, timestampMs = 0) {
        if (!mapInstance?.config?.ROCKET_TRAIL_ENABLED) {
            return;
        }
        if (!mapInstance.playerShip) {
            return;
        }

        if (!Array.isArray(mapInstance.rocketTrailClouds)) {
            mapInstance.rocketTrailClouds = [];
        }
        if (!mapInstance.rocketTrailLastSpawnByShip) {
            mapInstance.rocketTrailLastSpawnByShip = {};
        }

        const hasValidTimestamp = Number.isFinite(timestampMs);
        const now = hasValidTimestamp
            ? timestampMs
            : ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
        const fadeMs = mapInstance.config.ROCKET_TRAIL_FADE_MS || 4000;
        const spawnIntervalMs = mapInstance.config.ROCKET_TRAIL_SPAWN_INTERVAL_MS || 200;
        const minSpeed = mapInstance.config.ROCKET_TRAIL_MIN_SPEED_AU_PER_SEC || 0.000001;

        mapInstance.rocketTrailClouds = mapInstance.rocketTrailClouds.filter(cloud => {
            if (!cloud || !Number.isFinite(cloud.spawnMs)) {
                return false;
            }
            const age = now - cloud.spawnMs;
            return age >= 0 && age <= fadeMs;
        });

        const npcShips = (Array.isArray(mapInstance.npcEncounterFleets) && mapInstance.npcEncounterFleets.length > 0)
            ? (mapInstance.npcEncounterFleets[0].ships || [])
            : [];
        const ships = [
            mapInstance.playerShip,
            ...(Array.isArray(mapInstance.escortShips) ? mapInstance.escortShips : []),
            ...npcShips
        ];
        ships.forEach((ship, index) => {
            if (!ship || !ship.position || !ship.velocity) {
                return;
            }

            const speed = ThreeDUtils.vecLength(ship.velocity);
            if (speed < minSpeed) {
                return;
            }

            const shipKey = ship.id || `ship_${index}`;
            const lastSpawnMs = mapInstance.rocketTrailLastSpawnByShip[shipKey] || 0;
            if (!Number.isFinite(lastSpawnMs) || lastSpawnMs > now) {
                mapInstance.rocketTrailLastSpawnByShip[shipKey] = now - spawnIntervalMs;
            }

            const safeLastSpawnMs = mapInstance.rocketTrailLastSpawnByShip[shipKey] || 0;
            if ((now - safeLastSpawnMs) < spawnIntervalMs) {
                return;
            }

            const moveDir = ThreeDUtils.normalizeVec(ship.velocity);
            const rearOffset = getTrailRearOffset(ship, mapInstance.config);
            const spawnPos = ThreeDUtils.subVec(ship.position, ThreeDUtils.scaleVec(moveDir, rearOffset));

            mapInstance.rocketTrailClouds.push({
                position: spawnPos,
                spawnMs: now,
                shipId: shipKey
            });
            mapInstance.rocketTrailLastSpawnByShip[shipKey] = now;
        });
    }

    function updateParticles(mapInstance, timestampMs = 0) {
        mapInstance.dustParticles = updateDustParticles({
            ...mapInstance,
            getVelocityWorldDirection: () => {
                const speed = ThreeDUtils.vecLength(mapInstance.playerShip.velocity);
                if (speed > 0.000001) {
                    return ThreeDUtils.normalizeVec(mapInstance.playerShip.velocity);
                }
                return ThreeDUtils.getLocalAxes(mapInstance.playerShip.rotation).forward;
            }
        });

        if (mapInstance.config.DEBUG_STATION_LOG) {
            SpaceTravelLogic.logNearestStationDebug({ playerShip: mapInstance.playerShip });
        }

        updateRocketTrails(mapInstance, timestampMs);
    }

    return {
        renderStars,
        renderDust,
        renderRocketTrails,
        updateDustParticles,
        updateRocketTrails,
        updateParticles
    };
})();
