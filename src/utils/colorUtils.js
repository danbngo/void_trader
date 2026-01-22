/**
 * Color Utilities - Helper functions for color manipulation and calculation
 */

const ColorUtils = (() => {
    /**
     * Calculate stat color based on ratio
     * @param {number} ratio - Value ratio (0 to 4+)
     * @param {boolean} maxAsGreen - If true, ratio of 1.0 shows as light green instead of white
     * @returns {string} Color string
     */
    function calcStatColor(ratio, maxAsGreen = false) {
        // Special case: if maxAsGreen is true and ratio is exactly 1.0, return light green
        if (maxAsGreen && ratio >= 0.9999 && ratio <= 1.0001) {
            return '#90EE90'; // Light green
        }
        
        if (ratio <= 0) return '#8B0000'; // Dark red
        if (ratio <= 0.25) {
            // Interpolate between dark red and red
            const t = ratio / 0.25;
            return interpolateColor('#8B0000', '#FF0000', t);
        }
        if (ratio <= 0.5) {
            // Interpolate between red and orange
            const t = (ratio - 0.25) / 0.25;
            return interpolateColor('#FF0000', '#FFA500', t);
        }
        if (ratio <= 0.75) {
            // Interpolate between orange and yellow
            const t = (ratio - 0.5) / 0.25;
            return interpolateColor('#FFA500', '#FFFF00', t);
        }
        if (ratio <= 1.0) {
            // Interpolate between yellow and white
            const t = (ratio - 0.75) / 0.25;
            return interpolateColor('#FFFF00', '#FFFFFF', t);
        }
        if (ratio <= 1.5) {
            // Interpolate between white and light green
            const t = (ratio - 1.0) / 0.5;
            return interpolateColor('#FFFFFF', '#90EE90', t);
        }
        if (ratio <= 2.0) {
            // Interpolate between light green and green
            const t = (ratio - 1.5) / 0.5;
            return interpolateColor('#90EE90', '#00FF00', t);
        }
        if (ratio <= 4.0) {
            // Interpolate between green and dark green
            const t = (ratio - 2.0) / 2.0;
            return interpolateColor('#00FF00', '#006400', t);
        }
        return '#006400'; // Dark green for 4.0+
    }
    
    /**
     * Interpolate between two hex colors
     * @param {string} color1 - Start color in hex format
     * @param {string} color2 - End color in hex format
     * @param {number} t - Interpolation factor (0 to 1)
     * @returns {string} Interpolated color in hex format
     */
    function interpolateColor(color1, color2, t) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    return {
        calcStatColor,
        interpolateColor
    };
})();
