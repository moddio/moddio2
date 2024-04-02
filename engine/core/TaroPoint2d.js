/**
 * Creates a new 2d point (x, y).
 */
var TaroPoint2d = TaroClass.extend({
	classId: 'TaroPoint2d',

	init: function (x, y, floor) {
		// Set values to the passed parameters or
		// zero if they are undefined
		// Commented for increase performance over stability checks
		/* if (x === undefined) { debugger; }
		if (y === undefined) { debugger; } */
		this.x = x = x !== undefined ? x : 0;
		this.y = y = y !== undefined ? y : 0;

		this._floor = floor !== undefined;

		if (this._floor) {
			this.x2 = Math.floor(x / 2);
			this.y2 = Math.floor(y / 2);
		} else {
			this.x2 = x / 2;
			this.y2 = y / 2;
		}

		return this;
	},

	/**
	 * Gets / sets the floor mode of this point. If set to true the point's
	 * data will be mathematically floored when they are assigned.
	 * @param val
	 * @return {*}
	 */
	floor: function (val) {
		if (val !== undefined) {
			this._floor = val;
			return this;
		}

		return this._floor;
	},

	/**
	 * Compares this point's x, y data with the passed point and returns
	 * true if they are the same and false if any is different.
	 * @param {TaroPoint2d} point The point to compare data with.
	 * @return {Boolean}
	 */
	compare: function (point) {
		return point && this.x === point.x && this.y === point.y;
	},

	/**
	 * Copies the x, y data from the passed point and overwrites this
	 * point's data with those values.
	 * @param {TaroPoint2d} point The point to copy values from.
	 * @returns {*}
	 */
	copy: function (point) {
		this.x = point.x;
		this.y = point.y;
		this.z = point.z;

		return this;
	},

	/**
	 * Converts the point's x, y to an isometric x, y 2d co-ordinate
	 * and returns an object whose x, y values are the result.
	 * @return {Object}
	 */
	toIso: function () {
		var sx = this.x - this.y;
		var sy = (this.x + this.y) * 0.5;

		return { x: sx, y: sy };
	},

	/**
	 * Converts this point's x, y data into isometric co-ordinate space
	 * and overwrites the previous x, y values with the result.
	 * @return {*}
	 */
	thisToIso: function () {
		var val = this.toIso();
		this.x = val.x;
		this.y = val.y;

		return this;
	},

	/**
	 * Converts this point's x, y data into 2d co-ordinate space
	 * and returns an object whose x, y values are the result.
	 * @return {Object}
	 */
	to2d: function () {
		var sx = this.y + this.x / 2;
		var sy = this.y - this.x / 2;

		return { x: sx, y: sy };
	},

	/**
	 * Converts this point's x, y data into 2d co-ordinate space
	 * and overwrites the previous x, y values with the result.
	 * @return {*}
	 */
	thisTo2d: function () {
		var val = this.to2d();
		this.x = val.x;
		this.y = val.y;

		return this;
	},

	/**
	 * Adds this point's data by the x, y, values specified
	 * and returns a new TaroPoint2d whose values are the result.
	 * @param point
	 * @return {*}
	 */
	addPoint: function (point) {
		return new TaroPoint2d(this.x + point.x, this.y + point.y);
	},

	/**
	 * Adds this point's data by the x, y values specified and
	 * overwrites the previous x, y values with the result.
	 * @param point
	 * @return {*}
	 */
	thisAddPoint: function (point) {
		this.x += point.x;
		this.y += point.y;

		return this;
	},

	/**
	 * Minuses this point's data by the x, y values specified
	 * and returns a new TaroPoint2d whose values are the result.
	 * @param point
	 * @return {*}
	 */
	minusPoint: function (point) {
		return new TaroPoint2d(this.x - point.x, this.y - point.y);
	},

	/**
	 * Minuses this point's data by the x, y values specified and
	 * overwrites the previous x, y values with the result.
	 * @param point
	 * @return {*}
	 */
	thisMinusPoint: function (point) {
		this.x -= point.x;
		this.y -= point.y;

		return this;
	},

	/**
	 * Multiplies this point's data by the x, y values specified
	 * and returns a new TaroPoint2d whose values are the result.
	 * @param x
	 * @param y
	 * @return {*}
	 */
	multiply: function (x, y) {
		return new TaroPoint2d(this.x * x, this.y * y);
	},

	/**
	 * Multiplies this point's data by the point specified
	 * and returns a new TaroPoint2d whose values are the result.
	 * @param {TaroPoint2d} point
	 * @return {*}
	 */
	multiplyPoint: function (point) {
		return new TaroPoint2d(this.x * point.x, this.y * point.y);
	},

	/**
	 * Multiplies this point's data by the x, y values specified and
	 * overwrites the previous x, y values with the result.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 */
	thisMultiply: function (x, y) {
		this.x *= x;
		this.y *= y;

		return this;
	},

	/**
	 * Divides this point's data by the x, y values specified
	 * and returns a new TaroPoint2d whose values are the result.
	 * @param x
	 * @param y
	 * @return {*}
	 */
	divide: function (x, y) {
		return new TaroPoint2d(this.x / x, this.y / y);
	},

	/**
	 * Divides this point's data by the point specified
	 * and returns a new TaroPoint2d whose values are the result.
	 * @param {TaroPoint2d} point
	 * @return {*}
	 */
	dividePoint: function (point) {
		var newX = this.x;
		var newY = this.y;

		if (point.x) {
			newX = this.x / point.x;
		}
		if (point.y) {
			newY = this.y / point.y;
		}

		return new TaroPoint2d(newX, newY);
	},

	/**
	 * Divides this point's data by the x, y values specified and
	 * overwrites the previous x, y values with the result.
	 * @param x
	 * @param y
	 * @return {*}
	 */
	thisDivide: function (x, y) {
		this.x /= x;
		this.y /= y;

		return this;
	},

	/**
	 * Returns a clone of this TaroPoint2d's data as a new instance.
	 * @return {*}
	 */
	clone: function () {
		return new TaroPoint2d(this.x, this.y);
	},

	/**
	 * Interpolates the x, y values of this point towards the endPoint's
	 * x, y values based on the passed time variables and returns a new
	 * TaroPoint2d whose values are the result.
	 * @param endPoint
	 * @param startTime
	 * @param currentTime
	 * @param endTime
	 * @return {*}
	 */
	interpolate: function (endPoint, startTime, currentTime, endTime) {
		var totalX = endPoint.x - this.x;
		var totalY = endPoint.y - this.y;
		var totalTime = endTime - startTime;
		var deltaTime = totalTime - (currentTime - startTime);
		var timeRatio = deltaTime / totalTime;

		return new TaroPoint2d(endPoint.x - totalX * timeRatio, endPoint.y - totalY * timeRatio);
	},

	/**
	 * Rotates the point by the given radians.
	 * @param {Number} radians Radians to rotate by.
	 * @return {TaroPoint2d} A new point with the rotated x, y.
	 */
	rotate: function (radians) {
		var s = Math.sin(radians);
		var c = Math.cos(radians);
		var x = c * this.x - s * this.y;
		var y = s * this.x - c * this.y;

		return new TaroPoint2d(x, y);
	},

	/**
	 * Rotates the point by the given radians and updates this point
	 * to the new x, y values.
	 * @param {Number} radians Radians to rotate by.
	 * @return {TaroPoint2d} This point.
	 */
	thisRotate: function (radians) {
		var s = Math.sin(radians);
		var c = Math.cos(radians);
		var x = this.x;
		var y = this.y;

		this.x = c * x - s * y;
		this.y = s * x - c * y;

		return this;
	},

	/**
	 * Returns a string representation of the point's x, y
	 * converting floating point values into fixed using the
	 * passed precision parameter. If no precision is specified
	 * then the precision defaults to 2.
	 * @param {Number=} precision
	 * @return {String}
	 */
	toString: function (precision) {
		if (precision === undefined) {
			precision = 2;
		}

		if (this.x == undefined || this.y == undefined) {
			return '0,0';
		}

		return `${parseFloat(this.x).toFixed(precision)},${parseFloat(this.y).toFixed(precision)}`;
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroPoint2d;
}
