/**
 * UI Module - Handles canvas rendering and keyboard input
 * Uses a character grid system for consistent rendering across resolutions
 */

const UI = (() => {
    // Configuration
    const GRID_WIDTH = 60;  // Characters wide
    const GRID_HEIGHT = 30; // Characters tall
    const FONT_FAMILY = 'Courier New, monospace';
    const MIN_FONT_SIZE = 12;   // Minimum font size in pixels
    const MAX_FONT_SIZE = 32;  // Maximum font size in pixels
    
    let canvas = null;
    let ctx = null;
    let charWidth = 0;
    let charHeight = 0;
    
    // Registered UI elements (registration phase)
    let registeredTexts = [];
    let registeredButtons = [];
    let selectedButtonIndex = 0;
    let keyListener = null;
    
    // Debounce timer for resize
    let resizeTimeout = null;
    
    /**
     * Initialize the UI system
     */
    function init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        
        // Set canvas to fill window
        resizeCanvas();
        window.addEventListener('resize', debouncedResize);
        
        // Setup keyboard listener
        setupKeyListener();
    }
    
    /**
     * Debounced resize handler
     */
    function debouncedResize() {
        // Clear existing timeout
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        
        // Set new timeout to resize after 150ms of no resize events
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
        }, 150);
    }
    
    /**
     * Resize canvas and recalculate character dimensions
     */
    function resizeCanvas() {
        // Calculate the aspect ratio for our character grid
        const gridAspect = GRID_WIDTH / GRID_HEIGHT;
        const windowAspect = window.innerWidth / window.innerHeight;
        
        let canvasWidth, canvasHeight;
        
        // Fit grid to window while preserving aspect ratio (letterbox/pillarbox)
        if (windowAspect > gridAspect) {
            // Window is wider - pillarbox (black bars on sides)
            canvasHeight = window.innerHeight;
            canvasWidth = canvasHeight * gridAspect;
        } else {
            // Window is taller - letterbox (black bars top/bottom)
            canvasWidth = window.innerWidth;
            canvasHeight = canvasWidth / gridAspect;
        }
        
        // Calculate initial character dimensions
        let tempCharHeight = canvasHeight / GRID_HEIGHT;
        
        // Calculate font size with min/max constraints
        let fontSize = Math.floor(tempCharHeight * 0.9);
        fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize));
        
        // Calculate actual character dimensions based on final font size
        charHeight = fontSize / 0.9;
        charWidth = fontSize * 0.6; // Monospace width approximation
        
        // Recalculate canvas size based on actual character dimensions
        // This ensures the grid fits perfectly even when font is capped
        canvasWidth = charWidth * GRID_WIDTH;
        canvasHeight = charHeight * GRID_HEIGHT;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Center canvas in window
        canvas.style.position = 'absolute';
        canvas.style.left = `${(window.innerWidth - canvasWidth) / 2}px`;
        canvas.style.top = `${(window.innerHeight - canvasHeight) / 2}px`;
        
        // Set font
        ctx.font = `${fontSize}px ${FONT_FAMILY}`;
        ctx.textBaseline = 'top';
        
        // Redraw registered elements
        draw();
    }
    
    /**
     * Setup keyboard event listener
     */
    function setupKeyListener() {
        if (keyListener) {
            document.removeEventListener('keydown', keyListener);
        }
        
        keyListener = (e) => {
            const key = e.key;
            
            // Handle button navigation
            if (key === 'ArrowDown' || key === 'ArrowRight' || key === 'Tab') {
                e.preventDefault();
                if (registeredButtons.length > 0) {
                    selectedButtonIndex = (selectedButtonIndex + 1) % registeredButtons.length;
                    draw(); // Redraw with new selection
                }
                return;
            }
            
            if (key === 'ArrowUp' || key === 'ArrowLeft') {
                e.preventDefault();
                if (registeredButtons.length > 0) {
                    selectedButtonIndex = (selectedButtonIndex - 1 + registeredButtons.length) % registeredButtons.length;
                    draw(); // Redraw with new selection
                }
                return;
            }
            
            // Handle button activation
            if (key === 'Enter' || key === ' ') {
                e.preventDefault();
                if (registeredButtons.length > 0 && registeredButtons[selectedButtonIndex]) {
                    registeredButtons[selectedButtonIndex].callback();
                }
                return;
            }
            
            // Check if this key has a button assigned (direct access)
            const button = registeredButtons.find(btn => btn.key === key);
            if (button) {
                e.preventDefault();
                button.callback();
            }
        };
        
        document.addEventListener('keydown', keyListener);
    }
    
    /**
     * Clear all registered UI elements and reset selection
     */
    function clear() {
        registeredTexts = [];
        registeredButtons = [];
        selectedButtonIndex = 0;
    }
    
    /**
     * Register text at grid position (registration phase - doesn't render yet)
     * @param {number} x - Grid X position (0 to GRID_WIDTH-1)
     * @param {number} y - Grid Y position (0 to GRID_HEIGHT-1)
     * @param {string} text - Text to render
     * @param {string} color - CSS color string (default: white)
     */
    function addText(x, y, text, color = 'white') {
        // Bounds checking
        if (x < 0 || x >= GRID_WIDTH) {
            throw new Error(`addText: x position ${x} is out of bounds (0-${GRID_WIDTH-1})`);
        }
        if (y < 0 || y >= GRID_HEIGHT) {
            throw new Error(`addText: y position ${y} is out of bounds (0-${GRID_HEIGHT-1})`);
        }
        
        // Truncate text if it extends beyond grid width
        if (x + text.length > GRID_WIDTH) {
            const maxLength = GRID_WIDTH - x;
            if (maxLength <= 3) {
                text = text.substring(0, maxLength);
            } else {
                text = text.substring(0, maxLength - 3) + '...';
            }
        }
        
        // Register the text
        registeredTexts.push({ x, y, text, color });
    }
    
    /**
     * Register centered text (registration phase)
     * @param {number} y - Grid Y position (0 to GRID_HEIGHT-1)
     * @param {string} text - Text to render
     * @param {string} color - CSS color string (default: white)
     */
    function addTextCentered(y, text, color = 'white') {
        const x = Math.floor((GRID_WIDTH - text.length) / 2);
        addText(x, y, text, color);
    }
    
    /**
     * Register a button (registration phase - doesn't render yet)
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {string} key - Key to press (e.g., '1', '2', '3')
     * @param {string} label - Button label text
     * @param {Function} callback - Function to call when button is pressed
     * @param {string} color - Color of the button text (default: cyan)
     */
    function addButton(x, y, key, label, callback, color = 'cyan') {
        // Bounds checking
        if (x < 0 || x >= GRID_WIDTH) {
            throw new Error(`addButton: x position ${x} is out of bounds (0-${GRID_WIDTH-1})`);
        }
        if (y < 0 || y >= GRID_HEIGHT) {
            throw new Error(`addButton: y position ${y} is out of bounds (0-${GRID_HEIGHT-1})`);
        }
        const buttonText = `[${key}] ${label}`;
        if (x + buttonText.length > GRID_WIDTH) {
            throw new Error(`addButton: button "${buttonText}" at x=${x} extends beyond grid width`);
        }
        
        // Custom color logic for specific button labels
        if (label === 'Assistant' || label === 'Options') {
            color = COLORS.TEXT_DIM;
        }
        
        // Register the button
        registeredButtons.push({ x, y, key, label, callback, color });
    }
    
    /**
     * Draw all registered UI elements to the canvas
     */
    function draw() {
        // Clear canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw all registered texts
        registeredTexts.forEach(item => {
            const pixelX = item.x * charWidth;
            const pixelY = item.y * charHeight;
            ctx.fillStyle = item.color;
            ctx.fillText(item.text, pixelX, pixelY);
        });
        
        // Draw all registered buttons
        registeredButtons.forEach((btn, index) => {
            const buttonText = `[${btn.key}] ${btn.label}`;
            const pixelX = btn.x * charWidth;
            const pixelY = btn.y * charHeight;
            const buttonWidth = buttonText.length * charWidth;
            const isSelected = (index === selectedButtonIndex);
            
            // Draw background if selected
            if (isSelected) {
                ctx.fillStyle = 'white';
                ctx.fillRect(pixelX, pixelY, buttonWidth, charHeight);
                ctx.fillStyle = 'black';
                ctx.fillText(buttonText, pixelX, pixelY);
            } else {
                // Draw colored key and white label
                ctx.fillStyle = btn.color;
                ctx.fillText(`[${btn.key}] `, pixelX, pixelY);
                ctx.fillStyle = 'white';
                ctx.fillText(`${btn.label}`, pixelX + (4 * charWidth), pixelY);
            }
        });
        
        // Debug output
        debugToConsole();
    }
    
    /**
     * Debug function to print current screen content to console
     */
    function debugToConsole() {
        // Create a 2D array to represent the screen
        const screen = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            screen[y] = new Array(GRID_WIDTH).fill(' ');
        }
        
        // Fill in texts
        registeredTexts.forEach(item => {
            for (let i = 0; i < item.text.length; i++) {
                if (item.x + i >= 0 && item.x + i < GRID_WIDTH && item.y >= 0 && item.y < GRID_HEIGHT) {
                    screen[item.y][item.x + i] = item.text[i];
                }
            }
        });
        
        // Fill in buttons
        registeredButtons.forEach((btn, index) => {
            const buttonText = `[${btn.key}] ${btn.label}`;
            const isSelected = (index === selectedButtonIndex);
            const marker = isSelected ? '█' : ' ';
            
            for (let i = 0; i < buttonText.length; i++) {
                if (btn.x + i >= 0 && btn.x + i < GRID_WIDTH && btn.y >= 0 && btn.y < GRID_HEIGHT) {
                    screen[btn.y][btn.x + i] = buttonText[i];
                }
            }
            // Add selection marker
            if (isSelected && btn.x > 0) {
                screen[btn.y][btn.x - 1] = marker;
            }
        });
        
        // Build the output string
        let output = '\n┌' + '─'.repeat(GRID_WIDTH) + '┐\n';
        for (let y = 0; y < GRID_HEIGHT; y++) {
            output += '│' + screen[y].join('') + '│\n';
        }
        output += '└' + '─'.repeat(GRID_WIDTH) + '┘\n';
        output += `Texts: ${registeredTexts.length}, Buttons: ${registeredButtons.length}, Selected: ${selectedButtonIndex}`;
        
        console.log(output);
    }
    
    /**
     * Get grid dimensions
     */
    function getGridSize() {
        return { width: GRID_WIDTH, height: GRID_HEIGHT };
    }
    
    // Public API
    return {
        init,
        clear,
        addText,
        addTextCentered,
        addButton,
        draw,
        getGridSize
    };
})();
