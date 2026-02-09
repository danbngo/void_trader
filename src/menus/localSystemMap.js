/**
 * Local System Map Menu
 * Shows star and planets in the current system
 */

const LocalSystemMap = (() => {
    let selectedIndex = 0;
    let bodies = [];

    function show(gameState) {
        UI.clear();
        UI.resetSelection();
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

        const planets = Array.isArray(system.planets) ? system.planets : [];
        bodies = planets;
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

        const maxOrbit = planets.length > 0
            ? Math.max(...planets.map(p => p.orbit?.semiMajorAU || 0))
            : SYSTEM_PLANET_ORBIT_MIN_AU;
        const radius = Math.max(1, maxOrbit);
        const scale = (Math.min(mapWidth, mapHeight) / 2 - 2) / radius;

        // Draw star at center
        UI.addText(mapCenterX, mapCenterY, '✶', COLORS.YELLOW);

        // Draw planets
        planets.forEach((planet, index) => {
            const orbitPos = SystemOrbitUtils.getOrbitPosition(planet.orbit, gameState.date);
            const px = Math.round(mapCenterX + orbitPos.x * scale);
            const py = Math.round(mapCenterY - orbitPos.y * scale);
            if (px <= 0 || px >= mapWidth - 1 || py <= 0 || py >= mapHeight - 1) {
                return;
            }

            const color = getPlanetColor(planet.type);
            const symbol = index === selectedIndex ? '●' : '•';
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

        if (planets.length > 0 && planets[selectedIndex]) {
            const planet = planets[selectedIndex];
            UI.addText(infoX, 5, `Selected: ${planet.id}`, COLORS.TEXT_DIM);
            UI.addText(infoX, 6, `Type: ${BODY_TYPES[planet.type]?.name || planet.type}`, COLORS.TEXT_NORMAL);
            UI.addText(infoX, 7, `Orbit: ${planet.orbit.semiMajorAU.toFixed(2)} AU`, COLORS.TEXT_NORMAL);
            UI.addText(infoX, 8, `Radius: ${planet.radiusAU.toExponential(2)} AU`, COLORS.TEXT_NORMAL);
        }

        // Buttons
        const buttonY = grid.height - 4;
        UI.addButton(infoX, buttonY, '1', 'Prev Planet', () => {
            if (planets.length > 0) {
                selectedIndex = (selectedIndex - 1 + planets.length) % planets.length;
                render(gameState);
            }
        }, COLORS.BUTTON, 'Select previous planet');

        UI.addButton(infoX, buttonY + 1, '2', 'Next Planet', () => {
            if (planets.length > 0) {
                selectedIndex = (selectedIndex + 1) % planets.length;
                render(gameState);
            }
        }, COLORS.BUTTON, 'Select next planet');

        UI.addButton(infoX, buttonY + 2, '3', 'Set Destination', () => {
            if (planets.length > 0 && planets[selectedIndex]) {
                gameState.localDestination = planets[selectedIndex];
                gameState.localDestinationSystemIndex = gameState.currentSystemIndex;
            }
        }, COLORS.GREEN, 'Set destination to selected planet');

        UI.addButton(infoX + 22, buttonY + 2, '0', 'Back', () => {
            GalaxyMap.show(gameState);
        }, COLORS.BUTTON, 'Return to galaxy map');

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
