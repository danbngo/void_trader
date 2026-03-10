/**
 * Space Travel Asteroids
 * Runtime asteroid spawning/despawning and rendering for orbital belts.
 */

const SpaceTravelAsteroids = (() => {
    function hashString(value) {
        const str = (value || '').toString();
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function createSeededRandom(seed) {
        let state = (seed >>> 0) || 1;
        return () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }

    function getSystemCenter(system, config) {
        return {
            x: (system?.x || 0) * config.LY_TO_AU,
            y: (system?.y || 0) * config.LY_TO_AU,
            z: 0
        };
    }

    function ensureState(mapInstance) {
        if (!mapInstance) {
            return;
        }
        if (!Array.isArray(mapInstance.asteroids)) {
            mapInstance.asteroids = [];
        }
        if (!mapInstance.asteroidLastSpawnByBeltMs || typeof mapInstance.asteroidLastSpawnByBeltMs !== 'object') {
            mapInstance.asteroidLastSpawnByBeltMs = {};
        }
    }

    function buildBelt({ id, name, type, orbitDistanceAU, widthAU, icy, minAsteroids, maxAsteroids }) {
        if (typeof AsteroidBelt !== 'undefined') {
            return new AsteroidBelt({
                id,
                name,
                type,
                orbitDistanceAU,
                widthAU,
                icy,
                minAsteroids,
                maxAsteroids
            });
        }

        return {
            id,
            name,
            type,
            orbitDistanceAU,
            widthAU,
            icy,
            minAsteroids,
            maxAsteroids
        };
    }

    function ensureSystemAsteroidBelts(system) {
        if (!system) {
            return [];
        }
        if (Array.isArray(system.asteroidBelts) && system.asteroidBelts.length > 0) {
            return system.asteroidBelts;
        }

        const seed = hashString(system.name || `${system.x},${system.y}`);
        const rand = createSeededRandom(seed);
        const planets = Array.isArray(system.planets) ? system.planets : [];
        const farthestPlanetOrbit = planets.reduce((maxOrbit, planet) => {
            const orbit = Number(planet?.orbit?.semiMajorAU) || 0;
            return Math.max(maxOrbit, orbit);
        }, 0);

        const belts = [];
        const mainCount = 1 + Math.floor(rand() * 2);
        const mainInnerBase = Math.max(1.2, farthestPlanetOrbit * 0.45);

        for (let i = 0; i < mainCount; i++) {
            const orbitDistanceAU = mainInnerBase + 1.5 + (i * (1.4 + rand() * 1.6)) + (rand() * 0.9);
            const widthAU = 0.6 + (rand() * 1.1);
            belts.push(buildBelt({
                id: `main-${i + 1}`,
                name: `Main Belt ${i + 1}`,
                type: 'MAIN',
                orbitDistanceAU,
                widthAU,
                icy: false,
                minAsteroids: 8,
                maxAsteroids: 16
            }));
        }

        const outerMain = belts.reduce((maxOrbit, belt) => {
            const orbit = Number(belt?.orbitDistanceAU) || 0;
            const width = Number(belt?.widthAU) || 0;
            return Math.max(maxOrbit, orbit + (width * 0.5));
        }, Math.max(0, farthestPlanetOrbit));

        const kuiperOrbit = Math.max(outerMain + 6 + (rand() * 4), farthestPlanetOrbit + 8 + (rand() * 6));
        belts.push(buildBelt({
            id: 'kuiper',
            name: 'Kuiper Belt',
            type: 'KUIPER',
            orbitDistanceAU: kuiperOrbit,
            widthAU: 4 + (rand() * 4),
            icy: true,
            minAsteroids: 10,
            maxAsteroids: 18
        }));

        belts.push(buildBelt({
            id: 'oort',
            name: 'Oort Cloud',
            type: 'OORT',
            orbitDistanceAU: Math.max(kuiperOrbit + 24 + (rand() * 18), farthestPlanetOrbit + 40 + (rand() * 30)),
            widthAU: 25 + (rand() * 25),
            icy: true,
            minAsteroids: 12,
            maxAsteroids: 22
        }));

        system.asteroidBelts = belts;
        return belts;
    }

    function getBeltTargetCount(belt, config) {
        const minVal = Math.max(1, Number(belt?.minAsteroids) || 1);
        const maxVal = Math.max(minVal, Number(belt?.maxAsteroids) || minVal);
        let target = Math.floor((minVal + maxVal) / 2);

        const type = (belt?.type || '').toString().toUpperCase();
        if (type === 'KUIPER') {
            target = Math.max(target, Number(config.ASTEROID_KUIPER_TARGET_COUNT) || target);
        } else if (type === 'OORT') {
            target = Math.max(target, Number(config.ASTEROID_OORT_TARGET_COUNT) || target);
        }

        return Math.max(1, target);
    }

    function getPlayerOrbitContext(mapInstance) {
        const center = getSystemCenter(mapInstance.targetSystem, mapInstance.config);
        const rel = ThreeDUtils.subVec(mapInstance.playerShip.position, center);
        const radius = Math.hypot(rel.x, rel.y);
        const angle = Math.atan2(rel.y, rel.x);
        const progress = (((angle / (Math.PI * 2)) % 1) + 1) % 1;
        return { center, radius, progress };
    }

    function logSystemEntryBeltDistances(mapInstance) {
        if (!mapInstance?.playerShip || !mapInstance?.targetSystem) {
            return;
        }

        const belts = ensureSystemAsteroidBelts(mapInstance.targetSystem);
        const playerContext = getPlayerOrbitContext(mapInstance);
        const systemName = mapInstance.targetSystem?.name || 'Unknown System';

        console.log('[Asteroids][SystemEntry]', {
            system: systemName,
            playerOrbitRadiusAU: Number(playerContext.radius.toFixed(3)),
            beltDistances: belts.map((belt) => {
                const orbitDistance = Number(belt?.orbitDistanceAU) || 0;
                return {
                    id: belt?.id || belt?.name || 'belt',
                    name: belt?.name || 'Asteroid Belt',
                    type: belt?.type || 'MAIN',
                    icy: !!belt?.icy,
                    orbitDistanceAU: Number(orbitDistance.toFixed(3)),
                    widthAU: Number((Number(belt?.widthAU) || 0).toFixed(3)),
                    playerDistanceToBeltCenterAU: Number(Math.abs(playerContext.radius - orbitDistance).toFixed(3))
                };
            })
        });
    }

    function isBeltActiveForPlayer(playerRadiusAU, belt, config) {
        const activationRange = Math.max(0.1, Number(config.ASTEROID_BELT_PLAYER_ACTIVATION_AU) || 1);
        const orbitDistance = Number(belt?.orbitDistanceAU) || 0;
        return Math.abs(playerRadiusAU - orbitDistance) <= activationRange;
    }

    function normalizeProgress(value) {
        return ((value % 1) + 1) % 1;
    }

    function getRandomAsteroidRadiusAU(belt, config, rand) {
        const isIcy = !!belt?.icy;
        const minRadius = isIcy
            ? (Number(config.ASTEROID_ICY_RADIUS_MIN_AU) || 0.0018)
            : (Number(config.ASTEROID_ROCKY_RADIUS_MIN_AU) || 0.0016);
        const maxRadius = isIcy
            ? (Number(config.ASTEROID_ICY_RADIUS_MAX_AU) || 0.0042)
            : (Number(config.ASTEROID_ROCKY_RADIUS_MAX_AU) || 0.0038);
        return minRadius + ((maxRadius - minRadius) * rand());
    }

    function createAsteroidForBelt(mapInstance, belt, timestampMs, playerContext) {
        const beltSeed = hashString(`${mapInstance.targetSystem?.name || 'system'}:${belt.id}:${timestampMs}:${Math.random()}`);
        const rand = createSeededRandom(beltSeed);
        const width = Math.max(0.05, Number(belt.widthAU) || 1);
        const minRadiusAU = Math.max(0.1, (Number(belt.orbitDistanceAU) || 1) - (width * 0.5));
        const maxRadiusAU = (Number(belt.orbitDistanceAU) || 1) + (width * 0.5);
        const orbitRadiusAU = minRadiusAU + ((maxRadiusAU - minRadiusAU) * rand());

        const spread = Math.max(0.0025, Number(mapInstance.config.ASTEROID_SPAWN_PROGRESS_SPREAD) || 0.03);
        const percentOffset = normalizeProgress(playerContext.progress + ((rand() - 0.5) * spread * 2));
        const periodDays = Math.max(40, (orbitRadiusAU * 120) + (rand() * 60));
        const inclinationMaxDeg = Math.max(1, Number(mapInstance.config.ASTEROID_MAX_INCLINATION_DEG) || 18);
        const inclinationRad = ThreeDUtils.degToRad((rand() - 0.5) * 2 * inclinationMaxDeg);

        const orbit = {
            semiMajorAU: orbitRadiusAU,
            periodDays,
            percentOffset,
            progress: percentOffset,
            inclinationRad
        };

        const center = playerContext.center;
        const orbitPos = SystemOrbitUtils.getOrbitPosition(orbit, mapInstance.currentGameState?.date || new Date());
        const worldPos = ThreeDUtils.addVec(center, orbitPos);

        const spinAxisRaw = ThreeDUtils.normalizeVec({
            x: (rand() * 2) - 1,
            y: (rand() * 2) - 1,
            z: (rand() * 2) - 1
        });

        const asteroidData = {
            id: `ast-${belt.id}-${Math.floor(timestampMs)}-${Math.floor(rand() * 100000)}`,
            position: worldPos,
            orbit,
            beltId: belt.id,
            isIcy: !!belt.icy,
            radiusAU: getRandomAsteroidRadiusAU(belt, mapInstance.config, rand),
            spinRateDegPerSec: (rand() * 40) + 8,
            spinAxis: spinAxisRaw,
            shapeSeed: rand(),
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            spawnedAtMs: timestampMs
        };

        return (typeof Asteroid !== 'undefined')
            ? new Asteroid(asteroidData)
            : asteroidData;
    }

    function updateAsteroidTransforms(mapInstance, dt) {
        const asteroids = Array.isArray(mapInstance.asteroids) ? mapInstance.asteroids : [];
        if (asteroids.length === 0) {
            return;
        }

        const center = getSystemCenter(mapInstance.targetSystem, mapInstance.config);
        const date = mapInstance.currentGameState?.date || new Date();

        asteroids.forEach((asteroid) => {
            if (!asteroid) {
                return;
            }

            if (asteroid.orbit) {
                const orbitPos = SystemOrbitUtils.getOrbitPosition(asteroid.orbit, date);
                asteroid.position = ThreeDUtils.addVec(center, orbitPos);
                asteroid.x = asteroid.position.x;
                asteroid.y = asteroid.position.y;
                asteroid.z = asteroid.position.z;
            }

            const spinDeg = Number(asteroid.spinRateDegPerSec) || 0;
            if (spinDeg > 0) {
                const axis = asteroid.spinAxis || { x: 0, y: 1, z: 0 };
                const spinRad = ThreeDUtils.degToRad(spinDeg) * dt;
                const spinQuat = ThreeDUtils.quatFromAxisAngle(axis, spinRad);
                const currentRot = asteroid.rotation || { x: 0, y: 0, z: 0, w: 1 };
                asteroid.rotation = ThreeDUtils.quatNormalize(ThreeDUtils.quatMultiply(spinQuat, currentRot));
            }
        });
    }

    function despawnFarAsteroids(mapInstance) {
        const asteroids = Array.isArray(mapInstance.asteroids) ? mapInstance.asteroids : [];
        if (asteroids.length === 0) {
            return;
        }

        const despawnDistance = Math.max(0.2, Number(mapInstance.config.ASTEROID_DESPAWN_DISTANCE_AU) || 2.5);
        mapInstance.asteroids = asteroids.filter((asteroid) => {
            if (!asteroid?.position) {
                return false;
            }
            const distanceToPlayer = ThreeDUtils.distance(asteroid.position, mapInstance.playerShip.position);
            const shouldKeep = distanceToPlayer <= despawnDistance;
            if (!shouldKeep) {
                console.log('[Asteroids][Despawn]', {
                    id: asteroid.id,
                    beltId: asteroid.beltId,
                    icy: !!asteroid.isIcy,
                    distanceToPlayerAU: Number(distanceToPlayer.toFixed(3)),
                    despawnDistanceAU: Number(despawnDistance.toFixed(3))
                });
            }
            return shouldKeep;
        });
    }

    function spawnAsteroidsIfNeeded(mapInstance, timestampMs) {
        const belts = ensureSystemAsteroidBelts(mapInstance.targetSystem);
        if (!Array.isArray(belts) || belts.length === 0) {
            return;
        }

        const maxTotal = Math.max(1, Number(mapInstance.config.ASTEROID_MAX_ACTIVE_COUNT) || 80);
        if ((mapInstance.asteroids || []).length >= maxTotal) {
            return;
        }

        const playerContext = getPlayerOrbitContext(mapInstance);
        const activeBelts = belts.filter((belt) => isBeltActiveForPlayer(playerContext.radius, belt, mapInstance.config));
        if (activeBelts.length === 0) {
            return;
        }

        const spawnIntervalMs = Math.max(100, Number(mapInstance.config.ASTEROID_SPAWN_INTERVAL_MS) || 300);

        activeBelts.forEach((belt) => {
            if ((mapInstance.asteroids || []).length >= maxTotal) {
                return;
            }

            const beltId = belt.id || belt.name || 'belt';
            const lastSpawnMs = Number(mapInstance.asteroidLastSpawnByBeltMs[beltId]) || 0;
            if ((timestampMs - lastSpawnMs) < spawnIntervalMs) {
                return;
            }

            const existingCount = (mapInstance.asteroids || []).filter(ast => ast?.beltId === beltId).length;
            const targetCount = getBeltTargetCount(belt, mapInstance.config);
            if (existingCount >= targetCount) {
                return;
            }

            const asteroid = createAsteroidForBelt(mapInstance, belt, timestampMs, playerContext);
            const maxSpawnDistance = Math.max(0.2, Number(mapInstance.config.ASTEROID_MAX_SPAWN_DISTANCE_FROM_PLAYER_AU) || 1.25);
            const distanceToPlayer = asteroid?.position
                ? ThreeDUtils.distance(asteroid.position, mapInstance.playerShip.position)
                : Infinity;

            if (distanceToPlayer <= maxSpawnDistance && asteroid) {
                mapInstance.asteroids.push(asteroid);
                console.log('[Asteroids][Spawn]', {
                    id: asteroid.id,
                    beltId: asteroid.beltId,
                    beltType: belt.type,
                    icy: !!asteroid.isIcy,
                    radiusAU: Number((Number(asteroid.radiusAU) || 0).toFixed(4)),
                    orbitRadiusAU: Number((Number(asteroid.orbit?.semiMajorAU) || 0).toFixed(3)),
                    playerDistanceAU: Number(distanceToPlayer.toFixed(3)),
                    maxSpawnDistanceAU: Number(maxSpawnDistance.toFixed(3)),
                    activeCount: mapInstance.asteroids.length
                });
            }

            mapInstance.asteroidLastSpawnByBeltMs[beltId] = timestampMs;
        });
    }

    function getAsteroidBaseColor(asteroid) {
        if (asteroid?.isIcy) {
            return '#9fd8ff';
        }
        return '#8e8e8e';
    }

    function getAsteroidVerticesCameraSpace(asteroid, playerShip, radiusAU) {
        const baseVerts = [
            { x: 1, y: 0, z: 0 },
            { x: -1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 0, y: -1, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 0, z: -1 }
        ];

        const seed = hashString(`${asteroid.id}:${asteroid.shapeSeed}`);
        const rand = createSeededRandom(seed);
        const rotation = asteroid.rotation || { x: 0, y: 0, z: 0, w: 1 };

        return baseVerts.map((vert) => {
            const deform = 0.72 + (rand() * 0.56);
            const local = ThreeDUtils.scaleVec(vert, radiusAU * deform);
            const rotated = ThreeDUtils.rotateVecByQuat(local, rotation);
            const world = ThreeDUtils.addVec(asteroid.position, rotated);
            const relative = ThreeDUtils.subVec(world, playerShip.position);
            return ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        });
    }

    function renderAsteroid({ asteroid, playerShip, depthBuffer, viewWidth, viewHeight, config }) {
        if (!asteroid?.position || !playerShip) {
            return;
        }

        const relative = ThreeDUtils.subVec(asteroid.position, playerShip.position);
        const distanceAU = ThreeDUtils.vecLength(relative);
        const cameraSpace = ThreeDUtils.rotateVecByQuat(relative, ThreeDUtils.quatConjugate(playerShip.rotation));
        if (cameraSpace.z <= config.NEAR_PLANE) {
            return;
        }

        const projected = RasterUtils.projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, config.VIEW_FOV);
        if (!projected) {
            return;
        }

        const x = Math.round(projected.x);
        const y = Math.round(projected.y);
        const radiusAU = Math.max(0.0001, Number(asteroid.radiusAU) || 0.001);
        const farSymbolDistance = Math.max(0.1, Number(config.ASTEROID_FAR_SYMBOL_DISTANCE_AU) || 1.2);

        if (distanceAU >= farSymbolDistance) {
            if (x >= 0 && x < viewWidth && y >= 0 && y < viewHeight) {
                RasterUtils.plotDepthText(depthBuffer, x, y, cameraSpace.z, config.ASTEROID_FAR_SYMBOL || '·', getAsteroidBaseColor(asteroid));
            }
            return;
        }

        const faces = [
            [0, 2, 4],
            [2, 1, 4],
            [1, 3, 4],
            [3, 0, 4],
            [2, 0, 5],
            [1, 2, 5],
            [3, 1, 5],
            [0, 3, 5]
        ];

        const verticesCam = getAsteroidVerticesCameraSpace(asteroid, playerShip, radiusAU * (Number(config.ASTEROID_RENDER_SCALE) || 1));
        const nearPlane = config.NEAR_PLANE;
        const baseColor = getAsteroidBaseColor(asteroid);

        faces.forEach((face, faceIndex) => {
            const tri = face.map(idx => verticesCam[idx]);
            const clipped = PolygonUtils.clipPolygonToNearPlane(tri, nearPlane);
            if (clipped.length < 3) {
                return;
            }

            const normal = ThreeDUtils.crossVec(
                ThreeDUtils.subVec(clipped[1], clipped[0]),
                ThreeDUtils.subVec(clipped[2], clipped[0])
            );
            if (ThreeDUtils.vecLength(normal) <= 0.0000001) {
                return;
            }

            const normalUnit = ThreeDUtils.normalizeVec(normal);
            if (normalUnit.z <= 0) {
                return;
            }

            const basis = PolygonUtils.buildPlaneBasis(normal);
            const ordered = PolygonUtils.orderPolygonVertices(clipped, basis);

            const shade = 0.45 + ((faceIndex % 3) * 0.12);
            const faceColor = SpaceTravelShared.lerpColorHex('#000000', baseColor, Math.max(0.3, Math.min(1, shade)));
            RasterUtils.rasterizeFaceDepth(
                depthBuffer,
                ordered,
                viewWidth,
                viewHeight,
                '█',
                faceColor,
                config.STATION_FACE_DEPTH_BIAS || 0.0005,
                nearPlane,
                config.VIEW_FOV,
                'tri'
            );
        });
    }

    function render(params) {
        const {
            mapInstance,
            depthBuffer,
            playerShip,
            viewWidth,
            viewHeight,
            config
        } = params || {};

        if (!mapInstance || !playerShip || !depthBuffer || !config) {
            return;
        }

        const asteroids = Array.isArray(mapInstance.asteroids) ? mapInstance.asteroids : [];
        if (asteroids.length === 0) {
            return;
        }

        asteroids.forEach((asteroid) => renderAsteroid({ asteroid, playerShip, depthBuffer, viewWidth, viewHeight, config }));
    }

    function update(mapInstance, dt, timestampMs = 0) {
        ensureState(mapInstance);
        if (!mapInstance?.playerShip || !mapInstance?.targetSystem || !mapInstance?.currentGameState) {
            return;
        }

        ensureSystemAsteroidBelts(mapInstance.targetSystem);
        updateAsteroidTransforms(mapInstance, dt);
        despawnFarAsteroids(mapInstance);
        spawnAsteroidsIfNeeded(mapInstance, timestampMs || performance.now());
    }

    return {
        ensureState,
        ensureSystemAsteroidBelts,
        logSystemEntryBeltDistances,
        update,
        render
    };
})();
