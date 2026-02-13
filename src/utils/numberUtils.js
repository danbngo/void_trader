/**
 * Number Utilities
 */

const NumberUtils = (() => {
    /**
     * Convert a number to Roman numerals
     * @param {number} value - Number to convert (must be positive)
     * @returns {string} Roman numeral representation
     */
    function toRomanNumeral(value) {
        if (value <= 0) {
            return '';
        }
        const map = [
            { value: 1000, symbol: 'M' },
            { value: 900, symbol: 'CM' },
            { value: 500, symbol: 'D' },
            { value: 400, symbol: 'CD' },
            { value: 100, symbol: 'C' },
            { value: 90, symbol: 'XC' },
            { value: 50, symbol: 'L' },
            { value: 40, symbol: 'XL' },
            { value: 10, symbol: 'X' },
            { value: 9, symbol: 'IX' },
            { value: 5, symbol: 'V' },
            { value: 4, symbol: 'IV' },
            { value: 1, symbol: 'I' }
        ];
        let remaining = value;
        let result = '';
        for (const entry of map) {
            while (remaining >= entry.value) {
                result += entry.symbol;
                remaining -= entry.value;
            }
        }
        return result;
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0 to 1)
     * @returns {number} Interpolated value
     */
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    return {
        toRomanNumeral,
        clamp,
        lerp
    };
})();
