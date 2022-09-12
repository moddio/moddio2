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
var GameScene = /** @class */ (function (_super) {
    __extends(GameScene, _super);
    function GameScene() {
        var _this = _super.call(this, { key: 'Game' }) || this;
        _this.entityLayers = [];
        _this.renderedEntities = [];
        return _this;
    }
    GameScene.prototype.init = function () {
        var _this = this;
        if (ige.isMobile) {
            this.scene.launch('MobileControls');
        }
        var camera = this.cameras.main;
        this.scale.on(Phaser.Scale.Events.RESIZE, function () {
            if (_this.zoomSize) {
                camera.zoom = _this.calculateZoom();
                ige.client.emit('scale', { ratio: camera.zoom });
            }
        });
        ige.client.on('zoom', function (height) {
            _this.setZoomSize(height);
            var ratio = _this.calculateZoom();
            camera.zoomTo(ratio, 1000, Phaser.Math.Easing.Quadratic.Out, true);
            ige.client.emit('scale', { ratio: ratio });
        });
        ige.client.on('create-unit', function (unit) {
            new PhaserUnit(_this, unit);
        });
        ige.client.on('create-item', function (item) {
            new PhaserItem(_this, item);
        });
        ige.client.on('create-projectile', function (projectile) {
            new PhaserProjectile(_this, projectile);
        });
        ige.client.on('create-region', function (region) {
            new PhaserRegion(_this, region);
        });
        ige.client.on('floating-text', function (data) {
            new PhaserFloatingText(_this, data);
        });
        ige.client.on('stop-follow', function () {
            camera.stopFollow();
        });
        ige.client.on('position-camera', function (x, y) {
            x -= camera.width / 2;
            y -= camera.height / 2;
            camera.setScroll(x, y);
        });
    };
    GameScene.prototype.preload = function () {
        var _this = this;
        var data = ige.game.data;
        for (var type in data.unitTypes) {
            this.loadEntity("unit/".concat(type), data.unitTypes[type]);
        }
        for (var type in data.projectileTypes) {
            this.loadEntity("projectile/".concat(type), data.projectileTypes[type]);
        }
        for (var type in data.itemTypes) {
            this.loadEntity("item/".concat(type), data.itemTypes[type]);
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
            });
            _this.load.image(key, _this.patchAssetUrl(tileset.image));
        });
        this.load.tilemapTiledJSON('map', this.patchMapData(data.map));
        this.load.bitmapFont('Arial_24px_bold_black', '/assets/fonts/Arial_24px_bold_black_0.png', '/assets/fonts/Arial_24px_bold_black.fnt');
        this.load.bitmapFont('Arial_24px_bold_white', '/assets/fonts/Arial_24px_bold_white_0.png', '/assets/fonts/Arial_24px_bold_white.fnt');
    };
    GameScene.prototype.loadEntity = function (key, data, skin) {
        var _this = this;
        if (skin === void 0) { skin = false; }
        var cellSheet = data.cellSheet;
        if (!cellSheet) { // skip if no cell sheet data
            return;
        }
        if (skin) {
            cellSheet.columnCount = 1;
            cellSheet.rowCount = 1;
        }
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
        this.load.image(key, this.patchAssetUrl(cellSheet.url));
    };
    GameScene.prototype.create = function () {
        var _this = this;
        ige.client.rendererLoaded.resolve();
        var map = this.make.tilemap({ key: 'map' });
        var data = ige.game.data;
        var scaleFactor = ige.scaleMapDetails.scaleFactor;
        data.map.tilesets.forEach(function (tileset) {
            var key = "tiles/".concat(tileset.name);
            var extrudedKey = "extruded-".concat(key);
            if (_this.textures.exists(extrudedKey)) {
                map.addTilesetImage(tileset.name, extrudedKey, tileset.tilewidth, tileset.tileheight, (tileset.margin || 0) + 1, (tileset.spacing || 0) + 2);
            }
            else {
                map.addTilesetImage(tileset.name, key);
            }
        });
        var entityLayers = this.entityLayers;
        data.map.layers.forEach(function (layer) {
            if (layer.type === 'tilelayer') {
                var tileLayer = map.createLayer(layer.name, map.tilesets, 0, 0);
                tileLayer.setScale(scaleFactor.x, scaleFactor.y);
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
        this.events.on('update', function () {
            ige.client.emit('tick');
        });
        //temporary making each loaded texture not smoothed (later planned to add option for smoothing some of them)
        Object.values(this.textures.list).forEach(function (val) {
            val.setFilter(Phaser.Textures.FilterMode.NEAREST);
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
        if (extrusion === void 0) { extrusion = 1; }
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
    GameScene.prototype.update = function () {
        var worldPoint = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
        ige.input.emit('pointermove', [{
                x: worldPoint.x,
                y: worldPoint.y,
            }]);
        this.renderedEntities.forEach(function (element) {
            element.setVisible(false);
        });
        this.cameras.main.cull(this.renderedEntities).forEach(function (element) {
            if (!element.hidden) {
                element.setVisible(true);
            }
        });
    };
    return GameScene;
}(PhaserScene));
//# sourceMappingURL=GameScene.js.map