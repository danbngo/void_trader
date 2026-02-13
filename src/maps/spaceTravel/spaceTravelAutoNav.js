/**
 * Space Travel Auto-Nav
 * Auto-navigation logic and calculations
 */

const SpaceTravelAutoNav = {
    /**
     * Toggle auto-nav on/off
     * @param {Object} params - Synthesized object containing:
     *   - gameState, localDestination, targetSystem, playerShip
     *   - autoNavActive, autoNavInput, autoNavBoostBreakpointDistance
     *   - inputState, config, getActiveTargetInfo, getMaxSpeed, getBaseMaxSpeed
     */
    toggle(params) {
        const targetInfo = params.getActiveTargetInfo();
        if (!targetInfo) {
            return;
        }

        params.autoNavActive = !params.autoNavActive;
        if (!params.autoNavActive) {
            params.autoNavInput = null;
            params.autoNavBoostBreakpointDistance = 0;
            params.autoNavBoostStopDistance = 0;
            params.autoNavBoostDisabled = false;
            params.autoNavBoostEngagedOnce = false;
        } else {
            // Calculate boost breakpoint distance once when activating auto-nav
            // This prevents oscillation caused by dynamic stopping distance recalculation
            if (params.playerShip) {
                const engine = params.playerShip.engine || 10;
                const baseAccel = params.playerShip.size * engine * params.config.SHIP_ACCEL_PER_ENGINE * params.config.BASE_ACCEL_MULT;
                const brakeAccel = baseAccel * 2;
                const boostMaxSpeed = params.getMaxSpeed(params.playerShip, true);
                const desiredDistance = this.getDesiredDistance(params);
                const boostStopSpeedMult = typeof params.config.AUTO_NAV_BOOST_STOP_SPEED_MULT === 'number'
                    ? params.config.AUTO_NAV_BOOST_STOP_SPEED_MULT
                    : 10;
                const effectiveBoostSpeed = Math.min(boostMaxSpeed, params.getBaseMaxSpeed(params.playerShip) * boostStopSpeedMult);
                
                // Calculate stopping distance at boost speed
                const boostStoppingDist = (effectiveBoostSpeed * effectiveBoostSpeed) / (2 * brakeAccel);
                params.autoNavBoostBreakpointDistance = desiredDistance + boostStoppingDist;
                params.autoNavBoostStopDistance = params.autoNavBoostBreakpointDistance;
                params.autoNavBoostDisabled = false;
                params.autoNavBoostEngagedOnce = false;
            }
        }

        if (params.inputState?.keyState?.clear) {
            params.inputState.keyState.clear();
        }
        if (params.inputState?.codeState?.clear) {
            params.inputState.codeState.clear();
        }
    },

    /**
     * Update auto-nav steering and input
     * @param {Object} params - Synthesized object with all state
     * @param {number} dt - Delta time in seconds
     * @param {number} timestampMs - Current timestamp
     */
    update(params, dt, timestampMs = 0) {
        if (!params.autoNavActive || !params.playerShip) {
            return;
        }

        const targetInfo = params.getActiveTargetInfo();
        if (!targetInfo || !targetInfo.position) {
            params.autoNavActive = false;
            params.autoNavInput = null;
            return;
        }

        const toTarget = ThreeDUtils.subVec(targetInfo.position, params.playerShip.position);
        const distance = ThreeDUtils.vecLength(toTarget);
        if (!Number.isFinite(distance) || distance <= 0.000001) {
            params.autoNavInput = { accelerate: false, brake: true, boost: false };
            return;
        }

        const toTargetDir = ThreeDUtils.normalizeVec(toTarget);
        if (!params.boostActive) {
            SpaceTravelInput.applyAutoNavRotation(params, dt, timestampMs, toTargetDir);
        }

        const engine = params.playerShip.engine || 10;
        const baseMaxSpeed = params.getBaseMaxSpeed(params.playerShip);
        const baseAccel = params.playerShip.size * engine * params.config.SHIP_ACCEL_PER_ENGINE * params.config.BASE_ACCEL_MULT;
        const brakeAccel = baseAccel * 2;
        const desiredDistance = this.getDesiredDistance(params);
        const distanceToStop = Math.max(0, distance - desiredDistance);
        const maxSpeed = params.getMaxSpeed(params.playerShip, false);
        const boostMaxSpeed = params.getMaxSpeed(params.playerShip, true);
        const speedNow = ThreeDUtils.vecLength(params.playerShip.velocity);
        
        // Calculate stopping distance with realistic physics
        let stoppingDistance = brakeAccel > 0 ? (speedNow * speedNow) / (2 * brakeAccel) : Number.POSITIVE_INFINITY;
        
        const brakeBuffer = 1.15;
        const shouldCruise = distanceToStop > (stoppingDistance * brakeBuffer);

        const forward = ThreeDUtils.getLocalAxes(params.playerShip.rotation).forward;
        const alignment = ThreeDUtils.dotVec(forward, toTargetDir);

        const boostReady = speedNow >= (baseMaxSpeed * params.config.BOOST_READY_SPEED_RATIO);
        const hasFuel = (params.playerShip.fuel ?? 0) > 0;
        const canBoost = hasFuel && params.boostCooldownRemaining <= 0;
        
        const wantsBoostSpeed = shouldCruise && boostMaxSpeed > (baseMaxSpeed * 1.05);
        const boostStopSpeedMult = typeof params.config.AUTO_NAV_BOOST_STOP_SPEED_MULT === 'number'
            ? params.config.AUTO_NAV_BOOST_STOP_SPEED_MULT
            : 10;
        const effectiveBoostSpeed = Math.min(boostMaxSpeed, baseMaxSpeed * boostStopSpeedMult);
        const cruiseMaxSpeed = wantsBoostSpeed ? boostMaxSpeed : maxSpeed;
        const desiredSpeed = shouldCruise
            ? cruiseMaxSpeed
            : Math.min(maxSpeed, Math.sqrt(Math.max(0, 2 * brakeAccel * distanceToStop)));

        const alignedSpeedCap = alignment < 0.2
            ? Math.min(desiredSpeed, baseMaxSpeed * 0.2)
            : desiredSpeed;
        const speedDeadband = Math.max(0.0002, baseMaxSpeed * 0.01);
        const accelerate = alignment > 0.3 && (shouldCruise
            ? speedNow < alignedSpeedCap
            : speedNow < (alignedSpeedCap - speedDeadband));
        const brake = shouldCruise
            ? (speedNow > alignedSpeedCap + speedDeadband && alignment < 0.95)
            : (speedNow > (alignedSpeedCap + speedDeadband) || alignment < -0.1);
        
        // Boost when speed is high and aligned, stop only when distance to brake point reached
        const boostStopDistance = params.autoNavBoostStopDistance || params.autoNavBoostBreakpointDistance || 0;
        const isCloseEnoughToStop = boostStopDistance > 0 && distanceToStop <= boostStopDistance;
        
        // Mark when boost has been engaged at least once
        if (params.boostActive && !params.autoNavBoostEngagedOnce) {
            params.autoNavBoostEngagedOnce = true;
        }
        
        // Once we reach the stopping distance, permanently disable boost for this journey
        if (!params.autoNavBoostDisabled && isCloseEnoughToStop) {
            params.autoNavBoostDisabled = true;
            console.log('[AutoNav] Reached boost breakpoint, disabling boost:', {
                distanceToStop: Number(distanceToStop.toFixed(4)),
                boostStopDistance: Number(boostStopDistance.toFixed(4))
            });
        }
        
        // Boost desired:
        // - Initial engagement: when speed is high, aligned, fuel available, not braking
        // - Continue: while boost is already active (ignore brake signal while boosting)
        // - Stop: only when reaching breakpoint distance (isCloseEnoughToStop)
        const boostDesired = !params.autoNavBoostDisabled
            && canBoost
            && alignment > 0.6
            && (
                // Start condition: high speed, not braking, not yet engaged
                (speedNow >= maxSpeed * 0.95 && !brake && !params.autoNavBoostEngagedOnce)
                // Continue condition: already boosting (ignore brake while boosting)
                || params.boostActive
            );

        params.autoNavInput = {
            accelerate,
            brake,
            boost: boostDesired
        };

        const boostStateChanged = (params.lastAutoNavBoostDesired !== boostDesired)
            || (params.lastAutoNavBoostActive !== params.boostActive);
        if (boostStateChanged || (timestampMs && (timestampMs - params.lastAutoNavBoostLogMs) >= 5000)) {
            console.log('[AutoNavBoost]', {
                boostActive: params.boostActive,
                boostDesired,
                boostEngagedOnce: params.autoNavBoostEngagedOnce,
                canBoost,
                boostReady,
                wantsBoostSpeed,
                boostDisabled: params.autoNavBoostDisabled,
                alignment: Number(alignment.toFixed(3)),
                distanceToStop: Number(distanceToStop.toFixed(4)),
                breakpointDistance: Number(params.autoNavBoostBreakpointDistance.toFixed(4)),
                stopDistance: Number(boostStopDistance.toFixed(4)),
                isCloseEnoughToStop,
                speedNow: Number(speedNow.toFixed(4)),
                maxSpeedThreshold: Number((maxSpeed * 0.95).toFixed(4)),
                speedReadyCheck: speedNow >= maxSpeed * 0.95,
                alignmentCheck: alignment > 0.6,
                brakeActive: brake,
                inCooldown: params.boostCooldownRemaining > 0,
                shouldCruise
            });
            params.lastAutoNavBoostDesired = boostDesired;
            params.lastAutoNavBoostActive = params.boostActive;
            params.lastAutoNavBoostLogMs = timestampMs || 0;
        }

        if (timestampMs && (timestampMs - params.lastAutoNavLogMs) >= 250) {
            console.log('[AutoNav]', {
                distance: Number(distance.toFixed(4)),
                distanceToStop: Number(distanceToStop.toFixed(4)),
                desiredDistance: Number(desiredDistance.toFixed(4)),
                alignment: Number(alignment.toFixed(3)),
                speedNow: Number(speedNow.toFixed(4)),
                desiredSpeed: Number(desiredSpeed.toFixed(4)),
                maxSpeed: Number(maxSpeed.toFixed(4)),
                boostReady,
                wantsBoostSpeed,
                boostDesired,
                accelerate,
                brake
            });
            params.lastAutoNavLogMs = timestampMs;
        }
    },

    /**
     * Calculate desired stopping distance for target
     * @param {Object} params - Synthesized object with state and config
     */
    getDesiredDistance(params) {
        const targetInfo = params.getActiveTargetInfo();
        if (!targetInfo) {
            return 0;
        }

        const body = params.localDestination;
        const type = body?.type || body?.kind || targetInfo.type;

        if (type === 'STAR') {
            const bodyDockScale = (typeof params.config.SYSTEM_BODY_PHYSICS_SCALE === 'number' && params.config.SYSTEM_BODY_PHYSICS_SCALE > 0)
                ? params.config.SYSTEM_BODY_PHYSICS_SCALE
                : 1;
            const radius = (body?.radiusAU || 0) * bodyDockScale;
            const maxHeatDist = params.config.STAR_HEAT_MAX_DISTANCE_AU;
            const heatMargin = Number.isFinite(maxHeatDist) ? Math.max(0.01, maxHeatDist * 0.05) : 0.05;
            if (Number.isFinite(maxHeatDist)) {
                return Math.max(radius + heatMargin, maxHeatDist + heatMargin);
            }
            return radius + heatMargin;
        }

        if (type === 'STATION') {
            const stationRadius = Math.max(0, params.currentStation?.radiusAU ?? params.currentStation?.size ?? 0);
            const stationDockScale = (typeof params.config.STATION_PHYSICS_SCALE === 'number' && params.config.STATION_PHYSICS_SCALE > 0)
                ? params.config.STATION_PHYSICS_SCALE
                : 1;
            const dockRadius = stationRadius * stationDockScale * (params.config.STATION_DOCK_RADIUS_MULT ?? 0.6);
            return Math.max(0, dockRadius * 0.7);
        }

        if (body?.radiusAU) {
            const bodyDockScale = (typeof params.config.SYSTEM_BODY_PHYSICS_SCALE === 'number' && params.config.SYSTEM_BODY_PHYSICS_SCALE > 0)
                ? params.config.SYSTEM_BODY_PHYSICS_SCALE
                : 1;
            const dockRadius = body.radiusAU * (params.config.PLANET_DOCK_RADIUS_MULT || 1) * bodyDockScale;
            return Math.max(0, dockRadius * 0.7);
        }

        return 0;
    }
};
