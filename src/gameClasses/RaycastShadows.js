var RaycastShadows = /** @class */ (function () {
    function RaycastShadows(scene) {
        this.scene = scene;
        this.player = Phaser.Math.Vector2.ZERO;
        this.graph = this.scene.add.graphics();
        // definitely some redundancy here
        var _a = taro.map.data, width = _a.width, height = _a.height, tilewidth = _a.tilewidth, tileheight = _a.tileheight;
        this.width = width;
        this.height = height;
        this.tilewidth = tilewidth;
        this.tileheight = tileheight;
        // vector to store the bottom right boundary of the map
        this.mapExtents = new Phaser.Math.Vector2(
        // x
        this.width * this.tilewidth, 
        // y
        this.height * this.tileheight);
        this.getWalls();
    }
    RaycastShadows.prototype.getWalls = function () {
        var _this = this;
        this.segments = [];
        taro.$$('wall').forEach(function (wall) {
            var x = wall._translate.x - wall._bounds2d.x2;
            var y = wall._translate.y - wall._bounds2d.y2;
            var w = wall._bounds2d.x;
            var h = wall._bounds2d.y;
            _this.segments.push([[x, y], [x + w, y]], [[x, y + h], [x + w, y + h]], [[x, y], [x, y + h]], [[x + w, y], [x + w, y + h]]);
        });
    };
    RaycastShadows.prototype.generateFieldOfView = function () {
        // for now hard code range
        var limit = 300;
        // TODO: extract range from config
        // TODO: include map data necessary in event emission for constructor
        this.fov = Phaser.Geom.Rectangle.FromXY(Math.max(0, this.player.x - limit), Math.max(0, this.player.y - limit), Math.min(this.mapExtents.x, this.player.x + limit), Math.min(this.mapExtents.y, this.player.y + limit));
    };
    RaycastShadows.prototype.moveCenter = function (x, y) {
        this.player.set(x, y);
    };
    RaycastShadows.prototype.visibilityPoly = function () {
        var data = VisibilityPolygon.computeViewport([this.player.x, this.player.y], this.segments, [this.fov.left, this.fov.top], [this.fov.right, this.fov.bottom]);
        var poly = [];
        data.forEach(function (point) {
            poly.push(new Phaser.Geom.Point(point[0], point[1]));
        });
        this.graph.fillStyle(0xFF9999, 0.5)
            .fillPoints(poly, true);
    };
    RaycastShadows.prototype.update = function () {
        this.graph.clear();
        this.generateFieldOfView();
        this.visibilityPoly();
    };
    return RaycastShadows;
}());
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = RaycastShadows;
}
//# sourceMappingURL=RaycastShadows.js.map