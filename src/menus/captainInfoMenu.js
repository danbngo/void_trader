/**
 * Captain Info Menu
 * Shows captain information with mode switching for Skills and Perks
 */

const CaptainInfoMenu = (() => {
    let currentMode = 'info'; // 'info', 'skills', 'perks'
    let selectedSkillIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Show captain information
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(onReturn) {
        currentMode = 'info';
        selectedSkillIndex = 0;
        outputMessage = '';
        
        UI.clear();
        UI.resetSelection();
        render(onReturn);
    }
    
    /**
     * Render the menu based on current mode
     */
    function render(onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        const playerOfficer = gameState.captain;
        
        // Check if player has skills or skill points (used in multiple places)
        const hasSkillPoints = playerOfficer && playerOfficer.skillPoints > 0;
        const hasAnySkills = playerOfficer && Object.values(playerOfficer.skills).some(level => level > 0);
        const hasSkillsOrPoints = hasSkillPoints || hasAnySkills;
        
        // Title
        let title = 'Captain Info';
        if (currentMode === 'skills') title = 'Skills';
        else if (currentMode === 'perks') title = 'Perks';
        UI.addTitleLineCentered(3, title);
        
        let y = 5;
        
        // Render based on mode
        if (currentMode === 'info') {
            y = renderCaptainInfo(gameState, playerOfficer, y);
        } else if (currentMode === 'skills') {
            y = renderSkills(gameState, playerOfficer, y);
        } else if (currentMode === 'perks') {
            y = renderPerks(gameState, y);
        }
        
        // Mode buttons and back button
        const buttonY = grid.height - 5;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Mode switching buttons - hide button for current mode
        if (currentMode !== 'info') {
            const infoColor = COLORS.BUTTON;
            UI.addButton(leftX, buttonY, '1', 'Captain Info', () => switchMode('info', onReturn), infoColor, 'View captain information');
        }
        
        // Skills button - check if player has any skills or points
        if (currentMode !== 'skills') {
            let skillsColor = COLORS.BUTTON;
            let skillsHelp = 'View and upgrade captain skills';
            if (!hasSkillsOrPoints) {
                skillsColor = COLORS.TEXT_DIM;
                skillsHelp = 'No skills learned yet (gain experience to unlock)';
            } else if (hasSkillPoints) {
                skillsColor = COLORS.YELLOW;
                skillsHelp = 'Skill points available! View and upgrade skills';
            }
            UI.addButton(leftX, buttonY + 1, '2', 'Skills', 
                hasSkillsOrPoints ? () => switchMode('skills', onReturn) : () => {
                    outputMessage = 'No skills learned yet. Gain experience to unlock skills!';
                    outputColor = COLORS.TEXT_ERROR;
                    render(onReturn);
                }, 
                skillsColor, skillsHelp);
        }
        
        // Perks button
        if (currentMode !== 'perks') {
            const hasPerks = gameState.perks && gameState.perks.size > 0;
            let perksColor = COLORS.BUTTON;
            let perksHelp = 'View learned perks';
            if (!hasPerks) {
                perksColor = COLORS.TEXT_DIM;
                perksHelp = 'No perks learned yet';
            }
            UI.addButton(leftX, buttonY + 2, '3', 'Perks', 
                hasPerks ? () => switchMode('perks', onReturn) : () => {
                    outputMessage = 'No perks learned yet.';
                    outputColor = COLORS.TEXT_ERROR;
                    render(onReturn);
                },
                perksColor, perksHelp);
        }
        
        // Skills mode specific buttons
        if (currentMode === 'skills' && hasSkillsOrPoints) {
            UI.addButton(middleX, buttonY, '4', 'Previous Skill', () => prevSkill(onReturn), COLORS.BUTTON, 'Select previous skill');
            UI.addButton(middleX, buttonY + 1, '5', 'Next Skill', () => nextSkill(onReturn), COLORS.BUTTON, 'Select next skill');
            
            // Upgrade button
            const skillsList = Object.values(SKILLS);
            const selectedSkillData = skillsList[selectedSkillIndex];
            const canUpgrade = playerOfficer.canUpgradeSkill(selectedSkillData.id);
            const currentLevel = playerOfficer.skills[selectedSkillData.id] || 0;
            const isMaxLevel = currentLevel >= selectedSkillData.maxLevel;
            
            let upgradeHelpText = 'Upgrade selected skill';
            let upgradeColor = COLORS.BUTTON;
            const upgradeCost = playerOfficer.getSkillUpgradeCost(selectedSkillData.id);
            
            if (isMaxLevel) {
                upgradeHelpText = 'Skill is already at maximum level';
                upgradeColor = COLORS.TEXT_DIM;
            } else if (!canUpgrade) {
                upgradeHelpText = `Need ${upgradeCost} skill points (have ${playerOfficer.skillPoints})`;
                upgradeColor = COLORS.TEXT_DIM;
            } else {
                upgradeHelpText = `Upgrade selected skill (Cost: ${upgradeCost} skill points)`;
            }
            
            UI.addButton(middleX, buttonY + 2, '6', 'Upgrade Skill', () => upgradeSkill(onReturn), upgradeColor, upgradeHelpText);
        }
        
        // Back button
        UI.addButton(rightX, buttonY, '0', 'Back', onReturn, COLORS.BUTTON);
        
        // Set output message if present
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Render captain info mode
     */
    function renderCaptainInfo(gameState, playerOfficer, y) {
        const currentSystem = gameState.getCurrentSystem();
        
        y = UI.addHeaderLine(5, y, 'Captain Info');
        
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.YELLOW },
            { label: 'Location:', value: currentSystem.name, valueColor: COLORS.CYAN },
            { label: 'Reputation:', value: String(gameState.reputation), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Bounty:', value: `${gameState.bounty} CR`, valueColor: gameState.bounty > 0 ? COLORS.TEXT_ERROR : COLORS.TEXT_NORMAL }
        ]);
        y++;
        
        // Level and Experience section
        if (playerOfficer) {
            const expNeeded = playerOfficer.calcExpToNextLevel();
            const expProgress = playerOfficer.experience / expNeeded;
            
            y = TableRenderer.renderKeyValueList(5, y, [
                { label: 'Level:', value: String(playerOfficer.level), valueColor: COLORS.CYAN },
                { label: 'Experience:', value: `${playerOfficer.experience}/${expNeeded}`, valueColor: COLORS.TEXT_NORMAL }
            ]);
            y++;
            
            // Experience progress bar
            const grid = UI.getGridSize();
            const barWidth = Math.floor(grid.width * 0.6);
            const barCenterX = Math.floor(grid.width / 2);
            const progressLabel = `${(expProgress * 100).toFixed(1)}% to level ${playerOfficer.level + 1}`;
            y = ProgressBar.render(barCenterX, y, expProgress, barWidth, progressLabel);
            y += 2;
        }
        
        return y;
    }
    
    /**
     * Render skills mode
     */
    function renderSkills(gameState, playerOfficer, y) {
        if (!playerOfficer) {
            UI.addTextCentered(10, 'No officer data available', COLORS.TEXT_ERROR);
            return y;
        }
        
        // Skills table
        UI.addText(5, y++, 'Available Skills:', COLORS.YELLOW);
        y++;
        
        const skillsList = Object.values(SKILLS);
        const headers = ['Skill', 'Lvl', 'Cost', 'Description'];
        
        const rows = skillsList.map((skill, index) => {
            const currentLevel = playerOfficer.skills[skill.id] || 0;
            const upgradeCost = playerOfficer.getSkillUpgradeCost(skill.id);
            const canUpgrade = playerOfficer.canUpgradeSkill(skill.id);
            
            // Calculate stat color for level (0 = ratio 1.0, maxLevel = ratio 4.0)
            const levelRatio = 1.0 + (currentLevel / skill.maxLevel) * 3.0;
            const levelColor = UI.calcStatColor(levelRatio);
            
            // Cost column has no color (white)
            const costText = currentLevel < skill.maxLevel ? String(upgradeCost) : 'MAX';
            
            return [
                { text: skill.name, color: skill.color },
                { text: String(currentLevel), color: levelColor },
                { text: costText, color: COLORS.TEXT_NORMAL },
                { text: skill.description, color: COLORS.WHITE }
            ];
        });
        
        y = TableRenderer.renderTable(5, y, headers, rows, selectedSkillIndex, 2, (rowIndex) => {
            selectedSkillIndex = rowIndex;
            outputMessage = '';
            render(window.gameState.__returnCallback);
        });
        y += 2;
        
        // Skill Points below table
        const skillPointsColor = playerOfficer.skillPoints > 0 ? COLORS.GREEN : COLORS.WHITE;
        UI.addText(5, y++, `Skill Points: ${playerOfficer.skillPoints}`, skillPointsColor);
        
        return y;
    }
    
    /**
     * Render perks mode
     */
    function renderPerks(gameState, y) {
        y = UI.addHeaderLine(5, y, 'Learned Perks');
        
        if (gameState.perks.size === 0) {
            UI.addText(5, y, 'No perks learned yet', COLORS.TEXT_DIM);
        } else {
            gameState.perks.forEach(perkId => {
                const perk = PERKS[perkId];
                if (perk) {
                    UI.addText(7, y++, `${perk.name}`, COLORS.GREEN);
                    UI.addText(9, y++, perk.description, COLORS.TEXT_DIM);
                }
            });
        }
        
        return y;
    }
    
    /**
     * Switch between modes
     */
    function switchMode(mode, onReturn) {
        currentMode = mode;
        selectedSkillIndex = 0;
        outputMessage = '';
        window.gameState.__returnCallback = onReturn; // Store for table callback
        render(onReturn);
    }
    
    /**
     * Select previous skill
     */
    function prevSkill(onReturn) {
        const skillsList = Object.values(SKILLS);
        selectedSkillIndex = (selectedSkillIndex - 1 + skillsList.length) % skillsList.length;
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Select next skill
     */
    function nextSkill(onReturn) {
        const skillsList = Object.values(SKILLS);
        selectedSkillIndex = (selectedSkillIndex + 1) % skillsList.length;
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Upgrade selected skill
     */
    function upgradeSkill(onReturn) {
        const gameState = window.gameState;
        const playerOfficer = gameState.captain;
        const skillsList = Object.values(SKILLS);
        const selectedSkill = skillsList[selectedSkillIndex];
        
        if (!playerOfficer || !selectedSkill) {
            outputMessage = 'Unable to upgrade skill';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        if (playerOfficer.canUpgradeSkill(selectedSkill.id)) {
            playerOfficer.upgradeSkill(selectedSkill.id);
            outputMessage = `Upgraded ${selectedSkill.name}!`;
            outputColor = COLORS.GREEN;
        } else {
            const currentLevel = playerOfficer.skills[selectedSkill.id] || 0;
            if (currentLevel >= selectedSkill.maxLevel) {
                outputMessage = 'Skill is already at maximum level!';
            } else {
                const cost = playerOfficer.getSkillUpgradeCost(selectedSkill.id);
                outputMessage = `Need ${cost} skill points (have ${playerOfficer.skillPoints})`;
            }
            outputColor = COLORS.TEXT_ERROR;
        }
        
        render(onReturn);
    }
    
    return {
        show
    };
})();
