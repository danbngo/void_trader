/**
 * EncounterConsumables - Consumable item system for combat
 * Handles item usage, combat effects, and item drops
 */

const EncounterConsumables = (() => {
    
    /**
     * Get consumable count for player
     */
    function getConsumableCount(gameState, itemId) {
        if (!gameState.consumables) return 0;
        return gameState.consumables[itemId] || 0;
    }

    /**
     * Get possible items that enemies can use
     */
    function getEnemyPossibleItems(gameState) {
        const possibleItems = new Set();
        gameState.encounterShips.forEach(ship => {
            const encounter = ENCOUNTER_TYPES[ship.faction];
            if (encounter && Array.isArray(encounter.possibleItems)) {
                encounter.possibleItems.forEach(itemId => possibleItems.add(itemId));
            }
        });
        return Array.from(possibleItems);
    }

    /**
     * Apply a combat effect (EMP, etc.)
     */
    function applyCombatEffect(gameState, itemId, source = 'PLAYER') {
        const item = CONSUMABLES[itemId];
        if (!item) return;

        gameState.activeCombatEffect = {
            id: item.id,
            name: item.name,
            remainingTurns: item.durationTurns,
            source: source
        };

        if (item.id === 'EMP_BLASTER') {
            gameState.ships.forEach(ship => {
                ship.shields = 0;
            });
            gameState.encounterShips.forEach(ship => {
                ship.shields = 0;
            });
        }
    }

    /**
     * Advance combat effect duration
     */
    function advanceCombatEffectTurn(gameState) {
        if (!gameState.activeCombatEffect) return;
        gameState.activeCombatEffect.remainingTurns -= 1;
        if (gameState.activeCombatEffect.remainingTurns <= 0) {
            gameState.activeCombatEffect = null;
        }
    }

    /**
     * Determine if enemy uses a consumable this turn
     */
    function maybeUseEnemyConsumable(gameState) {
        if (EncounterState.enemyItemUses >= ENEMY_MAX_ITEM_USE_DURING_COMBAT) return;
        const possibleItems = getEnemyPossibleItems(gameState);
        if (possibleItems.length === 0) return;
        if (Math.random() >= ENEMY_USE_ITEM_PER_TURN_CHANCE) return;

        const itemId = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        applyCombatEffect(gameState, itemId, 'ENEMY');
        EncounterState.enemyItemUses += 1;
        if (!EncounterState.message) {
            EncounterState.message = `Enemy used ${CONSUMABLES[itemId].name}!`;
            EncounterState.messageColor = COLORS.TEXT_ERROR;
        }
    }

    /**
     * Handle enemy item drop and add to player inventory
     */
    function handleEnemyItemDrop(gameState, ship) {
        if (!ship || ship.itemDropRolled) return;
        ship.itemDropRolled = true;

        const encounter = ENCOUNTER_TYPES[ship.faction];
        const possibleItems = encounter && Array.isArray(encounter.possibleItems)
            ? encounter.possibleItems
            : [];
        if (possibleItems.length === 0) return;
        if (Math.random() >= ENEMY_DROP_ITEM_CHANCE) return;

        const itemId = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        const added = gameState.addConsumable(itemId, 1);
        if (added > 0) {
            EncounterState.message = `Recovered ${CONSUMABLES[itemId].name}!`;
            EncounterState.messageColor = COLORS.GREEN;
        } else {
            EncounterState.message = `Found ${CONSUMABLES[itemId].name}, but storage is full.`;
            EncounterState.messageColor = COLORS.TEXT_DIM;
        }
    }

    return {
        getConsumableCount,
        getEnemyPossibleItems,
        applyCombatEffect,
        advanceCombatEffectTurn,
        maybeUseEnemyConsumable,
        handleEnemyItemDrop
    };
})();
