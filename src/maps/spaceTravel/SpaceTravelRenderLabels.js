/**
 * Space Travel Render Labels
 * Renders labels for system bodies and destinations
 */

const SpaceTravelRenderLabels = (() => {
    function renderSystemBodyLabels(bodyLabels, viewWidth, viewHeight, addHudText) {
        let renderedCount = 0;
        bodyLabels.forEach(({ body, name, char, x, y, dist }) => {
            if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) {
                return;
            }

            const labelRadius = Math.max(8, Math.floor(Math.sqrt(dist) * 0.5));
            addDestinationLabel([], x, y, labelRadius, name, viewWidth, viewHeight).forEach(label => {
                addHudText(label.x, label.y, label.text, label.color);
                renderedCount += 1;
            });
        });
        return renderedCount;
    }

    function addDestinationLabel(labels, centerX, centerY, radiusChars, name, viewWidth, viewHeight) {
        if (!name) {
            return labels;
        }
        const labelText = name.length > viewWidth ? name.slice(0, viewWidth) : name;
        const labelWidth = labelText.length;
        const rawLabelX = centerX - Math.floor(labelWidth / 2);
        const labelX = Math.max(0, Math.min(viewWidth - labelWidth, rawLabelX));
        const topY = centerY - radiusChars - 1;
        const bottomY = centerY + radiusChars + 1;
        let labelY = null;

        if (topY >= 0) {
            labelY = Math.min(topY, viewHeight - 1);
        } else if (bottomY <= viewHeight - 1) {
            labelY = bottomY;
        } else {
            labelY = 0;
        }

        labels.push({ x: labelX, y: labelY, text: labelText, color: COLORS.CYAN });
        return labels;
    }

    return {
        renderSystemBodyLabels,
        addDestinationLabel
    };
})();
