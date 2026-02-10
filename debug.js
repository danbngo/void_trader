/**
 * Debug helpers
 */

const DebugUtils = (() => {
    function testMonospaceFont(ui, sample = 'ilIWMm01. _-|') {
        const ctx = ui.getContext();
        if (!ctx) {
            return { sample, widths: {}, min: 0, max: 0, average: 0, spread: 0, font: '' };
        }

        const widths = {};
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;

        for (const ch of sample) {
            const width = ctx.measureText(ch).width;
            widths[ch] = width;
            min = Math.min(min, width);
            max = Math.max(max, width);
            sum += width;
        }

        const average = sample.length ? sum / sample.length : 0;
        const spread = sample.length ? (max - min) : 0;

        return {
            sample,
            widths,
            min,
            max,
            average,
            spread,
            font: ctx.font
        };
    }

    function debugRegisteredTexts(ui, uiLog = console.log) {
        const { registeredTexts } = ui._debugGetState();
        uiLog('=== All Registered Texts ===');
        uiLog(`Total: ${registeredTexts.length} texts`);

        const byY = {};
        registeredTexts.forEach((t, i) => {
            if (!byY[t.y]) byY[t.y] = [];
            byY[t.y].push({ index: i, x: t.x, text: t.text, color: t.color });
        });

        Object.keys(byY).sort((a, b) => Number(a) - Number(b)).forEach(y => {
            uiLog(`\nRow ${y}:`);
            byY[y].forEach(item => {
                const preview = item.text.length > 40 ? item.text.substring(0, 40) + '...' : item.text;
                uiLog(`  [${item.index}] x=${item.x}, color=${item.color}, text="${preview}"`);
            });
        });
    }

    function debugToConsole(ui, uiLog = console.log) {
        const state = ui._debugGetState();
        const grid = ui.getGridSize();
        const screen = [];
        for (let y = 0; y < grid.height; y++) {
            screen[y] = new Array(grid.width).fill(' ');
        }

        state.registeredTexts.forEach(item => {
            for (let i = 0; i < item.text.length; i++) {
                if (item.x + i >= 0 && item.x + i < grid.width && item.y >= 0 && item.y < grid.height) {
                    screen[item.y][item.x + i] = item.text[i];
                }
            }
        });

        state.registeredButtons.forEach((btn, index) => {
            const buttonText = `[${btn.key}] ${btn.label}`;
            const isSelected = (index === ui._debugGetSelectedButtonIndex());
            const marker = isSelected ? '█' : ' ';

            for (let i = 0; i < buttonText.length; i++) {
                if (btn.x + i >= 0 && btn.x + i < grid.width && btn.y >= 0 && btn.y < grid.height) {
                    screen[btn.y][btn.x + i] = buttonText[i];
                }
            }
            if (isSelected && btn.x > 0) {
                screen[btn.y][btn.x - 1] = marker;
            }
        });

        let output = '\n┌' + '─'.repeat(grid.width) + '┐\n';
        for (let y = 0; y < grid.height; y++) {
            output += '│' + screen[y].join('') + '│\n';
        }
        output += '└' + '─'.repeat(grid.width) + '┘\n';
        output += `Texts: ${state.registeredTexts.length}, Buttons: ${state.registeredButtons.length}, Selected: ${ui._debugGetSelectedButtonIndex()}`;

        uiLog(output);
    }

    return {
        testMonospaceFont,
        debugRegisteredTexts,
        debugToConsole
    };
})();
