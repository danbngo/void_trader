/**
 * Cargo Info Menu
 * Shows cargo manifest
 */

const CargoInfoMenu = (() => {
    /**
     * Show cargo information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTitleLineCentered(0, 'Cargo Manifest');
        
        // Cargo summary using TableRenderer
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const totalCargo = Object.values(fleetCargo).reduce((sum, amt) => sum + amt, 0);
        const totalCapacity = gameState.ships.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        const summaryY = TableRenderer.renderKeyValueList(5, 6, [
            { label: 'Total Cargo:', value: `${totalCargo} / ${totalCapacity}`, valueColor: 'white' },
            { label: 'Available Space:', value: `${availableSpace} units`, valueColor: 'white' }
        ]);
        
        // Cargo details
        const startY = summaryY + 1;
        const rows = ALL_CARGO_TYPES.map(cargoType => {
            const quantity = fleetCargo[cargoType.id] || 0;
            const totalValue = quantity * cargoType.baseValue;
            
            // Calculate stat color for quantity: 0 = 1.0, max capacity = 4.0
            const quantityRatio = totalCapacity > 0 
                ? 1.0 + (quantity / totalCapacity) * 3.0 
                : 1.0;
            const quantityColor = UI.calcStatColor(quantityRatio);
            
            return [
                { text: cargoType.name, color: cargoType.color },
                { text: String(quantity), color: quantityColor },
                { text: `${totalValue}`, color: 'white' }
            ];
        });
        
        const y = TableRenderer.renderTable(5, startY, ['Cargo Type', 'Quantity', 'Value'], rows);
        
        // Total value
        const totalValue = ALL_CARGO_TYPES.reduce((sum, type) => {
            return sum + (fleetCargo[type.id] || 0) * type.baseValue;
        }, 0);
        
        TableRenderer.renderKeyValueList(5, y + 1, [
            { label: 'Total Value:', value: `${totalValue} CR`, valueColor: 'white' }
        ]);
        
        // Back button
        UI.addCenteredButton(grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
