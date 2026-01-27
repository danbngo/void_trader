/**
 * Encounter Menu - Combat Map System
 * Handles space encounters with pirates, police, and merchants using a tactical map view
 */

const EncounterMenu = (() => {
    let currentGameState = null;
    let encounterType = null;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    let targetIndex = 0; // Index of currently targeted enemy
    let cameraOffsetX = 0; // Camera offset for centering on active ship
    let cameraOffsetY = 0;
    let mapViewRange = ENCOUNTER_MAP_VIEW_RANGE; // Current view range
    let continueEnemyTurn = null; // Function to continue after enemy ship moves
    let flashingEntities = new Map(); // Track entities that should flash orange (key: entity object, value: timestamp when flash ends)
    let explosions = []; // Track active explosion animations { x, y, startTime, duration }
    let aoeEffects = []; // Track AOE effect animations { x, y, startTime, duration, color }
    
    /**
     * Calculate angle from one point to another (in radians)
     */
    function calculateAngle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    /**
     * Get ship symbol - triangle for normal ships, fixed symbol for aliens
     */
    function getShipSymbol(ship) {
        // Check if alien ship - use fixed symbol from ship type
        const shipType = SHIP_TYPES[ship.type] || ALIEN_SHIP_TYPES[ship.type];
        if (shipType && shipType.isAlien && shipType.symbol) {
            return shipType.symbol;
        }
        
        // Normal ships use rotating triangle based on angle
        const angle = ship.angle;
        // Convert angle to degrees and normalize to 0-360
        const degrees = (angle * (180 / Math.PI) + 360) % 360;
        
        // 8 directions: Right (0°), Upper-Right (45°), Up (90°), Upper-Left (135°),
        //                Left (180°), Lower-Left (225°), Down (270°), Lower-Right (315°)
        
        if (degrees >= 337.5 || degrees < 22.5) {
            return '\u25B6'; // Right ▶
        } else if (degrees >= 22.5 && degrees < 67.5) {
            return '\u25E5'; // Upper-Right ◥
        } else if (degrees >= 67.5 && degrees < 112.5) {
            return '\u25B2'; // Up ▲
        } else if (degrees >= 112.5 && degrees < 157.5) {
            return '\u25E4'; // Upper-Left ◤
        } else if (degrees >= 157.5 && degrees < 202.5) {
            return '\u25C0'; // Left ◀
        } else if (degrees >= 202.5 && degrees < 247.5) {
            return '\u25E3'; // Lower-Left ◣
        } else if (degrees >= 247.5 && degrees < 292.5) {
            return '\u25BC'; // Down ▼
        } else {
            return '\u25E2'; // Lower-Right ◢
        }
    }
    
    /**
     * Trigger a flash effect for an entity (ship or asteroid)
     * @param {Object} entity - The entity to flash
     */
    function triggerFlash(entity) {
        const flashDuration = 1000; // 1 second
        flashingEntities.set(entity, Date.now() + flashDuration);
    }
    
    /**
     * Trigger an explosion animation at a position
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    function triggerExplosion(x, y) {
        explosions.push({
            x: x,
            y: y,
            startTime: Date.now(),
            duration: 800 // 0.8 seconds
        });
    }
    
    /**
     * Trigger an AOE effect animation at a position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} color - Color for the effect
     */
    function triggerAOE(x, y, color) {
        aoeEffects.push({
            x: x,
            y: y,
            startTime: Date.now(),
            duration: 800, // 0.8 seconds
            color: color
        });
    }
    
    /**
     * Check if a ship has a specific module installed
     * @param {Ship} ship - The ship to check
     * @param {string} moduleId - Module ID to check for
     * @returns {boolean} - True if ship has the module
     */
    function shipHasModule(ship, moduleId) {
        return ship.modules && ship.modules.includes(moduleId);
    }
    
    /**
     * Initialize combat positions and angles for all ships
     */
    function initializeCombat(gameState) {
        const mapCenterX = 0;
        const mapCenterY = 0;
        
        // Restore all player ships shields to max before combat
        gameState.ships.forEach(ship => {
            ship.shields = ship.maxShields;
        });
        
        // Assign random positions to player ships (negative X side, within circle)
        gameState.ships.forEach(ship => {
            // Player ships on left side of circle
            const angle = Math.PI + Math.random() * Math.PI; // Left side angles (90° to 270°)
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
        gameState.ships.forEach(ship => {
            if (gameState.encounterShips.length > 0) {
                const randomEnemy = gameState.encounterShips[Math.floor(Math.random() * gameState.encounterShips.length)];
                ship.angle = calculateAngle(ship.x, ship.y, randomEnemy.x, randomEnemy.y);
            }
        });
        
        gameState.encounterShips.forEach(ship => {
            if (gameState.ships.length > 0) {
                const randomPlayer = gameState.ships[Math.floor(Math.random() * gameState.ships.length)];
                ship.angle = calculateAngle(ship.x, ship.y, randomPlayer.x, randomPlayer.y);
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
     * Show the encounter menu
     * @param {GameState} gameState - Current game state
     * @param {Object} encType - Type of encounter
     */
    function show(gameState, encType) {
        currentGameState = gameState;
        encounterType = encType;
        outputMessage = '';
        targetIndex = 0;
        waitingForContinue = false;
        flashingEntities.clear(); // Clear any previous flashing entities
        explosions = []; // Clear any previous explosions
        
        // Initialize combat if not already done
        if (!gameState.ships[0].hasOwnProperty('x')) {
            initializeCombat(gameState);
        }
        
        // Find first valid target
        findNextValidTarget();
        
        // Center camera on first active player ship (one that hasn't acted)
        const firstShip = getActivePlayerShip();
        if (firstShip) {
            cameraOffsetX = firstShip.x;
            cameraOffsetY = firstShip.y;
        }
        
        // Set up wheel zoom handler
        UI.setWheelZoomHandler((delta) => {
            if (delta > 0) {
                // Zoom out
                mapViewRange = Math.min(ENCOUNTER_MAX_MAP_VIEW_RANGE, mapViewRange * 1.5);
            } else {
                // Zoom in
                mapViewRange = Math.max(ENCOUNTER_MIN_MAP_VIEW_RANGE, mapViewRange / 1.5);
            }
            render();
        });
        
        render();
    }
    
    /**
     * Find next valid target (not fled, disabled, or escaped)
     */
    function findNextValidTarget() {
        const enemies = currentGameState.encounterShips;
        for (let i = 0; i < enemies.length; i++) {
            const idx = (targetIndex + i) % enemies.length;
            if (!enemies[idx].fled && !enemies[idx].disabled && !enemies[idx].escaped) {
                targetIndex = idx;
                return;
            }
        }
    }
    
    /**
     * Render the combat map
     */
    function render() {
        UI.clear();
        // Don't reset selection - preserve it across re-renders
        
        const grid = UI.getGridSize();
        
        // Draw map on left side (50% of width + 5)
        const mapWidth = COMBAT_MAP_WIDTH;
        const mapHeight = COMBAT_MAP_HEIGHT;
        
        drawMap(currentGameState, mapWidth, mapHeight);
        
        // Draw ship info on right side
        drawShipInfo(currentGameState, mapWidth + 2);
        
        // Draw buttons at bottom
        drawButtons(currentGameState, mapWidth + 2, mapHeight);
        
        UI.draw();
        
        // If there are flashing entities or active explosions, schedule a re-render to update the animation
        if (flashingEntities.size > 0 || explosions.length > 0) {
            setTimeout(() => {
                if (currentGameState === gameState) { // Only re-render if still in same game state
                    render();
                }
            }, 50); // Re-render every 50ms while animating (smoother for explosions)
        }
    }
    
    /**
     * Draw the combat map
     */
    function drawMap(gameState, mapWidth, mapHeight) {
        // Draw border with double-line corners and single-line edges
        UI.addText(0, 0, '\u2554' + '\u2550'.repeat(mapWidth - 2) + '\u2557', COLORS.GRAY);
        for (let y = 1; y < mapHeight - 1; y++) {
            UI.addText(0, y, '\u2551', COLORS.GRAY);
            UI.addText(mapWidth - 1, y, '\u2551', COLORS.GRAY);
        }
        UI.addText(0, mapHeight - 1, '\u255a' + '\u2550'.repeat(mapWidth - 2) + '\u255d', COLORS.GRAY);
        
        // Title
        UI.addText(2, 0, '[ Short Range Scanner ]', COLORS.YELLOW);
        
        // Calculate map center in screen coordinates
        const mapCenterX = Math.floor(mapWidth / 2);
        const mapCenterY = Math.floor(mapHeight / 2);
        
        // Calculate scale based on view range
        const scale = Math.min((mapWidth - 4) / (mapViewRange * 2), (mapHeight - 4) / (mapViewRange * 2));
        
        // Draw center marker
        // UI.addText(mapCenterX, mapCenterY, '+', COLORS.TEXT_DIM); // Removed center marker
        
        // Fill area outside circular boundary with shade blocks
        for (let screenY = 1; screenY < mapHeight - 1; screenY++) {
            for (let screenX = 1; screenX < mapWidth - 1; screenX++) {
                // Convert screen coordinates to world coordinates
                const worldX = (screenX - mapCenterX) / scale + cameraOffsetX;
                const worldY = -((screenY - mapCenterY) / scale) + cameraOffsetY;
                
                // Calculate distance from center (0, 0) in world space
                const distanceFromCenter = Math.sqrt(worldX * worldX + worldY * worldY);
                
                // If outside the combat radius, draw shade block
                if (distanceFromCenter > ENCOUNTER_MAX_RADIUS) {
                    UI.addText(screenX, screenY, '\u2591', COLORS.TEXT_DIM);
                }
            }
        }
        
        // Get active player ship (first non-fled, non-disabled, non-escaped, non-acted)
        // But only if not waiting for player to press Continue
        const activeShip = waitingForContinue ? null : gameState.ships.find(s => !s.fled && !s.disabled && !s.escaped && !s.acted);
        const targetShip = gameState.encounterShips[targetIndex];
        
        let activeShipScreenX = null;
        let activeShipScreenY = null;
        let targetShipScreenX = null;
        let targetShipScreenY = null;
        
        // Calculate target ship screen position (even if off-screen) for line drawing
        if (targetShip && !targetShip.fled && !targetShip.escaped) {
            targetShipScreenX = Math.floor(mapCenterX + (targetShip.x - cameraOffsetX) * scale);
            targetShipScreenY = Math.floor(mapCenterY - (targetShip.y - cameraOffsetY) * scale);
        }
        
        // Draw asteroids (render before projectiles and ships)
        const now = Date.now();
        gameState.asteroids.forEach(asteroid => {
            // Check if flashing and should be removed
            const flashEnd = flashingEntities.get(asteroid);
            if (flashEnd && now >= flashEnd) {
                // Flash period over, disable the asteroid
                asteroid.disabled = true;
                flashingEntities.delete(asteroid);
                return;
            }
            
            if (asteroid.disabled) return;
            
            const screenX = Math.floor(mapCenterX + (asteroid.x - cameraOffsetX) * scale);
            const screenY = Math.floor(mapCenterY - (asteroid.y - cameraOffsetY) * scale);
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                const isFlashing = flashingEntities.has(asteroid);
                const color = isFlashing ? COLORS.ORANGE : COLORS.TEXT_DIM;
                UI.addText(screenX, screenY, 'O', color, 0.5);
            }
        });
        
        // Draw projectile (render before ships so ships overlap it)
        if (gameState.combatAction && gameState.combatAction.projectile) {
            const proj = gameState.combatAction.projectile;
            const screenX = Math.floor(mapCenterX + (proj.x - cameraOffsetX) * scale);
            const screenY = Math.floor(mapCenterY - (proj.y - cameraOffsetY) * scale);
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                UI.addText(screenX, screenY, proj.character, proj.color, 0.8);
            }
        }
        
        // Draw player ships - disabled ships first, then alive ships (so alive ships render on top)
        // First pass: draw disabled ships
        gameState.ships.forEach((ship, index) => {
            if (ship.fled || ship.escaped) return;
            
            // Check if flashing and should become disabled
            const flashEnd = flashingEntities.get(ship);
            if (flashEnd && now >= flashEnd && ship.hull <= 0) {
                // Flash period over, disable the ship and trigger explosion
                ship.disabled = true;
                flashingEntities.delete(ship);
                triggerExplosion(ship.x, ship.y);
                
                // Check for SELF_DESTRUCT module
                if (ship.modules && ship.modules.includes('SELF_DESTRUCT')) {
                    // Trigger red AOE effect
                    triggerAOE(ship.x, ship.y, COLORS.TEXT_ERROR);
                    
                    // Deal damage to nearby ships
                    const shipType = SHIP_TYPES[ship.type] || { hull: 100 };
                    const maxDamage = Math.floor(shipType.hull * CONSTS.MODULE_SELF_DESTRUCT_DAMAGE_MULT);
                    
                    // Check all enemy ships
                    gameState.encounterShips.forEach(enemyShip => {
                        if (enemyShip === ship || enemyShip.disabled) return;
                        const dx = enemyShip.x - ship.x;
                        const dy = enemyShip.y - ship.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= CONSTS.MODULE_SELF_DESTRUCT_RANGE) {
                            // Damage falls off with distance
                            const damageMult = 1 - (distance / CONSTS.MODULE_SELF_DESTRUCT_RANGE);
                            const damage = Math.floor(maxDamage * damageMult);
                            enemyShip.hull -= damage;
                            triggerFlash(enemyShip);
                        }
                    });
                    
                    // Check all player ships
                    gameState.ships.forEach(otherShip => {
                        if (otherShip === ship || otherShip.disabled) return;
                        const dx = otherShip.x - ship.x;
                        const dy = otherShip.y - ship.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= CONSTS.MODULE_SELF_DESTRUCT_RANGE) {
                            // Damage falls off with distance
                            const damageMult = 1 - (distance / CONSTS.MODULE_SELF_DESTRUCT_RANGE);
                            const damage = Math.floor(maxDamage * damageMult);
                            otherShip.hull -= damage;
                            triggerFlash(otherShip);
                        }
                    });
                }
            }
            
            if (!ship.disabled) return; // Skip alive ships in this pass
            
            const screenX = Math.floor(mapCenterX + (ship.x - cameraOffsetX) * scale);
            const screenY = Math.floor(mapCenterY - (ship.y - cameraOffsetY) * scale);
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                UI.addText(screenX, screenY, 'x', COLORS.GRAY, 0.7);
            }
        });
        
        // Second pass: draw alive ships (on top of disabled ships)
        gameState.ships.forEach((ship, index) => {
            if (ship.fled || ship.escaped || ship.disabled) return;
            
            const screenX = Math.floor(mapCenterX + (ship.x - cameraOffsetX) * scale);
            const screenY = Math.floor(mapCenterY - (ship.y - cameraOffsetY) * scale);
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                let symbol = getShipSymbol(ship);
                let color = COLORS.CYAN;
                const isFlashing = flashingEntities.has(ship);
                
                if (isFlashing) {
                    color = COLORS.ORANGE; // Flash orange when taking damage
                } else if (ship.acted) {
                    color = COLORS.TEXT_DIM; // Dimmed if already moved
                } else if (ship === activeShip) {
                    color = COLORS.GREEN; // Bright if active and hasn't moved
                    activeShipScreenX = screenX;
                    activeShipScreenY = screenY;
                }
                
                UI.addText(screenX, screenY, symbol, color, 0.7);
            }
        });
        
        // Draw enemy ships - disabled ships first, then alive ships (so alive ships render on top)
        // First pass: draw disabled ships
        gameState.encounterShips.forEach((ship, index) => {
            if (ship.fled || ship.escaped) return;
            
            // Check if flashing and should become disabled
            const flashEnd = flashingEntities.get(ship);
            if (flashEnd && now >= flashEnd && ship.hull <= 0) {
                // Flash period over, disable the ship and trigger explosion
                ship.disabled = true;
                flashingEntities.delete(ship);
                triggerExplosion(ship.x, ship.y);
                
                // Check for SELF_DESTRUCT module
                if (ship.modules && ship.modules.includes('SELF_DESTRUCT')) {
                    // Trigger red AOE effect
                    triggerAOE(ship.x, ship.y, COLORS.TEXT_ERROR);
                    
                    // Deal damage to nearby ships
                    const shipType = SHIP_TYPES[ship.type] || ALIEN_SHIP_TYPES[ship.type] || { hull: 100 };
                    const maxDamage = Math.floor(shipType.hull * CONSTS.MODULE_SELF_DESTRUCT_DAMAGE_MULT);
                    
                    // Check all enemy ships
                    gameState.encounterShips.forEach(otherShip => {
                        if (otherShip === ship || otherShip.disabled) return;
                        const dx = otherShip.x - ship.x;
                        const dy = otherShip.y - ship.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= CONSTS.MODULE_SELF_DESTRUCT_RANGE) {
                            // Damage falls off with distance
                            const damageMult = 1 - (distance / CONSTS.MODULE_SELF_DESTRUCT_RANGE);
                            const damage = Math.floor(maxDamage * damageMult);
                            otherShip.hull -= damage;
                            triggerFlash(otherShip);
                        }
                    });
                    
                    // Check all player ships
                    gameState.ships.forEach(playerShip => {
                        if (playerShip === ship || playerShip.disabled) return;
                        const dx = playerShip.x - ship.x;
                        const dy = playerShip.y - ship.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= CONSTS.MODULE_SELF_DESTRUCT_RANGE) {
                            // Damage falls off with distance
                            const damageMult = 1 - (distance / CONSTS.MODULE_SELF_DESTRUCT_RANGE);
                            const damage = Math.floor(maxDamage * damageMult);
                            playerShip.hull -= damage;
                            triggerFlash(playerShip);
                        }
                    });
                }
            }
            
            if (!ship.disabled) return; // Skip alive ships in this pass
            
            const screenX = Math.floor(mapCenterX + (ship.x - cameraOffsetX) * scale);
            const screenY = Math.floor(mapCenterY - (ship.y - cameraOffsetY) * scale);
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                UI.addText(screenX, screenY, 'X', COLORS.GRAY, 0.7);
            }
        });
        
        // Second pass: draw alive ships (on top of disabled ships)
        gameState.encounterShips.forEach((ship, index) => {
            if (ship.fled || ship.escaped || ship.disabled) return;
            
            const screenX = Math.floor(mapCenterX + (ship.x - cameraOffsetX) * scale);
            const screenY = Math.floor(mapCenterY - (ship.y - cameraOffsetY) * scale);
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                let symbol = getShipSymbol(ship);
                let color = COLORS.TEXT_ERROR;
                const isFlashing = flashingEntities.has(ship);
                
                if (isFlashing) {
                    color = COLORS.ORANGE; // Flash orange when taking damage
                } else if (index === targetIndex) {
                    color = COLORS.YELLOW;
                    // Store position even if already stored
                    targetShipScreenX = screenX;
                    targetShipScreenY = screenY;
                }
                
                // Make non-disabled enemy ships clickable
                UI.addClickable(screenX, screenY, 1, () => {
                    targetIndex = index;
                    render();
                });
                
                UI.addText(screenX, screenY, symbol, color, 0.7);
            }
        });
        
        // Draw explosion animations (on top of everything else)
        const blockChars = ['░', '▒', '▓'];
        explosions = explosions.filter(explosion => {
            const elapsed = now - explosion.startTime;
            if (elapsed >= explosion.duration) {
                return false; // Remove finished explosions
            }
            
            // Calculate expansion progress (0 to 1)
            const progress = elapsed / explosion.duration;
            const maxRadius = 4; // Maximum explosion radius
            const currentRadius = progress * maxRadius;
            
            // Draw expanding circle of particles
            const particleCount = 16; // Number of particles around the circle
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const x = explosion.x + Math.cos(angle) * currentRadius;
                const y = explosion.y + Math.sin(angle) * currentRadius;
                
                const screenX = Math.floor(mapCenterX + (x - cameraOffsetX) * scale);
                const screenY = Math.floor(mapCenterY - (y - cameraOffsetY) * scale);
                
                // Check if in bounds
                if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                    // Pick a block character based on progress (fade out)
                    const charIndex = Math.min(2, Math.floor(progress * 3));
                    const char = blockChars[charIndex];
                    UI.addText(screenX, screenY, char, COLORS.ORANGE, 0.9);
                }
            }
            
            return true; // Keep active explosion
        });
        
        // Draw AOE effect animations
        aoeEffects = aoeEffects.filter(effect => {
            const elapsed = now - effect.startTime;
            if (elapsed >= effect.duration) {
                return false; // Remove finished effects
            }
            
            // Calculate expansion progress (0 to 1)
            const progress = elapsed / effect.duration;
            const maxRadius = 4; // Maximum AOE radius
            const currentRadius = progress * maxRadius;
            
            // Draw expanding circle of particles
            const particleCount = 16; // Number of particles around the circle
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const x = effect.x + Math.cos(angle) * currentRadius;
                const y = effect.y + Math.sin(angle) * currentRadius;
                
                const screenX = Math.floor(mapCenterX + (x - cameraOffsetX) * scale);
                const screenY = Math.floor(mapCenterY - (y - cameraOffsetY) * scale);
                
                // Check if in bounds
                if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                    // Pick a block character based on progress (fade out)
                    const charIndex = Math.min(2, Math.floor(progress * 3));
                    const char = blockChars[charIndex];
                    UI.addText(screenX, screenY, char, effect.color, 0.9);
                }
            }
            
            return true; // Keep active effect
        });
        
        // Draw line between active ship and target (only if not firing laser with projectile)
        const isLaserActive = gameState.combatAction && 
                             gameState.combatAction.actionType === COMBAT_ACTIONS.FIRE_LASER && 
                             gameState.combatAction.projectile;
        
        // Draw line to target ship or to obstruction hit point
        let shouldDrawLine = false;
        let lineEndX = null;
        let lineEndY = null;
        
        if (activeShipScreenX !== null && !isLaserActive) {
            if (targetShipScreenX !== null) {
                // Draw to target ship
                shouldDrawLine = true;
                lineEndX = targetShipScreenX;
                lineEndY = targetShipScreenY;
            } else if (gameState.combatAction && 
                       gameState.combatAction.actionType === COMBAT_ACTIONS.FIRE_LASER && 
                       gameState.combatAction.hitObstruction && 
                       gameState.combatAction.hitObstruction.x !== undefined) {
                // Draw to obstruction hit point
                shouldDrawLine = true;
                const obstX = gameState.combatAction.hitObstruction.x;
                const obstY = gameState.combatAction.hitObstruction.y;
                lineEndX = Math.floor(mapCenterX + (obstX - cameraOffsetX) * scale);
                lineEndY = Math.floor(mapCenterY - (obstY - cameraOffsetY) * scale);
            }
        }
        
        if (shouldDrawLine && lineEndX !== null && lineEndY !== null) {
            // Collect all ship positions to avoid drawing over them
            const shipPositions = new Set();
            
            gameState.ships.forEach(ship => {
                if (ship.fled || ship.escaped) return;
                const screenX = Math.floor(mapCenterX + (ship.x - cameraOffsetX) * scale);
                const screenY = Math.floor(mapCenterY - (ship.y - cameraOffsetY) * scale);
                if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                    shipPositions.add(`${screenX},${screenY}`);
                }
            });
            
            gameState.encounterShips.forEach(ship => {
                if (ship.fled || ship.escaped) return;
                const screenX = Math.floor(mapCenterX + (ship.x - cameraOffsetX) * scale);
                const screenY = Math.floor(mapCenterY - (ship.y - cameraOffsetY) * scale);
                if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                    shipPositions.add(`${screenX},${screenY}`);
                }
            });
            
            const linePoints = LineDrawer.drawLine(
                activeShipScreenX, activeShipScreenY,
                lineEndX, lineEndY,
                false,
                COLORS.CYAN
            );
            
            // Draw each line point, skipping ship positions
            linePoints.forEach(point => {
                const posKey = `${point.x},${point.y}`;
                if (point.x > 0 && point.x < mapWidth - 1 && 
                    point.y > 0 && point.y < mapHeight - 1 &&
                    !shipPositions.has(posKey)) {
                    UI.addText(point.x, point.y, point.symbol, point.color);
                }
            });
        }
        
        // Legend positioned right after map border
        UI.addText(2, mapHeight, '▲ = Ship  X = Destroyed  O = Asteroid', COLORS.GRAY);
    }
    
    /**
     * Draw ship information panel
     */
    function drawShipInfo(gameState, startX) {
        const grid = UI.getGridSize();
        
        // Your Ship section - show currently active ship (first that hasn't acted)
        let activeShip = null;
        for (let i = 0; i < gameState.ships.length; i++) {
            const ship = gameState.ships[i];
            if (!ship.fled && !ship.disabled && !ship.escaped && !ship.acted) {
                activeShip = ship;
                break;
            }
        }
        
        // If no active ship found, show first non-fled ship
        if (!activeShip) {
            activeShip = gameState.ships.find(s => !s.fled && !s.disabled && !s.escaped);
        }
        
        UI.addHeaderLine(startX, 0, 'Your Ship');
        if (activeShip) {
            const shipType = SHIP_TYPES[activeShip.type] || ALIEN_SHIP_TYPES[activeShip.type] || { name: 'Unknown' };
            
            let y = 1;
            UI.addText(startX, y++, 'Type:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, y - 1, shipType.name, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Coords:', COLORS.TEXT_DIM);
            UI.addText(startX + 8, y - 1, `(${activeShip.x.toFixed(0)}, ${activeShip.y.toFixed(0)})`, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Hull:', COLORS.TEXT_DIM);
            const hullRatio = activeShip.hull / activeShip.maxHull;
            UI.addText(startX + 6, y - 1, `${activeShip.hull}/${activeShip.maxHull}`, UI.calcStatColor(hullRatio, true));
            UI.addText(startX, y++, 'Shield:', COLORS.TEXT_DIM);
            const shieldRatio = activeShip.shields / activeShip.maxShields;
            UI.addText(startX + 8, y - 1, `${activeShip.shields}/${activeShip.maxShields}`, UI.calcStatColor(shieldRatio, true));
            UI.addText(startX, y++, 'Laser:', COLORS.TEXT_DIM);
            const laserRatio = activeShip.lasers / AVERAGE_SHIP_LASER_LEVEL;
            UI.addText(startX + 7, y - 1, `${activeShip.lasers}`, UI.calcStatColor(laserRatio));
            UI.addText(startX, y++, 'Engine:', COLORS.TEXT_DIM);
            const engineRatio = activeShip.engine / AVERAGE_SHIP_ENGINE_LEVEL;
            UI.addText(startX + 8, y - 1, `${activeShip.engine}`, UI.calcStatColor(engineRatio));
            UI.addText(startX, y++, 'Radar:', COLORS.TEXT_DIM);
            const radarRatio = activeShip.radar / AVERAGE_SHIP_RADAR_LEVEL;
            UI.addText(startX + 7, y - 1, `${activeShip.radar}`, UI.calcStatColor(radarRatio));
        } else {
            UI.addText(startX, 1, 'No active ships', COLORS.TEXT_ERROR);
        }
        
        // Target Ship section
        const targetShip = gameState.encounterShips[targetIndex];
        
        UI.addText(startX, 10, `=== ${encounterType.name} Ship ===`, COLORS.YELLOW);
        if (targetShip && !targetShip.fled && !targetShip.disabled && !targetShip.escaped) {
            const shipType = SHIP_TYPES[targetShip.type] || ALIEN_SHIP_TYPES[targetShip.type] || { name: 'Unknown' };
            const distance = activeShip ? Math.sqrt(
                Math.pow(activeShip.x - targetShip.x, 2) + 
                Math.pow(activeShip.y - targetShip.y, 2)
            ).toFixed(1) : '?';
            
            let y = 11;
            UI.addText(startX, y++, 'Type:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, y - 1, shipType.name, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Coords:', COLORS.TEXT_DIM);
            UI.addText(startX + 8, y - 1, `(${targetShip.x.toFixed(0)}, ${targetShip.y.toFixed(0)})`, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Hull:', COLORS.TEXT_DIM);
            const targetHullRatio = targetShip.hull / targetShip.maxHull;
            UI.addText(startX + 6, y - 1, `${targetShip.hull}/${targetShip.maxHull}`, UI.calcStatColor(targetHullRatio, true));
            UI.addText(startX, y++, 'Shield:', COLORS.TEXT_DIM);
            const targetShieldRatio = targetShip.shields / targetShip.maxShields;
            UI.addText(startX + 8, y - 1, `${targetShip.shields}/${targetShip.maxShields}`, UI.calcStatColor(targetShieldRatio, true));
            UI.addText(startX, y++, 'Laser:', COLORS.TEXT_DIM);
            const targetLaserRatio = targetShip.lasers / AVERAGE_SHIP_LASER_LEVEL;
            UI.addText(startX + 7, y - 1, `${targetShip.lasers}`, UI.calcStatColor(targetLaserRatio));
            UI.addText(startX, y++, 'Engine:', COLORS.TEXT_DIM);
            const targetEngineRatio = targetShip.engine / AVERAGE_SHIP_ENGINE_LEVEL;
            UI.addText(startX + 8, y - 1, `${targetShip.engine}`, UI.calcStatColor(targetEngineRatio));
            UI.addText(startX, y++, 'Radar:', COLORS.TEXT_DIM);
            const targetRadarRatio = targetShip.radar / AVERAGE_SHIP_RADAR_LEVEL;
            UI.addText(startX + 7, y - 1, `${targetShip.radar}`, UI.calcStatColor(targetRadarRatio));
            UI.addText(startX, y++, 'Distance:', COLORS.TEXT_DIM);
            UI.addText(startX + 10, y - 1, `${distance} AU`, COLORS.TEXT_NORMAL);
        } else {
            UI.addText(startX, 11, 'No valid targets', COLORS.TEXT_DIM);
        }
    }
    
    /**
     * Count obstructions between shooter and target
     */
    function countObstructions(shooter, target) {
        let count = 0;
        const allShips = [...currentGameState.ships, ...currentGameState.encounterShips];
        
        // Check asteroids
        for (const asteroid of currentGameState.asteroids) {
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
     * Draw action buttons
     */
    function drawButtons(gameState, startX, mapHeight) {
        const grid = UI.getGridSize();
        const buttonY = grid.height - 6;
        
        // Set output message in UI output row if there's a message
        if (outputMessage) {
            console.log('[EncounterMenu] Setting output row:', { outputMessage, outputColor });
            UI.setOutputRow(outputMessage, outputColor);
        } else {
            console.log('[EncounterMenu] No output message to set');
        }
        
        // Check if action is in progress
        const actionInProgress = gameState.combatAction || gameState.combatHandler;
        
        if (actionInProgress) {
            // No buttons while action is executing
            return;
        }
        
        // Check if waiting for enemy turn continuation
        if (continueEnemyTurn) {
            UI.addCenteredButton(buttonY, '1', 'Continue', () => {
                continueEnemyTurn();
            }, COLORS.GREEN, 'Continue to next enemy ship');
            return;
        }
        
        // Check if waiting for player to continue
        const activeShip = getActivePlayerShip();
        const anyShipActed = currentGameState.ships.some(s => s.acted && !s.fled && !s.disabled && !s.escaped);
        const needsContinue = (!activeShip || anyShipActed);
        
        if (needsContinue && outputMessage) {
            // Show Continue button to advance to next ship or enemy turn
            UI.addCenteredButton(buttonY, '1', 'Continue', () => {
                continueAfterAction();
            }, COLORS.GREEN, 'Continue to next action');
        } else {
            // Count valid enemy targets
            const validEnemyCount = currentGameState.encounterShips.filter(
                s => !s.fled && !s.disabled && !s.escaped
            ).length;
            
            // 3-column layout
            const leftX = 5;
            const middleX = 28;
            const rightX = 51;
            
            // Column 1: Previous Target, Next Target, Fire Laser
            let col1Y = buttonY;
            
            // Only show target selection if there's more than one valid enemy
            if (validEnemyCount > 1) {
                UI.addButton(leftX, col1Y++, '1', 'Previous Target', () => {
                    prevTarget();
                }, COLORS.BUTTON, 'Select previous enemy ship as target');
                
                UI.addButton(leftX, col1Y++, '2', 'Next Target', () => {
                    nextTarget();
                }, COLORS.BUTTON, 'Select next enemy ship as target');
            }
            
            // Calculate action details for help text
            const targetShip = currentGameState.encounterShips[targetIndex];
            let laserHelpText = 'Fire laser at the enemy ship';
            let pursueHelpText = 'Move toward the enemy ship';
            let fleeHelpText = 'Move away from the enemy ship';
            
            if (activeShip && targetShip) {
                const dx = targetShip.x - activeShip.x;
                const dy = targetShip.y - activeShip.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Count obstructions in the way
                const obstructionCount = countObstructions(activeShip, targetShip);
                
                // Laser help text: hit chance and damage
                const hitChance = Math.min(100, Math.floor((activeShip.radar / distance) * 100));
                const damageRange = `1-${activeShip.lasers}`;
                if (obstructionCount > 0) {
                    laserHelpText = `Fire laser (${hitChance}% hit, ${damageRange} dmg, ${obstructionCount} obstructions)`;
                } else {
                    laserHelpText = `Fire laser (${hitChance}% hit, ${damageRange} dmg)`;
                }
                
                // Pursue help text: check for ramming (with variable speed)
                const minSpeed = activeShip.engine * 0.5;
                const maxSpeed = activeShip.engine * 1.5;
                const willRam = distance <= maxSpeed;
                if (willRam) {
                    const massRatio = activeShip.maxHull / targetShip.maxHull;
                    const knockback = Math.floor((activeShip.engine / 2) * massRatio);
                    const ramDamage = `1-${Math.floor(knockback)}`;
                    pursueHelpText = `Pursue (MAY RAM for ${ramDamage} dmg, travel ${minSpeed.toFixed(1)}-${maxSpeed.toFixed(1)} AU)`;
                } else {
                    pursueHelpText = `Pursue (travel ${minSpeed.toFixed(1)}-${maxSpeed.toFixed(1)} AU toward target)`;
                }
                
                // Flee help text: distance and escape check (with variable speed)
                const minFleeDistance = minSpeed;
                const maxFleeDistance = maxSpeed;
                const currentDistanceFromCenter = Math.sqrt(activeShip.x * activeShip.x + activeShip.y * activeShip.y);
                const willEscape = currentDistanceFromCenter + minFleeDistance > ENCOUNTER_MAX_RADIUS;
                if (willEscape) {
                    fleeHelpText = `Flee ${minFleeDistance.toFixed(1)}-${maxFleeDistance.toFixed(1)} AU (MAY ESCAPE THE MAP)`;
                } else {
                    fleeHelpText = `Flee ${minFleeDistance.toFixed(1)}-${maxFleeDistance.toFixed(1)} AU away from target`;
                }
            }
            
            UI.addButton(leftX, col1Y++, '3', 'Fire Laser', () => {
                executePlayerAction(COMBAT_ACTIONS.FIRE_LASER);
            }, COLORS.TEXT_ERROR, laserHelpText);

            // Column 2: Pursue, Flee, Surrender
            let col2Y = buttonY;
            
            UI.addButton(middleX, col2Y++, '4', 'Pursue', () => {
                executePlayerAction(COMBAT_ACTIONS.PURSUE);
            }, COLORS.GREEN, pursueHelpText);
            
            UI.addButton(middleX, col2Y++, '5', 'Flee', () => {
                executePlayerAction(COMBAT_ACTIONS.FLEE);
            }, COLORS.BUTTON, fleeHelpText);
            
            // Only show surrender option if encounter type permits it
            if (encounterType.surrenderPermitted !== false) {
                UI.addButton(middleX, col2Y++, '6', 'Surrender', () => {
                    handleSurrender(gameState);
                }, COLORS.TEXT_DIM, 'Give up and let enemies take cargo/credits');
            }
            
            // Column 3: Zoom In, Zoom Out
            let col3Y = buttonY;
            
            UI.addButton(rightX, col3Y++, '7', 'Zoom In', () => {
                mapViewRange = Math.max(ENCOUNTER_MIN_MAP_VIEW_RANGE, mapViewRange / 1.5);
                render();
            }, COLORS.BUTTON, 'Decrease view range to see closer');
            
            UI.addButton(rightX, col3Y++, '8', 'Zoom Out', () => {
                mapViewRange = Math.min(ENCOUNTER_MAX_MAP_VIEW_RANGE, mapViewRange * 1.5);
                render();
            }, COLORS.BUTTON, 'Increase view range to see farther');
        }
    }
    
    /**
     * Select previous target
     */
    function prevTarget() {
        const enemies = currentGameState.encounterShips;
        let attempts = 0;
        do {
            targetIndex = (targetIndex - 1 + enemies.length) % enemies.length;
            attempts++;
        } while ((enemies[targetIndex].fled || enemies[targetIndex].disabled || enemies[targetIndex].escaped) && attempts < enemies.length);
        
        render();
    }
    
    /**
     * Select next target
     */
    function nextTarget() {
        const enemies = currentGameState.encounterShips;
        let attempts = 0;
        do {
            targetIndex = (targetIndex + 1) % enemies.length;
            attempts++;
        } while ((enemies[targetIndex].fled || enemies[targetIndex].disabled || enemies[targetIndex].escaped) && attempts < enemies.length);
        
        render();
    }
    
    /**
     * Handle player surrender
     */
    function handleSurrender(gameState) {
        UI.clear();
        
        let y = 5;
        UI.addTextCentered(y++, `=== Surrender ===`, COLORS.TEXT_ERROR);
        y += 2;
        
        UI.addText(10, y++, `You signal your surrender to the enemy forces.`, COLORS.TEXT_NORMAL);
        y++;
        
        // Handle surrender based on encounter type
        if (encounterType.id === 'POLICE') {
            // Police: Confiscate illegal cargo and send to jail
            handlePoliceSurrender(gameState, y);
        } else if (encounterType.id === 'PIRATE') {
            // Pirates: Loot cargo normally
            handlePirateSurrender(gameState, y);
        } else if (encounterType.id === 'MERCHANT') {
            // Merchants: Flee in a hurry
            handleMerchantSurrender(gameState, y);
        }
    }
    
    /**
     * Handle surrender to police - confiscate illegal cargo and jail
     */
    function handlePoliceSurrender(gameState, startY) {
        let y = startY;
        
        UI.addText(10, y++, `The police accept your surrender.`, COLORS.TEXT_NORMAL);
        y++;
        
        // Confiscate all illegal cargo from non-escaped ships only
        const nonEscapedShips = gameState.ships.filter(s => !s.escaped);
        const illegalCargo = [];
        
        CARGO_TYPES_ILLEGAL.forEach(cargoType => {
            let totalAmount = 0;
            nonEscapedShips.forEach(ship => {
                const amount = ship.cargo[cargoType.id] || 0;
                if (amount > 0) {
                    ship.cargo[cargoType.id] = 0;
                    totalAmount += amount;
                }
            });
            
            if (totalAmount > 0) {
                illegalCargo.push({ type: cargoType, amount: totalAmount });
            }
        });
        
        if (illegalCargo.length > 0) {
            UI.addText(10, y++, `The police confiscate your illegal cargo:`, COLORS.TEXT_ERROR);
            illegalCargo.forEach(cargo => {
                UI.addText(10, y++, `  Confiscated: ${cargo.amount} ${cargo.type.name}`, COLORS.TEXT_ERROR);
            });
            y++;
        }
        
        // Calculate jail time based on bounty
        if (gameState.bounty > 0) {
            const jailDays = Math.ceil((gameState.bounty / 1000) * DAYS_IN_JAIL_PER_1000CR_BOUNTY);
            
            UI.addText(10, y++, `You are arrested and taken to the nearest station.`, COLORS.TEXT_ERROR);
            UI.addText(10, y++, `Bounty: ${gameState.bounty} CR`, COLORS.TEXT_ERROR);
            UI.addText(10, y++, `Sentence: ${jailDays} days in jail`, COLORS.TEXT_ERROR);
            y++;
            
            // Clear bounty
            gameState.bounty = 0;
            
            // Advance time by jail sentence
            gameState.date.setDate(gameState.date.getDate() + jailDays);
            
            UI.addText(10, y++, `After serving your sentence, you are released.`, COLORS.TEXT_NORMAL);
        } else {
            UI.addText(10, y++, `The police escort you back to the nearest station.`, COLORS.TEXT_NORMAL);
        }
        
        y++;
        
        // Return to previous system (where we departed from)
        const previousSystem = gameState.systems[gameState.previousSystemIndex];
        UI.addText(10, y++, `You are returned to ${previousSystem.name}.`, COLORS.CYAN);
        y += 2;
        
        UI.addCenteredButton(y++, '1', 'Continue', () => {
            // End encounter and return to previous system
            gameState.encounter = false;
            gameState.encounterShips = [];
            gameState.encounterCargo = {};
            gameState.setCurrentSystem(gameState.previousSystemIndex);
            
            // Clean up combat properties
            gameState.ships.forEach(ship => {
                delete ship.x;
                delete ship.y;
                delete ship.angle;
                delete ship.fled;
                delete ship.disabled;
                delete ship.acted;
                delete ship.escaped;
            });
            
            DockMenu.show(gameState);
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Handle surrender to pirates - loot cargo
     */
    function handlePirateSurrender(gameState, startY) {
        let y = startY;
        
        // Only loot from non-escaped ships
        const nonEscapedShips = gameState.ships.filter(s => !s.escaped);
        const playerCargo = Ship.getFleetCargo(nonEscapedShips);
        const hasAnyCargo = Object.values(playerCargo).some(amount => amount > 0);
        
        // Calculate enemy cargo capacity
        const enemyCapacity = gameState.encounterShips.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
        
        // Pirates take cargo
        if (hasAnyCargo && enemyCapacity > 0) {
            UI.addText(10, y++, `The pirates board your ships and take your cargo:`, COLORS.TEXT_ERROR);
            y++;
            
            // Sort cargo by value (most valuable first)
            const cargoByValue = Object.keys(playerCargo)
                .filter(cargoId => playerCargo[cargoId] > 0)
                .map(cargoId => ({
                    id: cargoId,
                    type: CARGO_TYPES[cargoId],
                    amount: playerCargo[cargoId],
                    value: CARGO_TYPES[cargoId].baseValue
                }))
                .sort((a, b) => b.value - a.value);
            
            // Loot cargo up to enemy capacity
            let remainingCapacity = enemyCapacity;
            const lootedCargo = [];
            
            for (const cargo of cargoByValue) {
                if (remainingCapacity <= 0) break;
                
                const amountToLoot = Math.min(cargo.amount, remainingCapacity);
                Ship.removeCargoFromFleet(nonEscapedShips, cargo.id, amountToLoot);
                lootedCargo.push({ type: cargo.type, amount: amountToLoot });
                remainingCapacity -= amountToLoot;
            }
            
            if (lootedCargo.length > 0) {
                lootedCargo.forEach(loot => {
                    UI.addText(10, y++, `  Taken: ${loot.amount} ${loot.type.name}`, COLORS.TEXT_ERROR);
                });
                y++;
            }
        } else {
            UI.addText(10, y++, `You have no cargo worth taking.`, COLORS.TEXT_DIM);
            y++;
        }
        
        // Pirates take credits (25% of player's credits)
        const creditsTaken = Math.floor(gameState.credits * 0.25);
        if (creditsTaken > 0) {
            gameState.credits -= creditsTaken;
            UI.addText(10, y++, `The pirates demand ${creditsTaken} credits.`, COLORS.TEXT_ERROR);
            y++;
        }
        
        UI.addText(10, y++, `The pirates allow you to go free.`, COLORS.TEXT_NORMAL);
        y += 2;
        
        UI.addCenteredButton(y++, '1', 'Continue Journey', () => {
            // Restore shields for all non-escaped ships
            currentGameState.ships.forEach(ship => {
                if (!ship.escaped) {
                    ship.shields = ship.maxShields;
                }
            });
            
            // Resume travel
            TravelMenu.resume();
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Handle surrender to merchants - they flee
     */
    function handleMerchantSurrender(gameState, startY) {
        let y = startY;
        
        UI.addText(10, y++, `The merchants panic at your surrender signal!`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `Confused by your intentions, they flee in a hurry.`, COLORS.CYAN);
        y++;
        
        UI.addText(10, y++, `You are left alone in space.`, COLORS.TEXT_DIM);
        y += 2;
        
        UI.addCenteredButton(y++, '1', 'Continue Journey', () => {
            // Restore shields for all non-escaped ships
            currentGameState.ships.forEach(ship => {
                if (!ship.escaped) {
                    ship.shields = ship.maxShields;
                }
            });
            
            // Resume travel
            TravelMenu.resume();
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Handle all player ships escaped successfully
     */
    function handleAllShipsEscaped() {
        // Check if this is a liberation battle
        if (currentGameState.liberationBattle) {
            AlienLiberationBattle.handleFlee(currentGameState);
            return;
        }
        
        UI.clear();
        UI.clearOutputRow();
        
        let y = 5;
        UI.addTextCentered(y++, `=== Escape Successful ===`, COLORS.GREEN);
        y += 2;
        
        UI.addText(10, y++, `All your ships escaped!`, COLORS.GREEN);
        
        // Grant flee experience
        const playerFleetValue = currentGameState.ships.reduce((sum, s) => {
            const shipType = SHIP_TYPES[s.type] || ALIEN_SHIP_TYPES[s.type];
            return sum + (shipType ? shipType.value : 0);
        }, 0);
        const enemyFleetValue = currentGameState.encounterShips.reduce((sum, s) => {
            const shipType = SHIP_TYPES[s.type] || ALIEN_SHIP_TYPES[s.type];
            return sum + (shipType ? shipType.value : 0);
        }, 0);
        const valueRatio = playerFleetValue > 0 ? enemyFleetValue / playerFleetValue : 1;
        const fleeExp = Math.floor(EXP_POINTS_FROM_COMBAT_FLEE_AVG * valueRatio);
        const expComponents = ExperienceUtils.getExperienceMessageComponents(currentGameState, fleeExp, 'Successful Flee');
        
        if (expComponents) {
            UI.addText(10, y++, expComponents.baseMessage, expComponents.baseMsgColor);
            if (expComponents.levelUpText) {
                UI.addText(10 + expComponents.baseMessage.length + 1, y - 1, expComponents.levelUpText, expComponents.levelUpColor);
            }
        }
        
        UI.addText(10, y++, `You continue your journey.`, COLORS.TEXT_NORMAL);
        y += 2;
        
        UI.addCenteredButton(y++, '1', 'Continue Journey', () => {
            // Restore shields for all ships
            currentGameState.ships.forEach(ship => {
                ship.shields = ship.maxShields;
            });
            
            // Clean up combat properties
            currentGameState.ships.forEach(ship => {
                delete ship.x;
                delete ship.y;
                delete ship.angle;
                delete ship.fled;
                delete ship.disabled;
                delete ship.acted;
                delete ship.escaped;
            });
            
            currentGameState.encounterShips.forEach(ship => {
                delete ship.x;
                delete ship.y;
                delete ship.angle;
                delete ship.fled;
                delete ship.disabled;
                delete ship.acted;
                delete ship.escaped;
            });
            
            currentGameState.encounter = false;
            currentGameState.encounterShips = [];
            
            // Resume travel
            TravelMenu.resume();
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Handle some ships escaped, some disabled
     */
    function handlePartialEscape(escapedShips, disabledShips) {
        UI.clear();
        
        let y = 5;
        UI.addTextCentered(y++, `=== Partial Escape ===`, COLORS.YELLOW);
        y += 2;
        
        UI.addText(10, y++, `Some of your ships were disabled during combat.`, COLORS.TEXT_ERROR);
        UI.addText(10, y++, `They are permanently removed from your fleet along with their cargo.`, COLORS.TEXT_ERROR);
        y++;
        
        UI.addText(10, y++, `Disabled ships:`, COLORS.TEXT_DIM);
        disabledShips.forEach(ship => {
            const shipType = SHIP_TYPES[ship.type] || ALIEN_SHIP_TYPES[ship.type] || { name: 'Unknown' };
            UI.addText(10, y++, `  ${shipType.name}`, COLORS.TEXT_ERROR);
        });
        y++;
        
        UI.addText(10, y++, `Escaped ships:`, COLORS.TEXT_DIM);
        escapedShips.forEach(ship => {
            const shipType = SHIP_TYPES[ship.type] || ALIEN_SHIP_TYPES[ship.type] || { name: 'Unknown' };
            UI.addText(10, y++, `  ${shipType.name}`, COLORS.GREEN);
        });
        y += 2;
        
        UI.addCenteredButton(y++, '1', 'Continue Journey', () => {
            // Remove disabled ships from fleet
            currentGameState.ships = currentGameState.ships.filter(s => !s.disabled);
            
            // Restore shields for remaining ships
            currentGameState.ships.forEach(ship => {
                ship.shields = ship.maxShields;
            });
            
            // Clean up combat properties
            currentGameState.ships.forEach(ship => {
                delete ship.x;
                delete ship.y;
                delete ship.angle;
                delete ship.fled;
                delete ship.disabled;
                delete ship.acted;
                delete ship.escaped;
            });
            
            currentGameState.encounterShips.forEach(ship => {
                delete ship.x;
                delete ship.y;
                delete ship.angle;
                delete ship.fled;
                delete ship.disabled;
                delete ship.acted;
                delete ship.escaped;
            });
            
            currentGameState.encounter = false;
            currentGameState.encounterShips = [];
            
            // Resume travel
            TravelMenu.resume();
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Handle total defeat - all ships disabled, automatic surrender
     */
    function handleTotalDefeat() {
        // Check if this is a liberation battle
        if (currentGameState.liberationBattle) {
            AlienLiberationBattle.handleDefeat(currentGameState);
            return;
        }
        
        UI.clear();
        UI.clearOutputRow();
        
        let y = 5;
        UI.addTextCentered(y++, `=== Total Defeat ===`, COLORS.TEXT_ERROR);
        y += 2;
        
        UI.addText(10, y++, `All your ships have been disabled!`, COLORS.TEXT_ERROR);
        UI.addText(10, y++, `You are forced to surrender...`, COLORS.TEXT_ERROR);
        y++;
        
        // Automatic surrender based on encounter type
        if (encounterType.id === 'POLICE') {
            handleTotalDefeatPolice(y);
        } else if (encounterType.id === 'PIRATE') {
            handleTotalDefeatPirate(y);
        } else if (encounterType.id === 'MERCHANT') {
            handleTotalDefeatMerchant(y);
        } else if (encounterType.id === 'ALIEN_SKIRMISH' || encounterType.id === 'ALIEN_DEFENSE') {
            // Aliens destroyed player fleet - tow back
            handleAlienDefeat(y);
        }
    }
    
    /**
     * Handle total defeat to police - jail and tow
     */
    function handleTotalDefeatPolice(startY) {
        let y = startY;
        
        UI.addText(10, y++, `The police arrest you and impound all your ships.`, COLORS.TEXT_ERROR);
        y++;
        
        // Calculate jail time based on bounty
        if (currentGameState.bounty > 0) {
            const jailDays = Math.ceil((currentGameState.bounty / 1000) * DAYS_IN_JAIL_PER_1000CR_BOUNTY);
            
            UI.addText(10, y++, `Bounty: ${currentGameState.bounty} CR`, COLORS.TEXT_ERROR);
            UI.addText(10, y++, `Sentence: ${jailDays} days in jail`, COLORS.TEXT_ERROR);
            y++;
            
            // Clear bounty
            currentGameState.bounty = 0;
            
            // Advance time by jail sentence
            currentGameState.date.setDate(currentGameState.date.getDate() + jailDays);
            
            UI.addText(10, y++, `After serving your sentence, you are released.`, COLORS.TEXT_NORMAL);
        } else {
            UI.addText(10, y++, `The police process your arrest.`, COLORS.TEXT_NORMAL);
        }
        
        y++;
        UI.addText(10, y++, `All ships and cargo have been impounded.`, COLORS.TEXT_ERROR);
        y += 2;
        
        const buttonY = UI.getGridSize().height - 3;
        UI.addCenteredButton(buttonY, '1', 'Continue', () => {
            TowMenu.show(currentGameState);
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Handle total defeat to merchants - they flee, tow back
     */
    function handleTotalDefeatMerchant(startY) {
        let y = startY;
        
        UI.addText(10, y++, `The merchants panic and flee the scene!`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `They leave you disabled in space.`, COLORS.TEXT_DIM);
        y += 2;
        
        const buttonY = UI.getGridSize().height - 3;
        UI.addCenteredButton(buttonY, '1', 'Continue', () => {
            TowMenu.show(currentGameState);
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Handle total defeat to pirates - everything lost, tow back
     */
    function handleTotalDefeatPirate(startY) {
        let y = startY;
        
        UI.addText(10, y++, `The pirates board your disabled ships and take everything.`, COLORS.TEXT_ERROR);
        UI.addText(10, y++, `All cargo and credits are lost.`, COLORS.TEXT_ERROR);
        y++;
        
        // Pirates take all credits
        currentGameState.credits = 0;
        
        UI.addText(10, y++, `The pirates leave you stranded in space.`, COLORS.TEXT_DIM);
        y += 2;
        
        const buttonY = UI.getGridSize().height - 3;
        UI.addCenteredButton(buttonY, '1', 'Continue', () => {
            TowMenu.show(currentGameState);
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * End combat temporarily
     */
    function endCombat() {
        // Clean up combat properties
        currentGameState.ships.forEach(ship => {
            delete ship.x;
            delete ship.y;
            delete ship.angle;
            delete ship.fled;
            delete ship.disabled;
            delete ship.acted;
            delete ship.escaped;
        });
        
        currentGameState.encounterShips.forEach(ship => {
            delete ship.x;
            delete ship.y;
            delete ship.angle;
            delete ship.fled;
            delete ship.disabled;
            delete ship.acted;
            delete ship.escaped;
        });
        
        currentGameState.encounter = false;
        currentGameState.encounterShips = [];
        
        GalaxyMap.show(currentGameState);
    }
    
    /**
     * Handle defeat by aliens - tow back to origin
     */
    function handleAlienDefeat(startY) {
        let y = startY;
        
        UI.addText(10, y++, `The aliens destroy your fleet!`, COLORS.TEXT_ERROR);
        y += 2;
        
        const buttonY = UI.getGridSize().height - 3;
        
        UI.addCenteredButton(buttonY, '1', 'Continue', () => {
            // Clean up combat properties
            currentGameState.ships.forEach(ship => {
                delete ship.x;
                delete ship.y;
                delete ship.angle;
                delete ship.fled;
                delete ship.disabled;
                delete ship.acted;
                delete ship.escaped;
            });
            
            currentGameState.encounterShips.forEach(ship => {
                delete ship.x;
                delete ship.y;
                delete ship.angle;
                delete ship.fled;
                delete ship.disabled;
                delete ship.acted;
                delete ship.escaped;
            });
            
            currentGameState.encounter = false;
            currentGameState.encounterShips = [];
            
            // Show tow menu
            TowMenu.show(currentGameState);
        }, COLORS.GREEN);
        
        UI.draw();
    }
    
    /**
     * Check if player has won (all enemies disabled or fled)
     */
    function checkForVictory() {
        const allEnemiesDefeated = currentGameState.encounterShips.every(
            ship => ship.disabled || ship.fled || ship.escaped
        );
        
        // Check for player escape/defeat scenarios
        const activePlayerShips = currentGameState.ships.filter(s => !s.disabled && !s.escaped);
        const escapedPlayerShips = currentGameState.ships.filter(s => s.escaped);
        const disabledPlayerShips = currentGameState.ships.filter(s => s.disabled);
        
        // All player ships escaped
        if (activePlayerShips.length === 0 && escapedPlayerShips.length > 0 && disabledPlayerShips.length === 0) {
            handleAllShipsEscaped();
            return true;
        }
        
        // Some ships escaped, some disabled
        if (escapedPlayerShips.length > 0 && disabledPlayerShips.length > 0 && activePlayerShips.length === 0) {
            handlePartialEscape(escapedPlayerShips, disabledPlayerShips);
            return true;
        }
        
        // All ships disabled (none escaped) - automatic surrender
        if (activePlayerShips.length === 0 && escapedPlayerShips.length === 0 && disabledPlayerShips.length > 0) {
            handleTotalDefeat();
            return true;
        }
        
        if (allEnemiesDefeated) {
            // Check if this is a liberation battle
            if (currentGameState.liberationBattle) {
                AlienLiberationBattle.handleVictory(currentGameState);
                return true;
            }
            
            // Get disabled enemy ships for looting
            const defeatedShips = currentGameState.encounterShips.filter(ship => ship.disabled);
            
            // Restore shields for all non-disabled, non-escaped player ships
            currentGameState.ships.forEach(ship => {
                if (!ship.disabled && !ship.escaped) {
                    ship.shields = ship.maxShields;
                }
            });
            
            // Clean up combat properties before showing loot
            currentGameState.ships.forEach(ship => {
                delete ship.x;
                delete ship.y;
                delete ship.angle;
                delete ship.fled;
                delete ship.disabled;
                delete ship.acted;
                delete ship.escaped;
            });
            
            currentGameState.encounterShips.forEach(ship => {
                delete ship.x;
                delete ship.y;
                delete ship.angle;
                delete ship.fled;
                delete ship.disabled;
                delete ship.acted;
                delete ship.escaped;
            });
            
            currentGameState.encounter = false;
            currentGameState.encounterShips = [];
            
            // Grant reputation for defeating aliens
            if (encounterType.id === 'ALIEN_SKIRMISH') {
                currentGameState.reputation += 5;
                // Track alien ships defeated
                const alienShipsDefeated = defeatedShips.length;
                currentGameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] = 
                    (currentGameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] || 0) + alienShipsDefeated;
            } else if (encounterType.id === 'ALIEN_DEFENSE') {
                currentGameState.reputation += 10;
                // Track alien ships defeated
                const alienShipsDefeated = defeatedShips.length;
                currentGameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] = 
                    (currentGameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] || 0) + alienShipsDefeated;
            }
            
            // Grant combat victory experience
            const playerFleetValue = currentGameState.ships.reduce((sum, s) => {
                const shipType = SHIP_TYPES[s.type] || ALIEN_SHIP_TYPES[s.type];
                return sum + (shipType ? shipType.value : 0);
            }, 0);
            const enemyFleetValue = defeatedShips.reduce((sum, s) => {
                const shipType = SHIP_TYPES[s.type] || ALIEN_SHIP_TYPES[s.type];
                return sum + (shipType ? shipType.value : 0);
            }, 0);
            const valueRatio = playerFleetValue > 0 ? enemyFleetValue / playerFleetValue : 1;
            const victoryExp = Math.floor(EXP_POINTS_FROM_COMBAT_VICTORY_AVG * valueRatio);
            ExperienceUtils.getExperienceMessageComponents(currentGameState, victoryExp, 'Combat Victory');
            
            // Show loot menu
            LootMenu.show(currentGameState, defeatedShips, encounterType, () => {
                // After looting, continue journey
                TravelMenu.resume();
            });
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Execute a player action
     */
    function executePlayerAction(actionType) {
        const activeShip = getActivePlayerShip();
        if (!activeShip) return;
        
        const targetShip = currentGameState.encounterShips[targetIndex];
        if (!targetShip || targetShip.fled || targetShip.disabled) return;
        
        const targetShipType = SHIP_TYPES[targetShip.type] || ALIEN_SHIP_TYPES[targetShip.type] || { name: 'Unknown' };
        
        // Store initial distance
        const initialDistance = Math.sqrt(
            Math.pow(activeShip.x - targetShip.x, 2) + 
            Math.pow(activeShip.y - targetShip.y, 2)
        );
        
        // Get ship type for messages
        const activeShipType = SHIP_TYPES[activeShip.type] || ALIEN_SHIP_TYPES[activeShip.type] || { name: 'Ship' };
        
        // Set initial message
        if (actionType === COMBAT_ACTIONS.PURSUE) {
            outputMessage = `${activeShipType.name} pursuing ${targetShipType.name}...`;
        } else if (actionType === COMBAT_ACTIONS.FLEE) {
            outputMessage = `${activeShipType.name} fleeing from ${targetShipType.name}...`;
        } else if (actionType === COMBAT_ACTIONS.FIRE_LASER) {
            outputMessage = `${activeShipType.name} firing laser at ${targetShipType.name}...`;
        }
        outputColor = COLORS.TEXT_NORMAL;
        
        // Create action
        const action = new CombatAction(activeShip, actionType, targetShip);
        
        // Execute action with visual updates
        executeActionWithTicks(action, () => {
            // Mark ship as acted
            activeShip.acted = true;
            
            // Regenerate shields (1 per turn, or 4 if ship has SHIELD_RECHARGER module)
            const baseRegen = 1;
            const hasRecharger = activeShip.modules && activeShip.modules.includes('SHIELD_RECHARGER');
            const regenAmount = hasRecharger ? baseRegen * 4 : baseRegen;
            if (activeShip.shields < activeShip.maxShields) {
                const actualRegen = Math.min(regenAmount, activeShip.maxShields - activeShip.shields);
                activeShip.shields += actualRegen;
            }
            
            waitingForContinue = true; // Wait for player to press Continue
            
            // Clear target selection so yellow highlighting is removed
            targetIndex = -1;
            
            // Auto-select next valid target for convenience
            const enemies = currentGameState.encounterShips.filter(s => !s.fled && !s.disabled && !s.escaped);
            if (enemies.length > 0) {
                // Find first valid target
                for (let i = 0; i < currentGameState.encounterShips.length; i++) {
                    const enemy = currentGameState.encounterShips[i];
                    if (!enemy.fled && !enemy.disabled && !enemy.escaped) {
                        targetIndex = i;
                        break;
                    }
                }
            }
            
            // Set completion message based on action type
            if (actionType === COMBAT_ACTIONS.FIRE_LASER) {
                // Get active ship type for messages
                const activeShipType = SHIP_TYPES[activeShip.type] || ALIEN_SHIP_TYPES[activeShip.type] || { name: 'Ship' };
                
                // Check if ship just turned instead of firing
                if (currentGameState.combatHandler && currentGameState.combatHandler.justTurned && !action.projectile) {
                    outputMessage = `${activeShipType.name} starts turning to target ${targetShipType.name}`;
                    outputColor = COLORS.TEXT_NORMAL;
                } else if (action.hitObstruction) {
                    // Hit an obstruction
                    if (action.hitObstruction.type === 'ship') {
                        const obstructedShip = action.hitObstruction.ship;
                        triggerFlash(obstructedShip); // Flash the hit ship
                        let obstructedName = '';
                        // Get ship type name for obstruction
                        const obstructedType = SHIP_TYPES[obstructedShip.type] || ALIEN_SHIP_TYPES[obstructedShip.type] || { name: 'Ship' };
                        obstructedName = obstructedType.name;
                        outputMessage = `${activeShipType.name} hit ${obstructedName} (obstruction) for ${action.hitObstruction.damage} damage!`;
                        outputColor = COLORS.YELLOW;
                    } else if (action.hitObstruction.type === 'asteroid') {
                        // Flash the asteroid
                        if (action.hitObstruction.asteroid) {
                            triggerFlash(action.hitObstruction.asteroid);
                        }
                        outputMessage = `${activeShipType.name} hit an asteroid (obstruction)!`;
                        outputColor = COLORS.YELLOW;
                    }
                } else if (action.hit) {
                    // Flash the target ship when hit
                    if (action.targetShip) {
                        triggerFlash(action.targetShip);
                    }
                    outputMessage = `${activeShipType.name} fires laser and hits ${targetShipType.name} for ${action.damage} damage! (${Math.floor(action.distance)} AU)`;
                    outputColor = COLORS.GREEN;
                    
                    // Handle module effects
                    if (action.moduleEffects) {
                        // DISRUPTER: Shields removed
                        if (action.moduleEffects.disrupterTriggered) {
                            outputMessage += ` DISRUPTER removes shields!`;
                        }
                        
                        // WARHEAD: Splash damage to nearby enemies
                        if (action.moduleEffects.warheadTriggered) {
                            triggerAOE(action.targetShip.x, action.targetShip.y, COLORS.TEXT_ERROR);
                            const warheadDamage = action.moduleEffects.warheadDamage;
                            
                            // Damage nearby enemy ships
                            currentGameState.encounterShips.forEach(enemy => {
                                if (enemy === action.targetShip || enemy.disabled) return;
                                const dx = enemy.x - action.targetShip.x;
                                const dy = enemy.y - action.targetShip.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                if (distance <= CONSTS.MODULE_WARHEAD_RANGE) {
                                    enemy.hull -= warheadDamage;
                                    triggerFlash(enemy);
                                }
                            });
                            outputMessage += ` WARHEAD splash damage!`;
                        }
                        
                        // BLINK: Target teleported
                        if (action.moduleEffects.blinkTriggered) {
                            outputMessage += ` BLINK teleports away!`;
                        }
                        
                        // REFLECTOR: Laser bounced back
                        if (action.moduleEffects.reflectorBounce) {
                            const reflectDamage = action.moduleEffects.reflectorBounce.damage;
                            if (activeShip.shields > 0) {
                                const shieldDamage = Math.min(reflectDamage, activeShip.shields);
                                activeShip.shields -= shieldDamage;
                                const remainingDamage = reflectDamage - shieldDamage;
                                if (remainingDamage > 0) {
                                    activeShip.hull -= remainingDamage;
                                }
                            } else {
                                activeShip.hull -= reflectDamage;
                            }
                            triggerFlash(activeShip);
                            outputMessage += ` REFLECTOR bounces laser back for ${reflectDamage} damage!`;
                        }
                        
                        // TRACTOR_BEAM: Pull target closer
                        if (action.moduleEffects.tractorPull) {
                            const pullDistance = action.moduleEffects.tractorPull.distance;
                            const pullAngle = action.moduleEffects.tractorPull.angle;
                            action.targetShip.x += Math.cos(pullAngle) * pullDistance;
                            action.targetShip.y += Math.sin(pullAngle) * pullDistance;
                            outputMessage += ` TRACTOR BEAM pulls target!`;
                        }
                        
                        // REPULSOR: Push target away
                        if (action.moduleEffects.repulsorPush) {
                            const pushDistance = action.moduleEffects.repulsorPush.distance;
                            const pushAngle = action.moduleEffects.repulsorPush.angle + Math.PI; // Opposite direction
                            action.targetShip.x += Math.cos(pushAngle) * pushDistance;
                            action.targetShip.y += Math.sin(pushAngle) * pushDistance;
                            outputMessage += ` REPULSOR pushes target!`;
                        }
                    }
                } else {
                    outputMessage = `${activeShipType.name} fires laser and misses ${targetShipType.name}! (${Math.floor(action.distance)} AU)`;
                    outputColor = COLORS.TEXT_DIM;
                }
            } else {
                // Get active ship type for messages
                const activeShipType = SHIP_TYPES[activeShip.type] || ALIEN_SHIP_TYPES[activeShip.type] || { name: 'Ship' };
                
                // Calculate distance moved
                const finalDistance = Math.sqrt(
                    Math.pow(activeShip.x - targetShip.x, 2) + 
                    Math.pow(activeShip.y - targetShip.y, 2)
                );
                const distanceMoved = Math.abs(finalDistance - initialDistance).toFixed(1);
                
                // Only set message if it's not already set (e.g., from ramming)
                if (!outputMessage.includes('RAMMED')) {
                    if (actionType === COMBAT_ACTIONS.FLEE) {
                        outputMessage = `${activeShipType.name} fled ${distanceMoved} AU from ${targetShipType.name}`;
                        outputColor = COLORS.TEXT_NORMAL;
                    } else if (actionType === COMBAT_ACTIONS.PURSUE) {
                        outputMessage = `${activeShipType.name} pursued ${targetShipType.name} ${distanceMoved} AU`;
                        outputColor = COLORS.TEXT_NORMAL;
                    }
                }
            }
            
            render();
        });
    }
    
    /**
     * Continue after action completes
     */
    function continueAfterAction() {
        outputMessage = '';
        waitingForContinue = false; // Allow next ship to become active
        
        // Check for victory before proceeding
        if (checkForVictory()) {
            return;
        }
        
        // Check if there are more player ships to move
        if (!advanceToNextPlayerShip()) {
            // All player ships moved, start enemy turn
            executeEnemyTurn();
        }
    }
    
    /**
     * Get the current active player ship
     */
    function getActivePlayerShip() {
        for (let i = 0; i < currentGameState.ships.length; i++) {
            const ship = currentGameState.ships[i];
            if (!ship.fled && !ship.disabled && !ship.escaped && !ship.acted) {
                return ship;
            }
        }
        return null;
    }
    
    /**
     * Advance to next player ship that hasn't acted
     */
    function advanceToNextPlayerShip() {
        const nextShip = getActivePlayerShip();
        if (nextShip) {
            // Center camera on new active ship
            cameraOffsetX = nextShip.x;
            cameraOffsetY = nextShip.y;
            render(); // Render with new active ship
            return true;
        }
        return false;
    }
    
    /**
     * Execute enemy turn (all enemy ships move)
     */
    function executeEnemyTurn() {
        const enemyActions = [];
        
        // Generate actions for all enemy ships
        currentGameState.encounterShips.forEach(ship => {
            if (!ship.fled && !ship.disabled) {
                const action = CombatAI.generateAction(ship, currentGameState.ships);
                if (action) {
                    enemyActions.push(action);
                }
            }
        });
        
        // Execute enemy actions sequentially
        executeEnemyActionsSequentially(enemyActions, 0, () => {
            // Check for victory before starting new turn
            if (checkForVictory()) {
                return;
            }
            
            // Reset acted flags for new turn
            currentGameState.ships.forEach(ship => ship.acted = false);
            currentGameState.encounterShips.forEach(ship => ship.acted = false);
            
            // Center camera back on first active player ship
            const firstShip = getActivePlayerShip();
            if (firstShip) {
                cameraOffsetX = firstShip.x;
                cameraOffsetY = firstShip.y;
            }
            
            outputMessage = 'New turn';
            outputColor = COLORS.TEXT_NORMAL;
            render();
        });
    }
    
    /**
     * Execute enemy actions one at a time
     */
    function executeEnemyActionsSequentially(actions, index, onComplete) {
        if (index >= actions.length) {
            onComplete();
            return;
        }
        
        const action = actions[index];
        
        // Skip if action ship or target is no longer valid (fled, escaped, disabled)
        if (!action.ship || !action.targetShip || 
            action.ship.fled || action.ship.escaped || action.ship.disabled ||
            action.targetShip.fled || action.targetShip.escaped || action.targetShip.disabled) {
            // Skip to next action
            executeEnemyActionsSequentially(actions, index + 1, onComplete);
            return;
        }
        
        // Center camera on the enemy ship that's moving
        if (action.ship) {
            cameraOffsetX = action.ship.x;
            cameraOffsetY = action.ship.y;
        }
        
        // Store initial distance
        const initialDistance = Math.sqrt(
            Math.pow(action.ship.x - action.targetShip.x, 2) + 
            Math.pow(action.ship.y - action.targetShip.y, 2)
        );
        
        // Get enemy ship type for messages
        const enemyShipType = SHIP_TYPES[action.ship.type] || ALIEN_SHIP_TYPES[action.ship.type] || { name: 'Unknown' };
        // Get target ship type for messages
        const targetShipType = SHIP_TYPES[action.targetShip.type] || ALIEN_SHIP_TYPES[action.targetShip.type] || { name: 'Ship' };
        
        // Set initial message
        if (action.actionType === COMBAT_ACTIONS.PURSUE) {
            outputMessage = `${enemyShipType.name} pursuing ${targetShipType.name}...`;
        } else if (action.actionType === COMBAT_ACTIONS.FLEE) {
            outputMessage = `${enemyShipType.name} fleeing from ${targetShipType.name}...`;
        } else if (action.actionType === COMBAT_ACTIONS.FIRE_LASER) {
            outputMessage = `${enemyShipType.name} firing laser at ${targetShipType.name}...`;
        }
        outputColor = COLORS.TEXT_ERROR;
        
        executeActionWithTicks(action, () => {
            // Mark enemy ship as acted
            action.ship.acted = true;
            
            // Regenerate shields (1 per turn, or 4 if ship has SHIELD_RECHARGER module)
            const baseRegen = 1;
            const hasRecharger = action.ship.modules && action.ship.modules.includes('SHIELD_RECHARGER');
            const regenAmount = hasRecharger ? baseRegen * 4 : baseRegen;
            if (action.ship.shields < action.ship.maxShields) {
                const actualRegen = Math.min(regenAmount, action.ship.maxShields - action.ship.shields);
                action.ship.shields += actualRegen;
            }
            
            // Set message based on action type
            if (action.actionType === COMBAT_ACTIONS.FIRE_LASER) {
                // Get enemy ship type name
                const enemyShipType = SHIP_TYPES[action.ship.type] || ALIEN_SHIP_TYPES[action.ship.type] || { name: 'Unknown' };
                // Get target ship type for messages
                const targetShipType = SHIP_TYPES[action.targetShip.type] || ALIEN_SHIP_TYPES[action.targetShip.type] || { name: 'Ship' };
                
                // Check if ship just turned instead of firing
                if (currentGameState.combatHandler && currentGameState.combatHandler.justTurned && !action.projectile) {
                    outputMessage = `${enemyShipType.name} starts turning to target ${targetShipType.name}`;
                    outputColor = COLORS.TEXT_NORMAL;
                } else if (action.hitObstruction) {
                    // Hit an obstruction
                    if (action.hitObstruction.type === 'ship') {
                        const obstructedShip = action.hitObstruction.ship;
                        triggerFlash(obstructedShip); // Flash the hit ship
                        // Get ship type name for obstruction
                        const obstructedType = SHIP_TYPES[obstructedShip.type] || ALIEN_SHIP_TYPES[obstructedShip.type] || { name: 'Ship' };
                        const obstructedName = obstructedType.name;
                        outputMessage = `${enemyShipType.name} hit ${obstructedName} (obstruction) for ${action.hitObstruction.damage} damage!`;
                        outputColor = COLORS.YELLOW;
                    } else if (action.hitObstruction.type === 'asteroid') {
                        // Flash the asteroid
                        if (action.hitObstruction.asteroid) {
                            triggerFlash(action.hitObstruction.asteroid);
                        }
                        outputMessage = `${enemyShipType.name} hit an asteroid (obstruction)!`;
                        outputColor = COLORS.YELLOW;
                    }
                } else if (action.hit) {
                    // Flash the target ship when hit
                    if (action.targetShip) {
                        triggerFlash(action.targetShip);
                    }
                    outputMessage = `${enemyShipType.name} hit ${targetShipType.name} for ${action.damage} damage! (${Math.floor(action.distance)} AU)`;
                    outputColor = COLORS.TEXT_ERROR;
                    
                    // Handle module effects
                    if (action.moduleEffects) {
                        // DISRUPTER: Shields removed
                        if (action.moduleEffects.disrupterTriggered) {
                            outputMessage += ` DISRUPTER removes shields!`;
                        }
                        
                        // WARHEAD: Splash damage to nearby enemies
                        if (action.moduleEffects.warheadTriggered) {
                            triggerAOE(action.targetShip.x, action.targetShip.y, COLORS.TEXT_ERROR);
                            const warheadDamage = action.moduleEffects.warheadDamage;
                            
                            // Damage nearby player ships
                            currentGameState.ships.forEach(playerShip => {
                                if (playerShip === action.targetShip || playerShip.disabled) return;
                                const dx = playerShip.x - action.targetShip.x;
                                const dy = playerShip.y - action.targetShip.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                if (distance <= CONSTS.MODULE_WARHEAD_RANGE) {
                                    playerShip.hull -= warheadDamage;
                                    triggerFlash(playerShip);
                                }
                            });
                            outputMessage += ` WARHEAD splash damage!`;
                        }
                        
                        // BLINK: Target teleported
                        if (action.moduleEffects.blinkTriggered) {
                            outputMessage += ` BLINK teleports away!`;
                        }
                        
                        // REFLECTOR: Laser bounced back
                        if (action.moduleEffects.reflectorBounce) {
                            const reflectDamage = action.moduleEffects.reflectorBounce.damage;
                            if (action.ship.shields > 0) {
                                const shieldDamage = Math.min(reflectDamage, action.ship.shields);
                                action.ship.shields -= shieldDamage;
                                const remainingDamage = reflectDamage - shieldDamage;
                                if (remainingDamage > 0) {
                                    action.ship.hull -= remainingDamage;
                                }
                            } else {
                                action.ship.hull -= reflectDamage;
                            }
                            triggerFlash(action.ship);
                            outputMessage += ` REFLECTOR bounces laser back for ${reflectDamage} damage!`;
                        }
                        
                        // TRACTOR_BEAM: Pull target closer
                        if (action.moduleEffects.tractorPull) {
                            const pullDistance = action.moduleEffects.tractorPull.distance;
                            const pullAngle = action.moduleEffects.tractorPull.angle;
                            action.targetShip.x += Math.cos(pullAngle) * pullDistance;
                            action.targetShip.y += Math.sin(pullAngle) * pullDistance;
                            outputMessage += ` TRACTOR BEAM pulls target!`;
                        }
                        
                        // REPULSOR: Push target away
                        if (action.moduleEffects.repulsorPush) {
                            const pushDistance = action.moduleEffects.repulsorPush.distance;
                            const pushAngle = action.moduleEffects.repulsorPush.angle + Math.PI; // Opposite direction
                            action.targetShip.x += Math.cos(pushAngle) * pushDistance;
                            action.targetShip.y += Math.sin(pushAngle) * pushDistance;
                            outputMessage += ` REPULSOR pushes target!`;
                        }
                    }
                } else {
                    outputMessage = `${enemyShipType.name} missed ${targetShipType.name}! (${Math.floor(action.distance)} AU)`;
                    outputColor = COLORS.TEXT_DIM;
                }
            } else {
                // Calculate distance moved
                const finalDistance = Math.sqrt(
                    Math.pow(action.ship.x - action.targetShip.x, 2) + 
                    Math.pow(action.ship.y - action.targetShip.y, 2)
                );
                const distanceMoved = Math.abs(finalDistance - initialDistance).toFixed(1);
                
                // Get enemy ship type for messages
                const enemyShipType = SHIP_TYPES[action.ship.type] || ALIEN_SHIP_TYPES[action.ship.type] || { name: 'Unknown' };
                // Get target ship type for messages
                const targetShipType = SHIP_TYPES[action.targetShip.type] || ALIEN_SHIP_TYPES[action.targetShip.type] || { name: 'Ship' };
                
                // Set message for the completed action
                if (action.actionType === COMBAT_ACTIONS.PURSUE) {
                    outputMessage = `${enemyShipType.name} pursued ${targetShipType.name} ${distanceMoved} AU`;
                } else if (action.actionType === COMBAT_ACTIONS.FLEE) {
                    outputMessage = `${enemyShipType.name} fled ${distanceMoved} AU from ${targetShipType.name}`;
                }
                outputColor = COLORS.TEXT_ERROR;
            }
            
            // Store continuation function
            continueEnemyTurn = () => {
                outputMessage = '';
                continueEnemyTurn = null;
                executeEnemyActionsSequentially(actions, index + 1, onComplete);
            };
            
            render();
        });
    }
    
    /**
     * Execute an action with visual tick updates
     */
    function executeActionWithTicks(action, onComplete) {
        // Combine all ships for obstruction checking
        const allShips = [...currentGameState.ships, ...currentGameState.encounterShips];
        const handler = new CombatActionHandler(action, currentGameState.asteroids, allShips, currentGameState);
        
        // Store in gameState to track action in progress
        currentGameState.combatAction = action;
        currentGameState.combatHandler = handler;
        
        const tickInterval = setInterval(() => {
            const complete = handler.tick();
            
            // Check if ramming occurred
            if (handler.ramAction) {
                // Execute ram action after current action completes
                clearInterval(tickInterval);
                
                // Calculate ramming damage (between 1 and distance travelled)
                const ramAction = handler.ramAction;
                const distanceTravelled = ramAction.knockbackDistance;
                let damage = Math.floor(Math.random() * Math.max(1, distanceTravelled)) + 1;
                
                // Check for DRILL module on rammer (2x damage)
                if (ramAction.rammer && ramAction.rammer.modules && ramAction.rammer.modules.includes('DRILL')) {
                    damage = Math.floor(damage * CONSTS.MODULE_DRILL_DAMAGE_MULTIPLIER);
                }
                
                // Apply hull damage to rammed ship
                ramAction.ship.hull -= damage;
                
                // Trigger flash for rammed ship
                triggerFlash(ramAction.ship);
                
                // Check for BLINK module on rammed ship (25% chance to teleport)
                if (ramAction.ship.modules && ramAction.ship.modules.includes('BLINK')) {
                    if (Math.random() < CONSTS.MODULE_BLINK_CHANCE) {
                        // Teleport to random position
                        const angle = Math.random() * Math.PI * 2;
                        const distance = CONSTS.MODULE_BLINK_DISTANCE;
                        ramAction.ship.x += Math.cos(angle) * distance;
                        ramAction.ship.y += Math.sin(angle) * distance;
                    }
                }
                
                // Check if ship is disabled
                if (ramAction.ship.hull <= 0) {
                    ramAction.ship.hull = 0;
                    // Don't disable immediately - will be disabled after flash
                    // ramAction.ship.disabled = true;
                }
                
                // Get ship names/types for message
                let rammerName = '';
                let rammedName = '';
                
                if (ramAction.rammer) {
                    // Determine if rammer is player or enemy
                    const rammerIsPlayer = currentGameState.ships.includes(ramAction.rammer);
                    if (rammerIsPlayer) {
                        const rammerType = SHIP_TYPES[ramAction.rammer.type] || ALIEN_SHIP_TYPES[ramAction.rammer.type] || { name: 'Ship' };
                        rammerName = rammerType.name;
                        const rammedType = SHIP_TYPES[ramAction.ship.type] || ALIEN_SHIP_TYPES[ramAction.ship.type] || { name: 'Unknown' };
                        rammedName = rammedType.name;
                    } else {
                        rammerName = 'Enemy';
                        const rammedType = SHIP_TYPES[ramAction.ship.type] || ALIEN_SHIP_TYPES[ramAction.ship.type] || { name: 'Ship' };
                        rammedName = rammedType.name;
                    }
                }
                
                // Clear current action before starting ram action
                currentGameState.combatAction = null;
                currentGameState.combatHandler = null;
                
                // Execute ram knockback animation
                executeActionWithTicks(ramAction, () => {
                    // Update message to show ramming
                    if (rammerName) {
                        outputMessage = `${rammerName} RAMMED ${rammedName} for ${damage} damage!`;
                        outputColor = COLORS.TEXT_ERROR;
                    }
                    
                    // Call original completion callback
                    if (onComplete) {
                        onComplete();
                    }
                });
                return;
            }
            
            // Update display
            render();
            
            if (complete) {
                clearInterval(tickInterval);
                
                // Check for escaped ships after action completes
                checkForEscapedShips(currentGameState);
                
                // Clear action from gameState
                currentGameState.combatAction = null;
                currentGameState.combatHandler = null;
                
                if (onComplete) {
                    onComplete();
                }
            }
        }, 100); // 100ms per tick for visual feedback
    }
    
    return {
        show
    };
})();
