var TileMarker = /** @class */ (function () {
    function TileMarker(scene, devModeScene, map, palette, w, commandController) {
        this.scene = scene;
        this.devModeScene = devModeScene;
        this.map = map;
        this.palette = palette;
        this.active = true;
        this.commandController = commandController;
        this.graphics = new MarkerGraphics(scene, map, w, palette);
        if (!palette) {
            this.preview = scene.add.container();
            this.images = {};
        }
    }
    TileMarker.prototype.addImage = function (x, y) {
        var map = this.map;
        var data = taro.game.data;
        var tileset = data.map.tilesets[0];
        var key = "tiles/".concat(tileset.name);
        var extrudedKey = this.extrudedKey = "extruded-".concat(key);
        var width = Constants.TILE_SIZE;
        var height = Constants.TILE_SIZE;
        if (taro.game.data.defaultData.dontResize) {
            width = map.tileWidth;
            height = map.tileHeight;
        }
        var image = this.scene.add.image(x * width, y * height, extrudedKey, 0);
        image.setOrigin(0, 0).setTint(0xabcbff).setAlpha(0).setVisible(false);
        image.setDisplaySize(width, height);
        this.preview.add(image);
        return image;
    };
    TileMarker.prototype.changeImage = function (tile, i, j) {
        if (tile && tile !== 0 && tile !== -1) {
            if (!this.images[i]) {
                this.images[i] = {};
            }
            this.images[i][j] = this.addImage(i, j);
            this.images[i][j].setTexture(this.extrudedKey, tile - 1).setAlpha(0.75);
        }
        else if (this.images[i] && this.images[i][j])
            this.images[i][j].setAlpha(0);
    };
    TileMarker.prototype.changePreview = function () {
        var _this = this;
        if (!this.palette) {
            var _a = this.devModeScene.devModeTools.isForceTo1x1() ? { x: 1, y: 1 } : this.devModeScene.tileEditor.brushArea.size, x = _a.x, y = _a.y;
            this.graphics.scaleSides(x, y);
            this.hideImages();
            var previewTarget = this.devModeScene.tileEditor.selectedTileArea;
            var sample = this.devModeScene.tileEditor.brushArea.calcSample(previewTarget, { x: x, y: y });
            for (var i = 0; i < x; i++) {
                for (var j = 0; j < y; j++) {
                    if (sample[i] && sample[i][j]) {
                        this.changeImage(sample[i][j], i, j);
                    }
                }
            }
            Object.values(previewTarget).map(function (obj) {
                Object.values(obj).map(function (tile) {
                    var _a;
                    // apply tint to palette tile
                    var paletteLayer = _this.devModeScene.tilePalette.map.layers[0];
                    var row = Math.floor((tile - 1) / paletteLayer.width);
                    var paletteTile = (_a = paletteLayer === null || paletteLayer === void 0 ? void 0 : paletteLayer.data[row]) === null || _a === void 0 ? void 0 : _a[tile - 1 - (row * paletteLayer.width)];
                    if (paletteTile)
                        paletteTile.tint = 0x87cfff;
                });
            });
        }
    };
    TileMarker.prototype.hideImages = function () {
        Object.values(this.images).forEach(function (v) {
            Object.values(v).forEach(function (img) {
                img.setAlpha(0);
            });
        });
    };
    TileMarker.prototype.showPreview = function (value) {
        var devModeScene = taro.renderer.scene.getScene('DevMode');
        var area = devModeScene.tileEditor.brushArea;
        for (var i = 0; i < area.size.x; i++) {
            for (var j = 0; j < area.size.y; j++) {
                if (this.images[i] && this.images[i][j])
                    this.images[i][j].setVisible(value);
            }
        }
    };
    return TileMarker;
}());
//# sourceMappingURL=TileMarker.js.map