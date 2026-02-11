/**
 * SpaceStation Class
 * Represents a space station in 3D space travel
 */

class SpaceStation extends Planet {
    /**
     * @param {string} id - Station identifier
     * @param {number} size - Station size
     */
    constructor(id, size = SPACE_STATION_SIZE_AU) {
        super({
            id,
            name: id,
            type: 'STATION',
            kind: 'STATION',
            radiusAU: size,
            rotationDurationHours: 24,
            rotationPhase: 0,
            axialTiltDeg: 0
        });
        this.size = size;
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0, w: 1 };
    }
}
