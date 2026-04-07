/**
 * FactionVsFactionEncounter - Handles encounters where two AI factions fight
 */

const FactionVsFactionEncounter = {
    show: function(gameState, encType) {
        UI.clearOutputRow();
        UI.clear();
        UI.resetSelection();

        const leftType = ENCOUNTER_TYPES[encType.leftFactionId];
        const rightType = ENCOUNTER_TYPES[encType.rightFactionId];
        const leftLabel = getPluralFactionName(leftType.name);
        const rightLabel = getPluralFactionName(rightType.name);

        const grid = UI.getGridSize();

        UI.addTitleLineCentered(0, 'Faction Conflict');
        let y = 2;

        UI.addText(10, y++, `${leftLabel} ships are exchanging fire with ${rightLabel} ships.`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `Should we intervene?`, COLORS.TEXT_NORMAL);
        y += 2;

        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;

        // Show both faction fleets
        const leftShips = gameState.encounterShips.filter(ship => ship.faction === leftType.id);
        const rightShips = gameState.encounterShips.filter(ship => ship.faction === rightType.id);

        y = ShipTableRenderer.addNPCFleet(10, y, `${leftLabel} Ships:`, leftShips);
        y++;
        y = ShipTableRenderer.addNPCFleet(10, y, `${rightLabel} Ships:`, rightShips);

        const buttonY = grid.height - 4;

        const leftButton = {
            key: '2',
            label: `Side with ${leftLabel}`,
            callback: () => {
                this.handleSideWith(gameState, leftType, rightType, encType);
            },
            color: leftType.id === 'MERCHANT' ? COLORS.TEXT_NORMAL : (leftType.color || COLORS.BUTTON),
            keyColor: leftType.id === 'MERCHANT' ? COLORS.GREEN : null,
            helpText: `Aid ${leftLabel} against ${rightLabel}`
        };

        const rightButton = {
            key: '3',
            label: `Side with ${rightLabel}`,
            callback: () => {
                this.handleSideWith(gameState, rightType, leftType, encType);
            },
            color: rightType.id === 'MERCHANT' ? COLORS.TEXT_NORMAL : (rightType.color || COLORS.BUTTON),
            keyColor: rightType.id === 'MERCHANT' ? COLORS.GREEN : null,
            helpText: `Aid ${rightLabel} against ${leftLabel}`
        };

        UI.addCenteredButtons(buttonY, [
            { key: '1', label: 'Ignore', callback: () => {
                TravelMenu.resume();
            }, color: COLORS.GREEN, helpText: 'Avoid the conflict and continue your journey' },
            leftButton,
            rightButton
        ]);

        UI.draw();
    },

    handleSideWith: function(gameState, friendlyType, enemyType, encType) {
        UI.clear();
        UI.clearOutputRow();

        const grid = UI.getGridSize();

        const { reputationEffect, bountyEffect, helpText } = this.getReputationBountyEffects(enemyType.id);

        gameState.reputation += reputationEffect;
        gameState.bounty += bountyEffect;

        // Mark friendly ships as neutral to player
        gameState.encounterShips.forEach(ship => {
            ship.isNeutralToPlayer = ship.faction === friendlyType.id;
        });

        gameState.encounterContext = {
            type: 'FACTION_CONFLICT',
            friendlyFactionId: friendlyType.id,
            enemyFactionId: enemyType.id,
            friendlyEncounterType: friendlyType,
            enemyEncounterType: enemyType,
            friendlyShips: gameState.encounterShips.filter(ship => ship.faction === friendlyType.id),
            playerDamage: 0,
            friendlyDamage: 0
        };

        UI.addTitleLineCentered(0, `You Side with ${getPluralFactionName(friendlyType.name)}`);
        let y = 2;
        UI.addText(10, y++, `You move to assist ${friendlyType.name} forces.`, COLORS.TEXT_NORMAL);
        y++;

        if (reputationEffect !== 0) {
            const sign = reputationEffect > 0 ? '+' : '';
            UI.addText(10, y++, `Reputation: ${sign}${reputationEffect} (${helpText})`, reputationEffect > 0 ? COLORS.GREEN : COLORS.TEXT_ERROR);
        }
        if (bountyEffect > 0) {
            UI.addText(10, y++, `Bounty: +${bountyEffect} credits`, COLORS.TEXT_ERROR);
        }

        const buttonY = grid.height - 3;
        UI.addCenteredButton(buttonY, '1', 'Continue to Combat', () => {
            EncounterMenu.show(gameState, encType);
        }, COLORS.TEXT_ERROR, 'Join the fight');

        UI.draw();
    },

    getReputationBountyEffects: function(enemyTypeId) {
        switch (enemyTypeId) {
            case 'POLICE':
            case 'SOLDIERS':
                return {
                    reputationEffect: REPUTATION_EFFECT_ON_ATTACK_AUTHORITIES,
                    bountyEffect: BOUNTY_INCREASE_ON_ATTACK_AUTHORITIES,
                    helpText: 'attacking authorities'
                };
            case 'MERCHANT':
                return {
                    reputationEffect: REPUTATION_EFFECT_ON_ATTACK_CIVILIAN,
                    bountyEffect: BOUNTY_INCREASE_ON_ATTACK_CIVILIANS,
                    helpText: 'attacking civilians'
                };
            case 'PIRATE':
                return {
                    reputationEffect: REPUTATION_EFFECT_ON_ATTACK_CRIMINALS,
                    bountyEffect: 0,
                    helpText: 'attacking criminals'
                };
            case 'SMUGGLERS':
                return {
                    reputationEffect: 0,
                    bountyEffect: 0,
                    helpText: 'attacking smugglers'
                };
            default:
                return {
                    reputationEffect: 0,
                    bountyEffect: 0,
                    helpText: 'engaging hostiles'
                };
        }
    }
};

function getPluralFactionName(name) {
    if (!name) return '';
    if (name === 'Police') return 'Police';
    if (name.endsWith('s')) return name;
    return `${name}s`;
};
