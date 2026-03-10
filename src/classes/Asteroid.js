/**
 * Asteroid class
 * Represents an asteroid instance (legacy 2D + space-travel 3D runtime support)
 */

class Asteroid {
    /**
     * Create an asteroid
     * Supports legacy signature (x, y) and object signature.
     */
    constructor(xOrOptions = 0, y = 0) {
        const options = (typeof xOrOptions === 'object' && xOrOptions !== null)
            ? xOrOptions
            : { x: xOrOptions, y };

        const px = Number(options.x) || 0;
        const py = Number(options.y) || 0;
        const pz = Number(options.z) || 0;

        this.id = options.id || `asteroid-${Math.floor(Math.random() * 1_000_000_000)}`;
        this.kind = 'ASTEROID';

        this.x = px;
        this.y = py;
        this.z = pz;

        this.position = options.position
            ? { ...options.position }
            : { x: px, y: py, z: pz };

        this.velocity = options.velocity
            ? { ...options.velocity }
            : { x: 0, y: 0, z: 0 };

        this.rotation = options.rotation
            ? { ...options.rotation }
            : { x: 0, y: 0, z: 0, w: 1 };

        this.orbit = options.orbit ? { ...options.orbit } : null;
        this.beltId = options.beltId || null;
        this.radiusAU = Math.max(0.0001, Number(options.radiusAU) || 0.0025);
        this.isIcy = !!options.isIcy;
        this.spinRateDegPerSec = Number(options.spinRateDegPerSec) || 0;
        this.spinAxis = options.spinAxis
            ? { ...options.spinAxis }
            : { x: 0, y: 1, z: 0 };
        this.shapeSeed = Number.isFinite(options.shapeSeed) ? options.shapeSeed : Math.random();
        this.disabled = !!options.disabled;
        this.spawnedAtMs = Number(options.spawnedAtMs) || 0;
    }
}
