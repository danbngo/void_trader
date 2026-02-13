/**
 * Space Travel Map Rendering
 */

const SpaceTravelRender = (() => {
    /**
     * Main render orchestration function
     */
    function render(params) {
        if (!params.isActive) {
            return;
        }
        const renderTimestampMs = params._getRenderTimestampMs?.(params.lastTimestamp) || params.timestampMs;
        UI.setGameCursorEnabled?.(!params.isPaused);
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();
        const viewHeight = grid.height - params.config.PANEL_HEIGHT;
        const viewWidth = grid.width;
        const depthBuffer = RasterUtils.createDepthBuffer(viewWidth, viewHeight);

        renderSceneDepthBuffer({ ...params, depthBuffer, renderTimestampMs, viewWidth, viewHeight });
        addDebugMessages(params, renderTimestampMs, viewWidth, viewHeight);

        UI.draw();

        // Render visual effects AFTER UI.draw() so they appear on top
        SpaceTravelRenderEffects.renderAll(params, renderTimestampMs);
    }

    /**
     * Render scene depth buffer with all bodies and effects
     */
    function renderSceneDepthBuffer(params) {
        const { depthBuffer, renderTimestampMs, viewWidth, viewHeight } = params;
        const mouseState = SpaceTravelInput.getMouseTargetState(viewWidth, viewHeight, params.inputState);
        
        const renderParams = {
            ...params,
            depthBuffer,
            timestampMs: renderTimestampMs,
            viewWidth,
            viewHeight,
            mouseState
        };

        SpaceStationGfx.renderStationOccluders(renderParams);

        const bodyLabels = SpaceTravelRenderBodies.render({
            ...renderParams,
            setLastHoverPick: (pick) => { params.lastHoverPick = pick; }
        });

        SpaceTravelPortal.render(params, depthBuffer, viewWidth, viewHeight, renderTimestampMs);

        SpaceTravelParticles.renderStars(renderParams);

        if (!params.boostActive) {
            SpaceTravelParticles.renderDust({
                ...renderParams,
                targetSystem: params.targetSystem,
                currentGameState: params.currentGameState,
                getVelocityCameraSpace: () => params.getVelocityCameraSpace?.() || { x: 0, y: 0, z: 0 }
            });
        }

        params.laser?.renderLaserFire(renderParams);

        if (params.isPaused) {
            for (let i = 0; i < depthBuffer.colors.length; i++) {
                const color = depthBuffer.colors[i];
                if (color) {
                    depthBuffer.colors[i] = ColorUtils.toMonochrome(color);
                }
            }
        }

        RasterUtils.flushDepthBuffer(depthBuffer);

        const emergenceCooldownMs = params.emergenceMomentumActive 
            ? SpaceTravelPhysics.getEmergenceMomentumCooldownRemaining(params)
            : 0;
        const emergenceSpeedOverride = params.emergenceMomentumActive
            ? `${(ThreeDUtils.vecLength(params.playerShip.velocity) * 60).toFixed(2)} AU/m [Cooldown]`
            : null;

        SpaceTravelHud.renderHud({
            ...renderParams,
            baseMaxSpeed: Ship.getBaseMaxSpeed(params.playerShip, params.config.SHIP_SPEED_PER_ENGINE) || 0,
            maxSpeed: Ship.getMaxSpeed(params.playerShip, params.boostActive, params.config.SHIP_SPEED_PER_ENGINE, params.config.BOOST_MAX_SPEED_MULT) || 0,
            autoNavActive: params.autoNavActive,
            speedOverrideText: emergenceSpeedOverride,
            speedOverrideColor: emergenceSpeedOverride ? COLORS.TEXT_DIM : undefined,
            helpers: {
                applyPauseColor: (color) => params.applyPauseColor?.(color) || color,
                addHudText: (x, y, text, color) => params.addHudText?.(x, y, text, color),
                getActiveTargetInfo: () => params.getActiveTargetInfo?.()
            },
            onAutoNavToggle: () => params.toggleAutoNav?.(),
            onMenu: () => {
                params.stop?.();
                SpaceTravelMenu.show(params.currentGameState, () => {
                    const destination = params.targetSystem || SpaceTravelLogic.getNearestSystem(params.currentGameState);
                    SpaceTravelMap.show(params.currentGameState, destination, {
                        resetPosition: false,
                        localDestination: params.localDestination
                    });
                });
            }
        });

        SpaceTravelRenderLabels.renderSystemBodyLabels(bodyLabels, viewWidth, viewHeight, (x, y, text, color) => params.addHudText?.(x, y, text, color));
        SpaceTravelRenderIndicators.renderDestinationIndicator({
            ...renderParams,
            addHudText: (x, y, text, color) => params.addHudText?.(x, y, text, color),
            getActiveTargetInfo: () => params.getActiveTargetInfo?.()
        });
    }

    /**
     * Add debug messages (paused, boost messages, etc.)
     */
    function addDebugMessages(params, timestampMs, viewWidth, viewHeight) {
        if (params.isPaused) {
            const label = '=== PAUSED ===';
            const x = Math.floor((viewWidth - label.length) / 2);
            const y = Math.floor(viewHeight / 2);
            UI.addText(x, y, label, COLORS.TEXT_NORMAL);
        } else if (params.boostTurnMessage || params.boostBlockMessage) {
            const message = params.boostTurnMessage || params.boostBlockMessage;
            const messageTimestampMs = params.boostTurnMessage
                ? params.boostTurnMessageTimestampMs
                : params.boostBlockMessageTimestampMs;
            const flashPhase = Math.floor((timestampMs - messageTimestampMs) / 250) % 2;
            const messageColor = flashPhase === 0 ? COLORS.ORANGE : COLORS.WHITE;
            const x = Math.floor((viewWidth - message.length) / 2);
            const y = Math.floor(viewHeight / 2);
            UI.addText(x, y, message, messageColor);
        }
    }

    return {
        render,
        renderSceneDepthBuffer,
        addDebugMessages
    };
})();
