class TileEditor {
    tilePalette: TilePalette;

    marker: TileMarker;
	paletteMarker: TileMarker;

    area: { x: number, y: number };

	selectedTile: number;
	selectedTileArea: number[][];
	lastSelectedTile: number;
	lastSelectedTileArea: number[][];

	startDragIn: string;

	constructor (
        private gameScene: GameScene, 
		devModeScene: DevModeScene, 
		private devModeTools: DevModeTools
	) {
        const palette = this.tilePalette = this.devModeTools.palette;
        const gameMap = this.gameScene.tilemap;

        this.marker = new TileMarker (this.gameScene, devModeScene, gameMap, false, 2);
        this.paletteMarker = new TileMarker(this.devModeTools.scene, devModeScene, this.tilePalette.map, true, 1);

        this.area = {x: 1, y: 1};

        this.selectedTile = null;
		this.selectedTileArea = [[null, null],[null, null]];

		const pointerPosition = {x: 0, y: 0}

		this.activateMarkers(false);

		this.startDragIn = 'none';

		gameScene.input.on('pointerdown', (p) => {
			if (!devModeScene.pointerInsideButtons && 
				!devModeScene.pointerInsideWidgets() && 
				(!palette.visible || !devModeScene.pointerInsidePalette()) &&
				this.gameScene.tilemap.currentLayerIndex >=0 && 
				devModeScene.input.manager.activePointer.rightButtonDown()) {
					this.startDragIn = 'map';
					pointerPosition.x = gameScene.input.activePointer.x;
					pointerPosition.y = gameScene.input.activePointer.y;
				}
		});

		devModeScene.input.on('pointerdown', (p) => {
			if (!devModeScene.pointerInsideButtons && 
				!devModeScene.pointerInsideWidgets() &&
				palette.visible	&& devModeScene.pointerInsidePalette()) {
					this.startDragIn = 'palette';
					pointerPosition.x = devModeScene.input.activePointer.x;
					pointerPosition.y = devModeScene.input.activePointer.y;
				}
		});

		devModeScene.input.on('pointerup', (p) => {
			if (this.startDragIn === 'palette' && 
				Math.abs(pointerPosition.x - devModeScene.input.activePointer.x) < 50 &&
				Math.abs(pointerPosition.y - devModeScene.input.activePointer.y) < 50) {
					const palettePoint = devModeScene.cameras.getCamera('palette').getWorldPoint(devModeScene.input.activePointer.x, devModeScene.input.activePointer.y);
					const palettePointerTileX = palette.map.worldToTileX(palettePoint.x);
					const palettePointerTileY = palette.map.worldToTileY(palettePoint.y);
						if (!devModeTools.modeButtons[4].active) this.devModeTools.brush();
						if (this.area.x > 1 || this.area.y > 1) {
							this.clearTint();
							for (let i = 0; i < this.area.x; i++) {
								for (let j = 0; j < this.area.y; j++) {
									this.selectedTileArea[i][j] = this.getTile(palettePointerTileX + i, palettePointerTileY + j, palette.map);
								}
							}
							this.marker.changePreview();
						} else {
							this.clearTint();
							this.selectedTile = this.getTile(palettePointerTileX, palettePointerTileY, palette.map);
							this.marker.changePreview();
						}
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
					const pointerTileX = gameMap.worldToTileX(worldPoint.x);
					const pointerTileY = gameMap.worldToTileY(worldPoint.y);
					if (this.area.x > 1 || this.area.y > 1) {
						this.clearTint();
						for (let i = 0; i < this.area.x; i++) {
							for (let j = 0; j < this.area.y; j++) {
								this.selectedTileArea[i][j] = this.getTile(pointerTileX + i, pointerTileY + j, gameMap);
							}
						}
						this.marker.changePreview();
					} else {
						this.clearTint();
						this.selectedTile = this.getTile(pointerTileX, pointerTileY, gameMap);
						this.marker.changePreview();
					}
				}
			if (this.startDragIn === 'map') {
				this.startDragIn = 'none';
			}
		});
    }

    activateMarkers (active: boolean): void {
		this.marker.active = active;
		this.paletteMarker.active = active;
		if (active) this.devModeTools.regionEditor.regionTool = false;
	}

	showMarkers (value: boolean): void {
		this.marker.graphics.setVisible(value);
		this.marker.showPreview(value);
		this.paletteMarker.graphics.setVisible(value);
	}

	clearTint (): void {
		this.tilePalette.map.layers[0].data.forEach((tilearray) => {
			tilearray.forEach((tile) => {
				if (tile) tile.tint = 0xffffff;
			});
		});
	}

