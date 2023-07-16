var DeveloperMode = /** @class */ (function () {
    function DeveloperMode() {
        if (taro.isClient)
            this.active = false;
    }
    DeveloperMode.prototype.addInitEntities = function () {
        var _this = this;
        // add id for actions creating entities in initialize script
        this.initEntities = [];
        Object.values(taro.game.data.scripts).forEach(function (script) {
            var _a, _b;
            if (((_b = (_a = script.triggers) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.type) === 'gameStart') {
                Object.values(script.actions).forEach(function (action) {
                    var _a, _b, _c;
                    if (!action.disabled && ((_a = action.position) === null || _a === void 0 ? void 0 : _a.function) === 'xyCoordinate'
                        && !isNaN((_b = action.position) === null || _b === void 0 ? void 0 : _b.x) && !isNaN((_c = action.position) === null || _c === void 0 ? void 0 : _c.y)
                        && !isNaN(action.width) && !isNaN(action.height) && !isNaN(action.angle)) {
                        if ((action.type === 'createEntityForPlayerAtPositionWithDimensions'
                            || action.type === 'createEntityAtPositionWithDimensions'
                            || action.type === 'createUnitForPlayerAtPosition')
                            && !isNaN(action.width) && !isNaN(action.height) && !isNaN(action.angle)) {
                            if (action.actionId)
                                _this.initEntities.push(action);
                        }
                        else if ((action.type === 'createUnitAtPosition'
                            || action.type === 'createProjectileAtPosition')
                            && !isNaN(action.angle)) {
                            if (action.actionId)
                                _this.initEntities.push(action);
                        }
                        else if (action.type === 'spawnItem' || action.type === 'createItemWithMaxQuantityAtPosition') {
                            if (action.actionId)
                                _this.initEntities.push(action);
                        }
                    }
                });
            }
        });
    };
    DeveloperMode.prototype.requestInitEntities = function () {
        if (this.initEntities) {
            taro.network.send('updateClientInitEntities', this.initEntities);
        }
    };
    DeveloperMode.prototype.enter = function () {
        console.log('client enter developer mode');
        this.active = true;
        this.changeTab('play');
    };
    DeveloperMode.prototype.leave = function () {
        console.log('client leave developer mode');
        this.active = false;
    };
    DeveloperMode.prototype.changeTab = function (tab) {
        if (tab === 'map') {
            taro.client.emit('enterMapTab');
        }
        else {
            taro.client.emit('leaveMapTab');
        }
        if (tab === 'play') {
            taro.client.emit('lockCamera');
        }
        else if (this.activeTab === 'play') {
            taro.client.emit('unlockCamera');
        }
        this.activeTab = tab;
    };
    DeveloperMode.prototype.shouldPreventKeybindings = function () {
        return this.activeTab && this.activeTab !== 'play';
    };
    DeveloperMode.prototype.editTile = function (data, clientId) {
        // only allow developers to modify the tiles
        if (taro.server.developerClientIds.includes(clientId) || clientId === 'server') {
            if (JSON.stringify(data) === '{}') {
                throw 'receive: {}';
            }
            var gameMap = taro.game.data.map;
            gameMap.wasEdited = true;
            taro.network.send('editTile', data);
            var _a = Object.entries(data).map(function (_a) {
                var k = _a[0], dataValue = _a[1];
                var dataType = k;
                return { dataType: dataType, dataValue: dataValue };
            })[0], dataType = _a.dataType, dataValue = _a.dataValue;
            var serverData = _.clone(dataValue);
            if (gameMap.layers.length > 4 && serverData.layer >= 2)
                serverData.layer++;
            var width = gameMap.width;
            switch (dataType) {
                case 'fill': {
                    var nowValue = serverData;
                    var oldTile = gameMap.layers[nowValue.layer].data[nowValue.y * width + nowValue.x];
                    this.floodTiles(nowValue.layer, oldTile, nowValue.gid, nowValue.x, nowValue.y, nowValue.limits);
                    break;
                }
                case 'edit': {
                    //save tile change to taro.game.data.map and taro.map.data
                    var nowValue = serverData;
                    this.putTiles(nowValue.x, nowValue.y, nowValue.selectedTiles, nowValue.size, nowValue.shape, nowValue.layer);
                    break;
                }
                case 'clear': {
                    var nowValue = serverData;
                    this.clearLayer(nowValue.layer);
                }
            }
            if (gameMap.layers[serverData.layer].name === 'walls') {
                //if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
                taro.physics.destroyWalls();
                var map = taro.scaleMap(_.cloneDeep(gameMap));
                taro.tiled.loadJson(map, function (layerArray, layersById) {
                    taro.physics.staticsFromMap(layersById.walls);
                });
            }
        }
    };
    /**
     * put tiles
     * @param tileX pointerTileX
     * @param tileY pointerTileY
     * @param selectedTiles selectedTiles
     * @param brushSize brush's size
     * @param layer map's layer
     */
    DeveloperMode.prototype.putTiles = function (tileX, tileY, selectedTiles, brushSize, shape, layer) {
        var map = taro.game.data.map;
        var width = map.width;
        var sample = this.calcSample(selectedTiles, brushSize, shape);
        if (map.layers[layer]) {
            for (var x = 0; x < brushSize.x; x++) {
                for (var y = 0; y < brushSize.y; y++) {
                    if (sample[x] && sample[x][y] !== undefined && this.pointerInsideMap(x + tileX, y + tileY, map)) {
                        var index = sample[x][y];
                        if (index === -1)
                            index = 0;
                        map.layers[layer].data[x + tileX + (y + tileY) * width] = index;
                        taro.map.data.layers[layer].data[x + tileX + (y + tileY) * width] = index;
                    }
                }
            }
        }
    };
    DeveloperMode.prototype.pointerInsideMap = function (pointerX, pointerY, map) {
        return (0 <= pointerX && pointerX < map.width
            && 0 <= pointerY && pointerY < map.height);
    };
    /**
     * calc the sample to print
     * @param selectedTileArea selectedTiles
     * @param size brush's size
     * @returns sample to print
     */
    DeveloperMode.prototype.calcSample = function (selectedTileArea, size, shape) {
        var xArray = Object.keys(selectedTileArea);
        var yArray = Object.values(selectedTileArea).map(function (object) { return Object.keys(object); }).flat().sort(function (a, b) { return parseInt(a) - parseInt(b); });
        var minX = parseInt(xArray[0]);
        var minY = parseInt(yArray[0]);
        var maxX = parseInt(xArray[xArray.length - 1]);
        var maxY = parseInt(yArray[yArray.length - 1]);
        var xLength = maxX - minX + 1;
        var yLength = maxY - minY + 1;
        var tempSample = {};
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
    };
    DeveloperMode.prototype.floodTiles = function (layer, oldTile, newTile, x, y, limits) {
        var _a, _b, _c, _d, _e, _f;
        var map = taro.game.data.map;
        var width = map.width;
        var openQueue = [{ x: x, y: y }];
        var closedQueue = {};
        while (openQueue.length !== 0) {
            var nowPos = openQueue[0];
            openQueue.shift();
            if ((_a = closedQueue[nowPos.x]) === null || _a === void 0 ? void 0 : _a[nowPos.y]) {
                continue;
            }
            if (!closedQueue[nowPos.x]) {
                closedQueue[nowPos.x] = {};
            }
            closedQueue[nowPos.x][nowPos.y] = 1;
            if (oldTile === newTile
                || map.layers[layer].data[nowPos.y * width + nowPos.x] !== oldTile
                || ((_b = limits === null || limits === void 0 ? void 0 : limits[nowPos.x]) === null || _b === void 0 ? void 0 : _b[nowPos.y])) {
                continue;
            }
            //save tile change to taro.game.data.map and taro.map.data
            map.layers[layer].data[nowPos.y * width + nowPos.x] = newTile;
            taro.map.data.layers[layer].data[nowPos.y * width + nowPos.x] = newTile;
            if (nowPos.x > 0 && !((_c = closedQueue[nowPos.x - 1]) === null || _c === void 0 ? void 0 : _c[nowPos.y])) {
                openQueue.push({ x: nowPos.x - 1, y: nowPos.y });
            }
            if (nowPos.x < (map.width - 1) && !((_d = closedQueue[nowPos.x + 1]) === null || _d === void 0 ? void 0 : _d[nowPos.y])) {
                openQueue.push({ x: nowPos.x + 1, y: nowPos.y });
            }
            if (nowPos.y > 0 && !((_e = closedQueue[nowPos.x]) === null || _e === void 0 ? void 0 : _e[nowPos.y - 1])) {
                openQueue.push({ x: nowPos.x, y: nowPos.y - 1 });
            }
            if (nowPos.y < (map.height - 1) && !((_f = closedQueue[nowPos.x]) === null || _f === void 0 ? void 0 : _f[nowPos.y + 1])) {
                openQueue.push({ x: nowPos.x, y: nowPos.y + 1 });
            }
        }
    };
    DeveloperMode.prototype.clearLayer = function (layer) {
        var map = taro.game.data.map;
        var width = map.width;
        for (var i = 0; i < map.width; i++) {
            for (var j = 0; j < map.height; j++) {
                if (map.layers[layer].data[j * width + i] !== 0) {
                    //save tile change to taro.game.map.data
                    map.layers[layer].data[j * width + i] = 0;
                }
            }
        }
    };
    DeveloperMode.prototype.editRegion = function (data, clientId) {
        // only allow developers to modify regions
        if (taro.server.developerClientIds.includes(clientId)) {
            if (data.name === '' || data.width <= 0 || data.height <= 0) {
                console.log('empty name, negative or 0 size is not allowed');
            }
            else if (data.name === undefined) { // create new region
                // create new region name (smallest available number)
                var regionNameNumber = 0;
                var newRegionName = "region".concat(regionNameNumber);
                do {
                    regionNameNumber++;
                    newRegionName = "region".concat(regionNameNumber);
                } while (taro.regionManager.getRegionById(newRegionName));
                data.name = newRegionName;
                data.showModal = true;
                data.userId = taro.game.getPlayerByClientId(clientId)._stats.userId;
                // changed to Region from RegionUi
                var regionData = {
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
                var region = new Region(regionData);
                // create new region in game.data
                taro.regionManager.updateRegionToDatabase(regionData);
            }
            else { // modify existing region
                var region = taro.regionManager.getRegionById(data.name);
                if (region) {
                    if (data.delete) {
                        region.destroy();
                    }
                    else {
                        if (data.name !== data.newName) {
                            if (taro.regionManager.getRegionById(data.newName)) {
                                console.log('This name is unavailable');
                            }
                            else {
                                region._stats.id = data.newName;
                            }
                        }
                        var statsData = [
                            { x: data.x !== region._stats.default.x ? data.x : null },
                            { y: data.y !== region._stats.default.y ? data.y : null },
                            { width: data.width !== region._stats.default.width ? data.width : null },
                            { height: data.height !== region._stats.default.height ? data.height : null }
                        ];
                        statsData = statsData.filter(function (obj) { return obj[Object.keys(obj)[0]] !== null; });
                        region.streamUpdateData(statsData);
                    }
                }
            }
            // broadcast region change to all clients
            taro.network.send('editRegion', data);
        }
    };
    DeveloperMode.prototype.editInitEntity = function (data, clientId) {
        // only allow developers to modify initial entities
        if (taro.server.developerClientIds.includes(clientId)) {
            // broadcast init entity change to all clients
            taro.network.send('editInitEntity', data);
            if (!this.initEntities) {
                this.addInitEntities();
            }
            var found_1 = false;
            this.initEntities.forEach(function (action) {
                if (action.actionId === data.actionId) {
                    found_1 = true;
                    if (data.wasEdited)
                        action.wasEdited = true;
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
            if (!found_1) {
                this.initEntities.push(data);
            }
        }
    };
    DeveloperMode.prototype.createUnit = function (data) {
        //const player = taro.game.getPlayerByClientId(clientId);
        var player;
        taro.$$('player').forEach(function (p) {
            if (p.id() === data.playerId)
                player = p;
        });
        var unitTypeId = data.typeId;
        var unitTypeData = taro.game.getAsset('unitTypes', unitTypeId);
        var spawnPosition = data.position;
        var facingAngle = data.angle;
        if (player && spawnPosition && unitTypeId && unitTypeData) {
            var unitData = Object.assign(unitTypeData, {
                type: unitTypeId,
                defaultData: {
                    translate: spawnPosition,
                    rotate: facingAngle
                }
            });
            var unit = player.createUnit(unitData);
            taro.game.lastCreatedUnitId = unit.id();
        }
    };
    DeveloperMode.prototype.updateUnit = function (data) {
        // 1. broadcast update to all players
        // 2. force update its dimension/scale/layer/image
        taro.game.data.unitTypes[data.typeId] = data.newData;
        taro.$$('unit').forEach(function (unit) {
            if (unit._stats.type === data.typeId) {
                for (var i = 0; i < unit._stats.itemIds.length; i++) {
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
    };
    DeveloperMode.prototype.deleteUnit = function (data) {
        taro.$$('unit').forEach(function (unit) {
            if (unit._stats.type === data.typeId) {
                unit.destroy();
            }
        });
    };
    DeveloperMode.prototype.createItem = function (data) {
        var itemTypeId = data.typeId;
        var itemData = taro.game.getAsset('itemTypes', itemTypeId);
        var position = data.position;
        var facingAngle = data.angle;
        var quantity = itemData.maxQuantity;
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
    };
    DeveloperMode.prototype.updateItem = function (data) {
        // 1. broadcast update to all players
        // 2. force update its dimension/scale/layer/image
        // 3. we may need to re-mount the item on unit
        taro.game.data.itemTypes[data.typeId] = data.newData;
        taro.$$('item').forEach(function (item) {
            if (item._stats.itemTypeId === data.typeId) {
                item.changeItemType(data.typeId, {}, false);
                item.emit('update-texture', 'basic_texture_change');
            }
        });
        if (taro.isServer) {
            taro.network.send('updateItem', data);
        }
    };
    DeveloperMode.prototype.deleteItem = function (data) {
        taro.$$('item').forEach(function (item) {
            if (item._stats.type === data.typeId) {
                item.destroy();
            }
        });
    };
    DeveloperMode.prototype.createProjectile = function (data) {
    };
    DeveloperMode.prototype.updateProjectile = function (data) {
        // 1. broadcast update to all players
        // 2. force update its dimension/scale/layer/image
        taro.game.data.projectileTypes[data.typeId] = data.newData;
        taro.$$('projectile').forEach(function (projectile) {
            if (projectile._stats.type === data.typeId) {
                projectile.changeProjectileType(data.typeId, {}, false);
                projectile.emit('update-texture', 'basic_texture_change');
            }
        });
        if (taro.isServer) {
            taro.network.send('updateProjectile', data);
        }
    };
    DeveloperMode.prototype.deleteProjectile = function (data) {
        taro.$$('projectile').forEach(function (projectile) {
            if (projectile._stats.type === data.typeId) {
                projectile.destroy();
            }
        });
    };
    DeveloperMode.prototype.editEntity = function (data, clientId) {
        if (taro.isClient) {
            taro.network.send('editEntity', data);
        }
        else {
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
                }
                else if (data.entityType === 'item') {
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
                }
                else if (data.entityType === 'projectile') {
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
    };
    DeveloperMode.prototype.updateClientMap = function (data) {
        //console.log ('map data was edited', data.mapData.wasEdited);
        if (data.mapData.wasEdited) {
            data.mapData.wasEdited = false;
            data.mapData.haveUnsavedChanges = true;
            taro.game.data.map = data.mapData;
            if (taro.physics) {
                //if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
                taro.physics.destroyWalls();
                var map = taro.scaleMap(_.cloneDeep(taro.game.data.map));
                taro.tiled.loadJson(map, function (layerArray, TaroLayersById) {
                    taro.physics.staticsFromMap(TaroLayersById.walls);
                });
            }
            taro.client.emit('updateMap');
        }
    };
    DeveloperMode.prototype.updateClientInitEntities = function (initEntities) {
        this.initEntities = initEntities;
        taro.client.emit('updateInitEntities');
    };
    return DeveloperMode;
}());
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = DeveloperMode;
}
//# sourceMappingURL=DeveloperMode.js.map