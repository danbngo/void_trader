/**
 * Ship renderer (wireframe prototype)
 *
 * Legacy ASCII sprite logic has been intentionally disabled for now.
 * We can bring it back later, but current rendering uses canvas line drawing.
 */

const Object3DRenderer = (() => {
    const lastWireframeLogByShip = new Map();

    // Triangular rocket hull with elevated crest vertex and flat wings.
    // Local-space forward is -Z. Wing points sit on the same Y plane as base A/B.
    const FALLBACK_WIREFRAME_VERTICES = [
        { x: 0.0, y: 0.0, z: -1.9 },   // 0 nose
        { x: -0.58, y: -0.34, z: 1.45 }, // 1 base A (left, low)
        { x: 0.58, y: -0.34, z: 1.45 },  // 2 base B (right, low)
        { x: 0.0, y: 0.74, z: 1.45 },    // 3 base C (crest, high)
        { x: -1.35, y: -0.34, z: 0.35 }, // 4 wing left tip
        { x: 1.35, y: -0.34, z: 0.35 }   // 5 wing right tip
    ];

    const FALLBACK_WIREFRAME_EDGES = [
        [0, 1], [0, 2], [0, 3],
        [1, 2], [2, 3], [3, 1],
        [1, 4], [2, 5], [4, 5],
        [0, 4], [0, 5]
    ];

    function getShipColor(object, params, timestampMs) {
        const flashDuration = params.config.SHIP_FLASH_DURATION_MS || 1000;
        const flashCount = params.config.SHIP_FLASH_COUNT || 2;

        if (object.flashStartMs && timestampMs) {
            const flashElapsed = timestampMs - object.flashStartMs;
            if (flashElapsed < flashDuration) {
                const flashPeriod = flashDuration / flashCount;
                const flashPhase = (flashElapsed % flashPeriod) / flashPeriod;
                if (flashPhase < 0.5) {
                    return object.flashColor || '#ffffff';
                }
            } else {
                delete object.flashStartMs;
                delete object.flashColor;
            }
        }

        const isDisabled = (typeof object.hull === 'number' && object.hull <= 0);
        if (isDisabled) {
            return '#777777';
        }

        return params.shipColor || (params.isAlly ? COLORS.GREEN : '#00ff00');
    }

    function projectShipWireframe({ object, playerShip, viewWidth, viewHeight, config, charAspectRatio = 1 }) {
        const rotation = object.rotation || { x: 0, y: 0, z: 0, w: 1 };
        const visualRotation = rotation;

        const cameraConjugate = ThreeDUtils.quatConjugate(playerShip.rotation);
        const shipToCamera = ThreeDUtils.subVec(object.position, playerShip.position);
        const cameraSpaceCenter = ThreeDUtils.rotateVecByQuat(shipToCamera, cameraConjugate);
        if (cameraSpaceCenter.z < config.NEAR_PLANE) {
            return null;
        }

        const centerProjection = RasterUtils.projectCameraSpacePointRaw(cameraSpaceCenter, viewWidth, viewHeight, config.VIEW_FOV);
        if (!centerProjection) {
            return null;
        }

        const shipGeometry = (typeof ShipGeometry !== 'undefined' && typeof ShipGeometry.getShip === 'function')
            ? ShipGeometry.getShip(object.shipGeometryId || 'FIGHTER')
            : null;
        const sourceVertices = Array.isArray(shipGeometry?.vertices) && shipGeometry.vertices.length > 0
            ? shipGeometry.vertices
            : FALLBACK_WIREFRAME_VERTICES;
        const sourceEdges = Array.isArray(shipGeometry?.edges) && shipGeometry.edges.length > 0
            ? shipGeometry.edges
            : FALLBACK_WIREFRAME_EDGES;

        // If we are using fallback canonical vertices, apply ship size scaling.
        // ShipGeometry vertices are already scaled by SHIP_SIZE_AU at load time.
        const configuredScaleMult = Math.max(0.001, Number(config?.SHIP_WIREFRAME_SCALE_MULT) || 1);
        const configuredMinScale = Math.max(0.0000001, Number(config?.SHIP_WIREFRAME_MIN_SCALE_AU) || 0.00025);
        const modelScale = shipGeometry
            ? 1
            : Math.max(configuredMinScale, Number(object.size) || 0.0012);
        const effectiveScale = modelScale * configuredScaleMult;
        const projectedVertices = [];
        const vertexDiagnostics = [];

        for (let i = 0; i < sourceVertices.length; i++) {
            const v = sourceVertices[i];
            const local = {
                x: v.x * effectiveScale,
                y: v.y * effectiveScale,
                z: v.z * effectiveScale
            };

            const worldOffset = ThreeDUtils.rotateVecByQuat(local, visualRotation);
            const worldPos = ThreeDUtils.addVec(object.position, worldOffset);
            const relative = ThreeDUtils.subVec(worldPos, playerShip.position);
            const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, cameraConjugate);

            if (cameraSpace.z < config.NEAR_PLANE) {
                return null;
            }

            const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
            if (!projected) {
                return null;
            }

            projectedVertices.push({
                x: projected.x,
                y: projected.y,
                z: cameraSpace.z
            });

            vertexDiagnostics.push({
                index: i,
                world: {
                    x: worldPos.x,
                    y: worldPos.y,
                    z: worldPos.z
                },
                camera: {
                    x: cameraSpace.x,
                    y: cameraSpace.y,
                    z: cameraSpace.z
                },
                screen: {
                    x: projected.x,
                    y: projected.y,
                    inBounds: projected.x >= 0 && projected.x < viewWidth && projected.y >= 0 && projected.y < viewHeight
                }
            });
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        projectedVertices.forEach((p) => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const minChars = Math.max(0, Number(config?.SHIP_WIREFRAME_MIN_SIZE_CHARS) || 0);
        const maxScaleMult = Math.max(1, Number(config?.SHIP_WIREFRAME_MAX_SCREEN_SCALE_MULT) || 1);
        let appliedScreenScale = 1;
        const safeAspect = Math.max(0.001, Number(charAspectRatio) || 1);

        if (minChars > 0) {
            const centerX = (minX + maxX) * 0.5;
            const centerY = (minY + maxY) * 0.5;

            let baseRadius = 0;
            projectedVertices.forEach((p) => {
                const dx = (p.x - centerX) * safeAspect;
                const dy = (p.y - centerY);
                baseRadius = Math.max(baseRadius, Math.sqrt((dx * dx) + (dy * dy)));
            });

            const targetRadius = Math.max(0.0001, minChars * 0.5);
            const requiredScale = targetRadius / Math.max(0.0001, baseRadius);
            if (requiredScale > 1) {
                appliedScreenScale = Math.min(requiredScale, maxScaleMult);

                projectedVertices.forEach((p) => {
                    p.x = centerX + ((p.x - centerX) * appliedScreenScale);
                    p.y = centerY + ((p.y - centerY) * appliedScreenScale);
                });

                minX = Infinity;
                maxX = -Infinity;
                minY = Infinity;
                maxY = -Infinity;
                projectedVertices.forEach((p) => {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                });
            }
        }

        const intersectsScreen = maxX >= 0 && minX < viewWidth && maxY >= 0 && minY < viewHeight;
        if (!intersectsScreen) {
            return null;
        }

        const pickRadius = Math.max(3, Math.ceil(Math.max(maxX - minX, maxY - minY) * 0.5));

        return {
            screenX: Math.round(centerProjection.x),
            screenY: Math.round(centerProjection.y),
            depth: Math.max(config.NEAR_PLANE, cameraSpaceCenter.z),
            distance: ThreeDUtils.vecLength(shipToCamera),
            pickRadius,
            projectedVertices,
            sourceEdges,
            vertexDiagnostics,
            scaleInfo: {
                configuredScaleMult,
                configuredMinScale,
                effectiveScale,
                appliedScreenScale,
                charAspectRatio: safeAspect,
                bboxWidthChars: maxX - minX,
                bboxHeightChars: maxY - minY
            }
        };
    }

    function maybeLogWireframeDebug(params, projection) {
        if (params.isAlly || !params.object || !projection) {
            return;
        }

        const debugEnabled = !!params.config?.DEBUG_SHIP_WIREFRAME_LOG;
        if (!debugEnabled) {
            return;
        }

        const nowMs = Number.isFinite(params.timestampMs) ? params.timestampMs : performance.now();
        const logEveryMs = Math.max(0, Number(params.config?.DEBUG_SHIP_WIREFRAME_LOG_EVERY_MS) || 0);
        const shipId = params.object.id || params.object.name || `npc-${Math.round(projection.screenX)}-${Math.round(projection.screenY)}`;
        const lastLogMs = lastWireframeLogByShip.get(shipId) || -Infinity;
        if ((nowMs - lastLogMs) < logEveryMs) {
            return;
        }
        lastWireframeLogByShip.set(shipId, nowMs);

        const bbox = projection.projectedVertices.reduce((acc, p) => {
            acc.minX = Math.min(acc.minX, p.x);
            acc.maxX = Math.max(acc.maxX, p.x);
            acc.minY = Math.min(acc.minY, p.y);
            acc.maxY = Math.max(acc.maxY, p.y);
            return acc;
        }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

        // console.log('[WireframeShip][NPC][Frame]', {
        //     timestampMs: nowMs,
        //     shipId,
        //     shipName: params.object.name || params.object.shipData?.name || 'Unknown NPC',
        //     distanceAU: Number(projection.distance.toFixed(6)),
        //     centerScreen: { x: projection.screenX, y: projection.screenY },
        //     bboxScreen: {
        //         minX: Number(bbox.minX.toFixed(2)),
        //         maxX: Number(bbox.maxX.toFixed(2)),
        //         minY: Number(bbox.minY.toFixed(2)),
        //         maxY: Number(bbox.maxY.toFixed(2)),
        //         width: Number((bbox.maxX - bbox.minX).toFixed(2)),
        //         height: Number((bbox.maxY - bbox.minY).toFixed(2))
        //     },
        //     scaleInfo: projection.scaleInfo,
        //     vertices: projection.vertexDiagnostics.map((v) => ({
        //         index: v.index,
        //         world: {
        //             x: Number(v.world.x.toFixed(6)),
        //             y: Number(v.world.y.toFixed(6)),
        //             z: Number(v.world.z.toFixed(6))
        //         },
        //         camera: {
        //             x: Number(v.camera.x.toFixed(6)),
        //             y: Number(v.camera.y.toFixed(6)),
        //             z: Number(v.camera.z.toFixed(6))
        //         },
        //         screen: {
        //             x: Number(v.screen.x.toFixed(2)),
        //             y: Number(v.screen.y.toFixed(2)),
        //             inBounds: v.screen.inBounds
        //         }
        //     }))
        // });
    }

    function render(params) {
        const {
            object,
            playerShip,
            viewWidth,
            viewHeight,
            config,
            timestampMs = 0,
            onPickInfo = null,
            onWireframe = null
        } = params;

        if (!object || !object.position || !playerShip) {
            return;
        }

        const projection = projectShipWireframe({
            object,
            playerShip,
            viewWidth,
            viewHeight,
            config,
            charAspectRatio: params.charAspectRatio || 1
        });
        if (!projection) {
            return;
        }

        maybeLogWireframeDebug(params, projection);

        const color = getShipColor(object, params, timestampMs);

        const segments = projection.sourceEdges.map(([a, b]) => ({
            a: projection.projectedVertices[a],
            b: projection.projectedVertices[b]
        }));

        if (onWireframe) {
            onWireframe({
                segments,
                color,
                depth: projection.depth
            });
        }

        if (onPickInfo) {
            onPickInfo({
                object,
                screenX: projection.screenX,
                screenY: projection.screenY,
                depth: projection.depth,
                distance: projection.distance,
                pickRadius: projection.pickRadius
            });
        }
    }

    function drawWireframes({ wireframes, isPaused }) {
        if (!Array.isArray(wireframes) || wireframes.length === 0) {
            return;
        }

        const ctx = UI.getContext?.();
        const canvas = UI.getCanvas?.();
        const charDims = UI.getCharDimensions?.();
        if (!ctx || !canvas || !charDims) {
            return;
        }

        const charWidth = Math.max(1, charDims.width || 1);
        const charHeight = Math.max(1, charDims.height || 1);

        const sorted = [...wireframes].sort((a, b) => (b.depth || 0) - (a.depth || 0));

        ctx.save();
        ctx.lineWidth = 1.35;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        sorted.forEach((wf) => {
            const stroke = isPaused ? ColorUtils.toMonochrome(wf.color || COLORS.TEXT_NORMAL) : (wf.color || COLORS.TEXT_NORMAL);
            ctx.strokeStyle = stroke;

            (wf.segments || []).forEach((segment) => {
                const x1 = ((segment.a.x || 0) + 0.5) * charWidth;
                const y1 = ((segment.a.y || 0) + 0.5) * charHeight;
                const x2 = ((segment.b.x || 0) + 0.5) * charWidth;
                const y2 = ((segment.b.y || 0) + 0.5) * charHeight;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });
        });

        ctx.restore();
    }

    function isOnScreen(object, playerShip, viewWidth, viewHeight, config) {
        if (!object || !object.position || !playerShip) {
            return false;
        }

        const relative = ThreeDUtils.subVec(object.position, playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        if (cameraSpace.z < config.NEAR_PLANE) {
            return false;
        }

        const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
        if (!projected) {
            return false;
        }

        const margin = 5;
        return projected.x >= -margin && projected.x < viewWidth + margin
            && projected.y >= -margin && projected.y < viewHeight + margin;
    }

    return {
        render,
        drawWireframes,
        isOnScreen
    };
})();
