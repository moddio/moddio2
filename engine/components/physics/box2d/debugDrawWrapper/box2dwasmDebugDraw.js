/**
 * Forked from Box2D.js
 * @see https://github.com/kripken/box2d.js/blob/49dddd6/helpers/embox2d-html5canvas-debugDraw.js
 * @author dmagunov + fork contributions from Alex Birch
 * @license Zlib https://opensource.org/licenses/Zlib
 * License evidence: https://github.com/kripken/box2d.js/blob/master/README.markdown#box2djs
 *   "box2d.js is zlib licensed, just like Box2D."
 */
var Box2dDebugDraw = /** @class */ (function () {
    function Box2dDebugDraw(box2D, helpers, context, canvasScaleFactor) {
        var _this = this;
        this.box2D = box2D;
        this.helpers = helpers;
        this.context = context;
        this.canvasScaleFactor = canvasScaleFactor;
        this.setColorFromDebugDrawCallback = function (color_p) {
            var _a = _this.box2D, wrapPointer = _a.wrapPointer, b2Color = _a.b2Color;
            var col = wrapPointer(color_p, b2Color);
            var red = (col.get_r() * 255) | 0;
            var green = (col.get_g() * 255) | 0;
            var blue = (col.get_b() * 255) | 0;
            var colNum = red << 16 | green << 8 | blue;
            _this.context.lineStyle(1 / 30, 0x000, 0.5);
            _this.context.fillStyle(colNum, 0.5);
        };
        this.drawPoint = function (vec_p, sizeMetres, color_p) {
            var _a = _this.box2D, wrapPointer = _a.wrapPointer, b2Vec2 = _a.b2Vec2;
            var vert = wrapPointer(vec_p, b2Vec2);
            _this.setColorFromDebugDrawCallback(color_p);
            var sizePixels = sizeMetres / _this.canvasScaleFactor;
            _this.context.fillRect(vert.get_x() - sizePixels / 2, vert.get_y() - sizePixels / 2, sizePixels, sizePixels);
        };
        this.drawSegment = function (vert1_p, vert2_p) {
            var _a = _this.box2D, wrapPointer = _a.wrapPointer, b2Vec2 = _a.b2Vec2;
            var vert1V = wrapPointer(vert1_p, b2Vec2);
            var vert2V = wrapPointer(vert2_p, b2Vec2);
            _this.context.beginPath();
            _this.context.moveTo(vert1V.get_x(), vert1V.get_y());
            _this.context.lineTo(vert2V.get_x(), vert2V.get_y());
            _this.context.stroke();
        };
        this.drawPolygon = function (vertices, vertexCount, fill) {
            var _a = _this.box2D, wrapPointer = _a.wrapPointer, b2Vec2 = _a.b2Vec2;
            _this.context.beginPath();
            for (var tmpI = 0; tmpI < vertexCount; tmpI++) {
                var vert = wrapPointer(vertices + (tmpI * 8), b2Vec2);
                if (tmpI === 0) {
                    _this.context.moveTo(vert.get_x(), vert.get_y());
                }
                else {
                    _this.context.lineTo(vert.get_x(), vert.get_y());
                }
            }
            _this.context.closePath();
            if (fill) {
                _this.context.fill();
            }
            _this.context.stroke();
        };
        this.drawCircle = function (center_p, radius, axis_p, fill) {
            var _a = _this.box2D, wrapPointer = _a.wrapPointer, b2Vec2 = _a.b2Vec2;
            var _b = _this.helpers, copyVec2 = _b.copyVec2, scaledVec2 = _b.scaledVec2;
            var centerV = wrapPointer(center_p, b2Vec2);
            var axisV = wrapPointer(axis_p, b2Vec2);
            _this.context.beginPath();
            _this.context.arc(centerV.get_x(), centerV.get_y(), radius, 0, 2 * Math.PI, false);
            if (fill) {
                _this.context.fill();
            }
            _this.context.stroke();
            if (fill) {
                //render axis marker
                var vert2V = copyVec2(centerV);
                vert2V.op_add(scaledVec2(axisV, radius));
                _this.context.beginPath();
                _this.context.moveTo(centerV.get_x(), centerV.get_y());
                _this.context.lineTo(vert2V.get_x(), vert2V.get_y());
                _this.context.stroke();
            }
        };
        this.drawTransform = function (transform_p) {
            var _a = _this.box2D, wrapPointer = _a.wrapPointer, b2Transform = _a.b2Transform;
            var trans = wrapPointer(transform_p, b2Transform);
            _this.context.save();
            var pos = trans.get_p();
            var rot = trans.get_q();
            _this.context.translateCanvas(pos.get_x(), pos.get_y());
            _this.context.setScale(0.5, 0.5);
            _this.context.rotateCanvas(rot.GetAngle());
            Box2dDebugDraw.drawAxes(_this.context);
            _this.context.restore();
        };
        this.constructJSDraw = function () {
            console.log(_this.box2D, _this.context);
            var _a = _this.box2D, JSDraw = _a.JSDraw, b2Vec2 = _a.b2Vec2, getPointer = _a.getPointer;
            var debugDraw = Object.assign(new JSDraw(), {
                DrawSegment: function (vert1_p, vert2_p, color_p) {
                    _this.setColorFromDebugDrawCallback(color_p);
                    _this.drawSegment(vert1_p, vert2_p);
                },
                DrawPolygon: function (vertices, vertexCount, color_p) {
                    _this.setColorFromDebugDrawCallback(color_p);
                    _this.drawPolygon(vertices, vertexCount, false);
                },
                DrawSolidPolygon: function (vertices, vertexCount, color_p) {
                    _this.setColorFromDebugDrawCallback(color_p);
                    _this.drawPolygon(vertices, vertexCount, true);
                },
                DrawCircle: function (center_p, radius, color_p) {
                    _this.setColorFromDebugDrawCallback(color_p);
                    var dummyAxis = new b2Vec2(0, 0);
                    var dummyAxis_p = getPointer(dummyAxis);
                    _this.drawCircle(center_p, radius, dummyAxis_p, false);
                },
                DrawSolidCircle: function (center_p, radius, axis_p, color_p) {
                    _this.setColorFromDebugDrawCallback(color_p);
                    _this.drawCircle(center_p, radius, axis_p, true);
                },
                DrawTransform: function (transform_p) {
                    _this.drawTransform(transform_p);
                },
                DrawPoint: function (vec_p, size, color_p) {
                    _this.drawPoint(vec_p, size, color_p);
                }
            });
            return debugDraw;
        };
    }
    Box2dDebugDraw.drawAxes = function (ctx) {
        ctx.lineStyle(1 / 30, 0xff0000, 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(1, 0);
        ctx.stroke();
        ctx.lineStyle(1 / 30, 0x00ff00, 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 1);
        ctx.stroke();
    };
    return Box2dDebugDraw;
}());
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = Box2dDebugDraw;
}
//# sourceMappingURL=box2dwasmDebugDraw.js.map