class DeveloperMode {
	active: boolean;
	activeTab: devModeTab;

	initEntities: ActionData[];

	constructor() {
		if (taro.isClient) this.active = false;
	}

	addInitEntities(): void {
		// add id for actions creating entities in initialize script
		this.initEntities = [];
		Object.values(taro.game.data.scripts).forEach((script) => {
			if (script.triggers?.[0]?.type === 'gameStart') {
				Object.values(script.actions).forEach((action) => {
					if (!action.disabled && action.position?.function === 'xyCoordinate'
						&& !isNaN(action.position?.x) && !isNaN(action.position?.y)
						&& !isNaN(action.width) && !isNaN(action.height) && !isNaN(action.angle)) {
						if ((action.type === 'createEntityForPlayerAtPositionWithDimensions'
							|| action.type === 'createEntityAtPositionWithDimensions'
							|| action.type === 'createUnitForPlayerAtPosition')
							&& !isNaN(action.width) && !isNaN(action.height) && !isNaN(action.angle)) {
							if (action.actionId) this.initEntities.push(action);
						} else if ((action.type === 'createUnitAtPosition'
							|| action.type === 'createProjectileAtPosition')
							&& !isNaN(action.angle)) {
							if (action.actionId) this.initEntities.push(action);
						} else if (action.type === 'spawnItem' || action.type === 'createItemWithMaxQuantityAtPosition') {
							if (action.actionId) this.initEntities.push(action);
						}
					}
				});
			}
		});
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
			taro.client.emit('enterMapTab');
		} else {
			taro.client.emit('leaveMapTab');
		}
		if (tab === 'play') {
			taro.client.emit('lockCamera');
		} else if (this.activeTab === 'play') {
			taro.client.emit('unlockCamera');
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
			gameMap.wasEdited = true;
			taro.network.send('editTile', data);
			const { dataType, dataValue } = Object.entries(data).map(([k, dataValue]) => {
				const dataType = k as MapEditToolEnum; return { dataType, dataValue };
			})[0];
			const serverData = _.clone(dataValue);
			if (gameMap.layers.length > 4 && serverData.layer >= 2) serverData.layer++;
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
					this.putTiles(nowValue.x, nowValue.y, nowValue.selectedTiles, nowValue.size, nowValue.shape, nowValue.layer);
					break;
				}
				case 'clear': {
					const nowValue = serverData as TileData<'clear'>['clear'];
					this.clearLayer(nowValue.layer);
				}
			}

			if (gameMap.layers[serverData.layer].name === 'walls') {
				//if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
				taro.physics.destroyWalls();
				let map = taro.scaleMap(_.cloneDeep(gameMap));
				taro.tiled.loadJson(map, function (layerArray, layersById) {
					taro.physics.staticsFromMap(layersById.walls);
				});
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
	putTiles(tileX: number, tileY: number, selectedTiles: Record<number, Record<number, number>>, brushSize: Vector2D, shape: Shape, layer: number): void {
		const map = taro.game.data.map;
		const width = map.width;
		const sample = this.calcSample(selectedTiles, brushSize, shape);
		if (map.layers[layer]) {
			for (let x = 0; x < brushSize.x; x++) {
				for (let y = 0; y < brushSize.y; y++) {
					if (sample[x] && sample[x][y] !== undefined && this.pointerInsideMap(x + tileX, y + tileY, map)) {
						let index = sample[x][y];
						if (index === -1) index = 0;
						map.layers[layer].data[x + tileX + (y + tileY) * width] = index;
						taro.map.data.layers[layer].data[x + tileX + (y + tileY) * width] = index;
					}
				}
			}
		}
	}

	pointerInsideMap(pointerX: number, pointerY: number, map: { width: number, height: number }): boolean {
		return (0 <= pointerX && pointerX < map.width
			&& 0 <= pointerY && pointerY < map.height);
	}

	/**
	 * calc the sample to print
	 * @param selectedTileArea selectedTiles
	 * @param size brush's size
	 * @returns sample to print
	 */
	calcSample(selectedTileArea: Record<number, Record<number, number>>, size: Vector2D, shape?: Shape): Record<number, Record<number, number>> {
		const xArray = Object.keys(selectedTileArea);
		const yArray = Object.values(selectedTileArea).map((object) => Object.keys(object)).flat().sort((a, b) => parseInt(a) - parseInt(b));
		const minX = parseInt(xArray[0]);
		const minY = parseInt(yArray[0]);
		const maxX = parseInt(xArray[xArray.length - 1]);
		const maxY = parseInt(yArray[yArray.length - 1]);
		const xLength = maxX - minX + 1;
		const yLength = maxY - minY + 1;
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
		return tempSample;
	}


	floodTiles(layer: number, oldTile: number, newTile: number, x: number, y: number, limits?: Record<number, Record<number, number>>): void {
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
			if (oldTile === newTile
				|| map.layers[layer].data[nowPos.y * width + nowPos.x] !== oldTile
				|| limits?.[nowPos.x]?.[nowPos.y]) {
				continue;
			}
			//save tile change to taro.game.data.map and taro.map.data
			map.layers[layer].data[nowPos.y * width + nowPos.x] = newTile;
			taro.map.data.layers[layer].data[nowPos.y * width + nowPos.x] = newTile;
			if (nowPos.x > 0 && !closedQueue[nowPos.x - 1]?.[nowPos.y]) {
				openQueue.push({ x: nowPos.x - 1, y: nowPos.y });
			}
			if (nowPos.x < (map.width - 1) && !closedQueue[nowPos.x + 1]?.[nowPos.y]) {
				openQueue.push({ x: nowPos.x + 1, y: nowPos.y });
			}
			if (nowPos.y > 0 && !closedQueue[nowPos.x]?.[nowPos.y - 1]) {
				openQueue.push({ x: nowPos.x, y: nowPos.y - 1 });
			}
			if (nowPos.y < (map.height - 1) && !closedQueue[nowPos.x]?.[nowPos.y + 1]) {
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

	editRegion(data: RegionData, clientId: string): void {
		// only allow developers to modify regions
		if (taro.server.developerClientIds.includes(clientId)) {
			if (data.name === '' || data.width <= 0 || data.height <= 0) {
				console.log('empty name, negative or 0 size is not allowed');
			} else if (data.name === undefined) { // create new region
				// create new region name (smallest available number)
				let regionNameNumber = 0;
				let newRegionName = `region${regionNameNumber}`;
				do {
					regionNameNumber++;
					newRegionName = `region${regionNameNumber}`;
				} while (taro.regionManager.getRegionById(newRegionName));

				data.name = newRegionName;
				data.showModal = true;
				data.userId = taro.game.getPlayerByClientId(clientId)._stats.userId;
				// changed to Region from RegionUi
				const regionData = {
					dataType: 'region',
					default: {
						x: data.x,
						y: data.y,
						width: data.width,
						height: data.height,
						key: newRegionName
					},
					id: newRegionName,
					value: {
						x: data.x,
						y: data.y,
						width: data.width,
						height: data.height,
						key: newRegionName
					}
				};
				const region = new Region(regionData);

				// create new region in game.data
				taro.regionManager.updateRegionToDatabase(regionData);

			} else { // modify existing region
				const region = taro.regionManager.getRegionById(data.name);
				if (region) {
					if (data.delete) {
						region.destroy();
					} else {
						if (data.name !== data.newName) {
							if (taro.regionManager.getRegionById(data.newName)) {
								console.log('This name is unavailable');
							} else {
								region._stats.id = data.newName;
							}
						}
						let statsData = [
							{ x: data.x !== region._stats.default.x ? data.x : null },
							{ y: data.y !== region._stats.default.y ? data.y : null },
							{ width: data.width !== region._stats.default.width ? data.width : null },
							{ height: data.height !== region._stats.default.height ? data.height : null }
						];
						statsData = statsData.filter(obj => obj[Object.keys(obj)[0]] !== null);
						region.streamUpdateData(statsData);
					}
				}
			}
			// broadcast region change to all clients
			taro.network.send<any>('editRegion', data);
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
					if (data.position && data.position.x && data.position.y &&
						action.position && action.position.x && action.position.y) {
						action.position = data.position;
					}
					if (data.angle && action.angle) {
						action.angle = data.angle;
					}
                    if (data.width && action.width) {
                        action.width = data.width;
                    }
                    if (data.height && action.height) {
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

	createUnit(data) {
		//const player = taro.game.getPlayerByClientId(clientId);
		let player;
		taro.$$('player').forEach(p => {
			if (p.id() === data.playerId) player = p;
		});
		const unitTypeId = data.typeId;
		const unitTypeData = taro.game.getAsset('unitTypes', unitTypeId);
		const spawnPosition = data.position;
		const facingAngle = data.angle;

		if (player && spawnPosition && unitTypeId && unitTypeData) {
			const unitData = Object.assign(
				unitTypeData,
				{
					type: unitTypeId,
					defaultData: {
						translate: spawnPosition,
						rotate: facingAngle
					}
				}
			);
			const unit = player.createUnit(unitData);
			taro.game.lastCreatedUnitId = unit.id();
		}
	}

	updateUnit(data) {
		// 1. broadcast update to all players
		// 2. force update its dimension/scale/layer/image
		taro.game.data.unitTypes[data.typeId] = data.newData;
		taro.$$('unit').forEach(unit => {
			if (unit._stats.type === data.typeId) {
				for (let i = 0; i < unit._stats.itemIds.length; i++) {
					var itemId = unit._stats.itemIds[i];
					var item = taro.$(itemId);
					if (item) {
						item.remove();
					}
				}
				unit.changeUnitType(data.typeId, {}, false);
				unit.emit('update-texture', 'basic_texture_change');
			}
		});
		if (taro.isServer) {
			taro.network.send('updateUnit', data);
		}
	}

	deleteUnit(data) {
		taro.$$('unit').forEach(unit => {
			if (unit._stats.type === data.typeId) {
				unit.destroy();
			}
		});
	}

	createItem(data) {
		const itemTypeId = data.typeId;
		const itemData = taro.game.getAsset('itemTypes', itemTypeId);
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
				rotate: facingAngle
			};
			var item = new Item(itemData);
			taro.game.lastCreatedUnitId = item._id;
			item.script.trigger('entityCreated');
		}
	}

	updateItem(data) {
		// 1. broadcast update to all players
		// 2. force update its dimension/scale/layer/image
		// 3. we may need to re-mount the item on unit
		taro.game.data.itemTypes[data.typeId] = data.newData;
		taro.$$('item').forEach(item => {
			if (item._stats.itemTypeId === data.typeId) {
				item.changeItemType(data.typeId, {}, false);
				item.emit('update-texture', 'basic_texture_change');
			}
		});
		if (taro.isServer) {
			taro.network.send('updateItem', data);
		}
	}

	deleteItem(data) {
		taro.$$('item').forEach(item => {
			if (item._stats.type === data.typeId) {
				item.destroy();
			}
		});
	}

	createProjectile(data) {

	}

	updateProjectile(data) {
		// 1. broadcast update to all players
		// 2. force update its dimension/scale/layer/image
		taro.game.data.projectileTypes[data.typeId] = data.newData;
		taro.$$('projectile').forEach(projectile => {
			if (projectile._stats.type === data.typeId) {
				projectile.changeProjectileType(data.typeId, {}, false);
				projectile.emit('update-texture', 'basic_texture_change');
			}
		});
		if (taro.isServer) {
			taro.network.send('updateProjectile', data);
		}
	}

	deleteProjectile(data) {
		taro.$$('projectile').forEach(projectile => {
			if (projectile._stats.type === data.typeId) {
				projectile.destroy();
			}
		});
	}


	editEntity(data: EditEntityData, clientId: string) {
		if (taro.isClient) {
			taro.network.send<any>('editEntity', data);
		} else {
			// only allow developers to modify entities
			if (taro.server.developerClientIds.includes(clientId)) {
				if (data.entityType === 'unit') {
					switch (data.action) {
						case 'create':
							//this.createUnit(data);
							break;

						case 'update':
							this.updateUnit(data);
							break;

						case 'delete':
							//this.deleteUnit(data);
							break;
					}
				} else if (data.entityType === 'item') {
					switch (data.action) {
						case 'create':
							//this.createItem(data);
							break;

						case 'update':
							this.updateItem(data);
							break;

						case 'delete':
							//this.deleteItem(data);
							break;
					}
				} else if (data.entityType === 'projectile') {
					switch (data.action) {
						case 'create':
							//this.createProjectile(data);
							break;

						case 'update':
							this.updateProjectile(data);
							break;

						case 'delete':
							//this.deleteProjectile(data);
							break;
					}
				}
			}
		}
	}

	updateClientMap(data: { mapData: MapData }): void {
		//console.log ('map data was edited', data.mapData.wasEdited);
		if (data.mapData.wasEdited) {
			data.mapData.wasEdited = false;
			data.mapData.haveUnsavedChanges = true;
			taro.game.data.map = data.mapData;
			if (taro.physics) {
				//if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
				taro.physics.destroyWalls();
				let map = taro.scaleMap(_.cloneDeep(taro.game.data.map));
				taro.tiled.loadJson(map, function (layerArray, TaroLayersById) {
					taro.physics.staticsFromMap(TaroLayersById.walls);
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
	layer: number,
	x: number,
	y: number,
}
type MapEditTool = {
	fill: {
		limits?: Record<number, Record<number, number>>,
		gid: number;
	} & BasicEditProps,

	edit: {
		size: Vector2D,
		selectedTiles: Record<number, Record<number, number>>,
		shape: Shape,
	} & BasicEditProps

	clear: {
		layer: number;
	}
}

type MapEditToolEnum = keyof MapEditTool;

type TileData<T extends MapEditToolEnum> = Pick<MapEditTool, T>

interface RegionData {
	userId?: string,
	name: string,
	newName?: string,
	x?: number,
	y?: number,
	width?: number,
	height?: number,
	delete?: boolean,
	showModal?: boolean
}

interface EditEntityData {
	entityType: string,
	typeId: string,
	action: string,
	newData?: any, //EntityStats,
	playerId?: string,
	position?: { x: number, y: number },
	angle?: number,
}

type devModeTab = 'play' | 'map' | 'entities' | 'moderate' | 'debug';

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = DeveloperMode;
}
