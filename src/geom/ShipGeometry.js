/**
 * Ship Geometry
 * 3D ship model definitions
 */

const ShipGeometry = (() => {
    // Default fighter ship: simple long skinny pyramid
    // Vertex coordinates are in canonical form (relative units)
    // They will be scaled by SHIP_SIZE_AU in post-processing below
    const SHIPS = {
        FIGHTER: {
            id: 'FIGHTER',
            // Wingless hull: wider/flatter chassis with octagonal rear section
            vertices: [
                // Nose (pointy front, facing +Z direction)
                { x: 0, y: 0, z: 4.1 },           // 0: Nose tip (longer/sharper)

                // Front octagonal section (wider side flare, still relatively flat)
                { x: -1.25, y: 0.00, z: 0.55 },   // 1
                { x: -0.82, y: 0.24, z: 0.85 },   // 2
                { x: 0.00, y: 0.36, z: 1.35 },    // 3
                { x: 0.82, y: 0.24, z: 0.85 },    // 4
                { x: 1.25, y: 0.00, z: 0.55 },    // 5
                { x: 0.82, y: -0.24, z: 0.85 },   // 6
                { x: 0.00, y: -0.30, z: 1.35 },   // 7
                { x: -0.82, y: -0.24, z: 0.85 },  // 8

                // Rear octagonal section (tighter taper for triangular side profile)
                { x: -0.48, y: 0.00, z: -0.65 },  // 9
                { x: -0.34, y: 0.24, z: -0.65 },  // 10
                { x: 0.00, y: 0.52, z: -0.65 },   // 11
                { x: 0.34, y: 0.24, z: -0.65 },   // 12
                { x: 0.48, y: 0.00, z: -0.65 },   // 13
                { x: 0.34, y: -0.12, z: -0.65 },  // 14
                { x: 0.00, y: -0.18, z: -0.65 },  // 15
                { x: -0.34, y: -0.12, z: -0.65 }  // 16
            ],
            
            // Faces as triangles (CCW when viewed from outside)
            // Colors are not used - distance-based shading will be applied
            faces: [
                // Nose fan into front octagon
                [0, 2, 1],
                [0, 3, 2],
                [0, 4, 3],
                [0, 5, 4],
                [0, 6, 5],
                [0, 7, 6],
                [0, 8, 7],
                [0, 1, 8],

                // Chassis sides (front octagon -> rear octagon)
                [1, 2, 10, 9],
                [2, 3, 11, 10],
                [3, 4, 12, 11],
                [4, 5, 13, 12],
                [5, 6, 14, 13],
                [6, 7, 15, 14],
                [7, 8, 16, 15],
                [8, 1, 9, 16],

                // Flat octagonal rear cap (no extra back point)
                [9, 10, 11, 12, 13, 14, 15, 16]
            ]
        }
    };

    // Post-process all ships to scale vertices by SHIP_SIZE_AU
    Object.values(SHIPS).forEach(ship => {
        if (ship.vertices && Array.isArray(ship.vertices)) {
            ship.vertices.forEach(vertex => {
                vertex.x *= SHIP_SIZE_AU;
                vertex.y *= SHIP_SIZE_AU;
                vertex.z *= SHIP_SIZE_AU;
            });
        }
    });

    /**
     * Get ship geometry by ID
     * @param {string} shipId - Ship geometry ID
     * @returns {Object} Ship geometry definition
     */
    function getShip(shipId = 'FIGHTER') {
        return SHIPS[shipId] || SHIPS.FIGHTER;
    }

    /**
     * Get all available ship geometries
     * @returns {Object} Map of all ship geometries
     */
    function getAllShips() {
        return SHIPS;
    }

    /**
     * Get a cube geometry for testing (temporary)
     */
    function getCube() {
        return {
            id: 'CUBE',
            vertices: [
                { x: -0.5, y: -0.5, z: -0.5 },
                { x: 0.5, y: -0.5, z: -0.5 },
                { x: 0.5, y: 0.5, z: -0.5 },
                { x: -0.5, y: 0.5, z: -0.5 },
                { x: -0.5, y: -0.5, z: 0.5 },
                { x: 0.5, y: -0.5, z: 0.5 },
                { x: 0.5, y: 0.5, z: 0.5 },
                { x: -0.5, y: 0.5, z: 0.5 }
            ],
            faces: [
                { vertices: [0, 1, 2, 3], color: '#ff0000' },
                { vertices: [4, 7, 6, 5], color: '#00ff00' },
                { vertices: [0, 3, 7, 4], color: '#0000ff' },
                { vertices: [1, 5, 6, 2], color: '#ffff00' },
                { vertices: [0, 4, 5, 1], color: '#00ffff' },
                { vertices: [3, 2, 6, 7], color: '#ff00ff' }
            ]
        };
    }

    return {
        getShip,
        getAllShips,
        getCube,
        SHIPS
    };
})();
