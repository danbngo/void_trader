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
            if (body.type === BODY_TYPES.STAR_RED_GIANT.id || body.type === BODY_TYPES.STAR_BLUE_GIANT.id) {
                return '☼';
            }
            if (body.type === BODY_TYPES.STAR_NEUTRON.id) {
                return '+';
            }
            if (body.type === BODY_TYPES.STAR_BLACK_HOLE.id) {
                return '@';
            }
            return '⋆';
        }
        const hasRing = Array.isArray(body.features)
            ? body.features.includes('RING') || body.features.includes(PLANET_FEATURES?.RING?.id)
            : false;
        switch (body.type) {
            case BODY_TYPES.PLANET_GAS_GIANT.id:
                return hasRing ? 'Ø' : 'O';
            case BODY_TYPES.PLANET_GAS_DWARF.id:
                return '○';
            case BODY_TYPES.PLANET_ICE_GIANT.id:
                return hasRing ? 'ʘ' : '⓿';
            case BODY_TYPES.PLANET_ICE_DWARF.id:
                return '*';
            case BODY_TYPES.PLANET_EARTHLIKE.id:
            case BODY_TYPES.PLANET_TERRESTRIAL_GIANT.id:
                return '●';
            case BODY_TYPES.PLANET_TERRESTRIAL_DWARF.id:
                return '•';
            default:
                return '•';
        }
    }

    function getLineSymbolFromDirection(dx, dy) {
        const angle = Math.atan2(dy, dx);
        const sector = Math.round(angle / (Math.PI / 4));
        const index = (sector + 8) % 8;
        const chars = ['-', '/', '|', '\\', '-', '/', '|', '\\'];
        return chars[index];
    }

    return {
        lerpColorHex,
        hashString,
        makeRng,
        isGasPlanet,
        isTerrestrialPlanet,
        getLocalMapBodySymbol,
        getLineSymbolFromDirection
    };
})();
