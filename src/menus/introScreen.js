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
        logInitialBodyScreenRadiiDelayed(gameState);
        
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
    const stationOrbit = typeof system.station?.orbit?.semiMajorAU === 'number'
        ? system.station.orbit.semiMajorAU
        : SYSTEM_PLANET_ORBIT_MAX_AU + SYSTEM_STATION_ORBIT_BUFFER_AU;
    // Use desired world direction for station placement
    const stationPlacementDir = ThreeDUtils.normalizeVec(SpaceTravelConfig.STATION_ENTRANCE_DIR);
    const stationPos = {
        x: system.x * SpaceTravelConfig.LY_TO_AU + stationPlacementDir.x * stationOrbit,
        y: system.y * SpaceTravelConfig.LY_TO_AU + stationPlacementDir.y * stationOrbit,
        z: stationPlacementDir.z * stationOrbit
    };
    
    // Calculate rotation to make entrance face radially
    const systemCenter = {
        x: system.x * SpaceTravelConfig.LY_TO_AU,
        y: system.y * SpaceTravelConfig.LY_TO_AU,
        z: 0
    };
    const radialDir = {
        x: stationPos.x - systemCenter.x,
        y: stationPos.y - systemCenter.y
    };
    const radialAngle = Math.atan2(radialDir.y, radialDir.x);
    
    const gameSeconds = gameState.date ? (gameState.date.getTime() / 1000) : 0;
    // Station rotation is STATIC based on radial direction
    // 1. Tip entrance from +Z to +X (rotate -90° around Y-axis)
    // 2. Rotate around Z-axis to face radially
    const tipRotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.PI / 2);
    const radialRotation = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 0, z: 1 }, radialAngle);
    const stationRotation = ThreeDUtils.quatMultiply(radialRotation, tipRotation);
    const entranceYaw = ThreeDUtils.degToRad(SpaceTravelConfig.STATION_ENTRANCE_YAW_DEG || 0);
    const yawRot = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 0, z: 1 }, entranceYaw);
    // Model's entrance is at +Z, transform by station rotation to get world direction
    const modelEntranceDir = { x: 0, y: 0, z: 1 };
    const yawedEntranceDir = ThreeDUtils.rotateVecByQuat(modelEntranceDir, yawRot);
    const entranceWorldDir = ThreeDUtils.rotateVecByQuat(yawedEntranceDir, stationRotation);
    const entranceWorldAngleDeg = Math.atan2(entranceWorldDir.x, entranceWorldDir.z) * (180 / Math.PI);
    const toStation = ThreeDUtils.subVec(stationPos, playerShip.position);
    const playerToStationAngleDeg = Math.atan2(toStation.x, toStation.z) * (180 / Math.PI);
    console.log('[IntroScreen] Station spawn info', {
        systemName: system.name,
        stationOrbitAU: stationOrbit,
        stationPos,
        modelEntranceDir,
        entranceWorldDir,
        stationRotation,
        entranceWorldAngleDeg,
        playerToStationAngleDeg,
        playerPos: playerShip.position,
        playerRotation: playerShip.rotation
    });
}

function logInitialBodyScreenRadiiDelayed(gameState) {
    const delayMs = 750;
    setTimeout(() => {
        logInitialBodyScreenRadii(gameState);
    }, delayMs);
}

function logInitialBodyScreenRadii(gameState) {
    const system = gameState.getCurrentSystem();
    const playerShip = gameState.ships && gameState.ships[0];
    if (!system || !playerShip || !playerShip.position) {
        console.log('[IntroScreen] Missing system or player ship position for body radius log.');
        return;
    }

    const grid = UI.getGridSize();
    const charDims = UI.getCharDimensions();
    const viewWidth = grid.width;
    const viewHeight = grid.height - SpaceTravelConfig.PANEL_HEIGHT;
    const charAspect = (typeof SpaceTravelConfig.CHAR_CELL_ASPECT_RATIO === 'number' && Number.isFinite(SpaceTravelConfig.CHAR_CELL_ASPECT_RATIO))
        ? SpaceTravelConfig.CHAR_CELL_ASPECT_RATIO
        : (charDims.height / Math.max(0.000001, charDims.width));
    const fovScale = Math.tan(ThreeDUtils.degToRad(SpaceTravelConfig.VIEW_FOV) / 2);
    const viewPixelWidth = viewWidth * charDims.width;
    const viewPixelHeight = viewHeight * charDims.height;

    const systemCenter = {
        x: system.x * SpaceTravelConfig.LY_TO_AU,
        y: system.y * SpaceTravelConfig.LY_TO_AU,
        z: 0
    };

    const bodies = [];
    (system.stars || []).forEach(star => bodies.push({ ...star, kind: 'STAR' }));
    (system.planets || []).forEach(planet => bodies.push({ ...planet, kind: 'PLANET' }));

    const stationOrbit = typeof system.station?.orbit?.semiMajorAU === 'number'
        ? system.station.orbit.semiMajorAU
        : SYSTEM_PLANET_ORBIT_MAX_AU + SYSTEM_STATION_ORBIT_BUFFER_AU;
    const stationSize = system.station?.radiusAU ?? SPACE_STATION_SIZE_AU;
    const entranceDir = ThreeDUtils.normalizeVec(SpaceTravelConfig.STATION_ENTRANCE_DIR);
    const stationPos = {
        x: systemCenter.x + entranceDir.x * stationOrbit,
        y: systemCenter.y + entranceDir.y * stationOrbit,
        z: entranceDir.z * stationOrbit
    };
    bodies.push({
        id: system.station?.id || 'STATION',
        name: system.station?.name || `${system.name} Station`,
        kind: 'STATION',
        type: 'STATION',
        radiusAU: stationSize,
        positionWorld: stationPos
    });

    const results = bodies.map(body => {
        const orbitOffset = body.orbit
            ? SystemOrbitUtils.getOrbitPosition(body.orbit, gameState.date)
            : { x: 0, y: 0, z: 0 };
        const bodyPos = body.positionWorld
            ? body.positionWorld
            : ThreeDUtils.addVec(systemCenter, orbitOffset);
        const dist = Math.max(1e-6, ThreeDUtils.vecLength(ThreeDUtils.subVec(bodyPos, playerShip.position)));
            const pixelsPerUnit = viewPixelWidth / (2 * fovScale * dist);
        const bodyRadiusAU = (body.radiusAU || 0) * (SpaceTravelConfig.SYSTEM_BODY_SCREEN_SCALE || 1);
            const radiusPx = bodyRadiusAU * pixelsPerUnit;
        const minRadiusChars = body.kind === 'STAR' ? 1 : 0;
        const radiusCharsX = Math.max(minRadiusChars, Math.round(radiusPx / charDims.width));
            const radiusCharsY = Math.max(minRadiusChars, Math.round(radiusPx / (charDims.width * charAspect)));

        return {
            id: body.id,
            name: body.name || body.type || body.kind,
            kind: body.kind,
            type: body.type,
            radiusAU: body.radiusAU || 0,
            distanceAU: dist,
            radiusCharsX,
            radiusCharsY
        };
    });

    console.log('[IntroScreen] Body screen radii (system bodies)', {
        systemName: system.name,
        viewWidth,
        viewHeight,
        screenScale: SpaceTravelConfig.SYSTEM_BODY_SCREEN_SCALE || 1,
        bodyCount: results.length
    });
    console.table(results);
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
