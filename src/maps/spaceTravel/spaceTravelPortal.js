/**
 * Space Travel Portal
 * Portal/warp navigation and rendering
 */

const SpaceTravelPortal = {
    getState(params) {
        if (!params) {
            return null;
        }
        return {
            portalActive: !!params.portalActive,
            portalPosition: params.portalPosition ? { ...params.portalPosition } : null,
            portalRadius: params.portalRadius || 0,
            portalOpenTimestampMs: params.portalOpenTimestampMs || 0,
            portalCloseTimestampMs: params.portalCloseTimestampMs || 0,
            portalTargetSystem: params.portalTargetSystem || null,
            portalPausedTimestampMs: params.portalPausedTimestampMs || 0
        };
    },

    getExpansionProgress(params, timestampMs) {
        const durationMs = Math.max(1, params.config.PORTAL_EXPAND_DURATION_MS || 2000);
        const effectiveTimestampMs = params.isPaused && params.portalPausedTimestampMs
            ? params.portalPausedTimestampMs
            : timestampMs;
        const openTimestampMs = params.portalOpenTimestampMs || effectiveTimestampMs;
        const elapsedMs = Math.max(0, effectiveTimestampMs - openTimestampMs);
        return Math.min(1, elapsedMs / durationMs);
    },

    getCurrentRadius(params, timestampMs) {
        if (!params.portalActive) {
            return 0;
        }
        const progress = this.getExpansionProgress(params, timestampMs);
        const maxRadius = params.config.PORTAL_RADIUS_AU;
        return maxRadius * progress;
    },

    getEffectiveTimestamp(params, timestampMs) {
        return (params.isPaused && params.portalPausedTimestampMs)
            ? params.portalPausedTimestampMs
            : timestampMs;
    },

    /**
     * Validate if portal can be spawned at this location
     * Check for collisions with stars, planets, and stations
     * @param {Object} params - Synthesized object containing state and config
     * @param {Vec3} position - Proposed portal position
     * @returns {string|null} - Error message if invalid, null if valid
     */
    validateSpawn(params, position) {
        if (!params.targetSystem || !params.currentGameState || !position) {
            return null;
        }

        const portalRadius = params.config.PORTAL_RADIUS_AU || 0;
        const minBaseDistance = typeof params.config.PORTAL_MIN_SPAWN_DISTANCE_AU === 'number'
            ? params.config.PORTAL_MIN_SPAWN_DISTANCE_AU
            : (portalRadius * 2);
        const systemCenter = {
            x: params.targetSystem.x * params.config.LY_TO_AU,
            y: params.targetSystem.y * params.config.LY_TO_AU,
            z: 0
        };
        const bodyScale = typeof params.config.SYSTEM_BODY_PHYSICS_SCALE === 'number'
            ? params.config.SYSTEM_BODY_PHYSICS_SCALE
            : 1;
        const stationScale = typeof params.config.STATION_PHYSICS_SCALE === 'number'
            ? params.config.STATION_PHYSICS_SCALE
            : 1;
        const stationRadiusMult = typeof params.config.STATION_COLLISION_RADIUS_MULT === 'number'
            ? params.config.STATION_COLLISION_RADIUS_MULT
            : 1;
        const getRequiredDistance = (radiusAU, scale) => {
            const scaledRadius = Math.max(0, radiusAU || 0) * scale;
            return Math.max(minBaseDistance, scaledRadius + portalRadius);
        };

        // Check distance to all stars
        if (Array.isArray(params.targetSystem.stars)) {
            for (const star of params.targetSystem.stars) {
                const starOrbit = star.orbit ? SystemOrbitUtils.getOrbitPosition(star.orbit, params.currentGameState.date) : { x: 0, y: 0, z: 0 };
                const starPos = ThreeDUtils.addVec(systemCenter, starOrbit);
                const dist = ThreeDUtils.distance(position, starPos);
                const requiredDistance = getRequiredDistance(star.radiusAU, bodyScale);
                if (dist < requiredDistance) {
                    console.log('[Portal] Validation FAILED: Too close to star', star.name, 'distance:', dist.toFixed(3), 'min:', requiredDistance.toFixed(3));
                    return 'Cannot place warp portal here';
                }
            }
        }

        // Check distance to all planets
        if (Array.isArray(params.targetSystem.planets)) {
            for (const planet of params.targetSystem.planets) {
                const planetOrbit = planet.orbit ? SystemOrbitUtils.getOrbitPosition(planet.orbit, params.currentGameState.date) : { x: 0, y: 0, z: 0 };
                const planetPos = ThreeDUtils.addVec(systemCenter, planetOrbit);
                const dist = ThreeDUtils.distance(position, planetPos);
                const requiredDistance = getRequiredDistance(planet.radiusAU, bodyScale);
                if (dist < requiredDistance) {
                    console.log('[Portal] Validation FAILED: Too close to planet', planet.name, 'distance:', dist.toFixed(3), 'min:', requiredDistance.toFixed(3));
                    return 'Cannot place warp portal here';
                }
            }
        }

        // Check distance to station
        if (params.currentStation) {
            const stationPos = params.currentStation.position || params.currentStation.positionWorld;
            if (stationPos) {
                const dist = ThreeDUtils.distance(position, stationPos);
                const stationRadius = params.currentStation.radiusAU || params.currentStation.size || 0;
                const requiredDistance = getRequiredDistance(stationRadius, stationScale * stationRadiusMult);
                if (dist < requiredDistance) {
                    console.log('[Portal] Validation FAILED: Too close to station, distance:', dist.toFixed(3), 'min:', requiredDistance.toFixed(3));
                    return 'Cannot place warp portal here';
                }
            }
        }

        console.log('[Portal] Validation PASSED');
        return null;
    },

    /**
     * Open a travel portal
     * @param {Object} params - Synthesized object containing state and config
     * @param {Object} targetSystem - Target system to warp to
     * @param {number} timestampMs - Current timestamp
     */
    open(params, targetSystem, timestampMs = performance.now()) {
        if (!params.playerShip || !targetSystem) {
            return;
        }
        const forward = ThreeDUtils.getLocalAxes(params.playerShip.rotation).forward;
        const distance = params.config.PORTAL_DISTANCE_AU;
        const position = ThreeDUtils.addVec(params.playerShip.position, ThreeDUtils.scaleVec(forward, distance));

        // Validate portal can be spawned here
        const validationError = this.validateSpawn(params, position);
        if (validationError) {
            console.log('[Portal] Spawn validation failed:', validationError);
            params.portalBlockMessage = validationError;
            params.portalBlockMessageTimestampMs = timestampMs;
            return;
        }

        params.portalActive = true;
        params.portalPosition = position;
        params.portalRadius = params.config.PORTAL_RADIUS_AU;
        params.portalOpenTimestampMs = timestampMs;
        params.portalCloseTimestampMs = timestampMs + (params.config.PORTAL_DURATION_MS || 5000);
        params.portalTargetSystem = targetSystem;
        params.portalBlockMessage = null;
        params.portalBlockMessageTimestampMs = null;
    },

    /**
     * Update portal state and check for arrival
     * @param {Object} params - Synthesized object with state
     * @param {number} timestampMs - Current timestamp
     * @returns {boolean} - True if warp was triggered
     */
    update(params, timestampMs) {
        if (!params.portalActive || !params.portalPosition || !params.portalTargetSystem) {
            return false;
        }

        const effectiveTimestampMs = this.getEffectiveTimestamp(params, timestampMs);
        const distance = ThreeDUtils.distance(params.playerShip.position, params.portalPosition);
        const currentRadius = this.getCurrentRadius(params, effectiveTimestampMs);
        if (currentRadius > 0 && distance <= currentRadius) {
            this.startWarp(params);
            return true;
        }

        return false;
    },

    /**
     * Initiate warp sequence
     * @param {Object} params - Synthesized object with all state
     */
    startWarp(params) {
        if (!params.portalTargetSystem || !params.currentGameState) {
            return;
        }

        const gameState = params.currentGameState;
        const previousIndex = gameState.currentSystemIndex;
        
        // Calculate fuel cost once for the entire warp journey
        const currentSystem = gameState.getCurrentSystem ? gameState.getCurrentSystem() : gameState.systems[gameState.currentSystemIndex];
        const navigationLevel = gameState.getMaxSkillLevel ? gameState.getMaxSkillLevel('navigation') : 0;
        
        let warpStartingFuel = 0;
        let warpExpectedEndingFuel = 0;
        let warpFuelCost = 0;
        
        if (currentSystem && params.portalTargetSystem) {
            const distance = Math.sqrt(
                Math.pow(params.portalTargetSystem.x - currentSystem.x, 2) + 
                Math.pow(params.portalTargetSystem.y - currentSystem.y, 2)
            );
            warpFuelCost = Ship.calculateFleetFuelCost(distance, gameState.ships.length, navigationLevel);
            warpStartingFuel = gameState.ships.reduce((sum, s) => sum + s.fuel, 0);
            warpExpectedEndingFuel = Math.max(0, warpStartingFuel - warpFuelCost);
            
            console.log('[Portal] Warp initiated:', {
                distance: distance.toFixed(3),
                fuelCost: warpFuelCost,
                startingFuel: warpStartingFuel,
                expectedEndingFuel: warpExpectedEndingFuel
            });
        }
        
        // Store warp parameters in gameState so warpAnimation can use them
        gameState.warpFuelCost = warpFuelCost;
        gameState.warpStartingFuel = warpStartingFuel;
        gameState.warpExpectedEndingFuel = warpExpectedEndingFuel;

        params.portalActive = false;
        params.portalPosition = null;
        params.portalTargetSystem = null;
        params.autoNavActive = false;
        params.autoNavInput = null;

        params.stop();

        WarpAnimation.show(gameState, params.portalTargetSystem, (state, destination) => {
            const targetIndex = state.systems.findIndex(system => system === destination || system.name === destination?.name);
            if (targetIndex >= 0) {
                if (typeof state.setCurrentSystem === 'function') {
                    state.setCurrentSystem(targetIndex);
                } else {
                    state.currentSystemIndex = targetIndex;
                }
            }
            state.previousSystemIndex = previousIndex;
            state.destination = null;
            state.localDestination = null;
            state.localDestinationSystemIndex = null;

            SpaceTravelMap.show(state, destination, {
                resetPosition: true,
                warpFadeOut: true
            });
        });
    },

    /**
     * Render portal visualization
     * @param {Object} params - Synthesized object with state and config
     * @param {Array} depthBuffer - Depth buffer for rendering
     * @param {number} viewWidth - View width in characters
     * @param {number} viewHeight - View height in characters
     * @param {number} timestampMs - Current timestamp
     */
    render(params, depthBuffer, viewWidth, viewHeight, timestampMs = performance.now()) {
        if (!params.portalActive || !params.portalPosition) {
            return;
        }

        const effectiveTimestampMs = this.getEffectiveTimestamp(params, timestampMs);

        const relative = ThreeDUtils.subVec(params.portalPosition, params.playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(params.playerShip.rotation));
        if (cameraSpace.z <= params.config.NEAR_PLANE) {
            return;
        }

        // Calculate portal expansion progress (2 second total expansion time)
        const expansionProgress = this.getExpansionProgress(params, effectiveTimestampMs);
        const maxRadius = params.config.PORTAL_RADIUS_AU;
        const currentRadius = this.getCurrentRadius(params, effectiveTimestampMs);
        if (expansionProgress < 1) {
            console.log('[Portal] Expansion:', {
                elapsedMs: Math.round(expansionProgress * (params.config.PORTAL_EXPAND_DURATION_MS || 2000)),
                progress: (expansionProgress * 100).toFixed(1) + '%',
                maxRadius: maxRadius.toFixed(4),
                currentRadius: currentRadius.toFixed(4)
            });
        }

        const aspectRatio = SpaceTravelShared.getCharacterAspectRatio(params.config);
        const expectedRadiusY = currentRadius / aspectRatio;  // INVERT: divide to make taller in character space
        console.log('[Portal] Render:', {
            radiusX: currentRadius.toFixed(6),
            radiusY: expectedRadiusY.toFixed(6),
            aspectRatio: aspectRatio.toFixed(3)
        });

        if (currentRadius <= 0) {
            return;
        }

        const segments = Math.max(8, params.config.PORTAL_SEGMENTS || 32);
        const radiusX = currentRadius;
        const radiusY = currentRadius / aspectRatio;  // INVERT: divide instead of multiply
        const step = (Math.PI * 2) / segments;
        
        // Rotation speed in radians per millisecond
        const rotationSpeed = Math.PI / 3000; // Full rotation in ~3 seconds
        const rotationOffset = (effectiveTimestampMs % 6000) * rotationSpeed; // Loop every 6 seconds
        
        for (let i = 0; i < segments; i++) {
            const angle = i * step + rotationOffset;
            const point = {
                x: cameraSpace.x + Math.cos(angle) * radiusX,
                y: cameraSpace.y + Math.sin(angle) * radiusY,
                z: cameraSpace.z
            };
            const projected = RasterUtils.projectCameraSpacePointRaw(point, viewWidth, viewHeight, params.config.VIEW_FOV);
            if (!projected) {
                continue;
            }
            const x = Math.round(projected.x);
            const y = Math.round(projected.y);
            if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
                // Smooth blend between cyan and blue; rotate colors opposite to ring motion
                const colorAngle = i * step - rotationOffset;
                const blendT = (Math.sin(colorAngle) + 1) / 2;
                const color = SpaceTravelShared.lerpColorHex(COLORS.CYAN, COLORS.BLUE, blendT);

                RasterUtils.plotDepthText(depthBuffer, x, y, point.z, 'o', color);
            }
        }

        this.applyTint(params, depthBuffer, viewWidth, viewHeight, effectiveTimestampMs);
    },

    applyTint(params, depthBuffer, viewWidth, viewHeight, timestampMs = performance.now()) {
        if (!params.portalActive || !params.portalPosition) {
            return;
        }

        const effectiveTimestampMs = this.getEffectiveTimestamp(params, timestampMs);
        const relative = ThreeDUtils.subVec(params.portalPosition, params.playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(params.playerShip.rotation));
        if (cameraSpace.z <= params.config.NEAR_PLANE) {
            return;
        }

        const aspectRatio = SpaceTravelShared.getCharacterAspectRatio(params.config);
        const expansionProgress = this.getExpansionProgress(params, effectiveTimestampMs);
        const currentRadius = this.getCurrentRadius(params, effectiveTimestampMs);
        if (currentRadius <= 0) {
            return;
        }

        const radiusX = currentRadius;
        const radiusY = currentRadius / aspectRatio;
        const portalCenter = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, params.config.VIEW_FOV);
        if (!portalCenter) {
            return;
        }
        const portalRight = RasterUtils.projectCameraSpacePointRaw({
            x: cameraSpace.x + radiusX,
            y: cameraSpace.y,
            z: cameraSpace.z
        }, viewWidth, viewHeight, params.config.VIEW_FOV);
        const portalUp = RasterUtils.projectCameraSpacePointRaw({
            x: cameraSpace.x,
            y: cameraSpace.y + radiusY,
            z: cameraSpace.z
        }, viewWidth, viewHeight, params.config.VIEW_FOV);
        if (!portalRight || !portalUp) {
            return;
        }

        const centerX = portalCenter.x;
        const centerY = portalCenter.y;
        const screenRadiusX = Math.max(0.5, Math.abs(portalRight.x - centerX));
        const screenRadiusY = Math.max(0.5, Math.abs(portalUp.y - centerY));
        const minX = Math.max(0, Math.floor(centerX - screenRadiusX));
        const maxX = Math.min(viewWidth - 1, Math.ceil(centerX + screenRadiusX));
        const minY = Math.max(0, Math.floor(centerY - screenRadiusY));
        const maxY = Math.min(viewHeight - 1, Math.ceil(centerY + screenRadiusY));
        const tintBase = typeof params.config.PORTAL_TINT_STRENGTH === 'number'
            ? params.config.PORTAL_TINT_STRENGTH
            : 0.6;
        const emptyBrightness = typeof params.config.PORTAL_EMPTY_BRIGHTNESS === 'number'
            ? params.config.PORTAL_EMPTY_BRIGHTNESS
            : 0.25;
        const tintStrength = Math.max(0, Math.min(1, tintBase * expansionProgress));

        const sampleChars = [];
        let linesDrawn = 0;
        let tintApplied = 0;
        let tintDepthBlocked = 0;
        let segmentsSkipped = 0;

        // First pass: Tint anything visible through the portal (stars, objects, etc.)
        for (let y = minY; y <= maxY; y++) {
            const dy = (y - centerY) / screenRadiusY;
            for (let x = minX; x <= maxX; x++) {
                const dx = (x - centerX) / screenRadiusX;
                if ((dx * dx) + (dy * dy) > 1) {
                    continue;
                }
                const index = y * depthBuffer.width + x;
                if (depthBuffer.depth[index] <= cameraSpace.z) {
                    tintDepthBlocked++;
                    continue;
                }
                
                // Tint existing content
                let color = depthBuffer.colors[index];
                if (!color || typeof color !== 'string' || color[0] !== '#') {
                    color = SpaceTravelShared.lerpColorHex('#000000', COLORS.TEXT_NORMAL, emptyBrightness);
                }
                depthBuffer.colors[index] = SpaceTravelShared.lerpColorHex(color, COLORS.CYAN, tintStrength);
                tintApplied++;
            }
        }

        // Second pass: Draw animated circular pulses of radial lines expanding outward
        const timeSeconds = effectiveTimestampMs / 1000;
        const maxRadiusScreen = Math.max(screenRadiusX, screenRadiusY);
        const innerDeadZone = 0.25; // 25% radius has no lines
        const outerClamp = 0.88; // Stop at 88% to ensure no overlap with edge
        const pulseCount = 3; // Number of concurrent pulses
        const pulseDensity = 8; // Characters per pulse ring
        const pulseSpeed = 0.5; // Speed of expansion (2x faster)
        const pulseSpacing = 1.0 / pulseCount; // Spacing between pulses
        
        for (let pulseIdx = 0; pulseIdx < pulseCount; pulseIdx++) {
            // Calculate phase for this pulse
            const pulsePhase = (timeSeconds * pulseSpeed + pulseIdx * pulseSpacing) % 1.0;
            
            // Progress from innerDeadZone to outerClamp
            const progress = innerDeadZone + pulsePhase * (outerClamp - innerDeadZone);
            
            // Skip if pulse is off-screen
            if (progress > outerClamp) continue;
            
            // Generate ring of individual characters at this distance
            for (let charIdx = 0; charIdx < pulseDensity; charIdx++) {
                // Even distribution around the circle
                const angle = (charIdx / pulseDensity) * Math.PI * 2;
                const cosAngle = Math.cos(angle);
                const sinAngle = Math.sin(angle);
                
                // Single character at this radial distance and angle
                const screenDist = progress * maxRadiusScreen;
                const px = centerX + cosAngle * screenDist;
                const py = centerY + sinAngle * screenDist;
                const x = Math.round(px);
                const y = Math.round(py);
                
                // Bounds check
                if (x < minX || x > maxX || y < minY || y > maxY) {
                    segmentsSkipped++;
                    continue;
                }

                // Additional circle check to prevent extending past portal edge
                const dx = (x - centerX) / screenRadiusX;
                const dy = (y - centerY) / screenRadiusY;
                if ((dx * dx) + (dy * dy) > 0.95) {
                    segmentsSkipped++;
                    continue;
                }

                const index = y * depthBuffer.width + x;

                // Depth check
                if (depthBuffer.depth[index] <= cameraSpace.z) {
                    continue;
                }

                // Brightness: fade in as pulse expands, stronger in middle
                const distFromCenter = (progress - innerDeadZone) / (outerClamp - innerDeadZone);
                const brightness = Math.max(0.4, 1.0 - Math.abs(pulsePhase - 0.5) * 0.8); // Peak brightness mid-pulse

                // Color: bright cyan fading slightly at edges
                const color = SpaceTravelShared.lerpColorHex(COLORS.CYAN, '#004466', distFromCenter * 0.3);

                // Use directional character based on angle
                const symbol = SpaceTravelShared.getLineSymbolFromDirection(cosAngle, -sinAngle);

                depthBuffer.chars[index] = symbol;
                depthBuffer.colors[index] = SpaceTravelShared.lerpColorHex(color, depthBuffer.colors[index] || '#000000', Math.min(1, tintStrength * brightness));
                linesDrawn++;

                if (sampleChars.length < 6) {
                    sampleChars.push({
                        x,
                        y,
                        char: symbol,
                        progress: Number(progress.toFixed(3)),
                        pulseIdx: pulseIdx,
                        distFromCenter: Number(distFromCenter.toFixed(3))
                    });
                }
            }
        }

        const logIntervalMs = 1000;
        if (effectiveTimestampMs - (params.portalTintLastLogMs || 0) >= logIntervalMs) {
            console.log('[PortalTint]', {
                tintStrength: Number(tintStrength.toFixed(3)),
                linesDrawn,
                tintApplied,
                depthBlocked: tintDepthBlocked,
                segmentsSkipped,
                pulseCount: pulseCount,
                pulseDensity: pulseDensity,
                innerDeadZone: innerDeadZone,
                outerClamp: outerClamp,
                radiusAU: Number(currentRadius.toFixed(6)),
                bounds: {
                    centerX: Number(centerX.toFixed(2)),
                    centerY: Number(centerY.toFixed(2)),
                    radiusX: Number(screenRadiusX.toFixed(2)),
                    radiusY: Number(screenRadiusY.toFixed(2))
                },
                samples: sampleChars
            });
            params.portalTintLastLogMs = effectiveTimestampMs;
        }

    }
};
