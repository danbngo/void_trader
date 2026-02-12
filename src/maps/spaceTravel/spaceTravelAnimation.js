/**
 * Space Travel Visual Effects & Animation
 * Handles boost tints, damage flashes, death sequences, etc.
 */

const SpaceTravelAnimation = (() => {
    function create(config) {
        function renderBoostTint(mapInstance, timestampMs) {
            const { boostActive, boostEndTimestampMs, boostStartTimestampMs } = mapInstance;
            
            // DEBUG: Log boost tint state
            if (boostActive || (boostEndTimestampMs && boostEndTimestampMs > 0)) {
                console.log('[BoostTint]', {
                    boostActive,
                    boostStartTimestampMs,
                    boostEndTimestampMs,
                    timestampMs,
                    shouldRender: !boostActive && boostEndTimestampMs > 0 ? true : boostActive
                });
            }
            
            if (!boostActive && (!boostEndTimestampMs || boostEndTimestampMs <= 0)) return;

            const rampSec = Math.max(0.1, config.BOOST_TINT_RAMP_SEC || 1);
            const fadeSec = Math.max(0.1, (config.BOOST_TINT_FADE_SEC ?? config.BOOST_COOLDOWN_SEC) || 1);
            let alpha = 0;

            if (boostActive) {
                const elapsedSec = Math.max(0, (timestampMs - boostStartTimestampMs) / 1000);
                const timeRatio = Math.min(1, elapsedSec / rampSec);
                alpha = config.BOOST_TINT_MAX * timeRatio;
                alpha = Math.max(alpha, config.BOOST_TINT_MIN);
            } else {
                const elapsedFade = Math.max(0, (timestampMs - boostEndTimestampMs) / 1000);
                const fadeT = Math.max(0, 1 - (elapsedFade / fadeSec));
                alpha = config.BOOST_TINT_MAX * fadeT;
                if (fadeT <= 0) mapInstance.boostEndTimestampMs = 0;
            }

            console.log('[BoostTint-Alpha]', { alpha, boostActive, configMax: config.BOOST_TINT_MAX, configMin: config.BOOST_TINT_MIN });

            if (alpha > 0) {
                const ctx = UI.getContext?.();
                const canvas = UI.getCanvas?.();
                console.log('[BoostTint-Canvas]', { hasCtx: !!ctx, hasCanvas: !!canvas });
                
                if (ctx && canvas) {
                    console.log('[BoostTint-Drawing]', { alpha, canvasSize: { width: canvas.width, height: canvas.height } });
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = '#ff8a00';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();
                } else {
                    console.log('[BoostTint-NO_CANVAS]', 'Cannot render - missing ctx or canvas');
                }
            }
        }

        function renderDamageFlash(mapInstance, timestampMs) {
            const { damageFlashStartMs } = mapInstance;
            const flashElapsed = timestampMs - damageFlashStartMs;
            if (flashElapsed < 0 || flashElapsed > config.DAMAGE_FLASH_DURATION_MS) return;

            const t = flashElapsed / config.DAMAGE_FLASH_DURATION_MS;
            const alpha = t < 0.5
                ? (config.DAMAGE_FLASH_ALPHA * (t / 0.5))
                : (config.DAMAGE_FLASH_ALPHA * (1 - ((t - 0.5) / 0.5)));

            const ctx = UI.getContext?.();
            const canvas = UI.getCanvas?.();
            if (ctx && canvas) {
                const rect = canvas.getBoundingClientRect();
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, rect.width, rect.height);
                ctx.restore();
            }
        }

        function renderDeathSequence(mapInstance, timestampMs) {
            const { deathTow } = mapInstance;
            if (!deathTow.isDeathSequenceActive()) return;

            const redSec = Math.max(0.01, config.DEATH_FADE_TO_RED_SEC || 1);
            const blackSec = Math.max(0.01, config.DEATH_FADE_TO_BLACK_SEC || 1);
            const elapsedSec = Math.max(0, (timestampMs - deathTow.getDeathSequenceStartMs()) / 1000);
            const redT = Math.min(1, elapsedSec / redSec);
            const blackT = Math.min(1, Math.max(0, (elapsedSec - redSec) / blackSec));

            const ctx = UI.getContext?.();
            const canvas = UI.getCanvas?.();
            if (!ctx || !canvas) return;

            const rect = canvas.getBoundingClientRect();
            if (redT > 0) {
                ctx.save();
                ctx.globalAlpha = redT;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, rect.width, rect.height);
                ctx.restore();
            }
            if (blackT > 0) {
                ctx.save();
                ctx.globalAlpha = blackT;
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, rect.width, rect.height);
                ctx.restore();
            }
        }

        function renderWarpFade(mapInstance, timestampMs) {
            const startMs = mapInstance.warpFadeOutStartMs;
            if (!startMs) return;

            const duration = Math.max(1, config.WARP_FADE_OUT_MS || 1000);
            const elapsed = timestampMs - startMs;
            const t = Math.min(1, Math.max(0, elapsed / duration));
            const alpha = 1 - t;

            if (alpha <= 0) {
                mapInstance.warpFadeOutStartMs = 0;
                return;
            }

            const ctx = UI.getContext?.();
            const canvas = UI.getCanvas?.();
            if (!ctx || !canvas) return;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#00ccff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        return {
            renderBoostTint,
            renderDamageFlash,
            renderDeathSequence,
            renderWarpFade
        };
    }

    return {
        create
    };
})();
