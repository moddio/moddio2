class PhaserFloatingText extends Phaser.GameObjects.BitmapText {
	// TODO object pool

	private readonly rt: Phaser.GameObjects.RenderTexture;

	constructor(
		scene: Phaser.Scene,
		data: {
			text: string;
			x: number;
			y: number;
			color: string;
		}
	) {
		super(
			scene,
			data.x,
			data.y,
			BitmapFontManager.font(
				scene,
				'Verdana',
				true,
				taro.game.data.settings.addStrokeToNameAndAttributes !== false,
				data.color || '#FFFFFF'
			)
		);
		this.setText(BitmapFontManager.sanitize(this.fontData, data.text));
		this.setOrigin(0.5);
		this.setFontSize(16);
		this.letterSpacing = 1.3;

		scene.add.existing(this);

		if (scene.renderer.type === Phaser.CANVAS) {
			const rt = (this.rt = scene.add.renderTexture(this.x, this.y, this.width, this.height));
			// TODO clear when pooled
			rt.draw(this, this.width / 2, this.height / 2);
			rt.setOrigin(0.5);

			this.visible = false;
		}

		scene.tweens.add({
			targets: this.rt || this,
			alpha: 0.5,
			duration: 2500,
			y: this.y - 40,
			onComplete: () => {
				this.rt && this.rt.destroy();
				this.destroy(); // TODO object pool
			},
		});
	}
}
