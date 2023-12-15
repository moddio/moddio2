var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var GameScene = /** @class */ (function (_super) {
    __extends(GameScene, _super);
    function GameScene() {
        var _this = _super.call(this, { key: 'Game' }) || this;
        _this.entityLayers = [];
        _this.renderedEntities = [];
        _this.unitsList = [];
        _this.projectilesList = [];
        _this.itemList = [];
        return _this;
    }
    GameScene.prototype.init = function () {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (taro.isMobile) {
            this.scene.launch('MobileControls');
        }
        this.resolutionCoef = 1;
        this.useBounds = (_d = (_c = (_b = (_a = taro === null || taro === void 0 ? void 0 : taro.game) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.settings) === null || _c === void 0 ? void 0 : _c.camera) === null || _d === void 0 ? void 0 : _d.useBounds;
        var camera = this.cameras.main;
        camera.setBackgroundColor(taro.game.data.defaultData.mapBackgroundColor);
        // set camera bounds
        if (this.useBounds) {
            if (taro.game.data.defaultData.dontResize) {
                camera.setBounds(0, 0, taro.game.data.map.width * taro.game.data.map.tilewidth, taro.game.data.map.height * taro.game.data.map.tileheight, true);
            }
            else {
                camera.setBounds(0, 0, taro.game.data.map.width * 64, taro.game.data.map.height * 64, true);
            }
        }
        // set camera tracking delay
        this.trackingDelay = ((_h = (_g = (_f = (_e = taro === null || taro === void 0 ? void 0 : taro.game) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.settings) === null || _g === void 0 ? void 0 : _g.camera) === null || _h === void 0 ? void 0 : _h.trackingDelay) || 3;
        if (this.trackingDelay > 60) {
            this.trackingDelay = 60;
        }
        this.scale.on(Phaser.Scale.Events.RESIZE, function () {
            if (_this.zoomSize) {
                camera.zoom = _this.calculateZoom();
                taro.client.emit('scale', { ratio: camera.zoom * _this.resolutionCoef });
            }
            taro.client.emit('update-abilities-position');
        });
        taro.client.on('zoom', function (height) {
            if (_this.zoomSize === height * 2.15) {
                return;
            }
            _this.setZoomSize(height);
            var ratio = _this.calculateZoom();
            camera.zoomTo(ratio, 1000, Phaser.Math.Easing.Quadratic.Out, true);
            taro.client.emit('scale', { ratio: ratio * _this.resolutionCoef });
        });
        taro.client.on('set-resolution', function (resolution) {
            _this.setResolution(resolution, true);
        });
        taro.client.on('change-filter', function (data) {
            _this.changeTextureFilter(data.filter);
        });
        taro.client.on('updateMap', function () {
            _this.updateMap();
        });
        taro.client.on('create-unit', function (unit) {
            new PhaserUnit(_this, unit);
        });
        taro.client.on('create-item', function (item) {
            new PhaserItem(_this, item);
        });
        taro.client.on('create-projectile', function (projectile) {
            new PhaserProjectile(_this, projectile);
        });
        taro.client.on('create-region', function (region) {
            new PhaserRegion(_this, region);
        });
        taro.client.on('create-ray', function (data) {
            new PhaserRay(_this, data.start, data.end, data.config);
        });
        taro.client.on('create-particle', function (particle) {
            new PhaserParticle(_this, particle);
        });
        taro.client.on('floating-text', function (data) {
            new PhaserFloatingText(_this, data);
        });
        taro.client.on('stop-follow', function () {
            camera.stopFollow();
        });
        taro.client.on('position-camera', function (x, y) {
            x -= camera.width / 2;
            y -= camera.height / 2;
            camera.setScroll(x, y);
        });
        taro.client.on('instant-move-camera', function (x, y) {
            if (!taro.developerMode.active || taro.developerMode.activeTab === 'play') {
                camera.centerOn(x, y);
            }
        });
    };
    GameScene.prototype.preload = function () {
        var _this = this;
        var data = taro.game.data;
        if (data.texturePack) {
            // todo: multiatlas
            this.load.atlas({
                key: 'pack-result',
                atlasURL: data.texturePack.atlasURL,
                textureURL: data.texturePack.textureURL,
                // baseURL: "cache.modd.io"
            });
        }
        for (var type in data.unitTypes) {
            this.loadEntity("unit/".concat(data.unitTypes[type].cellSheet.url), data.unitTypes[type]);
        }
        for (var type in data.projectileTypes) {
            this.loadEntity("projectile/".concat(data.projectileTypes[type].cellSheet.url), data.projectileTypes[type]);
        }
        for (var type in data.itemTypes) {
            this.loadEntity("item/".concat(data.itemTypes[type].cellSheet.url), data.itemTypes[type]);
        }
        for (var type in data.particleTypes) {
            this.load.image("particle/".concat(data.particleTypes[type].url), this.patchAssetUrl(data.particleTypes[type].url));
        }
        data.map.tilesets.forEach(function (tileset) {
            var key = "tiles/".concat(tileset.name);
            _this.load.once("filecomplete-image-".concat(key), function () {
                var texture = _this.textures.get(key);
                var canvas = _this.extrude(tileset, texture.getSourceImage());
                if (canvas) {
                    _this.textures.remove(texture);
                    _this.textures.addCanvas("extruded-".concat(key), canvas);
                }
                else {
                    if (window.toastErrorMessage) {
                        window.toastErrorMessage("Tileset \"".concat(tileset.name, "\" image doesn't match the specified parameters. ") +
                            "Double check your margin, spacing, tilewidth and tileheight.");
                    }
                    else {
                        // WAITING TILL EDITOR IS LOADED
                        setTimeout(function () {
                            if (window.toastErrorMessage) {
                                window.toastErrorMessage("Tileset \"".concat(tileset.name, "\" image doesn't match the specified parameters. ") +
                                    "Double check your margin, spacing, tilewidth and tileheight.");
                            }
                            else {
                                // IF editor is not loaded, show alert
                                alert("Tileset \"".concat(tileset.name, "\" image doesn't match the specified parameters. ") +
                                    "Double check your margin, spacing, tilewidth and tileheight.");
                            }
                        }, 5000);
                    }
                    console.warn("Tileset \"".concat(tileset.name, "\" image doesn't match the specified parameters. ") +
                        'Double check your margin, spacing, tilewidth and tileheight.');
                    _this.scene.stop();
                    return;
                }
                var extrudedTexture = _this.textures.get("extruded-".concat(key));
                Phaser.Textures.Parsers.SpriteSheet(extrudedTexture, 0, 0, 0, extrudedTexture.source[0].width, extrudedTexture.source[0].height, {
                    frameWidth: tileset.tilewidth,
                    frameHeight: tileset.tileheight,
                    margin: (tileset.margin || 0) + 2,
                    spacing: (tileset.spacing || 0) + 4
                });
            });
            _this.load.image(key, _this.patchAssetUrl(tileset.image));
        });
        //to be sure every layer of map have correct number of tiles
        var tilesPerLayer = data.map.height * data.map.width;
        data.map.layers.forEach(function (layer) {
            if (layer.name !== 'debris') {
                var length_1 = layer.data.length;
                layer.width = data.map.width;
                layer.height = data.map.height;
                if (length_1 < tilesPerLayer) {
                    for (var i = length_1 + 1; i < tilesPerLayer; i++) {
                        layer.data[i] = 0;
                    }
                }
            }
        });
        //to be sure every map not contain null or -1 tiles
        data.map.layers.forEach(function (layer) {
            if (layer && layer.data) {
                layer.data.forEach(function (tile, index) {
                    if (tile === -1 || tile === null) {
                        layer.data[index] = 0;
                    }
                });
            }
        });
        this.load.tilemapTiledJSON('map', this.patchMapData(data.map));
        BitmapFontManager.preload(this);
    };
    GameScene.prototype.loadEntity = function (key, data) {
        var _this = this;
        var cellSheet = data.cellSheet;
        if (!cellSheet) { // skip if no cell sheet data
            return;
        }
        if (cellSheet.columnCount != 1 || cellSheet.rowCount != 1) {
            this.load.once("filecomplete-image-".concat(key), function () {
                // create spritesheet,
                // even if it has only one sprite
                var texture = _this.textures.get(key);
                var width = texture.source[0].width;
                var height = texture.source[0].height;
                Phaser.Textures.Parsers.SpriteSheet(texture, 0, 0, 0, width, height, {
                    frameWidth: width / cellSheet.columnCount,
                    frameHeight: height / cellSheet.rowCount,
                });
                // add animations
                for (var animationsKey in data.animations) {
                    var animation = data.animations[animationsKey];
                    var frames_1 = animation.frames;
                    var animationFrames = [];
                    for (var i = 0; i < frames_1.length; i++) {
                        // correction for 0-based indexing
                        animationFrames.push(frames_1[i] - 1);
                    }
                    if (animationFrames.length === 0) {
                        // avoid crash by giving it frame 0 if no frame data provided
                        animationFrames.push(0);
                    }
                    if (_this.anims.exists("".concat(key, "/").concat(animationsKey))) {
                        _this.anims.remove("".concat(key, "/").concat(animationsKey));
                    }
                    _this.anims.create({
                        key: "".concat(key, "/").concat(animationsKey),
                        frames: _this.anims.generateFrameNumbers(key, {
                            frames: animationFrames
                        }),
                        frameRate: animation.framesPerSecond || 15,
                        repeat: (animation.loopCount - 1) // correction for loop/repeat values
                    });
                }
            });
        }
        this.load.image(key, this.patchAssetUrl(cellSheet.url));
    };
    GameScene.prototype.create = function () {
        var _this = this;
        this.events.once('render', function () {
            _this.scene.launch('DevMode');
            taro.client.rendererLoaded.resolve();
            document.dispatchEvent(new Event('taro rendered'));
        });
        BitmapFontManager.create(this);
        var map = this.tilemap = this.make.tilemap({ key: 'map' });
        var data = taro.game.data;
        var scaleFactor = taro.scaleMapDetails.scaleFactor;
        data.map.tilesets.forEach(function (tileset) {
            var key = "tiles/".concat(tileset.name);
            var extrudedKey = "extruded-".concat(key);
            if (_this.textures.exists(extrudedKey)) {
                _this.tileset = map.addTilesetImage(tileset.name, extrudedKey, tileset.tilewidth, tileset.tileheight, (tileset.margin || 0) + 2, (tileset.spacing || 0) + 4);
            }
            else {
                _this.tileset = map.addTilesetImage(tileset.name, key);
            }
        });
        //this.loadMap();
        var entityLayers = this.entityLayers;
        this.tilemapLayers = [];
        data.map.layers.forEach(function (layer) {
            if (layer.type === 'tilelayer') {
                var tileLayer = map.createLayer(layer.name, map.tilesets, 0, 0);
                tileLayer.setScale(scaleFactor.x, scaleFactor.y);
                _this.tilemapLayers.push(tileLayer);
            }
            entityLayers.push(_this.add.layer());
        });
        if (data.map.layers.find(function (layer) { return layer.name === 'debris'; })) {
            // taro expects 'debris' entity layer to be in front of 'walls'
            // entity layer, so we need to swap them for backwards compatibility
            var debrisLayer = entityLayers[TileLayer.DEBRIS];
            var wallsLayer = entityLayers[TileLayer.WALLS];
            entityLayers[EntityLayer.DEBRIS] = debrisLayer;
            entityLayers[EntityLayer.WALLS] = wallsLayer;
            this.children.moveAbove(debrisLayer, wallsLayer);
        }
        else {
            // this condition exists to insert the debris layer if it has been
            // excluded from the map json
            entityLayers.splice(EntityLayer.DEBRIS, 0, this.add.layer());
        }
        var camera = this.cameras.main;
        camera.centerOn(map.width * map.tileWidth / 2 * scaleFactor.x, map.height * map.tileHeight / 2 * scaleFactor.y);
        if (data.defaultData.heightBasedZIndex) {
            this.heightRenderer = new HeightRenderComponent(this, map.height * map.tileHeight);
        }
        //get filter from game data
        this.changeTextureFilter(taro.game.data.defaultData.renderingFilter);
    };
    GameScene.prototype.changeTextureFilter = function (filter) {
        var _this = this;
        if (filter === 'pixelArt') {
            this.filter = Phaser.Textures.FilterMode.NEAREST;
        }
        else {
            this.filter = Phaser.Textures.FilterMode.LINEAR;
        }
        //apply filter to each texture
        Object.values(this.textures.list).forEach(function (val) {
            val.setFilter(_this.filter);
        });
    };
    GameScene.prototype.setZoomSize = function (height) {
        // backward compatible game scaling on average 16:9 screen
        this.zoomSize = height * 2.15;
    };
    GameScene.prototype.calculateZoom = function () {
        var _a = this.scale, width = _a.width, height = _a.height;
        return Math.max(width, height) / this.zoomSize;
    };
    GameScene.prototype.updateMap = function () {
        var map = this.tilemap;
        var data = taro.game.data;
        data.map.layers.forEach(function (layer) {
            if (layer.type === 'tilelayer') {
                var layerId_1;
                switch (layer.name) {
                    case 'floor':
                        layerId_1 = 0;
                        break;
                    case 'floor2':
                        layerId_1 = 1;
                        break;
                    case 'walls':
                        layerId_1 = 2;
                        break;
                    case 'trees':
                        layerId_1 = 3;
                        break;
                }
                layer.data.forEach(function (tile, index) {
                    var x = index % layer.width;
                    var y = Math.floor(index / layer.width);
                    if (tile === 0 || tile === null)
                        tile = -1;
                    map.putTileAt(tile, x, y, false, layerId_1);
                });
            }
        });
    };
    GameScene.prototype.patchMapData = function (map) {
        /**
         * map data gets patched in place
         * to not make a copy of a huge object
         **/
        var tilecount = map.tilesets[0].tilecount;
        map.layers.forEach(function (layer) {
            if (layer.type !== 'tilelayer') {
                return;
            }
            for (var i = 0; i < layer.data.length; i++) {
                var value = layer.data[i];
                if (value > tilecount) {
                    console.warn("map data error: layer[".concat(layer.name, "], index[").concat(i, "], value[").concat(value, "]."));
                    layer.data[i] = 0;
                }
            }
        });
        return map;
    };
    GameScene.prototype.extrude = function (tileset, sourceImage, extrusion, color) {
        if (extrusion === void 0) { extrusion = 2; }
        if (color === void 0) { color = '#ffffff00'; }
        var tilewidth = tileset.tilewidth, tileheight = tileset.tileheight, _a = tileset.margin, margin = _a === void 0 ? 0 : _a, _b = tileset.spacing, spacing = _b === void 0 ? 0 : _b;
        var width = sourceImage.width, height = sourceImage.height;
        var cols = (width - 2 * margin + spacing) / (tilewidth + spacing);
        var rows = (height - 2 * margin + spacing) / (tileheight + spacing);
        if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
            console.warn('Non-integer number of rows or cols found while extruding. ' +
                "Tileset \"".concat(tileset.name, "\" image doesn't match the specified parameters. ") +
                'Double check your margin, spacing, tilewidth and tileheight.');
            return null;
        }
        var newWidth = 2 * margin + (cols - 1) * spacing + cols * (tilewidth + 2 * extrusion);
        var newHeight = 2 * margin + (rows - 1) * spacing + rows * (tileheight + 2 * extrusion);
        var canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, newWidth, newHeight);
        for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
                var srcX = margin + col * (tilewidth + spacing);
                var srcY = margin + row * (tileheight + spacing);
                var destX = margin + col * (tilewidth + spacing + 2 * extrusion);
                var destY = margin + row * (tileheight + spacing + 2 * extrusion);
                var tw = tilewidth;
                var th = tileheight;
                // Copy the tile.
                ctx.drawImage(sourceImage, srcX, srcY, tw, th, destX + extrusion, destY + extrusion, tw, th);
                // Extrude the top row.
                ctx.drawImage(sourceImage, srcX, srcY, tw, 1, destX + extrusion, destY, tw, extrusion);
                // Extrude the bottom row.
                ctx.drawImage(sourceImage, srcX, srcY + th - 1, tw, 1, destX + extrusion, destY + extrusion + th, tw, extrusion);
                // Extrude left column.
                ctx.drawImage(sourceImage, srcX, srcY, 1, th, destX, destY + extrusion, extrusion, th);
                // Extrude the right column.
                ctx.drawImage(sourceImage, srcX + tw - 1, srcY, 1, th, destX + extrusion + tw, destY + extrusion, extrusion, th);
                // Extrude the top left corner.
                ctx.drawImage(sourceImage, srcX, srcY, 1, 1, destX, destY, extrusion, extrusion);
                // Extrude the top right corner.
                ctx.drawImage(sourceImage, srcX + tw - 1, srcY, 1, 1, destX + extrusion + tw, destY, extrusion, extrusion);
                // Extrude the bottom left corner.
                ctx.drawImage(sourceImage, srcX, srcY + th - 1, 1, 1, destX, destY + extrusion + th, extrusion, extrusion);
                // Extrude the bottom right corner.
                ctx.drawImage(sourceImage, srcX + tw - 1, srcY + th - 1, 1, 1, destX + extrusion + tw, destY + extrusion + th, extrusion, extrusion);
            }
        }
        return canvas;
    };
    GameScene.prototype.findUnit = function (unitId) {
        return this.unitsList.find(function (unit) {
            return unit.entity._id === unitId;
        });
    };
    GameScene.prototype.findEntity = function (entityId) {
        return __spreadArray(__spreadArray(__spreadArray([], this.unitsList, true), this.itemList, true), this.projectilesList, true).find(function (entity) {
            return entity.entity._id === entityId;
        });
    };
    GameScene.prototype.setResolution = function (resolution, setResolutionCoef) {
        if (setResolutionCoef) {
            this.resolutionCoef = resolution;
        }
        if (taro.developerMode.activeTab !== 'map') {
            this.scale.setGameSize(window.innerWidth / resolution, window.innerHeight / resolution);
        }
    };
    GameScene.prototype.update = function () {
        var _this = this;
        //cause black screen and camera jittering when change tab
        /*let trackingDelay = this.trackingDelay / taro.fps();
        this.cameras.main.setLerp(trackingDelay, trackingDelay);*/
        var worldPoint = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
        if (!taro.isMobile) {
            taro.input.emit('pointermove', [{
                    x: worldPoint.x,
                    y: worldPoint.y,
                }]);
        }
        this.renderedEntities.forEach(function (element) {
            element.setVisible(false);
        });
        if (!taro.developerMode.active || (taro.developerMode.active && taro.developerMode.activeTab !== 'map')) {
            var visibleEntities = this.cameras.main.cull(this.renderedEntities);
            visibleEntities.forEach(function (element) {
                if (!element.hidden) {
                    element.setVisible(true);
                    if (element.dynamic) {
                        // dynamic is only assigned through an hbz-index-only event
                        _this.heightRenderer.adjustDepth(element);
                    }
                }
            });
        }
        taro.client.emit('tick');
    };
    return GameScene;
}(PhaserScene));
//# sourceMappingURL=GameScene.js.map