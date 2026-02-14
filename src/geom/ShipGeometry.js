/**
 * Ship Geometry
 * 3D ship model definitions
 */

const ShipGeometry = (() => {
    // Default fighter ship: triangular with pointy nose
    // Vertex coordinates are in canonical form (relative units)
    // They will be scaled by SHIP_SIZE_AU in post-processing below
    const SHIPS = {
        FIGHTER: {
            id: 'FIGHTER',
            vertices: [
                // Nose point (pointy front)
                { x: 0, y: 0, z: 2 },      // 0: Nose tip
                
                // Front wings (wider section)
                { x: -0.6, y: 0.3, z: 1.2 },  // 1: Right wing front upper
                { x: 0.6, y: 0.3, z: 1.2 },   // 2: Left wing front upper
                { x: -0.8, y: -0.2, z: 1 },   // 3: Right wing front lower
                { x: 0.8, y: -0.2, z: 1 },    // 4: Left wing front lower
                
                // Mid-body (widest section)
                { x: -0.7, y: 0.4, z: 0 },    // 5: Right side mid upper
                { x: 0.7, y: 0.4, z: 0 },     // 6: Left side mid upper
                { x: -0.9, y: -0.3, z: 0 },   // 7: Right side mid lower
                { x: 0.9, y: -0.3, z: 0 },    // 8: Left side mid lower
                
                // Rear taper (engine section)
                { x: -0.3, y: 0.2, z: -1.2 }, // 9: Right rear upper
                { x: 0.3, y: 0.2, z: -1.2 },  // 10: Left rear upper
                { x: -0.2, y: -0.2, z: -1.2 },// 11: Right rear lower
                { x: 0.2, y: -0.2, z: -1.2 }, // 12: Left rear lower
                
                // Engine exhaust
                { x: 0, y: 0, z: -1.5 }       // 13: Engine nozzle
            ],
            
            // Faces as triangles (CCW when viewed from outside)
            faces: [
                // Nose cone (5 faces)
                { vertices: [0, 1, 2], color: '#00ff00' },     // Top nose
                { vertices: [0, 3, 1], color: '#00dd00' },     // Right nose upper
                { vertices: [0, 4, 2], color: '#00dd00' },     // Left nose upper
                { vertices: [0, 3, 4], color: '#00bb00' },     // Bottom nose
                
                // Main body (8 faces - 4 sides + top/bottom)
                { vertices: [1, 2, 6, 5], color: '#00cc00' },  // Top fuselage (quad as 2 tris won't work, so just top)
                { vertices: [1, 5, 6, 2], color: '#00cc00' },  // Top (split into tris properly)
                { vertices: [3, 7, 8, 4], color: '#009900' },  // Bottom (split)
                
                // Right side
                { vertices: [1, 5, 9], color: '#00aa00' },
                { vertices: [5, 7, 9], color: '#008800' },
                
                // Left side
                { vertices: [2, 10, 6], color: '#00aa00' },
                { vertices: [6, 10, 8], color: '#008800' },
                
                // Rear section (4 faces to engine nozzle)
                { vertices: [5, 9, 10], color: '#006600' },     // Top rear
                { vertices: [7, 11, 9], color: '#006600' },     // Right rear
                { vertices: [8, 10, 12], color: '#006600' },    // Left rear
                { vertices: [7, 8, 12, 11], color: '#004400' }, // Bottom rear
                
                // Engine nozzle (4 triangles)
                { vertices: [9, 11, 13], color: '#ff8800' },    // Engine right
                { vertices: [10, 13, 12], color: '#ff8800' },   // Engine left
                { vertices: [9, 13, 10], color: '#ffaa00' },    // Engine top
                { vertices: [11, 12, 13], color: '#ff6600' }    // Engine bottom
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
