/**
 * Space Travel Laser logic
 */

const SpaceTravelLaser = (() => {
    function create() {
        let laserFireUntilMs = 0;
        let laserFireStartMs = 0;
        let laserTarget = { x: 0, y: 0 };
        let laserTargetWorldDir = { x: 0, y: 0, z: 1 };
        let lastFireAttemptMs = 0;
        const MIN_FIRE_INTERVAL_MS = 50; // Minimum time between fire attempts to prevent caching

        function reset() {
            laserFireUntilMs = 0;
            laserFireStartMs = 0;
            laserTarget = { x: 0, y: 0 };
            laserTargetWorldDir = { x: 0, y: 0, z: 1 };
        }

        function fireLaser({ playerShip, isPaused, lastHoverPick, config, inputState, boostActive }) {
            if (!playerShip || isPaused) {
                return { laserEmptyTimestampMs: null };
            }
            // Prevent firing while boosting
            if (boostActive) {
                return { laserEmptyTimestampMs: null };
            }
            const currentLaser = Ship.getLaserCurrent(playerShip);
            if (currentLaser <= 0) {
                return { laserEmptyTimestampMs: performance.now() };
            }
            
            // Prevent rapid successive fire attempts (laser caching bug fix)
            const now = performance.now();
            if (now - lastFireAttemptMs < MIN_FIRE_INTERVAL_MS) {
                return { laserEmptyTimestampMs: null };
            }
            lastFireAttemptMs = now;

            laserFireStartMs = now;
            laserFireUntilMs = now + config.LASER_FIRE_DURATION_MS;
            laserTarget = getLaserTarget({ inputState, config });
            laserTargetWorldDir = getLaserTargetWorldDirection({
                target: laserTarget,
                playerShip,
                config
            });
            Ship.setLaserCurrent(playerShip, 0);

            if (lastHoverPick && lastHoverPick.bodyRef) {
                const target = lastHoverPick.bodyRef;
                const damage = Ship.getLaserMax(playerShip);
                if (typeof target.shields === 'number' && target.shields > 0) {
                    const remaining = Math.max(0, target.shields - damage);
                    const overflow = Math.max(0, damage - target.shields);
                    target.shields = remaining;
                    if (overflow > 0 && typeof target.hull === 'number') {
                        target.hull = Math.max(0, target.hull - overflow);
                    }
                } else if (typeof target.hull === 'number') {
                    target.hull = Math.max(0, target.hull - damage);
                }
            }

            return { laserEmptyTimestampMs: null };
        }

        function renderLaserFire({ depthBuffer, viewWidth, viewHeight, timestampMs, config, playerShip }) {
            if (timestampMs < laserFireStartMs || timestampMs > laserFireUntilMs) {
                return;
            }
            const duration = Math.max(1, config.LASER_FIRE_DURATION_MS);
            const progress = Math.min(1, Math.max(0, (timestampMs - laserFireStartMs) / duration));
            const targetScreen = getLaserTargetScreenPosition({ viewWidth, viewHeight, config, playerShip });
            const targetX = Math.max(0, Math.min(viewWidth - 1, Math.floor(targetScreen.x)));
            const targetY = Math.max(0, Math.min(viewHeight - 1, Math.floor(targetScreen.y)));
            let pulseT = 0;
            if (progress >= 0.25 && progress < 0.5) {
                pulseT = (progress - 0.25) / 0.25;
            } else if (progress >= 0.5 && progress < 0.75) {
                pulseT = 1 - ((progress - 0.5) / 0.25);
            }
            const laserColor = SpaceTravelShared.lerpColorHex(config.LASER_COLOR, '#ffffff', pulseT);

            const leftPoints = LineDrawer.drawLine(0, viewHeight - 1, targetX, targetY, true, config.LASER_COLOR);
            const rightPoints = LineDrawer.drawLine(viewWidth - 1, viewHeight - 1, targetX, targetY, true, config.LASER_COLOR);

            const renderPoints = (points) => {
                if (points.length === 0) {
                    return;
                }
                if (progress < 0.5) {
                    const growT = progress / 0.5;
                    const endIndex = Math.max(0, Math.floor(points.length * growT) - 1);
                    for (let i = 0; i <= endIndex; i++) {
                        const point = points[i];
                        RasterUtils.plotDepthText(depthBuffer, point.x, point.y, config.LASER_DEPTH, point.symbol, laserColor);
                    }
                } else {
                    const shrinkT = (progress - 0.5) / 0.5;
                    const startIndex = Math.min(points.length, Math.floor(points.length * shrinkT));
                    for (let i = startIndex; i < points.length; i++) {
                        const point = points[i];
                        RasterUtils.plotDepthText(depthBuffer, point.x, point.y, config.LASER_DEPTH, point.symbol, laserColor);
                    }
                }
            };

            renderPoints(leftPoints);
            renderPoints(rightPoints);
        }

        function getLaserTarget({ inputState, config }) {
            const grid = UI.getGridSize();
            const viewWidth = grid.width;
            const viewHeight = grid.height - config.PANEL_HEIGHT;
            const mouseState = SpaceTravelInput.getMouseTargetState(viewWidth, viewHeight, inputState);
            if (mouseState && mouseState.active) {
                return { x: mouseState.displayX, y: mouseState.displayY };
            }
            return {
                x: Math.floor(viewWidth / 2),
                y: Math.floor(viewHeight / 2)
            };
        }

        function getLaserTargetWorldDirection({ target, playerShip, config }) {
            const grid = UI.getGridSize();
            const viewWidth = grid.width;
            const viewHeight = grid.height - config.PANEL_HEIGHT;
            const cameraDir = RasterUtils.screenRayDirection(target.x, target.y, viewWidth, viewHeight, config.VIEW_FOV);
            return ThreeDUtils.rotateVecByQuat(cameraDir, playerShip.rotation);
        }

        function getLaserTargetScreenPosition({ viewWidth, viewHeight, config, playerShip }) {
            if (!laserTargetWorldDir) {
                return laserTarget;
            }
            const cameraDir = ThreeDUtils.rotateVecByQuat(laserTargetWorldDir, ThreeDUtils.quatConjugate(playerShip.rotation));
            const projected = RasterUtils.projectCameraSpacePointRaw(cameraDir, viewWidth, viewHeight, config.VIEW_FOV);
            if (!projected) {
                return { x: viewWidth / 2, y: viewHeight / 2 };
            }
            return { x: projected.x, y: projected.y };
        }

        return {
            reset,
            fireLaser,
            renderLaserFire
        };
    }

    return {
        create
    };
})();
