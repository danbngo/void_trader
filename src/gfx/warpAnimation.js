/**
 * Warp travel animation
 */

const WarpAnimation = (() => {
    let animationId = null;
    let startTimestamp = 0;
    let lastTimestamp = 0;
    let isActive = false;
    let streaks = [];

    const STREAK_COUNT = 160;
    const BASE_SPEED = 18;
    const SPEED_RAMP = 48;
    const BASE_LENGTH = 2;
    const LENGTH_RAMP = 8;

    function show(gameState, targetSystem, onComplete) {
        stop();
        isActive = true;
        startTimestamp = 0;
        lastTimestamp = 0;
        streaks = buildStreaks(STREAK_COUNT);

        const totalDuration = SpaceTravelConfig.WARP_ANIM_DURATION_MS || 4000;

        const loop = (timestamp) => {
            if (!isActive) {
                return;
            }
            if (!startTimestamp) {
                startTimestamp = timestamp;
            }
            const elapsed = timestamp - startTimestamp;

            render(elapsed, totalDuration, gameState);

            if (elapsed >= totalDuration) {
                stop();
                if (typeof onComplete === 'function') {
                    onComplete(gameState, targetSystem);
                }
                return;
            }

            animationId = requestAnimationFrame(loop);
        };

        animationId = requestAnimationFrame(loop);
    }

    function stop() {
        isActive = false;
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    function buildStreaks(count) {
        const streakData = [];
        for (let i = 0; i < count; i++) {
            streakData.push(spawnStreak());
        }
        return streakData;
    }

    function spawnStreak() {
        return {
            angle: Math.random() * Math.PI * 2,
            offset: Math.random() * 0.5,
            length: BASE_LENGTH + Math.random() * 2
        };
    }

    function render(elapsedMs, totalDuration, gameState) {
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const viewWidth = grid.width;
        const viewHeight = grid.height - SpaceTravelConfig.PANEL_HEIGHT;
        const centerX = (viewWidth - 1) / 2;
        const centerY = (viewHeight - 1) / 2;
        const maxRadius = Math.max(2, Math.min(viewWidth, viewHeight) / 2);

        if (!lastTimestamp) {
            lastTimestamp = elapsedMs;
        }
        const dt = Math.min(0.05, Math.max(0, (elapsedMs - lastTimestamp) / 1000));
        lastTimestamp = elapsedMs;

        const t = Math.min(1, elapsedMs / totalDuration);
        const speed = BASE_SPEED + (SPEED_RAMP * t * t);
        const lengthScale = BASE_LENGTH + (LENGTH_RAMP * t);

        const depthBuffer = RasterUtils.createDepthBuffer(viewWidth, viewHeight);

        streaks.forEach(streak => {
            const dirX = Math.cos(streak.angle);
            const dirY = Math.sin(streak.angle);
            streak.offset += speed * dt;
            if (streak.offset > (maxRadius + 10)) {
                streak.angle = Math.random() * Math.PI * 2;
                streak.offset = Math.random() * 2;
                streak.length = BASE_LENGTH + Math.random() * 2;
            }

            const length = streak.length + lengthScale;
            const startX = centerX + dirX * streak.offset;
            const startY = centerY + dirY * streak.offset;
            const endX = centerX + dirX * (streak.offset + length);
            const endY = centerY + dirY * (streak.offset + length);

            const points = LineDrawer.drawLine(Math.round(startX), Math.round(startY), Math.round(endX), Math.round(endY), true, COLORS.CYAN);
            const symbol = SpaceTravelShared.getLineSymbolFromDirection(dirX, -dirY);
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                    RasterUtils.plotDepthText(depthBuffer, point.x, point.y, 0, symbol, COLORS.CYAN);
                }
            }
        });

        RasterUtils.flushDepthBuffer(depthBuffer);

        SpaceTravelHud.renderHud({
            viewWidth,
            viewHeight,
            playerShip: gameState?.ships?.[0] || null,
            currentGameState: gameState,
            baseMaxSpeed: 0,
            maxSpeed: 0,
            boostActive: false,
            boostCooldownRemaining: 0,
            isPaused: false,
            laserEmptyTimestampMs: 0,
            boostNoFuelTimestampMs: 0,
            timestampMs: performance.now(),
            config: SpaceTravelConfig,
            helpers: {
                applyPauseColor: (color) => color,
                addHudText: (x, y, text, color) => UI.addText(x, y, text, color),
                getActiveTargetInfo: () => null
            },
            autoNavActive: false,
            suppressButtons: true,
            hideDestination: true,
            hideDistance: true,
            hideTime: true,
            speedOverrideText: '???',
            speedOverrideColor: COLORS.CYAN
        });

        UI.draw();

        const tintRamp = SpaceTravelConfig.WARP_TINT_RAMP_MS || totalDuration;
        const tintAlpha = Math.min(1, elapsedMs / tintRamp);
        const ctx = UI.getContext?.();
        const canvas = UI.getCanvas?.();
        if (ctx && canvas && tintAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = tintAlpha;
            ctx.fillStyle = '#00ccff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }

    return {
        show,
        stop
    };
})();
