class PhaserRegion extends PhaserEntity {

	name: string;
	private label: Phaser.GameObjects.BitmapText;
	private rtLabel: Phaser.GameObjects.RenderTexture;
	private readonly graphics: Phaser.GameObjects.Graphics;
	gameObject: Phaser.GameObjects.Container & IRenderProps;
	private readonly devModeOnly: boolean;
	private devModeScene: DevModeScene;

	constructor (
		private scene: GameScene,
		entity: Region
	) {
		super(entity);

		const stats = this.entity._stats.default;

		const gameObject = scene.add.container();

		const graphics = scene.add.graphics();
		this.graphics = graphics as Phaser.GameObjects.Graphics & IRenderProps;
		gameObject.add(graphics);
		gameObject.setSize(stats.width, stats.height);
		gameObject.setPosition(stats.x + stats.width/2, stats.y + stats.height/2);
		gameObject.setInteractive();
		gameObject.on('pointerdown', (p) => {
			if (taro.developerMode.active && taro.developerMode.activeTab === 'map' && this.devModeScene.devModeTools.cursorButton.active && p.leftButtonDown()) {
				this.scene.input.setTopOnly(true);
				this.devModeScene.regionEditor.addClickedList({name: this.entity._stats.id, x: stats.x, y: stats.y, width: stats.width, height: stats.height});
			}
		});
		gameObject.on('pointerup', (p) => {
			if (taro.developerMode.active && taro.developerMode.activeTab === 'map' && this.devModeScene.devModeTools.cursorButton.active 
            && p.leftButtonReleased() && this.devModeScene.regionEditor.clickedList.length > 0) {
				this.scene.input.setTopOnly(false);
				this.devModeScene.regionEditor.showClickedList();
			}
		});

		this.gameObject = gameObject as Phaser.GameObjects.Container & IRenderProps;
		//scene.renderedEntities.push(this.gameObject);
		scene.entityLayers[EntityLayer.TREES].add(this.gameObject);

		this.name = this.entity._stats.id;

		if (!stats.inside) {
			this.devModeOnly = true;
		}

		const devModeScene = this.devModeScene = taro.renderer.scene.getScene('DevMode') as DevModeScene;
		devModeScene.regions.push(this);

		this.updateLabel();
		this.transform();

        if (this.devModeOnly && !taro.developerMode.active && taro.developerMode.activeTab !== 'play') {
			this.hide();
        }
	}

	private getLabel (): Phaser.GameObjects.BitmapText {
		if (!this.label) {
			const scene = this.scene;
			const label = this.label = scene.add.bitmapText(0, 0,
				BitmapFontManager.font(scene,
					'Verdana', false,
					taro.game.data.settings
						.addStrokeToNameAndAttributes !== false,
					'#FFFFFF'
				),
				'cccccc',
				16
			);
			label.letterSpacing = 1.3;
			label.visible = false;

			// needs to be created with the correct scale of the client
			label.setScale(1.3);
			label.setOrigin(0);

			this.gameObject.add(label);

			if (scene.renderer.type === Phaser.CANVAS) {
				const rt = this.rtLabel = scene.add.renderTexture(0, 0);
				rt.visible = false;
				rt.setScale(label.scale);
				rt.setOrigin(0);

				this.gameObject.add(rt);
			}
		}
		return this.label;
	}

	updateLabel (): void {
		const label = this.getLabel();
		const rt = this.rtLabel;

		label.visible = !rt;
		label.setText(BitmapFontManager.sanitize(
			label.fontData, this.name || ''
		));

		const stats = this.entity._stats.default;
		label.setPosition(5 - stats.width/2, 5 - stats.height/2);

		if (rt) {
			const tempScale = label.scale;
			label.setScale(1);

			rt.visible = true;
			rt.resize(label.width, label.height);
			rt.clear();
			rt.draw(label, 0, 0);

			label.setScale(tempScale);

			rt.setPosition(label.x, label.y);
		}
	}

	protected transform (): void {
		const gameObject =  this.gameObject;
		const graphics = this.graphics;
		const label = this.label;
		const rtLabel = this.rtLabel;
		const stats = this.entity._stats.default;

		gameObject.setSize(stats.width, stats.height);
		gameObject.setPosition(stats.x + stats.width/2, stats.y + stats.height/2);
		graphics.setPosition(-stats.width/2, -stats.height/2);
		label.setPosition(5 - stats.width/2, 5 - stats.height/2);
		if (rtLabel) {
			rtLabel.setPosition(label.x, label.y);
		}

		graphics.clear();

		if (this.devModeOnly) {
			graphics.lineStyle(
				2,
				0x11fa05,
				// between 0 and 1 or we default
				(stats.alpha && stats.alpha >= 0 && stats.alpha <= 1) ? stats.alpha : 1
			);
			graphics.strokeRect(
				0,
				0,
				stats.width,
				stats.height
			);
		} else {
			graphics.fillStyle(
				Number(`0x${stats.inside.substring(1)}`),
				// between 0 and 1 or we default
				(stats.alpha && stats.alpha >= 0 && stats.alpha <= 1) ? stats.alpha : 0.4
			);
			graphics.fillRect(
				0,
				0,
				stats.width,
				stats.height
			);
		}
	}

	show() {
        this.graphics.visible = true;
		super.show();

		const label = this.label;
		const rt = this.rtLabel;

		label && (label.visible = true);
		rt && (rt.visible = true);
	}

	hide() {
		if (this.devModeOnly) {
            this.graphics.visible = false;
			super.hide();
		}
		const label = this.label;
		const rt = this.rtLabel;

		label && (label.visible = false);
		rt && (rt.visible = false);
	}

	protected destroy (): void {
		this.devModeScene.regions = this.devModeScene.regions.filter(item => item !== this);
		this.scene.renderedEntities = this.scene.renderedEntities.filter(item => item !== this.gameObject);
		super.destroy();
	}
}
