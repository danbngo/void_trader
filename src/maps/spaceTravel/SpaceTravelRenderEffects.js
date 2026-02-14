/**
 * Space Travel Render Effects
 * Renders visual effects like boost tint, damage flash, warp fade, docking fade
 */

const SpaceTravelRenderEffects = (() => {
    function renderAll(params, timestampMs) {
        const { animation, docking, isPaused, pauseTimestampMs } = params;
        
        animation.renderBoostTint(params, timestampMs, isPaused, pauseTimestampMs);
        animation.renderDamageFlash(params, timestampMs, isPaused, pauseTimestampMs);
        renderDockingFade(docking, timestampMs);
        animation.renderDeathSequence(params, timestampMs, isPaused, pauseTimestampMs);
        animation.renderWarpFade(params, timestampMs, isPaused, pauseTimestampMs);
    }

    function renderDockingFade(docking, timestampMs) {
        if (docking.isDockSequenceActive?.()) {
            docking.renderDockFade?.(timestampMs);
        }
    }

    function renderBoostTint(params, timestampMs) {
        // Delegated to animation.renderBoostTint
        if (params.animation?.renderBoostTint) {
            params.animation.renderBoostTint(params, timestampMs, params.isPaused, params.pauseTimestampMs);
        }
    }

    function renderDamageFlash(params, timestampMs) {
        // Delegated to animation.renderDamageFlash
        if (params.animation?.renderDamageFlash) {
            params.animation.renderDamageFlash(params, timestampMs, params.isPaused, params.pauseTimestampMs);
        }
    }

    function renderDeathSequence(params, timestampMs) {
        // Delegated to animation.renderDeathSequence
        if (params.animation?.renderDeathSequence) {
            params.animation.renderDeathSequence(params, timestampMs, params.isPaused, params.pauseTimestampMs);
        }
    }

    function renderWarpFade(params, timestampMs) {
        // Delegated to animation.renderWarpFade
        if (params.animation?.renderWarpFade) {
            params.animation.renderWarpFade(params, timestampMs, params.isPaused, params.pauseTimestampMs);
        }
    }

    return {
        renderAll,
        renderDockingFade,
        renderBoostTint,
        renderDamageFlash,
        renderDeathSequence,
        renderWarpFade
    };
})();
