var AttributeComponent = TaroEntity.extend({
	classId: 'AttributeComponent',
	componentId: 'attribute',

	init: function (entity, options) {
		var self = this;
		self._entity = entity;

		self.now = Date.now();
		self.lastRegenerated = self.now;
		self.lastSynced = self.now;

		// attributes is an object
		if (entity._stats.attributes) {
			const attributes = entity._stats.attributes;

			for (var attrId in attributes) {
				const individualAttribute = attributes[attrId];
				individualAttribute.value = Math.max(individualAttribute.min, Math.min(individualAttribute.max, individualAttribute.value));
			}
		}
	},

	// decay / regenerate
	regenerate: function () {
		var self = this;

		self.now = Date.now();

		// reneration happens every 200ms
		if (self.now - self.lastRegenerated > 200) {
			self.lastRegenerated = self.now + (self.now - self.lastRegenerated - 200);

			var attributes = self._entity._stats.attributes;
			for (attributeTypeId in attributes) {
				var attr = attributes[attributeTypeId];
				if (attr && attr.regenerateSpeed) {
					var oldValue = parseFloat(attr.value);
					var newValue = oldValue + parseFloat(attr.regenerateSpeed);
					newValue = Math.max(attr.min, Math.min(attr.max, parseFloat(newValue)));
					if (oldValue != newValue) {
						self.update(attributeTypeId, newValue, newValue === attr.max);
					}
				}
			}
		}
	},

	// update UI
	refresh: function () {
		var self = this;

		var attributes = self._entity._stats.attributes;
		for (var attributeTypeId in attributes) {
			var attr = attributes[attributeTypeId];
			// if unit is my unit, update UI
			if (taro.isClient && taro.network.id() == self._entity._stats.clientId) {
				if (attr.isVisible) {
					self._entity.unitUi.updateAttributeBar(attr);
				}
			}
		}
	},

	// update attributes upon equipping/unequipping items.
	// the bonuses will only affect maxValue of the attributes. Not the current values of the attributes
	updatePassiveAttributes: function (removeAttribute, currentItemId, unitTypeChange, persistedData) {
		// reset unit attribute
		var self = this;
		var unit = self._entity;
		// update stats of only selectedItem
		var itemIds = unit._stats.itemIds.filter(function (itemId) {
			if (currentItemId) {
				return itemId == currentItemId;
			}
			return itemId;
		});
		var unitType = taro.game.cloneAsset('unitTypes', unit._stats.type);
		var defaultUnitAttributes = unitType ? unitType.attributes : undefined;

		var player = unit.getOwner();
		if (player) {
			var playerType = taro.game.cloneAsset('playerTypes', player._stats.playerTypeId);
			var defaultPlayerAttributes = playerType ? playerType.attributes : undefined;
		}

		var unitAttr = { attributes: {}, attributesMax: {} };
		var playerAttr = { attributes: {}, attributesMax: {} };
		for (var i = 0; i < itemIds.length; i++) {
			var item = taro.$(itemIds[i]);
			if (item) {
				if (item && item._stats.bonus && item._stats.bonus.passive && unit) {
					// passive unit attribute bonus
					var unitAttributePassiveBonuses = item._stats.bonus.passive.unitAttribute;
					if (unitAttributePassiveBonuses) {
						for (var attrId in unitAttributePassiveBonuses) {
							var selectedAttribute = unit._stats.attributes[attrId];
							var bonus = unitAttributePassiveBonuses[attrId];
							if (selectedAttribute && bonus) {
								var currentAttributeValue = parseFloat(self.getValue(attrId)) || 1;
								var maxValue = parseFloat(selectedAttribute.max);
								if (currentAttributeValue != undefined && bonus && unit._stats.attributes[attrId]) {
									if (removeAttribute) {
										if (bonus.type === 'percentage') {
											var newValue = currentAttributeValue / (1 + (parseFloat(bonus.value) / 100));
											var newMax = maxValue / (1 + (parseFloat(bonus.value) / 100));
										} else {
											var newMax = maxValue - parseFloat(bonus.value);
											var newValue = Math.min(newMax, Math.max(selectedAttribute.min, currentAttributeValue));
										}
									} else {
										if (bonus.type === 'percentage') {
											var newValue = currentAttributeValue * (1 + (parseFloat(bonus.value) / 100));
											var newMax = maxValue * (1 + (parseFloat(bonus.value) / 100));
										} else {
											var newMax = maxValue + parseFloat(bonus.value);
											var newValue = Math.min(newMax, Math.max(selectedAttribute.min, currentAttributeValue));
										}
									}
									unit._stats.attributes[attrId].value = newValue;
									unitAttr.attributes[attrId] = newValue;
									unit._stats.attributes[attrId].max = newMax;
									unitAttr.attributesMax[attrId] = unit._stats.attributes[attrId].max;
								}
							}
						}
					}

					var playerAttributePassiveBonuses = item._stats.bonus.passive.playerAttribute;
					if (playerAttributePassiveBonuses && player && player._stats.attributes && !unitTypeChange) {
						for (attrId in playerAttributePassiveBonuses) {
							var selectedAttribute = player._stats.attributes[attrId];
							if (selectedAttribute) {
								var currentAttributeValue = parseFloat(player.attribute.getValue(attrId)) || 1;
								var bonus = playerAttributePassiveBonuses[attrId];
								var maxValue = parseFloat(selectedAttribute.max);

								if (currentAttributeValue != undefined && bonus && player._stats.attributes[attrId]) {
									// this condition check if attribute value is directly applyed from server side then not update on client side
									if (removeAttribute) {
										if (bonus.type === 'percentage') {
											var newValue = currentAttributeValue / (1 + (parseFloat(bonus.value) / 100));
											var newMax = maxValue / (1 + (parseFloat(bonus.value) / 100));
										} else {
											var newMax = maxValue - parseFloat(bonus.value);
											var newValue = Math.min(newMax, Math.max(selectedAttribute.min, currentAttributeValue));
										}
									} else {
										if (bonus.type === 'percentage') {
											var newValue = currentAttributeValue * (1 + (parseFloat(bonus.value) / 100));
											var newMax = maxValue * (1 + (parseFloat(bonus.value) / 100));
										} else {
											var newMax = maxValue + parseFloat(bonus.value);
											var newValue = Math.min(newMax, Math.max(selectedAttribute.min, currentAttributeValue));
										}
									}
									player._stats.attributes[attrId].value = newValue;
									playerAttr.attributes[attrId] = newValue;
									player._stats.attributes[attrId].max = newMax;
									playerAttr.attributesMax[attrId] = player._stats.attributes[attrId].max;
								}
							}
						}
					}
				}
			}
		}

		if (!unitTypeChange && !persistedData) {
			if (unit) {
				// obj to array conversion
				data = [];
				for (key in unitAttr) {
					data.push(unitAttr[key]);
				}
				unit.streamUpdateData(data);
			}
			if (player) {
				// obj to array conversion
				data = [];
				for (key in playerAttr) {
					data.push(playerAttr[key]);
				}
				player.streamUpdateData(data);
			}
		}
	},
	// change attribute's value manually
	update: function (attributeTypeId, newValue, forceUpdate) {
		var self = this;
		if (!self._entity._stats || !self._entity._stats.attributes) {
			return;
		}

		var attributes = JSON.parse(JSON.stringify(self._entity._stats.attributes)); // clone units existing attribute values
		if (attributes) {
			var attribute = attributes[attributeTypeId];
			if (attribute) {
				attribute.type = attributeTypeId; // tracking what "triggering attributeType" is in variableComponent.

				var min = parseFloat(attribute.min);
				var max = parseFloat(attribute.max);
				var oldValue = parseFloat(attribute.value);
				var newValue = Math.max(min, Math.min(max, parseFloat(newValue)));

				self._entity._stats.attributes[attributeTypeId].value = parseFloat(newValue);

				if (taro.isServer) {
					if (newValue != oldValue) {
						// force sync with client every 5 seconds
						if (
							self._entity && self._entity._stats && self._entity._stats.attributes && self._entity._stats.attributes[attributeTypeId] &&
							self._entity._stats.attributes[attributeTypeId].lastSyncedValue != newValue && // value is different from last sync'ed value and...
							(
								forceUpdate || // forceUpdate triggered
								self._entity._stats.attributes[attributeTypeId].lastSynced == undefined || // it's never been sync'ed with client's attributes before or..
								(self.now - self._entity._stats.attributes[attributeTypeId].lastSynced > 5000) // it's been over 5 seconds since we last sync'ed
							)
						) {
							self._entity._stats.attributes[attributeTypeId].lastSynced = self.now;
							self._entity._stats.attributes[attributeTypeId].lastSyncedValue = newValue;
							let attrData = { attributes: {} };
							attrData.attributes[attributeTypeId] = newValue;
							self._entity.streamUpdateData([attrData]);



						}

						var triggeredBy = { attribute: attribute };
						triggeredBy[`${this._entity._category}Id`] = this._entity.id();
						if (newValue <= 0 && oldValue > 0) // when attribute becomes zero, trigger attributeBecomesZero event
						{
							// unit's health became 0. announce death
							if (self._entity._category == 'unit' && attributeTypeId == 'health') {
								self._entity.ai.announceDeath();
							}

							// necessary as self._entity can be 'player' which doesn't have scriptComponent
							if (self._entity._category == 'unit' || self._entity._category == 'item' || self._entity._category == 'projectile') {
								self._entity.script.trigger('entityAttributeBecomesZero', triggeredBy);
							}

							taro.queueTrigger(`${this._entity._category}AttributeBecomesZero`, triggeredBy);
						} else if (newValue >= attribute.max) // when attribute becomes full, trigger attributeBecomesFull event
						{
							// necessary as self._entity can be 'player' which doesn't have scriptComponent
							if (self._entity._category == 'unit' || self._entity._category == 'item' || self._entity._category == 'projectile') {
								self._entity.script.trigger('entityAttributeBecomesFull', triggeredBy);
							}

							taro.queueTrigger(`${this._entity._category}AttributeBecomesFull`, triggeredBy);
						}

						// check if user breaks his highscore then assign it to new highscore
						if (attributeTypeId == taro.game.data.settings.scoreAttributeId && self._entity._stats.highscore < newValue) {
							if (!self._entity._stats.newHighscore) {
								taro.gameText.alertHighscore(self._entity._stats.clientId);
							}
							self._entity._stats.newHighscore = newValue;
						}
					}
				} else if (taro.isClient) {
					if (taro.client.myPlayer) {
						var unit = null;

						attribute.hasChanged = newValue !== oldValue;

						switch (self._entity._category) {
							case 'unit': {
								unit = self._entity;

								// console.log(attribute, attribute.value);
								if (taro.client.myPlayer._stats.selectedUnitId == unit.id()) {
									self._entity.unitUi.updateAttributeBar({ ...attribute, ...{ value: parseFloat(newValue) } });
								}

								// this is the only way to convert to number i guess??
								// all of the old implementations pass a value as a string here
								// even if we call attribute.value = parseFloat(attribute.value)
								// or other variations of this
								self._entity.updateAttributeBar({ ...attribute, ...{ value: parseFloat(newValue) } });
								break;
							}
							case 'item': {
								var item = self._entity;
								unit = item.getOwnerUnit();

								// if (unit && taro.client.myPlayer._stats.selectedUnitId == unit.id()) {
								// 	item.updateAttributeBar(attribute);
								// 	if (attribute && attribute.isVisible && attribute.isVisible.includes('itemDescription')) {
								// 		taro.itemUi.updateItemSlot(item, item._stats.slotIndex);
								// 	}
								// }
								break;
							}
							case 'projectile': {
								var projectile = self._entity;
								var item = projectile.getSourceItem();
								unit = item && item.getOwnerUnit();

								// if (unit && taro.client.myPlayer._stats.selectedUnitId == unit.id()) {
								// 	projectile.updateAttributeBar(attribute);
								// }
								break;
							}
						}
					}
				}

				return newValue;
			}
		}
	},
	// get attribute value
	getValue: function (attrId) {
		var attributes = this._entity._stats.attributes;
		if (attributes && attributes[attrId]) {
			return attributes[attrId].value;
		} else {
			// var stats = this._entity._stats
			return undefined;
		}
	},

	setMax: function (attrId, value) {
		var attributes = this._entity._stats.attributes;
		if (attributes) {
			var attribute = attributes[attrId];

			if (attribute) {
				attribute.max = value;
				if (taro.isServer) {
					var attribute = {
						attributesMax: {}
					};
					attribute.attributesMax[attrId] = value;
					this._entity.streamUpdateData([attribute]);
					// taro.network.send('updateEntityAttribute', {
					// 	"e": this._entity._id,
					// 	"a": attrId,
					// 	"x": value,
					// 	'p': 'max'
					// });
				}
			}
		}
	},

	setMin: function (attrId, value) {
		var self = this;
		var attributes = this._entity._stats.attributes;
		if (attributes) {
			var attribute = attributes[attrId];

			if (attribute) {
				// attribute.min = value
				if (taro.isServer) {
					var attribute = {
						attributesMin: {}
					};
					attribute.attributesMin[attrId] = value;
					this._entity.streamUpdateData([attribute]);
					// taro.network.send('updateEntityAttribute', {
					// 	"e": this._entity._id,
					// 	"a": attrId,
					// 	"x": value,
					// 	'p': 'min'
					// });
				}
			}
		}
	},

	setRegenerationSpeed: function (attrId, value) {
		var self = this;
		var attributes = this._entity._stats.attributes;

		if (attributes) {
			var attribute = attributes[attrId];

			if (attribute) {
				attribute.regenerateSpeed = value;
				if (taro.isServer) {
					taro.network.send('updateEntityAttribute', {
						e: this._entity._id,
						a: attrId,
						x: value,
						p: 'regenerateSpeed'
					});
				}
			}
		}
	},

	destroy: function () {
		clearInterval(this.regenTick);

		TaroEntity.prototype.destroy.call(this);
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = AttributeComponent; }
