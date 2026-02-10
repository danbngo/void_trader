/**
 * UI Cursor Module - game cursor helpers
 */

const UiCursor = (() => {
    function initCursor(grid) {
        return {
            pos: {
                x: Math.floor(grid.width / 2),
                y: Math.floor(grid.height / 2)
            },
            active: true
        };
    }

    function handleMouseMove(gameCursorEnabled, gameCursorPos, gridX, gridY) {
        if (!gameCursorEnabled) {
            return { pos: gameCursorPos, active: false, didMove: false };
        }
        return {
            pos: { x: gridX, y: gridY },
            active: true,
            didMove: true
        };
    }

    function drawGameCursor(drawTextItem, getGridSize, gameCursorPos) {
        const grid = getGridSize();
        const x = Math.max(0, Math.min(grid.width - 1, gameCursorPos.x));
        const y = Math.max(0, Math.min(grid.height - 1, gameCursorPos.y));
        const color = COLORS.CYAN;
        drawTextItem({ x, y, text: '⊹', color }, true);
    }

    return {
        initCursor,
        handleMouseMove,
        drawGameCursor
    };
})();
