/**
 * Travel Confirmation Menu
 * Shows journey details and confirms travel to selected system
 */

const TravelConfirmMenu = (() => {
    /**
     * Show the travel confirmation menu
     * @param {GameState} gameState - Current game state
     * @param {StarSystem} targetSystem - Target star system
     */
    function show(gameState, targetSystem) {
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();
        
        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();
        
        // Calculate journey details
        const distance = currentSystem.distanceTo(targetSystem);
        const navigationLevel = getMaxCrewSkill(gameState, 'navigation');
        const fuelCost = SystemUtils.getRequiredFuelCost(gameState, currentSystem, targetSystem, navigationLevel);
        const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
        const fuelAfter = totalFuel - fuelCost;
        const pilotingLevel = getMaxCrewSkill(gameState, 'piloting');
        const durationDays = Ship.calculateFleetTravelDuration(distance, gameState.ships, pilotingLevel);
        
        // Calculate date after journey
        const dateAfter = new Date(gameState.date);
        dateAfter.setDate(dateAfter.getDate() + Math.ceil(durationDays));
        
        // Check if target system is visited
        const targetSystemIndex = gameState.systems.indexOf(targetSystem);
        const isVisited = gameState.visitedSystems.includes(targetSystemIndex);
        
        // Calculate encounter weight ranges along journey
        let pirateWeightRange = '?';
        let policeWeightRange = '?';
        let merchantWeightRange = '?';
        let smugglersWeightRange = '?';
        let soldiersWeightRange = '?';
        let alienWeightRange = '0';
        let showAlienWeight = false;
        
        if (isVisited) {
            // Show range between current and target system
            const minPirate = Math.min(currentSystem.pirateWeight, targetSystem.pirateWeight).toFixed(1);
            const maxPirate = Math.max(currentSystem.pirateWeight, targetSystem.pirateWeight).toFixed(1);
            pirateWeightRange = `${minPirate} - ${maxPirate}`;
            
            const minPolice = Math.min(currentSystem.policeWeight, targetSystem.policeWeight).toFixed(1);
            const maxPolice = Math.max(currentSystem.policeWeight, targetSystem.policeWeight).toFixed(1);
            policeWeightRange = `${minPolice} - ${maxPolice}`;
            
            const minMerchant = Math.min(currentSystem.merchantWeight, targetSystem.merchantWeight).toFixed(1);
            const maxMerchant = Math.max(currentSystem.merchantWeight, targetSystem.merchantWeight).toFixed(1);
            merchantWeightRange = `${minMerchant} - ${maxMerchant}`;
            
            const minSmugglers = Math.min(currentSystem.smugglersWeight, targetSystem.smugglersWeight).toFixed(1);
            const maxSmugglers = Math.max(currentSystem.smugglersWeight, targetSystem.smugglersWeight).toFixed(1);
            smugglersWeightRange = `${minSmugglers} - ${maxSmugglers}`;
            
            const minSoldiers = Math.min(currentSystem.soldiersWeight, targetSystem.soldiersWeight).toFixed(1);
            const maxSoldiers = Math.max(currentSystem.soldiersWeight, targetSystem.soldiersWeight).toFixed(1);
            soldiersWeightRange = `${minSoldiers} - ${maxSoldiers}`;
            
            // Alien weight if target is conquered, otherwise use proximity-based weights
            if (targetSystem.conqueredByAliens) {
                alienWeightRange = ALIENS_ENCOUNTER_WEIGHT.toFixed(1);
                showAlienWeight = true;
            } else {
                const minAlien = Math.min(currentSystem.alienWeight || 0, targetSystem.alienWeight || 0).toFixed(1);
                const maxAlien = Math.max(currentSystem.alienWeight || 0, targetSystem.alienWeight || 0).toFixed(1);
                alienWeightRange = `${minAlien} - ${maxAlien}`;
                showAlienWeight = (parseFloat(maxAlien) > 0);
            }
        } else {
            // Only know current system weights
            pirateWeightRange = `${currentSystem.pirateWeight.toFixed(1)} - ?`;
            policeWeightRange = `${currentSystem.policeWeight.toFixed(1)} - ?`;
            merchantWeightRange = `${currentSystem.merchantWeight.toFixed(1)} - ?`;
            smugglersWeightRange = `${currentSystem.smugglersWeight.toFixed(1)} - ?`;
            soldiersWeightRange = `${currentSystem.soldiersWeight.toFixed(1)} - ?`;
            
            // Alien weight if target is conquered, otherwise use current system proximity
            if (targetSystem.conqueredByAliens) {
                alienWeightRange = ALIENS_ENCOUNTER_WEIGHT.toFixed(1);
                showAlienWeight = true;
            } else {
                const currentAlien = (currentSystem.alienWeight || 0).toFixed(1);
                alienWeightRange = `${currentAlien} - ?`;
                showAlienWeight = (parseFloat(currentAlien) > 0);
            }
        }
        
        // Draw title
        UI.addTitleLineCentered(0, 'Travel Confirmation');
        
        // Two-column layout
        const leftColumnX = 5;
        const rightColumnX = 42;
        const startY = 2;
        
        // Left column: Journey details
        let leftY = UI.addHeaderLine(leftColumnX, startY, 'Journey Details');
        const isTargetHabited = SystemUtils.isHabitedSystem(targetSystem);
        const fuelLabel = isTargetHabited ? 'Fuel Cost:' : 'Fuel Required:';
        leftY = TableRenderer.renderKeyValueList(leftColumnX, leftY, [
            { label: 'From:', value: currentSystem.name, valueColor: COLORS.TEXT_NORMAL },
            { label: 'To:', value: targetSystem.name, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Distance:', value: `${distance.toFixed(1)} LY`, valueColor: COLORS.TEXT_NORMAL },
            { label: fuelLabel, value: `${fuelCost} / ${totalFuel}`, valueColor: fuelAfter >= 0 ? COLORS.TEXT_NORMAL : COLORS.TEXT_ERROR },
            { label: 'Fuel After:', value: String(fuelAfter), valueColor: fuelAfter >= 0 ? COLORS.TEXT_NORMAL : COLORS.TEXT_ERROR },
            { label: 'Duration:', value: `${durationDays.toFixed(1)} days`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Current Date:', value: formatDate(gameState.date), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Arrival Date:', value: formatDate(dateAfter), valueColor: COLORS.TEXT_NORMAL }
        ]);
        
        // Right column: Encounter probability
        let rightY = UI.addHeaderLine(rightColumnX, startY, 'Encounter Probability');
        
        // Calculate average weights for color coding
        const avgPirateWeight = (currentSystem.pirateWeight + (isVisited ? targetSystem.pirateWeight : currentSystem.pirateWeight)) / 2;
        const avgPoliceWeight = (currentSystem.policeWeight + (isVisited ? targetSystem.policeWeight : currentSystem.policeWeight)) / 2;
        const avgMerchantWeight = (currentSystem.merchantWeight + (isVisited ? targetSystem.merchantWeight : currentSystem.merchantWeight)) / 2;
        const avgSmugglersWeight = (currentSystem.smugglersWeight + (isVisited ? targetSystem.smugglersWeight : currentSystem.smugglersWeight)) / 2;
        const avgSoldiersWeight = (currentSystem.soldiersWeight + (isVisited ? targetSystem.soldiersWeight : currentSystem.soldiersWeight)) / 2;
        
        // Pirates: 2x weight = 0.5x ratio (bad), Police/Merchants: 2x weight = 2x ratio (good)
        const pirateColor = UI.calcStatColor(1 / Math.max(0.5, avgPirateWeight));
        const policeColor = COLORS.WHITE // UI.calcStatColor(avgPoliceWeight); //police dont actually do anything good for the player per-se
        const merchantColor = UI.calcStatColor(avgMerchantWeight);
        const smugglersColor = UI.calcStatColor(avgSmugglersWeight);
        const soldiersColor = COLORS.WHITE;
        
        const encounterList = [
            { label: 'Pirates:', value: pirateWeightRange, valueColor: pirateColor },
            { label: 'Police:', value: policeWeightRange, valueColor: policeColor },
            { label: 'Merchants:', value: merchantWeightRange, valueColor: merchantColor },
            { label: 'Smugglers:', value: smugglersWeightRange, valueColor: smugglersColor },
            { label: 'Soldiers:', value: soldiersWeightRange, valueColor: soldiersColor }
        ];
        
        // Add alien encounters if there is any chance
        if (showAlienWeight) {
            encounterList.push({ label: 'Alien Skirmish:', value: alienWeightRange, valueColor: COLORS.TEXT_ERROR });
        }
        
        rightY = TableRenderer.renderKeyValueList(rightColumnX, rightY, encounterList);
        rightY++;
        
        if (!isVisited) {
            UI.addText(rightColumnX, rightY++, 'Unvisited system -', COLORS.YELLOW);
            UI.addText(rightColumnX, rightY++, 'exact rates unknown', COLORS.YELLOW);
            rightY++;
        }
        
        // Calculate where to place warnings (below both columns)
        const warningY = Math.max(leftY, rightY) + 1;
        let currentWarningY = warningY;
        
        // Alien occupation warning (centered below both columns)
        if (targetSystem.conqueredByAliens) {
            const centerX = 5;
            UI.addText(centerX, currentWarningY++, '╔══════════════════════════════════════════════════════════════════════╗', COLORS.TEXT_ERROR);
            UI.addText(centerX, currentWarningY++, '║                    ☢  WARNING: ALIEN OCCUPATION  ☢                  ║', COLORS.TEXT_ERROR);
            UI.addText(centerX, currentWarningY++, '╚══════════════════════════════════════════════════════════════════════╝', COLORS.TEXT_ERROR);
            currentWarningY++;
            UI.addText(centerX, currentWarningY++, 'This system is under alien control! Expect fierce resistance from hostile', COLORS.TEXT_ERROR);
            UI.addText(centerX, currentWarningY++, 'defenders. Alien skirmishes are highly likely during approach and landing.', COLORS.TEXT_ERROR);
            currentWarningY++;
        }
        
        // Uninhabited system note
        if (!isTargetHabited) {
            const centerX = 5;
            UI.addText(centerX, currentWarningY++, 'Uninhabited system: must have fuel for return journey.', COLORS.YELLOW);
            currentWarningY++;
        }

        // Insufficient fuel warning
        if (fuelAfter < 0) {
            const centerX = 5;
            UI.addText(centerX, currentWarningY++, 'WARNING: Insufficient fuel for journey!', COLORS.TEXT_ERROR);
            currentWarningY++;
        }
        
        // Buttons - centered at bottom
        const buttonY = grid.height - 5;
        
        if (fuelAfter >= 0) {
            UI.addCenteredButton(buttonY, '1', 'Launch', () => {
                SpaceTravelMap.show(gameState, targetSystem);
            }, COLORS.GREEN);
        }
        
        UI.addCenteredButton(buttonY + 1, '0', 'Cancel', () => {
            GalaxyMap.show(gameState);
        }, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Format date for display
     * @param {Date} date 
     * @returns {string}
     */
    function formatDate(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    /**
     * Get maximum skill level from all crew members (captain + subordinates)
     * @param {GameState} gameState
     * @param {string} skillName
     * @returns {number}
     */
    function getMaxCrewSkill(gameState, skillName) {
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
    
    return {
        show
    };
})();
