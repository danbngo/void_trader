/**
 * Space Travel Menu
 * Submenu for in-flight actions
 */

const SpaceTravelMenu = (() => {
    let lastComputerErrorMs = 0;

    function show(gameState, onReturn, onOptions) {
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();
        render(gameState, onReturn, onOptions);
    }

    function render(gameState, onReturn, onOptions) {
        UI.clear();

        const grid = UI.getGridSize();

        UI.addTitleLineCentered(0, 'Travel Menu');
        UI.addTextCentered(2, 'In-flight options', COLORS.TEXT_DIM);

        const buttonY = grid.height - 6;
        const leftX = 5;
        const middleX = 32;
        const rightX = 59;

        const hasUnreadMessages = gameState.messages && gameState.messages.some(m => !m.isRead);
        const hasSkillPoints = gameState.captain.hasSpendableSkillPoints();
        
        // Check if ship is moving
        const playerShip = gameState.ships && gameState.ships[0];
        const speedNow = playerShip && playerShip.velocity
            ? ThreeDUtils.vecLength(playerShip.velocity)
            : 0;
        const isMoving = speedNow > 0.000001;
        
        const computerColor = (hasUnreadMessages || hasSkillPoints) ? COLORS.YELLOW : COLORS.TEXT_NORMAL;
        const computerButtonDisabled = isMoving;
        const computerDisabledColor = COLORS.TEXT_DIM;

        UI.addButton(leftX, buttonY, 'c', 'Computer', () => {
            if (isMoving) {
                lastComputerErrorMs = performance.now();
                render(gameState, onReturn, onOptions);
                return;
            }
            AssistantMenu.show(gameState, () => show(gameState, onReturn, onOptions));
        }, computerButtonDisabled ? computerDisabledColor : computerColor, computerButtonDisabled ? 'Computer unavailable while moving' : 'View ship, cargo, and captain information');

        UI.addButton(leftX, buttonY + 1, 'l', 'Local Map', () => {
            LocalSystemMap.show(gameState, () => show(gameState, onReturn, onOptions));
        }, COLORS.BUTTON, 'View stars and planets in current system');

        UI.addButton(middleX, buttonY, 'g', 'Galaxy Map', () => {
            GalaxyMap.show(gameState);
        }, COLORS.BUTTON, 'View nearby systems and set destination');

        UI.addButton(middleX, buttonY + 1, 'r', 'Return', () => {
            if (onReturn) {
                onReturn();
            }
        }, COLORS.GREEN, 'Return to space travel');

        // Options button (right column)
        const optionsButtonDisabled = isMoving;
        UI.addButton(rightX, buttonY, 'o', 'Options', () => {
            if (isMoving) {
                lastComputerErrorMs = performance.now();
                render(gameState, onReturn, onOptions);
                return;
            }
            if (onOptions) {
                console.log('[SpaceTravelMenu] Opening options');
                onOptions();
            }
        }, optionsButtonDisabled ? COLORS.TEXT_DIM : COLORS.BUTTON, optionsButtonDisabled ? 'Options unavailable while moving' : 'Game settings and save/load');

        // Back button (change from '0' to 'q' to avoid conflict with Return key)
        UI.addButton(rightX, buttonY + 1, 'q', 'Return', () => {
            if (onReturn) {
                onReturn();
            }
        }, COLORS.BUTTON, 'Return to space travel');

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
