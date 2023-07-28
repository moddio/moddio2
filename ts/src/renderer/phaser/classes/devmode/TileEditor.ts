class TileEditor {
	tilePalette: TilePalette;

	marker: TileMarker;
	paletteMarker: TileMarker;

	paletteArea: Vector2D;
	brushArea: TileShape;

	selectedTileArea: Record<number, Record<number, number>>;
	lastSelectedTileArea: Record<number, Record<number, number>>;
	commandController: CommandController;
	startDragIn: string;

    tileSize: number;

	constructor(
		private gameScene: GameScene,
		devModeScene: DevModeScene,
		private devModeTools: DevModeTools,
		commandController: CommandController,
	) {
		const palette = this.tilePalette = this.devModeTools.palette;
		const gameMap = this.gameScene.tilemap;

		this.marker = new TileMarker(this.gameScene, devModeScene, gameMap, false, 2, commandController);
		this.paletteMarker = new TileMarker(this.devModeTools.scene, devModeScene, this.tilePalette.map, true, 1, commandController);
		this.commandController = commandController;
		this.paletteArea = { x: 1, y: 1 };
		this.brushArea = new TileShape();
		this.selectedTileArea = {};

		const pointerPosition = { x: 0, y: 0 };

		this.activateMarkers(false);

		this.startDragIn = 'none';

        this.tileSize = Constants.TILE_SIZE;
		if (taro.game.data.defaultData.dontResize) {
			this.tileSize = gameMap.tileWidth;
		}

		gameScene.input.on('pointerdown', (p) => {
			if (!devModeScene.pointerInsideButtons) {
				this.devModeTools.modeButtons.map((btn) => {
					btn.hideHoverChildren(0);
				});
			}

			if (!devModeScene.pointerInsideButtons &&
				!devModeScene.pointerInsideWidgets() &&
				(!palette.visible || !devModeScene.pointerInsidePalette()) &&
				this.gameScene.tilemap.currentLayerIndex >= 0 &&
				devModeScene.input.manager.activePointer.rightButtonDown()) {
				this.startDragIn = 'map';
				pointerPosition.x = gameScene.input.activePointer.x;
				pointerPosition.y = gameScene.input.activePointer.y;
			}
		});

		devModeScene.input.on('pointerdown', (p) => {
			if (!devModeScene.pointerInsideButtons) {
				this.devModeTools.modeButtons.map((btn) => {
					btn.hideHoverChildren(0);
				});
			}
			if (!devModeScene.pointerInsideButtons &&
				!devModeScene.pointerInsideWidgets() &&
				palette.visible && devModeScene.pointerInsidePalette()) {
				this.startDragIn = 'palette';
				pointerPosition.x = devModeScene.input.activePointer.x;
				pointerPosition.y = devModeScene.input.activePointer.y;
				if (!devModeTools.modeButtons[4].active) this.devModeTools.brush();
				if (this.devModeTools.shiftKey.isDown) {
					//pass
				} else {
					if (p.button === 0) {
						this.selectedTileArea = {};
						this.clearTint();
					}
				}
			}
		});

		devModeScene.input.on('pointermove', (p) => {
			if (devModeTools.modeButtons[2].active && p.isDown && p.button === 0 &&
				this.startDragIn === 'palette') {
				this.updateSelectedTiles(devModeScene);
			}
		});

		devModeScene.input.on('pointerup', (p) => {
			if (this.startDragIn === 'palette' && p.button === 0) {
				this.updateSelectedTiles(devModeScene);
			}
			if (this.startDragIn === 'palette') {
				this.startDragIn = 'none';
			}
		});

		gameScene.input.on('pointerup', (p) => {
			if (this.startDragIn === 'map' &&
				Math.abs(pointerPosition.x - gameScene.input.activePointer.x) < 50 &&
				Math.abs(pointerPosition.y - gameScene.input.activePointer.y) < 50 &&
				!devModeTools.modeButtons[3].active) {
				const worldPoint = gameScene.cameras.main.getWorldPoint(gameScene.input.activePointer.x, gameScene.input.activePointer.y);
				const nowBrushSize = JSON.parse(JSON.stringify(this.brushArea.size));
				if (this.devModeTools.isForceTo1x1()) {
					nowBrushSize.x = 1;
					nowBrushSize.y = 1;
				}
				const pointerTileX = gameMap.worldToTileX(worldPoint.x - (nowBrushSize.x - 1) * this.tileSize / 2, true);
				const pointerTileY = gameMap.worldToTileY(worldPoint.y - (nowBrushSize.y - 1) * this.tileSize / 2, true);
				this.clearTint();
				this.selectedTileArea = {};
				for (let i = 0; i < nowBrushSize.x; i++) {
					for (let j = 0; j < nowBrushSize.y; j++) {
						const tile = this.getTile(pointerTileX + i, pointerTileY + j, gameMap);
						if (!this.selectedTileArea[pointerTileX + i]) {
							this.selectedTileArea[pointerTileX + i] = {};
						}
						this.selectedTileArea[pointerTileX + i][pointerTileY + j] = tile;

					}
				}
				this.marker.changePreview();

			}
			if (this.startDragIn === 'map') {
				this.startDragIn = 'none';
			}
		});
	}

	updateSelectedTiles(devModeScene: DevModeScene) {
		const palettePoint = devModeScene.cameras.getCamera('palette').getWorldPoint(devModeScene.input.activePointer.x, devModeScene.input.activePointer.y);
		const palettePointerTileX = this.tilePalette.map.worldToTileX(palettePoint.x);
		const palettePointerTileY = this.tilePalette.map.worldToTileY(palettePoint.y);
		if (!this.selectedTileArea[palettePointerTileX]) {
			this.selectedTileArea[palettePointerTileX] = {};
		}
		const tile = this.getTile(palettePointerTileX, palettePointerTileY, this.tilePalette.map);
		this.selectedTileArea[palettePointerTileX][palettePointerTileY] = tile;
		this.marker.changePreview();
	}

	activateMarkers(active: boolean): void {
		this.marker.active = active;
		this.paletteMarker.active = active;
		if (active) this.devModeTools.regionEditor.regionTool = false;
	}

	showMarkers(value: boolean): void {
		this.marker.graphics.setVisible(value);
		this.marker.showPreview(value);
		this.paletteMarker.graphics.setVisible(value);
	}


	clearTint(): void {
		this.tilePalette.map.layers[0].data.forEach((tilearray) => {
			tilearray.forEach((tile) => {
				if (tile) tile.tint = 0xffffff;
			});
		});
	}

	edit<T extends MapEditToolEnum>(data: TileData<T>): void {
		if (JSON.stringify(data) === '{}') {
			throw 'receive: {}';
		}
		const map = taro.game.data.map;
		inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
		const width = map.width;
		const { dataType, dataValue } = Object.entries(data).map(([k, v]) => {
			const dataType = k as MapEditToolEnum;
			const dataValue = v as any;
			return { dataType, dataValue };
		})[0];
		let tempLayer = dataValue.layer;
		if (map.layers.length > 4 && dataValue.layer >= 2) {
			tempLayer++;
		}

		switch (dataType) {
			case 'fill': {
				const nowValue = dataValue as TileData<'fill'>['fill'];
				const oldTile = map.layers[tempLayer].data[nowValue.y * width + nowValue.x];
				this.floodFill(nowValue.layer, oldTile, nowValue.gid, nowValue.x, nowValue.y, true, nowValue.limits);
				break;
			}
			case 'edit': {
				//save tile change to taro.game.data.map and taro.map.data
				const nowValue = dataValue as TileData<'edit'>['edit'];
				this.putTiles(nowValue.x, nowValue.y, nowValue.selectedTiles, nowValue.size, nowValue.shape, nowValue.layer, true);
				break;
			}
			case 'clear': {
				const nowValue = dataValue as TileData<'clear'>['clear'];
				this.clearLayer(nowValue.layer);
			}
		}
		if (taro.physics && map.layers[tempLayer].name === 'walls') {
			//if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
			taro.physics.destroyWalls();
			let mapCopy = taro.scaleMap(_.cloneDeep(map));
			taro.tiled.loadJson(mapCopy, function (layerArray, TaroLayersById) {
				taro.physics.staticsFromMap(TaroLayersById.walls);
			});
		}

	}

	/**
	 * put tiles
	 * @param tileX pointerTileX
	 * @param tileY pointerTileY
	 * @param selectedTiles selectedTiles
	 * @param brushSize brush's size
	 * @param layer layer
	 * @param local is not, it will send command to other client
	 */
	putTiles(tileX: number, tileY: number, selectedTiles: Record<number, Record<number, number>>, brushSize: Vector2D, shape: Shape, layer: number, local?: boolean): void {
		const map = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
		const sample = this.brushArea.calcSample(selectedTiles, brushSize, shape, true);
		const taroMap = taro.game.data.map;
		const width = taroMap.width;
		let tempLayer = layer;
		if (taroMap.layers.length > 4 && layer >= 2) {
			tempLayer++;
		}
		if (this.gameScene.tilemapLayers[layer].visible && selectedTiles) {
			for (let x = 0; x < brushSize.x; x++) {
				for (let y = 0; y < brushSize.y; y++) {
					if (sample[x] && sample[x][y] !== undefined && DevModeScene.pointerInsideMap(tileX + x, tileY + y, map)) {
						let index = sample[x][y];
						if (index !== (map.getTileAt(tileX + x, tileY + y, true, layer)).index &&
							!(index === 0 && map.getTileAt(tileX + x, tileY + y, true, layer).index === -1)) {
							if (index === 0) index = -1;
							map.putTileAt(index, tileX + x, tileY + y, false, layer);
							map.getTileAt(tileX + x, tileY + y, true, layer).tint = 0xffffff;
							if (index === -1) index = 0;
							taroMap.layers[tempLayer].data[(tileY + y) * width + tileX + x] = index;
						}
					}
				}
			}
		}
		if (!local) {
			taro.network.send<'edit'>('editTile', {
				edit: {
					size: brushSize,
					layer,
					selectedTiles,
					x: tileX,
					y: tileY,
					shape,
				}
			});
		}

	}

	getTile(tileX: number, tileY: number, map: Phaser.Tilemaps.Tilemap): number {
		if (DevModeScene.pointerInsideMap(tileX, tileY, map)) {
			if (map.getTileAt(tileX, tileY) && map.getTileAt(tileX, tileY).index !== 0) {
				let selectedTile = map.getTileAt(tileX, tileY);
				return selectedTile.index;
			}
		}
		return -1;
	}

	floodFill(layer: number, oldTile: number, newTile: number, x: number, y: number, fromServer: boolean, limits?: Record<number, Record<number, number>>, addToLimits?: (v2d: Vector2D) => void): void {
		let map: MapData | Phaser.Tilemaps.Tilemap;
		const openQueue: Vector2D[] = [{ x, y }];
		const closedQueue: Record<number, Record<number, number>> = {};
		while (openQueue.length !== 0) {
			const nowPos = openQueue[0];
			openQueue.shift();
			if (closedQueue[nowPos.x]?.[nowPos.y]) {
				continue;
			}
			if (!closedQueue[nowPos.x]) {
				closedQueue[nowPos.x] = {};
			}
			closedQueue[nowPos.x][nowPos.y] = 1;

			if (fromServer) {
				map = taro.game.data.map;
				inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
				const tileMap = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
				const width = map.width;
				//fix for debris layer
				let tempLayer = layer;
				if (map.layers.length > 4 && layer >= 2) {
					tempLayer++;
				}
				if (limits?.[nowPos.x]?.[nowPos.y]) {
					continue;
				}
				if (map.layers[tempLayer].data[nowPos.y * width + nowPos.x] !== oldTile) {
					addToLimits?.({ x: nowPos.x, y: nowPos.y });
					continue;
				}
				tileMap.putTileAt(newTile, nowPos.x, nowPos.y, false, layer);
				//save tile change to taro.game.map.data
				map.layers[tempLayer].data[nowPos.y * width + nowPos.x] = newTile;
			} else {
				map = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
				if (!map.getTileAt(nowPos.x, nowPos.y, true, layer) ||
					limits?.[nowPos.x]?.[nowPos.y] ||
					map.getTileAt(nowPos.x, nowPos.y, true, layer).index === 0 ||
					map.getTileAt(nowPos.x, nowPos.y, true, layer).index === -1) {
					continue;
				}
				if (
					map.getTileAt(nowPos.x, nowPos.y, true, layer).index !== oldTile
				) {
					addToLimits?.({ x: nowPos.x, y: nowPos.y });
					continue;
				}
				map.putTileAt(newTile, nowPos.x, nowPos.y, false, layer);
			}
			if (nowPos.x > 0 && !closedQueue[nowPos.x - 1]?.[nowPos.y]) {
				openQueue.push({ x: nowPos.x - 1, y: nowPos.y });
			}
			if (nowPos.x < map.width - 1 && !closedQueue[nowPos.x + 1]?.[nowPos.y]) {
				openQueue.push({ x: nowPos.x + 1, y: nowPos.y });
			}
			if (nowPos.y > 0 && !closedQueue[nowPos.x]?.[nowPos.y - 1]) {
				openQueue.push({ x: nowPos.x, y: nowPos.y - 1 });
			}
			if (nowPos.x < map.height - 1 && !closedQueue[nowPos.x]?.[nowPos.y + 1]) {
				openQueue.push({ x: nowPos.x, y: nowPos.y + 1 });
			}

		}
	}

	clearLayer(layer: number): void {
		const map = taro.game.data.map;
		inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
		const tileMap = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
		const width = map.width;
		//fix for debris layer
		let tempLayer = layer;
		if (map.layers.length > 4 && layer >= 2) {
			tempLayer++;
		}
		for (let i = 0; i < map.width; i++) {
			for (let j = 0; j < map.height; j++) {
				if (map.layers[tempLayer].data[j * width + i] !== 0) {
					tileMap.putTileAt(-1, i, j, false, layer);
					//save tile change to taro.game.map.data
					map.layers[tempLayer].data[j * width + i] = 0;
				}
			}
		}
	}

	update(): void {
		if (taro.developerMode.active && taro.developerMode.activeTab === 'map') {
			const devModeScene = this.devModeTools.scene;
			const palette = this.tilePalette;
			const map = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
			const paletteMap = palette.map;
			const worldPoint = this.gameScene.cameras.main.getWorldPoint(this.gameScene.input.activePointer.x, this.gameScene.input.activePointer.y);
			const palettePoint = devModeScene.cameras.getCamera('palette').getWorldPoint(devModeScene.input.activePointer.x, devModeScene.input.activePointer.y);
			const marker = this.marker;
			const paletteMarker = this.paletteMarker;
			paletteMarker.graphics.setVisible(true);

			// Rounds down to nearest tile
			const palettePointerTileX = paletteMap.worldToTileX(palettePoint.x);
			const palettePointerTileY = paletteMap.worldToTileY(palettePoint.y);

			if (palette.visible && devModeScene.pointerInsidePalette()) {
				devModeScene.regionEditor.cancelDrawRegion();
				marker.graphics.setVisible(false);
				marker.showPreview(false);

				// Snap to tile coordinates, but in world space
				paletteMarker.graphics.x = paletteMap.tileToWorldX(palettePointerTileX);
				paletteMarker.graphics.y = paletteMap.tileToWorldY(palettePointerTileY);

			} else if ((!devModeScene.pointerInsidePalette() || !palette.visible) &&
				!devModeScene.pointerInsideButtons && !devModeScene.pointerInsideWidgets() && map.currentLayerIndex >= 0) {

				this.devModeTools.tooltip.showMessage(
					'Position',
					`X: ${Math.floor(worldPoint.x).toString()}, Y: ${Math.floor(worldPoint.y).toString()}  |  `
					+ `Tile X: ${Math.floor(worldPoint.x / taro.scaleMapDetails.tileWidth).toString()}, Tile Y: ${Math.floor(worldPoint.y / taro.scaleMapDetails.tileHeight).toString()}`
				);

				if (marker.active) {
					paletteMarker.graphics.setVisible(false);
					marker.graphics.setVisible(true);
					marker.showPreview(true);

					// Rounds down to nearest tile
					const pointerTileX = map.worldToTileX(worldPoint.x - (marker.graphics.scaleSidesX - 1) * this.tileSize / 2, true);
					const pointerTileY = map.worldToTileY(worldPoint.y - (marker.graphics.scaleSidesY - 1) * this.tileSize / 2, true);

					// Snap to tile coordinates, but in world space
					marker.graphics.x = map.tileToWorldX(pointerTileX);
					marker.graphics.y = map.tileToWorldY(pointerTileY);
					marker.preview.x = map.tileToWorldX(pointerTileX);
					marker.preview.y = map.tileToWorldY(pointerTileY);

					if (devModeScene.input.manager.activePointer.leftButtonDown()) {
						if (this.devModeTools.modeButtons[2].active || this.devModeTools.modeButtons[3].active) {
							const originTileArea = {};
							const nowBrushSize = JSON.parse(JSON.stringify(this.brushArea.size)) as Vector2D;
							const nowBrushShape = JSON.parse(JSON.stringify(this.brushArea.shape)) as Shape;
							const sample = JSON.parse(JSON.stringify(this.brushArea.sample));
							const selectedTiles = JSON.parse(JSON.stringify(this.selectedTileArea));
							const nowLayer = map.currentLayerIndex;
							Object.entries(sample).map(([x, obj]) => {
								Object.entries(obj).map(([y, value]) => {
									if (!originTileArea[x]) {
										originTileArea[x] = {};
									}
									originTileArea[x][y] = this.getTile(pointerTileX + parseInt(x), pointerTileY + parseInt(y), map);
								});
							});

							this.commandController.addCommand({
								func: () => {
									this.putTiles(pointerTileX, pointerTileY, selectedTiles, nowBrushSize, nowBrushShape, nowLayer, false);
								},
								undo: () => {
									this.putTiles(pointerTileX, pointerTileY, originTileArea, nowBrushSize, nowBrushShape, nowLayer, false);
								},
							});

						} else if (this.devModeTools.modeButtons[4].active) {
							const targetTile = this.getTile(pointerTileX, pointerTileY, map);
							const selectedTile = Object.values(Object.values(this.selectedTileArea)?.[0] || {})?.[0];
							if (selectedTile && targetTile !== selectedTile && (targetTile || map.currentLayerIndex === 0 || map.currentLayerIndex === 1)) {
								const nowCommandCount = this.commandController.nowInsertIndex;
								const addToLimits = (v2d: Vector2D) => {
									setTimeout(() => {
										const cache = this.commandController.commands[nowCommandCount - this.commandController.offset].cache as Record<number, Record<number, number>>;
										if (!cache[v2d.x]) {
											cache[v2d.x] = {};
										}
										cache[v2d.x][v2d.y] = 1;
									}, 0);
								};
								const nowLayer = map.currentLayerIndex;
								this.commandController.addCommand(
									{
										func: () => {
											this.floodFill(nowLayer, targetTile, selectedTile, pointerTileX, pointerTileY, false, {}, addToLimits);
											taro.network.send<'fill'>('editTile', {
												fill: {
													gid: selectedTile, layer: nowLayer, x: pointerTileX, y: pointerTileY
												}
											});
										},
										undo: () => {
											this.floodFill(nowLayer, selectedTile, targetTile, pointerTileX, pointerTileY, false, this.commandController.commands[nowCommandCount - this.commandController.offset].cache);
											taro.network.send<'fill'>('editTile', {
												fill: {
													gid: targetTile, layer: nowLayer, x: pointerTileX, y: pointerTileY, limits: this.commandController.commands[nowCommandCount - this.commandController.offset].cache
												}
											});
										},
										cache: {},
									}, true
								);

							}

						}
					}
				}
			} else {
				this.showMarkers(false);
			}
		} else {
			this.showMarkers(false);
		}
	}
}

