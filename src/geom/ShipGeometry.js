/**
 * Ship Geometry
 * 3D ship model definitions
 */

const ShipGeometry = (() => {
    // Default fighter ship: triangular rocket body with elevated crest and flat side wings
    // Vertex coordinates are in canonical form (relative units)
    // They will be scaled by SHIP_SIZE_AU in post-processing below
    const SHIPS = {
        FIGHTER: {
            id: 'FIGHTER',
            // Nose points forward (-Z). Base A/B are level with each other, C is elevated.
            // Wing tips are flat on the A/B plane to keep wings parallel to ship "ground".
            vertices: [
                { x: 0.0, y: 0.0, z: -1.9 },      // 0 nose
                { x: -0.58, y: -0.34, z: 1.45 }, // 1 base A (left, low)
                { x: 0.58, y: -0.34, z: 1.45 },  // 2 base B (right, low)
                { x: 0.0, y: 0.74, z: 1.45 },    // 3 base C (crest, high)
                { x: -1.35, y: -0.34, z: 0.35 }, // 4 wing left tip
                { x: 1.35, y: -0.34, z: 0.35 }   // 5 wing right tip
            ],

            // Explicit edge graph for wireframe rendering.
            edges: [
                [0, 1], [0, 2], [0, 3],
                [1, 2], [2, 3], [3, 1],
                [1, 4], [2, 5], [4, 5],
                [0, 4], [0, 5]
            ],
            
            // Faces as triangles (CCW when viewed from outside)
            faces: [
                [0, 1, 2],
                { vertices: [0, 2, 3], windshield: true, windshieldEdge: [0, 3], windshieldNose: 0, windshieldAft: 3 },
                { vertices: [0, 3, 1], windshield: true, windshieldEdge: [0, 3], windshieldNose: 0, windshieldAft: 3 },
                { vertices: [1, 3, 2], engineTexture: true },
                { vertices: [1, 4, 0] },
                { vertices: [2, 0, 5] }
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
