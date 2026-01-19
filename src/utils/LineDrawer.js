/**
 * Line Drawing Utility
 * Provides functions for drawing lines between two points using ASCII characters
 */

const LineDrawer = (() => {
    /**
     * Draw a line from start to end coordinates using ASCII line characters
     * @param {number} x1 - Start X coordinate
     * @param {number} y1 - Start Y coordinate
     * @param {number} x2 - End X coordinate
     * @param {number} y2 - End Y coordinate
     * @param {boolean} inclusive - Whether to include start and end points
     * @param {string} color - Color for the line
     * @returns {Array<{x: number, y: number, symbol: string, color: string}>} Array of line points
     */
    function drawLine(x1, y1, x2, y2, inclusive = false, color = COLORS.GRAY) {
        const points = [];
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            // Start and end are same point
            if (inclusive) {
                points.push({ x: x1, y: y1, symbol: '•', color });
            }
            return points;
        }
        
        // Bresenham's line algorithm to get all points
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        const xStep = dx / steps;
        const yStep = dy / steps;
        
        for (let i = 0; i <= steps; i++) {
            // Skip first and last if not inclusive
            if (!inclusive && (i === 0 || i === steps)) {
                continue;
            }
            
            const x = Math.round(x1 + i * xStep);
            const y = Math.round(y1 + i * yStep);
            
            // Determine which line character to use based on direction
            let symbol = getLineSymbol(x1, y1, x2, y2, i, steps);
            
            points.push({ x, y, symbol, color });
        }
        
        return points;
    }
    
    /**
     * Get appropriate line symbol based on direction
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} step - Current step
     * @param {number} totalSteps - Total steps
     * @returns {string} Line symbol
     */
    function getLineSymbol(x1, y1, x2, y2, step, totalSteps) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        // Calculate angle in radians
        const angle = Math.atan2(dy, dx);
        
        // Convert to degrees for easier comparison
        const degrees = angle * (180 / Math.PI);
        
        // Normalize to 0-360
        const normalizedDegrees = (degrees + 360) % 360;
        
        // Choose symbol based on angle
        // Horizontal: 0° or 180° (±22.5°)
        if ((normalizedDegrees >= 0 && normalizedDegrees < 22.5) || 
            (normalizedDegrees >= 157.5 && normalizedDegrees < 202.5) ||
            (normalizedDegrees >= 337.5 && normalizedDegrees < 360)) {
            return '─';
        }
        // Vertical: 90° or 270° (±22.5°)
        else if ((normalizedDegrees >= 67.5 && normalizedDegrees < 112.5) ||
                 (normalizedDegrees >= 247.5 && normalizedDegrees < 292.5)) {
            return '│';
        }
        // Diagonal down-right or up-left: 45° or 225° (±22.5°) - backslash
        else if ((normalizedDegrees >= 22.5 && normalizedDegrees < 67.5) ||
                 (normalizedDegrees >= 202.5 && normalizedDegrees < 247.5)) {
            return '\\';
        }
        // Diagonal down-left or up-right: 135° or 315° (±22.5°) - forward slash
        else {
            return '/';
        }
    }
    
    return {
        drawLine
    };
})();
