/**
 * Local System Map Menu
 * Shows star and planets in the current system
 */

const LocalSystemMap = (() => {
    let selectedIndex = 0;
    let bodies = [];
    let returnCallback = null;
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
        const station = {
            id: system.stationName || `${system.name} Station`,
            name: system.stationName || `${system.name} Station`,
            type: 'STATION',
            orbit: {
                semiMajorAU: system.stationOrbitAU,
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
        const scale = (Math.min(mapWidth, mapHeight) / 2 - 2) / radius;

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

            const color = getBodyColor(body);
            const symbol = getBodySymbol(body, index === selectedIndex);
            UI.addText(px, py, symbol, color);
            UI.registerTableRow(px, py, 1, index, (rowIndex) => {
                selectedIndex = rowIndex;
                render(gameState);
            });
        });

        // Info panel (right side)
        const infoX = Math.min(mapWidth + 1, Math.max(0, grid.width - 30));
        UI.addHeaderLine(infoX, 0, 'System Info');
        UI.addText(infoX, 2, `System: ${system.name}`, COLORS.TEXT_NORMAL);
        UI.addText(infoX, 3, `Planets: ${planets.length}`, COLORS.TEXT_NORMAL);

        if (bodies.length > 0 && bodies[selectedIndex]) {
            const body = bodies[selectedIndex];
            const bodyName = body.name || body.id || body.type;
            UI.addText(infoX, 5, `Selected: ${bodyName}`, COLORS.TEXT_DIM);
            if (body.type === 'STATION') {
                UI.addText(infoX, 6, 'Type: Space Station', COLORS.TEXT_NORMAL);
                UI.addText(infoX, 7, `Orbit: ${body.orbit.semiMajorAU.toFixed(2)} AU`, COLORS.TEXT_NORMAL);
            } else if (body.orbit) {
                UI.addText(infoX, 6, `Type: ${BODY_TYPES[body.type]?.name || body.type}`, COLORS.TEXT_NORMAL);
                UI.addText(infoX, 7, `Orbit: ${body.orbit.semiMajorAU.toFixed(2)} AU`, COLORS.TEXT_NORMAL);
                if (body.radiusAU) {
                    UI.addText(infoX, 8, `Radius: ${body.radiusAU.toExponential(2)} AU`, COLORS.TEXT_NORMAL);
                }
            } else {
                UI.addText(infoX, 6, `Type: ${BODY_TYPES[body.type]?.name || body.type}`, COLORS.TEXT_NORMAL);
            }
        }

        // Buttons
        const buttonY = grid.height - 4;
        const leftX = infoX;
        const middleX = infoX + 23;
        const rightX = infoX + 46;

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
                const stationOrbit = system.stationOrbitAU || SYSTEM_PLANET_ORBIT_MIN_AU;
                gameState.localDestination = {
                    id: `${system.name}-STATION`,
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
        }, COLORS.GREEN, 'Set destination to selected body');

        UI.addButton(clampButtonX(rightX, '4', 'Galaxy Map'), buttonY, '4', 'Galaxy Map', () => {
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

    function getBodySymbol(body, isSelected) {
        if (!body) {
            return isSelected ? '●' : '•';
        }
        if (body.type === 'STATION') {
            return isSelected ? '■' : '□';
        }
        const starTypeId = BODY_TYPES?.STAR?.id;
        if ((typeof starTypeId !== 'undefined' && body.type === starTypeId) || body.type === 'STAR') {
            return isSelected ? '✷' : '✶';
        }
        switch (body.type) {
            case BODY_TYPES.PLANET_GAS_GIANT.id:
                return isSelected ? '◉' : '○';
            case BODY_TYPES.PLANET_GAS_DWARF.id:
                return isSelected ? '◌' : '○';
            case BODY_TYPES.PLANET_ICE_GIANT.id:
                return isSelected ? '◆' : '◇';
            case BODY_TYPES.PLANET_ICE_DWARF.id:
                return isSelected ? '◇' : '◇';
            case BODY_TYPES.PLANET_EARTHLIKE.id:
            case BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id:
            case BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id:
                return isSelected ? '⬤' : '●';
            default:
                return isSelected ? '●' : '•';
        }
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
