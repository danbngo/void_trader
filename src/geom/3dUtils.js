/**
 * 3D Utilities
 */

class ThreeDUtils {
    static addVec(a, b) {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    }

    static subVec(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }

    static scaleVec(v, s) {
        return { x: v.x * s, y: v.y * s, z: v.z * s };
    }

    static vecLength(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    static normalizeVec(v) {
        const len = ThreeDUtils.vecLength(v);
        if (len === 0) {
            return { x: 0, y: 0, z: 0 };
        }
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    }

    static crossVec(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    static dotVec(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    static distance(a, b) {
        return ThreeDUtils.vecLength(ThreeDUtils.subVec(a, b));
    }

    static quatFromForwardUp(forward, up) {
        const f = ThreeDUtils.normalizeVec(forward);
        let r = ThreeDUtils.normalizeVec(ThreeDUtils.crossVec(up, f));
        if (ThreeDUtils.vecLength(r) === 0) {
            r = { x: 1, y: 0, z: 0 };
        }
        const u = ThreeDUtils.crossVec(f, r);

        const m00 = r.x, m01 = u.x, m02 = f.x;
        const m10 = r.y, m11 = u.y, m12 = f.y;
        const m20 = r.z, m21 = u.z, m22 = f.z;

        const trace = m00 + m11 + m22;
        let q = { x: 0, y: 0, z: 0, w: 1 };

        if (trace > 0) {
            const s = Math.sqrt(trace + 1.0) * 2;
            q.w = 0.25 * s;
            q.x = (m21 - m12) / s;
            q.y = (m02 - m20) / s;
            q.z = (m10 - m01) / s;
        } else if (m00 > m11 && m00 > m22) {
            const s = Math.sqrt(1.0 + m00 - m11 - m22) * 2;
            q.w = (m21 - m12) / s;
            q.x = 0.25 * s;
            q.y = (m01 + m10) / s;
            q.z = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = Math.sqrt(1.0 + m11 - m00 - m22) * 2;
            q.w = (m02 - m20) / s;
            q.x = (m01 + m10) / s;
            q.y = 0.25 * s;
            q.z = (m12 + m21) / s;
        } else {
            const s = Math.sqrt(1.0 + m22 - m00 - m11) * 2;
            q.w = (m10 - m01) / s;
            q.x = (m02 + m20) / s;
            q.y = (m12 + m21) / s;
            q.z = 0.25 * s;
        }

        return q;
    }

    static quatFromAxisAngle(axis, angle) {
        const half = angle / 2;
        const s = Math.sin(half);
        const n = ThreeDUtils.normalizeVec(axis);
        return ThreeDUtils.quatNormalize({
            x: n.x * s,
            y: n.y * s,
            z: n.z * s,
            w: Math.cos(half)
        });
    }

    static quatMultiply(a, b) {
        return {
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
        };
    }

    static quatConjugate(q) {
        return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
    }

    static quatNormalize(q) {
        const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
        if (len === 0) {
            return { x: 0, y: 0, z: 0, w: 1 };
        }
        return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
    }

    static rotateVecByQuat(v, q) {
        const qv = { x: v.x, y: v.y, z: v.z, w: 0 };
        const qConj = ThreeDUtils.quatConjugate(q);
        const result = ThreeDUtils.quatMultiply(ThreeDUtils.quatMultiply(q, qv), qConj);
        return { x: result.x, y: result.y, z: result.z };
    }

    static getLocalAxes(rotation) {
        const forward = ThreeDUtils.rotateVecByQuat({ x: 0, y: 0, z: 1 }, rotation);
        const right = ThreeDUtils.rotateVecByQuat({ x: 1, y: 0, z: 0 }, rotation);
        const up = ThreeDUtils.rotateVecByQuat({ x: 0, y: 1, z: 0 }, rotation);
        return { forward, right, up };
    }

    static faceToward(ship, targetPos) {
        const forward = ThreeDUtils.normalizeVec(ThreeDUtils.subVec(targetPos, ship.position));
        if (ThreeDUtils.vecLength(forward) === 0) {
            return;
        }
        const up = { x: 0, y: 1, z: 0 };
        ship.rotation = ThreeDUtils.quatNormalize(ThreeDUtils.quatFromForwardUp(forward, up));
    }

    static buildStarfield(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.sin(phi) * Math.sin(theta);
            const z = Math.cos(phi);
            stars.push({ direction: { x, y, z } });
        }
        return stars;
    }

    static randomPointInSphereShellBiased(minDistance, maxDistance, edgeBand, direction, bias) {
        const distance = Math.max(minDistance, maxDistance - Math.random() * edgeBand);
        for (let i = 0; i < 20; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const point = {
                x: distance * Math.sin(phi) * Math.cos(theta),
                y: distance * Math.sin(phi) * Math.sin(theta),
                z: distance * Math.cos(phi)
            };
            if (ThreeDUtils.dotVec(ThreeDUtils.normalizeVec(point), direction) >= bias) {
                return point;
            }
        }

        const fallbackTheta = Math.random() * Math.PI * 2;
        const fallbackPhi = Math.acos(2 * Math.random() - 1);
        return {
            x: distance * Math.sin(fallbackPhi) * Math.cos(fallbackTheta),
            y: distance * Math.sin(fallbackPhi) * Math.sin(fallbackTheta),
            z: distance * Math.cos(fallbackPhi)
        };
    }

    static randomPointInSphere(radius) {
        const u = Math.random();
        const v = Math.random();
        const w = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = radius * Math.cbrt(w);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        };
    }

    static degToRad(deg) {
        return deg * (Math.PI / 180);
    }
}
