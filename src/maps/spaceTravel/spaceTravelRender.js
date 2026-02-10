/**
 * Space Travel Map Rendering
 */

const SpaceTravelRender = (() => {
    function renderSystemBodies({ viewWidth, viewHeight, depthBuffer, timestampMs = 0, mouseState = null, state, config, setLastHoverPick }) {
        const { targetSystem, playerShip, localDestination, currentGameState, currentStation } = state;
        if (!targetSystem || !playerShip) {
            return [];
        }

        const systemCenter = {
            x: targetSystem.x * config.LY_TO_AU,
            y: targetSystem.y * config.LY_TO_AU,
            z: 0
        };

        const bodies = [];
        if (Array.isArray(targetSystem.stars)) {
            targetSystem.stars.forEach(star => bodies.push({ ...star, kind: 'STAR' }));
        }
        if (Array.isArray(targetSystem.planets)) {
            targetSystem.planets.forEach(planet => bodies.push({ ...planet, kind: 'PLANET' }));
        }
        if (currentStation) {
            bodies.push({
                ...currentStation,
                kind: 'STATION',
                type: 'STATION',
                radiusAU: currentStation.size,
                positionWorld: currentStation.position,
                skipRender: true
            });
        }

        if (bodies.length === 0) {
            return [];
        }

        const bodyColors = {
            STAR: '#ffeeaa',
            GAS: '#d6b27a',
            ICE: '#d7f7ff',
            TERRESTRIAL: '#c4a484'
        };

        const gasBasePalette = ['#d6b27a', '#c9a06a', '#d1bb8a', '#c08a5a', '#b57a4a'];
        const gasStripePalette = ['#f3dbac', '#e7c58e', '#c58a5a', '#a46a45', '#8b5a3a'];

        const labels = [];
        const hoverInfos = [];

        const hoverActive = mouseState && mouseState.active && mouseState.inView;
        let depthAtCursor = null;

        bodies.forEach(body => {
            const orbitOffset = body.orbit ? SystemOrbitUtils.getOrbitPosition(body.orbit, currentGameState.date) : { x: 0, y: 0, z: 0 };
            const worldPos = body.positionWorld
                ? body.positionWorld
                : ThreeDUtils.addVec(systemCenter, orbitOffset);
            const relative = ThreeDUtils.subVec(worldPos, playerShip.position);
            const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
            if (cameraSpace.z < config.NEAR_PLANE) {
                return;
            }
            const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
            if (!projected) {
                return;
            }

            const dist = ThreeDUtils.vecLength(relative);
            if (dist > config.SYSTEM_BODY_SHADE_MAX_DISTANCE_AU && body.kind === 'PLANET') {
                return;
            }

            let baseColor = bodyColors.TERRESTRIAL;
            let gasStripeLight = null;
            let gasStripeDark = null;
            let spinRad = 0;
            let tiltRad = 0;
            if (body.kind === 'STAR') {
                baseColor = bodyColors.STAR;
            } else if (SpaceTravelShared.isGasPlanet(body.type)) {
                const gasSeed = SpaceTravelShared.hashString(body.id || body.type);
                baseColor = gasBasePalette[Math.abs(gasSeed) % gasBasePalette.length];
                gasStripeLight = gasStripePalette[Math.abs(gasSeed + 1) % gasStripePalette.length];
                gasStripeDark = gasStripePalette[Math.abs(gasSeed + 3) % gasStripePalette.length];
            } else if (body.type === BODY_TYPES.PLANET_ICE_GIANT.id || body.type === BODY_TYPES.PLANET_ICE_DWARF.id) {
                baseColor = bodyColors.ICE;
            }

            if (body.kind === 'PLANET' && currentGameState && currentGameState.date) {
                const rotationHours = body.rotationDurationHours || 24;
                const rotationSeconds = Math.max(1, rotationHours * 3600);
                const timeSeconds = currentGameState.date.getTime() / 1000;
                const spinT = (timeSeconds % rotationSeconds) / rotationSeconds;
                spinRad = (spinT * Math.PI * 2) + (body.rotationPhase || 0);
                tiltRad = ThreeDUtils.degToRad(body.axialTiltDeg || 0);
            }

            const shadeT = Math.max(0.2, 1 - (dist / config.SYSTEM_BODY_SHADE_MAX_DISTANCE_AU));
            let flickerT = 1;
            if (body.kind === 'STAR') {
                const flickerIntervalMs = 500;
                const flickerStep = Math.floor(timestampMs / flickerIntervalMs);
                const flickerSeed = `${body.id || body.type}-${flickerStep}`;
                const flickerHash = SpaceTravelShared.hashString(flickerSeed);
                const flickerRand = (((flickerHash % 1000) + 1000) % 1000) / 1000;
                flickerT = 0.1 + (0.7 * flickerRand);
            }
            const color = SpaceTravelShared.lerpColorHex('#000000', baseColor, shadeT * flickerT);

            let fillSymbol = '█';
            if (body.kind === 'STAR') {
                fillSymbol = '░';
            } else if (SpaceTravelShared.isGasPlanet(body.type)) {
                fillSymbol = '▒';
            } else if (body.type === BODY_TYPES.PLANET_ICE_GIANT.id || body.type === BODY_TYPES.PLANET_ICE_DWARF.id) {
                fillSymbol = '▓';
            }

            const charDims = UI.getCharDimensions();
            const fovScale = Math.tan(ThreeDUtils.degToRad(config.VIEW_FOV) / 2);
            const viewPixelWidth = viewWidth * charDims.width;
            const viewPixelHeight = viewHeight * charDims.height;
            const pixelsPerUnitX = viewPixelWidth / (2 * fovScale * cameraSpace.z);
            const pixelsPerUnitY = viewPixelHeight / (2 * fovScale * cameraSpace.z);
            const bodyRadiusAU = (body.radiusAU || 0) * (config.SYSTEM_BODY_SCREEN_SCALE || 1);
            const radiusPx = bodyRadiusAU * pixelsPerUnitX;
            const radiusPy = bodyRadiusAU * pixelsPerUnitY;
            const minRadiusChars = body.kind === 'STAR' ? 1 : 0;
            const charAspect = charDims.height / charDims.width;
            const radiusCharsX = Math.max(minRadiusChars, Math.round(radiusPx / charDims.width));
            const radiusCharsY = Math.max(minRadiusChars, Math.round((radiusPy / charDims.height) * charAspect));
            const radiusChars = Math.max(radiusCharsX, radiusCharsY);

            const centerX = Math.round(projected.x);
            const centerY = Math.round(projected.y);

            const bboxLeft = centerX - radiusCharsX;
            const bboxRight = centerX + radiusCharsX;
            const bboxTop = centerY - radiusCharsY;
            const bboxBottom = centerY + radiusCharsY;
            const isOnScreen = bboxRight >= 0 && bboxLeft < viewWidth && bboxBottom >= 0 && bboxTop < viewHeight;

            if (body.kind === 'STATION' && body.skipRender) {
                if (isOnScreen) {
                    const symbol = SpaceTravelShared.getLocalMapBodySymbol(body);
                    const symbolDepth = projected.z - (config.STATION_FACE_DEPTH_BIAS || 0.0005);
                    RasterUtils.plotDepthText(depthBuffer, centerX, centerY, symbolDepth, symbol, color);
                    const labelName = body.name || 'Station';
                    const isDestination = isDestinationBody(localDestination, body);
                    addDestinationLabel(labels, centerX, centerY, Math.max(radiusCharsX, radiusCharsY), labelName, viewWidth, viewHeight);
                    hoverInfos.push({
                        name: body.name || 'Station',
                        centerX,
                        centerY,
                        radiusChars: Math.max(radiusCharsX, radiusCharsY),
                        depth: projected.z,
                        depthEpsilon: 0.05,
                        isOnScreen,
                        labelColor: isDestination ? COLORS.CYAN : COLORS.TEXT_NORMAL,
                        bodyRef: body,
                        kind: body.kind
                    });
                }
                return;
            }

            if (radiusCharsX === 0 && radiusCharsY === 0) {
                const symbol = SpaceTravelShared.getLocalMapBodySymbol(body);
                RasterUtils.plotDepthText(depthBuffer, centerX, centerY, projected.z, symbol, color);
                if (isOnScreen) {
                    const isDestination = isDestinationBody(localDestination, body);
                    if (isDestination) {
                        addDestinationLabel(labels, centerX, centerY, 0, body.name || BODY_TYPES[body.type]?.name || body.type, viewWidth, viewHeight);
                    }
                    hoverInfos.push({
                        name: body.name || BODY_TYPES[body.type]?.name || body.type,
                        centerX,
                        centerY,
                        radiusChars: 0,
                        depth: projected.z,
                        isOnScreen,
                        labelColor: isDestination ? COLORS.CYAN : color,
                        bodyRef: body,
                        kind: body.kind
                    });
                }
                return;
            }

            if (!isOnScreen) {
                return;
            }

            let craterData = null;
            if (SpaceTravelShared.isTerrestrialPlanet(body.type)) {
                const rng = SpaceTravelShared.makeRng(SpaceTravelShared.hashString(body.id || body.type));
                const craterCount = Math.max(2, Math.min(8, Math.round(Math.max(radiusCharsX, radiusCharsY) * 1.2)));
                craterData = Array.from({ length: craterCount }, () => {
                    const angle = rng() * Math.PI * 2;
                    const dist = rng() * Math.max(radiusCharsX, radiusCharsY) * 0.6;
                    return {
                        x: Math.cos(angle) * dist,
                        y: Math.sin(angle) * dist,
                        r: Math.max(1, rng() * Math.max(radiusCharsX, radiusCharsY) * 0.35)
                    };
                });
            }

            const stripeSize = Math.max(1, Math.round(Math.max(radiusCharsX, radiusCharsY) * 0.18));
            const stripeSeed = SpaceTravelShared.hashString(body.id || body.type);
            const stripePhase = Math.floor(((stripeSeed % 100) + 100) % 100 / 100 * stripeSize);
            const stripePhaseRad = (((stripeSeed % 360) + 360) % 360) * (Math.PI / 180);
            const stripeWobble = Math.max(1, Math.round(Math.max(radiusCharsX, radiusCharsY) * 0.2));

            const cosSpin = Math.cos(spinRad);
            const sinSpin = Math.sin(spinRad);
            const cosTilt = Math.cos(tiltRad);
            const sinTilt = Math.sin(tiltRad);

            const dyStart = Math.max(-radiusCharsY, -centerY);
            const dyEnd = Math.min(radiusCharsY, viewHeight - 1 - centerY);
            const dxStart = Math.max(-radiusCharsX, -centerX);
            const dxEnd = Math.min(radiusCharsX, viewWidth - 1 - centerX);
            if (dyStart > dyEnd || dxStart > dxEnd) {
                return;
            }

            for (let dy = dyStart; dy <= dyEnd; dy++) {
                for (let dx = dxStart; dx <= dxEnd; dx++) {
                    const nx = radiusCharsX > 0 ? (dx / radiusCharsX) : 0;
                    const ny = radiusCharsY > 0 ? (dy / radiusCharsY) : 0;
                    if ((nx * nx + ny * ny) > 1) {
                        continue;
                    }
                    const tiltX = (dx * cosTilt) - (dy * sinTilt);
                    const tiltY = (dx * sinTilt) + (dy * cosTilt);
                    const spinX = (tiltX * cosSpin) - (tiltY * sinSpin);
                    const spinY = (tiltX * sinSpin) + (tiltY * cosSpin);
                    const x = centerX + dx;
                    const y = centerY + dy;
                    let pixelColor = color;

                    if (SpaceTravelShared.isGasPlanet(body.type)) {
                        const wave = Math.sin(((spinX / Math.max(1, radiusCharsX)) * Math.PI * 2) + stripePhaseRad);
                        const wobble = Math.round(wave * stripeWobble);
                        const band = Math.floor((spinY + radiusCharsY + stripePhase + wobble) / stripeSize);
                        const stripeColor = (band % 2 === 0) ? gasStripeLight : gasStripeDark;
                        pixelColor = SpaceTravelShared.lerpColorHex(pixelColor, stripeColor || pixelColor, 0.35);
                    } else if (craterData) {
                        for (let i = 0; i < craterData.length; i++) {
                            const crater = craterData[i];
                            const dxr = spinX - crater.x;
                            const dyr = spinY - crater.y;
                            if (dxr * dxr + dyr * dyr <= crater.r * crater.r) {
                                pixelColor = SpaceTravelShared.lerpColorHex(pixelColor, '#000000', 0.35);
                                break;
                            }
                        }
                    }

                    const plotZ = projected.z + (body.kind === 'STAR' ? 0.0001 : 0);
                    RasterUtils.plotDepthText(depthBuffer, x, y, plotZ, fillSymbol, pixelColor);
                }
            }

            if (isOnScreen) {
                const isDestination = isDestinationBody(localDestination, body);
                if (isDestination) {
                    addDestinationLabel(labels, centerX, centerY, radiusChars, body.name || BODY_TYPES[body.type]?.name || body.type, viewWidth, viewHeight);
                }
                hoverInfos.push({
                    name: body.name || BODY_TYPES[body.type]?.name || body.type,
                    centerX,
                    centerY,
                    radiusChars,
                    depth: projected.z,
                    isOnScreen,
                    labelColor: isDestination ? COLORS.CYAN : color,
                    bodyRef: body,
                    kind: body.kind
                });
            }
        });

        if (hoverActive && hoverInfos.length > 0) {
            const bufferIndex = mouseState.displayY * depthBuffer.width + mouseState.displayX;
            depthAtCursor = depthBuffer.depth[bufferIndex];
            if (depthAtCursor !== null && Number.isFinite(depthAtCursor)) {
                let best = null;
                hoverInfos.forEach(info => {
                    if (!info.isOnScreen) {
                        return;
                    }
                    const dx = mouseState.rawX - info.centerX;
                    const dy = mouseState.rawY - info.centerY;
                    const radius = Math.max(info.radiusChars, 0);
                    const within = radius === 0 ? (dx === 0 && dy === 0) : ((dx * dx + dy * dy) <= (radius * radius));
                    if (!within) {
                        return;
                    }
                    const epsilon = typeof info.depthEpsilon === 'number' ? info.depthEpsilon : 0.002;
                    if (Math.abs(info.depth - depthAtCursor) > epsilon) {
                        return;
                    }
                    if (!best || info.depth < best.depth) {
                        best = info;
                    }
                });

                if (best) {
                    setLastHoverPick(best);
                    const labelText = best.name.length > viewWidth ? best.name.slice(0, viewWidth) : best.name;
                    const labelWidth = labelText.length;
                    const rawLabelX = best.centerX - Math.floor(labelWidth / 2);
                    const labelX = Math.max(0, Math.min(viewWidth - labelWidth, rawLabelX));
                    const topY = best.centerY - best.radiusChars - 1;
                    const bottomY = best.centerY + best.radiusChars + 1;
                    let labelY = null;

                    if (topY >= 0) {
                        labelY = Math.min(topY, viewHeight - 1);
                    } else if (bottomY <= viewHeight - 1) {
                        labelY = bottomY;
                    } else {
                        labelY = 0;
                    }

                    labels.push({ x: labelX, y: labelY, text: labelText, color: best.labelColor || COLORS.TEXT_NORMAL });
                } else {
                    setLastHoverPick(null);
                }
            } else {
                setLastHoverPick(null);
            }
        } else {
            setLastHoverPick(null);
        }

        return labels;
    }

    function renderSystemBodyLabels(labels, viewWidth, viewHeight, addHudText) {
        if (!labels || labels.length === 0) {
            return;
        }

        labels.forEach(label => {
            if (!label) {
                return;
            }
            const x = Math.max(0, Math.min(viewWidth - Math.max(1, label.text.length), label.x));
            const y = Math.max(0, Math.min(viewHeight - 1, label.y));
            addHudText(x, y, label.text, label.color || COLORS.TEXT_NORMAL);
        });
    }

    function renderDestinationIndicator(viewWidth, viewHeight, state, config, addHudText, getActiveTargetInfo) {
        const targetInfo = getActiveTargetInfo();
        const { playerShip } = state;
        if (!targetInfo || !playerShip) {
            return;
        }
        const cameraSpace = ThreeDUtils.rotateVecByQuat(
            ThreeDUtils.subVec(targetInfo.position, playerShip.position),
            ThreeDUtils.quatConjugate(playerShip.rotation)
        );
        let projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
        if (!projected) {
            const forwardPlane = 0.0001;
            const scale = forwardPlane / Math.abs(cameraSpace.z || forwardPlane);
            projected = RasterUtils.projectCameraSpacePointRaw(
                {
                    x: cameraSpace.x * scale,
                    y: cameraSpace.y * scale,
                    z: forwardPlane
                },
                viewWidth,
                viewHeight,
                config.VIEW_FOV
            );
        }
        if (!projected) {
            return;
        }
        const inView = projected.x >= 0 && projected.x < viewWidth && projected.y >= 0 && projected.y < viewHeight;
        if (inView) {
            return;
        }

        const centerX = (viewWidth - 1) / 2;
        const centerY = (viewHeight - 1) / 2;
        let dx = projected.x - centerX;
        let dy = projected.y - centerY;
        if (cameraSpace.z <= 0) {
            dx = -dx;
            dy = -dy;
        }

        const bounds = {
            minX: 0,
            maxX: viewWidth - 1,
            minY: 0,
            maxY: viewHeight - 1
        };
        const tValues = [];
        if (dx !== 0) {
            tValues.push((bounds.minX - centerX) / dx);
            tValues.push((bounds.maxX - centerX) / dx);
        }
        if (dy !== 0) {
            tValues.push((bounds.minY - centerY) / dy);
            tValues.push((bounds.maxY - centerY) / dy);
        }
        const t = tValues.filter(val => val > 0).reduce((min, val) => Math.min(min, val), Infinity);
        if (!Number.isFinite(t)) {
            return;
        }
        const edgeX = Math.max(bounds.minX, Math.min(bounds.maxX, Math.round(centerX + dx * t)));
        const edgeY = Math.max(bounds.minY, Math.min(bounds.maxY, Math.round(centerY + dy * t)));
        const arrow = getDirectionalArrow(dx, -dy);
        addHudText(edgeX, edgeY, arrow, COLORS.CYAN);
    }

    function isDestinationBody(localDestination, body) {
        if (!localDestination || !body) {
            return false;
        }
        if (localDestination.type === 'STATION') {
            return body.type === 'STATION' || body.kind === 'STATION';
        }
        if (localDestination === body) {
            return true;
        }
        if (localDestination.id && body.id && localDestination.id === body.id) {
            return true;
        }
        if (localDestination.name && body.name && localDestination.name === body.name) {
            return true;
        }
        return false;
    }

    function addDestinationLabel(labels, centerX, centerY, radiusChars, name, viewWidth, viewHeight) {
        if (!name) {
            return;
        }
        const labelText = name.length > viewWidth ? name.slice(0, viewWidth) : name;
        const labelWidth = labelText.length;
        const rawLabelX = centerX - Math.floor(labelWidth / 2);
        const labelX = Math.max(0, Math.min(viewWidth - labelWidth, rawLabelX));
        const topY = centerY - radiusChars - 1;
        const bottomY = centerY + radiusChars + 1;
        let labelY = null;

        if (topY >= 0) {
            labelY = Math.min(topY, viewHeight - 1);
        } else if (bottomY <= viewHeight - 1) {
            labelY = bottomY;
        } else {
            labelY = 0;
        }

        labels.push({ x: labelX, y: labelY, text: labelText, color: COLORS.CYAN });
    }

    function getDirectionalArrow(dx, dy) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag <= 0.000001) {
            return '▲';
        }
        const angle = Math.atan2(dy, dx);
        const degrees = (angle * (180 / Math.PI) + 360) % 360;
        if (degrees >= 337.5 || degrees < 22.5) {
            return '▶';
        } else if (degrees >= 22.5 && degrees < 67.5) {
            return '◥';
        } else if (degrees >= 67.5 && degrees < 112.5) {
            return '▲';
        } else if (degrees >= 112.5 && degrees < 157.5) {
            return '◤';
        } else if (degrees >= 157.5 && degrees < 202.5) {
            return '◀';
        } else if (degrees >= 202.5 && degrees < 247.5) {
            return '◣';
        } else if (degrees >= 247.5 && degrees < 292.5) {
            return '▼';
        }
        return '◢';
    }

    return {
        renderSystemBodies,
        renderSystemBodyLabels,
        renderDestinationIndicator
    };
})();
