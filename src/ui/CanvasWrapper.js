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
        this.baseFontSize = 0;
        this.lineGap = 0;
        this.textOffsetY = 0;

        this.canvasCssWidth = 0;
        this.canvasCssHeight = 0;
        this.dpr = window.devicePixelRatio || 1;
        
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

        this.ctx.font = `${fontSize}px ${this.fontFamily}`;
        const heightMetrics = this.ctx.measureText('Mg');
        const widthSample = 'MMMMMMMMMM';
        const widthMetrics = this.ctx.measureText(widthSample);
        const measuredWidth = widthMetrics.width / widthSample.length;
        const ascent = heightMetrics.actualBoundingBoxAscent || Math.round(fontSize * 0.8);
        const descent = heightMetrics.actualBoundingBoxDescent || Math.round(fontSize * 0.2);

        this.baseFontSize = fontSize;
        this.lineGap = Math.max(1, Math.round(this.baseFontSize * 0.2));
        this.charHeight = Math.max(1, Math.round(ascent + descent + this.lineGap));
        this.charWidth = Math.max(1, Math.ceil(measuredWidth));
        this.textOffsetY = Math.max(0, Math.floor(this.lineGap / 2) - 2);

        canvasWidth = Math.round(this.charWidth * this.gridWidth);
        canvasHeight = Math.round(this.charHeight * this.gridHeight);

        this.canvasCssWidth = canvasWidth;
        this.canvasCssHeight = canvasHeight;

        this.dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;
        this.canvas.width = Math.round(canvasWidth * this.dpr);
        this.canvas.height = Math.round(canvasHeight * this.dpr);

        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.font = `${fontSize}px ${this.fontFamily}`;
        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'left';
        
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
        this.ctx.fillRect(0, 0, this.canvasCssWidth, this.canvasCssHeight);
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

        const actualFontSize = Math.floor(this.baseFontSize * fontSizeMultiplier);
        this.ctx.font = `${actualFontSize}px ${this.fontFamily}`;
        if (typeof this.ctx.fontKerning !== 'undefined') {
            this.ctx.fontKerning = 'none';
        }

        if (text.length === 1 && '█▓▒░'.includes(text)) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(pixelX, pixelY, this.charWidth, this.charHeight);
            return;
        }
        
        this.ctx.fillStyle = color;
        if (text.length > 1) {
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const charX = pixelX + (i * this.charWidth);
                this.ctx.fillText(ch, charX, pixelY + this.textOffsetY);
            }
        } else {
            this.ctx.fillText(text, pixelX, pixelY + this.textOffsetY);
        }
        
        // Draw underline if requested
        if (underline) {
            const textWidth = this.charWidth * text.length;
            const underlineY = pixelY + this.charHeight - 1;
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
