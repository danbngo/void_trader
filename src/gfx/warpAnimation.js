/**
 * Warp travel animation
 */

const WarpAnimation = (() => {
    let animationId = null;
    let startTimestamp = 0;
    let lastTimestamp = 0;
    let isActive = false;
    let streaks = [];
    let stochasticStreaks = [];

    const STREAK_COUNT = 320; // 2x more frequent
    const BASE_SPEED = 72; // 2x faster (doubled)
    const SPEED_RAMP = 192; // 2x faster ramp (doubled)
    const BASE_LENGTH = 2;
    const LENGTH_RAMP = 8;
    
    const STOCHASTIC_STREAK_COUNT = 200; // Random background lines
    const STOCHASTIC_BASE_SPEED = 144; // 2x faster than circle lines (doubled)
    const STOCHASTIC_SPEED_RAMP = 384; // (doubled)

    function show(gameState, targetSystem, onComplete) {
        stop();
        isActive = true;
        startTimestamp = 0;
        lastTimestamp = 0;
        streaks = buildStreaks(STREAK_COUNT);
        stochasticStreaks = buildStochasticStreaks(STOCHASTIC_STREAK_COUNT);

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

    function buildStochasticStreaks(count) {
        const streakData = [];
        for (let i = 0; i < count; i++) {
            streakData.push(spawnStochasticStreak());
        }
        return streakData;
    }

    function spawnStreak() {
        return {
            angle: Math.random() * Math.PI * 2,
            offset: Math.random() * 0.5,
            length: BASE_LENGTH + Math.random() * 2,
            depth: 0
        };
    }

    function spawnStochasticStreak() {
        return {
            angle: Math.random() * Math.PI * 2,
            offset: Math.random() * 0.5,
            length: BASE_LENGTH + Math.random() * 3,
            depth: Math.random() * 0.5 - 0.25 // Random depth, not aligned
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
        const aspectRatio = SpaceTravelShared.getCharacterAspectRatio(SpaceTravelConfig);
        console.log('[WarpAnimation] circles aspectRatio:', aspectRatio.toFixed(3), 'viewWidth:', viewWidth, 'viewHeight:', viewHeight, 'maxRadiusX:', maxRadius.toFixed(2), 'maxRadiusY (inverted):', (maxRadius / aspectRatio).toFixed(2));

        if (!lastTimestamp) {
            lastTimestamp = elapsedMs;
        }
        const dt = Math.min(0.05, Math.max(0, (elapsedMs - lastTimestamp) / 1000));
        lastTimestamp = elapsedMs;

        const t = Math.min(1, elapsedMs / totalDuration);
        const speed = BASE_SPEED + (SPEED_RAMP * t * t);
        const stochasticSpeed = STOCHASTIC_BASE_SPEED + (STOCHASTIC_SPEED_RAMP * t * t);
        const lengthScale = BASE_LENGTH + (LENGTH_RAMP * t);

        const depthBuffer = RasterUtils.createDepthBuffer(viewWidth, viewHeight);

        // Render stochastic lines first (underneath)
        stochasticStreaks.forEach(streak => {
            const dirX = Math.cos(streak.angle);
            const dirY = Math.sin(streak.angle);
            streak.offset += stochasticSpeed * dt;
            if (streak.offset > (maxRadius + 20)) {
                streak.angle = Math.random() * Math.PI * 2;
                streak.offset = Math.random() * 2;
                streak.length = BASE_LENGTH + Math.random() * 3;
                streak.depth = Math.random() * 0.5 - 0.25;
            }

            const length = streak.length + lengthScale;
            const startX = centerX + dirX * streak.offset / aspectRatio;  // INVERT: divide
            const startY = centerY + dirY * streak.offset;
            const endX = centerX + dirX * (streak.offset + length) / aspectRatio;  // INVERT: divide
            const endY = centerY + dirY * (streak.offset + length);

            const points = LineDrawer.drawLine(Math.round(startX), Math.round(startY), Math.round(endX), Math.round(endY), true, COLORS.TEXT_DIM);
            const symbol = SpaceTravelShared.getLineSymbolFromDirection(dirX, -dirY);
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                if (point.x >= 0 && point.x < viewWidth && point.y >= 0 && point.y < viewHeight) {
                    RasterUtils.plotDepthText(depthBuffer, point.x, point.y, streak.depth + 1, symbol, COLORS.TEXT_DIM);
                }
            }
        });

        // Render ordered circle lines on top
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
            const startX = centerX + dirX * streak.offset / aspectRatio;  // INVERT: divide
            const startY = centerY + dirY * streak.offset;
            const endX = centerX + dirX * (streak.offset + length) / aspectRatio;  // INVERT: divide
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
