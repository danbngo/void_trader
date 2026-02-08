/**
 * Docking animation
 */

const DockingAnimation = (() => {
    let animationId = null;
    let startTimestamp = 0;
    let isActive = false;
    let squares = [];
    let lastTimestamp = 0;
    let frameCounter = 0;

    const DIM_DURATION_MS = 1000;
    const ANIMATION_DURATION_MS = 2000;
    const TOTAL_DURATION_MS = DIM_DURATION_MS + ANIMATION_DURATION_MS;
    const SQUARE_COUNT = 10;
    const Z_SPAWN_MIN = 20.0;
    const Z_SPAWN_MAX = 60.0;
    const Z_RESET_MIN = 0.05;
    const Z_SPEED = 13.6;
    const SQUARE_SIZE = 1.4;
    const VIEW_FOV = 75;

    function show(gameState, onComplete) {
        stop();
        isActive = true;
        startTimestamp = 0;
        lastTimestamp = 0;
        frameCounter = 0;
        squares = buildSquares(SQUARE_COUNT);

        const loop = (timestamp) => {
            if (!isActive) {
                return;
            }
            if (!startTimestamp) {
                startTimestamp = timestamp;
            }
            const elapsed = timestamp - startTimestamp;

            frameCounter += 1;
            if (frameCounter % 30 === 0) {
                const sampleZ = squares[0] ? squares[0].z.toFixed(2) : 'n/a';
                console.log('[DockingAnimation] frame', frameCounter, 'elapsedMs', Math.floor(elapsed), 'sampleZ', sampleZ);
            }

            render(elapsed);

            if (elapsed >= TOTAL_DURATION_MS) {
                stop();
                if (typeof onComplete === 'function') {
                    onComplete(gameState);
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

    function buildSquares(count) {
        const squaresData = [];
        const range = Z_SPAWN_MAX - Z_SPAWN_MIN;
        const spacing = range / count;
        for (let i = 0; i < count; i++) {
            squaresData.push(spawnSquare(Z_SPAWN_MIN + i * spacing));
        }
        return squaresData;
    }

    function spawnSquare(zValue) {
        return {
            z: zValue ?? (Z_SPAWN_MIN + Math.random() * (Z_SPAWN_MAX - Z_SPAWN_MIN)),
            offsetX: (Math.random() * 2 - 1) * 0.05,
            offsetY: (Math.random() * 2 - 1) * 0.05
        };
    }

    function render(elapsedMs) {
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const viewWidth = grid.width;
        const viewHeight = grid.height;
        const centerX = Math.floor(viewWidth / 2);
        const centerY = Math.floor((viewHeight - 7) / 2);

        if (elapsedMs <= DIM_DURATION_MS) {
            const t = Math.min(1, elapsedMs / DIM_DURATION_MS);
            const shade = Math.floor(136 * (1 - t));
            const hex = shade.toString(16).padStart(2, '0');
            const color = `#${hex}${hex}${hex}`;
            for (let y = 0; y < viewHeight; y++) {
                UI.addText(0, y, ' '.repeat(viewWidth), color);
            }
            UI.draw();
            return;
        }

        for (let y = 0; y < viewHeight; y++) {
            UI.addText(0, y, ' '.repeat(viewWidth), COLORS.BLACK);
        }

        if (!lastTimestamp) {
            lastTimestamp = elapsedMs;
        }
        const dt = Math.min(0.05, Math.max(0, (elapsedMs - lastTimestamp) / 1000));
        lastTimestamp = elapsedMs;

        const animElapsed = Math.max(0, elapsedMs - DIM_DURATION_MS);
        const animT = Math.min(1, animElapsed / ANIMATION_DURATION_MS);
        const speedScale = 0.5 + (1.5 * animT);
        const speed = Z_SPEED * speedScale;

        const depthBuffer = RasterUtils.createDepthBuffer(viewWidth, viewHeight);

        let drawnSegments = 0;
        squares.forEach(square => {
            square.z -= speed * dt;
            if (square.z <= Z_RESET_MIN) {
                square.z = Z_SPAWN_MAX;
            }

            const cx = square.offsetX;
            const cy = square.offsetY;
            const z = square.z;
            const s = SQUARE_SIZE;

            const corners = [
                { x: cx - s, y: cy - s, z },
                { x: cx + s, y: cy - s, z },
                { x: cx + s, y: cy + s, z },
                { x: cx - s, y: cy + s, z }
            ];

            const projected = corners.map(corner => RasterUtils.projectCameraSpacePointRaw(corner, viewWidth, viewHeight, VIEW_FOV));
            if (projected.some(p => !p)) {
                return;
            }

            const xs = projected.map(p => Math.round(p.x));
            const ys = projected.map(p => Math.round(p.y));
            const left = Math.min(...xs);
            const right = Math.max(...xs);
            const top = Math.min(...ys);
            const bottom = Math.max(...ys);

            if (right - left < 1 || bottom - top < 1) {
                return;
            }

            RasterUtils.plotDepthText(depthBuffer, left, top, z, '┌', COLORS.LIGHT_GRAY);
            RasterUtils.plotDepthText(depthBuffer, right, top, z, '┐', COLORS.LIGHT_GRAY);
            RasterUtils.plotDepthText(depthBuffer, left, bottom, z, '└', COLORS.LIGHT_GRAY);
            RasterUtils.plotDepthText(depthBuffer, right, bottom, z, '┘', COLORS.LIGHT_GRAY);
            drawnSegments += 4;

            for (let x = left + 1; x < right; x++) {
                RasterUtils.plotDepthText(depthBuffer, x, top, z, '─', COLORS.LIGHT_GRAY);
                RasterUtils.plotDepthText(depthBuffer, x, bottom, z, '─', COLORS.LIGHT_GRAY);
                drawnSegments += 2;
            }
            for (let y = top + 1; y < bottom; y++) {
                RasterUtils.plotDepthText(depthBuffer, left, y, z, '│', COLORS.LIGHT_GRAY);
                RasterUtils.plotDepthText(depthBuffer, right, y, z, '│', COLORS.LIGHT_GRAY);
                drawnSegments += 2;
            }
        });

        RasterUtils.flushDepthBuffer(depthBuffer);
        UI.draw();

        if (frameCounter % 30 === 0) {
            UI.logScreenToConsole();
            console.log('[DockingAnimation] drawnSegments', drawnSegments);
        }
    }

    return {
        show,
        stop
    };
})();
