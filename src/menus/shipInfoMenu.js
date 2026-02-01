/**
 * Ship Info Menu
 * Shows ship status and specifications
 */

const ShipInfoMenu = (() => {
    let selectedShipIndex = 0;

    function wrapText(text, maxWidth) {
        if (!text) return [''];
        const words = text.split(' ');
        const lines = [];
        let current = '';
        words.forEach(word => {
            const testLine = current ? `${current} ${word}` : word;
            if (testLine.length > maxWidth) {
                if (current) lines.push(current);
                current = word;
            } else {
                current = testLine;
            }
        });
        if (current) lines.push(current);
        return lines.length ? lines : [''];
    }

    /**
     * Show ship information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        const ships = gameState.ships || [];
        if (ships.length === 0) {
            UI.addTitleLineCentered(0, 'Fleet Status');
            UI.addTextCentered(5, 'No ships available', COLORS.TEXT_DIM);
            UI.addCenteredButton(grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
            UI.draw();
            return;
        }
        if (selectedShipIndex >= ships.length) {
            selectedShipIndex = 0;
        }
        
        // Title
        UI.addTitleLineCentered(0, 'Fleet Status');
        
        // Fleet summary
        const totalShips = gameState.ships.length;
        const maxShips = 5; // TODO: Make this dynamic based on perks if needed
        
        const totalOfficers = gameState.subordinates.length;
        const maxOfficers = 1 + (gameState.perks.has('LEADERSHIP_I') ? 1 : 0) 
                              + (gameState.perks.has('LEADERSHIP_II') ? 1 : 0) 
                              + (gameState.perks.has('LEADERSHIP_III') ? 1 : 0);
        
        const fleetCargo = Ship.getFleetCargo(gameState.ships);
        const totalCargo = Object.values(fleetCargo).reduce((sum, amt) => sum + amt, 0);
        const maxCargo = Ship.getFleetCargoCapacity(gameState.ships);
        
        const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
        const maxFuel = gameState.ships.reduce((sum, ship) => sum + ship.maxFuel, 0);
        
        let y = TableRenderer.renderKeyValueList(5, 2, [
            { label: 'Ships:', value: `${totalShips} / ${maxShips}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Officers:', value: `${totalOfficers} / ${maxOfficers}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Cargo:', value: `${totalCargo} / ${maxCargo}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Fuel:', value: `${totalFuel} / ${maxFuel}`, valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;

        // Player fleet table (selectable)
        const tableEndY = ShipTableRenderer.addPlayerFleet(5, y, null, ships, true, -1, {
            selectedRowIndex: selectedShipIndex,
            onRowClick: (rowIndex) => {
                selectedShipIndex = rowIndex;
                show(onReturn);
            }
        });
        y = tableEndY + 1;

        // Selected ship info (below table)
        const selectedShip = ships[selectedShipIndex];
        const selectedShipType = SHIP_TYPES[selectedShip.type] || { name: 'Unknown' };
        const moduleEntries = (selectedShip.modules || [])
            .map(moduleId => {
                const module = SHIP_MODULES[moduleId];
                if (!module) {
                    return {
                        slot: 'MODULE',
                        name: moduleId,
                        description: ''
                    };
                }
                return {
                    slot: module.slot || 'MODULE',
                    name: module.name,
                    description: module.description || ''
                };
            });
        const consumableItems = Object.keys(gameState.consumables || {})
            .filter(itemId => (gameState.consumables[itemId] || 0) > 0)
            .map(itemId => {
                const item = CONSUMABLES[itemId];
                const name = item ? item.name : itemId;
                return `${name} x${gameState.consumables[itemId]}`;
            });

        const maxWidth = grid.width - 10;
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Currently selected ship:', value: `${selectedShipType.name}`, valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;

        UI.addText(5, y++, 'Modules:', COLORS.CYAN);
        const moduleItems = [];
        if (moduleEntries.length === 0) {
            moduleItems.push({ label: '', value: 'None', valueColor: COLORS.TEXT_NORMAL });
        } else {
            moduleEntries.forEach(entry => {
                const label = `${entry.slot}:`;
                const valueText = entry.description
                    ? `${entry.name}: ${entry.description}`
                    : entry.name;
                const maxValueLength = Math.max(1, grid.width - (5 + label.length + 1));
                const wrapped = wrapText(valueText, maxValueLength);
                wrapped.forEach((line, index) => {
                    moduleItems.push({
                        label: index === 0 ? label : '',
                        value: line,
                        valueColor: COLORS.TEXT_NORMAL
                    });
                });
            });
        }
        y = TableRenderer.renderKeyValueList(5, y, moduleItems);
        y++;

        const itemsText = consumableItems.length > 0 ? consumableItems.join(', ') : 'None';
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Items:', value: itemsText, valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;
        
        // Prev/Next ship buttons (only if more than 1 ship)
        const backY = grid.height - 4;
        if (ships.length > 1) {
            UI.addButton(5, backY - 2, '1', 'Next Ship', () => {
                selectedShipIndex = (selectedShipIndex + 1) % ships.length;
                show(onReturn);
            }, COLORS.BUTTON, 'Select next ship in your fleet');
            UI.addButton(5, backY - 1, '2', 'Previous Ship', () => {
                selectedShipIndex = (selectedShipIndex - 1 + ships.length) % ships.length;
                show(onReturn);
            }, COLORS.BUTTON, 'Select previous ship in your fleet');
        }

        // Back button
        UI.addCenteredButton(backY, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
