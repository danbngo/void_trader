/**
 * Scan System Menu
 * Shows detailed information about a selected system
 */

const ScanSystemMenu = (() => {
    /**
     * Show system scan details
     * @param {StarSystem} system - The system to scan
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(system, onReturn) {
        UI.clear();
        UI.resetSelection();
        
        const grid = UI.getGridSize();
        const gameState = window.gameState;
        
        // Title
        UI.addTitleLineCentered(0, 'System Scan');
        
        // System details
        let y = 2;
        y = UI.addHeaderLine(5, y, 'Overview');
        const flavorText = getFlavorText(system);
        const isVisited = gameState.visitedSystems.includes(gameState.systems.indexOf(system));
        const starsCount = (system.stars || []).length;
        const planetsCount = (system.planets || []).length;
        const moonsCount = (system.moons || []).length;
        const beltsCount = (system.belts || []).length;

        const cultureName = SYSTEM_CULTURE_LEVELS_ALL.find(l => l.id === system.cultureLevel)?.name || 'Unknown';
        const techName = SYSTEM_TECHNOLOGY_LEVELS_ALL.find(l => l.id === system.technologyLevel)?.name || 'Unknown';
        const industryName = SYSTEM_INDUSTRY_LEVELS_ALL.find(l => l.id === system.industryLevel)?.name || 'Unknown';
        const popLevelName = SYSTEM_POPULATION_LEVELS_ALL.find(l => l.id === system.populationLevel)?.name || 'Unknown';

        const overviewData = [
            { label: 'System Name:', value: system.name, valueColor: COLORS.CYAN },
            { label: 'Coordinates:', value: `(${system.x}, ${system.y})`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Population:', value: `${system.population} million`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Government:', value: SYSTEM_GOVERNMENT_TYPES[system.governmentType]?.name || 'Unknown', valueColor: COLORS.TEXT_NORMAL },
            { label: 'Culture:', value: cultureName, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Technology:', value: techName, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Industry:', value: industryName, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Pop Level:', value: popLevelName, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Stars:', value: String(starsCount), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Planets:', value: String(planetsCount), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Moons:', value: String(moonsCount), valueColor: COLORS.TEXT_NORMAL },
            { label: 'Belts:', value: String(beltsCount), valueColor: COLORS.TEXT_NORMAL }
        ];
        
        // Add conquest status if conquered
        if (system.conqueredByAliens) {
            overviewData.push({ label: 'Status:', value: 'CONQUERED BY ALIENS', valueColor: COLORS.TEXT_ERROR });
        }
        
        overviewData.push({ label: 'Visited:', value: isVisited ? 'Yes' : 'No', valueColor: isVisited ? COLORS.GREEN : COLORS.GRAY });
        overviewData.push({ label: 'Description:', value: flavorText, valueColor: COLORS.TEXT_NORMAL });
        
        y = TableRenderer.renderKeyValueList(5, y, overviewData);
        y++;
        
        // Buildings - hide if conquered
        if (system.conqueredByAliens) {
            y = UI.addHeaderLine(5, y, 'Facilities');
            UI.addText(5, y++, 'All facilities destroyed by alien occupation', COLORS.TEXT_ERROR);
            y++;
        } else {
            y = UI.addHeaderLine(5, y, 'Facilities');
        if (isVisited) {
            const buildingNames = system.buildings.map(buildingId => {
                const building = BUILDING_TYPES[buildingId];
                return building ? building.name : buildingId;
            });
            UI.addText(5, y++, buildingNames.join(', '), COLORS.TEXT_NORMAL);
            
            // Shipyard and Tavern info
            const facilityInfo = [];
            
            // Add Trading Fees to Facilities section
            facilityInfo.push({ 
                label: 'Trading Fees:', 
                value: `${(system.fees * 100).toFixed(1)}%`, 
                valueColor: COLORS.TEXT_NORMAL 
            });
            
            if (system.buildings.includes('SHIPYARD')) {
                const shipCount = system.ships ? system.ships.length : 0;
                facilityInfo.push({ 
                    label: 'Shipyard Inventory:', 
                    value: `${shipCount} ship${shipCount !== 1 ? 's' : ''} available`, 
                    valueColor: COLORS.TEXT_NORMAL 
                });
            }
            
            if (system.buildings.includes('TAVERN')) {
                const officerCount = system.officers ? system.officers.length : 0;
                facilityInfo.push({ 
                    label: 'Tavern Officers:', 
                    value: `${officerCount} officer${officerCount !== 1 ? 's' : ''} available`, 
                    valueColor: COLORS.TEXT_NORMAL 
                });
            }
            
            if (facilityInfo.length > 0) {
                y = TableRenderer.renderKeyValueList(5, y, facilityInfo);
                y++;
            }
        } else {
            UI.addText(5, y++, '?', COLORS.TEXT_DIM);
            y++;
        }
        }
        
        // Market goods table - skip if conquered
        if (!system.conqueredByAliens && system.buildings.includes('MARKET')) {
            y = UI.addHeaderLine(5, y, 'Market Goods');
            
            if (!isVisited) {
                UI.addText(5, y++, 'Visit this system once to record market information', COLORS.TEXT_DIM);
                y++;
            } else {
                // Get all cargo types that have stock > 0
                const availableGoods = Object.keys(system.cargoStock)
                .filter(cargoId => system.cargoStock[cargoId] > 0)
                .map(cargoId => {
                    const cargoType = CARGO_TYPES[cargoId];
                    if (!cargoType) return null;
                    
                    const stock = system.cargoStock[cargoId];
                    const basePrice = cargoType.baseValue * system.cargoPriceModifier[cargoId];
                    
                    // Calculate prices with fees (assuming no barter skill for scanning)
                    const buyPrice = Math.floor(basePrice * (1 + system.fees));
                    const sellPrice = Math.floor(basePrice / (1 + system.fees));
                    
                    // Check if player has training for this cargo type
                    const hasTraining = gameState.enabledCargoTypes.some(ct => ct.id === cargoType.id);
                    
                    return {
                        name: cargoType.name,
                        stock: stock,
                        baseValue: cargoType.baseValue,
                        buyPrice: buyPrice,
                        sellPrice: sellPrice,
                        hasTraining: hasTraining
                    };
                })
                .filter(item => item !== null);
            
            if (availableGoods.length > 0) {
                // Render goods table
                const headers = ['Good', 'Stock', 'Base', 'Buy', 'Sell'];
                const rows = availableGoods.map(good => {
                    // Calculate color ratios for buy/sell prices
                    const buyRatio = good.baseValue / good.buyPrice; // Lower buy price = higher ratio = better
                    const sellRatio = good.sellPrice / good.baseValue; // Higher sell price = higher ratio = better
                    
                    // Calculate market stock ratio: stock * 4 / MAX_CARGO_AMOUNT_IN_MARKET
                    let stockColor;
                    if (good.stock === 0) {
                        stockColor = COLORS.GRAY;
                    } else if (good.hasTraining) {
                        const stockRatio = (good.stock * 4) / MAX_CARGO_AMOUNT_IN_MARKET;
                        stockColor = UI.calcStatColor(stockRatio);
                    } else {
                        stockColor = COLORS.TEXT_DIM;
                    }
                    
                    // Grey out if player lacks training
                    const buyColor = good.hasTraining ? UI.calcStatColor(buyRatio) : COLORS.TEXT_DIM;
                    const sellColor = good.hasTraining ? UI.calcStatColor(sellRatio) : COLORS.TEXT_DIM;
                    
                    // Get cargo type for color
                    const cargoType = CARGO_TYPES[Object.keys(system.cargoStock).find(id => 
                        CARGO_TYPES[id] && CARGO_TYPES[id].name === good.name
                    )];
                    const nameColor = good.hasTraining ? (cargoType ? cargoType.color : COLORS.TEXT_NORMAL) : COLORS.TEXT_DIM;
                    const baseColor = good.hasTraining ? COLORS.WHITE : COLORS.TEXT_DIM;
                    
                    return [
                        { text: good.name, color: nameColor },
                        { text: String(good.stock), color: stockColor },
                        { text: String(good.baseValue), color: baseColor },
                        { text: String(good.buyPrice), color: buyColor },
                        { text: String(good.sellPrice), color: sellColor }
                    ];
                });
                
                y = TableRenderer.renderTable(5, y, headers, rows, -1, 2);
            } else {
                UI.addText(5, y++, 'No goods in stock', COLORS.TEXT_DIM);
            }
            y++;
            }
        }
        
        // Back button
        UI.addCenteredButton(grid.height - 4, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    /**
     * Get flavor text based on system government
     */
    function getFlavorText(system) {
        const texts = {
            DEMOCRACY: 'A thriving society shaped by civic consensus',
            CORPORATE: 'Megacorporations steer every major decision',
            MILITARY: 'Martial order governs daily life',
            THEOCRACY: 'Faith and doctrine define the system\'s character',
            AUTOCRACY: 'Power is centralized under a single authority',
            OLIGARCHY: 'A small elite controls the system\'s future',
            COMMUNAL: 'Collective governance guides the populace',
            ANARCHY: 'Loose factions contest control of local space'
        };
        return texts[system.governmentType] || 'A typical star system';
    }
    
    return {
        show
    };
})();
