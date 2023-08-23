
class DevModeTools extends Phaser.GameObjects.Container {

	public palette: TilePalette;
	public tileEditor: TileEditor;
	public regionEditor: RegionEditor;
	public entityEditor: EntityEditor;
	public gameEditorWidgets: Array<DOMRect>;
	public commandController: CommandController;

	cursorButton: DevToolButton;
	paletteButton: DevToolButton;
	layerButtonsContainer: Phaser.GameObjects.Container;
	layerButtons: DevToolButton[];
	layerHideButtons: DevToolButton[];
	toolButtonsContainer: Phaser.GameObjects.Container;
	modeButtons: DevToolButton[];
	brushButtons: Record<Shape, DevToolButton>;
	brushSize = 1;
	tooltip: DevTooltip;

	COLOR_WHITE: number;
	COLOR_LIGHT: number;
	COLOR_PRIMARY: number;
	COLOR_GRAY: number;

	BUTTON_HEIGHT: number = 30;
	BUTTON_INTERSPACE: number = 4;

	altKey: Phaser.Input.Keyboard.Key;
	shiftKey: Phaser.Input.Keyboard.Key;

	constructor(
		public scene: DevModeScene,
	) {
		super(scene);

		this.commandController = new CommandController({
			'increaseBrushSize': () => {
				this.brushSize = Math.min(this.brushSize + 1, 50);
				this.updateBrushArea();
			}, 'decreaseBrushSize': () => {
				this.brushSize = Math.max(this.brushSize - 1, 1);
				this.updateBrushArea();
			}
		}, this.scene.gameScene.tilemap);

		const palette = this.palette = new TilePalette(this.scene, this.scene.tileset, this.scene.rexUI, this.commandController);
		this.tileEditor = new TileEditor(this.scene.gameScene, this.scene, this, this.commandController);
		this.regionEditor = new RegionEditor(this.scene.gameScene, this.scene, this);
		this.entityEditor = new EntityEditor(this.scene.gameScene, this.scene, this);
		this.gameEditorWidgets = [];

		this.keyBindings();

		this.COLOR_PRIMARY = palette.COLOR_PRIMARY;
		this.COLOR_LIGHT = palette.COLOR_LIGHT;
		this.COLOR_WHITE = palette.COLOR_WHITE;
		this.COLOR_GRAY = palette.COLOR_GRAY;

		const h = this.BUTTON_HEIGHT;
		const s = this.BUTTON_INTERSPACE;

		this.scene.scale.on(Phaser.Scale.Events.RESIZE, () => {
			toolButtonsContainer.height = (h + s) * 13;
			if (toolButtonsContainer.height > window.innerHeight * 0.5) {
				toolButtonsContainer.scale = (window.innerHeight * 0.5) / toolButtonsContainer.height;
			}
			toolButtonsContainer.x = palette.camera.x + palette.paletteWidth - ((h * 4) * toolButtonsContainer.scale) + 22;
			toolButtonsContainer.y = palette.camera.y - (toolButtonsContainer.height * toolButtonsContainer.scale);
		});

		new DevToolButton(this, '+', '+', 'Zoom in (+)', null, 0, -(h + s), h, palette.scrollBarContainer, palette.zoom.bind(palette), -1);
		new DevToolButton(this, '-', '-', 'Zoom out (-)', null, h + s, -(h + s), h, palette.scrollBarContainer, palette.zoom.bind(palette), 1);

		const toolButtonsContainer = this.toolButtonsContainer = new Phaser.GameObjects.Container(scene);
		toolButtonsContainer.height = (h + s) * 13;
		if (toolButtonsContainer.height > window.innerHeight * 0.5) {
			toolButtonsContainer.scale = (window.innerHeight * 0.5) / toolButtonsContainer.height;
		}
		toolButtonsContainer.x = palette.camera.x + palette.paletteWidth - ((h * 4) * toolButtonsContainer.scale) + 22;
		toolButtonsContainer.y = palette.camera.y - (toolButtonsContainer.height * toolButtonsContainer.scale);
		scene.add.existing(toolButtonsContainer);

		this.brushButtons = {
			'rectangle': new DevToolButton(this, 'rectangle', 'rectangle', 'changes the brush shape to rectangle', null, -(h * 4 + 1.5 * s), (h + s) * 1, h * 4 - s, toolButtonsContainer, this.changeShape.bind(this), 'rectangle', [], false),
			'diamond': new DevToolButton(this, 'diamond', 'diamond', 'changes the brush shape to diamond', null, -(h * 4 + 1.5 * s), (h + s) * 2, h * 4 - s, toolButtonsContainer, this.changeShape.bind(this), 'diamond', [], false),
			'circle': new DevToolButton(this, 'circle', 'circle', 'changes the brush shape to circle', null, -(h * 4 + 1.5 * s), (h + s) * 3, h * 4 - s, toolButtonsContainer, this.changeShape.bind(this), 'circle', [], false),
		};
		this.brushButtons['rectangle'].highlight('active');

		this.modeButtons = [];
		this.modeButtons.push(
			new DevToolButton(this, '', 'Cursor Tool (C)', 'interact with regions and entities', 'cursor', 0, 0, h * 2 - s, toolButtonsContainer, this.cursor.bind(this)),
			new DevToolButton(this, '', 'Region Tool (R)', 'draw new region', 'region', 0, (h + s) * 3, h * 2 - s, toolButtonsContainer, this.drawRegion.bind(this)),
			new DevToolButton(this, '', 'Stamp Brush (B)', 'LMB: place selected tiles. RMB: copy tiles', 'stamp', 0, h + s, h * 2 - s, toolButtonsContainer, this.brush.bind(this)/*, undefined, Object.values(this.brushButtons)*/),
			new DevToolButton(this, '', 'Eraser (E)', 'delete tiles from selected layer', 'eraser', h * 2, h + s, h * 2 - s, toolButtonsContainer, this.emptyTile.bind(this)),
			new DevToolButton(this, '', 'Bucket Fill (F)', 'fill an area with the selected tile', 'fill', 0, (h + s) * 2, h * 2 - s, toolButtonsContainer, this.fill.bind(this)),
			new DevToolButton(this, '', 'Clear Layer (L)', 'clear selected layer', 'clear', h * 2, (h + s) * 2, h * 2 - s, toolButtonsContainer, this.clear.bind(this)),
			new DevToolButton(this, '', 'Save Map (S)', 'save all changes', 'save', h * 2, (h + s) * 3, h * 2 - s, toolButtonsContainer, this.save.bind(this)),
			new DevToolButton(this, '', 'Entities Tool (A)', 'LMB: Place selected Entity on the Map', 'entity', h * 2, 0, h * 2 - s, toolButtonsContainer, this.addEntities.bind(this))
		);
		this.cursorButton = this.modeButtons[0];
		this.highlightModeButton(0);

		this.layerButtons = [];
		this.layerButtons.push(
			new DevToolButton(this, 'floor', 'Layer (1)', 'select the Floor layer', null, h + s, (h + s) * 10, h * 2 + 25, toolButtonsContainer, this.switchLayer.bind(this), 0),
			new DevToolButton(this, 'floor2', 'Layer (2)', 'select the Floor 2 layer', null, h + s, (h + s) * 9, h * 2 + 25, toolButtonsContainer, this.switchLayer.bind(this), 1),
			new DevToolButton(this, 'walls', 'Layer (3)', 'select the Walls layer', null, h + s, (h + s) * 8, h * 2 + 25, toolButtonsContainer, this.switchLayer.bind(this), 2),
			new DevToolButton(this, 'trees', 'Layer (4)', 'select the Trees layer', null, h + s, (h + s) * 7, h * 2 + 25, toolButtonsContainer, this.switchLayer.bind(this), 3)
		);
		this.layerButtons[0].highlight('active');
		this.layerButtons[0].increaseSize(true);
		this.layerHideButtons = [];
		this.layerHideButtons.push(
			new DevToolButton(this, '', 'Layer visibility (shift-1)', 'show/hide floor layer', 'eyeopen', 0, (h + s) * 10, h * 2 - 25, toolButtonsContainer, this.hideLayer.bind(this), 0),
			new DevToolButton(this, '', 'Layer visibility (shift-2)', 'show/hide floor 2 layer', 'eyeopen', 0, (h + s) * 9, h * 2 - 25, toolButtonsContainer, this.hideLayer.bind(this), 1),
			new DevToolButton(this, '', 'Layer visibility (shift-3)', 'show/hide walls layer', 'eyeopen', 0, (h + s) * 8, h * 2 - 25, toolButtonsContainer, this.hideLayer.bind(this), 2),
			new DevToolButton(this, '', 'Layer visibility (shift-4)', 'show/hide trees layer', 'eyeopen', 0, (h + s) * 7, h * 2 - 25, toolButtonsContainer, this.hideLayer.bind(this), 3)
		);
		this.layerHideButtons[0].highlight('active');
		this.layerHideButtons[0].increaseSize(true);


		const toolButton = [];
		toolButton.push(
			new DevToolButton(this, 'undo', 'undo', 'undo(ctrl-z)', 'undo', 0, (h + s) * 5, h * 2 - s, toolButtonsContainer, this.commandController.undo.bind(this.commandController)),
			new DevToolButton(this, 'redo', 'redo', 'redo(ctrl-shift-z | ctrl-y', 'redo', h * 2, (h + s) * 5, h * 2 - s, toolButtonsContainer, this.commandController.redo.bind(this.commandController))
		);

		this.paletteButton = new DevToolButton(this, 'palette', 'Palette', 'show/hide palette', null, 0, (h + s) * 12, h * 4, toolButtonsContainer, palette.toggle.bind(palette));

		this.tooltip = new DevTooltip(this.scene);
        this.scene.cameras.getCamera('palette').ignore([this.tooltip, this.toolButtonsContainer]);

		this.palette.hide();
		this.toolButtonsContainer.setVisible(false);
		this.regionEditor.hideRegions();
		this.entityEditor.activatePlacement(false);

		const ctrlKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL, false);

