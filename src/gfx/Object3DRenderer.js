/**
 * Generic 3D Object Renderer
 * Renders arbitrary 3D geometry (ships, stations, etc) to the character grid
 */

const Object3DRenderer = (() => {
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

        if (params.isAlly) {
            console.log(`[Object3DRenderer] render() called for ally: pos=(${object.position.x.toFixed(1)}, ${object.position.y.toFixed(1)}, ${object.position.z.toFixed(6)}), viewport=${viewWidth}x${viewHeight}`);
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
            
            console.log(`[Object3DRenderer] Rendering small ship as symbol at screen (${x}, ${y}), size: 1x1 chars, depth: ${depth.toFixed(6)}, distance: ${dist.toFixed(2)} AU`);
            
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
        
        if (params.isAlly) {
            const validCameraVerts = cameraVertices.filter(v => v.z >= config.NEAR_PLANE).length;
            const validProjections = projectedVertices.filter(p => p !== null).length;
            console.log(`  ▲ Geometry: ${geometry.vertices.length} vertices → ${validCameraVerts} in camera bounds → ${validProjections} projected`);
            
            // Log projected vertex coordinates
            projectedVertices.forEach((proj, idx) => {
                if (proj) {
                    console.log(`    Vert ${idx}: screen (${proj.x.toFixed(2)}, ${proj.y.toFixed(2)})`);
                }
            });
        }

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
                    const color = params.isAlly ? COLORS.LIGHT_GREEN : '#00ff00';
                    
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

        // Calculate face normals in camera space for backface culling
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

                // Calculate depth (average Z of face vertices)
                const faceDepth = (v0.z + v1.z + v2.z) / vertexIndices.length;
                
                visibleFaces.push({
                    face: face,
                    indices: vertexIndices,
                    depth: faceDepth,
                    faceIdx: faceIdx
                });
            });
        }

        // Sort by depth (farthest first for proper occlusion)
        visibleFaces.sort((a, b) => b.depth - a.depth);

        if (params.isAlly && visibleFaces.length === 0 && geometry.faces && geometry.faces.length > 0) {
            console.log(`[Object3DRenderer] WARNING: No visible faces for escort! Geometry has ${geometry.faces.length} faces, all backface culled or off-screen`);
        }

        if (params.isAlly && visibleFaces.length > 0) {
            console.log(`[Object3DRenderer] Rendering ${visibleFaces.length} visible faces (of ${geometry.faces ? geometry.faces.length : 0} total)`);
        }

        // Render each visible face
        let faceRenderCount = 0;
        let totalEdgesToDraw = 0;
        visibleFaces.forEach(({ face, indices, depth, faceIdx }) => {
            const faceColor = face.color || COLORS.LIGHT_GREEN;
            
            // Get projected screen coordinates for this face's vertices
            const screenPoints = indices.map(idx => projectedVertices[idx]).filter(p => p !== null);
            
            if (screenPoints.length < 3) {
                return;
            }

            let edgeCount = 0;
            // Draw face edges using Bresenham line algorithm
            for (let i = 0; i < screenPoints.length; i++) {
                const p1 = screenPoints[i];
                const p2 = screenPoints[(i + 1) % screenPoints.length];
                
                if (!p1 || !p2) continue;

                const x1 = Math.round(p1.x);
                const y1 = Math.round(p1.y);
                const x2 = Math.round(p2.x);
                const y2 = Math.round(p2.y);
                
                if (params.isAlly) {
                    console.log(`  [Object3DRenderer] Face ${faceIdx} edge ${i}: screen (${p1.x.toFixed(2)}, ${p1.y.toFixed(2)}) → (${p2.x.toFixed(2)}, ${p2.y.toFixed(2)}) → rounded (${x1},${y1}) → (${x2},${y2})`);
                }

                // Draw line between vertices
                const linePoints = LineDrawer.drawLine(x1, y1, x2, y2, false, faceColor);
                totalEdgesToDraw += linePoints.length;
                let plotCount = 0;
                linePoints.forEach(point => {
                    if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                        RasterUtils.plotDepthText(depthBuffer, point.x, point.y, depth, point.symbol, faceColor);
                        plotCount++;
                    }
                });
                if (params.isAlly && plotCount > 0) {
                    console.log(`    ✓ Plotted ${plotCount}/${linePoints.length} points`);
                    edgeCount++;
                } else if (params.isAlly) {
                    console.log(`    ✗ All ${linePoints.length} points outside viewport`);
                }
            }
            
            if (params.isAlly && edgeCount > 0) {
                faceRenderCount++;
                console.log(`  ▲ Face ${faceIdx} (${screenPoints.length} vertices): rendered ${edgeCount} edges`);
            }

            // Optionally fill face (using lighter shade)
            // This is a simple approach - just render edges for now
        });
        
        if (params.isAlly && faceRenderCount === 0 && visibleFaces.length > 0) {
            console.log(`[Object3DRenderer] WARNING: ${visibleFaces.length} visible faces had no edges in screen bounds! (${totalEdgesToDraw} total edge points attempted)`);
        }
        
        if (params.isAlly) {
            console.log(`[Object3DRenderer] ✓ render() complete for ally: ${faceRenderCount} faces with visible edges`);
        }
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
