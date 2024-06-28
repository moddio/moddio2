/**
 * recursively set object parameters
 * @param oldObject
 * @param newObject
 */
function setObject(oldObject: { [key: string]: any }, newObject: { [key: string]: any }) {
	Object.keys(newObject).map((k) => {
		if (!oldObject[k]) {
			oldObject[k] = {};
		}
		if (typeof newObject[k] === 'object') {
			setObject(oldObject[k], newObject[k]);
		} else {
			oldObject[k] = newObject[k];
		}
	});
}

/**
 * merge the oldData with newData using template
 * @param oldData
 * @param newData
 * @param template
 */
function merge(oldData: any, newData: any, template: MergedTemplate<any>) {
	Object.entries(template).map(([k, v]) => {
		if (!v.calc && typeof v === 'object') {
			if (!oldData[k]) {
				oldData[k] = {};
			}
			merge(oldData[k], newData[k], template[k] as MergedTemplate<any>);
			return;
		}
		if (!oldData[k] && v.calc !== 'init') {
			switch (typeof newData[k]) {
				case 'string': {
					oldData[k] = '';
					break;
				}
				case 'number': {
					oldData[k] = 0;
					break;
				}
				case 'object': {
					oldData[k] = Array.isArray(newData[k]) ? [] : {};
					break;
				}
			}
		}
		if (typeof v.calc === 'function') {
			v.calc(oldData, newData, oldData[k]);
		} else {
			switch (v.calc) {
				case 'init': {
					if (oldData[k] === undefined) {
						oldData[k] = newData[k];
					}
					break;
				}
				case 'set': {
					oldData[k] = newData[k];
					break;
				}
				case 'smartSet': {
					if (typeof newData[k] === 'object') {
						setObject(oldData[k], newData[k]);
					} else {
						oldData[k] = newData[k];
					}
					break;
				}
				case 'sum': {
					switch (v.method) {
						case 'direct': {
							oldData[k] += newData[k];
							break;
						}
						case 'array': {
							// console.log('oldData', oldData[k], k)
							newData[k].map((v: any) => {
								if (!oldData[k].includes(v)) {
									oldData[k].push(v);
								}
							});
						}
					}
					break;
				}
				case 'div': {
					oldData[k] /= newData[k];
					break;
				}
				case 'sub': {
					oldData[k] -= newData[k];
					break;
				}
				case 'mul': {
					oldData[k] *= newData[k];
					break;
				}
			}
		}

		return oldData;
	});
}

const mergedTemplate: MergedTemplate<TileData<'edit'>> = {
	edit: {
		size: { calc: 'set', method: 'direct' },
		selectedTiles: {
			calc: (
				oldData: TileData<'edit'>['edit'],
				newData: TileData<'edit'>['edit'],
				nowData: [Record<number, Record<number, number>>]
			) => {
				// console.log(oldData, newData, nowData);
				const newLayer = newData.layer[0];
				if (!oldData.layer?.includes(newLayer)) {
					nowData.push(...newData.selectedTiles);
				} else {
					const idx = oldData.layer.findIndex((v) => v === newLayer);
					setObject(nowData[idx], newData.selectedTiles[0]);
				}
			},
			method: 'direct',
		},
		shape: { calc: 'set', method: 'direct' },
		layer: { calc: 'sum', method: 'array' },
		x: { calc: 'init', method: 'direct' },
		y: { calc: 'init', method: 'direct' },
	},
};

function debounce<Params extends any[]>(
	func: (...args: Params) => any,
	timeout: number,
	mergedTemplate?: MergedTemplate<any>
): (...args: Params) => void {
	let timer: NodeJS.Timeout;
	let mergedData: any = [{}];
	return function (...args: Params) {
		clearTimeout(timer);
		if (mergedTemplate) {
			args.map((v, idx) => {
				merge(mergedData[0], v, mergedTemplate);
			});
		} else {
			if (Array.isArray(args)) {
				mergedData = args;
			} else {
				mergedData[0] = args;
			}
		}

		timer = setTimeout(() => {
			func(...mergedData);
			mergedData = [{}];
		}, timeout);
	};
}

function mergeSetWasEdited(gameMap: MapData) {
	gameMap.wasEdited = true;
}

function mergeEditTileActions(data: TileData<'edit'>) {
	taro.network.send('editTile', data);
}

const debounceSetWasEdited = debounce(mergeSetWasEdited, 0);
const debounceEditTileSend = debounce(mergeEditTileActions, 0, mergedTemplate);

function recalcWallsPhysics(gameMap: MapData, forPathFinding: boolean) {
	taro.physics.destroyWalls();
	let map = taro.scaleMap(rfdc()(gameMap));
	taro.tiled.loadJson(map, function (layerArray, layersById) {
		taro.physics.staticsFromMap(layersById.walls);
		if (taro.isClient) {
			// visibility mask
			taro.client.emit('update-walls');
		}
	});
	if (forPathFinding) {
		taro.map.updateWallMapData(); // for A* pathfinding
	}
}

