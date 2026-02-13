/**
 * Space Travel Map Particles
 */

const SpaceTravelParticles = (() => {
    function renderStars({ viewWidth, viewHeight, depthBuffer, timestampMs = 0, playerShip, starfield, boostActive, boostStartTimestampMs, config }) {
        if (!playerShip) {
            return;
        }

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
            const brightnessVariance = (Math.sin(brightnessSeed * 0.001 + timestampMs * 0.0003) + 1) / 2;
            const minBrightness = 0.15;
            const maxBrightness = 1.0;
            const brightness = minBrightness + (brightnessVariance * (maxBrightness - minBrightness));
            let starColor = SpaceTravelShared.lerpColorHex('#000000', COLORS.TEXT_DIM, brightness);
            
            // Apply redshift during boost (4x the orange tint intensity)
            if (boostActive && boostStartTimestampMs) {
                const rampSec = Math.max(0.1, config.BOOST_TINT_RAMP_SEC || 1);
                const elapsedSec = Math.max(0, (timestampMs - boostStartTimestampMs) / 1000);
                const timeRatio = Math.min(1, elapsedSec / rampSec);
                // Redshift is 4x the original tint amount (0.25), but at current tint's ramp: 0.25 * timeRatio
                const redshiftAmount = config.BOOST_TINT_MAX * 4 * timeRatio;  // 4x the current subtle tint
                if (redshiftAmount > 0) {
                    starColor = SpaceTravelShared.lerpColorHex(starColor, '#ff0000', redshiftAmount);
                }
            }
            
            if (boostActive) {
                // Boost mode: draw streak even if center is off-screen
                const offsetMs = starSeed % config.BOOST_STREAK_GROWTH_MS;
                const delayMs = config.BOOST_STREAK_DELAY_MS + (starSeed % config.BOOST_STREAK_DELAY_MS);
                if ((timestampMs - boostStartTimestampMs) < delayMs) {
                    // Still in delay period, draw only center if visible
                    if (baseX >= 0 && baseX < viewWidth && baseY >= 0 && baseY < viewHeight) {
                        RasterUtils.plotDepthText(depthBuffer, baseX, baseY, projected.z, starSymbol, starColor);
                        drawn++;
                    }
                    continue;
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
                const streakElapsed = Math.max(0, timestampMs - boostStartTimestampMs - delayMs);
                const length = 1 + Math.floor(Math.max(0, streakElapsed - offsetMs) / config.BOOST_STREAK_GROWTH_MS);
                let streakDrawn = false;
                for (let i = 0; i < length; i++) {
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

    function updateParticles(mapInstance) {
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
    }

    return {
        renderStars,
        renderDust,
        updateDustParticles,
        updateParticles
    };
})();
