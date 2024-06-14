namespace Renderer {
	export namespace Three {
		const animationMgr = AnimationManager.instance();

		export class AnimatedSprite extends Sprite {
			private playSpriteIndices: number[] = [];
			private runningTileArrayIndex = 0;
			private maxDisplayTime = 0;
			private elapsedTime = 0;
			private tileH = 1;
			private tileV = 1;
			private currentTile = 0;
			private repeat = 0;
			private cycle = 0;

			constructor(
				private spriteSheet: TextureSheet,
				instanced = false
			) {
				super(spriteSheet.texture, instanced);

				this.tileH = 1 / (spriteSheet.width / spriteSheet.tileWidth);
				this.tileV = 1 / (spriteSheet.height / spriteSheet.tileHeight);
				spriteSheet.texture.repeat.set(this.tileH, this.tileV);

				this.setUvOffset(0);
			}

			play(animKey: string) {
				const animation = animationMgr.animations.get(animKey);
				if (!animation) return;

				this.playSpriteIndices = animation.frames;
				this.runningTileArrayIndex = 0;
				this.currentTile = animation.frames[this.runningTileArrayIndex];
				this.maxDisplayTime = 1 / animation.fps;
				this.repeat = animation.repeat;
				this.cycle = 0;
				this.elapsedTime = 0;
				this.setUvOffset(this.currentTile);
			}

			update(dt: number) {
				super.update(dt);

				if (this.repeat !== 0 && this.cycle >= this.repeat) {
					return;
				}

				this.elapsedTime += dt;

				if (this.elapsedTime >= this.maxDisplayTime && this.maxDisplayTime > 0) {
					this.elapsedTime -= this.maxDisplayTime;

					this.currentTile = this.playSpriteIndices[this.runningTileArrayIndex];
					this.setUvOffset(this.currentTile);

					this.runningTileArrayIndex = (this.runningTileArrayIndex + 1) % this.playSpriteIndices.length;
					if (this.runningTileArrayIndex === 0) {
						this.cycle++;
					}
				}
			}

			setTextureSheet(spriteSheet: TextureSheet) {
				this.spriteSheet = spriteSheet;

				super.setTexture(spriteSheet.texture);

				this.tileH = 1 / (spriteSheet.width / spriteSheet.tileWidth);
				this.tileV = 1 / (spriteSheet.height / spriteSheet.tileHeight);
				this.spriteSheet.texture.repeat.set(this.tileH, this.tileV);

				this.setUvOffset(this.currentTile);
			}

			private setUvOffset(tileIndex: number) {
				const x = tileIndex % this.spriteSheet.cols;
				const y = Math.floor(tileIndex / this.spriteSheet.cols);
				this.spriteSheet.texture.offset.set(this.tileH * x, 1 - this.tileV * (y + 1));
			}
		}
	}
}
