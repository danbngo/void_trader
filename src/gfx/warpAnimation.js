/**
 * Warp travel animation
 */

const WarpAnimation = (() => {
    let animationId = null;
    let startTimestamp = 0;
    let lastTimestamp = 0;
    let isActive = false;
    let streaks = [];
    let frameCount = 0;
    let warpFuelCost = 0;
    let fuelConsumedSoFar = 0;
    let lastFuelLogTime = 0;

    const PARTICLE_COUNT = 120; // Stochastic dust-like particles
    const BASE_SPEED = 40; // Base movement speed
    const SPEED_RAMP = 100; // Speed increase over time
    const INNER_DEAD_ZONE = 0.15; // Empty circle in center (15% of max radius)
    const PARTICLE_LENGTH = 3; // Length of each particle streak

    function show(gameState, targetSystem, onComplete) {
        stop();
        isActive = true;
        startTimestamp = 0;
        lastTimestamp = 0;
        frameCount = 0;
        streaks = buildParticles(PARTICLE_COUNT);

        const totalDuration = SpaceTravelConfig.WARP_ANIM_DURATION_MS || 1000;
        
        // Get pre-calculated fuel cost from gameState (set by portal when opening)
        warpFuelCost = gameState.warpFuelCost || 0;
        fuelConsumedSoFar = 0;
        lastFuelLogTime = 0;
        
        console.log('[WarpAnimation] Warp started with pre-calculated fuel cost:', {
            fuelCost: warpFuelCost,
            startingFuel: gameState.warpStartingFuel,
            expectedEndingFuel: gameState.warpExpectedEndingFuel
        });

        const loop = (timestamp) => {
            if (!isActive) {
                return;
            }
            if (!startTimestamp) {
                startTimestamp = timestamp;
            }
            const elapsed = timestamp - startTimestamp;
            frameCount++;

            render(elapsed, totalDuration, gameState);
            
            // Interpolate fuel consumption based on progress
            const progress = Math.min(1, elapsed / totalDuration);
            
            // Calculate what total fleet fuel should be at this point
            const expectedTotalFuel = gameState.warpStartingFuel - (gameState.warpFuelCost * progress);
            const actualTotalFuel = gameState.ships.reduce((sum, s) => sum + s.fuel, 0);
            const fuelAdjustment = expectedTotalFuel - actualTotalFuel;
            
            if (frameCount <= 1 || frameCount % 60 === 0) {
                console.log('[WarpAnimation] Fuel interpolation:', {
                    progress: (progress * 100).toFixed(1) + '%',
                    expectedTotal: Math.round(expectedTotalFuel),
                    actualTotal: Math.round(actualTotalFuel),
                    adjustment: Math.round(fuelAdjustment)
                });
            }
            
            // Apply fuel adjustment proportionally across all ships
            if (gameState && gameState.ships && Math.abs(fuelAdjustment) > 0.1) {
                const fuel_to_adjust = fuelAdjustment;
                if (actualTotalFuel > 0) {
                    gameState.ships.forEach((ship) => {
                        const proportion = ship.fuel / actualTotalFuel;
                        const shipAdjustment = fuel_to_adjust * proportion;
                        ship.fuel = Math.max(0, ship.fuel + shipAdjustment);
                    });
                }
            }
            
            // Log fuel status every 500ms
            if (elapsed - lastFuelLogTime >= 500) {
                const currentTotal = gameState?.ships?.reduce((sum, s) => sum + s.fuel, 0) || 0;
                console.log('[WarpAnimation] Fuel status:', {
                    progress: (progress * 100).toFixed(1) + '%',
                    expectedTotal: Math.round(expectedTotalFuel),
                    currentTotal: Math.round(currentTotal)
                });
                lastFuelLogTime = elapsed;
            }
            
            // Log duration every 60 frames
            if (frameCount % 60 === 0) {
                const remaining = Math.max(0, totalDuration - elapsed);
                console.log('[WarpAnimation] Progress:', {
                    elapsed: Math.round(elapsed),
                    remaining: Math.round(remaining),
                    total: totalDuration,
                    progress: ((elapsed / totalDuration) * 100).toFixed(1) + '%',
                    frameCount: frameCount
                });
            }

            if (elapsed >= totalDuration) {
                // Ensure final fuel matches expected ending fuel
                const finalExpectedTotal = gameState.warpExpectedEndingFuel;
                const currentTotal = gameState.ships.reduce((sum, s) => sum + s.fuel, 0);
                const finalAdjustment = finalExpectedTotal - currentTotal;
                
                if (Math.abs(finalAdjustment) > 0) {
                    const totalFuel = gameState.ships.reduce((sum, s) => sum + s.fuel, 0);
                    if (totalFuel > 0) {
                        gameState.ships.forEach((ship) => {
                            const proportion = ship.fuel / totalFuel;
                            const shipAdjustment = finalAdjustment * proportion;
                            ship.fuel = Math.max(0, ship.fuel + shipAdjustment);
                        });
                    }
                }
                
                const finalFuel = gameState.ships.reduce((sum, s) => sum + s.fuel, 0);
                console.log('[WarpAnimation] Warp complete:', {
                    fuelConsumed: gameState.warpFuelCost,
                    finalFuel: Math.round(finalFuel),
                    expectedFinal: Math.round(finalExpectedTotal)
                });
                
                stop();
                if (typeof onComplete === 'function') {
                    onComplete(gameState, targetSystem);
                }
                return;
            }

            animationId = requestAnimationFrame(loop);
        };

        animationId = requestAnimationFrame(loop);
    }

    function stop() {
        isActive = false;
        fuelConsumedSoFar = 0;
        lastFuelLogTime = 0;
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    function buildParticles(count) {
        const particles = [];
        for (let i = 0; i < count; i++) {
            particles.push(spawnParticle());
        }
        return particles;
    }

    function spawnParticle() {
        // Random angle and starting position outside dead zone
        return {
            angle: Math.random() * Math.PI * 2,
            offset: INNER_DEAD_ZONE + Math.random() * (1 - INNER_DEAD_ZONE), // Start beyond dead zone
            depth: Math.random() * 0.8 - 0.4, // Random depth for variety
            spawnTime: Math.random() * 2000 // Stagger initial spawns
        };
    }

    function render(elapsedMs, totalDuration, gameState) {
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const viewWidth = grid.width;
        const viewHeight = grid.height - SpaceTravelConfig.PANEL_HEIGHT;
        const centerX = (viewWidth - 1) / 2;
        const centerY = (viewHeight - 1) / 2;
        const maxRadius = Math.max(2, Math.min(viewWidth, viewHeight) / 2);
        const aspectRatio = SpaceTravelShared.getCharacterAspectRatio(SpaceTravelConfig);
        console.log('[WarpAnimation] circles aspectRatio:', aspectRatio.toFixed(3), 'viewWidth:', viewWidth, 'viewHeight:', viewHeight, 'maxRadiusX:', maxRadius.toFixed(2), 'maxRadiusY (inverted):', (maxRadius / aspectRatio).toFixed(2));

        if (!lastTimestamp) {
            lastTimestamp = elapsedMs;
        }
        const dt = Math.min(0.05, Math.max(0, (elapsedMs - lastTimestamp) / 1000));
        lastTimestamp = elapsedMs;

        const t = Math.min(1, elapsedMs / totalDuration);
        const speed = BASE_SPEED + (SPEED_RAMP * t * t);

        const depthBuffer = RasterUtils.createDepthBuffer(viewWidth, viewHeight);

        SpaceTravelHud.renderHud({
            viewWidth,
            viewHeight,
            playerShip: gameState?.ships?.[0] || null,
            currentGameState: gameState,
            baseMaxSpeed: 0,
            maxSpeed: 0,
            boostActive: false,
            boostCooldownRemaining: 0,
            isPaused: false,
            laserEmptyTimestampMs: 0,
            boostNoFuelTimestampMs: 0,
            timestampMs: performance.now(),
            config: SpaceTravelConfig,
            helpers: {
                applyPauseColor: (color) => color,
                addHudText: (x, y, text, color) => UI.addText(x, y, text, color),
                getActiveTargetInfo: () => null
            },
            autoNavActive: false,
            suppressButtons: true,
            hideDestination: true,
            hideDistance: true,
            hideTime: true,
            speedOverrideText: '???',
            speedOverrideColor: COLORS.CYAN,
            onOptions: () => {} // No-op during warp animation
        });

        // Apply radial gradient tint using characters instead of canvas
        // Black in center, darker cyan at edges, intensifies throughout animation
        const tintAlpha = Math.min(1, elapsedMs / totalDuration);
        // REMOVED: Radial gradient tint - cleaner look with just lines

        // Render stochastic dust particles AFTER tint so lines appear on top
        // Vary particle frequency based on progress: start at 0.5x (sparse), ramp to 2.0x (dense)
        const frequencyMultiplier = 0.5 + (t * 1.5); // 0.5 at t=0, 2.0 at t=1
        
        streaks.forEach((particle, particleIndex) => {
            // Skip if not spawned yet
            if (elapsedMs < particle.spawnTime) {
                return;
            }

            // Dynamic frequency: skip particles based on progress
            // At start (t=0, freq=0.5): skip 50% of particles (only render every 2nd)
            // At end (t=1, freq=2.0): render all plus create virtual clones
            if (frequencyMultiplier < 1) {
                // Sparse phase: skip particles based on threshold
                const skipThreshold = 1 / frequencyMultiplier;
                if (particleIndex % Math.ceil(skipThreshold) !== 0) {
                    return; // Skip this particle
                }
            }

            const dirX = Math.cos(particle.angle);
            const dirY = Math.sin(particle.angle);
            
            // Perspective speed gradient: slower near dead zone (0.2x), medium in middle (1x), faster at edges (3x)
            // This creates a smooth acceleration as particles move from center to edge
            const normalizedDist = (particle.offset - INNER_DEAD_ZONE) / (1 - INNER_DEAD_ZONE);
            const speedMultiplier = 0.2 + (normalizedDist * normalizedDist * 2.8); // Quadratic curve for smooth gradient
            
            particle.offset += (speed * speedMultiplier * dt) / maxRadius;
            
            // Respawn particle if it goes off screen
            if (particle.offset > 1.3) {
                particle.angle = Math.random() * Math.PI * 2;
                particle.offset = INNER_DEAD_ZONE + Math.random() * 0.1; // Respawn just outside dead zone
                particle.depth = Math.random() * 0.8 - 0.4;
            }

            // Skip if still in dead zone
            if (particle.offset < INNER_DEAD_ZONE) {
                return;
            }

            const radiusAtParticle = particle.offset * maxRadius;
            
            // Draw short streak in direction of motion
            const startX = centerX + dirX * radiusAtParticle / aspectRatio;
            const startY = centerY + dirY * radiusAtParticle;
            const endX = centerX + dirX * (radiusAtParticle + PARTICLE_LENGTH) / aspectRatio;
            const endY = centerY + dirY * (radiusAtParticle + PARTICLE_LENGTH);

            const points = LineDrawer.drawLine(Math.round(startX), Math.round(startY), Math.round(endX), Math.round(endY), true, COLORS.CYAN);
            const symbol = SpaceTravelShared.getLineSymbolFromDirection(dirX, -dirY);
            
            // Fade based on distance: brighter near edges (simulates approaching fast)
            const fadeFactor = Math.min(1, normalizedDist * 1.2);
            const color = SpaceTravelShared.lerpColorHex('#003344', COLORS.CYAN, fadeFactor);
            
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                    UI.addText(point.x, point.y, symbol, color);
                }
            }
            
            // In dense phase, render some particles a second time with slightly offset angle
            if (frequencyMultiplier > 1) {
                const extraRenderChance = frequencyMultiplier - 1; // 0 to 1
                if (Math.random() < extraRenderChance) {
                    // Render a clone of this particle with a slight angular offset
                    const offsetAngle = (Math.random() - 0.5) * Math.PI / 4; // ±22.5 degrees
                    const cloneDirX = Math.cos(particle.angle + offsetAngle);
                    const cloneDirY = Math.sin(particle.angle + offsetAngle);
                    const cloneStartX = centerX + cloneDirX * radiusAtParticle / aspectRatio;
                    const cloneStartY = centerY + cloneDirY * radiusAtParticle;
                    const cloneEndX = centerX + cloneDirX * (radiusAtParticle + PARTICLE_LENGTH) / aspectRatio;
                    const cloneEndY = centerY + cloneDirY * (radiusAtParticle + PARTICLE_LENGTH);
                    
                    const clonePoints = LineDrawer.drawLine(Math.round(cloneStartX), Math.round(cloneStartY), Math.round(cloneEndX), Math.round(cloneEndY), true, COLORS.CYAN);
                    const cloneSymbol = SpaceTravelShared.getLineSymbolFromDirection(cloneDirX, -cloneDirY);
                    
                    for (let i = 0; i < clonePoints.length; i++) {
                        const point = clonePoints[i];
                        if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                            UI.addText(point.x, point.y, cloneSymbol, color);
                        }
                    }
                }
            }
        });

        UI.draw();
    }

    return {
        show,
        stop
    };
})();
