/**
 * Generic 3D Object Renderer
 * Renders arbitrary 3D geometry (ships, stations, etc) to the character grid
 */

const Object3DRenderer = (() => {
    /**
     * Linear interpolation between two hex colors
     */
    function lerpColorHex(a, b, t) {
        const aR = parseInt(a.slice(1, 3), 16);
        const aG = parseInt(a.slice(3, 5), 16);
        const aB = parseInt(a.slice(5, 7), 16);
        const bR = parseInt(b.slice(1, 3), 16);
        const bG = parseInt(b.slice(3, 5), 16);
        const bB = parseInt(b.slice(5, 7), 16);
        const r = Math.round(aR + (bR - aR) * t);
        const g = Math.round(aG + (bG - aG) * t);
        const b1 = Math.round(aB + (bB - aB) * t);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b1).toString(16).slice(1);
    }

    /**
     * Get fat arrow symbol based on direction (for small ship rendering)
     * @param {number} dx - Direction X component
     * @param {number} dy - Direction Y component (in screen space Y, not camera Y)
     * @returns {string} Arrow symbol (▲ ▶ ▼ ◀ ◥ ◤ ◣ ◢)
     */
    function getFatArrow(dx, dy) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag <= 0.000001) {
            return '▲'; // Default to forward
        }

        // Use degree-based logic for 8-directional arrows
        const angle = Math.atan2(dy, dx);
        const degrees = angle * (180 / Math.PI);
        
        // Map angles to symbols (0° = right, 90° = down, 180° = left, 270° = up)
        if (degrees >= -22.5 && degrees < 22.5) return '▶';        // Right
        else if (degrees >= 22.5 && degrees < 67.5) return '◢';   // Down-right
        else if (degrees >= 67.5 && degrees < 112.5) return '▼';  // Down
        else if (degrees >= 112.5 && degrees < 157.5) return '◣'; // Down-left
        else if (degrees >= 157.5 || degrees < -157.5) return '◀'; // Left
        else if (degrees >= -157.5 && degrees < -112.5) return '◤'; // Up-left
        else if (degrees >= -112.5 && degrees < -67.5) return '▲'; // Up
        else return '◥'; // Up-right (-67.5 to -22.5)
    }

    /**
     * Render a 3D object to the screen
     * @param {Object} params - Rendering parameters
     *   - object: { position, rotation, geometry }
     *   - playerShip: Player ship for camera reference
     *   - viewWidth, viewHeight: Screen dimensions in characters
     *   - config: SpaceTravelConfig
     *   - depthBuffer: Depth buffer for rendering
     *   - addHudText, getLineSymbol: UI functions
     *   - timestampMs: Current timestamp
     *   - isAlly: Whether this is an allied ship (for coloring)
     *   - mouseState: Optional mouse position for picking (with x, y fields)
     *   - onPickInfo: Optional callback for picking information
     */
    function render(params) {
        const {
            object,
            playerShip,
            viewWidth,
            viewHeight,
            config,
            depthBuffer,
            addHudText,
            getLineSymbol,
            timestampMs = 0,
            mouseState = null,
            onPickInfo = null
        } = params;

        if (!object || !object.geometry || !playerShip) {
            return;
        }

        const geometry = object.geometry;
        const position = object.position || { x: 0, y: 0, z: 0 };
        const rotation = object.rotation || { x: 0, y: 0, z: 0, w: 1 };

        // Check if object should render as single character (too small on screen)
        const relative = ThreeDUtils.subVec(position, playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        const dist = ThreeDUtils.vecLength(relative);
        
        // Calculate approximate screen size for the object
        const charDims = UI.getCharDimensions();
        const fovScale = Math.tan(ThreeDUtils.degToRad(config.VIEW_FOV) / 2);
        const viewPixelWidth = viewWidth * charDims.width;
        const depth = Math.max(0.000001, cameraSpace.z);
        const pixelsPerUnit = viewPixelWidth / (2 * fovScale * depth);
        
        // Estimate object size (use a typical ship size of ~0.5 AU)
        const estimatedSizeAU = 0.5;
        const sizePx = estimatedSizeAU * pixelsPerUnit;
        const sizeChars = Math.round(sizePx / charDims.width);
        
        // If too small, render as single character symbol
        if (sizeChars < 1) {
            const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
            if (!projected) {
                return;
            }
            
            const x = Math.round(projected.x);
            const y = Math.round(projected.y);
            
            if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
                // Calculate ship's forward direction in camera space
                const shipForward = { x: 0, y: 0, z: 1 }; // Ship's local forward
                const worldForward = ThreeDUtils.rotateVecByQuat(shipForward, rotation);
                const cameraForward = ThreeDUtils.rotateVecByQuat(worldForward, ThreeDUtils.quatConjugate(playerShip.rotation));
                
                // Use X (horizontal) and Z (vertical in screen space) for arrow direction
                const arrow = getFatArrow(cameraForward.x, cameraForward.z);
                const color = params.isAlly ? COLORS.GREEN : '#00ff00';
                
                RasterUtils.plotDepthText(depthBuffer, x, y, depth, arrow, color);
                
                // Report picking information
                if (onPickInfo && mouseState) {
                    onPickInfo({
                        object,
                        screenX: x,
                        screenY: y,
                        depth,
                        distance: dist
                    });
                }
            }
            return;
        }

        // Transform vertices to world space
        // Apply SHIP_SCREEN_SCALE for rendering magnification (so tiny ships are visible)
        const screenScale = params.isAlly ? (config.SHIP_SCREEN_SCALE || 50) : 1;
        const worldVertices = geometry.vertices.map(v => {
            // Scale for screen rendering magnification
            const scaled = ThreeDUtils.scaleVec(v, screenScale);
            // Apply object's local rotation
            const rotated = ThreeDUtils.rotateVecByQuat(scaled, rotation);
            // Translate to object position
            return ThreeDUtils.addVec(rotated, position);
        });

        // Transform to camera space
        const cameraVertices = worldVertices.map(worldPos => {
            const relative = ThreeDUtils.subVec(worldPos, playerShip.position);
            return ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        });

        // Project vertices to screen space
        const projectedVertices = cameraVertices.map(cameraPos => {
            if (cameraPos.z < config.NEAR_PLANE) {
                return null;
            }
            return RasterUtils.projectCameraSpacePointRaw(cameraPos, viewWidth, viewHeight, config.VIEW_FOV);
        });

        // Calculate bounding box of projected vertices
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let validProjections = 0;
        projectedVertices.forEach(proj => {
            if (proj) {
                minX = Math.min(minX, proj.x);
                maxX = Math.max(maxX, proj.x);
                minY = Math.min(minY, proj.y);
                maxY = Math.max(maxY, proj.y);
                validProjections++;
            }
        });
        
        // If all projected vertices fit within a single character, render as symbol instead of geometry
        if (validProjections > 0 && minX !== Infinity) {
            const boundingWidth = maxX - minX;
            const boundingHeight = maxY - minY;
            
            if (boundingWidth <= 1.0 && boundingHeight <= 1.0) {
                // Too small for geometry - render as single character symbol
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                const projected = { x: centerX, y: centerY };
                
                if (projected.x >= 0 && projected.x < viewWidth && projected.y >= 0 && projected.y < viewHeight) {
                    const shipForward = { x: 0, y: 0, z: 1 };
                    const worldForward = ThreeDUtils.rotateVecByQuat(shipForward, rotation);
                    const cameraForward = ThreeDUtils.rotateVecByQuat(worldForward, ThreeDUtils.quatConjugate(playerShip.rotation));
                    
                    const arrow = getFatArrow(cameraForward.x, cameraForward.z);
                const color = params.isAlly ? COLORS.GREEN : '#00ff00';
                    RasterUtils.plotDepthText(depthBuffer, Math.round(projected.x), Math.round(projected.y), depth, arrow, color);
                    
                    if (onPickInfo && mouseState) {
                        onPickInfo({
                            object,
                            screenX: Math.round(projected.x),
                            screenY: Math.round(projected.y),
                            depth,
                            distance: dist
                        });
                    }
                }
                RasterUtils.flushDepthBuffer(depthBuffer);
                return;
            }
        }

        // Calculate face depths and normals for rendering
        const visibleFaces = [];
        if (geometry.faces && Array.isArray(geometry.faces)) {
            geometry.faces.forEach((face, faceIdx) => {
                const vertexIndices = Array.isArray(face.vertices) ? face.vertices : face;
                
                // Need at least 3 vertices for a face
                if (vertexIndices.length < 3) {
                    return;
                }

                // Get camera space vertices for this face
                const v0 = cameraVertices[vertexIndices[0]];
                const v1 = cameraVertices[vertexIndices[1]];
                const v2 = cameraVertices[vertexIndices[2]];

                if (!v0 || !v1 || !v2) {
                    return;
                }

                // Calculate face normal using cross product
                const edge1 = ThreeDUtils.subVec(v1, v0);
                const edge2 = ThreeDUtils.subVec(v2, v0);
                const normal = {
                    x: edge1.y * edge2.z - edge1.z * edge2.y,
                    y: edge1.z * edge2.x - edge1.x * edge2.z,
                    z: edge1.x * edge2.y - edge1.y * edge2.x
                };

                // Backface culling: only render if normal points toward camera (z < 0 in camera space)
                if (normal.z >= 0) {
                    return;
                }

                // Calculate depth (average Z of all face vertices)
                let faceDepth = 0;
                vertexIndices.forEach(idx => {
                    const v = cameraVertices[idx];
                    if (v) faceDepth += v.z;
                });
                faceDepth /= vertexIndices.length;
                
                visibleFaces.push({
                    face: face,
                    indices: vertexIndices,
                    depth: faceDepth,
                    faceIdx: faceIdx,
                    normal: normal
                });
            });
        }

        // Calculate depth range for shading
        const faceDepths = visibleFaces.map(f => f.depth);
        const minDepth = faceDepths.length > 0 ? Math.min(...faceDepths) : 0;
        const maxDepth = faceDepths.length > 0 ? Math.max(...faceDepths) : 0;
        const depthRange = Math.max(0.000001, maxDepth - minDepth);

        // Check for damage flash state
        const flashDuration = config.SHIP_FLASH_DURATION_MS || 1000;
        const flashCount = config.SHIP_FLASH_COUNT || 2;
        let isFlashing = false;
        let flashColor = null;
        
        if (object.flashStartMs && timestampMs) {
            const flashElapsed = timestampMs - object.flashStartMs;
            if (flashElapsed < flashDuration) {
                // Calculate which flash cycle we're in
                const flashPeriod = flashDuration / flashCount;
                const currentFlash = Math.floor(flashElapsed / flashPeriod);
                const flashPhase = (flashElapsed % flashPeriod) / flashPeriod;
                
                // Flash on for half the period, off for half
                if (flashPhase < 0.5) {
                    isFlashing = true;
                    flashColor = object.flashColor || '#ffffff';
                }
            } else {
                // Flash complete, clear it
                delete object.flashStartMs;
                delete object.flashColor;
            }
        }
        
        // Check if ship is disabled (hull = 0)
        const isDisabled = (typeof object.hull === 'number' && object.hull <= 0);

        // Sort by depth (farthest first for proper occlusion)
        visibleFaces.sort((a, b) => b.depth - a.depth);

        // Render each visible face with filled polygons
        let faceRenderCount = 0;
        visibleFaces.forEach(({ face, indices, depth, faceIdx }) => {
            // Get camera space vertices for this face (for clipping)
            const cameraFace = indices.map(idx => cameraVertices[idx]).filter(v => v !== null);
            
            if (cameraFace.length < 3) {
                return;
            }

            // Clip to near plane
            const clipped = PolygonUtils.clipPolygonToNearPlane(cameraFace, config.NEAR_PLANE);
            if (clipped.length < 3) {
                return;
            }

            // Calculate normal for winding order
            const edge1 = ThreeDUtils.subVec(clipped[1], clipped[0]);
            const edge2 = ThreeDUtils.subVec(clipped[2], clipped[0]);
            const normal = {
                x: edge1.y * edge2.z - edge1.z * edge2.y,
                y: edge1.z * edge2.x - edge1.x * edge2.z,
                z: edge1.x * edge2.y - edge1.y * edge2.x
            };
            const normalLen = ThreeDUtils.vecLength(normal);
            if (normalLen === 0) return;

            let normalUnit = ThreeDUtils.scaleVec(normal, 1 / normalLen);
            let viewDot = normalUnit.z;
            
            // Build plane basis and order vertices
            const basis = PolygonUtils.buildPlaneBasis(normal);
            let ordered = PolygonUtils.orderPolygonVertices(clipped, basis);
            
            // Flip if facing away
            if (viewDot < 0) {
                ordered = ordered.slice().reverse();
            }

            // Calculate distance-based color (green tint)
            // Closest face = light green, farthest = dark green
            const depthT = 1 - ((depth - minDepth) / depthRange);
            const clampedT = Math.max(0, Math.min(1, depthT));
            
            // Determine base color based on ship state
            let faceColor;
            if (isFlashing && flashColor) {
                // Use flash color (white for shields, red for hull)
                faceColor = flashColor;
            } else if (isDisabled) {
                // Gray scale for disabled ships: closest = gray, farthest = dark gray
                faceColor = lerpColorHex('#333333', '#888888', clampedT);
            } else {
                // Normal green color range: dark green to light green
                faceColor = lerpColorHex('#003300', '#00ff00', clampedT);
            }
            
            // Render filled face
            const rasterResult = RasterUtils.rasterizeFaceDepth(
                depthBuffer,
                ordered,
                viewWidth,
                viewHeight,
                '█',
                faceColor,
                0,  // depth bias
                config.NEAR_PLANE,
                config.VIEW_FOV,
                'tri'  // fill mode
            );
            
            if (rasterResult && rasterResult.pointsDrawn > 0) {
                faceRenderCount++;
            }
        });
        
        RasterUtils.flushDepthBuffer(depthBuffer);
    }

    /**
     * Check if an object is on-screen
     */
    function isOnScreen(object, playerShip, viewWidth, viewHeight, config) {
        if (!object || !object.position || !playerShip) {
            return false;
        }

        const position = object.position;
        const relative = ThreeDUtils.subVec(position, playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));

        if (cameraSpace.z < config.NEAR_PLANE) {
            return false;
        }

        const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
        if (!projected) {
            return false;
        }

        // Add margin for off-screen rendering
        const margin = 5;
        return projected.x >= -margin && projected.x < viewWidth + margin &&
               projected.y >= -margin && projected.y < viewHeight + margin;
    }

    return {
        render,
        isOnScreen
    };
})();
