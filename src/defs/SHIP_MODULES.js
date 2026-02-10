/**
 * Ship Module Definitions
 * Permanent upgrades that can be installed on ships
 */

const SHIP_MODULES = {
    ARMOR_PLATING: {
        id: 'ARMOR_PLATING',
        name: 'Armor Plating',
        description: '+5 max hull',
        slot: SHIP_MODULE_SLOT.ARMOR,
        value: 5000,
        onInstall: (ship) => {
            ship.maxHull += 5;
            ship.hull += 5; // Also increase current hull
        }
    },
    
    HARDENED_SHIELDS: {
        id: 'HARDENED_SHIELDS',
        name: 'Hardened Shields',
        description: '+5 max shields',
        slot: SHIP_MODULE_SLOT.ARMOR,
        value: 5000,
        onInstall: (ship) => {
            ship.maxShields += 5;
            ship.shields += 5; // Also increase current shields
        }
    },
    
    FUEL_TANK: {
        id: 'FUEL_TANK',
        name: 'Expanded Fuel Tank',
        description: '+5 max fuel',
        slot: SHIP_MODULE_SLOT.ENGINE,
        value: 3000,
        onInstall: (ship) => {
            ship.maxFuel += 5;
            ship.fuel += 5; // Also increase current fuel
        }
    },
    
    LASER_UPGRADE: {
        id: 'LASER_UPGRADE',
        name: 'Laser Upgrade',
        description: '+5 laser level',
        slot: SHIP_MODULE_SLOT.WEAPON,
        value: 6000,
        onInstall: (ship) => {
            Ship.setLaserMax(ship, Ship.getLaserMax(ship) + 5);
        }
    },
    
    ENGINE_UPGRADE: {
        id: 'ENGINE_UPGRADE',
        name: 'Engine Upgrade',
        description: '+5 engine level',
        slot: SHIP_MODULE_SLOT.ENGINE,
        value: 6000,
        onInstall: (ship) => {
            ship.engine += 5;
        }
    },
    
    RADAR_UPGRADE: {
        id: 'RADAR_UPGRADE',
        name: 'Radar Upgrade',
        description: '+5 radar level',
        slot: SHIP_MODULE_SLOT.COMPUTER,
        value: 4000,
        onInstall: (ship) => {
            ship.radar += 5;
        }
    },
    
    CARGO_EXPANSION: {
        id: 'CARGO_EXPANSION',
        name: 'Cargo Expansion',
        description: '+5 cargo space',
        slot: SHIP_MODULE_SLOT.CHASSIS,
        value: 4000,
        onInstall: (ship) => {
            ship.cargoCapacity += 5;
        }
    },
    
    REFLECTOR: {
        id: 'REFLECTOR',
        name: 'Reflector',
        description: '25% chance to reflect lasers',
        slot: SHIP_MODULE_SLOT.ARMOR,
        value: 8000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    },
    
    DISRUPTER: {
        id: 'DISRUPTER',
        name: 'Disrupter',
        description: '25% chance to strip shields',
        slot: SHIP_MODULE_SLOT.WEAPON,
        value: 7000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    },
    
    DRILL: {
        id: 'DRILL',
        name: 'Drill',
        description: '2x ramming damage',
        slot: SHIP_MODULE_SLOT.CHASSIS,
        value: 6000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    },
    
    REGENERATIVE_HULL: {
        id: 'REGENERATIVE_HULL',
        name: 'Regenerative Hull',
        description: '+1 hull per combat turn',
        slot: SHIP_MODULE_SLOT.ARMOR,
        value: 10000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    },
    
    TRACTOR_BEAM: {
        id: 'TRACTOR_BEAM',
        name: 'Tractor Beam',
        description: 'Pulls enemies on laser hit',
        alienTechnology: true,
        slot: SHIP_MODULE_SLOT.WEAPON,
        value: 9000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    },
    
    REPULSOR: {
        id: 'REPULSOR',
        name: 'Repulsor',
        description: 'Pushes enemies on laser hit',
        alienTechnology: true,
        slot: SHIP_MODULE_SLOT.WEAPON,
        value: 9000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    },
    
    BLINK: {
        id: 'BLINK',
        name: 'Blink',
        description: '25% chance to teleport when hit',
        alienTechnology: true,
        slot: SHIP_MODULE_SLOT.COMPUTER,
        value: 12000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    },
    
    SELF_DESTRUCT: {
        id: 'SELF_DESTRUCT',
        name: 'Self Destruct',
        description: 'Damages nearby on death',
        slot: SHIP_MODULE_SLOT.COMPUTER,
        value: 8000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    },
    
    WARHEAD: {
        id: 'WARHEAD',
        name: 'Warhead',
        description: 'Splash damage on laser hit',
        slot: SHIP_MODULE_SLOT.WEAPON,
        value: 11000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    },
    
    SOLAR_COLLECTORS: {
        id: 'SOLAR_COLLECTORS',
        name: 'Solar Collectors',
        description: 'Regain all fuel at destination',
        slot: SHIP_MODULE_SLOT.ENGINE,
        value: 7000,
        onInstall: (ship) => {
            // Passive effect, handled in travel
        }
    },
    
    ENHANCED_SCANNER: {
        id: 'ENHANCED_SCANNER',
        name: 'Enhanced Scanner',
        description: '-20% undetected enemy chance',
        slot: SHIP_MODULE_SLOT.COMPUTER,
        value: 8000,
        onInstall: (ship) => {
            // Passive effect, handled in encounters
        }
    },
    
    CLOAK: {
        id: 'CLOAK',
        name: 'Cloak',
        description: '+20% undetected fleet chance',
        slot: SHIP_MODULE_SLOT.COMPUTER,
        value: 10000,
        onInstall: (ship) => {
            // Passive effect, handled in encounters
        }
    },
    
    SHIELD_RECHARGER: {
        id: 'SHIELD_RECHARGER',
        name: 'Shield Recharger',
        description: '4x shield regen in combat',
        alienTechnology: true,
        slot: SHIP_MODULE_SLOT.ENGINE,
        value: 9000,
        onInstall: (ship) => {
            // Passive effect, handled in combat
        }
    }
};

// Array of all module types for easy iteration
const SHIP_MODULES_ARRAY = Object.values(SHIP_MODULES);
