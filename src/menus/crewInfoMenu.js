/**
 * Crew Info Menu
 * Shows crew and officer information
 */

const CrewInfoMenu = (() => {
    /**
     * Show crew information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTitleLineCentered(3, 'Crew & Officers');
        
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
                { label: 'Total Salaries:', value: `${totalSalary} CR per landing`, valueColor: COLORS.YELLOW }
            ]);
            y++;
            
            // Officers header
            y = UI.addHeaderLine(5, y, 'Officers');
            y++;
            
            // Build table for officers
            const headers = ['Name', 'Role', 'Lvl', 'Piloting', 'Barter', 'Gunnery', 'Smuggling', 'Engineering', 'Salary'];
            const rows = gameState.subordinates.map(officer => {
                const salary = officer.getSalary();
                
                return [
                    { text: officer.name, color: COLORS.TEXT_NORMAL },
                    { text: officer.role, color: COLORS.TEXT_DIM },
                    { text: String(officer.level), color: COLORS.YELLOW },
                    { text: String(officer.skills.piloting), color: UI.calcStatColor(1.0 + (officer.skills.piloting / 20) * 3.0) },
                    { text: String(officer.skills.barter), color: UI.calcStatColor(1.0 + (officer.skills.barter / 20) * 3.0) },
                    { text: String(officer.skills.gunnery), color: UI.calcStatColor(1.0 + (officer.skills.gunnery / 20) * 3.0) },
                    { text: String(officer.skills.smuggling), color: UI.calcStatColor(1.0 + (officer.skills.smuggling / 20) * 3.0) },
                    { text: String(officer.skills.engineering), color: UI.calcStatColor(1.0 + (officer.skills.engineering / 20) * 3.0) },
                    { text: `${salary} CR`, color: COLORS.TEXT_DIM }
                ];
            });
            
            TableRenderer.renderTable(5, y, headers, rows, -1, 1);
        }
        
        // Back button
        UI.addCenteredButton(grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
