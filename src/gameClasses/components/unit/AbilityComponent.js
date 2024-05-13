var AbilityComponent = TaroEntity.extend({
	classId: 'AbilityComponent',
	componentId: 'ability',

	init: function (entity, options) {
		var self = this;
		self._entity = entity;

		this.activeAbilities = {};
		this.abilityDurations = {};
		this.abilityCooldowns = {};
		this._abilityQueue = [];
		this.angle = 0;
		this.input = { x: 0, y: 0 };
	},

	moveRelativeToAngle(angle) {
		this.angle = -Math.PI * 0.5 + angle;
		this.applyInput();
	},

	move(left, right, up, down) {
		this.input.x = (right ? 1 : 0) - (left ? 1 : 0);
		this.input.y = (up ? 1 : 0) - (down ? 1 : 0);
		this.applyInput();
	},

	moveUp: function () {
		this.input.y = 1;
		this.applyInput();
	},

	moveLeft: function () {
		this.input.x = -1;
		this.applyInput();
	},

	moveDown: function () {
		this.input.y = -1;
		this.applyInput();
	},

	moveRight: function () {
		this.input.x = 1;
		this.applyInput();
	},

	stopMovingY: function () {
		this.input.y = 0;
		this.applyInput();
	},

	stopMovingX: function () {
		this.input.x = 0;
		this.applyInput();
	},

	applyInput() {
		if (!this._entity.direction) return;

		const direction = this.getCurrentDirection();
		this._entity.direction.x = direction.x;
		this._entity.direction.y = direction.y;
	},

	getCurrentDirection() {
		const direction = { x: 0, y: 0 };
		const angle = this.angle;

		// No need to perform expensive cos/sin calculations
		if (angle == 0) {
			direction.x = this.input.x;
			direction.y = -this.input.y;
			return direction;
		}

		// Can be made faster with pre-computed cos/sin values for each degree if needed
		const deg90 = Math.PI * 0.5;
		if (this.input.x < 0) {
			direction.x += Math.cos(angle - deg90);
			direction.y += Math.sin(angle - deg90);
		}
		if (this.input.x > 0) {
			direction.x += Math.cos(angle + deg90);
			direction.y += Math.sin(angle + deg90);
		}
		if (this.input.y > 0) {
			direction.x += Math.cos(angle);
			direction.y += Math.sin(angle);
		}
		if (this.input.y < 0) {
			direction.x += Math.cos(angle + deg90 * 2);
			direction.y += Math.sin(angle + deg90 * 2);
		}

		return direction;
	},

	// this is used by AI. It should be deprecated though
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

	queueCast: function (abilityId, key) {
		if (taro.isServer && taro.workerComponent) {
			var socketId = this._entity.getOwner()?._stats.clientId;
			const isCommandValid = taro.workerComponent.validateCommand(socketId, null, 'queueCast');
			if (!isCommandValid) {
				return;
			}
		}
		this._abilityQueue.push({ abilityId: abilityId, key: key });
	},

	cast: function (handle, key) {
		var self = this;

		if (handle == undefined) return;

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
				return this.startCasting(ability.abilityId, key);

			case 'stopCasting':
				return this.stopCasting(ability.abilityId, key);
		}

		// new abilities should have returned by now. following is for old system (backwards comp.)
		var player = self._entity.getOwner();

		if (ability != undefined) {
			// moved check for canAffordCost to its own method
			if (this.canAffordCost(ability, player)) {
				// moved attribute cost processing to its own method
				this.payCost(ability, player);

				if (taro.isServer || (taro.isClient && taro.physics.simulation)) {
					if (ability.scriptName && ability.scriptName != '') {
						if (taro.game.data.scripts[ability.scriptName]) {
							AbilityComponent.prototype.log(
								`ability cast: running script ${taro.game.data.scripts[ability.scriptName].name} ${ability.scriptName}`
							);
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

						const isWorldEntity = self._entity._stats.isWorld;
						const triggeredFrom = isWorldEntity ? 'world' : 'map';

						// now both entity and global scripts (removed if/else)
						self._entity.script.runScript(ability.scriptName, {
							triggeredBy: { unitId: self._entity.id() },
							triggeredFrom,
						});
					}
				}
			} else {
				AbilityComponent.prototype.log("can't afford cost");
			}
		} else {
			AbilityComponent.prototype.log(`undefined ability ${handle}`);
		}
	},

	canAffordCost: function (ability, player) {
		let canAffordCost = true;

		if (ability.cost && ability.cost.unitAttributes) {
			// AbilityComponent.prototype.log("ability cost", ability.cost.cast)
			for (attrName in ability.cost.unitAttributes) {
				const cost = ability.cost.unitAttributes[attrName];

				if (
					cost &&
					(this._entity._stats.attributes[attrName] == undefined ||
						this._entity._stats.attributes[attrName].value < cost)
				) {
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
				if (
					cost &&
					(player._stats.attributes[attrName] == undefined || player._stats.attributes[attrName].value < cost)
				) {
					canAffordCost = false;
					break;
				}
			}
		}

		return canAffordCost;
	},

	payCost: function (ability, player) {
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

	startCasting: function (abilityId, key) {
		if (this.activeAbilities[abilityId] || this.abilityCooldowns[abilityId]) {
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

		const isWorldEntity = this._entity._stats.isWorld;
		const triggeredFrom = isWorldEntity ? 'world' : 'map';

		// run script associated with this ability
		this._entity.script.runScript(ability.eventScripts.startCasting, {
			triggeredBy: { unitId: this._entity.id() },
			triggeredFrom,
		});

		this.activeAbilities[abilityId] = true;

		if (!(ability.cooldown === null || ability.cooldown === undefined || isNaN(ability.cooldown))) {
			this.abilityCooldowns[abilityId] = { time: Date.now() + ability.cooldown, key: key };
			if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
				taro.client.emit('start-ability-cooldown', key);
			}
		}

		if (!(ability.castDuration === null || ability.castDuration === undefined || isNaN(ability.castDuration))) {
			this.abilityDurations[abilityId] = { time: Date.now() + ability.castDuration, key: key };
		}

		if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
			taro.client.emit('start-casting', key);
		}
	},

	stopCasting: function (abilityId, key) {
		if (!this.activeAbilities[abilityId]) {
			return;
		}

		const ability = this._entity._stats.controls.unitAbilities[abilityId];

		if (!ability) {
			// script error log here
			return;
		}

		this.activeAbilities[abilityId] = false;

		const isWorldEntity = this._entity._stats.isWorld;
		const triggeredFrom = isWorldEntity ? 'world' : 'map';

		// run script associated with this ability
		this._entity.script.runScript(ability.eventScripts.stopCasting, {
			triggeredBy: { unitId: this._entity.id() },
			triggeredFrom,
		});

		if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
			// find key if not provided
			/*if (!key) {
				Object.keys(this._entity._stats.controls.abilities).forEach((k) => {
					if (this._entity._stats.controls.abilities[k].keyDown === abilityId) {
						key = k;
					} else if (this._entity._stats.controls.abilities[k].keyUp === abilityId) {
						key = k;
					}
				});
			}*/
			taro.client.emit('stop-casting', key);
		}
	},

	// This function makes an array unique by removing duplicate elements
	makeArrayUnique: function (array) {
		var uniqueArray = [];
		array.forEach(function (item) {
			// Perform deep comparison to check if item already exists in uniqueArray
			if (!uniqueArray.some((existingItem) => JSON.stringify(existingItem) === JSON.stringify(item))) {
				uniqueArray.push(item);
			}
		});
		return uniqueArray;
	},

	_behaviour: function (ctx) {
		var self = this;

		self._abilityQueue = self.makeArrayUnique(self._abilityQueue); // remove duplicates ability casts

		while (self._abilityQueue.length > 0) {
			const ability = self._abilityQueue.shift();
			self.cast(ability.abilityId, ability.key);
		}

		if (Object.keys(this.abilityDurations).length > 0) {
			for (let id in this.abilityDurations) {
				if (this.abilityDurations[id].time <= Date.now()) {
					this.stopCasting(id, this.abilityDurations[id].key);
					delete this.abilityDurations[id];
				}
			}
		}

		if (Object.keys(this.abilityCooldowns).length > 0) {
			for (let id in this.abilityCooldowns) {
				if (this.abilityCooldowns[id].time <= Date.now()) {
					if (taro.isClient && this._entity._stats.clientId === taro.network.id()) {
						taro.client.emit('stop-ability-cooldown', this.abilityCooldowns[id].key);
					}

					delete this.abilityCooldowns[id];
				}
			}
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = AbilityComponent;
}
