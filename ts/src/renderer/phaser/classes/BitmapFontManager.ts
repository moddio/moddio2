type Font = 'Arial' | 'Verdana';

class BitmapFontManager {
	private static REPLACEMENT_CHAR = String.fromCharCode(65533);

	static preload(scene: Phaser.Scene): void {
		const load = scene.load;

		load.bitmapFont('Verdana#FFFFFF', '/assets/fonts/Verdana.png', '/assets/fonts/Verdana.xml');
		load.image('VerdanaStroke#FFFFFF', '/assets/fonts/VerdanaStroke.png');

		load.bitmapFont('VerdanaBold#FFFFFF', '/assets/fonts/VerdanaBold.png', '/assets/fonts/VerdanaBold.xml');
		load.image('VerdanaBoldStroke#FFFFFF', '/assets/fonts/VerdanaBoldStroke.png');

		load.bitmapFont('ArialBold#FFFFFF', '/assets/fonts/ArialBold.png', '/assets/fonts/ArialBold.xml');
	}

	static create(scene: Phaser.Scene): void {
		const bitmapCache = scene.cache.bitmapFont;

		bitmapCache.add('VerdanaStroke#FFFFFF', {
			data: bitmapCache.get('Verdana#FFFFFF').data,
			frame: null,
			texture: 'VerdanaStroke#FFFFFF',
		});

		bitmapCache.add('VerdanaBoldStroke#FFFFFF', {
			data: bitmapCache.get('VerdanaBold#FFFFFF').data,
			frame: null,
			texture: 'VerdanaBoldStroke#FFFFFF',
		});

		this.add(scene, 'Arial', true, false, '#000000');
	}

	static font(scene: Phaser.Scene, font: Font, bold: boolean, stroke: boolean, color: string): string {
		const key = font + (bold ? 'Bold' : '') + (stroke ? 'Stroke' : '') + color.toUpperCase();

		if (!scene.cache.bitmapFont.has(key)) {
			this.add(scene, font, bold, stroke, color);
		}

		return key;
	}

	static add(scene: Phaser.Scene, font: Font, bold: boolean, stroke: boolean, color: string): void {
		const key = font + (bold ? 'Bold' : '') + (stroke ? 'Stroke' : '') + color.toUpperCase();

		const sourceFillKey = `${font + (bold ? 'Bold' : '')}#FFFFFF`;

		const bitmapCache = scene.cache.bitmapFont;
		const textures = scene.textures;

		const sourceFillData = bitmapCache.get(sourceFillKey);
		const sourceFillTexture = textures.get(sourceFillData.texture);
		const sourceFillImage = sourceFillTexture.getSourceImage() as HTMLImageElement;
		const w = sourceFillImage.width;
		const h = sourceFillImage.height;

		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;

		const ctx = canvas.getContext('2d');
		ctx.drawImage(sourceFillImage, 0, 0, w, h);

		ctx.globalCompositeOperation = 'source-in';
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = 'source-over'; // default

		if (stroke) {
			const sourceStrokeKey = `${font + (bold ? 'Bold' : '') + (stroke ? 'Stroke' : '')}#FFFFFF`;

			const sourceStrokeData = bitmapCache.get(sourceStrokeKey);
			const sourceFillTexture = textures.get(sourceStrokeData.texture);
			const sourceStrokeImage = sourceFillTexture.getSourceImage() as HTMLImageElement;

			const tempCanvas = Phaser.Display.Canvas.CanvasPool.create2D(null, w, h);

			const tempCtx = tempCanvas.getContext('2d');
			tempCtx.clearRect(0, 0, w, h);
			tempCtx.drawImage(canvas, 0, 0, w, h);

			ctx.drawImage(sourceStrokeImage, 0, 0, w, h);
			ctx.globalCompositeOperation = 'source-in';
			ctx.fillStyle = '#000';
			ctx.fillRect(0, 0, w, h);
			ctx.globalCompositeOperation = 'source-over'; // default
			ctx.drawImage(tempCanvas, 0, 0, w, h);

			Phaser.Display.Canvas.CanvasPool.remove(tempCanvas);
		}

		textures.addCanvas(key, canvas);

		bitmapCache.add(key, {
			data: sourceFillData.data,
			frame: null,
			texture: key,
		});
	}

	static sanitize(fontData: Phaser.Types.GameObjects.BitmapText.BitmapFontData, text: string): string {
		for (let i = 0; i < text.length; i++) {
			if (!fontData.chars[text.charCodeAt(i)]) {
				text = text.substring(0, i) + this.REPLACEMENT_CHAR + text.substring(i + 1);
			}
		}

		return text;
	}
}
