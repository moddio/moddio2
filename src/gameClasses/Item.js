var Item = IgeEntityPhysics.extend({
	classId: 'Item',

	init: function (data, entityIdFromServer) {
		IgeEntityPhysics.prototype.init.call(this, data.defaultData);
		this.id(entityIdFromServer); // ensure that entityId is consistent between server & client

		var self = this;
		self._stats = {};
		self.anchorOffset = { x: 0, y: 0, rotate: 0 };
		var itemData = {};
		if (ige.isClient) {
			itemData = ige.game.getAsset('itemTypes', data.itemTypeId);
			itemData = _.pick(itemData, ige.client.keysToAddBeforeRender);
		}

		self._stats = Object.assign(
			data,
			itemData
		);

		if (self._stats.projectileType) {
			self.projectileData = ige.game.getAsset('projectileTypes', self._stats.projectileType);
		}

		// so if cost is set as 0 it should be usable item
		self.quantityCost = 1;
		self.quantityAtStartusing = null;
		if (self._stats.cost && self._stats.cost.quantity != undefined) {
			self.quantityCost = parseFloat(self._stats.cost.quantity);
		}

		// HACK: converting unselected state to unselected for old games to work
		if (self._stats.states) {
			if (self._stats.states.unSelected && !self._stats.states.unselected) {
				self._stats.states.unselected = self._stats.states.unSelected;
			}
			if (self._stats.states.unselected && !self._stats.states.unSelected) {
				self._stats.states.unSelected = self._stats.states.unSelected;
			}
		}

		self.raycastTargets = [];
		// dont save variables in _stats as _stats is stringified and synced
		// and some variables of type unit, item, projectile may contain circular json objects
		if (self._stats.variables) {
			self.variables = self._stats.variables;
			delete self._stats.variables;
		}

		self.entityId = entityIdFromServer;
		// self._stats.handle = data.type
		self._stats.lastUsed = 0;
		self.anchoredOffset = { x: 0, y: 0, rotate: 0 };

		self.category('item'); // necessary for box2d contact listener (it only cares about 'unit' categories touching)
		// convert numbers stored as string in database to int
		self.parseEntityObject(self._stats);
		self.addComponent(AttributeComponent); // every item gets one

		ige.game.lastCreatedItemId = entityIdFromServer || this.id();

		if (ige.isClient) {
			// must create Phaser item before emitting init events
			ige.client.emit('create-item', this);
		}
		self.setState(self._stats.stateId, self._stats.defaultData);

		self.scaleRatio = ige.physics && ige.physics.scaleRatio();
		if (ige.isServer) {
			this.streamMode(1);
			self.streamCreate();
			ige.server.totalItemsCreated++;
		} else if (ige.isClient) {
			self._hidden = self._stats.isHidden;
			if (self._stats.currentBody == undefined || self._stats.currentBody.type == 'none' || self._hidden) {
				self.hide();
				this.emit('hide');
			} else {
				self.show();
				this.emit('show');

				self.width(self._stats.currentBody.width)
					.height(self._stats.currentBody.height);
			}
			self.addToRenderer();
			self.drawBounds(false);
		}
		self.playEffect('create');
		// self.addComponent(EffectComponent);

		// behaviour handles:
		this.addBehaviour('itemBehaviour', this._behaviour);
		this.scaleDimensions(this._stats.width, this._stats.height);
	},

	updateBody: function (initTransform) {
		var self = this;
		var body = self._stats.currentBody;

		if (ige.isServer) {
			if (this._stats.stateId == 'dropped') {
				this.lifeSpan(this._stats.lifeSpan);
				self.mount(ige.$('baseScene'));
				this.streamMode(1);
			} else {
				this.deathTime(undefined); // remove lifespan, so the entity stays indefinitely
				if (body) {
					if (body.jointType != 'weldJoint') {
						this.streamMode(1); // item that revolutes around unit
					} else {
						this.streamMode(2);
					}
				}
			}
		}

		if (body && body.type != 'none') {
			IgeEntityPhysics.prototype.updateBody.call(self, initTransform);

			self.show();
			if (ige.isClient) {
				this.emit('show');
				self.updateTexture();
			}
		} else {
			ige.devLog('hide & destroyBody.');
			self.hide();
			if (ige.isClient) {
				this.emit('hide');
			}
			self.destroyBody();
			if (ige.isServer) {
				this.streamMode(2);
			}
		}
	},

	/* mount the item on unit. if it has box2d body, then create an appropriate joint */
	mount: function (obj) {
		var state = this._stats.states && this._stats.states[this._stats.stateId] || {};
		var body = this._stats.currentBody;

		// console.log("mounting on", obj._category)
		if (obj && obj._category == 'unit') {
			if (body && body.type != 'none') {
				ige.devLog('mounting item to unit ', body.unitAnchor.x, (-1 * body.unitAnchor.y));

				this.width(body.width);
				this.height(body.height);

				// mount texture on the unit in a correct position
				if (ige.isClient) {
					// avoid transforming box2d body by calling prototype

					var unitAnchorX = body.unitAnchor.x;
					var unitAnchorY = body.unitAnchor.y;
					IgeEntity.prototype.translateTo.call(this, unitAnchorX, (-1 * unitAnchorY), 0);
					// IgeEntity.prototype.rotateTo.call(this, 0, 0, body.unitAnchor.rotation || 0)
				}
			}
		} else {
			ige.devLog('there\'s no unit to attach!');
			// item is dropped
			if (body && body.type != 'none') {
				this.width(body.width);
				this.height(body.height);
			}
			if (ige.isServer) {
				IgeEntity.prototype.mount.call(this, obj);
			}
		}
	},

	// apply texture based on state
	updateTexture: function () {
		var self = this;

		var ownerUnit = self.getOwnerUnit();

		if (ownerUnit) {
			var ownerPlayer = ownerUnit.getOwner();
			// item should be invisible to myPlayer if this item is held by invisible hostile unit
			var isInvisible = self.shouldBeInvisible(ownerPlayer, ige.client.myPlayer);
			var hasBody = self._stats.currentBody && self._stats.currentBody.type !== 'none';

			if (isInvisible || !hasBody) {
				self.hide();
				this.emit('hide');
				return;
			}
		}

		self.show();
		this.emit('show');
		// leave because it is taro not renderer
		self.updateLayer();
		// leave because it updates state for animation
		IgeEntity.prototype.updateTexture.call(this);
	},

	getOwnerUnit: function () {
		return ((this._stats.ownerUnitId) ? ige.$(this._stats.ownerUnitId) : undefined);
	},

	setOwnerUnit: function (newOwner) {
		var oldOwner = ige.$(this.oldOwnerId);

		if (newOwner == oldOwner)
			return;

		if (newOwner) {
			if (newOwner._stats.currentItemIndex !== this._stats.slotIndex) {
				this.setState('unselected');
			}

			if (ige.isServer) {
				this.streamUpdateData([{ ownerUnitId: newOwner.id() }]);
				this.streamMode(2);
			}

			this.oldOwnerId = this._stats.ownerUnitId;
			this._stats.ownerUnitId = newOwner.id();
		} else { // item is being dropped.
			this._stats.ownerUnitId = undefined;

			// get transform of its last owner
			if (oldOwner) {
				this.updateBody();

				if (ige.isClient) {
					if (oldOwner._stats) {
						oldOwner._stats.currentItemId = null;
					}
				}

				this.oldOwnerId = null;
			}

			if (ige.isServer) {
				this.streamUpdateData([{ ownerUnitId: 0 }]);
				this.streamMode(1);
			}
		}
	},

	hasQuantityRemaining: function () {
		var self = this;
		// if quantity is greater than cost, or item has infinite quantity
		// console.log(self._stats.quantity, quantityCost, self._stats.quantity >= quantityCost);
		if (self._stats.quantity >= self.quantityCost || self._stats.quantity == undefined || isNaN(self._stats.quantity)) {
			return true;
		}
		return false;
	},

	// when player presses Mouse1
	use: function () {
		var self = this;
		var now = ige.now;
		var owner = self.getOwnerUnit();
		var player = owner && owner.getOwner();
		var isUsed = false;

		// if item has no owner, or item is unusable type, or it cannot be used by its current owner, then return
		if (!owner ||
			(self._stats.canBeUsedBy && self._stats.canBeUsedBy.length > 0 && self._stats.canBeUsedBy.indexOf(owner._stats.type) == -1) ||
			self._stats.type === 'unusable') {
			return;
		}

		if (self.hasQuantityRemaining()) {
			ige.game.lastUsedItemId = self.id();

			if ((self._stats.lastUsed + self._stats.fireRate < now) || self._stats.type == 'consumable') {
				if (!self.canAffordItemCost()) {
					ige.devLog('cannot afford item cost');
					return;
				}

				isUsed = true;

				// item must be ready to fire (accordingly to fire rate), and must have ammo or have infinite ammo
				if (ige.isClient && self._stats.type == 'weapon' && self._stats.effects && self._stats.effects.use && self._stats.effects.use.animation) {
					self.applyAnimationById(self._stats.effects.use.animation);
				}

				self._stats.lastUsed = ige.now;
				ige.trigger && ige.trigger.fire('unitUsesItem', {
					unitId: (owner) ? owner.id() : undefined,
					itemId: self.id()
				});

				if (ige.physics && self._stats.type == 'weapon') {
					if (self._stats.isGun) {
						if (self._stats.bulletStartPosition) {
							var rotate = this._rotate.z;
							if (owner && self._stats.currentBody && self._stats.currentBody.jointType == 'weldJoint') {
								rotate = owner._rotate.z;
							}

							if (self.anchoredOffset == undefined) {
								self.anchoredOffset = { x: 0, y: 0, rotate: 0 };
							}

							var offsetAngle = rotate;
							if (self._stats.flip == 1) {
								offsetAngle += Math.PI;
							}

							// item is flipped, then mirror the rotation
							if (owner._stats.flip == 1) {
								var bulletY = -self._stats.bulletStartPosition.y || 0;
							} else {
								var bulletY = self._stats.bulletStartPosition.y || 0;
							}

							var bulletStartPosition = {
								x: (owner._translate.x + self.anchoredOffset.x) + (self._stats.bulletStartPosition.x * Math.cos(offsetAngle)) + (bulletY * Math.sin(offsetAngle)),
								y: (owner._translate.y + self.anchoredOffset.y) + (self._stats.bulletStartPosition.x * Math.sin(offsetAngle)) - (bulletY * Math.cos(offsetAngle))
							};

							if (
								this._stats.isGun &&
								(ige.isServer || (ige.isClient && ige.physics)) // render projectile on clientside if physics is enabled
							) {
								var defaultData = {
									rotate: rotate,
									translate: bulletStartPosition
								};

								if (self.projectileData && (ige.isServer || (ige.isClient && !self._stats.projectileStreamMode))) {
									defaultData.velocity = {
										deployMethod: self._stats.deployMethod,
										x: Math.cos(rotate + Math.radians(-90)) * self._stats.bulletForce,
										y: Math.sin(rotate + Math.radians(-90)) * self._stats.bulletForce
									};

									// console.log(self._stats.currentBody.type, "unit: ", angleToTarget, "item's rotate.z: ", self._rotate.z, "facing angle", itemrotate)
									var data = Object.assign(
										JSON.parse(JSON.stringify(self.projectileData)),
										{
											type: self._stats.projectileType,
											sourceItemId: self.id(),
											sourceUnitId: (owner) ? owner.id() : undefined,
											defaultData: defaultData,
											damageData: {
												targetsAffected: this._stats.damage.targetsAffected,
												sourceUnitId: owner.id(),
												sourceItemId: self.id(),
												sourcePlayerId: owner.getOwner().id(),
												unitAttributes: this._stats.damage.unitAttributes,
												playerAttributes: this._stats.damage.playerAttributes
											}
										});

									var projectile = new Projectile(data);
									ige.game.lastCreatedProjectileId = projectile.id();
								}
								if (this._stats.bulletType == 'raycast') {
									// starting from unit center position
									var raycastStartPosition = {
										x: owner._translate.x + (Math.cos(this._rotate.z + Math.radians(-90))) + (Math.cos(this._rotate.z)),
										y: owner._translate.y + (Math.sin(this._rotate.z + Math.radians(-90))) + (Math.sin(this._rotate.z))
									};

									if (self._stats.currentBody && (self._stats.currentBody.type == 'spriteOnly' || self._stats.currentBody.type == 'none')) {
										var unitAnchorX = (self._stats.currentBody.unitAnchor != undefined) ? self._stats.currentBody.unitAnchor.x : 0;
										var unitAnchorY = (self._stats.currentBody.unitAnchor != undefined) ? self._stats.currentBody.unitAnchor.y : 0;

										var endPosition = {
											x: (owner._translate.x + unitAnchorX) + (this._stats.bulletDistance * Math.cos(owner._rotate.z + Math.radians(-90))),
											y: (owner._translate.y + unitAnchorY) + (this._stats.bulletDistance * Math.sin(owner._rotate.z + Math.radians(-90)))
										};
									} else {
										var endPosition = {
											x: (self._translate.x) + (this._stats.bulletDistance * Math.cos(self._rotate.z + Math.radians(-90))),
											y: (self._translate.y) + (this._stats.bulletDistance * Math.sin(self._rotate.z + Math.radians(-90)))
										};
									}

									var raycastMultipleCallback = function () {
										var def = {};
										// var e_maxCount = 3;
										var raycastCollidesWith = self._stats.raycastCollidesWith;
										def.m_points = [];
										def.m_normals = [];

										def.ReportFixture = function (fixture, point, normal, fraction) {
											var fixtureList = fixture.m_body.m_fixtureList;
											var entity = fixtureList && fixtureList.igeId && ige.$(fixtureList.igeId);
											if (entity) {
												entity.lastRaycastCollisionPosition = {
													x: point.x * self.scaleRatio,
													y: point.y * self.scaleRatio
												};
												entity.raycastFraction = fraction;
												self.raycastTargets.push(entity);
											}

											// var body = fixture.getBody();
											// var userData = body.getUserData();
											// if (userData) {
											// 	if (userData == 0) {
											// 		// By returning -1, we instruct the calling code to ignore this fixture
											// 		// and continue the ray-cast to the next fixture.
											// 		return -1.0;
											// 	}
											// }

											def.m_points.push(point);
											def.m_normals.push(normal);
											// By returning 1, we instruct the caller to continue without clipping the
											// ray.
											return 1.0;
										};

										return def;
									};

									var callback = raycastMultipleCallback();

									// ige.physics.world().rayCast(, callback.ReportFixture);
									ige.physics.world().rayCast(
										callback.ReportFixture,
										{
											x: raycastStartPosition.x / self.scaleRatio,
											y: raycastStartPosition.y / self.scaleRatio
										},
										{
											x: endPosition.x / self.scaleRatio,
											y: endPosition.y / self.scaleRatio
										}
									);

									// if (!self._stats.penetration) {
									ige.game.entitiesCollidingWithLastRaycast = _.orderBy(self.raycastTargets, ['raycastFraction'], ['asc']);
									// }
									ige.trigger && ige.trigger.fire('raycastItemFired', {
										itemId: self.id()
									});
								}
								self.raycastTargets = [];

								if (self._stats.recoilForce) {
									// apply recoil on its owner if item itself doesn't have physical body
									if (self._stats.currentBody == undefined || self._stats.currentBody.type == 'none' || self._stats.currentBody.type == 'spriteOnly') {
										owner.applyForce(self._stats.recoilForce * Math.cos(owner._rotate.z + Math.radians(90)), self._stats.recoilForce * Math.sin(owner._rotate.z + Math.radians(90)));
									} else { // apply recoil on item
										self.applyForce(self._stats.recoilForce * Math.cos(this._rotate.z + Math.radians(90)), self._stats.recoilForce * Math.sin(this._rotate.z + Math.radians(90)));
									}
								}
							}
						}
					} else { // melee weapon
						var hitboxData = this._stats.damageHitBox;

						if (hitboxData) {
							// console.log(hitboxData);
							var rotate = (owner.angleToTarget) ? owner.angleToTarget : 0;
							var hitboxPosition = {
								x: (owner._translate.x) + (hitboxData.offsetX * Math.cos(rotate)) + (hitboxData.offsetY * Math.sin(rotate)),
								y: (owner._translate.y) + (hitboxData.offsetX * Math.sin(rotate)) - (hitboxData.offsetY * Math.cos(rotate))
							};

							var hitbox = {
								x: hitboxPosition.x - hitboxData.width,
								y: hitboxPosition.y - hitboxData.width,
								width: hitboxData.width * 2,
								height: hitboxData.width * 2 // width is used as a radius
							};

							var damageData = {
								targetsAffected: this._stats.damage.targetsAffected,
								sourceUnitId: owner.id(),
								sourceItemId: self.id(),
								sourcePlayerId: owner.getOwner().id(),
								unitAttributes: this._stats.damage.unitAttributes,
								playerAttributes: this._stats.damage.playerAttributes
							};
							// console.log(owner._translate.x, owner._translate.y, hitbox);                                              //////////Hitbox log

							entities = ige.physics.getBodiesInRegion(hitbox);

							while (entities.length > 0) {
								var entity = entities.shift();
								if (entity && entity._category == 'unit') {
									entity.inflictDamage(damageData);
								}
							}
						}
					}
				} else if (self._stats.type == 'consumable') { // item is not a gun (e.g. consumable)
					// if cost quantity of consumable item is not defined or 0
					// it should be 1 by default. Bcz 1 item will be consumed when fire.
					// currently we dont have cost quantity setting in consumable items so
					// this is handler for it.

					if (!self.quantityCost) {
						self.quantityCost = 1;
					}

					attrData = { attributes: {} };
					if (self._stats.bonus && self._stats.bonus.consume) {
						// apply unit bonuses
						var unitAttributeBonuses = self._stats.bonus.consume.unitAttribute;
						if (unitAttributeBonuses) {
							for (var attrId in unitAttributeBonuses) {
								if (attrData.attributes) {
									var newValue = owner.attribute.getValue(attrId) + parseFloat(unitAttributeBonuses[attrId]);
									attrData.attributes[attrId] = owner.attribute.update(attrId, newValue, true);
								}
							}
						}

						if (player && player.attribute) {
							// apply player bonuses
							var playerAttributeBonuses = self._stats.bonus.consume.playerAttribute;
							if (playerAttributeBonuses) {
								for (attrId in playerAttributeBonuses) {
									var newValue = player.attribute.getValue(attrId) + parseFloat(playerAttributeBonuses[attrId]);
									attrData.attributes[attrId] = player.attribute.update(attrId, newValue, true);
								}
							}

							if (ige.isServer && self._stats && self._stats.bonus && self._stats.bonus.consume && self._stats.bonus.consume.coin) {
								// ige.server.giveCoinToUser(player, self._stats.bonus.consume.coin, self._stats.name);
								// player.streamUpdateData([{
								// 	coins: self._stats.bonus.consume.coin + player._stats.coins
								// }]);
							}
						}

						if (ige.isServer) {
							owner.streamUpdateData(attrData);
						}
					}

					self.stopUsing(); // stop using immediately after use.
				}
			}

			// lowering the quantity by self.quantityCost
		} else { // quantity is 0
			self.stopUsing();
		}

		if (isUsed && ige.isClient) {
			this.playEffect('use');
		}

		if (self._stats.quantity != null || self._stats.quantity != undefined) {
			// ige.devLog(isUsed, self._stats.quantity , self._stats.quantity > 0)
			if (isUsed && self._stats.quantity > 0) {
				self.updateQuantity(self._stats.quantity - self.quantityCost);
			}
		}
	},

	updateQuantity: function (qty) {
		this._stats.quantity = qty;

		if (ige.isServer) {
			// item's set to be removed when empty
			if (this._stats.quantity == 0 && this._stats.removeWhenEmpty === true) {
				var ownerUnit = this.getOwnerUnit();
				this.remove();
				if (ownerUnit) {
					ownerUnit.streamUpdateData([{ itemIds: ownerUnit._stats.itemIds }]);
				}
			}
		} else if (ige.isClient && ige.client.selectedUnit == this.getOwnerUnit()) {
			ige.itemUi.updateItemQuantity(this);
		}
	},

	canAffordItemCost: function () {
		var self = this;
		var ability = self._stats;
		var owner = self.getOwnerUnit();
		var canAffordCost = true;
		var player = owner && owner.getOwner();

		// item costs nothing to use
		if (ability.cost == undefined) {
			return true;
		}

		// item has a cost
		if (player && owner && ability.cost) {
			// check unit attribute can afford cost
			for (var attrName in ability.cost.unitAttributes) {
				var cost = ability.cost.unitAttributes[attrName];
				if (owner._stats.attributes[attrName] == undefined ||
					owner._stats.attributes[attrName].value < cost
				) {
					canAffordCost = false;
				}
			}

			// check player attributes can afford cost
			for (attrName in ability.cost.playerAttributes) {
				var cost = ability.cost.playerAttributes[attrName];
				if (player._stats.attributes[attrName] == undefined ||
					player._stats.attributes[attrName].value < cost
				) {
					canAffordCost = false;
				}
			}
			var unitAttributeChanged = false;
			var playerAttributeChanged = false;

			// pay the price (cost)
			if (canAffordCost) {
				for (attrName in ability.cost.unitAttributes) {
					if (owner._stats.attributes[attrName]) {
						var newValue = owner._stats.attributes[attrName].value - ability.cost.unitAttributes[attrName];
						// owner._stats.attributes[attrName].value -= ability.cost.unitAttributes[attrName];
						owner.attribute.update(attrName, newValue, true);
						unitAttributeChanged = true;
					}
				}
				for (attrName in ability.cost.playerAttributes) {
					if (player._stats.attributes[attrName]) {
						var newValue = player._stats.attributes[attrName].value - ability.cost.playerAttributes[attrName];
						// player._stats.attributes[attrName].value -= ability.cost.playerAttributes[attrName];
						player.attribute.update(attrName, newValue, true);
						playerAttributeChanged = true;
					}
				}

				// calling stream for unit because there is delay in transferring attributes data
				if (ige.isClient && owner._stats.clientId == ige.network.id() && player._stats.selectedUnitId == owner.id()) {
					if (unitAttributeChanged) {
						owner.attribute.refresh();
					}
					if (playerAttributeChanged) {
						ige.playerUi.updatePlayerAttributesDiv(player._stats.attributes);
					}
				}
			}
			return canAffordCost;
		} else {
			ItemComponent.prototype.log('can\'t afford cost');
			return false;
		}
	},

	// check if item can reach the target unit
	// canReachTarget: function(targetUnit) {
	// 	var self = this;
	// 	var owner = this.getOwnerUnit();
	// 	if (owner && targetUnit && self._stats.type == 'weapon') {
	// 		var positionA = owner._translate;
	// 		var positionB = targetUnit._translate;
	// 		if (positionA && positionB) {
	// 			var distanceX = Math.abs(positionA.x - positionB.x) - owner.width()/2 - targetUnit.width()/2;
	// 			var distanceY = Math.abs(positionA.y - positionB.y) - owner.height()/2 - targetUnit.height()/2;
	// 			var reach = 0;
	// 			if (self._stats.isGun) {
	// 				var velocity = self._stats.bulletForce;
	// 				var bulletLifespan = self.projectileData.lifeSpan
	// 				reach = velocity * bulletLifespan / ige._fpsRate / 4;
	// 				// console.log(velocity, bulletLifespan, reach)
	// 			} else {
	// 				var hitboxData = this._stats.damageHitBox;
	// 				if (hitboxData) {
	// 					reach = hitboxData.offsetY
	// 				}
	// 			}

	// 			if (reach > distanceX && reach > distanceY) {
	// 				return true;
	// 			}
	// 		}
	// 	}

	// 	return false;
	// },

	startUsing: function () {
		var self = this;

		self._stats.isBeingUsed = true;
		var owner = this.getOwnerUnit();
		if (ige.isServer) {
			this.quantityAtStartusing = this._stats.quantity;
			this.streamUpdateData([{ isBeingUsed: true }]);
		} else if (ige.isClient && owner == ige.client.selectedUnit) {
			this._stats.isBeingUsed = true;
		}

		if (owner && ige.trigger) {
			ige.trigger && ige.trigger.fire('unitStartsUsingAnItem', {
				unitId: owner.id(),
				itemId: this.id()
			});
		}
	},

	stopUsing: function () {
		var self = this;
		if (self._stats.isBeingUsed) {
			self._stats.isBeingUsed = false;
			var owner = self.getOwnerUnit();

			if (owner && ige.trigger) {
				ige.trigger && ige.trigger.fire('unitStopsUsingAnItem', {
					unitId: owner.id(),
					itemId: self.id()
				});
			}
		}
		if (ige.isClient) {
			this.playEffect('none');
		} else if (ige.isServer) {
			var data = { isBeingUsed: false };
			if (self._stats.quantity != self.quantityAtStartusing) {
				data.quantity = self._stats.quantity;
			}
			this.streamUpdateData([data]);
		}
	},
	refillAmmo: function () {
		var itemData = ige.game.getAsset('itemTypes', this._stats.itemTypeId);
		this.streamUpdateData([
			{ ammoTotal: itemData.ammoTotal },
			{ ammo: itemData.ammoSize }
		]);
	},

	/**
	 * get item's position based on its itemAnchor, unitAnchor, and current rotation value.
	 * @param rotate item's rotation. used for tweening item that's not anchored at 0,0. e.g. swinging a sword.
	 */
	getAnchoredOffset: function (rotate) {
		var self = this;
		var offset = { x: 0, y: 0, rotate: 0 };
		var ownerUnit = this.getOwnerUnit();

		if (ownerUnit && this._stats.stateId != 'dropped') {
			// place item correctly based on its owner's transformation & its body's offsets.
			if (self._stats.currentBody) {
				var unitRotate = ownerUnit._rotate.z;

				if (self._stats.currentBody.fixedRotation) {
					rotate = unitRotate;
				}

				// get translation offset based on unitAnchor
				if (self._stats.currentBody.unitAnchor) {
					// if entity is flipped, then flip the keyFrames as well
					// var itemAngle = ownerUnit.angleToTarget
					// if (ige.isClient && ownerUnit == ige.client.selectedUnit) {
					// console.log(itemAngle, unitAnchoredPosition)
					// }

					var unitAnchorOffsetRotate = Math.radians(self._stats.currentBody.unitAnchor.rotation || 0);
					var unitAnchorOffsetX = self._stats.currentBody.unitAnchor.x || 0;
					var unitAnchorOffsetY = self._stats.currentBody.unitAnchor.y || 0;

					// item is flipped, then mirror the rotation
					if (ownerUnit._stats.flip == 1) {
						var unitAnchorOffsetX = -self._stats.currentBody.unitAnchor.x || 0;
						rotate -= unitAnchorOffsetRotate;
					} else {
						var unitAnchorOffsetX = self._stats.currentBody.unitAnchor.x || 0;
						rotate += unitAnchorOffsetRotate;
					}

					var unitAnchoredPosition = {
						x: (unitAnchorOffsetX * Math.cos(unitRotate)) + (unitAnchorOffsetY * Math.sin(unitRotate)),
						y: (unitAnchorOffsetX * Math.sin(unitRotate)) - (unitAnchorOffsetY * Math.cos(unitRotate))
					};

					// get translation offset based on itemAnchor
					var itemAnchorOffsetX = self._stats.currentBody.itemAnchor && self._stats.currentBody.itemAnchor.x || 0;
					var itemAnchorOffsetY = self._stats.currentBody.itemAnchor && self._stats.currentBody.itemAnchor.y || 0;

					offset.x = (unitAnchoredPosition.x) + (itemAnchorOffsetX * Math.cos(rotate)) + (itemAnchorOffsetY * Math.sin(rotate)),
					offset.y = (unitAnchoredPosition.y) + (itemAnchorOffsetX * Math.sin(rotate)) - (itemAnchorOffsetY * Math.cos(rotate));
					if (self._stats.controls && self._stats.controls.mouseBehaviour) {
						if (self._stats.controls.mouseBehaviour.rotateToFaceMouseCursor || (self._stats.currentBody && (self._stats.currentBody.jointType == 'weldJoint'))) {
							offset.rotate = rotate;
						}
					}
				}
			}
		}

		return offset;
	},

	remove: function () {
		// traverse through owner's inventory, and remove itself
		Item.prototype.log('remove item');
		// change streammode of spriteOnly items
		if (this._streamMode === 2) {
			this.streamMode(1);
		}

		// if item has owner, then remove item from owner's inventory as well
		var ownerUnit = ige.$(this._stats.ownerUnitId);
		if (ownerUnit) {
			// remove its passive attributes from its ownerUnit unit.
			if (this._stats.bonus && this._stats.passive) {
				if (this._stats.slotIndex < ownerUnit._stats.inventorySize || this._stats.bonus.passive.isDisabledInBackpack != true) {
					ownerUnit.updateStats(this.id(), true);
				}
			} else {
				ownerUnit.updateStats(this.id(), true);
			}

			if (ownerUnit.inventory) {
				ownerUnit.inventory.removeItemByItemId(this.id());
			}
		}

		IgeEntityPhysics.prototype.remove.call(this);
	},

	streamUpdateData: function (queuedData) {
		var self = this;
		IgeEntity.prototype.streamUpdateData.call(this, queuedData);

		// ige.devLog("Item streamUpdateData ", data)
		// console.log(data, this._streamMode, this.id());
		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];

				switch (attrName) {
					case 'ownerUnitId':
						if (ige.isClient) {
							var newOwner = ige.$(newValue);
							self.setOwnerUnit(newOwner);
						}
						break;
					case 'scale':
					case 'scaleBody':
						if (ige.isClient) {
							self._stats.scale = newValue;
							self._scaleTexture();

						} else {
							// finding all attach entities before changing body dimensions
							if (self.jointsAttached) {
								var attachedEntities = {};
								for (var entityId in self.jointsAttached) {
									if (entityId != self.id()) {
										attachedEntities[entityId] = true;
									}
								}
							}
							// attaching entities
							self._scaleBox2dBody(newValue);
						}
						break;
					// case 'use':
					// 	// only run client-side use for other players' units, because my player's unit's use() will get executed via actionComponent.
					// 	if (ige.isClient) {
					// 		self.use();
					// 	}
					// 	break;
					case 'hidden':
						if (ige.isClient) {
							if (newValue) {
								self.hide();
								this.emit('hide');
							} else {
								self.show();
								this.emit('show');
							}
						}
						break;

					case 'quantity':
						self.updateQuantity(newValue);
						var owner = self.getOwnerUnit();
						if (ige.isClient && ige.client.selectedUnit == owner) {
							ige.itemUi.updateItemQuantity(self);
						}
						break;
					case 'description':
						var owner = self.getOwnerUnit();
						if (ige.isClient && ige.client.selectedUnit == owner) {
							ige.itemUi.updateItemDescription(this);
						}

						break;
					case 'name':
						var owner = self.getOwnerUnit();
						if (ige.isClient && ige.client.selectedUnit == owner) {
							ige.itemUi.updateItemInfo(this);
							ige.itemUi.updateItemDescription(this);
						}
						break;

					case 'inventoryImage':
						var owner = self.getOwnerUnit();
						if (ige.isClient && ige.client.selectedUnit == owner) {
							ige.itemUi.updateItemSlot(this, this._stats.slotIndex);
						}
						break;
					case 'inventorySlotColor':
						var owner = self.getOwnerUnit();
						if (ige.isClient && ige.client.selectedUnit == owner) {
							owner.inventory.update();
						}
						break;
					case 'slotIndex':
						break;
				}
			}
		}
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the
	 * scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	_behaviour: function (ctx) {
		var self = this;
		var ownerUnit = this.getOwnerUnit();
		if (ownerUnit && this._stats.stateId != 'dropped') {
			rotate = ownerUnit.angleToTarget;

			if (self._stats.currentBody) {
				if (self._stats.currentBody.jointType == 'weldJoint') {
					rotate = ownerUnit._rotate.z;
				}
			}

			self.anchoredOffset = self.getAnchoredOffset(rotate);
			var x = ownerUnit._translate.x + self.anchoredOffset.x;
			var y = ownerUnit._translate.y + self.anchoredOffset.y;

			self.translateTo(x, y);

			if (ige.isClient && ige.client.selectedUnit == ownerUnit) {
				if (self._stats.controls && self._stats.controls.mouseBehaviour) {
					if (self._stats.controls.mouseBehaviour.flipSpriteHorizontallyWRTMouse) {
						if (rotate > 0 && rotate < Math.PI) {
							self.flip(0);
						} else {
							self.flip(1);
						}
					}
				}
			}

			self.rotateTo(0, 0, rotate);
		}

		if (this._stats.isBeingUsed) {
			this.use();
		}

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

	loadPersistentData: function (persistData) {
		var self = this;
		if (persistData) {
			IgeEntity.prototype.loadPersistentData.call(this, persistData);
		}
	},
	/**
	 * Called every frame by the engine when this entity is mounted to the scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		if (ige.isClient && !ige.client.itemRenderEnabled) return;
		// Call the IgeEntity (super-class) tick() method
		IgeEntity.prototype.tick.call(this, ctx);
	},
	destroy: function () {
		this.playEffect('destroy');
		IgeEntityPhysics.prototype.destroy.call(this);
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = Item;
}
