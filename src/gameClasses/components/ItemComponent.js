var ItemComponent = TaroEntity.extend({
	classId: 'ItemComponent',
	componentId: 'item',

	init: function () {
		var self = this;

		self.now = new Date();

		self.calculateItemSpawnChanceTotal();
		this.time = 0; // game time in seconds. initially set it as outbreak time
	},

	calculateItemSpawnChanceTotal: function (options) {
		// itemSpawnChanceTotal is used to ensure that some item types are more rare to come by than the othr item types
		this.itemSpawnChanceTotal = 0;
		for (i in taro.game.data.itemTypes) {
			var item = taro.game.data.itemTypes[i];
			if ((options && options.isPurchasable && item.isPurchasable) || !options) {
				this.itemSpawnChanceTotal += parseFloat(item.spawnChance);
				// console.log("itemSPawn", this.itemSpawnChanceTotal, item.spawnChance)
			}
		}
	},

	getRandomItemData: function (options) {
		var self = this;
		// itemSpawnChanceTotal is used to ensure that some item types are more rare to come by than the othr item types
		self.calculateItemSpawnChanceTotal(options);
		var randomIndex = Math.random() * this.itemSpawnChanceTotal;
		var randomTotal = 0;
		// pick a random item type

		var itemTypes = rfdc()(taro.game.data.itemTypes);
		for (itemTypeId in itemTypes) {
			var item = itemTypes[itemTypeId];

			// if we're looking for only items that are purchasable, and this itemType is not purchasable, delete
			if ((options && options.isPurchasable && item.isPurchasable) || !options) {
				randomTotal += parseFloat(item.spawnChance);
			}

			if (randomTotal >= randomIndex) {
				// determine the item Type
				var itemStats = rfdc()(item);
				itemStats.itemTypeId = itemTypeId;
				break;
			}
		}

		if (itemStats) {
			return this.addRandomBuff(itemStats);
		}
	},

	addRandomBuff: function (itemStats, maxBuffCount) {
		var self = this;

		var buffCount = 0;
		if (!maxBuffCount) {
			maxBuffCount = 99;
		}

		if (taro.isServer) {
			// traverse through available buffTypes of this item
			var buffTypeName, buffType, maxBuffValue, chanceOfOccuring, randomBonusValue;
			var buffCount = 0;

			if (itemStats.buffTypes != undefined) {
				var availableBuffTypes = rfdc()(itemStats.buffTypes);

				// for (var i = 0; i < itemStats.buffTypes.length; i++)
				while (buffCount < maxBuffCount) {
					for (var i = 0; i < availableBuffTypes.length; i++) {
						buffTypeName = availableBuffTypes[i];
						buffType = taro.game.cloneAsset('buffTypes', buffTypeName);
						// console.log(buffTypeName, buffType)

						if (buffType.unit == 'percentage') {
							minBuffValue = buffType.minBonus;
							maxBuffValue = buffType.maxBonus;
							buffValue = Math.random() * (maxBuffValue - minBuffValue) + minBuffValue;
						} else if (buffType.unit == 'integer') {
							minBuffValue = buffType.minBonus;
							maxBuffValue = buffType.maxBonus;
							buffValue = Math.random() * maxBuffValue - (minBuffValue - 1) + minBuffValue;
						} else if (buffType.unit == 'boolean') {
							buffValue = true;
						}

						chanceOfOccuring = buffType.chance; // chance of this buff being applied to this item

						if (Math.random() < chanceOfOccuring) {
							availableBuffTypes.splice(i, 1); // so same buff doesn't get applied

							buffCount++;
							if (buffCount > maxBuffCount) return;

							if (itemStats[buffTypeName] == undefined) {
								itemStats[buffTypeName] = 0;
							}

							switch (buffTypeName) {
								case 'height':
									itemStats.body.holdingDistance = parseInt(
										itemStats.body.holdingDistance + itemStats.body.holdingDistance * buffValue
									);
									itemStats[buffTypeName] = parseInt(itemStats[buffTypeName] * (1 + buffValue));
									break;

								case 'ammoSize':
									itemStats.ammo = parseInt(itemStats.ammo * (1 + buffValue)); // fill ammo to the weapon's new max ammo capacity
								case 'ammoTotal':
								case 'reloadRate':
								case 'fireRate':
								case 'bulletForce':
									itemStats[buffTypeName] = parseInt(itemStats[buffTypeName] * (1 + buffValue));
									break;

								case 'stunChance':
								case 'slowChance':
									// 3X more chance for melee weapons
									if (!itemStats.isGun) {
										buffValue = buffValue * 3;
									}

								case 'bulletDistance':
								case 'recoilForce':
								case 'movementSpeed':
								case 'immunity':
								case 'maxStamina':
									// console.log(itemStats.handle, "buff", buffTypeName, itemStats[buffTypeName], buffValue, itemStats[buffTypeName] + buffValue)
									itemStats[buffTypeName] = parseFloat(itemStats[buffTypeName] + buffValue);
									break;

								case 'canPenetrate':
									// console.log(itemStats.handle, "buff", buffTypeName, itemStats[buffTypeName], buffValue, itemStats[buffTypeName] + buffValue)
									itemStats[buffTypeName] = true;
									break;
							}
						}
					}

					// this means that maxBuffCount was never set, and buffCount will be pretty random (max # of buff will be size of all available buffs)
					if (maxBuffCount == 99) return itemStats;
				}
			}

			return itemStats;

			// console.log(self._stats.class, "item spawned")
		}
		// traverse through buff types
		// there's 25% of adding this buff
		// determine variance of this buff
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ItemComponent;
}
