var ParticleEmitter = TaroEntity.extend({
	classId: 'ParticleEmitter',

	init: function (data) {
		TaroEntity.prototype.init.call(this);
		var self = this;
		self.category('particleEmitter');
		self._entity = taro.$(data.entityId);
		self._hasStarted = false;
		self._typeId = data.particleEmitterTypeId;

		taro.client.emit('create-particle-emitter', {
			particleEmitterTypeId: data.particleEmitterTypeId,
			position: { x: 0, y: 0 },
			angle: 0,
			entityId: data.entityId,
		});
	},

	getParentEntity: function () {
		return this._entity;
	},

	start: function () {
		if (!this._hasStarted) {
			this._hasStarted = true;
			taro.client.emit('start-emitting-particles', {
				particleEmitterTypeId: this._typeId,
				entityId: this._entity.id(),
			});
		}
	},

	stop: function () {
		if (this._hasStarted) {
			this._hasStarted = false;
			taro.client.emit('stop-emitting-particles', {
				particleEmitterTypeId: this._typeId,
				entityId: this._entity.id(),
			});
		}
	},

	destroy: function () {
		TaroEntity.prototype.destroy.call(this);
	},

	_behaviour: function () {},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ParticleEmitter;
}
