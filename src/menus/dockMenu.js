/**
 * Dock Menu
 * Main menu when docked at a station
 */

const DockMenu = (() => {
    /**
     * Show the dock menu
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        UI.clearAll();
        UI.clearButtons();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Title
        UI.addTextCentered(3, `=== DOCKED AT ${currentSystem.name} ===`, COLORS.TITLE);
        
        // System info
        UI.addTextCentered(5, `Population: ${currentSystem.population}M`, COLORS.TEXT_DIM);
        UI.addTextCentered(6, `Economy: ${currentSystem.economy}`, COLORS.TEXT_DIM);
        
        // Menu buttons
        const menuX = Math.floor(grid.width / 2) - 12;
        const menuY = 10;
        
        UI.setButtons([
            {
                label: 'Shipyard',
                callback: () => {
                    // TODO: Implement shipyard
                    UI.clearAll();
                    UI.addTextCentered(15, 'Shipyard - Coming Soon', COLORS.TEXT_WARNING);
                    setTimeout(() => show(gameState), 1500);
                },
                color: COLORS.BUTTON
            },
            {
                label: 'Market',
                callback: () => {
                    // TODO: Implement market
                    UI.clearAll();
                    UI.addTextCentered(15, 'Market - Coming Soon', COLORS.TEXT_WARNING);
                    setTimeout(() => show(gameState), 1500);
                },
                color: COLORS.BUTTON
            },
            {
                label: 'Depart',
                callback: () => GalaxyMap.show(gameState),
                color: COLORS.GREEN
            },
            {
                key: 'a',
                label: 'Assistant',
                callback: () => AssistantMenu.show(() => show(gameState)),
                color: COLORS.BUTTON
            },
            {
                key: '0',
                label: 'Options',
                callback: () => OptionsMenu.show(() => show(gameState)),
                color: COLORS.BUTTON
            }
        ], menuX, menuY);
        
        // Set this screen as the redraw target
        UI.setRedrawCallback(() => show(gameState));
        
        // Debug output
        UI.debugUI();
    }
    
    return {
        show
    };
})();
