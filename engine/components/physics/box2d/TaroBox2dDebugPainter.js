var TaroBox2dDebugPainter = TaroObject.extend({
	classId: 'TaroBox2dDebugPainter',

	init: function (entity, options) {
		TaroObject.prototype.init.call(this);

		this._entity = entity;
		this._options = options;
	},

	tick: function (ctx) {
		if (this._parent && this._parent.isometricMounts() === 1) {
			ctx.scale(1.414, 0.707); // This should be super-accurate now
			ctx.rotate((45 * Math.PI) / 180);
		}

		this._entity.physics._world.DrawDebugData();

		TaroObject.prototype.tick.call(this, ctx);
	},
});
