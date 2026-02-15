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
        const hailModalActive = !!params.mapInstance?.npcEncounterHailPrompt;
        if (typeof SpaceTravelEncounters !== 'undefined' && SpaceTravelEncounters.renderHailPrompt) {
            SpaceTravelEncounters.renderHailPrompt({
                mapInstance: params.mapInstance,
                viewWidth,
                viewHeight,
                timestampMs: renderTimestampMs,
                addHudText: (x, y, text, color) => UI.addText(x, y, text, params.applyPauseColor?.(color) || color),
                onOpenChannel: () => {
                    const opened = SpaceTravelEncounters?.openPendingHail?.(params.mapInstance);
                    if (!opened && params.mapInstance) {
                        params.mapInstance.lastErrorMessage = 'Unable to open hailing channel';
                        params.mapInstance.lastErrorTimestampMs = performance.now();
                    }
                }
            });
        }

        UI.draw();

        // Render visual effects AFTER UI.draw() so they appear on top
        SpaceTravelRenderEffects.renderAll(params, renderTimestampMs);
    }

    /**
     * Render scene depth buffer with all bodies and effects
     */
    function renderSceneDepthBuffer(params) {
        const { depthBuffer, renderTimestampMs, viewWidth, viewHeight } = params;
        const hailModalActive = !!params.mapInstance?.npcEncounterHailPrompt;
        const mouseState = SpaceTravelInput.getMouseTargetState(viewWidth, viewHeight, params.inputState);
        if (mouseState && typeof mouseState.x === 'undefined') {
            mouseState.x = mouseState.rawX;
            mouseState.y = mouseState.rawY;
        }
        
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

        // Render escort ships
        const shipPickInfos = [];
        const shipOccupancyMask = new Uint8Array(viewWidth * viewHeight);
        if (params.escortShips && params.escortShips.length > 0 && typeof Object3DRenderer !== 'undefined') {
            params.escortShips.forEach((escort, idx) => {
                Object3DRenderer.render({
                    object: escort,
                    playerShip: params.playerShip,
                    viewWidth,
                    viewHeight,
                    config: params.config,
                    depthBuffer,
                    addHudText: (x, y, text, color) => UI.addText(x, y, text, params.applyPauseColor?.(color) || color),
                    getLineSymbol: (x, y) => {
                        const idx = RasterUtils.getDepthBufferIndex(depthBuffer, x, y);
                        return depthBuffer.chars[idx] || ' ';
                    },
                    timestampMs: effectiveRenderTimestampMs,
                    mouseState,
                    isAlly: true, // Mark escort ships as allies for green coloring
                    shipOccupancyMask,
                    onPickInfo: (pickInfo) => {
                        shipPickInfos.push({ ...pickInfo, kind: 'ESCORT_SHIP' });
                    }
                });
            });
        }

        if (typeof SpaceTravelEncounters !== 'undefined' && typeof Object3DRenderer !== 'undefined') {
            const npcShips = SpaceTravelEncounters.getRenderableShips?.(params.mapInstance) || [];
            npcShips.forEach((ship) => {
                Object3DRenderer.render({
                    object: ship,
                    playerShip: params.playerShip,
                    viewWidth,
                    viewHeight,
                    config: params.config,
                    depthBuffer,
                    addHudText: (x, y, text, color) => UI.addText(x, y, text, params.applyPauseColor?.(color) || color),
                    getLineSymbol: (x, y) => {
                        const idx = RasterUtils.getDepthBufferIndex(depthBuffer, x, y);
                        return depthBuffer.chars[idx] || ' ';
                    },
                    timestampMs: effectiveRenderTimestampMs,
                    mouseState,
                    isAlly: false,
                    shipColor: ship.shipColor,
                    shipOccupancyMask,
                    onPickInfo: (pickInfo) => {
                        shipPickInfos.push({ ...pickInfo, kind: 'NPC_SHIP' });
                    }
                });
            });
        }

        // Check for ship picks and update hover if needed
        if (shipPickInfos.length > 0 && mouseState) {
            const withDistance = shipPickInfos.map(pick => {
                const dx = (pick.screenX - mouseState.x);
                const dy = (pick.screenY - mouseState.y);
                const distance = Math.sqrt((dx * dx) + (dy * dy));
                const pickRadius = pick.pickRadius || 3;
                return { pick, distance, pickRadius };
            });

            const hoverCandidates = withDistance.filter(entry => entry.distance <= entry.pickRadius);
            if (hoverCandidates.length > 0) {
                const bestMatch = hoverCandidates.reduce((best, current) => {
                    if (!best) return current;
                    if (current.distance < best.distance) return current;
                    if (current.distance === best.distance && (current.pick.distance || Infinity) < (best.pick.distance || Infinity)) return current;
                    return best;
                }, null);

                const closestShip = bestMatch.pick;

                // Check if there's an existing pick that's closer
                const existingPickDist = renderParams.lastHoverPick
                    ? Math.hypot((renderParams.lastHoverPick.screenX - mouseState.x), (renderParams.lastHoverPick.screenY - mouseState.y))
                    : Infinity;

                // Use escort pick if it's closer or no existing pick
                if (bestMatch.distance <= existingPickDist) {
                    const shipPickData = {
                        kind: closestShip.kind || 'NPC_SHIP',
                        bodyRef: closestShip.object,
                        x: closestShip.screenX,
                        y: closestShip.screenY,
                        screenX: mouseState.x,
                        screenY: mouseState.y,
                        distance: closestShip.distance
                    };
                    renderParams.lastHoverPick = shipPickData;
                    if (params.mapInstance) {
                        params.mapInstance.lastHoverPick = shipPickData;
                    }
                }
            }
        }

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

        SpaceTravelParticles.renderRocketTrails({
            ...renderParams,
            timestampMs: effectiveRenderTimestampMs,
            rocketTrailClouds: params.rocketTrailClouds,
            shipOccupancyMask
        });

        params.laser?.renderLaserFire(renderParams);

        if (typeof SpaceTravelEncounters !== 'undefined' && SpaceTravelEncounters.renderCombatLasers) {
            SpaceTravelEncounters.renderCombatLasers({
                mapInstance: params.mapInstance,
                depthBuffer,
                playerShip: params.playerShip,
                viewWidth,
                viewHeight,
                config: params.config
            });
        }

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
            hailAvailable: !!params.mapInstance?.npcEncounterHailAvailable,
            hailPromptActive: hailModalActive,
            onHail: () => {
                if (hailModalActive) {
                    const opened = SpaceTravelEncounters?.openPendingHail?.(params.mapInstance);
                    if (!opened && params.mapInstance) {
                        params.mapInstance.lastErrorMessage = 'Unable to open hailing channel';
                        params.mapInstance.lastErrorTimestampMs = performance.now();
                    }
                    return;
                }

                const started = SpaceTravelEncounters?.playerInitiateHail?.(params.mapInstance, renderTimestampMs);
                if (!started && params.mapInstance) {
                    params.mapInstance.lastErrorMessage = 'No hail target in range';
                    params.mapInstance.lastErrorTimestampMs = performance.now();
                }
            },
            onUnpause: () => params.setPaused?.(false, false),
            suppressButtons: hailModalActive,
            onMenu: () => {
                const portalState = SpaceTravelPortal.getState(params.mapInstance);
                const runtimeState = params.mapInstance?.getRuntimeStateSnapshot?.() || null;
                params.stop?.(true);
                SpaceTravelMenu.show(params.currentGameState, () => {
                    const destination = params.targetSystem || SpaceTravelLogic.getNearestSystem(params.currentGameState);
                    SpaceTravelMap.show(params.currentGameState, destination, {
                        resetPosition: false,
                        localDestination: params.localDestination,
                        portalState,
                        runtimeState
                    });
                }, () => {
                    const portalState = SpaceTravelPortal.getState(params.mapInstance);
                    OptionsMenu.show(() => {
                        const destination = params.targetSystem || SpaceTravelLogic.getNearestSystem(params.currentGameState);
                        SpaceTravelMap.show(params.currentGameState, destination, {
                            resetPosition: false,
                            localDestination: params.localDestination,
                            portalState,
                            runtimeState
                        });
                    });
                });
            },
            onOptions: () => {
                const portalState = SpaceTravelPortal.getState(params.mapInstance);
                const runtimeState = params.mapInstance?.getRuntimeStateSnapshot?.() || null;
                params.stop?.(true);
                OptionsMenu.show(() => {
                    const destination = params.targetSystem || SpaceTravelLogic.getNearestSystem(params.currentGameState);
                    SpaceTravelMap.show(params.currentGameState, destination, {
                        resetPosition: false,
                        localDestination: params.localDestination,
                        portalState,
                        runtimeState
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

        // Render escort ship nav arrows if any escorts exist
        if (params.escortShips && params.escortShips.length > 0) {
            SpaceTravelRenderIndicators.renderEscortArrows({
                escortShips: params.escortShips,
                viewWidth,
                viewHeight,
                playerShip: params.playerShip,
                config: params.config,
                addHudText: (x, y, text, color) => UI.addText(x, y, text, params.applyPauseColor?.(color) || color)
            });
        }

        const npcIndicatorShips = SpaceTravelEncounters?.getRenderableShips?.(params.mapInstance) || [];
        if (npcIndicatorShips.length > 0) {
            SpaceTravelRenderIndicators.renderNpcArrows({
                npcShips: npcIndicatorShips,
                viewWidth,
                viewHeight,
                playerShip: params.playerShip,
                config: params.config,
                addHudText: (x, y, text, color) => UI.addText(x, y, text, params.applyPauseColor?.(color) || color)
            });
        }
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
