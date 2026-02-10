/**
 * Space station rendering utilities
 */

const SpaceStationGfx = (() => {
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
    function buildCuboctahedronGeometry(station) {
        const half = station.size / 2;
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

    function stationScreenAreaChars(station, playerShip, viewWidth, viewHeight) {
        if (!playerShip || !station) {
            return 0;
        }

        const cameraPos = playerShip.position;
        const cameraRot = playerShip.rotation;
        const vertices = buildCuboctahedronGeometry(station).vertices;

        const projected = vertices
            .map(v => ThreeDUtils.rotateVecByQuat(ThreeDUtils.subVec(v, cameraPos), ThreeDUtils.quatConjugate(cameraRot)))
            .map(v => RasterUtils.projectCameraSpacePointRaw(v, viewWidth, viewHeight, 75))
            .filter(p => p !== null);

        if (projected.length === 0) {
            return 0;
        }

        const minX = Math.min(...projected.map(p => p.x));
        const maxX = Math.max(...projected.map(p => p.x));
        const minY = Math.min(...projected.map(p => p.y));
        const maxY = Math.max(...projected.map(p => p.y));

        const width = Math.max(0, maxX - minX);
        const height = Math.max(0, maxY - minY);
        return width * height;
    }

    function renderStationOccluders(stations, playerShip, viewWidth, viewHeight, depthBuffer, nearPlane, faceBias) {
        if (stations.length === 0) {
            return;
        }

        stations.forEach(station => {
            const geometry = buildCuboctahedronGeometry(station);
            const cameraPos = playerShip.position;
            const cameraRot = playerShip.rotation;

            const vertices = geometry.vertices;
            const projectedVertices = vertices.map(v => {
                const cameraSpace = ThreeDUtils.rotateVecByQuat(ThreeDUtils.subVec(v, cameraPos), ThreeDUtils.quatConjugate(cameraRot));
                const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, 75);
                return { cameraSpace, projected };
            });

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
                const isEntrance = geometry.entranceFace && isSameFace(face, geometry.entranceFace);
                const cameraFace = face.map(idx => projectedVertices[idx].cameraSpace);
                const clipped = PolygonUtils.clipPolygonToNearPlane(cameraFace, nearPlane);
                if (clipped.length < 3) {
                    return;
                }
                const normal = ThreeDUtils.crossVec(
                    ThreeDUtils.subVec(clipped[1], clipped[0]),
                    ThreeDUtils.subVec(clipped[2], clipped[0])
                );
                if (ThreeDUtils.vecLength(normal) === 0) {
                    return;
                }
                const basis = PolygonUtils.buildPlaneBasis(normal);
                const ordered = PolygonUtils.orderPolygonVertices(clipped, basis);
                const depthT = 1 - ((faceDepths[faceIndex] - minDepth) / depthRange);
                const clampedT = Math.max(0, Math.min(1, depthT));
                const faceColor = lerpColorHex('#000000', '#888888', clampedT);
                RasterUtils.rasterizeFaceDepth(depthBuffer, ordered, viewWidth, viewHeight, '█', faceColor, faceBias, nearPlane, 75);

                if (isEntrance) {
                    const center = cameraFace.reduce((acc, v) => ThreeDUtils.addVec(acc, v), { x: 0, y: 0, z: 0 });
                    center.x /= cameraFace.length;
                    center.y /= cameraFace.length;
                    center.z /= cameraFace.length;

                    const inset = 0.45;
                    const insetVerts = cameraFace.map(v => {
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

    function renderStationEdges(stations, playerShip, viewWidth, viewHeight, depthBuffer, edgeBias) {
        if (stations.length === 0) {
            return;
        }

        stations.forEach(station => {
            const geometry = buildCuboctahedronGeometry(station);
            const cameraPos = playerShip.position;
            const cameraRot = playerShip.rotation;

            const vertices = geometry.vertices;
            const projectedVertices = vertices.map(v => {
                const cameraSpace = ThreeDUtils.rotateVecByQuat(ThreeDUtils.subVec(v, cameraPos), ThreeDUtils.quatConjugate(cameraRot));
                const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, 75);
                return { cameraSpace, projected };
            });

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
        stationScreenAreaChars,
        renderStationOccluders,
        renderStationEdges
    };
})();
