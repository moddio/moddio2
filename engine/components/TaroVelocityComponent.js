// TODO: Doc this class!
var TaroVelocityComponent = TaroClass.extend({
	classId: 'TaroVelocityComponent',
	componentId: 'velocity',

	init: function (entity, options) {
		this._entity = entity;

		this._velocity = new TaroPoint3d(0, 0, 0);
		this._friction = new TaroPoint3d(1, 1, 1);

		// Add the velocity behaviour to the entity
		entity.addBehaviour('velocity', this._behaviour);
	},

	/**
	 * The behaviour method executed each tick.
	 * @param ctx
	 * @private
	 */
	_behaviour: function (ctx) {
		if (this.velocity != undefined) this.velocity.tick(ctx);
	},

	byAngleAndPower: function (radians, power, relative) {
		var vel = this._velocity;
		var x = Math.cos(radians) * power;
		var y = Math.sin(radians) * power;
		var z = 0;

		if (!relative) {
			vel.x = x;
			vel.y = y;
			vel.z = z;
		} else {
			vel.x += x;
			vel.y += y;
			vel.z += z;
		}

		return this._entity;
	},

	xyz: function (x, y, z, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.x = x;
			vel.y = y;
			vel.z = z;
		} else {
			vel.x += x;
			vel.y += y;
			vel.z += z;
		}

		return this._entity;
	},

	x: function (x, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.x = x;
		} else {
			vel.x += x;
		}

		return this._entity;
	},

	y: function (y, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.y = y;
		} else {
			vel.y += y;
		}

		return this._entity;
	},

	z: function (z, relative) {
		var vel = this._velocity;

		if (!relative) {
			vel.z = y;
		} else {
			vel.z += z;
		}

		return this._entity;
	},

	vector3: function (vector, relative) {
		if (typeof vector.scale !== 'number') {
			vector.scale = 1; // Default to 1
		}

		var vel = this._velocity;
		var x = vector.x;
		var y = vector.y;
		var z = vector.z;

		if (!relative) {
			vel.x = x;
			vel.y = y;
			vel.z = z;
		} else {
			vel.x += x;
			vel.y += y;
			vel.z += z;
		}

		return this._entity;
	},

	friction: function (val) {
		var finalFriction = 1 - val;

		if (finalFriction < 0) {
			finalFriction = 0;
		}

		this._friction = new TaroPoint3d(finalFriction, finalFriction, finalFriction);

		return this._entity;
	},

	linearForce: function (degrees, power) {
		power /= 1000;
		var radians = (degrees * Math.PI) / 180;
		var x = Math.cos(radians) * power;
		var y = Math.sin(radians) * power;
		var z = x * y;
		this._linearForce = new TaroPoint3d(x, y, z);

		return this._entity;
	},

	linearForceXYZ: function (x, y, z) {
		this._linearForce = new TaroPoint3d(x, y, z);
		return this._entity;
	},

	linearForceVector3: function (vector, power, relative) {
		var force = (this._linearForce = this._linearForce || new TaroPoint3d(0, 0, 0));
		var x = vector.x / 1000;
		var y = vector.y / 1000;
		var z = vector.z / 1000;

		if (!relative) {
			force.x = x || 0;
			force.y = y || 0;
			force.z = z || 0;
		} else {
			force.x += x || 0;
			force.y += y || 0;
			force.z += z || 0;
		}

		return this._entity;
	},

	_applyLinearForce: function (delta) {
		if (this._linearForce) {
			var vel = this._velocity;

			vel.x += this._linearForce.x * delta;
			vel.y += this._linearForce.y * delta;
			vel.z += this._linearForce.z * delta;
		}
	},

	_applyFriction: function () {
		var vel = this._velocity;
		var fric = this._friction;

		vel.x *= fric.x;
		vel.y *= fric.y;
		vel.z *= fric.z;
	},

	tick: function (ctx) {
		var delta = taro._tickDelta;
		var vel = this._velocity;
		var x;
		var y;
		var z;

		if (delta) {
			this._applyLinearForce(delta);
			// this._applyFriction();

			x = vel.x * delta;
			y = vel.y * delta;
			z = vel.z * delta;

			if (x || y || z) {
				this._entity.translateBy(x, y, z);
			}
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroVelocityComponent;
}
