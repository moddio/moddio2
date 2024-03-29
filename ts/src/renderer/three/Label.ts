namespace Renderer {
	export namespace Three {
		export class Label extends Node {
			offset = new THREE.Vector2();

			private sprite: THREE.Sprite;
			private scaleScalar = 1;
			private size = new THREE.Vector2();
			private textSize = new THREE.Vector2();
			private center = new THREE.Vector2(0.5, 0.5);

			constructor(
				public text = '',
				color = 'white',
				bold = false,
				private renderOnTop = false
			) {
				super();

				this.scaleScalar = 1;

				this.sprite = this.createLabel(text, color, bold);
				this.add(this.sprite);
			}

			onDestroy() {
				this.sprite.material.map.dispose();
				this.sprite.material.dispose();
			}

			update(text: string, color = 'white', bold = false) {
				this.text = text;
				this.remove(this.sprite);
				this.sprite = this.createLabel(text, color, bold);
				this.add(this.sprite);
			}

			setOffset(offset: THREE.Vector2, center = new THREE.Vector2(0.5, 0.5)) {
				this.center.copy(center);
				this.offset.copy(offset);
				this.sprite.center.set(
					center.x - offset.x / (this.size.x * this.scaleScalar),
					center.y - offset.y / (this.size.y * this.scaleScalar)
				);
			}

			setOffsetX(x: number, center = new THREE.Vector2(0.5, 0.5)) {
				this.center.copy(center);
				this.offset.x = x;
				this.sprite.center.x = center.x - x / (this.size.x * this.scaleScalar);
			}

			setOffsetY(y: number, center = new THREE.Vector2(0.5, 0.5)) {
				this.center.copy(center);
				this.offset.y = y;
				this.sprite.center.y = center.y - y / (this.size.y * this.scaleScalar);
			}

			setScale(scale: number) {
				this.scaleScalar = scale;

				this.sprite.center.set(
					this.center.x + this.offset.x / (this.size.x * scale),
					this.center.y + this.offset.y / (this.size.y * scale)
				);

				this.sprite.scale.set(
					this.scaleScalar * Utils.pixelToWorld(this.size.x),
					this.scaleScalar * Utils.pixelToWorld(this.size.y),
					1
				);

				this.sprite.center.set(
					this.center.x - this.offset.x / (this.size.x * scale),
					this.center.y - this.offset.y / (this.size.y * scale)
				);
			}

			setOpacity(opacity: number) {
				this.sprite.material.opacity = opacity;
			}

			getTextSizeInPixels() {
				return { width: this.textSize.x * this.scaleScalar, height: this.textSize.y * this.scaleScalar };
			}

			private createLabel(text: string, color = 'white', bold = false) {
				const textCanvas = document.createElement('canvas');
				textCanvas.height = 10;

				const ctx = textCanvas.getContext('2d');
				const font = `${bold ? 'bold' : 'normal'} 16px Verdana`;
				ctx.font = font;
				const metrics = ctx.measureText(text);

				const textWidth = Math.ceil(metrics.width);
				const textHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
				this.textSize.set(textWidth, textHeight);

				const padding = 8;
				textCanvas.width = textWidth + padding;
				textCanvas.height = textHeight + padding;
				this.size.set(textCanvas.width, textCanvas.height);

				const isStroke = taro.game.data.settings.addStrokeToNameAndAttributes;
				if (isStroke === undefined || isStroke) {
					ctx.font = font;
					ctx.strokeStyle = '#000';
					ctx.lineWidth = 4;
					ctx.lineJoin = 'miter';
					ctx.miterLimit = 3;
					ctx.strokeText(text, padding / 2, textHeight + padding / 2);
					this.textSize.addScalar(2);
				}

				ctx.fillStyle = color;
				ctx.font = font;
				ctx.font;
				ctx.fillText(text, padding / 2, textHeight + padding / 2);

				const spriteMap = new THREE.Texture(ctx.getImageData(0, 0, textCanvas.width, textCanvas.height));
				spriteMap.magFilter = TextureRepository.instance().filter;
				spriteMap.generateMipmaps = false;
				spriteMap.needsUpdate = true;
				spriteMap.colorSpace = THREE.SRGBColorSpace;

				const spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap });
				if (this.renderOnTop) {
					spriteMaterial.depthTest = false;
					spriteMaterial.depthWrite = false;
				}

				const sprite = new THREE.Sprite(spriteMaterial);
				sprite.renderOrder = this.renderOnTop ? 999 : 499;
				sprite.scale.set(
					this.scaleScalar * Utils.pixelToWorld(textCanvas.width),
					this.scaleScalar * Utils.pixelToWorld(textCanvas.height),
					1
				);

				sprite.center.set(
					this.center.x - this.offset.x / (this.size.x * this.scaleScalar),
					this.center.y - this.offset.y / (this.size.y * this.scaleScalar)
				);

				return sprite;
			}
		}
	}
}
