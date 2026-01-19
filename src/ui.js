/**
 * UI Module - Handles canvas rendering and keyboard input
 * Uses a character grid system for consistent rendering across resolutions
 */

const UI = (() => {
    // Configuration
    const GRID_WIDTH = 80;  // Characters wide
    const GRID_HEIGHT = 40; // Characters tall
    const FONT_FAMILY = 'Courier New, monospace';
    const MIN_FONT_SIZE = 16;   // Minimum font size in pixels
    const MAX_FONT_SIZE = 32;  // Maximum font size in pixels
    
    let canvas = null;
    let ctx = null;
    let charWidth = 0;
    let charHeight = 0;
    
    // Registered UI elements (registration phase)
    let registeredTexts = [];
    let registeredButtons = [];
    let registeredHighlights = []; // For table row selection highlights
    let registeredTableRows = []; // For clickable table rows
    let selectedButtonIndex = 0;
    let lastSelectedButtonIndex = -1; // Track last selection to detect changes
    let keyListener = null;
    
    // Output row state
    let outputRowText = '';
    let outputRowColor = 'white';
    let outputRowIsHelpText = false;
    
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
        
        // Setup mouse listener
        setupMouseListener();
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
        ctx.textBaseline = 'middle';
        
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

            if (key == 'Escape') {
                const zeroBtn = registeredButtons.find(btn => btn.key === '0');
                if (zeroBtn) {
                    e.preventDefault();
                    zeroBtn.callback();
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
     * Setup mouse event listener
     */
    function setupMouseListener() {
        // Mouse move for hover
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;
            
            // Convert pixel position to grid position
            const gridX = Math.floor(pixelX / charWidth);
            const gridY = Math.floor(pixelY / charHeight);
            
            // Check if hovering over any button
            let hoveredButtonIndex = -1;
            registeredButtons.forEach((btn, index) => {
                const buttonText = `[${btn.key}] ${btn.label}`;
                const buttonEndX = btn.x + buttonText.length;
                
                if (gridY === btn.y && gridX >= btn.x && gridX < buttonEndX) {
                    hoveredButtonIndex = index;
                }
            });
            
            // Update selection if hovering over a button
            if (hoveredButtonIndex !== -1 && hoveredButtonIndex !== selectedButtonIndex) {
                selectedButtonIndex = hoveredButtonIndex;
                draw();
            }
        });
        
        // Mouse click to activate button or table row
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;
            
            // Convert pixel position to grid position
            const gridX = Math.floor(pixelX / charWidth);
            const gridY = Math.floor(pixelY / charHeight);
            
            // Check if clicking on any button
            let clickedButton = false;
            registeredButtons.forEach((btn, index) => {
                const buttonText = `[${btn.key}] ${btn.label}`;
                const buttonEndX = btn.x + buttonText.length;
                
                if (gridY === btn.y && gridX >= btn.x && gridX < buttonEndX) {
                    btn.callback();
                    clickedButton = true;
                }
            });
            
            // If didn't click a button, check if clicking on a table row
            if (!clickedButton) {
                registeredTableRows.forEach((row) => {
                    if (gridY === row.y && gridX >= row.x && gridX < row.x + row.width) {
                        row.callback(row.index);
                    }
                });
            }
        });
        
        // Change cursor style when hovering over canvas
        canvas.style.cursor = 'default';
    }
    
    /**
     * Clear all registered UI elements (selection preserved if possible)
     */
    function clear() {
        registeredTexts = [];
        registeredButtons = [];
        registeredHighlights = [];
        registeredTableRows = [];
        // Clear output row state
        outputRowText = '';
        outputRowColor = 'white';
        outputRowIsHelpText = false;
        // Don't reset selectedButtonIndex - let draw() handle bounds checking
    }
    
    /**
     * Register text at grid position (registration phase - doesn't render yet)
     * @param {number} x - Grid X position (0 to GRID_WIDTH-1)
     * @param {number} y - Grid Y position (0 to GRID_HEIGHT-1)
     * @param {string} text - Text to render
     * @param {string} color - CSS color string (default: white)
     * @param {number} fontSize - Optional font size multiplier (default: 1.0)
     */
    function addText(x, y, text, color = 'white', fontSize = 1.0) {
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
        registeredTexts.push({ x, y, text, color, fontSize });
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
        if (label === 'Assistant' || label === 'Options' || label === 'Back') {
            color = COLORS.TEXT_DIM;
        }
        
        // Register the button
        registeredButtons.push({ x, y, key, label, callback, color, helpText: arguments[6] || '' });
    }
    
    /**
     * Register a selection highlight for table rows (white background)
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {number} width - Width in characters
     */
    function addSelectionHighlight(x, y, width) {
        registeredHighlights.push({ x, y, width });
    }
    
    /**
     * Draw all registered UI elements to the canvas
     */
    function draw() {
        // Validate selection index (reset if out of bounds)
        if (selectedButtonIndex >= registeredButtons.length) {
            selectedButtonIndex = 0;
        }
        
        // Clear canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw selection highlights first (under text)
        registeredHighlights.forEach(item => {
            const pixelX = item.x * charWidth;
            const pixelY = item.y * charHeight;
            const pixelWidth = item.width * charWidth;
            ctx.fillStyle = 'white';
            ctx.fillRect(pixelX, pixelY, pixelWidth, charHeight);
        });
        
        // Draw all registered texts
        registeredTexts.forEach(item => {
            const pixelX = item.x * charWidth;
            const pixelY = item.y * charHeight;
            const textWidth = item.text.length * charWidth;
            
            // Clear the area before drawing to prevent overlapping artifacts
            // BUT don't clear if text is black (selected text on white background)
            if (item.color !== 'black') {
                ctx.fillStyle = 'black';
                ctx.fillRect(pixelX, pixelY, textWidth, charHeight);
            }
            
            // Calculate font size based on multiplier
            const baseFontSize = Math.floor(charHeight * 0.9);
            const actualFontSize = Math.floor(baseFontSize * item.fontSize);
            ctx.font = `${actualFontSize}px ${FONT_FAMILY}`;
            
            // Draw the text (centered vertically in grid cell)
            ctx.fillStyle = item.color;
            ctx.fillText(item.text, pixelX, pixelY + charHeight / 2);
        });
        
        // Draw all registered buttons
        // Check if button selection changed
        const selectionChanged = selectedButtonIndex !== lastSelectedButtonIndex;
        if (selectionChanged) {
            lastSelectedButtonIndex = selectedButtonIndex;
            // Only clear output row if it was showing helpText
            if (outputRowIsHelpText) {
                outputRowText = '';
                outputRowColor = 'white';
                outputRowIsHelpText = false;
            }
        }
        
        registeredButtons.forEach((btn, index) => {
            const buttonText = `[${btn.key}] ${btn.label}`;
            const pixelX = btn.x * charWidth;
            const pixelY = btn.y * charHeight;
            const buttonWidth = buttonText.length * charWidth;
            const isSelected = (index === selectedButtonIndex);
            
            // Clear the area before drawing
            ctx.fillStyle = 'black';
            ctx.fillRect(pixelX, pixelY, buttonWidth, charHeight);
            
            // Draw background if selected
            if (isSelected) {
                ctx.fillStyle = 'white';
                ctx.fillRect(pixelX, pixelY, buttonWidth, charHeight);
                ctx.fillStyle = 'black';
                ctx.fillText(buttonText, pixelX, pixelY + charHeight / 2);
                
                // Show helpText if available, not forbidden, and either:
                // - Selection just changed (tab/arrow to new button should show its help), OR
                // - Output row is empty or already showing helpText
                if (
                    btn.helpText &&
                    !['Continue', 'Back'].includes(btn.label) &&
                    (selectionChanged || !outputRowText || outputRowIsHelpText)
                ) {
                    outputRowText = btn.helpText;
                    outputRowColor = 'aqua';
                    outputRowIsHelpText = true;
                }
            } else {
                // Draw colored key and white label
                ctx.fillStyle = btn.color;
                ctx.fillText(`[${btn.key}] `, pixelX, pixelY + charHeight / 2);
                ctx.fillStyle = 'white';
                ctx.fillText(`${btn.label}`, pixelX + (4 * charWidth), pixelY + charHeight / 2);
            }
        });
        
        // Draw output row (generalized)
        if (outputRowText) {
            const grid = getGridSize();
            // Find the minimum button Y position (topmost button)
            let minButtonY = grid.height - 3; // default if no buttons
            if (registeredButtons.length > 0) {
                minButtonY = Math.min(...registeredButtons.map(btn => btn.y));
            }
            // Position output row 2 rows above the topmost button
            const y = minButtonY - 2;
            const x = Math.floor((GRID_WIDTH - outputRowText.length) / 2);
            ctx.fillStyle = 'black';
            ctx.fillRect(x * charWidth, y * charHeight, outputRowText.length * charWidth, charHeight);
            ctx.fillStyle = outputRowColor;
            ctx.fillText(outputRowText, x * charWidth, y * charHeight + charHeight / 2);
        }
        
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
    
    /**
     * Reset button selection to first button (for entering new menus)
     */
    function resetSelection() {
        selectedButtonIndex = 0;
        lastSelectedButtonIndex = -1;
        // Only clear helpText, not action output
        if (outputRowIsHelpText) {
            outputRowText = '';
            outputRowColor = 'white';
            outputRowIsHelpText = false;
        }
    }
    
    /**
     * Set output row text (for action results, not helpText)
     * @param {string} text - Text to display
     * @param {string} color - Color of the text
     */
    function setOutputRow(text, color = 'white') {
        outputRowText = text;
        outputRowColor = color;
        outputRowIsHelpText = false;
    }
    
    /**
     * Clear output row
     */
    function clearOutputRow() {
        outputRowText = '';
        outputRowColor = 'white';
        outputRowIsHelpText = false;
    }
    
    /**
     * Get current output row state
     */
    function getOutputRow() {
        return { text: outputRowText, color: outputRowColor, isHelpText: outputRowIsHelpText };
    }
    
    /**
     * Register a clickable table row
     * @param {number} x - Starting X position
     * @param {number} y - Y position of the row
     * @param {number} width - Width of the row
     * @param {number} index - Index of the row in the table
     * @param {Function} callback - Function to call when row is clicked
     */
    function registerTableRow(x, y, width, index, callback) {
        registeredTableRows.push({ x, y, width, index, callback });
    }
    
    /**
     * Debug function to log all registered texts
     */
    function debugRegisteredTexts() {
        console.log('=== All Registered Texts ===');
        console.log(`Total: ${registeredTexts.length} texts`);
        
        // Group by Y coordinate for easier reading
        const byY = {};
        registeredTexts.forEach((t, i) => {
            if (!byY[t.y]) byY[t.y] = [];
            byY[t.y].push({ index: i, x: t.x, text: t.text, color: t.color });
        });
        
        // Print sorted by Y
        Object.keys(byY).sort((a, b) => Number(a) - Number(b)).forEach(y => {
            console.log(`\nRow ${y}:`);
            byY[y].forEach(item => {
                const preview = item.text.length > 40 ? item.text.substring(0, 40) + '...' : item.text;
                console.log(`  [${item.index}] x=${item.x}, color=${item.color}, text="${preview}"`);
            });
        });
    }
    
    // Public API
    return {
        init,
        clear,
        addText,
        addTextCentered,
        addButton,
        addSelectionHighlight,
        registerTableRow,
        debugRegisteredTexts,
        draw,
        getGridSize,
        resetSelection,
        setOutputRow,
        clearOutputRow,
        getOutputRow
    };
})();
