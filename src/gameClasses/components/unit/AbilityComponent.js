var AbilityComponent = TaroEntity.extend({
	classId: 'AbilityComponent',
	componentId: 'ability',

	init: function (entity, options) {
		var self = this;
		self._entity = entity;

		this.activeAbilities = {};
		this.abilityDurations = {};
		this.abilityCooldowns = {};
	},

	moveUp: function () {
		if (this._entity.direction) {
			this._entity.direction.y = -1;
			// entity.body.setLinearVelocity(new TaroPoint3d(velocityX, velocityY, 0));
		}
	},

	moveLeft: function () {
		if (this._entity.direction) {
			this._entity.direction.x = -1;
			// this._entity.body.setLinearVelocity(new TaroPoint3d(velocityX, velocityY, 0));
		}
	},

	moveDown: function () {
		if (this._entity.direction) {
			this._entity.direction.y = 1;
			// this._entity.body.setLinearVelocity(new TaroPoint3d(velocityX, velocityY, 0));
		}
	},

	moveRight: function () {
		if (this._entity.direction) {
			this._entity.direction.x = 1;
			// this._entity.body.setLinearVelocity(new TaroPoint3d(velocityX, velocityY, 0));
		}
	},

	stopMovingY: function () {
		if (this._entity.direction) {
			this._entity.direction.y = 0;

			// only velocity-based units will stop immediately
			// if (this._entity._stats.controls.movementMethod == 'velocity') {
			// 	this._entity.body.setLinearVelocity(new TaroPoint3d(this._entity.body.getLinearVelocity().x, 0, 0));
			// }
		}
	},

	stopMovingX: function () {
		if (this._entity.direction) {
			this._entity.direction.x = 0;

			// only velocity-based units will stop immediately
			// if (this._entity._stats.controls.movementMethod == 'velocity') {
			// 	this._entity.body.setLinearVelocity(new TaroPoint3d(0, this._entity.body.getLinearVelocity().y, 0));
			// }
		}
	},

	startUsingItem: function () {
		var item = this._entity.getCurrentItem();
		if (item) {
			item.startUsing();
		}
	},

	stopUsingItem: function () {
		var item = this._entity.getCurrentItem();
		if (item) {
			item.stopUsing();
		}
	},

	pickupItem: function () {
		var self = this;
		if (taro.isServer) {
			var region = {
				x: self._entity._translate.x - self._entity._bounds2d.x / 2,
				y: self._entity._translate.y - self._entity._bounds2d.y / 2,
				width: self._entity._bounds2d.x,
				height: self._entity._bounds2d.y
			};

			var entities = taro.physics.getBodiesInRegion(region).filter(({ _category }) => _category === 'item');
			// pickup ownerLess items
			var unit = self._entity;
			unit.reasonForFailingToPickUpItem = undefined;

			if (unit && unit._category == 'unit') {
				for (var i = 0; i < entities.length; i++) {
					var item = entities[i];
					if (item && item._category === 'item' && !item.getOwnerUnit()) {
						// only pick 1 item up at a time
						if (unit.pickUpItem(item)) {
							return;
						}
					}
				}
				if (unit.reasonForFailingToPickUpItem) {
					unit.streamUpdateData([{ setFadingText: unit.reasonForFailingToPickUpItem, color: 'red' }]);
				}
			}
		}
	},

	dropItem: function () {
		var self = this;

		if (self._entity && !isNaN(self._entity._stats.currentItemIndex)) {
			var item = self._entity.dropItem(self._entity._stats.currentItemIndex);
			if (item) {
				// slightly push item in front of the unit
				var rotate = self._entity.angleToTarget;
				var vector = {
					x: (20 * Math.sin(rotate)),
					y: -(20 * Math.cos(rotate))
				};
				item.applyForce(vector.x, vector.y);
			}
		}
	},

	cast: function (handle) {
		var self = this;

		if (handle == undefined)
			return;

		var ability = null;

		if ((handle.cost && handle.scriptName) || handle.event) {
			ability = handle;
		} else {
			ability = taro.game.data.abilities[handle];
		}

		switch (ability?.event) {
			// skip switch for old abilities
			case undefined:
				break;

			case 'startCasting':
				return this.startCasting(ability.abilityId);

			case 'stopCasting':
				return this.stopCasting(ability.abilityId);
		}

		// new abilities should have returned by now. following is for old system (backwards comp.)
		var player = self._entity.getOwner();

		if (ability != undefined) {
			// moved check for canAffordCost to its own method
			if (this.canAffordCost(ability, player)) {
				// moved attribute cost processing to its own method
				this.payCost(ability, player);

				if (taro.isServer || taro.isClient && taro.physics) {

					if (ability.scriptName && ability.scriptName != '') {
						if (taro.game.data.scripts[ability.scriptName]) {
							AbilityComponent.prototype.log(`ability cast: running script ${taro.game.data.scripts[ability.scriptName].name} ${ability.scriptName}`);
						}

						// not actually sending data within unitAttr or playerAttr. looks like this is just forcing update
						if (taro.isServer) {

							var playerAttr = { attributes: {} };
							var unitAttr = { attributes: {} };
							// calling stream for unit because there is delay in transferring attributes data
							if (Object.keys(unitAttr.attributes || []).length > 0) {
								self._entity.streamUpdateData(unitAttr);
							}

							if (Object.keys(playerAttr.attributes || []).length > 0) {
								player.streamUpdateData(playerAttr);
							}
						}

						taro.game.lastCastingUnitId = self._entity.id();
						// now both entity and global scripts (removed if/else)
						self._entity.script.runScript(ability.scriptName, { triggeredBy: { unitId: self._entity.id()} });
					}
				}
			} else {
				AbilityComponent.prototype.log('can\'t afford cost');
			}
		} else {
			AbilityComponent.prototype.log(`undefined ability ${handle}`);
		}
	},

	canAffordCost: function(ability, player) {
		let canAffordCost = true;

		if (ability.cost && ability.cost.unitAttributes) {
			// AbilityComponent.prototype.log("ability cost", ability.cost.cast)
			for (attrName in ability.cost.unitAttributes) {
				const cost = ability.cost.unitAttributes[attrName];

				if (cost && (this._entity._stats.attributes[attrName] == undefined || this._entity._stats.attributes[attrName].value < cost)) {
					canAffordCost = false;
					break;
				}
			}
		}
		if (ability.cost && ability.cost.playerAttributes && canAffordCost && player && player._stats) {
			// AbilityComponent.prototype.log("ability cost", ability.cost.cast)
			for (attrName in ability.cost.playerAttributes) {
				const cost = ability.cost.playerAttributes[attrName];
				// AbilityComponent.prototype.log("attribute value", attrName, this._entity._stats.attributes[attrName])
				if (cost && (player._stats.attributes[attrName] == undefined ||
					player._stats.attributes[attrName].value < cost)
				) {
					canAffordCost = false;
					break;
				}
			}
		}

		return canAffordCost;
	},

	payCost: function(ability, player) {
		// process cost
		if (ability.cost && ability.cost.unitAttributes) {
			for (attrName in ability.cost.unitAttributes) {
				if (this._entity._stats.attributes[attrName]) {
					var newValue = this._entity._stats.attributes[attrName].value - ability.cost.unitAttributes[attrName];
					this._entity.attribute.update(attrName, newValue);
				}
			}
		}

		if (ability.cost && ability.cost.playerAttributes && player && player._stats) {
			for (attrName in ability.cost.playerAttributes) {
				if (player._stats.attributes[attrName]) {
					var newValue = player._stats.attributes[attrName].value - ability.cost.playerAttributes[attrName];
					player.attribute.update(attrName, newValue);
				}
			}
		}
	},

	startCasting: function (abilityId) {
		if (
			this.activeAbilities[abilityId]
			|| this.abilityCooldowns[abilityId]
		) {
			return;
		}

		const player = this._entity.getOwner();
		const ability = this._entity._stats.controls.unitAbilities[abilityId];

		if (!ability) {
			// script error log here
			return;
		}

		if (!this.canAffordCost(ability, player)) {
			return;
		}

		this.payCost(ability, player);

		taro.game.lastCastingUnitId = this._entity.id();

		this._entity.script.runScript(
			ability.eventScripts.startCasting,
			{ triggeredBy: { unitId: this._entity.id()} }
		);

		this.activeAbilities[abilityId] = true;

		if (!(ability.cooldown === null || ability.cooldown === undefined || isNaN(ability.cooldown))) {
			this.abilityCooldowns[abilityId] = Date.now() + ability.cooldown;
			if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
				taro.client.emit('start-ability-cooldown', abilityId);
			}
		}

		if (!(ability.castDuration === null || ability.castDuration === undefined || isNaN(ability.castDuration))) {
			this.abilityDurations[abilityId] = Date.now() + ability.castDuration;
		}

		if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
			taro.client.emit('start-casting', abilityId);
		}
		
	},

	stopCasting: function (abilityId) {
		if (!this.activeAbilities[abilityId]) {
			return;
		}

		const ability = this._entity._stats.controls.unitAbilities[abilityId];

		if (!ability) {
			// script error log here
			return;
		}

		this.activeAbilities[abilityId] = false;

		this._entity.script.runScript(
			ability.eventScripts.stopCasting,
			{ triggeredBy: { unitId: this._entity.id()} }
		);

		if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
			taro.client.emit('stop-casting', abilityId);
		}
	},

	setAbilityName: function (abilityId, newName) {
		const player = this._entity.getOwner();
		const ability = this._entity._stats.controls.unitAbilities[abilityId];

		if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
			taro.client.emit('set-ability-name', abilityId, newName);
		}
	},

	setAbilityImage: function (abilityId, imgUrl) {
		const player = this._entity.getOwner();
		const ability = this._entity._stats.controls.unitAbilities[abilityId];

		if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
			taro.client.emit('set-ability-image', abilityId, imgUrl);
		}
	},

	_behaviour: function (ctx) {

		if (Object.keys(this.abilityDurations).length > 0) {
			for (let id in this.abilityDurations) {

				if (this.abilityDurations[id] <= Date.now()) {
					delete this.abilityDurations[id];
					this.stopCasting(id);
				}
			}
		}

		if (Object.keys(this.abilityCooldowns).length > 0) {
			for (let id in this.abilityCooldowns) {
				if (this.abilityCooldowns[id] <= Date.now()) {

					if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
						taro.client.emit('stop-ability-cooldown', id);
					}

					delete this.abilityCooldowns[id];
				}
			}
		}
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = AbilityComponent; }
