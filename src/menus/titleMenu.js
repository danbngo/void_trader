/**
 * Title Menu
 * Main menu screen for Void Trader
 */

const TitleMenu = (() => {
    /**
     * Show the title screen
     */
    function show() {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const centerX = Math.floor(grid.width / 2);
        
        // Title
        UI.addTextCentered(5, 'V O I D   T R A D E R', COLORS.TITLE);
        UI.addTextCentered(7, 'A Text-Based Space Trading Game', COLORS.TEXT_DIM);
        
        // Menu buttons
        const menuX = centerX - 10;
        const menuY = 12;
        
        UI.addButton(menuX, menuY, '1', 'New Game', () => newGame(), COLORS.BUTTON, 'Start a new adventure');
        UI.addButton(menuX, menuY + 1, '2', 'Load Game', () => LoadMenu.show(() => TitleMenu.show()), COLORS.BUTTON, 'Load a previously saved game');
        UI.addButton(menuX, menuY + 2, '3', 'About', () => showAbout(), COLORS.BUTTON, 'Learn about the game');
        
        // Footer
        UI.addTextCentered(grid.height - 2, '(Use arrow keys or numbers to select)', COLORS.TEXT_DIM);
        
        // Draw everything
        UI.draw();
    }
    
    /**
     * Start a new game
     */
    function newGame() {
        UI.clear();
        const grid = UI.getGridSize();
        const centerY = Math.floor(grid.height / 2);
        
        UI.addTextCentered(centerY, 'Initializing new game...', COLORS.TEXT_SUCCESS);
        UI.draw();
        UI.draw();
        
        // Initialize game state
        setTimeout(() => {
            // Create game state
            const gameState = new GameState();
            
            // Generate 100 star systems
            // Generate systems
            const numSystems = Math.floor(Math.random() * (MAX_NUM_SYSTEMS - MIN_NUM_SYSTEMS + 1)) + MIN_NUM_SYSTEMS;
            gameState.systems = SystemGenerator.generateMany(numSystems);
            
            // Place player at system with most neighbors within 10ly
            let bestSystemIndex = 0;
            let maxNeighbors = 0;
            
            gameState.systems.forEach((system, index) => {
                // Count neighbors within 10ly
                let neighborCount = 0;
                gameState.systems.forEach((otherSystem, otherIndex) => {
                    if (index !== otherIndex) {
                        const distance = system.distanceTo(otherSystem);
                        if (distance <= 10) {
                            neighborCount++;
                        }
                    }
                });
                
                // Update best system if this one has more neighbors
                if (neighborCount > maxNeighbors) {
                    maxNeighbors = neighborCount;
                    bestSystemIndex = index;
                }
            });
            
            gameState.setCurrentSystem(bestSystemIndex);
            
            // Generate player ships and crew (2 ships for testing)
            gameState.ships.push(ShipGenerator.generateStartingShip());
            gameState.ships.push(ShipGenerator.generateStartingShip());
            gameState.activeShipIndex = 0;
            gameState.officers = OfficerGenerator.generateCrew(2);
            
            // Store game state globally for access
            window.gameState = gameState;
            
            // Show introduction screen
            IntroScreen.show(gameState);
        }, 500);
    }
    
    /**
     * Show about screen
     */
    function showAbout() {
        UI.clear();
        const grid = UI.getGridSize();
        
        UI.addTextCentered(8, 'V O I D   T R A D E R', COLORS.TITLE);
        UI.addTextCentered(11, 'A text-based space trading adventure', COLORS.TEXT_NORMAL);
        UI.addTextCentered(13, 'Navigate the cosmos, trade goods, and', COLORS.TEXT_NORMAL);
        UI.addTextCentered(14, 'build your interstellar trading empire.', COLORS.TEXT_NORMAL);
        
        UI.addTextCentered(17, 'Controls: Number keys', COLORS.BUTTON);
        UI.addTextCentered(18, 'Version: 0.1.0', COLORS.TEXT_DIM);
        
        const buttonX = Math.floor(grid.width / 2) - 10;
        UI.addButton(buttonX, 22, '1', 'Back to Title', () => show(), COLORS.BUTTON);
        
        UI.draw();
    }
    
    // Public API
    return {
        show
    };
})();
