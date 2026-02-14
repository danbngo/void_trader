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
     * Initialize escort ships for the player
     * @param {GameState} gameState
     * @param {Object} playerShip
     * @param {Array} systems - System list for context
     * @returns {Array} Array of escort ship objects
     */
    function initializeEscortShips(gameState, playerShip, systems = []) {
        const escorts = [];
        
        // Create escort object for each ship except the first (player's)
        if (gameState.ships && gameState.ships.length > 1) {
            for (let i = 1; i < gameState.ships.length; i++) {
                const shipData = gameState.ships[i];
                escorts.push({
                    shipIndex: i,
                    shipData: shipData,
                    position: { x: playerShip.position.x, y: playerShip.position.y, z: playerShip.position.z },
                    rotation: { x: 0, y: 0, z: 0, w: 1 },
                    velocity: { x: 0, y: 0, z: 0 },
                    geometry: ShipGeometry.getShip('FIGHTER'),
                    state: 'following', // 'following', 'avoiding', 'docking'
                    lastAvoidanceTime: 0
                });
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

        escorts.forEach(escort => {
            updateEscortShip(escort, playerShip, system, dt, config);
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
            return;
        }

        const direction = ThreeDUtils.normalizeVec(toPlayer);
        const desiredSpeed = Math.min(MAX_APPROACH_SPEED, distance / dt);
        const acceleration = ThreeDUtils.scaleVec(direction, desiredSpeed * 0.5); // Smooth acceleration

        escort.velocity = ThreeDUtils.addVec(escort.velocity, ThreeDUtils.scaleVec(acceleration, dt));
    }

    /**
     * Apply avoidance behavior
     */
    function updateAvoidance(escort, hazards, playerShip, dt, config) {
        const primaryHazard = hazards[0];
        if (!primaryHazard) {
            return;
        }

        const away = ThreeDUtils.subVec(escort.position, primaryHazard.position);
        const distFromHazard = ThreeDUtils.vecLength(away);

        if (distFromHazard < 0.01) {
            // Too close, move away faster
            escort.velocity = ThreeDUtils.scaleVec(away, MAX_APPROACH_SPEED / Math.max(0.1, distFromHazard));
        } else {
            const direction = ThreeDUtils.normalizeVec(away);
            escort.velocity = ThreeDUtils.scaleVec(direction, MAX_APPROACH_SPEED);
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
