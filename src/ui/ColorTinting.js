/**
 * Color Tinting Module - Manages character-level color tinting for effects
 * Preserves black backgrounds while tinting colored text
 */

const ColorTinting = (() => {
    let currentTint = {
        color: null,      // Hex color like #ff8a00
        alpha: 0,         // 0-1 strength
        active: false
    };

    /**
     * Convert hex color to RGB
     */
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return { r: 0, g: 0, b: 0 };
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        };
    }

    /**
     * Convert RGB to hex
     */
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
    }

    /**
     * Blend two colors together
     * Returns a color that's a blend of baseColor and tintColor by alpha strength
     */
    function blendColors(baseHex, tintHex, alpha) {
        // If alpha is 0 or no tint, return original
        if (alpha <= 0 || !tintHex) return baseHex;

        const baseRgb = hexToRgb(baseHex);
        const tintRgb = hexToRgb(tintHex);

        // Linear interpolation between base and tint
        const blended = {
            r: baseRgb.r + (tintRgb.r - baseRgb.r) * alpha,
            g: baseRgb.g + (tintRgb.g - baseRgb.g) * alpha,
            b: baseRgb.b + (tintRgb.b - baseRgb.b) * alpha
        };

        return rgbToHex(blended.r, blended.g, blended.b);
    }

    /**
     * Apply tint to a color, preserving black
     * Black (#000000) and very dark colors remain untinted
     */
    function applyTint(colorHex, tintColor, tintAlpha) {
        if (!tintAlpha || tintAlpha <= 0 || !tintColor) {
            return colorHex;
        }

        // Preserve black - don't tint if color is very dark
        const rgb = hexToRgb(colorHex);
        const brightness = (rgb.r + rgb.g + rgb.b) / 3;
        
        // If brightness is less than 10 (very dark), consider it "black" and preserve it
        if (brightness < 10) {
            return colorHex;
        }

        // Blend the color with the tint
        return blendColors(colorHex, tintColor, tintAlpha);
    }

    /**
     * Set the current tint effect
     */
    function setTint(tintColor, tintAlpha) {
        currentTint.color = tintColor;
        currentTint.alpha = Math.max(0, Math.min(1, tintAlpha || 0));
        currentTint.active = tintAlpha > 0 && tintColor !== null;
    }

    /**
     * Clear the current tint
     */
    function clearTint() {
        currentTint.color = null;
        currentTint.alpha = 0;
        currentTint.active = false;
    }

    /**
     * Get current tint state
     */
    function getTint() {
        return { ...currentTint };
    }

    /**
     * Check if tint is active
     */
    function isTintActive() {
        return currentTint.active;
    }

    /**
     * Apply current tint to a color
     */
    function applyCurrentTint(colorHex) {
        if (!currentTint.active) {
            return colorHex;
        }
        return applyTint(colorHex, currentTint.color, currentTint.alpha);
    }

    return {
        setTint,
        clearTint,
        getTint,
        isTintActive,
        applyCurrentTint,
        applyTint,
        blendColors,
        hexToRgb,
        rgbToHex
    };
})();
