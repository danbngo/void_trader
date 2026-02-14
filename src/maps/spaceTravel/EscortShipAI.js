/**
 * Escort Ship AI
 * Controls AI-piloted escort ships that follow the player
 */

const EscortShipAI = (() => {
    const FOLLOW_DISTANCE = 0.5; // AU - desired distance to maintain from player
    const FOLLOW_STOP_DISTANCE = 0.1; // AU - stop moving when this close
    const MAX_APPROACH_SPEED = 60; // m/s
    const COLLISION_AVOID_RADIUS = 2; // AU - avoid objects within this range
    const STAR_HEAT_AVOID_MARGIN = 1.2; // Multiplier on star heat radius for avoidance

    /**
     * Calculate collision radius from ship geometry
     * @param {Object} geometry - Ship geometry with vertices
     * @param {Object} config - SpaceTravelConfig with SHIP_PHYSICS_SCALE
     * @returns {number} Collision radius in AU
     */
    function calculateShipRadius(geometry, config) {
        if (!geometry || !geometry.vertices || geometry.vertices.length === 0) {
            return 0.00004; // fallback
        }
        
        const verts = geometry.vertices;
        let minX = verts[0].x, maxX = verts[0].x;
        let minY = verts[0].y, maxY = verts[0].y;
        let minZ = verts[0].z, maxZ = verts[0].z;
        
        verts.forEach(v => {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
        });
        
        const worldSizeX = (maxX - minX) * (config.SHIP_PHYSICS_SCALE || 50);
        const worldSizeY = (maxY - minY) * (config.SHIP_PHYSICS_SCALE || 50);
        const worldSizeZ = (maxZ - minZ) * (config.SHIP_PHYSICS_SCALE || 50);
        return Math.sqrt(worldSizeX * worldSizeX + worldSizeY * worldSizeY + worldSizeZ * worldSizeZ) / 2;
    }

    /**
     * Initialize escort ships for the player
     * @param {GameState} gameState
     * @param {Object} playerShip
     * @param {Array} systems - System list for context
     * @param {Object} config - SpaceTravelConfig for spawn distances
     * @returns {Array} Array of escort ship objects
     */
    function initializeEscortShips(gameState, playerShip, systems = [], config = {}) {
        const escorts = [];
        const spawnDistance = Math.max(0.01, Math.min(1, config.SHIP_SPAWN_DISTANCE_AU || 0.3));
        const spawnSpread = Math.max(0.01, Math.min(0.5, config.SHIP_SPAWN_SPREAD_AU || 0.15));
        
        // Create escort object for each ship except the first (player's)
        if (gameState.ships && gameState.ships.length > 1) {
            for (let i = 1; i < gameState.ships.length; i++) {
                const shipData = gameState.ships[i];
                const geometry = ShipGeometry.getShip('FIGHTER');
                
                // Calculate spawn position offset to spread escorts around player
                // Use different spawn points to avoid collision at spawn
                const angle = (i - 1) * (Math.PI * 2 / (gameState.ships.length - 1));
                const offsetX = Math.cos(angle) * (spawnDistance + Math.random() * spawnSpread);
                const offsetY = Math.sin(angle) * (spawnDistance + Math.random() * spawnSpread);
                const offsetZ = (Math.random() - 0.5) * spawnSpread * 0.5;
                
                // Sanity check: ensure offsets are finite and reasonable
                const finalOffsetX = Number.isFinite(offsetX) && Math.abs(offsetX) < 10 ? offsetX : spawnDistance;
                const finalOffsetY = Number.isFinite(offsetY) && Math.abs(offsetY) < 10 ? offsetY : spawnDistance;
                const finalOffsetZ = Number.isFinite(offsetZ) && Math.abs(offsetZ) < 10 ? offsetZ : 0;
                
                const escort = {
                    shipIndex: i,
                    shipData: shipData,
                    position: { 
                        x: playerShip.position.x + finalOffsetX, 
                        y: playerShip.position.y + finalOffsetY, 
                        z: playerShip.position.z + finalOffsetZ 
                    },
                    rotation: { x: 0, y: 0, z: 0, w: 1 },
                    velocity: { x: 0, y: 0, z: 0 },
                    geometry: geometry,
                    state: 'following', // 'following', 'avoiding', 'docking'
                    lastAvoidanceTime: 0,
                    lastCollisionMs: 0
                };
                
                escorts.push(escort);
                
                // Log ship geometry sizes
                if (geometry && geometry.vertices && geometry.vertices.length > 0) {
                    const verts = geometry.vertices;
                    let minX = verts[0].x, maxX = verts[0].x;
                    let minY = verts[0].y, maxY = verts[0].y;
                    let minZ = verts[0].z, maxZ = verts[0].z;
                    
                    verts.forEach(v => {
                        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
                        minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
                    });
                    
                    const worldSizeX = (maxX - minX) * (config.SHIP_PHYSICS_SCALE || 50);
                    const worldSizeY = (maxY - minY) * (config.SHIP_PHYSICS_SCALE || 50);
                    const worldSizeZ = (maxZ - minZ) * (config.SHIP_PHYSICS_SCALE || 50);
                    
                    // Both player and escort use same geometry, so calculate radii the same way
                    const escortRadius = calculateShipRadius(geometry, config);
                    const playerGeometry = ShipGeometry.getShip('FIGHTER'); // Player uses FIGHTER too
                    const playerRadius = calculateShipRadius(playerGeometry, config);
                    const offsetDist = Math.sqrt(finalOffsetX * finalOffsetX + finalOffsetY * finalOffsetY + finalOffsetZ * finalOffsetZ);
                    const minSafeDistance = escortRadius + playerRadius;
                    const hasIntersection = offsetDist < minSafeDistance;
                    
                    console.log(`[EscortShipAI] Escort ${i} SPAWN:`, {
                        shipName: shipData.name || `Ship ${i}`,
                        playerPos: playerShip.position,
                        escortPos: escort.position,
                        spawnOffset: { x: finalOffsetX.toFixed(4), y: finalOffsetY.toFixed(4), z: finalOffsetZ.toFixed(4) },
                        offsetDistance: offsetDist.toFixed(4),
                        modelSize: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
                        worldSize: { x: worldSizeX, y: worldSizeY, z: worldSizeZ },
                        radii: { escortRadius: escortRadius.toFixed(6), playerRadius: playerRadius.toFixed(6), minSafeDistance: minSafeDistance.toFixed(6) },
                        hasIntersection: hasIntersection,
                        vertexCount: verts.length,
                        faceCount: geometry.faces?.length || 0,
                        positionIsFinite: Number.isFinite(escort.position.x) && Number.isFinite(escort.position.y) && Number.isFinite(escort.position.z)
                    });
                }
            }
        }
        
        return escorts;
    }

    /**
     * Update escort ship positions and AI
     * @param {Array} escorts - Array of escort ship objects
     * @param {Object} playerShip - Player's ship
     * @param {Object} system - Current star system
     * @param {number} dt - Delta time in seconds
     * @param {Object} config - SpaceTravelConfig
     */
    function update(escorts, playerShip, system, dt, config) {
        if (!escorts || !playerShip || !system) {
            return;
        }

        // Sync escort positions if player's coordinate system changed
        // (e.g., due to station positioning or system transition)
        syncEscortPositions(escorts, playerShip, config);

        escorts.forEach(escort => {
            updateEscortShip(escort, playerShip, system, dt, config);
        });
    }

    /**
     * Sync escort positions to player if coordinate system changed
     * This handles cases when player position is relocated (station/system transitions)
     */
    function syncEscortPositions(escorts, playerShip, config) {
        const maxReasonableDistance = 10; // AU - escorts shouldn't be this far from player naturally
        
        escorts.forEach(escort => {
            const toPlayer = ThreeDUtils.subVec(playerShip.position, escort.position);
            const distance = ThreeDUtils.vecLength(toPlayer);
            
            if (distance > maxReasonableDistance) {
                // Player's coordinate system has changed - relocate escort near player
                const spawnDistance = Math.max(0.01, Math.min(1, config.SHIP_SPAWN_DISTANCE_AU || 0.3));
                const spawnSpread = Math.max(0.01, Math.min(0.5, config.SHIP_SPAWN_SPREAD_AU || 0.15));
                
                // Calculate new spawn position offset
                const angle = Math.random() * Math.PI * 2;
                const offsetX = Math.cos(angle) * (spawnDistance + Math.random() * spawnSpread);
                const offsetY = Math.sin(angle) * (spawnDistance + Math.random() * spawnSpread);
                const offsetZ = (Math.random() - 0.5) * spawnSpread * 0.5;
                
                const oldPos = escort.position;
                const newPos = {
                    x: playerShip.position.x + offsetX,
                    y: playerShip.position.y + offsetY,
                    z: playerShip.position.z + offsetZ
                };
                escort.position = newPos;
                escort.velocity = { x: 0, y: 0, z: 0 };
                
                // Calculate collision info
                const offsetDist = Math.sqrt(offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ);
                const geometry = escort.geometry;
                const escortRadius = calculateShipRadius(geometry, config);
                const playerGeometry = ShipGeometry.getShip('FIGHTER');
                const playerRadius = calculateShipRadius(playerGeometry, config);
                const minSafeDistance = escortRadius + playerRadius;
                const hasIntersection = offsetDist < minSafeDistance;
                const newDistance = Math.sqrt((newPos.x - playerShip.position.x)**2 +
                                             (newPos.y - playerShip.position.y)**2 +
                                             (newPos.z - playerShip.position.z)**2);
                
                console.log(`[EscortShipAI] Escort ${escort.shipIndex} SYNCED to new coordinate system:`, {
                    reason: 'coordinate_system_change',
                    oldDistance: distance.toFixed(1),
                    oldPos: oldPos,
                    playerPos: playerShip.position,
                    newPos: newPos,
                    newDistance: newDistance.toFixed(4),
                    offsetDistance: offsetDist.toFixed(6),
                    radii: { escortRadius: escortRadius.toFixed(6), playerRadius: playerRadius.toFixed(6), minSafeDistance: minSafeDistance.toFixed(6) },
                    hasIntersection: hasIntersection
                });
            }
        });
    }

    /**
     * Update a single escort ship
     */
    function updateEscortShip(escort, playerShip, system, dt, config) {
        const toPlayer = ThreeDUtils.subVec(playerShip.position, escort.position);
        const distanceToPlayer = ThreeDUtils.vecLength(toPlayer);

        // Check for nearby hazards
        const hazards = findNearbyHazards(escort, system, config);
        
        if (hazards.length > 0) {
            // Avoid hazards
            updateAvoidance(escort, hazards, playerShip, dt, config);
            escort.state = 'avoiding';
        } else if (distanceToPlayer > FOLLOW_DISTANCE + FOLLOW_STOP_DISTANCE) {
            // Approach player
            applyFollowBehavior(escort, playerShip, dt, config);
            escort.state = 'following';
        } else {
            // Maintain distance - slight damping
            escort.velocity = ThreeDUtils.scaleVec(escort.velocity, 0.95);
            escort.state = 'following';
        }

        // Apply velocity and position update
        const oldPosition = escort.position;
        const newPosition = ThreeDUtils.addVec(escort.position, ThreeDUtils.scaleVec(escort.velocity, dt));
        escort.position = newPosition;
        
        // Update rotation to face direction of movement
        if (ThreeDUtils.vecLength(escort.velocity) > 0.1) {
            const dir = ThreeDUtils.normalizeVec(escort.velocity);
            escort.rotation = directionToQuaternion(dir);
        }
    }

    /**
     * Find nearby hazards (stars, planets, stations)
     */
    function findNearbyHazards(escort, system, config) {
        const hazards = [];
        
        // Calculate system center in world coordinates
        const systemCenter = {
            x: system.x * config.LY_TO_AU,
            y: system.y * config.LY_TO_AU,
            z: 0
        };

        // Check stars (heat damage)
        if (system.stars && Array.isArray(system.stars)) {
            system.stars.forEach(star => {
                const toStar = ThreeDUtils.subVec(star.position || { x: 0, y: 0, z: 0 }, escort.position);
                const dist = ThreeDUtils.vecLength(toStar);
                const heatRadius = (config.STAR_HEAT_MAX_DISTANCE_AU || 10) * STAR_HEAT_AVOID_MARGIN;
                
                if (dist < heatRadius) {
                    hazards.push({
                        type: 'star',
                        position: star.position || { x: 0, y: 0, z: 0 },
                        radius: heatRadius,
                        danger: 'heat'
                    });
                }
            });
        }

        // Check planets
        if (system.planets && Array.isArray(system.planets)) {
            system.planets.forEach(planet => {
                const orbit = planet.orbit ? SystemOrbitUtils.getOrbitPosition(planet.orbit, new Date()) : null;
                const planetPos = ThreeDUtils.addVec(systemCenter, orbit || { x: 0, y: 0, z: 0 });
                const toPlanet = ThreeDUtils.subVec(planetPos, escort.position);
                const dist = ThreeDUtils.vecLength(toPlanet);
                const radius = (planet.radiusAU || 0) + COLLISION_AVOID_RADIUS;
                
                if (dist < radius) {
                    hazards.push({
                        type: 'planet',
                        position: planetPos,
                        radius: radius,
                        danger: 'collision'
                    });
                }
            });
        }

        return hazards;
    }

    /**
     * Apply following behavior
     */
    function applyFollowBehavior(escort, playerShip, dt, config) {
        const toPlayer = ThreeDUtils.subVec(playerShip.position, escort.position);
        const distance = ThreeDUtils.vecLength(toPlayer);

        if (distance <= FOLLOW_STOP_DISTANCE) {
            escort.velocity = ThreeDUtils.scaleVec(escort.velocity, 0.9);
            return;
        }

        // Use ship speed constants from config - escorts should move at player's speed scales
        const shipEngine = 10; // Assume escort has 10 engine level like player
        const maxSpeed = shipEngine * (config.SHIP_SPEED_PER_ENGINE || 1/600); // AU/s
        const shipAccel = shipEngine * (config.SHIP_ACCEL_PER_ENGINE || 1/60); // AU/s²

        const direction = ThreeDUtils.normalizeVec(toPlayer);
        
        // Accelerate toward player at reasonable rates
        const acceleration = ThreeDUtils.scaleVec(direction, shipAccel * 2); // 2x acceleration to catch up
        escort.velocity = ThreeDUtils.addVec(escort.velocity, ThreeDUtils.scaleVec(acceleration, dt));
        
        // Cap velocity to max speed
        const velocityMag = ThreeDUtils.vecLength(escort.velocity);
        if (velocityMag > maxSpeed) {
            escort.velocity = ThreeDUtils.scaleVec(escort.velocity, maxSpeed / velocityMag);
        }
    }

    /**
     * Apply avoidance behavior
     */
    function updateAvoidance(escort, hazards, playerShip, dt, config) {
        const primaryHazard = hazards[0];
        if (!primaryHazard) {
            return;
        }

        // Use ship speed constants from config
        const shipEngine = 10; // Assume escort has 10 engine level like player
        const maxSpeed = shipEngine * (config.SHIP_SPEED_PER_ENGINE || 1/600); // AU/s
        const shipAccel = shipEngine * (config.SHIP_ACCEL_PER_ENGINE || 1/60) * 3; // 3x acceleration for emergency avoidance

        const away = ThreeDUtils.subVec(escort.position, primaryHazard.position);
        const distFromHazard = ThreeDUtils.vecLength(away);

        if (distFromHazard < 0.01) {
            // Too close, move away faster - use emergency acceleration
            const emergencyAccel = Math.min(maxSpeed, shipAccel * 5);
            escort.velocity = ThreeDUtils.scaleVec(away, emergencyAccel / Math.max(0.001, distFromHazard));
            // Cap to max speed
            const velocityMag = ThreeDUtils.vecLength(escort.velocity);
            if (velocityMag > maxSpeed) {
                escort.velocity = ThreeDUtils.scaleVec(escort.velocity, maxSpeed / velocityMag);
            }
        } else {
            const direction = ThreeDUtils.normalizeVec(away);
            escort.velocity = ThreeDUtils.scaleVec(direction, maxSpeed);
        }
    }

    /**
     * Convert velocity direction to rotation quaternion
     */
    function directionToQuaternion(direction) {
        // Point in +Z direction, aim toward direction
        const forward = { x: 0, y: 0, z: 1 };
        const normalized = ThreeDUtils.normalizeVec(direction);

        // Simple rotation to align forward with normalized direction
        const angle = Math.acos(Math.max(-1, Math.min(1, ThreeDUtils.dotVec(forward, normalized))));
        const cross = {
            x: forward.y * normalized.z - forward.z * normalized.y,
            y: forward.z * normalized.x - forward.x * normalized.z,
            z: forward.x * normalized.y - forward.y * normalized.x
        };
        const crossLen = ThreeDUtils.vecLength(cross);

        if (crossLen < 0.001) {
            return { x: 0, y: 0, z: 0, w: 1 };
        }

        const axis = ThreeDUtils.normalizeVec(cross);
        return ThreeDUtils.quatFromAxisAngle(axis, angle);
    }

    /**
     * Check if escort ship collides with player
     */
    function checkPlayerCollision(escort, playerShip, config) {
        const relative = ThreeDUtils.subVec(escort.position, playerShip.position);
        const distance = ThreeDUtils.vecLength(relative);
        
        // Collision threshold
        const playerRadius = (config.SHIP_COLLISION_RADIUS || 0.3);
        const escortRadius = (config.SHIP_COLLISION_RADIUS || 0.3);
        const collisionDist = playerRadius + escortRadius;

        return distance < collisionDist;
    }

    /**
     * Get collision damage when player hits this escort
     */
    function getCollisionDamage(escort, playerShip, config) {
        // Calculate damage based on relative velocity
        const relVel = ThreeDUtils.subVec(playerShip.velocity, escort.velocity);
        const speed = ThreeDUtils.vecLength(relVel);
        
        // Same damage calculation as station collisions
        const baseDamage = config.COLLISION_DAMAGE_BASE || 10;
        const speedDamagePerMPS = config.COLLISION_DAMAGE_PER_MPS || 0.5;
        
        return baseDamage + (speed * speedDamagePerMPS);
    }

    return {
        initializeEscortShips,
        update,
        checkPlayerCollision,
        getCollisionDamage,
        FOLLOW_DISTANCE,
        FOLLOW_STOP_DISTANCE
    };
})();
