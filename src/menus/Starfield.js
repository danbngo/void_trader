/**
 * Starfield - Animated background starfield effect
 */

const Starfield = (() => {
    const stars = [];
    const numStars = 100;
    const expansionRate = 1.01;
    const resetDistance = 200;
    const resetRange = 5; // Stars reset to 0-5 distance from origin
    
    // Star characters to choose from
    const starChars = ['·']// ['*', '·', '.'];
    
    // Grayscale colors from almost black to white
    const starColors = [
        '#0A0A0A', // almost black
        '#1A1A1A',
        '#2A2A2A',
        '#3A3A3A',
        '#4A4A4A',
        '#5A5A5A',
        '#6A6A6A',
        '#808080', // gray
        '#A0A0A0',
        '#C0C0C0', // light gray
        '#E0E0E0',
        '#FFFFFF'  // white
    ];
    
    /**
     * Initialize the starfield with random stars
     */
    function init() {
        stars.length = 0; // Clear existing stars
        
        for (let i = 0; i < numStars; i++) {
            stars.push(createStar());
        }
    }
    
    /**
     * Create a new star with random properties
     */
    function createStar() {
        // Random position between 0-100
        const dist = Math.random() * Math.random() * Math.random() * 200;
        //rotate point around origin
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        
        return {
            x,
            y,
            char: starChars[Math.floor(Math.random() * starChars.length)]
        };
    }
    
    /**
     * Update star positions (move them outward)
     */
    function update() {
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            
            // Move star outward from origin
            star.x *= expansionRate;
            star.y *= expansionRate;
            
            // Calculate distance from origin
            const distance = Math.sqrt(star.x * star.x + star.y * star.y);
            
            // Reset star if too far away
            if (distance > resetDistance) {
                // Reset to near origin with small random offset
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * resetRange;
                star.x = Math.cos(angle) * dist;
                star.y = Math.sin(angle) * dist;
                
                // Randomize appearance
                star.char = starChars[Math.floor(Math.random() * starChars.length)];
            }
        }
    }
    
    /**
     * Render the starfield to the UI grid
     * Coordinate system: (0,0) = center of screen, (100,0) = right edge, (0,-100) = bottom edge
     */
    function render() {
        const grid = UI.getGridSize();
        const centerX = Math.floor(grid.width / 2);
        const centerY = Math.floor(grid.height / 2);
        
        // Scale factors to map our coordinate system to screen coordinates
        const scaleX = grid.width / 200;  // 100 units on each side of center
        const scaleY = grid.height / 200; // 100 units above/below center
        
        for (const star of stars) {
            // Calculate distance from origin (0,0)
            const distance = Math.sqrt(star.x * star.x + star.y * star.y);
            
            // Map distance to brightness (0-100 range to reach screen edges)
            // Stars closer to center (distance ~0) are darker, farther stars are brighter
            // Screen edges are at distance ~100, so divide by 100 to reach full brightness at edges
            const brightness = Math.min(distance / 100, 1); // 0 = dark, 1 = bright at screen edge
            
            // Select color based on distance
            const colorIndex = Math.floor(brightness * (starColors.length - 1));
            const starColor = starColors[colorIndex];
            
            // Convert star coordinates to screen coordinates
            // Note: y is inverted because screen y increases downward
            const screenX = Math.floor(centerX + star.x * scaleX);
            const screenY = Math.floor(centerY - star.y * scaleY);
            
            // Only render if on screen
            if (screenX >= 0 && screenX < grid.width && 
                screenY >= 0 && screenY < grid.height) {
                UI.addText(screenX, screenY, star.char, starColor);
            }
        }
    }
    
    // Public API
    return {
        init,
        update,
        render
    };
})();
