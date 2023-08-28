var TileEditor = /** @class */ (function () {
    function TileEditor(gameScene, devModeScene, devModeTools, commandController) {
        var _this = this;
        this.gameScene = gameScene;
        this.devModeTools = devModeTools;
        var palette = this.tilePalette = this.devModeTools.palette;
        var gameMap = this.gameScene.tilemap;
        this.marker = new TileMarker(this.gameScene, devModeScene, gameMap, false, 2, commandController);
        this.paletteMarker = new TileMarker(this.devModeTools.scene, devModeScene, this.tilePalette.map, true, 1, commandController);
        this.commandController = commandController;
        this.paletteArea = { x: 1, y: 1 };
        this.brushArea = new TileShape();
        this.selectedTileArea = {};
        var pointerPosition = { x: 0, y: 0 };
        this.activateMarkers(false);
        this.startDragIn = 'none';
        this.tileSize = Constants.TILE_SIZE;
        if (taro.game.data.defaultData.dontResize) {
            this.tileSize = gameMap.tileWidth;
        }
        gameScene.input.on('pointerdown', function (p) {
            /*if (!devModeScene.pointerInsideButtons) {
                this.devModeTools.modeButtons.map((btn) => {
                    btn.hideHoverChildren(0);
                });
            }*/
            if (!devModeScene.pointerInsideButtons &&
                !devModeScene.pointerInsideWidgets() &&
                (!palette.visible || !devModeScene.pointerInsidePalette()) &&
                _this.gameScene.tilemap.currentLayerIndex >= 0 &&
                devModeScene.input.manager.activePointer.rightButtonDown()) {
                _this.startDragIn = 'map';
                pointerPosition.x = gameScene.input.activePointer.x;
                pointerPosition.y = gameScene.input.activePointer.y;
            }
        });
        devModeScene.input.on('pointerdown', function (p) {
            /*if (!devModeScene.pointerInsideButtons) {
                this.devModeTools.modeButtons.map((btn) => {
                    btn.hideHoverChildren(0);
                });
            }*/
            if (!devModeScene.pointerInsideButtons &&
                !devModeScene.pointerInsideWidgets() &&
                palette.visible && devModeScene.pointerInsidePalette()) {
                _this.startDragIn = 'palette';
                pointerPosition.x = devModeScene.input.activePointer.x;
                pointerPosition.y = devModeScene.input.activePointer.y;
                if (!devModeTools.modeButtons[4].active)
                    _this.devModeTools.brush();
                if (_this.devModeTools.shiftKey.isDown) {
                    //pass
                }
                else {
                    if (p.button === 0) {
                        _this.selectedTileArea = {};
                        _this.clearTint();
                    }
                }
            }
        });
        devModeScene.input.on('pointermove', function (p) {
            if (devModeTools.modeButtons[2].active && p.isDown && p.button === 0 &&
                _this.startDragIn === 'palette') {
                _this.updateSelectedTiles(devModeScene);
            }
        });
        devModeScene.input.on('pointerup', function (p) {
            if (_this.startDragIn === 'palette' && p.button === 0) {
                _this.updateSelectedTiles(devModeScene);
            }
            if (_this.startDragIn === 'palette') {
                _this.startDragIn = 'none';
            }
        });
        gameScene.input.on('pointerup', function (p) {
            if (_this.startDragIn === 'map' &&
                Math.abs(pointerPosition.x - gameScene.input.activePointer.x) < 50 &&
                Math.abs(pointerPosition.y - gameScene.input.activePointer.y) < 50 &&
                !devModeTools.modeButtons[3].active) {
                var worldPoint = gameScene.cameras.main.getWorldPoint(gameScene.input.activePointer.x, gameScene.input.activePointer.y);
                var nowBrushSize = JSON.parse(JSON.stringify(_this.brushArea.size));
                if (_this.devModeTools.isForceTo1x1()) {
                    nowBrushSize.x = 1;
                    nowBrushSize.y = 1;
                }
                var pointerTileX = gameMap.worldToTileX(worldPoint.x - (nowBrushSize.x - 1) * _this.tileSize / 2, true);
                var pointerTileY = gameMap.worldToTileY(worldPoint.y - (nowBrushSize.y - 1) * _this.tileSize / 2, true);
                _this.clearTint();
                _this.selectedTileArea = {};
                for (var i = 0; i < nowBrushSize.x; i++) {
                    for (var j = 0; j < nowBrushSize.y; j++) {
                        var tile = _this.getTile(pointerTileX + i, pointerTileY + j, gameMap);
                        if (tile !== -1) {
                            if (!_this.selectedTileArea[pointerTileX + i]) {
                                _this.selectedTileArea[pointerTileX + i] = {};
                            }
                            _this.selectedTileArea[pointerTileX + i][pointerTileY + j] = tile;
                        }
                    }
                }
                _this.marker.changePreview();
            }
            if (_this.startDragIn === 'map') {
                _this.startDragIn = 'none';
            }
        });
    }
    TileEditor.prototype.updateSelectedTiles = function (devModeScene) {
        var palettePoint = devModeScene.cameras.getCamera('palette').getWorldPoint(devModeScene.input.activePointer.x, devModeScene.input.activePointer.y);
        var palettePointerTileX = this.tilePalette.map.worldToTileX(palettePoint.x);
        var palettePointerTileY = this.tilePalette.map.worldToTileY(palettePoint.y);
        if (!this.selectedTileArea[palettePointerTileX]) {
            this.selectedTileArea[palettePointerTileX] = {};
        }
        var tile = this.getTile(palettePointerTileX, palettePointerTileY, this.tilePalette.map);
        this.selectedTileArea[palettePointerTileX][palettePointerTileY] = tile;
        this.marker.changePreview();
    };
    TileEditor.prototype.activateMarkers = function (active) {
        this.marker.active = active;
        this.paletteMarker.active = active;
        if (active)
            this.devModeTools.regionEditor.regionTool = false;
    };
    TileEditor.prototype.showMarkers = function (value) {
        this.marker.graphics.setVisible(value);
        this.marker.showPreview(value);
        this.paletteMarker.graphics.setVisible(value);
    };
    TileEditor.prototype.clearTint = function () {
        this.tilePalette.map.layers[0].data.forEach(function (tilearray) {
            tilearray.forEach(function (tile) {
                if (tile)
                    tile.tint = 0xffffff;
            });
        });
    };
    TileEditor.prototype.edit = function (data) {
        if (JSON.stringify(data) === '{}') {
            throw 'receive: {}';
        }
        var map = taro.game.data.map;
        inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
        var width = map.width;
        var _a = Object.entries(data).map(function (_a) {
            var k = _a[0], v = _a[1];
            var dataType = k;
            var dataValue = v;
            return { dataType: dataType, dataValue: dataValue };
        })[0], dataType = _a.dataType, dataValue = _a.dataValue;
        var tempLayer = dataValue.layer;
        if (map.layers.length > 4 && dataValue.layer >= 2) {
            tempLayer++;
        }
        switch (dataType) {
            case 'fill': {
                var nowValue = dataValue;
                var oldTile = map.layers[tempLayer].data[nowValue.y * width + nowValue.x];
                this.floodFill(nowValue.layer, oldTile, nowValue.gid, nowValue.x, nowValue.y, true, nowValue.limits);
                break;
            }
            case 'edit': {
                //save tile change to taro.game.data.map and taro.map.data
                var nowValue = dataValue;
                this.putTiles(nowValue.x, nowValue.y, nowValue.selectedTiles, nowValue.size, nowValue.shape, nowValue.layer, true);
                break;
            }
            case 'clear': {
                var nowValue = dataValue;
                this.clearLayer(nowValue.layer);
            }
        }
        if (taro.physics && map.layers[tempLayer].name === 'walls') {
            //if changes was in 'walls' layer we destroy all old walls and create new staticsFromMap
            taro.physics.destroyWalls();
            var mapCopy = taro.scaleMap(rfdc()(map));
            taro.tiled.loadJson(mapCopy, function (layerArray, TaroLayersById) {
                taro.physics.staticsFromMap(TaroLayersById.walls);
            });
        }
    };
    /**
     * put tiles
     * @param tileX pointerTileX
     * @param tileY pointerTileY
     * @param selectedTiles selectedTiles
     * @param brushSize brush's size
     * @param layer layer
     * @param local is not, it will send command to other client
     */
    TileEditor.prototype.putTiles = function (tileX, tileY, selectedTiles, brushSize, shape, layer, local) {
        var map = this.gameScene.tilemap;
        var sample = this.brushArea.calcSample(selectedTiles, brushSize, shape, true);
        var taroMap = taro.game.data.map;
        var width = taroMap.width;
        var tempLayer = layer;
        if (taroMap.layers.length > 4 && layer >= 2) {
            tempLayer++;
        }
        if (this.gameScene.tilemapLayers[layer].visible && selectedTiles) {
            for (var x = 0; x < brushSize.x; x++) {
                for (var y = 0; y < brushSize.y; y++) {
                    if (sample[x] && sample[x][y] !== undefined && DevModeScene.pointerInsideMap(tileX + x, tileY + y, map)) {
                        var index = sample[x][y];
                        if (index !== (map.getTileAt(tileX + x, tileY + y, true, layer)).index &&
                            !(index === 0 && map.getTileAt(tileX + x, tileY + y, true, layer).index === -1)) {
                            if (index === 0)
                                index = -1;
                            map.putTileAt(index, tileX + x, tileY + y, false, layer);
                            map.getTileAt(tileX + x, tileY + y, true, layer).tint = 0xffffff;
                            if (index === -1)
                                index = 0;
                            taroMap.layers[tempLayer].data[(tileY + y) * width + tileX + x] = index;
                        }
                    }
                }
            }
        }
        if (!local) {
            taro.network.send('editTile', {
                edit: {
                    size: brushSize,
                    layer: layer,
                    selectedTiles: selectedTiles,
                    x: tileX,
                    y: tileY,
                    shape: shape,
                }
            });
        }
    };
    TileEditor.prototype.getTile = function (tileX, tileY, map) {
        if (DevModeScene.pointerInsideMap(tileX, tileY, map)) {
            if (map.getTileAt(tileX, tileY) && map.getTileAt(tileX, tileY).index !== 0) {
                var selectedTile = map.getTileAt(tileX, tileY);
                return selectedTile.index;
            }
        }
        return -1;
    };
    TileEditor.prototype.floodFill = function (layer, oldTile, newTile, x, y, fromServer, limits, addToLimits) {
        var _a, _b, _c, _d, _e, _f, _g;
        var map;
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
            if (fromServer) {
                map = taro.game.data.map;
                inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
                var tileMap = this.gameScene.tilemap;
                var width = map.width;
                //fix for debris layer
                var tempLayer = layer;
                if (map.layers.length > 4 && layer >= 2) {
                    tempLayer++;
                }
                if ((_b = limits === null || limits === void 0 ? void 0 : limits[nowPos.x]) === null || _b === void 0 ? void 0 : _b[nowPos.y]) {
                    continue;
                }
                if (map.layers[tempLayer].data[nowPos.y * width + nowPos.x] !== oldTile) {
                    addToLimits === null || addToLimits === void 0 ? void 0 : addToLimits({ x: nowPos.x, y: nowPos.y });
                    continue;
                }
                tileMap.putTileAt(newTile, nowPos.x, nowPos.y, false, layer);
                //save tile change to taro.game.map.data
                map.layers[tempLayer].data[nowPos.y * width + nowPos.x] = newTile;
            }
            else {
                map = this.gameScene.tilemap;
                if (!map.getTileAt(nowPos.x, nowPos.y, true, layer) ||
                    ((_c = limits === null || limits === void 0 ? void 0 : limits[nowPos.x]) === null || _c === void 0 ? void 0 : _c[nowPos.y]) ||
                    map.getTileAt(nowPos.x, nowPos.y, true, layer).index === 0 ||
                    map.getTileAt(nowPos.x, nowPos.y, true, layer).index === -1) {
                    continue;
                }
                if (map.getTileAt(nowPos.x, nowPos.y, true, layer).index !== oldTile) {
                    addToLimits === null || addToLimits === void 0 ? void 0 : addToLimits({ x: nowPos.x, y: nowPos.y });
                    continue;
                }
                map.putTileAt(newTile, nowPos.x, nowPos.y, false, layer);
            }
            if (nowPos.x > 0 && !((_d = closedQueue[nowPos.x - 1]) === null || _d === void 0 ? void 0 : _d[nowPos.y])) {
                openQueue.push({ x: nowPos.x - 1, y: nowPos.y });
            }
            if (nowPos.x < map.width - 1 && !((_e = closedQueue[nowPos.x + 1]) === null || _e === void 0 ? void 0 : _e[nowPos.y])) {
                openQueue.push({ x: nowPos.x + 1, y: nowPos.y });
            }
            if (nowPos.y > 0 && !((_f = closedQueue[nowPos.x]) === null || _f === void 0 ? void 0 : _f[nowPos.y - 1])) {
                openQueue.push({ x: nowPos.x, y: nowPos.y - 1 });
            }
            if (nowPos.x < map.height - 1 && !((_g = closedQueue[nowPos.x]) === null || _g === void 0 ? void 0 : _g[nowPos.y + 1])) {
                openQueue.push({ x: nowPos.x, y: nowPos.y + 1 });
            }
        }
    };
    TileEditor.prototype.clearLayer = function (layer) {
        var map = taro.game.data.map;
        inGameEditor.mapWasEdited && inGameEditor.mapWasEdited();
        var tileMap = this.gameScene.tilemap;
        var width = map.width;
        //fix for debris layer
        var tempLayer = layer;
        if (map.layers.length > 4 && layer >= 2) {
            tempLayer++;
        }
        for (var i = 0; i < map.width; i++) {
            for (var j = 0; j < map.height; j++) {
                if (map.layers[tempLayer].data[j * width + i] !== 0) {
                    tileMap.putTileAt(-1, i, j, false, layer);
                    //save tile change to taro.game.map.data
                    map.layers[tempLayer].data[j * width + i] = 0;
                }
            }
        }
    };
    TileEditor.prototype.update = function () {
        var _this = this;
        var _a, _b, _c, _d, _e;
        if (taro.developerMode.active && taro.developerMode.activeTab === 'map') {
            var devModeScene = this.devModeTools.scene;
            var palette = this.tilePalette;
            var map_1 = this.gameScene.tilemap;
            var paletteMap = palette.map;
            var worldPoint = this.gameScene.cameras.main.getWorldPoint(this.gameScene.input.activePointer.x, this.gameScene.input.activePointer.y);
            var palettePoint = devModeScene.cameras.getCamera('palette').getWorldPoint(devModeScene.input.activePointer.x, devModeScene.input.activePointer.y);
            var marker = this.marker;
            var paletteMarker = this.paletteMarker;
            paletteMarker.graphics.setVisible(true);
            // Rounds down to nearest tile
            var palettePointerTileX = paletteMap.worldToTileX(palettePoint.x);
            var palettePointerTileY = paletteMap.worldToTileY(palettePoint.y);
            if (palette.visible && devModeScene.pointerInsidePalette()) {
                devModeScene.regionEditor.cancelDrawRegion();
                marker.graphics.setVisible(false);
                marker.showPreview(false);
                // Snap to tile coordinates, but in world space
                paletteMarker.graphics.x = paletteMap.tileToWorldX(palettePointerTileX);
                paletteMarker.graphics.y = paletteMap.tileToWorldY(palettePointerTileY);
            }
            else if ((!devModeScene.pointerInsidePalette() || !palette.visible) &&
                !devModeScene.pointerInsideButtons && !devModeScene.pointerInsideWidgets() && map_1.currentLayerIndex >= 0) {
                this.devModeTools.tooltip.showMessage('Position', "X: ".concat(Math.floor(worldPoint.x).toString(), ", Y: ").concat(Math.floor(worldPoint.y).toString(), "  |  ")
                    + "Tile X: ".concat(Math.floor(worldPoint.x / taro.scaleMapDetails.tileWidth).toString(), ", Tile Y: ").concat(Math.floor(worldPoint.y / taro.scaleMapDetails.tileHeight).toString()));
                if (marker.active) {
                    paletteMarker.graphics.setVisible(false);
                    marker.graphics.setVisible(true);
                    marker.showPreview(true);
                    // Rounds down to nearest tile
                    var pointerTileX_1 = map_1.worldToTileX(worldPoint.x - (marker.graphics.scaleSidesX - 1) * this.tileSize / 2, true);
                    var pointerTileY_1 = map_1.worldToTileY(worldPoint.y - (marker.graphics.scaleSidesY - 1) * this.tileSize / 2, true);
                    // Snap to tile coordinates, but in world space
                    marker.graphics.x = map_1.tileToWorldX(pointerTileX_1);
                    marker.graphics.y = map_1.tileToWorldY(pointerTileY_1);
                    marker.preview.x = map_1.tileToWorldX(pointerTileX_1);
                    marker.preview.y = map_1.tileToWorldY(pointerTileY_1);
                    if (((_a = map_1 === null || map_1 === void 0 ? void 0 : map_1.getTileAt(pointerTileX_1, pointerTileY_1)) === null || _a === void 0 ? void 0 : _a.index) && ((_b = map_1 === null || map_1 === void 0 ? void 0 : map_1.getTileAt(pointerTileX_1, pointerTileY_1)) === null || _b === void 0 ? void 0 : _b.index) !== -1 && ((_c = map_1 === null || map_1 === void 0 ? void 0 : map_1.getTileAt(pointerTileX_1, pointerTileY_1)) === null || _c === void 0 ? void 0 : _c.index) !== 0) {
                        this.devModeTools.tooltip.showMessage('Position', "X: ".concat(Math.floor(worldPoint.x).toString(), ", Y: ").concat(Math.floor(worldPoint.y).toString(), "  |  ")
                            + "Tile X: ".concat(Math.floor(worldPoint.x / taro.scaleMapDetails.tileWidth).toString(), ", Tile Y: ").concat(Math.floor(worldPoint.y / taro.scaleMapDetails.tileHeight).toString(), "  |  ")
                            + "Tile id: ".concat(map_1.getTileAt(pointerTileX_1, pointerTileY_1).index));
                    }
                    if (devModeScene.input.manager.activePointer.leftButtonDown()) {
                        if (this.devModeTools.modeButtons[2].active || this.devModeTools.modeButtons[3].active) {
                            var originTileArea_1 = {};
                            var nowBrushSize_1 = JSON.parse(JSON.stringify(this.brushArea.size));
                            var nowBrushShape_1 = JSON.parse(JSON.stringify(this.brushArea.shape));
                            var sample = JSON.parse(JSON.stringify(this.brushArea.sample));
                            var selectedTiles_1 = JSON.parse(JSON.stringify(this.selectedTileArea));
                            var nowLayer_1 = map_1.currentLayerIndex;
                            Object.entries(sample).map(function (_a) {
                                var x = _a[0], obj = _a[1];
                                Object.entries(obj).map(function (_a) {
                                    var y = _a[0], value = _a[1];
                                    if (!originTileArea_1[x]) {
                                        originTileArea_1[x] = {};
                                    }
                                    originTileArea_1[x][y] = _this.getTile(pointerTileX_1 + parseInt(x), pointerTileY_1 + parseInt(y), map_1);
                                });
                            });
                            this.commandController.addCommand({
                                func: function () {
                                    _this.putTiles(pointerTileX_1, pointerTileY_1, selectedTiles_1, nowBrushSize_1, nowBrushShape_1, nowLayer_1, false);
                                },
                                undo: function () {
                                    _this.putTiles(pointerTileX_1, pointerTileY_1, originTileArea_1, nowBrushSize_1, nowBrushShape_1, nowLayer_1, false);
                                },
                            });
                        }
                        else if (this.devModeTools.modeButtons[4].active) {
                            var targetTile_1 = this.getTile(pointerTileX_1, pointerTileY_1, map_1);
                            var selectedTile_1 = (_e = Object.values(((_d = Object.values(this.selectedTileArea)) === null || _d === void 0 ? void 0 : _d[0]) || {})) === null || _e === void 0 ? void 0 : _e[0];
                            if (selectedTile_1 && targetTile_1 !== selectedTile_1 && (targetTile_1 || map_1.currentLayerIndex === 0 || map_1.currentLayerIndex === 1)) {
                                var nowCommandCount_1 = this.commandController.nowInsertIndex;
                                var addToLimits_1 = function (v2d) {
                                    setTimeout(function () {
                                        var cache = _this.commandController.commands[nowCommandCount_1 - _this.commandController.offset].cache;
                                        if (!cache[v2d.x]) {
                                            cache[v2d.x] = {};
                                        }
                                        cache[v2d.x][v2d.y] = 1;
                                    }, 0);
                                };
                                var nowLayer_2 = map_1.currentLayerIndex;
                                this.commandController.addCommand({
                                    func: function () {
                                        _this.floodFill(nowLayer_2, targetTile_1, selectedTile_1, pointerTileX_1, pointerTileY_1, false, {}, addToLimits_1);
                                        taro.network.send('editTile', {
                                            fill: {
                                                gid: selectedTile_1, layer: nowLayer_2, x: pointerTileX_1, y: pointerTileY_1
                                            }
                                        });
                                    },
                                    undo: function () {
                                        _this.floodFill(nowLayer_2, selectedTile_1, targetTile_1, pointerTileX_1, pointerTileY_1, false, _this.commandController.commands[nowCommandCount_1 - _this.commandController.offset].cache);
                                        taro.network.send('editTile', {
                                            fill: {
                                                gid: targetTile_1, layer: nowLayer_2, x: pointerTileX_1, y: pointerTileY_1, limits: _this.commandController.commands[nowCommandCount_1 - _this.commandController.offset].cache
                                            }
                                        });
                                    },
                                    cache: {},
                                }, true);
                            }
                        }
                    }
                }
            }
            else {
                this.showMarkers(false);
            }
        }
        else {
            this.showMarkers(false);
        }
    };
    return TileEditor;
}());
//# sourceMappingURL=TileEditor.js.map