/**
 * Space station rendering utilities
 */

const SpaceStationGfx = (() => {
    const FACE_DEBUG_COLORS = [
        'red', 'green', 'yellow', 'blue',
        'orange', 'purple', 'cyan', 'magenta',
        'lime', 'pink', 'teal', 'lavender',
        'brown', 'beige'
    ];

    function lerpColorHex(a, b, t) {
        const ar = parseInt(a.slice(1, 3), 16);
        const ag = parseInt(a.slice(3, 5), 16);
        const ab = parseInt(a.slice(5, 7), 16);
        const br = parseInt(b.slice(1, 3), 16);
        const bg = parseInt(b.slice(3, 5), 16);
        const bb = parseInt(b.slice(5, 7), 16);
        const rr = Math.round(ar + (br - ar) * t);
        const rg = Math.round(ag + (bg - ag) * t);
        const rb = Math.round(ab + (bb - ab) * t);
        return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
    }

    function getFaceDebugColor(faceIndex) {
        return FACE_DEBUG_COLORS[faceIndex % FACE_DEBUG_COLORS.length];
    }
    function buildCuboctahedronGeometry(station, sizeOverride = null) {
        const baseSize = typeof sizeOverride === 'number'
            ? sizeOverride
            : (station.radiusAU ?? station.size ?? 0);
        const half = baseSize / 2;
        const baseVertices = [
            { x: 1, y: 1, z: 0 },
            { x: 1, y: -1, z: 0 },
            { x: -1, y: 1, z: 0 },
            { x: -1, y: -1, z: 0 },
            { x: 1, y: 0, z: 1 },
            { x: 1, y: 0, z: -1 },
            { x: -1, y: 0, z: 1 },
            { x: -1, y: 0, z: -1 },
            { x: 0, y: 1, z: 1 },
            { x: 0, y: 1, z: -1 },
            { x: 0, y: -1, z: 1 },
            { x: 0, y: -1, z: -1 }
        ];

        const rotation = station.rotation || { x: 0, y: 0, z: 0, w: 1 };
        const vertices = baseVertices.map(v => {
            const scaled = ThreeDUtils.scaleVec(v, half);
            const rotated = ThreeDUtils.rotateVecByQuat(scaled, rotation);
            return ThreeDUtils.addVec(station.position, rotated);
        });

        const edges = [];
        const target = 2 * half * half;
        const eps = target * 0.02;
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                const dx = vertices[i].x - vertices[j].x;
                const dy = vertices[i].y - vertices[j].y;
                const dz = vertices[i].z - vertices[j].z;
                const dist2 = dx * dx + dy * dy + dz * dz;
                if (Math.abs(dist2 - target) <= eps) {
                    edges.push([i, j]);
                }
            }
        }

        const indexMap = new Map();
        baseVertices.forEach((v, idx) => {
            indexMap.set(`${v.x},${v.y},${v.z}`, idx);
        });

        const faces = [
            [indexMap.get('1,1,0'), indexMap.get('1,0,1'), indexMap.get('1,-1,0'), indexMap.get('1,0,-1')],
            [indexMap.get('-1,1,0'), indexMap.get('-1,0,-1'), indexMap.get('-1,-1,0'), indexMap.get('-1,0,1')],
            [indexMap.get('1,1,0'), indexMap.get('0,1,-1'), indexMap.get('-1,1,0'), indexMap.get('0,1,1')],
            [indexMap.get('1,-1,0'), indexMap.get('0,-1,1'), indexMap.get('-1,-1,0'), indexMap.get('0,-1,-1')],
            [indexMap.get('1,0,1'), indexMap.get('0,1,1'), indexMap.get('-1,0,1'), indexMap.get('0,-1,1')],
            [indexMap.get('1,0,-1'), indexMap.get('0,-1,-1'), indexMap.get('-1,0,-1'), indexMap.get('0,1,-1')],
            [indexMap.get('1,1,0'), indexMap.get('1,0,1'), indexMap.get('0,1,1')],
            [indexMap.get('1,1,0'), indexMap.get('0,1,-1'), indexMap.get('1,0,-1')],
            [indexMap.get('1,-1,0'), indexMap.get('1,0,-1'), indexMap.get('0,-1,-1')],
            [indexMap.get('1,-1,0'), indexMap.get('0,-1,1'), indexMap.get('1,0,1')],
            [indexMap.get('-1,1,0'), indexMap.get('0,1,1'), indexMap.get('-1,0,1')],
            [indexMap.get('-1,1,0'), indexMap.get('-1,0,-1'), indexMap.get('0,1,-1')],
            [indexMap.get('-1,-1,0'), indexMap.get('0,-1,-1'), indexMap.get('-1,0,-1')],
            [indexMap.get('-1,-1,0'), indexMap.get('-1,0,1'), indexMap.get('0,-1,1')]
        ];

        const entranceFace = faces[4];

        return { vertices, edges, faces, entranceFace };
    }

    function isSameFace(a, b) {
        if (!a || !b || a.length !== b.length) {
            return false;
        }
        const setA = new Set(a);
        return b.every(idx => setA.has(idx));
    }

    function scaleProjectedPoints(projectedPoints, scale) {
        if (!Array.isArray(projectedPoints) || scale === 1) {
            return projectedPoints;
        }
        const valid = projectedPoints.filter(p => p);
        if (valid.length === 0) {
            return projectedPoints;
        }
        const centerX = valid.reduce((sum, p) => sum + p.x, 0) / valid.length;
        const centerY = valid.reduce((sum, p) => sum + p.y, 0) / valid.length;
        return projectedPoints.map(p => {
            if (!p) {
                return p;
            }
            return {
                ...p,
                x: centerX + (p.x - centerX) * scale,
                y: centerY + (p.y - centerY) * scale
            };
        });
    }

    function stationScreenBoundsChars(station, playerShip, viewWidth, viewHeight, fov = 75, scale = 1) {
        if (!playerShip || !station) {
            return null;
        }

        const cameraPos = playerShip.position;
        const cameraRot = playerShip.rotation;
        const vertices = buildCuboctahedronGeometry(station).vertices;

        let projected = vertices
            .map(v => ThreeDUtils.rotateVecByQuat(ThreeDUtils.subVec(v, cameraPos), ThreeDUtils.quatConjugate(cameraRot)))
            .map(v => RasterUtils.projectCameraSpacePointRaw(v, viewWidth, viewHeight, fov))
            .filter(p => p !== null);

        projected = scaleProjectedPoints(projected, scale);

        if (projected.length === 0) {
            return null;
        }

        const minX = Math.min(...projected.map(p => p.x));
        const maxX = Math.max(...projected.map(p => p.x));
        const minY = Math.min(...projected.map(p => p.y));
        const maxY = Math.max(...projected.map(p => p.y));

        const width = Math.max(0, maxX - minX);
        const height = Math.max(0, maxY - minY);
        return { minX, maxX, minY, maxY, width, height, area: width * height };
    }

    function stationScreenAreaChars(station, playerShip, viewWidth, viewHeight, scale = 1) {
        const bounds = stationScreenBoundsChars(station, playerShip, viewWidth, viewHeight, 75, scale);
        return bounds ? bounds.area : 0;
    }

    function renderStationOccluders(stations, playerShip, viewWidth, viewHeight, depthBuffer, nearPlane, faceBias, scale = 1, debug = false, debugFaceIndex = null, debugFaceOutline = false, debugFaceFillMode = 'ray') {
        if (stations.length === 0) {
            return;
        }

        stations.forEach(station => {
            let edgeDebugCount = 0;
            const geometry = buildCuboctahedronGeometry(station);
            const cameraPos = playerShip.position;
            const cameraRot = playerShip.rotation;
            const stationCameraCenter = ThreeDUtils.rotateVecByQuat(
                ThreeDUtils.subVec(station.position, cameraPos),
                ThreeDUtils.quatConjugate(cameraRot)
            );

            const vertices = geometry.vertices;
            let projectedVertices = vertices.map(v => {
                const cameraSpace = ThreeDUtils.rotateVecByQuat(ThreeDUtils.subVec(v, cameraPos), ThreeDUtils.quatConjugate(cameraRot));
                const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, 75);
                return { cameraSpace, projected };
            });

            const scaledProjected = scaleProjectedPoints(projectedVertices.map(p => p.projected), scale);
            projectedVertices = projectedVertices.map((p, idx) => ({
                ...p,
                projected: scaledProjected[idx]
            }));

            const faceDepths = geometry.faces.map(face => {
                const center = face.reduce((acc, idx) => ThreeDUtils.addVec(acc, projectedVertices[idx].cameraSpace), { x: 0, y: 0, z: 0 });
                center.x /= face.length;
                center.y /= face.length;
                center.z /= face.length;
                return center.z;
            });
            const minDepth = Math.min(...faceDepths);
            const maxDepth = Math.max(...faceDepths);
            const depthRange = Math.max(0.000001, maxDepth - minDepth);

            geometry.faces.forEach((face, faceIndex) => {
                if (typeof debugFaceIndex === 'number' && faceIndex !== debugFaceIndex) {
                    return;
                }
                const isEntrance = geometry.entranceFace && isSameFace(face, geometry.entranceFace);
                const cameraFace = face.map(idx => projectedVertices[idx].cameraSpace);
                const scaledCameraFace = scale === 1
                    ? cameraFace
                    : cameraFace.map(v => {
                        const offset = ThreeDUtils.subVec(v, stationCameraCenter);
                        return ThreeDUtils.addVec(stationCameraCenter, ThreeDUtils.scaleVec(offset, scale));
                    });
                const faceZ = scaledCameraFace.map(v => v.z);
                const minFaceZ = Math.min(...faceZ);
                const maxFaceZ = Math.max(...faceZ);
                const behindCount = faceZ.filter(z => z < nearPlane).length;
                const debugColor = getFaceDebugColor(faceIndex);
                const debugClipDistances = faceZ.map(z => z - nearPlane);
                const debugNearPlane = minFaceZ < nearPlane * 10;
                const clipped = PolygonUtils.clipPolygonToNearPlane(scaledCameraFace, nearPlane);
                if (clipped.length < 3) {
                    if (debug && (debugNearPlane || behindCount > 0)) {
                        console.log('[StationFaceCullDebug]', {
                            stationId: station.id,
                            faceIndex,
                            reason: 'clipped',
                            debugColor,
                            faceZ,
                            clipDistances: debugClipDistances,
                            behindCount,
                            clippedCount: clipped.length,
                            minFaceZ,
                            maxFaceZ,
                            nearPlane
                        });
                    }
                    return;
                }
                const rawNormal = ThreeDUtils.crossVec(
                    ThreeDUtils.subVec(scaledCameraFace[1], scaledCameraFace[0]),
                    ThreeDUtils.subVec(scaledCameraFace[2], scaledCameraFace[0])
                );
                let normal = rawNormal;
                let normalSource = 'raw';
                let normalLen = ThreeDUtils.vecLength(normal);
                if (normalLen === 0) {
                    normal = ThreeDUtils.crossVec(
                        ThreeDUtils.subVec(clipped[1], clipped[0]),
                        ThreeDUtils.subVec(clipped[2], clipped[0])
                    );
                    normalSource = 'clipped';
                    normalLen = ThreeDUtils.vecLength(normal);
                }
                if (normalLen === 0) {
                    if (debug && (debugNearPlane || behindCount > 0)) {
                        console.log('[StationFaceCullDebug]', {
                            stationId: station.id,
                            faceIndex,
                            reason: 'degenerate-normal',
                            debugColor,
                            faceZ,
                            clipDistances: debugClipDistances,
                            behindCount,
                            clippedCount: clipped.length,
                            minFaceZ,
                            maxFaceZ,
                            normalSource,
                            nearPlane
                        });
                    }
                    return;
                }
                let normalUnit = ThreeDUtils.scaleVec(normal, 1 / normalLen);
                let viewDot = normalUnit.z;
                const basis = PolygonUtils.buildPlaneBasis(normal);
                let ordered = PolygonUtils.orderPolygonVertices(clipped, basis);
                let normalFlipped = false;
                if (viewDot < 0) {
                    ordered = ordered.slice().reverse();
                    normalUnit = ThreeDUtils.scaleVec(normalUnit, -1);
                    viewDot = -viewDot;
                    normalFlipped = true;
                }

                const projectedFace = ordered
                    .map(v => RasterUtils.projectCameraSpacePointRaw(v, viewWidth, viewHeight, 75))
                    .filter(p => p !== null);
                if (projectedFace.length < 3) {
                    if (debug && (debugNearPlane || behindCount > 0)) {
                        console.log('[StationFaceCullDebug]', {
                            stationId: station.id,
                            faceIndex,
                            reason: 'projected',
                            debugColor,
                            faceZ,
                            clipDistances: debugClipDistances,
                            behindCount,
                            clippedCount: clipped.length,
                            orderedCount: ordered.length,
                            projectedCount: projectedFace.length,
                            normal: normalUnit,
                            normalFlipped,
                            normalSource,
                            viewDot,
                            minFaceZ,
                            maxFaceZ,
                            nearPlane
                        });
                    }
                    return;
                }
                const inViewCount = projectedFace.filter(p => (
                    p.x >= 0 && p.x < viewWidth && p.y >= 0 && p.y < viewHeight
                )).length;
                const minX = Math.min(...projectedFace.map(p => p.x));
                const maxX = Math.max(...projectedFace.map(p => p.x));
                const minY = Math.min(...projectedFace.map(p => p.y));
                const maxY = Math.max(...projectedFace.map(p => p.y));
                if (debugFaceOutline) {
                    for (let i = 0; i < projectedFace.length; i++) {
                        const a = projectedFace[i];
                        const b = projectedFace[(i + 1) % projectedFace.length];
                        const x1 = Math.round(a.x - 0.5);
                        const y1 = Math.round(a.y - 0.5);
                        const x2 = Math.round(b.x - 0.5);
                        const y2 = Math.round(b.y - 0.5);
                        const linePoints = LineDrawer.drawLine(x1, y1, x2, y2, true, COLORS.TEXT_NORMAL);
                        linePoints.forEach(point => {
                            if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                                const total = Math.hypot(x2 - x1, y2 - y1) || 1;
                                const current = Math.hypot(point.x - x1, point.y - y1);
                                const t = current / total;
                                const z = a.z + (b.z - a.z) * t;
                                RasterUtils.plotDepthText(depthBuffer, point.x, point.y, z - faceBias, point.symbol, point.color);
                            }
                        });
                    }
                }
                const depthT = 1 - ((faceDepths[faceIndex] - minDepth) / depthRange);
                const clampedT = Math.max(0, Math.min(1, depthT));
                const depthColor = lerpColorHex('#000000', '#888888', clampedT);
                const faceColor = debug ? debugColor : depthColor;
                const rasterResult = RasterUtils.rasterizeFaceDepth(
                    depthBuffer,
                    ordered,
                    viewWidth,
                    viewHeight,
                    '█',
                    faceColor,
                    faceBias,
                    nearPlane,
                    75,
                    debugFaceFillMode
                );
                if (debug) {
                    console.log('[StationFaceDebug]', {
                        stationId: station.id,
                        faceIndex,
                        debugColor,
                        inViewCount,
                        projectedCount: projectedFace.length,
                        clippedCount: clipped.length,
                        behindCount,
                        clipDistances: debugClipDistances,
                        normal: normalUnit,
                        normalFlipped,
                        normalSource,
                        viewDot,
                        minFaceZ,
                        maxFaceZ,
                        nearPlane,
                        minX,
                        maxX,
                        minY,
                        maxY,
                        rasterPlotCount: rasterResult.plotCount,
                        rasterUsedFallback: rasterResult.usedFallback,
                        rasterInViewCount: rasterResult.inViewCount,
                        rasterFillMode: rasterResult.fillMode
                    });
                }


                if (isEntrance) {
                    const center = scaledCameraFace.reduce((acc, v) => ThreeDUtils.addVec(acc, v), { x: 0, y: 0, z: 0 });
                    center.x /= scaledCameraFace.length;
                    center.y /= scaledCameraFace.length;
                    center.z /= scaledCameraFace.length;

                    const inset = 0.45;
                    const insetVerts = scaledCameraFace.map(v => {
                        const offset = ThreeDUtils.subVec(v, center);
                        return ThreeDUtils.addVec(center, ThreeDUtils.scaleVec(offset, inset));
                    });

                    const insetClipped = PolygonUtils.clipPolygonToNearPlane(insetVerts, nearPlane);
                    if (insetClipped.length >= 3) {
                        const insetNormal = ThreeDUtils.crossVec(
                            ThreeDUtils.subVec(insetClipped[1], insetClipped[0]),
                            ThreeDUtils.subVec(insetClipped[2], insetClipped[0])
                        );
                        if (ThreeDUtils.vecLength(insetNormal) > 0) {
                            const insetBasis = PolygonUtils.buildPlaneBasis(insetNormal);
                            const insetOrdered = PolygonUtils.orderPolygonVertices(insetClipped, insetBasis);
                            RasterUtils.rasterizeFaceDepth(depthBuffer, insetOrdered, viewWidth, viewHeight, '█', COLORS.BLACK, faceBias - 0.0002, nearPlane, 75);
                        }
                    }
                }
            });
        });
    }

    function renderStationEdges(stations, playerShip, viewWidth, viewHeight, depthBuffer, edgeBias, scale = 1) {
        if (stations.length === 0) {
            return;
        }

        stations.forEach(station => {
            const geometry = buildCuboctahedronGeometry(station);
            const cameraPos = playerShip.position;
            const cameraRot = playerShip.rotation;

            const vertices = geometry.vertices;
            let projectedVertices = vertices.map(v => {
                const cameraSpace = ThreeDUtils.rotateVecByQuat(ThreeDUtils.subVec(v, cameraPos), ThreeDUtils.quatConjugate(cameraRot));
                const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, 75);
                return { cameraSpace, projected };
            });

            const scaledProjected = scaleProjectedPoints(projectedVertices.map(p => p.projected), scale);
            projectedVertices = projectedVertices.map((p, idx) => ({
                ...p,
                projected: scaledProjected[idx]
            }));

            geometry.edges.forEach(([a, b]) => {
                const p1 = projectedVertices[a].projected;
                const p2 = projectedVertices[b].projected;
                if (!p1 || !p2) {
                    return;
                }

                const x1 = Math.round(p1.x - 0.5);
                const y1 = Math.round(p1.y - 0.5);
                const x2 = Math.round(p2.x - 0.5);
                const y2 = Math.round(p2.y - 0.5);
                const linePoints = LineDrawer.drawLine(x1, y1, x2, y2, true, COLORS.TEXT_NORMAL);
                linePoints.forEach(point => {
                    if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                        const total = Math.hypot(x2 - x1, y2 - y1) || 1;
                        const current = Math.hypot(point.x - x1, point.y - y1);
                        const t = current / total;
                        const z = (p1.z + (p2.z - p1.z) * t) - edgeBias;
                        RasterUtils.plotDepthText(depthBuffer, point.x, point.y, z, point.symbol, point.color);
                    }
                });
            });

            // Entrance is rendered as a textured face, no outline/hole.
        });
    }

    return {
        buildCuboctahedronGeometry,
        stationScreenBoundsChars,
        stationScreenAreaChars,
        renderStationOccluders,
        renderStationEdges
    };
})();
