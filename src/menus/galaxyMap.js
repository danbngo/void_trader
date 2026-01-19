/**
 * Galaxy Map Menu
 * Shows the star map and system information
 */

const GalaxyMap = (() => {
    let selectedIndex = 0;
    let nearbySystems = [];
    const MAP_VIEW_RANGE = 30; // Range of systems to show on map
    
    /**
     * Show the galaxy map
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        if (!currentSystem) {
            UI.addTextCentered(grid.height / 2, 'No current system', COLORS.TEXT_ERROR);
            return;
        }
        
        // Get nearby systems
        nearbySystems = gameState.getNearbySystems(MAP_VIEW_RANGE);
        
        // Ensure we don't go out of bounds
        if (selectedIndex >= nearbySystems.length) {
            selectedIndex = Math.max(0, nearbySystems.length - 1);
        }
        
        // Draw map on left side (50% of width)
        const mapWidth = Math.floor(grid.width * 0.5);
        const mapHeight = Math.floor(grid.height * 0.5);
        
        drawMap(gameState, mapWidth, mapHeight);
        
        // Draw system info on right side
        drawSystemInfo(gameState, mapWidth + 2);
        
        // Draw buttons at bottom
        drawButtons(gameState, mapWidth + 2);
        
        UI.draw();
    }
    
    /**
     * Draw the star map
     */
    function drawMap(gameState, mapWidth, mapHeight) {
        const currentSystem = gameState.getCurrentSystem();
        
        // Draw border
        UI.addText(0, 0, '+' + '-'.repeat(mapWidth - 2) + '+', COLORS.GRAY);
        for (let y = 1; y < mapHeight - 1; y++) {
            UI.addText(0, y, '|', COLORS.GRAY);
            UI.addText(mapWidth - 1, y, '|', COLORS.GRAY);
        }
        UI.addText(0, mapHeight - 1, '+' + '-'.repeat(mapWidth - 2) + '+', COLORS.GRAY);
        
        // Title
        UI.addText(2, 0, '[ GALAXY MAP ]', COLORS.TITLE);
        
        // Calculate scale to fit systems in map
        const mapCenterX = Math.floor(mapWidth / 2);
        const mapCenterY = Math.floor(mapHeight / 2);
        const scale = Math.min((mapWidth - 4) / (MAP_VIEW_RANGE * 2), (mapHeight - 4) / (MAP_VIEW_RANGE * 2));
        
        // Draw current system (center)
        UI.addText(mapCenterX, mapCenterY, '@', COLORS.GREEN);
        
        // Draw nearby systems
        nearbySystems.forEach((item, index) => {
            const dx = item.system.x - currentSystem.x;
            const dy = item.system.y - currentSystem.y;
            
            const screenX = Math.floor(mapCenterX + dx * scale);
            const screenY = Math.floor(mapCenterY + dy * scale);
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                const isSelected = index === selectedIndex;
                const symbol = isSelected ? '*' : '.';
                const color = isSelected ? COLORS.YELLOW : COLORS.CYAN;
                
                // Only draw if not overlapping current system
                if (screenX !== mapCenterX || screenY !== mapCenterY) {
                    UI.addText(screenX, screenY, symbol, color);
                }
            }
        });
        
        // Legend below map
        UI.addText(2, mapHeight + 1, '@ = You', COLORS.GRAY);
        UI.addText(2, mapHeight + 2, '* = Selected', COLORS.GRAY);
        UI.addText(2, mapHeight + 3, '. = System', COLORS.GRAY);
    }
    
    /**
     * Draw system information panel
     */
    function drawSystemInfo(gameState, startX) {
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        UI.addText(startX, 1, '=== CURRENT SYSTEM ===', COLORS.TITLE);
        UI.addText(startX, 3, 'Name:', COLORS.TEXT_DIM);
        UI.addText(startX + 6, 3, currentSystem.name, COLORS.TEXT_NORMAL);
        
        // Selected nearby system info
        if (nearbySystems.length > 0 && selectedIndex < nearbySystems.length) {
            const selected = nearbySystems[selectedIndex];
            
            UI.addText(startX, 6, '=== SELECTED SYSTEM ===', COLORS.YELLOW);
            UI.addText(startX, 8, 'Name:', COLORS.TEXT_DIM);
            UI.addText(startX + 6, 8, selected.system.name, COLORS.TEXT_NORMAL);
            
            UI.addText(startX, 9, 'Coords:', COLORS.TEXT_DIM);
            UI.addText(startX + 8, 9, `(${selected.system.x}, ${selected.system.y})`, COLORS.TEXT_NORMAL);
            
            UI.addText(startX, 10, 'Distance:', COLORS.TEXT_DIM);
            UI.addText(startX + 10, 10, `${selected.distance.toFixed(1)} LY`, COLORS.TEXT_NORMAL);
            
            UI.addText(startX, 11, 'Pop:', COLORS.TEXT_DIM);
            UI.addText(startX + 5, 11, `${selected.system.population}M`, COLORS.TEXT_NORMAL);
            
            UI.addText(startX, 12, 'Economy:', COLORS.TEXT_DIM);
            UI.addText(startX + 9, 12, selected.system.economy, COLORS.TEXT_NORMAL);
        } else {
            UI.addText(startX, 6, 'No nearby systems', COLORS.TEXT_DIM);
        }
    }
    
    /**
     * Draw navigation buttons
     */
    function drawButtons(gameState, startX) {
        const grid = UI.getGridSize();
        let buttonY = grid.height - 8;
        
        UI.addButton(startX, buttonY++, '1', 'Previous System', () => {
            if (nearbySystems.length > 0) {
                selectedIndex = (selectedIndex - 1 + nearbySystems.length) % nearbySystems.length;
                show(gameState);
            }
        }, COLORS.BUTTON);
        
        UI.addButton(startX, buttonY++, '2', 'Next System', () => {
            if (nearbySystems.length > 0) {
                selectedIndex = (selectedIndex + 1) % nearbySystems.length;
                show(gameState);
            }
        }, COLORS.BUTTON);
        
        UI.addButton(startX, buttonY++, '3', 'Scan System', () => {
            if (nearbySystems.length > 0 && selectedIndex < nearbySystems.length) {
                ScanSystemMenu.show(nearbySystems[selectedIndex].system, () => show(gameState));
            }
        }, COLORS.BUTTON);
        
        UI.addButton(startX, buttonY++, '0', 'Dock', () => DockMenu.show(gameState), COLORS.GREEN);
    }
    
    return {
        show
    };
})();
