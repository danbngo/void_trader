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
        this.bottomContentPaddingPx = 0;
        this.dpr = window.devicePixelRatio || 1;

        this.resizeTimeout = null;
        this.onResize = null;
        this.visualViewportResizeHandler = null;

        // DPR strategy for balancing seam stability and sharpness:
        // - 'native': use devicePixelRatio directly
        // - 'pixel-perfect-1x': force 1x (best seam stability, blurrier on HiDPI)
        // - 'integer': use ceil(devicePixelRatio) for crisp output without fractional DPR seams
        this.dprMode = 'integer';
    }

    _getViewportSize() {
        const viewport = window.visualViewport;
        const viewportWidth = viewport?.width || window.innerWidth || 0;
        const viewportHeight = viewport?.height || window.innerHeight || 0;
        const docEl = document.documentElement;
        const docWidth = docEl?.clientWidth || viewportWidth;
        const docHeight = docEl?.clientHeight || viewportHeight;

        return {
            width: Math.max(1, Math.floor(Math.min(viewportWidth, window.innerWidth || viewportWidth, docWidth))),
            height: Math.max(1, Math.floor(Math.min(viewportHeight, window.innerHeight || viewportHeight, docHeight)))
        };
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.debouncedResize());
        if (window.visualViewport) {
            this.visualViewportResizeHandler = () => this.debouncedResize();
            window.visualViewport.addEventListener('resize', this.visualViewportResizeHandler);
            window.visualViewport.addEventListener('scroll', this.visualViewportResizeHandler);
        }
    }

    debouncedResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.resizeCanvas();
        }, 150);
    }

    resizeCanvas() {
        const viewportPaddingPx = 2;
        const viewport = this._getViewportSize();
        const availableWidth = Math.max(1, viewport.width - (viewportPaddingPx * 2));
        const availableHeight = Math.max(1, viewport.height - (viewportPaddingPx * 2));

        const gridAspect = this.gridWidth / this.gridHeight;
        const windowAspect = availableWidth / availableHeight;

        let canvasWidth;
        let canvasHeight;
        if (windowAspect > gridAspect) {
            canvasHeight = availableHeight;
            canvasWidth = canvasHeight * gridAspect;
        } else {
            canvasWidth = availableWidth;
            canvasHeight = canvasWidth / gridAspect;
        }

        const tempCharHeight = canvasHeight / this.gridHeight;
        const preferredMinFontSize = Math.max(1, this.minFontSize || 1);
        let fontSize = Math.floor(tempCharHeight * 0.9);
        fontSize = Math.max(preferredMinFontSize, Math.min(this.maxFontSize, fontSize));

        const measureForFont = (size) => {
            this.ctx.font = `${size}px ${this.fontFamily}`;
            const heightMetrics = this.ctx.measureText('Mg');
            const widthSample = 'MMMMMMMMMM';
            const widthMetrics = this.ctx.measureText(widthSample);
            const measuredWidth = widthMetrics.width / widthSample.length;
            const ascent = heightMetrics.actualBoundingBoxAscent || Math.round(size * 0.8);
            const descent = heightMetrics.actualBoundingBoxDescent || Math.round(size * 0.2);
            const lineGap = Math.max(1, Math.round(size * 0.2));
            const charHeight = Math.max(1, Math.round(ascent + descent + lineGap));
            const charWidth = Math.max(1, Math.ceil(measuredWidth));
            const width = Math.round(charWidth * this.gridWidth);
            const height = Math.round(charHeight * this.gridHeight);
            const textOffsetY = Math.max(0, Math.floor(lineGap / 2) - 2);
            const bottomContentPaddingPx = Math.max(2, textOffsetY + Math.ceil(lineGap / 2));
            const totalHeight = height + bottomContentPaddingPx;

            return {
                size,
                lineGap,
                charHeight,
                charWidth,
                width,
                height,
                textOffsetY,
                bottomContentPaddingPx,
                totalHeight
            };
        };

        const nativeDpr = window.devicePixelRatio || 1;
        if (this.dprMode === 'pixel-perfect-1x') {
            this.dpr = 1;
        } else if (this.dprMode === 'integer') {
            this.dpr = Math.max(1, Math.ceil(nativeDpr));
        } else {
            this.dpr = nativeDpr;
        }

        const applyCanvasSize = (width, height) => {
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            this.canvas.width = Math.round(width * this.dpr);
            this.canvas.height = Math.round(height * this.dpr);
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            this.ctx.imageSmoothingEnabled = false;
        };

        let measured = measureForFont(fontSize);
        let finalMeasured = measured;
        let finalCanvasWidth = measured.width;
        let finalCanvasHeight = measured.height + measured.bottomContentPaddingPx;

        applyCanvasSize(finalCanvasWidth, finalCanvasHeight);

        const fitsViewportAndBounds = (viewportWidth, viewportHeight) => {
            const rect = this.canvas.getBoundingClientRect();
            const rightLimit = viewportWidth + viewportPaddingPx;
            const bottomLimit = viewportHeight + viewportPaddingPx;
            return (
                rect.width <= rightLimit &&
                rect.height <= bottomLimit &&
                rect.right <= rightLimit &&
                rect.bottom <= bottomLimit
            );
        };

        while (fontSize > 1) {
            const staticFits = finalMeasured.width <= availableWidth && finalMeasured.totalHeight <= availableHeight;
            const runtimeFits = fitsViewportAndBounds(availableWidth, availableHeight);
            if (staticFits && runtimeFits && fontSize <= this.maxFontSize) {
                break;
            }

            fontSize -= 1;
            finalMeasured = measureForFont(fontSize);
            finalCanvasWidth = finalMeasured.width;
            finalCanvasHeight = finalMeasured.height + finalMeasured.bottomContentPaddingPx;
            applyCanvasSize(finalCanvasWidth, finalCanvasHeight);
        }

        this.baseFontSize = finalMeasured.size;
        this.lineGap = finalMeasured.lineGap;
        this.charHeight = finalMeasured.charHeight;
        this.charWidth = finalMeasured.charWidth;
        this.textOffsetY = finalMeasured.textOffsetY;
        this.bottomContentPaddingPx = finalMeasured.bottomContentPaddingPx;
        this.canvasCssWidth = finalCanvasWidth;
        this.canvasCssHeight = finalCanvasHeight;

        this.ctx.font = `${this.baseFontSize}px ${this.fontFamily}`;
        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'left';

        if (this.onResize) {
            this.onResize();
        }
    }

    clear() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvasCssWidth, this.canvasCssHeight);
    }

    drawRect(x, y, width, height, color) {
        const pixelX = x * this.charWidth;
        const pixelY = y * this.charHeight;
        const pixelWidth = width * this.charWidth;
        const pixelHeight = height * this.charHeight;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
    }

    _getRasterMaskForGlyph(symbol) {
        switch (symbol) {
            case '◤': return 1;
            case '◥': return 2;
            case '◣': return 4;
            case '◢': return 8;
            case '▀': return 3;
            case '▄': return 12;
            case '▌': return 5;
            case '▐': return 10;
            case '▞': return 6;
            case '▚': return 9;
            case '▛': return 7;
            case '▜': return 11;
            case '▙': return 13;
            case '▟': return 14;
            case '█': return 15;
            default: return null;
        }
    }

    _drawRasterGlyph(symbol, pixelX, pixelY, color) {
        const shadeAlpha = symbol === '░' ? 0.25 : symbol === '▒' ? 0.5 : symbol === '▓' ? 0.75 : null;
        this.ctx.fillStyle = color;

        const drawTriangle = (p1, p2, p3) => {
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.closePath();
            this.ctx.fill();
        };

        const x0 = pixelX;
        const y0 = pixelY;
        const x1 = pixelX + this.charWidth;
        const y1 = pixelY + this.charHeight;
        const cx = pixelX + Math.floor(this.charWidth / 2);
        const cy = pixelY + Math.floor(this.charHeight / 2);

        if (symbol === '▲') {
            drawTriangle({ x: cx, y: y0 }, { x: x0, y: y1 }, { x: x1, y: y1 });
            return true;
        }
        if (symbol === '▼') {
            drawTriangle({ x: x0, y: y0 }, { x: x1, y: y0 }, { x: cx, y: y1 });
            return true;
        }
        if (symbol === '◀') {
            drawTriangle({ x: x0, y: cy }, { x: x1, y: y0 }, { x: x1, y: y1 });
            return true;
        }
        if (symbol === '▶') {
            drawTriangle({ x: x0, y: y0 }, { x: x1, y: cy }, { x: x0, y: y1 });
            return true;
        }
        if (symbol === '◤') {
            drawTriangle({ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x0, y: y1 });
            return true;
        }
        if (symbol === '◥') {
            drawTriangle({ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 });
            return true;
        }
        if (symbol === '◣') {
            drawTriangle({ x: x0, y: y0 }, { x: x0, y: y1 }, { x: x1, y: y1 });
            return true;
        }
        if (symbol === '◢') {
            drawTriangle({ x: x1, y: y0 }, { x: x0, y: y1 }, { x: x1, y: y1 });
            return true;
        }

        if (shadeAlpha !== null) {
            const prevAlpha = this.ctx.globalAlpha;
            this.ctx.globalAlpha = prevAlpha * shadeAlpha;
            this.ctx.fillRect(pixelX, pixelY, this.charWidth, this.charHeight);
            this.ctx.globalAlpha = prevAlpha;
            return true;
        }

        const mask = this._getRasterMaskForGlyph(symbol);
        if (mask === null) {
            return false;
        }

        const midX = pixelX + Math.floor(this.charWidth / 2);
        const midY = pixelY + Math.floor(this.charHeight / 2);

        const leftWidth = midX - pixelX;
        const rightWidth = this.charWidth - leftWidth;
        const topHeight = midY - pixelY;
        const bottomHeight = this.charHeight - topHeight;

        if ((mask & 1) && leftWidth > 0 && topHeight > 0) {
            this.ctx.fillRect(pixelX, pixelY, leftWidth, topHeight);
        }
        if ((mask & 2) && rightWidth > 0 && topHeight > 0) {
            this.ctx.fillRect(midX, pixelY, rightWidth, topHeight);
        }
        if ((mask & 4) && leftWidth > 0 && bottomHeight > 0) {
            this.ctx.fillRect(pixelX, midY, leftWidth, bottomHeight);
        }
        if ((mask & 8) && rightWidth > 0 && bottomHeight > 0) {
            this.ctx.fillRect(midX, midY, rightWidth, bottomHeight);
        }

        return true;
    }

    drawText(x, y, text, color, fontSizeMultiplier = 1.0, underline = false) {
        const pixelX = x * this.charWidth;
        const pixelY = y * this.charHeight;

        const actualFontSize = Math.floor(this.baseFontSize * fontSizeMultiplier);
        this.ctx.font = `${actualFontSize}px ${this.fontFamily}`;
        if (typeof this.ctx.fontKerning !== 'undefined') {
            this.ctx.fontKerning = 'none';
        }

        const tintedColor = ColorTinting?.applyCurrentTint?.(color) || color;
        this.ctx.fillStyle = tintedColor;

        if (text.length > 1) {
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const charX = pixelX + (i * this.charWidth);
                if (this._drawRasterGlyph(ch, charX, pixelY, tintedColor)) {
                    continue;
                }
                this.ctx.fillText(ch, charX, pixelY + this.textOffsetY);
            }
        } else {
            if (this._drawRasterGlyph(text, pixelX, pixelY, tintedColor)) {
                return;
            }
            this.ctx.fillText(text, pixelX, pixelY + this.textOffsetY);
        }

        if (underline) {
            const textWidth = this.charWidth * text.length;
            const underlineY = pixelY + this.charHeight - 1;
            this.ctx.beginPath();
            this.ctx.strokeStyle = tintedColor;
            this.ctx.lineWidth = Math.max(1, actualFontSize / 16);
            this.ctx.moveTo(pixelX, underlineY);
            this.ctx.lineTo(pixelX + textWidth, underlineY);
            this.ctx.stroke();
        }
    }

    pixelToGrid(pixelX, pixelY) {
        return {
            x: Math.floor(pixelX / this.charWidth),
            y: Math.floor(pixelY / this.charHeight)
        };
    }

    getCharDimensions() {
        return {
            width: this.charWidth,
            height: this.charHeight
        };
    }

    getGridDimensions() {
        return {
            width: this.gridWidth,
            height: this.gridHeight
        };
    }

    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.ctx;
    }
}
