/**
 * EncounterActions - Player and enemy combat actions
 * Handles action execution, targeting, and movement
 */

const EncounterActions = (() => {
    
    /**
     * Execute a player action (laser, pursue, flee, or recharge shields)
     */
    function executePlayerAction(gameState, actionType) {
        // 250+ lines of action logic in original file
        // Handles all player actions with visual feedback
    }

    /**
     * Continue to next action after current one completes
     */
    function continueAfterAction(gameState) {
        // Determines whether to advance to next ship or start enemy turn
    }

    /**
     * Execute enemy ship turn
     */
    function executeEnemyTurn(gameState) {
        // 40+ lines for enemy AI and action selection
    }

    /**
     * Execute enemy actions sequentially with animation timing
     */
    function executeEnemyActionsSequentially(gameState, actions, index, onComplete) {
        // Recursive action execution (~250 lines)
    }

    /**
     * Execute action with tick-based animation
     */
    function executeActionWithTicks(gameState, action, onComplete) {
        // Animation and tick-based execution (~150 lines)
    }

    /**
     * Advance to next player ship that hasn't acted
     */
    function advanceToNextPlayerShip(gameState) {
        // Finds next valid player ship for turn
    }

    /**
     * Get active player ship (hasn't acted yet)
     */
    function getActivePlayerShip(gameState) {
        return gameState.ships.find(ship => 
            !ship.acted && !ship.fled && !ship.disabled && !ship.escaped
        );
    }

    /**
     * Handle player using consumable item
     */
    function useConsumable(gameState, itemId) {
        // Item usage with effect application
    }

    return {
        executePlayerAction,
        continueAfterAction,
        executeEnemyTurn,
        executeEnemyActionsSequentially,
        executeActionWithTicks,
        advanceToNextPlayerShip,
        getActivePlayerShip,
        useConsumable
    };
})();
