/**
 * Geometry utility functions
 */

const Geom = (() => {
    /**
     * Calculate angle from one point to another (in radians)
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @returns {number} Angle in radians
     */
    function angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance
     */
    function distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Check if a line segment intersects with a circle
     * @param {number} x1 - Line start X
     * @param {number} y1 - Line start Y
     * @param {number} x2 - Line end X
     * @param {number} y2 - Line end Y
     * @param {number} cx - Circle center X
     * @param {number} cy - Circle center Y
     * @param {number} radius - Circle radius
     * @returns {boolean} True if line intersects circle
     */
    function lineCircleIntersect(x1, y1, x2, y2, cx, cy, radius) {
        // Vector from line start to circle center
        const dx = cx - x1;
        const dy = cy - y1;
        
        // Vector representing the line
        const lx = x2 - x1;
        const ly = y2 - y1;
        
        // Length of line squared
        const lineLengthSquared = lx * lx + ly * ly;
        
        // If line has no length, check point-circle distance
        if (lineLengthSquared === 0) {
            return distance(x1, y1, cx, cy) <= radius;
        }
        
        // Project point onto line (clamped to segment)
        const t = Math.max(0, Math.min(1, (dx * lx + dy * ly) / lineLengthSquared));
        
        // Find closest point on line segment to circle center
        const closestX = x1 + t * lx;
        const closestY = y1 + t * ly;
        
        // Check if closest point is within circle radius
        return distance(closestX, closestY, cx, cy) <= radius;
    }
    
    /**
     * Get all points along a line using Bresenham's algorithm
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @returns {Array<{x: number, y: number}>} Array of points
     */
    function linePoints(x1, y1, x2, y2) {
        const points = [];
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (true) {
            points.push({ x, y });
            
            if (x === x2 && y === y2) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return points;
    }
    
    /**
     * Normalize screen coordinates to account for character aspect ratio (non-square characters)
     * Characters are typically taller than they are wide, so Y distances appear smaller.
     * This function divides Y by the aspect ratio to make distances isotropic.
     * @param {number} x - X coordinate in screen space (characters)
     * @param {number} y - Y coordinate in screen space (characters)
     * @param {number} charAspectRatio - Character height / width ratio (default 1.5)
     * @returns {Object} Normalized coordinates {x, y}
     */
    function normalizeScreenCoords(x, y, charAspectRatio = 1.5) {
        return {
            x: x,
            y: y / charAspectRatio
        };
    }
    
    /**
     * Calculate normalized distance between two screen-space points accounting for character aspect ratio
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @param {number} charAspectRatio - Character height / width ratio (default 1.5)
     * @returns {number} Normalized distance
     */
    function normalizedDistance(x1, y1, x2, y2, charAspectRatio = 1.5) {
        const norm1 = normalizeScreenCoords(x1, y1, charAspectRatio);
        const norm2 = normalizeScreenCoords(x2, y2, charAspectRatio);
        const dx = norm2.x - norm1.x;
        const dy = norm2.y - norm1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    return {
        angleBetween,
        distance,
        lineCircleIntersect,
        linePoints,
        normalizeScreenCoords,
        normalizedDistance
    };
})();
