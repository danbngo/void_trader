/**
 * Space Travel Laser logic
 */

const SpaceTravelLaser = (() => {
    function create() {
        let laserFireUntilMs = 0;
        let laserFireStartMs = 0;
        let laserTarget = { x: 0, y: 0 };
        let laserTargetWorldDir = { x: 0, y: 0, z: 1 };
        let laserBeamLength = 5; // Length of laser beam in characters (minimum)
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
                return { 
                    laserEmptyTimestampMs: null,
                    flashMessage: 'Cannot fire lasers while boosting'
                };
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
            
            // Calculate beam length based on laser rating: 5 + laserRating
            const laserRating = Ship.getLaserMax(playerShip);
            laserBeamLength = 5 + laserRating;
            
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
                
                // Beam travels from start to end as a moving segment of fixed length
                // Front edge position travels from -beamLength (hidden) to points.length (passed through)
                const totalDistance = points.length + laserBeamLength;
                const frontPos = progress * totalDistance - laserBeamLength;
                
                // Render the segment of the beam currently visible on the path
                const startIndex = Math.max(0, Math.ceil(frontPos));
                const endIndex = Math.min(points.length - 1, Math.floor(frontPos + laserBeamLength));
                
                for (let i = startIndex; i <= endIndex; i++) {
                    const point = points[i];
                    RasterUtils.plotDepthText(depthBuffer, point.x, point.y, config.LASER_DEPTH, point.symbol, laserColor);
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
            
            let result;
            if (mouseState && mouseState.active) {
                result = { x: mouseState.displayX, y: mouseState.displayY };
            } else {
                result = {
                    x: Math.floor(viewWidth / 2),
                    y: Math.floor(viewHeight / 2)
                };
            }
            return result;
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
            
            // Scale direction to a proper depth for projection (100 AU works well)
            // projectCameraSpacePointRaw expects a 3D point in camera space, not a unit direction
            const projectionDepth = 100;
            const cameraPoint = {
                x: cameraDir.x * projectionDepth,
                y: cameraDir.y * projectionDepth,
                z: cameraDir.z * projectionDepth
            };
            
            const projected = RasterUtils.projectCameraSpacePointRaw(cameraPoint, viewWidth, viewHeight, config.VIEW_FOV);
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
