/**
 * CombatActionHandler - Executes combat actions via tick system
 * Each tick represents 1 engine worth of movement
 */

class CombatActionHandler {
    /**
     * Create an action handler
     * @param {CombatAction} action - The action to execute
     */
    constructor(action) {
        this.action = action;
        this.ship = action.ship;
        this.targetAngle = null;
        this.remainingDistance = 0;
        this.movementPerTick = { x: 0, y: 0 };
        this.initialized = false;
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
                // Instant action - calculate hit and damage immediately
                if (this.action.targetShip) {
                    const dx = this.action.targetShip.x - this.ship.x;
                    const dy = this.action.targetShip.y - this.ship.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Calculate hit chance: radar / distance
                    const hitChance = Math.min(1, this.ship.radar / distance);
                    const hit = Math.random() < hitChance;
                    
                    // Store hit result in action
                    this.action.hit = hit;
                    this.action.distance = distance;
                    
                    if (hit) {
                        // Calculate damage: random between 1 and ship.lasers
                        const damage = Math.floor(Math.random() * this.ship.lasers) + 1;
                        this.action.damage = damage;
                        
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
                }
                // Mark as complete immediately
                this.action.complete();
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
        
        // FIRE_LASER is instant - completes immediately
        if (this.action.actionType === COMBAT_ACTIONS.FIRE_LASER) {
            return true;
        }
        
        // Handle GET_RAMMED differently - can spin and move concurrently
        if (this.action.actionType === COMBAT_ACTIONS.GET_RAMMED) {
            return this.tickGetRammed();
        }
        
        // For PURSUE and FLEE, turn first, then move
        return this.tickMoveAction();
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
                    const knockbackDistance = this.ship.engine / 2;
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
