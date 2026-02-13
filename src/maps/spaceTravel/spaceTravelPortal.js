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

        const charDims = UI.getCharDimensions();
        const aspectFromMetrics = charDims.height / Math.max(0.000001, charDims.width);
        const aspectOverride = params.config.CHAR_CELL_ASPECT_RATIO;
        const resolvedAspect = (typeof aspectOverride === 'number' && Number.isFinite(aspectOverride))
            ? aspectOverride
            : aspectFromMetrics;

        const segments = Math.max(8, params.config.PORTAL_SEGMENTS || 32);
        const radiusX = params.portalRadius;
        const radiusY = params.portalRadius / resolvedAspect;
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
                // Calculate color based on angle
                // Cyan at top/bottom (0° and 180°), blue at left/right (90° and 270°)
                const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const angleDeg = (normalizedAngle * 180 / Math.PI) % 360;
                
                let color = COLORS.CYAN;
                // Smooth gradient: 0-45°=cyan, 45-90°=cyan→blue, 90-135°=blue, 135-180°=blue→cyan, etc.
                const intervalAngle = (angleDeg % 180); // 0-180 range (due to symmetry)
                if (intervalAngle > 45 && intervalAngle < 135) {
                    // Interpolate between cyan and blue
                    const t = (intervalAngle - 45) / 90; // 0-1
                    const midpoint = Math.abs(t - 0.5);
                    color = midpoint < 0.25 ? COLORS.BLUE : COLORS.CYAN;
                }
                
                RasterUtils.plotDepthText(depthBuffer, x, y, point.z, 'o', color);
            }
        }
    }
};
