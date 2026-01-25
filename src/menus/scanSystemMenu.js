/**
 * Scan System Menu
 * Shows detailed information about a selected system
 */

const ScanSystemMenu = (() => {
    /**
     * Show system scan details
     * @param {StarSystem} system - The system to scan
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(system, onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTitleLineCentered(3, 'System Scan');
        
        // System details
        const startY = 6;
        UI.addText(5, startY, 'System Name:', COLORS.TEXT_DIM);
        UI.addText(20, startY, system.name, COLORS.CYAN);
        
        UI.addText(5, startY + 2, 'Coordinates:', COLORS.TEXT_DIM);
        UI.addText(20, startY + 2, `(${system.x}, ${system.y})`, COLORS.TEXT_NORMAL);
        
        UI.addText(5, startY + 4, 'Population:', COLORS.TEXT_DIM);
        UI.addText(20, startY + 4, `${system.population} million`, COLORS.TEXT_NORMAL);
        
        UI.addText(5, startY + 6, 'Economy Type:', COLORS.TEXT_DIM);
        UI.addText(20, startY + 6, system.economy, COLORS.TEXT_NORMAL);
        
        // Additional flavor text based on economy
        const flavorText = getFlavorText(system);
        UI.addText(5, startY + 9, 'Description:', COLORS.TEXT_DIM);
        UI.addText(5, startY + 10, flavorText, COLORS.TEXT_NORMAL);
        
        // Back button
        UI.addCenteredButton(grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Get flavor text based on system economy
     */
    function getFlavorText(system) {
        const texts = {
            'Agricultural': 'Rich farmlands provide food for the sector.',
            'Industrial': 'Manufacturing hubs produce goods and materials.',
            'High-Tech': 'Advanced research facilities drive innovation.',
            'Mining': 'Mineral extraction operations dominate the system.',
            'Trading': 'A bustling commercial hub with active markets.',
            'Military': 'Heavy military presence maintains order.',
            'Research': 'Scientific outposts study the unknown.',
            'Colonial': 'A frontier world still being settled.',
            'Tourism': 'Visitors flock to see natural wonders.',
            'Frontier': 'A remote outpost at the edge of civilization.'
        };
        return texts[system.economy] || 'A typical star system.';
    }
    
    return {
        show
    };
})();