		this.scene.input.on('pointermove', (p) => {
			if (taro.developerMode.active && taro.developerMode.activeTab !== 'play' && scene.tileEditor.startDragIn !== 'palette' && (p.rightButtonDown() || (p.isDown && ctrlKey.isDown))) {
				const camera = this.scene.gameScene.cameras.main;
				const scrollX = (p.x - p.prevPosition.x) / camera.zoom;
				const scrollY = (p.y - p.prevPosition.y) / camera.zoom;
				camera.scrollX -= scrollX;
				camera.scrollY -= scrollY;
			}
		});
	}

	updateBrushArea(): void {
		this.tileEditor.brushArea.size = { x: this.brushSize, y: this.brushSize };
		this.tileEditor.marker.changePreview();
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
		const customModals: any = document.querySelectorAll('.winbox, .modal, .custom-editor-modal, #chat-message-input');
		for (const customModal of customModals) {
			if (customModal.style.display === 'none') {
				continue;
			}
			const inputs = customModal.querySelectorAll('input, select, textarea, button');
			for (let i = 0; i < inputs.length; i++) {
				if (inputs[i] === document.activeElement) {
					return true;
				}
			}
		}

		return false;
	}

	isForceTo1x1(): boolean {
		if (this.modeButtons[4].active) {
			return true;
		}
		return false;
	}

	keyBindings(): void {
		const gameScene = this.scene.gameScene;
		const keyboard = this.scene.input.keyboard;
		const altKey = this.altKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ALT, true);
		const shiftKey = this.shiftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false);
		const tabKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB, false);
		tabKey.on('down', (key) => {
			const isInputModalPresent = this.checkIfInputModalPresent();
			if (!isInputModalPresent) {
				key.originalEvent.preventDefault();
			}

			if (!isInputModalPresent && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				if (this.palette.visible) {
					this.palette.hide();
				} else {
					this.palette.show();
				}
			}
		});
		const plusKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS, false);
		plusKey.on('down', () => {
			if (!this.checkIfInputModalPresent()) {
                this.tileEditor.tilePalette.changeBrushSize(-1);
			}
		});
		const minusKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS, false);
		minusKey.on('down', () => {
			if (!this.checkIfInputModalPresent()) {
                this.tileEditor.tilePalette.changeBrushSize(1);
			}
		});
		const cKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C, false);
		cKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.cursor();
			}
		});
		const rKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R, false);
		rKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.drawRegion();
			}
		});
		const bKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B, false);
		bKey.on('down', (key) => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.brush();
			}
		});
		const eKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
		eKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.emptyTile();
			}
		});
		const fKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F, false);
		fKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.fill();
			}
		});
		const lKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L, false);
		lKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.clear();
			}
		});
		const sKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false);
		sKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.save();
			}
		});
        const aKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false);
		aKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
				this.addEntities();
			}
		});
		const oneKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE, false);
		oneKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map' && !altKey.isDown) {
				if (shiftKey.isDown) {
					this.hideLayer(0);
				} else {
					this.switchLayer(0);
				}
			}
		});
		const twoKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO, false);
		twoKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map' && !altKey.isDown) {
				if (shiftKey.isDown) {
					this.hideLayer(1);
				} else {
					this.switchLayer(1);
				}
			}
		});
		const threeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE, false);
		threeKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map' && !altKey.isDown) {
				if (shiftKey.isDown) {
					this.hideLayer(2);
				} else {
					this.switchLayer(2);
				}
			}
		});
		const fourKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR, false);
		fourKey.on('down', () => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map' && !altKey.isDown) {
				if (shiftKey.isDown) {
					this.hideLayer(3);
				} else {
					this.switchLayer(3);
				}
			}
		});
		const undoKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z, false, true);
		undoKey.on('down', (event) => {
			if (event.ctrlKey) {
				if (event.shiftKey) {
					this.commandController.redo();
				} else {
					this.commandController.undo();
				}
			}
		});
		const redoKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y, false, true);
		redoKey.on('down', (event) => {
			if (event.ctrlKey) {
				this.commandController.redo();
			}
		});

		const deleteEntity = (event) => {
			if (!this.checkIfInputModalPresent() && taro.developerMode.active && taro.developerMode.activeTab === 'map') {
                this.entityEditor.deleteInitEntity();
            }
		}

        const deleteKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE, false);
        const backspaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE, false);

		deleteKey.on('down', deleteEntity);
		backspaceKey.on('down', deleteEntity);
	}

	cursor(): void {
		this.highlightModeButton(0);
		this.scene.regionEditor.regionTool = false;
		this.tileEditor.activateMarkers(false);
		this.entityEditor.activatePlacement(false);
	}

	addEntities(): void {
		this.highlightModeButton(7);
		this.scene.regionEditor.regionTool = false;
		this.tileEditor.activateMarkers(false);
		this.entityEditor.activatePlacement(true);
	}

	drawRegion(): void {
		this.tileEditor.activateMarkers(false);
		this.entityEditor.activatePlacement(false);
		this.highlightModeButton(1);
		this.scene.regionEditor.regionTool = true;
	}

	brush(): void {
		if (this.modeButtons[2].active) {
			return;
		}
		if (this.modeButtons[3].active) {
			this.tileEditor.selectedTileArea = this.tileEditor.lastSelectedTileArea;
		}
		this.tileEditor.activateMarkers(true);
		this.entityEditor.activatePlacement(false);
		this.scene.regionEditor.regionTool = false;
		this.highlightModeButton(2);
		this.tileEditor.marker.changePreview();
	}

	emptyTile(): void {
		if (!this.modeButtons[3].active) {
			this.tileEditor.lastSelectedTileArea = this.tileEditor.selectedTileArea;
			this.tileEditor.selectedTileArea = { 0: { 0: -1 } };
			this.tileEditor.activateMarkers(true);
			this.entityEditor.activatePlacement(false);
			this.scene.regionEditor.regionTool = false;
			this.highlightModeButton(3);
			this.tileEditor.marker.changePreview();
		}
	}

	fill(): void {
		if (this.modeButtons[3].active) {
			this.tileEditor.selectedTileArea = this.tileEditor.lastSelectedTileArea;
		}
		this.tileEditor.activateMarkers(true);
		this.entityEditor.activatePlacement(false);
		this.scene.regionEditor.regionTool = false;
		this.highlightModeButton(4);
		this.tileEditor.marker.changePreview();
	}

	clear(): void {
		const gameMap = this.scene.gameScene.tilemap;
		//this.tileEditor.clearLayer(gameMap.currentLayerIndex, false);
		const data: TileData<'clear'> = {
			clear: {
				layer: gameMap.currentLayerIndex,
				layerName: this.layerButtons[gameMap.currentLayerIndex].name
			}
		};
		inGameEditor.showClearLayerConfirmation(data);
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

	changeShape(shape: Shape): void {
		if (!this.modeButtons[2].active) {
			this.brush();
		}
		this.tileEditor.brushArea.shape = shape;
		this.updateBrushArea();
		Object.values(this.brushButtons).map((btn) => {
			btn.highlight('no');
		});
		this.brushButtons[shape].highlight('active');
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
