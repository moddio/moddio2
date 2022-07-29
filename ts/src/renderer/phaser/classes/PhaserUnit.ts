class PhaserUnit extends PhaserAnimatedEntity {

	sprite: Phaser.GameObjects.Sprite;
	label: Phaser.GameObjects.Text;
	chat: PhaserChatBubble;

	gameObject: Phaser.GameObjects.Container;
	attributes: PhaserAttributeBar[] = [];
	attributesContainer: Phaser.GameObjects.Container;

	constructor (
		scene: GameScene,
		entity: Unit
	) {
		super(scene, entity, `unit/${entity._stats.type}`);

		const translate = entity._translate;
		this.gameObject = scene.add.container(
			translate.x,
			translate.y,
			[ this.sprite ]
		);

		Object.assign(this.evtListeners, {
			flip: entity.on('flip', this.flip, this),
			follow: entity.on('follow', this.follow, this),
			'update-label': entity.on('update-label', this.updateLabel, this),
			'show-label': entity.on('show-label', this.showLabel, this),
			'hide-label': entity.on('hide-label', this.hideLabel, this),
			'fading-text': entity.on('fading-text', this.fadingText, this),
			'render-attributes': entity.on('render-attributes', this.renderAttributes, this),
			'update-attribute': entity.on('update-attribute', this.updateAttribute, this),
			'render-chat-bubble': entity.on('render-chat-bubble', this.renderChat, this),
		});

		ige.client.on('zoom', (height: number) => {
			this.scaleElements(height);
		});
	}

	protected transform (data: {
		x: number;
		y: number;
		rotation: number
	}): void {
		super.transform(data);
		if (this.chat) {
			this.chat.updatePosition(this.gameObject.x, this.gameObject.y);
		}
		this.flip(this.entity._stats.flip);
	}

	protected size (
		data: {
			width: number,
			height: number
		}
	): void {
		super.size(data);
		if (this.label) {
			this.updateLabelOffset();
		}
		if (this.attributesContainer) {
			this.updateAttributesOffset();
		}
	}

	private updateLabelOffset (): void {
		this.label.y = -25 - (this.sprite.displayHeight + this.sprite.displayWidth) / 4;
	}

	private updateAttributesOffset (): void {
		this.attributesContainer.y = 25 + (this.sprite.displayHeight + this.sprite.displayWidth) / 4;
	}

	protected flip (flip: FlipMode): void {
		this.sprite.setFlip(flip % 2 === 1, flip > 1);
	}

	private follow (): void {
		console.log('PhaserUnit follow', this.entity.id()); // TODO remove
		const camera = this.scene.cameras.main as Phaser.Cameras.Scene2D.Camera & {
			_follow: Phaser.GameObjects.GameObject
		};
		if (camera._follow === this.gameObject) {
			return;
		}
		camera.startFollow(this.gameObject, false, 0.05, 0.05);
	}

	private getLabel (): Phaser.GameObjects.Text {
		if (!this.label) {
			const label = this.label = this.scene.add.text(0, 0, 'cccccc');
			label.setOrigin(0.5);
			this.gameObject.add(label);
		}
		return this.label;
	}

	private updateLabel (data: {
		text? : string;
		bold?: boolean;
		color?: string;
	}): void {
		console.log('PhaserUnit update-label', this.entity.id()); // TODO remove
		const label = this.getLabel();
		label.visible = true;

		label.setFontFamily('Verdana');
		label.setFontSize(16);
		label.setFontStyle(data.bold ? 'bold' : 'normal');
		label.setFill(data.color || '#fff');

		const strokeThickness = ige.game.data.settings
			.addStrokeToNameAndAttributes !== false ? 4 : 0;
		label.setStroke('#000', strokeThickness);
		label.setText(data.text || '');
		this.updateLabelOffset();
	}

	private showLabel (): void {
		console.log('PhaserUnit show-label', this.entity.id()); // TODO remove
		this.getLabel().visible = true;
	}

	private hideLabel (): void {
		console.log('PhaserUnit hide-label', this.entity.id()); // TODO remove
		this.getLabel().visible = false;
	}

	private fadingText (data: {
		text: string;
		color?: string;
	}): void {
		console.log('PhaserUnit fading-text', this.entity.id()); // TODO remove
		new PhaserFloatingText(this.scene, {
			text: data.text || '',
			x: 0,
			y: 0,
			color: data.color || '#fff'
		}, this);
	}

	private getAttributesContainer (): Phaser.GameObjects.Container {
		if (!this.attributesContainer) {
			this.attributesContainer = this.scene.add.container(0,	0);
			this.updateAttributesOffset();
			this.gameObject.add(this.attributesContainer);
		}
		return this.attributesContainer;
	}

	private renderAttributes (data: {
		attrs: AttributeData[]
	}): void {
		console.log('PhaserUnit render-attributes', data); // TODO remove
		// creating attributeContainer on the fly,
		// only for units that have attribute bars
		this.getAttributesContainer();
		const attributes = this.attributes;
		// release all existing attribute bars
		attributes.forEach((a) => {
			PhaserAttributeBar.release(a);
		});
		attributes.length = 0;
		// add attribute bars based on passed data
		data.attrs.forEach((ad) => {
			const a = PhaserAttributeBar.get(this);
			a.render(ad);
			attributes.push(a);
		});
	}

	private updateAttribute (data: {
		attr: AttributeData;
		shouldRender: boolean;
	}): void {
		console.log('PhaserUnit update-attribute', data); // TODO remove
		const attributes = this.attributes;
		let a: PhaserAttributeBar;
		let i = 0;
		for (; i < attributes.length; i++) {
			if (attributes[i].name === data.attr.type) {
				a = attributes[i];
				break;
			}
		}
		if (!data.shouldRender) {
			if (a) {
				PhaserAttributeBar.release(a);
				attributes.splice(i, 1);
			}
			return;
		}
		if (!a) {
			a = PhaserAttributeBar.get(this);
			attributes.push(a);
		}
		a.render(data.attr);
	}

	private renderChat (text): void {
		console.log('create-chat', text); // TODO remove
		if (this.chat) {
			this.chat.showMessage(text);
		} else {
			this.chat = new PhaserChatBubble(this.scene, text, this);
		}
	}

	private scaleElements (height): void {
		const defaultZoom = ige.game.data.settings.camera?.zoom?.default || 1000;
		const targetScale = height / defaultZoom;
		this.scene.tweens.add({
			targets: [this.label, this.attributesContainer, this.chat],
			duration: 1000,
			ease: Phaser.Math.Easing.Quadratic.Out,
			scale: targetScale,
		});
	}

	protected destroy (): void {
		this.scene.tweens.killTweensOf([this.label, this.attributesContainer, this.chat]);

		if (this.chat) {
			this.chat.destroy();
			this.chat = null;
		}
		// release all instantiated attribute bars
		this.attributes.forEach((a) => {
			PhaserAttributeBar.release(a);
		});
		this.attributes.length = 0;
		this.attributesContainer = null;
		this.attributes = null;
		this.label = null;
		this.scene = null;

		super.destroy();
	}
}

