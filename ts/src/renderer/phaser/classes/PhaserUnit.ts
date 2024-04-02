class PhaserUnit extends PhaserAnimatedEntity {
	sprite: Phaser.GameObjects.Sprite & IRenderProps;
	//label: Phaser.GameObjects.BitmapText;
	//private rtLabel: Phaser.GameObjects.RenderTexture;
	private chat: PhaserChatBubble;
	label: Phaser.GameObjects.Text;

	gameObject: Phaser.GameObjects.Container & IRenderProps;
	debugGameObject: Phaser.GameObjects.Rectangle & IRenderProps;
	debugGameObjectBlue: Phaser.GameObjects.Rectangle & IRenderProps;
	debugGameObjectRed: Phaser.GameObjects.Rectangle & IRenderProps;
	attributes: PhaserAttributeBar[] = [];
	attributesContainer: Phaser.GameObjects.Container;

	private zoomEvtListener: EvtListener;
	private scaleTween: Phaser.Tweens.Tween;

	constructor(scene: GameScene, entity: Unit) {
		super(scene, entity, `unit/${entity._stats.cellSheet.url}`);

		const translate = entity._translate;
		const gameObject = scene.add.container(translate.x, translate.y, [this.sprite]);

		this.gameObject = gameObject as Phaser.GameObjects.Container & IRenderProps;

		this.updateGameObjectSize();
		// this is hbz-index logic but could be useful for other container operations
		this.gameObject.spriteHeight2 = this.sprite.displayHeight / 2;

		Object.assign(this.evtListeners, {
			follow: entity.on('follow', this.follow, this),
			'update-texture': entity.on('update-texture', this.updateTexture, this),
			'update-label': entity.on('update-label', this.updateLabel, this),
			'show-label': entity.on('show-label', this.showLabel, this),
			'hide-label': entity.on('hide-label', this.hideLabel, this),
			'fading-text': entity.on('fading-text', this.fadingText, this),
			'render-attributes': entity.on('render-attributes', this.renderAttributes, this),
			'update-attribute': entity.on('update-attribute', this.updateAttribute, this),
			'render-chat-bubble': entity.on('render-chat-bubble', this.renderChat, this),
			'transform-debug': entity.on('transform-debug', this.transformDebug, this),
		});

		this.scene.unitsList.push(this);

		this.scene.renderedEntities.push(this.gameObject);
		this.zoomEvtListener = taro.client.on('scale', this.scaleElements, this);

		this.sprite.setInteractive();
		this.sprite.on('pointerdown', (p) => {
			if (
				taro.game.data.defaultData.contextMenuEnabled &&
				(!taro.developerMode.active || (taro.developerMode.active && taro.developerMode.activeTab === 'play')) &&
				p.rightButtonDown()
			) {
				const ownerPlayer = taro.$(this.entity._stats.ownerId);
				if (ownerPlayer._stats.controlledBy === 'human') {
					if (typeof showUserDropdown !== 'undefined') {
						showUserDropdown({ ownerId: this.entity._stats.ownerId, unitId: this.entity.id(), pointer: p });
					}
				}
			}
		});
	}

	protected updateTexture(data) {
		if (data === 'basic_texture_change') {
			this.sprite.anims.stop();
			this.key = `unit/${this.entity._stats.cellSheet.url}`;
			if (!this.scene.textures.exists(this.key)) {
				this.scene.loadEntity(this.key, this.entity._stats);
				this.scene.load.on(
					`filecomplete-image-${this.key}`,
					function cnsl() {
						if (this && this.sprite) {
							this.setTexture(this.key);
							this.sprite.texture.setFilter(this.scene.filter);
							const bounds = this.entity._bounds2d;
							this.sprite.setDisplaySize(bounds.x, bounds.y);
						}
					},
					this
				);
				this.scene.load.start();
			} else {
				this.setTexture(this.key);
				const bounds = this.entity._bounds2d;
				this.sprite.setDisplaySize(bounds.x, bounds.y);
			}

			// GameScene's load entity doesn't create sprite sheets so we have horrible
			// errors when we try to create animations
			if (this.sprite.texture.frameTotal === 1 || this.sprite.texture.key === 'pack-result') {
				return;
			}

			for (let animationsKey in this.entity._stats.animations) {
				const animation = this.entity._stats.animations[animationsKey];
				const frames = animation.frames;
				const animationFrames: number[] = [];

				for (let i = 0; i < frames.length; i++) {
					// correction for 0-based indexing
					animationFrames.push(frames[i] - 1);
				}

				if (animationFrames.length === 0) {
					// avoid crash by giving it frame 0 if no frame data provided
					animationFrames.push(0);
				}
				const anims = this.scene.anims;
				if (anims.exists(`${this.key}/${animationsKey}`)) {
					anims.remove(`${this.key}/${animationsKey}`);
				}

				anims.create({
					key: `${this.key}/${animationsKey}`,
					frames: anims.generateFrameNumbers(this.key, {
						frames: animationFrames,
					}),
					frameRate: animation.framesPerSecond || 15,
					repeat: animation.loopCount - 1, // correction for loop/repeat values
				});
			}
		} else if (data === 'using_skin') {
			this.sprite.anims.stop();
			this.key = `unit/${this.entity._stats.cellSheet.url}`;
			if (!this.scene.textures.exists(this.key)) {
				this.scene.loadEntity(this.key, this.entity._stats);
				this.scene.load.on(
					`filecomplete-image-${this.key}`,
					function cnsl() {
						if (this && this.sprite) {
							this.setTexture(this.key);
							this.sprite.texture.setFilter(this.scene.filter);
							const bounds = this.entity._bounds2d;
							this.sprite.setDisplaySize(bounds.x, bounds.y);
						}
					},
					this
				);
				this.scene.load.start();
			} else {
				this.setTexture(this.key);
				const bounds = this.entity._bounds2d;
				this.sprite.setDisplaySize(bounds.x, bounds.y);
			}
		} else {
			this.key = `unit/${this.entity._stats.cellSheet.url}`;
			this.setTexture(this.key);
			const bounds = this.entity._bounds2d;
			this.sprite.setDisplaySize(bounds.x, bounds.y);
		}
	}

	protected depth(value: number): void {
		const scene = this.gameObject.scene as GameScene;
		this.gameObject.taroDepth = value;

		if (scene.heightRenderer) {
			scene.heightRenderer.adjustDepth(this.gameObject);
		} else {
			this.gameObject.setDepth(value);
		}
	}

	protected transform(data: { x: number; y: number; rotation: number }): void {
		super.transform(data);
		if (this.chat) {
			this.chat.updatePosition();
		}
	}

	protected size(data: { width: number; height: number }): void {
		super.size(data);

		if (data.height) {
			this.gameObject.spriteHeight2 = this.sprite.displayHeight / 2;
		}

		const containerSize = Math.max(this.sprite.displayHeight, this.sprite.displayWidth);
		this.gameObject.setSize(containerSize, containerSize);
		if (this.label) {
			this.updateLabelOffset();
		}
		if (this.attributesContainer) {
			this.updateAttributesOffset();
		}
		this.updateGameObjectSize();
	}

	private updateLabelOffset(): void {
		if (this.label) {
			const { displayHeight, displayWidth } = this.sprite;
			const labelHeight = this.label.getBounds().height;
			this.label.y = -displayHeight / 2 - labelHeight * 1.5;
			/*if (this.rtLabel) {
				this.rtLabel.y = this.label.y;
			}*/
		}
		this.updateGameObjectSize();
	}

	private updateAttributesOffset(): void {
		const { displayHeight, displayWidth } = this.sprite;
		this.attributesContainer.y =
			(this.attributesContainer.height * this.attributesContainer.scaleX) / 2 +
			16 * this.attributesContainer.scaleX +
			displayHeight / 2;
		this.updateGameObjectSize();
	}

	public updateGameObjectSize(): void {
		const containerSize = Math.max(this.sprite.displayHeight, this.sprite.displayWidth);
		let height = containerSize;
		if (this.attributesContainer) {
			height += this.attributesContainer.height;
			height += this.attributesContainer.y;
		}
		if (this.label) {
			height += this.label.height;
			height -= this.label.y;
		}
		this.gameObject.setSize(containerSize, containerSize + height);
	}

	private follow(): void {
		const camera = this.scene.cameras.main as Phaser.Cameras.Scene2D.Camera & {
			_follow: Phaser.GameObjects.GameObject;
		};
		if (camera._follow === this.gameObject) {
			return;
		}
		this.scene.cameraTarget = this.gameObject;
		if (!taro.developerMode.active || taro.developerMode.activeTab === 'play') {
			let trackingDelay = taro?.game?.data?.settings?.camera?.trackingDelay || 3;
			trackingDelay = trackingDelay / taro.fps();
			camera.startFollow(this.gameObject, true, trackingDelay, trackingDelay);
		}
	}

	private getLabel(): Phaser.GameObjects.Text {
		if (!this.label) {
			const scene = this.scene;
			/*const label = this.label = scene.add.bitmapText(0, 0,
				BitmapFontManager.font(scene, // default font
					'Verdana', false, false, '#FFFFFF'
				),
				'cccccc',
				16
			);
			label.letterSpacing = 1.3;

			// needs to be created with the correct scale of the client
			label.setScale(1 / scene.cameras.main.zoom);*/

			const label = (this.label = scene.add.text(0, 0, 'cccccc'));

			// needs to be created with the correct scale of the client
			this.label.setScale(1 / scene.cameras.main.zoom);

			label.setOrigin(0.5);

			this.gameObject.add(label);

			/*if (scene.renderer.type === Phaser.CANVAS) {
				const rt = this.rtLabel = scene.add.renderTexture(0, 0);
				rt.setScale(label.scale);
				rt.setOrigin(0.5);

				this.gameObject.add(rt);
			}*/
		}
		return this.label;
	}

	private updateLabel(data: { text?: string; bold?: boolean; color?: string }): void {
		const label = this.getLabel();

		//const rt = this.rtLabel;

		//label.visible = !rt;

		/*label.setFont(BitmapFontManager.font(this.scene,
			'Verdana', data.bold,
			taro.game.data.settings
				.addStrokeToNameAndAttributes !== false,
			data.color || '#FFFFFF'
		));
		label.setText(BitmapFontManager.sanitize(
			label.fontData, data.text || ''
		));*/
		label.visible = true;

		label.setFontFamily('Verdana');
		label.setFontSize(16);
		label.setFontStyle(data.bold ? 'bold' : 'normal');

		label.setFill(`${data.color}` || '#fff');
		if (this.scene.renderer.type !== Phaser.CANVAS) label.setResolution(4);

		const strokeThickness = taro.game.data.settings.addStrokeToNameAndAttributes !== false ? 4 : 0;
		label.setStroke('#000', strokeThickness);
		label.setText(data.text || '');

		/*if (rt) {
			const tempScale = label.scale;
			label.setScale(1);

			rt.visible = true;
			rt.resize(label.width, label.height);
			rt.clear();
			rt.draw(label, label.width/2, label.height/2);

			label.setScale(tempScale);
		}*/

		this.updateLabelOffset();
		this.updateGameObjectSize();
	}

	private showLabel(): void {
		/*const label = this.getLabel();
		const rt = this.rtLabel;

		label.visible = !rt;
		rt && (rt.visible = true);*/
		this.getLabel().visible = true;
	}

	private hideLabel(): void {
		/*const label = this.getLabel();
		const rt = this.rtLabel;

		label.visible = false;
		rt && (rt.visible = false);*/
		this.getLabel().visible = false;
	}

	private fadingText(data: { text: string; color?: string }): void {
		const offset = -25 - Math.max(this.sprite.displayHeight, this.sprite.displayWidth) / 2;
		const fadingText = new PhaserFloatingText(this.scene, {
			text: data.text || '',
			x: 0,
			y: offset,
			color: data.color || '#fff',
		});
		this.gameObject.add(fadingText);
	}

	private getAttributesContainer(): Phaser.GameObjects.Container {
		if (!this.attributesContainer) {
			this.attributesContainer = this.scene.add.container(0, 0);

			// needs to be created with the correct scale of the client
			this.attributesContainer.setScale(1 / this.scene.cameras.main.zoom);
			this.updateAttributesOffset();

			this.gameObject.add(this.attributesContainer);
		}
		return this.attributesContainer;
	}

	private renderAttributes(data: { attrs: AttributeData[] }): void {
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

	private updateAttribute(data: { attr: AttributeData; shouldRender: boolean }): void {
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

	private renderChat(text: string): void {
		if (this.chat) {
			this.chat.showMessage(text);
		} else {
			this.chat = new PhaserChatBubble(this.scene, text, this);
		}
	}

	private scaleElements(data: { ratio: number }): void {
		if (this.scaleTween) {
			this.scaleTween.stop();
			this.scaleTween = null;
		}

		const { ratio } = data;
		const targetScale = 1 / ratio;

		let targets: Phaser.GameObjects.GameObject[] = [];

		if (this.chat) {
			targets.push(this.chat);
		}

		if (this.attributesContainer) {
			targets.push(this.attributesContainer);
		}

		if (this.label) {
			targets.push(this.label);
			/*if (this.rtLabel) {
				targets.push(this.rtLabel);
			}*/
		}

		this.scaleTween = this.scene.tweens.add({
			targets: targets,
			duration: 1000,
			ease: Phaser.Math.Easing.Quadratic.Out,
			scale: targetScale,
			onComplete: () => {
				this.updateLabelOffset();
				this.updateAttributesOffset();
				this.scaleTween = null;
			},
		});
	}

	protected transformDebug(data: { debug: string; x: number; y: number; rotation: number }): void {
		if (data.debug === 'green-square') {
			if (!this.debugGameObject) {
				const bounds = this.entity._bounds2d;
				this.debugGameObject = this.scene.add.rectangle(0, 0, bounds.x, bounds.y) as Phaser.GameObjects.Rectangle &
					IRenderProps;
				this.debugGameObject.setStrokeStyle(2, 0x008000);
			}
			this.debugGameObject.setPosition(data.x, data.y);
			this.debugGameObject.rotation = data.rotation;
		} else if (data.debug === 'blue-square') {
			if (!this.debugGameObjectBlue) {
				const bounds = this.entity._bounds2d;
				this.debugGameObjectBlue = this.scene.add.rectangle(0, 0, bounds.x, bounds.y) as Phaser.GameObjects.Rectangle &
					IRenderProps;
				this.debugGameObjectBlue.setStrokeStyle(2, 0x0000ff);
			}
			this.debugGameObjectBlue.setPosition(data.x, data.y);
			this.debugGameObjectBlue.rotation = data.rotation;
		} else if (data.debug === 'red-square') {
			if (!this.debugGameObjectRed) {
				const bounds = this.entity._bounds2d;
				this.debugGameObjectRed = this.scene.add.rectangle(0, 0, bounds.x, bounds.y) as Phaser.GameObjects.Rectangle &
					IRenderProps;
				this.debugGameObjectRed.setStrokeStyle(2, 0xff0000);
			}
			this.debugGameObjectRed.setPosition(data.x, data.y);
			this.debugGameObjectRed.rotation = data.rotation;
		}
	}

	protected destroy(): void {
		this.scene.renderedEntities = this.scene.renderedEntities.filter((item) => item !== this.gameObject);
		this.scene.unitsList = this.scene.unitsList.filter((item) => item.entity.id() !== this.entity.id());
		taro.client.off('scale', this.zoomEvtListener);
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
		//this.rtLabel = null;
		this.scene = null;

		super.destroy();
	}
}
