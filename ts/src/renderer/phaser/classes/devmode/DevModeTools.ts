class DevModeTools extends Phaser.GameObjects.Container {
	public palette: TilePalette;
	public tileEditor: TileEditor;
	public regionEditor: RegionEditor;
	public entityEditor: EntityEditor;
	public gameEditorWidgets: Array<DOMRect>;
	public commandController: CommandController;

	activeButton: string;
	brushSize = 1;

	COLOR_WHITE: number;
	COLOR_LIGHT: number;
	COLOR_PRIMARY: number;
	COLOR_GRAY: number;

	altKey: Phaser.Input.Keyboard.Key;
	shiftKey: Phaser.Input.Keyboard.Key;

	constructor(public scene: DevModeScene) {
		super(scene);

		this.commandController = new CommandController(
			{
				increaseBrushSize: () => {
					this.brushSize = Math.min(this.brushSize + 1, 50);
					this.updateBrushArea();
				},
				decreaseBrushSize: () => {
					this.brushSize = Math.max(this.brushSize - 1, 1);
					this.updateBrushArea();
				},
			},
			this.scene.gameScene.tilemap
		);

		const palette = (this.palette = new TilePalette(
			this.scene,
			this.scene.tileset,
			this.scene.rexUI,
			this.commandController
		));
		this.tileEditor = new TileEditor(this.scene.gameScene, this.scene, this, this.commandController);
		this.regionEditor = new RegionEditor(this.scene.gameScene, this.scene, this);
		this.entityEditor = new EntityEditor(this.scene.gameScene, this.scene, this);
		this.gameEditorWidgets = [];

		this.keyBindings();

		this.COLOR_PRIMARY = palette.COLOR_PRIMARY;
		this.COLOR_LIGHT = palette.COLOR_LIGHT;
		this.COLOR_WHITE = palette.COLOR_WHITE;
		this.COLOR_GRAY = palette.COLOR_GRAY;

		taro.client.on('palette-zoom', (value) => {
			palette.zoom(value);
		});

		taro.client.on('change-shape', (value) => {
			this.changeShape(value);
		});

		this.activeButton = 'cursor';
		taro.client.on('cursor', () => {
			this.cursor();
			this.activeButton = 'cursor';
		});
		taro.client.on('draw-region', () => {
			this.drawRegion();
			this.activeButton = 'draw-region';
		});
		taro.client.on('brush', () => {
			this.brush();
			this.activeButton = 'brush';
		});
		taro.client.on('empty-tile', () => {
			this.emptyTile();
			this.activeButton = 'eraser';
		});
		taro.client.on('fill', () => {
			this.fill();
			this.activeButton = 'fill';
		});
		taro.client.on('clear', () => {
			this.clear();
		});
		taro.client.on('save', () => {
			this.save();
		});
		taro.client.on('add-entities', () => {
			this.addEntities();
			this.activeButton = 'add-entities';
		});
		taro.client.on('undo', () => {
			this.commandController.undo();
		});
		taro.client.on('redo', () => {
			this.commandController.redo();
		});

		taro.client.on('decrease-brush-size', () => {
			this.commandController.defaultCommands.decreaseBrushSize();
		});
		taro.client.on('current-brush-size', () => {});
		taro.client.on('increase-brush-size', () => {
			this.commandController.defaultCommands.increaseBrushSize();
		});

		taro.client.on('switch-layer', (value) => {
			this.switchLayer(value);
		});
		taro.client.on('hide-layer', (data) => {
			this.hideLayer(data.index, data.state);
		});

		taro.client.on('palette-toggle', () => {
			palette.toggle();
		});
		taro.client.on('setting', () => {
			this.settings();
		});

		this.palette.hide();
		this.regionEditor.hideRegions();
		this.entityEditor.activatePlacement(false);

		const ctrlKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL, false);

		this.scene.input.on('pointermove', (p) => {
			if (
				taro.developerMode.active &&
				taro.developerMode.activeTab !== 'play' &&
				scene.tileEditor.startDragIn !== 'palette' &&
				(p.rightButtonDown() || (p.isDown && ctrlKey.isDown))
			) {
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
		this.palette.show();
		this.regionEditor.showRegions();
	}

	leaveMapTab(): void {
		this.regionEditor.cancelDrawRegion();
		this.palette.hide();
		this.regionEditor.hideRegions();
		this.showAllLayers();
	}

	queryWidgets(): void {
		this.gameEditorWidgets = Array.from(document.querySelectorAll<HTMLElement>('.game-editor-widget')).map(
			(widget: HTMLElement) => widget.getBoundingClientRect()
		);
	}

	isForceTo1x1(): boolean {
		if (this.activeButton === 'fill') {
			return true;
		}
		return false;
	}

	keyBindings(): void {
		const keyboard = this.scene.input.keyboard;
		const altKey = (this.altKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ALT, true));
		const shiftKey = (this.shiftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false));
		const deleteEntity = (event) => {
			if (
				!taro.developerMode.checkIfInputModalPresent() &&
				taro.developerMode.active &&
				taro.developerMode.activeTab === 'map'
			) {
				this.entityEditor.deleteInitEntity();
			}
		};

		const deleteKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE, false);
		const backspaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE, false);

		deleteKey.on('down', deleteEntity);
		backspaceKey.on('down', deleteEntity);
	}

	cursor(): void {
		this.scene.regionEditor.regionTool = false;
		this.tileEditor.activateMarkers(false);
		this.entityEditor.activatePlacement(false);
	}

	addEntities(): void {
		this.scene.regionEditor.regionTool = false;
		this.tileEditor.activateMarkers(false);
		this.entityEditor.activatePlacement(true);
	}

	drawRegion(): void {
		this.tileEditor.activateMarkers(false);
		this.entityEditor.activatePlacement(false);
		this.scene.regionEditor.regionTool = true;
	}

	brush(): void {
		if (this.activeButton === 'brush') {
			return;
		}
		if (this.activeButton === 'eraser') {
			this.tileEditor.selectedTileArea = this.tileEditor.lastSelectedTileArea;
		}
		this.tileEditor.activateMarkers(true);
		this.entityEditor.activatePlacement(false);
		this.scene.regionEditor.regionTool = false;
		this.tileEditor.marker.changePreview();
	}

	emptyTile(): void {
		if (this.activeButton !== 'eraser') {
			this.tileEditor.lastSelectedTileArea = this.tileEditor.selectedTileArea;
			this.tileEditor.selectedTileArea = { 0: { 0: -1 } };
			this.tileEditor.activateMarkers(true);
			this.entityEditor.activatePlacement(false);
			this.scene.regionEditor.regionTool = false;
			this.tileEditor.marker.changePreview();
		}
	}

	fill(): void {
		if (this.activeButton === 'eraser') {
			this.tileEditor.selectedTileArea = this.tileEditor.lastSelectedTileArea;
		}
		this.tileEditor.activateMarkers(true);
		this.entityEditor.activatePlacement(false);
		this.scene.regionEditor.regionTool = false;
		this.tileEditor.marker.changePreview();
	}

	clear(): void {
		const gameMap = this.scene.gameScene.tilemap;
		const data: TileData<'clear'> = {
			clear: {
				layer: gameMap.currentLayerIndex,
				layerName: taro.game.data.map.layers[gameMap.currentLayerIndex].name,
			},
		};
		inGameEditor.showClearLayerConfirmation(data);
	}

	save(): void {
		inGameEditor.saveMap();
	}

	settings(): void {
		inGameEditor.openMapConfiguration();
	}

	changeShape(shape: Shape): void {
		if (this.activeButton !== 'brush') {
			this.brush();
		}
		this.tileEditor.brushArea.shape = shape;
		this.updateBrushArea();
	}

	switchLayer(value: number): void {
		const scene = this.scene as any;
		const gameMap = scene.gameScene.tilemap;
		if (!scene.gameScene.tilemapLayers[value]) return;
		gameMap.currentLayerIndex = value;
		scene.gameScene.tilemapLayers[value].setVisible(true);
	}

	hideLayer(value: number, state: boolean): void {
		const scene = this.scene as any;
		if (!scene.gameScene.tilemapLayers[value]) return;
		if (scene.gameScene.tilemap.currentLayerIndex === value) {
			this.switchLayer(-1);
			this.tileEditor.marker.graphics.setVisible(false);
		}
		const tilemapLayers = scene.gameScene.tilemapLayers;
		tilemapLayers[value].setVisible(!state);
	}

	showAllLayers(): void {
		const scene = this.scene as any;
		const tilemapLayers = scene.gameScene.tilemapLayers;
		for (let i = 0; i < tilemapLayers.length; i++) {
			if (tilemapLayers[i].visible === false) {
				this.hideLayer(i, false);
			}
		}
	}
}
