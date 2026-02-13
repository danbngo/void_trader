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
            let starSeed = null;
            let gasStripeLight = null;
            let gasStripeDark = null;
            let spinRad = 0;
            let tiltRad = 0;
            if (body.kind === 'STAR') {
                const type = BODY_TYPES[body.id];
                baseColor = type ? (starPalettes[body.id]?.[0] || '#ffeeaa') : '#ffeeaa';
            } else if (body.kind === 'PLANET') {
                const type = BODY_TYPES[body.id];
                if (type) {
                    baseColor = bodyColors[type.category] || bodyColors.TERRESTRIAL;
                    if (type.category === 'GAS') {
                        starSeed = (body.id.charCodeAt(0) + body.id.charCodeAt(body.id.length - 1)) % 64;
                        gasStripeLight = gasStripePalette[Math.abs(starSeed) % gasStripePalette.length];
                        gasStripeDark = gasBasePalette[Math.abs(starSeed + 1) % gasBasePalette.length];
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

            if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
                let char = '●';
                let color = baseColor;

                const isPick = hoverActive && Math.abs(mouseState.x - x) <= 1 && Math.abs(mouseState.y - y) <= 1;
                if (isPick) {
                    depthAtCursor = cameraSpace.z;
                    hoverInfos.push({ body, dist, x, y });
                }

                if (body.kind === 'STATION') {
                    char = '▢';
                    color = COLORS.CYAN;
                } else if (body.kind === 'STAR') {
                    char = '★';
                    const palette = starPalettes[body.id];
                    if (palette) {
                        const cycleIdx = Math.floor((timestampMs * 0.0005) % palette.length);
                        color = palette[cycleIdx];
                    }
                } else if (body.kind === 'PLANET' && starSeed !== null && gasStripeLight) {
                    const stripeFreq = 25;
                    const stripePhase = (timestampMs * 0.001) % 4;
                    const pattern = (x + stripePhase) % stripeFreq;
                    color = pattern < 13 ? gasStripeLight : gasStripeDark;
                    char = starNoise(x, y, starSeed, timestampMs) < 0.4 ? '●' : '∘';
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
        const type = BODY_TYPES[body.id];
        if (!type) return '?';
        return SpaceTravelShared.getLocalMapBodySymbol(type);
    }

    return {
        render,
        getBodyLabel
    };
})();
