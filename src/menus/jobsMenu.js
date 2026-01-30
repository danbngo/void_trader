/**
 * Jobs Menu
 * Shows player's active job status
 */

const JobsMenu = (() => {
    let returnCallback = null;
    
    /**
     * Show the jobs menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        returnCallback = onReturn;
        render(gameState);
    }
    
    /**
     * Render the jobs menu
     * @param {GameState} gameState - Current game state
     */
    function render(gameState) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        
        UI.addTitleLineCentered(0, 'Current Job');
        
        let y = 2;
        
        // Check if player has an active job
        if (!gameState.currentJob) {
            UI.addTextCentered(y + 2, 'No current job', COLORS.TEXT_DIM);
            UI.addTextCentered(y + 3, 'Visit a tavern to find work', COLORS.TEXT_DIM);
        } else {
            const job = gameState.currentJob;
            const currentDate = gameState.date.getTime();
            const daysRemaining = job.getDaysRemaining(currentDate);
            const isExpired = daysRemaining < 0;
            const startDateText = job.startDate ? formatDate(new Date(job.startDate)) : 'N/A';
            const deadlineDateText = job.deadlineDate ? formatDate(new Date(job.deadlineDate)) : 'N/A';
            
            // Job header
            UI.addHeaderLine(5, y++, job.jobType.name);
            y++;
            
            // Job description
            UI.addText(5, y++, job.description, job.jobType.color);
            y++;
            
            // Job details
            const details = [
                { label: 'Origin:', value: job.originSystem.name, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Destination:', value: job.targetSystem.name, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Start Date:', value: startDateText, valueColor: COLORS.TEXT_NORMAL },
                { label: 'Deadline Date:', value: deadlineDateText, valueColor: COLORS.TEXT_NORMAL }
            ];
            
            // Days remaining with color coding
            const daysColor = isExpired ? COLORS.TEXT_ERROR : (daysRemaining <= 5 ? COLORS.YELLOW : COLORS.TEXT_NORMAL);
            const daysText = isExpired ? `EXPIRED (${Math.abs(daysRemaining)} days ago)` : `${daysRemaining} days`;
            details.push({ label: 'Time Remaining:', value: daysText, valueColor: daysColor });
            
            y = TableRenderer.renderKeyValueList(5, y, details);
            y++;
            
            // Rewards section
            UI.addHeaderLine(5, y++, 'Rewards');
            y++;
            
            const rewards = [];
            if (job.awardCredits > 0) {
                rewards.push({ label: 'Credits:', value: `${job.awardCredits} CR`, valueColor: COLORS.GREEN });
            }
            if (job.awardExp > 0) {
                rewards.push({ label: 'Experience:', value: `${job.awardExp} XP`, valueColor: COLORS.GREEN });
            }
            if (job.awardReputation > 0) {
                rewards.push({ label: 'Reputation:', value: `+${job.awardReputation}`, valueColor: COLORS.GREEN });
            }
            
            y = TableRenderer.renderKeyValueList(5, y, rewards);
            
            // Warning if expired
            if (isExpired) {
                y += 2;
                UI.addText(5, y++, 'WARNING: This job has expired and will be removed when you dock.', COLORS.TEXT_ERROR);
            }
        }
        
        // Back button
        const buttonY = grid.height - 3;
        UI.addCenteredButtons(buttonY, [
            { key: '0', label: 'Back', callback: () => {
                if (returnCallback) returnCallback();
            }, color: COLORS.BUTTON }
        ]);
        
        UI.draw();
    }
    
    return {
        show
    };
})();

function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
