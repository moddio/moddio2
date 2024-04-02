/**
 * Creates a new 2d polygon made up of TaroPoint2d instances.
 */
var TaroPoly2d = TaroClass.extend({
	classId: 'TaroPoly2d',

	init: function () {
		this._poly = [];
		this._scale = new TaroPoint2d(1, 1);
	},

	scale: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._scale.x = x;
			this._scale.y = y;

			return this;
		}

		return this._scale;
	},

	/**
	 * Multiplies the points of the polygon by the supplied factor.
	 * @param {Number} factor The multiplication factor.
	 * @return {*}
	 */
	multiply: function (factor) {
		if (factor !== undefined) {
			var polyPoints = this._poly;
			var pointCount = polyPoints.length;
			var pointIndex;

			for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				polyPoints[pointIndex].x *= factor;
				polyPoints[pointIndex].y *= factor;
			}
		}

		return this;
	},

	/**
	 * Divides the points of the polygon by the supplied value.
	 * @param {Number} value The divide value.
	 * @return {*}
	 */
	divide: function (value) {
		if (value !== undefined) {
			var polyPoints = this._poly;
			var pointCount = polyPoints.length;
			var pointIndex;

			for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				polyPoints[pointIndex].x /= value;
				polyPoints[pointIndex].y /= value;
			}
		}

		return this;
	},

	/**
	 * Adds a point to the polygon relative to the polygon center at 0, 0.
	 * @param x
	 * @param y
	 */
	addPoint: function (x, y) {
		this._poly.push(new TaroPoint2d(x, y));
		return this;
	},

	/**
	 * Returns the length of the poly array.
	 * @return {Number}
	 */
	length: function () {
		return this._poly.length;
	},

	/**
	 * Check if a point is inside this polygon.
	 * @param {TaroPoint2d} point
	 * @return {Boolean}
	 */
	pointInPoly: function (point) {
		var polyPoints = this._poly;
		var pointCount = polyPoints.length;
		var pointIndex;
		var oldPointIndex = pointCount - 1;
		var c = 0;

		for (pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
			if (
				polyPoints[pointIndex].y > point.y !== polyPoints[oldPointIndex].y > point.y &&
				point.x <
					((polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) * (point.y - polyPoints[pointIndex].y)) /
						(polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) +
						polyPoints[pointIndex].x
			) {
				c = !c;
			}
		}

		return Boolean(c);
	},

	/**
	 * Check if the passed x and y are inside this polygon.
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Boolean}
	 */
	xyInside: function (x, y) {
		var polyPoints = this._poly;
		var pointCount = polyPoints.length;
		var pointIndex;
		var oldPointIndex = pointCount - 1;
		var c = 0;

		for (pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
			if (
				polyPoints[pointIndex].y > y !== polyPoints[oldPointIndex].y > y &&
				x <
					((polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) * (y - polyPoints[pointIndex].y)) /
						(polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) +
						polyPoints[pointIndex].x
			) {
				c = !c;
			}
		}

		return Boolean(c);
	},

	aabb: function () {
		var minX;
		var minY;
		var maxX;
		var maxY;
		var xArr = [];
		var yArr = [];
		var arr = this._poly;
		var arrIndex;
		var arrCount = arr.length;

		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			xArr.push(arr[arrIndex].x);
			yArr.push(arr[arrIndex].y);
		}

		// Get the extents of the newly transformed poly
		minX = Math.min.apply(Math, xArr);
		minY = Math.min.apply(Math, yArr);
		maxX = Math.max.apply(Math, xArr);
		maxY = Math.max.apply(Math, yArr);

		return new TaroRect(minX, minY, maxX - minX, maxY - minY);
	},

	/**
	 * Returns a copy of this TaroPoly2d object that is
	 * it's own version, separate from the original.
	 * @return {TaroPoly2d}
	 */
	clone: function () {
		var newPoly = new TaroPoly2d();
		var arr = this._poly;
		var arrCount = arr.length;
		var i;

		for (i = 0; i < arrCount; i++) {
			newPoly.addPoint(arr[i].x, arr[i].y);
		}

		newPoly.scale(this._scale.x, this._scale.y);

		return newPoly;
	},

	/**
	 * Determines if the polygon is clockwise or not.
	 * @return {Boolean} A boolean true if clockwise or false
	 * if not.
	 */
	clockWiseTriangle: function () {
		// Loop the polygon points and determine if they are counter-clockwise
		var arr = this._poly;
		var val;
		var p1;
		var p2;
		var p3;

		p1 = arr[0];
		p2 = arr[1];
		p3 = arr[2];

		val = p1.x * p2.y + p2.x * p3.y + p3.x * p1.y - p2.y * p3.x - p3.y * p1.x - p1.y * p2.x;

		return val > 0;
	},

	makeClockWiseTriangle: function () {
		// If our data is already clockwise exit
		if (!this.clockWiseTriangle()) {
			var p0 = this._poly[0];
			var p1 = this._poly[1];
			var p2 = this._poly[2];

			this._poly[2] = p1;
			this._poly[1] = p2;
		}
	},

	triangulate: function () {
		// Get the indices of each new triangle
		var poly = this._poly;
		var triangles = [];
		var indices = this.triangulationIndices();
		var i;
		var point1;
		var point2;
		var point3;
		var newPoly;

		// Generate new polygons from the index data
		for (i = 0; i < indices.length; i += 3) {
			point1 = poly[indices[i]];
			point2 = poly[indices[i + 1]];
			point3 = poly[indices[i + 2]];
			newPoly = new TaroPoly2d();

			newPoly.addPoint(point1.x, point1.y);
			newPoly.addPoint(point2.x, point2.y);
			newPoly.addPoint(point3.x, point3.y);

			// Check the new poly and make sure it's clockwise
			newPoly.makeClockWiseTriangle();
			triangles.push(newPoly);
		}

		return triangles;
	},

	triangulationIndices: function () {
		var indices = [];
		var n = this._poly.length;
		var v = [];
		var V = [];
		var nv;
		var count;
		var m;
		var u;
		var w;
		var a;
		var b;
		var c;
		var s;
		var t;

		if (n < 3) {
			return indices;
		}

		if (this._area() > 0) {
			for (v = 0; v < n; v++) {
				V[v] = v;
			}
		} else {
			for (v = 0; v < n; v++) {
				V[v] = n - 1 - v;
			}
		}

		nv = n;
		count = 2 * nv;
		m = 0;

		for (v = nv - 1; nv > 2; ) {
			if (count-- <= 0) {
				return indices;
			}

			u = v;
			if (nv <= u) {
				u = 0;
			}

			v = u + 1;

			if (nv <= v) {
				v = 0;
			}

			w = v + 1;

			if (nv <= w) {
				w = 0;
			}

			if (this._snip(u, v, w, nv, V)) {
				a = V[u];
				b = V[v];
				c = V[w];
				indices.push(a);
				indices.push(b);
				indices.push(c);
				m++;
				s = v;

				for (t = v + 1; t < nv; t++) {
					V[s] = V[t];
					s++;
				}

				nv--;
				count = 2 * nv;
			}
		}

		indices.reverse();
		return indices;
	},

	_area: function () {
		var n = this._poly.length;
		var a = 0.0;
		var q = 0;
		var p;
		var pval;
		var qval;

		for (p = n - 1; q < n; p = q++) {
			pval = this._poly[p];
			qval = this._poly[q];
			a += pval.x * qval.y - qval.x * pval.y;
		}

		return a * 0.5;
	},

	_snip: function (u, v, w, n, V) {
		var p;
		var A = this._poly[V[u]];
		var B = this._poly[V[v]];
		var C = this._poly[V[w]];
		var P;

		// Replaced Math.Epsilon with 0.00001
		if ((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x) < 0.00001) {
			return false;
		}

		for (p = 0; p < n; p++) {
			if (p == u || p == v || p == w) {
				continue;
			}

			P = this._poly[V[p]];
			if (this._insideTriangle(A, B, C, P)) {
				return false;
			}
		}

		return true;
	},

	_insideTriangle: function (A, B, C, P) {
		var ax, ay, bx, by, cx, cy, apx, apy, bpx, bpy, cpx, cpy, cCROSSap, bCROSScp, aCROSSbp;

		ax = C.x - B.x;
		ay = C.y - B.y;
		bx = A.x - C.x;
		by = A.y - C.y;
		cx = B.x - A.x;
		cy = B.y - A.y;
		apx = P.x - A.x;
		apy = P.y - A.y;
		bpx = P.x - B.x;
		bpy = P.y - B.y;
		cpx = P.x - C.x;
		cpy = P.y - C.y;

		aCROSSbp = ax * bpy - ay * bpx;
		cCROSSap = cx * apy - cy * apx;
		bCROSScp = bx * cpy - by * cpx;

		return aCROSSbp >= 0.0 && bCROSScp >= 0.0 && cCROSSap >= 0.0;
	},

	/**
	 * Draws the polygon bounding lines to the passed context.
	 * @param {CanvasRenderingContext2D} ctx
	 */
	render: function (ctx, fill) {
		var polyPoints = this._poly;
		var pointCount = polyPoints.length;
		var scaleX = this._scale.x;
		var scaleY = this._scale.y;
		var i;

		ctx.beginPath();
		ctx.moveTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
		for (i = 1; i < pointCount; i++) {
			ctx.lineTo(polyPoints[i].x * scaleX, polyPoints[i].y * scaleY);
		}
		ctx.lineTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
		if (fill) {
			ctx.fill();
		}
		ctx.stroke();

		return this;
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroPoly2d;
}
