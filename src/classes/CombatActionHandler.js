/**
 * CombatActionHandler - Executes combat actions via tick system
 * Each tick represents 1 engine worth of movement
 */

class CombatActionHandler {
    /**
     * Create an action handler
     * @param {CombatAction} action - The action to execute
     * @param {Array<Asteroid>} asteroids - Asteroids in the encounter
     */
    constructor(action, asteroids = []) {
        this.action = action;
        this.asteroids = asteroids;
        this.ship = action.ship;
        this.targetAngle = null;
        this.remainingDistance = 0;
        this.movementPerTick = { x: 0, y: 0 };
        this.initialized = false;
        this.justTurned = false; // Flag if ship turned instead of firing
    }
    
    /**
     * Check if target is within 90-degree firing arc in front of ship
     */
    isTargetInFiringArc(targetAngle) {
        // Normalize angles to 0-2π range
        const normalizeAngle = (angle) => {
            while (angle < 0) angle += Math.PI * 2;
            while (angle >= Math.PI * 2) angle -= Math.PI * 2;
            return angle;
        };
        
        const shipAngle = normalizeAngle(this.ship.angle);
        const targetNormalized = normalizeAngle(targetAngle);
        
        // Calculate angular difference
        let diff = targetNormalized - shipAngle;
        // Normalize to -π to π range
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        // Check if within 45 degrees (π/4) on either side (90 degree total cone)
        return Math.abs(diff) <= Math.PI / 4;
    }
    
    /**
     * Turn ship toward target angle, limited by engine
     */
    turnTowardTarget(targetAngle) {
        // Normalize angles
        const normalizeAngle = (angle) => {
            while (angle < 0) angle += Math.PI * 2;
            while (angle >= Math.PI * 2) angle -= Math.PI * 2;
            return angle;
        };
        
        const shipAngle = normalizeAngle(this.ship.angle);
        const targetNormalized = normalizeAngle(targetAngle);
        
        // Calculate angular difference
        let diff = targetNormalized - shipAngle;
        // Normalize to -π to π range (shortest path)
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        // Each engine point allows 45 degrees of turn (π/4 radians)
        const maxTurn = this.ship.engine * (Math.PI / 4);
        
        // Turn as much as possible
        if (Math.abs(diff) <= maxTurn) {
            // Can reach target angle
            this.ship.angle = targetNormalized;
            return true; // Successfully aligned
        } else {
            // Turn as far as possible toward target
            this.ship.angle = normalizeAngle(shipAngle + (diff > 0 ? maxTurn : -maxTurn));
            return false; // Not yet aligned
        }
    }
    
    /**
     * Initialize the action
     */
    initialize() {
        if (this.initialized) return;
        
        switch (this.action.actionType) {
            case COMBAT_ACTIONS.PURSUE:
                if (this.action.targetShip) {
                    const dx = this.action.targetShip.x - this.ship.x;
                    const dy = this.action.targetShip.y - this.ship.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    this.targetAngle = Math.atan2(dy, dx);
                    this.remainingDistance = Math.min(this.ship.engine, distance);
                    
                    // Calculate movement per tick (1 engine = 1 unit of movement)
                    if (distance > 0) {
                        this.movementPerTick.x = dx / distance;
                        this.movementPerTick.y = dy / distance;
                    }
                }
                break;
                
            case COMBAT_ACTIONS.FLEE:
                if (this.action.targetShip) {
                    const dx = this.ship.x - this.action.targetShip.x;
                    const dy = this.ship.y - this.action.targetShip.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    this.targetAngle = Math.atan2(dy, dx);
                    this.remainingDistance = this.ship.engine;
                    
                    // Calculate movement per tick (1 engine = 1 unit of movement)
                    if (distance > 0) {
                        this.movementPerTick.x = dx / distance;
                        this.movementPerTick.y = dy / distance;
                    }
                }
                break;
                
            case COMBAT_ACTIONS.GET_RAMMED:
                this.targetAngle = this.action.knockbackAngle;
                this.remainingDistance = this.action.knockbackDistance;
                
                // Calculate movement in knockback direction
                this.movementPerTick.x = Math.cos(this.action.knockbackAngle);
                this.movementPerTick.y = Math.sin(this.action.knockbackAngle);
                break;
                
            case COMBAT_ACTIONS.FIRE_LASER:
                // Calculate hit and damage, but animate projectile movement
                if (this.action.targetShip) {
                    const dx = this.action.targetShip.x - this.ship.x;
                    const dy = this.action.targetShip.y - this.ship.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const targetAngle = Math.atan2(dy, dx);
                    
                    // Check if target is in firing arc
                    if (!this.isTargetInFiringArc(targetAngle)) {
                        // Need to turn toward target
                        const aligned = this.turnTowardTarget(targetAngle);
                        this.justTurned = true;
                        
                        if (!aligned) {
                            // Couldn't turn far enough, action just turns
                            this.action.hit = false;
                            this.action.distance = distance;
                            this.action.complete();
                            return;
                        }
                        // If aligned, fall through to fire laser
                    }
                    
                    // Target is in arc (or we just turned to align), fire laser
                    // Calculate hit chance: radar / distance
                    const hitChance = Math.min(1, this.ship.radar / distance);
                    const hit = Math.random() < hitChance;
                    
                    // Store hit result in action
                    this.action.hit = hit;
                    this.action.distance = distance;
                    
                    // Pre-calculate damage for hit
                    if (hit) {
                        const damage = Math.floor(Math.random() * this.ship.lasers) + 1;
                        this.action.damage = damage;
                    }
                    
                    // Set up projectile movement
                    this.targetAngle = targetAngle;
                    this.remainingDistance = distance;
                    
                    // Projectile moves at 10 units per tick (faster than ships)
                    if (distance > 0) {
                        this.movementPerTick.x = (dx / distance) * 10;
                        this.movementPerTick.y = (dy / distance) * 10;
                    }
                    
                    // Create projectile visual
                    this.action.projectile = {
                        x: this.ship.x,
                        y: this.ship.y,
                        angle: this.targetAngle,
                        character: this.getLaserCharacter(this.targetAngle),
                        color: COLORS.TEXT_ERROR
                    };
                }
                break;
        }
        
        this.initialized = true;
    }
    
