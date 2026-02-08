/**
 * Polygon utilities
 */

const PolygonUtils = (() => {
    function buildPlaneBasis(normal) {
        const n = ThreeDUtils.normalizeVec(normal);
        const helper = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
        const u = ThreeDUtils.normalizeVec(ThreeDUtils.crossVec(helper, n));
        const v = ThreeDUtils.crossVec(n, u);
        return { u, v };
    }

    function orderPolygonVertices(vertices, basis) {
        const center = vertices.reduce((acc, v) => ThreeDUtils.addVec(acc, v), { x: 0, y: 0, z: 0 });
        center.x /= vertices.length;
        center.y /= vertices.length;
        center.z /= vertices.length;

        return vertices
            .map(v => {
                const rel = ThreeDUtils.subVec(v, center);
                const x = ThreeDUtils.dotVec(rel, basis.u);
                const y = ThreeDUtils.dotVec(rel, basis.v);
                return { v, angle: Math.atan2(y, x) };
            })
            .sort((a, b) => a.angle - b.angle)
            .map(item => item.v);
    }

    function removeDuplicateVertices(vertices, epsilon = 1e-6) {
        if (vertices.length === 0) {
            return vertices;
        }
        const result = [];
        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            const prev = result[result.length - 1];
            if (!prev || ThreeDUtils.distance(v, prev) > epsilon) {
                result.push(v);
            }
        }
        if (result.length > 1 && ThreeDUtils.distance(result[0], result[result.length - 1]) <= epsilon) {
            result.pop();
        }
        return result;
    }

    function isPointInPolygon2D(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.0000001) + xi);
            if (intersect) {
                inside = !inside;
            }
        }
        return inside;
    }

    function clipPolygonToNearPlane(vertices, nearPlane) {
        const clipped = [];
        for (let i = 0; i < vertices.length; i++) {
            const current = vertices[i];
            const next = vertices[(i + 1) % vertices.length];
            const currentInside = current.z >= nearPlane;
            const nextInside = next.z >= nearPlane;

            if (currentInside && nextInside) {
                clipped.push(next);
            } else if (currentInside && !nextInside) {
                const t = (nearPlane - current.z) / (next.z - current.z);
                clipped.push({
                    x: current.x + (next.x - current.x) * t,
                    y: current.y + (next.y - current.y) * t,
                    z: nearPlane
                });
            } else if (!currentInside && nextInside) {
                const t = (nearPlane - current.z) / (next.z - current.z);
                clipped.push({
                    x: current.x + (next.x - current.x) * t,
                    y: current.y + (next.y - current.y) * t,
                    z: nearPlane
                });
                clipped.push(next);
            }
        }
        return clipped;
    }

    return {
        buildPlaneBasis,
        orderPolygonVertices,
        removeDuplicateVertices,
        isPointInPolygon2D,
        clipPolygonToNearPlane
    };
})();
