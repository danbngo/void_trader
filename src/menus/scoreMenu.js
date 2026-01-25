/**
 * Score Menu
 * Shows player's current score breakdown and retirement option
 */

const ScoreMenu = (() => {
    let returnCallback = null;
    
    /**
     * Calculate player's total score
     * @param {GameState} gameState - Current game state
     * @returns {Object} Score breakdown
     */
    function calculateScore(gameState) {
        // Credits
        const credits = gameState.credits;
        
        // Reputation (x10)
        const reputationScore = gameState.reputation * 10;
        
        // Bounty (negative)
        const bountyScore = -gameState.bounty;
        
        // Base value of all ships
        const shipsValue = gameState.ships.reduce((sum, ship) => {
            return sum + ship.getValue();
        }, 0);
        
        // Base value of all cargo
        const cargoValue = gameState.ships.reduce((sum, ship) => {
            return sum + Object.keys(ship.cargo).reduce((cargoSum, cargoId) => {
                const cargoType = CARGO_TYPES[cargoId];
                const amount = ship.cargo[cargoId] || 0;
                return cargoSum + (cargoType ? cargoType.baseValue * amount : 0);
            }, 0);
        }, 0);
        
        const totalScore = credits + reputationScore + bountyScore + shipsValue + cargoValue;
        
        return {
            credits,
            reputationScore,
            bountyScore,
            shipsValue,
            cargoValue,
            totalScore
        };
    }
    
    /**
     * Show the score menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        returnCallback = onReturn;
        
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const score = calculateScore(gameState);
        
        // Title
        let y = 5;
        y = UI.addHeaderLineCentered(y, 'Your Score');
        y += 2;
        
        // Score breakdown
        const leftX = 15;
        y = UI.addHeaderLine(leftX, y, 'Score Breakdown');
        
        const repColor = score.reputationScore >= 0 ? COLORS.GREEN : COLORS.TEXT_ERROR;
        const bountyColor = score.bountyScore === 0 ? COLORS.TEXT_DIM : COLORS.TEXT_ERROR;
        const totalColor = score.totalScore >= 0 ? COLORS.YELLOW : COLORS.TEXT_ERROR;
        
        y = TableRenderer.renderKeyValueList(leftX, y, [
            { label: 'Credits:', value: `${score.credits.toLocaleString()} CR`, valueColor: COLORS.GREEN },
            { label: 'Reputation (×10):', value: `${score.reputationScore.toLocaleString()}`, valueColor: repColor },
            { label: 'Bounty:', value: `${score.bountyScore.toLocaleString()}`, valueColor: bountyColor },
            { label: 'Ship Value:', value: `${score.shipsValue.toLocaleString()} CR`, valueColor: COLORS.CYAN },
            { label: 'Cargo Value:', value: `${score.cargoValue.toLocaleString()} CR`, valueColor: COLORS.CYAN }
        ]);
        
        y++;
        UI.addText(leftX, y++, '─'.repeat(35), COLORS.TEXT_DIM);
        
        y = TableRenderer.renderKeyValueList(leftX, y, [
            { label: 'Total Score:', value: `${score.totalScore.toLocaleString()}`, valueColor: totalColor }
        ]);
        
        y += 2;
        
        // Show what rank the player would get if they retired
        const retirementRank = getScoreRank(score.totalScore);
        UI.addText(leftX, y, 'Retirement Rank:', COLORS.CYAN);
        UI.addText(leftX + 25, y++, retirementRank.name, COLORS.YELLOW);
        
        // Buttons
        const buttonY = grid.height - 4;
        UI.addCenteredButtons(buttonY, [
            { key: 'R', label: 'Retire Early', callback: () => {
                RetirementConfirmMenu.show(
                    gameState, 
                    score.totalScore,
                    () => showGameOver(gameState, score.totalScore, true),
                    () => show(gameState, returnCallback)
                );
            }, color: COLORS.TEXT_ERROR, helpText: 'End your career and see final rank' },
            { key: '0', label: 'Back', callback: () => {
                if (returnCallback) returnCallback();
            }, color: COLORS.BUTTON }
        ]);
        
        UI.draw();
    }
    
    /**
     * Show game over screen
     * @param {GameState} gameState - Current game state
     * @param {number} finalScore - Player's final score
     * @param {boolean} isEarlyRetirement - Whether player retired early
     */
    function showGameOver(gameState, finalScore, isEarlyRetirement) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const rank = getScoreRank(finalScore);
        
        let y = 5;
        y = UI.addHeaderLineCentered(y, 'GAME OVER');
        y += 2;
        
        if (isEarlyRetirement) {
            UI.addTextCentered(y++, 'You have retired from trading.', COLORS.TEXT_NORMAL);
        } else {
            UI.addTextCentered(y++, '50 years have passed. Time for retirement!', COLORS.TEXT_NORMAL);
        }
        y++;
        
        UI.addTextCentered(y++, 'Your Final Score:', COLORS.CYAN);
        const scoreColor = finalScore >= 0 ? COLORS.YELLOW : COLORS.TEXT_ERROR;
        UI.addTextCentered(y++, `${finalScore.toLocaleString()}`, scoreColor);
        y += 2;
        
        UI.addTextCentered(y++, 'Final Rank:', COLORS.CYAN);
        UI.addTextCentered(y++, rank.name, COLORS.TITLE);
        y++;
        UI.addTextCentered(y++, rank.description, COLORS.TEXT_DIM);
        
        // Button
        const buttonY = grid.height - 4;
        UI.addCenteredButton(buttonY, '1', 'Return to Title Screen', () => {
            TitleMenu.show();
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show,
        showGameOver,
        calculateScore
    };
})();
