/**
 * Raster utilities
 */

class RasterUtils {
    static _clipPolygonToRect(polygon, rect) {
        const clipEdge = (points, inside, intersect) => {
            if (points.length === 0) {
                return points;
            }
            const output = [];
            for (let i = 0; i < points.length; i++) {
                const current = points[i];
                const prev = points[(i + points.length - 1) % points.length];
                const currentInside = inside(current);
                const prevInside = inside(prev);
                if (currentInside) {
                    if (!prevInside) {
                        output.push(intersect(prev, current));
                    }
                    output.push(current);
                } else if (prevInside) {
                    output.push(intersect(prev, current));
                }
            }
            return output;
        };

        let output = polygon;
        output = clipEdge(output, p => p.x >= rect.minX, (a, b) => {
            const dx = b.x - a.x || 0.000001;
            const t = (rect.minX - a.x) / dx;
            return { x: rect.minX, y: a.y + (b.y - a.y) * t };
        });
        output = clipEdge(output, p => p.x <= rect.maxX, (a, b) => {
            const dx = b.x - a.x || 0.000001;
            const t = (rect.maxX - a.x) / dx;
            return { x: rect.maxX, y: a.y + (b.y - a.y) * t };
        });
        output = clipEdge(output, p => p.y >= rect.minY, (a, b) => {
            const dy = b.y - a.y || 0.000001;
            const t = (rect.minY - a.y) / dy;
            return { x: a.x + (b.x - a.x) * t, y: rect.minY };
        });
        output = clipEdge(output, p => p.y <= rect.maxY, (a, b) => {
            const dy = b.y - a.y || 0.000001;
            const t = (rect.maxY - a.y) / dy;
            return { x: a.x + (b.x - a.x) * t, y: rect.maxY };
        });
        return output;
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
            return false;
        }
        const index = y * buffer.width + x;
        const existingDepth = buffer.depth[index];
        const existingChar = buffer.chars[index];
        if (z < existingDepth) {
            buffer.depth[index] = z;
            buffer.chars[index] = symbol;
            buffer.colors[index] = color;
            return true;
        }

        if (existingChar === '░' && symbol !== '░') {
            const epsilon = 0.001;
            if (z < existingDepth + epsilon) {
                buffer.depth[index] = z;
                buffer.chars[index] = symbol;
                buffer.colors[index] = color;
                return true;
            }
        }

