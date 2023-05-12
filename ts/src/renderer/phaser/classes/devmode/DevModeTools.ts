class DevModeTools extends Phaser.GameObjects.Container {

	public palette: TilePalette;
	public tileEditor: TileEditor;
	public regionEditor: RegionEditor;
	public gameEditorWidgets: Array<DOMRect>;

	cursorButton: DevToolButton;
	paletteButton: DevToolButton;
	layerButtonsContainer: Phaser.GameObjects.Container;
	layerButtons: DevToolButton[];
	layerHideButtons: DevToolButton[];
	toolButtonsContainer: Phaser.GameObjects.Container;
	modeButtons: DevToolButton[];
	brushButtons: DevToolButton[];
	tooltip: DevTooltip;

	COLOR_WHITE: number;
	COLOR_LIGHT: number;
	COLOR_PRIMARY: number;
	COLOR_GRAY: number;

	BUTTON_HEIGHT: number = 30;
	BUTTON_INTERSPACE: number = 4;
	
	constructor(
		public scene: DevModeScene,
	) {
		super(scene);

		const palette = this.palette = new TilePalette(this.scene, this.scene.tileset, this.scene.rexUI)
		this.tileEditor = new TileEditor(this.scene.gameScene, this.scene, this);
		this.regionEditor = new RegionEditor(this.scene.gameScene, this.scene, this);
		this.gameEditorWidgets = [];

		this.keyBindings();

		this.COLOR_PRIMARY = palette.COLOR_PRIMARY;
		this.COLOR_LIGHT = palette.COLOR_LIGHT;
		this.COLOR_WHITE = palette.COLOR_WHITE;
		this.COLOR_GRAY = palette.COLOR_GRAY;

		const h = this.BUTTON_HEIGHT;
		const s = this.BUTTON_INTERSPACE;

		this.scene.scale.on(Phaser.Scale.Events.RESIZE, () => {
			toolButtonsContainer.height = (h+s) * 13;
			if (toolButtonsContainer.height > this.scene.sys.game.canvas.height * 0.5) {
				toolButtonsContainer.scale = (this.scene.sys.game.canvas.height * 0.5) / toolButtonsContainer.height;
			}
			toolButtonsContainer.x = palette.camera.x + palette.paletteWidth - ((h*4) * toolButtonsContainer.scale) + 22;
			toolButtonsContainer.y = palette.camera.y - (toolButtonsContainer.height * toolButtonsContainer.scale);
		});

		new DevToolButton (this, '+', '+', 'Zoom in (+)', null, 0, -(h+s), h, palette.scrollBarContainer, palette.zoom.bind(palette), -1);
		new DevToolButton (this, '-', '-', 'Zoom out (-)', null, h+s, -(h+s), h, palette.scrollBarContainer, palette.zoom.bind(palette), 1);

		const toolButtonsContainer = this.toolButtonsContainer = new Phaser.GameObjects.Container(scene);
		toolButtonsContainer.height = (h+s) * 13;
		if (toolButtonsContainer.height > this.scene.sys.game.canvas.height * 0.5) {
			toolButtonsContainer.scale = (this.scene.sys.game.canvas.height * 0.5) / toolButtonsContainer.height;
		}
		toolButtonsContainer.x = palette.camera.x + palette.paletteWidth - ((h*4) * toolButtonsContainer.scale) + 22;
		toolButtonsContainer.y = palette.camera.y - (toolButtonsContainer.height * toolButtonsContainer.scale);
		scene.add.existing(toolButtonsContainer);

		this.modeButtons = [];
		this.modeButtons.push (
			new DevToolButton (this, '', 'Cursor Tool (C)', 'interact with regions and entities', 'cursor', 0, 0, h*2 - s, toolButtonsContainer, this.cursor.bind(this)),
			new DevToolButton (this, '', 'Region Tool (R)', 'draw new region', 'region', h*2, 0, h*2 - s, toolButtonsContainer, this.drawRegion.bind(this)),
			new DevToolButton (this, '', 'Stamp Brush (B)', 'LMB: place selected tiles. RMB: copy tiles', 'stamp', 0, h+s, h*2 - s, toolButtonsContainer, this.brush.bind(this)),
			new DevToolButton (this, '', 'Eraser (E)', 'delete tiles from selected layer', 'eraser', h*2, h+s, h*2 - s, toolButtonsContainer, this.emptyTile.bind(this)),
			new DevToolButton (this, '', 'Bucket Fill (F)', 'fill an area with the selected tile', 'fill', 0, (h+s) * 2, h*2 - s, toolButtonsContainer, this.fill.bind(this)),
			new DevToolButton (this, '', 'Clear Layer (L)', 'clear selected layer', 'clear', h*2, (h+s) * 2, h*2 - s, toolButtonsContainer, this.clear.bind(this)),
			new DevToolButton (this, '', 'Save Map (S)', 'save all changes', 'save', 0, (h+s) * 3, h*2 - s, toolButtonsContainer, this.save.bind(this))
		)
		this.cursorButton = this.modeButtons[0];
		this.highlightModeButton(0);

		this.brushButtons = [];
		this.brushButtons.push (
			new DevToolButton (this, '1x1', '1x1', 'changes the brush size to 1x1', null, 0, (h+s) * 5, h*2 - s, toolButtonsContainer, this.selectSingle.bind(this)),
			new DevToolButton (this, '2x2', '2x2', 'changes the brush size to 2x2', null, h*2, (h+s) * 5, h*2 - s, toolButtonsContainer, this.selectArea.bind(this))
		)
		this.brushButtons[0].highlight('active');

		this.layerButtons = [];
		this.layerButtons.push (
			new DevToolButton (this, 'floor', 'Layer (1)', 'select the Floor layer', null, h+s, (h+s) * 10, h*2 + 25, toolButtonsContainer, this.switchLayer.bind(this), 0),
			new DevToolButton (this, 'floor2', 'Layer (2)', 'select the Floor 2 layer', null, h+s, (h+s) * 9, h*2 + 25, toolButtonsContainer, this.switchLayer.bind(this), 1),
			new DevToolButton (this, 'walls', 'Layer (3)', 'select the Walls layer', null, h+s, (h+s) * 8, h*2 + 25, toolButtonsContainer, this.switchLayer.bind(this), 2),
			new DevToolButton (this, 'trees', 'Layer (4)', 'select the Trees layer', null, h+s, (h+s) * 7, h*2 + 25, toolButtonsContainer, this.switchLayer.bind(this), 3)
		)
		this.layerButtons[0].highlight('active');
		this.layerButtons[0].increaseSize(true);
		this.layerHideButtons = [];
		this.layerHideButtons.push (
			new DevToolButton (this, '', 'Layer visibility (shift-1)', 'show/hide floor layer', 'eyeopen', 0, (h+s) * 10, h*2 - 25, toolButtonsContainer, this.hideLayer.bind(this), 0),
			new DevToolButton (this, '', 'Layer visibility (shift-2)', 'show/hide floor 2 layer', 'eyeopen', 0, (h+s) * 9, h*2 - 25, toolButtonsContainer, this.hideLayer.bind(this), 1),
			new DevToolButton (this, '', 'Layer visibility (shift-3)', 'show/hide walls layer', 'eyeopen', 0, (h+s) * 8, h*2 - 25, toolButtonsContainer, this.hideLayer.bind(this), 2),
			new DevToolButton (this, '', 'Layer visibility (shift-4)', 'show/hide trees layer', 'eyeopen', 0, (h+s) * 7, h*2 - 25, toolButtonsContainer, this.hideLayer.bind(this), 3)
		)
		this.layerHideButtons[0].highlight('active');
		this.layerHideButtons[0].increaseSize(true);
		

		this.paletteButton = new DevToolButton (this, 'palette', 'Palette', 'show/hide palette', null, 0, (h+s) * 12, h*4, toolButtonsContainer, palette.toggle.bind(palette));

		this.tooltip = new DevTooltip(this.scene);

		this.palette.hide();
		this.toolButtonsContainer.setVisible(false);
		this.regionEditor.hideRegions();

		const ctrlKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL, false);

		this.scene.input.on('pointermove', (p) => {
			if (taro.developerMode.active && taro.developerMode.activeTab !== 'play' && scene.tileEditor.startDragIn !== 'palette' && (p.rightButtonDown() || (p.isDown && ctrlKey.isDown))) {
				const camera = this.scene.gameScene.cameras.main;
				const scrollX = (p.x - p.prevPosition.x) / camera.zoom
				const scrollY = (p.y - p.prevPosition.y) / camera.zoom;
				camera.scrollX -= scrollX;
				camera.scrollY -= scrollY;
			};
		});
	}

	enterMapTab(): void {
		this.toolButtonsContainer.setVisible(true);
		this.palette.show();
		this.regionEditor.showRegions();
	}

	leaveMapTab(): void {
		this.regionEditor.cancelDrawRegion();
		this.palette.hide();
		this.toolButtonsContainer.setVisible(false);
		this.regionEditor.hideRegions();
	}

	queryWidgets(): void {
		this.gameEditorWidgets = Array.from(document.querySelectorAll<HTMLElement>('.game-editor-widget'))
			.map((widget: HTMLElement) => widget.getBoundingClientRect());
	}

	checkIfInputModalPresent(): boolean {
		const customModals: any = document.querySelectorAll(".winbox, .modal, .custom-editor-modal, #chat-message-input");
		for (const customModal of customModals) {
			if (customModal.style.display === 'none') {
				continue;
			}
			const inputs = customModal.querySelectorAll("input, select, textarea, button");
			for (let i = 0; i < inputs.length; i++) {
				if (inputs[i] === document.activeElement) {
					return true;
				}
			}
		}

		return false;
	}

	keyBindings(): void {
		const gameScene = this.scene.gameScene;
		const keyboard = this.scene.input.keyboard;
		const altKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ALT, false);
		const shiftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false);
		const tabKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB, false);
		tabKey.on('down', (key) => {
			const isInputModalPresent = this.checkIfInputModalPresent();
			if (!isInputModalPresent) {
				key.originalEvent.preventDefault();
			}

			if(!isInputModalPresent && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				if (this.palette.visible) {
					this.palette.hide();
				}
				else {
					this.palette.show()
				}
			}
		});
		const plusKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS, false);
		plusKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				const zoom = (gameScene.zoomSize / 2.15) / 1.1;
				taro.client.emit('zoom', zoom);
			}
		});
		const minusKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS, false);
		minusKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				const zoom =(gameScene.zoomSize / 2.15) * 1.1;
				taro.client.emit('zoom', zoom);
			}
		});
		const cKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C, false);
		cKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.cursor();
			}
		});
		const rKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R, false);
		rKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.drawRegion();
			}
		});
		const bKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B, false);
		bKey.on('down', (key) => {
			
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.brush();
			}
		});
		const eKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
		eKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.emptyTile();
			}
		});
		const fKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F, false);
		fKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.fill();
			}
		});
		const lKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L, false);
		lKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.clear();
			}
		});
		const sKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false);
		sKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.save();
			}
		});
		const oneKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE, false);
		oneKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map' && !altKey.isDown) {
				if (shiftKey.isDown) {
        		    this.hideLayer(0);
        		} else {
					this.switchLayer(0);
				}
			}
		});
		const twoKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO, false);
		twoKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map' && !altKey.isDown) {
				if (shiftKey.isDown) {
        		    this.hideLayer(1);
        		} else {
					this.switchLayer(1);
				}
			}
		});
		const threeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE, false);
		threeKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map' && !altKey.isDown) {
				if (shiftKey.isDown) {
        		    this.hideLayer(2);
        		} else {
					this.switchLayer(2);
				}
			}
		});
		const fourKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR, false);
		fourKey.on('down', () => {
			if(!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map' && !altKey.isDown) {
				if (shiftKey.isDown) {
        		    this.hideLayer(3);
        		} else {
					this.switchLayer(3);
				}
			}
		});
	}

	cursor(): void {
		this.highlightModeButton(0);
		this.scene.regionEditor.regionTool = false;
		this.tileEditor.activateMarkers(false);
	}

	drawRegion(): void {
		this.tileEditor.activateMarkers(false);
		this.highlightModeButton(1);
		this.scene.regionEditor.regionTool = true;
	}

	brush(): void {
		if (this.modeButtons[3].active) {
			this.tileEditor.selectedTile = this.tileEditor.lastSelectedTile;
			this.tileEditor.selectedTileArea = this.tileEditor.lastSelectedTileArea;
		}
		this.tileEditor.activateMarkers(true);
		this.tileEditor.marker.changePreview();
		this.scene.regionEditor.regionTool = false;
		this.highlightModeButton(2);
	}

	emptyTile(): void {
		if (!this.modeButtons[3].active) {
			this.tileEditor.lastSelectedTile = this.tileEditor.selectedTile;
			this.tileEditor.lastSelectedTileArea = this.tileEditor.selectedTileArea
			this.tileEditor.selectedTile = -1;
			this.tileEditor.selectedTileArea = [[-1, -1],[-1, -1]];
			this.tileEditor.activateMarkers(true);
			this.tileEditor.marker.changePreview();
			this.scene.regionEditor.regionTool = false;
			this.highlightModeButton(3);
		}
	}

	fill(): void {
		if (this.modeButtons[3].active) {
			this.tileEditor.selectedTile = this.tileEditor.lastSelectedTile;
			this.tileEditor.selectedTileArea = this.tileEditor.lastSelectedTileArea;
		}
		this.tileEditor.activateMarkers(true);
		this.tileEditor.marker.changePreview();
		this.scene.regionEditor.regionTool = false;
		this.selectSingle();
		this.highlightModeButton(4);
	}

	clear(): void {
		const gameMap = this.scene.gameScene.tilemap;
		//this.tileEditor.clearLayer(gameMap.currentLayerIndex, false);
		inGameEditor.showClearLayerConfirmation({gid: 0, layer: gameMap.currentLayerIndex, layerName: this.layerButtons[gameMap.currentLayerIndex].name, x: 0, y: 0, tool: 'clear'});
	}

	save(): void {
		inGameEditor.saveMap();
	}

	highlightModeButton(n: number): void {
		this.modeButtons.forEach((button, index) => {
			if (index === n) button.highlight('active');
			else button.highlight('no');
		});
	}

	selectSingle(): void {
		this.tileEditor.clearTint();
		this.tileEditor.area = {x: 1, y: 1};
		this.brushButtons[0].highlight('active');
		this.brushButtons[1].highlight('no');
		this.tileEditor.activateMarkers(true);
		this.tileEditor.marker.changePreview();
		this.tileEditor.paletteMarker.changePreview();
		if (!this.modeButtons[3].active) {
			this.brush();
		}
	}

	selectArea(): void {
		this.tileEditor.clearTint();
		this.tileEditor.area = {x: 2, y: 2};
		this.brushButtons[1].highlight('active');
		this.brushButtons[0].highlight('no');
		this.tileEditor.activateMarkers(true);
		this.tileEditor.marker.changePreview();
		this.tileEditor.paletteMarker.changePreview();
		if (!this.modeButtons[3].active) {
			this.brush();
		}
	}

	switchLayer(value: number): void {
		const scene = this.scene as any;
		const gameMap = scene.gameScene.tilemap;
		gameMap.currentLayerIndex = value;
		this.layerButtons.forEach(button => {
			button.highlight('no');
			button.increaseSize(false);
		});
		this.layerHideButtons.forEach(button => {
			button.highlight('no');
			button.increaseSize(false);
		});
		if (this.layerButtons[value] && this.layerHideButtons[value]) {
			this.layerHideButtons[value].image.setTexture('eyeopen');
			this.layerButtons[value].highlight('no');
			this.layerHideButtons[value].highlight('no');
			scene.gameScene.tilemapLayers[value].setVisible(true);

			this.layerButtons[value].highlight('active');
			this.layerButtons[value].increaseSize(true);
			this.layerHideButtons[value].highlight('active');
			this.layerHideButtons[value].increaseSize(true);
		}
	}

	hideLayer(value: number): void {
		const scene = this.scene as any;
		if (scene.gameScene.tilemap.currentLayerIndex === value) {
			this.switchLayer(-1);
			this.tileEditor.marker.graphics.setVisible(false);
		}
		const tilemapLayers = scene.gameScene.tilemapLayers;
		if (this.layerHideButtons[value].image.texture.key === 'eyeopen') {
			this.layerHideButtons[value].image.setTexture('eyeclosed');
			this.layerButtons[value].highlight('hidden');
			this.layerHideButtons[value].highlight('hidden');
			tilemapLayers[value].setVisible(false);
		} else {
			this.layerHideButtons[value].image.setTexture('eyeopen');
			this.layerButtons[value].hidden = false;
			this.layerButtons[value].highlight('no');
			this.layerHideButtons[value].hidden = false;
			this.layerHideButtons[value].highlight('no');
			tilemapLayers[value].setVisible(true);
		}
	}
}
