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

    let gameCursorEnabled = true;
    let gameCursorActive = false;
    let gameCursorPos = { x: 0, y: 0 };
    
    // Output row state
    let outputRowText = '';
    let outputRowColor = 'white';
    let outputRowIsHelpText = false;
    
    // Flashing state
    const flashingState = UiAnimations.createFlashingState();

    const DEBUG_UI = false;
    function uiLog(...args) {
        if (DEBUG_UI) {
            console.log(...args);
        }
    }
    
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

        const grid = getGridSize();
        const cursorInit = UiCursor.initCursor(grid);
        gameCursorPos = cursorInit.pos;
        gameCursorActive = cursorInit.active;
        
        // Initial draw
        draw();
    }
    
    /**
     * Setup input callbacks to handle keyboard and mouse events
     */
    function setupInputCallbacks() {
        UiButtons.setupInputCallbacks({
            inputHandler,
            getRegisteredButtons: () => registeredButtons,
            getSelectedButtonIndex: () => selectedButtonIndex,
            setSelectedButtonIndex: (value) => {
                selectedButtonIndex = value;
            },
            draw,
            getWheelZoomHandler: () => wheelZoomHandler,
            handleCursorMove: (gridX, gridY) => {
                const cursorUpdate = UiCursor.handleMouseMove(gameCursorEnabled, gameCursorPos, gridX, gridY);
                if (cursorUpdate.didMove) {
                    gameCursorPos = cursorUpdate.pos;
                    gameCursorActive = cursorUpdate.active;
                }
                return cursorUpdate.didMove;
            },
            getRegisteredTableRows: () => registeredTableRows
        });
    }
    
    /**
     * Clear all registered UI elements (selection preserved if possible)
     */
    function clear() {
        uiLog('[UI] clear() called, preserving outputRow:', { outputRowText, outputRowColor, outputRowIsHelpText });
        // Preserve current selected button key
        if (registeredButtons.length > 0 && selectedButtonIndex < registeredButtons.length) {
            preservedButtonKey = registeredButtons[selectedButtonIndex].key;
        }
        
        registeredTexts = [];
        registeredButtons = [];
        registeredHighlights = [];
        registeredTableRows = [];
        // Don't clear output row - it will be managed by draw() and resetSelection()
        // This preserves both help text and action messages across redraws
        
        // Stop any flashing when menu changes (but not during flash callback)
        if (!UiAnimations.isInFlashCallback(flashingState)) {
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
     * @param {boolean} underline - Optional underline flag (default: false)
     */
    function addText(x, y, text, color = 'white', fontSize = 1.0, underline = false) {
        UiText.addText(registeredTexts, GRID_WIDTH, GRID_HEIGHT, x, y, text, color, fontSize, underline);
    }
    
    /**
     * Register centered text (registration phase)
     * @param {number} y - Grid Y position (0 to GRID_HEIGHT-1)
     * @param {string} text - Text to render
     * @param {string} color - CSS color string (default: white)
     */
    function addTextCentered(y, text, color = 'white') {
        UiText.addTextCentered(registeredTexts, GRID_WIDTH, GRID_HEIGHT, y, text, color);
    }
    
    /**
     * Register a button (registration phase - doesn't render yet)
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {string} key - Key to press (e.g., '1', '2', '3')
     * @param {string} label - Button label text
     * @param {Function} callback - Function to call when button is pressed
     * @param {string} color - Color of the button text (default: cyan)
     * @param {string} helpText - Help text to display (optional)
     * @param {string} keyColor - Custom color for the key only (optional)
     */
    function addButton(x, y, key, label, callback, color = 'cyan', helpText = '', keyColor = null) {
        UiButtons.addButton(registeredButtons, GRID_WIDTH, GRID_HEIGHT, x, y, key, label, callback, color, helpText, keyColor);
    }
    
    /**
     * Add a header line (registration phase - doesn't render yet)
     * Formats text in cyan color with underline
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {string} title - Header title text
     * @returns {number} - Next Y position (y + 1)
     */
    function addHeaderLine(x, y, title) {
        return UiText.addHeaderLine(registeredTexts, GRID_WIDTH, GRID_HEIGHT, x, y, title);
    }
    
    /**
     * Add a centered header line (registration phase - doesn't render yet)
     * Formats text in cyan color with underline, centered horizontally
     * @param {number} y - Grid Y position
     * @param {string} title - Header title text
     * @returns {number} - Next Y position (y + 1)
     */
    function addHeaderLineCentered(y, title) {
        return UiText.addHeaderLineCentered(registeredTexts, GRID_WIDTH, GRID_HEIGHT, y, title);
    }
    
    /**
     * Add a centered title line for menu titles (registration phase - doesn't render yet)
     * Formats text in green color with underline, centered horizontally
     * @param {number} y - Grid Y position
     * @param {string} title - Title text
     * @returns {number} - Next Y position (y + 1)
     */
    function addTitleLineCentered(y, title) {
        return UiText.addTitleLineCentered(registeredTexts, GRID_WIDTH, GRID_HEIGHT, y, title);
    }
    
    /**
     * Register a centered button (registration phase - doesn't render yet)
     * Automatically calculates x position to center the button horizontally
     * @param {number} y - Grid Y position
     * @param {string} key - Key to press (e.g., '1', '2', '3')
     * @param {string} label - Button label text
     * @param {Function} callback - Function to call when button is pressed
     * @param {string} color - Color of the button text (default: cyan)
     * @param {string} helpText - Help text to display (optional)
     * @param {string} keyColor - Custom color for the key only (optional)
     */
    function addCenteredButton(y, key, label, callback, color = 'cyan', helpText = '', keyColor = null) {
        UiButtons.addCenteredButton(registeredButtons, GRID_WIDTH, GRID_HEIGHT, y, key, label, callback, color, helpText, keyColor);
    }
    
    /**
     * Register multiple centered buttons as a group (registration phase - doesn't render yet)
     * All buttons are left-aligned with each other, with the group centered based on the longest button
     * @param {number} startY - Grid Y position for first button
     * @param {Array} buttons - Array of button objects: {key, label, callback, color?, helpText?, keyColor?}
     */
    function addCenteredButtons(startY, buttons) {
        UiButtons.addCenteredButtons(registeredButtons, GRID_WIDTH, GRID_HEIGHT, startY, buttons);
    }
    
    /**
     * Register a selection highlight for table rows (white background)
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {number} width - Width in characters
     */
    function addSelectionHighlight(x, y, width) {
        UiButtons.addSelectionHighlight(registeredHighlights, x, y, width);
    }
    
    /**
     * Register a clickable area (like a ship icon)
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {number} width - Width in characters (usually 1 for a single character)
     * @param {Function} callback - Function to call when clicked
     */
    function addClickable(x, y, width, callback) {
        UiButtons.addClickable(registeredTableRows, x, y, width, callback);
    }

    function drawTextItem(item, forceBackground = false) {
        UiText.drawTextItem(canvasWrapper, registeredHighlights, item, forceBackground);
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
            canvasWrapper.drawRect(item.x, item.y, item.width, 1, COLORS.GRAY);
        });
        
        // Draw all registered texts
        UiText.drawRegisteredTexts(canvasWrapper, registeredHighlights, registeredTexts);
        
        // Draw all registered buttons
        const buttonState = UiButtons.drawButtons({
            canvasWrapper,
            registeredButtons,
            selectedButtonIndex,
            lastSelectedButtonIndex,
            outputRowText,
            outputRowColor,
            outputRowIsHelpText,
            isFlashing,
            uiLog
        });
        selectedButtonIndex = buttonState.selectedButtonIndex;
        lastSelectedButtonIndex = buttonState.lastSelectedButtonIndex;
        outputRowText = buttonState.outputRowText;
        outputRowColor = buttonState.outputRowColor;
        outputRowIsHelpText = buttonState.outputRowIsHelpText;
        
        // Draw output row (generalized)
        if (outputRowText) {
            uiLog('[UI] Drawing output row:', { outputRowText, outputRowColor, outputRowIsHelpText });
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
        } else {
            uiLog('[UI] No output row text to draw');
        }
        
        if (gameCursorEnabled && gameCursorActive) {
            drawGameCursor();
        }

        // Debug output
        if (DEBUG_UI) {
            debugToConsole();
        }
    }
    
    /**
     * Debug function to print current screen content to console
     */
    function debugToConsole() {
        DebugUtils.debugToConsole(UI, uiLog);
    }

    function logScreenToConsole() {
        const output = buildScreenDump();
        console.log(output);
    }

    function buildScreenDump() {
        const screen = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            screen[y] = new Array(GRID_WIDTH).fill(' ');
        }

        registeredTexts.forEach(item => {
            for (let i = 0; i < item.text.length; i++) {
                if (item.x + i >= 0 && item.x + i < GRID_WIDTH && item.y >= 0 && item.y < GRID_HEIGHT) {
                    screen[item.y][item.x + i] = item.text[i];
                }
            }
        });

        registeredButtons.forEach((btn, index) => {
            const buttonText = `[${btn.key}] ${btn.label}`;
            const isSelected = (index === selectedButtonIndex);
            const marker = isSelected ? '█' : ' ';

            for (let i = 0; i < buttonText.length; i++) {
                if (btn.x + i >= 0 && btn.x + i < GRID_WIDTH && btn.y >= 0 && btn.y < GRID_HEIGHT) {
                    screen[btn.y][btn.x + i] = buttonText[i];
                }
            }
            if (isSelected && btn.x > 0) {
                screen[btn.y][btn.x - 1] = marker;
            }
        });

        let output = '\n┌' + '─'.repeat(GRID_WIDTH) + '┐\n';
        for (let y = 0; y < GRID_HEIGHT; y++) {
            output += '│' + screen[y].join('') + '│\n';
        }
        output += '└' + '─'.repeat(GRID_WIDTH) + '┘\n';
        output += `Texts: ${registeredTexts.length}, Buttons: ${registeredButtons.length}, Selected: ${selectedButtonIndex}`;
        return output;
    }
    
    /**
     * Get grid dimensions
     */
    function getGridSize() {
        return { width: GRID_WIDTH, height: GRID_HEIGHT };
    }

    /**
     * Get character dimensions in pixels
     */
    function getCharDimensions() {
        if (!canvasWrapper) {
            return { width: 1, height: 1 };
        }
        return canvasWrapper.getCharDimensions();
    }

    /**
     * Get canvas element
     */
    function getCanvas() {
        return canvasWrapper ? canvasWrapper.getCanvas() : null;
    }

    /**
     * Get canvas context
     */
    function getContext() {
        return canvasWrapper ? canvasWrapper.getContext() : null;
    }

    /**
     * Test whether the current font behaves as monospace by measuring glyph widths.
     * @param {string} sample - Characters to measure.
     * @returns {{ sample: string, widths: Record<string, number>, min: number, max: number, average: number, spread: number, font: string }} Width stats.
     */
    function testMonospaceFont(sample = 'ilIWMm01. _-|') {
        return DebugUtils.testMonospaceFont(UI, sample);
    }
    
    /**
     * Reset button selection to first button (for entering new menus)
     */
    function resetSelection() {
        uiLog('[UI] resetSelection called, current outputRow:', { outputRowText, outputRowColor, outputRowIsHelpText });
        selectedButtonIndex = 0;
        lastSelectedButtonIndex = -1;
        preservedButtonKey = null; // Clear preserved key to prevent carryover
        // Clear output row when transitioning to new menu
        // This ensures previous menu's messages don't carry over
        uiLog('[UI] Clearing output row on menu transition');
        outputRowText = '';
        outputRowColor = 'white';
        outputRowIsHelpText = false;
    }
    
    /**
     * Set output row text (for action results, not helpText)
     * @param {string} text - Text to display
     * @param {string} color - Color of the text
     */
    function setOutputRow(text, color = 'white') {
        uiLog('[UI] setOutputRow called:', { text, color, isHelpText: false });
        outputRowText = text;
        outputRowColor = color;
        outputRowIsHelpText = false;
    }
    
    /**
     * Clear output row (useful when transitioning between menus)
     */
    function clearOutputRow() {
        const cleared = UiText.clearOutputRow();
        outputRowText = cleared.text;
        outputRowColor = cleared.color;
        outputRowIsHelpText = cleared.isHelpText;
    }
    
    /**
     * Set the wheel zoom handler
     * @param {Function} handler - Function to call with delta value (positive = zoom out, negative = zoom in)
     */
    function setWheelZoomHandler(handler) {
        wheelZoomHandler = handler;
    }

    function setGameCursorEnabled(enabled) {
        gameCursorEnabled = !!enabled;
        if (!gameCursorEnabled) {
            gameCursorActive = false;
        }
    }
    
    /**
     * Get current output row state
     */
    function getOutputRow() {
        return UiText.getOutputRow(outputRowText, outputRowColor, outputRowIsHelpText);
    }

    function getScreenCharAt(x, y) {
        return UiText.getScreenCharAt({
            gridWidth: GRID_WIDTH,
            gridHeight: GRID_HEIGHT,
            registeredButtons,
            registeredTexts,
            outputRowText,
            x,
            y
        });
    }

    function _debugGetState() {
        return {
            registeredTexts,
            registeredButtons,
            registeredHighlights,
            registeredTableRows
        };
    }

    function _debugGetSelectedButtonIndex() {
        return selectedButtonIndex;
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
        UiButtons.registerTableRow(registeredTableRows, x, y, width, index, callback);
    }
    
    /**
     * Debug function to log all registered texts
     */
    function debugRegisteredTexts() {
        DebugUtils.debugRegisteredTexts(UI, uiLog);
    }

    function drawGameCursor() {
        UiCursor.drawGameCursor((item, forceBackground) => drawTextItem(item, forceBackground), getGridSize, gameCursorPos);
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
        UiAnimations.startFlashing(flashingState, uiLog, callback, interval, duration, callImmediately);
    }
    
    /**
     * Stop flashing animation
     */
    function stopFlashing() {
        UiAnimations.stopFlashing(flashingState, uiLog);
    }
    
    /**
     * Check if currently flashing
     * @returns {boolean} True if flashing is active
     */
    function isFlashing() {
        return UiAnimations.isFlashing(flashingState);
    }
    
    /**
     * Get current flash state (true/false, toggles each interval)
     * @returns {boolean} Current flash state
     */
    function getFlashState() {
        return UiAnimations.getFlashState(flashingState);
    }
    
    // Public API
    return {
        init,
        clear,
        addText,
        addTextCentered,
        addHeaderLine,
        addHeaderLineCentered,
        addTitleLineCentered,
        addButton,
        addCenteredButton,
        addSelectionHighlight,
        registerTableRow,
        debugRegisteredTexts,
        draw,
        getGridSize,
        getCharDimensions,
        getCanvas,
        getContext,
        testMonospaceFont,
        resetSelection,
        setOutputRow,
        clearOutputRow,
        getOutputRow,
        getScreenCharAt,
        addClickable,
        setWheelZoomHandler,
        setGameCursorEnabled,
        calcStatColor: ColorUtils.calcStatColor, // Re-export from ColorUtils for convenience
        startFlashing,
        stopFlashing,
        isFlashing,
        getFlashState,
        addCenteredButtons,
        logScreenToConsole,
        _debugGetState,
        _debugGetSelectedButtonIndex
    };
})();
