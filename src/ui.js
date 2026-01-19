/**
 * UI Module - Handles canvas rendering and keyboard input
 * Uses a character grid system for consistent rendering across resolutions
 */

const UI = (() => {
    // Configuration
    const GRID_WIDTH = 80;  // Characters wide
    const GRID_HEIGHT = 30; // Characters tall
    const FONT_FAMILY = 'Courier New, monospace';
    
    let canvas = null;
    let ctx = null;
    let charWidth = 0;
    let charHeight = 0;
    
    // Button system
    let buttons = {};
    let keyListener = null;
    
    /**
     * Initialize the UI system
     */
    function init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        
        // Set canvas to fill window
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Setup keyboard listener
        setupKeyListener();
    }
    
    /**
     * Resize canvas and recalculate character dimensions
     */
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Calculate character size based on grid
        charWidth = canvas.width / GRID_WIDTH;
        charHeight = canvas.height / GRID_HEIGHT;
        
        // Use the smaller dimension to maintain aspect ratio
        const fontSize = Math.floor(Math.min(charWidth, charHeight) * 0.9);
        charWidth = fontSize * 0.6; // Monospace character width approximation
        charHeight = fontSize;
        
        // Set font
        ctx.font = `${fontSize}px ${FONT_FAMILY}`;
        ctx.textBaseline = 'top';
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
        if (x + text.length > GRID_WIDTH) {
            throw new Error(`addText: text "${text}" at x=${x} extends beyond grid width (${x + text.length} > ${GRID_WIDTH})`);
        }
        
        ctx.fillStyle = color;
        const pixelX = x * charWidth;
        const pixelY = y * charHeight;
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
                currentY += 2; // Space buttons 2 rows apart
            }
        });
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
        clearAll,
        addText,
        addTextCentered,
        addButton,
        clearButtons,
        setButtons,
        getGridSize
    };
})();
