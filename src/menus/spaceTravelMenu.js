/**
 * Space Travel Menu
 * Submenu for in-flight actions
 */

const SpaceTravelMenu = (() => {
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
        const assistantColor = (hasUnreadMessages || hasSkillPoints) ? COLORS.YELLOW : COLORS.BUTTON;

        UI.addButton(leftX, buttonY, 'a', 'Assistant', () => {
            AssistantMenu.show(gameState, () => show(gameState, onReturn));
        }, assistantColor, 'View ship, cargo, and captain information');

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

        UI.draw();
    }

    return {
        show
    };
})();
