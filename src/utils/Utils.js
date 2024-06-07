var Utils;
(function (Utils) {
    function quaternionFromEuler(x, y, z, order = 'XYZ') {
        let w = 1;
        const cos = Math.cos;
        const sin = Math.sin;
        const c1 = cos(x / 2);
        const c2 = cos(y / 2);
        const c3 = cos(z / 2);
        const s1 = sin(x / 2);
        const s2 = sin(y / 2);
        const s3 = sin(z / 2);
        switch (order) {
            case 'XYZ':
                x = s1 * c2 * c3 + c1 * s2 * s3;
                y = c1 * s2 * c3 - s1 * c2 * s3;
                z = c1 * c2 * s3 + s1 * s2 * c3;
                w = c1 * c2 * c3 - s1 * s2 * s3;
                break;
            case 'YXZ':
                x = s1 * c2 * c3 + c1 * s2 * s3;
                y = c1 * s2 * c3 - s1 * c2 * s3;
                z = c1 * c2 * s3 - s1 * s2 * c3;
                w = c1 * c2 * c3 + s1 * s2 * s3;
                break;
            case 'ZXY':
                x = s1 * c2 * c3 - c1 * s2 * s3;
                y = c1 * s2 * c3 + s1 * c2 * s3;
                z = c1 * c2 * s3 + s1 * s2 * c3;
                w = c1 * c2 * c3 - s1 * s2 * s3;
                break;
            case 'ZYX':
                x = s1 * c2 * c3 - c1 * s2 * s3;
                y = c1 * s2 * c3 + s1 * c2 * s3;
                z = c1 * c2 * s3 - s1 * s2 * c3;
                w = c1 * c2 * c3 + s1 * s2 * s3;
                break;
            case 'YZX':
                x = s1 * c2 * c3 + c1 * s2 * s3;
                y = c1 * s2 * c3 + s1 * c2 * s3;
                z = c1 * c2 * s3 - s1 * s2 * c3;
                w = c1 * c2 * c3 - s1 * s2 * s3;
                break;
            case 'XZY':
                x = s1 * c2 * c3 - c1 * s2 * s3;
                y = c1 * s2 * c3 - s1 * c2 * s3;
                z = c1 * c2 * s3 + s1 * s2 * c3;
                w = c1 * c2 * c3 + s1 * s2 * s3;
                break;
        }
        return { x, y, z, w };
    }
    Utils.quaternionFromEuler = quaternionFromEuler;
    function generatePlaneGeometry(w, h) {
        const hWidth = w / 2;
        const hHeight = h / 2;
        const gridX = 1;
        const gridY = 1;
        const gridX1 = 2;
        const gridY1 = 2;
        const segWidth = w / gridX;
        const segHeight = h / gridY;
        const indices = [];
        const vertices = [];
        for (let iy = 0; iy < gridY1; iy++) {
            const y = iy * segHeight - hHeight;
            for (let ix = 0; ix < gridX1; ix++) {
                const x = ix * segWidth - hWidth;
                vertices.push(x, -y, 0);
            }
        }
        for (let iy = 0; iy < gridY; iy++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = ix + gridX1 * iy;
                const b = ix + gridX1 * (iy + 1);
                const c = ix + 1 + gridX1 * (iy + 1);
                const d = ix + 1 + gridX1 * iy;
                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }
        return {
            vertices: new Float32Array(vertices),
            indices: new Uint32Array(indices),
        };
    }
    Utils.generatePlaneGeometry = generatePlaneGeometry;
    function isPointInPolygon(coords, x, y, stride = 2) {
        let c = false;
        for (let i = 0, len = coords.length / stride, j = len - 1; i < coords.length / stride; j = i++) {
            if (((coords[i * stride + stride - 1] <= y && y < coords[j * stride + stride - 1]) ||
                (coords[j * stride + stride - 1] <= y && y < coords[i * stride + stride - 1])) &&
                x <
                    ((coords[j * stride] - coords[i * stride]) * (y - coords[i * stride + stride - 1])) /
                        (coords[j * stride + stride - 1] - coords[i * stride + stride - 1]) +
                        coords[i * stride]) {
                c = !c;
            }
        }
        return c;
    }
    Utils.isPointInPolygon = isPointInPolygon;
    function pixelToWorld(numPixels) {
        return numPixels / 64;
    }
    Utils.pixelToWorld = pixelToWorld;
    function worldToPixel(units) {
        return units * 64;
    }
    Utils.worldToPixel = worldToPixel;
})(Utils || (Utils = {}));
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Utils;
}
//# sourceMappingURL=Utils.js.map