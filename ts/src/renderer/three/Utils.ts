namespace Renderer {
	export namespace Three {
		export namespace Utils {
			export function patchAssetUrl(url: string): string {
				// proxy all s3 requests via cloudflare, old-cache.modd.io points to same 'modd' s3 bucket
				if (url?.startsWith('https://modd.s3.amazonaws.com')) {
					url = url.replace('https://modd.s3.amazonaws.com', 'https://old-cache.modd.io');
				}

				if (url?.indexOf('.png') !== -1 || url?.indexOf('.jpg') !== -1) {
					// load images via Image tag, helps CF optimize and convert(to webp) images via Polish - https://newdocs.phaser.io/docs/3.60.0/focus/Phaser.Loader.LoaderPlugin-image
					// this.load.imageLoadType = 'HTMLImageElement';
				} else {
					// default loader type
					// this.load.imageLoadType = 'XHR';
				}

				// https://stackoverflow.com/a/37455118
				return `${url}?v=1`;
			}

			export function fillRect(
				ctx: CanvasRenderingContext2D,
				x: number,
				y: number,
				width: number,
				height: number,
				color: string,
				alpha = 1
			) {
				const fillColor = new THREE.Color(color).getHex();
				const red = (fillColor & 0xff0000) >>> 16;
				const green = (fillColor & 0xff00) >>> 8;
				const blue = fillColor & 0xff;
				ctx.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
				ctx.fillRect(x, y, width, height);
			}

			export function strokeRect(
				ctx: CanvasRenderingContext2D,
				x: number,
				y: number,
				width: number,
				height: number,
				color: string,
				lineWidth: number,
				alpha = 1
			) {
				if (lineWidth === 0) return;

				const fillColor = new THREE.Color(color).getHex();
				const red = (fillColor & 0xff0000) >>> 16;
				const green = (fillColor & 0xff00) >>> 8;
				const blue = fillColor & 0xff;
				ctx.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
				ctx.lineWidth = lineWidth;

				// Stroke inside the rect instead of on the edge
				const lineWidthHalf = lineWidth / 2;
				const xMin = x + lineWidthHalf;
				const xMax = x + width - lineWidthHalf;
				const yMin = y + lineWidthHalf;
				const yMax = y + height - lineWidthHalf;

				ctx.beginPath();
				ctx.moveTo(xMin, yMin);
				ctx.lineTo(xMin, yMax);
				ctx.stroke();

				ctx.beginPath();
				ctx.moveTo(xMax, yMin);
				ctx.lineTo(xMax, yMax);
				ctx.stroke();

				ctx.beginPath();
				ctx.moveTo(xMin - lineWidthHalf, yMin);
				ctx.lineTo(xMax + lineWidthHalf, yMin);
				ctx.stroke();

				ctx.beginPath();
				ctx.moveTo(xMin - lineWidthHalf, yMax);
				ctx.lineTo(xMax + lineWidthHalf, yMax);
				ctx.stroke();
			}

			export function fillRoundedRect(
				ctx: CanvasRenderingContext2D,
				x: number,
				y: number,
				width: number,
				height: number,
				radius: number,
				color: string,
				alpha = 1
			) {
				var tl = radius;
				var tr = radius;
				var bl = radius;
				var br = radius;

				const fillColor = new THREE.Color(color).getHex();
				const red = (fillColor & 0xff0000) >>> 16;
				const green = (fillColor & 0xff00) >>> 8;
				const blue = fillColor & 0xff;
				ctx.fillStyle = `rgba(${red},${green},${blue},${alpha})`;

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

			export function strokeRoundedRect(
				ctx: CanvasRenderingContext2D,
				x: number,
				y: number,
				width: number,
				height: number,
				radius: number,
				color: string,
				strokeThickness: number,
				alpha = 1
			) {
				if (strokeThickness === 0) return;

				var tl = radius;
				var tr = radius;
				var bl = radius;
				var br = radius;

				const lineColor = new THREE.Color(color).getHex();
				const red = (lineColor & 0xff0000) >>> 16;
				const green = (lineColor & 0xff00) >>> 8;
				const blue = lineColor & 0xff;
				ctx.strokeStyle = `rgba(${red},${green},${blue},${alpha})`;
				ctx.lineWidth = strokeThickness;

				// Stroke inside the rect instead of on the edge
				const lineWidthHalf = strokeThickness / 2;
				const xMin = x + lineWidthHalf;
				const xMax = x + width - lineWidthHalf;
				const yMin = y + lineWidthHalf;
				const yMax = y + height - lineWidthHalf;

				ctx.beginPath();
				ctx.moveTo(xMin + tl, yMin);
				ctx.lineTo(xMax - tr, yMin);
				ctx.moveTo(xMax - tr, yMin);
				ctx.arc(xMax - tr, yMin + tr, tr, -(Math.PI * 0.5), 0);
				ctx.lineTo(xMax, yMax - br);
				ctx.moveTo(xMax, yMax - br);
				ctx.arc(xMax - br, yMax - br, br, 0, Math.PI * 0.5);
				ctx.lineTo(xMin + bl, yMax);
				ctx.moveTo(xMin + bl, yMax);
				ctx.arc(xMin + bl, yMax - bl, bl, Math.PI * 0.5, Math.PI);
				ctx.lineTo(xMin, yMin + tl);
				ctx.moveTo(xMin, yMin + tl);
				ctx.arc(xMin + tl, yMin + tl, tl, -Math.PI, -(Math.PI * 0.5));
				ctx.stroke();
			}

			export function fillTriangle(
				ctx: CanvasRenderingContext2D,
				x0: number,
				y0: number,
				x1: number,
				y1: number,
				x2: number,
				y2: number,
				color: string,
				alpha = 1
			) {
				const fillColor = new THREE.Color(color).getHex();
				const red = (fillColor & 0xff0000) >>> 16;
				const green = (fillColor & 0xff00) >>> 8;
				const blue = fillColor & 0xff;
				ctx.fillStyle = `rgba(${red},${green},${blue},${alpha})`;

				ctx.beginPath();
				ctx.moveTo(x0, y0);
				ctx.lineTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.closePath();
				ctx.fill();
			}

			export function pixelToWorld(numPixels: number) {
				return numPixels / 64;
			}

			export function worldToPixel(units: number) {
				return units * 64;
			}

			export function resizeImageToPowerOf2(image) {
				const ceil = THREE.MathUtils.ceilPowerOfTwo;

				const width = ceil(image.width);
				const height = ceil(image.height);

				const canvas = document.createElement('canvas');

				canvas.width = width;
				canvas.height = height;

				const context = canvas.getContext('2d');
				context.drawImage(image, 0, 0, width, height, 0, 0, width, height);

				return canvas;
			}

			export function lerp(a: number, b: number, t: number) {
				return a + (b - a) * t;
			}

			export function round(num: number, decimalPlaces = 0) {
				var p = Math.pow(10, decimalPlaces || 0);
				var n = num * p * (1 + Number.EPSILON);
				return Math.round(n) / p;
			}

			export function getLayerZOffset(layer: number) {
				return layer - 1;
			}

			export function getDepthZOffset(depth: number) {
				return depth * 0.001;
			}

			export function isLeftButton(buttons: number) {
				return !!(buttons & 1);
			}

			export function isRightButton(buttons: number) {
				return !!(buttons & 2);
			}

			export function isHexColor(str: string) {
				return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/.test(str);
			}

			export function isHexColorWithAlpha(str: string) {
				return /^#([A-Fa-f0-9]{8})$/.test(str);
			}

			export function getHexAlpha(hex: string) {
				return isHexColorWithAlpha(hex) ? parseInt(hex.slice(7), 16) / 255 : 1;
			}

			export function hexToRgb(hex: string) {
				const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
				return result
					? {
							r: parseInt(result[1], 16) / 255,
							g: parseInt(result[2], 16) / 255,
							b: parseInt(result[3], 16) / 255,
						}
					: { r: 1, g: 1, b: 1 };
			}

			export function deg2rad(degrees: number) {
				return degrees * (Math.PI / 180);
			}

			export function rad2deg(radians: number) {
				return radians * (180 / Math.PI);
			}

			export function toFixedWithoutZeros(num: number, precision: number) {
				return `${Number.parseFloat(num.toFixed(precision))}`;
			}

			export function formatNumber(value: number, decimalPlaces = 0, trailingZeros = false) {
				if (value === undefined || value === null) return '';
				return trailingZeros ? value.toFixed(decimalPlaces).toString() : toFixedWithoutZeros(value, decimalPlaces);
			}
		}
	}
}
