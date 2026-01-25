/**
 * Travel Menu
 * Shows progress bar and handles encounters during travel
 */

const TravelMenu = (() => {
    let progress = 0;
    let paused = false;
    let encounterTriggered = false;
    let arrivedAtDestination = false;
    let currentGameState = null;
    let targetSystem = null;
    let totalDuration = 0;
    let elapsedDays = 0;
    let encounterType = null;
    let travelTickInterval = null;
    let shipFuelCosts = []; // Pre-calculated fuel cost for each ship
    
    /**
     * Show the travel menu
     * @param {GameState} gameState - Current game state
     * @param {StarSystem} destination - Destination star system
     */
    function show(gameState, destination) {
        UI.clear();
        UI.resetSelection();
        UI.clearOutputRow();
        
        // Initialize travel state
        currentGameState = gameState;
        targetSystem = destination;
        progress = 0;
        paused = false;
        encounterTriggered = false;
        arrivedAtDestination = false;
        encounterType = null;
        
        // Track where we departed from (for police surrender jail mechanic)
        gameState.previousSystemIndex = gameState.currentSystemIndex;
        
        // Restore shields to max at the start of journey
        gameState.ships.forEach(ship => {
            ship.shields = ship.maxShields;
        });
        
        const currentSystem = gameState.getCurrentSystem();
        const distance = currentSystem.distanceTo(destination);
        
        // Calculate fuel cost for the entire journey
        const totalFuelCost = Ship.calculateFleetFuelCost(distance, gameState.ships.length);
        const totalFuel = gameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
        
        // Pre-calculate how much fuel each ship will contribute
        // Each ship contributes proportionally based on its current fuel
        shipFuelCosts = [];
        if (totalFuel > 0) {
            let remainingCost = totalFuelCost;
            gameState.ships.forEach((ship, index) => {
                const shipProportion = ship.fuel / totalFuel;
                const shipCost = index === gameState.ships.length - 1 
                    ? remainingCost // Last ship gets remaining to handle rounding
                    : Math.min(ship.fuel, Math.ceil(totalFuelCost * shipProportion));
                shipFuelCosts.push(shipCost);
                remainingCost -= shipCost;
            });
        } else {
            // No fuel available
            gameState.ships.forEach(() => shipFuelCosts.push(0));
        }
        
        console.log('[TravelMenu] Pre-calculated fuel costs:', {
            totalFuelCost,
            totalFuel,
            shipFuelCosts,
            ships: gameState.ships.map(s => ({ name: s.name, fuel: s.fuel }))
        });
        
        // Use first ship for engine calculation (fleet moves together)
        const activeShip = gameState.ships[0];
        
        // Get max piloting skill from all crew
        const pilotingLevel = getMaxCrewSkill(currentGameState, 'piloting');
        
        // Calculate duration based on engine level
        // Engine level of AVERAGE_SHIP_ENGINE_LEVEL means normal speed
        // Higher engine = faster travel
        const engineMultiplier = AVERAGE_SHIP_ENGINE_LEVEL / activeShip.engine;
        const baseDuration = distance * AVERAGE_JOURNEY_DAYS_PER_LY * engineMultiplier;
        
        // Apply piloting skill to reduce travel time
        totalDuration = SkillEffects.getTravelDuration(baseDuration, pilotingLevel);
        elapsedDays = 0;
        
        // Start travel loop
        render();
        startTravelTick();
    }
    
    /**
     * Render the travel screen
     */
    function render() {
        UI.clear();
        
        const grid = UI.getGridSize();
        const currentSystem = currentGameState.getCurrentSystem();
        
        // Title
        UI.addTitleLineCentered(2, 'In Transit');
        
        let y = 5;
        
        // Calculate journey details
        const distance = currentSystem.distanceTo(targetSystem);
        const fuelConsumed = Ship.calculateFleetFuelCost(distance * progress, currentGameState.ships.length);
        const totalFuelAvailable = currentGameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
        const fuelRemaining = totalFuelAvailable - fuelConsumed;
        
        // Calculate dates
        const startDate = new Date(currentGameState.date);
        const eta = new Date(startDate);
        eta.setDate(eta.getDate() + Math.ceil(totalDuration));
        
        // Journey info using renderKeyValueList
        const totalFuel = Ship.calculateFleetFuelCost(currentSystem.distanceTo(targetSystem), currentGameState.ships.length);
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'From:', value: currentSystem.name, valueColor: COLORS.TEXT_NORMAL },
            { label: 'To:', value: targetSystem.name, valueColor: COLORS.TEXT_NORMAL },
        ]);
        y++;
        
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Start Date:', value: formatDate(startDate), valueColor: COLORS.TEXT_NORMAL },
            { label: 'ETA:', value: formatDate(eta), valueColor: COLORS.TEXT_NORMAL },
        ]);
        y++;
        
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Fuel Used:', value: `${fuelConsumed}/${totalFuel}`, valueColor: fuelRemaining > 0 ? COLORS.TEXT_NORMAL : COLORS.TEXT_ERROR },
        ]);
        y++;
        
        // Days elapsed
        y = TableRenderer.renderKeyValueList(5, y, [
            { label: 'Days Elapsed:', value: `${elapsedDays.toFixed(1)} / ${totalDuration.toFixed(1)}`, valueColor: COLORS.TEXT_NORMAL },
        ]);
        y++;
        
        // Progress bar with dynamic color
        const barWidth = Math.floor(grid.width * 0.6);
        // ProgressBar.render expects the CENTER X position
        const barCenterX = Math.floor(grid.width / 2);
        
        // Use ProgressBar utility for rendering
        const progressLabel = `${(progress * 100).toFixed(1)}% complete`;
        y = ProgressBar.render(barCenterX, y, progress, barWidth, progressLabel);
        y += 2;
        
        // Encounter output row - positioned near bottom
        const buttonY = grid.height - 3;
        
        if (encounterTriggered && encounterType) {
            // Flash between encounter color and white for emphasis
            const flashState = UI.getFlashState();
            const flashColor = flashState ? encounterType.color : COLORS.WHITE;
            console.log('[TravelMenu] Flashing alert:', {
                isFlashing: UI.isFlashing(),
                flashState: flashState,
                encounterTypeName: encounterType.name,
                encounterTypeColor: encounterType.color,
                flashColor: flashColor
            });
            const alertMessage = `Alert: ${encounterType.name} Detected!`;
            UI.setOutputRow(alertMessage, flashColor);
            
            UI.addCenteredButton(buttonY, '1', 'Continue', () => {
                // Check for undetected encounter (radar comparison)
                UndetectedEncounter.check(currentGameState, encounterType);
            }, COLORS.GREEN);
        } else if (arrivedAtDestination) {
            const arrivalMessage = `You have arrived at ${targetSystem.name}!`;
            UI.setOutputRow(arrivalMessage, COLORS.GREEN);
            
            UI.addCenteredButton(buttonY, '1', 'Continue', () => {
                completeJourney();
            }, COLORS.GREEN);
        } else if (paused) {
            UI.setOutputRow('Journey paused...', COLORS.TEXT_DIM);
        }
        
        UI.draw();
    }
    
    /**
     * Start the travel tick loop
     */
    function startTravelTick() {
        const tickInterval = 100; // milliseconds
        const progressPerTick = 0.04; // 4% per tick (2x faster progress)
        
        travelTickInterval = setInterval(() => {
            if (!paused && progress < 1.0) {
                // Update progress
                progress = Math.min(1.0, progress + progressPerTick);
                
                // Calculate elapsed days this tick
                const daysThisTick = totalDuration * progressPerTick;
                elapsedDays += daysThisTick;
                
                // Check for encounter
                if (!encounterTriggered) {
                    const encounterChance = AVERAGE_JOURNEY_ENCOUNTER_CHANCE_PER_DAY * daysThisTick;
                    
                    if (Math.random() < encounterChance) {
                        // Trigger encounter
                        paused = true;
                        encounterTriggered = true;
                        triggerEncounter();
                    }
                }
                
                render();
            }
            
            // Complete journey
            if (progress >= 1.0 && !encounterTriggered) {
                clearInterval(travelTickInterval);
                travelTickInterval = null;
                arrivedAtDestination = true;
                paused = true;
                render();
            }
        }, tickInterval);
    }
    
    /**
     * Trigger a random encounter
     */
    function triggerEncounter() {
        const currentSystem = currentGameState.getCurrentSystem();
        
        // Calculate weights (average of current and target)
        const avgPirateWeight = (currentSystem.pirateWeight + targetSystem.pirateWeight) / 2;
        const avgPoliceWeight = (currentSystem.policeWeight + targetSystem.policeWeight) / 2;
        const avgMerchantWeight = (currentSystem.merchantWeight + targetSystem.merchantWeight) / 2;
        
        // Total weight
        const totalWeight = avgPirateWeight + avgPoliceWeight + avgMerchantWeight;
        
        // Random selection based on weights
        const roll = Math.random() * totalWeight;
        
        if (roll < avgPirateWeight) {
            encounterType = ENCOUNTER_TYPES.PIRATE;
        } else if (roll < avgPirateWeight + avgPoliceWeight) {
            encounterType = ENCOUNTER_TYPES.POLICE;
        } else {
            encounterType = ENCOUNTER_TYPES.MERCHANT;
        }
        
        // Generate encounter ships
        generateEncounterShips();
        
        // Consume fuel for distance traveled so far
        consumeFuelForProgress();
        
        // Set encounter flag
        currentGameState.encounter = true;
        
        // Stop travel tick to prevent render() conflicts with flash animation
        if (travelTickInterval) {
            console.log('[TravelMenu] Clearing travel tick interval');
            clearInterval(travelTickInterval);
            travelTickInterval = null;
        }
        
        // Start flashing the alert for 2 seconds
        console.log('[TravelMenu] Starting flash animation for encounter:', encounterType.name);
        UI.startFlashing(() => {
            console.log('[TravelMenu] Flash callback triggered, calling render()');
            render();
        }, 200, 2000, true); // true = call callback immediately for first render
    }
    
    /**
     * Generate ships for the encounter
     */
    function generateEncounterShips() {
        currentGameState.encounterShips = [];
        
        if (!encounterType || !encounterType.shipTypes) {
            return;
        }
        
        // Generate 1-3 ships
        const numShips = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numShips; i++) {
            const randomShipType = encounterType.shipTypes[
                Math.floor(Math.random() * encounterType.shipTypes.length)
            ];
            
            const ship = ShipGenerator.generateShipOfType(randomShipType);
            
            // Optionally damage the ship
            if (Math.random() < ENEMY_SHIP_HULL_DAMAGED_CHANCE) {
                const hullRatio = ENEMY_DAMAGED_SHIP_MIN_HULL_RATIO + 
                    Math.random() * (ENEMY_DAMAGED_SHIP_MAX_HULL_RATIO - ENEMY_DAMAGED_SHIP_MIN_HULL_RATIO);
                ship.hull = Math.floor(ship.maxHull * hullRatio);
            }
            
            currentGameState.encounterShips.push(ship);
        }
        
        // Calculate total cargo capacity and generate encounter cargo
        const totalCargoCapacity = currentGameState.encounterShips.reduce((sum, ship) => sum + ship.cargoCapacity, 0);
        const cargoRatio = ENEMY_MIN_CARGO_RATIO + Math.random() * (ENEMY_MAX_CARGO_RATIO - ENEMY_MIN_CARGO_RATIO);
        const totalCargoAmount = Math.floor(totalCargoCapacity * cargoRatio);
        
        // Generate cargo (with retry logic for merchants)
        const maxRetries = encounterType.id === 'MERCHANT' ? 100 : 1;
        let retryCount = 0;
        let cargoGenerated = false;
        
        while (!cargoGenerated && retryCount < maxRetries) {
            retryCount++;
            currentGameState.encounterCargo = {};
            
            if (totalCargoAmount > 0) {
                const cargoTypes = Object.keys(CARGO_TYPES);
                
                // Try each cargo type with ENEMY_HAS_CARGO_TYPE_CHANCE probability
                cargoTypes.forEach(cargoTypeId => {
                    if (Math.random() < ENEMY_HAS_CARGO_TYPE_CHANCE) {
                        // This cargo type is included - give it a random amount
                        const amount = Math.floor(Math.random() * totalCargoAmount) + 1;
                        currentGameState.encounterCargo[cargoTypeId] = amount;
                    }
                });
            }
            
            // Check if we generated any cargo
            const hasAnyCargo = Object.values(currentGameState.encounterCargo).some(amount => amount > 0);
            
            // For merchants, keep trying until we get cargo. For others, accept even zero cargo.
            if (encounterType.id === 'MERCHANT') {
                cargoGenerated = hasAnyCargo;
            } else {
                cargoGenerated = true; // Accept whatever we got
            }
        }
        
        // Log cargo generation results
        console.log('[TravelMenu] Encounter cargo generated:', {
            encounterType: encounterType.id,
            retries: retryCount,
            totalCargoCapacity,
            totalCargoAmount,
            cargoRatio,
            encounterCargo: currentGameState.encounterCargo,
            hasAnyCargo: Object.values(currentGameState.encounterCargo).some(amount => amount > 0)
        });
    }
    
    /**
     * Complete the journey
     */
    function completeJourney() {
        // Deduct the pre-calculated fuel costs from each ship
        currentGameState.ships.forEach((ship, index) => {
            ship.fuel = Math.floor(Math.max(0, ship.fuel - shipFuelCosts[index]));
        });
        
        console.log('[TravelMenu] Journey complete, fuel deducted:', {
            shipFuelCosts,
            shipsAfter: currentGameState.ships.map(s => ({ name: s.name, fuel: s.fuel }))
        });
        
        // Apply engineering skill repairs during travel (use max from all crew)
        const engineeringLevel = getMaxCrewSkill(currentGameState, 'engineering');
        
        if (engineeringLevel > 0) {
            const repairResults = SkillEffects.applyEngineeringRepairs(
                currentGameState.ships, 
                engineeringLevel, 
                totalDuration
            );
            
            if (repairResults.repairsApplied > 0) {
                console.log('[TravelMenu] Engineering repairs applied:', repairResults);
                // Could add a message about repairs if desired
            }
        }
        
        // Advance date
        currentGameState.date.setDate(currentGameState.date.getDate() + Math.ceil(totalDuration));
        
        // Move to target system
        const targetIndex = currentGameState.systems.indexOf(targetSystem);
        currentGameState.setCurrentSystem(targetIndex);
        
        // Restore shields to max at the end of journey
        currentGameState.ships.forEach(ship => {
            ship.shields = ship.maxShields;
        });
        
        // Go to dock menu at destination
        DockMenu.show(currentGameState);
    }
    
    /**
     * Consume fuel based on current progress (used for encounters/defeats)
     */
    function consumeFuelForProgress() {
        // Deduct proportional fuel based on progress
        currentGameState.ships.forEach((ship, index) => {
            const fuelToConsume = shipFuelCosts[index] * progress;
            ship.fuel = Math.floor(Math.max(0, ship.fuel - fuelToConsume));
        });
        
        console.log('[TravelMenu] Consuming fuel for progress:', {
            progress,
            shipFuelCosts,
            fuelConsumed: shipFuelCosts.map((cost, i) => cost * progress),
            shipsAfter: currentGameState.ships.map(s => ({ name: s.name, fuel: s.fuel }))
        });
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
     * Resume travel after encounter
     */
    function resume() {
        // Clear encounter state
        currentGameState.encounter = false;
        currentGameState.encounterShips = [];
        currentGameState.encounterCargo = {};
        encounterTriggered = false;
        encounterType = null;
        
        // Reset selection to clear help text from previous menu
        UI.resetSelection();
        
        // Resume travel
        paused = false;
        
        // Restart travel tick interval if not already running
        if (!travelTickInterval) {
            startTravelTick();
        }
        
        render();
    }
    
    /**
     * Handle fuel consumption when towed back
     * Player is towed back to origin, but fuel is consumed based on progress made
     */
    function handleTowedBack() {
        // Consume fuel proportional to progress made before defeat
        consumeFuelForProgress();
        
        console.log('[TravelMenu] Towed back - fuel consumed for progress:', {
            progress,
            shipFuelCosts,
            fuelConsumed: shipFuelCosts.map((cost, i) => (cost * progress).toFixed(1))
        });
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
        show,
        resume,
        consumeFuelForProgress,
        handleTowedBack
    };
})();