const debounceRecalcPhysics = debounce(recalcWallsPhysics, 0);

class DeveloperMode {
	active: boolean;
	activeTab: devModeTab;
	activeButton: 'cursor' | 'draw-region' | 'add-entities' | 'brush' | 'eraser' | 'fill';

	initEntities: ActionData[];

	serverScriptData: Record<string, ScriptData>;
	savedScriptData: Record<string, ScriptData>;

	serverVariableData: Record<string, VariableData>;

	regionTool: boolean;

	constructor() {
		if (taro.isClient) {
			this.active = false;
			this.initializeEventListeners();
		}
	}

	initializeEventListeners() {
		taro.client.on('applyScriptChanges', (data: ScriptChangesData) => {
			taro.network.send<any>('editGlobalScripts', data);
		});

		taro.client.on('editGlobalScripts', (data: ScriptChangesData) => {
			Object.entries(data.scriptData).forEach(([scriptId, script]) => {
				if (!script.deleted) {
					if (data.action === 'apply') {
						taro.developerMode.serverScriptData[scriptId] = script;
					}
					taro.developerMode.savedScriptData[scriptId] = script;
				} else {
					delete taro.developerMode.serverScriptData[scriptId];
				}
			});

			if (data.action === 'apply') {
				taro.script.load(data.scriptData, true);
				taro.script.scriptCache = {};
			}

			inGameEditor?.editGlobalScripts?.(data);
		});

		taro.client.on('applyVariableChanges', (data: Record<string, VariableData>) => {
			taro.network.send<any>('editVariable', data);
		});

		taro.client.on('editVariable', (data: Record<string, VariableData>) => {
			Object.entries(data).forEach(([key, variable]) => {
				//editing existing variable
				if (taro.game.data.variables[key]) {
					//deleting variable
					if (variable.delete) {
						delete taro.game.data.variables[key];
						//renaming variable
					} else if (variable.newKey) {
						taro.game.data.variables[variable.newKey] = taro.game.data.variables[key];
						delete taro.game.data.variables[key];
						//editing variable
					} else {
						taro.game.data.variables[key].value = variable.value;
					}
					//creating new variable
				} else {
					taro.game.data.variables[key] = {
						dataType: variable.dataType,
						value: variable.value,
					};
				}
			});
		});

		taro.client.on('editRegion', (data: RegionData) => {
			this.updateRegion(data);
		});

		this.activeButton = 'cursor';
		taro.client.on('cursor', () => {
			this.activeButton = 'cursor';
		});
		taro.client.on('draw-region', () => {
			this.activeButton = 'draw-region';
			this.regionTool = true;
		});
		taro.client.on('add-entities', () => {
			this.activeButton = 'add-entities';
		});
		taro.client.on('brush', () => {
			this.activeButton = 'brush';
		});
		taro.client.on('empty-tile', () => {
			this.activeButton = 'eraser';
		});
		taro.client.on('fill', () => {
			this.activeButton = 'fill';
		});
		taro.client.on('save', () => {
			inGameEditor.saveMap();
		});
		taro.client.on('setting', () => {
			inGameEditor.openMapConfiguration();
		});
	}

