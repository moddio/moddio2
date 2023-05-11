var Projectile = TaroEntityPhysics.extend({
	classId: 'Projectile',

	init: function (data, entityIdFromServer) {
		TaroEntityPhysics.prototype.init.call(this, data.defaultData);
		this.id(entityIdFromServer);
		var self = this;
		self.category('projectile');

		var projectileData = {};
		if (taro.isClient) {
			projectileData = taro.game.getAsset('projectileTypes', data.type);
		}

		self.entityId = this._id;
		self._stats = {...projectileData, ...data};

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

		if (taro.isServer) {
			self.mount(taro.$('baseScene'));
		}

		if (self._stats.sourceItemId === undefined || self._streamMode) this.startRendering();

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

		self.addComponent(ScriptComponent); // entity-scripting
		self.script.load(data.scripts);

		// convert number variables into Int
		self.parseEntityObject(self._stats);

		// console.log(self._stats.lifeSpan)
		if (self._stats.lifeSpan != undefined) {
			this.lifeSpan(self._stats.lifeSpan);
		}

		this.updateBody(data.defaultData);

		var sourceItem = this.getSourceItem();

		if (taro.isServer) {

			// stream projectile data if
			if (!taro.network.isPaused && (
					!taro.game.data.defaultData.clientPhysicsEngine || // client side isn't running physics (csp requires physics) OR
					!sourceItem || // projectile does not have source item (created via script) OR
					(sourceItem && sourceItem._stats.projectileStreamMode == 1) // item is set to stream its projectiles from server
				)
			) {
				this.streamMode(1);
			} else {
				this.streamMode(0);
			}
			taro.server.totalProjectilesCreated++;
		} else if (taro.isClient) {
			if (currentState) {
				var defaultAnimation = this._stats.animations[currentState.animation];
				this.addToRenderer(defaultAnimation && defaultAnimation.frames[0] - 1, data.defaultData);
			}
			self.drawBounds(false);

			self.updateLayer();
			self.updateTexture();

		}
		this.playEffect('create');

		// add behaviour also have isClient block so we will have to execute this in both client and server
		this.addBehaviour('projectileBehaviour', this._behaviour);
		this.scaleDimensions(this._stats.width, this._stats.height);
	},

	startRendering: function () {
		if (taro.isClient) {
			this.renderingStarted = true;
			taro.client.emit('create-projectile', this);
		}
	},

	_behaviour: function (ctx) {
		var self = this;
		_.forEach(taro.triggersQueued, function (trigger) {
			trigger.params['thisEntityId'] = self.id();
			self.script.trigger(trigger.name, trigger.params);
		});

		// if entity (unit/item/player/projectile) has attribute, run regenerate
		if (taro.isServer) {
			if (this.attribute) {
				this.attribute.regenerate();
			}
		}

		if (taro.physics && taro.physics.engine != 'CRASH') {
			this.processBox2dQueue();
		}
	},

	changeProjectileType: function (type, defaultData) {
		var self = this;
		var sourceUnit = taro.$(this._stats.sourceUnitId);
		var sourceItem = taro.$(this._stats.sourceItemId);

		self.previousState = null;

		var data = taro.game.getAsset('projectileTypes', type);
		delete data.type // hotfix for dealing with corrupted game json that has unitData.type = "unitType". This is caused by bug in the game editor.

		if (data == undefined) {
			taro.script.errorLog('changeProjectileType: invalid data');
			return;
		}

		self.script.load(data.scripts);

		self._stats.type = type;

		// adding this flag so that clients receiving entity data from onStreamCreate don't overwrite values with default data
		// when they are created by a client that has just joined.
		for (var i in data) {
			if (i == 'name') { // don't overwrite projectile's name with projectile type name
				continue;
			}
			self._stats[i] = data[i];
		}
		// if the new projectile type has the same entity variables as the old projectile type, then pass the values
		var variables = {};
		if (data.variables) {
			for (var key in data.variables) {
				if (self.variables && self.variables[key]) {
					variables[key] = self.variables[key] == undefined ? data.variables[key] : self.variables[key];
				} else {
					variables[key] = data.variables[key];
				}
			}
			self.variables = variables;
		}
		// deleting variables from stats bcz it causes json.stringify error due to variable of type unit,item,etc.
		if (self._stats.variables) {
			delete self._stats.variables;
		}
		if (data.attributes) {
			for (var attrId in data.attributes) {
				if (data.attributes[attrId]) {
					var attributeValue = data.attributes[attrId].value; // default attribute value from new projectile type
					if (this._stats.attributes[attrId]) {
						this._stats.attributes[attrId].value = Math.max(data.attributes[attrId].min, Math.min(data.attributes[attrId].max, parseFloat(attributeValue)));
					}
				}
			}
		}

		self.setState(this._stats.stateId, defaultData);

		if (taro.isClient) {
			self.updateTexture();
			//self._scaleTexture();
		}

		this._stats.sourceUnitId = sourceUnit.id();
		this._stats.sourceItemId = sourceItem.id();

	},

	streamUpdateData: function (queuedData) {

		// if (taro.isServer && taro.network.isPaused) 
		// 	return;
			
		TaroEntity.prototype.streamUpdateData.call(this, data);
		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];

				switch (attrName) {

					case 'scaleBody':
						this._stats[attrName] = newValue;
						if (taro.isServer) {
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
						} else if (taro.isClient) {
							this._stats.scale = newValue;
							this._scaleTexture();
						}
						break;
				}
			}
		}
	},

	tick: function (ctx) {
		TaroEntity.prototype.tick.call(this, ctx);
	},

	setSourceUnit: function (unit) {
		if (unit) {
			this._stats.sourceUnitId = unit.id();
			this.streamUpdateData([{sourceUnitId: unit.id()}]) // stream update to the clients			
		}
	},

	getSourceItem: function () {
		var self = this;

		return self._stats && self._stats.sourceItemId && taro.$(self._stats.sourceItemId);
	},

	destroy: function () {
		this.playEffect('destroy');
		TaroEntityPhysics.prototype.destroy.call(this);
		if (taro.physics && taro.physics.engine == 'CRASH') {
			this.destroyBody();
		}
	}, 

	// update this projectile's stats in the client side
	streamUpdateData: function (queuedData) {
		var self = this;
		TaroEntity.prototype.streamUpdateData.call(this, queuedData);
		
		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];

				switch (attrName) {
					case 'sourceUnitId':
						this._stats.sourceUnitId = newValue;
						break;
				}
			}
		}
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = Projectile;
}
