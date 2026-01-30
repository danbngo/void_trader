/**
 * Black Market Menu
 * Buy combat consumables
 */

const BlackMarketMenu = (() => {
    let gameState = null;
    let selectedItemIndex = 0;
    let outputMessage = '';
    let outputColor = COLORS.TEXT_NORMAL;

    function show(state, onReturn) {
        gameState = state;
        selectedItemIndex = 0;
        outputMessage = '';
        UI.resetSelection();
        render(onReturn);
    }

    function render(onReturn) {
        UI.clear();

        const grid = UI.getGridSize();
        const currentSystem = gameState.getCurrentSystem();

        UI.addTitleLineCentered(0, `${currentSystem.name}: Black Market`);

        const barterLevel = gameState.captain ? (gameState.captain.skills.barter || 0) : 0;
        const effectiveFees = SkillEffects.getModifiedFees(currentSystem.fees, barterLevel);

        const totalConsumables = gameState.getTotalConsumables();
        const maxConsumables = gameState.getMaxConsumables();

        TableRenderer.renderKeyValueList(5, 2, [
            { label: 'Credits:', value: `${gameState.credits} CR`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'Consumables:', value: `${totalConsumables} / ${maxConsumables}`, valueColor: COLORS.TEXT_NORMAL },
            { label: 'System Fees:', value: `${(currentSystem.fees * 100).toFixed(1)}%`, valueColor: COLORS.TEXT_DIM },
            { label: 'Fees after Barter:', value: `${(effectiveFees * 100).toFixed(1)}%`, valueColor: COLORS.TEXT_DIM }
        ]);

        if (selectedItemIndex >= CONSUMABLES_ARRAY.length) {
            selectedItemIndex = Math.max(0, CONSUMABLES_ARRAY.length - 1);
        }

        const rows = CONSUMABLES_ARRAY.map((item) => {
            const price = Math.floor(item.price * (1 + effectiveFees));
            const owned = gameState.consumables[item.id] || 0;
            return [
                { text: item.name, color: COLORS.TEXT_NORMAL },
                { text: `${price}`, color: COLORS.TEXT_NORMAL },
                { text: `${owned}`, color: COLORS.TEXT_NORMAL },
                { text: item.description, color: COLORS.TEXT_DIM }
            ];
        });

        const tableEndY = TableRenderer.renderTable(5, 7, ['Item', 'Price', 'Owned', 'Effect'], rows, selectedItemIndex, 2, (rowIndex) => {
            selectedItemIndex = rowIndex;
            outputMessage = '';
            render(onReturn);
        });

        const buttonY = grid.height - 4;
        const leftX = 5;
        const middleX = 28;
        const rightX = 51;

        UI.addButton(leftX, buttonY, '1', 'Previous Item', () => prevItem(onReturn), COLORS.BUTTON, 'Select previous item');
        UI.addButton(leftX, buttonY + 1, '2', 'Next Item', () => nextItem(onReturn), COLORS.BUTTON, 'Select next item');

        const selectedItem = CONSUMABLES_ARRAY[selectedItemIndex];
        const price = Math.floor(selectedItem.price * (1 + effectiveFees));
        const hasSpace = gameState.getTotalConsumables() < gameState.getMaxConsumables();
        const canAfford = gameState.credits >= price;
        const canBuy = hasSpace && canAfford;

        const buyHelpText = !hasSpace
            ? 'Consumable storage full'
            : (!canAfford ? `Need ${price} CR` : `Buy 1 for ${price} CR`);

        const buyColor = canBuy ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY, '3', 'Buy 1', () => buyItem(1, onReturn), buyColor, buyHelpText);

        const buy5Price = price * 5;
        const canAfford5 = gameState.credits >= buy5Price;
        const hasSpace5 = gameState.getTotalConsumables() + 5 <= gameState.getMaxConsumables();
        const canBuy5 = hasSpace5 && canAfford5;
        const buy5HelpText = !hasSpace5
            ? 'Not enough storage for 5'
            : (!canAfford5 ? `Need ${buy5Price} CR` : `Buy 5 for ${buy5Price} CR`);
        const buy5Color = canBuy5 ? COLORS.GREEN : COLORS.TEXT_DIM;
        UI.addButton(middleX, buttonY + 1, '4', 'Buy 5', () => buyItem(5, onReturn), buy5Color, buy5HelpText);

        UI.addButton(rightX, buttonY, '0', 'Back', onReturn, COLORS.BUTTON);

        if (outputMessage) {
            UI.setOutputRow(outputMessage, outputColor);
        }

        UI.draw();
    }

    function nextItem(onReturn) {
        selectedItemIndex = (selectedItemIndex + 1) % CONSUMABLES_ARRAY.length;
        outputMessage = '';
        render(onReturn);
    }

    function prevItem(onReturn) {
        selectedItemIndex = (selectedItemIndex - 1 + CONSUMABLES_ARRAY.length) % CONSUMABLES_ARRAY.length;
        outputMessage = '';
        render(onReturn);
    }

    function buyItem(amount, onReturn) {
        const item = CONSUMABLES_ARRAY[selectedItemIndex];
        const currentSystem = gameState.getCurrentSystem();
        const barterLevel = gameState.captain ? (gameState.captain.skills.barter || 0) : 0;
        const effectiveFees = SkillEffects.getModifiedFees(currentSystem.fees, barterLevel);
        const price = Math.floor(item.price * (1 + effectiveFees));
        const totalCost = price * amount;

        const added = gameState.addConsumable(item.id, amount);
        if (added <= 0) {
            outputMessage = 'Consumable storage full.';
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }

        const actualCost = price * added;
        if (gameState.credits < actualCost) {
            gameState.removeConsumable(item.id, added);
            outputMessage = `Not enough credits (need ${actualCost} CR)`;
            outputColor = COLORS.TEXT_ERROR;
            render(onReturn);
            return;
        }

        gameState.credits -= actualCost;
        outputMessage = `Purchased ${added} ${item.name}${added > 1 ? 's' : ''} for ${actualCost} CR.`;
        outputColor = COLORS.TEXT_SUCCESS;
        render(onReturn);
    }

    return {
        show
    };
})();
