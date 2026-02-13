/**
 * Space Travel Render Bodies
 * Renders stars, planets, stations and celestial bodies
 */

const SpaceTravelRenderBodies = (() => {
    let lastCharAspectLogMs = 0;

    function render({ viewWidth, viewHeight, depthBuffer, timestampMs = 0, mouseState = null, targetSystem, playerShip, localDestination, currentGameState, currentStation, config, setLastHoverPick }) {
        const starNoise = (x, y, seed, timeMs) => {
            const t = timeMs * 0.000000125;
            const v = Math.sin((x * 12.9898) + (y * 78.233) + (seed * 0.01) + t) * 43758.5453;
            return v - Math.floor(v);
        };
        if (config && config.RENDER_SYSTEM_BODIES === false) {
            return [];
        }
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

        const starPalettes = {
            [BODY_TYPES.STAR_RED_DWARF.id]: ['#ffb36a', '#ff8a5b', '#ffd2a1'],
            [BODY_TYPES.STAR_YELLOW_DWARF.id]: ['#fff4b0', '#ffd98a', '#fff7d9'],
            [BODY_TYPES.STAR_WHITE_DWARF.id]: ['#e7f4ff', '#cfe8ff', '#ffffff'],
            [BODY_TYPES.STAR_RED_GIANT.id]: ['#ff8a6b', '#ffb38a', '#ffd1b0'],
            [BODY_TYPES.STAR_BLUE_GIANT.id]: ['#9ad6ff', '#6fb6ff', '#cfe9ff'],
            [BODY_TYPES.STAR_NEUTRON.id]: ['#b7d9ff', '#e6f2ff', '#c8d6ff'],
            [BODY_TYPES.STAR_BLACK_HOLE.id]: ['#1a1a1a', '#2a2a2a', '#0a0a0a']
        };

        // Improved planet color palettes with better variance
        const gasGiantColors = ['#fff4a3', '#ffe680', '#ffd966', '#ffca4d', '#ffc233', '#ffb91a'];
        const gasBasePalette = ['#e8d7a0', '#d4bfa0', '#c9a070', '#b88050', '#a85a3a'];
        const gasStripePalette = ['#f5e0b0', '#ead4a0', '#d4b880', '#b89a60', '#9a7a40'];
        
        // Terrestrial planet colors - light gray, brown, reddish
        const terrestrialColors = ['#d0ccc8', '#d9a68a', '#e8a68a', '#d0a070', '#c8996a'];
        
        // Ice planet colors - light cyan to blue
        const iceColors = ['#e0f2ff', '#c8e8ff', '#b0deff', '#98d4ff', '#80ccff'];

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
            let starSeed = null;
            let gasStripeLight = null;
            let gasStripeDark = null;
            let spinRad = 0;
            let tiltRad = 0;
            if (body.kind === 'STAR') {
                const type = Object.values(BODY_TYPES).find(bt => bt.id === body.type);
                baseColor = type ? (starPalettes[body.type]?.[0] || '#ffeeaa') : '#ffeeaa';
            } else if (body.kind === 'PLANET') {
                const type = Object.values(BODY_TYPES).find(bt => bt.id === body.type);
                if (type) {
                    // Use diverse planet colors based on type
                    if (SpaceTravelShared.isGasPlanet(body.type)) {
                        // Gas giant colors with variance
                        const gasSeed = SpaceTravelShared.hashString(body.id || body.type);
                        baseColor = gasGiantColors[Math.abs(gasSeed) % gasGiantColors.length];
                        starSeed = gasSeed;
                        gasStripeLight = gasStripePalette[Math.abs(starSeed) % gasStripePalette.length];
                        gasStripeDark = gasBasePalette[Math.abs(starSeed + 1) % gasBasePalette.length];
                    } else if (body.type === BODY_TYPES.PLANET_ICE_GIANT.id || body.type === BODY_TYPES.PLANET_ICE_DWARF.id) {
                        // Ice planet colors - cyan to blue
                        const iceSeed = SpaceTravelShared.hashString(body.id || body.type);
                        baseColor = iceColors[Math.abs(iceSeed) % iceColors.length];
                    } else if (SpaceTravelShared.isTerrestrialPlanet(body.type)) {
                        // Terrestrial planet colors - gray, brown, reddish
                        const terrestrialSeed = SpaceTravelShared.hashString(body.id || body.type);
                        baseColor = terrestrialColors[Math.abs(terrestrialSeed) % terrestrialColors.length];
                    }
                }
                if (body.rotation && !isNaN(body.rotation.w)) {
                    const axis = ThreeDUtils.quatToAxisAngle(body.rotation);
                    spinRad = axis.angle;
                    tiltRad = Math.acos(Math.max(-1, Math.min(1, Math.abs(axis.axis.y))));
                }
            }

            const x = Math.round(projected.x);
            const y = Math.round(projected.y);

            // Calculate body radius in characters for size-based rendering decisions
            const charDims = UI.getCharDimensions();
            const fovScale = Math.tan(ThreeDUtils.degToRad(config.VIEW_FOV) / 2);
            const viewPixelWidth = viewWidth * charDims.width;
            const depth = Math.max(0.000001, dist);
            const pixelsPerUnit = viewPixelWidth / (2 * fovScale * depth);
            const bodyRadiusAU = (body.radiusAU || 0);
            const radiusPx = bodyRadiusAU * pixelsPerUnit;
            const screenScale = config.SYSTEM_BODY_SCREEN_SCALE || 1;
            const radiusPxScaled = radiusPx * screenScale;
            const minRadiusChars = body.kind === 'STAR' ? 1 : 0;
            const radiusChars = Math.max(minRadiusChars, Math.round(radiusPxScaled / charDims.width));

            if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
                const bodyType = Object.values(BODY_TYPES).find(bt => bt.id === body.type);
                let char = bodyType?.symbol || '●';
                let color = baseColor;

                const isPick = hoverActive && Math.abs(mouseState.x - x) <= 1 && Math.abs(mouseState.y - y) <= 1;
                if (isPick) {
                    depthAtCursor = cameraSpace.z;
                    hoverInfos.push({ body, dist, x, y });
                }

                if (body.kind === 'STATION') {
                    char = '□';
                    color = COLORS.CYAN;
                } else if (body.kind === 'STAR') {
                    // Use star palette color without animation (local system star)
                    const palette = starPalettes[body.type];
                    if (palette && palette.length > 0) {
                        color = palette[0]; // Use base color from palette
                    }
                } else if (body.kind === 'PLANET') {
                    // Only use stripe rendering for larger planets (>2x2 on screen)
                    const isLargeOnScreen = radiusChars > 1;
                    if (starSeed !== null && gasStripeLight && isLargeOnScreen) {
                        const stripeFreq = 25;
                        const stripePhase = (timestampMs * 0.001) % 4;
                        const pattern = (x + stripePhase) % stripeFreq;
                        color = pattern < 13 ? gasStripeLight : gasStripeDark;
                        const variantSymbol = bodyType?.symbol || '●';
                        char = starNoise(x, y, starSeed, timestampMs) < 0.4 ? variantSymbol : '∘';
                    }
                }

                RasterUtils.plotDepthText(depthBuffer, x, y, cameraSpace.z, char, color);
            }

            const bodyName = body.name;
            const bodyLabel = SpaceTravelRenderBodies.getBodyLabel(body);
            if (body.kind !== 'STATION' && bodyName && bodyLabel) {
                labels.push({ body, name: bodyName, char: bodyLabel, x, y, dist });
            }
        });

        if (hoverActive && depthAtCursor !== null && hoverInfos.length > 0) {
            const hoverTarget = hoverInfos.reduce((closest, current) => {
                const currentDist = Math.abs(current.x - mouseState.x) + Math.abs(current.y - mouseState.y);
                const closestDist = Math.abs(closest.x - mouseState.x) + Math.abs(closest.y - mouseState.y);
                return currentDist < closestDist ? current : closest;
            });
            if (setLastHoverPick) {
                const pickData = {
                    bodyRef: hoverTarget.body,
                    x: hoverTarget.x,
                    y: hoverTarget.y,
                    screenX: mouseState.x,
                    screenY: mouseState.y,
                    distance: hoverTarget.dist
                };
                setLastHoverPick(pickData);
            }
        }

        return labels;
    }

    function getBodyLabel(body) {
        const type = Object.values(BODY_TYPES).find(bt => bt.id === body.type);
        if (!type) return '?';
        return SpaceTravelShared.getLocalMapBodySymbol(body);
    }

    return {
        render,
        getBodyLabel
    };
})();
