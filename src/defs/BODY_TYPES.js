/**
 * Body Types
 * Defines the types of celestial bodies in a system
 */

const BODY_TYPES = {
    STAR_RED_DWARF: { id: 'STAR_RED_DWARF', name: 'Red Dwarf', category: 'STAR' },
    STAR_YELLOW_DWARF: { id: 'STAR_YELLOW_DWARF', name: 'Yellow Dwarf', category: 'STAR' },
    STAR_WHITE_DWARF: { id: 'STAR_WHITE_DWARF', name: 'White Dwarf', category: 'STAR' },
    STAR_RED_GIANT: { id: 'STAR_RED_GIANT', name: 'Red Giant', category: 'STAR' },
    STAR_BLUE_GIANT: { id: 'STAR_BLUE_GIANT', name: 'Blue Giant', category: 'STAR' },
    STAR_NEUTRON: { id: 'STAR_NEUTRON', name: 'Neutron Star', category: 'STAR' },
    STAR_BLACK_HOLE: { id: 'STAR_BLACK_HOLE', name: 'Black Hole', category: 'STAR' },

    PLANET_TERRESTRIAL_GIANT: { id: 'PLANET_TERRESTRIAL_GIANT', name: 'Terrestrial Giant', category: 'PLANET' },
    PLANET_TERRESTRIAL_DWARF: { id: 'PLANET_TERRESTRIAL_DWARF', name: 'Terrestrial Dwarf', category: 'PLANET' },
    PLANET_EARTHLIKE: { id: 'PLANET_EARTHLIKE', name: 'Earthlike', category: 'PLANET' },
    PLANET_GAS_GIANT: { id: 'PLANET_GAS_GIANT', name: 'Gas Giant', category: 'PLANET' },
    PLANET_GAS_DWARF: { id: 'PLANET_GAS_DWARF', name: 'Gas Dwarf', category: 'PLANET' },
    PLANET_ICE_GIANT: { id: 'PLANET_ICE_GIANT', name: 'Ice Giant', category: 'PLANET' },
    PLANET_ICE_DWARF: { id: 'PLANET_ICE_DWARF', name: 'Ice Dwarf', category: 'PLANET' },

    DWARF_PLANET_ROCKY: { id: 'DWARF_PLANET_ROCKY', name: 'Rocky Dwarf Planet', category: 'DWARF_PLANET' },
    DWARF_PLANET_ICE: { id: 'DWARF_PLANET_ICE', name: 'Icy Dwarf Planet', category: 'DWARF_PLANET' },

    BELT_ASTEROID: { id: 'BELT_ASTEROID', name: 'Asteroid Belt', category: 'BELT' },
    BELT_ICY: { id: 'BELT_ICY', name: 'Icy Belt', category: 'BELT' },
    BELT_GAS: { id: 'BELT_GAS', name: 'Gas Belt', category: 'BELT' },

    MOON_ROCKY: { id: 'MOON_ROCKY', name: 'Rocky Major Moon', category: 'MOON' },
    MOON_ICE: { id: 'MOON_ICE', name: 'Icy Major Moon', category: 'MOON' },
    MOON_VOLCANIC: { id: 'MOON_VOLCANIC', name: 'Volcanic Major Moon', category: 'MOON' }
};

const STAR_BODY_TYPES = [
    BODY_TYPES.STAR_RED_DWARF,
    BODY_TYPES.STAR_YELLOW_DWARF,
    BODY_TYPES.STAR_WHITE_DWARF,
    BODY_TYPES.STAR_RED_GIANT,
    BODY_TYPES.STAR_BLUE_GIANT,
    BODY_TYPES.STAR_NEUTRON,
    BODY_TYPES.STAR_BLACK_HOLE
];

const PLANET_BODY_TYPES = [
    BODY_TYPES.PLANET_TERRESTRIAL_GIANT,
    BODY_TYPES.PLANET_TERRESTRIAL_DWARF,
    BODY_TYPES.PLANET_EARTHLIKE,
    BODY_TYPES.PLANET_GAS_GIANT,
    BODY_TYPES.PLANET_GAS_DWARF,
    BODY_TYPES.PLANET_ICE_GIANT,
    BODY_TYPES.PLANET_ICE_DWARF
];

const DWARF_PLANET_BODY_TYPES = [
    BODY_TYPES.DWARF_PLANET_ROCKY,
    BODY_TYPES.DWARF_PLANET_ICE
];

const MOON_BODY_TYPES = [
    BODY_TYPES.MOON_ROCKY,
    BODY_TYPES.MOON_ICE,
    BODY_TYPES.MOON_VOLCANIC
];

const BELT_BODY_TYPES = [
    BODY_TYPES.BELT_ASTEROID,
    BODY_TYPES.BELT_ICY,
    BODY_TYPES.BELT_GAS
];

const PLANETARY_BODY_TYPES = [...PLANET_BODY_TYPES, ...DWARF_PLANET_BODY_TYPES];
