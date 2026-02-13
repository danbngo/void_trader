/**
 * Local System Map Menu
 * Shows star and planets in the current system
 */

const LocalSystemMap = (() => {
    let selectedIndex = 0;
    let bodies = [];
    let returnCallback = null;
    let mapZoom = 1;
    const LY_TO_AU = 63241; // 1 LY = 63,241 AU

    function show(gameState, onReturn = null) {
        UI.clear();
        UI.resetSelection();
        returnCallback = onReturn;
        render(gameState);
    }

    function render(gameState) {
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const mapWidth = GALAXY_MAP_WIDTH;
        const mapHeight = GALAXY_MAP_HEIGHT;
        const startX = 0;
        const startY = 0;
        const clampButtonX = (x, key, label) => {
            const buttonText = `[${key}] ${label}`;
            const maxX = Math.max(0, grid.width - buttonText.length);
            return Math.max(0, Math.min(x, maxX));
        };

        const system = gameState.getCurrentSystem();
        if (!system) {
            UI.addTextCentered(Math.floor(grid.height / 2), 'No current system', COLORS.TEXT_ERROR);
            UI.draw();
            return;
        }

        const stars = Array.isArray(system.stars) ? system.stars : [];
        const planets = Array.isArray(system.planets) ? system.planets : [];
        const station = system.station || {
            id: `${system.name}-STATION`,
            name: `${system.name} Station`,
            type: 'STATION',
            orbit: {
                semiMajorAU: SYSTEM_PLANET_ORBIT_MIN_AU,
                periodDays: Number.POSITIVE_INFINITY,
                percentOffset: 0,
                progress: 0
            }
        };

        bodies = [...stars, ...planets, station];
        if (selectedIndex >= bodies.length) {
            selectedIndex = Math.max(0, bodies.length - 1);
        }

        // Border
        UI.addText(startX, startY, '╔' + '═'.repeat(mapWidth - 2) + '╗', COLORS.GRAY);
        for (let y = 1; y < mapHeight - 1; y++) {
            UI.addText(startX, startY + y, '║', COLORS.GRAY);
            UI.addText(startX + mapWidth - 1, startY + y, '║', COLORS.GRAY);
        }
        UI.addText(startX, startY + mapHeight - 1, '╚' + '═'.repeat(mapWidth - 2) + '╝', COLORS.GRAY);
        UI.addHeaderLine(2, 0, system.name);
        const dateStr = formatDate(gameState.date);
        const dateCenterX = Math.floor(mapWidth / 2) - Math.floor(dateStr.length / 2);
        UI.addText(dateCenterX, 0, dateStr, COLORS.TEXT_NORMAL);

        const mapCenterX = Math.floor(mapWidth / 2);
        const mapCenterY = Math.floor(mapHeight / 2);

        const orbitValues = bodies
            .map(body => body.orbit?.semiMajorAU || 0)
            .filter(value => value > 0);
        const maxOrbit = orbitValues.length > 0
            ? Math.max(...orbitValues)
            : SYSTEM_PLANET_ORBIT_MIN_AU;
        const radius = Math.max(1, maxOrbit);
        const scale = ((Math.min(mapWidth, mapHeight) / 2 - 2) / radius) * mapZoom;

        // Draw star at center
        if (stars.length > 0) {
            const starColor = getBodyColor(stars[0]);
            const starSymbol = getBodySymbol(stars[0], selectedIndex === 0);
            UI.addText(mapCenterX, mapCenterY, starSymbol, starColor);
            UI.registerTableRow(mapCenterX, mapCenterY, 1, 0, (rowIndex) => {
                selectedIndex = rowIndex;
                render(gameState);
            });
        }

        let selectedPos = null;
        // Draw planets + station
        bodies.forEach((body, index) => {
            if (!body.orbit) {
                return;
            }
            const orbitPos = body.type === 'STATION'
                ? { x: body.orbit.semiMajorAU, y: 0, z: 0 }
                : SystemOrbitUtils.getOrbitPosition(body.orbit, gameState.date);
            const px = Math.round(mapCenterX + orbitPos.x * scale);
            const py = Math.round(mapCenterY - orbitPos.y * scale);
            if (px <= 0 || px >= mapWidth - 1 || py <= 0 || py >= mapHeight - 1) {
                return;
            }

            if (index === selectedIndex) {
                selectedPos = { x: px, y: py };
            }

            const color = getBodyColor(body);
            const symbol = getBodySymbol(body, index === selectedIndex);
            UI.addText(px, py, symbol, color);
            UI.registerTableRow(px, py, 1, index, (rowIndex) => {
                selectedIndex = rowIndex;
                render(gameState);
            });
        });

        // Ship marker + destination line
        const playerShip = gameState.ships && gameState.ships[0];
        if (playerShip && playerShip.position && playerShip.rotation) {
            const systemCenter = {
                x: system.x * LY_TO_AU,
                y: system.y * LY_TO_AU,
                z: 0
            };
            const shipRel = ThreeDUtils.subVec(playerShip.position, systemCenter);
            const shipX = Math.round(mapCenterX + shipRel.x * scale);
            const shipY = Math.round(mapCenterY - shipRel.y * scale);
            if (shipX > 0 && shipX < mapWidth - 1 && shipY > 0 && shipY < mapHeight - 1) {
                // Draw destination line (green) first so it appears under selection line
                if (gameState.localDestination) {
                    const destOrbitPos = gameState.localDestination.type === 'STATION'
                        ? { x: gameState.localDestination.orbit.semiMajorAU, y: 0, z: 0 }
                        : SystemOrbitUtils.getOrbitPosition(gameState.localDestination.orbit, gameState.date);
                    const destX = Math.round(mapCenterX + destOrbitPos.x * scale);
                    const destY = Math.round(mapCenterY - destOrbitPos.y * scale);
                    if (destX > 0 && destX < mapWidth - 1 && destY > 0 && destY < mapHeight - 1) {
                        const destLinePoints = LineDrawer.drawLine(shipX, shipY, destX, destY, true, COLORS.GREEN);
                        destLinePoints.forEach(point => {
                            if ((point.x === shipX && point.y === shipY) || (point.x === destX && point.y === destY)) {
                                return;
                            }
                            if (point.x > 0 && point.x < mapWidth - 1 && point.y > 0 && point.y < mapHeight - 1) {
                                UI.addText(point.x, point.y, point.symbol, COLORS.GREEN);
                            }
                        });
                    }
                }
                
                if (selectedPos) {
                    const linePoints = LineDrawer.drawLine(shipX, shipY, selectedPos.x, selectedPos.y, true, COLORS.CYAN);
                    linePoints.forEach(point => {
                        if ((point.x === shipX && point.y === shipY) || (point.x === selectedPos.x && point.y === selectedPos.y)) {
                            return;
                        }
                        if (point.x > 0 && point.x < mapWidth - 1 && point.y > 0 && point.y < mapHeight - 1) {
                            UI.addText(point.x, point.y, point.symbol, COLORS.CYAN);
                        }
                    });
                }
                const shipSymbol = getShipSymbolFromRotation(playerShip.rotation);
                UI.addText(shipX, shipY, shipSymbol, COLORS.CYAN);
            }
        }

        // Info panel (right side)
        const infoX = Math.min(grid.width - 1, Math.max(mapWidth + 2, grid.width - 30));
        console.log('[LocalSystemMap] layout', {
            gridWidth: grid.width,
            gridHeight: grid.height,
            mapWidth,
            mapHeight,
            infoX,
            expectedGap: infoX - (mapWidth + 1)
        });
        UI.addHeaderLine(infoX, 0, 'System Info');
        UI.addText(infoX, 2, `System: ${system.name}`, COLORS.TEXT_NORMAL);
        UI.addText(infoX, 3, `Planets: ${planets.length}`, COLORS.TEXT_NORMAL);

        if (bodies.length > 0 && bodies[selectedIndex]) {
            const body = bodies[selectedIndex];
            const bodyName = body.name || body.id || body.type;
            let infoY = 5;
            infoY = UI.addHeaderLine(infoX, infoY, 'Selected Object');
            UI.addText(infoX, infoY, `Name: ${bodyName}`, COLORS.TEXT_NORMAL);
            infoY += 1;
            if (body.type === 'STATION') {
                UI.addText(infoX, infoY, 'Type: Space Station', COLORS.TEXT_NORMAL);
                infoY += 1;
                UI.addText(infoX, infoY, `Orbit: ${body.orbit.semiMajorAU.toFixed(2)} AU`, COLORS.TEXT_NORMAL);
            } else if (body.orbit) {
                UI.addText(infoX, infoY, `Type: ${BODY_TYPES[body.type]?.name || body.type}`, COLORS.TEXT_NORMAL);
                infoY += 1;
                UI.addText(infoX, infoY, `Orbit: ${body.orbit.semiMajorAU.toFixed(2)} AU`, COLORS.TEXT_NORMAL);
                infoY += 1;
                if (body.radiusAU) {
                    UI.addText(infoX, infoY, `Radius: ${body.radiusAU.toExponential(2)} AU`, COLORS.TEXT_NORMAL);
                }
            } else {
                UI.addText(infoX, infoY, `Type: ${BODY_TYPES[body.type]?.name || body.type}`, COLORS.TEXT_NORMAL);
            }
        }

        // Destination info
        if (gameState.localDestination) {
            let destY = 13;
            destY = UI.addHeaderLine(infoX, destY, 'Destination');
            const destName = gameState.localDestination.name || gameState.localDestination.id || 'Unknown';
            UI.addText(infoX, destY, `Target: ${destName}`, COLORS.GREEN);
            destY += 1;
            if (gameState.localDestination.type === 'STATION') {
                UI.addText(infoX, destY, 'Type: Space Station', COLORS.TEXT_NORMAL);
                destY += 1;
                UI.addText(infoX, destY, `Orbit: ${gameState.localDestination.orbit.semiMajorAU.toFixed(2)} AU`, COLORS.TEXT_NORMAL);
            } else if (gameState.localDestination.orbit) {
                UI.addText(infoX, destY, `Type: ${BODY_TYPES[gameState.localDestination.type]?.name || gameState.localDestination.type}`, COLORS.TEXT_NORMAL);
                destY += 1;
                UI.addText(infoX, destY, `Orbit: ${gameState.localDestination.orbit.semiMajorAU.toFixed(2)} AU`, COLORS.TEXT_NORMAL);
            }
        }

        // Buttons
        const buttonY = grid.height - 4;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;

        UI.addButton(clampButtonX(leftX, '1', 'Prev Body'), buttonY, '1', 'Prev Body', () => {
            if (bodies.length > 0) {
                selectedIndex = (selectedIndex - 1 + bodies.length) % bodies.length;
                render(gameState);
            }
        }, COLORS.BUTTON, 'Select previous body');

        UI.addButton(clampButtonX(leftX, '2', 'Next Body'), buttonY + 1, '2', 'Next Body', () => {
            if (bodies.length > 0) {
                selectedIndex = (selectedIndex + 1) % bodies.length;
                render(gameState);
            }
        }, COLORS.BUTTON, 'Select next body');

        UI.addButton(clampButtonX(middleX, '3', 'Set Destination'), buttonY, '3', 'Set Destination', () => {
            if (bodies.length === 0) {
                return;
            }
            const body = bodies[selectedIndex];
            if (!body) {
                return;
            }
            if (body.type === 'STATION') {
                const stationDir = ThreeDUtils.normalizeVec({ x: 0, y: 0, z: 1 });
                const stationOrbit = system.station?.orbit?.semiMajorAU || SYSTEM_PLANET_ORBIT_MIN_AU;
                gameState.localDestination = {
                    id: system.station?.id || `${system.name}-STATION`,
                    type: 'STATION',
                    name: body.name,
                    positionWorld: {
                        x: system.x * LY_TO_AU + stationDir.x * stationOrbit,
                        y: system.y * LY_TO_AU + stationDir.y * stationOrbit,
                        z: stationDir.z * stationOrbit
                    },
                    orbit: {
                        semiMajorAU: stationOrbit,
                        periodDays: Number.POSITIVE_INFINITY,
                        percentOffset: 0,
                        progress: 0
                    }
                };
            } else {
                gameState.localDestination = body;
            }
            gameState.localDestinationSystemIndex = gameState.currentSystemIndex;
            if (returnCallback) {
                returnCallback();
            }
        }, COLORS.GREEN, 'Set destination and return to travel');

        UI.addButton(clampButtonX(middleX, '4', 'Auto-Nav'), buttonY + 1, '4', 'Auto-Nav', () => {
            if (bodies.length === 0) {
                return;
            }
            const body = bodies[selectedIndex];
            if (!body) {
                return;
            }
            if (body.type === 'STATION') {
                const stationDir = ThreeDUtils.normalizeVec({ x: 0, y: 0, z: 1 });
                const stationOrbit = system.station?.orbit?.semiMajorAU || SYSTEM_PLANET_ORBIT_MIN_AU;
                gameState.localDestination = {
                    id: system.station?.id || `${system.name}-STATION`,
                    type: 'STATION',
                    name: body.name,
                    positionWorld: {
                        x: system.x * LY_TO_AU + stationDir.x * stationOrbit,
                        y: system.y * LY_TO_AU + stationDir.y * stationOrbit,
                        z: stationDir.z * stationOrbit
                    },
                    orbit: {
                        semiMajorAU: stationOrbit,
                        periodDays: Number.POSITIVE_INFINITY,
                        percentOffset: 0,
                        progress: 0
                    }
                };
            } else {
                gameState.localDestination = body;
            }
            gameState.localDestinationSystemIndex = gameState.currentSystemIndex;
            if (returnCallback) {
                returnCallback();
            }
            // Activate auto-nav after short delay to ensure SpaceTravel map is initialized
            setTimeout(() => {
                const spaceTravel = window.SpaceTravel;
                if (spaceTravel && typeof spaceTravel.toggleAutoNav === 'function') {
                    spaceTravel.toggleAutoNav();
                }
            }, 100);
        }, COLORS.CYAN, 'Set destination and activate auto-navigation');

        UI.addButton(clampButtonX(middleX, '5', 'Zoom In'), buttonY + 2, '5', 'Zoom In', () => {
            mapZoom = Math.min(3, mapZoom * 1.2);
            render(gameState);
        }, COLORS.BUTTON, 'Zoom in');

        UI.addButton(clampButtonX(middleX, '6', 'Zoom Out'), buttonY + 3, '6', 'Zoom Out', () => {
            mapZoom = Math.max(0.5, mapZoom / 1.2);
            render(gameState);
        }, COLORS.BUTTON, 'Zoom out');

        UI.addButton(clampButtonX(rightX, '7', 'Galaxy Map'), buttonY, '7', 'Galaxy Map', () => {
            GalaxyMap.show(gameState);
        }, COLORS.BUTTON, 'Open the galaxy map');

        const backHelp = returnCallback ? 'Return to previous menu' : 'Return to galaxy map';
        UI.addButton(clampButtonX(rightX, '0', 'Back'), buttonY + 1, '0', 'Back', () => {
            if (returnCallback) {
                returnCallback();
                return;
            }
            GalaxyMap.show(gameState);
        }, COLORS.BUTTON, backHelp);

        UI.draw();
        UI.logScreenToConsole();
    }

    function getPlanetColor(typeId) {
        switch (typeId) {
            case BODY_TYPES.PLANET_GAS_GIANT.id:
            case BODY_TYPES.PLANET_GAS_DWARF.id:
                return '#d9a45b';
            case BODY_TYPES.PLANET_ICE_GIANT.id:
            case BODY_TYPES.PLANET_ICE_DWARF.id:
                return '#8fd2ff';
            case BODY_TYPES.PLANET_EARTHLIKE.id:
                return '#5fbf6b';
            default:
                return '#b0b0b0';
        }
    }

    function getBodyColor(body) {
        if (!body) {
            return COLORS.TEXT_NORMAL;
        }
        if (body.type === 'STATION') {
            return COLORS.GRAY;
        }
        const starTypeId = BODY_TYPES?.STAR?.id;
        if ((typeof starTypeId !== 'undefined' && body.type === starTypeId) || body.type === 'STAR') {
            return '#ffd76a';
        }
        return getPlanetColor(body.type);
    }

    function getShipSymbolFromRotation(rotation) {
        const forward = ThreeDUtils.getLocalAxes(rotation).forward;
        const angle = Math.atan2(-forward.y, forward.x);
        const degrees = (angle * (180 / Math.PI) + 360) % 360;

                if (degrees >= 337.5 || degrees < 22.5) {
                    return '\u25B6'; // Right ▶
                } else if (degrees >= 22.5 && degrees < 67.5) {
                    return '\u25E5'; // Upper-Right ◥
                } else if (degrees >= 67.5 && degrees < 112.5) {
                    return '\u25B2'; // Up ▲
                } else if (degrees >= 112.5 && degrees < 157.5) {
                    return '\u25E4'; // Upper-Left ◤
                } else if (degrees >= 157.5 && degrees < 202.5) {
                    return '\u25C0'; // Left ◀
                } else if (degrees >= 202.5 && degrees < 247.5) {
                    return '\u25E3'; // Lower-Left ◣
                } else if (degrees >= 247.5 && degrees < 292.5) {
                    return '\u25BC'; // Down ▼
                }
                return '\u25E2'; // Lower-Right ◢
    }

    function getBodySymbol(body, isSelected) {
        return SpaceTravelShared.getLocalMapBodySymbol(body);
    }

    function formatDate(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    return {
        show,
        render
    };
})();
