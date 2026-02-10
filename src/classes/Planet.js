/**
 * Planet Class
 * Represents a planet or planet-like body with system data
 */

class Planet {
    /**
     * @param {Object} data
     */
    constructor(data = {}) {
        this.id = data.id || '';
        this.name = data.name || '';
        this.type = data.type || '';
        this.radiusAU = data.radiusAU || 0;
        this.orbit = data.orbit || null;
        this.kind = data.kind || 'PLANET';
        this.features = data.features ?? [];
        this.surfaceType = data.surfaceType ?? null;
        this.moonCount = data.moonCount ?? 0;
        this.rotationDurationHours = data.rotationDurationHours ?? 24;
        this.rotationPhase = data.rotationPhase ?? 0;
        this.axialTiltDeg = data.axialTiltDeg ?? 0;

        // Buildings available at this location
        this.buildings = data.buildings ?? [];

        // Market data
        this.population = data.population ?? 0;
        this.governmentType = data.governmentType ?? null;
        this.cultureLevel = data.cultureLevel ?? null;
        this.technologyLevel = data.technologyLevel ?? null;
        this.industryLevel = data.industryLevel ?? null;
        this.populationLevel = data.populationLevel ?? null;
        this.cargoStock = data.cargoStock ?? {};
        this.cargoPriceModifier = data.cargoPriceModifier ?? {};
        this.fees = data.fees ?? 0;

        // Shipyard data
        this.ships = data.ships ?? [];
        this.modules = data.modules ?? [];

        // Tavern data
        this.officers = data.officers ?? [];

        // Encounter weights
        this.pirateWeight = data.pirateWeight ?? 0;
        this.policeWeight = data.policeWeight ?? 0;
        this.merchantWeight = data.merchantWeight ?? 0;
        this.smugglersWeight = data.smugglersWeight ?? 0;
        this.soldiersWeight = data.soldiersWeight ?? 0;
        this.alienWeight = data.alienWeight ?? 0;

        // Alien conquest state
        this.conqueredByAliens = data.conqueredByAliens ?? false;
        this.conqueredYear = data.conqueredYear ?? null;

        // Jobs are still system-level; keep placeholder for compatibility
        this.jobs = data.jobs ?? [];
    }

    copySystemDataFrom(source) {
        if (!source) {
            return;
        }
        const keys = [
            'buildings',
            'population',
            'governmentType',
            'cultureLevel',
            'technologyLevel',
            'industryLevel',
            'populationLevel',
            'cargoStock',
            'cargoPriceModifier',
            'fees',
            'ships',
            'modules',
            'officers',
            'pirateWeight',
            'policeWeight',
            'merchantWeight',
            'smugglersWeight',
            'soldiersWeight',
            'alienWeight',
            'conqueredByAliens',
            'conqueredYear'
        ];
        keys.forEach(key => {
            if (source[key] !== undefined) {
                this[key] = source[key];
            }
        });
    }
}
