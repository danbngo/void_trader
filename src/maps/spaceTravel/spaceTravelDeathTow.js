/**
 * Space Travel Death/Tow logic
 */

const SpaceTravelDeathTow = (() => {
    function create(config) {
        let lastDamageSource = null;
        let deathSequenceActive = false;
        let deathSequenceStartMs = 0;

        function reset() {
            lastDamageSource = null;
            deathSequenceActive = false;
            deathSequenceStartMs = 0;
        }

        function recordDamageSource(source) {
            if (source) {
                lastDamageSource = source;
            }
        }

        function getDestructionReason() {
            if (!lastDamageSource) {
                return 'Your ship is disabled.';
            }
            const name = lastDamageSource.name || lastDamageSource.id || 'the hazard';
            switch (lastDamageSource.type) {
                case 'STAR_IMPACT':
                    return `You flew into ${name}!`;
                case 'STAR_HEAT':
                    return `Heat damage from ${name} destroys your ship!`;
                case 'STATION_COLLISION':
                    return `Your ship is destroyed after colliding with ${name}!`;
                default:
                    return 'Your ship is disabled.';
            }
        }

        function startDeathSequence({ timestampMs, playerShip, onCancelBoost }) {
            if (deathSequenceActive) {
                return;
            }
            deathSequenceActive = true;
            deathSequenceStartMs = timestampMs;
            if (typeof onCancelBoost === 'function') {
                onCancelBoost();
            }
            if (playerShip) {
                playerShip.velocity = { x: 0, y: 0, z: 0 };
            }
        }

        function isDeathSequenceComplete(timestampMs) {
            const redSec = Math.max(0.01, config.DEATH_FADE_TO_RED_SEC || 1);
            const blackSec = Math.max(0.01, config.DEATH_FADE_TO_BLACK_SEC || 1);
            const elapsedSec = Math.max(0, (timestampMs - deathSequenceStartMs) / 1000);
            return elapsedSec >= (redSec + blackSec);
        }

        function isDeathSequenceActive() {
            return deathSequenceActive;
        }

        function getDeathSequenceStartMs() {
            return deathSequenceStartMs;
        }

        function handleTowFromSpace({
            timestampMs = 0,
            currentGameState,
            playerShip,
            targetSystem,
            getNearestPlanet,
            stop,
            TowMenu,
            onCancelBoost
        }) {
            if (!currentGameState || !playerShip || playerShip.hull > 0) {
                return false;
            }
            if (!deathSequenceActive) {
                startDeathSequence({ timestampMs, playerShip, onCancelBoost });
                return false;
            }
            if (!isDeathSequenceComplete(timestampMs)) {
                return false;
            }
            const towLocation = typeof getNearestPlanet === 'function' ? getNearestPlanet() : null;
            const towSystemIndex = currentGameState.currentSystemIndex ?? currentGameState.previousSystemIndex;
            const reason = getDestructionReason();
            if (typeof stop === 'function') {
                stop();
            }
            if (TowMenu && typeof TowMenu.show === 'function') {
                TowMenu.show(currentGameState, {
                    location: towLocation,
                    systemIndex: towSystemIndex,
                    systemName: targetSystem?.name,
                    reason
                });
            }
            return true;
        }

        return {
            reset,
            recordDamageSource,
            getDestructionReason,
            startDeathSequence,
            isDeathSequenceComplete,
            isDeathSequenceActive,
            getDeathSequenceStartMs,
            handleTowFromSpace
        };
    }

    return {
        create
    };
})();
