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
var PhaserFloatingText = /** @class */ (function (_super) {
    __extends(PhaserFloatingText, _super);
    function PhaserFloatingText(scene, data) {
        var _this = _super.call(this, scene, data.x, data.y, data.text, { fontFamily: 'Verdana' }) || this;
        _this.setOrigin(0.5);
        _this.setFontSize(16);
        _this.setFontStyle('bold');
        _this.setFill(data.color || '#fff');
        _this.setResolution(4);
        var strokeThickness = ige.game.data.settings
            .addStrokeToNameAndAttributes !== false ? 4 : 0;
        _this.setStroke('#000', strokeThickness);
        scene.add.existing(_this);
        scene.tweens.add({
            targets: _this,
            alpha: 0.5,
            duration: 2500,
            y: _this.y - 40,
            onComplete: function () {
                _this.destroy();
            }
        });
        return _this;
    }
    return PhaserFloatingText;
}(Phaser.GameObjects.Text));
//# sourceMappingURL=PhaserFloatingText.js.map