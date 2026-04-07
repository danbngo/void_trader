/**
 * CanvasWrapper - Handles low-level canvas operations and character grid rendering
 */

class CanvasWrapper {
    constructor(canvasId, gridWidth, gridHeight, fontFamily, minFontSize, maxFontSize) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.fontFamily = fontFamily;
        this.minFontSize = minFontSize;
        this.maxFontSize = maxFontSize;
        
        this.charWidth = 0;
        this.charHeight = 0;
        
        this.resizeTimeout = null;
        this.onResize = null; // Callback to trigger after resize
    }
    
    /**
     * Initialize canvas and setup resize handler
     */
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.debouncedResize());
    }
    
    /**
     * Debounced resize handler
     */
    debouncedResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.resizeCanvas();
        }, 150);
    }
    
    /**
     * Resize canvas and recalculate character dimensions
     */
    resizeCanvas() {
        const gridAspect = this.gridWidth / this.gridHeight;
        const windowAspect = window.innerWidth / window.innerHeight;
        
        let canvasWidth, canvasHeight;
        
        if (windowAspect > gridAspect) {
            canvasHeight = window.innerHeight;
            canvasWidth = canvasHeight * gridAspect;
        } else {
            canvasWidth = window.innerWidth;
            canvasHeight = canvasWidth / gridAspect;
        }
        
        let tempCharHeight = canvasHeight / this.gridHeight;
        let fontSize = Math.floor(tempCharHeight * 0.9);
        fontSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, fontSize));
        
        this.charHeight = fontSize / 0.9;
        this.charWidth = fontSize * 0.6;
        
        canvasWidth = this.charWidth * this.gridWidth;
        canvasHeight = this.charHeight * this.gridHeight;
        
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        this.ctx.font = `${fontSize}px ${this.fontFamily}`;
        this.ctx.textBaseline = 'middle';
        
        // Trigger callback after resize completes
        if (this.onResize) {
            this.onResize();
        }
    }
    
    /**
     * Clear the entire canvas
     */
    clear() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Draw a rectangle
     */
    drawRect(x, y, width, height, color) {
        const pixelX = x * this.charWidth;
        const pixelY = y * this.charHeight;
        const pixelWidth = width * this.charWidth;
        const pixelHeight = height * this.charHeight;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
    }
    
    /**
     * Draw text at grid position
     */
    drawText(x, y, text, color, fontSizeMultiplier = 1.0, underline = false) {
        const pixelX = x * this.charWidth;
        const pixelY = y * this.charHeight;
        
        const baseFontSize = Math.floor(this.charHeight * 0.9);
        const actualFontSize = Math.floor(baseFontSize * fontSizeMultiplier);
        this.ctx.font = `${actualFontSize}px ${this.fontFamily}`;
        
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, pixelX, pixelY + this.charHeight / 2);
        
        // Draw underline if requested
        if (underline) {
            const textWidth = this.ctx.measureText(text).width;
            const underlineY = pixelY + this.charHeight - 2;
            this.ctx.beginPath();
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = Math.max(1, actualFontSize / 16);
            this.ctx.moveTo(pixelX, underlineY);
            this.ctx.lineTo(pixelX + textWidth, underlineY);
            this.ctx.stroke();
        }
    }
    
    /**
     * Convert pixel coordinates to grid coordinates
     */
    pixelToGrid(pixelX, pixelY) {
        return {
            x: Math.floor(pixelX / this.charWidth),
            y: Math.floor(pixelY / this.charHeight)
        };
    }
    
    /**
     * Get character dimensions
     */
    getCharDimensions() {
        return {
            width: this.charWidth,
            height: this.charHeight
        };
    }
    
    /**
     * Get grid dimensions
     */
    getGridDimensions() {
        return {
            width: this.gridWidth,
            height: this.gridHeight
        };
    }
    
    /**
     * Get canvas element
     */
    getCanvas() {
        return this.canvas;
    }
    
    /**
     * Get canvas context
     */
    getContext() {
        return this.ctx;
    }
}
