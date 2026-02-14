const SpaceTravelRenderIndicators = (() => {
    /**
     * Generalized nav arrow rendering for any off-screen object
     * @param {Object} params - { position, name, color, viewWidth, viewHeight, playerShip, config, addHudText }
     */
    function renderNavArrow({ position, name, color, viewWidth, viewHeight, playerShip, config, addHudText }) {
        if (!position || !playerShip) {
            return { rendered: false };
        }

        const toTarget = ThreeDUtils.subVec(position, playerShip.position);
        const distance = ThreeDUtils.vecLength(toTarget);

        if (!Number.isFinite(distance) || distance <= 0.0001) {
            return { rendered: false };
        }

        // Project target onto screen space
        const relative = toTarget;
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        
        let projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
        
        // Check if target is on-screen
        const isOnScreen = projected 
            && cameraSpace.z > config.NEAR_PLANE 
            && projected.x >= 0 
            && projected.x < viewWidth 
            && projected.y >= 0 
            && projected.y < viewHeight;

        // Only render arrow if off-screen
        if (isOnScreen) {
            return { rendered: false, reason: 'on-screen' };
        }
        
        // If off-screen or behind camera, project onto near plane for direction calculation
        if (!projected || cameraSpace.z <= config.NEAR_PLANE) {
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
            return { rendered: false, reason: 'projection-failed' };
        }

        // Find where ray from center to target intersects screen edge
        const centerX = viewWidth / 2;
        const centerY = viewHeight / 2;
        const margin = 0;  // Allow arrows to touch the edge
        const minX = margin;
        const maxX = viewWidth - margin - 1;
        const minY = margin;
        const maxY = viewHeight - margin - 1;
        
        // Direction vector from center to target (in screen space)
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
        let t = Infinity;
        
        if (dx > 0) {
            const tRight = (maxX - centerX) / dx;
            if (tRight > 0 && tRight < t) t = tRight;
        }
        if (dx < 0) {
            const tLeft = (minX - centerX) / dx;
            if (tLeft > 0 && tLeft < t) t = tLeft;
        }
        if (dy > 0) {
            const tBottom = (maxY - centerY) / dy;
            if (tBottom > 0 && tBottom < t) t = tBottom;
        }
        if (dy < 0) {
            const tTop = (minY - centerY) / dy;
            if (tTop > 0 && tTop < t) t = tTop;
        }
        
        if (t >= Infinity) {
            return { rendered: false, reason: 'no-intersection' };
        }

        const x = Math.round(centerX + dx * t);
        const y = Math.round(centerY + dy * t);

        // Use screen-space dx/dy for arrow direction, but negate dy to convert from screen coords to math coords
        // (in screen space, +Y is DOWN, but arrows assume +Y is UP)
        const arrow = SpaceTravelShared.getDirectionalArrow(dx, -dy);

        // Render arrow
        if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
            addHudText(x, y, arrow, color || COLORS.CYAN);

            return { rendered: true, x, y, arrow };
        }

        return { rendered: false, reason: 'out-of-bounds' };
    }

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

        // Use generalized nav arrow rendering
        renderNavArrow({
            position: targetInfo.position,
            name: targetInfo.name,
            color: COLORS.CYAN,
            viewWidth,
            viewHeight,
            playerShip,
            config,
            addHudText
        });
    }

    /**
     * Render nav arrows for all off-screen escort ships
     */
    function renderEscortArrows({ escortShips, viewWidth, viewHeight, playerShip, config, addHudText }) {
        if (!escortShips || escortShips.length === 0) {
            return;
        }

        escortShips.forEach((escort, index) => {
            if (!escort || !escort.position) {
                return;
            }

            renderNavArrow({
                position: escort.position,
                name: `Escort ${index + 1}`,
                color: COLORS.GREEN,
                viewWidth,
                viewHeight,
                playerShip,
                config,
                addHudText
            });
        });
    }

    return {
        renderDestinationIndicator,
        renderEscortArrows
    };
})();
