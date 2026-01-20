/**
 * UndetectedEncounter - Handles radar-based detection system
 * Player can avoid encounters if their radar roll beats enemy radar roll
 */

const UndetectedEncounter = {
    /**
     * Check if player fleet can detect encounter before engagement
     * @param {GameState} gameState - Current game state
     * @param {Object} encType - Encounter type
     */
    check: function(gameState, encType) {
        // Calculate total radar strength for each side with random factor
        const playerRadarTotal = gameState.ships.reduce((sum, ship) => sum + ship.radar, 0);
        const enemyRadarTotal = gameState.encounterShips.reduce((sum, ship) => sum + ship.radar, 0);
        
        // Roll for detection (random factor makes radar investment valuable)
        const playerRadarRoll = playerRadarTotal * Math.random();
        const enemyRadarRoll = enemyRadarTotal * Math.random();
        
        if (playerRadarRoll > enemyRadarRoll) {
            // Player detects enemy first - show undetected screen
            this.showUndetectedScreen(gameState, encType);
        } else {
            // Enemy detects player first or simultaneous - normal encounter flow
            encType.onGreet(gameState, encType);
        }
    },
    
    /**
     * Show undetected encounter screen with options to approach or avoid
     */
    showUndetectedScreen: function(gameState, encType) {
        UI.clear();
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== Undetected Contact ===`, COLORS.GREEN);
        y += 2;
        
        UI.addText(10, y++, `Your sensors detect ${encType.name.toLowerCase()} ships ahead!`, COLORS.GREEN);
        UI.addText(10, y++, `They haven't noticed your fleet yet.`, COLORS.TEXT_DIM);
        y += 2;
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, true);
        y++;
        
        // Show detected encounter ships
        y = ShipTableRenderer.addNPCFleet(10, y, `Detected ${encType.name}:`, gameState.encounterShips);
        
        const buttonY = grid.height - 4;
        UI.addButton(10, buttonY, '1', 'Approach', () => {
            // Proceed with normal encounter
            encType.onGreet(gameState, encType);
        }, COLORS.YELLOW, 'Engage with the encounter normally');
        
        UI.addButton(10, buttonY + 1, '2', 'Avoid', () => {
            // Player successfully avoids encounter
            UI.clear();
            let y = 5;
            UI.addTextCentered(y++, `=== Encounter Avoided ===`, COLORS.GREEN);
            y += 2;
            UI.addText(10, y++, `You carefully navigate around the ${encType.name.toLowerCase()} ships.`, COLORS.GREEN);
            UI.addText(10, y++, `They never detected your presence.`, COLORS.TEXT_DIM);
            
            const continueY = grid.height - 4;
            UI.addButton(10, continueY, '1', 'Continue Journey', () => {
                TravelMenu.resume(gameState);
            }, COLORS.GREEN);
            
            UI.draw();
        }, COLORS.GREEN, 'Avoid the encounter and continue your journey');
        
        UI.draw();
    }
};
