/**
 * Ship Table Renderer Utility
 * Reusable function for rendering ship tables across different menus
 */

const ShipTableRenderer = (() => {
    /**
     * Add player fleet table to the UI
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {string} label - Label/title for the ship table
     * @param {Array<Ship>} ships - Array of ships to display
     * @param {boolean} showCargo - Whether to show cargo column (default: true)
     * @param {number} activeShipIndex - Index of active ship to highlight (-1 for none)
     * @returns {number} - Y position after the table
     */
    function addPlayerFleet(x, y, label, ships, showCargo = true, activeShipIndex = -1) {
        if (!ships || ships.length === 0) {
            return y;
        }
        
        // Add label
        if (label) {
            UI.addText(x, y, label, COLORS.TEXT_NORMAL);
            y += 2;
        }
        
        // Build table headers
        const headers = ['Ship', 'Type', 'Hull', 'Shield', 'Lsr', 'Eng', 'Rdr', 'Fuel'];
        if (showCargo) {
            headers.push('Cargo');
        }
        
        // Build table rows
        const rows = ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const isActive = (index === activeShipIndex);
            const nameColor = isActive ? COLORS.GREEN : COLORS.TEXT_NORMAL;
            const hullRatio = ship.hull / ship.maxHull;
            const shieldRatio = ship.maxShields > 0 ? ship.shields / ship.maxShields : 0;
            const laserRatio = ship.lasers / AVERAGE_SHIP_LASER_LEVEL;
            const engineRatio = ship.engine / AVERAGE_SHIP_ENGINE_LEVEL;
            const radarRatio = ship.radar / AVERAGE_SHIP_RADAR_LEVEL;
            const fuelRatio = ship.maxFuel > 0 ? ship.fuel / ship.maxFuel : 0;
            
            const row = [
                { text: ship.name, color: nameColor },
                { text: shipType.name, color: COLORS.TEXT_NORMAL },
                { text: `${ship.hull}/${ship.maxHull}`, color: UI.calcStatColor(hullRatio, true) },
                { text: `${ship.shields}/${ship.maxShields}`, color: UI.calcStatColor(shieldRatio, true) },
                { text: String(ship.lasers), color: UI.calcStatColor(laserRatio) },
                { text: String(ship.engine), color: UI.calcStatColor(engineRatio) },
                { text: String(ship.radar), color: UI.calcStatColor(radarRatio) },
                { text: `${Math.floor(ship.fuel)}/${ship.maxFuel}`, color: UI.calcStatColor(fuelRatio, true) }
            ];
            
            if (showCargo) {
                row.push({ text: `${ship.getTotalCargo()}/${ship.cargoCapacity}`, color: COLORS.TEXT_NORMAL });
            }
            
            return row;
        });
        
        // Render the table
        const endY = TableRenderer.renderTable(x, y, headers, rows, -1, 2, null);
        
        return endY + 1; // Add spacing after table
    }
    
    /**
     * Add NPC fleet table to the UI (no fuel, cargo, or ship names)
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {string} label - Label/title for the ship table
     * @param {Array<Ship>} ships - Array of ships to display
     * @returns {number} - Y position after the table
     */
    function addNPCFleet(x, y, label, ships) {
        if (!ships || ships.length === 0) {
            return y;
        }
        
        // Add label
        if (label) {
            UI.addText(x, y, label, COLORS.TEXT_NORMAL);
            y += 2;
        }
        
        // Build table headers (no fuel or cargo for NPCs)
        const headers = ['Type', 'Hull', 'Shield', 'Lsr', 'Eng', 'Rdr'];
        
        // Build table rows
        const rows = ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const hullRatio = ship.hull / ship.maxHull;
            const shieldRatio = ship.maxShields > 0 ? ship.shields / ship.maxShields : 0;
            const laserRatio = ship.lasers / AVERAGE_SHIP_LASER_LEVEL;
            const engineRatio = ship.engine / AVERAGE_SHIP_ENGINE_LEVEL;
            const radarRatio = ship.radar / AVERAGE_SHIP_RADAR_LEVEL;
            
            return [
                { text: shipType.name, color: COLORS.TEXT_NORMAL },
                { text: `${ship.hull}/${ship.maxHull}`, color: UI.calcStatColor(hullRatio, true) },
                { text: `${ship.shields}/${ship.maxShields}`, color: UI.calcStatColor(shieldRatio, true) },
                { text: String(ship.lasers), color: UI.calcStatColor(laserRatio) },
                { text: String(ship.engine), color: UI.calcStatColor(engineRatio) },
                { text: String(ship.radar), color: UI.calcStatColor(radarRatio) }
            ];
        });
        
        // Render the table
        const endY = TableRenderer.renderTable(x, y, headers, rows, -1, 2, null);
        
        return endY + 1; // Add spacing after table
    }
    
    return {
        addPlayerFleet,
        addNPCFleet
    };
})();
