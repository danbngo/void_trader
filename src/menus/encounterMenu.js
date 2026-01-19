/**
 * Encounter Menu
 * Handles space encounters with pirates, police, and merchants
 */

const EncounterMenu = (() => {
    let currentGameState = null;
    let encounterType = null;
    let selectedPlayerShip = 0;
    let selectedEnemyShip = -1; // -1 when not in targeting mode
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    let inTargetingMode = false;
    let targetingAction = null; // 'laser' or 'chase'
    let isPlayerTurn = true;
    let currentEnemyActing = -1; // Index of enemy currently acting
    let waitingForContinue = false;
    
    /**
     * Initialize combat distances for all ships
     */
    function initializeCombat(gameState) {
        const range = ENCOUNTER_MAX_SHIP_DISTANCE - ENCOUNTER_MIN_SHIP_DISTANCE;
        
        // Set random distances for player ships
        gameState.ships.forEach(ship => {
            ship.distance = Math.floor(Math.random() * (range + 1)) + ENCOUNTER_MIN_SHIP_DISTANCE;
            ship.fled = false;
            ship.disabled = false;
            ship.acted = false;
        });
        
        // Set random distances for enemy ships
        gameState.encounterShips.forEach(ship => {
            ship.distance = Math.floor(Math.random() * (range + 1)) + ENCOUNTER_MIN_SHIP_DISTANCE;
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
        selectedPlayerShip = 0;
        selectedEnemyShip = -1;
        outputMessage = '';
        inTargetingMode = false;
        isPlayerTurn = true;
        currentEnemyActing = -1;
        waitingForContinue = false;
        
        // Initialize combat if not already done
        if (!gameState.ships[0].hasOwnProperty('distance')) {
            initializeCombat(gameState);
        }
        
        // Auto-select first active player ship
        selectNextUnactedPlayerShip();
        
        render();
    }
    
    /**
     * Auto-select the next player ship that hasn't acted
     */
    function selectNextUnactedPlayerShip() {
        const ships = currentGameState.ships;
        let found = false;
        
        for (let i = 0; i < ships.length; i++) {
            if (!ships[i].acted && !ships[i].fled && !ships[i].disabled) {
                selectedPlayerShip = i;
                found = true;
                break;
            }
        }
        
        // If no unacted ships, check if we should end player turn
        if (!found) {
            endPlayerTurn();
        }
    }
    
    /**
     * Render the combat screen
     */
    function render() {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(2, `COMBAT: ${encounterType.name}`, COLORS.YELLOW);
        
        let y = 4;
        
        // Player ships table
        UI.addText(5, y++, '=== Your Ships ===', COLORS.TITLE);
        y++;
        
        const playerHeaders = ['', 'Ship', 'Type', 'Hull', 'Shield', 'Laser', 'Engine', 'Distance', 'Status'];
        const playerRows = currentGameState.ships.map((ship, index) => {
            const marker = (index === selectedPlayerShip && isPlayerTurn) ? '*' : '';
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            let status = ship.acted ? 'Acted' : 'Ready';
            let statusColor = ship.acted ? COLORS.TEXT_DIM : COLORS.GREEN;
            
            if (ship.disabled) {
                status = 'Disabled';
                statusColor = COLORS.TEXT_ERROR;
            } else if (ship.fled) {
                status = 'Fled';
                statusColor = COLORS.TEXT_DIM;
            }
            
            return [
                { text: marker, color: COLORS.YELLOW },
                { text: ship.name, color: statusColor },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.hull}/${ship.maxHull}`, color: COLORS.TEXT_NORMAL },
                { text: `${ship.shields}/${ship.maxShields}`, color: COLORS.TEXT_NORMAL },
                { text: `L${ship.lasers}`, color: COLORS.TEXT_NORMAL },
                { text: `E${ship.engine}`, color: COLORS.TEXT_NORMAL },
                { text: String(ship.distance), color: COLORS.CYAN },
                { text: status, color: statusColor }
            ];
        });
        
        y = TableRenderer.renderTable(5, y, playerHeaders, playerRows, isPlayerTurn ? selectedPlayerShip : -1);
        y += 2;
        
        // Enemy ships table
        UI.addText(5, y++, '=== Enemy Ships ===', COLORS.TITLE);
        y++;
        
        const enemyHeaders = ['', 'Type', 'Hull', 'Shield', 'Laser', 'Engine', 'Distance', 'Status'];
        const enemyRows = currentGameState.encounterShips.map((ship, index) => {
            const marker = (index === selectedEnemyShip) ? '*' : '';
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            let status = ship.acted ? 'Acted' : 'Ready';
            let statusColor = ship.acted ? COLORS.TEXT_DIM : COLORS.GREEN;
            
            if (ship.disabled) {
                status = 'Disabled';
                statusColor = COLORS.TEXT_ERROR;
            } else if (ship.fled) {
                status = 'Fled';
                statusColor = COLORS.TEXT_DIM;
            }
            
            return [
                { text: marker, color: COLORS.YELLOW },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.hull}/${ship.maxHull}`, color: COLORS.TEXT_NORMAL },
                { text: `${ship.shields}/${ship.maxShields}`, color: COLORS.TEXT_NORMAL },
                { text: String(ship.lasers), color: COLORS.TEXT_NORMAL },
                { text: String(ship.engine), color: COLORS.TEXT_NORMAL },
                { text: String(ship.distance), color: COLORS.CYAN },
                { text: status, color: statusColor }
            ];
        });
        
        y = TableRenderer.renderTable(5, y, enemyHeaders, enemyRows, selectedEnemyShip);
        y += 2;
        
        // Output message
        if (outputMessage) {
            UI.addText(5, y++, outputMessage, outputColor);
            y++;
        }
        
        // Buttons
        const buttonY = grid.height - 7;
        
        if (waitingForContinue) {
            // Waiting for player to continue after enemy action
            UI.addButton(5, buttonY, '1', 'Continue', () => {
                continueEnemyTurn();
            }, COLORS.GREEN);
        } else if (isPlayerTurn && !inTargetingMode) {
            // Player's turn - normal actions
            const currentShip = currentGameState.ships[selectedPlayerShip];
            const canAct = currentShip && !currentShip.fled && !currentShip.disabled && !currentShip.acted;
            
            if (canAct) {
                UI.addButton(5, buttonY, '1', 'Fire Laser', () => {
                    startTargeting('laser');
                }, COLORS.GREEN);
                
                UI.addButton(5, buttonY + 1, '2', 'Chase Enemy Ship', () => {
                    startTargeting('chase');
                }, COLORS.BUTTON);
                
                UI.addButton(5, buttonY + 2, '0', 'Flee', () => {
                    attemptFlee();
                }, COLORS.TEXT_ERROR);
            }
        } else if (isPlayerTurn && inTargetingMode) {
            // Player's turn - targeting mode
            UI.addButton(5, buttonY, '1', 'Previous Target', () => {
                prevEnemyShip();
            }, COLORS.BUTTON);
            
            UI.addButton(5, buttonY + 1, '2', 'Next Target', () => {
                nextEnemyShip();
            }, COLORS.BUTTON);
            
            const actionLabel = targetingAction === 'laser' ? 'Fire' : 'Chase';
            UI.addButton(25, buttonY, '3', actionLabel, () => {
                confirmAction();
            }, COLORS.GREEN);
            
            UI.addButton(5, buttonY + 2, '0', 'Cancel', () => {
                cancelTargeting();
            }, COLORS.BUTTON);
        }
        
        UI.draw();
    }
    
    /**
     * Navigate to next enemy ship
     */
    function nextEnemyShip() {
        const enemies = currentGameState.encounterShips;
        let attempts = 0;
        do {
            selectedEnemyShip = (selectedEnemyShip + 1) % enemies.length;
            attempts++;
        } while ((enemies[selectedEnemyShip].fled || enemies[selectedEnemyShip].disabled) && attempts < enemies.length);
        
        render();
    }
    
    /**
     * Navigate to previous enemy ship
     */
    function prevEnemyShip() {
        const enemies = currentGameState.encounterShips;
        let attempts = 0;
        do {
            selectedEnemyShip = (selectedEnemyShip - 1 + enemies.length) % enemies.length;
            attempts++;
        } while ((enemies[selectedEnemyShip].fled || enemies[selectedEnemyShip].disabled) && attempts < enemies.length);
        
        render();
    }
    
    /**
     * Start targeting mode
     */
    function startTargeting(action) {
        targetingAction = action;
        inTargetingMode = true;
        selectedEnemyShip = 0;
        
        // Find first valid enemy
        const enemies = currentGameState.encounterShips;
        for (let i = 0; i < enemies.length; i++) {
            if (!enemies[i].fled && !enemies[i].disabled) {
                selectedEnemyShip = i;
                break;
            }
        }
        
        outputMessage = '';
        render();
    }
    
    /**
     * Cancel targeting mode
     */
    function cancelTargeting() {
        inTargetingMode = false;
        selectedEnemyShip = -1;
        outputMessage = '';
        render();
    }
    
    /**
     * Confirm the targeting action
     */
    function confirmAction() {
        const attacker = currentGameState.ships[selectedPlayerShip];
        const target = currentGameState.encounterShips[selectedEnemyShip];
        
        if (target.fled || target.disabled) {
            outputMessage = 'Invalid target!';
            outputColor = COLORS.TEXT_ERROR;
            render();
            return;
        }
        
        if (targetingAction === 'laser') {
            fireLaser(attacker, target);
        } else if (targetingAction === 'chase') {
            chaseEnemy(attacker, target);
        }
        
        // Mark ship as acted
        attacker.acted = true;
        
        inTargetingMode = false;
        selectedEnemyShip = -1;
        
        // Check battle end
        if (checkBattleEnd()) {
            return;
        }
        
        // Select next unacted player ship
        selectNextUnactedPlayerShip();
        
        render();
    }
    
    /**
     * Fire laser at target
     */
    function fireLaser(attacker, target) {
        const damage = Math.floor(Math.random() * attacker.lasers) + 1;
        
        // Determine if attacker is player or enemy
        const isPlayerAttacking = currentGameState.ships.includes(attacker);
        const attackerName = isPlayerAttacking ? attacker.name : `Enemy ${(SHIP_TYPES[attacker.type] || { name: 'Unknown' }).name.toLowerCase()}`;
        const targetName = isPlayerAttacking ? '' : target.name;
        
        // Apply to shields first
        if (target.shields > 0) {
            const shieldDamage = Math.min(damage, target.shields);
            target.shields -= shieldDamage;
            const carryover = damage - shieldDamage;
            
            if (carryover > 0) {
                target.hull -= carryover;
                if (isPlayerAttacking) {
                    outputMessage = `${attackerName} hit enemy for ${shieldDamage} shield + ${carryover} hull damage!`;
                } else {
                    outputMessage = `${attackerName} hit ${targetName} for ${shieldDamage} shield + ${carryover} hull damage!`;
                }
            } else {
                if (isPlayerAttacking) {
                    outputMessage = `${attackerName} hit enemy for ${shieldDamage} shield damage!`;
                } else {
                    outputMessage = `${attackerName} hit ${targetName} for ${shieldDamage} shield damage!`;
                }
            }
        } else {
            target.hull -= damage;
            if (isPlayerAttacking) {
                outputMessage = `${attackerName} hit enemy for ${damage} hull damage!`;
            } else {
                outputMessage = `${attackerName} hit ${targetName} for ${damage} hull damage!`;
            }
        }
        
        outputColor = COLORS.GREEN;
        
        // Check if disabled
        if (target.hull <= 0) {
            target.hull = 0;
            target.disabled = true;
            if (isPlayerAttacking) {
                outputMessage += ` Enemy disabled!`;
            } else {
                outputMessage += ` ${targetName} disabled!`;
            }
        }
    }
    
    /**
     * Chase enemy ship
     */
    function chaseEnemy(attacker, target) {
        const attackerClosing = Math.floor(Math.random() * attacker.engine) + 1;
        const targetClosing = Math.floor(Math.random() * attacker.engine) + 1;
        
        const newAttackerDist = attacker.distance - attackerClosing;
        const newTargetDist = target.distance - targetClosing;
        
        // Determine if attacker is player or enemy
        const isPlayerAttacking = currentGameState.ships.includes(attacker);
        const attackerName = isPlayerAttacking ? attacker.name : `Enemy ${(SHIP_TYPES[attacker.type] || { name: 'Unknown' }).name.toLowerCase()}`;
        
        // Check for ram
        if (newAttackerDist < 1 && newTargetDist < 1) {
            attacker.distance = 1;
            target.distance = 1;
            ramShip(attacker, target);
        } else {
            attacker.distance = Math.max(1, newAttackerDist);
            target.distance = Math.max(1, newTargetDist);
            if (isPlayerAttacking) {
                outputMessage = `${attackerName} closing distance! Your dist: ${attacker.distance}, Enemy dist: ${target.distance}`;
            } else {
                outputMessage = `${attackerName} closing distance! Enemy dist: ${attacker.distance}`;
            }
            outputColor = COLORS.CYAN;
        }
    }
    
    /**
     * Ram a ship
     */
    function ramShip(attacker, target) {
        const damage = Math.floor(Math.random() * attacker.engine) + 1;
        const selfDamage = Math.ceil(damage / 2);
        
        target.hull -= damage;
        attacker.hull -= selfDamage;
        
        // Determine if attacker is player or enemy
        const isPlayerAttacking = currentGameState.ships.includes(attacker);
        const attackerName = isPlayerAttacking ? attacker.name : `Enemy ${(SHIP_TYPES[attacker.type] || { name: 'Unknown' }).name.toLowerCase()}`;
        const targetName = isPlayerAttacking ? 'enemy' : target.name;
        
        outputMessage = `${attackerName} RAMMED ${targetName}! Dealt ${damage} damage, took ${selfDamage} damage!`;
        outputColor = COLORS.YELLOW;
        
        // Check disabled
        if (target.hull <= 0) {
            target.hull = 0;
            target.disabled = true;
            outputMessage += ` ${targetName.charAt(0).toUpperCase() + targetName.slice(1)} disabled!`;
        }
        
        if (attacker.hull <= 0) {
            attacker.hull = 0;
            attacker.disabled = true;
            outputMessage += ` ${attacker.name} disabled!`;
        }
    }
    
    /**
     * Attempt to flee combat
     */
    function attemptFlee() {
        const ship = currentGameState.ships[selectedPlayerShip];
        
        if (ship.fled || ship.disabled || ship.acted) {
            outputMessage = 'This ship cannot flee!';
            outputColor = COLORS.TEXT_ERROR;
            render();
            return;
        }
        
        // Increase distance
        const distanceGain = Math.floor(Math.random() * ship.engine) + 1;
        ship.distance += distanceGain;
        
        // Chance to flee based on distance
        const fleeChance = Math.min(ship.distance, 100);
        const roll = Math.random() * 100;
        
        if (roll < fleeChance) {
            ship.fled = true;
            outputMessage = `${ship.name} fled successfully! (${fleeChance}% chance)`;
            outputColor = COLORS.CYAN;
        } else {
            outputMessage = `${ship.name} failed to flee! Distance: ${ship.distance} (${fleeChance}% chance)`;
            outputColor = COLORS.TEXT_ERROR;
        }
        
        // Mark as acted
        ship.acted = true;
        
        // Check battle end
        if (checkBattleEnd()) {
            return;
        }
        
        // Select next unacted player ship
        selectNextUnactedPlayerShip();
        
        render();
    }
    
    /**
     * End player turn and start enemy turn
     */
    function endPlayerTurn() {
        // Reset all player ships' acted flag
        currentGameState.ships.forEach(ship => ship.acted = false);
        
        // Reset all enemy ships' acted flag
        currentGameState.encounterShips.forEach(ship => ship.acted = false);
        
        isPlayerTurn = false;
        currentEnemyActing = -1;
        outputMessage = 'Enemy turn...';
        outputColor = COLORS.YELLOW;
        
        // Start enemy turn
        continueEnemyTurn();
    }
    
    /**
     * Continue enemy turn (one ship at a time)
     */
    function continueEnemyTurn() {
        waitingForContinue = false;
        
        // Find next enemy that hasn't acted
        const enemies = currentGameState.encounterShips;
        let foundNext = false;
        
        for (let i = currentEnemyActing + 1; i < enemies.length; i++) {
            if (!enemies[i].fled && !enemies[i].disabled && !enemies[i].acted) {
                currentEnemyActing = i;
                foundNext = true;
                break;
            }
        }
        
        if (!foundNext) {
            // All enemies acted, return to player turn
            isPlayerTurn = true;
            currentEnemyActing = -1;
            outputMessage = 'Your turn!';
            outputColor = COLORS.GREEN;
            selectNextUnactedPlayerShip();
            render();
            return;
        }
        
        // Execute this enemy's action
        const enemy = enemies[currentEnemyActing];
        const playerShips = currentGameState.ships.filter(s => !s.fled && !s.disabled);
        
        if (playerShips.length === 0) {
            checkBattleEnd();
            return;
        }
        
        // Pick random player target
        const target = playerShips[Math.floor(Math.random() * playerShips.length)];
        
        // 50% chance to laser, 50% chance to chase
        if (Math.random() < 0.5) {
            fireLaser(enemy, target);
        } else {
            chaseEnemy(enemy, target);
        }
        
        enemy.acted = true;
        
        // Check battle end
        if (checkBattleEnd()) {
            return;
        }
        
        // Wait for player to continue
        waitingForContinue = true;
        render();
    }
    
    /**
     * Check if battle has ended
     * @returns {boolean} - True if battle ended
     */
    function checkBattleEnd() {
        const activePlayer = currentGameState.ships.filter(s => !s.fled && !s.disabled);
        const activeEnemy = currentGameState.encounterShips.filter(s => !s.fled && !s.disabled);
        
        if (activePlayer.length === 0) {
            // Player lost
            endBattle(false);
            return true;
        } else if (activeEnemy.length === 0) {
            // Player won
            endBattle(true);
            return true;
        }
        
        return false;
    }
    
    /**
     * End the battle
     */
    function endBattle(playerWon) {
        // Clean up combat properties
        currentGameState.ships.forEach(ship => {
            delete ship.distance;
            delete ship.fled;
            delete ship.disabled;
            delete ship.acted;
        });
        
        currentGameState.encounterShips.forEach(ship => {
            delete ship.distance;
            delete ship.fled;
            delete ship.disabled;
            delete ship.acted;
        });
        
        currentGameState.encounter = false;
        currentGameState.encounterShips = [];
        
        // Show result message
        UI.clear();
        UI.resetSelection();
        
        if (playerWon) {
            UI.addTextCentered(10, 'VICTORY!', COLORS.GREEN);
            UI.addTextCentered(12, 'You have defeated the enemy!', COLORS.TEXT_NORMAL);
        } else {
            UI.addTextCentered(10, 'DEFEAT!', COLORS.TEXT_ERROR);
            UI.addTextCentered(12, 'Your fleet was destroyed!', COLORS.TEXT_NORMAL);
        }
        
        UI.addButton(40, 16, '0', 'Continue', () => {
            GalaxyMap.show(currentGameState);
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
