/**
 * Space Travel Map Shared Helpers
 */

const SpaceTravelShared = (() => {
    function lerpColorHex(a, b, t) {
        const ar = parseInt(a.slice(1, 3), 16);
        const ag = parseInt(a.slice(3, 5), 16);
        const ab = parseInt(a.slice(5, 7), 16);
        const br = parseInt(b.slice(1, 3), 16);
        const bg = parseInt(b.slice(3, 5), 16);
        const bb = parseInt(b.slice(5, 7), 16);
        const rr = Math.round(ar + (br - ar) * t);
        const rg = Math.round(ag + (bg - ag) * t);
        const rb = Math.round(ab + (bb - ab) * t);
        return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
    }

    function hashString(seed) {
        let h = 2166136261;
        for (let i = 0; i < seed.length; i++) {
            h ^= seed.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function makeRng(seed) {
        let state = seed >>> 0;
        return () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 0x100000000;
        };
    }

    function isGasPlanet(typeId) {
        return typeId === BODY_TYPES.PLANET_GAS_GIANT.id
            || typeId === BODY_TYPES.PLANET_GAS_DWARF.id;
    }

    function isTerrestrialPlanet(typeId) {
        return typeId === BODY_TYPES.PLANET_EARTHLIKE.id
            || typeId === BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id
            || typeId === BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id;
    }

    function getLocalMapBodySymbol(body) {
        if (!body) {
            return '•';
        }
        if (body.kind === 'STATION' || body.type === 'STATION') {
            return '□';
        }
        if (body.kind === 'STAR') {
            const bodyType = Object.values(BODY_TYPES).find(bt => bt.id === body.type);
            return bodyType?.symbol || '⋆';
        }
        const hasRing = Array.isArray(body.features)
            ? body.features.includes('RING') || body.features.includes(PLANET_FEATURES?.RING?.id)
            : false;
        const bodyType = Object.values(BODY_TYPES).find(bt => bt.id === body.type);
        if (bodyType) {
            return hasRing && bodyType.symbolRing ? bodyType.symbolRing : bodyType.symbol;
        }
        return '•';
    }

    function getLineSymbolFromDirection(dx, dy) {
        const angle = Math.atan2(dy, dx);
        const sector = Math.round(angle / (Math.PI / 4));
        const index = (sector + 8) % 8;
        const chars = ['-', '/', '|', '\\', '-', '/', '|', '\\'];
        return chars[index];
    }

    function getDirectionalArrow(dx, dy) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag <= 0.000001) {
            return '▲';
        }
        const angle = Math.atan2(dy, dx);
        const degrees = (angle * (180 / Math.PI) + 360) % 360;
        if (degrees >= 337.5 || degrees < 22.5) {
            return '▶';
        } else if (degrees >= 22.5 && degrees < 67.5) {
            return '◥';
        } else if (degrees >= 67.5 && degrees < 112.5) {
            return '▲';
        } else if (degrees >= 112.5 && degrees < 157.5) {
            return '◤';
        } else if (degrees >= 157.5 && degrees < 202.5) {
            return '◀';
        } else if (degrees >= 202.5 && degrees < 247.5) {
            return '◣';
        } else if (degrees >= 247.5 && degrees < 292.5) {
            return '▼';
        }
        return '◢';
    }

    return {
        lerpColorHex,
        hashString,
        makeRng,
        isGasPlanet,
        isTerrestrialPlanet,
        getLocalMapBodySymbol,
        getLineSymbolFromDirection,
        getDirectionalArrow
    };
})();
