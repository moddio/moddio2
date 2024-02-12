var Utils;
(function (Utils) {
    function patchAssetUrl(url) {
        // proxy all s3 requests via cloudflare, old-cache.modd.io points to same 'modd' s3 bucket
        if (url === null || url === void 0 ? void 0 : url.startsWith('https://modd.s3.amazonaws.com')) {
            url = url.replace('https://modd.s3.amazonaws.com', 'https://old-cache.modd.io');
        }
        if ((url === null || url === void 0 ? void 0 : url.indexOf('.png')) !== -1 || (url === null || url === void 0 ? void 0 : url.indexOf('.jpg')) !== -1) {
            // load images via Image tag, helps CF optimize and convert(to webp) images via Polish - https://newdocs.phaser.io/docs/3.60.0/focus/Phaser.Loader.LoaderPlugin-image
            // this.load.imageLoadType = 'HTMLImageElement';
        }
        else {
            // default loader type
            // this.load.imageLoadType = 'XHR';
        }
        // https://stackoverflow.com/a/37455118
        return `${url}?v=1`;
    }
    Utils.patchAssetUrl = patchAssetUrl;
    function fillRoundedRect(ctx, x, y, width, height, radius, color, opacity = 1) {
        var tl = radius;
        var tr = radius;
        var bl = radius;
        var br = radius;
        const fillColor = new THREE.Color(color).getHex();
        const fillAlpha = opacity;
        const red = (fillColor & 0xff0000) >>> 16;
        const green = (fillColor & 0xff00) >>> 8;
        const blue = fillColor & 0xff;
        ctx.fillStyle = `rgba(${red},${green},${blue},${fillAlpha})`;
        ctx.beginPath();
        ctx.moveTo(x + tl, y);
        ctx.lineTo(x + width - tr, y);
        ctx.arc(x + width - tr, y + tr, tr, -(Math.PI * 0.5), 0);
        ctx.lineTo(x + width, y + height - br);
        ctx.arc(x + width - br, y + height - br, br, 0, Math.PI * 0.5);
        ctx.lineTo(x + bl, y + height);
        ctx.arc(x + bl, y + height - bl, bl, Math.PI * 0.5, Math.PI);
        ctx.lineTo(x, y + tl);
        ctx.arc(x + tl, y + tl, tl, -Math.PI, -(Math.PI * 0.5));
        ctx.fill();
    }
    Utils.fillRoundedRect = fillRoundedRect;
    function strokeRoundedRect(ctx, x, y, width, height, radius, color, opacity = 1) {
        var tl = radius;
        var tr = radius;
        var bl = radius;
        var br = radius;
        const lineWidth = 2;
        const lineColor = new THREE.Color(color).getHex();
        const lineAlpha = opacity;
        const red = (lineColor & 0xff0000) >>> 16;
        const green = (lineColor & 0xff00) >>> 8;
        const blue = lineColor & 0xff;
        ctx.strokeStyle = `rgba(${red},${green},${blue},${lineAlpha})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x + tl, y);
        ctx.lineTo(x + width - tr, y);
        ctx.moveTo(x + width - tr, y);
        ctx.arc(x + width - tr, y + tr, tr, -(Math.PI * 0.5), 0);
        ctx.lineTo(x + width, y + height - br);
        ctx.moveTo(x + width, y + height - br);
        ctx.arc(x + width - br, y + height - br, br, 0, Math.PI * 0.5);
        ctx.lineTo(x + bl, y + height);
        ctx.moveTo(x + bl, y + height);
        ctx.arc(x + bl, y + height - bl, bl, Math.PI * 0.5, Math.PI);
        ctx.lineTo(x, y + tl);
        ctx.moveTo(x, y + tl);
        ctx.arc(x + tl, y + tl, tl, -Math.PI, -(Math.PI * 0.5));
        ctx.stroke();
    }
    Utils.strokeRoundedRect = strokeRoundedRect;
    function fillTriangle(ctx, x0, y0, x1, y1, x2, y2, color, opacity = 1) {
        const fillColor = new THREE.Color(color).getHex();
        const fillAlpha = opacity;
        const red = (fillColor & 0xff0000) >>> 16;
        const green = (fillColor & 0xff00) >>> 8;
        const blue = fillColor & 0xff;
        ctx.fillStyle = `rgba(${red},${green},${blue},${fillAlpha})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.fill();
    }
    Utils.fillTriangle = fillTriangle;
    function pixelToWorld(numPixels) {
        return numPixels / 64;
    }
    Utils.pixelToWorld = pixelToWorld;
})(Utils || (Utils = {}));
//# sourceMappingURL=utils.js.map