/**
 * Space Travel Render Labels
 * Renders labels for system bodies and destinations
 */

const SpaceTravelRenderLabels = (() => {
    function renderSystemBodyLabels(bodyLabels, viewWidth, viewHeight, addHudText) {
        bodyLabels.forEach(({ body, name, char, x, y, dist }) => {
            if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) {
                return;
            }

            const labelRadius = Math.max(8, Math.floor(Math.sqrt(dist) * 0.5));
            addDestinationLabel([], x, y, labelRadius, name, viewWidth, viewHeight).forEach(label => {
                addHudText(label.x, label.y, label.text, label.color);
            });
        });
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

    function getDirectionalArrow(dx, dy) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag <= 0.000001) {
            return '▲';
        }
        const angle = Math.atan2(dy, dx);
        const degrees = (angle * (180 / Math.PI) + 360) % 360;
        if (degrees >= 337.5 || degrees < 22.5) {
            return '▶';
        } else if (degrees >= 22.5 && degrees < 67.5) {
            return '◥';
        } else if (degrees >= 67.5 && degrees < 112.5) {
            return '▲';
        } else if (degrees >= 112.5 && degrees < 157.5) {
            return '◤';
        } else if (degrees >= 157.5 && degrees < 202.5) {
            return '◀';
        } else if (degrees >= 202.5 && degrees < 247.5) {
            return '◣';
        } else if (degrees >= 247.5 && degrees < 292.5) {
            return '▼';
        }
        return '◢';
    }

    return {
        renderSystemBodyLabels,
        addDestinationLabel,
        getDirectionalArrow
    };
})();
