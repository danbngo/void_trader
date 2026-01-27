/**
 * Smugglers Encounter - Black market trade offer
 */

const SmugglersEncounter = {
    /**
     * Show smugglers encounter - illicit trade offer
     */
    show: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        
        const grid = UI.getGridSize();
        
        const reputation = gameState.reputation || 0;
        
        // Check if trade is permitted based on reputation
        const tradeAllowed = reputation < 0;
        
        UI.addTitleLineCentered(0, 'Smugglers Encounter');
        let y = 2;
        
        UI.addText(10, y++, `A suspicious-looking vessel drops out of stealth.`, COLORS.TEXT_NORMAL);
        if (tradeAllowed) {
            UI.addText(10, y++, `"You look like someone who knows how the void really works..."`, COLORS.DARK_MAGENTA);
            UI.addText(10, y++, `"Interested in some off-the-books merchandise?"`, COLORS.DARK_MAGENTA);
        } else {
            UI.addText(10, y++, `"You're too clean for this operation. We don't know you."`, COLORS.DARK_MAGENTA);
            UI.addText(10, y++, `(Smugglers only trade with captains of negative reputation)`, COLORS.TEXT_DIM);
        }
        y++;
        
        // Show radar advantage messages
        y = EncounterUtils.showPlayerRadarAdvantage(gameState, y, "Smugglers");
        y = EncounterUtils.showRadarAdvantageWarning(gameState, y, "Smugglers");
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;
        
        // Show smuggler ships
        y = ShipTableRenderer.addNPCFleet(10, y, 'Smuggler Vessels:', gameState.encounterShips);
        
        // Buttons centered at bottom
        const buttonY = grid.height - 4;
        
        const buttons = [
            { key: '1', label: 'Ignore', callback: () => {
                // Return to travel menu
                TravelMenu.resume();
            }, color: COLORS.BUTTON, helpText: 'Continue journey without trading' }
        ];
        
        if (tradeAllowed) {
            buttons.push({ key: '2', label: 'Accept Trade Offer', callback: () => {
                this.handleTrade(gameState, encType);
            }, color: COLORS.GREEN, helpText: 'Trade with smugglers (buy or sell illegal cargo at base price)' });
        }
        
        buttons.push({ key: '3', label: 'Attack', callback: () => {
            this.showAttackConsequences(gameState, encType);
        }, color: COLORS.TEXT_ERROR, helpText: 'Attack smugglers (no reputation or bounty change)' });
        
        UI.addCenteredButtons(buttonY, buttons);
        
        UI.draw();
    },
    
    /**
     * Handle smuggler trade
     */
    handleTrade: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        
        UI.addTitleLineCentered(0, 'Black Market Trade');
        let y = 2;
        
        const smugglerSelling = Math.random() < 0.5;
        
        if (smugglerSelling) {
            // Smuggler wants to sell cargo to player - filter by player's training
            const availableCargo = Object.keys(gameState.encounterCargo).filter(cargoId => 
                gameState.encounterCargo[cargoId] > 0 &&
                gameState.enabledCargoTypes.some(ct => ct.id === cargoId)
            );
            
            if (availableCargo.length === 0) {
                // No cargo player can handle
                const smugglerCargoIds = Object.keys(gameState.encounterCargo).filter(cargoId => 
                    gameState.encounterCargo[cargoId] > 0
                );
                
                if (smugglerCargoIds.length > 0) {
                    const cargoId = smugglerCargoIds[0];
                    const cargoType = CARGO_TYPES[cargoId];
                    
                    UI.addText(10, y++, `"We got `, COLORS.DARK_MAGENTA);
                    UI.addText(10 + `"We got `.length, y - 1, cargoType.name, cargoType.color);
                    UI.addText(10 + `"We got `.length + cargoType.name.length, y - 1, `, but you ain't equipped`, COLORS.DARK_MAGENTA);
                    UI.addText(10, y++, `to handle this type of merchandise."`, COLORS.DARK_MAGENTA);
                } else {
                    UI.addText(10, y++, `"You ain't equipped to handle what we're carrying."`, COLORS.DARK_MAGENTA);
                }
                
                const grid = UI.getGridSize();
                const buttonY = grid.height - 2;
                UI.addCenteredButton(buttonY, '1', 'Continue Journey', () => {
                    gameState.encounter = false;
                    gameState.encounterShips = [];
                    gameState.encounterCargo = {};
                    TravelMenu.resume();
                }, COLORS.GREEN, 'Resume your journey');
                UI.draw();
                return;
            }
            
            const randomCargoId = availableCargo[Math.floor(Math.random() * availableCargo.length)];
            const cargoType = CARGO_TYPES[randomCargoId];
            const smugglerAmount = gameState.encounterCargo[randomCargoId];
            const fleetCapacity = Ship.getFleetAvailableCargoSpace(gameState.ships);
            const pricePerUnit = cargoType.baseValue;
            
            // Calculate maximum amount player can buy based on space AND credits
            const maxBySpace = Math.min(smugglerAmount, fleetCapacity);
            const maxByCredits = Math.floor(gameState.credits / pricePerUnit);
            const maxAmount = Math.min(maxBySpace, maxByCredits);
            
            // Check if player can't buy any
            if (maxAmount === 0) {
                if (fleetCapacity === 0) {
                    // No cargo space
                    UI.addText(10, y++, `"Got no room in those holds? Come back when you do."`, COLORS.DARK_MAGENTA);
                } else {
                    // No credits
                    UI.addText(10, y++, `"Not enough credits? This ain't charity."`, COLORS.DARK_MAGENTA);
                    UI.addText(10, y++, `"Get lost until you can pay up."`, COLORS.DARK_MAGENTA);
                }
                
                const grid = UI.getGridSize();
                const buttonY = grid.height - 2;
                UI.addCenteredButton(buttonY, '1', 'Continue Journey', () => {
                    gameState.encounter = false;
                    gameState.encounterShips = [];
                    gameState.encounterCargo = {};
                    TravelMenu.resume();
                }, COLORS.GREEN, 'Resume your journey');
                UI.draw();
                return;
            }
            
            const totalCost = maxAmount * pricePerUnit;
            
            UI.addText(10, y, `"Got ${smugglerAmount} units of `, COLORS.DARK_MAGENTA);
            UI.addText(10 + `"Got ${smugglerAmount} units of `.length, y, cargoType.name, cargoType.color);
            UI.addText(10 + `"Got ${smugglerAmount} units of `.length + cargoType.name.length, y, ` here."`, COLORS.DARK_MAGENTA);
            y++;
            UI.addText(10, y++, `"I'll let you have ${maxAmount} units at ${pricePerUnit} each. No haggling."`, COLORS.DARK_MAGENTA);
            y++;
            
            y = TableRenderer.renderKeyValueList(10, y, [
                { label: 'Total cost:', value: `${totalCost} credits`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Your credits:', value: `${gameState.credits}`, valueColor: COLORS.TEXT_DIM }
            ]);
            y++;
            
            const grid = UI.getGridSize();
            const buttonY = grid.height - 3;
            
            UI.addCenteredButtons(buttonY, [
                { key: '1', label: `Buy ${maxAmount} ${cargoType.name}`, callback: () => {
                    // Execute trade
                    gameState.credits -= totalCost;
                    gameState.encounterCargo[randomCargoId] -= maxAmount;
                    Ship.addCargoToFleet(gameState.ships, randomCargoId, maxAmount);
                    
                    // Track player records
                    gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_CARGO_BOUGHT] = (gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_CARGO_BOUGHT] || 0) + maxAmount;
                    gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_BOUGHT] = (gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_BOUGHT] || 0) + totalCost;
                    
                    // Grant trading experience
                    const tradingExpFraction = totalCost / 1000;
                    const tradingExp = ExperienceUtils.calculateFractionalExp(EXP_POINTS_FROM_TRADING_1000CR, tradingExpFraction);
                    const expComponents = tradingExp > 0 ? ExperienceUtils.getExperienceMessageComponents(gameState, tradingExp, 'Trading') : null;
                    
                    this.showTradeComplete(gameState, `Purchased ${maxAmount} ${cargoType.name} for ${totalCost} credits.`, expComponents);
                }, color: COLORS.GREEN },
                { key: '2', label: 'Decline', callback: () => {
                    gameState.encounter = false;
                    gameState.encounterShips = [];
                    gameState.encounterCargo = {};
                    TravelMenu.resume();
                }, color: COLORS.TEXT_DIM }
            ]);
            
        } else {
            // Smuggler wants to buy cargo from player
            const playerCargo = Ship.getFleetCargo(gameState.ships);
            const availablePlayerCargo = Object.keys(playerCargo).filter(cargoId => playerCargo[cargoId] > 0);
            
            if (availablePlayerCargo.length === 0) {
                // Player has no cargo
                UI.addText(10, y++, `"You got nothing? Don't waste my time."`, COLORS.DARK_MAGENTA);
                
                const grid = UI.getGridSize();
                const buttonY = grid.height - 2;
                UI.addCenteredButton(buttonY, '1', 'Continue Journey', () => {
                    TravelMenu.resume();
                }, COLORS.GREEN, 'Resume your journey');
                UI.draw();
                return;
            }
            
            const randomCargoId = availablePlayerCargo[Math.floor(Math.random() * availablePlayerCargo.length)];
            const cargoType = CARGO_TYPES[randomCargoId];
            const playerAmount = playerCargo[randomCargoId];
            const pricePerUnit = cargoType.baseValue;
            const totalRevenue = playerAmount * pricePerUnit;
            
            UI.addText(10, y, `"Looking to buy `, COLORS.DARK_MAGENTA);
            UI.addText(10 + `"Looking to buy `.length, y, cargoType.name, cargoType.color);
            UI.addText(10 + `"Looking to buy `.length + cargoType.name.length, y, `, no questions asked."`, COLORS.DARK_MAGENTA);
            y++;
            UI.addText(10, y++, `"I'll take all ${playerAmount} units at ${pricePerUnit} each. Cash only."`, COLORS.DARK_MAGENTA);
            y++;
            
            y = TableRenderer.renderKeyValueList(10, y, [
                { label: 'Total payment:', value: `${totalRevenue} credits`, valueColor: COLORS.GREEN }
            ]);
            y++;
            
            const grid = UI.getGridSize();
            const buttonY = grid.height - 3;
            
            UI.addCenteredButtons(buttonY, [
                { key: '1', label: `Sell ${playerAmount} ${cargoType.name}`, callback: () => {
                    // Execute trade
                    gameState.credits += totalRevenue;
                    Ship.removeCargoFromFleet(gameState.ships, randomCargoId, playerAmount);
                    
                    // Track player records
                    gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_CARGO_SOLD] = (gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_CARGO_SOLD] || 0) + playerAmount;
                    gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD] = (gameState.playerRecord[PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD] || 0) + totalRevenue;
                    if (cargoType.id === CARGO_TYPES.DRUGS.id) {
                        gameState.playerRecord[PLAYER_RECORD_TYPES.DRUGS_SOLD_TOTAL] = (gameState.playerRecord[PLAYER_RECORD_TYPES.DRUGS_SOLD_TOTAL] || 0) + playerAmount;
                    }
                    
                    // Grant trading experience
                    const tradingExpFraction = totalRevenue / 1000;
                    const tradingExp = ExperienceUtils.calculateFractionalExp(EXP_POINTS_FROM_TRADING_1000CR, tradingExpFraction);
                    const expComponents = tradingExp > 0 ? ExperienceUtils.getExperienceMessageComponents(gameState, tradingExp, 'Trading') : null;
                    
                    this.showTradeComplete(gameState, `Sold ${playerAmount} ${cargoType.name} for ${totalRevenue} credits.`, expComponents);
                }, color: COLORS.GREEN },
                { key: '2', label: 'Decline', callback: () => {
                    TravelMenu.resume();
                }, color: COLORS.TEXT_DIM }
            ]);
        }
        
        UI.draw();
    },
    
    /**
     * Show smuggler trade completion
     */
    showTradeComplete: function(gameState, message, expComponents = null) {
        UI.clear();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Trade Complete');
        let y = 2;
        
        UI.addText(10, y++, message, COLORS.GREEN);
        
        // Show exp if any
        if (expComponents) {
            let expText = expComponents.baseMessage;
            if (expComponents.levelUpText) {
                expText += expComponents.levelUpText;
            }
            UI.addText(10, y++, expText, COLORS.YELLOW);
        }
        
        y++;
        UI.addText(10, y++, `"We never met. Understood?"`, COLORS.DARK_MAGENTA);
        
        const buttonY = grid.height - 4;
        UI.addCenteredButton(buttonY, '1', 'Continue Journey', () => {
            TravelMenu.resume();
        }, COLORS.GREEN, 'Resume your journey');
        
        UI.draw();
    },
    
    /**
     * Show consequences of attacking smugglers
     */
    showAttackConsequences: function(gameState, encType) {
        UI.clear();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Engaging Smugglers');
        let y = 2;
        
        // No reputation or bounty change for attacking smugglers
        UI.addText(10, y++, `You attack the smugglers!`, COLORS.TEXT_ERROR);
        y++;
        UI.addText(10, y++, `(No reputation or bounty penalties)`, COLORS.TEXT_DIM);
        y++;
        UI.addText(10, y++, `The smugglers fight back!`, COLORS.TEXT_NORMAL);
        
        const buttonY = grid.height - 4;
        UI.addCenteredButton(buttonY, '1', 'Continue to Combat', () => {
            EncounterMenu.show(gameState, encType);
        }, COLORS.TEXT_ERROR, 'Enter combat with the smugglers');
        
        UI.draw();
    }
};
