/**
 * Space Travel Laser logic
 */

const SpaceTravelLaser = (() => {
    function create() {
        let laserShots = [];
        let nextShotId = 1;
        let lastFireAttemptMs = 0;
        const MIN_FIRE_INTERVAL_MS = 50; // Minimum time between fire attempts to prevent caching

        function reset() {
            laserShots = [];
        }

        function applyDamage(target, damage, config, timestampMs) {
            if (!target || !Number.isFinite(damage) || damage <= 0) {
                return;
            }

            let remaining = damage;
            if (typeof target.shields === 'number' && target.shields > 0) {
                const shieldDamage = Math.min(target.shields, remaining);
                target.shields = Math.max(0, target.shields - shieldDamage);
                remaining -= shieldDamage;
            }
            if (remaining > 0 && typeof target.hull === 'number') {
                target.hull = Math.max(0, target.hull - remaining);
            }

            if (typeof target.hull === 'number' && target.hull <= 0) {
                target.name = 'Abandoned Ship';
                if (target.shipData) {
                    target.shipData.name = 'Abandoned Ship';
                }
            }

            target.flashStartMs = timestampMs;
            const shieldOnlyHit = (remaining <= 0) && (typeof target.shields === 'number' && target.shields > 0);
            target.flashColor = shieldOnlyHit
                ? (config.SHIP_FLASH_SHIELD_COLOR || '#ffffff')
                : ((typeof target.hull === 'number' && target.hull <= 0)
                    ? (config.SHIP_FLASH_ABANDONED_COLOR || '#8b0000')
                    : (config.SHIP_FLASH_HULL_COLOR || '#ff0000'));
        }

        function enqueueShot({ mapInstance, shooter, targetPoint, damageMin, damageMax, color, timestampMs = 0, renderMode = 'world_line', targetScreen = null, beamLength = null }) {
            if (!mapInstance || !shooter || !targetPoint || !shooter.position) {
                return false;
            }

            const now = Number.isFinite(timestampMs) && timestampMs > 0 ? timestampMs : performance.now();
            const durationMs = Math.max(1, mapInstance.config?.LASER_FIRE_DURATION_MS || 125);

            const shooterForward = shooter.rotation
                ? ThreeDUtils.normalizeVec(ThreeDUtils.rotateVecByQuat({ x: 0, y: 0, z: -1 }, shooter.rotation))
                : { x: 0, y: 0, z: -1 };
            const muzzleOffset = Math.max(
                mapInstance.config?.LASER_IMPACT_RADIUS_AU || 0.000001,
                (typeof SHIP_SIZE_AU !== 'undefined' ? SHIP_SIZE_AU : 0.000001) * 2
            );
            const shotFrom = ThreeDUtils.addVec(shooter.position, ThreeDUtils.scaleVec(shooterForward, muzzleOffset));

            laserShots.push({
                id: nextShotId++,
                from: { ...shotFrom },
                to: { ...targetPoint },
                createdMs: now,
                impactMs: now + durationMs,
                durationMs,
                damageMin: Math.max(1, Math.floor(damageMin || 1)),
                damageMax: Math.max(Math.floor(damageMin || 1), Math.floor(damageMax || damageMin || 1)),
                color: color || mapInstance.config?.LASER_COLOR || '#ff4d4d',
                shooterRef: shooter,
                renderMode,
                targetScreen,
                beamLength: Math.max(3, Math.floor(beamLength || 8)),
                debugRenderLogged: false,
                resolved: false
            });

            const createdShot = laserShots[laserShots.length - 1];
            console.log('[SpaceTravelLaser] Enqueue', {
                shotId: createdShot.id,
                mode: createdShot.renderMode,
                from: {
                    x: Number(createdShot.from.x.toFixed(6)),
                    y: Number(createdShot.from.y.toFixed(6)),
                    z: Number(createdShot.from.z.toFixed(6))
                },
                to: {
                    x: Number(createdShot.to.x.toFixed(6)),
                    y: Number(createdShot.to.y.toFixed(6)),
                    z: Number(createdShot.to.z.toFixed(6))
                },
                targetScreen: createdShot.targetScreen,
                beamLength: createdShot.beamLength,
                createdMs: Math.round(createdShot.createdMs),
                impactMs: Math.round(createdShot.impactMs)
            });

            if (laserShots.length > 120) {
                laserShots.splice(0, laserShots.length - 120);
            }

            return true;
        }

        function getImpactCandidates(mapInstance) {
            const candidates = [];
            if (mapInstance?.playerShip) {
                candidates.push(mapInstance.playerShip);
            }
            if (Array.isArray(mapInstance?.escortShips)) {
                mapInstance.escortShips.forEach(ship => candidates.push(ship));
            }
            const npcShips = (Array.isArray(mapInstance?.npcEncounterFleets) && mapInstance.npcEncounterFleets.length > 0)
                ? (mapInstance.npcEncounterFleets[0].ships || [])
                : [];
            npcShips.forEach(ship => candidates.push(ship));
            return candidates;
        }

        function resolveShotImpact(shot, mapInstance, timestampMs) {
            if (!shot || !mapInstance || shot.resolved) {
                return;
            }

            const impactRadius = Math.max(0.0000001, mapInstance.config?.LASER_IMPACT_RADIUS_AU || 0.000001);
            let bestTarget = null;
            let bestDistance = Infinity;

            const candidates = getImpactCandidates(mapInstance);
            candidates.forEach(candidate => {
                if (!candidate || !candidate.position || candidate === shot.shooterRef) {
                    return;
                }
                if (typeof candidate.hull === 'number' && candidate.hull <= 0) {
                    return;
                }

                const dist = ThreeDUtils.distance(candidate.position, shot.to);
                if (dist <= impactRadius && dist < bestDistance) {
                    bestDistance = dist;
                    bestTarget = candidate;
                }
            });

            if (bestTarget) {
                const damageRange = shot.damageMax - shot.damageMin;
                const damage = shot.damageMin + Math.floor(Math.random() * (damageRange + 1));
                applyDamage(bestTarget, damage, mapInstance.config || {}, timestampMs);

                if (bestTarget.isNpcEncounterShip && typeof SpaceTravelEncounters !== 'undefined' && SpaceTravelEncounters.handlePlayerAttackTarget && shot.shooterRef === mapInstance.playerShip) {
                    SpaceTravelEncounters.handlePlayerAttackTarget(mapInstance, bestTarget, timestampMs);
                }

                if (bestTarget === mapInstance.playerShip) {
                    mapInstance.damageFlashStartMs = timestampMs;
                }
            }

            shot.resolved = true;
        }

        function updateLasers({ mapInstance, timestampMs = 0 }) {
            if (!mapInstance || !Array.isArray(laserShots) || laserShots.length === 0) {
                return;
            }

            const now = Number.isFinite(timestampMs) && timestampMs > 0 ? timestampMs : performance.now();
            laserShots.forEach(shot => {
                if (!shot.resolved && now >= shot.impactMs) {
                    resolveShotImpact(shot, mapInstance, now);
                }
            });

            laserShots = laserShots.filter(shot => now <= (shot.impactMs + 100));
        }

        function fireLaser({ playerShip, isPaused, lastHoverPick, localDestination, config, inputState, boostActive, mapInstance, timestampMs = 0 }) {
            if (!playerShip || isPaused) {
                return { laserEmptyTimestampMs: null };
            }
            // Prevent firing while boosting
            if (boostActive) {
                return { 
                    laserEmptyTimestampMs: null,
                    flashMessage: 'Cannot fire lasers while boosting'
                };
            }
            const currentLaser = Ship.getLaserCurrent(playerShip);
            if (currentLaser <= 0) {
                return { laserEmptyTimestampMs: performance.now() };
            }
            
            // Prevent rapid successive fire attempts (laser caching bug fix)
            const now = performance.now();
            if (now - lastFireAttemptMs < MIN_FIRE_INTERVAL_MS) {
                return { laserEmptyTimestampMs: null };
            }
            lastFireAttemptMs = now;

            const selectedShipRef = getSelectedShipRef(localDestination);
            const targetScreen = getPlayerTargetScreenPoint({ inputState, config, lastHoverPick, localDestination, playerShip });
            const targetPoint = getPlayerTargetWorldPoint({ inputState, config, playerShip, lastHoverPick, localDestination, targetScreen });
            
            const laserEnergy = Ship.getLaserMax(playerShip);
            Ship.setLaserCurrent(playerShip, 0);

            const minRatio = config.LASER_DAMAGE_MIN_RATIO || 0.5;
            const maxRatio = config.LASER_DAMAGE_MAX_RATIO || 1.0;
            const minDamage = Math.ceil(laserEnergy * minRatio);
            const maxDamage = Math.ceil(laserEnergy * maxRatio);

            enqueueShot({
                mapInstance,
                shooter: playerShip,
                targetPoint,
                damageMin: minDamage,
                damageMax: Math.max(minDamage, maxDamage),
                color: config.LASER_COLOR || '#ff4d4d',
                renderMode: 'player_screen',
                targetScreen,
                beamLength: 5 + currentLaser,
                timestampMs: timestampMs || now
            });

            const enemyTarget = lastHoverPick?.bodyRef?.isNpcEncounterShip
                ? lastHoverPick.bodyRef
                : (selectedShipRef?.isNpcEncounterShip ? selectedShipRef : null);
            if (enemyTarget && typeof SpaceTravelEncounters !== 'undefined' && SpaceTravelEncounters.handlePlayerAttackTarget) {
                SpaceTravelEncounters.handlePlayerAttackTarget(mapInstance, enemyTarget, timestampMs || now);
            }

            return { laserEmptyTimestampMs: null };
        }

        function fireWorldLaser({ mapInstance, shooter, targetPoint, damageMin, damageMax, color, timestampMs = 0 }) {
            if (!mapInstance || !shooter || !targetPoint) {
                return false;
            }
            return enqueueShot({
                mapInstance,
                shooter,
                targetPoint,
                damageMin,
                damageMax,
                color,
                timestampMs
            });
        }

        function renderLaserFire({ depthBuffer, viewWidth, viewHeight, timestampMs, config, playerShip }) {
            if (!Array.isArray(laserShots) || laserShots.length === 0) {
                return;
            }

            laserShots.forEach(shot => {
                if (!shot?.from || !shot?.to) {
                    return;
                }

                const startMs = shot.createdMs || 0;
                const endMs = shot.impactMs || (startMs + (shot.durationMs || config.LASER_FIRE_DURATION_MS || 125));
                if (timestampMs < startMs || timestampMs > endMs) {
                    return;
                }

                const progress = Math.min(1, Math.max(0, (timestampMs - startMs) / Math.max(1, shot.durationMs || (endMs - startMs) || 1)));

                if (shot.renderMode === 'player_screen' && shot.shooterRef === playerShip) {
                    const targetX = Math.max(0, Math.min(viewWidth - 1, Math.floor(shot.targetScreen?.x ?? (viewWidth / 2))));
                    const targetY = Math.max(0, Math.min(viewHeight - 1, Math.floor(shot.targetScreen?.y ?? (viewHeight / 2))));

                    if (!shot.debugRenderLogged) {
                        shot.debugRenderLogged = true;
                        console.log('[SpaceTravelLaser] Render player_screen', {
                            shotId: shot.id,
                            fromLeft: { x: 0, y: viewHeight - 1 },
                            fromRight: { x: viewWidth - 1, y: viewHeight - 1 },
                            to: { x: targetX, y: targetY },
                            beamLength: shot.beamLength,
                            progress: Number(progress.toFixed(3))
                        });
                    }

                    let pulseT = 0;
                    if (progress >= 0.25 && progress < 0.5) {
                        pulseT = (progress - 0.25) / 0.25;
                    } else if (progress >= 0.5 && progress < 0.75) {
                        pulseT = 1 - ((progress - 0.5) / 0.25);
                    }
                    const laserColor = SpaceTravelShared.lerpColorHex(shot.color || config.LASER_COLOR || '#ff4d4d', '#ffffff', pulseT);

                    const leftPoints = LineDrawer.drawLine(0, viewHeight - 1, targetX, targetY, true, laserColor);
                    const rightPoints = LineDrawer.drawLine(viewWidth - 1, viewHeight - 1, targetX, targetY, true, laserColor);
                    const shotBeamLength = Math.max(3, shot.beamLength || 8);

                    const renderPoints = (points) => {
                        if (!points || points.length === 0) {
                            return;
                        }
                        const totalDistance = points.length + shotBeamLength;
                        const frontPos = progress * totalDistance - shotBeamLength;
                        const startIndex = Math.max(0, Math.ceil(frontPos));
                        const endIndex = Math.min(points.length - 1, Math.floor(frontPos + shotBeamLength));
                        for (let i = startIndex; i <= endIndex; i++) {
                            const point = points[i];
                            RasterUtils.plotDepthText(depthBuffer, point.x, point.y, config.LASER_DEPTH, point.symbol, laserColor);
                        }
                    };

                    renderPoints(leftPoints);
                    renderPoints(rightPoints);
                    return;
                }

                const fromRelative = ThreeDUtils.subVec(shot.from, playerShip.position);
                const toRelative = ThreeDUtils.subVec(shot.to, playerShip.position);
                const fromCamera = ThreeDUtils.rotateVecByQuat(fromRelative, ThreeDUtils.quatConjugate(playerShip.rotation));
                const toCamera = ThreeDUtils.rotateVecByQuat(toRelative, ThreeDUtils.quatConjugate(playerShip.rotation));
                if (fromCamera.z <= config.NEAR_PLANE || toCamera.z <= config.NEAR_PLANE) {
                    return;
                }

                const fromProjected = RasterUtils.projectCameraSpacePointRaw(fromCamera, viewWidth, viewHeight, config.VIEW_FOV);
                const toProjected = RasterUtils.projectCameraSpacePointRaw(toCamera, viewWidth, viewHeight, config.VIEW_FOV);
                if (!fromProjected || !toProjected) {
                    return;
                }

                const x1 = Math.round(fromProjected.x);
                const y1 = Math.round(fromProjected.y);
                const x2 = Math.round(toProjected.x);
                const y2 = Math.round(toProjected.y);

                let pulseT = 0;
                if (progress >= 0.25 && progress < 0.5) {
                    pulseT = (progress - 0.25) / 0.25;
                } else if (progress >= 0.5 && progress < 0.75) {
                    pulseT = 1 - ((progress - 0.5) / 0.25);
                }
                const laserColor = SpaceTravelShared.lerpColorHex(shot.color || config.LASER_COLOR || '#ff4d4d', '#ffffff', pulseT);

                const points = LineDrawer.drawLine(x1, y1, x2, y2, true, laserColor);
                const beamLength = Math.max(3, Math.floor(points.length * 0.35));
                const totalDistance = points.length + beamLength;
                const frontPos = progress * totalDistance - beamLength;
                const startIndex = Math.max(0, Math.ceil(frontPos));
                const endIndex = Math.min(points.length - 1, Math.floor(frontPos + beamLength));

                for (let i = startIndex; i <= endIndex; i++) {
                    const point = points[i];
                    RasterUtils.plotDepthText(depthBuffer, point.x, point.y, config.LASER_DEPTH, point.symbol, laserColor);
                }
            });
        }

        function getLaserTarget({ inputState, config }) {
            const grid = UI.getGridSize();
            const viewWidth = grid.width;
            const viewHeight = grid.height - config.PANEL_HEIGHT;
            const mouseState = SpaceTravelInput.getMouseTargetState(viewWidth, viewHeight, inputState);
            
            let result;
            if (mouseState && mouseState.active) {
                result = { x: mouseState.displayX, y: mouseState.displayY };
            } else {
                result = {
                    x: Math.floor(viewWidth / 2),
                    y: Math.floor(viewHeight / 2)
                };
            }
            return result;
        }

        function getLaserTargetWorldDirection({ target, playerShip, config }) {
            const grid = UI.getGridSize();
            const viewWidth = grid.width;
            const viewHeight = grid.height - config.PANEL_HEIGHT;
            const cameraDir = RasterUtils.screenRayDirection(target.x, target.y, viewWidth, viewHeight, config.VIEW_FOV);
            return ThreeDUtils.rotateVecByQuat(cameraDir, playerShip.rotation);
        }

        function getSelectedShipRef(localDestination) {
            if (!localDestination) {
                return null;
            }
            if (localDestination.type === 'NPC_SHIP' && localDestination.npcShip?.position) {
                return localDestination.npcShip;
            }
            if (localDestination.type === 'ESCORT_SHIP' && localDestination.escort?.position) {
                return localDestination.escort;
            }
            return null;
        }

        function getPlayerTargetScreenPoint({ inputState, config, lastHoverPick, localDestination, playerShip }) {
            if (Number.isFinite(lastHoverPick?.x) && Number.isFinite(lastHoverPick?.y)) {
                return { x: lastHoverPick.x, y: lastHoverPick.y };
            }

            const selectedShipRef = getSelectedShipRef(localDestination);
            if (selectedShipRef?.position && playerShip?.position && playerShip?.rotation) {
                const grid = UI.getGridSize();
                const viewWidth = grid.width;
                const viewHeight = grid.height - config.PANEL_HEIGHT;
                const relative = ThreeDUtils.subVec(selectedShipRef.position, playerShip.position);
                const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
                const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
                if (projected) {
                    return {
                        x: Math.round(projected.x),
                        y: Math.round(projected.y)
                    };
                }
            }
            return getLaserTarget({ inputState, config });
        }

        function getPlayerTargetWorldPoint({ inputState, config, playerShip, lastHoverPick, localDestination, targetScreen = null }) {
            if (lastHoverPick?.bodyRef?.position) {
                return { ...lastHoverPick.bodyRef.position };
            }

            const selectedShipRef = getSelectedShipRef(localDestination);
            if (selectedShipRef?.position) {
                return { ...selectedShipRef.position };
            }

            const target = targetScreen || getLaserTarget({ inputState, config });
            const worldDir = getLaserTargetWorldDirection({ target, playerShip, config });
            const range = Math.max(0.1, config.NPC_FLEET_WEAPON_RANGE_AU || 2);
            return ThreeDUtils.addVec(playerShip.position, ThreeDUtils.scaleVec(worldDir, range));
        }

        return {
            reset,
            fireLaser,
            fireWorldLaser,
            updateLasers,
            renderLaserFire
        };
    }

    return {
        create
    };
})();
