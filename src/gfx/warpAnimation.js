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

        // Render stochastic dust particles
        streaks.forEach(particle => {
            // Skip if not spawned yet
            if (elapsedMs < particle.spawnTime) {
                return;
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
                    RasterUtils.plotDepthText(depthBuffer, point.x, point.y, particle.depth, symbol, color);
                }
            }
        });

        RasterUtils.flushDepthBuffer(depthBuffer);

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
        if (tintAlpha > 0) {
            const tintDepth = 0.5; // Render in front of most HUD elements but behind particles
            const maxRadiusChars = Math.max(centerX, centerY);
            
            // Render radial tint by placing characters at varying distances from center
            for (let y = 0; y < viewHeight; y++) {
                for (let x = 0; x < viewWidth; x++) {
                    // Calculate normalized distance from center (0 = center, 1 = edge)
                    const dx = (x - centerX) / maxRadiusChars;
                    const dy = (y - centerY) / maxRadiusChars;
                    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
                    const normalizedDist = Math.min(1, distFromCenter);
                    
                    // Determine tint intensity based on distance from center
                    // Full black in center, gradually transitioning to dark cyan at edges
                    let tintColor;
                    if (normalizedDist < 0.3) {
                        // Black center (0.0 - 0.3)
                        tintColor = COLORS.BLACK;
                    } else if (normalizedDist < 0.5) {
                        // Transition from black to very dark cyan (0.3 - 0.5)
                        const t = (normalizedDist - 0.3) / 0.2;
                        tintColor = SpaceTravelShared.lerpColorHex(COLORS.BLACK, '#001a22', t);
                    } else if (normalizedDist < 0.75) {
                        // Dark cyan (0.5 - 0.75)
                        const t = (normalizedDist - 0.5) / 0.25;
                        tintColor = SpaceTravelShared.lerpColorHex('#001a22', '#003344', t);
                    } else {
                        // Medium-dark cyan at edges (0.75 - 1.0)
                        const t = (normalizedDist - 0.75) / 0.25;
                        tintColor = SpaceTravelShared.lerpColorHex('#003344', '#005577', t);
                    }
                    
                    // Use semi-transparent overlay character (shade block with reduced opacity-like effect)
                    // Intensity increases with animation progress
                    const intensity = tintAlpha * 0.4 * (1 - normalizedDist * 0.3);
                    if (intensity > 0.05) {
                        UI.addText(x, y, '░', tintColor, intensity);
                    }
                }
            }
        }

        UI.draw();
    }

    return {
        show,
        stop
    };
})();
