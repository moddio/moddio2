/**
 * Creates a new entity with crash integration.
 */
const TaroEntityPhysics = TaroEntity.extend({
	classId: 'TaroEntityPhysics',

	init: function (defaultData = {}) {
		TaroEntity.prototype.init.call(this, defaultData);
		const self = this;

		// this._b2dRef = taro.physics;

		if (taro.isClient) {
			self.addComponent(TaroAnimationComponent);
			// don't create body on clientside if CSP is disabled
		}

		// Check if crash is enabled in the engine
		if (taro.isServer && taro.physics) {
			this._translateToProto = this.translateTo;
			this._translateByProto = this.translateBy;
			this._rotateToProto = this.rotateTo;
			this._rotateByProto = this.rotateBy;
			// Take over the transform methods
			this.translateTo = this._translateTo;
			this.translateBy = this._translateBy;
			this.rotateTo = this._rotateTo;
			this.rotateBy = this._rotateBy;
		}
	},

	updateBody: function (defaultData, isLossTolerant) {
		const self = this;

		// console.log("updatebody", defaultData, this._stats.currentBody.type)

		body = this._stats.currentBody;
		// if (!body) {
		// 	return;
		// }
		if (this.crashBody) {
			if (body == undefined || body.type === 'spriteOnly') {
				self.destroyBody();
				this.body = body;
				return;
			} else if (body.type == 'dynamic') {
				this.crashActive(true);
				this.crashBody.update();
			}
		}

		this.width(parseFloat(body.width) * this._scale.x);
		this.height(parseFloat(body.height) * this._scale.y);

		let filterCategoryBits = 0x0002;
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

		const collidesWith = body.collidesWith || {};
		// this mask bit are hex so it wonnt incremented by power of 2
		var body = {
			type: body.type || 'dynamic',
			linearDamping: parseFloat(body.linearDamping) || 0,
			angularDamping: parseFloat(body.angularDamping) || 0,
			allowSleep: false,
			bullet: body.bullet,
			fixedRotation: body.fixedRotation,
			affectedByGravity: body.affectedByGravity != false, // we want undefined to be considered as true for backward compatibility
			fixtures: [
				{
					density: body.fixtures ? parseFloat(body.fixtures[0].density) : 0,
					friction: body.fixtures ? parseFloat(body.fixtures[0].friction) : 0,
					restitution: body.fixtures ? body.fixtures[0].restitution : 0,
					isSensor: body.fixtures ? body.fixtures[0].isSensor || false : false,
					filter: {
						filterGroupIndex: 0,
						filterCategoryBits: filterCategoryBits,
						filterMaskBits:
							(collidesWith.walls ? 0x0001 : 0) |
							(collidesWith.units ? 0x0002 : 0) |
							(collidesWith.items ? 0x0008 : 0) |
							(collidesWith.projectiles ? 0x0010 : 0) |
							(this._category != 'sensor' ? 0x0020 : 0) | // all entities aside from sensor will collide with regions
							(this._category == 'unit' || this._category == 'item' ? 0x0040 : 0), // units & items will collide with sensors
					},
					shape: {
						type:
							body.fixtures && body.fixtures[0] && body.fixtures[0].shape && body.fixtures[0].shape.type
								? body.fixtures[0].shape.type
								: 'rectangle',
						// data: (body.fixtures && body.fixtures[0] && body.fixtures[0].shape && body.fixtures[0].shape.data) ? body.fixtures[0].shape.data : undefined
					},
					taroId: this.id(), // in box2dbody, add reference to this entity
				},
			],
		};

		// console.log("collidesWith", this._category, filterCategoryBits, collidesWith, body)

		this.physicsBody(body, isLossTolerant);
		// if (this._category === 'item') {
		//     this.previousState = this._stats && this._stats.states && this._stats.states[this._stats.stateId] || {};
		//     console.log('setting previous sate', this.previousState);
		// }
		// if initialTranform variable's provided, then transform this entity immediately after body creation
		if (defaultData) {
			const rotate = defaultData.rotate;

			// immediately apply rotate.z if facingAngle is assigned
			if (!isNaN(rotate)) {
				// console.log("rotate ", defaultData.rotate)
				// if (isLossTolerant)
				//     this.rotateToLT(rotate);
				// else
				this.rotateTo(0, 0, rotate);
			}

			if (defaultData.translate) {
				const x = defaultData.translate.x;
				const y = defaultData.translate.y;

				// immediately translate entity if position is assigned
				if (!isNaN(x) && !isNaN(y)) {
					// if (isLossTolerant)
					//     this.translateToLT(x, y, 0)
					// else
					this.translateTo(x, y, 0);
				}
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

	/**
	 * Gets / sets the crash colliders's awake flag which determines
	 * if it will be included as part of the physics simulation
	 * or not.
	 * @param {Boolean=} val Set to true to include the collider in
	 * the physics simulation or false for it to be ignored.
	 * @return {*}
	 */
	crashActive: function (val) {
		if (taro.physics && this.crashBody) {
			if (val !== undefined) {
				this.crashBody.awake = val;
				return this;
			}

			return this.crashBody.awake;
		}

		return this;
	},

	/**
	 * Gets / sets the physics body definition. When setting the
	 * definition the physics body will also be created automatically
	 * from the supplied definition.
	 * @param def
	 * @return {*}
	 */
	physicsBody: function (def, isLossTolerant) {
		if (def) {
			this.bodyDef = def;

			// Check that the crash component exists
			if (taro.physics && !this.crashBody) {
				taro.physics.createBody(this, def);
			}

			return this;
		}

		return this.bodyDef;
	},

	_behaviourCrash: function () {
		// update position based on its velocity, collision, and damping
		if (Math.floor(Math.abs(this._velocity.x)) != 0 || Math.floor(Math.abs(this._velocity.y)) != 0) {
			this.crashBody.move(this._velocity.x, this._velocity.y);
			let damping = 1 + this.bodyDef.linearDamping * 0.015;
			//if (damping === 0) damping = 1;
			this._velocity.x = this._velocity.x / damping;
			this._velocity.y = this._velocity.y / damping;

			this._translate.x = this.crashBody.pos.x;
			this._translate.y = this.crashBody.pos.y;

			//taro.physics.crash.cancel();
			this.crashBody.disable = false;
		}
	},

	destroyBody: function () {
		if (taro.physics) {
			taro.physics.destroyBody(this.crashBody);
			this.crashActive(false);
		}
	},

	/**
	 * Gets / sets the crash body's gravitic value. If set to false,
	 * this entity will not be affected by gravity. If set to true it
	 * will be affected by gravity.
	 * @param {Boolean=} val True to allow gravity to affect this entity.
	 * @returns {*}
	 */
	gravitic: function (val) {
		if (this.body) {
			if (val !== undefined) {
				this.body.m_nonGravitic = !val;
				this.body.m_gravityScale = !val ? 0 : 1;
				// this.bodyDef.gravitic = val;

				// Wake up the body
				this.body.setAwake(true);
				return this;
			}

			return !this.body.m_nonGravitic;
		}
	},

	// move entity in front of the unit, and then create joint between them
	attachTo: function (entityB, anchorA, anchorB) {
		console.log('attach entity is not working now');
		// Check if the entity has a box2d body attached
		// and if so, is it updating or not
		for (entityId in this.jointsAttached) {
			this.detachEntity(entityId);
		}
		// var self = this;
	},

	detachEntity: function (entityId) {
		console.log('detach entity is not working now');
		/*var attachedEntity = taro.$(entityId);
		if (entityId && attachedEntity) {
		}*/
	},

	applyTorque: function (torque) {
		console.log('apply torque is disabled for now');
		//if (taro.physics._world.isLocked() || this.body == undefined) {
		/*} else {
			//this.applyTorqueLT(torque);
		}*/
	},

	setLinearVelocity: function (x, y, z, isLossTolerant) {
		if (this.body != undefined) {
			if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
				// client side's predicted physics is weaker than the server's, so buff it up!
				// if (taro.isClient && this == taro.client.selectedUnit) {
				//     x *= 1.2737
				//     y *= 1.2737
				// }
				this.body.setLinearVelocity(new TaroPoint3d(x, y, 0));
			}
		}
	},

	// lossless applyForce
	applyForce: function (x, y) {
		console.log('apply force is disabled for now');
		// if body doesn't exist yet, queue
		/*if (!taro.physics) return;

		if (!taro.physics._world.isLocked() && this.body != undefined) {
			//this.applyForceLT(x, y);
		} */
	},

	// lossless applyForce
	applyImpulse: function (x, y) {
		console.log('apply impulse is disabled for now');
		// if body doesn't exist yet, queue

		/*if (!taro.physics._world.isLocked() && this.body != undefined) {
			this.applyImpulseLT(x, y);
		}*/
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

		if (taro.isServer) {
			if (this.body) {
				if (this.body.type != 'spriteOnly') {
					// console.log('translate collider')
					this.translateColliderTo(x, y);
				}
			}
		}

		return this;
	},

	/**
	 * Takes over translateBy calls and processes crash movement as well.
	 * @param x
	 * @param y
	 * @private
	 */
	_translateBy: function (x, y, z) {
		this._translateTo(this._translate.x + x, this._translate.y + y);
	},

	/**
	 * Takes over translateTo calls and processes crash movement as well.
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

		body = this._stats.currentBody;
		// we have to take this._hasMoved out of the conditional to apply rotations on another body
		if (taro.isServer && body && body.type !== 'none' && body.type !== 'spriteOnly') {
			if (this.body) {
				this.rotateCollider(z);
			}
		}

		return this;
	},

	_scaleTexture: function () {
		const self = this;
		let currentState = (this._stats.states && this._stats.states[this._stats.stateId]) || { body: 'none' };
		let body = {};
		if (!currentState) {
			const defaultStateId = self.getDefaultStateId();
			currentState = (self._stats.states && self._stats.states[defaultStateId]) || { body: 'none' };
		}
		if (currentState && this._stats.bodies) {
			body = this._stats.bodies[currentState.body];
		}
		const newWidth = ((body && body.width) || 1) * self._stats.scale;
		const newHeight = ((body && body.height) || 1) * self._stats.scale;

		self.width(newWidth, false);
		self.height(newHeight, false);

		// var attributeBarContainer = self.getAttributeBarContainer();
		// if (attributeBarContainer) {
		//     attributeBarContainer.setContainerWidth(newWidth);
		// }
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
	/*_update: function (ctx) {
		// Call the original method
		this._updateProto(ctx);

		this._translateTo(this._translate.x, this._translate.y, this._translate.z, '_update');
		this._rotateTo(this._rotate.x, this._rotate.y, this._rotate.z);

		// TaroEntity.prototype.update.call(this, ctx);
	},*/

	/**
	 * If true, disabled box2d debug shape drawing for this entity.
	 * @param {Boolean} val
	 */
	/*box2dNoDebug: function (val) {
		if (val !== undefined) {
			this._box2dNoDebug = val;
			return this;
		}

		return this._box2dNoDebug;
	},*/

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
		// delete this._actionQueue;
	},

	translateColliderTo: function (x, y) {
		this.crashBody.moveTo(x, y);
	},

	rotateCollider: function (angle) {
		if (this.crashBody && this.bodyDef.fixtures[0].shape.type != 'circle') {
			this.crashBody.rotate(angle * -1);
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroEntityPhysics;
}
