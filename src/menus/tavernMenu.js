/**
 * Tavern Menu
 * Allows player to hire officers
 */

const TavernMenu = (() => {
    let gameState = null;
    let selectedOfficerIndex = 0;
    let selectedJobIndex = 0;
    let mode = 'officers'; // 'officers' or 'jobs'
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;
    
    /**
     * Get maximum skill level from all crew members (captain + subordinates)
     */
    function getMaxCrewSkill(skillName) {
        let maxSkill = 0;
        
        if (gameState.captain && gameState.captain.skills[skillName]) {
            maxSkill = Math.max(maxSkill, gameState.captain.skills[skillName]);
        }
        
        if (gameState.subordinates) {
            gameState.subordinates.forEach(officer => {
                if (officer.skills[skillName]) {
                    maxSkill = Math.max(maxSkill, officer.skills[skillName]);
                }
            });
        }
        
        return maxSkill;
    }
    
    /**
     * Get effective fees after barter skill (uses max from all crew)
     */
    function getEffectiveFees() {
        const currentSystem = gameState.getCurrentSystem();
        const barterLevel = getMaxCrewSkill('barter');
        return SkillEffects.getModifiedFees(currentSystem.fees, barterLevel);
    }
    
    /**
     * Show the tavern menu
     * @param {GameState} state - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(state, onReturn) {
        gameState = state;
        selectedOfficerIndex = 0;
        selectedJobIndex = 0;
        mode = 'officers';
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
        
        // Title with mode indicator
        UI.addTitleLineCentered(0, `${currentSystem.name}: Tavern - ${mode === 'officers' ? 'Officers' : 'Jobs'}`);
        
        // Player info
        let y = 2;
        const maxOfficers = getMaxOfficers();
        const effectiveFees = getEffectiveFees();
        
        if (mode === 'officers') {
            renderOfficersMode(y, maxOfficers, effectiveFees, onReturn);
        } else {
            renderJobsMode(y, effectiveFees, onReturn);
        }
    }
    
    /**
     * Render officers mode
     */
    function renderOfficersMode(startY, maxOfficers, effectiveFees, onReturn) {
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        let y = startY;
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Officers:', value: `${gameState.subordinates.length}/${maxOfficers}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'System Fees:', value: `${(currentSystem.fees * 100).toFixed(1)}%`, valueColor: COLORS.TEXT_DIM }
        ]);
        y++;
        
        if (currentSystem.officers.length === 0) {
            UI.addText(5, y, 'No officers available for hire', COLORS.TEXT_DIM);
            y += 2;
        } else {
            // Build table rows for officers
            const headers = ['Name', 'Lvl', ...SKILLS_ALL.map(s=>s.shortName), 'Hire Cost', 'Salary'];
            const rows = currentSystem.officers.map((officer, index) => {
                const isSelected = index === selectedOfficerIndex;
                const hireCost = Math.floor(officer.getHireCost() * (1 + effectiveFees));
                const salary = officer.getSalary();
                
                return [
                    { text: officer.name, color: COLORS.TEXT_NORMAL },
                    { text: String(officer.level), color: COLORS.YELLOW },
                    { text: String(officer.skills.piloting), color: UI.calcStatColor(1.0 + (officer.skills.piloting / 20) * 3.0) },
                    { text: String(officer.skills.barter), color: UI.calcStatColor(1.0 + (officer.skills.barter / 20) * 3.0) },
                    { text: String(officer.skills.gunnery), color: UI.calcStatColor(1.0 + (officer.skills.gunnery / 20) * 3.0) },
                    { text: String(officer.skills.smuggling), color: UI.calcStatColor(1.0 + (officer.skills.smuggling / 20) * 3.0) },
                    { text: String(officer.skills.engineering), color: UI.calcStatColor(1.0 + (officer.skills.engineering / 20) * 3.0) },
                    { text: String(hireCost), color: COLORS.TEXT_NORMAL },
                    { text: String(salary), color: COLORS.TEXT_NORMAL }
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
        
        // Navigation buttons - only if there are 2 or more officers
        if (currentSystem.officers.length > 1) {
            UI.addButton(leftX, buttonY, '1', 'Next Officer', () => nextOfficer(onReturn), COLORS.BUTTON, 'Select next officer');
            UI.addButton(leftX, buttonY + 1, '2', 'Prev Officer', () => prevOfficer(onReturn), COLORS.BUTTON, 'Select previous officer');
        }
        
        // Hire button - only if there are officers
        if (currentSystem.officers.length > 0) {
            const selectedOfficer = currentSystem.officers[selectedOfficerIndex];
            const hireCost = Math.floor(selectedOfficer.getHireCost() * (1 + effectiveFees));
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
        
        // Mode toggle and back buttons
        UI.addButton(rightX, buttonY + 1, '9', 'View Jobs', () => toggleMode(onReturn), COLORS.BUTTON, 'Switch to jobs board');
        UI.addButton(rightX, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON, 'Return to dock');
        
        // Reset selection FIRST to prevent button help text
        if (outputMessage) {
            UI.resetSelection();
        }
        
        // Set output message AFTER resetting selection
        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        UI.draw();
    }
    
    /**
     * Render jobs mode
     */
    function renderJobsMode(startY, effectiveFees, onReturn) {
        console.log('[TavernMenu] renderJobsMode - Start, outputMessage:', outputMessage);
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        let y = startY;
        
        // Show current job status
        const hasActiveJob = gameState.currentJob !== null;
        const hasCompletedJob = gameState.completedJobReward !== null;
        
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Active Job:', value: hasActiveJob ? 'Yes' : (hasCompletedJob ? 'Awaiting Reward' : 'None'), 
              valueColor: hasActiveJob ? COLORS.GREEN : (hasCompletedJob ? COLORS.YELLOW : COLORS.TEXT_DIM) }
        ]);
        y += 2;
        
        // Show available jobs
        if (currentSystem.jobs.length === 0) {
            UI.addText(5, y, 'No jobs available at this tavern', COLORS.TEXT_DIM);
            y += 2;
        } else {
            // Build table rows for jobs
            const headers = ['Type', 'Destination', 'Dist', 'ETA', 'Deadline', 'Credits', 'Exp', 'Rep'];
            
            // Get first ship for engine calculation
            const activeShip = gameState.ships[0];
            const engineMultiplier = AVERAGE_SHIP_ENGINE_LEVEL / activeShip.engine;
            
            const rows = currentSystem.jobs.map((job, index) => {
                const deadlineDays = job.deadlineDate; // This is duration until accepted
                
                // Calculate distance and ETA
                const distance = currentSystem.distanceTo(job.targetSystem);
                const eta = distance * AVERAGE_JOURNEY_DAYS_PER_LY * engineMultiplier;
                
                // Calculate color ratios
                // Distance/ETA: 0 distance = 1.0, maxJumps*10 distance = 4.0
                const maxDistance = job.jobType.maxJumps * 10;
                const distanceRatio = maxDistance > 0 ? 1.0 + (distance / maxDistance) * 3.0 : 1.0;
                const distanceColor = UI.calcStatColor(distanceRatio);
                
                // Rewards: base value = 1.0, higher = better
                const creditsRatio = job.jobType.baseCredits > 0 ? job.awardCredits / job.jobType.baseCredits : 1.0;
                const creditsColor = UI.calcStatColor(creditsRatio);
                
                const expRatio = job.jobType.baseExp > 0 ? job.awardExp / job.jobType.baseExp : 1.0;
                const expColor = UI.calcStatColor(expRatio);
                
                const repRatio = job.jobType.baseReputation > 0 ? job.awardReputation / job.jobType.baseReputation : 1.0;
                const repColor = UI.calcStatColor(repRatio);
                
                return [
                    { text: job.jobType.name, color: job.jobType.color },
                    { text: job.targetSystem.name, color: COLORS.TEXT_NORMAL },
                    { text: distance.toFixed(1), color: distanceColor },
                    { text: eta.toFixed(1), color: distanceColor },
                    { text: String(deadlineDays), color: COLORS.TEXT_NORMAL },
                    { text: String(job.awardCredits), color: creditsColor },
                    { text: String(job.awardExp), color: expColor },
                    { text: `+${job.awardReputation}`, color: repColor }
                ];
            });
            
            y = TableRenderer.renderTable(5, y, headers, rows, selectedJobIndex, 1);
            y++;
            
            // Show selected job description
            if (currentSystem.jobs.length > 0) {
                const selectedJob = currentSystem.jobs[selectedJobIndex];
                UI.addText(5, y++, 'Description:', COLORS.TEXT_DIM);
                UI.addText(5, y++, selectedJob.description, selectedJob.jobType.color);
            }
        }
        
        // Buttons
        const buttonY = grid.height - 4;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;
        
        // Navigation buttons - only if there are 2 or more jobs
        if (currentSystem.jobs.length > 1) {
            UI.addButton(leftX, buttonY, '1', 'Next Job', () => nextJob(onReturn), COLORS.BUTTON, 'Select next job');
            UI.addButton(leftX, buttonY + 1, '2', 'Prev Job', () => prevJob(onReturn), COLORS.BUTTON, 'Select previous job');
        }
        
        // Accept job button - only if there are jobs and player doesn't have an active job
        if (currentSystem.jobs.length > 0) {
            const selectedJob = currentSystem.jobs[selectedJobIndex];
            const hasActiveJob = gameState.currentJob !== null;
            const hasCompletedJob = gameState.completedJobReward !== null;
            const canAccept = !hasActiveJob && !hasCompletedJob;
            
            let acceptColor = COLORS.TEXT_DIM;
            let acceptHelp = '';
            
            if (hasCompletedJob) {
                acceptHelp = 'Collect your completed job reward first';
            } else if (hasActiveJob) {
                acceptHelp = 'Already have an active job';
            } else {
                acceptColor = COLORS.GREEN;
                acceptHelp = `Accept job: ${selectedJob.description}`;
            }
            
            UI.addButton(middleX, buttonY, '3', 'Accept Job', () => acceptJob(onReturn), acceptColor, acceptHelp);
        }
        
        // Mode toggle and back buttons
        UI.addButton(rightX, buttonY + 1, '9', 'View Officers', () => toggleMode(onReturn), COLORS.BUTTON, 'Switch to officer hiring');
        UI.addButton(rightX, buttonY + 2, '0', 'Back', onReturn, COLORS.BUTTON, 'Return to dock');
        
        // Reset selection FIRST to prevent button help text
        if (outputMessage) {
            console.log('[TavernMenu] renderJobsMode - Has output message:', outputMessage);
            UI.resetSelection();
        }
        
        // Set output message AFTER resetting selection
        if (outputMessage) {
            console.log('[TavernMenu] renderJobsMode - Setting output row:', outputMessage, outputColor);
            UI.setOutputRow(outputMessage, outputColor);
        }
        
        console.log('[TavernMenu] renderJobsMode - About to draw');
        UI.draw();
    }
    
    /**
     * Toggle between officers and jobs mode
     */
    function toggleMode(onReturn) {
        mode = mode === 'officers' ? 'jobs' : 'officers';
        outputMessage = '';
        render(onReturn);
    }
    
    /**
     * Navigate to next job
     */
    function nextJob(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        if (currentSystem.jobs.length > 0) {
            selectedJobIndex = (selectedJobIndex + 1) % currentSystem.jobs.length;
        }
        render(onReturn);
    }
    
    /**
     * Navigate to previous job
     */
    function prevJob(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        if (currentSystem.jobs.length > 0) {
            selectedJobIndex = (selectedJobIndex - 1 + currentSystem.jobs.length) % currentSystem.jobs.length;
        }
        render(onReturn);
    }
    
    /**
     * Accept the selected job
     */
    function acceptJob(onReturn) {
        const currentSystem = gameState.getCurrentSystem();
        
        // Validate we can accept
        if (gameState.currentJob !== null) {
            outputMessage = 'You already have an active job!';
            outputColor = COLORS.TEXT_ERROR;
            UI.setOutputRow(outputMessage, outputColor);
            render(onReturn);
            return;
        }
        
        if (gameState.completedJobReward !== null) {
            outputMessage = 'Collect your completed job reward first!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        if (currentSystem.jobs.length === 0) {
            outputMessage = 'No jobs available!';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Get the selected job
        const job = currentSystem.jobs[selectedJobIndex];
        
        // Set start date and convert deadline from duration to absolute date
        const currentDate = gameState.date.getTime();
        job.startDate = currentDate;
        job.deadlineDate = currentDate + (job.deadlineDate * 24 * 60 * 60 * 1000); // Convert days to milliseconds
        
        // Add to player's active job
        gameState.currentJob = job;
        
        // Remove from tavern's available jobs
        currentSystem.jobs.splice(selectedJobIndex, 1);
        
        // Adjust selection if needed
        if (selectedJobIndex >= currentSystem.jobs.length && currentSystem.jobs.length > 0) {
            selectedJobIndex = currentSystem.jobs.length - 1;
        } else if (currentSystem.jobs.length === 0) {
            selectedJobIndex = 0;
        }
        
        // Set success message AFTER adjusting selection
        outputMessage = `Accepted job: ${job.description}`;
        outputColor = COLORS.TEXT_SUCCESS;
        console.log('[TavernMenu] acceptJob - Setting output message:', outputMessage);
        console.log('[TavernMenu] acceptJob - Output color:', outputColor);
        console.log('[TavernMenu] acceptJob - NOT calling UI.setOutputRow here, letting render handle it');
        
        render(onReturn);
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
        console.log('=== HIRING OFFICER ===');
        const currentSystem = gameState.getCurrentSystem();
        console.log('Officers available before hire:', currentSystem.officers.length);
        console.log('Selected index before hire:', selectedOfficerIndex);
        
        const officer = currentSystem.officers[selectedOfficerIndex];
        const effectiveFees = getEffectiveFees();
        const hireCost = Math.floor(officer.getHireCost() * (1 + effectiveFees));
        
        // Check if at max officer capacity
        const maxOfficers = getMaxOfficers();
        if (gameState.subordinates.length >= maxOfficers) {
            console.log('BLOCKED: At max officers');
            outputMessage = `Cannot hire more officers! Max: ${maxOfficers}. Learn Leadership perks at Guild to increase.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        if (gameState.credits < hireCost) {
            console.log('BLOCKED: Not enough credits');
            outputMessage = `Not enough credits! Need ${hireCost} CR, have ${gameState.credits} CR.`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }
        
        // Store officer name before removing
        const officerName = officer.name;
        console.log('Hiring officer:', officerName);
        
        // Hire the officer
        gameState.credits -= hireCost;
        gameState.subordinates.push(officer);
        currentSystem.officers.splice(selectedOfficerIndex, 1);
        console.log('Officers available after removal:', currentSystem.officers.length);
        
        // Adjust selection if needed
        if (selectedOfficerIndex >= currentSystem.officers.length && currentSystem.officers.length > 0) {
            selectedOfficerIndex = currentSystem.officers.length - 1;
            console.log('Adjusted selection to:', selectedOfficerIndex, '(was beyond array)');
        } else if (currentSystem.officers.length === 0) {
            // Reset to 0 when no officers left
            selectedOfficerIndex = 0;
            console.log('Reset selection to 0 (no officers left)');
        } else {
            console.log('Selection unchanged at:', selectedOfficerIndex);
        }
        
        // Set success message AFTER adjusting selection
        outputMessage = `Hired ${officerName} for ${hireCost} CR!`;
        outputColor = COLORS.TEXT_SUCCESS;
        console.log('Output message set to:', outputMessage);
        console.log('=== END HIRING ===');
        
        render(onReturn);
    }
    
    return {
        show
    };
})();
