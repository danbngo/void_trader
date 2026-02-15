/**
 * Hailing Menu
 * Minimal in-flight NPC hail dialogue
 */

const HailingMenu = (() => {
    function show(gameState, fleet, onClose) {
        UI.clear();
        UI.clearOutputRow();
        UI.resetSelection();

        const grid = UI.getGridSize();
        const fleetName = fleet?.encounterType?.name || fleet?.typeId || 'Unknown';
        const shipCount = Array.isArray(fleet?.ships) ? fleet.ships.length : 0;

        UI.addTitleLineCentered(0, 'Hailing Channel');

        let y = 2;
        UI.addText(10, y++, `${fleetName} Fleet connected.`, COLORS.CYAN);
        UI.addText(10, y++, `"Hi there, traveler."`, COLORS.TEXT_NORMAL);

        if (shipCount > 1) {
            UI.addText(10, y++, `${shipCount} ships acknowledge your signal.`, COLORS.TEXT_DIM);
        }

        y++;
        UI.addText(10, y++, 'No further actions in test mode.', COLORS.TEXT_DIM);

        const buttonY = grid.height - 3;
        UI.addCenteredButton(buttonY, '1', 'Close Channel', () => {
            if (typeof onClose === 'function') {
                onClose();
            }
        }, COLORS.GREEN, 'Return to 3D travel');

        UI.draw();
    }

    return {
        show
    };
})();
