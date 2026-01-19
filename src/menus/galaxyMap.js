/**
 * Galaxy Map Menu
 * Shows the star map and system information
 */

const GalaxyMap = (() => {
    let selectedIndex = 0;
    let nearbySystems = [];
    let mapViewRange = MAP_VIEW_RANGE; // Current zoom level
    
    /**
     * Show the galaxy map
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        if (!currentSystem) {
            UI.addTextCentered(grid.height / 2, 'No current system', COLORS.TEXT_ERROR);
            return;
        }
        
        // Get nearby systems (all visible systems, not filtered by reachability)
        nearbySystems = gameState.getNearbySystems(mapViewRange);
        
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
        
        // Title with zoom level
        UI.addText(2, 0, '[ GALAXY MAP ]', COLORS.TITLE);
        UI.addText(mapWidth - 12, 0, `Zoom: ${mapViewRange.toFixed(1)}`, COLORS.TEXT_DIM);
        
        // Calculate scale to fit systems in map
        const mapCenterX = Math.floor(mapWidth / 2);
        const mapCenterY = Math.floor(mapHeight / 2);
        const scale = Math.min((mapWidth - 4) / (mapViewRange * 2), (mapHeight - 4) / (mapViewRange * 2));
        
        // Draw current system (center)
        UI.addText(mapCenterX, mapCenterY, '@', COLORS.GREEN);
        
        const activeShip = gameState.ship;
        
        // Draw nearby systems
        nearbySystems.forEach((item, index) => {
            const dx = item.system.x - currentSystem.x;
            const dy = item.system.y - currentSystem.y;
            
            const screenX = Math.floor(mapCenterX + dx * scale);
            const screenY = Math.floor(mapCenterY + dy * scale);
            
            // Check if in bounds
            if (screenX > 0 && screenX < mapWidth - 1 && screenY > 0 && screenY < mapHeight - 1) {
                const isSelected = index === selectedIndex;
                
                // Check if reachable and visited
                const systemIndex = gameState.systems.indexOf(item.system);
                const isVisited = gameState.visitedSystems.includes(systemIndex);
                const canReach = activeShip.canReach(currentSystem.x, currentSystem.y, item.system.x, item.system.y);
                
                // Determine symbol and color
                let symbol = '?'; // Unvisited default
                let color = COLORS.GRAY; // Unreachable default
                
                if (isVisited) {
                    symbol = isSelected ? '*' : '.';
                } else if (isSelected) {
                    symbol = '*';
                }
                
                // Prioritize selection color over everything else
                if (isSelected) {
                    color = COLORS.YELLOW;
                } else if (canReach) {
                    color = COLORS.CYAN;
                }
                
                // Only draw if not overlapping current system
                if (screenX !== mapCenterX || screenY !== mapCenterY) {
                    UI.addText(screenX, screenY, symbol, color);
                }
            }
        });
        
        // Player Ships summary
        UI.addText(2, mapHeight + 1, '=== Player Ships ===', COLORS.TITLE);
        
        // Calculate total fuel and hull across all ships
        const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
        const totalMaxFuel = gameState.ships.reduce((sum, ship) => sum + ship.maxFuel, 0);
        const totalHull = gameState.ships.reduce((sum, ship) => sum + ship.hull, 0);
        const totalMaxHull = gameState.ships.reduce((sum, ship) => sum + ship.maxHull, 0);
        
        UI.addText(2, mapHeight + 2, `Fuel: ${totalFuel} / ${totalMaxFuel}`, COLORS.TEXT_NORMAL);
        UI.addText(2, mapHeight + 3, `Hull: ${totalHull} / ${totalMaxHull}`, COLORS.TEXT_NORMAL);
        
        // Empty row
        
        // Legend below in 2 columns
        const legendY = mapHeight + 5;
        UI.addText(2, legendY, '@ = You', COLORS.GRAY);
        UI.addText(15, legendY, '* = Selected', COLORS.GRAY);
        UI.addText(2, legendY + 1, '. = Visited', COLORS.GRAY);
        UI.addText(15, legendY + 1, '? = Unknown', COLORS.GRAY);
    }
    
    /**
     * Draw system information panel
     */
    function drawSystemInfo(gameState, startX) {
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        UI.addText(startX, 1, '=== Current System ===', COLORS.TITLE);
        UI.addText(startX, 3, 'Name:', COLORS.TEXT_DIM);
        UI.addText(startX + 6, 3, currentSystem.name, COLORS.TEXT_NORMAL);
        
        // Selected nearby system info
        if (nearbySystems.length > 0 && selectedIndex < nearbySystems.length) {
            const selected = nearbySystems[selectedIndex];
            
            UI.addText(startX, 6, '=== Selected System ===', COLORS.YELLOW);
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
     * Render the galaxy map without resetting button selection
     */
    function render(gameState) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        if (!currentSystem) {
            return;
        }
        
        // Get nearby systems
        const oldNearbySystems = nearbySystems;
        nearbySystems = gameState.getNearbySystems(mapViewRange);
        
        // Check if selected system is still visible after zoom
        if (oldNearbySystems.length > 0 && selectedIndex < oldNearbySystems.length) {
            const previouslySelected = oldNearbySystems[selectedIndex].system;
            const stillVisible = nearbySystems.find(item => item.system === previouslySelected);
            
            if (!stillVisible) {
                // Selected system went off screen, reset to first
                selectedIndex = 0;
            } else {
                // Update selectedIndex to match new position
                selectedIndex = nearbySystems.findIndex(item => item.system === previouslySelected);
            }
        }
        
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
     * Draw navigation buttons
     */
    function drawButtons(gameState, startX) {
        const grid = UI.getGridSize();
        let buttonY = grid.height - 10;
        
        UI.addButton(startX, buttonY++, '1', 'Previous System', () => {
            if (nearbySystems.length > 0) {
                selectedIndex = (selectedIndex - 1 + nearbySystems.length) % nearbySystems.length;
                render(gameState);
            }
        }, COLORS.BUTTON);
        
        UI.addButton(startX, buttonY++, '2', 'Next System', () => {
            if (nearbySystems.length > 0) {
                selectedIndex = (selectedIndex + 1) % nearbySystems.length;
                render(gameState);
            }
        }, COLORS.BUTTON);
        
        UI.addButton(startX, buttonY++, '3', 'Scan System', () => {
            if (nearbySystems.length > 0 && selectedIndex < nearbySystems.length) {
                ScanSystemMenu.show(nearbySystems[selectedIndex].system, () => show(gameState));
            }
        }, COLORS.BUTTON);
        
        UI.addButton(startX, buttonY++, '4', 'Zoom In', () => {
            mapViewRange = Math.max(MIN_MAP_VIEW_RANGE, mapViewRange / 1.5);
            render(gameState);
        }, COLORS.BUTTON);
        
        UI.addButton(startX, buttonY++, '5', 'Zoom Out', () => {
            mapViewRange = Math.min(MAX_MAP_VIEW_RANGE, mapViewRange * 1.5);
            render(gameState);
        }, COLORS.BUTTON);
        
        UI.addButton(startX, buttonY++, '0', 'Dock', () => DockMenu.show(gameState), COLORS.GREEN);
    }
    
    return {
        show,
        render
    };
})();
