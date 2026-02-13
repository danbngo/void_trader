/**
 * EncounterVisuals - Visual effects for combat
 * Handles flashing, explosions, AOE effects, and ship symbols
 */

const EncounterVisuals = (() => {
    
    /**
     * Get ship symbol - triangle for normal ships, fixed symbol for aliens
     */
    function getShipSymbol(ship) {
        // Check if alien ship - use fixed symbol from ship type
        const shipType = SHIP_TYPES[ship.type] || ALIEN_SHIP_TYPES[ship.type];
        if (shipType && shipType.isAlien && shipType.symbol) {
            return shipType.symbol;
        }
        
        // Normal ships use rotating triangle based on angle
        const angle = ship.angle;
        // Convert angle to degrees and normalize to 0-360
        const degrees = (angle * (180 / Math.PI) + 360) % 360;
        
        // 8 directions: Right (0°), Upper-Right (45°), Up (90°), Upper-Left (135°),
        //                Left (180°), Lower-Left (225°), Down (270°), Lower-Right (315°)
        
        if (degrees >= 337.5 || degrees < 22.5) {
            return '\u25B6'; // Right ▶
        } else if (degrees >= 22.5 && degrees < 67.5) {
            return '\u25E5'; // Upper-Right ◥
        } else if (degrees >= 67.5 && degrees < 112.5) {
            return '\u25B2'; // Up ▲
        } else if (degrees >= 112.5 && degrees < 157.5) {
            return '\u25E4'; // Upper-Left ◤
        } else if (degrees >= 157.5 && degrees < 202.5) {
            return '\u25C0'; // Left ◀
        } else if (degrees >= 202.5 && degrees < 247.5) {
            return '\u25E3'; // Lower-Left ◣
        } else if (degrees >= 247.5 && degrees < 292.5) {
            return '\u25BC'; // Down ▼
        } else {
            return '\u25E2'; // Lower-Right ◢
        }
    }
    
    /**
     * Trigger a flash effect for an entity (ship or asteroid)
     */
    function triggerFlash(entity) {
        const flashingEntities = EncounterState.flashingEntities;
        flashingEntities.set(entity, Date.now());
    }
    
    /**
     * Trigger an explosion animation at a position
     */
    function triggerExplosion(x, y) {
        EncounterState.explosions.push({
            x: x,
            y: y,
            startTime: Date.now(),
            duration: 800 // 0.8 seconds
        });
    }
    
    /**
     * Trigger an AOE effect animation at a position
     */
    function triggerAOE(x, y, color) {
        EncounterState.aoeEffects.push({
            x: x,
            y: y,
            startTime: Date.now(),
            duration: 800, // 0.8 seconds
            color: color
        });
    }
    
    return {
        getShipSymbol,
        triggerFlash,
        triggerExplosion,
        triggerAOE
    };
})();
