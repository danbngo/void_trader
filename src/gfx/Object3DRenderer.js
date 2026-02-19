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
                    return radialSpeed >= 0 ? '⮝' : '⮟';
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

        // Render ship to a local depth buffer first, then composite into scene depth buffer.
        // This isolates ship contour extraction from other scene geometry and stabilizes glyph output.
        const shipLocalDepthBuffer = RasterUtils.createDepthBuffer(viewWidth, viewHeight);
        const renderBuffer = shipLocalDepthBuffer;

        const compositeRenderBufferIntoScene = () => {
            if (!renderBuffer || renderBuffer === depthBuffer) {
                return;
            }

            const totalCells = renderBuffer.width * renderBuffer.height;
            for (let i = 0; i < totalCells; i++) {
                const symbol = renderBuffer.chars[i];
                if (!symbol) {
                    continue;
                }

                const x = i % renderBuffer.width;
                const y = Math.floor(i / renderBuffer.width);
                const z = renderBuffer.depth[i];
                const color = renderBuffer.colors[i];
                RasterUtils.plotDepthText(depthBuffer, x, y, z, symbol, color);
            }
        };

        if (!object || !object.geometry || !playerShip) {
            return;
        }

        const geometry = object.geometry;
        const position = object.position || { x: 0, y: 0, z: 0 };
        const rotation = object.rotation || { x: 0, y: 0, z: 0, w: 1 };
        const modelForwardCorrection = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI);
        const visualRotation = ThreeDUtils.quatMultiply(rotation, modelForwardCorrection);
        const shipRenderMode = (config.SHIP_RENDER_MODE || 'wireframe').toLowerCase();
        const wireframeAngleStepDeg = Math.max(0, config.SHIP_WIREFRAME_ANGLE_STEP_DEG || 0);
        const windshieldEnabled = config.SHIP_WINDSHIELD_ENABLED !== false;
        const windshieldInsetScale = Math.max(0.2, Math.min(0.9, config.SHIP_WINDSHIELD_INSET_SCALE || 0.58));
        const windshieldDepthBias = (typeof config.SHIP_WINDSHIELD_DEPTH_BIAS === 'number') ? config.SHIP_WINDSHIELD_DEPTH_BIAS : -0.00015;
        const windshieldColor = config.SHIP_WINDSHIELD_COLOR || '#3f3f3f';
        const windshieldEdgeFrontT = Math.max(0.02, Math.min(0.6, config.SHIP_WINDSHIELD_EDGE_FRONT_T || 0.10));
        const windshieldEdgeBackT = Math.max(windshieldEdgeFrontT + 0.05, Math.min(0.95, config.SHIP_WINDSHIELD_EDGE_BACK_T || 0.42));
        const windshieldSidePull = Math.max(0.5, Math.min(0.95, config.SHIP_WINDSHIELD_SIDE_PULL || 0.82));
        const engineTextureEnabled = config.SHIP_ENGINE_TEXTURE_ENABLED !== false;
        const engineTextureColor = config.SHIP_ENGINE_TEXTURE_COLOR || '#ff8a00';
        const engineTextureInsetScale = Math.max(0.2, Math.min(0.85, config.SHIP_ENGINE_TEXTURE_INSET_SCALE || 0.5));
        const engineTextureDepthBias = (typeof config.SHIP_ENGINE_TEXTURE_DEPTH_BIAS === 'number') ? config.SHIP_ENGINE_TEXTURE_DEPTH_BIAS : -0.00012;
        const edgeGlyphPostEnabled = (shipRenderMode !== 'wireframe') && (config.SHIP_EDGE_GLYPH_POSTPROCESS !== false);
        const edgeGlyphOutsideEnabled = config.SHIP_EDGE_GLYPH_OUTSIDE !== false;
        const shipGlyphSingleStage = config.SHIP_GLYPH_SINGLE_STAGE !== false;
        const shipGlyphInvariantChecks = config.SHIP_GLYPH_INVARIANTS !== false;
        const shipGlyphDisallowAdjacentSameTriangle = config.SHIP_GLYPH_DISALLOW_ADJACENT_SAME_TRIANGLE !== false;
        const shipGlyphDebug = config.SHIP_GLYPH_DEBUG === true;
        const shipGlyphDebugLogEveryMs = Math.max(0, config.SHIP_GLYPH_DEBUG_LOG_EVERY_MS || 500);

        const lerpVec = (a, b, t) => ({
            x: a.x + ((b.x - a.x) * t),
            y: a.y + ((b.y - a.y) * t),
            z: a.z + ((b.z - a.z) * t)
        });

        const getDepthTintedShipColor = (depthValue, minDepthValue, depthRangeValue) => {
            const depthT = 1 - ((depthValue - minDepthValue) / depthRangeValue);
            const clampedT = Math.max(0, Math.min(1, depthT));

            if (isFlashing && flashColor) {
                return flashColor;
            }
            if (isDisabled) {
                return lerpColorHex('#333333', '#888888', clampedT);
            }
            if (params.shipColor) {
                const darkTint = lerpColorHex('#000000', params.shipColor, 0.22);
                return lerpColorHex(darkTint, params.shipColor, clampedT);
            }
            return lerpColorHex('#003300', '#00ff00', clampedT);
        };

        const clipSegmentToNearPlane = (a, b, nearPlane) => {
            const aIn = a.z >= nearPlane;
            const bIn = b.z >= nearPlane;
            if (!aIn && !bIn) {
                return null;
            }
            if (aIn && bIn) {
                return { a, b };
            }

            const denom = (b.z - a.z);
            if (Math.abs(denom) < 0.000001) {
                return null;
            }
            const t = (nearPlane - a.z) / denom;
            const intersection = {
                x: a.x + ((b.x - a.x) * t),
                y: a.y + ((b.y - a.y) * t),
                z: nearPlane
            };

            return aIn ? { a, b: intersection } : { a: intersection, b };
        };

        const drawDepthEdge = (v0, v1, color) => {
            const clippedEdge = clipSegmentToNearPlane(v0, v1, config.NEAR_PLANE);
            if (!clippedEdge) {
                return;
            }

            const p0 = RasterUtils.projectCameraSpacePointRaw(clippedEdge.a, viewWidth, viewHeight, config.VIEW_FOV);
            const p1 = RasterUtils.projectCameraSpacePointRaw(clippedEdge.b, viewWidth, viewHeight, config.VIEW_FOV);
            if (!p0 || !p1) {
                return;
            }

            const dirX = p1.x - p0.x;
            const dirY = p1.y - p0.y;
            const baseAngle = Math.atan2(dirY, dirX);
            const stepRad = wireframeAngleStepDeg > 0 ? ThreeDUtils.degToRad(wireframeAngleStepDeg) : 0;
            const snappedAngle = stepRad > 0 ? (Math.round(baseAngle / stepRad) * stepRad) : baseAngle;
            const symbol = SpaceTravelShared.getLineSymbolFromDirection(Math.cos(snappedAngle), -Math.sin(snappedAngle));

            const deltaX = p1.x - p0.x;
            const deltaY = p1.y - p0.y;
            const steps = Math.max(1, Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaY))));

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = Math.round(p0.x + (deltaX * t));
                const y = Math.round(p0.y + (deltaY * t));
                if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) {
                    continue;
                }

                const z = clippedEdge.a.z + ((clippedEdge.b.z - clippedEdge.a.z) * t);
                if (RasterUtils.plotDepthText(depthBuffer, x, y, z, symbol, color)) {
                    shipBoundingBox.minX = Math.min(shipBoundingBox.minX, x);
                    shipBoundingBox.maxX = Math.max(shipBoundingBox.maxX, x);
                    shipBoundingBox.minY = Math.min(shipBoundingBox.minY, y);
                    shipBoundingBox.maxY = Math.max(shipBoundingBox.maxY, y);
                    hasBoundingBox = true;
                }
            }
        };

        const stylizeShipSilhouetteGlyphs = () => {
            if (!edgeGlyphPostEnabled || !hasBoundingBox) {
                return;
            }

            const width = renderBuffer.width;
            const height = renderBuffer.height;

            const idx = (x, y) => (y * width) + x;
            const occupied = new Set();
            const baseCells = [];

            let minX = width;
            let maxX = -1;
            let minY = height;
            let maxY = -1;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = idx(x, y);
                    const symbol = renderBuffer.chars[i];
                    if (!symbol) {
                        continue;
                    }

                    occupied.add(i);
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    if (symbol === '█') {
                        baseCells.push(i);
                    }
                }
            }

            if (occupied.size === 0 || baseCells.length === 0 || minX > maxX || minY > maxY) {
                return;
            }

            minX = Math.max(0, minX - 1);
            maxX = Math.min(width - 1, maxX + 1);
            minY = Math.max(0, minY - 1);
            maxY = Math.min(height - 1, maxY + 1);

            const exteriorEmpty = new Set();
            const queue = [];
            const enqueueExteriorIfEmpty = (x, y) => {
                if (x < minX || x > maxX || y < minY || y > maxY) {
                    return;
                }
                const i = idx(x, y);
                if (occupied.has(i) || exteriorEmpty.has(i)) {
                    return;
                }
                exteriorEmpty.add(i);
                queue.push({ x, y });
            };

            for (let x = minX; x <= maxX; x++) {
                enqueueExteriorIfEmpty(x, minY);
                enqueueExteriorIfEmpty(x, maxY);
            }
            for (let y = minY; y <= maxY; y++) {
                enqueueExteriorIfEmpty(minX, y);
                enqueueExteriorIfEmpty(maxX, y);
            }

            while (queue.length > 0) {
                const p = queue.shift();
                enqueueExteriorIfEmpty(p.x + 1, p.y);
                enqueueExteriorIfEmpty(p.x - 1, p.y);
                enqueueExteriorIfEmpty(p.x, p.y + 1);
                enqueueExteriorIfEmpty(p.x, p.y - 1);
            }

            const hasOccupied = (x, y) => {
                if (x < minX || x > maxX || y < minY || y > maxY) {
                    return false;
                }
                return occupied.has(idx(x, y));
            };

            const isExteriorEmpty = (x, y) => {
                if (x < minX || x > maxX || y < minY || y > maxY) {
                    return true;
                }
                return exteriorEmpty.has(idx(x, y));
            };

            const isTriangleGlyph = (glyph) => glyph === '◤' || glyph === '◥' || glyph === '◣' || glyph === '◢';

            const hasTriangleInteriorSupport = (glyph, x, y) => {
                if (glyph === '◢') return hasOccupied(x + 1, y) || hasOccupied(x, y + 1);
                if (glyph === '◣') return hasOccupied(x - 1, y) || hasOccupied(x, y + 1);
                if (glyph === '◤') return hasOccupied(x - 1, y) || hasOccupied(x, y - 1);
                if (glyph === '◥') return hasOccupied(x + 1, y) || hasOccupied(x, y - 1);
                return true;
            };

            const resolveFallbackGlyph = (x, y, originalGlyph) => {
                const n = hasOccupied(x, y - 1);
                const s = hasOccupied(x, y + 1);
                const w = hasOccupied(x - 1, y);
                const e = hasOccupied(x + 1, y);
                if (originalGlyph) {
                    return '█';
                }
                if (n && s && !w && !e) return '▌';
                if (w && e && !n && !s) return '▀';
                return null;
            };

            const candidateGlyphByIndex = new Map();
            const candidateSourceByIndex = new Map();
            const outsideDepthMetaByIndex = new Map();

            baseCells.forEach((cellIndex) => {
                const x = cellIndex % width;
                const y = Math.floor(cellIndex / width);
                const n = hasOccupied(x, y - 1);
                const s = hasOccupied(x, y + 1);
                const w = hasOccupied(x - 1, y);
                const e = hasOccupied(x + 1, y);
                const nOpen = isExteriorEmpty(x, y - 1);
                const sOpen = isExteriorEmpty(x, y + 1);
                const wOpen = isExteriorEmpty(x - 1, y);
                const eOpen = isExteriorEmpty(x + 1, y);
                const nwOpen = isExteriorEmpty(x - 1, y - 1);
                const neOpen = isExteriorEmpty(x + 1, y - 1);
                const swOpen = isExteriorEmpty(x - 1, y + 1);
                const seOpen = isExteriorEmpty(x + 1, y + 1);

                let glyph = null;
                if (nOpen && s && w && e && nwOpen !== neOpen) glyph = nwOpen ? '◢' : '◣';
                else if (sOpen && n && w && e && swOpen !== seOpen) glyph = swOpen ? '◥' : '◤';
                else if (wOpen && n && s && e && nwOpen !== swOpen) glyph = nwOpen ? '◢' : '◥';
                else if (eOpen && n && s && w && neOpen !== seOpen) glyph = neOpen ? '◣' : '◤';
                else if (nOpen && s && w && e) glyph = '▄';
                else if (sOpen && n && w && e) glyph = '▀';
                else if (wOpen && n && s && e) glyph = '▐';
                else if (eOpen && n && s && w) glyph = '▌';
                else if (nOpen && wOpen && s && e) glyph = '◢';
                else if (nOpen && eOpen && s && w) glyph = '◣';
                else if (sOpen && wOpen && n && e) glyph = '◥';
                else if (sOpen && eOpen && n && w) glyph = '◤';

                if (glyph) {
                    candidateGlyphByIndex.set(cellIndex, glyph);
                    candidateSourceByIndex.set(cellIndex, 'inside');
                }
            });

            if (edgeGlyphOutsideEnabled) {
                for (let y = minY; y <= maxY; y++) {
                    for (let x = minX; x <= maxX; x++) {
                        const i = idx(x, y);
                        if (occupied.has(i)) {
                            continue;
                        }
                        if (!exteriorEmpty.has(i)) {
                            continue;
                        }
                        if (renderBuffer.chars[i] || candidateGlyphByIndex.has(i)) {
                            continue;
                        }

                        const n = hasOccupied(x, y - 1);
                        const s = hasOccupied(x, y + 1);
                        const w = hasOccupied(x - 1, y);
                        const e = hasOccupied(x + 1, y);
                        const nw = hasOccupied(x - 1, y - 1);
                        const ne = hasOccupied(x + 1, y - 1);
                        const sw = hasOccupied(x - 1, y + 1);
                        const se = hasOccupied(x + 1, y + 1);

                        let glyph = null;
                        if (n && w && nw && !s && !e) glyph = '◤';
                        else if (n && e && ne && !s && !w) glyph = '◥';
                        else if (s && w && sw && !n && !e) glyph = '◣';
                        else if (s && e && se && !n && !w) glyph = '◢';

                        if (!glyph) {
                            continue;
                        }

                        const neighbors = [
                            { x: x, y: y - 1 },
                            { x: x, y: y + 1 },
                            { x: x - 1, y: y },
                            { x: x + 1, y: y }
                        ];

                        let neighborDepth = Infinity;
                        let neighborColor = null;
                        neighbors.forEach((p) => {
                            if (!hasOccupied(p.x, p.y)) {
                                return;
                            }
                            const ni = idx(p.x, p.y);
                            const nd = renderBuffer.depth[ni];
                            if (nd < neighborDepth) {
                                neighborDepth = nd;
                                neighborColor = renderBuffer.colors[ni];
                            }
                        });

                        if (!Number.isFinite(neighborDepth) || !neighborColor) {
                            continue;
                        }

                        candidateGlyphByIndex.set(i, glyph);
                        candidateSourceByIndex.set(i, 'outside');
                        outsideDepthMetaByIndex.set(i, {
                            depth: neighborDepth + 0.0002,
                            color: neighborColor
                        });
                    }
                }
            }

            if (shipGlyphInvariantChecks && candidateGlyphByIndex.size > 0) {
                const getCandidate = (x, y) => {
                    if (x < minX || x > maxX || y < minY || y > maxY) {
                        return null;
                    }
                    return candidateGlyphByIndex.get(idx(x, y)) || null;
                };

                const getCandidateSource = (x, y) => {
                    if (x < minX || x > maxX || y < minY || y > maxY) {
                        return null;
                    }
                    return candidateSourceByIndex.get(idx(x, y)) || null;
                };

                const resolvedCandidates = [];
                candidateGlyphByIndex.forEach((glyph, cellIndex) => {
                    const x = cellIndex % width;
                    const y = Math.floor(cellIndex / width);
                    const currentSource = candidateSourceByIndex.get(cellIndex) || 'inside';

                    if (!isTriangleGlyph(glyph)) {
                        resolvedCandidates.push([cellIndex, glyph]);
                        return;
                    }

                    const originalGlyph = renderBuffer.chars[cellIndex] || null;
                    const hasSupport = (currentSource !== 'outside') || hasTriangleInteriorSupport(glyph, x, y);

                    const adjacentSameGlyph = (
                        getCandidate(x - 1, y) === glyph ||
                        getCandidate(x + 1, y) === glyph ||
                        getCandidate(x, y - 1) === glyph ||
                        getCandidate(x, y + 1) === glyph
                    );

                    const adjacentOutsideSameGlyph = (
                        (getCandidate(x - 1, y) === glyph && getCandidateSource(x - 1, y) === 'outside') ||
                        (getCandidate(x + 1, y) === glyph && getCandidateSource(x + 1, y) === 'outside') ||
                        (getCandidate(x, y - 1) === glyph && getCandidateSource(x, y - 1) === 'outside') ||
                        (getCandidate(x, y + 1) === glyph && getCandidateSource(x, y + 1) === 'outside')
                    );

                    const adjacentInsideSameGlyph = (
                        (getCandidate(x - 1, y) === glyph && getCandidateSource(x - 1, y) !== 'outside') ||
                        (getCandidate(x + 1, y) === glyph && getCandidateSource(x + 1, y) !== 'outside') ||
                        (getCandidate(x, y - 1) === glyph && getCandidateSource(x, y - 1) !== 'outside') ||
                        (getCandidate(x, y + 1) === glyph && getCandidateSource(x, y + 1) !== 'outside')
                    );

                    let nextGlyph = glyph;
                    const shouldRejectSameTriangleChain = shipGlyphDisallowAdjacentSameTriangle && (
                        (currentSource === 'outside' && (adjacentSameGlyph || adjacentOutsideSameGlyph)) ||
                        (currentSource !== 'outside' && adjacentOutsideSameGlyph && !adjacentInsideSameGlyph)
                    );

                    if (!hasSupport || shouldRejectSameTriangleChain) {
                        nextGlyph = resolveFallbackGlyph(x, y, originalGlyph);
                        if (!nextGlyph) {
                            outsideDepthMetaByIndex.delete(cellIndex);
                        }
                    }

                    resolvedCandidates.push([cellIndex, nextGlyph]);
                });

                resolvedCandidates.forEach(([cellIndex, glyph]) => {
                    if (!glyph) {
                        candidateGlyphByIndex.delete(cellIndex);
                        candidateSourceByIndex.delete(cellIndex);
                        return;
                    }
                    candidateGlyphByIndex.set(cellIndex, glyph);
                });
            }

            candidateGlyphByIndex.forEach((glyph, cellIndex) => {
                renderBuffer.chars[cellIndex] = glyph;
                if (outsideDepthMetaByIndex.has(cellIndex)) {
                    const outsideMeta = outsideDepthMetaByIndex.get(cellIndex);
                    renderBuffer.depth[cellIndex] = outsideMeta.depth;
                    renderBuffer.colors[cellIndex] = outsideMeta.color;
                }
            });

            if (shipGlyphDebug) {
                const nowMs = timestampMs || 0;
                const lastMs = object._lastShipGlyphDebugMs || 0;
                if (shipGlyphDebugLogEveryMs === 0 || nowMs - lastMs >= shipGlyphDebugLogEveryMs) {
                    const counts = { block: 0, half: 0, tri: 0, other: 0 };
                    for (let y = minY; y <= maxY; y++) {
                        for (let x = minX; x <= maxX; x++) {
                            const symbol = renderBuffer.chars[idx(x, y)];
                            if (!symbol) continue;
                            if (symbol === '█') counts.block++;
                            else if (symbol === '▀' || symbol === '▄' || symbol === '▌' || symbol === '▐') counts.half++;
                            else if (isTriangleGlyph(symbol)) counts.tri++;
                            else counts.other++;
                        }
                    }

                    console.log('[ShipGlyphResolve] committed local glyphs', {
                        targetId: object.id || object.name || 'unknown',
                        bbox: { minX, maxX, minY, maxY },
                        counts
                    });
                    object._lastShipGlyphDebugMs = nowMs;
                }
            }
        };

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
                const arrow = getSingleCharShipArrow(object, visualRotation, playerShip);
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
                
                RasterUtils.plotDepthText(renderBuffer, x, y, depth, arrow, color);
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
            compositeRenderBufferIntoScene();
            return;
        }

        // Transform vertices to world space
        // Apply SHIP_SCREEN_SCALE for rendering magnification (so tiny ships are visible)
        const baseScreenScale = config.SHIP_SCREEN_SCALE || 50;
        let worldVertices = geometry.vertices.map(v => {
            // Scale for screen rendering magnification
            const scaled = ThreeDUtils.scaleVec(v, baseScreenScale);
            // Apply object's local rotation
            const rotated = ThreeDUtils.rotateVecByQuat(scaled, visualRotation);
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
                    const arrow = getSingleCharShipArrow(object, visualRotation, playerShip);
                const color = params.shipColor || (params.isAlly ? COLORS.GREEN : '#00ff00');
                    const symbolX = Math.round(projected.x);
                    const symbolY = Math.round(projected.y);
                    RasterUtils.plotDepthText(renderBuffer, symbolX, symbolY, depth, arrow, color);
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
                compositeRenderBufferIntoScene();
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

        // Render each visible face with filled polygons or wireframe edges
        let faceRenderCount = 0;
        if (shipRenderMode === 'wireframe') {
            const uniqueEdges = new Map();
            visibleFaces.forEach(({ indices }) => {
                for (let i = 0; i < indices.length; i++) {
                    const a = indices[i];
                    const b = indices[(i + 1) % indices.length];
                    const low = Math.min(a, b);
                    const high = Math.max(a, b);
                    uniqueEdges.set(`${low}:${high}`, { a: low, b: high });
                }
            });

            uniqueEdges.forEach(({ a, b }) => {
                const v0 = cameraVertices[a];
                const v1 = cameraVertices[b];
                if (!v0 || !v1) {
                    return;
                }
                const edgeDepth = (v0.z + v1.z) * 0.5;
                const edgeColor = getDepthTintedShipColor(edgeDepth, minDepth, depthRange);
                drawDepthEdge(v0, v1, edgeColor);
                faceRenderCount++;
            });
        } else {
            visibleFaces.forEach(({ face, indices, depth, faceIdx }) => {
            // Get camera space vertices for this face (for clipping)
            const cameraFace = indices.map(idx => cameraVertices[idx]).filter(v => v !== null);
            const isWindshieldFace = windshieldEnabled && !Array.isArray(face) && !!face.windshield;
            const isEngineTextureFace = engineTextureEnabled && !Array.isArray(face) && !!face.engineTexture;
            
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
            const faceColor = getDepthTintedShipColor(depth, minDepth, depthRange);

            if (isFlashing && (!object._lastDamageFlashFaceDebugMs || (timestampMs - object._lastDamageFlashFaceDebugMs) > 120)) {
                console.log('[DamageFlash] Geometry render color:', {
                    targetId: object.id || object.name || 'unknown',
                    faceColor,
                    depth,
                    minDepth,
                    maxDepth
                });
                object._lastDamageFlashFaceDebugMs = timestampMs;
            }
            
            // Single-stage ship glyph mode keeps face raster on full blocks and reserves
            // triangles/halfblocks for silhouette postprocess only.
            const useSubcellGlyphs = !shipGlyphSingleStage && (config.SHIP_FACE_SUBCELL_GLYPHS !== false);
            let rasterResult;
            if (useSubcellGlyphs && RasterUtils.rasterizeFaceDepthSubcell) {
                rasterResult = RasterUtils.rasterizeFaceDepthSubcell(
                    renderBuffer,
                    ordered,
                    viewWidth,
                    viewHeight,
                    faceColor,
                    0,
                    config.NEAR_PLANE,
                    config.VIEW_FOV
                );
            } else {
                rasterResult = RasterUtils.rasterizeFaceDepth(
                    renderBuffer,
                    ordered,
                    viewWidth,
                    viewHeight,
                    '█',
                    faceColor,
                    0,
                    config.NEAR_PLANE,
                    config.VIEW_FOV,
                    'tri'
                );
            }

            if ((!rasterResult || rasterResult.plotCount <= 0) && RasterUtils.rasterizeFaceDepth) {
                rasterResult = RasterUtils.rasterizeFaceDepth(
                    renderBuffer,
                    ordered,
                    viewWidth,
                    viewHeight,
                    '█',
                    faceColor,
                    0,
                    config.NEAR_PLANE,
                    config.VIEW_FOV,
                    'tri'
                );
            }
            
            if (rasterResult && rasterResult.plotCount > 0) {
                faceRenderCount++;
            }

            if (isWindshieldFace && ordered.length >= 3 && RasterUtils.rasterizeFaceDepth) {
                let windshieldPolygon = null;

                const faceIndices = Array.isArray(face.vertices) ? face.vertices : indices;
                const edge = Array.isArray(face.windshieldEdge) && face.windshieldEdge.length === 2 ? face.windshieldEdge : null;
                if (edge) {
                    const noseIndex = typeof face.windshieldNose === 'number' ? face.windshieldNose : edge[0];
                    const aftIndex = typeof face.windshieldAft === 'number' ? face.windshieldAft : edge[1];
                    const sideIndex = faceIndices.find(idx => idx !== noseIndex && idx !== aftIndex);
                    const noseVertex = cameraVertices[noseIndex];
                    const aftVertex = cameraVertices[aftIndex];
                    const sideVertex = (typeof sideIndex === 'number') ? cameraVertices[sideIndex] : null;

                    if (noseVertex && aftVertex && sideVertex) {
                        const edgeFront = lerpVec(noseVertex, aftVertex, windshieldEdgeFrontT);
                        const edgeBack = lerpVec(noseVertex, aftVertex, windshieldEdgeBackT);
                        const edgeMid = lerpVec(edgeFront, edgeBack, 0.5);
                        const sideInner = lerpVec(sideVertex, edgeMid, windshieldSidePull);
                        windshieldPolygon = [edgeFront, edgeBack, sideInner];
                    }
                }

                if (!windshieldPolygon) {
                    const faceCenter = ordered.reduce((acc, v) => ThreeDUtils.addVec(acc, v), { x: 0, y: 0, z: 0 });
                    faceCenter.x /= ordered.length;
                    faceCenter.y /= ordered.length;
                    faceCenter.z /= ordered.length;

                    windshieldPolygon = ordered.map(v => ({
                        x: faceCenter.x + ((v.x - faceCenter.x) * windshieldInsetScale),
                        y: faceCenter.y + ((v.y - faceCenter.y) * windshieldInsetScale),
                        z: faceCenter.z + ((v.z - faceCenter.z) * windshieldInsetScale)
                    }));
                }

                RasterUtils.rasterizeFaceDepth(
                    renderBuffer,
                    windshieldPolygon,
                    viewWidth,
                    viewHeight,
                    '█',
                    windshieldColor,
                    windshieldDepthBias,
                    config.NEAR_PLANE,
                    config.VIEW_FOV,
                    'tri'
                );
            }

            if (isEngineTextureFace && ordered.length >= 3 && RasterUtils.rasterizeFaceDepth) {
                const engineCenter = ordered.reduce((acc, v) => ThreeDUtils.addVec(acc, v), { x: 0, y: 0, z: 0 });
                engineCenter.x /= ordered.length;
                engineCenter.y /= ordered.length;
                engineCenter.z /= ordered.length;

                const enginePolygon = ordered.map(v => ({
                    x: engineCenter.x + ((v.x - engineCenter.x) * engineTextureInsetScale),
                    y: engineCenter.y + ((v.y - engineCenter.y) * engineTextureInsetScale),
                    z: engineCenter.z + ((v.z - engineCenter.z) * engineTextureInsetScale)
                }));

                RasterUtils.rasterizeFaceDepth(
                    renderBuffer,
                    enginePolygon,
                    viewWidth,
                    viewHeight,
                    '█',
                    engineTextureColor,
                    engineTextureDepthBias,
                    config.NEAR_PLANE,
                    config.VIEW_FOV,
                    'tri'
                );
            }
            });
        }
        
        stylizeShipSilhouetteGlyphs();
        compositeRenderBufferIntoScene();

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
