var Sensor = TaroEntityPhysics.extend({
	classId: 'Sensor',

	init: function (ownerUnit, radius) {
		var self = this;
		self.category('sensor');
		self.ownerUnitId = ownerUnit.id();
		TaroEntityPhysics.prototype.init.call(this, {});
		this.updateRadius(radius);
		if (taro.isServer) {
			this.streamMode(0);
		}
		self.mount(taro.$('baseScene'));
		this.addBehaviour('sensorBehaviour', this._behaviour);
	},

	getOwnerUnit: function () {
		return taro.$(this.ownerUnitId);
	},

	updateRadius: function (radius) {
		if (radius > 0) {
			// console.log("updatingRadius to", radius)
			this._stats = {
				currentBody: {
					width: radius * 2,
					height: radius * 2,
					bullet: true,
					fixedRotation: true,
					fixtures: [
						{
							density: 0,
							friction: 0,
							restitution: 0,
							isSensor: true,
							shape: {
								type: 'circle',
							},
						},
					],
					collidesWith: {
						units: true,
						items: true,
						projectiles: true,
					},
				},
			};

			var ownerUnit = taro.$(this.ownerUnitId);
			if (ownerUnit) {
				var defaultData = {
					translate: {
						x: ownerUnit._translate.x,
						y: ownerUnit._translate.y,
					},
				};

				this.updateBody(defaultData);
			} else {
				console.log("ownerUnit doesn't exist!!");
			}
		} else {
			this.destroyBody();
		}
	},

	remove: function () {
		var ownerUnit = this.getOwnerUnit();
		if (ownerUnit) {
			ownerUnit.sensor = undefined;
		}
		TaroEntityPhysics.prototype.remove.call(this);
	},

	destroy: function () {
		TaroEntityPhysics.prototype.destroy.call(this);
	},

	_behaviour: function (ctx) {
		var ownerUnit = this.getOwnerUnit();
		if (ownerUnit) {
			if (this.body) {
				if (taro.physics.engine === 'CRASH') {
					this.translateTo(ownerUnit._translate.x, ownerUnit._translate.y);
				} else this.translateTo(ownerUnit._translate.x, ownerUnit._translate.y); // keep sensor following its owner unit
			}
		} else {
			// destroy ownerless sensors
			this.remove();
		}
		if (taro.physics && taro.physics.engine != 'CRASH') {
			this.processBox2dQueue();
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Sensor;
}
