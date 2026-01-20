/**
 * Asteroid class
 * Represents a stationary obstacle in combat
 */

class Asteroid {
    /**
     * Create an asteroid
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.disabled = false; // Set to true when destroyed
    }
}
