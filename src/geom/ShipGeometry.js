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
            // Simple long triangular pyramid for strong silhouette at small sizes
            vertices: [
                { x: 0.0, y: 0.0, z: 4.4 },      // 0 nose tip
                { x: -1.2, y: -0.35, z: -0.9 },  // 1 rear-left
                { x: 1.2, y: -0.35, z: -0.9 },   // 2 rear-right
                { x: 0.0, y: 0.95, z: -0.9 }     // 3 rear-top
            ],
            
            // Faces as triangles (CCW when viewed from outside)
            faces: [
                [0, 1, 2],
                { vertices: [0, 2, 3], windshield: true, windshieldEdge: [0, 3], windshieldNose: 0, windshieldAft: 3 },
                { vertices: [0, 3, 1], windshield: true, windshieldEdge: [0, 3], windshieldNose: 0, windshieldAft: 3 },
                { vertices: [1, 3, 2], engineTexture: true }
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
