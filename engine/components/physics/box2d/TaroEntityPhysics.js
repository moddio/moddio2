/**
 * Creates a new entity with box2d integration.
 */
var TaroEntityPhysics = TaroEntity.extend({
	classId: 'TaroEntityPhysics',

	init: function (defaultData = {}) {
		TaroEntity.prototype.init.call(this, defaultData);
		var self = this;

		this._b2dRef = taro.physics;

		if (taro.isClient) {
			self.addComponent(TaroAnimationComponent);
			// don't create body on clientside if CSP is disabled
		}

		// Check if box2d is enabled in the engine
		if (taro.physics) {
			if (!this._b2dRef._networkDebugMode) {
				// Store the existing transform methods
				this._translateToProto = this.translateTo;
				this._translateByProto = this.translateBy;

				this._rotateToProto = this.rotateTo;
				this._rotateByProto = this.rotateBy;

				// Take over the transform methods
				this.translateTo = this._translateTo;
				this.translateBy = this._translateBy;

				this.rotateTo = this._rotateTo;
				this.rotateBy = this._rotateBy;
			} else {
				this._translateToProto = function () {};
				this._translateByProto = function () {};

				this._rotateToProto = function () {};
				this._rotateByProto = function () {};

				this._updateProto = this.update;
			}
			this.jointsAttached = {};
			this.isOutOfBounds = false;
		}

		this._actionQueue = [];
		this.posHistory = [];
	},

	updateBody: function (defaultData, isLossTolerant) {
		var self = this;

		bodyDef = this._stats.currentBody;

		if (!bodyDef) {
			return;
		}

		if (bodyDef.type === 'none' || bodyDef.type === 'spriteOnly') {
			self.destroyBody();
			return;
		}

		this.width(parseFloat(bodyDef.width * (this._stats.scaleBody || 1)));
		this.height(parseFloat(bodyDef.height * (this._stats.scaleBody || 1)));

		var shapeData =
			bodyDef.fixtures && bodyDef.fixtures[0] && bodyDef.fixtures[0].shape && bodyDef.fixtures[0].shape.data
				? bodyDef.fixtures[0].shape.data
				: undefined;

		// override body bounds
		if (bodyDef?.fixtures) {
			var sizeX = bodyDef?.fixtures[0].size?.width;
			var sizeY = bodyDef?.fixtures[0].size?.height;
			var offsetX = bodyDef?.fixtures[0].offset?.x;
			var offsetY = bodyDef?.fixtures[0].offset?.y;
			if (shapeData === undefined) {
				shapeData = {};
			}
			if (sizeX) {
				shapeData.halfWidth = sizeX / 2;
			}
			if (sizeY) {
				shapeData.halfHeight = sizeY / 2;
			}
			if (offsetX) {
				shapeData.x = offsetX;
			}
			if (offsetY) {
				shapeData.y = offsetY;
			}
		}

		var filterCategoryBits = 0x0002;
		if (this._category === 'units') {
			filterCategoryBits = 0x0002;
		} else if (this._category === 'item') {
			filterCategoryBits = 0x0008;
		} else if (this._category === 'projectile') {
			filterCategoryBits = 0x0010;
		} else if (this._category === 'region') {
			filterCategoryBits = 0x0020;
		} else if (this._category === 'sensor') {
			filterCategoryBits = 0x0040;
		}

		var collidesWith = bodyDef.collidesWith || {};
		// this mask bit are hex so it wonnt incremented by power of 2
		var bodyDef = {
			type: bodyDef.type || 'dynamic',
			linearDamping: parseFloat(bodyDef.linearDamping) || 0,
			angularDamping: parseFloat(bodyDef.angularDamping) || 0,
			allowSleep: false,
			bullet: bodyDef.bullet,
			fixedRotation: bodyDef.fixedRotation,
			affectedByGravity: bodyDef.affectedByGravity != false, // we want undefined to be considered as true for backward compatibility
			fixtures: [
				{
					density: bodyDef.fixtures ? parseFloat(bodyDef.fixtures[0].density) : 0,
					friction: bodyDef.fixtures ? parseFloat(bodyDef.fixtures[0].friction) : 0,
					restitution: bodyDef.fixtures ? bodyDef.fixtures[0].restitution : 0,
					isSensor: bodyDef.fixtures ? bodyDef.fixtures[0].isSensor || false : false,
					filter: {
						filterGroupIndex: 0,
						filterCategoryBits: filterCategoryBits,
						filterMaskBits:
							(collidesWith.walls ? 0x0001 : 0) |
							(collidesWith.units ? 0x0002 : 0) |
							(collidesWith.items ? 0x0008 : 0) |
							(collidesWith.projectiles ? 0x0010 : 0) |
							(this._category != 'sensor' ? 0x0020 : 0) | // all entities aside from sensor will collide with regions
							((this._category == 'unit' || this._category == 'item' || this._category == 'projectile') &&
							collidesWith.sensors !== false
								? 0x0040
								: 0), // units/items/projectile will collide with sensors
					},
					shape: {
						type:
							bodyDef.fixtures && bodyDef.fixtures[0] && bodyDef.fixtures[0].shape && bodyDef.fixtures[0].shape.type
								? bodyDef.fixtures[0].shape.type
								: 'rectangle',
						data: shapeData,
					},
					taroId: this.id(), // in box2dbody, add reference to this entity
				},
			],
		};

		if (taro.physics) {
			if (isLossTolerant) {
				taro.physics.createBody(this, bodyDef, isLossTolerant);
			} else {
				this.destroyBody();
				taro.physics.queueAction({ type: 'createBody', entity: this, def: bodyDef });
			}
		}

		// if initialTranform variable's provided, then transform this entity immediately after body creation
		if (defaultData) {
			var rotate = defaultData.rotate;
			if (bodyDef.fixedRotation) {
				rotate = 0;
			}

			// immediately apply rotate.z if facingAngle is assigned
			if (!isNaN(rotate)) {
				this.rotateTo(0, 0, rotate);
			}

			if (defaultData.translate) {
				var x = defaultData.translate.x;
				var y = defaultData.translate.y;
				this.teleportTo(x, y, rotate);
			}

			// immediately apply speed if assigned
			if (defaultData.velocity && !isNaN(defaultData.velocity.x) && !isNaN(defaultData.velocity.y)) {
				switch (defaultData.velocity.deployMethod) {
					case 'applyForce':
						this.applyForce(defaultData.velocity.x, defaultData.velocity.y);
						break;
					case 'applyImpulse':
						this.applyImpulse(defaultData.velocity.x, defaultData.velocity.y);
						break;

					case 'setVelocity':
					default:
						this.setLinearVelocity(defaultData.velocity.x, defaultData.velocity.y, 0, isLossTolerant);
						break;
				}
			}
		}
	},

	destroyBody: function () {
		TaroEntityPhysics.prototype.log('destroyBody');

		if (this.jointsAttached) {
			for (var entityId in this.jointsAttached) {
				this.detachEntity(entityId);
			}
		}

		taro.physics && taro.physics.queueAction({ type: 'destroyBody', entity: this, body: this.body });
	},
	/**
	 * Gets / sets the box2d body's gravitic value. If set to false,
	 * this entity will not be affected by gravity. If set to true it
	 * will be affected by gravity.
	 * @param {Boolean=} val True to allow gravity to affect this entity.
	 * @returns {*}
	 */
	gravitic: function (val) {
		taro.physics.gravitic(this.body, val);
	},

	on: function () {
		if (arguments.length === 3 && typeof arguments[1] === 'string') {
			var evName = arguments[0];
			var target = arguments[1];
			var callback = arguments[2];
			var type;

			switch (target.substr(0, 1)) {
				case '#':
					type = 0;
					break;

				case '.':
					type = 1;
					break;
			}

			target = target.substr(1, target.length - 1);

			switch (evName) {
				case 'collisionStart':
					this._collisionStartListeners = this._collisionStartListeners || [];
					this._collisionStartListeners.push({
						type: type,
						target: target,
						callback: callback,
					});

					if (!this._contactListener) {
						this._contactListener = this._setupContactListeners();
					}
					break;

				case 'collisionEnd':
					this._collisionEndListeners = this._collisionEndListeners || [];
					this._collisionEndListeners.push({
						type: type,
						target: target,
						callback: callback,
					});

					if (!this._contactListener) {
						this._contactListener = this._setupContactListeners();
					}
					break;

				default:
					TaroEntityPhysics.prototype.log(`Cannot add event listener, event type ${evName} not recognised`, 'error');
					break;
			}
		} else {
			TaroEntity.prototype.on.apply(this, arguments);
		}
	},

	off: function () {
		if (arguments.length === 3) {
		} else {
			TaroEntity.prototype.off.apply(this, arguments);
		}
	},

	// move entity in front of the unit, and then create joint between them
	attachTo: function (entityB, anchorA, anchorB) {
		// Check if the entity has a box2d body attached
		// and if so, is it updating or not
		for (entityId in this.jointsAttached) {
			this.detachEntity(entityId);
		}
		var self = this;
		taro.physics.queueAction({
			type: 'createJoint',
			entityA: self,
			entityB: entityB,
			anchorA: anchorA,
			anchorB: anchorB,
		});
	},

	detachEntity: function (entityId) {
		var attachedEntity = taro.$(entityId);
		if (entityId && attachedEntity) {
			TaroEntityPhysics.prototype.log(`detachEntity ${this._stats.name} ${attachedEntity._stats.name}`);

			taro.physics.queueAction({
				type: 'destroyJoint',
				entityA: this,
				entityB: attachedEntity,
			});
		}
	},

	applyTorque: function (torque) {
		if (taro.physics._world.isLocked() || this.body == undefined) {
			this.queueAction({
				type: 'applyTorque',
				torque: torque,
			});
		} else {
			this.applyTorqueLT(torque);
		}
	},

	setLinearVelocity: function (x, y, z, isLossTolerant) {
		// if body doesn't exist yet, queue
		if ((!taro.physics._world.isLocked() && this.body != undefined) || isLossTolerant) {
			this.setLinearVelocityLT(x, y);
		} else {
			this.queueAction({
				type: 'setLinearVelocity',
				x: x,
				y: y,
			});
		}
	},

	setLinearVelocityLT: function (x, y) {
		try {
			taro.physics.setLinearVelocity(this.body, x, y);
		} catch (e) {
			console.log(`TaroEntityBox2d.js: setLinearVelocityLT ${e}`);
		}
	},

	// lossless applyForce
	applyForce: function (x, y) {
		// if body doesn't exist yet, queue
		if (!taro.physics) return;

		if (!taro.physics._world.isLocked() && this.body != undefined) {
			this.applyForceLT(x, y);
		} else {
			this.queueAction({
				type: 'applyForce',
				x: x,
				y: y,
			});
		}
	},

	// loss tolerant applyForce
	applyForceLT: function (x, y) {
		try {
			taro.physics.applyForce(this.body, x, y);
		} catch (e) {
			TaroEntityPhysics.prototype.log(`taroEntityBox2d.js: applyForce ${e}`);
		}
	},

	// lossless applyForce
	applyImpulse: function (x, y) {
		// if body doesn't exist yet, queue
		if (!taro.physics._world.isLocked() && this.body != undefined) {
			this.applyImpulseLT(x, y);
		} else {
			this.queueAction({
				type: 'applyImpulse',
				x: x,
				y: y,
			});
		}
	},

	// loss tolerant applyForce
	applyImpulseLT: function (x, y) {
		try {
			taro.physics.applyImpulse(this.body, x, y);
		} catch (e) {
			TaroEntityPhysics.prototype.log(`taroEntityBox2d.js: applyForce ${e}`);
		}
	},

	applyTorqueLT: function (torque) {
		try {
			taro.physics.applyTorque(this.body, torque);
		} catch (e) {
			TaroEntityPhysics.prototype.log(`taroEntityBox2d.js: applyTorque ${e}`);
		}
	},

	// TODO(nick): Move to TaroEntity eventually when position is decoupled from
	// physics, as it has nothing to do with physics.
	getPosition: function () {
		return taro.physics.getPosition(this.body);
	},

	getLinearVelocity: function () {
		return taro.physics.getLinearVelocity(this.body);
	},

	_setupContactListeners: function () {
		var self = this;

		taro.physics.contactListener(
			// Listen for when contact's begin
			function (contact) {
				// Loop the collision listeners and check for a match
				var arr = self._collisionStartListeners;

				if (arr) {
					self._checkContact(contact, arr);
				}
			},
			// Listen for when contact's end
			function (contact) {
				// Loop the collision listeners and check for a match
				var arr = self._collisionEndListeners;

				if (arr) {
					self._checkContact(contact, arr);
				}
			}
		);
	},

	_checkContact: function (contact, arr) {
		var self = this;
		var arrCount = arr.length;
		var otherEntity;
		var listener;
		var i;

		if (contact.taroEntityA()._id === self._id) {
			otherEntity = contact.taroEntityB();
		} else if (contact.taroEntityB()._id === self._id) {
			otherEntity = contact.taroEntityA();
		} else {
			// This contact has nothing to do with us
			return;
		}

		for (i = 0; i < arrCount; i++) {
			listener = arr[i];

			if (listener.type === 0) {
				// Listener target is an id
				if (otherEntity._id === listener.target) {
					// Contact with target established, fire callback
					listener.callback(contact);
				}
			}

			if (arr[i].type === 1) {
				// Listener target is a category
				if (otherEntity._category === listener.target) {
					// Contact with target established, fire callback
					listener.callback(contact);
				}
			}
		}
	},

	/**
	 * Takes over translateTo calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 * @private
	 */
	_translateTo: function (x, y) {
		if (isNaN(x) || isNaN(y)) {
			return;
		}
		this._translateToProto(x, y);

		if (this.body) {
			if (taro.physics._world && !taro.physics._world.isLocked()) {
				this.translateToLT(x, y);
			} else {
				this.queueAction({
					type: 'translateTo',
					x: x,
					y: y,
				});
			}
		} else {
			this.queueAction({
				type: 'translateTo',
				x: x,
				y: y,
			});
		}

		return this;
	},

	// loss tolerent
	translateToLT: function (x, y) {
		taro.physics.translateTo(this.body, x, y);
	},

	/**
	 * Takes over translateBy calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @private
	 */
	_translateBy: function (x, y, z) {
		this._translateTo(this._translate.x + x, this._translate.y + y, this._translate.z + z, 'translateBy');
	},

	// loss tolerant
	translateByLT: function (x, y, z) {
		this.translateToLT(this._translate.x + x, this._translate.y + y, this._translate.z + z);
	},
	/**
	 * Takes over translateTo calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @return {*}
	 * @private
	 */
	_rotateTo: function (x, y, z) {
		if (isNaN(x) || isNaN(y) || isNaN(z)) {
			return;
		}
		// Call the original method
		this._rotateToProto(x, y, z);

		bodyDef = this._stats.currentBody;
		if (bodyDef && bodyDef.type !== 'none' && bodyDef.type !== 'spriteOnly') {
			// Check if the entity has a box2d body attached
			// and if so, is it updating or not
			if ((taro.physics._world && taro.physics._world.isLocked()) || this.body == undefined) {
				this.queueAction({
					type: 'rotateTo',
					angle: z,
				});
			} else {
				this.rotateToLT(z);
			}
		}

		return this;
	},

	rotateToLT: function (angle) {
		taro.physics.rotateTo(this.body, angle);
	},

	_scaleTexture: function () {
		var self = this;
		var currentState = (this._stats.states && this._stats.states[this._stats.stateId]) || { body: 'none' };
		var body = {};
		if (!currentState) {
			var defaultStateId = self.getDefaultStateId();
			currentState = (self._stats.states && self._stats.states[defaultStateId]) || { body: 'none' };
		}
		if (currentState && this._stats.bodies) {
			body = this._stats.bodies[currentState.body];
		}
		var newWidth = ((body && body.width) || 1) * self._stats.scale;
		var newHeight = ((body && body.height) || 1) * self._stats.scale;

		self.width(newWidth, false);
		self.height(newHeight, false);
	},

	scaleBodyBy: function (scale) {
		if (isNaN(scale)) {
			return;
		}

		bodyDef = this._stats.currentBody;
		if (bodyDef && bodyDef.type !== 'none' && bodyDef.type !== 'spriteOnly') {
			// Check if the entity has a box2d body attached
			// and if so, is it updating or not
			if ((taro.physics._world && taro.physics._world.isLocked()) || this.body == undefined) {
				this.queueAction({
					type: 'scaleBy',
					scale: scale,
				});
			} else {
				this._scaleBodyBy(scale);
			}
		}

		return this;
	},

	_scaleBodyBy: function (scale) {
		var self = this;
		var bodyDef = this._stats.currentBody;

		if (!bodyDef) {
			return;
		}

		var shapeType = (bodyDef.fixtures[0].shape && bodyDef.fixtures[0].shape.type) || 'rectangle';
		var shapeData = {};

		switch (shapeType) {
			case 'circle': {
				var normalizer = 0.5;
				shapeData.radius = bodyDef.width * scale * normalizer;
				break;
			}
			case 'rectangle': {
				// this should be unnecessary now that shapeData w/h are converted to halfW/H in updateBody()
				// var normalizer = 0.45;
				shapeData.width = bodyDef.width * scale;
				shapeData.height = bodyDef.height * scale;

				break;
			}
		}

		bodyDef.fixtures[0].shape.data = shapeData;
		self.updateBody();
	},

	/**
	 * Takes over translateBy calls and processes box2d movement as well.
	 * @param x
	 * @param y
	 * @param z
	 * @private
	 */
	_rotateBy: function (x, y, z) {
		this._rotateTo(this._rotate.x + x, this._rotate.y + y, this._rotate.z + z);
	},

	/**
	 * Purely for networkDebugMode handling, ensures that an entity's transform is
	 * not taken over by the physics simulation and is instead handled by the engine.
	 * @param ctx
	 * @private
	 */
	_update: function (ctx) {
		// Call the original method
		this._updateProto(ctx);
		this._translateTo(this._translate.x, this._translate.y, this._translate.z, '_update');
		this._rotateTo(this._rotate.x, this._rotate.y, this._rotate.z);
	},

	queueAction: function (action) {
		// prevent 'applyForce' causing memoryleak by overloading actionQueue
		// this means if there's too many actions queued, chances are, applyForce will be ignored ;-;
		// however, regardless of queueSize, translateTo and destroy will always be queued
		if (
			this._actionQueue &&
			(this._actionQueue.length < 10 || action.type == 'destroy' || action.type == 'translateTo')
		) {
			// if we're sending translateTo before previously queued translateTo was processed, then replace the last translatedTo with the newest coordinates.
			var previousAction = this._actionQueue[this._actionQueue.length - 1];
			if (action.type == 'translateTo' && previousAction && previousAction.type == 'translateTo') {
				this._actionQueue[this._actionQueue.length - 1] == action;
			} else {
				this._actionQueue.push(action);
			}
		}
	},

	processQueue: function () {
		// process box2d only when box2d world is unlocked
		if (taro.physics && taro.physics._active && taro.physics._world) {
			if (this.body) {
				var x = 0;

				while (this._actionQueue && this._actionQueue.length > 0) {
					var action = this._actionQueue.shift();

					x++;

					if (x > 1000) {
						console.log(
							'TaroEntityPhysics processQueue running over 1000 times',
							action.type,
							this._category,
							this._stats.name,
							'id:',
							this.id()
						);
					}

					switch (action.type) {
						case 'rotateTo':
							this.rotateToLT(action.angle);
							break;

						case 'translateTo':
							this.translateToLT(action.x, action.y);
							break;

						case 'applyForce':
							this.applyForceLT(action.x, action.y);
							break;

						case 'applyImpulse':
							this.applyImpulseLT(action.x, action.y);
							break;

						case 'applyTorque':
							this.applyTorque(action.torque);
							break;

						case 'setLinearVelocity':
							this.setLinearVelocityLT(action.x, action.y);
							break;

						case 'scaleBy':
							this._scaleBodyBy(action.scale);
							break;

						case 'destroy':
							this.destroy();
							break;
					}
				}
			}
		}
	},

	remove: function () {
		this._isBeingRemoved = true;
		this.destroy();

		if (taro.isClient) {
			this.clearAllPointers();
		}
	},

	/**
	 * Destroys the physics entity and the box2d body that
	 * is attached to it.
	 */
	destroy: function () {
		this._alive = false;
		this.destroyBody();
		TaroEntity.prototype.destroy.call(this);
		delete this._actionQueue;
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroEntityPhysics;
}
