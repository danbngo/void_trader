/**
 * SpaceStation Class
 * Represents a space station in 3D space travel
 */

class SpaceStation {
    /**
     * @param {string} id - Station identifier
     * @param {number} size - Station size
     */
    constructor(id, size = 1) {
        this.id = id;
        this.size = size;
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0, w: 1 };
    }
}
