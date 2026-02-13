/**
 * Space Travel Physics
 * Physics calculations and state updates
 */

const SpaceTravelPhysics = {
    /**
     * Advance game time
     * @param {Object} params - Synthesized object with state and config
     * @param {number} dt - Delta time in seconds
     */
    advanceTime(params, dt) {
        if (params.currentGameState && params.currentGameState.date) {
            const gameSecondsAdvance = dt * params.config.TIME_SCALE_GAME_SECONDS_PER_REAL_SECOND;
            params.currentGameState.date = new Date(params.currentGameState.date.getTime() + (gameSecondsAdvance * 1000));
            params.currentGameState.timeSinceDock = (params.currentGameState.timeSinceDock || 0) + (gameSecondsAdvance * 1000);
        }
    },

    /**
     * Update player ship position based on velocity
     * @param {Object} params - Synthesized object with state and config
     * @param {number} dt - Delta time in seconds
     * @param {number} isWarpArrival - Whether this is a warp arrival
     */
    positionShip(params, resetPosition, isWarpArrival = false) {
        const currentSystem = params.currentGameState.getCurrentSystem();
        const currentSystemPos = {
            x: currentSystem.x * params.config.LY_TO_AU,
            y: currentSystem.y * params.config.LY_TO_AU,
            z: 0
        };

        const hasPosition = params.playerShip.position && typeof params.playerShip.position.x === 'number';
        if (resetPosition || !hasPosition) {
            params.playerShip.velocity = { x: 0, y: 0, z: 0 };
        }

        if (resetPosition || !hasPosition) {
            if (params.currentStation) {
                const baseEntranceDir = ThreeDUtils.normalizeVec(params.config.STATION_ENTRANCE_DIR);
                const entranceYaw = ThreeDUtils.degToRad(params.config.STATION_ENTRANCE_YAW_DEG || 0);
                const yawRot = ThreeDUtils.quatFromAxisAngle({ x: 0, y: 1, z: 0 }, entranceYaw);
                const yawedEntranceDir = ThreeDUtils.rotateVecByQuat(baseEntranceDir, yawRot);
                const entranceDir = params.currentStation.rotation
                    ? ThreeDUtils.rotateVecByQuat(yawedEntranceDir, params.currentStation.rotation)
                    : yawedEntranceDir;
                const stationRadius = Math.max(0, params.currentStation.radiusAU ?? params.currentStation.size ?? 0);
                const stationVisualScale = params.config.STATION_SCREEN_SCALE || 1;
                const stationPhysicsScale = (typeof params.config.STATION_PHYSICS_SCALE === 'number' && params.config.STATION_PHYSICS_SCALE > 0)
                    ? params.config.STATION_PHYSICS_SCALE
                    : 1;
                const stationSpawnScale = Math.max(stationPhysicsScale, stationVisualScale);
                const spawnMult = typeof params.config.STATION_SPAWN_DISTANCE_MULT === 'number'
                    ? params.config.STATION_SPAWN_DISTANCE_MULT
                    : 1.1;
                // Apply extra distance for warp arrival
                const warpDistanceMult = isWarpArrival ? 3 : 1;
                const minSpawnDistance = typeof params.config.STATION_SPAWN_MIN_DISTANCE_AU === 'number'
                    ? params.config.STATION_SPAWN_MIN_DISTANCE_AU
                    : 0;
                const offsetDistance = Math.max(
                    minSpawnDistance,
                    stationRadius * stationSpawnScale * spawnMult * warpDistanceMult
                );
                const startOffset = ThreeDUtils.scaleVec(entranceDir, offsetDistance);
                params.playerShip.position = ThreeDUtils.addVec(params.currentStation.position, startOffset);
                ThreeDUtils.faceToward(params.playerShip, params.currentStation.position);
            } else {
                params.playerShip.position = currentSystemPos;
            }
        }
    },

    /**
     * Update ship movement based on input
     * @param {Object} params - Synthesized object with all state and config
     * @param {number} dt - Delta time in seconds
     * @param {number} timestampMs - Current timestamp
     */
    updateMovement(params, dt, timestampMs = 0) {
        const autoNavInput = params.autoNavActive ? params.autoNavInput : null;
        const codeState = params.inputState.codeState || params.inputState.keyState;
        const accelerate = (params.emergenceMomentumActive) // Block acceleration during emergence
            ? false
            : (autoNavInput
                ? !!autoNavInput.accelerate
                : (codeState.has('KeyW') || params.inputState.keyState.has('w') || params.inputState.keyState.has('W')));
        const brake = autoNavInput
            ? !!autoNavInput.brake
            : (codeState.has('KeyS') || params.inputState.keyState.has('s') || params.inputState.keyState.has('S'));
        const boostKey = (params.emergenceMomentumActive) // Block boost during emergence
            ? false
            : (autoNavInput
                ? !!autoNavInput.boost
                : (codeState.has('ShiftLeft') || codeState.has('ShiftRight') || params.inputState.keyState.has('Shift')));
        const wasBoosting = params.boostActive;

        const engine = params.playerShip.engine || 10;
        const baseMaxSpeed = params.getBaseMaxSpeed(params.playerShip);
        const baseAccel = params.playerShip.size * engine * params.config.SHIP_ACCEL_PER_ENGINE * params.config.BASE_ACCEL_MULT;
        const speedNow = ThreeDUtils.vecLength(params.playerShip.velocity);
        const hasFuel = (params.playerShip.fuel ?? 0) > 0;
        const boostReady = speedNow >= (baseMaxSpeed * params.config.BOOST_READY_SPEED_RATIO);

        params.boostActive = boostKey && hasFuel && params.boostCooldownRemaining <= 0 && boostReady;

        if (params.boostActive && !wasBoosting) {
            params.boostStartTimestampMs = timestampMs;
            console.log('[SpaceTravel] Boost started:', { timestampMs, boostStartTimestampMs: params.boostStartTimestampMs });
        }
        if (!params.boostActive && wasBoosting) {
            params.boostEndTimestampMs = timestampMs;
            console.log('[SpaceTravel] Boost ended:', { timestampMs, boostEndTimestampMs: params.boostEndTimestampMs });
        }

        const pendingCooldown = (!params.boostActive && wasBoosting) ? params.config.BOOST_COOLDOWN_SEC : params.boostCooldownRemaining;
        const inBoostCooldown = !params.boostActive && pendingCooldown > 0;
        const accel = baseAccel * (params.boostActive ? params.config.BOOST_ACCEL_MULT : 1);
        const brakeAccel = baseAccel * (params.boostActive ? params.config.BOOST_ACCEL_MULT : (inBoostCooldown ? params.config.BOOST_BRAKE_MULT : 2));
        const maxSpeed = params.getMaxSpeed(params.playerShip, params.boostActive);
        const forward = ThreeDUtils.getLocalAxes(params.playerShip.rotation).forward;

        if (params.boostActive) {
            params.playerShip.velocity = PhysicsUtils.applyAcceleration(params.playerShip.velocity, forward, accel, dt);
        } else {
            if (accelerate && !inBoostCooldown) {
                params.playerShip.velocity = PhysicsUtils.applyAcceleration(params.playerShip.velocity, forward, accel, dt);
            }
            if (brake) {
                params.playerShip.velocity = PhysicsUtils.applyBrake(params.playerShip.velocity, brakeAccel, dt);
            }
        }

        if (params.boostActive) {
            params.playerShip.fuel = Math.max(0, (params.playerShip.fuel ?? 0) - (params.config.BOOST_FUEL_PER_SEC * dt));
            if (params.playerShip.fuel <= 0) {
                params.playerShip.fuel = 0;
                params.boostActive = false;
                params.boostEndTimestampMs = timestampMs;
            }
        }

        if (!params.boostActive && wasBoosting) {
            params.boostCooldownRemaining = params.config.BOOST_COOLDOWN_SEC;
            params.boostCooldownStartSpeed = ThreeDUtils.vecLength(params.playerShip.velocity);
        }

        const effectiveMaxSpeed = (!params.boostActive && params.boostCooldownRemaining > 0)
            ? Math.max(baseMaxSpeed, params.boostCooldownStartSpeed)
            : maxSpeed;
        params.playerShip.velocity = PhysicsUtils.clampSpeed(params.playerShip.velocity, effectiveMaxSpeed);

        if (!params.boostActive && params.boostCooldownRemaining > 0) {
            params.boostCooldownRemaining = Math.max(0, params.boostCooldownRemaining - dt);
            const elapsedCooldown = params.config.BOOST_COOLDOWN_SEC - params.boostCooldownRemaining;
            const decelT = params.config.BOOST_COOLDOWN_DECEL_SEC > 0
                ? Math.min(1, elapsedCooldown / params.config.BOOST_COOLDOWN_DECEL_SEC)
                : 1;
            const targetSpeed = params.boostCooldownStartSpeed * (1 - decelT);
            const speedNowCooldown = ThreeDUtils.vecLength(params.playerShip.velocity);
            if (speedNowCooldown > targetSpeed && speedNowCooldown > 0) {
                params.playerShip.velocity = ThreeDUtils.scaleVec(params.playerShip.velocity, targetSpeed / speedNowCooldown);
            }
            if (ThreeDUtils.vecLength(params.playerShip.velocity) <= (baseMaxSpeed * params.config.BOOST_COOLDOWN_END_SPEED_MULT)) {
                params.boostCooldownRemaining = 0;
                // Ensure boost end timestamp is cleared when cooldown completes
                params.boostEndTimestampMs = 0;
            }
        }

        params.playerShip.position = ThreeDUtils.addVec(params.playerShip.position, ThreeDUtils.scaleVec(params.playerShip.velocity, dt));
    },

    /**
     * Regenerate ship stats (laser, shields, etc.)
     * @param {Object} params - Synthesized object with state and config
     * @param {number} dt - Delta time in seconds
     */
    regenStats(params, dt) {
        const laserMax = Ship.getLaserMax(params.playerShip);
        const laserCurrent = Ship.getLaserCurrent(params.playerShip);
        if (laserCurrent < laserMax) {
            params.laserRegenTimer += dt;
            while (params.laserRegenTimer >= params.config.LASER_REGEN_SEC) {
                Ship.setLaserCurrent(params.playerShip, Ship.getLaserCurrent(params.playerShip) + 1);
                params.laserRegenTimer -= params.config.LASER_REGEN_SEC;
            }
        } else {
            params.laserRegenTimer = 0;
        }

        if (params.playerShip.maxShields > 0 && params.playerShip.shields < params.playerShip.maxShields) {
            params.shieldRegenTimer += dt;
            while (params.shieldRegenTimer >= params.config.SHIELD_REGEN_SEC) {
                params.playerShip.shields = Math.min(params.playerShip.maxShields, params.playerShip.shields + 1);
                params.shieldRegenTimer -= params.config.SHIELD_REGEN_SEC;
            }
        } else {
            params.shieldRegenTimer = 0;
        }
    },

    /**
     * Initialize emergence momentum (post-warp acceleration)
     * @param {Object} params - Synthesized object with state and config
     */
    initializeEmergenceMomentum(params) {
        if (!params.currentStation || !params.playerShip) {
            return;
        }

        const towards = ThreeDUtils.subVec(params.currentStation.position, params.playerShip.position);
        const direction = ThreeDUtils.normalizeVec(towards);
        const maxSpeed = params.getMaxSpeed(params.playerShip, false) || params.config.SHIP_MAX_SPEED_AU_PER_MS || 0;
        const momentumSpeed = maxSpeed * 10; // 10x max speed

        params.emergenceMomentumActive = true;
        params.emergenceMomentumStartMs = performance.now();
        params.emergenceMomentumDirection = direction;
        params.emergenceMomentumMaxSpeed = momentumSpeed;
        
        // Apply initial velocity
        params.playerShip.velocity = ThreeDUtils.scaleVec(direction, momentumSpeed);
    },

    /**
     * Update emergence momentum
     * @param {Object} params - Synthesized object with state and config
     * @param {number} timestampMs - Current timestamp
     * @returns {boolean} - True if momentum is still active
     */
    updateEmergenceMomentum(params, timestampMs) {
        if (!params.emergenceMomentumActive) {
            return false;
        }

        const EMERGENCE_MOMENTUM_DURATION_MS = 3000;
        const elapsed = timestampMs - params.emergenceMomentumStartMs;

        if (elapsed >= EMERGENCE_MOMENTUM_DURATION_MS) {
            params.emergenceMomentumActive = false;
            params.emergenceMomentumDirection = null;
            params.emergenceMomentumMaxSpeed = 0;
            return false;
        }

        // Taper off momentum (similar to boost cooldown deceleration)
        const remaining = EMERGENCE_MOMENTUM_DURATION_MS - elapsed;
        const progress = 1 - (remaining / EMERGENCE_MOMENTUM_DURATION_MS);
        const tapering = Math.pow(1 - progress, 2); // Smooth taper
        const speed = params.emergenceMomentumMaxSpeed * tapering;

        if (params.emergenceMomentumDirection) {
            params.playerShip.velocity = ThreeDUtils.scaleVec(params.emergenceMomentumDirection, speed);
        }

        return true;
    },

    /**
     * Get remaining emergence momentum cooldown
     * @param {Object} params - Synthesized object with state
     * @returns {number} - Milliseconds remaining
     */
    getEmergenceMomentumCooldownRemaining(params) {
        if (!params.emergenceMomentumActive) {
            return 0;
        }
        const EMERGENCE_MOMENTUM_DURATION_MS = 3000;
        const elapsed = performance.now() - params.emergenceMomentumStartMs;
        return Math.max(0, EMERGENCE_MOMENTUM_DURATION_MS - elapsed);
    }
};
