class PhaserRay {
	private line: Phaser.GameObjects.Line;
	private sprite: Phaser.GameObjects.Sprite;

	constructor(
		scene: GameScene,
		start: {
			x: number;
			y: number;
		},
		end: {
			x: number;
			y: number;
		},
		config: {
			color: number;
			projType: string;
			fraction: number;
			rotation: number;
			dimensions: {
				width: number;
				height: number;
			};
		}
	) {
		/* Debug draw ray */
		// small vector math tweaks to get the line positions right
		// const v1 = new Phaser.Math.Vector2(start.x, start.y);
		// const v2 = new Phaser.Math.Vector2(end.x, end.y);
		// const lineStart = v1.multiply(new Phaser.Math.Vector2(0.5, 0.5));
		// const lineEnd = v2.subtract(v1);
		// this.line = scene.add.line(
		// 	lineStart.x, lineStart.y,
		// 	lineStart.x, lineStart.y,
		// 	lineEnd.x, lineEnd.y,
		// 	config.color,
		// );

		// this.line.setOrigin(0,0);
		// this.line.setAlpha(0.70);

		// scene.tweens.add({
		// 	targets: this.line,
		// 	duration: 100,
		// 	props: {
		// 		alpha: 0
		// 	},
		// 	onComplete: () => {
		// 		this.line.destroy();
		// 		this.line = null;
		// 	}
		// });

		// console.log(this.line);
		/* End of Debug draw ray */

		if (config.projType) {
			this.sprite = scene.add.sprite(start.x, start.y, `projectile/${config.projType}`);
			this.sprite.setAngle((config.rotation * 180) / Math.PI);
			this.sprite.setDisplaySize(config.dimensions.width, config.dimensions.height);

			scene.tweens.add({
				targets: this.sprite,
				duration: 50 * config.fraction,
				props: {
					x: end.x,
					y: end.y,
				},
				onComplete: () => {
					setTimeout(() => {
						this.sprite.destroy();
						this.sprite = null;
					}, 50);
				},
			});
		}
	}
}
