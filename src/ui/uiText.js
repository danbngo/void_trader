/**
 * UI Text Module - text registration and rendering helpers
 */

const UiText = (() => {
    function addText(registeredTexts, gridWidth, gridHeight, x, y, text, color = 'white', fontSize = 1.0, underline = false) {
        if (x < 0 || x >= gridWidth) {
            throw new Error(`addText: x position ${x} is out of bounds (0-${gridWidth - 1})`);
        }
        if (y < 0 || y >= gridHeight) {
            throw new Error(`addText: y position ${y} is out of bounds (0-${gridHeight - 1})`);
        }

        if (x + text.length > gridWidth) {
            const maxLength = gridWidth - x;
            if (maxLength <= 3) {
                text = text.substring(0, maxLength);
            } else {
                text = text.substring(0, maxLength - 3) + '...';
            }
        }

        registeredTexts.push({ x, y, text, color, fontSize, underline });
    }

    function addTextCentered(registeredTexts, gridWidth, gridHeight, y, text, color = 'white') {
        const x = Math.floor((gridWidth - text.length) / 2);
        addText(registeredTexts, gridWidth, gridHeight, x, y, text, color);
    }

    function addHeaderLine(registeredTexts, gridWidth, gridHeight, x, y, title) {
        addText(registeredTexts, gridWidth, gridHeight, x, y, title, COLORS.CYAN, 1.0, true);
        return y + 1;
    }

    function addHeaderLineCentered(registeredTexts, gridWidth, gridHeight, y, title) {
        const x = Math.floor((gridWidth - title.length) / 2);
        addText(registeredTexts, gridWidth, gridHeight, x, y, title, COLORS.CYAN, 1.0, true);
        return y + 1;
    }

    function addTitleLineCentered(registeredTexts, gridWidth, gridHeight, y, title) {
        const x = Math.floor((gridWidth - title.length) / 2);
        addText(registeredTexts, gridWidth, gridHeight, x, y, title, COLORS.TITLE, 1.0, true);
        return y + 1;
    }

    function drawTextItem(canvasWrapper, registeredHighlights, item, forceBackground = false) {
        const textWidth = item.text.length;

        const isOnHighlightedRow = registeredHighlights.some(highlight =>
            highlight.y === item.y && item.x >= highlight.x && item.x < highlight.x + highlight.width
        );

        if (forceBackground) {
            canvasWrapper.drawRect(item.x, item.y, textWidth, 1, 'black');
        } else if (item.color !== 'black' && !isOnHighlightedRow) {
            canvasWrapper.drawRect(item.x, item.y, textWidth, 1, 'black');
        }

        canvasWrapper.drawText(item.x, item.y, item.text, item.color, item.fontSize, item.underline || false);
    }

    function drawRegisteredTexts(canvasWrapper, registeredHighlights, registeredTexts) {
        registeredTexts.forEach(item => {
            drawTextItem(canvasWrapper, registeredHighlights, item);
        });
    }

    function clearOutputRow() {
        return { text: '', color: 'white', isHelpText: false };
    }

    function getOutputRow(outputRowText, outputRowColor, outputRowIsHelpText) {
        return { text: outputRowText, color: outputRowColor, isHelpText: outputRowIsHelpText };
    }

    function getScreenCharAt({
        gridWidth,
        gridHeight,
        registeredButtons,
        registeredTexts,
        outputRowText,
        x,
        y
    }) {
        if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) {
            return ' ';
        }

        if (outputRowText) {
            let minButtonY = gridHeight - 3;
            if (registeredButtons.length > 0) {
                minButtonY = Math.min(...registeredButtons.map(btn => btn.y));
            }
            const rowY = minButtonY - 2;
            const rowX = Math.floor((gridWidth - outputRowText.length) / 2);
            if (y === rowY && x >= rowX && x < rowX + outputRowText.length) {
                return outputRowText[x - rowX];
            }
        }

        for (let i = 0; i < registeredButtons.length; i++) {
            const btn = registeredButtons[i];
            const buttonText = `[${btn.key}] ${btn.label}`;
            if (y === btn.y && x >= btn.x && x < btn.x + buttonText.length) {
                return buttonText[x - btn.x];
            }
        }

        for (let i = 0; i < registeredTexts.length; i++) {
            const textItem = registeredTexts[i];
            if (y === textItem.y && x >= textItem.x && x < textItem.x + textItem.text.length) {
                return textItem.text[x - textItem.x];
            }
        }

        return ' ';
    }

    return {
        addText,
        addTextCentered,
        addHeaderLine,
        addHeaderLineCentered,
        addTitleLineCentered,
        drawTextItem,
        drawRegisteredTexts,
        clearOutputRow,
        getOutputRow,
        getScreenCharAt
    };
})();
