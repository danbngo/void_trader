/**
 * Skills Menu
 * Manage player skills and upgrades
 */

const SkillsMenu = (() => {
    let returnCallback = null;
    let currentGameState = null;
    let selectedSkillIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show the skills menu
     * @param {GameState} gameState - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(gameState, onReturn) {
        returnCallback = onReturn;
        currentGameState = gameState;
        selectedSkillIndex = 0;
        outputMessage = '';
        
        UI.clear();
        UI.resetSelection();
        render(gameState, onReturn);
    }
    
    /**
     * Render the skills menu
     */
    function render(gameState, onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const playerOfficer = gameState.officers[0];
        
        if (!playerOfficer) {
            UI.addTextCentered(10, 'No officer data available', COLORS.TEXT_ERROR);
            UI.addButton(5, grid.height - 4, '0', 'Back', () => { if (returnCallback) returnCallback(); }, COLORS.BUTTON);
            UI.draw();
            return;
        }
        
        // Title
        UI.addTextCentered(3, 'Skills', COLORS.TITLE);
        
        // Player experience info
        let y = 6;
        const expNeeded = playerOfficer.calcExpToNextLevel();
        const expProgress = playerOfficer.experience / expNeeded;
        
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Level:', value: String(playerOfficer.level), valueColor: COLORS.CYAN },
            { label: 'Experience:', value: `${playerOfficer.experience}/${expNeeded}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Skill Points:', value: String(playerOfficer.skillPoints), valueColor: playerOfficer.skillPoints > 0 ? COLORS.GREEN : COLORS.TEXT_NORMAL }
        ]);
        y++;
        
        // Experience progress bar
        const barWidth = Math.floor(grid.width * 0.6);
        const barCenterX = Math.floor(grid.width / 2);
        const progressLabel = `${(expProgress * 100).toFixed(1)}% to level ${playerOfficer.level + 1}`;
        y = ProgressBar.render(barCenterX, y, expProgress, barWidth, progressLabel);
        y += 2;
        
        // Skills table
        UI.addText(5, y++, 'Available Skills:', COLORS.YELLOW);
        y++;
        
        const skillsList = Object.values(SKILLS);
        const rows = skillsList.map((skill, index) => {
            const currentLevel = playerOfficer.skills[skill.id] || 0;
            const upgradeCost = playerOfficer.getSkillUpgradeCost(skill.id);
            const canUpgrade = playerOfficer.canUpgradeSkill(skill.id);
            
            // Color based on whether player can afford upgrade
            let costColor = COLORS.TEXT_DIM;
            if (currentLevel < skill.maxLevel) {
                costColor = canUpgrade ? COLORS.GREEN : COLORS.TEXT_ERROR;
            }
            
            return [
                { text: skill.name, color: skill.color },
                { text: `${currentLevel}/${skill.maxLevel}`, color: COLORS.TEXT_NORMAL },
                { text: currentLevel < skill.maxLevel ? `Cost: ${upgradeCost}` : 'MAX', color: costColor }
            ];
        });
        
        const headers = [
            { text: 'Skill', color: COLORS.YELLOW },
            { text: 'Level', color: COLORS.YELLOW },
            { text: 'Upgrade', color: COLORS.YELLOW }
        ];
        
        y = TableRenderer.renderTable(5, y, headers, rows, selectedSkillIndex);
        y += 2;
        
        // Show selected skill description
        const selectedSkill = skillsList[selectedSkillIndex];
        UI.addText(5, y++, 'Description:', COLORS.CYAN);
        UI.addText(5, y++, selectedSkill.description, COLORS.TEXT_DIM);
        y += 2;
        
        // Set output message if present
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        // Buttons
        const buttonY = grid.height - 5;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        UI.addButton(leftX, buttonY, '1', 'Previous Skill', () => prevSkill(gameState, onReturn), COLORS.BUTTON, 'Select previous skill');
        UI.addButton(leftX, buttonY + 1, '2', 'Next Skill', () => nextSkill(gameState, onReturn), COLORS.BUTTON, 'Select next skill');
        
        // Upgrade button - gray out if can't upgrade
        const selectedSkillData = skillsList[selectedSkillIndex];
        const canUpgrade = playerOfficer.canUpgradeSkill(selectedSkillData.id);
        const currentLevel = playerOfficer.skills[selectedSkillData.id] || 0;
        const isMaxLevel = currentLevel >= selectedSkillData.maxLevel;
        
        let upgradeHelpText = 'Upgrade selected skill';
        let upgradeColor = COLORS.BUTTON;
        
        if (isMaxLevel) {
            upgradeHelpText = 'Skill is already at maximum level';
            upgradeColor = COLORS.TEXT_DIM;
        } else if (!canUpgrade) {
            const upgradeCost = playerOfficer.getSkillUpgradeCost(selectedSkillData.id);
            upgradeHelpText = `Need ${upgradeCost} skill points (have ${playerOfficer.skillPoints})`;
            upgradeColor = COLORS.TEXT_DIM;
        }
        
        UI.addButton(middleX, buttonY, '3', 'Upgrade Skill', () => upgradeSkill(gameState, onReturn), upgradeColor, upgradeHelpText);
        
        UI.addButton(rightX, buttonY, '0', 'Back', () => { if (returnCallback) returnCallback(); }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Select previous skill
     */
    function prevSkill(gameState, onReturn) {
        const skillsList = Object.values(SKILLS);
        selectedSkillIndex = (selectedSkillIndex - 1 + skillsList.length) % skillsList.length;
        outputMessage = '';
        render(gameState, onReturn);
    }
    
    /**
     * Select next skill
     */
    function nextSkill(gameState, onReturn) {
        const skillsList = Object.values(SKILLS);
        selectedSkillIndex = (selectedSkillIndex + 1) % skillsList.length;
        outputMessage = '';
        render(gameState, onReturn);
    }
    
    /**
     * Upgrade selected skill
     */
    function upgradeSkill(gameState, onReturn) {
        const playerOfficer = gameState.officers[0];
        if (!playerOfficer) return;
        
        const skillsList = Object.values(SKILLS);
        const selectedSkill = skillsList[selectedSkillIndex];
        const currentLevel = playerOfficer.skills[selectedSkill.id] || 0;
        
        // Check if at max level
        if (currentLevel >= selectedSkill.maxLevel) {
            outputMessage = `${selectedSkill.name} is already at maximum level!`;
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn);
            return;
        }
        
        // Check if can afford
        if (!playerOfficer.canUpgradeSkill(selectedSkill.id)) {
            const cost = playerOfficer.getSkillUpgradeCost(selectedSkill.id);
            outputMessage = `Not enough skill points! Need ${cost}, have ${playerOfficer.skillPoints}.`;
            outputColor = COLORS.TEXT_ERROR;
            render(gameState, onReturn);
            return;
        }
        
        // Perform upgrade
        const success = playerOfficer.upgradeSkill(selectedSkill.id);
        if (success) {
            const newLevel = playerOfficer.skills[selectedSkill.id];
            outputMessage = `${selectedSkill.name} upgraded to level ${newLevel}!`;
            outputColor = COLORS.GREEN;
        } else {
            outputMessage = `Failed to upgrade ${selectedSkill.name}.`;
            outputColor = COLORS.TEXT_ERROR;
        }
        
        render(gameState, onReturn);
    }
    
    return {
        show
    };
})();
