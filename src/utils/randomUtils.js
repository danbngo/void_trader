/**
 * Random Number Utilities
 */

const RandomUtils = (() => {
    /**
     * Generate random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer in range [min, max]
     */
    function randomInt(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    /**
     * Generate random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float in range [min, max)
     */
    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Pick a random item from a weighted list
     * @param {Array<{type: any, weight: number}>} list - Array of items with weights
     * @returns {any} The selected item's type
     */
    function pickWeighted(list) {
        const total = list.reduce((sum, entry) => sum + entry.weight, 0);
        const roll = Math.random() * total;
        let acc = 0;
        for (const entry of list) {
            acc += entry.weight;
            if (roll <= acc) {
                return entry.type;
            }
        }
        return list[list.length - 1].type;
    }

    /**
     * Pick a random element from an array
     * @param {Array} array - Array to pick from
     * @returns {any} Random element from array
     */
    function randomElement(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Shuffle an array (Fisher-Yates algorithm)
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array (modifies original)
     */
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    return {
        randomInt,
        randomRange,
        pickWeighted,
        randomElement,
        shuffle
    };
})();
