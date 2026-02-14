/**
 * Space Travel Render Bodies
 * Renders stars, planets, stations and celestial bodies
 */

const SpaceTravelRenderBodies = (() => {
    let lastCharAspectLogMs = 0;
    let lastHoverDebugMs = 0;

    function render({ viewWidth, viewHeight, depthBuffer, timestampMs = 0, mouseState = null, targetSystem, playerShip, localDestination, currentGameState, currentStation, config, setLastHoverPick }) {
        const starNoise = (x, y, seed, timeMs) => {
            const t = timeMs * 0.0000000625; // Slowed down from 0.000000125 (2x slower)
            const v = Math.sin((x * 12.9898) + (y * 78.233) + (seed * 0.01) + t) * 43758.5453;
            return v - Math.floor(v);
        };
        if (config && config.RENDER_SYSTEM_BODIES === false) {
            return [];
        }
        if (!targetSystem || !playerShip) {
            return [];
        }

        // Normalize mouse coordinates for hover/pick logic
        if (mouseState && typeof mouseState.x === 'undefined') {
            mouseState.x = mouseState.rawX;
            mouseState.y = mouseState.rawY;
        }

        const mouseX = (mouseState && typeof mouseState.x === 'number')
            ? mouseState.x
            : (mouseState && typeof mouseState.displayX === 'number' ? mouseState.displayX : null);
        const mouseY = (mouseState && typeof mouseState.y === 'number')
            ? mouseState.y
            : (mouseState && typeof mouseState.displayY === 'number' ? mouseState.displayY : null);

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

        const hoverActive = mouseState && mouseState.active && mouseState.inView && mouseX !== null && mouseY !== null;
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
            const charAspect = charDims.height / charDims.width; // Height/width ratio (typically > 1)
            const fovScale = Math.tan(ThreeDUtils.degToRad(config.VIEW_FOV) / 2);
            const viewPixelWidth = viewWidth * charDims.width;
            const depth = Math.max(0.000001, dist);
            const pixelsPerUnit = viewPixelWidth / (2 * fovScale * depth);
            const bodyRadiusAU = (body.radiusAU || 0);
            const radiusPx = bodyRadiusAU * pixelsPerUnit;
            const screenScale = config.SYSTEM_BODY_SCREEN_SCALE || 1;
            const radiusPxScaled = radiusPx * screenScale;
            const minRadiusChars = body.kind === 'STAR' ? 1 : 0;
            // Calculate radius in both dimensions to account for non-square characters
            const radiusCharsX = Math.max(minRadiusChars, Math.round(radiusPxScaled / charDims.width));
            const radiusCharsY = Math.max(minRadiusChars, Math.round(radiusPxScaled / charDims.height));
            const radiusChars = Math.max(radiusCharsX, radiusCharsY); // Use max for hover detection
            const isMultiChar = radiusChars > 0;

            // For single-character bodies, only render if center is on-screen
            const centerOnScreen = x >= 0 && x < viewWidth && y >= 0 && y < viewHeight;
            if (radiusChars === 0 && !centerOnScreen) {
                return;
            }

            // Now handle rendering (multi-char bodies will render even if center is off-screen)
            const bodyType = Object.values(BODY_TYPES).find(bt => bt.id === body.type);
            let char = bodyType?.symbol || '●';
            let color = baseColor;

            // Check if mouse is hovering over body (consider radius for larger bodies)
            // Projection already normalizes coordinates, so standard distance calculation works
            const hoverRadius = Math.max(1, radiusChars);
            const dx = mouseX - x;
            const dy = mouseY - y;
            const mouseDist = Math.sqrt(dx * dx + dy * dy);
            const isPick = hoverActive && mouseDist <= hoverRadius;
            if (isPick) {
                depthAtCursor = cameraSpace.z;
                hoverInfos.push({ body, dist, x, y });
            }

            if (body.kind === 'STATION') {
                char = '□';
                color = (radiusChars === 0) ? COLORS.GRAY : COLORS.CYAN;
            } else if (body.kind === 'STAR') {
                // Stars use flickering colors from palette
                const palette = starPalettes[body.type];
                if (palette && palette.length > 0) {
                    // Use starNoise to pick from palette for flickering effect
                    const noiseVal = starNoise(x, y, body.id?.charCodeAt(0) || 0, timestampMs);
                    const paletteIndex = Math.floor(noiseVal * palette.length);
                    color = palette[paletteIndex];
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

            // Render based on size
            if (radiusChars === 0) {
                // Single character - use the body's symbol
                RasterUtils.plotDepthText(depthBuffer, x, y, cameraSpace.z, char, color);
            } else {
                // Multi-character - render as ellipse with proper aspect ratio
                // Even if center is off-screen, parts of the body may be visible
                const blockChar = '█';
                
                // Find star position for shading (if planet)
                let starWorldPos = null;
                if (body.kind === 'PLANET' && targetSystem.stars && targetSystem.stars.length > 0) {
                    const star = targetSystem.stars[0];
                    const starOrbitOffset = star.orbit ? SystemOrbitUtils.getOrbitPosition(star.orbit, currentGameState.date) : { x: 0, y: 0, z: 0 };
                    starWorldPos = ThreeDUtils.addVec(systemCenter, starOrbitOffset);
                }
                
                for (let dy = -radiusCharsY; dy <= radiusCharsY; dy++) {
                    for (let dx = -radiusCharsX; dx <= radiusCharsX; dx++) {
                            // Check if within elliptical radius (account for aspect ratio)
                            const normalizedX = dx / radiusCharsX;
                            const normalizedY = dy / radiusCharsY;
                            const distFromCenter = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
                            if (distFromCenter <= 1.0) {
                                const px = x + dx;
                                const py = y + dy;
                                if (px >= 0 && px < viewWidth && py >= 0 && py < viewHeight) {
                                    // Check hover detection for multi-character bodies
                                    // For each visible pixel, check if mouse is over it
                                    if (hoverActive && mouseX === px && mouseY === py) {
                                        if (!hoverInfos.some(h => h.body === body)) {
                                            hoverInfos.push({ body, dist, x: px, y: py });
                                            depthAtCursor = cameraSpace.z;
                                        }
                                    }
                                    let renderChar = blockChar;
                                    let renderColor = color;
                                    
                                    // For stars, vary color per pixel for flickering texture
                                    if (body.kind === 'STAR') {
                                        const palette = starPalettes[body.type];
                                        if (palette && palette.length > 0) {
                                            const noiseVal = starNoise(px, py, body.id?.charCodeAt(0) || 0, timestampMs);
                                            const paletteIndex = Math.floor(noiseVal * palette.length);
                                            renderColor = palette[paletteIndex];
                                        }
                                    }
                                    // For planets, apply shading and textures
                                    else if (body.kind === 'PLANET') {
                                        // Calculate shading based on star direction
                                        if (starWorldPos) {
                                            const toStarWorld = ThreeDUtils.normalizeVec(ThreeDUtils.subVec(starWorldPos, worldPos));
                                            
                                            // Compute surface normal in WORLD space (radial from planet center)
                                            // This keeps shading consistent as player rotates camera
                                            const nx = normalizedX;
                                            const ny = normalizedY;
                                            const nz = Math.sqrt(Math.max(0, 1 - (nx * nx) - (ny * ny)));
                                            
                                            // Transform the normal from ellipse space to world space
                                            // The normal needs to account for the planet's rotation and orientation
                                            const pitch = -playerShip.rotation.x || 0;  // Camera pitch
                                            const yaw = -playerShip.rotation.z || 0;    // Camera yaw
                                            
                                            // Build rotation matrix (reversed from camera rotation so normal is in world space)
                                            const cosPitch = Math.cos(pitch);
                                            const sinPitch = Math.sin(pitch);
                                            const cosYaw = Math.cos(yaw);
                                            const sinYaw = Math.sin(yaw);
                                            
                                            // Rotate normal from camera space back to world space
                                            // First yaw, then pitch
                                            let normalWorldX = nx * cosYaw + nz * sinYaw;
                                            let normalWorldY = ny;
                                            let normalWorldZ = -nx * sinYaw + nz * cosYaw;
                                            
                                            // Then pitch rotation
                                            let tempY = normalWorldY * cosPitch - normalWorldZ * sinPitch;
                                            let tempZ = normalWorldY * sinPitch + normalWorldZ * cosPitch;
                                            normalWorldY = tempY;
                                            normalWorldZ = tempZ;
                                            
                                            const normalWorld = ThreeDUtils.normalizeVec({ x: normalWorldX, y: normalWorldY, z: normalWorldZ });
                                            
                                            // Dot product: positive = facing star, negative = away from star
                                            const lightDot = (toStarWorld.x * normalWorld.x)
                                                + (toStarWorld.y * normalWorld.y)
                                                + (toStarWorld.z * normalWorld.z);
                                            // Apply shading: 50% darker on far side
                                            const shadeFactor = 0.5 + (lightDot * 0.5); // Maps -1..1 to 0..1, then 0.5..1
                                            
                                            // Apply texture for gas giants
                                            if (radiusChars > 1 && starSeed !== null && gasStripeLight) {
                                                const stripeFreq = 25;
                                                const stripePhase = (timestampMs * 0.001) % 4;
                                                const pattern = (px + stripePhase) % stripeFreq;
                                                const baseColor = pattern < 13 ? gasStripeLight : gasStripeDark;
                                                renderColor = SpaceTravelShared.lerpColorHex('#000000', baseColor, shadeFactor);
                                                renderChar = blockChar;
                                            } else {
                                                // Apply shading to base color
                                                renderColor = SpaceTravelShared.lerpColorHex('#000000', color, shadeFactor);
                                            }
                                        } else if (radiusChars > 1 && starSeed !== null && gasStripeLight) {
                                            // No shading, but still apply gas giant texture
                                            const stripeFreq = 25;
                                            const stripePhase = (timestampMs * 0.001) % 4;
                                            const pattern = (px + stripePhase) % stripeFreq;
                                            renderColor = pattern < 13 ? gasStripeLight : gasStripeDark;
                                            renderChar = blockChar;
                                        }
                                    }
                                    
                                            RasterUtils.plotDepthText(depthBuffer, px, py, cameraSpace.z, renderChar, renderColor);
                                        }
                                    }
                                }
                            }
                        }

            const bodyName = body.name;
            const bodyLabel = SpaceTravelRenderBodies.getBodyLabel(body);
            if (bodyName && bodyLabel) {
                labels.push({ body, name: bodyName, char: bodyLabel, x, y, dist });
            }
        });

        if (hoverActive && depthAtCursor !== null && hoverInfos.length > 0) {
            const hoverTarget = hoverInfos.reduce((closest, current) => {
                // Projection already normalizes coordinates, so standard distance works
                const currentDist = Math.abs(current.x - mouseX) + Math.abs(current.y - mouseY);
                const closestDist = Math.abs(closest.x - mouseX) + Math.abs(closest.y - mouseY);
                return currentDist < closestDist ? current : closest;
            });
            if (setLastHoverPick) {
                const pickData = {
                    kind: hoverTarget.body.kind,  // Add the kind property
                    bodyRef: hoverTarget.body,
                    x: hoverTarget.x,
                    y: hoverTarget.y,
                    screenX: mouseX,
                    screenY: mouseY,
                    distance: hoverTarget.dist
                };
                setLastHoverPick(pickData);
            }
        } else {
            // Clear pick when nothing is being hovered
            if (setLastHoverPick) {
                setLastHoverPick(null);
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
