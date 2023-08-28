/**
 * Forked from Box2D.js
 * @see https://github.com/kripken/box2d.js/blob/f75077b/helpers/embox2d-helpers.js
 * @author dmagunov + Huy Nguyen + fork contributions from Alex Birch
 * @license Zlib https://opensource.org/licenses/Zlib
 * License evidence: https://github.com/kripken/box2d.js/blob/master/README.markdown#box2djs
 *   "box2d.js is zlib licensed, just like Box2D."
 */
var Box2dHelpers = /** @class */ (function () {
    function Box2dHelpers(box2D) {
        var _this = this;
        this.box2D = box2D;
        /** to replace original C++ operator = */
        this.copyVec2 = function (vec) {
            var b2Vec2 = _this.box2D.b2Vec2;
            return new b2Vec2(vec.get_x(), vec.get_y());
        };
        /** to replace original C++ operator * (float) */
        this.scaleVec2 = function (vec, scale) {
            vec.set_x(scale * vec.get_x());
            vec.set_y(scale * vec.get_y());
        };
        /** to replace original C++ operator *= (float) */
        this.scaledVec2 = function (vec, scale) {
            var b2Vec2 = _this.box2D.b2Vec2;
            return new b2Vec2(scale * vec.get_x(), scale * vec.get_y());
        };
        // http://stackoverflow.com/questions/12792486/emscripten-bindings-how-to-create-an-accessible-c-c-array-from-javascript
        this.createChainShape = function (vertices, closedLoop) {
            var _a = _this.box2D, _malloc = _a._malloc, b2Vec2 = _a.b2Vec2, b2ChainShape = _a.b2ChainShape, HEAPF32 = _a.HEAPF32, wrapPointer = _a.wrapPointer;
            var shape = new b2ChainShape();
            var buffer = _malloc(vertices.length * 8);
            var offset = 0;
            for (var i = 0; i < vertices.length; i++) {
                HEAPF32[buffer + offset >> 2] = vertices[i].get_x();
                HEAPF32[buffer + (offset + 4) >> 2] = vertices[i].get_y();
                offset += 8;
            }
            var ptr_wrapped = wrapPointer(buffer, b2Vec2);
            if (closedLoop) {
                shape.CreateLoop(ptr_wrapped, vertices.length);
            }
            else {
                throw new Error('CreateChain API has changed in Box2D 2.4, need to update this');
                // shape.CreateChain(ptr_wrapped, vertices.length);
            }
            return shape;
        };
        this.createPolygonShape = function (vertices) {
            var _a = _this.box2D, _malloc = _a._malloc, b2Vec2 = _a.b2Vec2, b2PolygonShape = _a.b2PolygonShape, HEAPF32 = _a.HEAPF32, wrapPointer = _a.wrapPointer;
            var shape = new b2PolygonShape();
            var buffer = _malloc(vertices.length * 8);
            var offset = 0;
            for (var i = 0; i < vertices.length; i++) {
                HEAPF32[buffer + offset >> 2] = vertices[i].get_x();
                HEAPF32[buffer + (offset + 4) >> 2] = vertices[i].get_y();
                offset += 8;
            }
            var ptr_wrapped = wrapPointer(buffer, b2Vec2);
            shape.Set(ptr_wrapped, vertices.length);
            return shape;
        };
        this.createRandomPolygonShape = function (radius) {
            var b2Vec2 = _this.box2D.b2Vec2;
            var numVerts = 3.5 + Math.random() * 5;
            numVerts = numVerts | 0;
            var verts = [];
            for (var i = 0; i < numVerts; i++) {
                var angle = i / numVerts * 360.0 * 0.0174532925199432957;
                verts.push(new b2Vec2(radius * Math.sin(angle), radius * -Math.cos(angle)));
            }
            return _this.createPolygonShape(verts);
        };
    }
    return Box2dHelpers;
}());
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = Box2dHelpers;
}
//# sourceMappingURL=box2dwasmHelper.js.map