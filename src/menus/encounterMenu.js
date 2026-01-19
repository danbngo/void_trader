/**
 * Encounter Menu
 * Handles space encounters with pirates, police, and merchants
 */

const EncounterMenu = (() => {
    let currentGameState = null;
    let encounterType = null;
    let selectedPlayerShip = 0;
    let selectedEnemyShip = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    let inTargetingMode = false;
    let targetingAction = null; // 'laser' or 'chase'
    
    /**
     * Initialize combat distances for all ships
     */
    function initializeCombat(gameState) {
        // Set random distances for player ships (10-30)
        gameState.ships.forEach(ship => {
            ship.distance = Math.floor(Math.random() * 21) + 10;
            ship.fled = false;
            ship.disabled = false;
        });
        
        // Set random distances for enemy ships (10-30)
        gameState.encounterShips.forEach(ship => {
            ship.distance = Math.floor(Math.random() * 21) + 10;
            ship.fled = false;
            ship.disabled = false;
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
        selectedEnemyShip = 0;
        outputMessage = '';
        inTargetingMode = false;
        
        // Initialize combat if not already done
        if (!gameState.ships[0].hasOwnProperty('distance')) {
            initializeCombat(gameState);
        }
        
        render();
    }
    
    /**
     * Render the combat screen
     */
    function render() {
        UI.clear();
        UI.resetSelection();
        
        if (inTargetingMode) {
            renderTargetingMode();
        } else {
            renderCombatMode();
        }
        
        UI.draw();
    }
    
    /**
     * Render main combat mode
     */
    function renderCombatMode() {
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(2, `COMBAT: ${encounterType.name}`, COLORS.YELLOW);
        
        let y = 5;
        
        // Player ships table
        UI.addText(5, y++, '=== Your Ships ===', COLORS.TITLE);
        y++;
        
        const activePlayerShips = currentGameState.ships.filter(s => !s.fled && !s.disabled);
        
        if (activePlayerShips.length === 0) {
            UI.addText(5, y++, 'All ships destroyed or fled!', COLORS.TEXT_ERROR);
            checkBattleEnd();
        } else {
            const headers = ['', 'Ship', 'Type', 'Hull', 'Shield', 'Laser', 'Engine', 'Distance', 'Status'];
            const rows = currentGameState.ships.map((ship, index) => {
                const marker = (index === selectedPlayerShip) ? '*' : '';
                const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
                let status = 'Active';
                let statusColor = COLORS.GREEN;
                
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
            
            TableRenderer.renderTable(5, y, headers, rows, selectedPlayerShip);
            y += rows.length + 3;
        }
        
        // Output message
        if (outputMessage) {
            UI.addText(5, y++, outputMessage, outputColor);
            y++;
        }
        
        // Buttons
        const buttonY = grid.height - 7;
        const currentShip = currentGameState.ships[selectedPlayerShip];
        const canAct = currentShip && !currentShip.fled && !currentShip.disabled;
        
        if (canAct) {
            UI.addButton(5, buttonY, '1', 'Next Ship', () => {
                nextPlayerShip();
            }, COLORS.BUTTON);
            
            UI.addButton(5, buttonY + 1, '2', 'Previous Ship', () => {
                prevPlayerShip();
            }, COLORS.BUTTON);
            
            UI.addButton(25, buttonY, '3', 'Fire Laser', () => {
                startTargeting('laser');
            }, COLORS.GREEN);
            
            UI.addButton(25, buttonY + 1, '4', 'Chase Enemy Ship', () => {
                startTargeting('chase');
            }, COLORS.BUTTON);
        }
        
        UI.addButton(5, buttonY + 3, '0', 'Flee', () => {
            attemptFlee();
        }, COLORS.TEXT_ERROR);
    }
    
    /**
     * Render targeting mode
     */
    function renderTargetingMode() {
        const grid = UI.getGridSize();
        
        const actionText = targetingAction === 'laser' ? 'FIRE LASER' : 'CHASE';
        UI.addTextCentered(2, `TARGETING: ${actionText}`, COLORS.YELLOW);
        
        let y = 5;
        
        // Enemy ships table
        UI.addText(5, y++, '=== Enemy Ships ===', COLORS.TITLE);
        y++;
        
        const activeEnemies = currentGameState.encounterShips.filter(s => !s.fled && !s.disabled);
        
        if (activeEnemies.length === 0) {
            UI.addText(5, y++, 'No active enemies!', COLORS.TEXT_DIM);
        } else {
            const headers = ['', 'Ship', 'Type', 'Hull', 'Shield', 'Laser', 'Engine', 'Distance', 'Status'];
            const rows = currentGameState.encounterShips.map((ship, index) => {
                const marker = (index === selectedEnemyShip) ? '*' : '';
                const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
                let status = 'Active';
                let statusColor = COLORS.GREEN;
                
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
            
            TableRenderer.renderTable(5, y, headers, rows, selectedEnemyShip);
            y += rows.length + 3;
        }
        
        // Output message
        if (outputMessage) {
            UI.addText(5, y++, outputMessage, outputColor);
            y++;
        }
        
        // Buttons
        const buttonY = grid.height - 6;
        
        UI.addButton(5, buttonY, '1', 'Next Target', () => {
            nextEnemyShip();
        }, COLORS.BUTTON);
        
        UI.addButton(5, buttonY + 1, '2', 'Previous Target', () => {
            prevEnemyShip();
        }, COLORS.BUTTON);
        
        const actionLabel = targetingAction === 'laser' ? 'Fire' : 'Chase';
        UI.addButton(25, buttonY, '3', actionLabel, () => {
            confirmAction();
        }, COLORS.GREEN);
        
        UI.addButton(5, buttonY + 2, '0', 'Cancel', () => {
            inTargetingMode = false;
            outputMessage = '';
            render();
        }, COLORS.BUTTON);
    }
    
    /**
     * Navigate to next player ship
     */
    function nextPlayerShip() {
        const ships = currentGameState.ships;
        let attempts = 0;
        do {
            selectedPlayerShip = (selectedPlayerShip + 1) % ships.length;
            attempts++;
        } while ((ships[selectedPlayerShip].fled || ships[selectedPlayerShip].disabled) && attempts < ships.length);
        
        outputMessage = '';
        render();
    }
    
    /**
     * Navigate to previous player ship
     */
    function prevPlayerShip() {
        const ships = currentGameState.ships;
        let attempts = 0;
        do {
            selectedPlayerShip = (selectedPlayerShip - 1 + ships.length) % ships.length;
            attempts++;
        } while ((ships[selectedPlayerShip].fled || ships[selectedPlayerShip].disabled) && attempts < ships.length);
        
        outputMessage = '';
        render();
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
        
        outputMessage = '';
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
        
        outputMessage = '';
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
        
        inTargetingMode = false;
        
        // Enemy turn
        enemyTurn();
        
        // Check battle end
        checkBattleEnd();
        
        render();
    }
    
    /**
     * Fire laser at target
     */
    function fireLaser(attacker, target) {
        const damage = Math.floor(Math.random() * attacker.lasers) + 1;
        
        // Apply to shields first
        if (target.shields > 0) {
            const shieldDamage = Math.min(damage, target.shields);
            target.shields -= shieldDamage;
            const carryover = damage - shieldDamage;
            
            if (carryover > 0) {
                target.hull -= carryover;
                outputMessage = `${attacker.name} hit ${target.name} for ${shieldDamage} shield + ${carryover} hull damage!`;
            } else {
                outputMessage = `${attacker.name} hit ${target.name} for ${shieldDamage} shield damage!`;
            }
        } else {
            target.hull -= damage;
            outputMessage = `${attacker.name} hit ${target.name} for ${damage} hull damage!`;
        }
        
        outputColor = COLORS.GREEN;
        
        // Check if disabled
        if (target.hull <= 0) {
            target.hull = 0;
            target.disabled = true;
            outputMessage += ` ${target.name} disabled!`;
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
        
        // Check for ram
        if (newAttackerDist < 1 && newTargetDist < 1) {
            attacker.distance = 1;
            target.distance = 1;
            ramShip(attacker, target);
        } else {
            attacker.distance = Math.max(1, newAttackerDist);
            target.distance = Math.max(1, newTargetDist);
            outputMessage = `${attacker.name} closing distance! Your dist: ${attacker.distance}, Enemy dist: ${target.distance}`;
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
        
        outputMessage = `${attacker.name} RAMMED ${target.name}! Dealt ${damage} damage, took ${selfDamage} damage!`;
        outputColor = COLORS.YELLOW;
        
        // Check disabled
        if (target.hull <= 0) {
            target.hull = 0;
            target.disabled = true;
            outputMessage += ` ${target.name} disabled!`;
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
        
        if (ship.fled || ship.disabled) {
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
        
        // Enemy turn
        enemyTurn();
        
        // Check battle end
        checkBattleEnd();
        
        render();
    }
    
    /**
     * Enemy turn - simple AI
     */
    function enemyTurn() {
        const enemies = currentGameState.encounterShips.filter(s => !s.fled && !s.disabled);
        const playerShips = currentGameState.ships.filter(s => !s.fled && !s.disabled);
        
        if (enemies.length === 0 || playerShips.length === 0) return;
        
        enemies.forEach(enemy => {
            // Pick random player target
            const target = playerShips[Math.floor(Math.random() * playerShips.length)];
            
            // 50% chance to laser, 50% chance to chase
            if (Math.random() < 0.5) {
                fireLaser(enemy, target);
            } else {
                chaseEnemy(enemy, target);
            }
        });
    }
    
    /**
     * Check if battle has ended
     */
    function checkBattleEnd() {
        const activePlayer = currentGameState.ships.filter(s => !s.fled && !s.disabled);
        const activeEnemy = currentGameState.encounterShips.filter(s => !s.fled && !s.disabled);
        
        if (activePlayer.length === 0) {
            // Player lost
            endBattle(false);
        } else if (activeEnemy.length === 0) {
            // Player won
            endBattle(true);
        }
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
        });
        
        currentGameState.encounterShips.forEach(ship => {
            delete ship.distance;
            delete ship.fled;
            delete ship.disabled;
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
