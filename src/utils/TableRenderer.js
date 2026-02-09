/**
 * Table Renderer Utility
 * Helper functions for rendering tables with dynamic column widths
 */

const TableRenderer = (() => {
    /**
     * Render a table with headers and rows, with optional row selection highlighting
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {Array<string>} headers - Column headers
     * @param {Array<Array<{text: string, color: string}>>} rows - Array of rows, each row is array of cells
     * @param {number} selectedRowIndex - Index of selected row (-1 for none)
     * @param {number} spacing - Space between columns (default: 2)
     * @param {Function} onRowClick - Optional callback when a row is clicked (receives row index)
     * @returns {number} - Y position after the table
     */
    function renderTable(x, y, headers, rows, selectedRowIndex = -1, spacing = 2, onRowClick = null) {
        // Calculate column widths based on content
        const columnWidths = headers.map((header, colIndex) => {
            let maxWidth = header.length;
            rows.forEach(row => {
                if (row[colIndex]) {
                    maxWidth = Math.max(maxWidth, row[colIndex].text.length);
                }
            });
            return maxWidth;
        });
        
        // Calculate total row width for selection highlighting
        const totalWidth = columnWidths.reduce((sum, width, index) => {
            return sum + width + (index < columnWidths.length - 1 ? spacing : 0);
        }, 0);
        
        // Render headers
        let currentX = x;
        headers.forEach((header, index) => {
            UI.addText(currentX, y, header, COLORS.TEXT_DIM);
            currentX += columnWidths[index] + spacing;
        });
        
        // Render rows
        let currentY = y + 1;
        rows.forEach((row, rowIndex) => {
            const isSelected = (rowIndex === selectedRowIndex);
            
            // Add selection highlight background if selected
            if (isSelected) {
                UI.addSelectionHighlight(x, currentY, totalWidth);
            }
            
            // Register row as clickable if callback provided
            if (onRowClick) {
                UI.registerTableRow(x, currentY, totalWidth, rowIndex, onRowClick);
            }
            
            currentX = x;
            row.forEach((cell, colIndex) => {
                // Keep original cell color even when selected
                UI.addText(currentX, currentY, cell.text, cell.color);
                currentX += columnWidths[colIndex] + spacing;
            });
            currentY++;
        });
        
        return currentY;
    }
    
    /**
     * Render a simple key-value list
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
    * @param {Array<{label: string, value: string, valueColor: string, labelColor?: string}>} items - Array of label-value pairs
     * @returns {number} - Y position after the list
     */
    function renderKeyValueList(x, y, items) {
        const grid = UI.getGridSize();
        let currentY = y;
        items.forEach(item => {
            UI.addText(x, currentY, item.label + ' ', item.labelColor || COLORS.TEXT_DIM);
            const valueX = x + item.label.length + 1;
            // Ensure value doesn't go out of bounds
            if (valueX < grid.width) {
                const maxValueLength = grid.width - valueX;
                const truncatedValue = item.value.length > maxValueLength 
                    ? item.value.substring(0, maxValueLength) 
                    : item.value;
                UI.addText(valueX, currentY, truncatedValue, item.valueColor || COLORS.TEXT_NORMAL);
            }
            currentY++;
        });
        return currentY;
    }
    
    return {
        renderTable,
        renderKeyValueList
    };
})();