    edit (data:TileData): void {
		const map = taro.game.data.map;
		inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
		const width = map.width;
        const tileMap = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
		if (data.tool === 'flood') {
			let tempLayer = data.layer;
			if (map.layers.length > 4 && data.layer >= 2) {
				tempLayer ++;
			}
			const oldTile = map.layers[tempLayer].data[data.y * width + data.x];
			this.floodFill(data.layer, oldTile, data.gid, data.x, data.y, true);
		} else if (data.tool === 'clear') {
			this.clearLayer(data.layer);
			if (map.layers.length > 4 && data.layer >= 2) data.layer ++;
		}
		else {
			let index = data.gid;
			if (data.gid === 0) index = -1;
			tileMap.putTileAt(index, data.x, data.y, false, data.layer);
			/* TODO: SAVE MAP DATA FROM SERVER SIDE */
			//save tile change to taro.game.map.data
			if (map.layers.length > 4 && data.layer >= 2) data.layer ++;
			map.layers[data.layer].data[data.y*width + data.x] = data.gid;
		}
		if (taro.physics && map.layers[data.layer].name === 'walls') {
			//if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
			taro.physics.destroyWalls();
			let mapCopy = taro.scaleMap(_.cloneDeep(map));
			taro.tiled.loadJson(mapCopy, function (layerArray, TaroLayersById) {
				taro.physics.staticsFromMap(TaroLayersById.walls);
			})
		}
    }

    putTile (tileX: number, tileY: number, selectedTile: number, local?: boolean): void {
		const map = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
		if (this.gameScene.tilemapLayers[map.currentLayerIndex].visible && selectedTile && this.devModeTools.scene.pointerInsideMap(tileX, tileY, map)) {
			let index = selectedTile;
			if  (index !== (map.getTileAt(tileX, tileY, true)).index &&
			!(index === 0 && map.getTileAt(tileX, tileY, true).index === -1)) {
				map.putTileAt(index, tileX, tileY);
				map.getTileAt(tileX, tileY, true).tint = 0xffffff;
				if (!local) {
					if (index === -1) index = 0;
					taro.network.send('editTile', {gid: index, layer: map.currentLayerIndex, x: tileX, y: tileY});
				}
			}
		}
	}

	getTile (tileX: number, tileY: number, map: Phaser.Tilemaps.Tilemap): number {
		if (this.devModeTools.scene.pointerInsideMap(tileX, tileY, map)) {
			if (map.getTileAt(tileX, tileY) && map.getTileAt(tileX, tileY).index !== 0) {
				let selectedTile = map.getTileAt(tileX, tileY);
				return selectedTile.index;
			}
		}
	}

	floodFill (layer: number, oldTile: number, newTile: number, x: number, y: number, fromServer: boolean): void {
		if (fromServer) { 
			const map = taro.game.data.map;
			inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
			const tileMap = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
			const width = map.width;
			//fix for debris layer
			let tempLayer = layer;
			if (map.layers.length > 4 && layer >= 2) {
				tempLayer ++;
			}
        	if (oldTile === newTile || map.layers[tempLayer].data[y * width + x] !== oldTile) {
        	    return;
        	}
			tileMap.putTileAt(newTile, x, y, false, layer);
			//save tile change to taro.game.map.data
			map.layers[tempLayer].data[y*width + x] = newTile;
				
        	if (x > 0) {
        	    this.floodFill(layer, oldTile, newTile, x - 1, y, fromServer);
        	}
        	if (x < (map.width - 1)) {
        	    this.floodFill(layer, oldTile, newTile, x + 1, y, fromServer);
        	}
        	if (y > 0) {
        	    this.floodFill(layer, oldTile, newTile, x, y - 1, fromServer);
        	}
        	if (y < (map.height - 1)) {
        	    this.floodFill(layer, oldTile, newTile, x, y + 1, fromServer);
        	}
		} else {
			const tileMap = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
        	if (
				oldTile === newTile ||
				tileMap.getTileAt(x, y, true, layer).index !== oldTile ||
				tileMap.getTileAt(x, y, true, layer).index === 0 ||
				tileMap.getTileAt(x, y, true, layer).index === -1
				) {
        	    return;
        	}
			tileMap.putTileAt(newTile, x, y, false, layer);
				
        	if (x > 0) {
        	    this.floodFill(layer, oldTile, newTile, x - 1, y, fromServer);
        	}
        	if (x < (tileMap.width - 1)) {
        	    this.floodFill(layer, oldTile, newTile, x + 1, y, fromServer);
        	}
        	if (y > 0) {
        	    this.floodFill(layer, oldTile, newTile, x, y - 1, fromServer);
        	}
        	if (y < (tileMap.height - 1)) {
        	    this.floodFill(layer, oldTile, newTile, x, y + 1, fromServer);
        	}
		}
	}

