class PhaserChatBubble extends Phaser.GameObjects.Container {

	private readonly bubble: Phaser.GameObjects.Graphics;
	private readonly textObject: Phaser.GameObjects.BitmapText;

	private offset: number;

	private fadeTimerEvent: Phaser.Time.TimerEvent;
	private fadeTween: Phaser.Tweens.Tween;

	constructor(
		scene: Phaser.Scene,
		chatText: string,
		private unit: PhaserUnit
	) {
		super(scene);

		const bubble = this.bubble = scene.add.graphics();
		this.add(bubble);

		const text = this.textObject = scene.add.bitmapText(
			0, 0,
			'Arial_24px_bold_white'
		);
		text.setFontSize(14);
		text.setCenterAlign();
		text.setOrigin(0.5);
		this.add(text);

		scene.add.existing(this);

		this.showMessage(chatText);
	}

	showMessage(chatText: string): void {
		this.textObject.text = this.trimText(chatText);

		this.drawBubble();

		this.updateScale();
		this.updateOffset();

		this.fadeOut();
	}

	private fadeOut(): void {
		const scene = this.scene;

		// reset fade timer and tween
		if (this.fadeTimerEvent) {
			scene.time.removeEvent(this.fadeTimerEvent);
			this.fadeTimerEvent = null;
		}
		if (this.fadeTween) {
			this.fadeTween.remove();
			this.fadeTween = null;
		}

		this.visible = true;
		this.alpha = 1;

		this.fadeTimerEvent = scene.time.delayedCall(3000, () => {
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

	private updateScale (): void {
		this.setScale(1 / this.scene.cameras.main.zoom);
	}

	private trimText (chatText: string): string {
		if (chatText.length > 40) {
			chatText = chatText.substring(0, 40);
			chatText += '...';
		}
		return chatText;
	}

	private drawBubble (): void {
		const bubble = this.bubble;
		const text = this.textObject;
		const width = text.width + 20;
		const height = text.height + 10;

		bubble.clear();
		bubble.fillStyle(0x000000, 0.5);
		bubble.fillRoundedRect(
			-width / 2,
			-height / 2,
			width,
			height,
			5
		);
		bubble.fillTriangle(
			0, height / 2 + 7,
			7, height / 2,
			-7, height / 2
		);
	}

	private updateOffset (): void {
		const { sprite, label, gameObject } = this.unit;
		this.offset =  25 +
			(sprite.displayHeight + sprite.displayWidth) / 4 +
			label.displayHeight * 2;
		this.y = gameObject.y - this.offset;
	}

	updatePosition (): void {
		const { x, y } = this.unit.gameObject;
		this.x = x;
		this.y = y - this.offset;
	}
}
