/**
 * Ship renderer
 * Renders ships as directional symbols or angle-based sprite glyphs.
 */

const Object3DRenderer = (() => {
    const SIDE_VIEWPORT_GLYPHS = new Set(['v', '^']);
    const DEFAULT_VIEWPORT_GLYPHS = new Set(['v', '^', '<', '>']);

    const FALLBACK_SHIP_SPRITES = {
        topside: {
            right: ['◣', '██▶', '◤'],
            left: ['  ◢', '◀██', '  ◥'],
            down: ['◥██◤', ' ◥◤'],
            up: [' ◢◣', '◢██◣']
        },
        underside: {
            right: ['◣', '██▶', '◤'],
            left: ['  ◢', '◀██', '  ◥'],
            down: ['◥██◤', ' ◥◤'],
            up: [' ◢◣', '◢██◣']
        },
        side: {
            left: ['◢██', '  ◥'],
            right: ['██◣', '◤'],
            upBellyLeft: [' ◣', '◢██'],
            upBellyRight: [' ◢', '██◣'],
            downBellyRight: ['██◤', ' ◥'],
            downBellyLeft: ['◢██', ' ◤']
        },
        nose: {
            bellyDown: ['◢█v█◣'],
            bellyLeft: [' ◣', '<█', ' ◤'],
            bellyRight: ['◢', '█>', '◥'],
            bellyUp: ['◥█^█◤']
        },
        back: {
            bellyDown: ['◢███◣'],
            bellyLeft: ['◣', '██', '◤'],
            bellyRight: ['◢', '██', '◥'],
            bellyUp: ['◥███◤']
        }
    };

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
        const getDepthArrow = (cameraVec) => {
            if (!cameraVec) {
                return null;
            }
            const depthAbs = Math.abs(cameraVec.z || 0);
            const lateralAbs = Math.max(Math.abs(cameraVec.x || 0), Math.abs(cameraVec.y || 0));
            if (depthAbs <= lateralAbs) {
                return null;
            }
            return (cameraVec.z || 0) < 0 ? '⮟' : '⮝';
        };

        const velocity = object?.velocity;
        if (velocity) {
            const speed = ThreeDUtils.vecLength(velocity);
            if (speed > 0.000001) {
                const cameraVelocity = ThreeDUtils.rotateVecByQuat(velocity, ThreeDUtils.quatConjugate(playerShip.rotation));
                const depthArrow = getDepthArrow(cameraVelocity);
                if (depthArrow) {
                    return depthArrow;
                }
                // Convert camera-space up (+Y) to screen-space up (-Y)
                return getFatArrow(cameraVelocity.x, -cameraVelocity.y);
            }
        }

        const shipForward = { x: 0, y: 0, z: -1 };
        const worldForward = ThreeDUtils.rotateVecByQuat(shipForward, visualRotation);
        const cameraForward = ThreeDUtils.rotateVecByQuat(worldForward, ThreeDUtils.quatConjugate(playerShip.rotation));
        const depthArrow = getDepthArrow(cameraForward);
        if (depthArrow) {
            return depthArrow;
        }
        return getFatArrow(cameraForward.x, -cameraForward.y);
    }

    function getCardinalDirection(x, y) {
        if (Math.abs(x) >= Math.abs(y)) {
            return x >= 0 ? 'right' : 'left';
        }
        return y >= 0 ? 'down' : 'up';
    }

    function getBellyDirection(cameraUp) {
        const bellyX = -cameraUp.x;
        const bellyY = cameraUp.y;
        const cardinal = getCardinalDirection(bellyX, bellyY);
        if (cardinal === 'up') return 'bellyUp';
        if (cardinal === 'down') return 'bellyDown';
        if (cardinal === 'left') return 'bellyLeft';
        return 'bellyRight';
    }

    function selectShipSpriteLines(cameraForward, cameraUp, shipSprites) {
        const tagSpriteLines = (lines, spriteGroup) => {
            if (!Array.isArray(lines)) {
                return null;
            }
            const taggedLines = [...lines];
            taggedLines._spriteGroup = spriteGroup;
            return taggedLines;
        };

        const sprites = shipSprites || FALLBACK_SHIP_SPRITES;
        const forwardScreenX = -cameraForward.x;
        const forwardScreenY = -cameraForward.y;
        const forwardCardinal = getCardinalDirection(forwardScreenX, forwardScreenY);
        const bellyDirection = getBellyDirection(cameraUp);
        const rearBellyDirection = bellyDirection === 'bellyLeft'
            ? 'bellyRight'
            : (bellyDirection === 'bellyRight' ? 'bellyLeft' : bellyDirection);

        if (cameraForward.z <= -0.65) {
            return tagSpriteLines(sprites.back?.[rearBellyDirection] || null, 'back');
        }

        if (cameraForward.z >= 0.65) {
            return tagSpriteLines(sprites.nose?.[bellyDirection] || null, 'nose');
        }

        if (Math.abs(cameraForward.z) <= 0.25) {
            if (forwardCardinal === 'left') return tagSpriteLines(sprites.side?.left || null, 'side');
            if (forwardCardinal === 'right') return tagSpriteLines(sprites.side?.right || null, 'side');

            const bellyX = -cameraUp.x;
            if (forwardCardinal === 'up') {
                return tagSpriteLines(
                    bellyX < 0 ? (sprites.side?.downBellyLeft || null) : (sprites.side?.downBellyRight || null),
                    'side'
                );
            }
            return tagSpriteLines(
                bellyX < 0 ? (sprites.side?.upBellyLeft || null) : (sprites.side?.upBellyRight || null),
                'side'
            );
        }

        const isTopside = cameraUp.z < 0;
        const bankSet = isTopside ? sprites.topside : sprites.underside;
        return tagSpriteLines(bankSet?.[forwardCardinal] || null, isTopside ? 'topside' : 'underside');
    }

    function renderShipSprite(depthBuffer, centerX, centerY, depth, lines, color, plotCell) {
        if (!Array.isArray(lines) || lines.length === 0) {
            return { plotted: 0, pickRadius: 2 };
        }

        const viewportGlyphs = lines?._spriteGroup === 'side' ? SIDE_VIEWPORT_GLYPHS : DEFAULT_VIEWPORT_GLYPHS;
        const exhaustColor = COLORS.ORANGE || '#FFA500';
        const viewportColor = COLORS.CYAN || '#00FFFF';

        const width = lines.reduce((max, line) => Math.max(max, (line || '').length), 0);
        const height = lines.length;
        const startX = centerX - Math.floor(width / 2);
        const startY = centerY - Math.floor(height / 2);
        let plotted = 0;

        for (let row = 0; row < lines.length; row++) {
            const line = lines[row] || '';
            for (let col = 0; col < line.length; col++) {
                const glyph = line[col];
                if (glyph === ' ') {
                    continue;
                }
                const px = startX + col;
                const py = startY + row;
                let glyphColor = color;
                if (glyph === 'o') {
                    glyphColor = exhaustColor;
                } else if (viewportGlyphs.has(glyph)) {
                    glyphColor = viewportColor;
                }

                if (RasterUtils.plotDepthText(depthBuffer, px, py, depth, glyph, glyphColor)) {
                    plotted += 1;
                }
                plotCell(px, py);
            }
        }

        return {
            plotted,
            pickRadius: Math.max(2, Math.ceil(Math.max(width, height) / 2))
        };
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
        const distanceAU = ThreeDUtils.vecLength(relative);
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
        const shipForward = { x: 0, y: 0, z: -1 };
        const shipUp = { x: 0, y: 1, z: 0 };
        const worldForward = ThreeDUtils.rotateVecByQuat(shipForward, visualRotation);
        const worldUp = ThreeDUtils.rotateVecByQuat(shipUp, visualRotation);
        const cameraForward = ThreeDUtils.rotateVecByQuat(worldForward, ThreeDUtils.quatConjugate(playerShip.rotation));
        const cameraUp = ThreeDUtils.rotateVecByQuat(worldUp, ThreeDUtils.quatConjugate(playerShip.rotation));

        const spriteDistanceLimit = (typeof config.SHIP_SPRITE_MAX_DISTANCE_AU === 'number')
            ? config.SHIP_SPRITE_MAX_DISTANCE_AU
            : 1;
        const canRenderSprite = config.SHIP_USE_ANGLE_SPRITES !== false && distanceAU <= spriteDistanceLimit;
        let pickRadius = 2;

        if (canRenderSprite) {
            const spriteLines = selectShipSpriteLines(cameraForward, cameraUp, config.SHIP_SPRITES);
            if (spriteLines && spriteLines.length > 0) {
                const width = spriteLines.reduce((max, line) => Math.max(max, (line || '').length), 0);
                const height = spriteLines.length;
                const halfWidth = Math.floor(width / 2);
                const halfHeight = Math.floor(height / 2);
                const intersectsScreen = (x + halfWidth >= 0) && (x - halfWidth < viewWidth)
                    && (y + halfHeight >= 0) && (y - halfHeight < viewHeight);

                if (intersectsScreen) {
                    const spriteResult = renderShipSprite(
                        depthBuffer,
                        x,
                        y,
                        depthAtSymbol,
                        spriteLines,
                        color,
                        markShipMaskCell
                    );
                    pickRadius = spriteResult.pickRadius;
                } else {
                    return;
                }
            } else {
                if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) {
                    return;
                }
                RasterUtils.plotDepthText(depthBuffer, x, y, depthAtSymbol, arrow, color);
                markShipMaskCell(x, y);
            }
        } else {
            if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) {
                return;
            }
            RasterUtils.plotDepthText(depthBuffer, x, y, depthAtSymbol, arrow, color);
            markShipMaskCell(x, y);
        }

        if (onPickInfo) {
            onPickInfo({
                object,
                screenX: x,
                screenY: y,
                depth: depthAtSymbol,
                distance: distanceAU,
                pickRadius
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
