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
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        const ship = gameState.ship;
        
        // Title
        UI.addTextCentered(3, '=== CARGO MANIFEST ===', COLORS.TITLE);
        
        // Cargo summary
        UI.addText(5, 6, `Total Cargo: ${ship.getTotalCargo()} / ${ship.cargoCapacity}`, COLORS.TEXT_NORMAL);
        UI.addText(5, 7, `Available Space: ${ship.getAvailableCargoSpace()} units`, COLORS.GREEN);
        
        // Cargo details
        const startY = 10;
        const rows = ALL_CARGO_TYPES.map(cargoType => {
            const quantity = ship.cargo[cargoType.id] || 0;
            const totalValue = quantity * cargoType.baseValue;
            return [
                { text: cargoType.name, color: COLORS.TEXT_NORMAL },
                { text: String(quantity), color: COLORS.TEXT_NORMAL },
                { text: `${totalValue} CR`, color: COLORS.YELLOW }
            ];
        });
        
        const y = TableRenderer.renderTable(5, startY, ['Cargo Type', 'Quantity', 'Value'], rows);
        
        // Total value
        const totalValue = ALL_CARGO_TYPES.reduce((sum, type) => {
            return sum + (ship.cargo[type.id] || 0) * type.baseValue;
        }, 0);
        
        TableRenderer.renderKeyValueList(5, y + 1, [
            { label: 'Total Value:', value: `${totalValue} CR`, valueColor: COLORS.GREEN }
        ]);
        
        // Back button
        UI.addButton(5, grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
