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
var DevModeScene = /** @class */ (function (_super) {
    __extends(DevModeScene, _super);
    function DevModeScene() {
        return _super.call(this, { key: 'DevMode' }) || this;
    }
    DevModeScene.prototype.init = function () {
        var _this = this;
        this.gameScene = taro.renderer.scene.getScene('Game');
        this.pointerInsideButtons = false;
        this.regions = [];
        taro.client.on('unlockCamera', function () {
            _this.gameScene.cameras.main.stopFollow();
        });
        taro.client.on('lockCamera', function () {
            taro.client.emit('zoom', taro.client.zoom);
            if (_this.gameScene.cameraTarget)
                _this.gameScene.cameras.main.startFollow(_this.gameScene.cameraTarget, false, 0.05, 0.05);
        });
        taro.client.on('enterMapTab', function () {
            _this.enterMapTab();
        });
        taro.client.on('leaveMapTab', function () {
            _this.leaveMapTab();
        });
        taro.client.on('editTile', function (data) {
            _this.tileEditor.edit(data);
        });
        taro.client.on('editRegion', function (data) {
            _this.regionEditor.edit(data);
        });
        this.gameScene.input.on('pointerup', function (p) {
            var draggedEntity = taro.unitBeingDragged;
            // taro.unitBeingDragged = {typeId: 'unit id', playerId: 'xyz', angle: 0, entityType: 'unit'}
            if (draggedEntity) {
                // find position and call editEntity function.
                var worldPoint = _this.gameScene.cameras.main.getWorldPoint(p.x, p.y);
                var playerId = taro.game.getPlayerByClientId(taro.network.id()).id();
                var data = {
                    action: 'create',
                    entityType: draggedEntity.entityType,
                    typeId: draggedEntity.typeId,
                    playerId: playerId,
                    position: {
                        x: worldPoint.x,
                        y: worldPoint.y
                    },
                    angle: draggedEntity.angle
                };
                taro.developerMode.editEntity(data, playerId);
                taro.unitBeingDragged = null;
            }
        });
    };
    DevModeScene.prototype.preload = function () {
        /*const data = taro.game.data;

        data.map.tilesets.forEach((tileset) => {
            const key = `tiles/${tileset.name}`;
            this.load.once(`filecomplete-image-${key}`, () => {
                const texture = this.textures.get(key);
                const canvas = this.mainScene.extrude(tileset,
                    texture.getSourceImage() as HTMLImageElement
                );
                if (canvas) {
                    this.textures.remove(texture);
                    this.textures.addCanvas(`extruded-${key}`, canvas);
                }
            });
            this.load.image(key, this.patchAssetUrl(tileset.image));
        });*/
        this.load.image('cursor', 'https://cache.modd.io/asset/spriteImage/1666276041347_cursor.png');
        this.load.image('region', 'https://cache.modd.io/asset/spriteImage/1666882309997_region.png');
        this.load.image('stamp', 'https://cache.modd.io/asset/spriteImage/1666724706664_stamp.png');
        this.load.image('eraser', 'https://cache.modd.io/asset/spriteImage/1666276083246_erasergap.png');
        this.load.image('eyeopen', 'https://cache.modd.io/asset/spriteImage/1669820752914_eyeopen.png');
        this.load.image('eyeclosed', 'https://cache.modd.io/asset/spriteImage/1669821066279_eyeclosed.png');
        this.load.image('fill', 'https://cache.modd.io/asset/spriteImage/1675428550006_fill_(1).png');
        this.load.image('clear', 'https://cache.modd.io/asset/spriteImage/1681917489086_layerClear.png');
        this.load.image('save', 'https://cache.modd.io/asset/spriteImage/1681916834218_saveIcon.png');
        this.load.scenePlugin('rexuiplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexuiplugin.min.js', 
        //'src/renderer/phaser/rexuiplugin.min.js',
        'rexUI', 'rexUI');
    };
    DevModeScene.prototype.create = function () {
        var _this = this;
        var data = taro.game.data;
        var map = this.tilemap = this.make.tilemap({ key: 'map' });
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
        var gameMap = this.gameScene.tilemap;
        gameMap.currentLayerIndex = 0;
        this.devModeTools = new DevModeTools(this);
        this.tileEditor = this.devModeTools.tileEditor;
        this.tilePalette = this.devModeTools.palette;
        this.regionEditor = this.devModeTools.regionEditor;
        this.gameEditorWidgets = this.devModeTools.gameEditorWidgets;
    };
    DevModeScene.prototype.enterMapTab = function () {
        if (this.gameEditorWidgets.length === 0) {
            this.devModeTools.queryWidgets();
            this.gameEditorWidgets = this.devModeTools.gameEditorWidgets;
        }
        this.devModeTools.enterMapTab();
    };
    DevModeScene.prototype.leaveMapTab = function () {
        if (this.devModeTools)
            this.devModeTools.leaveMapTab();
    };
    DevModeScene.prototype.pointerInsideMap = function (pointerX, pointerY, map) {
        return (0 <= pointerX && pointerX < map.width
            && 0 <= pointerY && pointerY < map.height);
    };
    DevModeScene.prototype.pointerInsideWidgets = function () {
        var _this = this;
        var inside = false;
        this.gameEditorWidgets.forEach(function (widget) {
            if (_this.input.activePointer.x >= widget.left
                && _this.input.activePointer.x <= widget.right
                && _this.input.activePointer.y >= widget.top
                && _this.input.activePointer.y <= widget.bottom) {
                inside = true;
                return;
            }
        });
        return inside;
    };
    DevModeScene.prototype.pointerInsidePalette = function () {
        return (this.input.activePointer.x > this.tilePalette.scrollBarContainer.x
            && this.input.activePointer.x < this.tilePalette.scrollBarContainer.x + this.tilePalette.scrollBarContainer.width
            && this.input.activePointer.y > this.tilePalette.scrollBarContainer.y - 30
            && this.input.activePointer.y < this.tilePalette.scrollBarContainer.y + this.tilePalette.scrollBarContainer.height);
    };
    DevModeScene.prototype.update = function () {
        if (this.tileEditor)
            this.tileEditor.update();
    };
    return DevModeScene;
}(PhaserScene));
//# sourceMappingURL=DevModeScene.js.map