        return false;
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
            return 0;
        }
        let count = 0;
        count += RasterUtils.fillDepthTriangle(buffer, quad[0], quad[1], quad[2], symbol, color, bias);
        count += RasterUtils.fillDepthTriangle(buffer, quad[0], quad[2], quad[3], symbol, color, bias);
        return count;
    }

    static fillDepthTriangle(buffer, v0, v1, v2, symbol, color, bias = 0) {
        const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
        const maxX = Math.min(buffer.width - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
        const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
        const maxY = Math.min(buffer.height - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

        const denom = ((v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y));
        if (denom === 0) {
            return 0;
        }

        let plotCount = 0;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const px = x + 0.5;
                const py = y + 0.5;
                const w1 = ((v1.y - v2.y) * (px - v2.x) + (v2.x - v1.x) * (py - v2.y)) / denom;
                const w2 = ((v2.y - v0.y) * (px - v2.x) + (v0.x - v2.x) * (py - v2.y)) / denom;
                const w3 = 1 - w1 - w2;
                if ((w1 >= 0 && w2 >= 0 && w3 >= 0) || (w1 <= 0 && w2 <= 0 && w3 <= 0)) {
                    const z = (w1 * v0.z + w2 * v1.z + w3 * v2.z) + bias;
                    if (RasterUtils.plotDepthText(buffer, x, y, z, symbol, color)) {
                        plotCount += 1;
                    }
                }
            }
        }

        return plotCount;
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

    static rasterizeFaceDepth(buffer, faceVertices, viewWidth, viewHeight, fillSymbol, fillColor, bias = 0, nearPlane = 0.0001, fovDeg = 75, fillMode = 'ray') {
        if (faceVertices.length < 3) {
            return { plotCount: 0, usedFallback: false, inViewCount: 0, fillMode };
        }

        const normal = ThreeDUtils.crossVec(
            ThreeDUtils.subVec(faceVertices[1], faceVertices[0]),
            ThreeDUtils.subVec(faceVertices[2], faceVertices[0])
        );
        if (ThreeDUtils.vecLength(normal) === 0) {
            return { plotCount: 0, usedFallback: false, inViewCount: 0, fillMode };
        }

        const basis = PolygonUtils.buildPlaneBasis(normal);
        const orderedVertices = PolygonUtils.removeDuplicateVertices(faceVertices);
        if (orderedVertices.length < 3) {
            return { plotCount: 0, usedFallback: false, inViewCount: 0, fillMode };
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
            return { plotCount: 0, usedFallback: false, inViewCount: 0, fillMode };
        }

        if (fillMode === 'tri') {
            let plotCount = 0;
            for (let i = 1; i < projected.length - 1; i++) {
                plotCount += RasterUtils.fillDepthTriangle(buffer, projected[0], projected[i], projected[i + 1], fillSymbol, fillColor, bias);
            }
            return { plotCount, usedFallback: false, inViewCount: 0, fillMode };
        }

        const inViewCount = projected.filter(p => (
            p.x >= 0 && p.x < viewWidth && p.y >= 0 && p.y < viewHeight
        )).length;

        const rect = { minX: 0, maxX: viewWidth - 1, minY: 0, maxY: viewHeight - 1 };
        const clippedProjected = RasterUtils._clipPolygonToRect(projected, rect);
        if (clippedProjected.length < 3) {
            if (inViewCount > 0) {
                for (let i = 1; i < projected.length - 1; i++) {
                    RasterUtils.fillDepthTriangle(buffer, projected[0], projected[i], projected[i + 1], fillSymbol, fillColor, bias);
                }
            }
            return { plotCount: 0, usedFallback: inViewCount > 0, inViewCount, fillMode };
        }

        const pad = 0.5;
        const minX = Math.max(rect.minX, Math.floor(Math.min(...clippedProjected.map(p => p.x)) - pad));
        const maxX = Math.min(rect.maxX, Math.ceil(Math.max(...clippedProjected.map(p => p.x)) + pad));
        const minY = Math.max(rect.minY, Math.floor(Math.min(...clippedProjected.map(p => p.y)) - pad));
        const maxY = Math.min(rect.maxY, Math.ceil(Math.max(...clippedProjected.map(p => p.y)) + pad));

        const bboxWidth = Math.max(0, maxX - minX + 1);
        const bboxHeight = Math.max(0, maxY - minY + 1);
        const bboxArea = bboxWidth * bboxHeight;
        if (bboxArea === 0) {
            return { plotCount: 0, usedFallback: false, inViewCount, fillMode };
        }

        const polygon2D = insetVertices.map(v => ({
            x: ThreeDUtils.dotVec(v, basis.u),
            y: ThreeDUtils.dotVec(v, basis.v)
        }));

        const step = 1;
        const maxSamples = Infinity;
        let sampleCount = 0;

        let plotCount = 0;
        const plotBlock = (x, y, z) => {
            if (RasterUtils.plotDepthText(buffer, x, y, z, fillSymbol, fillColor)) {
                plotCount += 1;
            }
            if (step > 1) {
                if (RasterUtils.plotDepthText(buffer, x + 1, y, z, fillSymbol, fillColor)) {
                    plotCount += 1;
                }
                if (RasterUtils.plotDepthText(buffer, x, y + 1, z, fillSymbol, fillColor)) {
                    plotCount += 1;
                }
                if (RasterUtils.plotDepthText(buffer, x + 1, y + 1, z, fillSymbol, fillColor)) {
                    plotCount += 1;
                }
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
                    const centerPoint = ThreeDUtils.scaleVec(centerRay, tCenter);
                    if (centerPoint.z >= nearPlane - 0.00001) {
                        const center2D = { x: ThreeDUtils.dotVec(centerPoint, basis.u), y: ThreeDUtils.dotVec(centerPoint, basis.v) };
                        if (PolygonUtils.isPointInPolygon2D(center2D, polygon2D)) {
                            centerInside = true;
                            closestZ = centerPoint.z;
                        }
                    }
                }

                if (!centerInside) {
                    const offsets = [
                        { dx: 0.25, dy: 0.25 },
                        { dx: 0.75, dy: 0.25 },
                        { dx: 0.25, dy: 0.75 },
                        { dx: 0.75, dy: 0.75 }
                    ];
                    for (let i = 0; i < offsets.length; i++) {
                        const sample = offsets[i];
                        const sampleRay = RasterUtils.screenRayDirection(x + sample.dx, y + sample.dy, viewWidth, viewHeight, fovDeg);
                        const sampleDenom = ThreeDUtils.dotVec(normal, sampleRay);
                        if (Math.abs(sampleDenom) <= 0.000001) {
                            continue;
                        }
                        const tSample = ThreeDUtils.dotVec(normal, insetVertices[0]) / sampleDenom;
                        const samplePoint = ThreeDUtils.scaleVec(sampleRay, tSample);
                        if (samplePoint.z < nearPlane - 0.00001) {
                            continue;
                        }
                        const sample2D = { x: ThreeDUtils.dotVec(samplePoint, basis.u), y: ThreeDUtils.dotVec(samplePoint, basis.v) };
                        if (PolygonUtils.isPointInPolygon2D(sample2D, polygon2D)) {
                            const sampleZ = samplePoint.z;
                            closestZ = closestZ === null ? sampleZ : Math.min(closestZ, sampleZ);
                        }
                    }
                }

                if (closestZ !== null) {
                    plotBlock(x, y, closestZ + bias);
                }

            }
        }

        let usedFallback = false;
        if (plotCount === 0 && inViewCount > 0) {
            for (let i = 1; i < projected.length - 1; i++) {
                RasterUtils.fillDepthTriangle(buffer, projected[0], projected[i], projected[i + 1], fillSymbol, fillColor, bias);
            }
            usedFallback = true;
        }
        return { plotCount, usedFallback, inViewCount, fillMode };
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
