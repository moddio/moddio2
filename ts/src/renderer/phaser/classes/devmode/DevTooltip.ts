class DevTooltip extends Phaser.GameObjects.Container {
	private readonly bubble: Phaser.GameObjects.Graphics;
	private readonly bitmapLabel: Phaser.GameObjects.BitmapText;
	private readonly bitmapText: Phaser.GameObjects.BitmapText;

	private fadeTimerEvent: Phaser.Time.TimerEvent;
	private fadeTween: Phaser.Tweens.Tween;

	constructor (scene: Phaser.Scene) {
		super(scene)

		this.visible = false;
		this.setScrollFactor(0);

		const bubble = this.bubble = scene.add.graphics();
		this.add(bubble);

		const label = this.bitmapLabel = scene.add.bitmapText(
			0, 0,
			BitmapFontManager.font(scene, 'Verdana', true, false, '#000000')
		);
		label.setFontSize(14);
		label.setCenterAlign();
		label.setOrigin(0.5);
		label.letterSpacing = -0.6;
		label.y = -10

		const text = this.bitmapText = scene.add.bitmapText(
			0, 0,
			BitmapFontManager.font(scene, 'Verdana', false, false, '#000000')
		);
		text.setFontSize(14);
		text.setCenterAlign();
		text.setOrigin(0.5);
		text.letterSpacing = -0.6;
		text.y = 10;

		this.add(label);
		this.add(text);
		scene.add.existing(this);
	}

	private drawBubble (): void {
		const bubble = this.bubble;
		const label = this.bitmapLabel;
		const text = this.bitmapText;
		const width = (text.width > label.width ? text.width : label.width) + 30;
		const height = text.height + 50;

		bubble.clear();
		bubble.fillStyle(0xffffff, 1);
		bubble.fillRect(
			-width / 2,
			-height / 2,
			width,
			height
		);

		this.x = this.scene.sys.game.canvas.width - width/2 - 20;
		this.y = 70;
	}

	showMessage(labelText: string, tooltipText: string): void {
		// reset fade timer and tween
		if (this.fadeTimerEvent) {
			this.scene.time.removeEvent(this.fadeTimerEvent);
			this.fadeTimerEvent = null;
		}
		if (this.fadeTween) {
			this.fadeTween.remove();
			this.fadeTween = null;
		}

		this.visible = true;
		this.alpha = 1;

		const label = this.bitmapLabel;
		label.setText(BitmapFontManager.sanitize(
			label.fontData, labelText
		));
		const text = this.bitmapText;
		text.setText(BitmapFontManager.sanitize(
			text.fontData, tooltipText
		));

		this.drawBubble();

		if (labelText === 'Position') {
			this.fadeOut();
		}
	}

	fadeOut(): void {
		const scene = this.scene;
		this.fadeTimerEvent = scene.time.delayedCall(500, () => {
			this.fadeTimerEvent = null;
			this.fadeTween = scene.tweens.add({
				targets: this,
				alpha: 0,
				duration: 500,
				onComplete: () => {
					this.fadeTween = null;
					this.visible = false;
				}
			});
		});
	}
}
