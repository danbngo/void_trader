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
            // Base hull + side wings
            vertices: [
                // Nose (pointy front, facing +Z direction)
                { x: 0, y: 0, z: 3 },        // 0: Nose tip
                
                // Base (rear of ship, small square)
                { x: -0.3, y: 0.3, z: -0.5 },  // 1: Base top-left
                { x: 0.3, y: 0.3, z: -0.5 },   // 2: Base top-right
                { x: 0.3, y: -0.3, z: -0.5 },  // 3: Base bottom-right
                { x: -0.3, y: -0.3, z: -0.5 }, // 4: Base bottom-left

                // Left wing (3 points on left side plane + 1 outward point)
                { x: -0.105, y: 0.0, z: 1.775 }, // 5: Left wing forward anchor (on side plane)
                { x: -0.24, y: 0.24, z: 0.2 },   // 6: Left wing rear-top anchor (on side plane)
                { x: -0.24, y: -0.24, z: 0.2 },  // 7: Left wing rear-bottom anchor (on side plane)
                { x: -1.85, y: 0.0, z: 1.0 },    // 8: Left wing outward point (~1/2 dorsal length out)

                // Right wing (mirrored)
                { x: 0.105, y: 0.0, z: 1.775 },  // 9: Right wing forward anchor (on side plane)
                { x: 0.24, y: 0.24, z: 0.2 },    // 10: Right wing rear-top anchor (on side plane)
                { x: 0.24, y: -0.24, z: 0.2 },   // 11: Right wing rear-bottom anchor (on side plane)
                { x: 1.85, y: 0.0, z: 1.0 }      // 12: Right wing outward point (~1/2 dorsal length out)
            ],
            
            // Faces as triangles (CCW when viewed from outside)
            // Colors are not used - distance-based shading will be applied
            faces: [
                // 4 triangular sides of pyramid
                [0, 2, 1],  // Top face
                [0, 3, 2],  // Right face
                [0, 4, 3],  // Bottom face
                [0, 1, 4],  // Left face
                
                // Square base (2 triangles)
                [1, 2, 3, 4],  // Base (quad)

                // Wing surfaces (4-point triangles / quads)
                [5, 6, 8, 7],   // Left wing
                [9, 11, 12, 10] // Right wing (mirrored winding)
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
