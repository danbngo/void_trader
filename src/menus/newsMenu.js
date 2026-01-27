/**
 * News Menu - Displays all news events with pagination
 */

const NewsMenu = (() => {
    let gameState = null;
    let currentPage = 0;
    const ITEMS_PER_PAGE = 5; // Reduced to prevent y overflow (each item takes ~5 lines)
    
    /**
     * Show the news menu
     * @param {GameState} state - Current game state
     * @param {Function} onReturn - Callback to return to previous screen
     */
    function show(state, onReturn) {
        gameState = state;
        currentPage = 0;
        UI.resetSelection();
        render(onReturn);
    }
    
    /**
     * Render the news menu
     */
    function render(onReturn) {
        UI.clear();
        
        const grid = UI.getGridSize();
        
        // Title
        UI.addTitleLineCentered(0, 'News');
        
        // Get all active news (not completed) OR recently completed (within 1 day)
        // where player has visited origin or target system, or it's global news
        const ONE_DAY_IN_YEARS = 1 / 365.25;
        const activeNews = gameState.newsEvents.filter(news => {
            const hasVisited = news.globalNews || 
                             (news.originSystem && gameState.visitedSystems.includes(news.originSystem.index)) || 
                             (news.targetSystem && gameState.visitedSystems.includes(news.targetSystem.index));
            
            if (!hasVisited) return false;
            
            // Show if not completed
            if (!news.completed) return true;
            
            // Show if completed within the last day
            if (news.completionYear && (gameState.currentYear - news.completionYear) <= ONE_DAY_IN_YEARS) {
                return true;
            }
            
            return false;
        });
        
        // Debug logging
        console.log('[NewsMenu] All news events:', gameState.newsEvents.map(n => ({
            name: n.name,
            completed: n.completed,
            originSystem: n.originSystem?.name || 'null',
            targetSystem: n.targetSystem?.name || 'null',
            startYear: n.startYear,
            duration: n.duration
        })));
        console.log('[NewsMenu] Active news after filter:', activeNews.map(n => ({
            name: n.name,
            originSystem: n.originSystem?.name || 'null',
            targetSystem: n.targetSystem?.name || 'null'
        })));
        console.log('[NewsMenu] Visited systems:', gameState.visitedSystems);
        console.log('[NewsMenu] Aliens spawned:', gameState.aliensSpawned);
        
        // Mark all as read
        activeNews.forEach(news => news.markAsRead());
        
        // Sort by start year (newest first)
        activeNews.sort((a, b) => b.startYear - a.startYear);
        
        // Calculate pagination
        const totalPages = Math.ceil(activeNews.length / ITEMS_PER_PAGE);
        const startIndex = currentPage * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, activeNews.length);
        const pageNews = activeNews.slice(startIndex, endIndex);
        
        // Display news items
        let y = 2; // Reduced from 3 to have only 1 empty line after title
        if (pageNews.length === 0) {
            UI.addText(5, y, 'No active news', COLORS.TEXT_DIM);
        } else {
            pageNews.forEach((news, index) => {
                const globalIndex = startIndex + index;
                
                // News header with name and systems
                // Only show [ENDED] for events with duration > 0
                const showEnded = news.completed && news.duration > 0;
                const newsTitle = showEnded ? `${globalIndex + 1}. ${news.name} [ENDED]` : `${globalIndex + 1}. ${news.name}`;
                UI.addText(5, y, newsTitle, COLORS.YELLOW);
                y++;
                
                // Description - wrap to multiple lines if needed (max 60 chars per line)
                // Use endDescription if news is completed
                const descLines = [];
                const maxLineLength = 60;
                let remainingText = news.completed && news.endDescription ? news.endDescription : news.description;
                while (remainingText.length > 0) {
                    if (remainingText.length <= maxLineLength) {
                        descLines.push(remainingText);
                        break;
                    }
                    // Find last space before max length
                    let breakPoint = remainingText.lastIndexOf(' ', maxLineLength);
                    if (breakPoint === -1) breakPoint = maxLineLength;
                    descLines.push(remainingText.substring(0, breakPoint));
                    remainingText = remainingText.substring(breakPoint + 1);
                }
                descLines.forEach(line => {
                    UI.addText(7, y, line, COLORS.TEXT_NORMAL);
                    y++;
                });
                
                // Only show expiration for non-instant news (duration > 0)
                if (news.duration > 0) {
                    // Calculate expiration date
                    const startDate = new Date(3000, 0, 1);
                    const daysFromStart = news.endYear * 365.25;
                    const expirationDate = new Date(startDate.getTime() + daysFromStart * 24 * 60 * 60 * 1000);
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const expirationStr = `${months[expirationDate.getMonth()]} ${expirationDate.getDate()}, ${expirationDate.getFullYear()}`;
                    
                    // Duration info with date
                    const yearsRemaining = news.endYear - gameState.currentYear;
                    const daysRemaining = Math.ceil(yearsRemaining * 365.25);
                    UI.addText(7, y, `Expires: ${expirationStr} (${daysRemaining} days)`, COLORS.TEXT_DIM);
                    y++;
                }
                
                // Blank line between news items
                y++;
            });
        }
        
        // Pagination info
        if (totalPages > 1) {
            const paginationY = grid.height - 6;
            UI.addText(5, paginationY, `Page ${currentPage + 1} of ${totalPages}`, COLORS.TEXT_DIM);
        }
        
        // Buttons at bottom
        const buttonY = grid.height - 4;
        const leftX = 5;
        const middleX = 28;
        
        // Column 1: Navigation buttons
        if (currentPage > 0) {
            UI.addButton(leftX, buttonY, 'p', 'Previous Page', () => {
                currentPage--;
                render(onReturn);
            }, COLORS.BUTTON);
        }
        
        if (currentPage < totalPages - 1) {
            UI.addButton(leftX, buttonY + 1, 'n', 'Next Page', () => {
                currentPage++;
                render(onReturn);
            }, COLORS.BUTTON);
        }
        
        // Column 2: Back button
        UI.addButton(middleX, buttonY, '0', 'Back', onReturn, COLORS.BUTTON);
        
        UI.draw();
    }
    
    return {
        show
    };
})();
