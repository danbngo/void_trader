/**
 * Raster utilities
 */

const RasterUtils = (() => {
    function createDepthBuffer(width, height) {
        return {
            width,
            height,
            depth: new Float32Array(width * height).fill(Infinity),
            chars: new Array(width * height).fill(null),
            colors: new Array(width * height).fill(null)
        };
    }

    function plotDepthText(buffer, x, y, z, symbol, color) {
        if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) {
            return;
        }
        const index = y * buffer.width + x;
        if (z < buffer.depth[index]) {
            buffer.depth[index] = z;
            buffer.chars[index] = symbol;
            buffer.colors[index] = color;
        }
    }

    function plotDepthOnly(buffer, x, y, z) {
        if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) {
            return;
        }
        const index = y * buffer.width + x;
        if (z < buffer.depth[index]) {
            buffer.depth[index] = z;
        }
    }

    function flushDepthBuffer(buffer) {
        for (let y = 0; y < buffer.height; y++) {
            for (let x = 0; x < buffer.width; x++) {
                const index = y * buffer.width + x;
                const symbol = buffer.chars[index];
                if (symbol) {
                    UI.addText(x, y, symbol, buffer.colors[index]);
                }
            }
        }
    }

    function fillDepthQuad(buffer, quad, symbol, color, bias = 0) {
        if (quad.length !== 4) {
            return;
        }
        fillDepthTriangle(buffer, quad[0], quad[1], quad[2], symbol, color, bias);
        fillDepthTriangle(buffer, quad[0], quad[2], quad[3], symbol, color, bias);
    }

    function fillDepthTriangle(buffer, v0, v1, v2, symbol, color, bias = 0) {
        const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
        const maxX = Math.min(buffer.width - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
        const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
        const maxY = Math.min(buffer.height - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

        const denom = ((v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y));
        if (denom === 0) {
            return;
        }

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const px = x + 0.5;
                const py = y + 0.5;
                const w1 = ((v1.y - v2.y) * (px - v2.x) + (v2.x - v1.x) * (py - v2.y)) / denom;
                const w2 = ((v2.y - v0.y) * (px - v2.x) + (v0.x - v2.x) * (py - v2.y)) / denom;
                const w3 = 1 - w1 - w2;
                if ((w1 >= 0 && w2 >= 0 && w3 >= 0) || (w1 <= 0 && w2 <= 0 && w3 <= 0)) {
                    const z = (w1 * v0.z + w2 * v1.z + w3 * v2.z) + bias;
                    plotDepthText(buffer, x, y, z, symbol, color);
                }
            }
        }
    }

    function screenRayDirection(x, y, viewWidth, viewHeight, fovDeg) {
        const charDims = UI.getCharDimensions();
        const fovRad = ThreeDUtils.degToRad(fovDeg);
        const fovScale = Math.tan(fovRad / 2);

        const viewPixelWidth = viewWidth * charDims.width;
        const viewPixelHeight = viewHeight * charDims.height;
        const centerPxX = viewPixelWidth / 2;
        const centerPxY = viewPixelHeight / 2;

        const px = (x + 0.5) * charDims.width;
        const py = (y + 0.5) * charDims.height;

        const normX = (px - centerPxX) / (viewPixelWidth / 2);
        const normY = (centerPxY - py) / (viewPixelHeight / 2);

        const dir = { x: normX * fovScale, y: normY * fovScale, z: 1 };
        return ThreeDUtils.normalizeVec(dir);
    }

    function rasterizeFaceDepth(buffer, faceVertices, viewWidth, viewHeight, fillSymbol, fillColor, bias = 0, nearPlane = 0.0001, fovDeg = 75) {
        if (faceVertices.length < 3) {
            return;
        }

        const normal = ThreeDUtils.crossVec(
            ThreeDUtils.subVec(faceVertices[1], faceVertices[0]),
            ThreeDUtils.subVec(faceVertices[2], faceVertices[0])
        );
        if (ThreeDUtils.vecLength(normal) === 0) {
            return;
        }

        const basis = PolygonUtils.buildPlaneBasis(normal);
        const orderedVertices = PolygonUtils.removeDuplicateVertices(faceVertices);
        if (orderedVertices.length < 3) {
            return;
        }

        const projected = orderedVertices
            .map(v => projectCameraSpacePointRaw(v, viewWidth, viewHeight, fovDeg))
            .filter(p => p !== null);

        if (projected.length < 3) {
            return;
        }

        const minX = Math.max(0, Math.floor(Math.min(...projected.map(p => p.x))));
        const maxX = Math.min(viewWidth - 1, Math.ceil(Math.max(...projected.map(p => p.x))));
        const minY = Math.max(0, Math.floor(Math.min(...projected.map(p => p.y))));
        const maxY = Math.min(viewHeight - 1, Math.ceil(Math.max(...projected.map(p => p.y))));

        const polygon2D = orderedVertices.map(v => ({
            x: ThreeDUtils.dotVec(v, basis.u),
            y: ThreeDUtils.dotVec(v, basis.v)
        }));

        const cornerOffsets = [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.1, y: 0.9 },
            { x: 0.9, y: 0.9 }
        ];

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                let closestZ = null;
                let centerInside = false;

                const centerRay = screenRayDirection(x, y, viewWidth, viewHeight, fovDeg);
                const centerDenom = ThreeDUtils.dotVec(normal, centerRay);
                if (Math.abs(centerDenom) > 0.000001) {
                    const tCenter = ThreeDUtils.dotVec(normal, orderedVertices[0]) / centerDenom;
                    if (tCenter > nearPlane) {
                        const centerPoint = ThreeDUtils.scaleVec(centerRay, tCenter);
                        const center2D = { x: ThreeDUtils.dotVec(centerPoint, basis.u), y: ThreeDUtils.dotVec(centerPoint, basis.v) };
                        if (PolygonUtils.isPointInPolygon2D(center2D, polygon2D)) {
                            centerInside = true;
                            closestZ = centerPoint.z;
                        }
                    }
                }

                if (centerInside) {
                    plotDepthText(buffer, x, y, closestZ + bias, fillSymbol, fillColor);
                    continue;
                }

                let partialInside = false;
                for (const offset of cornerOffsets) {
                    const rayDir = screenRayDirection(x + offset.x - 0.5, y + offset.y - 0.5, viewWidth, viewHeight, fovDeg);
                    const denom = ThreeDUtils.dotVec(normal, rayDir);
                    if (Math.abs(denom) <= 0.000001) {
                        continue;
                    }

                    const t = ThreeDUtils.dotVec(normal, orderedVertices[0]) / denom;
                    if (t <= nearPlane) {
                        continue;
                    }

                    const hitPoint = ThreeDUtils.scaleVec(rayDir, t);
                    const hit2D = { x: ThreeDUtils.dotVec(hitPoint, basis.u), y: ThreeDUtils.dotVec(hitPoint, basis.v) };
                    if (!PolygonUtils.isPointInPolygon2D(hit2D, polygon2D)) {
                        continue;
                    }

                    partialInside = true;
                    if (closestZ === null || hitPoint.z < closestZ) {
                        closestZ = hitPoint.z;
                    }
                }

                if (partialInside && closestZ !== null) {
                    plotDepthText(buffer, x, y, closestZ + bias, '─', COLORS.TEXT_NORMAL);
                }
            }
        }
    }

    function projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, fovDeg) {
        if (cameraSpace.z < 0.0001) {
            return null;
        }

        const charDims = UI.getCharDimensions();
        const fovRad = ThreeDUtils.degToRad(fovDeg);
        const fovScale = Math.tan(fovRad / 2);

        const viewPixelWidth = viewWidth * charDims.width;
        const viewPixelHeight = viewHeight * charDims.height;

        const normX = (cameraSpace.x / cameraSpace.z) / fovScale;
        const normY = (cameraSpace.y / cameraSpace.z) / fovScale;

        const centerPxX = viewPixelWidth / 2;
        const centerPxY = viewPixelHeight / 2;

        const screenPxX = normX * (viewPixelWidth / 2);
        const screenPxY = normY * (viewPixelHeight / 2);

        return {
            x: (centerPxX + screenPxX) / charDims.width,
            y: (centerPxY - screenPxY) / charDims.height,
            z: cameraSpace.z
        };
    }

    return {
        createDepthBuffer,
        plotDepthText,
        plotDepthOnly,
        flushDepthBuffer,
        fillDepthQuad,
        fillDepthTriangle,
        rasterizeFaceDepth,
        screenRayDirection,
        projectCameraSpacePointRaw
    };
})();
