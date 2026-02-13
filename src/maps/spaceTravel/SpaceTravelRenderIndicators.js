const SpaceTravelRenderIndicators = (() => {
    function renderDestinationIndicator({ viewWidth, viewHeight, playerShip, localDestination, currentgameState, config, addHudText, getActiveTargetInfo, timestampMs, mapInstance }) {
        const logNow = timestampMs || performance.now();
        const targetInfo = getActiveTargetInfo();
        if (!targetInfo || !targetInfo.position) {
            return;
        }

        const toTarget = ThreeDUtils.subVec(targetInfo.position, playerShip.position);
        const distance = ThreeDUtils.vecLength(toTarget);

        if (!Number.isFinite(distance) || distance <= 0.0001) {
            return;
        }

        // Project target onto screen space
        const relative = toTarget;
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        
        let projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
        
        // Check if target is on-screen (before any clamping)
        const isOnScreen = projected 
            && cameraSpace.z > config.NEAR_PLANE 
            && projected.x >= 0 
            && projected.x < viewWidth 
            && projected.y >= 0 
            && projected.y < viewHeight;

        // If on-screen and in front of camera, show label instead of arrow
        if (isOnScreen) {
            const targetName = targetInfo.name || 'Target';
            const labelX = Math.round(projected.x);
            const labelY = Math.round(projected.y);
            
            // Calculate object's approximate screen size
            // Similar logic to SpaceTravelRenderBodies
            const RADIUS_SCALE = 0.8;
            const MIN_RADIUS = 0.5;
            const depth = cameraSpace.z;
            const charDims = UI.getCharDimensions?.() || { width: 8, height: 16 };
            const charAspect = charDims.height / charDims.width;
            const viewPixelWidth = viewWidth * charDims.width;
            const fovScale = Math.tan(config.VIEW_FOV / 2);
            const pixelsPerUnit = viewPixelWidth / (2 * fovScale * depth);
            
            // Get body radius from localDestination if available, otherwise use default
            let objectRadiusChars = 0;
            if (targetInfo.position && playerShip.position) {
                // Try to get actual world radius from the body object (station, planet, etc)
                const worldRadius = localDestination?.radiusAU || targetInfo.radius || 5;
                const radiusPx = Math.abs(worldRadius * pixelsPerUnit * RADIUS_SCALE);
                objectRadiusChars = Math.max(0, Math.round(radiusPx / charDims.width));
            }
            
            // Try to place label 1 character above the object, fall back to below
            let displayY = labelY - objectRadiusChars - 1;
            if (displayY < 0) {
                displayY = labelY + objectRadiusChars + 1;
            }
            if (displayY >= viewHeight) {
                displayY = labelY - objectRadiusChars - 1;
            }
            
            // Center label horizontally around object
            const labelWidth = targetName.length;
            let displayX = labelX - Math.floor(labelWidth / 2);
            displayX = Math.max(0, Math.min(viewWidth - labelWidth, displayX));
            
            if (displayX >= 0 && displayX + labelWidth <= viewWidth && displayY >= 0 && displayY < viewHeight) {
                addHudText(displayX, displayY, targetName, COLORS.CYAN);
                
                // Log detailed positioning info
                if (mapInstance && logNow - (mapInstance.lastLabelPosLogMs || 0) >= 1000) {
                    console.log('[LabelPositioning]', {
                        targetName,
                        centerX: labelX,
                        centerY: labelY,
                        objectRadiusChars,
                        displayX,
                        displayY,
                        labelWidth,
                        depth: Number(depth.toFixed(2)),
                        pixelsPerUnit: Number(pixelsPerUnit.toFixed(2)),
                        viewWidth,
                        viewHeight,
                        charWidth: charDims.width,
                        charHeight: charDims.height,
                        worldRadiusAU: localDestination?.radiusAU || 'undefined',
                        targetInfoRadius: targetInfo.radius || 'undefined'
                    });
                    mapInstance.lastLabelPosLogMs = logNow;
                }
            }

            // Suppress spam logging - will add detailed positioning debug logs instead
            // if (mapInstance && logNow - (mapInstance.lastIndicatorLogMs || 0) >= 1000) {
            //     console.log('[NavIndicator]', {
            //         status: 'label_rendered',
            //         x: labelX,
            //         y: labelY,
            //         distance: Number(distance.toFixed(3)),
            //         targetName
            //     });
            //     mapInstance.lastIndicatorLogMs = logNow;
            // }
            return;
        }
        
        // If off-screen or behind camera, clamp to edge and show arrow
        if (!projected || cameraSpace.z <= config.NEAR_PLANE) {
            // Project onto near plane for clamping
            const forwardPlane = config.NEAR_PLANE;
            const scale = forwardPlane / Math.max(Math.abs(cameraSpace.z || forwardPlane), 0.0001);
            projected = RasterUtils.projectCameraSpacePointRaw(
                {
                    x: cameraSpace.x * scale,
                    y: cameraSpace.y * scale,
                    z: forwardPlane
                },
                viewWidth,
                viewHeight,
                config.VIEW_FOV
            );
        }
        
        if (!projected) {
            return;
        }

        // Clamp to screen edge
        let x = Math.round(projected.x);
        let y = Math.round(projected.y);
        
        const margin = 2;
        const minX = margin;
        const maxX = viewWidth - margin - 1;
        const minY = margin;
        const maxY = viewHeight - margin - 1;
        
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));

        // Get directional arrow based on camera space direction
        const directionForward = ThreeDUtils.rotateVecByQuat(toTarget, ThreeDUtils.quatConjugate(playerShip.rotation));
        const arrow = SpaceTravelShared.getDirectionalArrow(directionForward.x, directionForward.y);

        // Render arrow in cyan
        if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
            addHudText(x, y, arrow, COLORS.CYAN);
        }

        // Suppress spam logging
        // if (mapInstance && logNow - (mapInstance.lastIndicatorLogMs || 0) >= 1000) {
        //     console.log('[NavIndicator]', {
        //         status: 'arrow_rendered',
        //         x,
        //         y,
        //         distance: Number(distance.toFixed(3)),
        //         arrow,
        //         directionX: Number(directionForward.x.toFixed(3)),
        //         directionY: Number(directionForward.y.toFixed(3))
        //     });
        //     mapInstance.lastIndicatorLogMs = logNow;
        // }
    }

    return {
        renderDestinationIndicator
    };
})();
