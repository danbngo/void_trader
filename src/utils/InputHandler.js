/**
 * InputHandler - Handles keyboard and mouse input events
 */

class InputHandler {
    constructor(canvasWrapper) {
        this.canvasWrapper = canvasWrapper;
        this.canvas = canvasWrapper.getCanvas();
        
        // Callbacks
        this.onKeyPress = null;
        this.onMouseMove = null;
        this.onMouseClick = null;
        this.onMouseWheel = null;
        
        this.keyListener = null;
    }
    
    /**
     * Initialize input handlers
     */
    init() {
        this.setupKeyboard();
        this.setupMouse();
    }
    
    /**
     * Setup keyboard event listener
     */
    setupKeyboard() {
        this.keyListener = (e) => {
            // Ignore if typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            if (this.onKeyPress) {
                this.onKeyPress(e.key, e);
            }
        };
        
        document.addEventListener('keydown', this.keyListener);
    }
    
    /**
     * Setup mouse event listeners
     */
    setupMouse() {
        // Mouse move for hover
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;
            
            const gridPos = this.canvasWrapper.pixelToGrid(pixelX, pixelY);
            
            if (this.onMouseMove) {
                this.onMouseMove(gridPos.x, gridPos.y);
            }
        });
        
        // Mouse click
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const pixelX = e.clientX - rect.left;
            const pixelY = e.clientY - rect.top;
            
            const gridPos = this.canvasWrapper.pixelToGrid(pixelX, pixelY);
            
            if (this.onMouseClick) {
                this.onMouseClick(gridPos.x, gridPos.y);
            }
        });
        
        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            if (this.onMouseWheel) {
                // Positive delta = scroll down = zoom out
                // Negative delta = scroll up = zoom in
                this.onMouseWheel(e.deltaY);
            }
        }, { passive: false });
        
        // Set default cursor
        this.canvas.style.cursor = 'default';
    }
    
    /**
     * Set keyboard callback
     * @param {Function} callback - Function(key) called when key is pressed
     */
    setKeyPressCallback(callback) {
        this.onKeyPress = callback;
    }
    
    /**
     * Set mouse move callback
     * @param {Function} callback - Function(gridX, gridY) called on mouse move
     */
    setMouseMoveCallback(callback) {
        this.onMouseMove = callback;
    }
    
    /**
     * Set mouse click callback
     * @param {Function} callback - Function(gridX, gridY) called on mouse click
     */
    setMouseClickCallback(callback) {
        this.onMouseClick = callback;
    }
    
    /**
     * Set mouse wheel callback
     * @param {Function} callback - Function(delta) called on mouse wheel
     */
    setMouseWheelCallback(callback) {
        this.onMouseWheel = callback;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.keyListener) {
            document.removeEventListener('keydown', this.keyListener);
        }
    }
}
