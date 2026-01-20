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
        const ship = gameState.ship;
        
        // Title
        UI.addTextCentered(3, 'Cargo Manifest', COLORS.TITLE);
        
        // Cargo summary using TableRenderer
        const summaryY = TableRenderer.renderKeyValueList(5, 6, [
            { label: 'Total Cargo:', value: `${ship.getTotalCargo()} / ${ship.cargoCapacity}`, valueColor: 'white' },
            { label: 'Available Space:', value: `${ship.getAvailableCargoSpace()} units`, valueColor: 'white' }
        ]);
        
        // Cargo details
        const startY = summaryY + 1;
        const rows = ALL_CARGO_TYPES.map(cargoType => {
            const quantity = ship.cargo[cargoType.id] || 0;
            const totalValue = quantity * cargoType.baseValue;
            return [
                { text: cargoType.name, color: 'white' },
                { text: String(quantity), color: 'white' },
                { text: `${totalValue}`, color: 'white' }
            ];
        });
        
        const y = TableRenderer.renderTable(5, startY, ['Cargo Type', 'Quantity', 'Value'], rows);
        
        // Total value
        const totalValue = ALL_CARGO_TYPES.reduce((sum, type) => {
            return sum + (ship.cargo[type.id] || 0) * type.baseValue;
        }, 0);
        
        TableRenderer.renderKeyValueList(5, y + 1, [
            { label: 'Total Value:', value: `${totalValue} CR`, valueColor: 'white' }
        ]);
        
        // Back button
        UI.addButton(5, grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
