/**
 * Space Travel Map input helpers
 */

const SpaceTravelInput = (() => {
    function setupInput({ keyState, codeState, handlers, setPaused, getPaused, getPausedByFocus, onEscape, onTogglePause }) {
        handlers.keyDownHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onEscape();
                return;
            }
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                onTogglePause();
                return;
            }
            keyState.add(e.key);
            if (codeState) {
                codeState.add(e.code);
            }
        };
        handlers.keyUpHandler = (e) => {
            keyState.delete(e.key);
            if (codeState) {
                codeState.delete(e.code);
            }
        };
        document.addEventListener('keydown', handlers.keyDownHandler);
        document.addEventListener('keyup', handlers.keyUpHandler);

        handlers.windowBlurHandler = () => {
            if (!getPaused()) {
                setPaused(true, true);
            }
        };
        handlers.windowFocusHandler = () => {
            if (getPausedByFocus()) {
                setPaused(false, false);
            }
        };
        window.addEventListener('blur', handlers.windowBlurHandler);
        window.addEventListener('focus', handlers.windowFocusHandler);
    }

    function setupMouseTargeting({ handlers, config, getLastHoverPick, onPick, onFire }) {
        const canvas = UI.getCanvas?.();
        if (!canvas) {
            return;
        }
        const grid = UI.getGridSize();
        const viewWidth = grid.width;
        const viewHeight = grid.height - config.PANEL_HEIGHT;
        handlers.mouseTarget = {
            x: Math.floor(viewWidth / 2),
            y: Math.floor(viewHeight / 2)
        };
        handlers.mouseTargetActive = true;
        handlers.mouseMoveHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const charDims = UI.getCharDimensions();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;
            const gridX = Math.floor(pixelX / charDims.width);
            const gridY = Math.floor(pixelY / charDims.height);
            handlers.mouseTarget = { x: gridX, y: gridY };
            handlers.mouseTargetActive = true;
        };
        document.addEventListener('mousemove', handlers.mouseMoveHandler);

        handlers.mouseDownHandler = (e) => {
            if (e.button === 0) {
                const rect = canvas.getBoundingClientRect();
                const charDims = UI.getCharDimensions();
                const pixelX = e.clientX - rect.left;
                const pixelY = e.clientY - rect.top;
                const gridX = Math.floor(pixelX / charDims.width);
                const gridY = Math.floor(pixelY / charDims.height);
                const pick = getLastHoverPick();
                console.log('[SpaceTravelInput] Left click', {
                    clientX: e.clientX,
                    clientY: e.clientY,
                    gridX,
                    gridY,
                    pick
                });
                if (pick) {
                    console.log('[SpaceTravelInput] Picked object:', pick);
                    onPick(pick);
                    return;
                }
                if (typeof onFire === 'function') {
                    onFire();
                }
                return;
            }
            if (e.button === 2) {
                const pick = getLastHoverPick();
                if (pick) {
                    console.log('[SpaceTravelInput] Picked object:', pick);
                    onPick(pick);
                }
            }
        };
        document.addEventListener('mousedown', handlers.mouseDownHandler);
    }

    function getMouseTargetState(viewWidth, viewHeight, handlers) {
        if (!handlers.mouseTargetActive) {
            return { active: false };
        }
        const rawX = handlers.mouseTarget.x;
        const rawY = handlers.mouseTarget.y;
        const inView = rawX >= 0 && rawX < viewWidth && rawY >= 0 && rawY < viewHeight;
        const displayX = Math.max(0, Math.min(viewWidth - 1, rawX));
        const displayY = Math.max(0, Math.min(viewHeight - 1, rawY));
        return {
            active: true,
            rawX,
            rawY,
            inView,
            displayX,
            displayY,
            offLeft: rawX < 0,
            offRight: rawX >= viewWidth,
            offTop: rawY < 0,
            offBottom: rawY >= viewHeight
        };
    }

    function initializeInputHandlers(mapInstance) {
        const { inputState, config, deathTow } = mapInstance;
        
        setupInput({
            keyState: inputState.keyState,
            codeState: inputState.codeState,
            handlers: inputState,
            setPaused: (val, byFocus) => mapInstance.setPaused(val, byFocus),
            getPaused: () => mapInstance.isPaused,
            getPausedByFocus: () => mapInstance.pausedByFocus,
            onEscape: () => {
                if (deathTow.isDeathSequenceActive()) {
                    return;
                }
                mapInstance.stop();
                SpaceTravelMenu.show(mapInstance.currentGameState, () => {
                    const destination = mapInstance.targetSystem || SpaceTravelLogic.getNearestSystem(mapInstance.currentGameState);
                    mapInstance.show(mapInstance.currentGameState, destination, {
                        resetPosition: false,
                        localDestination: mapInstance.localDestination
                    });
                });
            },
            onTogglePause: () => {
                if (deathTow.isDeathSequenceActive()) {
                    return;
                }
                mapInstance.togglePause();
            }
        });
        setupMouseTargeting({
            handlers: inputState,
            config,
            getLastHoverPick: () => mapInstance.lastHoverPick,
            onPick: (pick) => {
                if (deathTow.isDeathSequenceActive()) {
                    return;
                }
                mapInstance.localDestination = SpaceTravelUi.setLocalDestinationFromPick(pick, {
                    currentGameState: mapInstance.currentGameState,
                    localDestination: mapInstance.localDestination
                }, config);
            },
            onFire: () => {
                if (deathTow.isDeathSequenceActive()) {
                    return;
                }
                const result = mapInstance.laser.fireLaser({
                    playerShip: mapInstance.playerShip,
                    isPaused: mapInstance.isPaused,
                    lastHoverPick: mapInstance.lastHoverPick,
                    config,
                    inputState
                });
                if (result?.laserEmptyTimestampMs) {
                    mapInstance.laserEmptyTimestampMs = result.laserEmptyTimestampMs;
                }
            }
        });
    }

    function teardownInputHandlers(inputState) {
        if (inputState.keyDownHandler) {
            document.removeEventListener('keydown', inputState.keyDownHandler);
            inputState.keyDownHandler = null;
        }
        if (inputState.keyUpHandler) {
            document.removeEventListener('keyup', inputState.keyUpHandler);
            inputState.keyUpHandler = null;
        }
        if (inputState.windowBlurHandler) {
            window.removeEventListener('blur', inputState.windowBlurHandler);
            inputState.windowBlurHandler = null;
        }
        if (inputState.windowFocusHandler) {
            window.removeEventListener('focus', inputState.windowFocusHandler);
            inputState.windowFocusHandler = null;
        }
        if (inputState.mouseMoveHandler) {
            document.removeEventListener('mousemove', inputState.mouseMoveHandler);
            inputState.mouseMoveHandler = null;
        }
        if (inputState.mouseDownHandler) {
            document.removeEventListener('mousedown', inputState.mouseDownHandler);
            inputState.mouseDownHandler = null;
        }
        inputState.mouseTargetActive = false;
        inputState.keyState.clear();
        if (inputState.codeState?.clear) {
            inputState.codeState.clear();
        }
    }

    function handleInput(mapInstance, dt, timestampMs, messages) {
        const { config, inputState, playerShip, boostActive } = mapInstance;
        const turnRad = ThreeDUtils.degToRad(config.TURN_DEG_PER_SEC) * dt;
        const rollRad = ThreeDUtils.degToRad(config.ROLL_DEG_PER_SEC ?? config.TURN_DEG_PER_SEC) * dt;
        const grid = UI.getGridSize();
        const viewHeight = grid.height - config.PANEL_HEIGHT;
        const viewWidth = grid.width;
        const mouseState = getMouseTargetState(viewWidth, viewHeight, inputState);
        const panelScrollRows = Math.max(0, Math.min(config.PANEL_HEIGHT, config.PANEL_CURSOR_SCROLL_ROWS ?? 3));
        const allowBottomScroll = mouseState.active
            && mouseState.rawY >= viewHeight
            && mouseState.rawY < (viewHeight + panelScrollRows);

        const codeState = inputState.codeState || inputState.keyState;
        const keyYawLeft = inputState.keyState.has('ArrowLeft');
        const keyYawRight = inputState.keyState.has('ArrowRight');
        const keyRollLeft = codeState.has('KeyA') || inputState.keyState.has('a') || inputState.keyState.has('A');
        const keyRollRight = codeState.has('KeyD') || inputState.keyState.has('d') || inputState.keyState.has('D');
        const keyPitchUp = inputState.keyState.has('ArrowUp');
        const keyPitchDown = inputState.keyState.has('ArrowDown');
        const keyForward = codeState.has('KeyW') || inputState.keyState.has('w') || inputState.keyState.has('W');
        const keyBrake = codeState.has('KeyS') || inputState.keyState.has('s') || inputState.keyState.has('S');
        const keyBoost = codeState.has('ShiftLeft') || codeState.has('ShiftRight') || inputState.keyState.has('Shift');

        const yawLeft = keyYawLeft || mouseState.offLeft;
        const yawRight = keyYawRight || mouseState.offRight;
        const pitchUp = keyPitchUp || mouseState.offTop;
        const pitchDown = keyPitchDown || (mouseState.offBottom && allowBottomScroll);

        const manualInput = keyYawLeft || keyYawRight || keyPitchUp || keyPitchDown || keyRollLeft || keyRollRight || keyForward || keyBrake || keyBoost;
        if (mapInstance.autoNavActive && manualInput) {
            mapInstance.autoNavActive = false;
            mapInstance.autoNavInput = null;
        }

        if (!mapInstance.autoNavActive && !boostActive && (yawLeft || yawRight || pitchUp || pitchDown || keyRollLeft || keyRollRight)) {
            updateRotation(mapInstance, yawLeft, yawRight, pitchUp, pitchDown, keyRollLeft, keyRollRight, turnRad, rollRad, timestampMs, mouseState);
        }

        if (messages) {
            messages.updateBoostMessages(mapInstance, timestampMs, keyYawLeft, keyYawRight, keyPitchUp, keyPitchDown);
        }
    }

    function applyAutoNavRotation(mapInstance, dt, timestampMs, targetDirection) {
        const { config, playerShip } = mapInstance;
        if (!playerShip || !targetDirection) {
            return;
        }

        const turnRad = ThreeDUtils.degToRad(config.TURN_DEG_PER_SEC) * dt;
        const rollRad = ThreeDUtils.degToRad(config.ROLL_DEG_PER_SEC ?? config.TURN_DEG_PER_SEC) * dt;
        const localDir = ThreeDUtils.rotateVecByQuat(targetDirection, ThreeDUtils.quatConjugate(playerShip.rotation));
        const deadZone = 0.02;

        const yawLeft = localDir.x < -deadZone;
        const yawRight = localDir.x > deadZone;
        const pitchUp = localDir.y > deadZone;
        const pitchDown = localDir.y < -deadZone;

        updateRotation(
            mapInstance,
            yawLeft,
            yawRight,
            pitchUp,
            pitchDown,
            false,
            false,
            turnRad,
            rollRad,
            timestampMs,
            {
                offLeft: false,
                offRight: false,
                offTop: false,
                offBottom: false,
                active: false
            }
        );
    }

    function updateRotation(mapInstance, yawLeft, yawRight, pitchUp, pitchDown, keyRollLeft, keyRollRight, turnRad, rollRad, timestampMs, mouseState) {
        const { config, playerShip } = mapInstance;
        let newRotation = playerShip.rotation;
        const debugRoll = config.DEBUG_ROLL_LOG && (keyRollLeft || keyRollRight);
        const rollForwardBefore = debugRoll ? ThreeDUtils.getLocalAxes(newRotation).forward : null;

        if (yawLeft) newRotation = ThreeDUtils.quatMultiply(newRotation, ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -turnRad));
        if (yawRight) newRotation = ThreeDUtils.quatMultiply(newRotation, ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, turnRad));
        if (pitchUp) newRotation = ThreeDUtils.quatMultiply(newRotation, ThreeDUtils.quatFromAxisAngle({ x: 1, y: 0, z: 0 }, -turnRad));
        if (pitchDown) newRotation = ThreeDUtils.quatMultiply(newRotation, ThreeDUtils.quatFromAxisAngle({ x: 1, y: 0, z: 0 }, turnRad));
        if (keyRollLeft || keyRollRight) {
            const rollDir = keyRollLeft ? 1 : -1;
            const rollQuat = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 0, z: 1 }, rollRad * rollDir);
            newRotation = ThreeDUtils.quatMultiply(newRotation, rollQuat);
        }

        playerShip.rotation = ThreeDUtils.quatNormalize(newRotation);

        if (debugRoll && rollForwardBefore) {
            const now = timestampMs || performance.now();
            if (now - mapInstance.lastRollLogMs >= 250) {
                const rollForwardAfter = ThreeDUtils.getLocalAxes(playerShip.rotation).forward;
                const dot = Math.max(-1, Math.min(1, ThreeDUtils.dotVec(rollForwardBefore, rollForwardAfter)));
                const angleDeg = Math.acos(dot) * 180 / Math.PI;
                console.log('[SpaceTravelInput] Roll debug', {
                    dot,
                    angleDeg: Number.isFinite(angleDeg) ? angleDeg.toFixed(4) : 'n/a',
                    yawLeft,
                    yawRight,
                    pitchUp,
                    pitchDown,
                    keyRollLeft,
                    keyRollRight,
                    mouseOffLeft: mouseState.offLeft,
                    mouseOffRight: mouseState.offRight,
                    mouseOffTop: mouseState.offTop,
                    mouseOffBottom: mouseState.offBottom,
                    mouseActive: mouseState.active
                });
                mapInstance.lastRollLogMs = now;
            }
        }
    }

    return {
        setupInput,
        setupMouseTargeting,
        getMouseTargetState,
        initializeInputHandlers,
        teardownInputHandlers,
        handleInput,
        applyAutoNavRotation
    };
})();
