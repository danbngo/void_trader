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
                    symbol = 'X';
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
            
            UI.addButton(middleX, col2Y++, '6', 'Surrender', () => {
                handleSurrender(gameState);
            }, COLORS.TEXT_DIM, 'Give up and let enemies take cargo/credits');
            
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
        UI.clear();
        UI.clearOutputRow();
        
        let y = 5;
        UI.addTextCentered(y++, `=== Escape Successful ===`, COLORS.GREEN);
        y += 2;
        
        UI.addText(10, y++, `All your ships escaped!`, COLORS.GREEN);
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
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            UI.addText(10, y++, `  ${ship.name} (${shipType.name})`, COLORS.TEXT_ERROR);
        });
        y++;
        
        UI.addText(10, y++, `Escaped ships:`, COLORS.TEXT_DIM);
        escapedShips.forEach(ship => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            UI.addText(10, y++, `  ${ship.name} (${shipType.name})`, COLORS.GREEN);
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
                // Check if ship just turned instead of firing
                if (currentGameState.combatHandler && currentGameState.combatHandler.justTurned && !action.projectile) {
                    outputMessage = `${activeShip.name} starts turning to target ${targetShipType.name}`;
                    outputColor = COLORS.TEXT_NORMAL;
                } else if (action.hitObstruction) {
                    // Hit an obstruction
                    if (action.hitObstruction.type === 'ship') {
                        outputMessage = `${activeShip.name} hit ${action.hitObstruction.name} (obstruction) for ${action.hitObstruction.damage} damage!`;
                        outputColor = COLORS.YELLOW;
                    } else {
                        outputMessage = `${activeShip.name} hit an asteroid (obstruction)!`;
                        outputColor = COLORS.YELLOW;
                    }
                } else if (action.hit) {
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
        const enemyShipType = SHIP_TYPES[action.ship.type] || { name: 'Unknown' };
        
        // Set initial message
        if (action.actionType === COMBAT_ACTIONS.PURSUE) {
            outputMessage = `${enemyShipType.name} pursuing ${action.targetShip.name}...`;
        } else if (action.actionType === COMBAT_ACTIONS.FLEE) {
            outputMessage = `${enemyShipType.name} fleeing from ${action.targetShip.name}...`;
        } else if (action.actionType === COMBAT_ACTIONS.FIRE_LASER) {
            outputMessage = `${enemyShipType.name} firing laser at ${action.targetShip.name}...`;
        }
        outputColor = COLORS.TEXT_ERROR;
        
        executeActionWithTicks(action, () => {
            // Mark enemy ship as acted
            action.ship.acted = true;
            
            // Set message based on action type
            if (action.actionType === COMBAT_ACTIONS.FIRE_LASER) {
                // Get enemy ship type name
                const enemyShipType = SHIP_TYPES[action.ship.type] || { name: 'Unknown' };
                
                // Check if ship just turned instead of firing
                if (currentGameState.combatHandler && currentGameState.combatHandler.justTurned && !action.projectile) {
                    outputMessage = `${enemyShipType.name} starts turning to target ${action.targetShip.name}`;
                    outputColor = COLORS.TEXT_NORMAL;
                } else if (action.hitObstruction) {
                    // Hit an obstruction
                    if (action.hitObstruction.type === 'ship') {
                        outputMessage = `${enemyShipType.name} hit ${action.hitObstruction.name} (obstruction) for ${action.hitObstruction.damage} damage!`;
                        outputColor = COLORS.YELLOW;
                    } else {
                        outputMessage = `${enemyShipType.name} hit an asteroid (obstruction)!`;
                        outputColor = COLORS.YELLOW;
                    }
                } else if (action.hit) {
                    outputMessage = `${enemyShipType.name} hit ${action.targetShip.name} for ${action.damage} damage! (${Math.floor(action.distance)} AU)`;
                    outputColor = COLORS.TEXT_ERROR;
                } else {
                    outputMessage = `${enemyShipType.name} missed ${action.targetShip.name}! (${Math.floor(action.distance)} AU)`;
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
                const enemyShipType = SHIP_TYPES[action.ship.type] || { name: 'Unknown' };
                
                // Set message for the completed action
                if (action.actionType === COMBAT_ACTIONS.PURSUE) {
                    outputMessage = `${enemyShipType.name} pursued ${action.targetShip.name} ${distanceMoved} AU`;
                } else if (action.actionType === COMBAT_ACTIONS.FLEE) {
                    outputMessage = `${enemyShipType.name} fled ${distanceMoved} AU from ${action.targetShip.name}`;
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
        const handler = new CombatActionHandler(action, currentGameState.asteroids, allShips);
        
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
