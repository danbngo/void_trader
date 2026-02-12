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

            const boostKey = inputState.keyState.has('Shift');
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

            if (boostKey && !boostActive) {
                if (boostCooldownRemaining > 0) {
                    mapInstance.boostBlockMessage = 'BOOSTER DISABLED: COOLDOWN';
                    mapInstance.boostBlockMessageTimestampMs = timestampMs;
                } else if (!hasFuel) {
                    mapInstance.boostBlockMessage = 'BOOSTER DISABLED: NO FUEL';
                    mapInstance.boostBlockMessageTimestampMs = timestampMs;
                    mapInstance.boostNoFuelTimestampMs = timestampMs;
                } else if (!boostReady) {
                    mapInstance.boostBlockMessage = 'BOOSTER DISABLED: MAX SPEED REQUIRED';
                    mapInstance.boostBlockMessageTimestampMs = timestampMs;
                }
            }

            if (boostActive && (keyYawLeft || keyYawRight || keyPitchUp || keyPitchDown)) {
                mapInstance.boostTurnMessage = 'BOOSTING: TURNING DISABLED';
                mapInstance.boostTurnMessageTimestampMs = timestampMs;
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
