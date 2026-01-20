/**
 * Ship Info Menu
 * Shows ship status and specifications
 */

const ShipInfoMenu = (() => {
    /**
     * Show ship information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTextCentered(3, 'Fleet Status', COLORS.TITLE);
        
        // Build table data for all ships
        const startY = 6;
        const headers = ['Ship', 'Type', 'Hull', 'Shields', 'Lasers', 'Engine', 'Radar', 'Fuel', 'Cargo'];
        const rows = gameState.ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const isActive = index === gameState.activeShipIndex;
            const nameColor = isActive ? COLORS.GREEN : COLORS.CYAN;
            const hullRatio = ship.hull / ship.maxHull;
            const shieldRatio = ship.shields / ship.maxShields;
            const laserRatio = ship.lasers / AVERAGE_SHIP_LASER_LEVEL;
            const engineRatio = ship.engine / AVERAGE_SHIP_ENGINE_LEVEL;
            const radarRatio = ship.radar / AVERAGE_SHIP_RADAR_LEVEL;
            const fuelRatio = ship.fuel / ship.maxFuel;
            
            return [
                { text: ship.name, color: nameColor },
                { text: shipType.name, color: COLORS.TEXT_DIM },
                { text: `${ship.hull}/${ship.maxHull}`, color: UI.calcStatColor(hullRatio, true) },
                { text: `${ship.shields}/${ship.maxShields}`, color: UI.calcStatColor(shieldRatio, true) },
                { text: String(ship.lasers), color: UI.calcStatColor(laserRatio) },
                { text: String(ship.engine), color: UI.calcStatColor(engineRatio) },
                { text: String(ship.radar), color: UI.calcStatColor(radarRatio) },
                { text: `${ship.fuel}/${ship.maxFuel}`, color: UI.calcStatColor(fuelRatio, true) },
                { text: `${ship.getTotalCargo()}/${ship.cargoCapacity}`, color: COLORS.TEXT_NORMAL }
            ];
        });
        
        // Render the table
        TableRenderer.renderTable(5, startY, headers, rows, -1, 2, null);
        
        // Legend
        UI.addText(5, startY + rows.length + 2, 'Active ship shown in green', COLORS.TEXT_DIM);
        
        // Back button
        UI.addButton(5, grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
