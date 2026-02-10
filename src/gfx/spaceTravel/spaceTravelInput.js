/**
 * Space Travel Map input helpers
 */

const SpaceTravelInput = (() => {
    function setupInput({ keyState, handlers, setPaused, getPaused, getPausedByFocus, onEscape, onTogglePause }) {
        handlers.keyDownHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onEscape();
                return;
            }
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                onTogglePause();
                return;
            }
            keyState.add(e.key);
        };
        handlers.keyUpHandler = (e) => {
            keyState.delete(e.key);
        };
        document.addEventListener('keydown', handlers.keyDownHandler);
        document.addEventListener('keyup', handlers.keyUpHandler);

        handlers.windowBlurHandler = () => {
            if (!getPaused()) {
                setPaused(true, true);
            }
        };
        handlers.windowFocusHandler = () => {
            if (getPausedByFocus()) {
                setPaused(false, false);
            }
        };
        window.addEventListener('blur', handlers.windowBlurHandler);
        window.addEventListener('focus', handlers.windowFocusHandler);
    }

    function setupMouseTargeting({ handlers, config, getLastHoverPick, onPick }) {
        const canvas = UI.getCanvas?.();
        if (!canvas) {
            return;
        }
        const grid = UI.getGridSize();
        const viewWidth = grid.width;
        const viewHeight = grid.height - config.PANEL_HEIGHT;
        handlers.mouseTarget = {
            x: Math.floor(viewWidth / 2),
            y: Math.floor(viewHeight / 2)
        };
        handlers.mouseTargetActive = true;
        handlers.mouseMoveHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const charDims = UI.getCharDimensions();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;
            const gridX = Math.floor(pixelX / charDims.width);
            const gridY = Math.floor(pixelY / charDims.height);
            handlers.mouseTarget = { x: gridX, y: gridY };
            handlers.mouseTargetActive = true;
        };
        document.addEventListener('mousemove', handlers.mouseMoveHandler);

        handlers.mouseDownHandler = (e) => {
            if (e.button !== 0) {
                return;
            }
            const pick = getLastHoverPick();
            if (pick) {
                onPick(pick);
            }
        };
        document.addEventListener('mousedown', handlers.mouseDownHandler);
    }

    function getMouseTargetState(viewWidth, viewHeight, handlers) {
        if (!handlers.mouseTargetActive) {
            return { active: false };
        }
        const rawX = handlers.mouseTarget.x;
        const rawY = handlers.mouseTarget.y;
        const inView = rawX >= 0 && rawX < viewWidth && rawY >= 0 && rawY < viewHeight;
        const displayX = Math.max(0, Math.min(viewWidth - 1, rawX));
        const displayY = Math.max(0, Math.min(viewHeight - 1, rawY));
        return {
            active: true,
            rawX,
            rawY,
            inView,
            displayX,
            displayY,
            offLeft: rawX < 0,
            offRight: rawX >= viewWidth,
            offTop: rawY < 0,
            offBottom: rawY >= viewHeight
        };
    }

    return {
        setupInput,
        setupMouseTargeting,
        getMouseTargetState
    };
})();
