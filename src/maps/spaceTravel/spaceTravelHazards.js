/**
 * Space Travel Hazard/Damage logic
 */

const SpaceTravelHazards = (() => {
    function create(config) {
        function applyDamageToPlayer({ damage, playerShip, source, recordDamageSource }) {
            let remaining = damage;
            if (playerShip.shields > 0) {
                const shieldDamage = Math.min(playerShip.shields, remaining);
                playerShip.shields -= shieldDamage;
                remaining -= shieldDamage;
            }
            if (remaining > 0) {
                playerShip.hull = Math.max(0, playerShip.hull - remaining);
                if (source && typeof recordDamageSource === 'function') {
                    recordDamageSource(source);
                }
            }
        }

        function applyStarHazards({
            dt,
            timestampMs,
            targetSystem,
            playerShip,
            currentGameState,
            recordDamageSource,
            startDeathSequence,
            getDamageFlashStartMs,
            setDamageFlashStartMs
        }) {
            if (!targetSystem || !playerShip) {
                return { killed: false, tookDamage: false };
            }
            const stars = Array.isArray(targetSystem.stars) ? targetSystem.stars : [];
            if (stars.length === 0) {
                return { killed: false, tookDamage: false };
            }

            const systemCenter = {
                x: targetSystem.x * config.LY_TO_AU,
                y: targetSystem.y * config.LY_TO_AU,
                z: 0
            };

            let tookDamage = false;

            for (let i = 0; i < stars.length; i++) {
                const star = { ...stars[i], kind: 'STAR' };
                const orbitOffset = star.orbit ? SystemOrbitUtils.getOrbitPosition(star.orbit, currentGameState.date) : { x: 0, y: 0, z: 0 };
                const worldPos = ThreeDUtils.addVec(systemCenter, orbitOffset);
                const dist = ThreeDUtils.distance(playerShip.position, worldPos);
                const bodyDockScale = (typeof config.SYSTEM_BODY_PHYSICS_SCALE === 'number' && config.SYSTEM_BODY_PHYSICS_SCALE > 0)
                    ? config.SYSTEM_BODY_PHYSICS_SCALE
                    : 1;
                const radius = (star.radiusAU || 0) * bodyDockScale;

                if (radius > 0 && dist <= radius) {
                    const toShip = ThreeDUtils.normalizeVec(ThreeDUtils.subVec(playerShip.position, worldPos));
                    playerShip.position = ThreeDUtils.addVec(worldPos, ThreeDUtils.scaleVec(toShip, radius));
                    playerShip.velocity = { x: 0, y: 0, z: 0 };
                    playerShip.shields = 0;
                    playerShip.hull = 0;
                    if (typeof recordDamageSource === 'function') {
                        recordDamageSource({
                            type: 'STAR_IMPACT',
                            name: star.name || star.id || 'the star'
                        });
                    }
                    if (typeof setDamageFlashStartMs === 'function') {
                        setDamageFlashStartMs(timestampMs);
                    }
                    if (typeof startDeathSequence === 'function') {
                        startDeathSequence(timestampMs);
                    }
                    return { killed: true, tookDamage: true };
                }

                const maxHeatDist = config.STAR_HEAT_MAX_DISTANCE_AU;
                if (Number.isFinite(maxHeatDist) && dist > maxHeatDist) {
                    continue;
                }
                if (config.STAR_HEAT_DAMAGE_PER_SEC > 0) {
                    const luminosity = Number.isFinite(star.luminosity)
                        ? star.luminosity
                        : (config.STAR_LUMINOSITY_BY_TYPE?.[star.type] ?? 1);
                    const effectiveDist = Math.max(dist, radius, 0.000001);
                    const flux = luminosity / (effectiveDist * effectiveDist);
                    const damage = config.STAR_HEAT_DAMAGE_PER_SEC * flux * dt;
                    if (damage >= 1) {
                        applyDamageToPlayer({
                            damage: Math.floor(damage),
                            playerShip,
                            source: {
                                type: 'STAR_HEAT',
                                name: star.name || star.id || 'the star'
                            },
                            recordDamageSource
                        });
                        tookDamage = true;
                    }
                }
            }

            if (tookDamage && typeof getDamageFlashStartMs === 'function' && typeof setDamageFlashStartMs === 'function') {
                const flashStart = getDamageFlashStartMs();
                if ((timestampMs - flashStart) > config.DAMAGE_FLASH_DURATION_MS) {
                    setDamageFlashStartMs(timestampMs);
                }
            }

            return { killed: false, tookDamage };
        }

        function checkHazardsAndCollisions(mapInstance, timestampMs) {
            const {
                playerShip,
                targetSystem,
                currentGameState,
                deathTow
            } = mapInstance;

            const hazardParams = {
                ...mapInstance,
                dt: 0,
                timestampMs,
                recordDamageSource: deathTow.recordDamageSource,
                startDeathSequence: (ts) => {
                    deathTow.startDeathSequence({
                        timestampMs: ts,
                        playerShip,
                        onCancelBoost: () => { mapInstance.boostActive = false; }
                    });
                },
                getDamageFlashStartMs: () => mapInstance.damageFlashStartMs,
                setDamageFlashStartMs: (value) => { mapInstance.damageFlashStartMs = value; }
            };
            
            const hazardResult = applyStarHazards(hazardParams);
            return hazardResult.killed;
        }

        return {
            applyStarHazards,
            applyDamageToPlayer,
            checkHazardsAndCollisions
        };
    }

    return {
        create
    };
})();
