/**
 * Captain Info Menu
 * Shows captain information and learned perks
 */

const CaptainInfoMenu = (() => {
    /**
     * Show captain information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTextCentered(3, 'Captain Info', COLORS.TITLE);
        
        // Captain details
        const currentSystem = gameState.getCurrentSystem();
        TableRenderer.renderKeyValueList(5, 6, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.YELLOW },
            { label: 'Location:', value: currentSystem.name, valueColor: COLORS.CYAN },
            { label: 'Reputation:', value: String(gameState.reputation), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Bounty:', value: `${gameState.bounty} CR`, valueColor: gameState.bounty > 0 ? COLORS.TEXT_ERROR : COLORS.TEXT_NORMAL }
        ]);
        
        // Perks section
        UI.addText(5, 12, 'Learned Perks', COLORS.TITLE);
        
        if (gameState.perks.size === 0) {
            UI.addText(5, 14, 'No perks learned yet', COLORS.TEXT_DIM);
        } else {
            let y = 14;
            gameState.perks.forEach(perkId => {
                const perk = PERKS[perkId];
                if (perk) {
                    UI.addText(7, y++, `${perk.name}`, COLORS.GREEN);
                    UI.addText(9, y++, perk.description, COLORS.TEXT_DIM);
                }
            });
        }
        
        // Back button
        UI.addCenteredButton(grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
