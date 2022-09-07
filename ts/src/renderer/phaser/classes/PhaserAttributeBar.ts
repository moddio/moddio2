class PhaserAttributeBar extends Phaser.GameObjects.Container {

	private static pool: Phaser.GameObjects.Group;

	static get(unit: PhaserUnit): PhaserAttributeBar {

		if (!this.pool) {
			this.pool = unit.scene.make.group({});
		}

		let bar: PhaserAttributeBar = this.pool.getFirstDead(false);
		if (!bar) {
			bar = new PhaserAttributeBar(unit);
			this.pool.add(bar);
		}
		bar.setActive(true);

		bar.unit = unit;
		unit.attributesContainer.add(bar);
		bar.setVisible(true);

		return bar;
	}

	static release (bar: PhaserAttributeBar): void {

		bar.resetFadeOut();

		bar.setVisible(false);
		bar.unit.attributesContainer.remove(bar);
		bar.unit = null;

		bar.name = null;

		bar.setActive(false);
	}

	private readonly bar: Phaser.GameObjects.Graphics;
	private readonly text: Phaser.GameObjects.BitmapText;

	private fadeTimerEvent: Phaser.Time.TimerEvent;
	private fadeTween: Phaser.Tweens.Tween;

	private constructor(private unit: PhaserUnit) {

		const scene = unit.scene;

		super(scene);

		const bar = this.bar = scene.add.graphics();
		this.add(bar);

		const text = this.text = scene.add.bitmapText(0, 0,
			'Arial_24px_bold_black'
		);
		text.setCenterAlign();
		text.setFontSize(16);
		text.setOrigin(0.5);
		this.add(text);

		unit.attributesContainer.add(this);
	}

	render (data: AttributeData): void {

		this.name = data.type || data.key;

		const bar = this.bar;

		const w = 94;
		const h = 16;
		const borderRadius = h / 2 - 1;

		bar.clear();

		bar.fillStyle(Phaser.Display.Color
			.HexStringToColor(data.color)
			.color);
		if (data.value !== 0) {
			bar.fillRoundedRect(
				-w / 2,
				-h / 2,
				Math.max(w * data.value / data.max, borderRadius * 1.5),
				h,
				borderRadius
			);
		}

		bar.lineStyle(2, 0x000000, 1);
		bar.strokeRoundedRect(
			-w / 2,
			-h / 2,
			w,
			h,
			borderRadius
		);

		this.text.setText(data.displayValue ?
			(typeof data.value === 'number' ?
				data.value.toFixed(0) : '0') : '');

		this.y = (data.index - 1) * h*1.1;

		this.resetFadeOut();

		if ((data.showWhen instanceof Array &&
			data.showWhen.indexOf('valueChanges') > -1) ||
			data.showWhen === 'valueChanges') {

			this.fadeOut();
		}
	}

	private fadeOut(): void {

		const scene = this.scene;

		this.fadeTimerEvent = scene.time.delayedCall(1000, () => {

			this.fadeTimerEvent = null;

			this.fadeTween = scene.tweens.add({
				targets: this,
				alpha: 0,
				duration: 500,
				onComplete: () => {

					this.fadeTween = null;

					const unit = this.unit;
					if (unit) {

						const attributes = unit.attributes;
						const index = attributes.indexOf(this);

						if (index !== -1) {
							attributes.splice(index, 1);
							PhaserAttributeBar.release(this);
						}
					}
				}
			});
		});
	}

	private resetFadeOut (): void {
		// reset fade timer and tween
		if (this.fadeTimerEvent) {
			this.scene.time.removeEvent(this.fadeTimerEvent);
			this.fadeTimerEvent = null;
		}
		if (this.fadeTween) {
			this.fadeTween.remove();
			this.fadeTween = null;
		}
		this.alpha = 1;
	}
}
