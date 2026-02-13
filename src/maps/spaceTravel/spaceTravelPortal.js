/**
 * Space Travel Portal
 * Portal/warp navigation and rendering
 */

const SpaceTravelPortal = {
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

        params.portalActive = true;
        params.portalPosition = position;
        params.portalRadius = params.config.PORTAL_RADIUS_AU;
        params.portalOpenTimestampMs = timestampMs;
        params.portalCloseTimestampMs = timestampMs + (params.config.PORTAL_DURATION_MS || 5000);
        params.portalTargetSystem = targetSystem;
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

        const distance = ThreeDUtils.distance(params.playerShip.position, params.portalPosition);
        if (distance <= params.portalRadius) {
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

        const relative = ThreeDUtils.subVec(params.portalPosition, params.playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(params.playerShip.rotation));
        if (cameraSpace.z <= params.config.NEAR_PLANE) {
            return;
        }

        const aspectRatio = SpaceTravelShared.getCharacterAspectRatio(params.config);
        const charDims = UI.getCharDimensions();
        const expectedRadiusY = params.portalRadius / aspectRatio;  // INVERT: divide to make taller in character space
        const expectedRadiusYIfInverted = params.portalRadius * aspectRatio;
        console.log('[Portal] portalRadius:', params.portalRadius.toFixed(6), 'charDims:', charDims, 'aspectRatio (w/h):', aspectRatio.toFixed(3), 'radiusX:', params.portalRadius.toFixed(6), 'radiusY (inverted w/h):', expectedRadiusY.toFixed(6), 'radiusY (w/h):', expectedRadiusYIfInverted.toFixed(6),'radiusX/radiusY ratio:', (params.portalRadius / expectedRadiusY).toFixed(3));

        const segments = Math.max(8, params.config.PORTAL_SEGMENTS || 32);
        const radiusX = params.portalRadius;
        const radiusY = params.portalRadius / aspectRatio;  // INVERT: divide instead of multiply
        const step = (Math.PI * 2) / segments;
        
        // Rotation speed in radians per millisecond
        const rotationSpeed = Math.PI / 3000; // Full rotation in ~3 seconds
        const rotationOffset = (timestampMs % 6000) * rotationSpeed; // Loop every 6 seconds
        
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
                // Calculate smooth color gradient: cyan at 0°/180°, blue at 90°/270°
                const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const angleDeg = (normalizedAngle * 180 / Math.PI) % 360;
                
                // Use simplified angle (0-180°) due to symmetry
                const simpleAngle = angleDeg < 180 ? angleDeg : (360 - angleDeg);
                
                // Smooth interpolation: 0°=CYAN, 90°=BLUE, 180°=CYAN
                // Use continuous fade from cyan->blue->cyan
                let color = COLORS.CYAN;
                if (simpleAngle > 0 && simpleAngle < 180) {
                    const t = simpleAngle / 180; // 0 to 1 across 0-180°
                    const distFromPeak = Math.abs(t - 0.5) * 2; // 0 at 90°, 1 at edges
                    // Smooth step: more blue in middle (90°), more cyan at edges
                    const blueAmount = Math.cos(distFromPeak * Math.PI / 2); // Smooth cosine curve
                    // Use blue if blueAmount > 0.5, creating smooth transition
                    if (blueAmount > 0.3) {
                        color = blueAmount > 0.7 ? COLORS.BLUE : COLORS.CYAN;
                    }
                }
                
                RasterUtils.plotDepthText(depthBuffer, x, y, point.z, 'o', color);
            }
        }
    }
};
