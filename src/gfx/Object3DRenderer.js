/**
 * Ship renderer
 * Renders ships as single-character directional symbols.
 */

const Object3DRenderer = (() => {
    function getFatArrow(dx, dy) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag <= 0.000001) {
            return '▲';
        }

        const angle = Math.atan2(dy, dx);
        const degrees = angle * (180 / Math.PI);

        if (degrees >= -22.5 && degrees < 22.5) return '▶';
        if (degrees >= 22.5 && degrees < 67.5) return '◢';
        if (degrees >= 67.5 && degrees < 112.5) return '▼';
        if (degrees >= 112.5 && degrees < 157.5) return '◣';
        if (degrees >= 157.5 || degrees < -157.5) return '◀';
        if (degrees >= -157.5 && degrees < -112.5) return '◤';
        if (degrees >= -112.5 && degrees < -67.5) return '▲';
        return '◥';
    }

    function getSingleCharShipArrow(object, visualRotation, playerShip) {
        const velocity = object?.velocity;
        if (velocity) {
            const speed = ThreeDUtils.vecLength(velocity);
            if (speed > 0.000001) {
                const cameraVelocity = ThreeDUtils.rotateVecByQuat(velocity, ThreeDUtils.quatConjugate(playerShip.rotation));
                // Convert camera-space up (+Y) to screen-space up (-Y)
                return getFatArrow(cameraVelocity.x, -cameraVelocity.y);
            }
        }

        const shipForward = { x: 0, y: 0, z: -1 };
        const worldForward = ThreeDUtils.rotateVecByQuat(shipForward, visualRotation);
        const cameraForward = ThreeDUtils.rotateVecByQuat(worldForward, ThreeDUtils.quatConjugate(playerShip.rotation));
        return getFatArrow(cameraForward.x, -cameraForward.y);
    }

    function render(params) {
        const {
            object,
            playerShip,
            viewWidth,
            viewHeight,
            config,
            depthBuffer,
            timestampMs = 0,
            onPickInfo = null
        } = params;

        if (!object || !object.position || !playerShip) {
            return;
        }

        const markShipMaskCell = (x, y) => {
            const mask = params.shipOccupancyMask;
            if (!mask) {
                return;
            }
            if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) {
                return;
            }
            mask[(y * viewWidth) + x] = 1;
        };

        const position = object.position;
        const rotation = object.rotation || { x: 0, y: 0, z: 0, w: 1 };
        const modelForwardCorrection = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI);
        const visualRotation = ThreeDUtils.quatMultiply(rotation, modelForwardCorrection);

        const relative = ThreeDUtils.subVec(position, playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        if (cameraSpace.z < config.NEAR_PLANE) {
            return;
        }

        const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
        if (!projected) {
            return;
        }

        const x = Math.round(projected.x);
        const y = Math.round(projected.y);
        if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) {
            return;
        }

        const flashDuration = config.SHIP_FLASH_DURATION_MS || 1000;
        const flashCount = config.SHIP_FLASH_COUNT || 2;
        let isFlashing = false;
        let flashColor = null;

        if (object.flashStartMs && timestampMs) {
            const flashElapsed = timestampMs - object.flashStartMs;
            if (flashElapsed < flashDuration) {
                const flashPeriod = flashDuration / flashCount;
                const flashPhase = (flashElapsed % flashPeriod) / flashPeriod;
                if (flashPhase < 0.5) {
                    isFlashing = true;
                    flashColor = object.flashColor || '#ffffff';
                }
            } else {
                delete object.flashStartMs;
                delete object.flashColor;
            }
        }

        const isDisabled = (typeof object.hull === 'number' && object.hull <= 0);
        const arrow = getSingleCharShipArrow(object, visualRotation, playerShip);
        let color;
        if (isFlashing && flashColor) {
            color = flashColor;
        } else if (isDisabled) {
            color = '#777777';
        } else {
            color = params.shipColor || (params.isAlly ? COLORS.GREEN : '#00ff00');
        }

        const depthAtSymbol = Math.max(config.NEAR_PLANE, cameraSpace.z);
        RasterUtils.plotDepthText(depthBuffer, x, y, depthAtSymbol, arrow, color);
        markShipMaskCell(x, y);

        if (onPickInfo) {
            onPickInfo({
                object,
                screenX: x,
                screenY: y,
                depth: depthAtSymbol,
                distance: ThreeDUtils.vecLength(relative),
                pickRadius: 2
            });
        }
    }

    function isOnScreen(object, playerShip, viewWidth, viewHeight, config) {
        if (!object || !object.position || !playerShip) {
            return false;
        }

        const relative = ThreeDUtils.subVec(object.position, playerShip.position);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        if (cameraSpace.z < config.NEAR_PLANE) {
            return false;
        }

        const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
        if (!projected) {
            return false;
        }

        const margin = 5;
        return projected.x >= -margin && projected.x < viewWidth + margin &&
               projected.y >= -margin && projected.y < viewHeight + margin;
    }

    return {
        render,
        isOnScreen
    };
})();
