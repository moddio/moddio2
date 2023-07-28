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
var PhaserRegion = /** @class */ (function (_super) {
    __extends(PhaserRegion, _super);
    function PhaserRegion(scene, entity) {
        var _this = _super.call(this, entity) || this;
        _this.scene = scene;
        var stats = _this.stats = _this.entity._stats.default;
        var gameObject = scene.add.container();
        var graphics = scene.add.graphics();
        _this.graphics = graphics;
        gameObject.add(graphics);
        gameObject.setSize(stats.width, stats.height);
        gameObject.setPosition(stats.x + stats.width / 2, stats.y + stats.height / 2);
        gameObject.setInteractive();
        gameObject.on('pointerover', function (p) {
            if (taro.developerMode.active && taro.developerMode.activeTab === 'map' && _this.devModeScene.devModeTools.cursorButton.active && !p.isDown) {
                _this.scene.input.setTopOnly(false);
            }
        });
        _this.gameObject = gameObject;
        _this.gameObject.phaserRegion = _this;
        //scene.renderedEntities.push(this.gameObject);
        scene.entityLayers[EntityLayer.TREES].add(_this.gameObject);
        _this.name = _this.entity._stats.id;
        if (!stats.inside) {
            _this.devModeOnly = true;
        }
        var devModeScene = _this.devModeScene = taro.renderer.scene.getScene('DevMode');
        devModeScene.regions.push(_this);
        _this.updateLabel();
        _this.transform();
        if (_this.devModeOnly && !taro.developerMode.active && taro.developerMode.activeTab !== 'play') {
            _this.hide();
        }
        return _this;
    }
    PhaserRegion.prototype.getLabel = function () {
        if (!this.label) {
            var scene = this.scene;
            var label = this.label = scene.add.bitmapText(0, 0, BitmapFontManager.font(scene, 'Verdana', false, taro.game.data.settings
                .addStrokeToNameAndAttributes !== false, '#FFFFFF'), 'cccccc', 16);
            label.letterSpacing = 1.3;
            label.visible = false;
            // needs to be created with the correct scale of the client
            label.setScale(1.3);
            label.setOrigin(0);
            this.gameObject.add(label);
            if (scene.renderer.type === Phaser.CANVAS) {
                var rt = this.rtLabel = scene.add.renderTexture(0, 0);
                rt.visible = false;
                rt.setScale(label.scale);
                rt.setOrigin(0);
                this.gameObject.add(rt);
            }
        }
        return this.label;
    };
    PhaserRegion.prototype.updateLabel = function () {
        var label = this.getLabel();
        var rt = this.rtLabel;
        label.visible = !rt;
        label.setText(BitmapFontManager.sanitize(label.fontData, this.name || ''));
        var stats = this.entity._stats.default;
        label.setPosition(5 - stats.width / 2, 5 - stats.height / 2);
        if (rt) {
            var tempScale = label.scale;
            label.setScale(1);
            rt.visible = true;
            rt.resize(label.width, label.height);
            rt.clear();
            rt.draw(label, 0, 0);
            label.setScale(tempScale);
            rt.setPosition(label.x, label.y);
        }
    };
    PhaserRegion.prototype.transform = function () {
        var gameObject = this.gameObject;
        var graphics = this.graphics;
        var label = this.label;
        var rtLabel = this.rtLabel;
        var stats = this.entity._stats.default;
        gameObject.setSize(stats.width, stats.height);
        gameObject.setPosition(stats.x + stats.width / 2, stats.y + stats.height / 2);
        graphics.setPosition(-stats.width / 2, -stats.height / 2);
        label.setPosition(5 - stats.width / 2, 5 - stats.height / 2);
        if (rtLabel) {
            rtLabel.setPosition(label.x, label.y);
        }
        graphics.clear();
        if (this.devModeOnly) {
            graphics.lineStyle(2, 0x11fa05, 
            // between 0 and 1 or we default
            (stats.alpha && stats.alpha >= 0 && stats.alpha <= 1) ? stats.alpha : 1);
            graphics.strokeRect(0, 0, stats.width, stats.height);
        }
        else {
            graphics.fillStyle(Number("0x".concat(stats.inside.substring(1))), 
            // between 0 and 1 or we default
            (stats.alpha && stats.alpha >= 0 && stats.alpha <= 1) ? stats.alpha : 0.4);
            graphics.fillRect(0, 0, stats.width, stats.height);
        }
    };
    PhaserRegion.prototype.show = function () {
        this.graphics.visible = true;
        _super.prototype.show.call(this);
        var label = this.label;
        var rt = this.rtLabel;
        label && (label.visible = true);
        rt && (rt.visible = true);
    };
    PhaserRegion.prototype.hide = function () {
        if (this.devModeOnly) {
            this.graphics.visible = false;
            _super.prototype.hide.call(this);
        }
        var label = this.label;
        var rt = this.rtLabel;
        label && (label.visible = false);
        rt && (rt.visible = false);
    };
    PhaserRegion.prototype.destroy = function () {
        var _this = this;
        this.devModeScene.regions = this.devModeScene.regions.filter(function (item) { return item !== _this; });
        this.scene.renderedEntities = this.scene.renderedEntities.filter(function (item) { return item !== _this.gameObject; });
        _super.prototype.destroy.call(this);
    };
    return PhaserRegion;
}(PhaserEntity));
//# sourceMappingURL=PhaserRegion.js.map