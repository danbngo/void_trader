/**
 * UI Buttons Module - button registration and rendering helpers
 */

const UiButtons = (() => {
    function setupInputCallbacks({
        inputHandler,
        getRegisteredButtons,
        getSelectedButtonIndex,
        setSelectedButtonIndex,
        draw,
        getWheelZoomHandler,
        handleCursorMove,
        getRegisteredTableRows,
        getButtonNavigationEnabled,
        isArrowKeysNavigationDisabled
    }) {
        inputHandler.setKeyPressCallback((key, event) => {
            const registeredButtons = getRegisteredButtons();
            const selectedButtonIndex = getSelectedButtonIndex();
            const buttonNavEnabled = typeof getButtonNavigationEnabled === 'function'
                ? getButtonNavigationEnabled()
                : true;
            const arrowKeysDisabled = typeof isArrowKeysNavigationDisabled === 'function'
                ? isArrowKeysNavigationDisabled()
                : false;

            if (buttonNavEnabled) {
                // If arrow keys are disabled for this context, only allow PageUp/PageDown for navigation
                if (arrowKeysDisabled) {
                    if (key === 'PageDown') {
                        event.preventDefault();
                        if (registeredButtons.length > 0) {
                            setSelectedButtonIndex((selectedButtonIndex + 1) % registeredButtons.length);
                            draw();
                        }
                        return;
                    }

                    if (key === 'PageUp') {
                        event.preventDefault();
                        if (registeredButtons.length > 0) {
                            setSelectedButtonIndex((selectedButtonIndex - 1 + registeredButtons.length) % registeredButtons.length);
                            draw();
                        }
                        return;
                    }

                    if (key === 'Enter') {
                        event.preventDefault();
                        if (registeredButtons.length > 0 && registeredButtons[selectedButtonIndex]) {
                            registeredButtons[selectedButtonIndex].callback();
                        }
                        return;
                    }
                } else {
                    // Normal behavior: allow arrow keys, Tab, PageUp, PageDown
                    if (key === 'ArrowDown' || key === 'ArrowRight' || key === 'Tab' || key === 'PageDown') {
                        event.preventDefault();
                        if (registeredButtons.length > 0) {
                            setSelectedButtonIndex((selectedButtonIndex + 1) % registeredButtons.length);
                            draw();
                        }
                        return;
                    }

                    if (key === 'ArrowUp' || key === 'ArrowLeft' || key === 'PageUp') {
                        event.preventDefault();
                        if (registeredButtons.length > 0) {
                            setSelectedButtonIndex((selectedButtonIndex - 1 + registeredButtons.length) % registeredButtons.length);
                            draw();
                        }
                        return;
                    }

                    if (key === 'Enter') {
                        event.preventDefault();
                        if (registeredButtons.length > 0 && registeredButtons[selectedButtonIndex]) {
                            registeredButtons[selectedButtonIndex].callback();
                        }
                        return;
                    }
                }
            }

            if (key === 'Escape') {
                const zeroBtn = registeredButtons.find(btn => btn.key === '0');
                if (zeroBtn) {
                    event.preventDefault();
                    zeroBtn.callback();
                }
                return;
            }

            if (key === 'PageUp' || key === 'PageDown') {
                // Only handle for zoom if button nav is disabled
                if (!buttonNavEnabled) {
                    const wheelZoomHandler = getWheelZoomHandler();
                    if (wheelZoomHandler) {
                        event.preventDefault();
                        wheelZoomHandler(key === 'PageUp' ? -100 : 100);
                    }
                }
                return;
            }

            const button = registeredButtons.find(btn => btn.key === key);
            if (button) {
                event.preventDefault();
                button.callback();
            }
        });

        inputHandler.setMouseMoveCallback((gridX, gridY) => {
            const registeredButtons = getRegisteredButtons();
            const cursorDidMove = handleCursorMove(gridX, gridY);

            let hoveredButtonIndex = -1;
            registeredButtons.forEach((btn, index) => {
                const buttonText = `[${btn.key}] ${btn.label}`;
                const buttonEndX = btn.x + buttonText.length;

                if (gridY === btn.y && gridX >= btn.x && gridX < buttonEndX) {
                    hoveredButtonIndex = index;
                }
            });

            const selectedButtonIndex = getSelectedButtonIndex();
            if (hoveredButtonIndex !== -1 && hoveredButtonIndex !== selectedButtonIndex) {
                setSelectedButtonIndex(hoveredButtonIndex);
                draw();
            } else if (cursorDidMove) {
                draw();
            }
        });

        inputHandler.setMouseClickCallback((gridX, gridY) => {
            const registeredButtons = getRegisteredButtons();
            let clickedButton = false;

            registeredButtons.forEach(btn => {
                const buttonText = `[${btn.key}] ${btn.label}`;
                const buttonEndX = btn.x + buttonText.length;

                if (gridY === btn.y && gridX >= btn.x && gridX < buttonEndX) {
                    btn.callback();
                    clickedButton = true;
                }
            });

            if (!clickedButton) {
                const registeredTableRows = getRegisteredTableRows();
                registeredTableRows.forEach(row => {
                    if (gridY === row.y && gridX >= row.x && gridX < row.x + row.width) {
                        row.callback(row.index);
                    }
                });
            }
        });

        inputHandler.setMouseWheelCallback((deltaY) => {
            const wheelZoomHandler = getWheelZoomHandler();
            if (wheelZoomHandler) {
                wheelZoomHandler(deltaY);
            }
        });
    }
    function addButton(registeredButtons, gridWidth, gridHeight, x, y, key, label, callback, color = 'cyan', helpText = '', keyColor = null) {
        if (x < 0 || x >= gridWidth) {
            throw new Error(`addButton: x position ${x} is out of bounds (0-${gridWidth - 1})`);
        }
        if (y < 0 || y >= gridHeight) {
            throw new Error(`addButton: y position ${y} is out of bounds (0-${gridHeight - 1})`);
        }
        const buttonText = `[${key}] ${label}`;
        if (x + buttonText.length > gridWidth) {
            throw new Error(`addButton: button "${buttonText}" at x=${x} extends beyond grid width`);
        }

        if ((label === 'Options' || label === 'Back') && color === 'cyan') {
            color = COLORS.TEXT_DIM;
        }

        registeredButtons.push({ x, y, key, label, callback, color, helpText, keyColor });
    }

    function addCenteredButton(registeredButtons, gridWidth, gridHeight, y, key, label, callback, color = 'cyan', helpText = '', keyColor = null) {
        const buttonText = `[${key}] ${label}`;
        const x = Math.floor((gridWidth - buttonText.length) / 2);
        addButton(registeredButtons, gridWidth, gridHeight, x, y, key, label, callback, color, helpText, keyColor);
    }

    function addCenteredButtons(registeredButtons, gridWidth, gridHeight, startY, buttons) {
        if (!buttons || buttons.length === 0) return;

        let maxWidth = 0;
        buttons.forEach(btn => {
            const buttonText = `[${btn.key}] ${btn.label}`;
            maxWidth = Math.max(maxWidth, buttonText.length);
        });

        const x = Math.floor((gridWidth - maxWidth) / 2);

        buttons.forEach((btn, index) => {
            addButton(
                registeredButtons,
                gridWidth,
                gridHeight,
                x,
                startY + index,
                btn.key,
                btn.label,
                btn.callback,
                btn.color || 'cyan',
                btn.helpText || '',
                btn.keyColor || null
            );
        });
    }

    function addSelectionHighlight(registeredHighlights, x, y, width) {
        registeredHighlights.push({ x, y, width });
    }

    function addClickable(registeredTableRows, x, y, width, callback) {
        registeredTableRows.push({ x, y, width, callback, index: -1 });
    }

    function registerTableRow(registeredTableRows, x, y, width, index, callback) {
        registeredTableRows.push({ x, y, width, index, callback });
    }

    function drawButtons({
        canvasWrapper,
        registeredButtons,
        selectedButtonIndex,
        lastSelectedButtonIndex,
        outputRowText,
        outputRowColor,
        outputRowIsHelpText,
        isFlashing,
        uiLog
    }) {
        const selectionChanged = selectedButtonIndex !== lastSelectedButtonIndex;
        const isCurrentlyFlashing = isFlashing();
        if (selectionChanged) {
            lastSelectedButtonIndex = selectedButtonIndex;
            if (!isCurrentlyFlashing) {
                uiLog('[UI] Selection changed, clearing output row');
                outputRowText = '';
                outputRowColor = 'white';
                outputRowIsHelpText = false;
            }
        }

        registeredButtons.forEach((btn, index) => {
            const buttonText = `[${btn.key}] ${btn.label}`;
            const buttonWidth = buttonText.length;
            const isSelected = (index === selectedButtonIndex);

            canvasWrapper.drawRect(btn.x, btn.y, buttonWidth, 1, 'black');

            if (isSelected) {
                canvasWrapper.drawRect(btn.x, btn.y, buttonWidth, 1, 'white');
                canvasWrapper.drawText(btn.x, btn.y, buttonText, 'black');

                if (
                    btn.helpText &&
                    !['Continue', 'Back'].includes(btn.label) &&
                    (!outputRowText || outputRowIsHelpText)
                ) {
                    outputRowText = btn.helpText;
                    outputRowColor = 'aqua';
                    outputRowIsHelpText = true;
                }
            } else {
                if (btn.color === COLORS.YELLOW || btn.color === COLORS.TEXT_DIM) {
                    canvasWrapper.drawText(btn.x, btn.y, buttonText, btn.color);
                } else if (btn.keyColor) {
                    canvasWrapper.drawText(btn.x, btn.y, `[${btn.key}] `, btn.keyColor);
                    canvasWrapper.drawText(btn.x + 4, btn.y, `${btn.label}`, btn.color);
                } else {
                    canvasWrapper.drawText(btn.x, btn.y, `[${btn.key}] `, btn.color);
                    canvasWrapper.drawText(btn.x + 4, btn.y, `${btn.label}`, 'white');
                }
            }
        });

        return {
            selectedButtonIndex,
            lastSelectedButtonIndex,
            outputRowText,
            outputRowColor,
            outputRowIsHelpText
        };
    }

    return {
        setupInputCallbacks,
        addButton,
        addCenteredButton,
        addCenteredButtons,
        addSelectionHighlight,
        addClickable,
        registerTableRow,
        drawButtons
    };
})();
