/**
 * Space Travel Map HUD
 */

const SpaceTravelHud = (() => {
    function renderHud({ viewWidth, viewHeight, playerShip, currentGameState, baseMaxSpeed, maxSpeed, boostActive, boostCooldownRemaining, isPaused, laserEmptyTimestampMs, boostNoFuelTimestampMs, timestampMs, config, helpers, autoNavActive, onAutoNavToggle, onMenu }) {
        const startY = viewHeight;
        const panelWidth = viewWidth;

        helpers.addHudText(0, startY, '─'.repeat(panelWidth), COLORS.GRAY);

        const ship = playerShip;
        if (!ship) {
            return;
        }

        const laserCurrent = Ship.getLaserCurrent(ship);
        const laserMax = Ship.getLaserMax(ship);
        const gameTimeLabel = formatGameTime(currentGameState?.date);

        const fuelRatio = ship.fuel / ship.maxFuel;
        const shieldRatio = ship.maxShields ? (ship.shields / ship.maxShields) : 0;
        const hullRatio = ship.hull / ship.maxHull;
        const laserRatio = laserMax > 0 ? (laserCurrent / laserMax) : 0;

        const speed = ThreeDUtils.vecLength(ship.velocity);
        const speedPerMinute = speed * 60;
        const speedRatio = maxSpeed > 0 ? (Math.min(1, speed / maxSpeed) * 2) : 0;
        const speedValueColor = boostActive
            ? COLORS.ORANGE
            : (speed <= 0
                ? COLORS.TEXT_DIM
                : (speed >= maxSpeed ? COLORS.ORANGE : UI.calcStatColor(speedRatio)));
        const speedArrow = getVelocityArrow(ship);
        const speedValueText = speedArrow
            ? `${speedPerMinute.toFixed(2)} AU/m ${speedArrow}`
            : `${speedPerMinute.toFixed(2)} AU/m`;

        const targetInfo = helpers.getActiveTargetInfo();
        const destinationLabel = targetInfo && targetInfo.name
            ? (targetInfo.symbol ? `${targetInfo.symbol} ${targetInfo.name}` : targetInfo.name)
            : '--';
        const destinationColor = targetInfo?.color || COLORS.TEXT_NORMAL;
        const distanceToTarget = targetInfo ? ThreeDUtils.vecLength(ThreeDUtils.subVec(targetInfo.position, ship.position)) : null;
        const distanceLabel = targetInfo
            ? (targetInfo.isLocal
                ? `${distanceToTarget.toFixed(2)} AU`
                : `${distanceToTarget.toFixed(2)} AU (${(distanceToTarget / config.LY_TO_AU).toFixed(3)} LY)`)
            : '--';
        const rightColumnX = Math.max(2, panelWidth - 32);

        const nowMs = timestampMs || 0;
        const fuelFlickerActive = nowMs > 0 && (nowMs - (boostNoFuelTimestampMs || 0)) <= 1000;
        const laserFlickerActive = nowMs > 0 && (nowMs - (laserEmptyTimestampMs || 0)) <= 1000;
        const flickerColor = (timestamp) => (Math.floor(timestamp / 200) % 2 === 0 ? COLORS.DARK_RED : COLORS.DARK_GRAY);
        const fuelValueColor = fuelFlickerActive
            ? flickerColor(nowMs)
            : UI.calcStatColor(fuelRatio, true);
        const laserValueColor = laserFlickerActive
            ? flickerColor(nowMs)
            : UI.calcStatColor(laserRatio, true);

        const leftRows = [
            {
                label: 'Fuel:',
                value: `${Math.floor(ship.fuel)}/${Math.floor(ship.maxFuel)}`,
                labelColor: helpers.applyPauseColor(COLORS.TEXT_DIM),
                valueColor: helpers.applyPauseColor(fuelValueColor)
            },
            {
                label: 'Lasers:',
                value: `${laserCurrent}/${laserMax}`,
                labelColor: helpers.applyPauseColor(COLORS.TEXT_DIM),
                valueColor: helpers.applyPauseColor(laserValueColor)
            },
            {
                label: 'Shields:',
                value: `${Math.floor(ship.shields)}/${Math.floor(ship.maxShields)}`,
                labelColor: helpers.applyPauseColor(COLORS.TEXT_DIM),
                valueColor: helpers.applyPauseColor(UI.calcStatColor(shieldRatio, true))
            },
            {
                label: 'Hull:',
                value: `${Math.floor(ship.hull)}/${Math.floor(ship.maxHull)}`,
                labelColor: helpers.applyPauseColor(COLORS.TEXT_DIM),
                valueColor: helpers.applyPauseColor(UI.calcStatColor(hullRatio, true))
            },
            {
                label: 'Speed:',
                value: speedValueText,
                labelColor: helpers.applyPauseColor(COLORS.TEXT_DIM),
                valueColor: helpers.applyPauseColor(speedValueColor)
            }
        ];

        TableRenderer.renderKeyValueList(2, startY + 1, leftRows);

        TableRenderer.renderKeyValueList(rightColumnX, startY + 1, [
            {
                label: 'Destination:',
                value: destinationLabel,
                labelColor: helpers.applyPauseColor(COLORS.TEXT_DIM),
                valueColor: helpers.applyPauseColor(destinationColor)
            },
            {
                label: 'Distance:',
                value: distanceLabel,
                labelColor: helpers.applyPauseColor(COLORS.TEXT_DIM),
                valueColor: helpers.applyPauseColor(COLORS.TEXT_NORMAL)
            },
            {
                label: 'Time:',
                value: gameTimeLabel,
                labelColor: helpers.applyPauseColor(COLORS.TEXT_DIM),
                valueColor: helpers.applyPauseColor(COLORS.TEXT_NORMAL)
            }
        ]);

        {
            const speedLabel = 'Speed:';
            const speedValue = speedValueText;
            let boostTag = '';
            let boostColor = COLORS.TEXT_NORMAL;
            if (boostActive) {
                boostTag = ' [BOOST]';
                boostColor = COLORS.ORANGE;
            } else if (!boostActive && boostCooldownRemaining > 0) {
                boostTag = ' [COOLDOWN]';
                boostColor = COLORS.TEXT_WARNING;
            } else if (!boostActive
                && boostCooldownRemaining <= 0
                && (ship.fuel ?? 0) > 0
                && speed >= (baseMaxSpeed * config.BOOST_READY_SPEED_RATIO)) {
                boostTag = ' [READY]';
                boostColor = COLORS.TEXT_SUCCESS;
            }
            if (boostTag) {
                const valueX = 2 + speedLabel.length + 1;
                const boostX = valueX + speedValue.length;
                const speedIndex = leftRows.findIndex(row => row.label === 'Speed:');
                const speedLineY = startY + 1 + Math.max(0, speedIndex);
                if (boostX < panelWidth) {
                    UI.addText(boostX, speedLineY, boostTag, helpers.applyPauseColor(boostColor));
                }
            }
        }

        renderCompass(viewWidth, viewHeight, startY, playerShip, helpers);

        const menuText = 'MENU';
        const buttonText = `[m] ${menuText}`;
        const menuX = Math.max(0, panelWidth - buttonText.length - 1);
        const menuY = startY + Math.max(0, config.PANEL_HEIGHT - 1);

        const autoNavAvailable = !!targetInfo;
        const autoNavLabel = autoNavActive ? 'Cancel Autonav' : 'Autonavigate';
        const autoNavText = `[1] ${autoNavLabel}`;
        const autoNavX = Math.max(0, menuX - autoNavText.length - 2);
        const autoNavColor = autoNavActive
            ? COLORS.TEXT_SUCCESS
            : (autoNavAvailable ? COLORS.CYAN : COLORS.TEXT_DIM);

        if (autoNavAvailable) {
            UI.addButton(autoNavX, menuY, '1', autoNavLabel, () => {
                if (onAutoNavToggle) {
                    onAutoNavToggle();
                }
            }, helpers.applyPauseColor(autoNavColor), '');
        } else {
            UI.addText(autoNavX, menuY, autoNavText, helpers.applyPauseColor(autoNavColor));
        }

        UI.addButton(menuX, menuY, 'm', menuText, () => {
            if (onMenu) {
                onMenu();
            }
        }, helpers.applyPauseColor(COLORS.CYAN), '');
    }

    function formatGameTime(date) {
        if (!date) {
            return '--';
        }
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()] || '';
        const day = date.getDate();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month} ${day} ${hours}:${minutes}`;
    }

    function renderCompass(viewWidth, viewHeight, startY, playerShip, helpers) {
        const targetInfo = helpers.getActiveTargetInfo();
        if (!playerShip || !targetInfo) {
            return;
        }
        const toTarget = ThreeDUtils.subVec(targetInfo.position, playerShip.position);
        const distanceToTarget = ThreeDUtils.vecLength(toTarget);
        if (distanceToTarget <= 0.000001) {
            return;
        }

        const cameraSpaceDir = ThreeDUtils.rotateVecByQuat(toTarget, ThreeDUtils.quatConjugate(playerShip.rotation));
        const screenDx = cameraSpaceDir.x;
        const screenDy = cameraSpaceDir.z;

        const compassCenterX = Math.floor(viewWidth / 2);
        const compassCenterY = startY + 3;

        helpers.addHudText(compassCenterX, compassCenterY, 'o', COLORS.CYAN);

        const arrow = getCompassArrowFromDirection(screenDx, screenDy);
        if (arrow) {
            helpers.addHudText(compassCenterX + arrow.dx, compassCenterY + arrow.dy, arrow.symbol, COLORS.CYAN);
        }

        const verticalRatio = cameraSpaceDir.y / distanceToTarget;
        let verticalLabel = 'LVL';
        if (verticalRatio > 0.2) {
            verticalLabel = 'ABV';
        } else if (verticalRatio < -0.2) {
            verticalLabel = 'BLW';
        }
        helpers.addHudText(compassCenterX - 2, compassCenterY + 2, verticalLabel, COLORS.CYAN);
    }

    function getCompassArrowFromDirection(dx, dy) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag <= 0.000001) {
            return null;
        }

        const angle = Math.atan2(dy, dx);
        const sector = Math.round(angle / (Math.PI / 4));
        const index = (sector + 8) % 8;
        const offsets = [
            { dx: 1, dy: 0, symbol: '→' },
            { dx: 1, dy: -1, symbol: '↗' },
            { dx: 0, dy: -1, symbol: '↑' },
            { dx: -1, dy: -1, symbol: '↖' },
            { dx: -1, dy: 0, symbol: '←' },
            { dx: -1, dy: 1, symbol: '↙' },
            { dx: 0, dy: 1, symbol: '↓' },
            { dx: 1, dy: 1, symbol: '↘' }
        ];
        return offsets[index];
    }

    function getVelocityArrow(ship) {
        if (!ship || !ship.velocity) {
            return '';
        }
        const speed = ThreeDUtils.vecLength(ship.velocity);
        if (speed <= 0.000001) {
            return '';
        }
        const cameraSpace = ThreeDUtils.rotateVecByQuat(ship.velocity, ThreeDUtils.quatConjugate(ship.rotation));
        const arrow = getCompassArrowFromDirection(cameraSpace.x, cameraSpace.z);
        return arrow ? arrow.symbol : '';
    }

    return {
        renderHud
    };
})();
