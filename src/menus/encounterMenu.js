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
        
        // Assign random positions to player ships
        gameState.ships.forEach(ship => {
            ship.x = Math.floor(Math.random() * (ENCOUNTER_MAX_X - ENCOUNTER_MIN_X + 1)) + ENCOUNTER_MIN_X;
            ship.y = Math.floor(Math.random() * (ENCOUNTER_MAX_Y - ENCOUNTER_MIN_Y + 1)) + ENCOUNTER_MIN_Y;
            
            // Ensure ship is at least MIN distance from center
            const distFromCenter = Math.sqrt(ship.x * ship.x + ship.y * ship.y);
            if (distFromCenter < ENCOUNTER_MIN_SHIP_DISTANCE) {
                const angle = Math.random() * Math.PI * 2;
                ship.x = Math.cos(angle) * ENCOUNTER_MIN_SHIP_DISTANCE;
                ship.y = Math.sin(angle) * ENCOUNTER_MIN_SHIP_DISTANCE;
            }
            
            // Point ship at center of map
            ship.angle = calculateAngle(ship.x, ship.y, mapCenterX, mapCenterY);
            
            // Combat state
            ship.fled = false;
            ship.disabled = false;
            ship.acted = false;
        });
        
        // Assign random positions to enemy ships
        gameState.encounterShips.forEach(ship => {
            ship.x = Math.floor(Math.random() * (ENCOUNTER_MAX_X - ENCOUNTER_MIN_X + 1)) + ENCOUNTER_MIN_X;
            ship.y = Math.floor(Math.random() * (ENCOUNTER_MAX_Y - ENCOUNTER_MIN_Y + 1)) + ENCOUNTER_MIN_Y;
            
            // Ensure ship is at least MIN distance from center
            const distFromCenter = Math.sqrt(ship.x * ship.x + ship.y * ship.y);
            if (distFromCenter < ENCOUNTER_MIN_SHIP_DISTANCE) {
                const angle = Math.random() * Math.PI * 2;
                ship.x = Math.cos(angle) * ENCOUNTER_MIN_SHIP_DISTANCE;
                ship.y = Math.sin(angle) * ENCOUNTER_MIN_SHIP_DISTANCE;
            }
            
            // Point ship at center of map
            ship.angle = calculateAngle(ship.x, ship.y, mapCenterX, mapCenterY);
            
            // Combat state
            ship.fled = false;
            ship.disabled = false;
            ship.acted = false;
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
        
        // Initialize combat if not already done
        if (!gameState.ships[0].hasOwnProperty('x')) {
            initializeCombat(gameState);
        }
        
        // Find first valid target
        findNextValidTarget();
        
        render();
    }
    
    /**
     * Find next valid target (not fled or disabled)
     */
    function findNextValidTarget() {
        const enemies = currentGameState.encounterShips;
        for (let i = 0; i < enemies.length; i++) {
            const idx = (targetIndex + i) % enemies.length;
            if (!enemies[idx].fled && !enemies[idx].disabled) {
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
        
        // Draw map on left side (50% of width)
        const mapWidth = Math.floor(grid.width * 0.5);
        const mapHeight = Math.floor(grid.height * 0.5);
        
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
        
        // Calculate scale to fit encounter area in map
        const encounterWidth = ENCOUNTER_MAX_X - ENCOUNTER_MIN_X;
        const encounterHeight = ENCOUNTER_MAX_Y - ENCOUNTER_MIN_Y;
        const scale = Math.min((mapWidth - 4) / encounterWidth, (mapHeight - 4) / encounterHeight);
        
        // Draw center marker
        UI.addText(mapCenterX, mapCenterY, '+', COLORS.TEXT_DIM);
        
        // Get active player ship (first non-fled, non-disabled)
        const activeShip = gameState.ships.find(s => !s.fled && !s.disabled);
        const targetShip = gameState.encounterShips[targetIndex];
        
        let activeShipScreenX = null;
        let activeShipScreenY = null;
        let targetShipScreenX = null;
        let targetShipScreenY = null;
        
        // Draw player ships
        gameState.ships.forEach((ship, index) => {
            if (ship.fled) return;
            
            const screenX = Math.floor(mapCenterX + ship.x * scale);
            const screenY = Math.floor(mapCenterY - ship.y * scale); // Negate Y because screen Y increases downward
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                const symbol = getShipSymbol(ship.angle);
                let color = COLORS.GREEN;
                
                if (ship.disabled) {
                    color = COLORS.GRAY;
                } else if (ship.acted) {
                    color = COLORS.TEXT_DIM; // Dimmed if already moved
                } else if (ship === activeShip) {
                    color = COLORS.CYAN; // Bright if active and hasn't moved
                    activeShipScreenX = screenX;
                    activeShipScreenY = screenY;
                }
                
                UI.addText(screenX, screenY, symbol, color, 0.7);
            }
        });
        
        // Draw enemy ships
        gameState.encounterShips.forEach((ship, index) => {
            if (ship.fled) return;
            
            const screenX = Math.floor(mapCenterX + ship.x * scale);
            const screenY = Math.floor(mapCenterY - ship.y * scale); // Negate Y because screen Y increases downward
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                const symbol = getShipSymbol(ship.angle);
                let color = COLORS.TEXT_ERROR;
                
                if (ship.disabled) {
                    color = COLORS.GRAY;
                } else if (index === targetIndex) {
                    color = COLORS.YELLOW;
                    targetShipScreenX = screenX;
                    targetShipScreenY = screenY;
                }
                
                UI.addText(screenX, screenY, symbol, color, 0.7);
            }
        });
        
        // Draw line between active ship and target
        if (activeShipScreenX !== null && targetShipScreenX !== null) {
            const linePoints = LineDrawer.drawLine(
                activeShipScreenX, activeShipScreenY,
                targetShipScreenX, targetShipScreenY,
                false,
                COLORS.CYAN
            );
            
            // Draw each line point
            linePoints.forEach(point => {
                if (point.x > 0 && point.x < mapWidth - 1 && 
                    point.y > 0 && point.y < mapHeight - 1) {
                    UI.addText(point.x, point.y, point.symbol, point.color);
                }
            });
        }
        
        // Legend positioned right after map border
        UI.addText(2, mapHeight, '\u25B2 = Player  \u25BC = Enemy  \u25A0 = Disabled', COLORS.GRAY);
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
            if (!ship.fled && !ship.disabled && !ship.acted) {
                activeShip = ship;
                break;
            }
        }
        
        // If no active ship found, show first non-fled ship
        if (!activeShip) {
            activeShip = gameState.ships.find(s => !s.fled && !s.disabled);
        }
        
        UI.addText(startX, 0, '=== Your Ship ===', COLORS.CYAN);
        
        if (activeShip) {
            const shipType = SHIP_TYPES[activeShip.type] || { name: 'Unknown' };
            const statusText = activeShip.acted ? ' (Moved)' : ' (Active)';
            const statusColor = activeShip.acted ? COLORS.TEXT_DIM : COLORS.GREEN;
            
            let y = 2;
            UI.addText(startX, y, 'Name:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, y, activeShip.name, COLORS.TEXT_NORMAL);
            UI.addText(startX + 6 + activeShip.name.length, y, statusText, statusColor);
            y++;
            UI.addText(startX, y++, 'Type:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, y - 1, shipType.name, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Hull:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, y - 1, `${activeShip.hull}/${activeShip.maxHull}`, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Shield:', COLORS.TEXT_DIM);
            UI.addText(startX + 8, y - 1, `${activeShip.shields}/${activeShip.maxShields}`, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Laser:', COLORS.TEXT_DIM);
            UI.addText(startX + 7, y - 1, `L${activeShip.lasers}`, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Engine:', COLORS.TEXT_DIM);
            UI.addText(startX + 8, y - 1, `E${activeShip.engine}`, COLORS.TEXT_NORMAL);
        } else {
            UI.addText(startX, 2, 'No active ships', COLORS.TEXT_ERROR);
        }
        
        // Target Ship section
        const targetShip = gameState.encounterShips[targetIndex];
        
        UI.addText(startX, 9, `=== ${encounterType.name} Ship ===`, COLORS.YELLOW);
        
        if (targetShip && !targetShip.fled && !targetShip.disabled) {
            const shipType = SHIP_TYPES[targetShip.type] || { name: 'Unknown' };
            const distance = activeShip ? Math.sqrt(
                Math.pow(activeShip.x - targetShip.x, 2) + 
                Math.pow(activeShip.y - targetShip.y, 2)
            ).toFixed(1) : '?';
            
            let y = 11;
            UI.addText(startX, y++, 'Type:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, y - 1, shipType.name, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Hull:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, y - 1, `${targetShip.hull}/${targetShip.maxHull}`, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Shield:', COLORS.TEXT_DIM);
            UI.addText(startX + 8, y - 1, `${targetShip.shields}/${targetShip.maxShields}`, COLORS.TEXT_NORMAL);
            UI.addText(startX, y++, 'Distance:', COLORS.TEXT_DIM);
            UI.addText(startX + 10, y - 1, `${distance}`, COLORS.TEXT_NORMAL);
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
        
        // Output area (2 lines above buttons)
        if (outputMessage) {
            UI.addText(5, buttonY - 2, outputMessage, outputColor);
        }
        
        // Buttons in columns
        UI.addButton(5, buttonY, '1', 'Previous Target', () => {
            prevTarget();
        }, COLORS.BUTTON, 'Select previous enemy ship as target');
        
        UI.addButton(5, buttonY + 1, '2', 'Next Target', () => {
            nextTarget();
        }, COLORS.BUTTON, 'Select next enemy ship as target');
        
        UI.addButton(5, buttonY + 2, '3', 'Pursue', () => {
            executePlayerAction(COMBAT_ACTIONS.PURSUE);
        }, COLORS.GREEN, 'Move toward the enemy ship');
        
        UI.addButton(5, buttonY + 3, '4', 'Flee', () => {
            executePlayerAction(COMBAT_ACTIONS.FLEE);
        }, COLORS.BUTTON, 'Move away from the enemy ship');
        
        UI.addButton(5, buttonY + 4, '0', 'End Combat', () => {
            endCombat();
        }, COLORS.GRAY, 'End combat and return to galaxy map');
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
        } while ((enemies[targetIndex].fled || enemies[targetIndex].disabled) && attempts < enemies.length);
        
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
        } while ((enemies[targetIndex].fled || enemies[targetIndex].disabled) && attempts < enemies.length);
        
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
        });
        
        currentGameState.encounterShips.forEach(ship => {
            delete ship.x;
            delete ship.y;
            delete ship.angle;
            delete ship.fled;
            delete ship.disabled;
            delete ship.acted;
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
        
        // Create action
        const action = new CombatAction(activeShip, actionType, targetShip);
        
        // Execute action with visual updates
        executeActionWithTicks(action, () => {
            // Mark ship as acted
            activeShip.acted = true;
            
            // Move to next player ship or start enemy turn
            if (!advanceToNextPlayerShip()) {
                executeEnemyTurn();
            }
        });
    }
    
    /**
     * Get the current active player ship
     */
    function getActivePlayerShip() {
        for (let i = 0; i < currentGameState.ships.length; i++) {
            const ship = currentGameState.ships[i];
            if (!ship.fled && !ship.disabled && !ship.acted) {
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
        
        executeActionWithTicks(actions[index], () => {
            executeEnemyActionsSequentially(actions, index + 1, onComplete);
        });
    }
    
    /**
     * Execute an action with visual tick updates
     */
    function executeActionWithTicks(action, onComplete) {
        const handler = new CombatActionHandler(action);
        
        const tickInterval = setInterval(() => {
            const complete = handler.tick();
            
            // Check if ramming occurred
            if (handler.ramAction) {
                // Execute ram action after current action completes
                clearInterval(tickInterval);
                executeActionWithTicks(handler.ramAction, onComplete);
                return;
            }
            
            // Update display
            render();
            
            if (complete) {
                clearInterval(tickInterval);
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
