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
var PhaserUiBarsContainer = /** @class */ (function (_super) {
    __extends(PhaserUiBarsContainer, _super);
    function PhaserUiBarsContainer(scene) {
        var _this = _super.call(this, scene) || this;
        _this.scene = scene;
        _this.bars = [];
        _this.barWidth = 240;
        _this.barHeight = 24;
        _this.barInterval = 24;
        _this.barRadius = 3;
        scene.add.existing(_this);
        return _this;
    }
    PhaserUiBarsContainer.prototype.addBar = function (attribute) {
        var _this = this;
        var bar = new PhaserUiAttributeBar(this.scene, this, attribute);
        this.bars.push(bar);
        this.bars.forEach(function (bar, index) { return bar.y = _this.scene.sys.game.canvas.height - _this.barHeight / 2 - 20 - (_this.bars.length - 1 - index) * _this.barInterval; });
        this.add(bar);
    };
    PhaserUiBarsContainer.prototype.updateBar = function (attribute) {
        var _this = this;
        var bar = this.bars.find(function (bar) { return bar.attribute.type === attribute.type; });
        if (bar) {
            bar.updateAttribute(attribute);
            this.bars.forEach(function (bar, index) { return bar.y = _this.scene.sys.game.canvas.height - _this.barHeight / 2 - 20 - (_this.bars.length - 1 - index) * _this.barInterval; });
        }
        else {
            this.addBar(attribute);
        }
    };
    return PhaserUiBarsContainer;
}(Phaser.GameObjects.Container));
//# sourceMappingURL=PhaserUiBarsContainer.js.map