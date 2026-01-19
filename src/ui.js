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
    
    // Button system
    let buttons = {};
    let keyListener = null;
    let redrawCallback = null;
    
    // Track drawn character positions to detect overwrites
    let drawnPositions = new Set();
    
    // Track actual text content for debugging
    let drawnContent = [];
    
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
        
        // Redraw current screen if callback is set
        if (redrawCallback) {
            redrawCallback();
        }
    }
    
    /**
     * Set a callback function to redraw the current screen after resize
     * @param {Function} callback - Function to call after canvas resize
     */
    function setRedrawCallback(callback) {
        redrawCallback = callback;
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
            
            // Check if this key has a button assigned
            if (buttons[key]) {
                e.preventDefault();
                buttons[key]();
            }
        };
        
        document.addEventListener('keydown', keyListener);
    }
    
    /**
     * Clear the entire canvas
     */
    function clearAll() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawnPositions.clear();
        drawnContent = [];
    }
    
    /**
     * Add text at grid position (x, y) with specified color
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
                // If we can't even fit "...", just fit what we can
                text = text.substring(0, maxLength);
            } else {
                // Truncate and add ellipsis
                text = text.substring(0, maxLength - 3) + '...';
            }
        }
        
        // Check for overwrites - each character in the text string
        for (let i = 0; i < text.length; i++) {
            const posKey = `${x + i},${y}`;
            if (drawnPositions.has(posKey)) {
                console.warn(`addText: overwriting character at position (${x + i}, ${y}). Text: "${text}"`);
            }
        }
        
        // Clear the area before drawing to prevent visual artifacts
        const pixelX = x * charWidth;
        const pixelY = y * charHeight;
        const textWidth = text.length * charWidth;
        ctx.fillStyle = 'black';
        ctx.fillRect(pixelX, pixelY, textWidth, charHeight);
        
        // Mark positions as drawn
        for (let i = 0; i < text.length; i++) {
            drawnPositions.add(`${x + i},${y}`);
        }
        //Record the text content for debugging
        drawnContent.push({ x, y, text, color });
        
        // 
        // Draw the text
        ctx.fillStyle = color;
        ctx.fillText(text, pixelX, pixelY);
    }
    
    /**
     * Add centered text at specified y position
     * @param {number} y - Grid Y position (0 to GRID_HEIGHT-1)
     * @param {string} text - Text to render
     * @param {string} color - CSS color string (default: white)
     */
    function addTextCentered(y, text, color = 'white') {
        const x = Math.floor((GRID_WIDTH - text.length) / 2);
        addText(x, y, text, color);
    }
    
    /**
     * Add a button at grid position
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
        
        // Store the callback
        buttons[key] = callback;
        
        // Render the button
        addText(x, y, `[${key}]`, color);
        addText(x + 4, y, label, 'white');
    }
    
    /**
     * Clear all buttons (removes all key bindings)
     */
    function clearButtons() {
        buttons = {};
    }
    
    /**
     * Setup multiple buttons at once
     * @param {Array} buttonConfigs - Array of button configurations
     * Each config: { x, y, key, label, callback, color }
     * @param {number} startX - Default X position if not specified in config
     * @param {number} startY - Default Y position if not specified in config
     */
    function setButtons(buttonConfigs, startX, startY) {
        clearButtons();
        let currentY = startY;
        
        buttonConfigs.forEach((config, index) => {
            const x = config.x !== undefined ? config.x : startX;
            const y = config.y !== undefined ? config.y : currentY;
            // Auto-generate key from index if not specified (1, 2, 3, ...)
            const key = config.key !== undefined ? config.key : String(index + 1);
            
            addButton(
                x,
                y,
                key,
                config.label,
                config.callback,
                config.color || 'cyan'
            );
            
            // Only increment Y if using auto-positioning
            if (config.y === undefined && startY !== undefined) {
                currentY += 1; // Space buttons 1 row apart
            }
        });
    }
    
    /**
     * Get grid dimensions
     */
    function getGridSize() {
        return { width: GRID_WIDTH, height: GRID_HEIGHT };
    }
    
    /**
     * Debug function to print current screen content as ASCII
     */
    function debugUI() {
        // Create a 2D array to represent the screen
        const screen = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            screen[y] = new Array(GRID_WIDTH).fill(' ');
        }
        
        // Fill in the screen with actual text content
        drawnContent.forEach(item => {
            const { x, y, text } = item;
            for (let i = 0; i < text.length; i++) {
                if (x + i >= 0 && x + i < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                    screen[y][x + i] = text[i];
                }
            }
        });
        
        // Build the output string
        let output = '\n┌' + '─'.repeat(GRID_WIDTH) + '┐\n';
        for (let y = 0; y < GRID_HEIGHT; y++) {
            output += '│' + screen[y].join('') + '│\n';
        }
        output += '└' + '─'.repeat(GRID_WIDTH) + '┘\n';
        output += `Grid: ${GRID_WIDTH}x${GRID_HEIGHT}, Text items: ${drawnContent.length}, Drawn positions: ${drawnPositions.size}`;
        
        console.log(output);
    }
    
    // Public API
    return {
        init,
        clearAll,
        addText,
        addTextCentered,
        addButton,
        clearButtons,
        setButtons,
        setRedrawCallback,
        getGridSize,
        debugUI
    };
})();
