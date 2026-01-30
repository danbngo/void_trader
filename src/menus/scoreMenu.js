/**
 * Score Menu
 * Shows player's current score breakdown and retirement option
 */

const ScoreMenu = (() => {
    let returnCallback = null;
    let showRecord = false;
    
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
        
        const alienSystemCount = gameState.systems.filter(system => system.conqueredByAliens).length;
        const alienSystemPenalty = alienSystemCount * SCORE_PENALTY_PER_ALIEN_SYSTEM;
        const totalScore = credits + reputationScore + bountyScore + shipsValue + cargoValue - alienSystemPenalty;
        
        return {
            credits,
            reputationScore,
            bountyScore,
            shipsValue,
            cargoValue,
            alienSystemPenalty,
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
        let y = 2;
        y = UI.addHeaderLineCentered(y, showRecord ? 'Player Record' : 'Your Score');
        y += 2;

        // Score breakdown or record view
        const leftX = 15;
        if (showRecord) {
            y = UI.addHeaderLine(leftX, y, 'Record');
            const recordItems = buildRecordItems(gameState);
            if (recordItems.length === 0) {
                UI.addText(leftX, y + 1, 'Accomplish more to see record entries', COLORS.TEXT_DIM);
            } else {
                y = TableRenderer.renderKeyValueList(leftX, y, recordItems);
            }
        } else {
            y = UI.addHeaderLine(leftX, y, 'Score Breakdown');

            y = TableRenderer.renderKeyValueList(leftX, y, [
                { label: 'Credits:', value: `${score.credits.toLocaleString()} CR`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Reputation (×10):', value: `${score.reputationScore.toLocaleString()}`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Bounty:', value: `${score.bountyScore.toLocaleString()}`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Ship Value:', value: `${score.shipsValue.toLocaleString()} CR`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Cargo Value:', value: `${score.cargoValue.toLocaleString()} CR`, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Alien Systems Penalty:', value: `-${score.alienSystemPenalty.toLocaleString()}`, valueColor: COLORS.TEXT_NORMAL }
            ]);
            
            y++;
            UI.addText(leftX, y++, '─'.repeat(35), COLORS.TEXT_DIM);
            
            y = TableRenderer.renderKeyValueList(leftX, y, [
                { label: 'Total Score:', value: `${score.totalScore.toLocaleString()}`, valueColor: COLORS.TEXT_NORMAL }
            ]);
            
            y += 2;
            
            // Show what rank the player would get if they retired
            const retirementRank = getScoreRank(score.totalScore);
            UI.addText(leftX, y, 'Retirement Rank:', COLORS.CYAN);
            UI.addText(leftX + 25, y++, retirementRank.name, getRetirementRankColor(score.totalScore));
        }
        
        // Buttons
        const buttonY = grid.height - 4;
        UI.addCenteredButtons(buttonY, [
            { key: '1', label: showRecord ? 'Show Score' : 'Show Record', callback: () => {
                showRecord = !showRecord;
                show(gameState, returnCallback);
            }, color: COLORS.BUTTON },
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

function getRetirementRankColor(totalScore) {
    if (totalScore >= 1000000) return COLORS.TITLE;
    if (totalScore >= 500000) return COLORS.GREEN;
    if (totalScore >= 250000) return COLORS.YELLOW;
    if (totalScore >= 100000) return COLORS.TEXT_NORMAL;
    if (totalScore >= 50000) return COLORS.TEXT_NORMAL;
    if (totalScore >= 25000) return COLORS.TEXT_DIM;
    if (totalScore >= 10000) return COLORS.TEXT_DIM;
    if (totalScore >= 0) return COLORS.TEXT_ERROR;
    return COLORS.TEXT_ERROR;
}

function buildRecordItems(gameState) {
    const record = gameState.playerRecord || {};
    const items = [
        { label: 'Systems Visited:', key: PLAYER_RECORD_TYPES.SYSTEMS_VISITED },
        { label: 'Jumps Made:', key: PLAYER_RECORD_TYPES.JUMPS_MADE },
        { label: 'Combat Wins:', key: PLAYER_RECORD_TYPES.COMBAT_ENCOUNTERS_WON },
        { label: 'Combat Fled:', key: PLAYER_RECORD_TYPES.COMBAT_ENCOUNTERS_FLED },
        { label: 'Ships Destroyed:', key: PLAYER_RECORD_TYPES.SHIPS_DESTROYED },
        { label: 'Alien Ships Defeated:', key: PLAYER_RECORD_TYPES.ALIEN_SHIPS_DEFEATED },
        { label: 'Alien Defense Fleets:', key: PLAYER_RECORD_TYPES.ALIEN_DEFENSE_FLEETS_DEFEATED },
        { label: 'Alien Modules Delivered:', key: PLAYER_RECORD_TYPES.ALIEN_MODULES_DELIVERED },
        { label: 'Police Ships Destroyed:', key: PLAYER_RECORD_TYPES.POLICE_SHIPS_DESTROYED },
        { label: 'Systems Liberated:', key: PLAYER_RECORD_TYPES.SYSTEMS_LIBERATED },
        { label: 'Times Died:', key: PLAYER_RECORD_TYPES.TIMES_DIED },
        { label: 'Cargo Bought:', key: PLAYER_RECORD_TYPES.TOTAL_CARGO_BOUGHT },
        { label: 'Cargo Sold:', key: PLAYER_RECORD_TYPES.TOTAL_CARGO_SOLD },
        { label: 'Credits Spent:', key: PLAYER_RECORD_TYPES.TOTAL_VALUE_BOUGHT },
        { label: 'Credits Earned:', key: PLAYER_RECORD_TYPES.TOTAL_VALUE_SOLD },
        { label: 'Drugs Sold:', key: PLAYER_RECORD_TYPES.DRUGS_SOLD_TOTAL },
        { label: 'Blackreach Weapons Sold:', key: PLAYER_RECORD_TYPES.BLACKREACH_WEAPONS_SOLD },
        { label: 'Blackreach Antimatter Delivered:', key: PLAYER_RECORD_TYPES.BLACKREACH_ANTIMATTER_DELIVERED },
        { label: 'Blackreach Intro Seen:', key: PLAYER_RECORD_TYPES.BLACKREACH_INTRO_TRIGGERED, isBoolean: true }
    ];

    return items
        .map(item => {
            const value = record[item.key];
            const displayValue = item.isBoolean ? (value ? 'Yes' : 'No') : String(value || 0);
            return { label: item.label, value: displayValue, valueColor: COLORS.TEXT_NORMAL, rawValue: value, isBoolean: item.isBoolean };
        })
        .filter(item => item.isBoolean ? item.rawValue : (item.rawValue || 0) > 0)
        .map(item => ({ label: item.label, value: item.value, valueColor: item.valueColor }));
}