	addInitEntities(): void {
		// add id for actions creating entities in initialize script
		this.initEntities = [];
		Object.values(taro.game.data.scripts).forEach((script) => {
			if (script.triggers?.[0]?.type === 'gameStart') {
				Object.values(script.actions).forEach((action) => {
					if (
						!action.disabled &&
						action.position?.function === 'xyCoordinate' &&
						!isNaN(action.position?.x) &&
						!isNaN(action.position?.y) &&
						!isNaN(action.width) &&
						!isNaN(action.height) &&
						(!isNaN(action.angle) ||
							(!isNaN(action.rotation?.x) && !isNaN(action.rotation?.y) && !isNaN(action.rotation?.z)))
					) {
						if (
							(action.type === 'createEntityForPlayerAtPositionWithDimensions' ||
								action.type === 'createEntityAtPositionWithDimensions' ||
								action.type === 'createUnitForPlayerAtPosition') &&
							!isNaN(action.width) &&
							!isNaN(action.height) &&
							(!isNaN(action.angle) ||
								(!isNaN(action.rotation?.x) && !isNaN(action.rotation?.y) && !isNaN(action.rotation?.z)))
						) {
							if (action.actionId) this.initEntities.push(action);
						} else if (
							(action.type === 'createUnitAtPosition' || action.type === 'createProjectileAtPosition') &&
							(!isNaN(action.angle) ||
								(!isNaN(action.rotation?.x) && !isNaN(action.rotation?.y) && !isNaN(action.rotation?.z)))
						) {
							if (action.actionId) this.initEntities.push(action);
						} else if (action.type === 'spawnItem' || action.type === 'createItemWithMaxQuantityAtPosition') {
							if (action.actionId) this.initEntities.push(action);
						}
					}
				});
			}
		});
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

	requestInitEntities(): void {
		if (this.initEntities) {
			taro.network.send<any>('updateClientInitEntities', this.initEntities);
		}
	}

	enter(): void {
		console.log('client enter developer mode');
		this.active = true;
		this.changeTab('play');
	}

	leave(): void {
		console.log('client leave developer mode');
		this.active = false;
	}

	changeTab(tab: devModeTab) {
		if (tab === 'map') {
			if (this.activeTab !== 'map') {
				taro.client.emit('enterMapTab');
			}
		} else if (this.activeTab === 'map') {
			taro.client.emit('leaveMapTab');
		}

		if (tab === 'play') {
			if (this.activeTab !== 'play') {
				taro.client.emit('enterPlayTab');

				taro.client.emit('lockCamera');
				taro.menuUi.toggleCustomIngameUi(true);
			}
		} else if (this.activeTab === 'play') {
			taro.client.emit('leavePlayTab');

			taro.client.emit('unlockCamera');
			taro.menuUi.toggleCustomIngameUi(false);
		}

		if (tab === 'entities') {
			if (this.activeTab !== 'entities') {
				taro.client.emit('enterEntitiesTab');
			}
		} else if (this.activeTab === 'entities') {
			taro.client.emit('leaveEntitiesTab');
		}

		this.activeTab = tab;
	}

	shouldPreventKeybindings(): boolean {
		return this.activeTab && this.activeTab !== 'play';
	}

	editTile<T extends MapEditToolEnum>(data: TileData<T>, clientId: string): void {
		// only allow developers to modify the tiles
		if (taro.server.developerClientIds.includes(clientId) || clientId === 'server') {
			if (JSON.stringify(data) === '{}') {
				throw 'receive: {}';
			}
			const gameMap = taro.game.data.map;

			const { dataType, dataValue } = Object.entries(data).map(([k, dataValue]) => {
				const dataType = k as MapEditToolEnum;
				return { dataType, dataValue };
			})[0];
			const serverData = rfdc()(dataValue);
			if (dataType === 'edit' && !serverData.noMerge) {
				debounceSetWasEdited(gameMap);
				if ((data as TileData<'edit'>).edit.size !== 'fitContent') {
					taro.network.send('editTile', data);
				} else {
					debounceEditTileSend(data as TileData<'edit'>);
				}
			} else {
				gameMap.wasEdited = true;
				taro.network.send('editTile', data);
			}
			const width = gameMap.width;
			switch (dataType) {
				case 'fill': {
					const nowValue = serverData as TileData<'fill'>['fill'];
					const oldTile = gameMap.layers[nowValue.layer].data[nowValue.y * width + nowValue.x];
					this.floodTiles(nowValue.layer, oldTile, nowValue.gid, nowValue.x, nowValue.y, nowValue.limits);
					break;
				}
				case 'edit': {
					//save tile change to taro.game.data.map and taro.map.data
					const nowValue = serverData as TileData<'edit'>['edit'];
					nowValue.selectedTiles.map((v, idx) => {
						this.putTiles(nowValue.x, nowValue.y, v, nowValue.size, nowValue.shape, nowValue.layer[idx]);
					});
					break;
				}
				case 'clear': {
					const nowValue = serverData as TileData<'clear'>['clear'];
					this.clearLayer(nowValue.layer);
				}
			}

			if (gameMap.layers[serverData.layer]?.name === 'walls') {
				//if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
				if (serverData.noMerge) {
					recalcWallsPhysics(gameMap, true);
				} else {
					debounceRecalcPhysics(gameMap, true);
				}
			}
		}
	}

	/**
	 * put tiles
	 * @param tileX pointerTileX
	 * @param tileY pointerTileY
	 * @param selectedTiles selectedTiles
	 * @param brushSize brush's size
	 * @param layer map's layer
	 */
	putTiles(
		tileX: number,
		tileY: number,
		selectedTiles: Record<number, Record<number, number>>,
		brushSize: Vector2D | 'fitContent',
		shape: Shape,
		layer: number
	): void {
		const map = taro.game.data.map;
		const width = map.width;
		const calcData = this.calcSample(selectedTiles, brushSize, shape);
		const sample = calcData.sample;
		let size = brushSize === 'fitContent' ? { x: calcData.xLength, y: calcData.yLength } : brushSize;
		tileX = brushSize === 'fitContent' ? calcData.minX : tileX;
		tileY = brushSize === 'fitContent' ? calcData.minY : tileY;
		if (map.layers[layer]) {
			for (let x = 0; x < size.x; x++) {
				for (let y = 0; y < size.y; y++) {
					if (sample[x] && sample[x][y] !== undefined && this.pointerInsideMap(x + tileX, y + tileY, map)) {
						let index = sample[x][y];
						if (index === -1) index = 0;
						let indices = x + tileX + (y + tileY) * width;
						map.layers[layer].data[indices] = index;
						taro.map.data.layers[layer].data[indices] = index;
					}
				}
			}
		}
	}

	pointerInsideMap(pointerX: number, pointerY: number, map: { width: number; height: number }): boolean {
		return 0 <= pointerX && pointerX < map.width && 0 <= pointerY && pointerY < map.height;
	}

	/**
	 * calc the sample to print
	 * @param selectedTileArea selectedTiles
	 * @param size brush's size
	 * @returns sample to print
	 */
	calcSample(
		selectedTileArea: Record<number, Record<number, number>>,
		size: Vector2D | 'fitContent',
		shape?: Shape
	): { sample: Record<number, Record<number, number>>; xLength: number; yLength: number; minX: number; minY: number } {
		const xArray = Object.keys(selectedTileArea);
		const yArray = Object.values(selectedTileArea)
			.map((object) => Object.keys(object))
			.flat()
			.sort((a, b) => parseInt(a) - parseInt(b));
		const minX = parseInt(xArray[0]);
		const minY = parseInt(yArray[0]);
		const maxX = parseInt(xArray[xArray.length - 1]);
		const maxY = parseInt(yArray[yArray.length - 1]);
		// console.log(selectedTileArea, minX, maxX, minY, maxY);
		const xLength = maxX - minX + 1;
		const yLength = maxY - minY + 1;
		if (size === 'fitContent') {
			size = {
				x: xLength,
				y: yLength,
			};
		}
		let tempSample: Record<number, Record<number, number>> = {};
		switch (shape) {
			case 'rectangle': {
				tempSample = TileShape.calcRect(minX, xLength, minY, yLength, selectedTileArea, size);
				break;
			}
			case 'diamond': {
				tempSample = TileShape.calcDiamond(minX, xLength, minY, yLength, selectedTileArea, size);
				break;
			}
			case 'circle': {
				tempSample = TileShape.calcCircle(minX, xLength, minY, yLength, selectedTileArea, size);
				break;
			}
		}
		return { sample: tempSample, xLength, yLength, minX, minY };
	}

	floodTiles(
		layer: number,
		oldTile: number,
		newTile: number,
		x: number,
		y: number,
		limits?: Record<number, Record<number, number>>
	): void {
		const map = taro.game.data.map;
		const width = map.width;
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
			if (
				oldTile === newTile ||
				map.layers[layer].data[nowPos.y * width + nowPos.x] !== oldTile ||
				limits?.[nowPos.x]?.[nowPos.y]
			) {
				continue;
			}
			//save tile change to taro.game.data.map and taro.map.data
			if (newTile === -1) {
				newTile = 0;
			}
			map.layers[layer].data[nowPos.y * width + nowPos.x] = newTile;
			taro.map.data.layers[layer].data[nowPos.y * width + nowPos.x] = newTile;
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
	}

	clearLayer(layer: number): void {
		const map = taro.game.data.map;
		const width = map.width;
		for (let i = 0; i < map.width; i++) {
			for (let j = 0; j < map.height; j++) {
				if (map.layers[layer].data[j * width + i] !== 0) {
					//save tile change to taro.game.map.data
					map.layers[layer].data[j * width + i] = 0;
				}
			}
		}
	}

	changeLayerOpacity(data: { layer: number; opacity: number }, clientId: string): void {
		if (taro.server.developerClientIds.includes(clientId) || clientId === 'server') {
			const map = taro.game.data.map;
			if (map.layers[data.layer]) {
				map.layers[data.layer].opacity = data.opacity;
				map.wasEdited = true;
				taro.network.send('changeLayerOpacity', data as any);
			}
		}
	}

	editRegion(data: RegionData, clientId: string): void {
		// only allow developers to modify regions
		if (taro.server.developerClientIds.includes(clientId)) {
			if (data.name === '' || data.width <= 0 || data.height <= 0) {
				console.log('empty name, negative or 0 size is not allowed');
			} else if (data.name === undefined || (data.create && !taro.regionManager.getRegionById(data.name))) {
				// create new region
				if (!data.name) {
					// create new region name (smallest available number)
					let regionNameNumber = 0;
					let newRegionName = `region${regionNameNumber}`;
					do {
						regionNameNumber++;
						newRegionName = `region${regionNameNumber}`;
					} while (taro.regionManager.getRegionById(newRegionName));
					data.name = newRegionName;

					data.showModal = true;
				}

				data.userId = taro.game.getPlayerByClientId(clientId)._stats.userId;
				// changed to Region from RegionUi
				const regionData = {
					dataType: 'region',
					default: {
						x: data.x,
						y: data.y,
						width: data.width,
						height: data.height,
						key: data.name,
						alpha: data.alpha,
						inside: data.inside,
					} as any,
					id: data.name,
					value: {
						x: data.x,
						y: data.y,
						width: data.width,
						height: data.height,
						key: data.name,
						alpha: data.alpha,
						inside: data.inside,
					} as any,
				};
				if (taro.is3D()) {
					regionData.default.z = data.z;
					regionData.default.depth = data.depth;

					regionData.value.z = data.z;
					regionData.value.depth = data.depth;
				}

				new Region(regionData);

				// create new region in game.data
				taro.regionManager.updateRegionToDatabase(regionData);
			} else {
				// modify existing region
				const region = taro.regionManager.getRegionById(data.name);
				if (region) {
					if (data.delete) {
						region.destroy();
					} else {
						if (data.name !== data.newKey) {
							if (taro.regionManager.getRegionById(data.newKey)) {
								console.log('This name is unavailable');
							} else {
								region._stats.id = data.newKey;
							}
						}
						let statsData = [
							{ x: data.x !== region._stats.default.x ? data.x : null },
							{ y: data.y !== region._stats.default.y ? data.y : null },
							{ z: data.z !== region._stats.default.z ? data.z : null },
							{ width: data.width !== region._stats.default.width ? data.width : null },
							{ height: data.height !== region._stats.default.height ? data.height : null },
							{ depth: data.depth !== region._stats.default.depth ? data.depth : null },
							{ alpha: data.alpha !== region._stats.default.alpha ? data.alpha : null },
							{ inside: data.inside !== region._stats.default.inside ? data.inside : null },
						];
						statsData = statsData.filter((obj) => obj[Object.keys(obj)[0]] !== null);
						if (data.inside === '') statsData.push({ inside: '' });
						region.streamUpdateData(statsData);
					}
				}
			}
			// broadcast region change to all clients
			taro.network.send<any>('editRegion', data);
		}
	}

	updateRegion(data: RegionData): void {
		if (data.newKey && data.name !== data.newKey) {
			const region = taro.regionManager.getRegionById(data.name);
			if (region) region._stats.id = data.newKey;
			taro.client.emit('update-region-name', { name: data.name, newName: data.newKey });
		} else if (data.showModal) {
			inGameEditor.addNewRegion &&
				inGameEditor.addNewRegion({
					name: data.name,
					x: data.x,
					y: data.y,
					z: data.z,
					width: data.width,
					height: data.height,
					depth: data.depth,
					userId: data.userId,
					alpha: data.alpha,
					inside: data.inside,
				});
		}

		inGameEditor.updateRegionInReact && !window.isStandalone && inGameEditor.updateRegionInReact(data);
	}

	editVariable(data: Record<string, VariableData>, clientId: string): void {
		// only allow developers to modify initial entities
		if (taro.server.developerClientIds.includes(clientId)) {
			Object.entries(data).forEach(([key, variable]) => {
				if (variable.dataType === 'region') {
					const regionData: RegionData = { name: key };

					if (variable.newKey) regionData.newKey = variable.newKey;
					if (!isNaN(variable.value?.x)) regionData.x = variable.value.x;
					if (!isNaN(variable.value?.y)) regionData.y = variable.value.y;
					if (!isNaN(variable.value?.z)) regionData.z = variable.value.z;

					if (!isNaN(variable.value?.width)) regionData.width = variable.value.width;
					if (!isNaN(variable.value?.height)) regionData.height = variable.value.height;
					if (!isNaN(variable.value?.depth)) regionData.depth = variable.value.depth;

					if (variable.value?.inside || variable.value?.inside === '') regionData.inside = variable.value.inside;
					if (variable.value?.alpha) regionData.alpha = variable.value.alpha;
					if (variable.value?.create) regionData.create = variable.value.create;
					if (variable.delete) regionData.delete = variable.delete;

					this.editRegion(regionData, clientId);
				} else {
					//editing existing variable
					if (taro.game.data.variables[key]) {
						//deleting variable
						if (variable.delete) {
							delete taro.game.data.variables[key];
							//renaming variable
						} else if (variable.newKey) {
							taro.game.data.variables[variable.newKey] = taro.game.data.variables[key];
							delete taro.game.data.variables[key];
							//editing variable
						} else {
							taro.game.data.variables[key].value = variable.value;
						}
						//creating new variable
					} else {
						taro.game.data.variables[key] = {
							dataType: variable.dataType,
							value: variable.value,
						};
					}
				}
			});
			// broadcast region change to all clients
			taro.network.send<any>('editVariable', data);
		}
	}

	editInitEntity(data, clientId: string): void {
		// only allow developers to modify initial entities
		if (taro.server.developerClientIds.includes(clientId)) {
			// broadcast init entity change to all clients
			taro.network.send('editInitEntity', data);
			if (!this.initEntities) {
				this.addInitEntities();
			}
			let found = false;
			this.initEntities.forEach((action) => {
				if (action.actionId === data.actionId) {
					found = true;
					if (data.wasEdited) action.wasEdited = true;
					if (
						data.position &&
						!isNaN(data.position.x) &&
						!isNaN(data.position.y) &&
						action.position &&
						!isNaN(action.position.x) &&
						!isNaN(action.position.y)
					) {
						action.position = data.position;
					}
					if (!isNaN(data.angle) && !isNaN(action.angle)) {
						action.angle = data.angle;
					}
					if (
						data.rotation &&
						!isNaN(data.rotation.x) &&
						!isNaN(data.rotation.y) &&
						!isNaN(data.rotation.z) &&
						((action.rotation && !isNaN(action.rotation.x) && !isNaN(action.rotation.y) && !isNaN(action.rotation.z)) ||
							action.angle)
					) {
						action.rotation = data.rotation;
					}
					if (
						data.scale &&
						!isNaN(data.scale.x) &&
						!isNaN(data.scale.y) &&
						!isNaN(data.scale.z) &&
						((action.scale && !isNaN(action.scale.x) && !isNaN(action.scale.y) && !isNaN(action.scale.z)) ||
							action.width ||
							action.height)
					) {
						action.scale = data.scale;
					}
					if (!isNaN(data.width) && !isNaN(action.width)) {
						action.width = data.width;
					}
					if (!isNaN(data.height) && !isNaN(action.height)) {
						action.height = data.height;
					}
					if (data.wasDeleted) {
						action.wasDeleted = true;
					}
				}
			});
			if (!found) {
				this.initEntities.push(data);
			}
		}
	}

	editGlobalScripts(data: ScriptChangesData, clientId: string): void {
		// only allow developers to modify global scripts
		if (taro.server.developerClientIds.includes(clientId)) {
			data.clientId = clientId;
			taro.network.send('editGlobalScripts', data);
			if (data.action === 'apply') {
				taro.script.load(data.scriptData, true);
				taro.script.scriptCache = {};
			}
		}
	}

	createUnit(data) {
		//const player = taro.game.getPlayerByClientId(clientId);
		let player;
		taro.$$('player').forEach((p) => {
			if (p.id() === data.playerId) player = p;
		});
		const unitTypeId = data.typeId;
		const unitTypeData = taro.game.cloneAsset('unitTypes', unitTypeId);
		const spawnPosition = data.position;
		const facingAngle = data.angle;

		if (player && spawnPosition && unitTypeId && unitTypeData) {
			const unitData = Object.assign(unitTypeData, {
				type: unitTypeId,
				defaultData: {
					translate: spawnPosition,
					rotate: facingAngle,
				},
			});
			const unit = player.createUnit(unitData);
			taro.game.lastCreatedUnitId = unit.id();
		}
	}

	updateUnit(data) {
		// 1. broadcast update to all players
		// 2. force update its dimension/scale/layer/image
		if (taro.game.data.unitTypes[data.typeId]) {
			if (data.valueType === 'script') {
				taro.game.data.unitTypes[data.typeId].scripts = rfdc()(data.newData.scripts);
			} else if (data.valueType === 'property') {
				const oldScripts = rfdc()(taro.game.data.unitTypes[data.typeId].scripts);
				taro.game.data.unitTypes[data.typeId] = rfdc()(data.newData);
				taro.game.data.unitTypes[data.typeId].scripts = oldScripts;
			}
		} else {
			taro.game.data.unitTypes[data.typeId] = rfdc()(data.newData);
		}

		taro.$$('unit').forEach((unit) => {
			if (unit._stats.type === data.typeId) {
				unit.changeUnitType(data.typeId, {}, false);
				unit.emit('update-texture', 'basic_texture_change');
				if (data.shouldReset) unit.resetUnitType();
			}
		});
		if (taro.isServer) {
			taro.network.send('updateUnit', data);
		} else {
			inGameEditor.updateEntity?.(data);
		}
	}

	resetUnit(data) {
		taro.$$('unit').forEach((unit) => {
			if (unit._stats.type === data.typeId) {
				unit.resetUnitType();
			}
		});
	}

	deleteUnit(data) {
		taro.$$('unit').forEach((unit) => {
			if (unit._stats.type === data.typeId) {
				unit.destroy();
			}
		});
	}

	createItem(data) {
		const itemTypeId = data.typeId;
		const itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
		const position = data.position;
		const facingAngle = data.angle;
		let quantity = itemData.maxQuantity;

		if (quantity == -1) {
			quantity = null;
		}

		if (itemData) {
			itemData.itemTypeId = itemTypeId;
			itemData.isHidden = false;
			itemData.stateId = 'dropped';
			itemData.spawnPosition = position;
			itemData.quantity = quantity;
			itemData.defaultData = {
				translate: position,
				rotate: facingAngle,
			};
			var item = new Item(itemData);
			taro.game.lastCreatedUnitId = item._id;
			item.script.trigger('thisEntityIsCreated');
		}
	}

	updateItem(data) {
		// 1. broadcast update to all players
		// 2. force update its dimension/scale/layer/image
		// 3. we may need to re-mount the item on unit
		if (taro.game.data.itemTypes[data.typeId]) {
			if (data.valueType === 'script') {
				taro.game.data.itemTypes[data.typeId].scripts = rfdc()(data.newData.scripts);
			} else if (data.valueType === 'property') {
				const oldScripts = rfdc()(taro.game.data.itemTypes[data.typeId].scripts);
				taro.game.data.itemTypes[data.typeId] = rfdc()(data.newData);
				taro.game.data.itemTypes[data.typeId].scripts = oldScripts;
			}
		} else {
			taro.game.data.itemTypes[data.typeId] = rfdc()(data.newData);
		}

		taro.$$('item').forEach((item) => {
			if (item._stats.itemTypeId === data.typeId) {
				item.changeItemType(data.typeId, {}, false);
				item.emit('update-texture', 'basic_texture_change');
				if (data.shouldReset) item.resetItemType();
			}
		});
		if (taro.isServer) {
			taro.network.send('updateItem', data);
		} else {
			inGameEditor.updateEntity?.(data);
		}
	}

	resetItem(data) {
		taro.$$('item').forEach((item) => {
			if (item._stats.itemTypeId === data.typeId) {
				item.resetItemType();
			}
		});
	}

	deleteItem(data) {
		taro.$$('item').forEach((item) => {
			if (item._stats.type === data.typeId) {
				item.destroy();
			}
		});
	}

	createProjectile(data) {}

	updateProjectile(data) {
		// 1. broadcast update to all players
		// 2. force update its dimension/scale/layer/image
		if (taro.game.data.projectileTypes[data.typeId]) {
			if (data.valueType === 'script') {
				taro.game.data.projectileTypes[data.typeId].scripts = rfdc()(data.newData.scripts);
			} else if (data.valueType === 'property') {
				const oldScripts = rfdc()(taro.game.data.projectileTypes[data.typeId].scripts);
				taro.game.data.projectileTypes[data.typeId] = rfdc()(data.newData);
				taro.game.data.projectileTypes[data.typeId].scripts = oldScripts;
			}
		} else {
			taro.game.data.projectileTypes[data.typeId] = rfdc()(data.newData);
		}

		taro.$$('projectile').forEach((projectile) => {
			if (projectile._stats.type === data.typeId) {
				projectile.changeProjectileType(data.typeId, {}, false);
				projectile.emit('update-texture', 'basic_texture_change');
				if (data.shouldReset) projectile.resetProjectileType();
			}
		});
		if (taro.isServer) {
			taro.network.send('updateProjectile', data);
		} else {
			inGameEditor.updateEntity?.(data);
		}
	}

	resetProjectile(data) {
		taro.$$('projectile').forEach((projectile) => {
			if (projectile._stats.type === data.typeId) {
				projectile.resetProjectileType();
			}
		});
	}

	deleteProjectile(data) {
		taro.$$('projectile').forEach((projectile) => {
			if (projectile._stats.type === data.typeId) {
				projectile.destroy();
			}
		});
	}

	updateShop(data) {
		if (data.typeId && data.newData) {
			if (!taro.game.data.shops) {
				taro.game.data.shops = {};
			}
			taro.game.data.shops[data.typeId] = data.newData;
		}

		if (taro.isServer) {
			taro.network.send('updateShop', data);
		}
	}

	updateDialogue(data) {
		if (data.typeId && data.newData) {
			if (!taro.game.data.dialogues) {
				taro.game.data.dialogues = {};
			}
			taro.game.data.dialogues[data.typeId] = data.newData;
		}

		if (taro.isServer) {
			taro.network.send('updateDialogue', data);
		}
	}

	updateDevelopersData(data: EditEntityData) {
		if (taro.isServer) {
			(taro.server.developerClientIds || []).forEach((developerId) => {
				if (data.clientId !== developerId) {
					taro.network.send('updateDevelopersData', data, developerId);
				}
			});
		} else {
			inGameEditor.updateEntity?.(data);
		}
	}

	editEntity(data: EditEntityData, clientId?: string) {
		if (taro.isClient) {
			taro.network.send<any>('editEntity', data);
		} else {
			if (data) {
				data.clientId = clientId;
			}
			// only allow developers to modify entities
			if (taro.server.developerClientIds.includes(clientId)) {
				if (data.entityType === 'unitTypes') {
					switch (data.action) {
						case 'create':
							//this.createUnit(data);
							break;

						case 'update':
							this.updateUnit(data);
							break;

						case 'reset':
							this.resetUnit(data);
							break;

						case 'delete':
							//this.deleteUnit(data);
							break;

						case 'update-developers-data':
							this.updateDevelopersData(data);
							break;
					}
				} else if (data.entityType === 'itemTypes') {
					switch (data.action) {
						case 'create':
							//this.createItem(data);
							break;

						case 'update':
							this.updateItem(data);
							break;

						case 'reset':
							this.resetItem(data);
							break;

						case 'delete':
							//this.deleteItem(data);
							break;
					}
				} else if (data.entityType === 'projectileTypes') {
					switch (data.action) {
						case 'create':
							//this.createProjectile(data);
							break;

						case 'update':
							this.updateProjectile(data);
							break;

						case 'reset':
							this.resetProjectile(data);
							break;

						case 'delete':
							//this.deleteProjectile(data);
							break;
					}
				} else if (data.entityType === 'shops') {
					switch (data.action) {
						case 'update':
							this.updateShop(data);
							break;
						default:
							break;
					}
				} else if (data.entityType === 'dialogues') {
					switch (data.action) {
						case 'update':
							this.updateDialogue(data);
							break;
						default:
							break;
					}
				}
			}
		}
	}

	updateClientMap(data: { mapData: MapData }): void {
		// console.log('map data was edited', data.mapData.wasEdited);
		if (data.mapData.wasEdited) {
			data.mapData.wasEdited = false;
			data.mapData.haveUnsavedChanges = true;
			taro.game.data.map = data.mapData;
			if (taro.physics) {
				//if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
				taro.physics.destroyWalls();
				let map = taro.scaleMap(rfdc()(taro.game.data.map));
				taro.tiled.loadJson(map, function (layerArray, TaroLayersById) {
					taro.physics.staticsFromMap(TaroLayersById.walls);
					taro.client.emit('update-walls');
				});
			}
			taro.client.emit('updateMap');
		}
	}

	updateClientInitEntities(initEntities: ActionData[]) {
		this.initEntities = initEntities;
		taro.client.emit('updateInitEntities');
	}
}

type BasicEditProps = {
	layer: number;
	x: number;
	y: number;
	noMerge?: boolean;
};
type MapEditTool = {
	fill: {
		limits?: Record<number, Record<number, number>>;
		gid: number;
	} & BasicEditProps;

	edit: {
		size: Vector2D | 'fitContent';
		selectedTiles: Record<number, Record<number, number>>[];
		shape: Shape;
		layer: number[];
	} & Omit<BasicEditProps, 'layer'>;

	clear: {
		layer: number;
		layerName?: string;
	};
};

/**
 * MergedTemplate
 * a template for merging data in debounce func to improve performance
 *
 * @experimental
 *
 * @example
 * if u want to let debounce func auto merged input data, u need to give it a template to tell it how to handle it.
 *
 * const mergedTemplate: MergedTemplate<TileData<'edit'>> = {
	edit: {
		size: { calc: 'set', method: 'direct' },
		selectedTiles: {
			calc: (oldData: TileData<'edit'>['edit'], newData: TileData<'edit'>['edit'], nowData: [Record<number, Record<number, number>>]) => {
				// console.log(oldData, newData, nowData);
				const newLayer = newData.layer[0]
				if (!oldData.layer?.includes(newLayer)) {
					nowData.push(...newData.selectedTiles)
				} else {
					const idx = oldData.layer.findIndex((v) => v === newLayer)
					setObject(nowData[idx], newData.selectedTiles[0])
				}
			}, method: 'direct'
		},
		shape: { calc: 'set', method: 'direct' },
		layer: { calc: 'sum', method: 'array' },
		x: { calc: 'init', method: 'direct' },
		y: { calc: 'init', method: 'direct' },
	}
};
 * @see debounce
 *
 */
type MergedTemplate<T> = {
	[K in keyof T]: T[K] extends object ? MergedTemplate<T[K]> | MergedOperation : MergedOperation;
};

/**
 * if 'direct', then it will direct do something to the original object
 *
 * if 'array', then it will handle it as array to push or do other things
 * @see debounce
 */
type MergedMethod = 'direct' | 'array';

/**
 * 'set' will auto set the value
 *
 * 'sum' will add the old value with new value
 *
 * ...
 *
 * 'smartSet' is for object, if a = {0: {0: 1 }}, b = {1: {0: 1}}, the mergedObj will be {0: {0: 1 }, 1: {0: 1}}, not {1: {0: 1}} directly
 *
 * 'init' will only set it once
 */
type MergedCalc =
	| 'set'
	| 'sum'
	| 'sub'
	| 'mul'
	| 'div'
	| 'smartSet'
	| 'init'
	| ((oldData: any, newData: any, nowData: any) => any);
type MergedOperation = { method: MergedMethod; calc: MergedCalc };

type MapEditToolEnum = keyof MapEditTool;

type TileData<T extends MapEditToolEnum> = Pick<MapEditTool, T>;

interface RegionVector3 {
	x: number;
	y?: number;
	z?: number;
}

interface RegionData {
	userId?: string;
	position?: RegionVector3;
	scale?: RegionVector3;
	name: string;
	newKey?: string;
	x?: number;
	y?: number;
	z?: number;
	width?: number;
	height?: number;
	depth?: number;
	inside?: string;
	alpha?: number;
	create?: boolean;
	delete?: boolean;
	showModal?: boolean;
}

interface EditEntityData {
	action: string;
	entityType: string;
	typeId: string;
	valueType?: string;
	newData?: any; //EntityStats,
	playerId?: string;
	position?: { x: number; y: number };
	angle?: number;
	clientId?: string;
	extraData?: {
		[key: string]: any;
	};
}

type devModeTab = 'play' | 'map' | 'entities' | 'moderate' | 'debug';

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = DeveloperMode;
}
