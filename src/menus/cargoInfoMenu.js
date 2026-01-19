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
        UI.clearAll();
        UI.clearButtons();
        
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
        UI.addText(5, startY, 'Cargo Type', COLORS.TEXT_DIM);
        UI.addText(25, startY, 'Quantity', COLORS.TEXT_DIM);
        UI.addText(40, startY, 'Value', COLORS.TEXT_DIM);
        
        let y = startY + 2;
        ALL_CARGO_TYPES.forEach(cargoType => {
            const quantity = ship.cargo[cargoType.id] || 0;
            const totalValue = quantity * cargoType.baseValue;
            
            UI.addText(5, y, cargoType.name, COLORS.TEXT_NORMAL);
            UI.addText(25, y, String(quantity), COLORS.TEXT_NORMAL);
            UI.addText(40, y, `${totalValue} CR`, COLORS.YELLOW);
            y++;
        });
        
        // Total value
        const totalValue = ALL_CARGO_TYPES.reduce((sum, type) => {
            return sum + (ship.cargo[type.id] || 0) * type.baseValue;
        }, 0);
        
        UI.addText(5, y + 1, 'Total Value:', COLORS.TEXT_DIM);
        UI.addText(25, y + 1, `${totalValue} CR`, COLORS.GREEN);
        
        // Back button
        UI.setButtons([
            {
                key: '0',
                label: 'Back',
                callback: onReturn,
                color: COLORS.BUTTON,
                x: 5,
                y: grid.height - 4
            }
        ]);
        
        // Set this screen as the redraw target
        UI.setRedrawCallback(() => show(onReturn));
        
        // Debug output
        UI.debugUI();
    }
    
    return {
        show
    };
})();
