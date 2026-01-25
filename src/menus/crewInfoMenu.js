/**
 * Crew Info Menu
 * Shows crew and officer information
 */

const CrewInfoMenu = (() => {
    let selectedOfficerIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show crew information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        selectedOfficerIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    /**
     * Render the crew menu
     */
    function render(onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTitleLineCentered(0, 'Crew & Officers');
        
        if (gameState.subordinates.length === 0) {
            UI.addTextCentered(10, 'No crew members', COLORS.TEXT_DIM);
            UI.addTextCentered(12, 'Visit the Tavern to hire officers', COLORS.TEXT_DIM);
        } else {
            // Calculate total salary
            let totalSalary = 0;
            gameState.subordinates.forEach(officer => {
                totalSalary += officer.getSalary();
            });
            
            // Show total salary info
            let y = 5;
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Total Salaries:', value: `${totalSalary} CR per landing`, valueColor: COLORS.YELLOW },
                { label: 'Ships in Fleet:', value: String(gameState.ships.length), valueColor: COLORS.TEXT_NORMAL }
            ]);
            y++;
            
            // Officers header
            y = UI.addHeaderLine(5, y, 'Officers');
            y++;
            
            // Build table for officers
            const headers = ['', 'Name', 'Lvl', '🚀', '💰', '🎯', '🥷', '🔧', 'Salary'];
            const rows = gameState.subordinates.map((officer, index) => {
                const salary = officer.getSalary();
                const isSelected = index === selectedOfficerIndex;
                
                return [
                    { text: isSelected ? '>' : ' ', color: COLORS.CYAN },
                    { text: officer.name, color: COLORS.TEXT_NORMAL },
                    { text: String(officer.level), color: COLORS.YELLOW },
                    { text: String(officer.skills.piloting), color: UI.calcStatColor(1.0 + (officer.skills.piloting / 20) * 3.0) },
                    { text: String(officer.skills.barter), color: UI.calcStatColor(1.0 + (officer.skills.barter / 20) * 3.0) },
                    { text: String(officer.skills.gunnery), color: UI.calcStatColor(1.0 + (officer.skills.gunnery / 20) * 3.0) },
                    { text: String(officer.skills.smuggling), color: UI.calcStatColor(1.0 + (officer.skills.smuggling / 20) * 3.0) },
                    { text: String(officer.skills.engineering), color: UI.calcStatColor(1.0 + (officer.skills.engineering / 20) * 3.0) },
                    { text: `${salary} CR`, color: COLORS.TEXT_NORMAL }
                ];
            });
            
            y = TableRenderer.renderTable(5, y, headers, rows, selectedOfficerIndex, 1);
        }
        
        // Buttons
        const buttonY = grid.height - 7;
        const leftX = 5;
        const middleX = 28;
        
        // Navigation and release buttons - only if there are officers
        if (gameState.subordinates.length > 0) {
            UI.addButton(leftX, buttonY, '1', 'Next Officer', () => nextOfficer(onReturn), COLORS.BUTTON, 'Select next officer');
            UI.addButton(leftX, buttonY + 1, '2', 'Prev Officer', () => prevOfficer(onReturn), COLORS.BUTTON, 'Select previous officer');
            
            // Release button - disabled if it would leave ships uncrewed
            const wouldLeaveUncrewed = gameState.subordinates.length <= gameState.ships.length;
            const releaseColor = wouldLeaveUncrewed ? COLORS.TEXT_DIM : COLORS.TEXT_ERROR;
            const releaseHelp = wouldLeaveUncrewed 
                ? 'Cannot release - need 1 officer per ship' 
                : 'Release selected officer from service';
            UI.addButton(middleX, buttonY, '3', 'Release Officer', () => releaseOfficer(onReturn), releaseColor, releaseHelp);
        }
        
        // Back button
        UI.addButton(leftX, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON);
        
        // Set output message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Select next officer
     */
    function nextOfficer(onReturn) {
        const gameState = window.gameState;
        selectedOfficerIndex = (selectedOfficerIndex + 1) % gameState.subordinates.length;
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Select previous officer
     */
    function prevOfficer(onReturn) {
        const gameState = window.gameState;
        selectedOfficerIndex = (selectedOfficerIndex - 1 + gameState.subordinates.length) % gameState.subordinates.length;
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Release the selected officer
     */
    function releaseOfficer(onReturn) {
        const gameState = window.gameState;
        
        // Check if releasing would leave ships uncrewed
        if (gameState.subordinates.length <= gameState.ships.length) {
            outputMessage = 'Cannot release officer - you need at least one officer per ship!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        const officer = gameState.subordinates[selectedOfficerIndex];
        gameState.subordinates.splice(selectedOfficerIndex, 1);
        
        // Adjust selection if needed
        if (selectedOfficerIndex >= gameState.subordinates.length && gameState.subordinates.length > 0) {
            selectedOfficerIndex = gameState.subordinates.length - 1;
        }
        
        outputMessage = `Released ${officer.name} from service`;
        outputColor = COLORS.YELLOW;
        render(onReturn);
    }
    
    return {
        show
    };
})();
