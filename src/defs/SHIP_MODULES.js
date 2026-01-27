/**
 * Ship Module Definitions
 * Permanent upgrades that can be installed on ships
 */

const SHIP_MODULES = {
    ARMOR_PLATING: {
        id: 'ARMOR_PLATING',
        name: 'Armor Plating',
        description: '+5 max hull',
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
        value: 6000,
        onInstall: (ship) => {
            ship.lasers += 5;
        }
    },
    
    ENGINE_UPGRADE: {
        id: 'ENGINE_UPGRADE',
        name: 'Engine Upgrade',
        description: '+5 engine level',
        value: 6000,
        onInstall: (ship) => {
            ship.engine += 5;
        }
    },
    
    RADAR_UPGRADE: {
        id: 'RADAR_UPGRADE',
        name: 'Radar Upgrade',
        description: '+5 radar level',
        value: 4000,
        onInstall: (ship) => {
            ship.radar += 5;
        }
    },
    
    CARGO_EXPANSION: {
        id: 'CARGO_EXPANSION',
        name: 'Cargo Expansion',
        description: '+5 cargo space',
        value: 4000,
        onInstall: (ship) => {
            ship.cargoCapacity += 5;
        }
    }
};

// Array of all module types for easy iteration
const SHIP_MODULES_ARRAY = Object.values(SHIP_MODULES);