	clearLayer (layer: number): void {
		const map = taro.game.data.map;
		inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
		const tileMap = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
		const width = map.width;
		//fix for debris layer
		let tempLayer = layer;
		if (map.layers.length > 4 && layer >= 2) {
			tempLayer ++;
		}
		for (let i = 0; i < map.width; i++) {
			for (let j = 0; j < map.height; j++) {
				if (map.layers[tempLayer].data[j * width + i] !== 0) {
					tileMap.putTileAt(-1, i, j, false, layer);
					//save tile change to taro.game.map.data
					map.layers[tempLayer].data[j*width + i] = 0;
				}
			}
		}
	}

    update (): void {
        if(taro.developerMode.active && taro.developerMode.activeTab === 'map') {
            const devModeScene = this.devModeTools.scene;
			const palette = this.tilePalette;
			const map = this.gameScene.tilemap as Phaser.Tilemaps.Tilemap;
			const paletteMap = palette.map;
			const worldPoint = this.gameScene.cameras.main.getWorldPoint(this.gameScene.input.activePointer.x, this.gameScene.input.activePointer.y);
			const palettePoint = devModeScene.cameras.getCamera('palette').getWorldPoint(devModeScene.input.activePointer.x, devModeScene.input.activePointer.y);
			const marker = this.marker;
			const paletteMarker = this.paletteMarker;

			paletteMarker.graphics.clear();
			paletteMarker.graphics.strokeRect(0, 0, paletteMap.tileWidth * palette.texturesLayer.scaleX, paletteMap.tileHeight * palette.texturesLayer.scaleY);
			paletteMarker.graphics.setVisible(true);

			// Rounds down to nearest tile
			const palettePointerTileX = paletteMap.worldToTileX(palettePoint.x);
			const palettePointerTileY = paletteMap.worldToTileY(palettePoint.y);

			if (palette.visible	&& devModeScene.pointerInsidePalette()) {
				devModeScene.regionEditor.cancelDrawRegion();
				marker.graphics.setVisible(false);
				marker.showPreview(false);
				
				// Snap to tile coordinates, but in world space
				paletteMarker.graphics.x = paletteMap.tileToWorldX(palettePointerTileX);
				paletteMarker.graphics.y = paletteMap.tileToWorldY(palettePointerTileY);

			} else if ((!devModeScene.pointerInsidePalette() || !palette.visible) &&
				!devModeScene.pointerInsideButtons && !devModeScene.pointerInsideWidgets() && map.currentLayerIndex >=0) {

				this.devModeTools.tooltip.showMessage('Position', 'X: ' + Math.floor(worldPoint.x).toString() + ', Y: ' + Math.floor(worldPoint.y).toString());

				if (marker.active) {
					paletteMarker.graphics.setVisible(false);
					marker.graphics.setVisible(true);
					marker.showPreview(true);

					// Rounds down to nearest tile
					const pointerTileX = map.worldToTileX(worldPoint.x);
					const pointerTileY = map.worldToTileY(worldPoint.y);

					// Snap to tile coordinates, but in world space
					marker.graphics.x = map.tileToWorldX(pointerTileX);
					marker.graphics.y = map.tileToWorldY(pointerTileY);
					marker.preview.x = map.tileToWorldX(pointerTileX);
					marker.preview.y = map.tileToWorldY(pointerTileY);

					if (devModeScene.input.manager.activePointer.leftButtonDown()) {
						if (this.devModeTools.modeButtons[2].active || this.devModeTools.modeButtons[3].active) {
							if (this.area.x > 1 || this.area.y > 1) {
								for (let i = 0; i < this.area.x; i++) {
									for (let j = 0; j < this.area.y; j++) {
										this.putTile(pointerTileX + i, pointerTileY + j, this.selectedTileArea[i][j]);
									}
								}
							}
							else {
								this.putTile(pointerTileX, pointerTileY, this.selectedTile);
							}
						} else if (this.devModeTools.modeButtons[4].active) {
							const targetTile = this.getTile(pointerTileX, pointerTileY, map);
							if (targetTile && this.selectedTile && targetTile !== this.selectedTile) {
								this.floodFill(map.currentLayerIndex, targetTile, this.selectedTile, pointerTileX, pointerTileY, false);
								taro.network.send('editTile', {gid: this.selectedTile, layer: map.currentLayerIndex, x: pointerTileX, y: pointerTileY, tool: 'flood'});
							}

						}
					}
				} 
			} else {
				this.showMarkers(false);
			}
		}
		else {
			this.showMarkers(false);
		}
	}
}
 
