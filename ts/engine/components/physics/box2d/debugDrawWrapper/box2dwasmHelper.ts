/**
 * Forked from Box2D.js
 * @see https://github.com/kripken/box2d.js/blob/f75077b/helpers/embox2d-helpers.js
 * @author dmagunov + Huy Nguyen + fork contributions from Alex Birch
 * @license Zlib https://opensource.org/licenses/Zlib
 * License evidence: https://github.com/kripken/box2d.js/blob/master/README.markdown#box2djs
 *   "box2d.js is zlib licensed, just like Box2D."
 */
class Box2dHelpers {
	constructor(private readonly box2D: typeof Box2D & EmscriptenModule) {}

	/** to replace original C++ operator = */
	copyVec2 = (vec: Box2D.b2Vec2): Box2D.b2Vec2 => {
		const { b2Vec2 } = this.box2D;
		return new b2Vec2(vec.get_x(), vec.get_y());
	};

	/** to replace original C++ operator * (float) */
	scaleVec2 = (vec: Box2D.b2Vec2, scale: number): void => {
		vec.set_x(scale * vec.get_x());
		vec.set_y(scale * vec.get_y());
	};

	/** to replace original C++ operator *= (float) */
	scaledVec2 = (vec: Box2D.b2Vec2, scale: number): Box2D.b2Vec2 => {
		const { b2Vec2 } = this.box2D;
		return new b2Vec2(scale * vec.get_x(), scale * vec.get_y());
	};

	// http://stackoverflow.com/questions/12792486/emscripten-bindings-how-to-create-an-accessible-c-c-array-from-javascript
	createChainShape = (vertices: Box2D.b2Vec2[], closedLoop: boolean): Box2D.b2ChainShape => {
		const { _malloc, b2Vec2, b2ChainShape, HEAPF32, wrapPointer } = this.box2D;
		const shape = new b2ChainShape();
		const buffer = _malloc(vertices.length * 8);
		let offset = 0;
		for (let i = 0; i < vertices.length; i++) {
			HEAPF32[(buffer + offset) >> 2] = vertices[i].get_x();
			HEAPF32[(buffer + (offset + 4)) >> 2] = vertices[i].get_y();
			offset += 8;
		}
		const ptr_wrapped = wrapPointer(buffer, b2Vec2);
		if (closedLoop) {
			shape.CreateLoop(ptr_wrapped, vertices.length);
		} else {
			throw new Error('CreateChain API has changed in Box2D 2.4, need to update this');
			// shape.CreateChain(ptr_wrapped, vertices.length);
		}
		return shape;
	};

	createPolygonShape = (vertices: Box2D.b2Vec2[]): Box2D.b2PolygonShape => {
		const { _malloc, b2Vec2, b2PolygonShape, HEAPF32, wrapPointer } = this.box2D;
		const shape = new b2PolygonShape();
		const buffer = _malloc(vertices.length * 8);
		let offset = 0;
		for (let i = 0; i < vertices.length; i++) {
			HEAPF32[(buffer + offset) >> 2] = vertices[i].get_x();
			HEAPF32[(buffer + (offset + 4)) >> 2] = vertices[i].get_y();
			offset += 8;
		}
		const ptr_wrapped = wrapPointer(buffer, b2Vec2);
		shape.Set(ptr_wrapped, vertices.length);
		return shape;
	};

	createRandomPolygonShape = (radius: number): Box2D.b2PolygonShape => {
		const { b2Vec2 } = this.box2D;
		let numVerts = 3.5 + Math.random() * 5;
		numVerts = numVerts | 0;
		const verts = [];
		for (let i = 0; i < numVerts; i++) {
			const angle = (i / numVerts) * 360.0 * 0.0174532925199432957;
			verts.push(new b2Vec2(radius * Math.sin(angle), radius * -Math.cos(angle)));
		}
		return this.createPolygonShape(verts);
	};
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Box2dHelpers;
}
