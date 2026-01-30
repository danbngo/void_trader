/**
 * Blackreach Quest Thread
 */

const QUESTS_BLACKREACH = {
    BLACKREACH_ILLEGAL_TRAINING: new Quest(
        'BLACKREACH_ILLEGAL_TRAINING',
        'The Blackreach Connection',
        'Learn Cargo Handling: Illegal',
        50000,
        15000,
        (gameState) => {
            return gameState.perks && gameState.perks.has('CARGO_ILLEGAL');
        },
        'BLACKREACH_ILLEGAL_TRAINED',
        ['Blackreach'],
        (gameState) => {
            return (gameState.perks && gameState.perks.has('CARGO_ILLEGAL')) ? 1.0 : 0.0;
        },
        'Illegal Cargo Handling'
    ),

    BLACKREACH_SELL_DRUGS: new Quest(
        'BLACKREACH_SELL_DRUGS',
        'Synthetic Spread',
        'Sell 100 total Drugs',
        75000,
        20000,
        (gameState) => {
            const drugsSold = gameState.playerRecord[PLAYER_RECORD_TYPES.DRUGS_SOLD_TOTAL] || 0;
            return drugsSold >= 100;
        },
        'BLACKREACH_DRUGS_SOLD',
        ['Blackreach'],
        (gameState) => {
            const drugsSold = gameState.playerRecord[PLAYER_RECORD_TYPES.DRUGS_SOLD_TOTAL] || 0;
            return Math.min(1.0, drugsSold / 100);
        },
        (gameState) => {
            const drugsSold = gameState.playerRecord[PLAYER_RECORD_TYPES.DRUGS_SOLD_TOTAL] || 0;
            return `Drugs Sold: ${drugsSold}/100`;
        }
    ),

    BLACKREACH_STOCK_WEAPONS: new Quest(
        'BLACKREACH_STOCK_WEAPONS',
        'Arm the Shadows',
        'Sell weapons at Blackreach until the market has 200 Weapons',
        100000,
        25000,
        (gameState) => {
            const blackreach = gameState.systems.find(sys => sys.name === 'Blackreach');
            const stock = blackreach && blackreach.cargoStock ? (blackreach.cargoStock[CARGO_TYPES.WEAPONS.id] || 0) : 0;
            return stock >= 200;
        },
        'BLACKREACH_WEAPONS_STOCKED',
        ['Blackreach'],
        (gameState) => {
            const blackreach = gameState.systems.find(sys => sys.name === 'Blackreach');
            const stock = blackreach && blackreach.cargoStock ? (blackreach.cargoStock[CARGO_TYPES.WEAPONS.id] || 0) : 0;
            return Math.min(1.0, stock / 200);
        },
        (gameState) => {
            const blackreach = gameState.systems.find(sys => sys.name === 'Blackreach');
            const stock = blackreach && blackreach.cargoStock ? (blackreach.cargoStock[CARGO_TYPES.WEAPONS.id] || 0) : 0;
            return `Weapons in Blackreach Market: ${Math.min(stock, 200)}/200`;
        }
    ),

    BLACKREACH_DELIVER_ANTIMATTER: new Quest(
        'BLACKREACH_DELIVER_ANTIMATTER',
        'Volatile Delivery',
        'Bring 50 Antimatter to a buyer on Terra',
        150000,
        35000,
        (gameState) => {
            if (gameState.playerRecord[PLAYER_RECORD_TYPES.BLACKREACH_ANTIMATTER_DELIVERED]) {
                return true;
            }
            const currentSystem = gameState.getCurrentSystem();
            if (!currentSystem || currentSystem.name !== 'Terra') {
                return false;
            }
            let totalAntimatter = 0;
            gameState.ships.forEach(ship => {
                totalAntimatter += ship.cargo[CARGO_TYPES.ANTIMATTER.id] || 0;
            });
            if (totalAntimatter < 50) {
                return false;
            }
            
            let remaining = 50;
            gameState.ships.forEach(ship => {
                if (remaining <= 0) return;
                const amount = ship.cargo[CARGO_TYPES.ANTIMATTER.id] || 0;
                if (amount > 0) {
                    const take = Math.min(amount, remaining);
                    ship.cargo[CARGO_TYPES.ANTIMATTER.id] -= take;
                    remaining -= take;
                }
            });
            
            gameState.playerRecord[PLAYER_RECORD_TYPES.BLACKREACH_ANTIMATTER_DELIVERED] = true;
            return true;
        },
        'BLACKREACH_ANTIMATTER_DELIVERED',
        ['Terra'],
        (gameState) => {
            if (gameState.playerRecord[PLAYER_RECORD_TYPES.BLACKREACH_ANTIMATTER_DELIVERED]) {
                return 1.0;
            }
            let totalAntimatter = 0;
            gameState.ships.forEach(ship => {
                totalAntimatter += ship.cargo[CARGO_TYPES.ANTIMATTER.id] || 0;
            });
            return Math.min(1.0, totalAntimatter / 50);
        },
        (gameState) => {
            if (gameState.playerRecord[PLAYER_RECORD_TYPES.BLACKREACH_ANTIMATTER_DELIVERED]) {
                return 'Antimatter Delivered: 50/50';
            }
            let totalAntimatter = 0;
            gameState.ships.forEach(ship => {
                totalAntimatter += ship.cargo[CARGO_TYPES.ANTIMATTER.id] || 0;
            });
            return `Antimatter Delivered: ${Math.min(totalAntimatter, 50)}/50`;
        }
    ),

    BLACKREACH_BOUNTY_TERROR: new Quest(
        'BLACKREACH_BOUNTY_TERROR',
        'Terror by Reputation',
        'Reach a bounty of 100,000 credits',
        200000,
        45000,
        (gameState) => {
            return gameState.bounty >= 100000;
        },
        'BLACKREACH_BOUNTY_REACHED',
        ['Blackreach'],
        (gameState) => {
            return Math.min(1.0, (gameState.bounty || 0) / 100000);
        },
        (gameState) => {
            return `Bounty: ${Math.min(gameState.bounty || 0, 100000)}/100000`;
        }
    ),

    BLACKREACH_DESTROY_POLICE: new Quest(
        'BLACKREACH_DESTROY_POLICE',
        'Silence the Law',
        'Destroy 100 police ships',
        250000,
        60000,
        (gameState) => {
            const policeDestroyed = gameState.playerRecord[PLAYER_RECORD_TYPES.POLICE_SHIPS_DESTROYED] || 0;
            return policeDestroyed >= 100;
        },
        'BLACKREACH_POLICE_DESTROYED',
        ['Blackreach'],
        (gameState) => {
            const policeDestroyed = gameState.playerRecord[PLAYER_RECORD_TYPES.POLICE_SHIPS_DESTROYED] || 0;
            return Math.min(1.0, policeDestroyed / 100);
        },
        (gameState) => {
            const policeDestroyed = gameState.playerRecord[PLAYER_RECORD_TYPES.POLICE_SHIPS_DESTROYED] || 0;
            return `Police Ships Destroyed: ${policeDestroyed}/100`;
        }
    )
};