    /**
     * Execute one tick of the action
     * @returns {boolean} True if action is complete, false otherwise
     */
    tick() {
        if (!this.initialized) {
            this.initialize();
        }
        
        if (this.action.completed) {
            return true;
        }
        
        // FIRE_LASER has projectile animation
        if (this.action.actionType === COMBAT_ACTIONS.FIRE_LASER) {
            return this.tickLaser();
        }
        
        // Handle GET_RAMMED differently - can spin and move concurrently
        if (this.action.actionType === COMBAT_ACTIONS.GET_RAMMED) {
            return this.tickGetRammed();
        }
        
        // For PURSUE and FLEE, turn first, then move
        return this.tickMoveAction();
    }
    
    /**
     * Tick for FIRE_LASER action - move projectile toward target
     */
    tickLaser() {
        if (!this.action.projectile) {
            // No projectile, complete immediately
            this.action.complete();
            return true;
        }
        
        // Move projectile
        const moveAmount = Math.min(10, this.remainingDistance);
        const oldX = this.action.projectile.x;
        const oldY = this.action.projectile.y;
        this.action.projectile.x += this.movementPerTick.x;
        this.action.projectile.y += this.movementPerTick.y;
        this.remainingDistance -= moveAmount;
        
        // Check for asteroid collisions along the path
        const hitAsteroid = this.checkAsteroidCollision(oldX, oldY, this.action.projectile.x, this.action.projectile.y);
        if (hitAsteroid) {
            // Hit an asteroid - disable it and stop the laser
            hitAsteroid.disabled = true;
            this.action.hit = false; // Didn't hit the target ship
            this.action.projectile = null;
            this.action.complete();
            return true;
        }
        
        // Check if projectile reached target
        if (this.remainingDistance <= 0) {
            // Apply damage if hit
            if (this.action.hit && this.action.targetShip) {
                const damage = this.action.damage;
                
                // Apply damage to shields first, then hull
                if (this.action.targetShip.shields > 0) {
                    const shieldDamage = Math.min(damage, this.action.targetShip.shields);
                    this.action.targetShip.shields -= shieldDamage;
                    const remainingDamage = damage - shieldDamage;
                    if (remainingDamage > 0) {
                        this.action.targetShip.hull -= remainingDamage;
                    }
                } else {
                    this.action.targetShip.hull -= damage;
                }
                
                // Check if ship is disabled
                if (this.action.targetShip.hull <= 0) {
                    this.action.targetShip.hull = 0;
                    this.action.targetShip.disabled = true;
                }
            }
            
            // Clear projectile and complete action
            this.action.projectile = null;
            this.action.complete();
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if laser path collides with any asteroids
     * Returns the nearest asteroid hit, or null
     */
    checkAsteroidCollision(x1, y1, x2, y2) {
        let nearestAsteroid = null;
        let nearestDistance = Infinity;
        
        // Check all non-disabled asteroids
        for (const asteroid of this.asteroids) {
            if (asteroid.disabled) continue;
            
            // Check if line segment intersects asteroid circle
            if (Geom.lineCircleIntersect(x1, y1, x2, y2, asteroid.x, asteroid.y, ASTEROID_SIZE)) {
                // Calculate distance from laser start to asteroid
                const distance = Geom.distance(this.ship.x, this.ship.y, asteroid.x, asteroid.y);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestAsteroid = asteroid;
                }
            }
        }
        
        return nearestAsteroid;
    }
    
    /**
     * Get laser character based on angle
     */
    getLaserCharacter(angle) {
        // Convert angle to degrees and normalize to 0-360
        const degrees = (angle * (180 / Math.PI) + 360) % 360;
        
        // Choose appropriate line segment character based on angle
        if (degrees >= 337.5 || degrees < 22.5) {
            return '─'; // Horizontal ─
        } else if (degrees >= 22.5 && degrees < 67.5) {
            return '╱'; // Diagonal /
        } else if (degrees >= 67.5 && degrees < 112.5) {
            return '│'; // Vertical │
        } else if (degrees >= 112.5 && degrees < 157.5) {
            return '╲'; // Diagonal \
        } else if (degrees >= 157.5 && degrees < 202.5) {
            return '─'; // Horizontal ─
        } else if (degrees >= 202.5 && degrees < 247.5) {
            return '╱'; // Diagonal /
        } else if (degrees >= 247.5 && degrees < 292.5) {
            return '│'; // Vertical │
        } else {
            return '╲'; // Diagonal \
        }
    }
    
    /**
     * Tick for GET_RAMMED action
     */
    tickGetRammed() {
        // Spin ship randomly
        const spinAmount = (Math.PI / 4); // 1/8th of a full rotation per tick
        this.ship.angle += (Math.random() - 0.5) * spinAmount * 2;
        
        // Move in knockback direction
        if (this.remainingDistance > 0) {
            const moveAmount = Math.min(1, this.remainingDistance);
            this.ship.x += this.movementPerTick.x * moveAmount;
            this.ship.y += this.movementPerTick.y * moveAmount;
            this.remainingDistance -= moveAmount;
        }
        
        if (this.remainingDistance <= 0) {
            this.action.complete();
            return true;
        }
        
        return false;
    }
    
    /**
     * Tick for PURSUE and FLEE actions
     */
    tickMoveAction() {
        // First, turn toward target angle if needed
        const angleDiff = this.normalizeAngle(this.targetAngle - this.ship.angle);
        const turnIncrement = Math.PI / 4; // 1/8th of a full rotation (45 degrees)
        
        // If we need to turn more than a small threshold
        if (Math.abs(angleDiff) > 0.1) {
            // Turn costs 1 engine per 1/8th turn
            if (this.ship.engine > 0) {
                const turnDirection = angleDiff > 0 ? 1 : -1;
                const turnAmount = Math.min(Math.abs(angleDiff), turnIncrement);
                this.ship.angle += turnAmount * turnDirection;
                
                // Turning uses engine power (but we track it implicitly via ticks)
                return false; // Still turning
            }
        }
        
        // Now move forward
        if (this.remainingDistance > 0) {
            const moveAmount = Math.min(1, this.remainingDistance);
            this.ship.x += this.movementPerTick.x * moveAmount;
            this.ship.y += this.movementPerTick.y * moveAmount;
            this.remainingDistance -= moveAmount;
            
            // Check for ramming (if PURSUE and we've reached the target)
            if (this.action.actionType === COMBAT_ACTIONS.PURSUE && this.action.targetShip) {
                const dx = this.action.targetShip.x - this.ship.x;
                const dy = this.action.targetShip.y - this.ship.y;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                
                if (currentDistance < 1) {
                    // Collision! Create GET_RAMMED action for target
                    // Calculate mass ratio (our mass vs their mass)
                    const massRatio = this.ship.maxHull / this.action.targetShip.maxHull;
                    // Base knockback is half engine level, multiplied by mass ratio
                    const knockbackDistance = (this.ship.engine / 2) * massRatio;
                    const knockbackAngle = this.ship.angle;
                    
                    // Complete current action
                    this.action.complete();
                    
                    // Create and return ramming action for target ship
                    const ramAction = new CombatAction(
                        this.action.targetShip,
                        COMBAT_ACTIONS.GET_RAMMED,
                        null,
                        knockbackDistance,
                        knockbackAngle,
                        this.ship // Store rammer for damage calculation
                    );
                    
                    // Store reference for caller to handle
                    this.ramAction = ramAction;
                    return true;
                }
            }
        }
        
        if (this.remainingDistance <= 0) {
            this.action.complete();
            return true;
        }
        
        return false;
    }
    
    /**
     * Normalize angle to -PI to PI range
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
    
    /**
     * Check if action is complete
     */
    isComplete() {
        return this.action.completed;
    }
}
