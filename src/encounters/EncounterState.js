/**
 * EncounterState - Combat state management
 * Centralizes all state variables for encounter mode
 */

const EncounterState = (() => {
    let currentGameState = null;
    let encounterType = null;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    let targetIndex = 0;
    let cameraOffsetX = 0;
    let cameraOffsetY = 0;
    let mapViewRange = ENCOUNTER_MAP_VIEW_RANGE;
    let continueEnemyTurn = null;
    let waitingForContinue = false;
    let flashingEntities = new Map();
    let explosions = [];
    let aoeEffects = [];
    let itemsMode = false;
    let enemyItemUses = 0;
    
    function reset() {
        currentGameState = null;
        encounterType = null;
        outputMessage = '';
        outputColor = COLORS.TEXT_NORMAL;
        targetIndex = 0;
        cameraOffsetX = 0;
        cameraOffsetY = 0;
        mapViewRange = ENCOUNTER_MAP_VIEW_RANGE;
        continueEnemyTurn = null;
        waitingForContinue = false;
        flashingEntities.clear();
        explosions = [];
        aoeEffects = [];
        itemsMode = false;
        enemyItemUses = 0;
    }
    
    function initialize(gameState, encType) {
        currentGameState = gameState;
        encounterType = encType;
        targetIndex = 0;
        cameraOffsetX = 0;
        cameraOffsetY = 0;
        mapViewRange = ENCOUNTER_MAP_VIEW_RANGE;
        outputMessage = '';
        outputColor = COLORS.TEXT_NORMAL;
        continueEnemyTurn = null;
        waitingForContinue = false;
        flashingEntities.clear();
        explosions = [];
        aoeEffects = [];
        itemsMode = false;
        enemyItemUses = 0;
    }
    
    return {
        // Getters
        get gameState() { return currentGameState; },
        get encounterType() { return encounterType; },
        get message() { return outputMessage; },
        get messageColor() { return outputColor; },
        get targetIndex() { return targetIndex; },
        get cameraX() { return cameraOffsetX; },
        get cameraY() { return cameraOffsetY; },
        get viewRange() { return mapViewRange; },
        get continueTurn() { return continueEnemyTurn; },
        get waitingForContinue() { return waitingForContinue; },
        get flashingEntities() { return flashingEntities; },
        get explosions() { return explosions; },
        get aoeEffects() { return aoeEffects; },
        get itemsMode() { return itemsMode; },
        get enemyItemUses() { return enemyItemUses; },
        
        // Setters
        set gameState(value) { currentGameState = value; },
        set encounterType(value) { encounterType = value; },
        set message(value) { outputMessage = value; },
        set messageColor(value) { outputColor = value; },
        set targetIndex(value) { targetIndex = value; },
        set cameraX(value) { cameraOffsetX = value; },
        set cameraY(value) { cameraOffsetY = value; },
        set viewRange(value) { mapViewRange = value; },
        set continueTurn(value) { continueEnemyTurn = value; },
        set waitingForContinue(value) { waitingForContinue = value; },
        set itemsMode(value) { itemsMode = value; },
        set enemyItemUses(value) { enemyItemUses = value; },
        
        // Methods
        reset,
        initialize
    };
})();
