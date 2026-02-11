/**
 * Raster utilities
 */

class RasterUtils {
    static _segmentsIntersect(a, b, c, d) {
        const cross = (p1, p2, p3) => ((p2.x - p1.x) * (p3.y - p1.y)) - ((p2.y - p1.y) * (p3.x - p1.x));
        const d1 = cross(a, b, c);
        const d2 = cross(a, b, d);
        const d3 = cross(c, d, a);
        const d4 = cross(c, d, b);
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
            && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }
        return false;
    }

    static _segmentIntersectsRect(p1, p2, rect) {
        if ((p1.x >= rect.minX && p1.x <= rect.maxX && p1.y >= rect.minY && p1.y <= rect.maxY)
            || (p2.x >= rect.minX && p2.x <= rect.maxX && p2.y >= rect.minY && p2.y <= rect.maxY)) {
            return true;
        }
        const tl = { x: rect.minX, y: rect.minY };
        const tr = { x: rect.maxX, y: rect.minY };
        const br = { x: rect.maxX, y: rect.maxY };
        const bl = { x: rect.minX, y: rect.maxY };
        return RasterUtils._segmentsIntersect(p1, p2, tl, tr)
            || RasterUtils._segmentsIntersect(p1, p2, tr, br)
            || RasterUtils._segmentsIntersect(p1, p2, br, bl)
            || RasterUtils._segmentsIntersect(p1, p2, bl, tl);
    }
    static createDepthBuffer(width, height) {
        return {
            width,
            height,
            depth: new Float32Array(width * height).fill(Infinity),
            chars: new Array(width * height).fill(null),
            colors: new Array(width * height).fill(null)
        };
    }

    static plotDepthText(buffer, x, y, z, symbol, color) {
        if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) {
            return;
        }
        const index = y * buffer.width + x;
        const existingDepth = buffer.depth[index];
        const existingChar = buffer.chars[index];
        if (z < existingDepth) {
            buffer.depth[index] = z;
            buffer.chars[index] = symbol;
            buffer.colors[index] = color;
            return;
        }

        if (existingChar === '░' && symbol !== '░') {
            const epsilon = 0.001;
            if (z < existingDepth + epsilon) {
                buffer.depth[index] = z;
                buffer.chars[index] = symbol;
                buffer.colors[index] = color;
            }
        }
    }

    static plotDepthOnly(buffer, x, y, z) {
        if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) {
            return;
        }
        const index = y * buffer.width + x;
        if (z < buffer.depth[index]) {
            buffer.depth[index] = z;
        }
    }

    static flushDepthBuffer(buffer) {
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

    static fillDepthQuad(buffer, quad, symbol, color, bias = 0) {
        if (quad.length !== 4) {
            return;
        }
        RasterUtils.fillDepthTriangle(buffer, quad[0], quad[1], quad[2], symbol, color, bias);
        RasterUtils.fillDepthTriangle(buffer, quad[0], quad[2], quad[3], symbol, color, bias);
    }

    static fillDepthTriangle(buffer, v0, v1, v2, symbol, color, bias = 0) {
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
                    RasterUtils.plotDepthText(buffer, x, y, z, symbol, color);
                }
            }
        }
    }

    static screenRayDirection(x, y, viewWidth, viewHeight, fovDeg) {
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

    static rasterizeFaceDepth(buffer, faceVertices, viewWidth, viewHeight, fillSymbol, fillColor, bias = 0, nearPlane = 0.0001, fovDeg = 75) {
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

        const shrink = 1.0;
        const center = orderedVertices.reduce((acc, v) => ThreeDUtils.addVec(acc, v), { x: 0, y: 0, z: 0 });
        center.x /= orderedVertices.length;
        center.y /= orderedVertices.length;
        center.z /= orderedVertices.length;

        const insetVertices = orderedVertices.map(v => {
            const offset = ThreeDUtils.subVec(v, center);
            return ThreeDUtils.addVec(center, ThreeDUtils.scaleVec(offset, shrink));
        });

        const projected = insetVertices
            .map(v => RasterUtils.projectCameraSpacePointRaw(v, viewWidth, viewHeight, fovDeg))
            .filter(p => p !== null);

        if (projected.length < 3) {
            return;
        }

        const pad = 2.5;
        const rect = { minX: 0, maxX: viewWidth - 1, minY: 0, maxY: viewHeight - 1 };
        const inView = projected.some(p => p.x >= rect.minX && p.x <= rect.maxX && p.y >= rect.minY && p.y <= rect.maxY);
        let intersects = inView;
        if (!intersects) {
            for (let i = 0; i < projected.length; i++) {
                const a = projected[i];
                const b = projected[(i + 1) % projected.length];
                if (RasterUtils._segmentIntersectsRect(a, b, rect)) {
                    intersects = true;
                    break;
                }
            }
        }

        let minX = Math.floor(Math.min(...projected.map(p => p.x)) - pad);
        let maxX = Math.ceil(Math.max(...projected.map(p => p.x)) + pad);
        let minY = Math.floor(Math.min(...projected.map(p => p.y)) - pad);
        let maxY = Math.ceil(Math.max(...projected.map(p => p.y)) + pad);

        if (intersects && !inView) {
            minX = rect.minX;
            maxX = rect.maxX;
            minY = rect.minY;
            maxY = rect.maxY;
        }

        minX = Math.max(rect.minX, minX);
        maxX = Math.min(rect.maxX, maxX);
        minY = Math.max(rect.minY, minY);
        maxY = Math.min(rect.maxY, maxY);

        const bboxWidth = Math.max(0, maxX - minX + 1);
        const bboxHeight = Math.max(0, maxY - minY + 1);
        const bboxArea = bboxWidth * bboxHeight;
        if (bboxArea === 0) {
            return;
        }

        const polygon2D = insetVertices.map(v => ({
            x: ThreeDUtils.dotVec(v, basis.u),
            y: ThreeDUtils.dotVec(v, basis.v)
        }));

        const step = 1;
        const maxSamples = Infinity;
        let sampleCount = 0;

        const plotBlock = (x, y, z) => {
            RasterUtils.plotDepthText(buffer, x, y, z, fillSymbol, fillColor);
            if (step > 1) {
                RasterUtils.plotDepthText(buffer, x + 1, y, z, fillSymbol, fillColor);
                RasterUtils.plotDepthText(buffer, x, y + 1, z, fillSymbol, fillColor);
                RasterUtils.plotDepthText(buffer, x + 1, y + 1, z, fillSymbol, fillColor);
            }
        };

        const startY = minY;

        rasterLoop:
        for (let y = startY; y <= maxY; y += step) {
            for (let x = minX; x <= maxX; x += step) {
                sampleCount++;
                if (sampleCount > maxSamples) {
                    break rasterLoop;
                }
                let closestZ = null;
                let centerInside = false;

                const centerRay = RasterUtils.screenRayDirection(x, y, viewWidth, viewHeight, fovDeg);
                const centerDenom = ThreeDUtils.dotVec(normal, centerRay);
                if (Math.abs(centerDenom) > 0.000001) {
                    const tCenter = ThreeDUtils.dotVec(normal, insetVertices[0]) / centerDenom;
                    if (tCenter > nearPlane - 0.00001) {
                        const centerPoint = ThreeDUtils.scaleVec(centerRay, tCenter);
                        const center2D = { x: ThreeDUtils.dotVec(centerPoint, basis.u), y: ThreeDUtils.dotVec(centerPoint, basis.v) };
                        if (PolygonUtils.isPointInPolygon2D(center2D, polygon2D)) {
                            centerInside = true;
                            closestZ = centerPoint.z;
                        }
                    }
                }

                if (centerInside) {
                    plotBlock(x, y, closestZ + bias);
                    continue;
                }

            }
        }
    }

    static projectCameraSpacePointRaw(cameraSpace, viewWidth, viewHeight, fovDeg) {
        const nearPlane = 0.0001;
        if (cameraSpace.z < nearPlane) {
            if (cameraSpace.z <= 0) {
                return null;
            }
            cameraSpace = { ...cameraSpace, z: nearPlane };
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

}
