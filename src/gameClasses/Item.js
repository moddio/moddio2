var Item = TaroEntityPhysics.extend({
	classId: 'Item',

	init: function (data, entityIdFromServer) {
		var self = this;
		self.category('item'); // necessary for box2d contact listener (it only cares about 'unit' categories touching)

		TaroEntityPhysics.prototype.init.call(this, data.defaultData);
		this.id(entityIdFromServer); // ensure that entityId is consistent between server & client

		self._stats = {};
		self.anchorOffset = { x: 0, y: 0, rotate: 0 };
		var itemData = {};

		if (taro.isClient) {
			itemData = taro.game.cloneAsset('itemTypes', data.itemTypeId);
		}

		self._stats = _.merge(itemData, data);
		self._stats.particleEmitters = {};

		if (self._stats.projectileType) {
			self.projectileData = taro.game.cloneAsset('projectileTypes', self._stats.projectileType);
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

		self.variables = {};

		if (self._stats.variables) {
			self.variables = self._stats.variables;
			delete self._stats.variables;
		}

		self.entityId = entityIdFromServer;
		// self._stats.handle = data.type
		self._stats.lastUsed = 0;
		self.anchoredOffset = { x: 0, y: 0, rotate: 0 };

		// convert numbers stored as string in database to int
		self.parseEntityObject(self._stats);
		self.addComponent(AttributeComponent); // every item gets one
		self.addComponent(VariableComponent);

		self.addComponent(ScriptComponent); // entity-scripting
		self.script.load(self._stats.scripts);

		taro.game.lastCreatedItemId = entityIdFromServer || this.id();

		if (taro.isClient) {
			// must create Phaser item before emitting init events
			taro.client.emit('create-item', this);
			this.initParticleEmitters();

			if (this._stats.ownerUnitId) {
				const ownerUnit = taro.$(this._stats.ownerUnitId);
				if (ownerUnit) {
					ownerUnit.ownedItems[this.id()] = this;
				}
				//this.setOwnerUnit(taro.$(this._stats.ownerUnitId));
			}
		}
		self.setState(self._stats.stateId, self._stats.defaultData);

		self.scaleRatio = taro.physics && taro.physics.scaleRatio();
		if (taro.isServer) {
			if (self._stats.streamMode == 1 || self._stats.streamMode == undefined) {
				this.streamMode(1);
				self.streamCreate(); // without this, newly purchased item wont' show on unit
			} else {
				this.streamMode(self._stats.streamMode);
			}

			taro.server.totalItemsCreated++;
		} else if (taro.isClient) {
			if (self._stats.currentBody == undefined || self._stats.currentBody.type == 'none' || self._stats.isHidden) {
				self.hide();
			} else {
				self.show();
			}
			if (self._stats.currentBody) {
				self.width(self._stats.currentBody.width);
				self.height(self._stats.currentBody.height);
			}
			self.addToRenderer();
			self.drawBounds(false);

			if (this._stats.isHidden) {
				this.hide(true);
			}
		}
		self.playEffect('create');
		// self.addComponent(EffectComponent);

		// behaviour handles:
		this.addBehaviour('itemBehaviour', this._behaviour);
		this.scaleDimensions(this._stats.width, this._stats.height);

		if (taro.isClient) {
			taro.script.trigger('entityCreatedGlobal', { entityId: this.id() });
			this.script.trigger('entityCreated');
		}
	},

	updateBody: function (initTransform) {
		var self = this;
		var body = self._stats.currentBody;

		if (taro.isServer) {
			if (this._stats.stateId == 'dropped') {
				this.lifeSpan(this._stats.lifeSpan);
				self.mount(taro.$('baseScene'));
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
		// if body exists and item is not hidden, show
		if (body && body.type != 'none') {
			TaroEntityPhysics.prototype.updateBody.call(self, initTransform);

			if (taro.isClient) {
				self.updateTexture();
			} else {
				self.show();
			}
		} else {
			taro.devLog('hide & destroyBody.');

			self.destroyBody();
			if (taro.isServer) {
				self.hide();
				this.streamMode(2);
			}
		}
	},

	/* mount the item on unit. if it has box2d body, then create an appropriate joint */
	mount: function (obj) {
		var state = (this._stats.states && this._stats.states[this._stats.stateId]) || {};
		var body = this._stats.currentBody;

		// console.log("mounting on", obj._category)
		if (obj && obj._category == 'unit') {
			if (body && body.type != 'none') {
				taro.devLog('mounting item to unit ', body.unitAnchor.x, -1 * body.unitAnchor.y);

				this.width(body.width);
				this.height(body.height);

				// mount texture on the unit in a correct position
				if (taro.isClient) {
					// avoid transforming box2d body by calling prototype

					var unitAnchorX = body.unitAnchor.x;
					var unitAnchorY = body.unitAnchor.y;
					TaroEntity.prototype.translateTo.call(this, unitAnchorX, -1 * unitAnchorY, 0);
					// TaroEntity.prototype.rotateTo.call(this, 0, 0, body.unitAnchor.rotation || 0)
				}
			}
		} else {
			taro.devLog("there's no unit to attach!");
			// item is dropped
			if (body && body.type != 'none') {
				this.width(body.width);
				this.height(body.height);
			}
			if (taro.isServer) {
				TaroEntity.prototype.mount.call(this, obj);
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
			var isInvisible = self.shouldBeInvisible(ownerPlayer, taro.client.myPlayer);
			var hasBody = self._stats.currentBody && self._stats.currentBody.type !== 'none';

			if (isInvisible || !hasBody) {
				return;
			}
		}

		// leave because it is taro not renderer
		self.updateLayer();
		// leave because it updates state for animation
		TaroEntity.prototype.updateTexture.call(this);
	},

	getOwnerUnit: function () {
		return this._stats.ownerUnitId ? taro.$(this._stats.ownerUnitId) : undefined;
	},

	setOwnerUnit: function (newOwner, persistedItem = false) {
		var oldOwner = taro.$(this._stats.oldOwnerUnitId);

		if (newOwner == oldOwner) return;
		if (newOwner) {
			if (taro.isClient) {
				if (oldOwner) {
					delete oldOwner.ownedItems[this.id()];
					if (!persistedItem) {
						const triggerParams = { itemId: this.id(), unitId: oldOwner.id() };
						this.script.trigger('thisItemIsDropped', triggerParams); // this entity (item)
						oldOwner.script.trigger('thisUnitDroppedAnItem', triggerParams); // this entity (unit)
						taro.script.trigger('unitDroppedAnItem', triggerParams); // unit dropped item
					}
				}
				newOwner.ownedItems[this.id()] = this;
				if (!persistedItem) {
					const triggerParams = {
						unitId: newOwner.id(),
						itemId: this.id(),
					};
					newOwner.script.trigger('thisUnitPicksUpItem', triggerParams); // this entity (unit)
					taro.script.trigger('unitPicksUpItem', triggerParams); // unit picked item
					this.script.trigger('thisItemIsPickedUp', triggerParams); // this entity (item)
				}
				if (newOwner == taro.client.selectedUnit) {
					if (newOwner._stats.currentItemIndex !== this._stats.slotIndex) {
						this.setState('unselected');
					}

					if (newOwner.inventory) {
						newOwner.inventory.isDirty = true;
					}
				}
			}

			if (taro.isServer) {
				this.streamUpdateData([{ ownerUnitId: newOwner.id() }]);
				this.streamMode(2);
			}

			this._stats.oldOwnerUnitId = this._stats.ownerUnitId;
			this._stats.ownerUnitId = newOwner.id();
		} else {
			// item is being dropped.
			this._stats.ownerUnitId = null;

			if (this._stats.oldOwnerUnitId) {
				this._stats.oldOwnerUnitId = null;
			}

			if (taro.isClient) {
				if (oldOwner) {
					delete oldOwner.ownedItems[this.id()];
					if (!persistedItem) {
						const triggerParams = { itemId: this.id(), unitId: oldOwner.id() };
						this.script.trigger('thisItemIsDropped', triggerParams); // this entity (item)
						oldOwner.script.trigger('thisUnitDroppedAnItem', triggerParams); // this entity (unit)
						taro.script.trigger('unitDroppedAnItem', triggerParams); // unit dropped item
					}
				}
			}

			if (taro.isServer) {
				this.streamUpdateData([{ ownerUnitId: 0 }]);
				if (this._stats.streamMode == 1 || this._stats.streamMode == undefined) {
					this.streamMode(1);
				} else {
					this.streamMode(this._stats.streamMode);
				}
			}
		}

		if (taro.isClient) {
			this.emit('setOwnerUnit', this._stats.ownerUnitId);
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
		var owner = self.getOwnerUnit();
		var ownerId = owner ? owner.id() : undefined;
		var player = owner && owner.getOwner();
		var isUsed = false;
		// console.log(`calling Item.use by ${ownerId}`);

		// if item has no owner, or item is unusable type, or it cannot be used by its current owner, then return
		if (
			!owner ||
			(self._stats.canBeUsedBy &&
				self._stats.canBeUsedBy.length > 0 &&
				self._stats.canBeUsedBy.indexOf(owner._stats.type) == -1) ||
			self._stats.type === 'unusable'
		) {
			return;
		}

		if (self.hasQuantityRemaining()) {
			taro.game.lastUsedItemId = self.id();

			if (self._stats.lastUsed + self._stats.fireRate < taro.now || self._stats.type == 'consumable') {
				if (!self.canAffordItemCost()) {
					taro.devLog('cannot afford item cost');
					return;
				}

				isUsed = true;

				// item must be ready to fire (accordingly to fire rate), and must have ammo or have infinite ammo
				if (
					taro.isClient &&
					self._stats.type == 'weapon' &&
					self._stats.effects &&
					self._stats.effects.use &&
					self._stats.effects.use.animation
				) {
					self.applyAnimationById(self._stats.effects.use.animation);
				}

				self._stats.lastUsed = taro.now;

				let triggerParams = { unitId: ownerId, itemId: self.id() };

				//we cant use queueTrigger here because it will be called after entity scripts and item or unit probably no longer exists
				self.script.trigger('itemIsUsed', triggerParams); // this entity (item) (need to rename rename 'itemIsUsed' -> 'thisItemIsUsed')
				owner.script.trigger('thisUnitUsesItem', triggerParams); // this entity (unit)
				taro.script.trigger('unitUsesItem', triggerParams); // unit uses item

				if (taro.physics && self._stats.type == 'weapon') {
					if (self._stats.isGun) {
						if (self._stats.bulletStartPosition) {
							var rotate = this._rotate.z;
							let bulletY = self._stats.bulletStartPosition.y || 0;
							let bulletX = owner._stats.flip === 1 ? -1 : 1;

							if (owner && self._stats.currentBody && self._stats.currentBody.jointType == 'weldJoint') {
								rotate = owner._rotate.z;
								// if we are welded to owner unit, we have to invert the start position when the item is flipped
								// multiply bullet start position y-component by -1 if flip === 1
								bulletY *= owner._stats.flip === 1 ? -1 : 1;
							}

							if (self.anchoredOffset == undefined) {
								self.anchoredOffset = { x: 0, y: 0, rotate: 0 };
							}

							// item is flipped, then mirror the rotation

							var bulletStartPosition = {
								x:
									owner._translate.x +
									self.anchoredOffset.x +
									self._stats.bulletStartPosition.x * bulletX * Math.cos(rotate) +
									bulletY * Math.sin(rotate),
								y:
									owner._translate.y +
									self.anchoredOffset.y +
									(self._stats.bulletStartPosition.x * bulletX * Math.sin(rotate) - bulletY * Math.cos(rotate)), //* bulletX
							};

							if (
								this._stats.isGun &&
								(taro.isServer || (taro.isClient && taro.physics)) // render projectile on clientside if physics is enabled
							) {
								var defaultData = {
									rotate: rotate,
									translate: bulletStartPosition,
								};

								// projectileStreamMode: 0 is clientside predicted
								// projectileStreamMode: 1 is serverside streamed
								if (
									self.projectileData &&
									(taro.isServer || (taro.isClient && self._stats.projectileStreamMode != 1))
								) {
									defaultData.velocity = {
										deployMethod: self._stats.deployMethod,
										x: Math.cos(rotate + Math.radians(-90)) * self._stats.bulletForce,
										y: Math.sin(rotate + Math.radians(-90)) * self._stats.bulletForce,
									};
									// we don't create a Projectile entity for raycasts
									if (this._stats.bulletType !== 'raycast') {
										self.projectileData = taro.game.cloneAsset('projectileTypes', self._stats.projectileType);
										var projectileData = Object.assign(rfdc()(self.projectileData), {
											type: self._stats.projectileType,
											sourceItemId: self.id(),
											sourceUnitId: ownerId,
											defaultData: defaultData,
											damageData: {
												targetsAffected: this._stats.damage.targetsAffected,
												sourceUnitId: ownerId,
												sourceItemId: self.id(),
												sourcePlayerId: owner.getOwner().id(),
												unitAttributes: this._stats.damage.unitAttributes,
												playerAttributes: this._stats.damage.playerAttributes,
											},
											streamMode: this._stats.projectileStreamMode || 0, // editor incorrectly sets streamMode to undefined when item CSP is on
										});
										var projectile = new Projectile(projectileData);
										taro.script.trigger('entityCreatedGlobal', { entityId: projectile.id() });
										projectile.script.trigger('entityCreated');
										taro.game.lastCreatedProjectileId = projectile.id();
									}
								}

								if (this._stats.bulletType == 'raycast') {
									// starting from unit center position
									let offset = { x: 0, y: 0 };

									const useOwnerBody =
										self._stats.currentBody &&
										(self._stats.currentBody.type == 'spriteOnly' || self._stats.currentBody.type == 'none');

									const pos = useOwnerBody
										? {
												x: owner._translate.x,
												y: owner._translate.y,
												rotation: owner._rotate.z,
											}
										: {
												x: this._translate.x,
												y: this._translate.y,
												rotation: this._rotate.z,
											};

									// factor in unit anchor
									if (useOwnerBody) {
										offset = this.getAnchoredOffset(pos.rotation);
									}

									// factor in bullet start position
									if (this._stats.bulletStartPosition) {
										let bulletOffset = {
											x: this._stats.bulletStartPosition.x,
											y: this._stats.bulletStartPosition.y,
										};

										if (owner._stats.flip === 1) {
											bulletOffset.y *= -1;
										}

										offset.x += bulletOffset.x * Math.cos(pos.rotation) + bulletOffset.y * Math.sin(pos.rotation);
										offset.y += bulletOffset.x * Math.sin(pos.rotation) - bulletOffset.y * Math.cos(pos.rotation);
									}

									pos.x += offset.x;
									pos.y += offset.y;

									const raycastStart = ({ x, y } = pos);
									const raycastEnd = {
										x: pos.x + this._stats.bulletDistance * Math.cos(owner._rotate.z + Math.radians(-90)),
										y: pos.y + this._stats.bulletDistance * Math.sin(owner._rotate.z + Math.radians(-90)),
									};

									// end pos calcs; fire raycast
									const bulletReturn = taro.raycaster.raycastBullet(
										{
											x: raycastStart.x / self.scaleRatio,
											y: raycastStart.y / self.scaleRatio,
										},
										{
											x: raycastEnd.x / self.scaleRatio,
											y: raycastEnd.y / self.scaleRatio,
										}
									);

									// if the shot was not obstructed (shooting through a physics body)
									// render the bullet according to its projectile data on Client
									if (taro.isClient && !bulletReturn.obstructed) {
										taro.raycaster.renderBullet(bulletReturn.start, bulletReturn.point, {
											color: 0xff0000,
											projType: this._stats.projectileType ? this._stats.projectileType : null,
											fraction: bulletReturn.fraction,
											rotation: pos.rotation,
											dimensions: {
												// we are pulling display size of raycast bullet from its default body
												width:
													this.projectileData && this.projectileData.bodies && this.projectileData.bodies.default
														? this.projectileData.bodies.default.width
														: null,
												height:
													this.projectileData && this.projectileData.bodies && this.projectileData.bodies.default
														? this.projectileData.bodies.default.height
														: null,
											},
										});
									}

									if (taro.game.entitiesCollidingWithLastRaycast.length > 0) {
										const damageData = {
											targetsAffected: this._stats.damage.targetsAffected,
											sourceUnitId: ownerId,
											sourceItemId: self.id(),
											sourcePlayerId: owner.getOwner().id(),
											unitAttributes: this._stats.damage.unitAttributes,
											playerAttributes: this._stats.damage.playerAttributes,
										};

										this.raycastTargets = _.filter(
											taro.game.entitiesCollidingWithLastRaycast,
											// _.matchesProperty
											['_category', 'unit']
										);
										// damage
										// console.log(taro.game.entitiesCollidingWithLastRaycast);
										// console.log(this.raycastTargets);
										this.raycastTargets.forEach((unit) => {
											// console.log(`damaging ${unit.id()}`);
											unit.inflictDamage(damageData);
										});
									}

									taro.queueTrigger('raycastItemFired', {
										itemId: self.id(),
										unitId: ownerId,
									});

									this.raycastTargets = [];
								}

								if (self._stats.recoilForce) {
									// apply recoil on its owner if item itself doesn't have physical body
									if (
										self._stats.currentBody == undefined ||
										self._stats.currentBody.type == 'none' ||
										self._stats.currentBody.type == 'spriteOnly'
									) {
										owner.applyForce(
											self._stats.recoilForce * Math.cos(owner._rotate.z + Math.radians(90)),
											self._stats.recoilForce * Math.sin(owner._rotate.z + Math.radians(90))
										);
									} else {
										// apply recoil on item
										self.applyForce(
											self._stats.recoilForce * Math.cos(this._rotate.z + Math.radians(90)),
											self._stats.recoilForce * Math.sin(this._rotate.z + Math.radians(90))
										);
									}
								}
							}
						}
					} else {
						// melee weapon
						var hitboxData = this._stats.damageHitBox;

						if (hitboxData) {
							// console.log(hitboxData);
							var rotate = owner.angleToTarget ? owner.angleToTarget : 0;
							var hitboxPosition = {
								x: owner._translate.x + hitboxData.offsetX * Math.cos(rotate) + hitboxData.offsetY * Math.sin(rotate),
								y: owner._translate.y + hitboxData.offsetX * Math.sin(rotate) - hitboxData.offsetY * Math.cos(rotate),
							};

							var hitbox = {
								x: hitboxPosition.x - hitboxData.width,
								y: hitboxPosition.y - hitboxData.width,
								width: hitboxData.width * 2,
								height: hitboxData.width * 2, // width is used as a radius
							};

							var damageData = {
								targetsAffected: this._stats.damage.targetsAffected,
								sourceUnitId: ownerId,
								sourceItemId: self.id(),
								sourcePlayerId: owner.getOwner().id(),
								unitAttributes: this._stats.damage.unitAttributes,
								playerAttributes: this._stats.damage.playerAttributes,
							};
							// console.log(owner._translate.x, owner._translate.y, hitbox);                                              //////////Hitbox log

							entities = taro.physics.getBodiesInRegion(hitbox);

							while (entities.length > 0) {
								var entity = entities.shift();
								if (entity && entity._category == 'unit') {
									entity.inflictDamage(damageData);
								}
							}
						}
					}
				} else if (self._stats.type == 'consumable') {
					// item is not a gun (e.g. consumable)
					// if cost quantity of consumable item is not defined or 0
					// it should be 1 by default. Bcz 1 item will be consumed when fire.
					// currently we dont have cost quantity setting in consumable items so
					// this is handler for it.

					if (!self.quantityCost) {
						self.quantityCost = 1;
					}

					let attrData = { attributes: {} };
					if (self._stats.bonus && self._stats.bonus.consume) {
						// apply unit bonuses
						var unitAttributeBonuses = self._stats.bonus.consume.unitAttribute;
						if (unitAttributeBonuses) {
							for (var attrId in unitAttributeBonuses) {
								var newValue = parseFloat(owner.attribute.getValue(attrId)) + parseFloat(unitAttributeBonuses[attrId]);
								attrData.attributes[attrId] = owner.attribute.update(attrId, newValue);
							}
						}

						if (player && player.attribute) {
							// apply player bonuses
							var playerAttributeBonuses = self._stats.bonus.consume.playerAttribute;
							if (playerAttributeBonuses) {
								for (attrId in playerAttributeBonuses) {
									var newValue = player.attribute.getValue(attrId) + parseFloat(playerAttributeBonuses[attrId]);
									attrData.attributes[attrId] = player.attribute.update(attrId, newValue);
								}
							}

							if (
								taro.isServer &&
								self._stats &&
								self._stats.bonus &&
								self._stats.bonus.consume &&
								self._stats.bonus.consume.coin
							) {
								// player.streamUpdateData([{
								// 	coins: self._stats.bonus.consume.coin + player._stats.coins
								// }]);
							}
						}

						if (taro.isServer) {
							owner.streamUpdateData(attrData);
						}
					}

					self.stopUsing(); // stop using immediately after use.
				}
			}

			// lowering the quantity by self.quantityCost
		} else {
			// quantity is 0
			self.stopUsing();
		}

		if (isUsed && taro.isClient) {
			this.playEffect('use');
		}

		if (self._stats.quantity != null || self._stats.quantity != undefined) {
			// console.log(isUsed, self._stats.quantity , self._stats.quantity > 0)

			// update quantity if quantity is changing
			if (isUsed && self._stats.quantity > 0 && self.quantityCost > 0) {
				let newQuantity = self._stats.quantity - self.quantityCost;
				self.updateQuantity(newQuantity);
				if (newQuantity <= 0) {
					self.script.trigger('ThisItemsQuantityBecomesZero');
				}
			}
		}
	},

	updateQuantity: function (qty) {
		this._stats.quantity = qty;
		if (taro.isServer) {
			var clientId = this.getOwnerUnit()?.getOwner()?._stats.clientId;
			// if server authoritative mode is enabled, then stream item quantity to the item's owner player only
			if (taro.runMode == 0) {
				this.streamUpdateData([{ quantity: qty }], clientId);
			}

			// item's set to be removed when empty
			if (this._stats.quantity == 0 && this._stats.removeWhenEmpty === true) {
				var ownerUnit = this.getOwnerUnit();
				this.remove();
				if (ownerUnit) {
					ownerUnit.streamUpdateData([{ itemIds: ownerUnit._stats.itemIds }], clientId);
				}
			}
		} else if (taro.isClient && taro.client.selectedUnit == this.getOwnerUnit()) {
			taro.itemUi.updateItemQuantity(this);
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
				if (owner._stats.attributes[attrName] == undefined || owner._stats.attributes[attrName].value < cost) {
					canAffordCost = false;
				}
			}

			// check player attributes can afford cost
			for (attrName in ability.cost.playerAttributes) {
				var cost = ability.cost.playerAttributes[attrName];
				if (player._stats.attributes[attrName] == undefined || player._stats.attributes[attrName].value < cost) {
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
						owner.attribute.update(attrName, newValue);
						unitAttributeChanged = true;
					}
				}
				for (attrName in ability.cost.playerAttributes) {
					if (player._stats.attributes[attrName]) {
						var newValue = player._stats.attributes[attrName].value - ability.cost.playerAttributes[attrName];
						// player._stats.attributes[attrName].value -= ability.cost.playerAttributes[attrName];
						player.attribute.update(attrName, newValue);
						playerAttributeChanged = true;
					}
				}

				// calling stream for unit because there is delay in transferring attributes data
				if (taro.isClient && owner._stats.clientId == taro.network.id() && player._stats.selectedUnitId == owner.id()) {
					if (unitAttributeChanged) {
						owner.attribute.refresh();
					}
					if (playerAttributeChanged) {
						taro.playerUi.updatePlayerAttributeValues(player._stats.attributes);
					}
				}
			}
			return canAffordCost;
		} else {
			// taro.server.itemComponent.prototype.log('can\'t afford cost');
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
	// 				reach = velocity * bulletLifespan / taro._fpsRate / 4;
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

		if (self._stats.isBeingUsed) return;

		self._stats.isBeingUsed = true;
		self._stats.useQueued = true; // ensures that use() is executed at least once
		var owner = this.getOwnerUnit();
		if (taro.isServer) {
			this.quantityAtStartusing = this._stats.quantity;
			this.streamUpdateData([{ isBeingUsed: true }]);
		}

		if (owner) {
			const triggerParams = { unitId: owner.id(), itemId: this.id() };
			//we cant use queueTrigger here because it will be called after entity scripts and item or unit probably no longer exists
			this.script.trigger('thisItemStartsBeingUsed', triggerParams); // this entity (item)
			owner.script.trigger('thisUnitStartsUsingAnItem', triggerParams); // this entity (unit)
			taro.script.trigger('unitStartsUsingAnItem', triggerParams); // unit starts using item
		}
	},

	stopUsing: function () {
		var self = this;

		if (!self._stats.isBeingUsed) return;

		self._stats.isBeingUsed = false;
		var owner = self.getOwnerUnit();

		if (owner) {
			const triggerParams = { unitId: owner.id(), itemId: self.id() };
			//we cant use queueTrigger here because it will be called after entity scripts and item or unit probably no longer exists
			self.script.trigger('thisItemStopsBeingUsed', triggerParams); // this entity (item)
			owner.script.trigger('thisUnitStopsUsingAnItem', triggerParams); // this entity (unit)
			taro.script.trigger('unitStopsUsingAnItem', triggerParams); // unit stops using item
		}

		if (taro.isClient) {
			this.playEffect('none');
		} else if (taro.isServer) {
			var data = { isBeingUsed: false };
			if (self._stats.quantity != self.quantityAtStartusing) {
				data.quantity = self._stats.quantity;
			}
			this.streamUpdateData([data]);
		}
	},
	refillAmmo: function () {
		var itemData = taro.game.cloneAsset('itemTypes', this._stats.itemTypeId);
		this.streamUpdateData([{ ammoTotal: itemData.ammoTotal }, { ammo: itemData.ammoSize }]);
	},

	/**
	 * get item's position based on its itemAnchor, unitAnchor, and current rotation value.
	 * @param rotate item's rotation. used for tweening item that's not anchored at 0,0. e.g. swinging a sword.
	 */
	getAnchoredOffset: function (rotate = 0) {
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
					// if (taro.isClient && ownerUnit == taro.client.selectedUnit) {
					// console.log(itemAngle, unitAnchoredPosition)
					// }

					var unitAnchorOffsetRotate = Math.radians(self._stats.currentBody.unitAnchor.rotation || 0);
					var unitAnchorOffsetY = self._stats.currentBody.unitAnchor.y || 0;
					var itemAnchorOffsetY = self._stats.currentBody.itemAnchor?.y || 0; // get translation offset based on itemAnchor

					// item is flipped, then mirror the rotation
					if (ownerUnit._stats.flip == 1) {
						var unitAnchorOffsetX = -self._stats.currentBody.unitAnchor.x || 0;
						var itemAnchorOffsetX = -self._stats.currentBody.itemAnchor?.x || 0;

						rotate -= unitAnchorOffsetRotate;
					} else {
						var unitAnchorOffsetX = self._stats.currentBody.unitAnchor.x || 0;
						var itemAnchorOffsetX = self._stats.currentBody.itemAnchor?.x || 0;

						rotate += unitAnchorOffsetRotate;
					}

					var unitAnchoredPosition = {
						x: unitAnchorOffsetX * Math.cos(unitRotate) + unitAnchorOffsetY * Math.sin(unitRotate),
						y: unitAnchorOffsetX * Math.sin(unitRotate) - unitAnchorOffsetY * Math.cos(unitRotate),
					};

					(offset.x =
						unitAnchoredPosition.x + itemAnchorOffsetX * Math.cos(rotate) + itemAnchorOffsetY * Math.sin(rotate)),
						(offset.y =
							unitAnchoredPosition.y + itemAnchorOffsetX * Math.sin(rotate) - itemAnchorOffsetY * Math.cos(rotate));

					if (self._stats.controls && self._stats.controls.mouseBehaviour) {
						if (
							self._stats.controls.mouseBehaviour.rotateToFaceMouseCursor ||
							(self._stats.currentBody && self._stats.currentBody.jointType == 'weldJoint')
						) {
							offset.rotate = rotate;
						}
					}
				}
			}
		}

		return offset;
	},

	// update inventory slot number of this item
	changeSlotIndex: function (index) {
		var self = this;
		var owner = self.getOwnerUnit();

		if (taro.isServer) {
			this._stats.slotIndex = index;
			this.streamUpdateData([{ slotIndex: index }]);
		}
		// if item is in its owner's backpack, hide it
		if (owner) {
			let triggerParams = { unitId: owner.id(), itemId: self.id() };
			self.script.trigger('thisItemChangesInventorySlot', triggerParams); // this entity (item) (need to rename rename 'itemIsUsed' -> 'thisItemIsUsed')
			owner.script.trigger('thisUnitMovesItemInInventory', triggerParams); // this entity (unit)

			if (index >= owner._stats.inventorySize) {
				this.hide();
				// show if there is a body
			} else if (this._stats.currentBody) {
				this.show();
			} else {
				this.hide();
			}
		}
	},

	changeItemType: function (type, defaultData) {
		var self = this;
		var ownerUnit = taro.$(this._stats.ownerUnitId);

		// removing passive attributes
		if (ownerUnit) {
			if (self._stats.bonus && self._stats.bonus.passive) {
				if (
					self._stats.slotIndex < this._stats.inventorySize ||
					self._stats.bonus.passive.isDisabledInBackpack != true
				) {
					ownerUnit.updateStats(self.id(), true);
				}
			} else {
				ownerUnit.updateStats(self.id(), true);
			}
		}

		//self.previousState = this._stats.stateId;

		var data = taro.game.cloneAsset('itemTypes', type);
		delete data.type; // hotfix for dealing with corrupted game json that has unitData.type = "unitType". This is caused by bug in the game editor.

		if (data == undefined) {
			taro.script.errorLog('changeItemType: invalid data');
			return;
		}

		self.script.load(data.scripts);
		self.script.scriptCache = {};

		self._stats.itemTypeId = type;

		for (var i in data) {
			if (i === 'name' || i === 'attributes' || i === 'variables' || i === 'stateId') {
				// don't overwrite item's name with item type name
				continue;
			}
			self._stats[i] = data[i];
		}
		// if the new item type has the same entity variables as the old item type, then pass the values
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
					var attributeValue = data.attributes[attrId].value; // default attribute value from new item type
					// if old item type had a same attribute, then take the value from it.
					if (self._stats.attributes && self._stats.attributes[attrId]) {
						attributeValue = self._stats.attributes[attrId].value;
					}
					if (this._stats.attributes[attrId]) {
						this._stats.attributes[attrId].value = Math.max(
							data.attributes[attrId].min,
							Math.min(data.attributes[attrId].max, parseFloat(attributeValue))
						);
					}
				}
			}
		}

		if (taro.isClient) {
			self.updateTexture();
			self._scaleTexture();
		}

		//if (self.previousState) self.setState(self.previousState, defaultData);

		if (ownerUnit) {
			this._stats.ownerUnitId = ownerUnit.id();

			// if the unit type cannot carry the item, then remove it.
			if (ownerUnit.canCarryItem(self._stats) == false) {
				self.remove();
			} else if (ownerUnit.canUseItem(self._stats)) {
				// if unit cannot use the item, then unselect the item
				if (self._stats.slotIndex != undefined && ownerUnit._stats.currentItemIndex != undefined) {
					if (ownerUnit._stats.currentItemIndex === self._stats.slotIndex) {
						self.setState('selected');
					} else {
						//self.setState('unselected');
					}
				}
			} else {
				self.setState('unselected');
			}
			// adding back passive attributes
			if (self._stats.bonus && self._stats.bonus.passive) {
				if (
					self._stats.slotIndex < this._stats.inventorySize ||
					self._stats.bonus.passive.isDisabledInBackpack != true
				) {
					ownerUnit.updateStats(self.id());
				}
			} else {
				ownerUnit.updateStats(self.id());
			}
		} else {
			self.setState('dropped');
		}

		if (taro.isServer) {
			/*if (ownerUnit) {
				var index = ownerUnit._stats.currentItemIndex;
				ownerUnit.changeItem(index); // this will call change item on client for all units
			}*/
		} else if (taro.isClient) {
			var zIndex = (self._stats.currentBody && self._stats.currentBody['z-index']) || { layer: 3, depth: 3 };

			if (zIndex && taro.network.id() == self._stats.clientId && !taro.game.data.heightBasedZIndex) {
				// depth of this player's units should have +1 depth to avoid flickering on overlap
				zIndex.depth++;
			}

			self.updateLayer();

			// destroy existing particle emitters first
			for (var particleId in self.particleEmitters) {
				if (self.particleEmitters[particleId]) {
					self.particleEmitters[particleId].destroy();
					delete self.particleEmitters[particleId];
				}
			}

			if (ownerUnit) {
				ownerUnit.inventory.update();
			}
		}
	},

	resetItemType: function () {
		const data = taro.game.cloneAsset('itemTypes', this._stats.itemTypeId);

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
		var self = this;

		TaroEntity.prototype.streamUpdateData.call(this, queuedData, clientId);
		// taro.devLog("Item streamUpdateData ", data)
		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];

				switch (attrName) {
					case 'type':
						//self._stats[attrName] = newValue;
						//this.changeItemType(newValue, {}, false);
						break;

					case 'ownerUnitId':
						if (newValue.persistedItem) {
							this._stats.oldOwnerUnitId = this._stats.ownerUnitId;
							this._stats[attrName] = newValue.id;
							if (taro.isClient) {
								var newOwner = taro.$(newValue.id);
								self.setOwnerUnit(newOwner, newValue.persistedItem);
							}
						} else {
							this._stats.oldOwnerUnitId = this._stats.ownerUnitId;
							this._stats[attrName] = newValue;
							if (taro.isClient) {
								var newOwner = taro.$(newValue);
								self.setOwnerUnit(newOwner);
							}
						}

						break;

					case 'scale':
					case 'scaleBody':
						this._stats[attrName] = newValue;
						if (taro.isClient) {
							if (taro.physics) {
								self._scaleBox2dBody(newValue);
							}
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

					case 'quantity':
						this._stats[attrName] = newValue;
						var owner = self.getOwnerUnit();
						if (taro.isClient && taro.client.selectedUnit == owner) {
							self.updateQuantity(newValue);
						}
						break;

					case 'description':
						this._stats[attrName] = newValue;
						var owner = self.getOwnerUnit();
						// doesn't work on creation of item (no owner yet)
						if (taro.isClient && taro.client.selectedUnit == owner) {
							taro.itemUi.updateItemDescription(this);
						}
						break;

					case 'name':
						if (taro.isClient) {
							newValue = taro.clientSanitizer(newValue);
						}

						this._stats[attrName] = newValue;
						var owner = self.getOwnerUnit();
						if (taro.isClient && taro.client.selectedUnit == owner) {
							taro.itemUi.updateItemInfo(this);
							taro.itemUi.updateItemDescription(this);
						}
						break;

					case 'inventoryImage':
						this._stats[attrName] = newValue;
						var owner = self.getOwnerUnit();
						if (taro.isClient && taro.client.selectedUnit == owner) {
							taro.itemUi.updateItemSlot(this, this._stats.slotIndex);
						}
						break;

					case 'inventorySlotColor':
						this._stats[attrName] = newValue;
						var owner = self.getOwnerUnit();
						if (taro.isClient && taro.client.selectedUnit == owner) {
							owner.inventory.update();
						}
						break;

					case 'slotIndex':
						this._stats[attrName] = newValue;
						break;

					case 'useQueued':
						// use item once
						if (taro.isClient) {
							this._stats.useQueued = newValue;
						}
						break;

					case 'isBeingUsed':
						var owner = self.getOwnerUnit();
						// if the item's CSP is enabled, ignore server-stream so my item use won't fire two bullets
						if (taro.isClient) {
							// ignore server-stream if client isn't running physics or if projectileStreamMode is 0 (client-side projectile)
							if (owner == taro.client.selectedUnit && taro.physics && !this._stats.projectileStreamMode) {
								break;
							}
							this._stats.isBeingUsed = newValue;
						}
						break;

					case 'fireRate':
						if (taro.isClient) {
							this._stats.fireRate = newValue;
						}
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

		if (!taro.gameLoopTickHasExecuted) {
			return;
		}
		_.forEach(taro.triggersQueued, function (trigger) {
			trigger.params['thisEntityId'] = self.id();
			self.script.trigger(trigger.name, trigger.params);
		});

		var ownerUnit = this.getOwnerUnit();
		if (ownerUnit && this._stats.stateId != 'dropped') {
			// this is necessary for games that has sprite-only item with no joint. (e.g. team elimination)
			var rotate = this._rotate.z;

			// angleToTarget is only available in server
			if (taro.isServer && ownerUnit.angleToTarget) {
				rotate = ownerUnit.angleToTarget;
			}

			if (self._stats.currentBody && self._stats.currentBody.jointType == 'weldJoint') {
				rotate = ownerUnit._rotate.z;
			}

			self.anchoredOffset = self.getAnchoredOffset(rotate);
			var x = ownerUnit._translate.x + self.anchoredOffset.x;
			var y = ownerUnit._translate.y + self.anchoredOffset.y;

			if (taro.isServer) {
				if (ownerUnit.body) {
					// on server, add anchoredOffset to the position of the physics body, not Unit._translate
					x = ownerUnit.body.getPosition().x * ownerUnit._b2dRef._scaleRatio + self.anchoredOffset.x;
					y = ownerUnit.body.getPosition().y * ownerUnit._b2dRef._scaleRatio + self.anchoredOffset.y;
				}
				// for client-side, translate+rotate is handled in entitiesToRender.ts
				self.translateTo(x, y);
				self.rotateTo(0, 0, rotate);
			} else {
				// for updating physics body of this item
				self.nextKeyFrame = [taro._currentTime + taro.client.renderBuffer, [x, y, rotate]];
			}

			if (taro.isServer || (taro.isClient && taro.client.selectedUnit == ownerUnit)) {
				if (
					self._stats.controls &&
					self._stats.controls.mouseBehaviour &&
					self._stats.controls.mouseBehaviour.flipSpriteHorizontallyWRTMouse
				) {
					if (ownerUnit.angleToTargetRelative > 0 && ownerUnit.angleToTargetRelative < Math.PI) {
						self.flip(0);
					} else {
						self.flip(1);
					}
				}
			}
		}

		if (this._stats.isBeingUsed || this._stats.useQueued) {
			this.use();
			this._stats.useQueued = false;
		}

		// if entity (unit/item/player/projectile) has attribute, run regenerate
		if (taro.isServer) {
			if (this.attribute) {
				this.attribute.regenerate();
			}
		} else if (taro.isClient) {
			var processedUpdates = [];
			var updateQueue = taro.client.entityUpdateQueue[self.id()];
			if (updateQueue) {
				for (var key in updateQueue) {
					var value = updateQueue[key];

					if (
						// Don't run if we're updating item's state/owner unit, but its owner doesn't exist yet
						// updating item's owner unit, but the owner hasn't been created yet
						(key == 'ownerUnitId' && value != 0 && taro.$(value) == undefined) || // changing item's state to selected/unselected, but owner doesn't exist yet
						(key == 'stateId' && (value == 'selected' || value == 'unselected') && this.getOwnerUnit() == undefined)
					) {
						continue;
					} else {
						processedUpdates.push({ [key]: value });
						delete taro.client.entityUpdateQueue[self.id()][key];

						// remove queue object for this entity is there's no queue remaining in order to prevent memory leak
						if (Object.keys(taro.client.entityUpdateQueue[this.id()]).length == 0) {
							delete taro.client.entityUpdateQueue[this.id()];
						}
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

	loadPersistentData: function (persistData) {
		var self = this;
		if (persistData) {
			TaroEntity.prototype.loadPersistentData.call(this, persistData);
		}
	},
	/**
	 * Called every frame by the engine when this entity is mounted to the scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		if (taro.isClient && !taro.client.itemRenderEnabled) return;
		// Call the TaroEntity (super-class) tick() method
		TaroEntity.prototype.tick.call(this, ctx);
	},

	remove: function () {
		// traverse through owner's inventory, and remove itself
		// change streammode of spriteOnly items
		if (this._streamMode === 2) {
			this.streamMode(1);
		}

		// if item has owner, then remove item from owner's inventory as well
		var ownerUnit = taro.$(this._stats.ownerUnitId);
		if (ownerUnit) {
			// remove its passive attributes from its ownerUnit unit.
			if (this._stats.bonus && this._stats.passive) {
				if (
					this._stats.slotIndex < ownerUnit._stats.inventorySize ||
					this._stats.bonus.passive.isDisabledInBackpack != true
				) {
					ownerUnit.updateStats(this.id(), true);
				}
			} else {
				ownerUnit.updateStats(this.id(), true);
			}

			if (ownerUnit.inventory) {
				ownerUnit.inventory.removeItemByItemId(this.id());
			}
		}

		TaroEntityPhysics.prototype.remove.call(this);
	},

	destroy: function () {
		this.script.trigger('initEntityDestroy');
		this.playEffect('destroy');
		TaroEntityPhysics.prototype.destroy.call(this);
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Item;
}
