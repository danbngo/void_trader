/**
 * Space Travel Menu
 * Submenu for in-flight actions
 */

const SpaceTravelMenu = (() => {
    let lastComputerErrorMs = 0;

    function show(gameState, onReturn) {
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();
        render(gameState, onReturn);
    }

    function render(gameState, onReturn) {
        UI.clear();

        const grid = UI.getGridSize();

        UI.addTitleLineCentered(0, 'Travel Menu');
        UI.addTextCentered(2, 'In-flight options', COLORS.TEXT_DIM);

        const buttonY = grid.height - 6;
        const leftX = 5;
        const middleX = 32;

        const hasUnreadMessages = gameState.messages && gameState.messages.some(m => !m.isRead);
        const hasSkillPoints = gameState.captain.hasSpendableSkillPoints();
        
        // Check if ship is moving
        const playerShip = gameState.ships && gameState.ships[0];
        const speedNow = playerShip && playerShip.velocity
            ? ThreeDUtils.vecLength(playerShip.velocity)
            : 0;
        const isMoving = speedNow > 0.000001;
        
        const computerColor = (hasUnreadMessages || hasSkillPoints) ? COLORS.YELLOW : COLORS.BUTTON;
        const computerButtonDisabled = isMoving;
        const computerDisabledColor = COLORS.TEXT_DIM;

        UI.addButton(leftX, buttonY, 'c', 'Computer', () => {
            if (isMoving) {
                lastComputerErrorMs = performance.now();
                render(gameState, onReturn);
                return;
            }
            AssistantMenu.show(gameState, () => show(gameState, onReturn));
        }, computerButtonDisabled ? computerDisabledColor : computerColor, computerButtonDisabled ? 'Computer unavailable while moving' : 'View ship, cargo, and captain information');

        UI.addButton(leftX, buttonY + 1, 'l', 'Local Map', () => {
            LocalSystemMap.show(gameState, () => show(gameState, onReturn));
        }, COLORS.BUTTON, 'View stars and planets in current system');

        UI.addButton(middleX, buttonY, 'g', 'Galaxy Map', () => {
            GalaxyMap.show(gameState);
        }, COLORS.BUTTON, 'View nearby systems and set destination');

        UI.addButton(middleX, buttonY + 1, '0', 'Return', () => {
            if (onReturn) {
                onReturn();
            }
        }, COLORS.GREEN, 'Return to space travel');

        // Show computer error message if recently attempted while moving
        const nowMs = performance.now();
        const errorFlickerActive = nowMs > 0 && (nowMs - (lastComputerErrorMs || 0)) <= 1000;
        if (errorFlickerActive) {
            const flashCycle = Math.floor((nowMs - lastComputerErrorMs) / 100) % 2;
            const textColor = flashCycle === 0 ? COLORS.WHITE : COLORS.CYAN;
            UI.addText(10, grid.height - 2, 'Cannot engage computer while moving', textColor);
        }

        UI.draw();
    }

    return {
        show
    };
})();
