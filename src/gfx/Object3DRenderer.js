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

    function getSingleCharShipArrow(object, rotation, playerShip) {
        const velocity = object?.velocity;
        const shipPos = object?.position;
        const playerPos = playerShip?.position;

        if (velocity && shipPos && playerPos) {
            const toShip = ThreeDUtils.subVec(shipPos, playerPos);
            const toShipLen = ThreeDUtils.vecLength(toShip);
            const speed = ThreeDUtils.vecLength(velocity);

            if (toShipLen > 0.000001 && speed > 0.000001) {
                const dirToShip = ThreeDUtils.scaleVec(toShip, 1 / toShipLen);
                const radialSpeed = ThreeDUtils.dotVec(velocity, dirToShip);
                const radialRatio = Math.abs(radialSpeed) / speed;
                const primaryRadialThreshold = 0.6;

                if (radialRatio >= primaryRadialThreshold) {
                    return radialSpeed >= 0 ? '▲' : '▼';
                }
            }
        }

        const shipForward = { x: 0, y: 0, z: -1 };
        const worldForward = ThreeDUtils.rotateVecByQuat(shipForward, rotation);
        const cameraForward = ThreeDUtils.rotateVecByQuat(worldForward, ThreeDUtils.quatConjugate(playerShip.rotation));
        return getFatArrow(cameraForward.x, cameraForward.z);
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

        const markShipMaskCell = (x, y) => {
            const mask = params.shipOccupancyMask;
            if (!mask) {
                return;
            }
            if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) {
                return;
            }
            mask[(y * viewWidth) + x] = 1;
        };

        const markShipMaskRect = (minX, maxX, minY, maxY) => {
            const mask = params.shipOccupancyMask;
            if (!mask) {
                return;
            }
            const startX = Math.max(0, Math.floor(Math.min(minX, maxX)));
            const endX = Math.min(viewWidth - 1, Math.ceil(Math.max(minX, maxX)));
            const startY = Math.max(0, Math.floor(Math.min(minY, maxY)));
            const endY = Math.min(viewHeight - 1, Math.ceil(Math.max(minY, maxY)));

            for (let y = startY; y <= endY; y++) {
                const rowOffset = y * viewWidth;
                for (let x = startX; x <= endX; x++) {
                    mask[rowOffset + x] = 1;
                }
            }
        };

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

        // Check for damage flash state
        const flashDuration = config.SHIP_FLASH_DURATION_MS || 1000;
        const flashCount = config.SHIP_FLASH_COUNT || 2;
        let isFlashing = false;
        let flashColor = null;

        if (object.flashStartMs && timestampMs) {
            const flashElapsed = timestampMs - object.flashStartMs;
            if (flashElapsed < flashDuration) {
                const flashPeriod = flashDuration / flashCount;
                const flashPhase = (flashElapsed % flashPeriod) / flashPeriod;
                if (flashPhase < 0.5) {
                    isFlashing = true;
                    flashColor = object.flashColor || '#ffffff';
                }
                if (!object._lastDamageFlashDebugMs || (timestampMs - object._lastDamageFlashDebugMs) > 120) {
                    console.log('[DamageFlash] Render state:', {
                        targetId: object.id || object.name || 'unknown',
                        timestampMs,
                        flashStartMs: object.flashStartMs,
                        flashElapsed,
                        flashDuration,
                        flashPhase,
                        isFlashing,
                        flashColor: object.flashColor || '#ffffff'
                    });
                    object._lastDamageFlashDebugMs = timestampMs;
                }
            } else {
                console.log('[DamageFlash] Flash expired:', {
                    targetId: object.id || object.name || 'unknown',
                    timestampMs,
                    flashStartMs: object.flashStartMs,
                    flashElapsed,
                    flashDuration,
                    lastColor: object.flashColor
                });
                delete object.flashStartMs;
                delete object.flashColor;
                delete object._lastDamageFlashDebugMs;
            }
        }

        // Check if ship is disabled (hull = 0)
        const isDisabled = (typeof object.hull === 'number' && object.hull <= 0);
        
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
                const arrow = getSingleCharShipArrow(object, rotation, playerShip);
                let color;
                if (isFlashing && flashColor) {
                    color = flashColor;
                } else if (isDisabled) {
                    color = '#777777';
                } else {
                    color = params.shipColor || (params.isAlly ? COLORS.GREEN : '#00ff00');
                }

                if (isFlashing) {
                    console.log('[DamageFlash] Symbol render color:', {
                        targetId: object.id || object.name || 'unknown',
                        color,
                        x,
                        y
                    });
                }
                
                RasterUtils.plotDepthText(depthBuffer, x, y, depth, arrow, color);
                markShipMaskCell(x, y);
                
                // Report picking information
                if (onPickInfo) {
                    onPickInfo({
                        object,
                        screenX: x,
                        screenY: y,
                        depth,
                        distance: dist,
                        pickRadius: 2
                    });
                }
            }
            return;
        }

        // Transform vertices to world space
        // Apply SHIP_SCREEN_SCALE for rendering magnification (so tiny ships are visible)
        const baseScreenScale = config.SHIP_SCREEN_SCALE || 50;
        let worldVertices = geometry.vertices.map(v => {
            // Scale for screen rendering magnification
            const scaled = ThreeDUtils.scaleVec(v, baseScreenScale);
            // Apply object's local rotation
            const rotated = ThreeDUtils.rotateVecByQuat(scaled, rotation);
            // Translate to object position
            return ThreeDUtils.addVec(rotated, position);
        });

        // Transform to camera space
        let cameraVertices = worldVertices.map(worldPos => {
            const relative = ThreeDUtils.subVec(worldPos, playerShip.position);
            return ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        });

        // Project vertices to screen space
        let projectedVertices = cameraVertices.map(cameraPos => {
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
                    const arrow = getSingleCharShipArrow(object, rotation, playerShip);
                const color = params.shipColor || (params.isAlly ? COLORS.GREEN : '#00ff00');
                    const symbolX = Math.round(projected.x);
                    const symbolY = Math.round(projected.y);
                    RasterUtils.plotDepthText(depthBuffer, symbolX, symbolY, depth, arrow, color);
                    markShipMaskCell(symbolX, symbolY);
                    
                    if (onPickInfo) {
                        onPickInfo({
                            object,
                            screenX: symbolX,
                            screenY: symbolY,
                            depth,
                            distance: dist,
                            pickRadius: 2
                        });
                    }
                }
                RasterUtils.flushDepthBuffer(depthBuffer);
                return;
            }

            // If this object is not in symbol mode, enforce a minimum projected size
            const minNonSymbolSize = config.SHIP_MIN_NON_SYMBOL_SIZE_CHARS || 3;
            if ((boundingWidth > 1 || boundingHeight > 1) &&
                (boundingWidth < minNonSymbolSize || boundingHeight < minNonSymbolSize)) {
                const widthSafe = Math.max(0.001, boundingWidth);
                const heightSafe = Math.max(0.001, boundingHeight);
                const requiredScale = Math.max(minNonSymbolSize / widthSafe, minNonSymbolSize / heightSafe);
                const maxScaleMult = config.SHIP_MIN_NON_SYMBOL_MAX_SCALE_MULT || 4;
                const appliedScale = Math.min(requiredScale, maxScaleMult);

                if (appliedScale > 1.0001) {
                    cameraVertices = cameraVertices.map(v => {
                        const offset = ThreeDUtils.subVec(v, cameraSpace);
                        return ThreeDUtils.addVec(cameraSpace, ThreeDUtils.scaleVec(offset, appliedScale));
                    });

                    projectedVertices = cameraVertices.map(cameraPos => {
                        if (cameraPos.z < config.NEAR_PLANE) {
                            return null;
                        }
                        return RasterUtils.projectCameraSpacePointRaw(cameraPos, viewWidth, viewHeight, config.VIEW_FOV);
                    });
                }
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

        // Sort by depth (farthest first for proper occlusion)
        visibleFaces.sort((a, b) => b.depth - a.depth);

        // Track bounding box for picking
        let shipBoundingBox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
        let hasBoundingBox = false;

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

            // Project ordered vertices to screen space for bounding box
            const projectedForBBox = ordered
                .map(v => RasterUtils.projectCameraSpacePointRaw(v, viewWidth, viewHeight, config.VIEW_FOV))
                .filter(p => p !== null);
            
            // Track projected vertices for bounding box
            projectedForBBox.forEach(v => {
                shipBoundingBox.minX = Math.min(shipBoundingBox.minX, v.x);
                shipBoundingBox.maxX = Math.max(shipBoundingBox.maxX, v.x);
                shipBoundingBox.minY = Math.min(shipBoundingBox.minY, v.y);
                shipBoundingBox.maxY = Math.max(shipBoundingBox.maxY, v.y);
            });
            hasBoundingBox = true;

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
                if (params.shipColor) {
                    faceColor = lerpColorHex('#111111', params.shipColor, clampedT);
                } else {
                    faceColor = lerpColorHex('#003300', '#00ff00', clampedT);
                }
            }

            if (isFlashing && (!object._lastDamageFlashFaceDebugMs || (timestampMs - object._lastDamageFlashFaceDebugMs) > 120)) {
                console.log('[DamageFlash] Geometry render color:', {
                    targetId: object.id || object.name || 'unknown',
                    faceColor,
                    depth,
                    minDepth,
                    maxDepth,
                    clampedT
                });
                object._lastDamageFlashFaceDebugMs = timestampMs;
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
            
            if (rasterResult && rasterResult.plotCount > 0) {
                faceRenderCount++;
            }
        });
        
        RasterUtils.flushDepthBuffer(depthBuffer);

        if (!isFlashing) {
            delete object._lastDamageFlashFaceDebugMs;
        }

        // Report geometry pick candidate (selection is resolved in spaceTravelRender)
        if (hasBoundingBox && onPickInfo) {
            const centerX = Math.round((shipBoundingBox.minX + shipBoundingBox.maxX) / 2);
            const centerY = Math.round((shipBoundingBox.minY + shipBoundingBox.maxY) / 2);
            const width = Math.max(1, shipBoundingBox.maxX - shipBoundingBox.minX);
            const height = Math.max(1, shipBoundingBox.maxY - shipBoundingBox.minY);
            const pickRadius = Math.max(2, Math.ceil(Math.max(width, height) * 0.5) + 1);

            onPickInfo({
                object,
                screenX: centerX,
                screenY: centerY,
                depth: minDepth,
                distance: dist,
                pickRadius,
                bbox: {
                    minX: shipBoundingBox.minX,
                    maxX: shipBoundingBox.maxX,
                    minY: shipBoundingBox.minY,
                    maxY: shipBoundingBox.maxY
                }
            });
        }

        if (hasBoundingBox) {
            markShipMaskRect(
                shipBoundingBox.minX,
                shipBoundingBox.maxX,
                shipBoundingBox.minY,
                shipBoundingBox.maxY
            );
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
