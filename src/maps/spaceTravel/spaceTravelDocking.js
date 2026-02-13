/**
 * Space Travel Docking logic
 */

const SpaceTravelDocking = (() => {
    function create(config) {
        let dockSequenceActive = false;
        let dockSequenceStartMs = 0;
        let dockSequencePayload = null;

        function reset() {
            dockSequenceActive = false;
            dockSequenceStartMs = 0;
            dockSequencePayload = null;
        }

        function startDockSequence({ payload, timestampMs, playerShip, inputState }) {
            if (dockSequenceActive) {
                return;
            }
            dockSequenceActive = true;
            dockSequenceStartMs = timestampMs;
            dockSequencePayload = payload;
            if (playerShip) {
                playerShip.velocity = { x: 0, y: 0, z: 0 };
            }
            const keyStateSize = inputState?.keyState?.size || 0;
            const codeStateSize = inputState?.codeState?.size || 0;
            if (keyStateSize > 0 || codeStateSize > 0) {
                console.log('[Docking] Clearing input state:', { keyStateSize, codeStateSize, keys: Array.from(inputState.keyState || []), codes: Array.from(inputState.codeState || []) });
            }
            if (inputState?.keyState?.clear) {
                inputState.keyState.clear();
            }
            if (inputState?.codeState?.clear) {
                inputState.codeState.clear();
            }
        }

        function isDockSequenceComplete(timestampMs) {
            const blackSec = Math.max(0.01, config.DOCK_FADE_TO_BLACK_SEC || 1);
            const elapsedSec = Math.max(0, (timestampMs - dockSequenceStartMs) / 1000);
            return elapsedSec >= blackSec;
        }

        function isDockSequenceActive() {
            return dockSequenceActive;
        }

        function updateDockSequence({ timestampMs, stop, DockingAnimation, onDock }) {
            if (!dockSequenceActive) {
                return false;
            }
            if (isDockSequenceComplete(timestampMs)) {
                const payload = dockSequencePayload;
                dockSequenceActive = false;
                dockSequenceStartMs = 0;
                dockSequencePayload = null;
                if (payload) {
                    if (typeof stop === 'function') {
                        stop();
                    }
                    if (DockingAnimation && typeof DockingAnimation.show === 'function') {
                        DockingAnimation.show(payload.dockGameState, () => {
                            if (typeof onDock === 'function') {
                                onDock(payload);
                            }
                        });
                    } else if (typeof onDock === 'function') {
                        onDock(payload);
                    }
                }
            }
            return true;
        }

        function renderDockFade(timestampMs) {
            if (!dockSequenceActive) {
                return;
            }
            const blackSec = Math.max(0.01, config.DOCK_FADE_TO_BLACK_SEC || 1);
            const elapsedSec = Math.max(0, (timestampMs - dockSequenceStartMs) / 1000);
            const blackT = Math.min(1, elapsedSec / blackSec);
            const ctx = UI.getContext?.();
            const canvas = UI.getCanvas?.();
            if (ctx && canvas && blackT > 0) {
                const rect = canvas.getBoundingClientRect();
                ctx.save();
                ctx.globalAlpha = blackT;
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, rect.width, rect.height);
                ctx.restore();
            }
        }

        function handleDock({ payload, DockMenu }) {
            const { dockGameState, dockTarget, location } = payload || {};
            if (dockGameState && dockTarget) {
                const systemIndex = dockGameState.systems.findIndex(system => system === dockTarget || system.name === dockTarget.name);
                if (systemIndex >= 0 && typeof dockGameState.setCurrentSystem === 'function') {
                    dockGameState.setCurrentSystem(systemIndex);
                }
                dockGameState.destination = null;
                dockGameState.localDestination = null;
                dockGameState.localDestinationSystemIndex = null;
            }
            if (dockGameState && typeof dockGameState.setCurrentLocation === 'function') {
                dockGameState.setCurrentLocation(location || dockGameState.getCurrentLocation());
            } else if (dockGameState) {
                dockGameState.currentLocation = location || dockGameState.currentLocation;
            }
            if (DockMenu && typeof DockMenu.show === 'function') {
                DockMenu.show(dockGameState, location);
            }
        }

        function checkDocking(mapInstance) {
            const {
                timestampMs,
                targetSystem,
                currentStation,
                playerShip,
                currentGameState,
                inputState,
                lastStationCollisionMs,
                damageFlashStartMs,
                deathTow
            } = mapInstance;

            const dockingParams = {
                ...mapInstance,
                onStop: null,
                onDock: ({ currentGameState: dockGameState, targetSystem: dockTarget, planet: dockPlanet }) => {
                    startDockSequence({
                        payload: { dockGameState, dockTarget, location: dockPlanet || currentStation },
                        timestampMs,
                        playerShip,
                        inputState
                    });
                },
                onDamage: ({ station }) => {
                    deathTow.recordDamageSource({
                        type: 'STATION_COLLISION',
                        name: station?.name || station?.id || 'the station'
                    });
                }
            };

            // Check planet docking
            if (targetSystem && Array.isArray(targetSystem.planets)) {
                for (let i = 0; i < targetSystem.planets.length; i++) {
                    const planet = targetSystem.planets[i];
                    const dockingResult = SpaceTravelLogic.checkPlanetDocking({ ...dockingParams, planet, debug: true });
                    if (dockingResult.didDock) return;
                }
            }

            // Check station docking
            if (currentStation) {
                const dockingResult = SpaceTravelLogic.checkStationDocking({ ...dockingParams, station: currentStation });
                mapInstance.lastStationCollisionMs = dockingResult.lastStationCollisionMs;
                mapInstance.damageFlashStartMs = dockingResult.damageFlashStartMs;
                if (dockingResult.didDock) return;
            }
        }

        function updateDocking(mapInstance, timestampMs) {
            updateDockSequence({
                ...mapInstance,
                timestampMs,
                stop: () => mapInstance.stop(),
                DockingAnimation,
                onDock: (payload) => handleDock({ payload, DockMenu })
            });
        }

        return {
            reset,
            startDockSequence,
            isDockSequenceActive,
            isDockSequenceComplete,
            updateDockSequence,
            renderDockFade,
            handleDock,
            checkDocking,
            updateDocking
        };
    }

    return {
        create
    };
})();
