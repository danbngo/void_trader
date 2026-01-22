/**
 * UI Module - Handles canvas rendering and keyboard input
 * Uses a character grid system for consistent rendering across resolutions
 */

const UI = (() => {
    // Canvas wrapper instance
    let canvasWrapper = null;
    
    // Input handler instance
    let inputHandler = null;
    
    // Registered UI elements (registration phase)
    let registeredTexts = [];
    let registeredButtons = [];
    let registeredHighlights = []; // For table row selection highlights
    let registeredTableRows = []; // For clickable table rows
    let selectedButtonIndex = 0;
    let lastSelectedButtonIndex = -1; // Track last selection to detect changes
    let preservedButtonKey = null; // Track button key to preserve selection across re-renders
    let wheelZoomHandler = null; // Handler for mouse wheel zoom
    
    // Output row state
    let outputRowText = '';
    let outputRowColor = 'white';
    let outputRowIsHelpText = false;
    
    // Flashing state
    let flashInterval = null;
    let flashCallback = null;
    let flashStartTime = null;
    let flashState = false; // Toggles between true/false each flash
    let isInFlashCallback = false; // Prevents clear() from stopping flash during callback
    
    /**
     * Initialize the UI system
     */
    function init() {
        // Create canvas wrapper
        canvasWrapper = new CanvasWrapper('gameCanvas', GRID_WIDTH, GRID_HEIGHT, FONT_FAMILY, MIN_FONT_SIZE, MAX_FONT_SIZE);
        canvasWrapper.onResize = () => draw(); // Redraw UI after canvas resize
        canvasWrapper.init();
        
        // Create input handler
        inputHandler = new InputHandler(canvasWrapper);
        inputHandler.init();
        
        // Setup input callbacks
        setupInputCallbacks();
        
        // Initial draw
        draw();
    }
    
    /**
     * Setup input callbacks to handle keyboard and mouse events
     */
    function setupInputCallbacks() {
        // Keyboard callback
        inputHandler.setKeyPressCallback((key, event) => {
            // Handle button navigation
            if (key === 'ArrowDown' || key === 'ArrowRight' || key === 'Tab') {
                event.preventDefault();
                if (registeredButtons.length > 0) {
                    selectedButtonIndex = (selectedButtonIndex + 1) % registeredButtons.length;
                    draw();
                }
                return;
            }
            
            if (key === 'ArrowUp' || key === 'ArrowLeft') {
                event.preventDefault();
                if (registeredButtons.length > 0) {
                    selectedButtonIndex = (selectedButtonIndex - 1 + registeredButtons.length) % registeredButtons.length;
                    draw();
                }
                return;
            }
            
            // Handle button activation
            if (key === 'Enter' || key === ' ') {
                event.preventDefault();
                if (registeredButtons.length > 0 && registeredButtons[selectedButtonIndex]) {
                    registeredButtons[selectedButtonIndex].callback();
                }
                return;
            }

            if (key === 'Escape') {
                const zeroBtn = registeredButtons.find(btn => btn.key === '0');
                if (zeroBtn) {
                    event.preventDefault();
                    zeroBtn.callback();
                }
                return;
            }
            
            // Check for PageUp/PageDown zoom
            if (key === 'PageUp' && wheelZoomHandler) {
                event.preventDefault();
                wheelZoomHandler(-100);
                return;
            }
            if (key === 'PageDown' && wheelZoomHandler) {
                event.preventDefault();
                wheelZoomHandler(100);
                return;
            }
            
            // Check if this key has a button assigned (direct access)
            const button = registeredButtons.find(btn => btn.key === key);
            if (button) {
                event.preventDefault();
                button.callback();
            }
        });
        
        // Mouse move callback (for hover)
        inputHandler.setMouseMoveCallback((gridX, gridY) => {
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
        
        // Mouse click callback
        inputHandler.setMouseClickCallback((gridX, gridY) => {
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
        
        // Mouse wheel callback (for zoom)
        inputHandler.setMouseWheelCallback((deltaY) => {
            if (wheelZoomHandler) {
                wheelZoomHandler(deltaY);
            }
        });
    }
    
    /**
     * Clear all registered UI elements (selection preserved if possible)
     */
    function clear() {
        // Preserve current selected button key
        if (registeredButtons.length > 0 && selectedButtonIndex < registeredButtons.length) {
            preservedButtonKey = registeredButtons[selectedButtonIndex].key;
        }
        
        registeredTexts = [];
        registeredButtons = [];
        registeredHighlights = [];
        registeredTableRows = [];
        // Clear output row state only if it's not help text (preserve help text during redraws)
        if (!outputRowIsHelpText) {
            outputRowText = '';
            outputRowColor = 'white';
        }
        // Stop any flashing when menu changes (but not during flash callback)
        if (!isInFlashCallback) {
            stopFlashing();
        }
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
        
        // Custom color logic for specific button labels (only if default color)
        if ((label === 'Options' || label === 'Back') && color === 'cyan') {
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
     * Register a clickable area (like a ship icon)
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {number} width - Width in characters (usually 1 for a single character)
     * @param {Function} callback - Function to call when clicked
     */
    function addClickable(x, y, width, callback) {
        registeredTableRows.push({ x, y, width, callback, index: -1 });
    }
    
    /**
     * Draw all registered UI elements to the canvas
     */
    function draw() {
        // Try to restore selection by preserved button key
        if (preservedButtonKey !== null) {
            const foundIndex = registeredButtons.findIndex(btn => btn.key === preservedButtonKey);
            if (foundIndex !== -1) {
                selectedButtonIndex = foundIndex;
            }
            preservedButtonKey = null;
        }
        
        // Validate selection index (reset if out of bounds)
        if (selectedButtonIndex >= registeredButtons.length) {
            selectedButtonIndex = 0;
        }
        
        // Clear canvas
        canvasWrapper.clear();
        
        // Draw selection highlights first (under text)
        registeredHighlights.forEach(item => {
            canvasWrapper.drawRect(item.x, item.y, item.width, 1, 'white');
        });
        
        // Draw all registered texts
        registeredTexts.forEach(item => {
            const textWidth = item.text.length;
            
            // Clear the area before drawing to prevent overlapping artifacts
            // BUT don't clear if text is black (selected text on white background)
            if (item.color !== 'black') {
                canvasWrapper.drawRect(item.x, item.y, textWidth, 1, 'black');
            }
            
            // Draw the text
            canvasWrapper.drawText(item.x, item.y, item.text, item.color, item.fontSize);
        });
        
        // Draw all registered buttons
        // Check if button selection changed
        const selectionChanged = selectedButtonIndex !== lastSelectedButtonIndex;
        const isCurrentlyFlashing = isFlashing();
        if (selectionChanged) {
            lastSelectedButtonIndex = selectedButtonIndex;
            // Clear output row when selection changes (allows help text to replace error messages)
            // But only if not flashing (preserve output during flash)
            if (!isCurrentlyFlashing) {
                outputRowText = '';
                outputRowColor = 'white';
                outputRowIsHelpText = false;
            }
        }
        
        registeredButtons.forEach((btn, index) => {
            const buttonText = `[${btn.key}] ${btn.label}`;
            const buttonWidth = buttonText.length;
            const isSelected = (index === selectedButtonIndex);
            
            // Clear the area before drawing
            canvasWrapper.drawRect(btn.x, btn.y, buttonWidth, 1, 'black');
            
            // Draw background if selected
            if (isSelected) {
                canvasWrapper.drawRect(btn.x, btn.y, buttonWidth, 1, 'white');
                canvasWrapper.drawText(btn.x, btn.y, buttonText, 'black');
                
                // Show helpText if:
                // 1. Button has help text
                // 2. Button label is not forbidden (Continue, Back)
                // 3. Output row is empty OR already showing help text (don't override error/success messages)
                if (
                    btn.helpText &&
                    !['Continue', 'Back'].includes(btn.label) &&
                    (!outputRowText || outputRowIsHelpText)
                ) {
                    outputRowText = btn.helpText;
                    outputRowColor = 'aqua';
                    outputRowIsHelpText = true;
                }
            } else {
                // Draw button - if yellow (special highlight) or gray (disabled), color entire button
                if (btn.color === COLORS.YELLOW || btn.color === COLORS.TEXT_DIM) {
                    canvasWrapper.drawText(btn.x, btn.y, buttonText, btn.color);
                } else {
                    // Draw colored key and white label
                    canvasWrapper.drawText(btn.x, btn.y, `[${btn.key}] `, btn.color);
                    canvasWrapper.drawText(btn.x + 4, btn.y, `${btn.label}`, 'white');
                }
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
            canvasWrapper.drawRect(x, y, outputRowText.length, 1, 'black');
            canvasWrapper.drawText(x, y, outputRowText, outputRowColor);
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
        preservedButtonKey = null; // Clear preserved key to prevent carryover
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
     * Set the wheel zoom handler
     * @param {Function} handler - Function to call with delta value (positive = zoom out, negative = zoom in)
     */
    function setWheelZoomHandler(handler) {
        wheelZoomHandler = handler;
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
    
    /**
     * Start flashing animation by calling a callback repeatedly
     * The callback should re-render the UI with flashing elements
     * Flash automatically stops when clear() is called (menu change)
     * @param {Function} callback - Function to call periodically (should call draw())
     * @param {number} interval - Milliseconds between flashes (default: 200)
     * @param {number} duration - Total duration in milliseconds (default: 2000, 0 = infinite)
     * @param {boolean} callImmediately - If true, call callback immediately before starting interval (default: false)
     */
    function startFlashing(callback, interval = 200, duration = 2000, callImmediately = false) {
        // Stop any existing flash
        stopFlashing();
        
        console.log('[UI] startFlashing called:', { interval, duration, callImmediately });
        
        flashCallback = callback;
        flashStartTime = Date.now();
        
        // Call immediately if requested (within flash callback context)
        if (callImmediately && flashCallback) {
            console.log('[UI] Calling flash callback immediately');
            isInFlashCallback = true;
            flashCallback();
            // Don't set isInFlashCallback back to false yet - keep it true
            // until after we create the interval and return from this function
        }
        
        flashInterval = setInterval(() => {
            // Check if duration has elapsed (if duration is set)
            if (duration > 0 && Date.now() - flashStartTime >= duration) {
                console.log('[UI] Flash duration expired, stopping flash');
                stopFlashing();
                return;
            }
            
            // Toggle flash state
            flashState = !flashState;
            console.log('[UI] Flash state toggled to:', flashState);
            
            // Call the callback (should re-register and re-draw UI)
            if (flashCallback) {
                isInFlashCallback = true;
                flashCallback();
                isInFlashCallback = false;
            }
        }, interval);
        
        console.log('[UI] Flash interval started with ID:', flashInterval);
        
        // Reset isInFlashCallback after a short delay to allow function to return
        // and prevent any immediate render() calls from stopping the flash
        setTimeout(() => {
            isInFlashCallback = false;
            console.log('[UI] isInFlashCallback reset to false');
        }, 50);
    }
    
    /**
     * Stop flashing animation
     */
    function stopFlashing() {
        if (flashInterval) {
            console.log('[UI] stopFlashing called, clearing interval:', flashInterval);
            clearInterval(flashInterval);
            flashInterval = null;
        }
        flashCallback = null;
        flashStartTime = null;
        flashState = false;
    }
    
    /**
     * Check if currently flashing
     * @returns {boolean} True if flashing is active
     */
    function isFlashing() {
        return flashInterval !== null;
    }
    
    /**
     * Get current flash state (true/false, toggles each interval)
     * @returns {boolean} Current flash state
     */
    function getFlashState() {
        return flashState;
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
        getOutputRow,
        addClickable,
        setWheelZoomHandler,
        calcStatColor: ColorUtils.calcStatColor, // Re-export from ColorUtils for convenience
        startFlashing,
        stopFlashing,
        isFlashing,
        getFlashState
    };
})();
