const SpaceTravelRenderIndicators = (() => {
    function renderDestinationIndicator({ viewWidth, viewHeight, playerShip, localDestination, currentgameState, config, addHudText, getActiveTargetInfo, timestampMs, mapInstance }) {
        const logNow = timestampMs || performance.now();
        const targetInfo = getActiveTargetInfo();
        if (!targetInfo || !targetInfo.position) {
            if (mapInstance && logNow - (mapInstance.lastIndicatorLogMs || 0) >= 1000) {
                console.log('[NavIndicator]', {
                    status: 'no-target',
                    hasTargetInfo: !!targetInfo,
                    hasPosition: !!targetInfo?.position
                });
                mapInstance.lastIndicatorLogMs = logNow;
            }
            return;
        }

        const toTarget = ThreeDUtils.subVec(targetInfo.position, playerShip.position);
        const distance = ThreeDUtils.vecLength(toTarget);

        if (!Number.isFinite(distance) || distance <= 0.0001) {
            return;
        }

        const forward = ThreeDUtils.getLocalAxes(playerShip.rotation).forward;
        const alignment = ThreeDUtils.dotVec(forward, ThreeDUtils.normalizeVec(toTarget));

        let alignmentText = '';
        let alignmentColor = COLORS.RED;

        if (alignment > 0.95) {
            alignmentText = 'ALIGNED';
            alignmentColor = COLORS.CYAN;
        } else if (alignment > 0.85) {
            alignmentText = 'Aligned';
            alignmentColor = COLORS.GREEN;
        } else if (alignment > 0.7) {
            alignmentText = 'Good';
            alignmentColor = COLORS.YELLOW;
        } else if (alignment > 0.5) {
            alignmentText = 'Fair';
            alignmentColor = COLORS.ORANGE;
        } else if (alignment > 0) {
            alignmentText = 'Poor';
            alignmentColor = COLORS.RED;
        } else {
            alignmentText = 'Behind';
            alignmentColor = COLORS.RED;
        }

        const alignmentX = Math.max(0, viewWidth - alignmentText.length - 2);
        const alignmentY = 1;
        addHudText(alignmentX, alignmentY, alignmentText, alignmentColor);

        const directionForward = ThreeDUtils.rotateVecByQuat(toTarget, ThreeDUtils.quatConjugate(playerShip.rotation));
        const arrow = SpaceTravelShared.getDirectionalArrow(directionForward.x, directionForward.y);

        const arrowX = Math.max(0, Math.min(viewWidth - 1, viewWidth - 3));
        const arrowY = alignmentY - 1;
        if (arrowY >= 0 && arrowX < viewWidth) {
            addHudText(arrowX, arrowY, arrow, alignmentColor);
        }

        const distanceText = distance < 1 ? `${(distance * 1000).toFixed(0)} km` : `${distance.toFixed(2)} AU`;
        const distanceX = Math.max(0, viewWidth - Math.max(distanceText.length, alignmentText.length) - 2);
        const distanceY = alignmentY + 1;
        if (distanceY < viewHeight) {
            addHudText(distanceX, distanceY, distanceText, COLORS.TEXT_NORMAL);
        }

        if (mapInstance && logNow - (mapInstance.lastIndicatorLogMs || 0) >= 1000) {
            console.log('[NavIndicator]', {
                status: 'rendered',
                alignment: Number(alignment.toFixed(3)),
                arrow,
                alignmentText,
                positions: { alignmentX, alignmentY, arrowX, arrowY, distanceX, distanceY }
            });
            mapInstance.lastIndicatorLogMs = logNow;
        }
    }

    return {
        renderDestinationIndicator
    };
})();
