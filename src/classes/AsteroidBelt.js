/**
 * Asteroid Belt class
 * Defines a radial orbital band used to spawn dynamic asteroid fields.
 */

class AsteroidBelt {
    constructor({
        id,
        name = 'Asteroid Belt',
        type = 'MAIN',
        orbitDistanceAU = 3,
        widthAU = 1,
        icy = false,
        minAsteroids = 8,
        maxAsteroids = 20
    } = {}) {
        this.id = id || `belt-${Math.floor(Math.random() * 1_000_000)}`;
        this.name = name;
        this.type = type;
        this.orbitDistanceAU = Math.max(0.1, Number(orbitDistanceAU) || 3);
        this.widthAU = Math.max(0.05, Number(widthAU) || 1);
        this.icy = !!icy;
        this.minAsteroids = Math.max(1, Math.floor(minAsteroids || 8));
        this.maxAsteroids = Math.max(this.minAsteroids, Math.floor(maxAsteroids || this.minAsteroids));
    }

    getMinRadiusAU() {
        return Math.max(0.05, this.orbitDistanceAU - (this.widthAU * 0.5));
    }

    getMaxRadiusAU() {
        return this.orbitDistanceAU + (this.widthAU * 0.5);
    }

    containsRadius(radiusAU, toleranceAU = 0) {
        const r = Math.max(0, Number(radiusAU) || 0);
        const tol = Math.max(0, Number(toleranceAU) || 0);
        return r >= (this.getMinRadiusAU() - tol) && r <= (this.getMaxRadiusAU() + tol);
    }
}
