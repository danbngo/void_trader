/**
 * UI Animations Module - flashing helpers
 */

const UiAnimations = (() => {
    function createFlashingState() {
        return {
            flashInterval: null,
            flashCallback: null,
            flashStartTime: null,
            flashState: false,
            isInFlashCallback: false
        };
    }

    function startFlashing(state, uiLog, callback, interval = 200, duration = 2000, callImmediately = false) {
        stopFlashing(state, uiLog);

        uiLog('[UI] startFlashing called:', { interval, duration, callImmediately });

        state.flashCallback = callback;
        state.flashStartTime = Date.now();

        if (callImmediately && state.flashCallback) {
            uiLog('[UI] Calling flash callback immediately');
            state.isInFlashCallback = true;
            state.flashCallback();
        }

        state.flashInterval = setInterval(() => {
            if (duration > 0 && Date.now() - state.flashStartTime >= duration) {
                uiLog('[UI] Flash duration expired, stopping flash');
                stopFlashing(state, uiLog);
                return;
            }

            state.flashState = !state.flashState;
            uiLog('[UI] Flash state toggled to:', state.flashState);

            if (state.flashCallback) {
                state.isInFlashCallback = true;
                state.flashCallback();
                state.isInFlashCallback = false;
            }
        }, interval);

        uiLog('[UI] Flash interval started with ID:', state.flashInterval);

        setTimeout(() => {
            state.isInFlashCallback = false;
            uiLog('[UI] isInFlashCallback reset to false');
        }, 50);
    }

    function stopFlashing(state, uiLog) {
        if (state.flashInterval) {
            uiLog('[UI] stopFlashing called, clearing interval:', state.flashInterval);
            clearInterval(state.flashInterval);
            state.flashInterval = null;
        }
        state.flashCallback = null;
        state.flashStartTime = null;
        state.flashState = false;
    }

    function isFlashing(state) {
        return state.flashInterval !== null;
    }

    function getFlashState(state) {
        return state.flashState;
    }

    function isInFlashCallback(state) {
        return state.isInFlashCallback;
    }

    return {
        createFlashingState,
        startFlashing,
        stopFlashing,
        isFlashing,
        getFlashState,
        isInFlashCallback
    };
})();
