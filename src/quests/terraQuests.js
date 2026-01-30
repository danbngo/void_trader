/**
 * Terra Quest Thread
 */

const QUESTS_TERRA = {
    DELIVER_RELICS_TO_TERRA: new Quest(
        'DELIVER_RELICS_TO_TERRA',
        'Alien Investigation',
        'Deliver 10 Relics to Terra',
        50000,
        10000,
        (gameState) => {
            const currentSystem = gameState.getCurrentSystem();
            if (!currentSystem || currentSystem.name !== 'Terra') {
                return false;
            }
            let totalRelics = 0;
            for (const ship of gameState.ships) {
                totalRelics += ship.cargo['RELICS'] || 0;
            }
            return totalRelics >= 10;
        },
        'RELICS_DELIVERED',
        ['Terra'],
        (gameState) => {
            let totalRelics = 0;
            for (const ship of gameState.ships) {
                totalRelics += ship.cargo['RELICS'] || 0;
            }
            return Math.min(1.0, totalRelics / 10);
        },
        (gameState) => {
            let totalRelics = 0;
            for (const ship of gameState.ships) {
                totalRelics += ship.cargo['RELICS'] || 0;
            }
            return `Relics: ${totalRelics}/10`;
        }
    ),
    
    LIBERATE_FIRST_PLANET: new Quest(
        'LIBERATE_FIRST_PLANET',
        'Strike Back',
        'Liberate a planet from alien control',
        100000,
        20000,
        (gameState) => {
            const systemsLiberated = gameState.playerRecord[PLAYER_RECORD_TYPES.SYSTEMS_LIBERATED] || 0;
            return systemsLiberated >= 1;
        },
        'FIRST_PLANET_LIBERATED',
        [],
        (gameState) => {
            const systemsLiberated = gameState.playerRecord[PLAYER_RECORD_TYPES.SYSTEMS_LIBERATED] || 0;
            return systemsLiberated >= 1 ? 1.0 : 0.0;
        },
        (gameState) => {
            const systemsLiberated = gameState.playerRecord[PLAYER_RECORD_TYPES.SYSTEMS_LIBERATED] || 0;
            return `Systems Liberated: ${systemsLiberated}/1`;
        }
    ),

    DELIVER_ALIEN_MODULES_TO_TERRA: new Quest(
        'DELIVER_ALIEN_MODULES_TO_TERRA',
        'Alien Technology Transfer',
        'Deliver 3 alien modules to Terra (modules can be across ships)',
        250000,
        60000,
        (gameState) => {
            if (gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_MODULES_DELIVERED]) {
                return true;
            }
            const currentSystem = gameState.getCurrentSystem();
            if (!currentSystem || currentSystem.name !== 'Terra') {
                return false;
            }
            const totalAlienModules = gameState.ships.reduce((count, ship) => {
                const alienModules = (ship.modules || []).filter(moduleId =>
                    SHIP_MODULES[moduleId] && SHIP_MODULES[moduleId].alienTechnology
                ).length;
                return count + alienModules;
            }, 0);
            if (totalAlienModules < 3) {
                return false;
            }
            
            let modulesToRemove = 3;
            gameState.ships.forEach(ship => {
                if (modulesToRemove <= 0) {
                    return;
                }
                if (!ship.modules || ship.modules.length === 0) {
                    return;
                }
                const remainingModules = [];
                ship.modules.forEach(moduleId => {
                    const isAlienModule = SHIP_MODULES[moduleId] && SHIP_MODULES[moduleId].alienTechnology;
                    if (isAlienModule && modulesToRemove > 0) {
                        modulesToRemove -= 1;
                    } else {
                        remainingModules.push(moduleId);
                    }
                });
                ship.modules = remainingModules;
            });
            
            gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_MODULES_DELIVERED] = true;
            return true;
        },
        'ALIEN_MODULES_DELIVERED',
        ['Terra'],
        (gameState) => {
            if (gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_MODULES_DELIVERED]) {
                return 1.0;
            }
            const totalAlienModules = gameState.ships.reduce((count, ship) => {
                const alienModules = (ship.modules || []).filter(moduleId =>
                    SHIP_MODULES[moduleId] && SHIP_MODULES[moduleId].alienTechnology
                ).length;
                return count + alienModules;
            }, 0);
            return Math.min(1.0, totalAlienModules / 3);
        },
        (gameState) => {
            if (gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_MODULES_DELIVERED]) {
                return 'Alien Modules Delivered: 3/3';
            }
            const totalAlienModules = gameState.ships.reduce((count, ship) => {
                const alienModules = (ship.modules || []).filter(moduleId =>
                    SHIP_MODULES[moduleId] && SHIP_MODULES[moduleId].alienTechnology
                ).length;
                return count + alienModules;
            }, 0);
            return `Alien Modules Delivered: ${Math.min(totalAlienModules, 3)}/3`;
        }
    ),
    
    DEFEAT_ALIEN_FLEET: new Quest(
        'DEFEAT_ALIEN_FLEET',
        'Alien Hunter',
        'Destroy 100 alien ships',
        500000,
        100000,
        (gameState) => {
            const alienShipsDefeated = gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] || 0;
            return alienShipsDefeated >= 100;
        },
        'HUNDRED_ALIENS_DEFEATED',
        [],
        (gameState) => {
            const alienShipsDefeated = gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] || 0;
            return Math.min(1.0, alienShipsDefeated / 100);
        },
        (gameState) => {
            const alienShipsDefeated = gameState.playerRecord[PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED] || 0;
            return `Alien Ships Defeated: ${alienShipsDefeated}/100`;
        }
    )
};
