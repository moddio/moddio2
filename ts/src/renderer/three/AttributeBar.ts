namespace Renderer {
	export namespace Three {
		export class AttributeBar extends Node {
			scaleScalar = 1;

			private sprite;

			private size = new THREE.Vector2();
			private center = new THREE.Vector2(0.5, 0.5);
			private offset = new THREE.Vector2();

			private timeout;

			constructor(
				public width = 97,
				public height = 16,
				public radius = 7
			) {
				super();

				this.scaleScalar = 1;

				this.sprite = this.createBar(this.width, this.height, this.radius, 'yellow', 100, 100);
				this.add(this.sprite);
			}

			update(data: AttributeData) {
				const { color, max, displayValue, showWhen, decimalPlaces, value } = data;

				this.name = data.type || data.key;

				this.remove(this.sprite);
				this.sprite = this.createBar(
					this.width,
					this.height,
					this.radius,
					color,
					+(+value).toFixed(decimalPlaces),
					max,
					displayValue,
					data
				);
				this.add(this.sprite);

				this.visible = true;

				if (this.timeout) {
					clearTimeout(this.timeout);
					this.timeout = null;
				}

				if ((showWhen instanceof Array && showWhen.indexOf('valueChanges') > -1) || showWhen === 'valueChanges') {
					this.timeout = setTimeout(() => {
						this.visible = false;
					}, 1000);
				}
			}

			setOffset(offset: THREE.Vector2, center = new THREE.Vector2(0.5, 0.5)) {
				this.center.copy(center);
				this.offset.copy(offset);

				if (this.sprite) {
					this.sprite.center.set(center.x - offset.x / this.size.x, center.y - offset.y / this.size.y);
				}
			}

			setOpacity(opacity: number) {
				this.sprite.material.opacity = opacity;
			}

			setScale(scale: number) {
				this.scaleScalar = scale;

				this.sprite.center.set(
					this.center.x + this.offset.x / this.size.x,
					this.center.y + this.offset.y / this.size.y
				);

				this.sprite.scale.set(
					this.scaleScalar * Utils.pixelToWorld(this.size.x),
					this.scaleScalar * Utils.pixelToWorld(this.size.y),
					1
				);

				this.sprite.center.set(
					this.center.x - this.offset.x / this.size.x,
					this.center.y - this.offset.y / this.size.y
				);
			}

			private createBar(
				_width: number,
				_height: number,
				radius: number,
				color: string,
				value: number,
				max: number,
				displayValue = true,
				def = {} as any
			) {
				const strokeColor = def.strokeColor ?? '#000000';
				const strokeThickness = def.strokeThickness ?? 2;
				const roundness = def.cornerRounding ?? 7;
				let bgColor = def.backgroundColor ?? '#ffffff';
				let bgAlpha = 0;
				let fgColor = def.color ?? '#ffff0f';
				let fgAlpha = 1;

				// The alpha can be set via the hex color in the editor. Three.js
				// doesn't support this, so we extract the alpha from the hex here.
				if (Utils.isHexColorWithAlpha(bgColor)) {
					bgAlpha = Utils.getHexAlpha(bgColor);
					bgColor = bgColor.slice(0, 7);
				}

				if (Utils.isHexColorWithAlpha(fgColor)) {
					fgAlpha = Utils.getHexAlpha(fgColor);
					fgColor = fgColor.slice(0, 7);
				}

				const fontSize = def.fontSize ?? 14;
				const width = def.dimensions?.width ?? 97;
				const height = def.dimensions?.height ?? 16;

				//

				const textCanvas = document.createElement('canvas');

				const ctx = textCanvas.getContext('2d');
				const font = `bold ${fontSize}px Verdana`;

				const padding = 4;

				var x = padding / 2;
				var y = padding / 2;

				const text = value.toString();

				ctx.font = font;
				const metrics = ctx.measureText(text);
				const textWidth = metrics.width;
				const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
				textCanvas.width = width + padding;
				textCanvas.height = height + padding;
				this.size.set(textCanvas.width, textCanvas.height);

				if (roundness > 0) {
					Utils.fillRoundedRect(ctx, x, y, width, height, roundness, bgColor, bgAlpha);

					const widthScaledByValue = Math.max((width * value) / max, roundness * 1.5);
					Utils.fillRoundedRect(ctx, x, y, widthScaledByValue, height, roundness, fgColor, fgAlpha);

					Utils.strokeRoundedRect(ctx, x, y, width, height, roundness, strokeColor, strokeThickness);
				} else {
					Utils.fillRect(ctx, x, y, width, height, bgColor, bgAlpha);

					const widthScaledByValue = Math.max((width * value) / max, 1.5);
					Utils.fillRect(ctx, x, y, widthScaledByValue, height, fgColor, fgAlpha);

					Utils.strokeRect(ctx, x, y, width, height, strokeColor, strokeThickness / 2);
				}

				if (displayValue) {
					ctx.font = font;
					ctx.fillStyle = '#000';
					ctx.fillText(text, textCanvas.width / 2 - textWidth / 2, textCanvas.height / 2 + textHeight / 2);
				}

				const spriteMap = new THREE.Texture(ctx.getImageData(0, 0, textCanvas.width, textCanvas.height));
				spriteMap.magFilter = TextureRepository.instance().filter;
				spriteMap.generateMipmaps = false;
				spriteMap.needsUpdate = true;
				spriteMap.colorSpace = THREE.SRGBColorSpace;

				const spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap, depthTest: false, depthWrite: false });
				const sprite = new THREE.Sprite(spriteMaterial);
				sprite.renderOrder = 999;
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
