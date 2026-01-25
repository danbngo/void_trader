/**
 * Tavern Menu
 * Allows player to hire officers
 */

const TavernMenu = (() => {
    let gameState = null;
    let selectedOfficerIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the tavern menu
     * @param {GameState} state - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(state, onReturn) {
        gameState = state;
        selectedOfficerIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }
    
    /**
     * Render the tavern menu
     */
    function render(onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Title
        UI.addTitleLineCentered(3, `${currentSystem.name}: TAVERN`);
        
        // Player info
        let y = 5;
        const maxOfficers = getMaxOfficers();
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Officers:', value: `${gameState.subordinates.length}/${maxOfficers}`, valueColor: COLORS.TEXT_NORMAL }
        ]);
        y++;
        
        // Available officers
        y = UI.addHeaderLine(5, y, 'Available Officers');
        y++;
        
        if (currentSystem.officers.length === 0) {
            UI.addText(7, y, 'No officers available for hire', COLORS.TEXT_DIM);
            y += 2;
        } else {
            // Build table rows for officers
            const headers = ['', 'Name', 'Role', 'Lvl', 'Piloting', 'Barter', 'Gunnery', 'Smuggling', 'Engineering', 'Hire Cost', 'Salary'];
            const rows = currentSystem.officers.map((officer, index) => {
                const isSelected = index === selectedOfficerIndex;
                const hireCost = Math.floor(officer.getHireCost() * (1 + currentSystem.fees));
                const salary = officer.getSalary();
                
                return [
                    { text: isSelected ? '>' : ' ', color: COLORS.CYAN },
                    { text: officer.name, color: COLORS.TEXT_NORMAL },
                    { text: officer.role, color: COLORS.TEXT_DIM },
                    { text: String(officer.level), color: COLORS.YELLOW },
                    { text: String(officer.skills.piloting), color: UI.calcStatColor(1.0 + (officer.skills.piloting / 20) * 3.0) },
                    { text: String(officer.skills.barter), color: UI.calcStatColor(1.0 + (officer.skills.barter / 20) * 3.0) },
                    { text: String(officer.skills.gunnery), color: UI.calcStatColor(1.0 + (officer.skills.gunnery / 20) * 3.0) },
                    { text: String(officer.skills.smuggling), color: UI.calcStatColor(1.0 + (officer.skills.smuggling / 20) * 3.0) },
                    { text: String(officer.skills.engineering), color: UI.calcStatColor(1.0 + (officer.skills.engineering / 20) * 3.0) },
                    { text: `${hireCost} CR`, color: COLORS.TEXT_NORMAL },
                    { text: `${salary} CR`, color: COLORS.TEXT_DIM }
                ];
            });
            
            y = TableRenderer.renderTable(5, y, headers, rows, selectedOfficerIndex, 1);
            y++;
        }
        
        // Buttons
        const buttonY = grid.height - 7;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Navigation buttons - only if there are officers
        if (currentSystem.officers.length > 0) {
            UI.addButton(leftX, buttonY, '1', 'Next Officer', () => nextOfficer(onReturn), COLORS.BUTTON, 'Select next officer');
            UI.addButton(leftX, buttonY + 1, '2', 'Prev Officer', () => prevOfficer(onReturn), COLORS.BUTTON, 'Select previous officer');
            
            // Hire button
            const selectedOfficer = currentSystem.officers[selectedOfficerIndex];
            const hireCost = Math.floor(selectedOfficer.getHireCost() * (1 + currentSystem.fees));
            const maxOfficers = getMaxOfficers();
            const atMaxCapacity = gameState.subordinates.length >= maxOfficers;
            const canAfford = gameState.credits >= hireCost;
            const canHire = !atMaxCapacity && canAfford;
            
            let hireColor = COLORS.TEXT_DIM;
            let hireHelp = '';
            
            if (atMaxCapacity) {
                hireHelp = `Max officers: ${maxOfficers}. Learn Leadership perks to increase.`;
            } else if (!canAfford) {
                hireHelp = `Need ${hireCost} CR to hire`;
            } else {
                hireColor = COLORS.GREEN;
                hireHelp = `Hire ${selectedOfficer.name} for ${hireCost} CR`;
            }
            
            UI.addButton(middleX, buttonY, '3', 'Hire Officer', () => hireOfficer(onReturn), hireColor, hireHelp);
        }
        
        // Back button
        UI.addButton(rightX, buttonY, '0', 'Back', onReturn, COLORS.BUTTON, 'Return to dock');
        
        // Set output message
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Get maximum number of officers player can hire based on perks
     * @returns {number} Maximum officers allowed
     */
    function getMaxOfficers() {
        // Base: 1 officer
        let maxOfficers = 1;
        
        // Add +1 for each leadership perk
        if (gameState.perks.has('LEADERSHIP_I')) maxOfficers++;
        if (gameState.perks.has('LEADERSHIP_II')) maxOfficers++;
        if (gameState.perks.has('LEADERSHIP_III')) maxOfficers++;
        
        return maxOfficers;
    }
    
    /**
     * Select next officer
     */
    function nextOfficer(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        selectedOfficerIndex = (selectedOfficerIndex + 1) % currentSystem.officers.length;
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Select previous officer
     */
    function prevOfficer(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        selectedOfficerIndex = (selectedOfficerIndex - 1 + currentSystem.officers.length) % currentSystem.officers.length;
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Hire the selected officer
     */
    function hireOfficer(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        const officer = currentSystem.officers[selectedOfficerIndex];
        const hireCost = Math.floor(officer.getHireCost() * (1 + currentSystem.fees));
        
        // Check if at max officer capacity
        const maxOfficers = getMaxOfficers();
        if (gameState.subordinates.length >= maxOfficers) {
            outputMessage = `Cannot hire more officers! Max: ${maxOfficers}. Learn Leadership perks at Guild to increase.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        if (gameState.credits < hireCost) {
            outputMessage = `Not enough credits! Need ${hireCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Hire the officer
        gameState.credits -= hireCost;
        gameState.subordinates.push(officer);
        currentSystem.officers.splice(selectedOfficerIndex, 1);
        
        // Adjust selection if needed
        if (selectedOfficerIndex >= currentSystem.officers.length && currentSystem.officers.length > 0) {
            selectedOfficerIndex = currentSystem.officers.length - 1;
        }
        
        outputMessage = `Hired ${officer.name} for ${hireCost} CR!`;
        outputColor = COLORS.TEXT_SUCCESS;
        render(onReturn);
    }
    
    return {
        show
    };
})();
