/**
 * Merchant Encounter - Trade offer
 */

const MerchantEncounter = {
    /**
     * Show merchant encounter - trade offer
     */
    show: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        
        const grid = UI.getGridSize();
        
        const reputation = gameState.reputation || 0;
        
        // Check if trade is permitted based on reputation
        const tradeAllowed = reputation >= 0;
        
        UI.addTitleLineCentered(0, `${encType.name} Encounter`);
        let y = 2;
        
        UI.addText(10, y++, `A merchant vessel hails your fleet.`, COLORS.TEXT_NORMAL);
        if (tradeAllowed) {
            UI.addText(10, y++, `"Greetings, captain. Interested in some trade?"`, COLORS.YELLOW);
        } else {
            UI.addText(10, y++, `"We don't deal with criminals. Move along."`, COLORS.YELLOW);
            UI.addText(10, y++, `(Merchants only trade with captains of neutral or positive reputation)`, COLORS.TEXT_DIM);
        }
        y++;
        
        // Show radar advantage messages
        y = EncounterUtils.showPlayerRadarAdvantage(gameState, y, encType.name);
        y = EncounterUtils.showRadarAdvantageWarning(gameState, y, encType.name);
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, false);
        y++;
        
        // Show merchant ships
        y = ShipTableRenderer.addNPCFleet(10, y, `${encType.name} Vessels:`, gameState.encounterShips);
        
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
            }, color: COLORS.GREEN, helpText: `Trade with ${encType.name.toLowerCase()} (buy or sell cargo at base price)` });
        }
        
        const attackText = 'Attack innocent traders (-5 reputation, +1000 bounty)';
        buttons.push({ key: '3', label: 'Attack', callback: () => {
            this.showAttackConsequences(gameState, encType);
        }, color: COLORS.TEXT_ERROR, helpText: attackText });
        
        UI.addCenteredButtons(buttonY, buttons);
        
        UI.draw();
    },
    
    /**
     * Handle merchant trade
     */
    handleTrade: function(gameState, encType) {
        UI.clear();
        UI.clearOutputRow();
        
        UI.addTitleLineCentered(0, 'Merchant Trade');
        let y = 2;
        
        const merchantSelling = Math.random() < 0.5;
        
        if (merchantSelling) {
            // Merchant wants to sell cargo to player - filter by player's training
            const availableCargo = Object.keys(gameState.encounterCargo).filter(cargoId => 
                gameState.encounterCargo[cargoId] > 0 &&
                gameState.enabledCargoTypes.some(ct => ct.id === cargoId)
            );
            
            console.log('[MerchantEncounter] Trade offer - merchant selling:', {
                encounterCargo: gameState.encounterCargo,
                availableCargo,
                availableCargoCount: availableCargo.length
            });
            
            if (availableCargo.length === 0) {
                // No cargo player can handle - find what cargo they have
                const merchantCargoIds = Object.keys(gameState.encounterCargo).filter(cargoId => 
                    gameState.encounterCargo[cargoId] > 0
                );
                
                if (merchantCargoIds.length > 0) {
                    const cargoId = merchantCargoIds[0];
                    const cargoType = CARGO_TYPES[cargoId];
                    
                    UI.addText(10, y++, `"Sorry, we're carrying `, COLORS.YELLOW);
                    UI.addText(10 + `"Sorry, we're carrying `.length, y - 1, cargoType.name, cargoType.color);
                    UI.addText(10 + `"Sorry, we're carrying `.length + cargoType.name.length, y - 1, `, but you lack`, COLORS.YELLOW);
                    UI.addText(10, y++, `training to handle this type of cargo."`, COLORS.YELLOW);
                } else {
                    UI.addText(10, y++, `"Sorry, you lack training to handle the type`, COLORS.YELLOW);
                    UI.addText(10, y++, `of goods we're carrying."`, COLORS.YELLOW);
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
            const merchantAmount = gameState.encounterCargo[randomCargoId];
            const fleetCapacity = Ship.getFleetAvailableCargoSpace(gameState.ships);
            const pricePerUnit = cargoType.baseValue;
            
            // Calculate maximum amount player can buy based on space AND credits
            const maxBySpace = Math.min(merchantAmount, fleetCapacity);
            const maxByCredits = Math.floor(gameState.credits / pricePerUnit);
            const maxAmount = Math.min(maxBySpace, maxByCredits);
            
            // Check if player can't buy any
            if (maxAmount === 0) {
                if (fleetCapacity === 0) {
                    // No cargo space
                    UI.addText(10, y++, `"I have cargo to sell, but you cannot hold any additional cargo."`, COLORS.YELLOW);
                    UI.addText(10, y++, `"Come back when you have space!"`, COLORS.YELLOW);
                } else {
                    // No credits
                    UI.addText(10, y++, `"I have cargo to sell, but you cannot afford this purchase."`, COLORS.YELLOW);
                    UI.addText(10, y++, `"Come back when you have more credits!"`, COLORS.YELLOW);
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
            
            UI.addText(10, y, `"I have ${merchantAmount} units of `, COLORS.YELLOW);
            UI.addText(10 + `"I have ${merchantAmount} units of `.length, y, cargoType.name, cargoType.color);
            UI.addText(10 + `"I have ${merchantAmount} units of `.length + cargoType.name.length, y, ` to sell."`, COLORS.YELLOW);
            y++;
            UI.addText(10, y++, `"I can offer you ${maxAmount} units at ${pricePerUnit} credits each."`, COLORS.YELLOW);
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
            // Merchant wants to buy cargo from player
            const playerCargo = Ship.getFleetCargo(gameState.ships);
            const availablePlayerCargo = Object.keys(playerCargo).filter(cargoId => playerCargo[cargoId] > 0);
            
            console.log('[MerchantEncounter] Trade offer - merchant buying:', {
                playerCargo,
                availablePlayerCargo,
                availablePlayerCargoCount: availablePlayerCargo.length
            });
            
            if (availablePlayerCargo.length === 0) {
                // Player has no cargo
                UI.addText(10, y++, `The merchants note you carry no cargo.`, COLORS.TEXT_DIM);
                UI.addText(10, y++, `They scoff at your lack of industry.`, COLORS.TEXT_DIM);
                
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
            
            UI.addText(10, y, `"I'm looking to buy `, COLORS.YELLOW);
            UI.addText(10 + `"I'm looking to buy `.length, y, cargoType.name, cargoType.color);
            UI.addText(10 + `"I'm looking to buy `.length + cargoType.name.length, y, `."`, COLORS.YELLOW);
            y++;
            UI.addText(10, y++, `"I'll take all ${playerAmount} units at ${pricePerUnit} credits each."`, COLORS.YELLOW);
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
     * Show merchant trade completion
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
        UI.addText(10, y++, `"Pleasure doing business with you, captain."`, COLORS.YELLOW);
        
        const buttonY = grid.height - 4;
        UI.addCenteredButton(buttonY, '1', 'Continue Journey', () => {
            TravelMenu.resume();
        }, COLORS.GREEN, 'Resume your journey');
        
        UI.draw();
    },
    
    /**
     * Show consequences of attacking merchants
     */
    showAttackConsequences: function(gameState, encType) {
        UI.clear();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Attacking Civilians');
        let y = 2;
        
        // Apply reputation and bounty penalties
        gameState.reputation += REPUTATION_EFFECT_ON_ATTACK_CIVILIAN;
        gameState.bounty += BOUNTY_INCREASE_ON_ATTACK_CIVILIANS;
        
        UI.addText(10, y++, `You attack innocent merchants!`, COLORS.TEXT_ERROR);
        y++;
        UI.addText(10, y++, `Reputation: ${REPUTATION_EFFECT_ON_ATTACK_CIVILIAN}`, COLORS.TEXT_ERROR);
        UI.addText(10, y++, `Bounty: +${BOUNTY_INCREASE_ON_ATTACK_CIVILIANS} credits`, COLORS.TEXT_ERROR);
        y++;
        UI.addText(10, y++, `The merchants try to defend themselves!`, COLORS.TEXT_NORMAL);
        
        const buttonY = grid.height - 4;
        UI.addCenteredButton(buttonY, '1', 'Continue to Combat', () => {
            EncounterMenu.show(gameState, encType);
        }, COLORS.TEXT_ERROR, 'Enter combat with the merchants');
        
        UI.draw();
    }
};
