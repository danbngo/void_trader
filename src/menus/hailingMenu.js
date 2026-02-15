/**
 * Hailing Menu
 * Minimal in-flight NPC hail dialogue
 */

const HailingMenu = (() => {
    function show(gameState, fleet, onClose, options = {}) {
        UI.clear();
        UI.clearOutputRow();
        UI.resetSelection();

        const grid = UI.getGridSize();
        const fleetName = fleet?.encounterType?.name || fleet?.typeId || 'Unknown';
        const shipCount = Array.isArray(fleet?.ships) ? fleet.ships.length : 0;
        const title = options.title || 'Hailing Channel';
        const line1 = options.line1 || `${fleetName} Fleet connected.`;
        const line2 = options.line2 || '"Hi there, traveler."';
        const line3 = options.line3 || (shipCount > 1 ? `${shipCount} ships acknowledge your signal.` : null);
        const footer = options.footer || 'No further actions in test mode.';
        const closeLabel = options.closeLabel || 'Close Channel';
        const closeHelp = options.closeHelp || 'Return to 3D travel';

        UI.addTitleLineCentered(0, title);

        let y = 2;
        UI.addText(10, y++, line1, COLORS.CYAN);
        UI.addText(10, y++, line2, COLORS.TEXT_NORMAL);

        if (line3) {
            UI.addText(10, y++, line3, COLORS.TEXT_DIM);
        }

        y++;
        UI.addText(10, y++, footer, COLORS.TEXT_DIM);

        const buttonY = grid.height - 3;
        UI.addCenteredButton(buttonY, '1', closeLabel, () => {
            if (typeof onClose === 'function') {
                onClose();
            }
        }, COLORS.GREEN, closeHelp);

        UI.draw();
    }

    return {
        show
    };
})();
