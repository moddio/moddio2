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
var MarkerGraphics = /** @class */ (function (_super) {
    __extends(MarkerGraphics, _super);
    function MarkerGraphics(scene, map, w, palette) {
        var _this = _super.call(this, scene) || this;
        _this.scene = scene;
        scene.add.existing(_this);
        var sides = _this.sides = {};
        sides['left'] = scene.add.graphics();
        sides['top'] = scene.add.graphics();
        sides['right'] = scene.add.graphics();
        sides['bottom'] = scene.add.graphics();
        Object.values(sides).forEach(function (side) {
            side.lineStyle(w, 0x000000, 1);
            _this.add(side);
        });
        if (taro.game.data.defaultData.dontResize || palette) {
            _this.sideLength = map.tileWidth;
        }
        else {
            _this.sideLength = Constants.TILE_SIZE;
        }
        var sideLength = _this.sideLength;
        sides['left'].strokeLineShape(new Phaser.Geom.Line(0, 0, 0, sideLength));
        sides['top'].strokeLineShape(new Phaser.Geom.Line(0, 0, sideLength, 0));
        sides['right'].strokeLineShape(new Phaser.Geom.Line(sideLength, 0, sideLength, sideLength));
        sides['bottom'].strokeLineShape(new Phaser.Geom.Line(0, sideLength, sideLength, sideLength));
        _this.setVisible(false);
        return _this;
    }
    MarkerGraphics.prototype.scaleSides = function (x, y) {
        var sides = this.sides;
        sides['left'].setScale(1, y);
        sides['top'].setScale(x, 1);
        sides['right'].setScale(1, y);
        sides['bottom'].setScale(x, 1);
        sides['right'].x = x * this.sideLength - this.sideLength;
        sides['bottom'].y = y * this.sideLength - this.sideLength;
        this.scaleSidesX = x;
        this.scaleSidesY = y;
    };
    return MarkerGraphics;
}(Phaser.GameObjects.Container));
//# sourceMappingURL=MarkerGraphics.js.map