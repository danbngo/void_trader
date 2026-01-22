/**
 * Courthouse Menu
 * Pay bounties and upgrade citizenship rank
 */

const CourthouseMenu = (() => {
    let gameState = null;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the courthouse menu
     * @param {GameState} state - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(state, onReturn) {
        gameState = state;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    /**
     * Render the courthouse screen
     */
    function render(onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        const currentRank = gameState.getRankAtCurrentSystem();
        
        // Title
        UI.addTextCentered(3, `${currentSystem.name}: COURTHOUSE`, COLORS.TITLE);
        
        // Player info using renderKeyValueList
        TableRenderer.renderKeyValueList(5, 5, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Reputation:', value: `${gameState.reputation}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Bounty:', value: `${gameState.bounty} CR`, valueColor: gameState.bounty > 0 ? COLORS.TEXT_ERROR : COLORS.TEXT_NORMAL },
            { label: 'Current Rank:', value: currentRank.name, valueColor: COLORS.CYAN }
        ]);
        
        // Available ranks
        let y = 11;
        UI.addText(5, y++, 'Available Citizenship Ranks:', COLORS.YELLOW);
        y++;
        
        ALL_RANKS.forEach(rank => {
            if (rank.level <= currentRank.level) {
                // Already have this rank or lower
                UI.addText(7, y++, `${rank.name} - Current or lower rank`, COLORS.TEXT_DIM);
            } else if (rank.level === currentRank.level + 1) {
                // Next rank available
                const canAfford = gameState.credits >= rank.fee;
                const hasReputation = gameState.reputation >= rank.minReputation;
                const hasBounty = gameState.bounty > 0;
                
                let status = `Fee: ${rank.fee} CR, Min Rep: ${rank.minReputation}`;
                let color = COLORS.TEXT_NORMAL;
                
                if (hasBounty) {
                    status += ' (Pay bounty first)';
                    color = COLORS.TEXT_ERROR;
                } else if (!canAfford) {
                    status += ' (Insufficient credits)';
                    color = COLORS.TEXT_ERROR;
                } else if (!hasReputation) {
                    status += ' (Insufficient reputation)';
                    color = COLORS.TEXT_ERROR;
                } else {
                    status += ' (Available)';
                    color = COLORS.GREEN;
                }
                
                UI.addText(7, y++, `${rank.name} - ${status}`, color);
            } else {
                // Future rank
                UI.addText(7, y++, `${rank.name} - Locked`, COLORS.TEXT_DIM);
            }
        });
        
        // Buttons
        const buttonY = grid.height - 5;
        
        // Pay Bounty - gray out if no bounty or insufficient credits
        const hasBounty = gameState.bounty > 0;
        const canPayBounty = hasBounty && gameState.credits >= gameState.bounty;
        const bountyColor = (!hasBounty || !canPayBounty) ? COLORS.TEXT_DIM : COLORS.GREEN;
        const bountyHelpText = !hasBounty ? 'No bounty to pay' : (!canPayBounty ? `Need ${gameState.bounty} CR to pay bounty` : 'Pay off your bounty');
        UI.addButton(5, buttonY, '1', 'Pay Bounty', () => payBounty(onReturn), bountyColor, bountyHelpText);
        
        // Upgrade Rank - gray out if can't upgrade
        const nextRank = ALL_RANKS.find(r => r.level === currentRank.level + 1);
        let canUpgrade = false;
        let upgradeHelpText = 'Purchase next citizenship rank';
        
        if (!nextRank) {
            upgradeHelpText = 'Already at highest rank';
        } else if (gameState.bounty > 0) {
            upgradeHelpText = 'Pay bounty first';
        } else if (gameState.credits < nextRank.fee) {
            upgradeHelpText = `Need ${nextRank.fee} CR to upgrade`;
        } else if (gameState.reputation < nextRank.minReputation) {
            upgradeHelpText = `Need ${nextRank.minReputation} reputation`;
        } else {
            canUpgrade = true;
        }
        
        const upgradeColor = canUpgrade ? COLORS.BUTTON : COLORS.TEXT_DIM;
        UI.addButton(5, buttonY + 1, '2', 'Upgrade Rank', () => upgradeRank(onReturn), upgradeColor, upgradeHelpText);
        
        UI.addButton(5, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON);
        
        // Set output message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Pay off bounty
     */
    function payBounty(onReturn) {
        if (gameState.bounty === 0) {
            outputMessage = 'You have no bounty to pay off!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
        } else if (gameState.credits < gameState.bounty) {
            outputMessage = `Not enough credits! Need ${gameState.bounty} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
        } else {
            const amount = gameState.bounty;
            gameState.credits -= amount;
            gameState.bounty = 0;
            outputMessage = `Paid bounty of ${amount} CR!`;
            outputColor = COLORS.TEXT_SUCCESS;
            render(onReturn);
        }
    }
    
    /**
     * Upgrade to next rank
     */
    function upgradeRank(onReturn) {
        const currentRank = gameState.getRankAtCurrentSystem();
        
        // Check if there's a bounty
        if (gameState.bounty > 0) {
            outputMessage = 'You must pay off your bounty before upgrading rank!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Find next rank
        const nextRank = ALL_RANKS.find(r => r.level === currentRank.level + 1);
        
        if (!nextRank) {
            outputMessage = 'You have already achieved the highest rank!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Check requirements
        if (gameState.credits < nextRank.fee) {
            outputMessage = `Not enough credits! Need ${nextRank.fee} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        if (gameState.reputation < nextRank.minReputation) {
            outputMessage = `Not enough reputation! Need ${nextRank.minReputation}, have ${gameState.reputation}.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Upgrade rank
        gameState.credits -= nextRank.fee;
        gameState.setRankAtCurrentSystem(nextRank.id);
        outputMessage = `Upgraded to ${nextRank.name} rank!`;
        outputColor = COLORS.TEXT_SUCCESS;
        
        render(onReturn);
    }
    
    return {
        show
    };
})();
