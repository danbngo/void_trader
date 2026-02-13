/**
 * Space Travel Render Effects
 * Renders visual effects like boost tint, damage flash, warp fade, docking fade
 */

const SpaceTravelRenderEffects = (() => {
    function renderAll(params, timestampMs) {
        const { animation, docking, isPaused } = params;
        
        animation.renderBoostTint(params, timestampMs);
        animation.renderDamageFlash(params, timestampMs);
        renderDockingFade(docking, timestampMs);
        animation.renderDeathSequence(params, timestampMs);
        animation.renderWarpFade(params, timestampMs);
    }

    function renderDockingFade(docking, timestampMs) {
        if (docking.isDockSequenceActive?.()) {
            docking.renderDockFade?.(timestampMs);
        }
    }

    function renderBoostTint(params, timestampMs) {
        // Delegated to animation.renderBoostTint
        if (params.animation?.renderBoostTint) {
            params.animation.renderBoostTint(params, timestampMs);
        }
    }

    function renderDamageFlash(params, timestampMs) {
        // Delegated to animation.renderDamageFlash
        if (params.animation?.renderDamageFlash) {
            params.animation.renderDamageFlash(params, timestampMs);
        }
    }

    function renderDeathSequence(params, timestampMs) {
        // Delegated to animation.renderDeathSequence
        if (params.animation?.renderDeathSequence) {
            params.animation.renderDeathSequence(params, timestampMs);
        }
    }

    function renderWarpFade(params, timestampMs) {
        // Delegated to animation.renderWarpFade
        if (params.animation?.renderWarpFade) {
            params.animation.renderWarpFade(params, timestampMs);
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
