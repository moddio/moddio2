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
		unit.attributesContainer.height += 16;
		unit.updateGameObjectSize();
		bar.setVisible(true);

		return bar;
	}

	static release(bar: PhaserAttributeBar): void {
		bar.resetFadeOut();

		bar.setVisible(false);
		bar.unit.attributesContainer.remove(bar);
		bar.unit.attributesContainer.height -= 16;
		bar.unit.updateGameObjectSize();
		bar.unit = null;

		bar.name = null;

		bar.setActive(false);
	}

	private readonly bar: Phaser.GameObjects.Graphics;
	private readonly bitmapText: Phaser.GameObjects.BitmapText;
	private readonly rtText: Phaser.GameObjects.RenderTexture;

	private fadeTimerEvent: Phaser.Time.TimerEvent;
	private fadeTween: Phaser.Tweens.Tween;

	private constructor(private unit: PhaserUnit) {
		const scene = unit.scene;

		super(scene);

		const bar = (this.bar = scene.add.graphics());
		this.add(bar);

		const text = (this.bitmapText = scene.add.bitmapText(
			0,
			0,
			BitmapFontManager.font(scene, 'Arial', true, false, '#000000')
		));
		text.setCenterAlign();
		text.setFontSize(14);
		text.setOrigin(0.5);
		text.letterSpacing = -0.8;
		text.visible = false;
		this.add(text);

		if (scene.renderer.type === Phaser.CANVAS) {
			const rt = (this.rtText = scene.add.renderTexture(0, 0));
			rt.setOrigin(0.5);
			rt.visible = false;
			this.add(rt);
		}

		// TODO batch entire attribute bar, not only text

		unit.attributesContainer.add(this);
		unit.attributesContainer.height = 16;
		unit.updateGameObjectSize();
	}

	render(data: AttributeData): void {
		const { color, max, displayValue, index, showWhen, decimalPlaces } = data;

		const value = Number(data.value);

		this.name = data.type || data.key;

		const bar = this.bar;

		const w = 94;
		const h = 16;
		const borderRadius = h / 2 - 1;

		bar.clear();

		bar.fillStyle(Phaser.Display.Color.HexStringToColor(color).color);

		// add max as a patch to renderer freezing when max is 0
		if (value !== 0 && max !== 0) {
			bar.fillRoundedRect(
				-w / 2,
				-h / 2,
				// we should not clamp here because it will mask whether or not there is a fault elsewhere in the attribute logic
				// because of this, changed from Math.max(w * Math.min(value, max)/ max...)
				Math.max((w * value) / max, borderRadius * 1.5),
				h,
				borderRadius
			);
		}

		bar.lineStyle(2, 0x000000, 1);
		bar.strokeRoundedRect(-w / 2, -h / 2, w, h, borderRadius);

		const text = this.bitmapText;
		const rt = this.rtText;

		if (displayValue) {
			text.setText(value.toFixed(decimalPlaces));
			text.visible = !rt;
			if (rt) {
				rt.resize(text.width, text.height);
				rt.clear();
				rt.draw(text, text.width / 2, text.height / 2);
				rt.visible = true;
			}
		} else {
			text.setText('');
			text.visible = false;
			rt && (rt.visible = false);
		}

		this.y = (index - 1) * h * 1.1;

		this.resetFadeOut();

		if ((showWhen instanceof Array && showWhen.indexOf('valueChanges') > -1) || showWhen === 'valueChanges') {
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
				},
			});
		});
	}

	private resetFadeOut(): void {
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
