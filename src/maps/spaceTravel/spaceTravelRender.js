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

        // Get effective timestamp that respects pause state
        const effectiveRenderTimestampMs = params.isPaused && params.portalPausedTimestampMs
            ? params.portalPausedTimestampMs
            : renderTimestampMs;

        const bodyLabels = SpaceTravelRenderBodies.render({
            ...renderParams,
            timestampMs: effectiveRenderTimestampMs,
            setLastHoverPick: (pick) => { 
                renderParams.lastHoverPick = pick;
                // Also set directly on mapInstance to handle async clicks between render and update
                if (params.mapInstance) {
                    params.mapInstance.lastHoverPick = pick;
                }
            }
        });

        // Render portal (even when paused)
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

        SpaceTravelPortal.applyTint(params, depthBuffer, viewWidth, viewHeight, renderTimestampMs);

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
            localDestination: params.localDestination,  // CRITICAL: Pass fresh localDestination, not stale spread copy
            baseMaxSpeed: Ship.getBaseMaxSpeed(params.playerShip, params.config.SHIP_SPEED_PER_ENGINE) || 0,
            maxSpeed: Ship.getMaxSpeed(params.playerShip, params.boostActive, params.config.SHIP_SPEED_PER_ENGINE, params.config.BOOST_MAX_SPEED_MULT) || 0,
            autoNavActive: params.autoNavActive,
            speedOverrideText: emergenceSpeedOverride,
            speedOverrideColor: emergenceSpeedOverride ? COLORS.TEXT_DIM : undefined,
            helpers: {
                applyPauseColor: (color) => params.applyPauseColor?.(color) || color,
                addHudText: (x, y, text, color) => params.addHudText?.(x, y, text, color),
                getActiveTargetInfo: () => params.getActiveTargetInfo?.(),
                setErrorMessage: (text) => {
                    if (params.mapInstance) {
                        params.mapInstance.lastErrorMessage = text;
                        params.mapInstance.lastErrorTimestampMs = performance.now();
                    }
                },
                lastErrorMessage: params.mapInstance?.lastErrorMessage || null,
                lastErrorTimestampMs: params.mapInstance?.lastErrorTimestampMs || 0
            },
            onAutoNavToggle: () => params.toggleAutoNav?.(),
            onUnpause: () => params.setPaused?.(false, false),
            onMenu: () => {
                const portalState = SpaceTravelPortal.getState(params.mapInstance);
                params.stop?.(true);
                SpaceTravelMenu.show(params.currentGameState, () => {
                    const destination = params.targetSystem || SpaceTravelLogic.getNearestSystem(params.currentGameState);
                    SpaceTravelMap.show(params.currentGameState, destination, {
                        resetPosition: false,
                        localDestination: params.localDestination,
                        portalState
                    });
                });
            }
        });

        const labelCount = SpaceTravelRenderLabels.renderSystemBodyLabels(bodyLabels, viewWidth, viewHeight, (x, y, text, color) => params.addHudText?.(x, y, text, color));
        // Suppress label render spam logging
        // if (params.mapInstance && renderTimestampMs - (params.mapInstance.lastLabelLogMs || 0) >= 1000) {
        //     console.log('[LabelRender]', {
        //         bodyLabels: bodyLabels.length,
        //         labelsDrawn: labelCount,
        //         viewWidth,
        //         viewHeight
        //     });
        //     params.mapInstance.lastLabelLogMs = renderTimestampMs;
        // }
        
        SpaceTravelRenderIndicators.renderDestinationIndicator({
            ...renderParams,
            localDestination: params.localDestination,  // CRITICAL: Pass fresh localDestination, not stale spread copy
            addHudText: (x, y, text, color) => UI.addText(x, y, text, params.applyPauseColor?.(color) || color),
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
        } else if (params.portalBlockMessage) {
            const message = params.portalBlockMessage;
            const messageTimestampMs = params.portalBlockMessageTimestampMs;
            const msgDuration = 2000; // Flash for 2 seconds
            if (timestampMs - messageTimestampMs > msgDuration) {
                params.portalBlockMessage = '';
                params.portalBlockMessageTimestampMs = 0;
                return;
            }
            const flashPhase = Math.floor((timestampMs - messageTimestampMs) / 250) % 2;
            const messageColor = flashPhase === 0 ? COLORS.CYAN : COLORS.WHITE;
            const x = Math.floor((viewWidth - message.length) / 2);
            const y = Math.floor(viewHeight / 2);
            UI.addText(x, y, message, messageColor);
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
