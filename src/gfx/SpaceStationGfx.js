/**
 * Space station rendering utilities
 */

const SpaceStationGfx = (() => {
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

        const vertices = baseVertices.map(v => ThreeDUtils.addVec(station.position, ThreeDUtils.scaleVec(v, half)));

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

            geometry.faces.forEach(face => {
                if (geometry.entranceFace && isSameFace(face, geometry.entranceFace)) {
                    return;
                }
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
                RasterUtils.rasterizeFaceDepth(depthBuffer, ordered, viewWidth, viewHeight, '░', COLORS.TEXT_DIM, faceBias, nearPlane, 75);
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

                const linePoints = LineDrawer.drawLine(Math.round(p1.x), Math.round(p1.y), Math.round(p2.x), Math.round(p2.y), true, COLORS.TEXT_NORMAL);
                linePoints.forEach(point => {
                    if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                        const total = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
                        const current = Math.hypot(point.x - p1.x, point.y - p1.y);
                        const t = current / total;
                        const z = (p1.z + (p2.z - p1.z) * t) - edgeBias;
                        RasterUtils.plotDepthText(depthBuffer, point.x, point.y, z, point.symbol, point.color);
                    }
                });
            });

            if (geometry.entranceFace) {
                renderStationEntrance(geometry, projectedVertices, depthBuffer, viewWidth, viewHeight, edgeBias);
            }
        });
    }

    function renderStationEntrance(geometry, projectedVertices, depthBuffer, viewWidth, viewHeight, edgeBias) {
        const face = geometry.entranceFace;
        const cameraVerts = face.map(idx => projectedVertices[idx]);
        if (cameraVerts.some(v => !v.projected)) {
            return;
        }

        const center = cameraVerts.reduce((acc, v) => ThreeDUtils.addVec(acc, v.cameraSpace), { x: 0, y: 0, z: 0 });
        center.x /= cameraVerts.length;
        center.y /= cameraVerts.length;
        center.z /= cameraVerts.length;

        const inset = 0.45;
        const innerVerts = cameraVerts.map(v => {
            const offset = ThreeDUtils.subVec(v.cameraSpace, center);
            return ThreeDUtils.addVec(center, ThreeDUtils.scaleVec(offset, inset));
        });

        const projected = innerVerts
            .map(v => RasterUtils.projectCameraSpacePointRaw(v, viewWidth, viewHeight, 75))
            .filter(p => p !== null);
        if (projected.length < 4) {
            return;
        }

        for (let i = 0; i < projected.length; i++) {
            const next = (i + 1) % projected.length;
            const p1 = projected[i];
            const p2 = projected[next];
            const linePoints = LineDrawer.drawLine(Math.round(p1.x), Math.round(p1.y), Math.round(p2.x), Math.round(p2.y), true, COLORS.CYAN);
            linePoints.forEach(point => {
                if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                    const total = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
                    const current = Math.hypot(point.x - p1.x, point.y - p1.y);
                    const t = current / total;
                    const z = (innerVerts[i].z + (innerVerts[next].z - innerVerts[i].z) * t) - edgeBias;
                    RasterUtils.plotDepthText(depthBuffer, point.x, point.y, z, point.symbol, COLORS.CYAN);
                }
            });
        }
    }

    return {
        buildCuboctahedronGeometry,
        stationScreenAreaChars,
        renderStationOccluders,
        renderStationEdges
    };
})();
