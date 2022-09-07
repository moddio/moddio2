var Projectile = IgeEntityPhysics.extend({
	classId: 'Projectile',

	init: function (data, entityIdFromServer) {
		IgeEntityPhysics.prototype.init.call(this, data.defaultData);
		this.id(entityIdFromServer);
		var self = this;
		self.category('projectile');
		var projectileData = {};
		if (ige.isClient) {
			projectileData = ige.game.getAsset('projectileTypes', data.type);
			projectileData = _.pick(projectileData, ige.client.keysToAddBeforeRender);
		}

		self.entityId = this._id;

		self._stats = Object.assign(
			data,
			projectileData
		);

		// dont save variables in _stats as _stats is stringified and synced
		// and some variables of type unit, item, projectile may contain circular json objects
		if (self._stats.variables) {
			self.variables = self._stats.variables;
			delete self._stats.variables;
		}

		// set projectile state to default
		if (!self._stats.stateId) {
			for (var stateKey in self._stats.states) {
				var state = self._stats.states[stateKey];
				if (state && state.name === 'default') {
					self._stats.stateId = stateKey;
					break;
				}
			}
		}

		if (ige.isServer) {
			self.mount(ige.$('baseScene'));
		}

		if (ige.isClient) {
			ige.client.emit('create-projectile', this);
		}

		if (self._stats.states) {
			var currentState = self._stats.states[self._stats.stateId];
			if (currentState) {
				var body = self._stats.bodies && self._stats.bodies[currentState.body] || { type: 'none' };
				if (body) {
					self._stats.currentBody = body;
					self.width(self._stats.currentBody.width);
					self.height(self._stats.currentBody.height);
				} else {
					// console.log('No body found for projectile', this._stats.name)
					return;
				}
			}
		}

		self.addComponent(AttributeComponent); // every projectile gets one
		// convert number variables into Int
		self.parseEntityObject(self._stats);

		// console.log(self._stats.lifeSpan)
		if (self._stats.lifeSpan != undefined) {
			this.lifeSpan(self._stats.lifeSpan);
		}

		this.updateBody(data.defaultData);
		// console.log("previousFrame", this.previousFrame)

		var sourceItem = this.getSourceItem();
		if ( // stream projectile data if
			!ige.game.data.defaultData.clientPhysicsEngine || // client side isn't running physics (csp requires physics) OR
			!sourceItem || // projectile does not have source item (created via script) OR
			(sourceItem && sourceItem._stats.projectileStreamMode) // item is set to stream its projectiles from server
		) {
			this.streamMode(1);
		} else {
			this.streamMode(0);
		}

		if (ige.isServer) {
			ige.server.totalProjectilesCreated++;
		} else if (ige.isClient) {

			if (currentState) {
				var defaultAnimation = this._stats.animations[currentState.animation];
				this.addToRenderer(defaultAnimation && defaultAnimation.frames[0] - 1, data.defaultData);
			}
			self.drawBounds(false);

			self.updateLayer();
			self.updateTexture();
			//mouseEvents for sandbox mode only
			self.mouseEvents();

		}
		this.playEffect('create');

		// add behaviour also have isClient block so we will have to execute this in both client and server
		this.addBehaviour('projectileBehaviour', this._behaviour);
		this.scaleDimensions(this._stats.width, this._stats.height);
	},

	_behaviour: function (ctx) {
		// if entity (unit/item/player/projectile) has attribute, run regenerate
		if (ige.isServer) {
			if (this.attribute) {
				this.attribute.regenerate();
			}
		}

		if (ige.physics && ige.physics.engine != 'CRASH') {
			this.processBox2dQueue();
		}
	},

	streamUpdateData: function (queuedData) {
		IgeEntity.prototype.streamUpdateData.call(this, data);
		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];

				switch (attrName) {

					case 'scaleBody':
						if (ige.isServer) {
							// finding all attach entities before changing body dimensions
							if (this.jointsAttached) {
								var attachedEntities = {};
								for (var entityId in this.jointsAttached) {
									if (entityId != this.id()) {
										attachedEntities[entityId] = true;
									}
								}
							}

							this._scaleBox2dBody(newValue);
						} else if (ige.isClient) {
							this._stats.scale = newValue;
							this._scaleTexture();
						}
						break;
				}
			}
		}
	},

	tick: function (ctx) {
		IgeEntity.prototype.tick.call(this, ctx);
	},

	getSourceItem: function () {
		var self = this;

		return self._stats && self._stats.sourceItemId && ige.$(self._stats.sourceItemId);
	},
	destroy: function () {
		this.playEffect('destroy');
		IgeEntityPhysics.prototype.destroy.call(this);
		if (ige.physics && ige.physics.engine == 'CRASH') {
			this.destroyBody();
		}
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = Projectile;
}
