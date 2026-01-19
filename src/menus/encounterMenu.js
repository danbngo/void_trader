/**
 * Encounter Menu
 * Handles space encounters with pirates, police, and merchants
 */

const EncounterMenu = (() => {
    /**
     * Show the encounter menu
     * @param {GameState} gameState - Current game state
     * @param {Object} encounterType - Type of encounter
     */
    function show(gameState, encounterType) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTextCentered(2, `${encounterType.name}`, COLORS.YELLOW);
        
        let y = 5;
        
        // Description
        UI.addText(5, y++, encounterType.description, COLORS.TEXT_NORMAL);
        y++;
        
        // Encounter ships
        UI.addText(5, y++, '=== Enemy Ships ===', COLORS.TITLE);
        y++;
        
        gameState.encounterShips.forEach((ship, index) => {
            UI.addText(5, y++, `${index + 1}. ${ship.type}`, COLORS.TEXT_NORMAL);
            UI.addText(8, y++, `Hull: ${ship.hull}/${ship.maxHull}  Shields: ${ship.shields}/${ship.maxShields}  Lasers: ${ship.lasers}`, COLORS.TEXT_DIM);
            y++;
        });
        
        y++;
        UI.addText(5, y++, '=== TBA - Combat System ===', COLORS.TEXT_ERROR);
        UI.addText(5, y++, 'Encounter mechanics to be implemented.', COLORS.TEXT_DIM);
        y += 2;
        
        // Temporary button to continue
        UI.addButton(5, y++, '0', 'Back', () => {
            gameState.encounter = false;
            gameState.encounterShips = [];
            GalaxyMap.show(gameState);
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
