/**
 * Introduction Screen
 * Shows the game intro story
 */

const IntroScreen = (() => {
    /**
     * Show the introduction
     * @param {GameState} gameState - Current game state
     */
    function show(gameState) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTitleLineCentered(0, 'The Void Beckons');
        
        // Story text
        UI.addTextCentered(2, 'You are a novice trader, fresh from the', COLORS.TEXT_NORMAL);
        UI.addTextCentered(7, 'academy, with dreams of fortune and glory.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(9, 'Your uncle, a legendary void trader, has', COLORS.TEXT_NORMAL);
        UI.addTextCentered(10, 'passed away, leaving you his ship and', COLORS.TEXT_NORMAL);
        UI.addTextCentered(11, 'a modest sum of credits.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(13, 'The galaxy is vast and dangerous, but', COLORS.TEXT_NORMAL);
        UI.addTextCentered(14, 'opportunity awaits those bold enough to', COLORS.TEXT_NORMAL);
        UI.addTextCentered(15, 'traverse the void between stars.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(17, 'You have 50 years until retirement.', COLORS.YELLOW);
        UI.addTextCentered(18, 'Accumulate as many credits as possible!', COLORS.YELLOW);
        
        // Ship and credit info
        UI.addTextCentered(21, `Your Ships: ${gameState.ships.length}`, COLORS.CYAN);
        UI.addTextCentered(22, `Starting Credits: ${gameState.credits} CR`, COLORS.GREEN);

        const symbolLine = '⓿ ⚉ ʘ ⊹';
        UI.addTextCentered(23, symbolLine, COLORS.TEXT_NORMAL);
        console.log('[IntroScreen] Symbol Line:', symbolLine);

        logCurrentSystemBodies(gameState);
        logInitialStationState(gameState);
        
        UI.addTextCentered(25, 'Will you make your fortune in the void?', COLORS.TEXT_DIM);
        UI.addTextCentered(26, 'Or perish among the stars?', COLORS.TEXT_DIM);
        
        // Continue button
        UI.addCenteredButton(grid.height - 4, '1', 'Begin Your Journey', () => {
                const destination = gameState.getCurrentSystem() || getNearestSystem(gameState);
                if (destination) {
                    SpaceTravelMap.show(gameState, destination, { resetPosition: true });
                } else {
                DockMenu.show(gameState, gameState.getCurrentLocation ? gameState.getCurrentLocation() : gameState.currentLocation);
            }
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();

function logCurrentSystemBodies(gameState) {
    const system = gameState.getCurrentSystem();
    if (!system) {
        console.log('[IntroScreen] No current system to log.');
        return;
    }
    const date = gameState.date ? gameState.date.toISOString() : 'unknown-date';
    console.log('[IntroScreen] Current system bodies', {
        systemName: system.name,
        systemIndex: system.index,
        date
    });

    const bodies = [];
    (system.planets || []).forEach(planet => {
        const orbitPos = planet.orbit
            ? SystemOrbitUtils.getOrbitPosition(planet.orbit, gameState.date)
            : { x: 0, y: 0, z: 0 };
        bodies.push({
            id: planet.id,
            name: planet.name,
            type: planet.type,
            radiusAU: planet.radiusAU,
            kind: planet.kind,
            rotationDurationHours: planet.rotationDurationHours,
            rotationPhase: planet.rotationPhase,
            axialTiltDeg: planet.axialTiltDeg,
            population: planet.population,
            governmentType: planet.governmentType,
            cultureLevel: planet.cultureLevel,
            technologyLevel: planet.technologyLevel,
            industryLevel: planet.industryLevel,
            populationLevel: planet.populationLevel,
            fees: planet.fees,
            buildings: planet.buildings,
            conqueredByAliens: planet.conqueredByAliens,
            conqueredYear: planet.conqueredYear,
            orbit: planet.orbit,
            orbitPos
        });
    });
    console.log('[IntroScreen] Planet positions', bodies);
}

function logInitialStationState(gameState) {
    const system = gameState.getCurrentSystem();
    const playerShip = gameState.ships && gameState.ships[0];
    if (!system || !playerShip) {
        console.log('[IntroScreen] Missing system or player ship for station log.');
        return;
    }
    const stationOrbit = typeof system.stationOrbitAU === 'number'
        ? system.stationOrbitAU
        : SYSTEM_PLANET_ORBIT_MAX_AU + SYSTEM_STATION_ORBIT_BUFFER_AU;
    const entranceDir = ThreeDUtils.normalizeVec(SpaceTravelConfig.STATION_ENTRANCE_DIR);
    const stationPos = {
        x: system.x * SpaceTravelConfig.LY_TO_AU + entranceDir.x * stationOrbit,
        y: system.y * SpaceTravelConfig.LY_TO_AU + entranceDir.y * stationOrbit,
        z: entranceDir.z * stationOrbit
    };
    const gameSeconds = gameState.date ? (gameState.date.getTime() / 1000) : 0;
    const dayT = (gameSeconds % SpaceTravelConfig.GAME_SECONDS_PER_DAY) / SpaceTravelConfig.GAME_SECONDS_PER_DAY;
    const stationRotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, dayT * Math.PI * 2);
    const entranceYaw = ThreeDUtils.degToRad(SpaceTravelConfig.STATION_ENTRANCE_YAW_DEG || 0);
    const yawRot = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, entranceYaw);
    const yawedEntranceDir = ThreeDUtils.rotateVecByQuat(entranceDir, yawRot);
    const entranceWorldDir = ThreeDUtils.rotateVecByQuat(yawedEntranceDir, stationRotation);
    const entranceWorldAngleDeg = Math.atan2(entranceWorldDir.x, entranceWorldDir.z) * (180 / Math.PI);
    const toStation = ThreeDUtils.subVec(stationPos, playerShip.position);
    const playerToStationAngleDeg = Math.atan2(toStation.x, toStation.z) * (180 / Math.PI);
    console.log('[IntroScreen] Station spawn info', {
        systemName: system.name,
        stationOrbitAU: stationOrbit,
        stationPos,
        entranceDir,
        stationRotation,
        entranceWorldAngleDeg,
        playerToStationAngleDeg,
        playerPos: playerShip.position,
        playerRotation: playerShip.rotation
    });
}

function getNearestSystem(gameState) {
    if (!gameState || !gameState.systems || gameState.systems.length === 0) {
        return null;
    }
    const current = gameState.getCurrentSystem();
    if (!current) {
        return gameState.systems[0];
    }
    let nearest = null;
    let nearestDist = Infinity;
    gameState.systems.forEach(system => {
        if (system === current) {
            return;
        }
        const dist = current.distanceTo(system);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = system;
        }
    });
    return nearest;
}
