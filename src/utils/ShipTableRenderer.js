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
     * @param {Object} options - Optional settings
     * @param {number} options.selectedRowIndex - Selected row index for highlight (-1 for none)
     * @param {Function} options.onRowClick - Callback when a row is clicked
     * @param {boolean} options.showMaxStats - Show max stats instead of current (uses current ratios for colors)
     * @param {boolean} options.includeValue - Include ship value column
     * @returns {number} - Y position after the table
     */
    function addPlayerFleet(x, y, label, ships, showCargo = true, activeShipIndex = -1, options = {}) {
        if (!ships || ships.length === 0) {
            return y;
        }

        const selectedRowIndex = Number.isInteger(options.selectedRowIndex) ? options.selectedRowIndex : activeShipIndex;
        const onRowClick = typeof options.onRowClick === 'function' ? options.onRowClick : null;
        const showMaxStats = options.showMaxStats === true;
        const includeValue = options.includeValue === true;
        
        // Add label
        if (label) {
            UI.addText(x, y, label, COLORS.TEXT_NORMAL);
            y += 2;
        }
        
        // Build table headers
        const headers = ['Type', 'Hull', 'Shield', 'Lsr', 'Eng', 'Rdr'];
        if (showCargo) {
            headers.push('Fuel')
            headers.push('Cargo');
            headers.push('Mods');
            headers.push('Items');
        }
        if (includeValue) {
            headers.push('Value');
        }
        
        // Build table rows
        const rows = ships.map((ship, index) => {
            const shipType = SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const isActive = (index === activeShipIndex);
            const nameColor = isActive ? COLORS.GREEN : COLORS.TEXT_NORMAL;
            const hullRatio = ship.hull / ship.maxHull;
            const shieldRatio = ship.maxShields > 0 ? ship.shields / ship.maxShields : 0;
            const laserRatio = ship.lasers / AVERAGE_SHIP_LASER;
            const engineRatio = ship.engine / AVERAGE_SHIP_ENGINE;
            const radarRatio = ship.radar / AVERAGE_SHIP_RADAR;
            const fuelRatio = ship.maxFuel > 0 ? ship.fuel / ship.maxFuel : 0;

            const hullText = showMaxStats ? `${ship.maxHull}` : `${ship.hull}/${ship.maxHull}`;
            const shieldText = showMaxStats ? `${ship.maxShields}` : `${ship.shields}/${ship.maxShields}`;
            const fuelText = showMaxStats ? `${Math.floor(ship.maxFuel)}` : `${Math.floor(ship.fuel)}/${ship.maxFuel}`;
            const cargoText = showMaxStats ? `${ship.cargoCapacity}` : `${ship.getTotalCargo()}/${ship.cargoCapacity}`;
            
            const row = [
                { text: shipType.name, color: nameColor },
                { text: hullText, color: UI.calcStatColor(hullRatio, true) },
                { text: shieldText, color: UI.calcStatColor(shieldRatio, true) },
                { text: String(ship.lasers), color: UI.calcStatColor(laserRatio) },
                { text: String(ship.engine), color: UI.calcStatColor(engineRatio) },
                { text: String(ship.radar), color: UI.calcStatColor(radarRatio) },
            ];
            
            if (showCargo) {
                // Calculate cargo ratio: 0 cargo = 1.0, max capacity = 4.0
                const totalCargoCapacity = ships.reduce((sum, s) => sum + s.cargoCapacity, 0);
                const currentCargo = ship.getTotalCargo();
                const cargoRatio = totalCargoCapacity > 0 
                    ? 1.0 + (currentCargo / totalCargoCapacity) * 3.0 
                    : 1.0;
                const numModules = ship.modules ? ship.modules.length : 0;
                const consumables = (window && window.gameState && window.gameState.consumables) ? window.gameState.consumables : {};
                const itemsCount = Object.values(consumables).reduce((sum, count) => sum + (count || 0), 0);
                
                row.push({ text: fuelText, color: UI.calcStatColor(fuelRatio, true) });
                row.push({ text: cargoText, color: UI.calcStatColor(cargoRatio) });
                row.push({ text: String(numModules), color: COLORS.TEXT_NORMAL });
                row.push({ text: String(itemsCount), color: COLORS.TEXT_NORMAL });
            }

            if (includeValue) {
                row.push({ text: String(ship.getValue()), color: COLORS.TEXT_NORMAL });
            }
            
            return row;
        });
        
        // Render the table
        const endY = TableRenderer.renderTable(x, y, headers, rows, selectedRowIndex, 2, onRowClick);
        
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
            // Check both human and alien ship types
            const shipType = SHIP_TYPES[ship.type] || ALIEN_SHIP_TYPES[ship.type] || { name: 'Unknown' };
            const hullRatio = ship.hull / ship.maxHull;
            const shieldRatio = ship.maxShields > 0 ? ship.shields / ship.maxShields : 0;
            const laserRatio = ship.lasers / AVERAGE_SHIP_LASER;
            const engineRatio = ship.engine / AVERAGE_SHIP_ENGINE;
            const radarRatio = ship.radar / AVERAGE_SHIP_RADAR;
            
            // Display symbol + name for alien ships, just name for humans
            const displayName = shipType.symbol ? `${shipType.symbol} ${shipType.name}` : shipType.name;
            
            return [
                { text: displayName, color: COLORS.TEXT_NORMAL },
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
