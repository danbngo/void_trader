/**
 * Space Travel Messages
 * Handles in-game message state (boost warnings, etc.)
 */

const SpaceTravelMessages = (() => {
    function create(config) {
        function updateBoostMessages(mapInstance, timestampMs, keyYawLeft, keyYawRight, keyPitchUp, keyPitchDown) {
            const {
                inputState,
                playerShip,
                boostActive,
                boostCooldownRemaining
            } = mapInstance;

            const codeState = inputState.codeState || inputState.keyState;
            const boostKey = codeState.has('ShiftLeft') || codeState.has('ShiftRight') || inputState.keyState.has('Shift');
            const engine = playerShip.engine || 10;
            const baseMaxSpeed = engine * config.SHIP_SPEED_PER_ENGINE;
            const speedNow = ThreeDUtils.vecLength(playerShip.velocity);
            const hasFuel = (playerShip.fuel ?? 0) > 0;
            const boostReady = speedNow >= (baseMaxSpeed * config.BOOST_READY_SPEED_RATIO);

            // Clear messages only if expired, otherwise keep them visible for 500ms
            const msgDuration = 500;
            if (mapInstance.boostBlockMessage && timestampMs - mapInstance.boostBlockMessageTimestampMs > msgDuration) {
                mapInstance.boostBlockMessage = '';
            }
            if (mapInstance.boostTurnMessage && timestampMs - mapInstance.boostTurnMessageTimestampMs > msgDuration) {
                mapInstance.boostTurnMessage = '';
            }

            const setBoostBlockMessage = (message) => {
                if (mapInstance.boostBlockMessage !== message) {
                    mapInstance.boostBlockMessage = message;
                    mapInstance.boostBlockMessageTimestampMs = timestampMs;
                }
            };

            const setBoostTurnMessage = (message) => {
                if (mapInstance.boostTurnMessage !== message) {
                    mapInstance.boostTurnMessage = message;
                    mapInstance.boostTurnMessageTimestampMs = timestampMs;
                }
            };

            if (boostKey && !boostActive) {
                if (boostCooldownRemaining > 0) {
                    setBoostBlockMessage('BOOSTER DISABLED: COOLDOWN');
                } else if (!hasFuel) {
                    setBoostBlockMessage('BOOSTER DISABLED: NO FUEL');
                    mapInstance.boostNoFuelTimestampMs = timestampMs;
                } else if (!boostReady) {
                    setBoostBlockMessage('BOOSTER DISABLED: MAX SPEED REQUIRED');
                }
            }

            if (boostActive && (keyYawLeft || keyYawRight || keyPitchUp || keyPitchDown)) {
                setBoostTurnMessage('BOOSTING: TURNING DISABLED');
            }
        }

        return {
            updateBoostMessages
        };
    }

    return {
        create
    };
})();
