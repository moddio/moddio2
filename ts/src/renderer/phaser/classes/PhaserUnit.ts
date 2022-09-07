class PhaserUnit extends PhaserAnimatedEntity {

	sprite: Phaser.GameObjects.Sprite & Hidden;
	label: Phaser.GameObjects.Text;
	private chat: PhaserChatBubble;

	gameObject: Phaser.GameObjects.Container & Hidden;
	attributes: PhaserAttributeBar[] = [];
	attributesContainer: Phaser.GameObjects.Container;

	private zoomEvtListener: EvtListener;
	private scaleTween: Phaser.Tweens.Tween;

	constructor (
		scene: GameScene,
		entity: Unit
	) {
		super(scene, entity, `unit/${entity._stats.type}`);

		const translate = entity._translate;
		const gameObject = scene.add.container(
			translate.x,
			translate.y,
			[ this.sprite ]
		);
		this.gameObject = gameObject as Phaser.GameObjects.Container & Hidden;
		const containerSize = Math.max(this.sprite.displayHeight, this.sprite.displayWidth);
		gameObject.setSize(containerSize, containerSize);
		this.scene.renderedEntities.push(this.gameObject);

		Object.assign(this.evtListeners, {
			flip: entity.on('flip', this.flip, this),
			follow: entity.on('follow', this.follow, this),
			'update-texture': entity.on('update-texture', this.updateTexture, this),
			'update-label': entity.on('update-label', this.updateLabel, this),
			'show-label': entity.on('show-label', this.showLabel, this),
			'hide-label': entity.on('hide-label', this.hideLabel, this),
			'fading-text': entity.on('fading-text', this.fadingText, this),
			'render-attributes': entity.on('render-attributes', this.renderAttributes, this),
			'update-attribute': entity.on('update-attribute', this.updateAttribute, this),
			'render-chat-bubble': entity.on('render-chat-bubble', this.renderChat, this),
		});

		this.zoomEvtListener = ige.client.on('zoom', this.scaleElements, this);
	}

	protected updateTexture (usingSkin) {
		if (usingSkin) {
			this.sprite.anims.stop();
			this.key = `unit/${this.entity._stats.cellSheet.url}`;
			if (!this.scene.textures.exists(`unit/${this.entity._stats.cellSheet.url}`)) {
				this.scene.loadEntity(`unit/${this.entity._stats.cellSheet.url}`, this.entity._stats, true);
				this.scene.load.on(`filecomplete-image-${this.key}`, function cnsl() {
					if (this && this.sprite) {
						this.sprite.setTexture(`unit/${this.entity._stats.cellSheet.url}`);
						this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
						const bounds = this.entity._bounds2d;
						this.sprite.setDisplaySize(bounds.x, bounds.y);
					}
				}, this);
				this.scene.load.start();
			}
			else {
				this.sprite.setTexture(`unit/${this.entity._stats.cellSheet.url}`);
				const bounds = this.entity._bounds2d;
				this.sprite.setDisplaySize(bounds.x, bounds.y);
			}
		}
		else {
			this.key = `unit/${this.entity._stats.type}`;
			this.sprite.setTexture(`unit/${this.entity._stats.type}`);
			const bounds = this.entity._bounds2d;
			this.sprite.setDisplaySize(bounds.x, bounds.y);
		}
	}

	protected transform (data: {
		x: number;
		y: number;
		rotation: number
	}): void {
		super.transform(data);
		if (this.chat) {
			this.chat.updatePosition();
		}
		this.flip(this.entity._stats.flip);
	}

	protected size (data: {
		width: number,
		height: number
	}): void {
		super.size(data);
		const containerSize = Math.max(this.sprite.displayHeight, this.sprite.displayWidth);
		this.gameObject.setSize(containerSize, containerSize);
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
		const label = this.getLabel();
		label.visible = true;

		label.setFontFamily('Verdana');
		label.setFontSize(16);
		label.setFontStyle(data.bold ? 'bold' : 'normal');
		label.setFill(data.color || '#fff');
		label.setResolution(4);

		const strokeThickness = ige.game.data.settings
			.addStrokeToNameAndAttributes !== false ? 4 : 0;
		label.setStroke('#000', strokeThickness);
		label.setText(data.text || '');
		this.updateLabelOffset();
	}

	private showLabel (): void {
		this.getLabel().visible = true;
	}

	private hideLabel (): void {
		this.getLabel().visible = false;
	}

	private fadingText (data: {
		text: string;
		color?: string;
	}): void {
		const offset = -25 - Math.max(this.sprite.displayHeight, this.sprite.displayWidth) / 2;
		new PhaserFloatingText(this.scene, {
			text: data.text || '',
			x: this.gameObject.x,
			y: this.gameObject.y + offset,
			color: data.color || '#fff'
		});
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

	private renderChat (text: string): void {
		if (this.chat) {
			this.chat.showMessage(text);
		} else {
			this.chat = new PhaserChatBubble(this.scene, text, this);
		}
	}

	private scaleElements (height: number): void {
		const defaultZoom = ige.game.data.settings.camera?.zoom?.default || 1000;
		const targetScale = height / defaultZoom;
		this.scaleTween = this.scene.tweens.add({
			targets: [this.label, this.attributesContainer, this.chat],
			duration: 1000,
			ease: Phaser.Math.Easing.Quadratic.Out,
			scale: targetScale,
			onComplete: () => {
				this.scaleTween = null;
			}
		});
	}

	protected destroy (): void {

		this.scene.renderedEntities = this.scene.renderedEntities.filter(item => item !== this.gameObject);
		ige.client.off('zoom', this.zoomEvtListener);
		this.zoomEvtListener = null;

		if (this.scaleTween) {
			this.scaleTween.stop();
			this.scaleTween = null;
		}

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

