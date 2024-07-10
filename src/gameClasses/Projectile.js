var Projectile = TaroEntityPhysics.extend({
	classId: 'Projectile',

	init: function (data, entityIdFromServer) {
		var self = this;
		self.category('projectile');

		TaroEntityPhysics.prototype.init.call(this, data.defaultData);
		this.id(entityIdFromServer);
		var projectileData = {};
		if (taro.isClient) {
			projectileData = taro.game.cloneAsset('projectileTypes', data.type);
		}

		self.entityId = this._id;
		self._stats = _.merge(projectileData, data);
		self._stats.particleEmitters = {};

		// dont save variables in _stats as _stats is stringified and synced
		// and some variables of type unit, item, projectile may contain circular json objects
		self.variables = {};
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

		this.startRendering();

		if (self._stats.states) {
			var currentState = self._stats.states[self._stats.stateId];
			if (currentState) {
				var body = (self._stats.bodies && self._stats.bodies[currentState.body]) || { type: 'none' };
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
		self.addComponent(VariableComponent);

		self.addComponent(ScriptComponent); // entity-scripting
		self.script.load(self._stats.scripts);

		// convert number variables into Int
		self.parseEntityObject(self._stats);

		// console.log(self._stats.lifeSpan)
		if (self._stats.lifeSpan != undefined) {
			this.lifeSpan(self._stats.lifeSpan);
		}

		this.updateBody(data.defaultData);

		if (taro.isServer) {
			// stream projectile data if

			if (
				!taro.game.data.defaultData.clientPhysicsEngine || // always stream if there's no client-side physics
				self._stats.streamMode == 1 ||
				self._stats.streamMode == undefined
			) {
				this.streamMode(1);
				// self.streamCreate(); // do we need this?
			} else {
				this.streamMode(self._stats.streamMode);
			}

			taro.server.totalProjectilesCreated++;
		} else if (taro.isClient) {
			this.initParticleEmitters();

			if (currentState) {
				var defaultAnimation = this._stats.animations[currentState.animation];
				this.addToRenderer(defaultAnimation && defaultAnimation.frames[0] - 1, data.defaultData);
			}
			self.drawBounds(false);

			self.updateLayer();
			self.updateTexture();

			if (this._stats.isHidden) {
				this.hide(true);
			}
		}
		this.playEffect('create');

		// add behaviour also have isClient block so we will have to execute this in both client and server
		this.addBehaviour('projectileBehaviour', this._behaviour);
		this.scaleDimensions(this._stats.width, this._stats.height);

		if (taro.isClient) {
			taro.script.trigger('entityCreatedGlobal', { entityId: this.id() });
			this.script.trigger('entityCreated');
		}
	},

	hide: function () {
		if (taro.isServer) {
			this.streamUpdateData([{ isHidden: true }]);
		}
		TaroEntityPhysics.prototype.destroyBody.call(this);
		TaroEntity.prototype._hide.call(this);
	},

	show: function () {
		if (taro.isServer) {
			this.streamUpdateData([{ isHidden: false }]);
		}
		TaroEntityPhysics.prototype.updateBody.call(this);
		TaroEntity.prototype._show.call(this);
	},

	startRendering: function () {
		if (taro.isClient) {
			this.renderingStarted = true;
			taro.client.emit('create-projectile', this);
			this.updateLayer();
		}
	},

	_behaviour: function (ctx) {
		var self = this;

		if (!taro.gameLoopTickHasExecuted) {
			return;
		}

		_.forEach(taro.triggersQueued, function (trigger) {
			trigger.params['thisEntityId'] = self.id();
			self.script.trigger(trigger.name, trigger.params);
		});

		// if entity (unit/item/player/projectile) has attribute, run regenerate
		if (taro.isServer) {
			if (this.attribute) {
				this.attribute.regenerate();
			}
		} else if (taro.isClient) {
			var processedUpdates = [];
			var updateQueue = taro.client.entityUpdateQueue[this.id()];
			if (updateQueue) {
				for (var key in updateQueue) {
					var value = updateQueue[key];

					processedUpdates.push({ [key]: value });
					delete taro.client.entityUpdateQueue[this.id()][key];

					// remove queue object for this entity is there's no queue remaining in order to prevent memory leak
					if (Object.keys(taro.client.entityUpdateQueue[this.id()]).length == 0) {
						delete taro.client.entityUpdateQueue[this.id()];
					}
				}

				if (processedUpdates.length > 0) {
					this.streamUpdateData(processedUpdates);
				}
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

		var data = taro.game.cloneAsset('projectileTypes', type);
		delete data.type; // hotfix for dealing with corrupted game json that has unitData.type = "unitType". This is caused by bug in the game editor.

		if (data == undefined) {
			taro.script.errorLog('changeProjectileType: invalid data');
			return;
		}

		self.script.load(data.scripts);
		self.script.scriptCache = {};

		self._stats.type = type;

		// adding this flag so that clients receiving entity data from onStreamCreate don't overwrite values with default data
		// when they are created by a client that has just joined.
		for (var i in data) {
			if (i === 'name' || i === 'streamMode') {
				// don't overwrite projectile's name with projectile type name
				continue;
			}
			if (self._stats[i] !== data[i]) console.log(i, self._stats[i], data[i]);
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
						this._stats.attributes[attrId].value = Math.max(
							data.attributes[attrId].min,
							Math.min(data.attributes[attrId].max, parseFloat(attributeValue))
						);
					}
				}
			}
		}

		self.setState(this._stats.stateId, defaultData);

		if (taro.isClient) {
			self.updateTexture();
		}

		this._stats.sourceUnitId = sourceUnit?.id();
		this._stats.sourceItemId = sourceItem?.id();
	},

	resetProjectileType: function () {
		const data = taro.game.cloneAsset('projectileTypes', this._stats.type);

		//reset attributes
		for (var attrId in this._stats.attributes) {
			if (this._stats.attributes[attrId]) {
				var attributeValue = data.attributes[attrId].value; // default attribute value from new unit type
				this._stats.attributes[attrId].value = Math.max(
					data.attributes[attrId].min,
					Math.min(data.attributes[attrId].max, parseFloat(attributeValue))
				);
			}
		}
	},

	streamUpdateData: function (queuedData, clientId) {
		TaroEntity.prototype.streamUpdateData.call(this, queuedData, clientId);
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

					case 'sourceUnitId':
						this._stats.sourceUnitId = newValue;
						break;

					case 'sourceItemId':
						this._stats.sourceItemId = newValue;
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
			this.streamUpdateData([{ sourceUnitId: unit.id() }]); // stream update to the clients
		}
	},

	setSourceItem: function (item) {
		if (item) {
			this._stats.sourceItemId = item.id();
			this.streamUpdateData([{ sourceItemId: item.id() }]); // stream update to the clients
		}
	},

	getSourceItem: function () {
		var self = this;

		return self._stats && self._stats.sourceItemId && taro.$(self._stats.sourceItemId);
	},

	destroy: function () {
		this.script.trigger('initEntityDestroy');
		this.playEffect('destroy');
		TaroEntityPhysics.prototype.destroy.call(this);
		if (taro.physics && taro.physics.engine == 'CRASH') {
			this.destroyBody();
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Projectile;
}
