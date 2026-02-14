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
            
            // Calculate object's approximate screen size by projecting a point at object edge
            // This is more accurate than trying to calculate from world radius
            const PROJECTED_RADIUS_SCALE = 0.8;
            const depth = cameraSpace.z;
            const charDims = UI.getCharDimensions?.() || { width: 8, height: 16 };
            const viewPixelWidth = viewWidth * charDims.width;
            const fovScale = Math.tan(config.VIEW_FOV / 2);
            const pixelsPerUnit = viewPixelWidth / (2 * fovScale * Math.abs(depth));
            
            // Estimate object screen width by sampling from targetInfo
            let objectRadiusChars = 1;
            if (targetInfo.radiusAU !== undefined) {
                const radiusPx = targetInfo.radiusAU * pixelsPerUnit * PROJECTED_RADIUS_SCALE;
                objectRadiusChars = Math.max(2, Math.round(radiusPx / charDims.width));
            } else if (localDestination?.radiusAU !== undefined) {
                const radiusPx = localDestination.radiusAU * pixelsPerUnit * PROJECTED_RADIUS_SCALE;
                objectRadiusChars = Math.max(2, Math.round(radiusPx / charDims.width));
            } else {
                // Default: estimate as 2-3 chars for typical objects
                objectRadiusChars = 3;
            }
            
            // Place label with enough offset to clear the object
            // Use a minimum offset to ensure spacing
            const MIN_LABEL_OFFSET = 2;
            const offsetDistance = Math.max(MIN_LABEL_OFFSET, objectRadiusChars + 1);
            
            // Try to place above first, then below if too close to top
            let displayY = labelY - offsetDistance;
            if (displayY < 1) {
                displayY = labelY + offsetDistance;
            }
            // If still out of bounds, try to fit it
            if (displayY >= viewHeight - 1) {
                displayY = Math.max(1, viewHeight - 2);
            }
            
            // Center label horizontally under/over the object center
            const labelWidth = targetName.length;
            let displayX = labelX - Math.floor(labelWidth / 2);
            
            // Clamp to valid screen bounds
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
                        offsetDistance,
                        displayX,
                        displayY,
                        labelWidth,
                        depth: Number(depth.toFixed(2)),
                        pixelsPerUnit: Number(pixelsPerUnit.toFixed(2)),
                        viewWidth,
                        viewHeight,
                        charWidth: charDims.width,
                        charHeight: charDims.height,
                        worldRadiusAU: localDestination?.radiusAU || targetInfo.radiusAU || 'undefined'
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

        // Clamp to screen edge by projecting onto boundary
        // Find where the ray from center to target intersects the screen edge
        const centerX = viewWidth / 2;
        const centerY = viewHeight / 2;
        const margin = 2;
        const minX = margin;
        const maxX = viewWidth - margin - 1;
        const minY = margin;
        const maxY = viewHeight - margin - 1;
        
        // Direction vector from center to target
        let dx = projected.x - centerX;
        let dy = projected.y - centerY;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len > 0) {
            dx /= len;
            dy /= len;
        } else {
            dx = 1;
            dy = 0;
        }
        
        // Find intersection with screen boundary
        let x = centerX;
        let y = centerY;
        
        // Calculate t values for each edge intersection
        let t = Infinity;
        
        // Right edge (x = maxX)
        if (dx > 0) {
            const tRight = (maxX - centerX) / dx;
            if (tRight > 0 && tRight < t) {
                t = tRight;
            }
        }
        
        // Left edge (x = minX)
        if (dx < 0) {
            const tLeft = (minX - centerX) / dx;
            if (tLeft > 0 && tLeft < t) {
                t = tLeft;
            }
        }
        
        // Bottom edge (y = maxY)
        if (dy > 0) {
            const tBottom = (maxY - centerY) / dy;
            if (tBottom > 0 && tBottom < t) {
                t = tBottom;
            }
        }
        
        // Top edge (y = minY)
        if (dy < 0) {
            const tTop = (minY - centerY) / dy;
            if (tTop > 0 && tTop < t) {
                t = tTop;
            }
        }
        
        if (t < Infinity) {
            x = Math.round(centerX + dx * t);
            y = Math.round(centerY + dy * t);
        }

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
