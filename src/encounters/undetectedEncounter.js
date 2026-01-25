/**
 * UndetectedEncounter - Handles radar-based detection system
 * Player can avoid encounters if their radar roll beats enemy radar roll
 */

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

const UndetectedEncounter = {
    /**
     * Check if player fleet can detect encounter before engagement
     * @param {GameState} gameState - Current game state
     * @param {Object} encType - Encounter type
     */
    check: function(gameState, encType) {
        // Calculate total radar strength for each side with random factor
        let playerRadarTotal = gameState.ships.reduce((sum, ship) => sum + ship.radar, 0);
        const enemyRadarTotal = gameState.encounterShips.reduce((sum, ship) => sum + ship.radar, 0);
        
        // Apply smuggling skill to improve stealth (use max from all crew)
        const smugglingLevel = getMaxCrewSkill(gameState, 'smuggling');
        if (smugglingLevel > 0) {
            playerRadarTotal = SkillEffects.getStealthRadar(playerRadarTotal, smugglingLevel);
        }
        
        // Roll for detection (random factor makes radar investment valuable)
        const playerRadarRoll = playerRadarTotal * Math.random();
        const enemyRadarRoll = enemyRadarTotal * Math.random();
        
        if (playerRadarRoll > enemyRadarRoll * 2) {
            // Player detects enemy first (requires 2x advantage) - show undetected screen
            gameState.enemyRadarAdvantage = false;
            this.showUndetectedScreen(gameState, encType);
        } else if (enemyRadarRoll > playerRadarRoll * 2) {
            // Enemy has 2x radar advantage - player ships start with 0 shields
            gameState.ships.forEach(ship => {
                ship.shields = 0;
            });
            // Set flag for UI display
            gameState.enemyRadarAdvantage = true;
            // Enemy detects player first - normal encounter flow
            encType.onGreet(gameState, encType);
        } else {
            // Simultaneous detection or neither has 2x advantage - normal encounter flow
            gameState.enemyRadarAdvantage = false;
            encType.onGreet(gameState, encType);
        }
    },
    
    /**
     * Show undetected encounter screen with options to approach or avoid
     */
    showUndetectedScreen: function(gameState, encType) {
        UI.clear();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, `${encType.name}: Undetected`);
        let y = 2;
        
        UI.addText(10, y++, `Your sensors detect ${encType.name.toLowerCase()} ships ahead!`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `They haven't noticed your fleet yet.`, COLORS.GREEN);
        y += 2;
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;
        
        // Show detected encounter ships
        y = ShipTableRenderer.addNPCFleet(10, y, `Detected ${encType.name}:`, gameState.encounterShips);
        
        const buttonY = grid.height - 4;
        const approachHelpText = encType.name === 'Police' 
            ? 'Approach the Police (they will inspect your cargo)'
            : `Engage with the ${encType.name} normally`;
        
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Avoid', callback: () => {
                // Player successfully avoids encounter
                UI.clear();
                
                UI.addTitleLineCentered(0, 'Encounter Avoided');
                let y = 2;
                UI.addText(10, y++, `You carefully navigate around the ${encType.name.toLowerCase()} ships.`, COLORS.GREEN);
                UI.addText(10, y++, `They never detected your presence.`, COLORS.TEXT_DIM);
                
                const continueY = grid.height - 4;
                UI.addCenteredButton(continueY, '1', 'Continue Journey', () => {
                    TravelMenu.resume(gameState);
                }, COLORS.GREEN);
                
                UI.draw();
            }, color: COLORS.GREEN, helpText: `Avoid the ${encType.name}` },
            { key: '2', label: 'Approach', callback: () => {
                // Player has radar advantage - enemy ships start with 0 shields
                gameState.encounterShips.forEach(ship => {
                    ship.shields = 0;
                });
                // Set flag for UI display
                gameState.playerRadarAdvantage = true;
                // Proceed with normal encounter
                encType.onGreet(gameState, encType);
            }, color: COLORS.GREEN, helpText: approachHelpText }
        ]);
        
        
        UI.draw();
    }
};
