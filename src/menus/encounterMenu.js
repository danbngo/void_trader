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
    
    /**
     * Calculate angle from one point to another (in radians)
     */
    function calculateAngle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    /**
     * Get triangle symbol based on angle
     */
    function getShipSymbol(angle) {
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
     * Initialize combat positions and angles for all ships
     */
    function initializeCombat(gameState) {
        const mapCenterX = 0;
        const mapCenterY = 0;
        
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
        UI.resetSelection();
        
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
        gameState.asteroids.forEach(asteroid => {
            if (asteroid.disabled) return;
            
            const screenX = Math.floor(mapCenterX + (asteroid.x - cameraOffsetX) * scale);
            const screenY = Math.floor(mapCenterY - (asteroid.y - cameraOffsetY) * scale);
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                UI.addText(screenX, screenY, 'O', COLORS.TEXT_DIM, 0.5);
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
        
        // Draw player ships
        gameState.ships.forEach((ship, index) => {
            if (ship.fled || ship.escaped) return;
            
            const screenX = Math.floor(mapCenterX + (ship.x - cameraOffsetX) * scale);
            const screenY = Math.floor(mapCenterY - (ship.y - cameraOffsetY) * scale); // Negate Y because screen Y increases downward
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                let symbol = getShipSymbol(ship.angle);
                let color = COLORS.CYAN;
                
                if (ship.disabled) {
                    symbol = 'x';
                    color = COLORS.GRAY;
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
        
        // Draw enemy ships
        gameState.encounterShips.forEach((ship, index) => {
            if (ship.fled || ship.escaped) return;
            
            const screenX = Math.floor(mapCenterX + (ship.x - cameraOffsetX) * scale);
            const screenY = Math.floor(mapCenterY - (ship.y - cameraOffsetY) * scale); // Negate Y because screen Y increases downward
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                let symbol = getShipSymbol(ship.angle);
                let color = COLORS.TEXT_ERROR;
                
                if (ship.disabled) {
                    symbol = 'x';
                    color = COLORS.GRAY;
                } else if (index === targetIndex) {
                    color = COLORS.YELLOW;
                    // Store position even if already stored
                    targetShipScreenX = screenX;
                    targetShipScreenY = screenY;
                }
                
                // Make non-disabled enemy ships clickable
                if (!ship.disabled) {
                    UI.addClickable(screenX, screenY, 1, () => {
                        targetIndex = index;
                        render();
                    });
                }
                
                UI.addText(screenX, screenY, symbol, color, 0.7);
            }
        });
        
        // Draw line between active ship and target (only if not firing laser with projectile)
        const isLaserActive = gameState.combatAction && 
                             gameState.combatAction.actionType === COMBAT_ACTIONS.FIRE_LASER && 
                             gameState.combatAction.projectile;
        
        if (activeShipScreenX !== null && targetShipScreenX !== null && !isLaserActive) {
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
                targetShipScreenX, targetShipScreenY,
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
        UI.addText(2, mapHeight, '▲ = Ship  x = Destroyed  O = Asteroid', COLORS.GRAY);
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
        
        UI.addText(startX, 0, '=== Your Ship ===', COLORS.GREEN);
        if (activeShip) {
            const shipType = SHIP_TYPES[activeShip.type] || { name: 'Unknown' };
            
            let y = 1;
            UI.addText(startX, y, 'Name:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, y, activeShip.name, COLORS.TEXT_NORMAL);
            y++;
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
            const shipType = SHIP_TYPES[targetShip.type] || { name: 'Unknown' };
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
     * Draw action buttons
     */
    function drawButtons(gameState, startX, mapHeight) {
        const grid = UI.getGridSize();
        const buttonY = grid.height - 5;
        
        // Set output message in UI output row if there's a message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        // Check if action is in progress
        const actionInProgress = gameState.combatAction || gameState.combatHandler;
        
        if (actionInProgress) {
            // No buttons while action is executing
            return;
        }
        
        // Check if waiting for enemy turn continuation
        if (continueEnemyTurn) {
            UI.addButton(5, buttonY, '1', 'Continue', () => {
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
            UI.addButton(5, buttonY, '1', 'Continue', () => {
                continueAfterAction();
            }, COLORS.GREEN, 'Continue to next action');
        } else {
            // Count valid enemy targets
            const validEnemyCount = currentGameState.encounterShips.filter(
                s => !s.fled && !s.disabled && !s.escaped
            ).length;
            
            // Show normal action buttons
            let currentButtonY = buttonY;
            
            // Only show target selection if there's more than one valid enemy
            if (validEnemyCount > 1) {
                UI.addButton(5, currentButtonY, '1', 'Previous Target', () => {
                    prevTarget();
                }, COLORS.BUTTON, 'Select previous enemy ship as target');
                currentButtonY++;
                
                UI.addButton(5, currentButtonY, '2', 'Next Target', () => {
                    nextTarget();
                }, COLORS.BUTTON, 'Select next enemy ship as target');
                currentButtonY++;
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
                
                // Laser help text: hit chance and damage
                const hitChance = Math.min(100, Math.floor((activeShip.radar / distance) * 100));
                const damageRange = `1-${activeShip.lasers}`;
                laserHelpText = `Fire laser (${hitChance}% hit, ${damageRange} dmg)`;
                
                // Pursue help text: check for ramming
                const willRam = distance <= activeShip.engine;
                if (willRam) {
                    const massRatio = activeShip.maxHull / targetShip.maxHull;
                    const knockback = Math.floor((activeShip.engine / 2) * massRatio);
                    const ramDamage = `1-${Math.floor(knockback)}`;
                    pursueHelpText = `Pursue (WILL RAM for ${ramDamage} dmg, travel ${Math.floor(distance)} AU)`;
                } else {
                    pursueHelpText = `Pursue (travel ${activeShip.engine} AU toward target)`;
                }
                
                // Flee help text: distance and escape check
                const fleeDistance = activeShip.engine;
                const newDistance = distance + fleeDistance;
                const currentDistanceFromCenter = Math.sqrt(activeShip.x * activeShip.x + activeShip.y * activeShip.y);
                const willEscape = currentDistanceFromCenter + fleeDistance > ENCOUNTER_MAX_RADIUS;
                if (willEscape) {
                    fleeHelpText = `Flee ${fleeDistance} AU (WILL ESCAPE THE MAP)`;
                } else {
                    fleeHelpText = `Flee ${fleeDistance} AU away from target`;
                }
            }
            
            UI.addButton(5, currentButtonY, '3', 'Fire Laser', () => {
                executePlayerAction(COMBAT_ACTIONS.FIRE_LASER);
            }, COLORS.TEXT_ERROR, laserHelpText);
            currentButtonY++;

            UI.addButton(5, currentButtonY, '4', 'Pursue', () => {
                executePlayerAction(COMBAT_ACTIONS.PURSUE);
            }, COLORS.GREEN, pursueHelpText);
            currentButtonY++;
            
            UI.addButton(5, currentButtonY, '5', 'Flee', () => {
                executePlayerAction(COMBAT_ACTIONS.FLEE);
            }, COLORS.BUTTON, fleeHelpText);
            currentButtonY++;
            
            UI.addButton(28, buttonY, '8', 'Zoom In', () => {
                mapViewRange = Math.max(ENCOUNTER_MIN_MAP_VIEW_RANGE, mapViewRange / 1.5);
                render();
            }, COLORS.BUTTON, 'Decrease view range to see closer');
            
            UI.addButton(28, buttonY + 1, '9', 'Zoom Out', () => {
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
     * Execute a player action
     */
    function executePlayerAction(actionType) {
        const activeShip = getActivePlayerShip();
        if (!activeShip) return;
        
        const targetShip = currentGameState.encounterShips[targetIndex];
        if (!targetShip || targetShip.fled || targetShip.disabled) return;
        
        const targetShipType = SHIP_TYPES[targetShip.type] || { name: 'Unknown' };
        
        // Store initial distance
        const initialDistance = Math.sqrt(
            Math.pow(activeShip.x - targetShip.x, 2) + 
            Math.pow(activeShip.y - targetShip.y, 2)
        );
        
        // Set initial message
        if (actionType === COMBAT_ACTIONS.PURSUE) {
            outputMessage = `${activeShip.name} pursuing ${targetShipType.name}...`;
        } else if (actionType === COMBAT_ACTIONS.FLEE) {
            outputMessage = `Fleeing from ${targetShipType.name}...`;
        } else if (actionType === COMBAT_ACTIONS.FIRE_LASER) {
            outputMessage = `${activeShip.name} firing laser at ${targetShipType.name}...`;
        }
        outputColor = COLORS.TEXT_NORMAL;
        
        // Create action
        const action = new CombatAction(activeShip, actionType, targetShip);
        
        // Execute action with visual updates
        executeActionWithTicks(action, () => {
            // Mark ship as acted
            activeShip.acted = true;
            waitingForContinue = true; // Wait for player to press Continue
            
            // Set completion message based on action type
            if (actionType === COMBAT_ACTIONS.FIRE_LASER) {
                // Laser message
                if (action.hit) {
                    outputMessage = `${activeShip.name} hit ${targetShipType.name} for ${action.damage} damage! (${Math.floor(action.distance)} AU)`;
                    outputColor = COLORS.GREEN;
                } else {
                    outputMessage = `${activeShip.name} missed ${targetShipType.name}! (${Math.floor(action.distance)} AU)`;
                    outputColor = COLORS.TEXT_DIM;
                }
            } else {
                // Calculate distance moved
                const finalDistance = Math.sqrt(
                    Math.pow(activeShip.x - targetShip.x, 2) + 
                    Math.pow(activeShip.y - targetShip.y, 2)
                );
                const distanceMoved = Math.abs(finalDistance - initialDistance).toFixed(1);
                
                // Only set message if it's not already set (e.g., from ramming)
                if (!outputMessage.includes('RAMMED')) {
                    if (actionType === COMBAT_ACTIONS.FLEE) {
                        outputMessage = `Fled ${distanceMoved} AU from ${targetShipType.name}`;
                        outputColor = COLORS.TEXT_NORMAL;
                    } else if (actionType === COMBAT_ACTIONS.PURSUE) {
                        outputMessage = `${activeShip.name} pursued ${targetShipType.name} ${distanceMoved} AU`;
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
        
        // Get target ship type for messages
        const targetShipType = SHIP_TYPES[action.targetShip.type] || { name: 'Unknown' };
        
        // Set initial message
        if (action.actionType === COMBAT_ACTIONS.PURSUE) {
            outputMessage = `Enemy pursuing ${action.targetShip.name}...`;
        } else if (action.actionType === COMBAT_ACTIONS.FLEE) {
            outputMessage = `Enemy fleeing from ${action.targetShip.name}...`;
        } else if (action.actionType === COMBAT_ACTIONS.FIRE_LASER) {
            outputMessage = `Enemy firing laser at ${action.targetShip.name}...`;
        }
        outputColor = COLORS.TEXT_ERROR;
        
        executeActionWithTicks(action, () => {
            // Mark enemy ship as acted
            action.ship.acted = true;
            
            // Set message based on action type
            if (action.actionType === COMBAT_ACTIONS.FIRE_LASER) {
                // Laser message
                if (action.hit) {
                    outputMessage = `Enemy hit ${action.targetShip.name} for ${action.damage} damage! (${Math.floor(action.distance)} AU)`;
                    outputColor = COLORS.TEXT_ERROR;
                } else {
                    outputMessage = `Enemy missed ${action.targetShip.name}! (${Math.floor(action.distance)} AU)`;
                    outputColor = COLORS.TEXT_DIM;
                }
            } else {
                // Calculate distance moved
                const finalDistance = Math.sqrt(
                    Math.pow(action.ship.x - action.targetShip.x, 2) + 
                    Math.pow(action.ship.y - action.targetShip.y, 2)
                );
                const distanceMoved = Math.abs(finalDistance - initialDistance).toFixed(1);
                
                // Set message for the completed action
                if (action.actionType === COMBAT_ACTIONS.PURSUE) {
                    outputMessage = `Enemy pursued ${action.targetShip.name} ${distanceMoved} AU`;
                } else if (action.actionType === COMBAT_ACTIONS.FLEE) {
                    outputMessage = `Enemy fled ${distanceMoved} AU from ${action.targetShip.name}`;
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
        const handler = new CombatActionHandler(action, currentGameState.asteroids);
        
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
                const damage = Math.floor(Math.random() * Math.max(1, distanceTravelled)) + 1;
                
                // Apply hull damage to rammed ship
                ramAction.ship.hull -= damage;
                
                // Check if ship is disabled
                if (ramAction.ship.hull <= 0) {
                    ramAction.ship.hull = 0;
                    ramAction.ship.disabled = true;
                }
                
                // Get ship names/types for message
                let rammerName = '';
                let rammedName = '';
                
                if (ramAction.rammer) {
                    // Determine if rammer is player or enemy
                    const rammerIsPlayer = currentGameState.ships.includes(ramAction.rammer);
                    if (rammerIsPlayer) {
                        rammerName = ramAction.rammer.name;
                        const rammedType = SHIP_TYPES[ramAction.ship.type] || { name: 'Unknown' };
                        rammedName = rammedType.name;
                    } else {
                        rammerName = 'Enemy';
                        rammedName = ramAction.ship.name;
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
