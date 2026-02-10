/**
 * Uninhabited System Menu
 * Allows mining in uninhabited systems
 */

const UninhabitedSystemMenu = (() => {
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;

    function show(gameState, onReturn) {
        outputMessage = '';
        outputColor = COLORS.TEXT_NORMAL;
        UI.clear();
        UI.resetSelection();
        render(gameState, onReturn);
    }

    function render(gameState, onReturn) {
        UI.clear();

        const grid = UI.getGridSize();
        const system = gameState.getCurrentSystem();

        UI.addTitleLineCentered(0, `${system.name}: Uninhabited System`);

        const starsCount = (system.stars || []).length;
        const planetsCount = (system.planets || []).length;
        const moonsCount = (system.moons || []).length;
        const beltsCount = (system.belts || []).length;

        let y = 2;
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Stars:', value: String(starsCount), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Planets:', value: String(planetsCount), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Moons:', value: String(moonsCount), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Belts:', value: String(beltsCount), valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;

        const totalLasers = gameState.ships.reduce((sum, ship) => sum + Ship.getLaserMax(ship), 0);
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Mining Lasers:', value: String(totalLasers), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Cargo Space:', value: String(availableSpace), valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;

        UI.addHeaderLine(5, y++, 'Mining Operations');

        const miningOptions = getMiningOptions(system);
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
                    render(gameState, onReturn);
                    return;
                }
                handleMining(gameState, option, onReturn);
            }, color, helpText);
        });

        UI.addButton(5, grid.height - 3, '0', 'Depart', () => onReturn(), COLORS.BUTTON, 'Return to the galaxy map');

        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }

        UI.draw();
    }

    function getMiningOptions(system) {
        const gasGiants = countBodies(system.planets, [BODY_TYPES.PLANET_GAS_GIANT.id]);
        const iceGiants = countBodies(system.planets, [BODY_TYPES.PLANET_ICE_GIANT.id]);
        const icyBelts = countBodies(system.belts, [BODY_TYPES.BELT_ICY.id]);
        const moons = (system.moons || []).length;
        const solarFlares = countBodies(system.stars, [BODY_TYPES.STAR_RED_GIANT.id, BODY_TYPES.STAR_BLUE_GIANT.id]);
        const gasDwarfs = countBodies(system.planets, [BODY_TYPES.PLANET_GAS_DWARF.id]);
        const gasBelts = countBodies(system.belts, [BODY_TYPES.BELT_GAS.id]);
        const asteroids = countBodies(system.belts, [BODY_TYPES.BELT_ASTEROID.id]);

        return [
            buildOption('1', 'Mine Atmospheres', CARGO_TYPES.AIR.id, gasGiants > 0, 1.0, COLORS.BUTTON, 'Extract breathable air from gas giants', 'No gas giants to mine for air.'),
            buildOption('2', 'Mine Icy Bodies', CARGO_TYPES.WATER.id, (iceGiants + icyBelts) > 0, 1.2, COLORS.BUTTON, 'Harvest water from icy bodies', 'No icy bodies to mine for water.'),
            buildOption('3', 'Mine Moons', CARGO_TYPES.FUEL.id, moons > 0, 1.4, COLORS.YELLOW, 'Extract fuel precursors from major moons', 'No moons available for fuel mining.'),
            buildOption('4', 'Mine Solar Flares', CARGO_TYPES.PLASMA.id, (solarFlares + gasDwarfs + gasBelts) > 0, 1.6, COLORS.YELLOW, 'Collect plasma from stellar flares', 'No plasma-rich flares or gas belts detected.'),
            buildOption('5', 'Mine Asteroids', CARGO_TYPES.ISOTOPES.id, asteroids > 0, 1.8, COLORS.TEXT_ERROR, 'Strip isotopes from asteroid belts', 'No asteroid belts for isotopes.')
        ];
    }

    function buildOption(key, label, cargoId, isAvailable, riskMultiplier, color, helpText, unavailableReason) {
        return {
            key,
            label,
            cargoId,
            isAvailable,
            riskMultiplier,
            color,
            helpText,
            unavailableReason
        };
    }

    function handleMining(gameState, option, onReturn) {
        const availableSpace = Ship.getFleetAvailableCargoSpace(gameState.ships);
        if (availableSpace <= 0) {
            outputMessage = 'No cargo space available for mining.';
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn);
            return;
        }

        const totalLasers = gameState.ships.reduce((sum, ship) => sum + Ship.getLaserMax(ship), 0);
        if (totalLasers <= 0) {
            outputMessage = 'No mining lasers available.';
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn);
            return;
        }

        const anyHullAboveOne = gameState.ships.some(ship => ship.hull > 1);
        if (!anyHullAboveOne) {
            outputMessage = 'Hull integrity too low to risk mining.';
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn);
            return;
        }

        const system = gameState.getCurrentSystem();
        const priceModifier = system.cargoPriceModifier[option.cargoId] || 1.0;
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
            render(gameState, onReturn);
            return;
        }

        const actualGoods = Math.min(goods, availableSpace);
        const added = Ship.addCargoToFleet(gameState.ships, option.cargoId, actualGoods);

        let totalDamage = 0;
        const maxDamage = Math.max(1, Math.round(MINING_MAX_HULL_DAMAGE * option.riskMultiplier));
        gameState.ships.forEach(ship => {
            if (ship.hull <= 1) return;
            const damage = Math.max(1, Math.floor(Math.random() * maxDamage) + 1);
            const actualDamage = Math.min(damage, ship.hull - 1);
            ship.hull -= actualDamage;
            totalDamage += actualDamage;
        });

        const cargoName = CARGO_TYPES[option.cargoId]?.name || option.cargoId;
        outputMessage = `Mining complete: +${added} ${cargoName}, ${totalDamage} hull damage across fleet.`;
        outputColor = COLORS.TEXT_NORMAL;
        render(gameState, onReturn);
    }

    function countBodies(list, typeIds) {
        if (!Array.isArray(list)) return 0;
        return list.reduce((sum, body) => sum + (typeIds.includes(body.type) ? 1 : 0), 0);
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    return {
        show
    };
})();
