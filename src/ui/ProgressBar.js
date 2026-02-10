/**
 * Progress Bar Utility
 * Renders progress bars with dynamic coloring
 */

const ProgressBar = (() => {
    /**
     * Render a progress bar
     * @param {number} x - Starting X position (center of bar)
     * @param {number} y - Y position
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @param {number} width - Width of the bar (default 60% of grid width)
     * @param {string} label - Optional label to display below the bar
     * @returns {number} - Y position after the bar and label
     */
    function render(x, y, progress, width = null, label = null) {
        const grid = UI.getGridSize();
        
        // Calculate bar width if not provided
        if (width === null) {
            width = Math.floor(grid.width * 0.6);
        }
        
        // Clamp progress between 0 and 1
        progress = Math.max(0, Math.min(1, progress));
        
        const barX = Math.floor(x - width / 2);
        const filledWidth = Math.floor(width * progress);
        
        // Determine bar color based on progress - gradual transition
        let barColor;
        if (progress >= 1.0) {
            // Light cyan only at exactly 100%
            barColor = COLORS.TEXT_HIGHLIGHT;
        } else {
            // Interpolate between dark cyan (#006666) and cyan (#00FFFF) based on progress
            // Dark cyan at 0%, regular cyan approaching 100%
            const darkCyan = 0x66;
            const fullCyan = 0xFF;
            const intensity = Math.floor(darkCyan + (fullCyan - darkCyan) * progress);
            const hexIntensity = intensity.toString(16).padStart(2, '0');
            barColor = `#00${hexIntensity}${hexIntensity}`;
        }
        
        // Draw bar brackets
        UI.addText(barX, y, '[', COLORS.TEXT_NORMAL);
        UI.addText(barX + width + 1, y, ']', COLORS.TEXT_NORMAL);
        
        // Draw background (unfilled portion) first
        for (let i = 0; i < width; i++) {
            UI.addText(barX + 1 + i, y, '░', COLORS.TEXT_DIM);
        }
        
        // Draw filled portion on top
        for (let i = 0; i < filledWidth; i++) {
            UI.addText(barX + 1 + i, y, '▓', barColor);
        }
        
        y++;
        
        // Display label if provided
        if (label) {
            UI.addTextCentered(y++, label, COLORS.TEXT_DIM);
        }
        
        return y;
    }
    
    return {
        render
    };
})();
