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
            if (baseX >= 0 && baseX < viewWidth && baseY >= 0 && baseY < viewHeight) {
                if (boostActive) {
                    const seed = Math.abs(Math.floor((star.direction.x * 100000) + (star.direction.y * 310000) + (star.direction.z * 730000) + (starIndex * 1997)));
                    const offsetMs = seed % config.BOOST_STREAK_GROWTH_MS;
                    const delayMs = config.BOOST_STREAK_DELAY_MS + (seed % config.BOOST_STREAK_DELAY_MS);
                    if ((timestampMs - boostStartTimestampMs) < delayMs) {
                        RasterUtils.plotDepthText(depthBuffer, baseX, baseY, projected.z, '.', COLORS.TEXT_DIM);
                        drawn++;
                        continue;
                    }
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
                    for (let i = 0; i < length; i++) {
                        const sx = Math.round(baseX + dirX * i);
                        const sy = Math.round(baseY + dirY * i);
                        if (sx >= 0 && sx < viewWidth && sy >= 0 && sy < viewHeight) {
                            RasterUtils.plotDepthText(depthBuffer, sx, sy, projected.z, symbol, COLORS.TEXT_DIM);
                        }
                    }
                } else {
                    RasterUtils.plotDepthText(depthBuffer, baseX, baseY, projected.z, '.', COLORS.TEXT_DIM);
                }
                drawn++;
            }
        }
    }

    function renderDust({ viewWidth, viewHeight, depthBuffer, playerShip, dustParticles, config, getVelocityCameraSpace }) {
        if (!playerShip || dustParticles.length === 0) {
            return;
        }

        const speed = ThreeDUtils.vecLength(playerShip.velocity);
        const velocityView = getVelocityCameraSpace();
        const cameraPos = playerShip.position;
        const cameraRot = playerShip.rotation;
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
                if (config.DUST_PARTICLE_LINE_SYMBOLS && speed >= config.DUST_PARTICLE_LINE_SPEED_THRESHOLD) {
                    const denom = cameraSpacePos.z * cameraSpacePos.z;
                    const vx = (velocityView.x * cameraSpacePos.z - cameraSpacePos.x * velocityView.z) / denom;
                    const vy = (velocityView.y * cameraSpacePos.z - cameraSpacePos.y * velocityView.z) / denom;
                    const screenSpeed = Math.sqrt(vx * vx + vy * vy);
                    if (screenSpeed >= config.DUST_SCREEN_SPEED_EPSILON) {
                        symbol = SpaceTravelShared.getLineSymbolFromDirection(vx, vy);
                    }
                }
                RasterUtils.plotDepthText(depthBuffer, x, y, cameraSpacePos.z, symbol, COLORS.TEXT_DIM);
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

    return {
        renderStars,
        renderDust,
        updateDustParticles
    };
})();
