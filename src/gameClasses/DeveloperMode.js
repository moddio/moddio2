/**
 * recursively set object parameters
 * @param oldObject
 * @param newObject
 */
function setObject(oldObject, newObject) {
    Object.keys(newObject).map(function (k) {
        if (!oldObject[k]) {
            oldObject[k] = {};
        }
        if (typeof newObject[k] === 'object') {
            setObject(oldObject[k], newObject[k]);
        }
        else {
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
function merge(oldData, newData, template) {
    Object.entries(template).map(function (_a) {
        var k = _a[0], v = _a[1];
        if (!v.calc && typeof v === 'object') {
            if (!oldData[k]) {
                oldData[k] = {};
            }
            merge(oldData[k], newData[k], template[k]);
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
        }
        else {
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
                    }
                    else {
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
                            newData[k].map(function (v) {
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
var mergedTemplate = {
    edit: {
        size: { calc: 'set', method: 'direct' },
        selectedTiles: {
            calc: function (oldData, newData, nowData) {
                var _a;
                // console.log(oldData, newData, nowData);
                var newLayer = newData.layer[0];
                if (!((_a = oldData.layer) === null || _a === void 0 ? void 0 : _a.includes(newLayer))) {
                    nowData.push.apply(nowData, newData.selectedTiles);
                }
                else {
                    var idx = oldData.layer.findIndex(function (v) { return v === newLayer; });
                    setObject(nowData[idx], newData.selectedTiles[0]);
                }
            }, method: 'direct'
        },
        shape: { calc: 'set', method: 'direct' },
        layer: { calc: 'sum', method: 'array' },
        x: { calc: 'init', method: 'direct' },
        y: { calc: 'init', method: 'direct' },
    }
};
function debounce(func, timeout, mergedTemplate) {
    var timer;
    var mergedData = [{}];
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        clearTimeout(timer);
        if (mergedTemplate) {
            args.map(function (v, idx) {
                merge(mergedData[0], v, mergedTemplate);
            });
        }
        else {
            if (Array.isArray(args)) {
                mergedData = args;
            }
            else {
                mergedData[0] = args;
            }
        }
        timer = setTimeout(function () {
            func.apply(void 0, mergedData);
            mergedData = [{}];
        }, timeout);
    };
}
function mergeSetWasEdited(gameMap) {
    gameMap.wasEdited = true;
}
function mergeEditTileActions(data) {
    taro.network.send('editTile', data);
}
var debounceSetWasEdited = debounce(mergeSetWasEdited, 0);
var debounceEditTileSend = debounce(mergeEditTileActions, 0, mergedTemplate);
function recalcWallsPhysics(gameMap, forPathFinding) {
    taro.physics.destroyWalls();
    var map = taro.scaleMap(rfdc()(gameMap));
    taro.tiled.loadJson(map, function (layerArray, layersById) {
        taro.physics.staticsFromMap(layersById.walls);
    });
    if (forPathFinding) {
        taro.map.updateWallMapData(); // for A* pathfinding
    }
}
var debounceRecalcPhysics = debounce(recalcWallsPhysics, 0);
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
        var _this = this;
        var _a;
        // only allow developers to modify the tiles
        if (taro.server.developerClientIds.includes(clientId) || clientId === 'server') {
            if (JSON.stringify(data) === '{}') {
                throw 'receive: {}';
            }
            var gameMap = taro.game.data.map;
            var _b = Object.entries(data).map(function (_a) {
                var k = _a[0], dataValue = _a[1];
                var dataType = k;
                return { dataType: dataType, dataValue: dataValue };
            })[0], dataType = _b.dataType, dataValue = _b.dataValue;
            var serverData = rfdc()(dataValue);
            if (dataType === 'edit' && !serverData.noMerge) {
                debounceSetWasEdited(gameMap);
                if (data.edit.size !== 'fitContent') {
                    taro.network.send('editTile', data);
                }
                else {
                    debounceEditTileSend(data);
                }
            }
            else {
                gameMap.wasEdited = true;
                taro.network.send('editTile', data);
            }
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
                    var nowValue_1 = serverData;
                    nowValue_1.selectedTiles.map(function (v, idx) {
                        _this.putTiles(nowValue_1.x, nowValue_1.y, v, nowValue_1.size, nowValue_1.shape, nowValue_1.layer);
                    });
                    break;
                }
                case 'clear': {
                    var nowValue = serverData;
                    this.clearLayer(nowValue.layer);
                }
            }
            if (((_a = gameMap.layers[serverData.layer]) === null || _a === void 0 ? void 0 : _a.name) === 'walls') {
                //if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
                if (serverData.noMerge) {
                    recalcWallsPhysics(gameMap, true);
                }
                else {
                    debounceRecalcPhysics(gameMap, true);
                }
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
        var calcData = this.calcSample(selectedTiles, brushSize, shape);
        var sample = calcData.sample;
        var size = brushSize === 'fitContent' ? { x: calcData.xLength, y: calcData.yLength } : brushSize;
        tileX = brushSize === 'fitContent' ? calcData.minX : tileX;
        tileY = brushSize === 'fitContent' ? calcData.minY : tileY;
        if (map.layers[layer]) {
            for (var x = 0; x < size.x; x++) {
                for (var y = 0; y < size.y; y++) {
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
        // console.log(selectedTileArea, minX, maxX, minY, maxY);
        var xLength = maxX - minX + 1;
        var yLength = maxY - minY + 1;
        if (size === 'fitContent') {
            size = {
                x: xLength,
                y: yLength
            };
        }
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
        return { sample: tempSample, xLength: xLength, yLength: yLength, minX: minX, minY: minY };
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
            if (newTile === -1) {
                newTile = 0;
            }
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
            else if (data.name === undefined || (data.create && !taro.regionManager.getRegionById(data.name))) { // create new region
                if (!data.name) {
                    // create new region name (smallest available number)
                    var regionNameNumber = 0;
                    var newRegionName = "region".concat(regionNameNumber);
                    do {
                        regionNameNumber++;
                        newRegionName = "region".concat(regionNameNumber);
                    } while (taro.regionManager.getRegionById(newRegionName));
                    data.name = newRegionName;
                    data.showModal = true;
                }
                data.userId = taro.game.getPlayerByClientId(clientId)._stats.userId;
                // changed to Region from RegionUi
                var regionData = {
                    dataType: 'region',
                    default: {
                        x: data.x,
                        y: data.y,
                        width: data.width,
                        height: data.height,
                        key: data.name,
                        alpha: data.alpha,
                        inside: data.inside
                    },
                    id: data.name,
                    value: {
                        x: data.x,
                        y: data.y,
                        width: data.width,
                        height: data.height,
                        key: data.name,
                        alpha: data.alpha,
                        inside: data.inside
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
                        if (data.name !== data.newKey) {
                            if (taro.regionManager.getRegionById(data.newKey)) {
                                console.log('This name is unavailable');
                            }
                            else {
                                region._stats.id = data.newKey;
                            }
                        }
                        var statsData = [
                            { x: data.x !== region._stats.default.x ? data.x : null },
                            { y: data.y !== region._stats.default.y ? data.y : null },
                            { width: data.width !== region._stats.default.width ? data.width : null },
                            { height: data.height !== region._stats.default.height ? data.height : null },
                            { alpha: data.alpha !== region._stats.default.alpha ? data.alpha : null },
                            { inside: data.inside !== region._stats.default.inside ? data.inside : null }
                        ];
                        statsData = statsData.filter(function (obj) { return obj[Object.keys(obj)[0]] !== null; });
                        if (data.inside === '')
                            statsData.push({ inside: '' });
                        region.streamUpdateData(statsData);
                    }
                }
            }
            // broadcast region change to all clients
            taro.network.send('editRegion', data);
        }
    };
    DeveloperMode.prototype.editVariable = function (data, clientId) {
        var _this = this;
        // only allow developers to modify initial entities
        if (taro.server.developerClientIds.includes(clientId)) {
            Object.entries(data).forEach(function (_a) {
                var _b, _c, _d, _e, _f, _g, _h, _j;
                var key = _a[0], variable = _a[1];
                if (variable.dataType === 'region') {
                    var regionData = { name: key };
                    if (variable.newKey)
                        regionData.newKey = variable.newKey;
                    if (!isNaN((_b = variable.value) === null || _b === void 0 ? void 0 : _b.x))
                        regionData.x = variable.value.x;
                    if (!isNaN((_c = variable.value) === null || _c === void 0 ? void 0 : _c.y))
                        regionData.y = variable.value.y;
                    if (!isNaN((_d = variable.value) === null || _d === void 0 ? void 0 : _d.width))
                        regionData.width = variable.value.width;
                    if (!isNaN((_e = variable.value) === null || _e === void 0 ? void 0 : _e.height))
                        regionData.height = variable.value.height;
                    if (((_f = variable.value) === null || _f === void 0 ? void 0 : _f.inside) || ((_g = variable.value) === null || _g === void 0 ? void 0 : _g.inside) === '')
                        regionData.inside = variable.value.inside;
                    if ((_h = variable.value) === null || _h === void 0 ? void 0 : _h.alpha)
                        regionData.alpha = variable.value.alpha;
                    if ((_j = variable.value) === null || _j === void 0 ? void 0 : _j.create)
                        regionData.create = variable.value.create;
                    if (variable.delete)
                        regionData.delete = variable.delete;
                    _this.editRegion(regionData, clientId);
                }
                else {
                    //editing existing variable
                    if (taro.game.data.variables[key]) {
                        //deleting variable
                        if (variable.delete) {
                            delete taro.game.data.variables[key];
                            //renaming variable
                        }
                        else if (variable.newKey) {
                            taro.game.data.variables[variable.newKey] = taro.game.data.variables[key];
                            delete taro.game.data.variables[key];
                            //editing variable
                        }
                        else {
                            taro.game.data.variables[key].value = variable.value;
                        }
                        //creating new variable
                    }
                    else {
                        taro.game.data.variables[key] = {
                            dataType: variable.dataType,
                            value: variable.value
                        };
                    }
                }
            });
            // broadcast region change to all clients
            taro.network.send('editVariable', data);
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
                    if (data.position && !isNaN(data.position.x) && !isNaN(data.position.y) &&
                        action.position && !isNaN(action.position.x) && !isNaN(action.position.y)) {
                        action.position = data.position;
                    }
                    if (!isNaN(data.angle) && !isNaN(action.angle)) {
                        action.angle = data.angle;
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
            if (!found_1) {
                this.initEntities.push(data);
            }
        }
    };
    DeveloperMode.prototype.editGlobalScripts = function (data, clientId) {
        // only allow developers to modify global scripts
        if (taro.server.developerClientIds.includes(clientId)) {
            taro.network.send('editGlobalScripts', data);
            taro.script.load(data, true);
            taro.script.scriptCache = {};
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
        var unitTypeData = taro.game.cloneAsset('unitTypes', unitTypeId);
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
        if (taro.game.data.unitTypes[data.typeId]) {
            if (data.newData.scripts) {
                taro.game.data.unitTypes[data.typeId].scripts = rfdc()(data.newData.scripts);
            }
            else {
                var oldScripts = rfdc()(taro.game.data.unitTypes[data.typeId].scripts);
                taro.game.data.unitTypes[data.typeId] = rfdc()(data.newData);
                taro.game.data.unitTypes[data.typeId].scripts = oldScripts;
            }
        }
        else {
            taro.game.data.unitTypes[data.typeId] = rfdc()(data.newData);
        }
        taro.$$('unit').forEach(function (unit) {
            if (unit._stats.type === data.typeId) {
                unit.changeUnitType(data.typeId, {}, false);
                unit.emit('update-texture', 'basic_texture_change');
            }
        });
        if (taro.isServer) {
            taro.network.send('updateUnit', data);
        }
    };
    DeveloperMode.prototype.resetUnit = function (data) {
        taro.$$('unit').forEach(function (unit) {
            if (unit._stats.type === data.typeId) {
                unit.resetUnitType();
            }
        });
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
        var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
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
        if (taro.game.data.itemTypes[data.typeId]) {
            if (data.newData.scripts) {
                taro.game.data.itemTypes[data.typeId].scripts = rfdc()(data.newData.scripts);
            }
            else {
                var oldScripts = rfdc()(taro.game.data.itemTypes[data.typeId].scripts);
                taro.game.data.itemTypes[data.typeId] = rfdc()(data.newData);
                taro.game.data.itemTypes[data.typeId].scripts = oldScripts;
            }
        }
        else {
            taro.game.data.itemTypes[data.typeId] = rfdc()(data.newData);
        }
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
    DeveloperMode.prototype.resetItem = function (data) {
        taro.$$('item').forEach(function (item) {
            if (item._stats.itemTypeId === data.typeId) {
                item.resetItemType();
            }
        });
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
        if (taro.game.data.projectileTypes[data.typeId]) {
            if (data.newData.scripts) {
                taro.game.data.projectileTypes[data.typeId].scripts = rfdc()(data.newData.scripts);
            }
            else {
                var oldScripts = rfdc()(taro.game.data.projectileTypes[data.typeId].scripts);
                taro.game.data.projectileTypes[data.typeId] = rfdc()(data.newData);
                taro.game.data.projectileTypes[data.typeId].scripts = oldScripts;
            }
        }
        else {
            taro.game.data.projectileTypes[data.typeId] = rfdc()(data.newData);
        }
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
    DeveloperMode.prototype.resetProjectile = function (data) {
        taro.$$('projectile').forEach(function (projectile) {
            if (projectile._stats.type === data.typeId) {
                projectile.resetProjectileType();
            }
        });
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
                        case 'reset':
                            this.resetUnit(data);
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
                        case 'reset':
                            this.resetItem(data);
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
                        case 'reset':
                            this.resetProjectile(data);
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
        // console.log('map data was edited', data.mapData.wasEdited);
        if (data.mapData.wasEdited) {
            data.mapData.wasEdited = false;
            data.mapData.haveUnsavedChanges = true;
            taro.game.data.map = data.mapData;
            if (taro.physics) {
                //if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
                taro.physics.destroyWalls();
                var map = taro.scaleMap(rfdc()(taro.game.data.map));
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