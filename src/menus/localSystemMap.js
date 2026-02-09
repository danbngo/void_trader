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
        UI.addHeaderLine(2, 0, 'LOCAL SYSTEM');
        UI.addText(mapWidth - 18, 0, system.name, COLORS.TEXT_DIM);

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
            const starSymbol = selectedIndex === 0 ? '✶' : '✶';
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
            const symbol = body.type === 'STATION'
                ? (index === selectedIndex ? '■' : '□')
                : (index === selectedIndex ? '●' : '•');
            UI.addText(px, py, symbol, color);
            UI.registerTableRow(px, py, 1, index, (rowIndex) => {
                selectedIndex = rowIndex;
                render(gameState);
            });
        });

        // Info panel (right side)
        const infoX = mapWidth + 2;
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
        UI.addButton(infoX, buttonY, '1', 'Prev Body', () => {
            if (bodies.length > 0) {
                selectedIndex = (selectedIndex - 1 + bodies.length) % bodies.length;
                render(gameState);
            }
        }, COLORS.BUTTON, 'Select previous body');

        UI.addButton(infoX, buttonY + 1, '2', 'Next Body', () => {
            if (bodies.length > 0) {
                selectedIndex = (selectedIndex + 1) % bodies.length;
                render(gameState);
            }
        }, COLORS.BUTTON, 'Select next body');

        UI.addButton(infoX, buttonY + 2, '3', 'Set Destination', () => {
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

        const backHelp = returnCallback ? 'Return to previous menu' : 'Return to galaxy map';
        UI.addButton(infoX + 22, buttonY + 2, '0', 'Back', () => {
            if (returnCallback) {
                returnCallback();
                return;
            }
            GalaxyMap.show(gameState);
        }, COLORS.BUTTON, backHelp);

        UI.draw();
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

    return {
        show,
        render
    };
})();
