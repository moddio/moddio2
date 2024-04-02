// Crash
// Version 2.0.2 | Copyright 2015 - 2018 | Tuur Dutoit <me@tuurdutoit.be>
//
// Released under the MIT License - https://github.com/TuurDutoit/crash
//
// Crash performs optimized 2D collisions, powered by RBush and SAT.js, written in javascript.

// Create a UMD wrapper for Crash. Works in:
//
//  - Plain browser via global Crash variable
//  - AMD loader (like require.js)
//  - Node.js

(function (factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		define(['RBush', 'SAT'], factory);
	} else if (typeof exports === 'object') {
		global.Crash = factory(rbush, sat); //this is changed
	} else {
		window.Crash = factory(rbush, SAT);
		Crash = window.Crash;
	}
})(function (RBush, SAT) {
	'use strict';

	/***************
	 * CONSTRUCTOR *
	 * EXPORTS     *
	 * UTILITIES   *
	 ***************/

	var SEARCH_OBJECT = {}; // will hold the AABB coordinates during search()
	var ALL_MOVED = []; // will hold all the colliders that have moved during check(), so we can update their lastCheckedPos

	var Crash = function (options) {
		if (!options) {
			options = {};
		}

		this.__options = {
			maxEntries: options.maxEntries || 9,
			maxChecks: typeof options.maxChecks === 'number' ? options.maxChecks : 100,
			overlapLimit:
				typeof options.overlapLimit === 'number' || options.overlapLimit === false ? options.overlapLimit : 0.5,
		};

		this.rbush = new RBush(this.__options.maxEntries, ['.aabb.x1', '.aabb.y1', '.aabb.x2', '.aabb.y2']);
		this.MAX_CHECKS = this.__options.maxChecks;
		this.OVERLAP_LIMIT = this.__options.overlapLimit;
		this.RESPONSE = new SAT.Response();
		this.BREAK = false;
		this.__moved = [];
		this.__listeners = [];

		this.createColliders(this);
	};

	Crash.RBush = Crash.prototype.RBush = RBush;
	Crash.SAT = Crash.prototype.SAT = SAT;
	Crash.Vector = Crash.prototype.Vector = SAT.Vector;
	Crash.V = Crash.prototype.V = SAT.Vector;
	Crash.Response = Crash.prototype.Response = SAT.Response;

	Crash.extend = Crash.prototype.extend = function (child, base) {
		child.prototype = Object.create(base.prototype, {
			constructor: {
				value: child,
				enumerable: false,
				writable: true,
				configurable: true,
			},
		});
	};

	Crash.getTestString = Crash.prototype.getTestString = function (type1, type2) {
		return type1 === 'circle'
			? type2 === 'circle'
				? 'testCircleCircle'
				: 'testCirclePolygon'
			: type2 === 'circle'
				? 'testPolygonCircle'
				: 'testPolygonPolygon';
	};

	/***********
	 * EXPORTS *
	 * METHODS *
	 ***********/

	Crash.prototype.reset = function () {
		this.clear();
		this.__listeners = [];
		this.BREAK = false;
		this.MAX_CHECKS = this.__options.maxChecks;
		this.OVERLAP_LIMIT = this.__options.overlapLimit;
		this.RESPONSE.clear();

		return this;
	};

	Crash.prototype.onCollision = function (listener) {
		this.__listeners.push(listener);

		return this;
	};

	Crash.prototype.offCollision = function (listener) {
		var index = this.__listeners.indexOf(listener);
		if (index > -1) {
			this.__listeners.splice(index, 1);
		}

		return this;
	};

	Crash.prototype.__onCollision = function (a, b, res) {
		for (var i = 0, len = this.__listeners.length; i < len; i++) {
			this.__listeners[i].call(this, a, b, res, this.cancel);
		}

		return this;
	};

	Crash.prototype.cancel = function () {
		this.BREAK = true;
		return false;
	};

	Crash.prototype.insert = function (collider) {
		// console.log(`adding ${collider.data.taroId} to crash.all()`)
		this.rbush.insert(collider);

		return this;
	};

	Crash.prototype.remove = function (collider) {
		this.rbush.remove(collider);

		return this;
	};

	Crash.prototype.all = function () {
		return this.rbush.all();
	};

	Crash.prototype.search = function (collider) {
		SEARCH_OBJECT.minX = collider.aabb.x1;
		SEARCH_OBJECT.minY = collider.aabb.y1;
		SEARCH_OBJECT.maxX = collider.aabb.x2;
		SEARCH_OBJECT.maxY = collider.aabb.y2;
		var res = this.rbush.search(SEARCH_OBJECT);

		// Remove 'collider' from 'res'
		// In some cases, it appears multiple times, so we have to loop over 'res' and splice it out
		for (var i = 0; i < res.length; i++) {
			if (res[i] === collider) {
				res.splice(i, 1);
			}
		}

		return res;
	};

	Crash.prototype.clear = function () {
		this.rbush.clear();
		this.__moved = [];

		return this;
	};

	Crash.prototype.addToMoved = function (collider) {
		if (this.__moved.indexOf(collider) === -1) {
			this.__moved.push(collider);
		}

		return this;
	};

	Crash.prototype.update = function (collider) {
		// for some reason, rbush can fail to
		// remove the collider if updateAABB
		// is called before the collider is removed
		this.remove(collider);
		this.updateAABB(collider);
		this.insert(collider);

		return this;
	};

	Crash.prototype.moved = function (collider) {
		this.update(collider);
		this.addToMoved(collider);

		return this;
	};

	/****************
	 * AABB UPDATES *
	 ****************/

	Crash.updateAABB = Crash.prototype.updateAABB = function (collider) {
		switch (collider.type) {
			case 'polygon':
				return this.updateAABBPolygon(collider);
			case 'box':
				return this.updateAABBBox(collider);
			case 'circle':
				return this.updateAABBCircle(collider);
			case 'point':
				return this.updateAABBPoint(collider);
		}
	};

	Crash.updateAABBPolygon = Crash.prototype.updateAABBPolygon = function (collider) {
		var aabb = collider.aabb;
		var pos = collider.sat.pos;
		var points = collider.sat.calcPoints;
		var len = points.length;
		var xMin = points[0].x;
		var yMin = points[0].y;
		var xMax = points[0].x;
		var yMax = points[0].y;
		for (var i = 1; i < len; i++) {
			var point = points[i];
			if (point.x < xMin) {
				xMin = point.x;
			} else if (point.x > xMax) {
				xMax = point.x;
			}
			if (point.y < yMin) {
				yMin = point.y;
			} else if (point.y > yMax) {
				yMax = point.y;
			}
		}

		aabb.x1 = pos.x + xMin;
		aabb.y1 = pos.y + yMin;
		aabb.x2 = pos.x + xMax;
		aabb.y2 = pos.y + yMax;
	};

	Crash.updateAABBCircle = Crash.prototype.updateAABBCircle = function (collider) {
		var aabb = collider.aabb;
		var r = collider.sat.r;
		var center = collider.sat.pos;

		aabb.x1 = center.x - r;
		aabb.y1 = center.y - r;
		aabb.x2 = center.x + r;
		aabb.y2 = center.y + r;
	};

	Crash.updateAABBPoint = Crash.prototype.updateAABBPoint = function (collider) {
		var aabb = collider.aabb;
		var pos = collider.sat.pos;

		aabb.x1 = aabb.x2 = pos.x;
		aabb.y1 = aabb.y2 = pos.x;
	};

	Crash.updateAABBBox = Crash.prototype.updateAABBBox = function (collider) {
		var points = collider.sat.calcPoints;
		var aabb = collider.aabb;
		var pos = collider.sat.pos;

		aabb.x1 = pos.x + points[0].x;
		aabb.y1 = pos.y + points[0].y;
		aabb.x2 = pos.x + points[2].x;
		aabb.y2 = pos.y + points[2].y;
	};

	/*********
	 * TESTS *
	 *********/

	Crash.test = Crash.prototype.test = function (a, b, res) {
		var res = res || this.RESPONSE;
		var str = this.getTestString(a.type, b.type);

		res.clear();
		return SAT[str](a.sat, b.sat, res);
	};

	Crash.prototype.testAll = function (a, res) {
		var res = res || this.RESPONSE;
		var possible = this.search(a);
		// console.log(`Before inner for loop, B, length of Rbush.search result: ${possible.length}`);
		loop: for (var i = 0, len = possible.length; i < len; i++) {
			var b = possible[i];
			var str = this.getTestString(a.type, b.type);

			res.clear();

			if (SAT[str](a.sat, b.sat, res)) {
				// Fix collisions with infinitely small overlaps causing way too many loops
				if (!this.OVERLAP_LIMIT || Math.abs(res.overlap) > this.OVERLAP_LIMIT) {
					this.__onCollision(a, b, res);
					if (this.BREAK) {
						// console.log('\nWE ARE CALLING Crash.cancel()\n');
						break loop;
					}
				}
			}
		}

		a.lastPos.copy(a.pos);

		var cancelled = this.BREAK;
		this.BREAK = false;

		return !cancelled;
	};

	Crash.prototype.check = function (res) {
		var i = 0;
		while (this.__moved.length && i < this.MAX_CHECKS) {
			var collider = this.__moved.pop();
			var index = ALL_MOVED.indexOf(collider);
			if (index === -1) {
				ALL_MOVED.push(collider);
			}

			// console.log(`Crash.__moved.length inside the while loop, A: ${this.__moved.length}`);
			this.testAll(collider, res);
			i++;
		}

		// console.log(`Crash.check() loop A iterations this frame: ${i}`);

		for (var i = 0, len = ALL_MOVED.length; i < len; i++) {
			ALL_MOVED[i].lastCheckedPos.copy(ALL_MOVED[i].pos);
		}
		ALL_MOVED.length = 0;

		return this;
	};

	Crash.prototype.checkAll = function (res) {
		var all = this.all();
		for (var i = 0, len = all.length; i < len; i++) {
			this.testAll(all[i], res);
		}
		this.check(res);

		return this;
	};

	/***********
	 * CLASSES *
	 ***********/

	Crash.createColliders = Crash.prototype.createColliders = function (crash) {
		var Collider = (crash.Collider = function Collider(type, sat, insert, data) {
			this.type = type;
			this.sat = sat;
			this.data = data;
			this.pos = this.sat.pos;
			this.lastPos = this.pos.clone();
			this.lastCheckedPos = this.pos.clone();
			this.aabb = {};
			//
			// adding support for awake flag
			this.awake = true;

			crash.updateAABB(this);

			if (insert) {
				crash.insert(this);
			}

			return this;
		});

		Collider.prototype.insert = function () {
			//HERE
			if (this.awake) {
				crash.insert(this);
			}
			return this;
		};

		Collider.prototype.setAngle = function (angle) {
			this.sat.setAngle(angle);
		};

		Collider.prototype.remove = function () {
			//Not sure if we should consider awake for removes.
			crash.remove(this);

			return this;
		};

		Collider.prototype.update = function () {
			//HERE
			if (this.awake) {
				crash.update(this);
			}
			return this;
		};

		Collider.prototype.updateAABB = function () {
			//HERE
			if (this.awake) {
				crash.updateAABB(this);
			}
			return this;
		};

		Collider.prototype.moved = function () {
			//HERE
			if (this.awake) {
				crash.moved(this);
			}
			return this;
		};

		Collider.prototype.search = function () {
			return crash.search(this);
		};

		Collider.prototype.setData = function (data) {
			this.data = data;

			return this;
		};

		Collider.prototype.getData = function () {
			return this.data;
		};

		Collider.prototype.moveTo = function (x, y) {
			this.sat.pos.x = x;
			this.sat.pos.y = y;
			this.moved();

			return this;
		};

		Collider.prototype.moveBy = Collider.prototype.move = function (x, y) {
			this.sat.pos.x += x;
			this.sat.pos.y += y;
			this.moved();

			return this;
		};

		/**
		 * adding this method to allow Vectors and
		 * their methods
		 * @param {Vector} vector
		 * @return {*} for chaining
		 */
		Collider.prototype.moveByVec = Collider.prototype.moveByVec = function (vector) {
			this.sat.pos.add(vector);
			this.moved();

			return this;
		};

		var Polygon = (crash.Polygon = function Polygon(pos, points, insert, data) {
			var sat = new SAT.Polygon(pos, points);
			Collider.call(this, 'polygon', sat, insert, data);

			return this;
		});

		Crash.extend(Polygon, Collider);

		Polygon.prototype.setPoints = function (points) {
			this.sat.setPoints(points);
			this.moved();

			return this;
		};

		Polygon.prototype.setAngle = function (angle) {
			this.sat.setAngle(angle);
			this.moved();

			return this;
		};

		Polygon.prototype.setOffset = function (offset) {
			this.sat.setOffset(offset);
			this.moved();

			return this;
		};

		Polygon.prototype.rotate = function (angle) {
			this.sat.rotate(angle);
			this.moved();

			return this;
		};

		var Circle = (crash.Circle = function Circle(pos, r, insert, data) {
			var sat = new SAT.Circle(pos, r);
			Collider.call(this, 'circle', sat, insert, data);

			return this;
		});

		Crash.extend(Circle, Collider);

		var Point = (crash.Point = function Point(pos, insert, data) {
			var sat = new SAT.Box(pos, 1, 1).toPolygon();
			Collider.call(this, 'point', sat, insert, data);

			return this;
		});

		Crash.extend(Point, Collider);

		var Box = (crash.Box = function Box(pos, w, h, insert, data) {
			var sat = new SAT.Box(pos, w, h).toPolygon();
			Collider.call(this, 'box', sat, insert, data);

			return this;
		});

		Crash.extend(Box, Collider); // moved this above new proto

		Box.prototype.rotate = function (angle) {
			// added this
			this.sat.rotate(angle);
			this.moved();

			return this;
		};
	};

	return Crash;
});
