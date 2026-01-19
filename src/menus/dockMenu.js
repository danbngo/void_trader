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
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Title
        UI.addTextCentered(3, `${currentSystem.name}: Dock`, COLORS.TITLE);
        
        // System info
        UI.addTextCentered(5, `Population: ${currentSystem.population}M`, COLORS.TEXT_DIM);
        UI.addTextCentered(6, `Economy: ${currentSystem.economy}`, COLORS.TEXT_DIM);
        
        // Menu buttons
        const menuX = Math.floor(grid.width / 2) - 12;
        let menuY = 10;
        
        UI.addButton(menuX, menuY++, '1', 'Shipyard', () => ShipyardMenu.show(gameState, () => show(gameState)), COLORS.BUTTON, 'Manage and purchase ships');
        
        UI.addButton(menuX, menuY++, '2', 'Market', () => MarketMenu.show(gameState, () => show(gameState)), COLORS.BUTTON, 'Buy and sell cargo');
        
        UI.addButton(menuX, menuY++, '3', 'Depart', () => GalaxyMap.show(gameState), COLORS.GREEN, 'Leave station and travel to another system');
        UI.addButton(menuX, menuY++, 'a', 'Assistant', () => AssistantMenu.show(() => show(gameState)), COLORS.BUTTON, 'View ship, cargo, and captain information');
        UI.addButton(menuX, menuY++, '0', 'Options', () => OptionsMenu.show(() => show(gameState)), COLORS.BUTTON, 'Game settings and save/load');
        
        UI.draw();
    }
    
    return {
        show
    };
})();
