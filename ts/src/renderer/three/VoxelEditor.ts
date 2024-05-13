class VoxelEditor {
	paletteArea: Vector2D;
	brushArea: TileShape;
	currentLayerIndex: number;
	selectedTileArea: Record<number, Record<number, number>>;
	lastSelectedTileArea: Record<number, Record<number, number>>;
	startDragIn: string;
	voxels: Renderer.Three.Voxels;
	voxelMarker: Renderer.Three.VoxelMarker;
	tileSize: number;
	prevData: { edit: MapEditTool['edit'] } | undefined;
	commandController: CommandController = new CommandController({
		increaseBrushSize: () => {},
		decreaseBrushSize: () => {},
	});
	leftButtonDown: boolean;

	constructor(voxels: Renderer.Three.Voxels) {
		const gameMap = taro.game.data.map;
		this.voxels = voxels;
		const renderer = Renderer.Three.instance();
		this.currentLayerIndex = 0;
		this.voxelMarker = new Renderer.Three.VoxelMarker(this.commandController);
		taro.client.on('switch-layer', (value) => {
			if (value !== this.currentLayerIndex) {
				this.voxels.updateLayer(new Map(), this.currentLayerIndex);
				this.switchLayer(value);
				renderer.voxelEditor.voxelMarker.updatePreview();
			}
		});

		taro.client.on('updateMap', () => {
			let numTileLayers = 0;
			this.voxels.voxels = [];
			for (const [idx, layer] of taro.game.data.map.layers.entries()) {
				if (layer.type === 'tilelayer' && layer.data) {
					const voxels = Renderer.Three.Voxels.generateVoxelsFromLayerData(layer, numTileLayers, false);
					this.voxels.updateLayer(voxels, idx);
					this.voxels.setLayerLookupTable(idx, numTileLayers);
					numTileLayers++;
				}
			}
		});

		taro.client.on('editTile', (data: TileData<MapEditToolEnum>) => {
			this.edit(data);
		});

		taro.client.on('cursor', () => {
			this.removePreview();
		});

		taro.client.on('draw-region', () => {
			this.removePreview();
		});

		taro.client.on('brush', () => {
			this.voxels.updateLayer(new Map(), this.currentLayerIndex);
			this.voxelMarker.updatePreview(true, true);
		});

		taro.client.on('empty-tile', () => {
			this.voxels.updateLayer(new Map(), this.currentLayerIndex);
			this.voxelMarker.updatePreview(true, true);
		});

		taro.client.on('clear', () => {
			const data: TileData<'clear'> = {
				clear: {
					layer: this.currentLayerIndex,
					layerName: taro.game.data.map.layers[this.currentLayerIndex].name,
				},
			};
			inGameEditor.showClearLayerConfirmation(data);
		});

		taro.client.on('undo', () => {
			this.commandController.undo();
		});

		taro.client.on('redo', () => {
			this.commandController.redo();
		});

		taro.client.on('hide-layer', (data) => {
			this.hideLayer(data.index, data.state);
		});

		this.paletteArea = { x: 1, y: 1 };
		this.brushArea = new TileShape();
		this.selectedTileArea = {};

		const pointerPosition = { x: 0, y: 0 };

		// this.activateMarkers(false);

		this.startDragIn = 'none';
		this.prevData = undefined;
		this.tileSize = Constants.TILE_SIZE;
		if (taro.game.data.defaultData.dontResize) {
			this.tileSize = gameMap.tilewidth;
		}

		taro.clearLayer = (payload: TileData<'clear'>) => {
			const map = taro.game.data.map;
			const nowLayerData = {};
			for (let x = 0; x < taro.map.data.width; x++) {
				for (let y = 0; y < taro.map.data.height; y++) {
					if (nowLayerData[x] === undefined) {
						nowLayerData[x] = {};
					}
					nowLayerData[x][y] = map.layers[payload.clear.layer].data[x + y * taro.map.data.width];
				}
			}
			this.commandController.addCommand(
				{
					func: () => {
						taro.network.send<'clear'>('editTile', payload);
					},
					undo: () => {
						taro.network.send<'edit'>('editTile', {
							edit: {
								selectedTiles: [nowLayerData],
								size: 'fitContent',
								shape: 'rectangle',
								layer: [payload.clear.layer],
								x: 0,
								y: 0,
							},
						});
					},
				},
				true
			);
		};
	}

	removePreview() {
		this.voxels.updateLayer(new Map(), this.currentLayerIndex);
		this.voxelMarker.removeMeshes();
	}

	updateSelectedTiles(x, y) {
		this.voxelMarker;
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
		let tempLayer = dataType === 'edit' ? dataValue.layer[0] : dataValue.layer;
		switch (dataType) {
			case 'fill': {
				const nowValue = dataValue as TileData<'fill'>['fill'];
				let oldTile = map.layers[tempLayer].data[nowValue.y * width + nowValue.x];
				if (oldTile === 0) {
					oldTile = -1;
				}
				if (
					taro.game.data.map.layers[nowValue.layer].type === 'tilelayer' &&
					taro.game.data.map.layers[nowValue.layer].data
				) {
					this.floodFill(nowValue.layer, oldTile, nowValue.gid, nowValue.x, nowValue.y, true, nowValue.limits);
				}
				break;
			}
			case 'edit': {
				//save tile change to taro.game.data.map and taro.map.data
				const nowValue = dataValue as TileData<'edit'>['edit'];
				nowValue.selectedTiles.forEach((v, idx) => {
					if (
						taro.game.data.map.layers[nowValue.layer[idx]].type === 'tilelayer' &&
						taro.game.data.map.layers[nowValue.layer[idx]].data
					) {
						this.putTiles(nowValue.x, nowValue.y, v, nowValue.size, nowValue.shape, nowValue.layer[idx], true);
					}
				});

				break;
			}
			case 'clear': {
				const nowValue = dataValue as TileData<'clear'>['clear'];
				if (
					taro.game.data.map.layers[nowValue.layer].type === 'tilelayer' &&
					taro.game.data.map.layers[nowValue.layer].data
				) {
					this.clearLayer(nowValue.layer);
				}
			}
		}
		if (taro.physics.simulation && map.layers[tempLayer].name === 'walls') {
			//if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
			if (dataValue.noMerge) {
				recalcWallsPhysics(map, true);
			} else {
				debounceRecalcPhysics(map, true);
			}
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
	putTiles(
		tileX: number,
		tileY: number,
		selectedTiles: Record<number, Record<number, number>>,
		brushSize: Vector2D | 'fitContent',
		shape: Shape,
		layer: number,
		local?: boolean,
		flat = false,
		isPreview = false
	) {
		const voxels = new Map<string, Renderer.Three.VoxelCell>();
		const allFacesVisible = [false, false, false, false, false, false];
		const onlyBottomFaceVisible = [true, true, true, false, true, true];
		const hiddenFaces = flat ? onlyBottomFaceVisible : allFacesVisible;
		const calcData = this.brushArea.calcSample(selectedTiles, brushSize, shape, true);
		const yOffset = 0.001;
		const sample = calcData.sample;
		const size = brushSize === 'fitContent' ? { x: calcData.xLength, y: calcData.yLength } : brushSize;
		const taroMap = taro.game.data.map;
		const width = taroMap.width;
		const height = taroMap.height;
		tileX = brushSize === 'fitContent' ? calcData.minX : tileX;
		tileY = brushSize === 'fitContent' ? calcData.minY : tileY;
		for (let x = 0; x < size.x; x++) {
			for (let y = 0; y < size.y; y++) {
				if (
					sample[x] &&
					sample[x][y] !== undefined &&
					DevModeScene.pointerInsideMap(tileX + x, tileY + y, { width, height })
				) {
					let _x = tileX + x + 0.5;
					let _z = tileY + y + 0.5;
					let tileId = sample[x][y];
					tileId -= 1;
					const height = this.voxels.calcHeight(layer);
					const pos = { x: _x, y: height + yOffset * height, z: _z };

					voxels.set(Renderer.Three.getKeyFromPos(pos.x, pos.y, pos.z), {
						position: [pos.x, pos.y, pos.z],
						type: tileId,
						visible: true,
						hiddenFaces: [...hiddenFaces],
						isPreview,
					});
					if (!isPreview) {
						tileId += 1;
						if (tileId < 0) tileId = 0;
						taroMap.layers[layer].data[(tileY + y) * width + tileX + x] = tileId;
					}
				}
			}
		}
		this.voxels.updateLayer(voxels, layer, isPreview);
		if (!local && !isPreview) {
			const data: { edit: MapEditTool['edit'] } = {
				edit: {
					size: brushSize,
					layer: [layer],
					selectedTiles: [selectedTiles],
					x: tileX,
					y: tileY,
					shape,
					noMerge: true,
				},
			};
			if (this.prevData === undefined || JSON.stringify(this.prevData) !== JSON.stringify(data)) {
				taro.network.send<'edit'>('editTile', data);
				this.prevData = data;
			}
		}
	}

	getTile(tileX: number, tileY: number, tileZ: number, layer?: number): number {
		const renderer = Renderer.Three.instance();
		const voxelsMap = Renderer.Three.getVoxels().voxels[layer ?? this.currentLayerIndex];
		let tileId = voxelsMap.get(Renderer.Three.getKeyFromPos(tileX + 0.5, tileY, tileZ + 0.5))?.type ?? -2;
		return tileId + 1;
	}

	handleMapToolEdit() {
		const renderer = Renderer.Three.instance();
		const developerMode = taro.developerMode;
		const intersect = renderer.raycastFloor();
		if (!intersect) {
			return;
		}
		const _x = Math.floor(intersect.x);
		const _y = Math.floor(intersect.z);
		const selectedTiles = {};
		const tileId = renderer.tmp_tileId;
		selectedTiles[_x] = {};
		selectedTiles[_x][_y] = developerMode.activeButton === 'eraser' ? -1 : tileId;
		const nowTile = rfdc()(selectedTiles);
		const oldTile = this.getTile(_x, this.voxels.calcLayersHeight(this.currentLayerIndex), _y);
		nowTile[_x][_y] = oldTile;
		const nowLayer = this.currentLayerIndex;
		if (!this.leftButtonDown) {
			this.voxelMarker.updatePreview();
		} else {
			switch (taro.developerMode.activeButton) {
				case 'eraser':
				case 'brush': {
					this.commandController.addCommand({
						func: () => {
							this.putTiles(_x, _y, selectedTiles, 'fitContent', 'rectangle', nowLayer);
						},
						undo: () => {
							this.putTiles(_x, _y, nowTile, 'fitContent', 'rectangle', nowLayer);
						},
					});
					break;
				}
				case 'fill': {
					const nowCommandCount = this.commandController.nowInsertIndex;
					const nowLayer = this.currentLayerIndex;
					const addToLimits = (v2d: Vector2D) => {
						setTimeout(() => {
							const cache = this.commandController.commands[nowCommandCount - this.commandController.offset]
								.cache as Record<number, Record<number, number>>;
							if (!cache[v2d.x]) {
								cache[v2d.x] = {};
							}
							cache[v2d.x][v2d.y] = 1;
						}, 0);
					};
					if (
						taro.game.data.map.layers[this.currentLayerIndex].type === 'tilelayer' &&
						taro.game.data.map.layers[this.currentLayerIndex].data
					) {
						this.commandController.addCommand({
							func: () => {
								this.floodFill(nowLayer, oldTile, tileId, _x, _y, false, {}, addToLimits);
							},
							undo: () => {
								this.floodFill(
									nowLayer,
									tileId,
									oldTile,
									_x,
									_y,
									false,
									this.commandController.commands[nowCommandCount - this.commandController.offset].cache,
									undefined,
									true
								);
							},
							cache: {},
						});
					}
				}
			}
		}
	}

	handleMapToolCopy() {
		const renderer = Renderer.Three.instance();
		const intersect = renderer.raycastFloor();
		if (!intersect) {
			return;
		}
		const _x = Math.floor(intersect.x);
		const _y = Math.floor(intersect.z);
		const taroMap = taro.game.data.map;
		if (taroMap.layers[this.currentLayerIndex].data[_y * taroMap.width + _x] !== 0) {
			renderer.tmp_tileId = taroMap.layers[this.currentLayerIndex].data[_y * taroMap.width + _x];
		}
		this.voxels.updateLayer(new Map(), this.currentLayerIndex);
	}

	floodFill(
		layer: number,
		oldTile: number,
		newTile: number,
		x: number,
		y: number,
		fromServer: boolean,
		limits?: Record<number, Record<number, number>>,
		addToLimits?: (v2d: Vector2D) => void,
		sendToServerWithLimits = false
	): void {
		let map: MapData;
		const openQueue: Vector2D[] = [{ x, y }];
		const closedQueue: Record<number, Record<number, number>> = {};
		const selectedTiles = {};
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
			if (newTile === 0 || newTile === null) {
				newTile = -1;
			}

			map = taro.game.data.map;
			inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
			const curTileId = this.getTile(nowPos.x, this.voxels.calcLayersHeight(layer), nowPos.y, layer);
			if (limits?.[nowPos.x]?.[nowPos.y]) {
				continue;
			}
			if (curTileId !== oldTile) {
				addToLimits?.({ x: nowPos.x, y: nowPos.y });
				continue;
			}
			if (selectedTiles[nowPos.x] === undefined) {
				selectedTiles[nowPos.x] = {};
			}
			selectedTiles[nowPos.x][nowPos.y] = newTile;

			if (nowPos.x > 0 && !closedQueue[nowPos.x - 1]?.[nowPos.y]) {
				openQueue.push({ x: nowPos.x - 1, y: nowPos.y });
			}
			if (nowPos.x < map.width - 1 && !closedQueue[nowPos.x + 1]?.[nowPos.y]) {
				openQueue.push({ x: nowPos.x + 1, y: nowPos.y });
			}
			if (nowPos.y > 0 && !closedQueue[nowPos.x]?.[nowPos.y - 1]) {
				openQueue.push({ x: nowPos.x, y: nowPos.y - 1 });
			}
			if (nowPos.y < map.height - 1 && !closedQueue[nowPos.x]?.[nowPos.y + 1]) {
				openQueue.push({ x: nowPos.x, y: nowPos.y + 1 });
			}
		}
		if (Object.keys(selectedTiles).length > 0) {
			this.putTiles(0, 0, selectedTiles, 'fitContent', 'rectangle', layer, true);
			if (!fromServer) {
				taro.network.send<'fill'>('editTile', {
					fill: {
						gid: newTile,
						layer,
						x,
						y,
						limits: sendToServerWithLimits ? limits : undefined,
					},
				});
			}
		}
	}

	clearLayer(layer: number): void {
		let emptyVoxels = new Map();
		const map = taro.game.data.map;
		inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
		const width = map.width;
		for (let i = 0; i < map.width; i++) {
			for (let j = 0; j < map.height; j++) {
				if (map.layers[layer].data[j * width + i] !== 0) {
					//save tile change to taro.game.map.data
					map.layers[layer].data[j * width + i] = 0;
				}
			}
		}
		this.voxels.clearLayer(layer);
		this.voxels.updateLayer(emptyVoxels, layer);
	}

	changeLayerOpacity(layer: number, opacity: number): void {
		const map = taro.game.data.map;
		if (map.layers[layer]) {
			map.layers[layer].opacity = opacity;
			//TODO
		}
	}

	switchLayer(value: number): void {
		const voxels = Renderer.Three.getVoxels();
		if (!voxels.meshes[value]) {
			return;
		}
		this.currentLayerIndex = value;
		voxels.meshes[value].visible = true;
	}

	hideLayer(layer: number, state: boolean): void {
		Renderer.Three.getVoxels().meshes[layer].visible = !state;
	}

	showAllLayers(): void {
		const voxels = Renderer.Three.getVoxels();
		for (let i = 0; i < voxels.meshes.length; i++) {
			if (voxels?.meshes[i]?.visible === false) {
				this.hideLayer(i, false);
			}
		}
	}

	update(): void {
		const renderer = Renderer.Three.instance();
		const raycaster = new THREE.Raycaster();

		raycaster.setFromCamera(Renderer.Three.getPointer(), renderer.camera.instance);
		const intersect = renderer.raycastFloor();

		if (!intersect) {
			return;
		}
		const x = Math.floor(Renderer.Three.Utils.worldToPixel(intersect.x));
		const y = Math.floor(Renderer.Three.Utils.worldToPixel(intersect.z));

		const tileX = Math.floor(x / taro.scaleMapDetails.tileWidth);
		const tileY = Math.floor(y / taro.scaleMapDetails.tileHeight);

		if (
			taro.developerMode.activeButton === 'brush' ||
			taro.developerMode.activeButton === 'eraser' ||
			taro.developerMode.activeButton === 'fill'
		) {
			//if brush tool selected
			const taroMap = taro.game.data.map;
			const tileId = taroMap.layers[this.currentLayerIndex].data[tileY * taroMap.width + tileX];
			taro.client.emit('update-tooltip', {
				label: 'Position',
				text:
					`X: ${x.toString()}, Y: ${y.toString()}  \n` +
					`Tile X: ${tileX.toString()}, Tile Y: ${tileY.toString()}  |  ` +
					`Tile id: ${tileId}`,
			});
		} else {
			//if cursor tool selected
			taro.client.emit('update-tooltip', {
				label: 'Position',
				text:
					`X: ${x.toString()}, Y: ${Math.floor(Renderer.Three.Utils.worldToPixel(intersect.z)).toString()}  \n` +
					`Tile X: ${tileX.toString()}, Tile Y: ${tileY.toString()}`,
			});
		}

		// if entity image is selected
		/*taro.client.emit('update-tooltip', {
			label: 'Entity Position',
			text: `X: ${this.devModeTools.entityEditor.selectedEntityImage.image.x.toString()}, Y: ${this.devModeTools.entityEditor.selectedEntityImage.image.y.toString()}`,
		});*/
	}
}
