/**
 * Space Travel Visual Effects & Animation
 * Handles boost tints, damage flashes, death sequences, etc.
 */

const SpaceTravelAnimation = (() => {
    function create(config) {
        function renderBoostTint(mapInstance, timestampMs, isPaused, pausedTimestamp) {
            const { boostActive, boostEndTimestampMs, boostStartTimestampMs } = mapInstance;
            
            if (!boostActive && (!boostEndTimestampMs || boostEndTimestampMs <= 0)) {
                // Clear tint when not active
                ColorTinting?.clearTint?.();
                return;
            }

            // When paused, use the frozen pause timestamp for calculations to prevent time desync
            const effectiveTimestampMs = isPaused && pausedTimestamp ? pausedTimestamp : timestampMs;

            const rampSec = Math.max(0.1, config.BOOST_TINT_RAMP_SEC || 1);
            const fadeSec = Math.max(0.1, (config.BOOST_TINT_FADE_SEC ?? config.BOOST_COOLDOWN_SEC) || 1);
            let alpha = 0;

            if (boostActive) {
                const elapsedSec = Math.max(0, (effectiveTimestampMs - boostStartTimestampMs) / 1000);
                const timeRatio = Math.min(1, elapsedSec / rampSec);
                alpha = config.BOOST_TINT_MAX * timeRatio;
                alpha = Math.max(alpha, config.BOOST_TINT_MIN);
            } else {
                const elapsedFade = Math.max(0, (effectiveTimestampMs - boostEndTimestampMs) / 1000);
                const fadeT = Math.max(0, 1 - (elapsedFade / fadeSec));
                alpha = config.BOOST_TINT_MAX * fadeT;
                if (fadeT <= 0) mapInstance.boostEndTimestampMs = 0;
            }

            if (alpha > 0) {
                // Use character-level tinting instead of full-screen canvas tint
                ColorTinting?.setTint?.('#ff8a00', alpha);
            } else {
                ColorTinting?.clearTint?.();
            }
        }

        function renderDamageFlash(mapInstance, timestampMs, isPaused, pausedTimestamp) {
            const { damageFlashStartMs } = mapInstance;
            
            // When paused, use the frozen pause timestamp for calculations to prevent time desync
            const effectiveTimestampMs = isPaused && pausedTimestamp ? pausedTimestamp : timestampMs;
            
            const flashElapsed = effectiveTimestampMs - damageFlashStartMs;
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

        function renderDeathSequence(mapInstance, timestampMs, isPaused, pausedTimestamp) {
            const { deathTow } = mapInstance;
            if (!deathTow.isDeathSequenceActive()) return;

            // When paused, use the frozen pause timestamp for calculations to prevent time desync
            const effectiveTimestampMs = isPaused && pausedTimestamp ? pausedTimestamp : timestampMs;

            const redSec = Math.max(0.01, config.DEATH_FADE_TO_RED_SEC || 1);
            const blackSec = Math.max(0.01, config.DEATH_FADE_TO_BLACK_SEC || 1);
            const elapsedSec = Math.max(0, (effectiveTimestampMs - deathTow.getDeathSequenceStartMs()) / 1000);
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

        function renderWarpFade(mapInstance, timestampMs, isPaused, pausedTimestamp) {
            const startMs = mapInstance.warpFadeOutStartMs;
            if (!startMs) {
                ColorTinting?.clearTint?.();
                return;
            }

            // When paused, use the frozen pause timestamp for calculations to prevent time desync
            const effectiveTimestampMs = isPaused && pausedTimestamp ? pausedTimestamp : timestampMs;

            const duration = Math.max(1, config.WARP_FADE_OUT_MS || 1000);
            const elapsed = effectiveTimestampMs - startMs;
            const t = Math.min(1, Math.max(0, elapsed / duration));
            const alpha = 1 - t;

            if (alpha <= 0) {
                mapInstance.warpFadeOutStartMs = 0;
                ColorTinting?.clearTint?.();
                return;
            }

            // Use character-level tinting instead of full-screen canvas tint
            ColorTinting?.setTint?.('#00ccff', alpha);
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
