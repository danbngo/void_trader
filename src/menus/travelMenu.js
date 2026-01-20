/**
 * Travel Menu
 * Shows progress bar and handles encounters during travel
 */

const TravelMenu = (() => {
    let progress = 0;
    let paused = false;
    let encounterTriggered = false;
    let currentGameState = null;
    let targetSystem = null;
    let totalDuration = 0;
    let elapsedDays = 0;
    let encounterType = null;
    
    /**
     * Show the travel menu
     * @param {GameState} gameState - Current game state
     * @param {StarSystem} destination - Destination star system
     */
    function show(gameState, destination) {
        UI.clear();
        UI.resetSelection();
        
        // Initialize travel state
        currentGameState = gameState;
        targetSystem = destination;
        progress = 0;
        paused = false;
        encounterTriggered = false;
        encounterType = null;
        
        const currentSystem = gameState.getCurrentSystem();
        const distance = currentSystem.distanceTo(destination);
        const activeShip = gameState.ship;
        
        // Calculate duration based on engine level
        // Engine level of AVERAGE_SHIP_ENGINE_LEVEL means normal speed
        // Higher engine = faster travel
        const engineMultiplier = AVERAGE_SHIP_ENGINE_LEVEL / activeShip.engine;
        totalDuration = distance * AVERAGE_JOURNEY_DAYS_PER_LY * engineMultiplier;
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
        UI.addTextCentered(2, 'In Transit', COLORS.TITLE);
        
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
        
        // Journey info
        UI.addText(5, y++, `From: ${currentSystem.name}`, COLORS.TEXT_DIM);
        UI.addText(5, y++, `To: ${targetSystem.name}`, COLORS.TEXT_DIM);
        y++;
        
        UI.addText(5, y++, `Start Date: ${formatDate(startDate)}`, COLORS.TEXT_DIM);
        UI.addText(5, y++, `ETA: ${formatDate(eta)}`, COLORS.TEXT_DIM);
        y++;
        
        const totalFuel = Ship.calculateFleetFuelCost(currentSystem.distanceTo(targetSystem), currentGameState.ships.length);
        UI.addText(5, y++, `Fuel Used: ${fuelConsumed}/${totalFuel}`, fuelRemaining > 0 ? COLORS.TEXT_NORMAL : COLORS.TEXT_ERROR);
        y++;
        
        // Days elapsed
        UI.addText(5, y++, `Days Elapsed: ${elapsedDays.toFixed(1)} / ${totalDuration.toFixed(1)}`, COLORS.TEXT_NORMAL);
        y++;
        
        // Progress bar
        const barWidth = Math.floor(grid.width * 0.6);
        const barX = Math.floor((grid.width - barWidth) / 2);
        const filledWidth = Math.floor(barWidth * progress);
        
        UI.addText(barX, y, '[', COLORS.TEXT_NORMAL);
        UI.addText(barX + barWidth + 1, y, ']', COLORS.TEXT_NORMAL);
        
        for (let i = 0; i < filledWidth; i++) {
            UI.addText(barX + 1 + i, y, '=', COLORS.CYAN);
        }
        
        y += 2;
        
        // Progress percentage
        UI.addTextCentered(y++, `${(progress * 100).toFixed(1)}% complete`, COLORS.TEXT_DIM);
        y++;
        
        // Encounter output row
        if (encounterTriggered && encounterType) {
            y++;
            UI.addText(5, y++, `Alert: ${encounterType.name} Detected!`, COLORS.YELLOW);
            //UI.addText(5, y++, encounterType.description, COLORS.TEXT_NORMAL);
            y++;
            
            UI.addButton(5, y++, '1', 'Continue', () => {
                // Call the encounter type's onGreet function
                if (encounterType.onGreet) {
                    encounterType.onGreet(currentGameState, encounterType);
                } else {
                    // Fallback to decision menu if no onGreet defined
                    EncounterDecisionMenu.show(currentGameState, encounterType);
                }
            }, COLORS.GREEN);
        } else if (paused) {
            UI.addText(5, y++, 'Journey paused...', COLORS.TEXT_DIM);
        }
        
        UI.draw();
    }
    
    /**
     * Start the travel tick loop
     */
    function startTravelTick() {
        const tickInterval = 100; // milliseconds
        const progressPerTick = 0.04; // 4% per tick (2x faster progress)
        
        const interval = setInterval(() => {
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
                clearInterval(interval);
                completeJourney();
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
        
        // Set encounter flag
        currentGameState.encounter = true;
        
        render();
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
        const totalCargoCapacity = currentGameState.encounterShips.reduce((sum, ship) => sum + ship.maxCargo, 0);
        const cargoRatio = ENEMY_MIN_CARGO_RATIO + Math.random() * (ENEMY_MAX_CARGO_RATIO - ENEMY_MIN_CARGO_RATIO);
        const totalCargoAmount = Math.floor(totalCargoCapacity * cargoRatio);
        
        // Initialize encounter cargo with random cargo types
        currentGameState.encounterCargo = {};
        if (totalCargoAmount > 0) {
            const cargoTypes = Object.keys(CARGO_TYPES);
            const numCargoTypes = Math.floor(Math.random() * Math.min(3, cargoTypes.length)) + 1;
            
            // Select random cargo types
            const selectedTypes = [];
            for (let i = 0; i < numCargoTypes; i++) {
                const randomType = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
                if (!selectedTypes.includes(randomType)) {
                    selectedTypes.push(randomType);
                }
            }
            
            // Distribute cargo amount among selected types
            let remainingAmount = totalCargoAmount;
            selectedTypes.forEach((type, index) => {
                if (index === selectedTypes.length - 1) {
                    // Last type gets remaining amount
                    currentGameState.encounterCargo[type] = remainingAmount;
                } else {
                    // Random distribution
                    const amount = Math.floor(Math.random() * remainingAmount);
                    currentGameState.encounterCargo[type] = amount;
                    remainingAmount -= amount;
                }
            });
        }
    }
    
    /**
     * Complete the journey
     */
    function completeJourney() {
        const currentSystem = currentGameState.getCurrentSystem();
        const distance = currentSystem.distanceTo(targetSystem);
        const fleetFuelCost = Ship.calculateFleetFuelCost(distance, currentGameState.ships.length);
        
        // Consume fuel proportionally from all ships based on their current fuel
        const totalFuel = currentGameState.ships.reduce((sum, ship) => sum + ship.fuel, 0);
        let remainingCost = fleetFuelCost;
        
        currentGameState.ships.forEach(ship => {
            const shipFuelProportion = ship.fuel / totalFuel;
            const shipFuelCost = Math.min(ship.fuel, Math.ceil(fleetFuelCost * shipFuelProportion));
            ship.fuel -= shipFuelCost;
            remainingCost -= shipFuelCost;
        });
        
        // Handle any remaining fuel cost due to rounding (subtract from ship with most fuel)
        if (remainingCost > 0) {
            const shipWithMostFuel = currentGameState.ships.reduce((max, ship) => ship.fuel > max.fuel ? ship : max);
            shipWithMostFuel.fuel = Math.max(0, shipWithMostFuel.fuel - remainingCost);
        }
        
        // Advance date
        currentGameState.date.setDate(currentGameState.date.getDate() + Math.ceil(totalDuration));
        
        // Move to target system
        const targetIndex = currentGameState.systems.indexOf(targetSystem);
        currentGameState.setCurrentSystem(targetIndex);
        
        // Go to dock menu at destination
        DockMenu.show(currentGameState);
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
        
        // Resume travel
        paused = false;
        render();
    }
    
    return {
        show,
        resume
    };
})();
