/**
 * EncounterCombatUtils - Combat utility functions
 * Helper functions for encounter calculations and queries
 */

const EncounterCombatUtils = (() => {
    
    /**
     * Calculate angle from one point to another (in radians)
     */
    function calculateAngle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    /**
     * Get maximum skill level from all crew members (captain + subordinates)
     */
    function getMaxCrewSkill(gameState, skillName) {
        let maxSkill = 0;
        if (gameState.captain && gameState.captain.skills[skillName]) {
            maxSkill = Math.max(maxSkill, gameState.captain.skills[skillName]);
        }
        if (gameState.subordinates) {
            gameState.subordinates.forEach(officer => {
                if (officer.skills[skillName]) {
                    maxSkill = Math.max(maxSkill, officer.skills[skillName]);
                }
            });
        }
        return maxSkill;
    }

    /**
     * Check if a ship has a specific module installed
     */
    function shipHasModule(ship, moduleId) {
        return ship.modules && ship.modules.includes(moduleId);
    }
    
    /**
     * Get enemy ships from game state (excludes neutral ships)
     */
    function getEnemyShipsFrom(gameState) {
        return gameState.encounterShips.filter(ship => ship.isNeutralToPlayer !== true);
    }

    /**
     * Check if a ship is an enemy ship
     */
    function isEnemyShip(ship) {
        return ship && ship.isNeutralToPlayer !== true;
    }

    /**
     * Get all enemy ships
     */
    function getEnemyShips(gameState) {
        return gameState.encounterShips.filter(ship => isEnemyShip(ship));
    }

    /**
     * Get target ship from state
     */
    function getTargetShip(gameState, targetIndex) {
        const ship = gameState.encounterShips[targetIndex];
        if (!ship || !isEnemyShip(ship) || ship.fled || ship.disabled || ship.escaped) {
            return null;
        }
        return ship;
    }

    /**
     * Find next valid target index (not fled, disabled, or escaped)
     */
    function findNextValidTarget(gameState, currentTargetIndex) {
        const enemies = gameState.encounterShips;
        let targetIndex = currentTargetIndex;
        if (targetIndex < 0) {
            targetIndex = 0;
        }
        for (let i = 0; i < enemies.length; i++) {
            const idx = (targetIndex + i) % enemies.length;
            if (isEnemyShip(enemies[idx]) && !enemies[idx].fled && !enemies[idx].disabled && !enemies[idx].escaped) {
                return idx;
            }
        }
        return -1;
    }

    /**
     * Get active player ship (hasn't acted yet)
     */
    function getActivePlayerShip(gameState) {
        return gameState.ships.find(ship => !ship.acted && !ship.fled && !ship.disabled && !ship.escaped);
    }

    /**
     * Count obstructions between shooter and target
     */
    function countObstructions(gameState, shooter, target) {
        let count = 0;
        const allShips = [...gameState.ships, ...gameState.encounterShips];
        
        // Check asteroids
        for (const asteroid of gameState.asteroids) {
            if (asteroid.disabled) continue;
            if (Geom.lineCircleIntersect(shooter.x, shooter.y, target.x, target.y, asteroid.x, asteroid.y, ASTEROID_SIZE)) {
                count++;
            }
        }
        
        // Check ships (excluding shooter and target)
        for (const ship of allShips) {
            if (ship === shooter || ship === target) continue;
            if (ship.disabled || ship.fled || ship.escaped) continue;
            if (Geom.lineCircleIntersect(shooter.x, shooter.y, target.x, target.y, ship.x, ship.y, SHIP_SIZE)) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * Check all ships for escape (outside circular boundary)
     */
    function checkForEscapedShips(gameState) {
        // Check player ships
        gameState.ships.forEach(ship => {
            if (!ship.escaped && !ship.disabled) {
                const distanceFromCenter = Math.sqrt(ship.x * ship.x + ship.y * ship.y);
                if (distanceFromCenter > ENCOUNTER_MAX_RADIUS) {
                    ship.escaped = true;
                }
            }
        });
        
        // Check enemy ships
        gameState.encounterShips.forEach(ship => {
            if (!ship.escaped && !ship.disabled) {
                const distanceFromCenter = Math.sqrt(ship.x * ship.x + ship.y * ship.y);
                if (distanceFromCenter > ENCOUNTER_MAX_RADIUS) {
                    ship.escaped = true;
                }
            }
        });
    }

    /**
     * Build hit message for combat action
     */
    function buildHitMessage(attackerName, targetName, damage, distance, moduleEffects) {
        const rangeText = ` (${Math.floor(distance)} AU)`;
        if (moduleEffects) {
            if (moduleEffects.reflectorBounce) {
                const reflectDamage = moduleEffects.reflectorBounce.damage;
                return {
                    message: `${targetName} reflects ${attackerName} for ${reflectDamage} damage!${rangeText}`,
                    skipModuleAppend: true
                };
            }
            if (moduleEffects.repulsorPush) {
                return { message: `${attackerName} repulses ${targetName} for ${damage} damage!${rangeText}`, skipModuleAppend: true };
            }
            if (moduleEffects.tractorPull) {
                return { message: `${attackerName} tractors ${targetName} for ${damage} damage!${rangeText}`, skipModuleAppend: true };
            }
            if (moduleEffects.warheadTriggered) {
                return { message: `${attackerName} blasts ${targetName} for ${damage} damage!${rangeText}`, skipModuleAppend: true };
            }
            if (moduleEffects.disrupterTriggered) {
                return { message: `${attackerName} disrupts ${targetName} for ${damage} damage!${rangeText}`, skipModuleAppend: true };
            }
        }

        return {
            message: `${attackerName} hits ${targetName} for ${damage} damage!${rangeText}`,
            skipModuleAppend: false
        };
    }

    /**
     * Initialize combat positions and angles for all ships
     */
    function initializeCombat(gameState) {
        // Restore all player ships shields to max before combat
        gameState.ships.forEach(ship => {
            ship.shields = ship.maxShields;
        });
        
        // Assign random positions to player ships (negative X side, within circle)
        gameState.ships.forEach(ship => {
            // Player ships on left side of circle
            const angle = Math.PI = Math.random() * Math.PI; // Left side angles (90° to 270°)
            const distance = ENCOUNTER_MIN_SHIP_DISTANCE + Math.random() * (ENCOUNTER_MAX_SHIP_DISTANCE - ENCOUNTER_MIN_SHIP_DISTANCE);
            ship.x = Math.cos(angle) * distance;
            ship.y = Math.sin(angle) * distance;
            
            // Combat state
            ship.fled = false;
            ship.disabled = false;
            ship.acted = false;
            ship.escaped = false;
        });
        
        // Assign random positions to enemy ships (positive X side, within circle)
        gameState.encounterShips.forEach(ship => {
            // Enemy ships on right side of circle
            const angle = Math.random() * Math.PI; // Right side angles (-90° to 90°)
            const distance = ENCOUNTER_MIN_SHIP_DISTANCE + Math.random() * (ENCOUNTER_MAX_SHIP_DISTANCE - ENCOUNTER_MIN_SHIP_DISTANCE);
            ship.x = Math.cos(angle) * distance;
            ship.y = Math.sin(angle) * distance;
            
            // Combat state
            ship.fled = false;
            ship.disabled = false;
            ship.acted = false;
            ship.escaped = false;
        });
        
        // After positioning, set angles to point at random opponents
        const enemyShipsForPlayer = getEnemyShipsFrom(gameState);
        gameState.ships.forEach(ship => {
            if (enemyShipsForPlayer.length > 0) {
                const randomEnemy = enemyShipsForPlayer[Math.floor(Math.random() * enemyShipsForPlayer.length)];
                ship.angle = calculateAngle(ship.x, ship.y, randomEnemy.x, randomEnemy.y);
            }
        });
        
        gameState.encounterShips.forEach(ship => {
            const possibleTargets = ship.isNeutralToPlayer
                ? gameState.encounterShips.filter(other => !other.isNeutralToPlayer && other.faction !== ship.faction && !other.fled && !other.disabled && !other.escaped)
                : [...gameState.ships, ...gameState.encounterShips.filter(other => other.isNeutralToPlayer && other.faction !== ship.faction && !other.fled && !other.disabled && !other.escaped)];
            if (possibleTargets.length > 0) {
                const randomTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
                ship.angle = calculateAngle(ship.x, ship.y, randomTarget.x, randomTarget.y);
            }
        });
        
        // Generate asteroids within the encounter radius
        gameState.asteroids = [];
        const numAsteroids = MIN_COMBAT_ASTEROIDS + Math.floor(Math.random() * (MAX_COMBAT_ASTEROIDS - MIN_COMBAT_ASTEROIDS + 1));
        for (let i = 0; i < numAsteroids; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * ENCOUNTER_MAX_RADIUS; // Spread across entire combat area
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            gameState.asteroids.push(new Asteroid(x, y));
        }
    }

    return {
        calculateAngle,
        getMaxCrewSkill,
        shipHasModule,
        getEnemyShipsFrom,
        isEnemyShip,
        getEnemyShips,
        getTargetShip,
        findNextValidTarget,
        getActivePlayerShip,
        countObstructions,
        checkForEscapedShips,
        buildHitMessage,
        initializeCombat
    };
})();
