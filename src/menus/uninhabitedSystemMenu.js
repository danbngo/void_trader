/**
 * Uninhabited System Menu
 * Allows mining in uninhabited systems
 */

const UninhabitedSystemMenu = (() => {
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;

    function show(gameState, location, onReturn) {
        outputMessage = '';
        outputColor = COLORS.TEXT_NORMAL;
        UI.clear();
        UI.resetSelection();
        render(gameState, location, onReturn);
    }

    function render(gameState, location, onReturn) {
        UI.clear();

        const grid = UI.getGridSize();
        const system = gameState.getCurrentSystem();
        const planet = location || (gameState.getCurrentLocation ? gameState.getCurrentLocation() : gameState.currentLocation) || null;
        const planetName = planet?.name || system.name;

        UI.addTitleLineCentered(0, `${planetName}: Uninhabited Planet`);

        let y = 2;
        if (planet) {
            const hasAtmosphere = planet.features?.includes(PLANET_FEATURES.HAS_ATMOSPHERE.id);
            const hasMoons = planet.features?.includes(PLANET_FEATURES.HAS_MOONS.id);
            const hasRings = planet.features?.includes(PLANET_FEATURES.RING.id);
            const hasIceCaps = planet.features?.includes(PLANET_FEATURES.HAS_ICE_CAPS.id);
            const surfaceName = PLANET_SURFACE_TYPES[planet.surfaceType]?.name || planet.surfaceType || 'Unknown';
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Type:', value: BODY_TYPES[planet.type]?.name || planet.type || 'Unknown', valueColor: COLORS.TEXT_NORMAL },
                { label: 'Surface:', value: surfaceName, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Atmosphere:', value: hasAtmosphere ? 'Yes' : 'No', valueColor: COLORS.TEXT_NORMAL },
                { label: 'Moons:', value: hasMoons ? 'Yes' : 'No', valueColor: COLORS.TEXT_NORMAL },
                { label: 'Rings:', value: hasRings ? 'Yes' : 'No', valueColor: COLORS.TEXT_NORMAL },
                { label: 'Ice Caps:', value: hasIceCaps ? 'Yes' : 'No', valueColor: COLORS.TEXT_NORMAL }
            ]);
        } else {
            const starsCount = (system.stars || []).length;
            const planetsCount = (system.planets || []).length;
            const moonsCount = (system.moons || []).length;
            const beltsCount = (system.belts || []).length;
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Stars:', value: String(starsCount), valueColor: COLORS.TEXT_NORMAL },
                { label: 'Planets:', value: String(planetsCount), valueColor: COLORS.TEXT_NORMAL },
                { label: 'Moons:', value: String(moonsCount), valueColor: COLORS.TEXT_NORMAL },
                { label: 'Belts:', value: String(beltsCount), valueColor: COLORS.TEXT_NORMAL }
            ]);
        }
        y++;

        const totalLasers = gameState.ships.reduce((sum, ship) => sum + Ship.getLaserMax(ship), 0);
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Mining Lasers:', value: String(totalLasers), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Cargo Space:', value: String(availableSpace), valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;

        UI.addHeaderLine(5, y++, 'Mining Operations');

        const miningOptions = getMiningOptions(planet);
        const buttonY = grid.height - 7;
        const leftX = 5;
        const middleX = 30;

        miningOptions.forEach((option, index) => {
            const buttonX = index < 3 ? leftX : middleX;
            const row = index < 3 ? index : index - 3;
            const disabled = !option.isAvailable;
            const color = disabled ? COLORS.TEXT_DIM : option.color;
            const helpText = disabled ? option.unavailableReason : option.helpText;
            UI.addButton(buttonX, buttonY + row, option.key, option.label, () => {
                if (disabled) {
                    outputMessage = option.unavailableReason;
                    outputColor = COLORS.TEXT_ERROR;
                    render(gameState, planet, onReturn);
                    return;
                }
                handleMining(gameState, option, planet, onReturn);
            }, color, helpText);
        });

        UI.addButton(5, grid.height - 3, '0', 'Depart', () => {
            departToSpace(gameState, planet, onReturn);
        }, COLORS.BUTTON, 'Return to space near the planet');

        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }

        UI.draw();
    }

    function getMiningOptions(planet) {
        if (!planet) {
            return [];
        }

        const hasAtmosphere = planet.features?.includes(PLANET_FEATURES.HAS_ATMOSPHERE.id);
        const hasMoons = planet.features?.includes(PLANET_FEATURES.HAS_MOONS.id);
        const hasRings = planet.features?.includes(PLANET_FEATURES.RING.id);
        const hasIceCaps = planet.features?.includes(PLANET_FEATURES.HAS_ICE_CAPS.id);
        const surfaceType = planet.surfaceType || '';
        const isOceanic = surfaceType === PLANET_SURFACE_TYPES.OCEANIC.id || surfaceType === PLANET_SURFACE_TYPES.EARTHLIKE.id;
        const isFrozen = surfaceType === PLANET_SURFACE_TYPES.FROZEN.id;
        const isLand = [
            PLANET_SURFACE_TYPES.BARREN.id,
            PLANET_SURFACE_TYPES.EARTHLIKE.id,
            PLANET_SURFACE_TYPES.DESERT.id,
            PLANET_SURFACE_TYPES.CRYSTALLINE.id
        ].includes(surfaceType);

        return [
            buildOption('1', 'Mine Atmosphere', {
                primaryCargoIds: [CARGO_TYPES.AIR.id],
                bonusCargoIds: [CARGO_TYPES.PLASMA.id],
                bonusChance: 0.15
            }, hasAtmosphere, 1.0, COLORS.BUTTON, 'Extract air with occasional plasma', 'No atmosphere to mine.'),
            buildOption('2', 'Mine Rings', {
                primaryCargoIds: [CARGO_TYPES.METAL.id],
                bonusCargoIds: [CARGO_TYPES.ISOTOPES.id],
                bonusChance: 0.2
            }, hasRings, 1.2, COLORS.YELLOW, 'Harvest metals from rings', 'No rings detected.'),
            buildOption('3', 'Mine Moons', {
                primaryCargoIds: CARGO_TYPES_SAFE.map(ct => ct.id),
                bonusCargoIds: CARGO_TYPES_DANGEROUS.map(ct => ct.id),
                bonusChance: 0.1
            }, hasMoons, 1.4, COLORS.YELLOW, 'Harvest common goods from moons', 'No moons available.'),
            buildOption('4', 'Mine Ocean', {
                primaryCargoIds: [CARGO_TYPES.WATER.id],
                bonusCargoIds: [CARGO_TYPES.HYDROCARBONS.id],
                bonusChance: 0.2
            }, isOceanic, 1.5, COLORS.BUTTON, 'Harvest water with occasional hydrocarbons', 'No oceans to mine.'),
            buildOption('5', 'Mine Ice', {
                primaryCargoIds: [CARGO_TYPES.WATER.id],
                bonusCargoIds: [CARGO_TYPES.HYDROCARBONS.id],
                bonusChance: 0.35
            }, hasIceCaps || isFrozen, 1.7, COLORS.TEXT_WARNING, 'Harvest ice and hydrocarbons', 'No ice caps detected.'),
            buildOption('6', 'Mine Land', {
                primaryCargoIds: [CARGO_TYPES.METAL.id],
                bonusCargoIds: [CARGO_TYPES.ISOTOPES.id],
                bonusChance: 0.35
            }, isLand, 1.9, COLORS.TEXT_ERROR, 'Extract metals and isotopes', 'No suitable land to mine.')
        ];
    }

    function buildOption(key, label, cargoConfig, isAvailable, riskMultiplier, color, helpText, unavailableReason) {
        return {
            key,
            label,
            cargoConfig,
            isAvailable,
            riskMultiplier,
            color,
            helpText,
            unavailableReason
        };
    }

    function handleMining(gameState, option, planet, onReturn) {
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        if (availableSpace <= 0) {
            outputMessage = 'No cargo space available for mining.';
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, planet, onReturn);
            return;
        }

        const totalLasers = gameState.ships.reduce((sum, ship) => sum + Ship.getLaserMax(ship), 0);
        if (totalLasers <= 0) {
            outputMessage = 'No mining lasers available.';
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, planet, onReturn);
            return;
        }

        const anyHullAboveOne = gameState.ships.some(ship => ship.hull > 1);
        if (!anyHullAboveOne) {
            outputMessage = 'Hull integrity too low to risk mining.';
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, planet, onReturn);
            return;
        }

        const system = gameState.getCurrentSystem();
        const primaryIds = option.cargoConfig?.primaryCargoIds || [];
        const primaryId = primaryIds.length > 0 ? primaryIds[Math.floor(Math.random() * primaryIds.length)] : null;
        const priceModifier = (planet?.cargoPriceModifier && primaryId && planet.cargoPriceModifier[primaryId])
            || (system.cargoPriceModifier && primaryId && system.cargoPriceModifier[primaryId])
            || 1.0;
        const abundanceMultiplier = clamp(1 / priceModifier, 0.25, 4.0);
        const yieldMultiplier = abundanceMultiplier * option.riskMultiplier;

        const expectedGoods = totalLasers * MINING_MAX_GOODS_PER_LASER * yieldMultiplier;
        const guaranteed = Math.floor(expectedGoods);
        const chance = expectedGoods - guaranteed;
        let goods = guaranteed + (Math.random() < chance ? 1 : 0);
        goods = Math.max(0, goods);

        if (goods === 0) {
            outputMessage = 'Mining yielded no recoverable goods.';
            outputColor = COLORS.TEXT_DIM;
            render(gameState, planet, onReturn);
            return;
        }

        const actualGoods = Math.min(goods, availableSpace);

        const bonusIds = option.cargoConfig?.bonusCargoIds || [];
        const bonusChance = option.cargoConfig?.bonusChance || 0;
        const bonusGoods = Math.min(actualGoods, Math.floor(actualGoods * bonusChance));
        const primaryGoods = Math.max(0, actualGoods - bonusGoods);

        let addedPrimary = 0;
        let addedBonus = 0;
        let bonusId = null;

        if (primaryId && primaryGoods > 0) {
            addedPrimary = Ship.addCargoToFleet(gameState.ships, primaryId, primaryGoods);
        }
        if (bonusIds.length > 0 && bonusGoods > 0) {
            bonusId = bonusIds[Math.floor(Math.random() * bonusIds.length)];
            addedBonus = Ship.addCargoToFleet(gameState.ships, bonusId, bonusGoods);
        }

        let totalDamage = 0;
        const maxDamage = Math.max(1, Math.round(MINING_MAX_HULL_DAMAGE * option.riskMultiplier));
        gameState.ships.forEach(ship => {
            if (ship.hull <= 1) return;
            const damage = Math.max(1, Math.floor(Math.random() * maxDamage) + 1);
            const actualDamage = Math.min(damage, ship.hull - 1);
            ship.hull -= actualDamage;
            totalDamage += actualDamage;
        });

        const cargoName = primaryId ? (CARGO_TYPES[primaryId]?.name || primaryId) : 'Goods';
        const bonusName = bonusId ? (CARGO_TYPES[bonusId]?.name || bonusId) : null;
        if (addedBonus > 0 && bonusName) {
            outputMessage = `Mining complete: +${addedPrimary} ${cargoName}, +${addedBonus} ${bonusName}, ${totalDamage} hull damage across fleet.`;
        } else {
            outputMessage = `Mining complete: +${addedPrimary} ${cargoName}, ${totalDamage} hull damage across fleet.`;
        }
        outputColor = COLORS.TEXT_NORMAL;
        render(gameState, planet, onReturn);
    }

    function departToSpace(gameState, planet, onReturn) {
        const system = gameState.getCurrentSystem();
        const playerShip = gameState.ships && gameState.ships[0];
        if (!system || !playerShip) {
            if (onReturn) {
                onReturn();
                return;
            }
            GalaxyMap.show(gameState);
            return;
        }

        const systemCenter = {
            x: system.x * SpaceTravelConfig.LY_TO_AU,
            y: system.y * SpaceTravelConfig.LY_TO_AU,
            z: 0
        };
        const orbitOffset = planet?.orbit
            ? SystemOrbitUtils.getOrbitPosition(planet.orbit, gameState.date)
            : { x: 0, y: 0, z: 0 };
        const planetPos = ThreeDUtils.addVec(systemCenter, orbitOffset);
        const rel = ThreeDUtils.subVec(planetPos, systemCenter);
        const dir = ThreeDUtils.vecLength(rel) > 0
            ? ThreeDUtils.normalizeVec(rel)
            : { x: 0, y: 0, z: 1 };
        
        console.log('[UninhabitedSystemMenu] ===== PLANET SPAWN START =====');
        console.log('  system position (LY):', { x: system.x, y: system.y });
        console.log('  systemCenter (AU):', systemCenter);
        console.log('  planet orbit:', planet?.orbit);
        console.log('  orbitOffset:', orbitOffset);
        console.log('  planetPos:', planetPos);
        console.log('  dir (radial from center):', dir);
        
        const physicsScale = (typeof SpaceTravelConfig.SYSTEM_BODY_PHYSICS_SCALE === 'number' && SpaceTravelConfig.SYSTEM_BODY_PHYSICS_SCALE > 0)
            ? SpaceTravelConfig.SYSTEM_BODY_PHYSICS_SCALE
            : 1;
        const planetRadius = planet?.radiusAU || 0;
        const dockMult = SpaceTravelConfig.PLANET_DOCK_RADIUS_MULT || 1;
        const offsetDistance = planetRadius * physicsScale * dockMult * 1.1;
        console.log('  planetRadius:', planetRadius);
        console.log('  physicsScale:', physicsScale);
        console.log('  dockMult:', dockMult);
        console.log('  offsetDistance:', offsetDistance);

        playerShip.velocity = { x: 0, y: 0, z: 0 };
        playerShip.position = ThreeDUtils.addVec(planetPos, ThreeDUtils.scaleVec(dir, offsetDistance));
        console.log('  player spawn position:', playerShip.position);
        console.log('  vector from player to planet:', ThreeDUtils.subVec(planetPos, playerShip.position));
        
        console.log('  calling faceToward...');
        ThreeDUtils.faceToward(playerShip, planetPos);
        console.log('  player rotation after faceToward:', playerShip.rotation);
        console.log('[UninhabitedSystemMenu] ===== PLANET SPAWN END =====');

        if (planet) {
            gameState.localDestination = planet;
            gameState.localDestinationSystemIndex = gameState.currentSystemIndex;
        }

        SpaceTravelMap.show(gameState, system, { resetPosition: false, localDestination: gameState.localDestination });
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    return {
        show
    };
})();
