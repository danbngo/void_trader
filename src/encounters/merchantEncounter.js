/**
 * Merchant Encounter - Trade offer
 */

const MerchantEncounter = {
    /**
     * Show merchant encounter - trade offer
     */
    show: function(gameState, encType) {
        UI.clear();
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== Merchant Encounter ===`, COLORS.CYAN);
        y += 2;
        
        UI.addText(10, y++, `A merchant vessel hails your fleet.`, COLORS.TEXT_NORMAL);
        UI.addText(10, y++, `"Greetings, captain. Interested in some trade?"`, COLORS.YELLOW);
        y += 2;
        
        // Show warning if enemy gained radar advantage
        y = EncounterUtils.showRadarAdvantageWarning(gameState, y, "Merchants");
        
        // Show player ships
        y = ShipTableRenderer.addPlayerFleet(10, y, 'Your Fleet:', gameState.ships, true);
        y++;
        
        // Show merchant ships
        y = ShipTableRenderer.addNPCFleet(10, y, 'Merchant Vessels:', gameState.encounterShips);
        
        const buttonY = grid.height - 4;
        UI.addButton(10, buttonY, '1', 'Accept Trade Offer', () => {
            this.handleTrade(gameState, encType);
        }, COLORS.GREEN, 'Trade with merchants (buy or sell cargo at base price)');
        
        UI.addButton(10, buttonY + 1, '2', 'Ignore', () => {
            // Return to travel menu
            TravelMenu.resume();
        }, COLORS.TEXT_DIM, 'Continue journey without trading');
        
        UI.addButton(10, buttonY + 2, '3', 'Attack', () => {
            this.showAttackConsequences(gameState, encType);
        }, COLORS.TEXT_ERROR, 'Attack innocent traders (-5 reputation, +1000 bounty)');
        
        UI.draw();
    },
    
    /**
     * Handle merchant trade
     */
    handleTrade: function(gameState, encType) {
        UI.clear();
        
        let y = 5;
        UI.addTextCentered(y++, `=== Merchant Trade ===`, COLORS.CYAN);
        y += 2;
        
        const merchantSelling = Math.random() < 0.5;
        
        if (merchantSelling) {
            // Merchant wants to sell cargo to player
            const availableCargo = Object.keys(gameState.encounterCargo).filter(cargoId => gameState.encounterCargo[cargoId] > 0);
            
            if (availableCargo.length === 0) {
                // No cargo to sell
                UI.addText(10, y++, `The merchant has nothing to offer.`, COLORS.TEXT_DIM);
                y += 2;
                UI.addButton(10, y++, '1', 'Continue Journey', () => {
                    gameState.encounter = false;
                    gameState.encounterShips = [];
                    gameState.encounterCargo = {};
                    TravelMenu.show(gameState);
                }, COLORS.GREEN, 'Resume your journey');
                UI.draw();
                return;
            }
            
            const randomCargoId = availableCargo[Math.floor(Math.random() * availableCargo.length)];
            const cargoType = CARGO_TYPES[randomCargoId];
            const merchantAmount = gameState.encounterCargo[randomCargoId];
            const fleetCapacity = Ship.getFleetAvailableCargoSpace(gameState.ships);
            const maxAmount = Math.min(merchantAmount, fleetCapacity);
            const pricePerUnit = cargoType.baseValue;
            const totalCost = maxAmount * pricePerUnit;
            
            UI.addText(10, y++, `"I have ${merchantAmount} units of ${cargoType.name} to sell."`, COLORS.YELLOW);
            UI.addText(10, y++, `"I can offer you ${maxAmount} units at ${pricePerUnit} credits each."`, COLORS.YELLOW);
            y++;
            UI.addText(10, y++, `Total cost: ${totalCost} credits`, COLORS.TEXT_NORMAL);
            UI.addText(10, y++, `Your credits: ${gameState.credits}`, COLORS.TEXT_DIM);
            y += 2;
            
            if (gameState.credits >= totalCost && maxAmount > 0) {
                UI.addButton(10, y++, '1', `Buy ${maxAmount} ${cargoType.name}`, () => {
                    // Execute trade
                    gameState.credits -= totalCost;
                    gameState.encounterCargo[randomCargoId] -= maxAmount;
                    Ship.addCargoToFleet(gameState.ships, randomCargoId, maxAmount);
                    
                    this.showTradeComplete(gameState, `Purchased ${maxAmount} ${cargoType.name} for ${totalCost} credits.`);
                }, COLORS.GREEN);
            } else {
                UI.addText(10, y++, `You cannot afford this purchase.`, COLORS.TEXT_ERROR);
                y++;
            }
            
            UI.addButton(10, y++, '2', 'Decline', () => {
                gameState.encounter = false;
                gameState.encounterShips = [];
                gameState.encounterCargo = {};
                TravelMenu.show(gameState);
            }, COLORS.TEXT_DIM);
            
        } else {
            // Merchant wants to buy cargo from player
            const playerCargo = Ship.getFleetCargo(gameState.ships);
            const availablePlayerCargo = Object.keys(playerCargo).filter(cargoId => playerCargo[cargoId] > 0);
            
            if (availablePlayerCargo.length === 0) {
                // Player has no cargo
                UI.addText(10, y++, `The merchants note you carry no cargo.`, COLORS.TEXT_DIM);
                UI.addText(10, y++, `They scoff at your lack of industry.`, COLORS.TEXT_DIM);
                y += 2;
                UI.addButton(10, y++, '1', 'Continue Journey', () => {
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
            
            UI.addText(10, y++, `"I'm looking to buy ${cargoType.name}."`, COLORS.YELLOW);
            UI.addText(10, y++, `"I'll take all ${playerAmount} units at ${pricePerUnit} credits each."`, COLORS.YELLOW);
            y++;
            UI.addText(10, y++, `Total payment: ${totalRevenue} credits`, COLORS.GREEN);
            y += 2;
            
            UI.addButton(10, y++, '1', `Sell ${playerAmount} ${cargoType.name}`, () => {
                // Execute trade
                gameState.credits += totalRevenue;
                Ship.removeCargoFromFleet(gameState.ships, randomCargoId, playerAmount);
                
                this.showTradeComplete(gameState, `Sold ${playerAmount} ${cargoType.name} for ${totalRevenue} credits.`);
            }, COLORS.GREEN);
            
            UI.addButton(10, y++, '2', 'Decline', () => {
                TravelMenu.resume();
            }, COLORS.TEXT_DIM);
        }
        
        UI.draw();
    },
    
    /**
     * Show merchant trade completion
     */
    showTradeComplete: function(gameState, message) {
        UI.clear();
        
        const grid = UI.getGridSize();
        let y = 5;
        UI.addTextCentered(y++, `=== Trade Complete ===`, COLORS.CYAN);
        y += 2;
        
        UI.addText(10, y++, message, COLORS.GREEN);
        y++;
        UI.addText(10, y++, `"Pleasure doing business with you, captain."`, COLORS.YELLOW);
        
        const buttonY = grid.height - 4;
        UI.addButton(10, buttonY, '1', 'Continue Journey', () => {
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
        let y = 5;
        UI.addTextCentered(y++, `=== Attacking Civilians ===`, COLORS.TEXT_ERROR);
        y += 2;
        
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
        UI.addButton(10, buttonY, '1', 'Continue to Combat', () => {
            EncounterMenu.show(gameState, encType);
        }, COLORS.TEXT_ERROR);
        
        UI.draw();
    }
};
