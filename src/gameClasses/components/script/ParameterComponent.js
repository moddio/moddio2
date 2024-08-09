var ParameterComponent = TaroEntity.extend({
	classId: 'ParameterComponent',
	componentId: 'param',

	init: function (scriptComponent, entity) {
		var self = this;

		self._script = scriptComponent;
		self._entity = entity;
		self.secondCount = 0;
		self.updateStatusSecond = 5;
		self.streamingWarningShown = false;
		self.prevServerTime = 0;
		self.prevClientTime = 0;
		self.RADIAN_COEFFICIENT = 0.01745329251;
		self.DEGREE_COEFFICIENT = 57.2957795131;
		self.populateFunctions();
		self.profiler = {};
	},

	roundOff: function (num, precision) {
		return Number(`${Math.round(`${num}e${precision}`)}e-${precision}`);
	},

	getRandomPositionInRegion: function (region) {
		if (region && region._stats && region._stats.default) {
			region = region._stats.default;
		}

		var randomX = Math.floor(Math.random() * (region.x + region.width - region.x) + region.x);
		var randomY = Math.floor(Math.random() * (region.y + region.height - region.y) + region.y);
		var position = { x: 0, y: 0 };

		if (!isNaN(randomX) || !isNaN(randomY)) {
			position.x = randomX;
			position.y = randomY;
		}

		return position;
	},

	isPositionInWall: function (position) {
		var wallLayer = null;

		for (var i = 0; i < taro.map.data.layers.length; i++) {
			var layer = taro.map.data.layers[i];
			if (layer.name === 'walls') {
				wallLayer = layer;
				break;
			}
		}

		if (!wallLayer || !position.x || isNaN(position.x) || !position.y || isNaN(position.y)) {
			return false;
		}

		var worldWidth = taro.map.data.width;
		var tileWidth = taro.scaleMapDetails.tileWidth || taro.game.data.map.tilewidth;
		var tileHeight = taro.scaleMapDetails.tileHeight || taro.game.data.map.tilewidth;

		var tile = {
			x: Math.floor(position.x / tileWidth),
			y: Math.floor(position.y / tileHeight),
		};

		var tileIndex = tile.x + tile.y * worldWidth;
		return !!(wallLayer && wallLayer.data[tileIndex]);
	},

	isPositionInEntity: function (position) {
		var entityCategory = ['unit'];
		var defaultArea = {
			height: 100,
			width: 100,
		};

		var entities = taro.physics.getBodiesInRegion({
			x: position.x,
			y: position.y,
			width: defaultArea.width,
			height: defaultArea.height,
		});

		var returnValue = _.some(entities, function (entity) {
			return entityCategory.indexOf(entity._category) > -1;
		});

		return returnValue;
	},

	calculate: function (items, vars) {
		var self = this;

		if (items == undefined) return;

		if ((items && items.constructor != Array) || typeof items == 'number') {
			var solution = this.getValue(items, vars);
			return parseFloat(solution);
		}

		var op = items[0];
		var left = this.getValue(items[1], vars);
		var right = this.getValue(items[2], vars);

		// const [op, left, right] = items

		var result = undefined;

		if (op == '+' || op.operator == '+') {
			result = this.calculate(left, vars) + this.calculate(right, vars);
		} else if (op == '-' || op.operator == '-') {
			result = this.calculate(left, vars) - this.calculate(right, vars);
		} else if (op == '*' || op.operator == '*') {
			result = this.calculate(left, vars) * this.calculate(right, vars);
		} else if (op == '/' || op.operator == '/') {
			result = this.calculate(left, vars) / this.calculate(right, vars);
		} else if (op == '%' || op.operator == '%') {
			result = this.calculate(left, vars) % this.calculate(right, vars);
		}

		if (isNaN(result)) {
			//Wooden Wall2::UnitDeath::block#11::CalcError,  owner(thisEntity).$BuildCap  is undefined
			taro.script.errorLog(
				`Calculate error: ${left} ${op.operator} ${right} => NaN. ${left === undefined ? `${JSON.stringify(items[1])} Returning undefined` : ''} ${right === undefined ? `, ${JSON.stringify(items[2])} Returning undefined` : ''}`,
				`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
				true
			);
			return undefined;
		}

		return result;
	},

	getVariable: function (variableName) {
		var variable = taro.game.data.variables[variableName];
		if (variable) {
			// if variable's current value isn't set, set value as default
			if (variable.value == undefined && variable.default != undefined) {
				if (variable.dataType == 'player' || variable.dataType == 'unit') {
					variable.value = taro.game[variable.default];
				} else if (variable.dataType == 'region') {
					var region = taro.regionManager.getRegionById(variableName);
					variable.value = region || variable.default;
					variable.value.key = variableName;
					return variable.value;
				} else {
					variable.value = variable.default;
				}

				// after retrieving variable data, nullify the default value,
				// otherwise, if .value is set to null intentionally, default value will be returned instead.
				variable.default = null;
			}

			return variable.value;
		}
		return null;
	},

	setGlobalVariable: function (name, newValue) {
		if (taro.isServer) {
			if (taro.game.data.variables.hasOwnProperty(name)) {
				taro.game.data.variables[name].value = newValue;
				// if variable has default field then it will be returned when variable's value is undefined
				if (
					newValue === undefined &&
					action.value &&
					action.value.function === 'undefinedValue' &&
					taro.game.data.variables[name].hasOwnProperty('default')
				) {
					taro.game.data.variables[name].default = undefined;
				}
			}

			params.newValue = newValue;
			this.updateDevConsole({ type: 'setVariable', params: params });
		} else if (taro.isClient) {
			// empty
		}
	},

	getAllVariables: function (selectedTypes) {
		var returnObj = {};

		for (var variableName in taro.game.data.variables) {
			var variable = taro.game.data.variables[variableName];

			if (!selectedTypes || selectedTypes.includes(variable.dataType)) {
				// if variable's current value isn't set, set value as default
				if (variable.value == undefined && variable.default != undefined) {
					if (variable.dataType == 'player' || variable.dataType == 'unit') {
						variable.value = taro.game[variable.default];
					} else if (variable.dataType == 'region') {
						var region = taro.regionManager.getRegionById(variableName);
						variable.value = region || variable.default;
						variable.value.key = variableName;
						return variable.value;
					} else {
						variable.value = variable.default;
					}

					// after retrieving variable data, nullify the default value,
					// otherwise, if .value is set to null intentionally, default value will be returned instead.
					variable.default = null;
				}

				returnObj[variableName] = variable.value;
			}
		}

		return returnObj;
	},

	getValue: function (text, vars) {
		var self = this;

		var returnValue = undefined;

		// just return raw numbers
		if (typeof text === 'number') {
			returnValue = parseFloat(text);
		}

		// if boolean, string, undefined, etc... return.
		if (typeof text !== 'object') {
			returnValue = text;

			// if point! (x, y)
		} else if (text && text.function == undefined && text.x != undefined && text.y != undefined) {
			returnValue = {
				x: self.getValue(text.x, vars),
				y: self.getValue(text.y, vars),
			};
		}

		if (text && typeof text === 'object') {
			//if profiler is enabled, start profiling
			if (taro.profiler.isEnabled) {
				if (this.profiler[text.function] == undefined) {
					this.profiler[text.function] = {
						counter: 0,
						avgTime: 0,
						totalTime: 0,
					};
				}
				var profileStart = Date.now();
			}

			if (text.function == undefined) {
				return text;
			}

			// gradual migration from using switch (below) to functions to accomplish O(1) function lookup
			if (typeof this._functions[text.function] == 'function') {
				returnValue = this._functions[text.function](text, vars);
			} else {
				var entity = self.getValue(text.entity, vars);
				switch (text.function) {
					/* boolean */

					case 'playerIsCreator':
						var player = self.getValue(text.player, vars);
						if (player) {
							returnValue = player._stats.userId == taro.game.data.defaultData.owner;
						}

						break;

					case 'isPlayerClient':
						if (taro.isClient) {
							var player = self.getValue(text.player, vars);
							if (player) {
								returnValue = player._stats?.clientId == taro.network.id();
							}
						}
						break;

					case 'playersAreHostile':
						var playerA = self.getValue(text.playerA, vars);
						var playerB = self.getValue(text.playerB, vars);

						if (playerA && playerB) {
							returnValue = playerA.isHostileTo(playerB);
						}

						break;

					case 'playersAreFriendly':
						var playerA = self.getValue(text.playerA, vars);
						var playerB = self.getValue(text.playerB, vars);

						if (playerA && playerB) {
							returnValue = playerA.isFriendlyTo(playerB);
						}

						break;

					case 'playersAreNeutral':
						var playerA = self.getValue(text.playerA, vars);
						var playerB = self.getValue(text.playerB, vars);

						if (playerA && playerB) {
							returnValue = playerA.isNeutralTo(playerB);
						}

						break;

					case 'unitIsInRegion':
						var region = self.getValue(text.region, vars);
						var unit = self.getValue(text.unit, vars);

						returnValue = false;

						if (region && unit) {
							// if region is an instance of TaroRegion component
							if (region._stats) {
								var entitiesInRegion =
									taro.regionManager.entitiesInRegion && taro.regionManager.entitiesInRegion[region._stats.id];

								if (entitiesInRegion) {
									returnValue = !!entitiesInRegion[unit.id()];
								}
							} else {
								// region is either dynamic or a variable with {x, y, height, width} properties
								returnValue = taro.physics.getBodiesInRegion(region).filter(function (entity) {
									return entity.id() === unit.id();
								}).length;

								returnValue = !!returnValue;
							}
						}

						break;

					case 'unitIsCarryingItemType':
						var unit = self.getValue(text.unit, vars);
						var itemType = self.getValue(text.itemType, vars);
						if (unit && unit._category == 'unit' && unit.inventory && itemType) {
							return unit.inventory.hasItem(itemType);
						}

						break;

					case 'isPositionInWall':
						var positionX = self.getValue(text.position.x, vars);
						var positionY = self.getValue(text.position.y, vars);

						returnValue = self.isPositionInWall({
							x: positionX,
							y: positionY,
						});

						break;

					case 'itemIsInRegion':
						var region = self.getValue(text.region, vars);
						var item = self.getValue(text.item, vars);

						returnValue = false;

						if (region && item) {
							// if region is an instance of TaroRegion component
							if (region._stats) {
								var entitiesInRegion =
									taro.regionManager.entitiesInRegion && taro.regionManager.entitiesInRegion[region._stats.id];

								if (entitiesInRegion) {
									returnValue = !!entitiesInRegion[item.id()];
								}
							} else {
								// region is either dynamic or a variable with {x, y, height, width} properties
								returnValue = taro.physics.getBodiesInRegion(region).filter(function (entity) {
									return entity.id() === item.id();
								}).length;

								returnValue = !!returnValue;
							}
						}

						break;

					case 'itemFiresProjectiles':
						var item = self.getValue(text.item, vars);
						returnValue = item && item._stats.isGun && item._stats.bulletType !== 'raycast';
						break;

					case 'isComputerPlayer':
						var player = self.getValue(text.player, vars);
						returnValue = player && player._stats.controlledBy == 'computer';

						break;

					case 'isBotPlayer':
						// bot players meant to be indistinguishable from 'human' players. hence we're not tempering with controlledBy variable
						var player = self.getValue(text.player, vars);
						returnValue = player && player._stats.isBot;

						break;

					case 'isPlayerLoggedIn':
						var player = self.getValue(text.player, vars);
						returnValue = !!(player && player._stats.userId);

						break;

					case 'playerHasAdblockEnabled':
						var player = self.getValue(text.player, vars);
						returnValue = !!(player && player._stats.isAdBlockEnabled);
						break;

					case 'roleExistsForPlayer':
						var name = self.getValue(text.name, vars);
						var player = self.getValue(text.player, vars);

						var role = (taro.game.data.roles || []).find((role) => role.name === name);
						var roleId = role && role._id;

						returnValue = roleId && player && (player._stats.roleIds || []).includes(roleId);
						break;

					case 'areEntitiesTouching':
						var sourceEntity = self.getValue(text.sourceEntity, vars);
						var targetEntity = self.getValue(text.targetEntity, vars);

						var sourceContactEntities = Object.keys(sourceEntity.bodiesInContact || {});

						returnValue = sourceContactEntities.includes(targetEntity.id());

						break;

					case 'getPlayerAttribute':
						if (entity && entity._category == 'player') {
							var attributeTypeId = self.getValue(text.attribute, vars);
							if (entity._stats.attributes && entity._stats.attributes[attributeTypeId]) {
								returnValue = entity._stats.attributes[attributeTypeId].value;
							}
						}

						break;

					case 'playerAttributeMax':
						var attributeTypeId = self.getValue(text.attribute, vars);
						if (entity && attributeTypeId) {
							var attributeType = entity._stats.attributes[attributeTypeId];
							if (attributeType) {
								returnValue = attributeType.max;
							}
						}

						break;

					case 'playerAttributeMin':
						var attributeTypeId = self.getValue(text.attribute, vars);
						if (entity && attributeTypeId) {
							var attributeType = entity._stats.attributes[attributeTypeId];
							if (attributeType) {
								returnValue = attributeType.min;
							}
						}

						break;

					case 'playerAttributeRegen':
						var attributeTypeId = self.getValue(text.attribute, vars);
						if (entity && attributeTypeId) {
							var attributeType = entity._stats.attributes[attributeTypeId];
							if (attributeType) {
								returnValue = attributeType.regenerateSpeed;
							}
						}

						break;

					case 'getQuestObject':
						var player = self.getValue(text.player, vars);
						player?.quest.init(player);
						var questId = self.getValue(text.questId, vars);
						var quests = player.quests;
						var gameId = taro.game.data.defaultData._id;
						if (quests && quests.active[gameId][questId]) {
							returnValue = quests.active[gameId][questId];
						}

						break;

					case 'getAllActiveQuestObjectsInThisMap':
						var player = self.getValue(text.player, vars);
						player?.quest.init(player);
						var quests = player.quests;
						var questId = self.getValue(text.questId, vars);
						var gameId = taro.game.data.defaultData._id;
						if (quests && quests.active) {
							returnValue = quests.active[gameId];
						}

						break;

					case 'getAllActiveQuestObjects':
						var player = self.getValue(text.player, vars);
						player?.quest.init(player);
						var quests = player.quests;
						if (quests && quests.active) {
							returnValue = quests.active;
						}

						break;

					case 'getQuestProgress':
						var player = self.getValue(text.player, vars);
						player?.quest.init(player);
						var questId = self.getValue(text.questId, vars);
						var quests = player.quests;
						var gameId = taro.game.data.defaultData._id;
						if (quests && quests.active[gameId][questId]) {
							returnValue = quests.active[gameId][questId].progress;
						}

						break;

					case 'isQuestProgressCompleted':
						var player = self.getValue(text.player, vars);
						player?.quest.init(player);
						var questId = self.getValue(text.questId, vars);
						var quests = player.quests;
						var gameId = taro.game.data.defaultData._id;
						if (quests && quests.active && quests.active[gameId][questId]) {
							returnValue = quests.active[gameId][questId].progress === quests.active[gameId][questId].goal;
						} else {
							returnValue = false;
						}

						break;

					case 'getPlayerName':
						if (entity && entity._category == 'player') {
							returnValue = entity._stats.name;
						}

						break;

					case 'playerCustomInput':
						var player = self.getValue(text.player, vars);
						if (player && player._category == 'player') {
							returnValue = player.lastCustomInput;
						}

						break;

					case 'lastClickedUiElementId':
						var player = self.getValue(text.player, vars);
						if (player && player._category == 'player') {
							returnValue = player.lastHtmlUiClickData.id;
						}

						break;

					case 'lastPlayerMessage':
						var player = self.getValue(text.player, vars);
						if (player && player._category == 'player') {
							returnValue = player.lastMessageSent;
						}

						break;

					case 'realtimeCSSOfPlayer':
						var player = self.getValue(text.player, vars);
						if (player && player._category == 'player') {
							returnValue = player.realtimeCSS;
						}
						break;

					case 'entityExists':
						returnValue = !!(entity && entity._id && taro.$(entity._id));

						break;

					case 'isQuestActive':
						var player = self.getValue(text.player, vars);
						player?.quest.init(player);
						var questId = self.getValue(text.questId, vars);
						var gameId = taro.game.data.defaultData._id;
						var quests = player?.quests;
						returnValue = quests?.active[gameId][questId] !== undefined;

						break;

					case 'isQuestCompleted':
						var player = self.getValue(text.player, vars);
						player?.quest.init(player);
						var questId = self.getValue(text.questId, vars);
						var gameId = taro.game.data.defaultData._id;
						var quests = player.quests;
						returnValue = quests.completed[gameId].includes(questId);

						break;

					case 'objectContainsElement':
						var object = self.getValue(text.object, vars);
						var key = self.getValue(text.key, vars);
						returnValue = object && object[key] !== undefined;

						break;

					case 'thisEntity':
						returnValue = self._entity;

						break;

					case 'getPlayerFromId':
						var id = self.getValue(text.string, vars);
						if (id) {
							returnValue = taro.$(id);
						}

						break;

					case 'getEntityFromId':
						var id = self.getValue(text.string, vars);
						if (id) {
							returnValue = taro.$(id);
						}

						break;

					case 'getAttributeTypeOfAttribute':
						if (entity) {
							returnValue = entity.type;
						}

						break;

					case 'getPlayerSelectedUnit':
						var player = self.getValue(text.player, vars);
						var unit = taro.$(player?._stats?.selectedUnitId);
						if (unit) {
							returnValue = unit;
						}

						break;

					case 'entityAttributeMax':
						var attributeTypeId = self.getValue(text.attribute, vars);
						if (
							entity &&
							entity._stats.attributes &&
							self._entity.script.action.entityCategories.indexOf(entity._category) > -1 &&
							attributeTypeId
						) {
							var attributeType = entity._stats.attributes[attributeTypeId];
							if (attributeType) {
								returnValue = attributeType.max;
							}
						}

						break;

					case 'entityAttributeMin':
						var attributeTypeId = self.getValue(text.attribute, vars);
						if (
							entity &&
							entity._stats.attributes &&
							self._entity.script.action.entityCategories.indexOf(entity._category) > -1 &&
							attributeTypeId
						) {
							var attributeType = entity._stats.attributes[attributeTypeId];
							if (attributeType) {
								returnValue = attributeType.min;
							}
						}

						break;

					case 'entityAttributeRegen':
						var attributeTypeId = self.getValue(text.attribute, vars);
						if (
							entity &&
							entity._stats.attributes &&
							self._entity.script.action.entityCategories.indexOf(entity._category) > -1 &&
							attributeTypeId
						) {
							var attributeType = entity._stats.attributes[attributeTypeId];
							if (attributeType) {
								returnValue = attributeType.regenerateSpeed;
							}
						}

						break;

					case 'getDefaultAttributeValueOfUnitType':
						var attributeTypeId = self.getValue(text.attribute, vars);
						var unitTypeId = self.getValue(text.unitType, vars);
						if (unitTypeId && attributeTypeId) {
							var unitType = taro.game.cloneAsset('unitTypes', unitTypeId);
							if (unitType && unitType.attributes && unitType.attributes[attributeTypeId]) {
								returnValue = unitType.attributes[attributeTypeId].value;
							}
						}

						break;

					case 'getItemQuantity':
						var item = self.getValue(text.item, vars);
						if (item && item._category == 'item') {
							// returnValue = item._stats.quantity || 1; // this was causing the bug where item with infinite (null) quantity was only being used once. we shouldn't be overwriting null value with 1 - Jaeyun sept 8, 2018
							returnValue = item._stats.quantity;
						}

						break;

					case 'getItemMaxQuantity':
						var item = self.getValue(text.item, vars);
						if (item && item._category == 'item') {
							returnValue = item._stats.maxQuantity;
						}

						break;

					case 'getQuantityOfItemTypeInItemTypeGroup':
						if (text.itemTypeGroup && text.itemType) {
							var variableObj = self.getVariable(text.itemTypeGroup.variableName);
							var itemType = self.getValue(text.itemType, vars);
							if (variableObj && variableObj[itemType]) {
								returnValue = variableObj[itemType].quantity;
							}
						}

						break;

					case 'getQuantityOfUnitTypeInUnitTypeGroup':
						if (text.unitTypeGroup && text.unitType) {
							var variableObj = self.getVariable(text.unitTypeGroup.variableName);
							var unitType = self.getValue(text.unitType, vars);

							if (variableObj && variableObj[unitType]) {
								returnValue = variableObj[unitType].quantity;
							}
						}

						break;

					case 'dynamicRegion':
						var x = self.getValue(text.x, vars);
						var y = self.getValue(text.y, vars);
						var width = self.getValue(text.width, vars);
						var height = self.getValue(text.height, vars);

						returnValue = {
							x: x,
							y: y,
							width: width,
							height: height,
						};

						break;

					case 'getProjectileAttribute':
						var attributeTypeId = self.getValue(text.attribute, vars);
						var projectile = entity;
						if (projectile && projectile._category == 'projectile' && attributeTypeId) {
							var attributeType = projectile._stats.attributes[attributeTypeId];
							if (attributeType) {
								var value = parseFloat(attributeType.value);
								returnValue = self.getValue(value, vars);
							} else {
								// taro.script.errorLog("attribute "+ attributeTypeId +" doesn't exist in unit "+((unit._stats)?unit._stats.name:''))
							}
						}

						break;

					case 'unitsFacingAngle': // to be deprecated soon
						var unit = self.getValue(text.unit, vars);
					case 'entityFacingAngle':
						// if unit is defined, use unit's facing angle
						if (unit) {
							var entity = unit;
						} else {
							var entity = self.getValue(text.entity, vars);
						}

						if (entity) {
							returnValue = entity._rotate && entity._rotate.z;
							returnValue = returnValue != undefined ? self.roundOff(returnValue, 3) : undefined;
						}

						break;

					case 'isUnitMoving':
						var unit = self.getValue(text.unit, vars);

						returnValue = unit.isMoving;

						break;

					case 'getUnitBody':
						var unit = self.getValue(text.unit, vars);
						if (unit && unit._category == 'unit') {
							returnValue = unit.body;
						}

						break;

					case 'toFixed':
						var num = self.getValue(text.value, vars);
						var precision = self.getValue(text.precision, vars);

						// toFixed() returns a string, so we have to parseFloat again
						returnValue = parseFloat(parseFloat(num).toFixed(precision));

						// nishant's code
						// num = typeof num === 'number' ? num : undefined;
						// precision = typeof precision === 'number' && precision > 0 ? precision : undefined;

						// returnValue = num && precision ? self.roundOff(num, precision) : undefined;

						break;

					case 'toRadians':
						var num = self.getValue(text.number, vars);
						if (!isNaN(num)) {
							returnValue = num * self.RADIAN_COEFFICIENT;
						}

						break;

					case 'toDegrees':
						var num = self.getValue(text.number, vars);
						if (!isNaN(num)) {
							returnValue = num * self.DEGREE_COEFFICIENT;
						}

						break;

					case 'absoluteValueOfNumber':
						var num = self.getValue(text.number, vars);
						returnValue = Math.abs(num);

						break;

					case 'arctan':
						var angle = self.getValue(text.number, vars);

						if (angle !== undefined) {
							returnValue = Math.atan(angle);
						}

						break;

					case 'sin':
						var angle = self.getValue(text.angle, vars);

						if (angle !== undefined) {
							returnValue = Math.sin(angle);
						}

						break;

					case 'cos':
						var angle = self.getValue(text.angle, vars);

						if (angle !== undefined) {
							returnValue = Math.cos(angle);
						}

						break;

					case 'tan':
						var angle = self.getValue(text.angle, vars);

						if (angle !== undefined) {
							returnValue = Math.tan(angle);
						}

						break;

					case 'stringToNumber':
						var value = self.getValue(text.value, vars);
						var parsedValue = Number(value);

						if (!isNaN(parsedValue)) {
							returnValue = parsedValue;
						}

						break;

					case 'numberToString':
						var value = self.getValue(text.value, vars);
						returnValue = String(value);

						break;

					case 'convertNumberToLargeNotation':
						var value = self.getValue(text.value, vars);
						const suffixes = [
							'',
							'K',
							'M',
							'B',
							'T',
							'Qa',
							'Qi',
							'Sx',
							'Sp',
							'Oc',
							'No',
							'De',
							'Un',
							'Do',
							'Tr',
							'Qad',
							'Qid',
							'Sxd',
							'Spd',
							'Od',
							'Nd',
							'Vi',
						];

						// Convert the value to a number and take its absolute value
						let absValue = Math.abs(Number(value));
						// Initialize the returnValue with the original value
						returnValue = value;

						// Check if the absolute value is greater than or equal to 1000
						if (absValue >= 1000) {
							// Calculate the index for suffix selection
							const index = Math.max(0, Math.floor(Math.log10(absValue) / 3));

							// Ensure the index is within the range of suffixes
							if (index <= suffixes.length - 1) {
								// Select the appropriate suffix based on the index
								const suffix = suffixes[index];
								// Calculate the adjusted value and concatenate it with the suffix
								returnValue = `${(absValue / Math.pow(10, 3 * index)).toFixed(2)}${suffix}`;
							} else {
								// Number is too large, return in scientific notation
								returnValue = absValue.toExponential(2);
							}
						}

						break;

					case 'getEntityVelocityX':
						if (entity && entity.body) {
							const velocity = entity.getLinearVelocity();
							returnValue = parseFloat(velocity.x).toFixed(2) || 0;
						}

						break;

					case 'getEntityVelocityY':
						if (entity && entity.body) {
							const velocity = entity.getLinearVelocity();
							returnValue = parseFloat(velocity.y).toFixed(2) || 0;
						}

						break;

					case 'getLastPurchasedUnit':
						var id = taro.game.lastPurchasedUnitId;
						unit = taro.$(id);

						if (unit && unit._category == 'unit') {
							return unit;
						}

						break;

					case 'getLastTouchingUnit':
						var id = taro.game.lastTouchingUnitId;
						unit = taro.$(id);

						if (unit && unit._category == 'unit') {
							return unit;
						}

						break;

					case 'getLastAttackingUnit':
						var id = taro.game.lastAttackingUnitId;
						unit = taro.$(id);

						if (unit && unit._category == 'unit') {
							return unit;
						}

						break;

					case 'getLastAttackedUnit':
						var id = taro.game.lastAttackedUnitId;
						unit = taro.$(id);

						if (unit && unit._category == 'unit') {
							return unit;
						}

						break;

					case 'getLastTouchedUnit':
						var id = taro.game.lastTouchedUnitId;
						unit = taro.$(id);

						if (unit && unit._category == 'unit') {
							returnValue = unit;
						}

						break;

					case 'targetUnit':
						var unit = self.getValue(text.unit, vars);

						if (unit && unit.ai) {
							returnValue = unit.ai.getTargetUnit();
						}

						break;

					case 'getLastTouchedItem':
						var id = taro.game.lastTouchedItemId;
						returnValue = taro.$(id);

						break;

					case 'getLastAttackingItem':
						var id = taro.game.lastAttackingItemId;
						item = taro.$(id);

						if (item && item._category == 'item') {
							returnValue = item;
						}

						break;

					case 'lastUsedItem':
					case 'getLastUsedItem': // will be deprecated soon
						var id = taro.game.lastUsedItemId;
						item = taro.$(id);

						if (item && item._category == 'item') {
							returnValue = item;
						}

						break;

					case 'getItemInInventorySlot':
					case 'getItemAtSlot':
						var unit = self.getValue(text.unit, vars);
						var slotIndex = self.getValue(text.slot, vars);

						if (unit && unit._category == 'unit') {
							var item = unit.inventory.getItemBySlotNumber(slotIndex);

							if (item) {
								returnValue = item;
							}
						}

						break;

					case 'selectedInventorySlot':
						var unit = self.getValue(text.unit, vars);

						if (unit && unit._category == 'unit') {
							returnValue = unit._stats.currentItemIndex + 1;
						}

						break;

					case 'getItemBody':
						var item = self.getValue(text.item, vars);

						if (item && item._category == 'item') {
							returnValue = item.body;
						}

						break;

					case 'lastCreatedItem':
						var id = taro.game.lastCreatedItemId;
						returnValue = taro.$(id);

						break;

					case 'ownerUnitOfSensor':
						var sensor = self.getValue(text.sensor, vars);

						if (sensor && sensor._category == 'sensor') {
							returnValue = taro.$(sensor.ownerUnitId);
						}

						break;

					case 'getLastCreatedProjectile':
						var id = taro.game.lastCreatedProjectileId;
						returnValue = taro.$(id);

						break;

					case 'getProjectileBody':
						var projectile = self.getValue(text.projectile, vars);

						if (projectile && projectile._category == 'projectile') {
							returnValue = projectile.body;
						}

						break;

					case 'getLastPlayerSelectingDialogueOption':
						var id = taro.game.lastPlayerSelectingDialogueOption;
						returnValue = taro.$(id);

						break;

					case 'getLastTriggeringQuestId':
						var id = taro.game.lastTriggeringQuestId;
						returnValue = id;

						break;

					case 'getLastCastingUnit':
						var id = taro.game.lastCastingUnitId;
						var unit = taro.$(id);

						if (unit && unit._category == 'unit') {
							returnValue = unit;
						}

						break;

					case 'getLastCreatedItem':
						var id = taro.game.lastCreatedItemId;
						returnValue = taro.$(id);

						break;

					case 'getSensorOfUnit':
						var unit = self.getValue(text.unit, vars);

						if (unit && unit._category == 'unit') {
							returnValue = unit.sensor;
						}

						break;

					case 'getLastChatMessageSentByPlayer':
						returnValue = taro.game.lastChatMessageSentByPlayer;

						break;

					case 'allItemsDroppedOnGround':
						returnValue = taro.$$('item').filter(function (item) {
							return !item.getOwnerUnit();
						});

						break;

					case 'isAIEnabled':
						var unit = self.getValue(text.unit, vars);

						if (unit && unit._category == 'unit') {
							returnValue = unit._stats.aiEnabled;
						}

						break;

					// case 'getUnitInFrontOfUnit':
					// 	if (entity && entity._category == 'unit') {
					// 		var entities = taro.physics.getBodiesInRegion({
					// 			x: entity._translate.x - 7 + (35 * Math.cos(entity._rotate.z + Math.radians(-90))),
					// 			y: entity._translate.y - 7 + (35 * Math.sin(entity._rotate.z + Math.radians(-90))),
					// 			width: 14,
					// 			height: 14
					// 		},
					// 			entity.id()
					// 		)
					// 		for (i = 0; i < entities.length; i++) {
					// 			var entity = entities[i]
					// 			if (entity && entity._category == 'unit') {
					// 				return entity;
					// 			}
					// 		}
					// 	}

					// 	break;

					case 'squareRoot':
						var numberValue = self.getValue(text.number, vars);

						if (!isNaN(numberValue)) {
							returnValue = Math.sqrt(numberValue);
						}

						break;

					case 'getPlayerCount':
						returnValue = taro.getPlayerCount();

						break;

					case 'getPlayerUsername':
						var player = self.getValue(text.player, vars);
						var username = player._stats.username;

						if (player) {
							returnValue = username;
						}

						break;

					case 'getNumberOfItemsPresent':
						returnValue = taro.$$('item').length;

						break;

					case 'getUnitCount':
						returnValue = taro.$$('unit').length;

						break;

					case 'getNumberOfPlayersOfPlayerType':
						var playerType = self.getValue(text.playerType, vars);
						var players = taro.$$('player').filter((player) => {
							return player._stats.playerTypeId === playerType;
						});

						returnValue = players.length;
						break;

					case 'getMapHeight':
						var worldHeight = taro.map.data.height;
						var tileHeight = taro.scaleMapDetails.tileHeight;
						returnValue = tileHeight * worldHeight;

						break;

					case 'getMapWidth':
						var worldWidth = taro.map.data.width;
						var tileWidth = taro.scaleMapDetails.tileWidth;
						returnValue = tileWidth * worldWidth;

						break;

					case 'getMapJson':
						returnValue = JSON.stringify(taro.map.data);

						break;

					case 'getMapTileId':
						var map = taro.map.data;
						var tileX = self.getValue(text.x, vars);
						var tileY = self.getValue(text.y, vars);
						var layer = self.getValue(text.layer, vars);
						if (map && Number.isInteger(layer) && Number.isInteger(tileX) && Number.isInteger(tileY)) {
							if (layer > taro.game.data.map.layers.length || layer < 0) {
								taro.script.errorLog(
									`Invalid Layer`,
									`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionBlockIdx}`,
									true
								);
								break;
							} else if (taro.game.data.map.layers[layer].type !== 'tilelayer') {
								taro.script.errorLog(
									`Invalid Layer`,
									`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionBlockIdx}`,
									true
								);
								break;
							} else if (tileX < 0 || tileX >= taro.game.data.map.width) {
								taro.script.errorLog(
									`invalid x position`,
									`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
									true
								);
								break;
							} else if (tileY < 0 || tileY >= taro.game.data.map.height) {
								taro.script.errorLog(
									`invalid y position`,
									`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
									true
								);
								break;
							} else {
								returnValue = map.layers[layer].data[tileX + tileY * map.width];
							}
						}
						break;

					case 'entityOpacity':
						if (entity && self._entity.script.action.entityCategories.indexOf(entity._category) > -1) {
							returnValue = entity.opacity();
						}

						break;

					case 'entityWidth':
						if (entity && self._entity.script.action.entityCategories.indexOf(entity._category) > -1) {
							// returnValue = entity._aabb.width;
							returnValue = entity.width();
							// console.log("entityWidth", returnValue);
						}

						break;

					case 'entityHeight':
						if (entity && self._entity.script.action.entityCategories.indexOf(entity._category) > -1) {
							// returnValue = entity._aabb.height;
							returnValue = entity.height();
						}

						break;

					case 'unitTypeWidth':
						var unitTypeId = self.getValue(text.unitType, vars);
						var unitType = taro.game.getAsset('unitTypes', unitTypeId);
						if (unitType) {
							returnValue = unitType.bodies?.default?.width;
						}

						break;

					case 'unitTypeHeight':
						var unitTypeId = self.getValue(text.unitType, vars);
						var unitType = taro.game.getAsset('unitTypes', unitTypeId);
						if (unitType) {
							returnValue = unitType.bodies?.default?.height;
						}

						break;

					case 'unitSensorRadius':
						var unit = self.getValue(text.unit, vars);

						if (unit && unit.sensor) {
							returnValue = unit.sensor.getRadius();
						} else if (unit && unit._stats && unit._stats.ai) {
							returnValue = unit._stats.ai.sensorRadius;
						}

						break;

					case 'defaultQuantityOfItemType':
						var itemTypeId = self.getValue(text.itemType, vars);
						var itemType = taro.game.cloneAsset('itemTypes', itemTypeId);

						if (itemType) {
							returnValue = itemType.quantity;
						}

						break;

					case 'maxValueOfItemType':
						var itemTypeId = self.getValue(text.itemType, vars);
						var itemType = taro.game.cloneAsset('itemTypes', itemTypeId);

						if (itemType) {
							returnValue = itemType.maxQuantity;
						} else {
							returnValue = 0;
						}

						break;

					case 'allItemTypesInGame':
						var itemTypesObject = taro.game.data.itemTypes;

						if (itemTypesObject) {
							returnValue = itemTypesObject;
						}

						break;

					case 'allUnitTypesInGame':
						var unitTypesObject = taro.game.data.unitTypes;

						if (unitTypesObject) {
							returnValue = unitTypesObject;
						}

						break;

					case 'lastPlayedTimeOfPlayer':
						var player = self.getValue(text.player, vars);
						returnValue = player && player._stats.lastPlayed;

						break;

					case 'currentTimeStamp':
						returnValue = Date.now();

						break;

					case 'getRandomPositionInRegion':
						var region = self.getValue(text.region, vars);

						if (region) {
							returnValue = self.getRandomPositionInRegion(region);
						}

						break;

					case 'nameOfUnit':
						var unit = self.getValue(text.unit, vars);

						if (unit) {
							returnValue = unit._stats && unit._stats.name;
						}

						break;

					case 'nameOfRegion':
						var region = self.getValue(text.region, vars);

						if (region) {
							returnValue = region._stats ? region._stats.id : region.key;
						}

						break;

					case 'centerOfRegion':
						var region = self.getValue(text.region, vars);

						if (region) {
							returnValue = {
								x: region._stats.default.x + region._stats.default.width / 2,
								y: region._stats.default.y + region._stats.default.height / 2,
							};
						}

						break;

					case 'getRandomPlayablePositionInRegion':
						var region = self.getValue(text.region, vars);
						var attempts = 20;

						if (region) {
							for (var i = 0; i < attempts; i++) {
								var position = self.getRandomPositionInRegion(region);
								var isPlayablePosition = !self.isPositionInEntity(position) && !self.isPositionInWall(position);

								if (isPlayablePosition) {
									returnValue = {
										x: position.x,
										y: position.y,
									};

									break;
								}
							}

							if (!returnValue) {
								taro.script.errorLog(
									`could not find valid position even after${attempts} attempts`,
									`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
									true
								);
							}
						}

						break;

					case 'mathFloor':
						var value = self.getValue(text.value, vars);

						if (!isNaN(value)) {
							returnValue = Math.floor(value);
						}

						break;

					case 'mathCeiling':
						var value = self.getValue(text.value, vars);
						if (!isNaN(value)) {
							returnValue = Math.ceil(value);
						}

						break;

					case 'mathSign':
						var value = self.getValue(text.value, vars);
						if (!isNaN(value)) {
							returnValue = Math.sign(value);
						}

						break;

					case 'mathRound':
						var value = self.getValue(text.value, vars);
						if (!isNaN(value)) {
							returnValue = Math.round(value);
						}

						break;

					case 'log10':
						var value = self.getValue(text.value, vars);

						if (!isNaN(value)) {
							returnValue = Math.log10(value);
						}

						break;

					case 'getServerAge':
						const timestampStr = taro.server.startedAt;
						const timestamp = new Date(timestampStr);
						const millisecondsSinceEpoch = timestamp.getTime();

						returnValue = Date.now() - millisecondsSinceEpoch;

						break;

					case 'getServerStartTime':
						returnValue = new Date(taro.server.startedAt);

						break;

					case 'getEntireMapRegion':
						var region = {
							x: 0,
							y: 0,
							width: taro.map.data.width * taro.scaleMapDetails.tileWidth,
							height: taro.map.data.height * taro.scaleMapDetails.tileHeight,
						};

						returnValue = { _stats: { default: region } };

						break;

					case 'stringContains':
						var str = self.getValue(text.string, vars);
						var keyword = self.getValue(text.keyword, vars);

						if (str != undefined && str.indexOf(keyword) > -1) {
							returnValue = true;
						}

						returnValue = false;

						break;

					case 'lerp':
						var valueA = self.getValue(text.valueA, vars);
						var valueB = self.getValue(text.valueB, vars);
						var alpha = self.getValue(text.alpha, vars);

						if (!isNaN(valueA) && !isNaN(valueB) && !isNaN(alpha)) {
							returnValue = (valueB - valueA) * alpha + valueA;
						}

						break;

					case 'getLerpPosition':
						var positionA = self.getValue(text.positionA, vars);
						var positionB = self.getValue(text.positionB, vars);
						var alpha = self.getValue(text.alpha, vars);

						if (
							positionA &&
							positionB &&
							!isNaN(positionA.x) &&
							!isNaN(positionA.y) &&
							!isNaN(positionB.x) &&
							!isNaN(positionB.y) &&
							!isNaN(alpha)
						) {
							returnValue = {
								x: (positionB.x - positionA.x) * alpha + positionA.x,
								y: (positionB.y - positionA.y) * alpha + positionA.y,
							};
						}

						break;

					case 'getEntityPosition':
						entity = self.getValue(text.entity, vars);

						if (entity) {
							if (
								entity._category === 'item' &&
								entity._stats &&
								entity._stats.currentBody &&
								entity._stats.currentBody.type === 'spriteOnly'
							) {
								var ownerUnit = entity.getOwnerUnit();
								var unitPosition = rfdc()(ownerUnit._translate);

								unitPosition.x =
									ownerUnit._translate.x +
									entity._stats.currentBody.unitAnchor.y * Math.cos(ownerUnit._rotate.z + Math.radians(-90)) +
									entity._stats.currentBody.unitAnchor.x * Math.cos(ownerUnit._rotate.z);
								unitPosition.y =
									ownerUnit._translate.y +
									entity._stats.currentBody.unitAnchor.y * Math.sin(ownerUnit._rotate.z + Math.radians(-90)) +
									entity._stats.currentBody.unitAnchor.x * Math.sin(ownerUnit._rotate.z);
								returnValue = JSON.parse(JSON.stringify(unitPosition));
							} else {
								if (entity.x != undefined && entity.y != undefined) {
									returnValue = JSON.parse(JSON.stringify(entity));
								} else if (entity._translate) {
									returnValue = rfdc()(entity._translate);
								} else {
									returnValue = { x: 0, y: 0 };
								}
							}
						}

						break;

					case 'getEntityPositionOnScreen':
						if (taro.isClient) {
							entity = self.getValue(text.entity, vars);

							if (entity) {
								if (
									entity._category === 'item' &&
									entity._stats &&
									entity._stats.currentBody &&
									entity._stats.currentBody.type === 'spriteOnly'
								) {
									var ownerUnit = entity.getOwnerUnit();
									var unitPosition = rfdc()(ownerUnit._translate);

									unitPosition.x =
										ownerUnit._translate.x +
										entity._stats.currentBody.unitAnchor.y * Math.cos(ownerUnit._rotate.z + Math.radians(-90)) +
										entity._stats.currentBody.unitAnchor.x * Math.cos(ownerUnit._rotate.z);
									unitPosition.y =
										ownerUnit._translate.y +
										entity._stats.currentBody.unitAnchor.y * Math.sin(ownerUnit._rotate.z + Math.radians(-90)) +
										entity._stats.currentBody.unitAnchor.x * Math.sin(ownerUnit._rotate.z);
									returnValue = JSON.parse(JSON.stringify(unitPosition));
								} else {
									if (entity.x != undefined && entity.y != undefined) {
										returnValue = JSON.parse(JSON.stringify(entity));
									} else if (entity._translate) {
										returnValue = rfdc()(entity._translate);
									} else {
										returnValue = { x: 0, y: 0 };
									}
								}
							}

							const bounds = taro.renderer.getViewportBounds();
							returnValue.x -= bounds.x;
							returnValue.y -= bounds.y;
						}

						break;

					case 'getCameraPosition':
						if (taro.isClient) {
							const bounds = taro.renderer.getViewportBounds();
							returnValue = {
								x: bounds.x + bounds.width / 2,
								y: bounds.y + bounds.height / 2,
							};
						}

						break;

					case 'getCameraWidth':
						if (taro.isClient) {
							returnValue = taro.renderer.getCameraWidth();
						}

						break;

					case 'getCameraHeight':
						if (taro.isClient) {
							returnValue = taro.renderer.getCameraHeight();
						}

						break;

					case 'getPositionX':
						var position = self.getValue(text.position, vars);
						if (position) {
							returnValue = position.x;
						}

						break;

					case 'angleBetweenMouseAndWindowCenter':
						var player = self.getValue(text.player, vars);

						if (player) {
							returnValue = player.absoluteAngle || 0;
						}

						break;

					case 'getPositionY':
						var position = self.getValue(text.position, vars);

						if (position) {
							returnValue = position.y;
						}

						break;

					case 'entitiesCollidingWithLastRaycast':
						returnValue = taro.game.entitiesCollidingWithLastRaycast;

						break;

					case 'entitiesBetweenTwoPositions':
						var positionA = self.getValue(text.positionA, vars);
						var positionB = self.getValue(text.positionB, vars);

						if (positionA && positionB) {
							positionA = {
								x: positionA.x / taro.physics._scaleRatio,
								y: positionA.y / taro.physics._scaleRatio,
							};

							positionB = {
								x: positionB.x / taro.physics._scaleRatio,
								y: positionB.y / taro.physics._scaleRatio,
							};

							taro.raycaster.raycastLine(positionA, positionB);

							returnValue = taro.game.entitiesCollidingWithLastRaycast;
						}

						break;

					case 'entityLastRaycastCollisionPosition':
						var entity = self.getValue(text.entity, vars);

						if (entity) {
							returnValue = entity.lastRaycastCollisionPosition;
						}

						break;

					case 'getMouseCursorPosition':
						var player = self.getValue(text.player, vars);

						if (player && player._category == 'player' && player.control) {
							if (
								player.control.input.mouse.x != undefined &&
								player.control.input.mouse.y != undefined &&
								!isNaN(player.control.input.mouse.x) &&
								!isNaN(player.control.input.mouse.y)
							) {
								returnValue = {
									x: parseInt(player.control.input.mouse.x),
									y: parseInt(player.control.input.mouse.y),
								};
							}
						}

						break;

					case 'getSecondaryTouchPosition':
						if (taro.isClient && taro.isMobile) {
							returnValue = {
								x: parseInt(taro.mobileControls.secondaryTouchPosition.x),
								y: parseInt(taro.mobileControls.secondaryTouchPosition.y),
							};
						}

						break;

					case 'xyCoordinate':
						var x = self.getValue(text.x, vars);
						var y = self.getValue(text.y, vars);

						if (x != undefined && y != undefined) {
							returnValue = { x: x, y: y };
						}

						break;

					case 'vector3':
						var x = self.getValue(text.x, vars);
						var y = self.getValue(text.y, vars);
						var z = self.getValue(text.z, vars);
						if (x != undefined && y != undefined && z != undefined) {
							returnValue = { x: x, y: y, z: z };
						}

						break;

					case 'getPositionInFrontOfPosition':
						var position = self.getValue(text.position, vars);
						var distance = self.getValue(text.distance, vars);
						var angle = self.getValue(text.angle, vars);

						if (position && !isNaN(distance) && !isNaN(angle)) {
							angle -= Math.PI / 2;
							returnValue = {
								x: distance * Math.cos(angle) + position.x,
								y: distance * Math.sin(angle) + position.y,
							};
						}

						break;

					case 'distanceBetweenPositions':
						var positionA = self.getValue(text.positionA, vars);
						var positionB = self.getValue(text.positionB, vars);

						if (positionA && positionB) {
							var a = positionA.x - positionB.x;
							var b = positionA.y - positionB.y;
							returnValue = Math.sqrt(a * a + b * b);
						}

						break;

					case 'angleBetweenPositions':
						var positionA = self.getValue(text.positionA, vars);
						var positionB = self.getValue(text.positionB, vars);

						if (
							positionA != undefined &&
							positionB != undefined &&
							(positionB.y - positionA.y != 0 || positionB.x - positionA.x != 0) // two positions should be different
						) {
							returnValue = Math.atan2(positionB.y - positionA.y, positionB.x - positionA.x);
							returnValue += Math.radians(90);
						}

						break;

					case 'getPlayTimeOfPlayer':
						var player = self.getValue(text.player, vars);

						returnValue = player && player._stats.receivedJoinGame - taro.now;

						break;

					case 'getUnitType':
						returnValue = self.getValue(text.unitType, vars);

						break;

					case 'getUnitTypeName':
						var unitTypeId = self.getValue(text.unitType, vars);
						var unitType = taro.game.cloneAsset('unitTypes', unitTypeId);

						if (unitType) {
							returnValue = unitType.name;
						}

						break;

					case 'entityName':
						var entity = self.getValue(text.entity, vars);

						if (entity) {
							returnValue = entity._stats.name;
						}

						break;

					case 'getItemDescription':
						var item = self.getValue(text.item, vars);

						if (item && item._category == 'item') {
							returnValue = item._stats.description;
						}

						break;

					case 'getItemType':
						returnValue = self.getValue(text.itemType, vars);

						break;

					case 'getAttributeType':
						returnValue = self.getValue(text.attributeType, vars);

						break;

					case 'getRandomItemTypeFromItemTypeGroup':
						if (text.itemTypeGroup) {
							var variableObj = self.getValue(text.itemTypeGroup, vars);

							if (variableObj) {
								var itemTypes = _.map(variableObj, (itemTypeInfo, itemType) => {
									return {
										itemType,
										probability: itemTypeInfo.probability,
									};
								});

								var totalProbability = itemTypes.reduce((partialSum, item) => {
									return partialSum + item.probability;
								}, 0);

								var randomNumber = _.random(0, totalProbability);
								var currentHead = 0;

								for (var i = 0; i < itemTypes.length; i++) {
									var itemType = itemTypes[i];
									if (_.inRange(randomNumber, currentHead, currentHead + itemType.probability)) {
										returnValue = itemType.itemType;
									}

									currentHead += itemType.probability;
								}

								// select last item type if nothings selected
								if (!returnValue) {
									returnValue = itemTypes[itemTypes.length - 1].itemType;
								}
							}
						}

						break;

					case 'getRandomUnitTypeFromUnitTypeGroup':
						if (text.unitTypeGroup) {
							var variableObj = self.getVariable(text.unitTypeGroup.variableName);

							if (variableObj) {
								var unitTypes = _.map(variableObj, (unitTypeInfo, unitType) => {
									return {
										unitType,
										probability: unitTypeInfo.probability,
									};
								});

								var totalProbability = unitTypes.reduce((partialSum, unit) => {
									return partialSum + unit.probability;
								}, 0);

								var randomNumber = _.random(0, totalProbability);
								var currentHead = 0;

								for (var i = 0; i < unitTypes.length; i++) {
									var unitType = unitTypes[i];

									if (_.inRange(randomNumber, currentHead, currentHead + unitType.probability)) {
										returnValue = unitType.unitType;
									}

									currentHead += unitType.probability;
								}

								// select last unit type if nothings selected
								if (!returnValue) {
									returnValue = unitTypes[unitTypes.length - 1].unitType;
								}
							}
						}

						break;

					case 'getItemTypeDamage':
						var itemTypeId = self.getValue(text.itemType, vars);
						var itemType = taro.game.cloneAsset('itemTypes', itemTypeId);

						if (itemType) {
							returnValue = parseFloat(itemType.damage);
						} else {
							returnValue = 0;
						}

						break;

					case 'getItemParticle':
						var particleTypeId = self.getValue(text.particleType, vars);

						if (entity && entity._category == 'item' && particleTypeId) {
							if (entity._stats.particles) {
								var particleType = entity._stats.particles[particleTypeId];
								// only return particleTypeId if particleType exists in the item
								if (particleType) {
									returnValue = particleTypeId;
								}
							}
						}

						break;

					case 'lastPurchasedUnitTypetId':
						returnValue = taro.game.lastPurchasedUniTypetId;

						break;

					case 'getXCoordinateOfRegion':
						var region = self.getValue(text.region, vars);

						if (region) {
							returnValue = region._stats.default.x;
						} else {
							ParameterComponent.prototype.log('getXCoordinateOfRegion: region not defined');
						}

						break;

					case 'getYCoordinateOfRegion':
						var region = self.getValue(text.region, vars);

						if (region && region._stats && region._stats.default) {
							returnValue = region._stats.default.y;
						} else {
							ParameterComponent.prototype.log('getYCoordinateOfRegion: region not defined');
						}

						break;

					case 'getWidthOfRegion':
						var region = self.getValue(text.region, vars);

						if (region) {
							returnValue = region._stats.default.width;
						} else {
							ParameterComponent.prototype.log('getWidthOfRegion: region not defined');
						}

						break;

					case 'getHeightOfRegion':
						var region = self.getValue(text.region, vars);

						if (region) {
							returnValue = region._stats.default.height;
						} else {
							ParameterComponent.prototype.log('getHeightOfRegion: region not defined');
						}

						break;

					case 'getEntityState':
						entity = self.getValue(text.entity, vars);
						var entity =
							entity && self._entity.script.action.entityCategories.indexOf(entity._category) > -1
								? entity
								: vars.selectedEntity;

						if (entity && self._entity.script.action.entityCategories.indexOf(entity._category) > -1) {
							returnValue = entity._stats.stateId;
						} else {
							ParameterComponent.prototype.log('getEntityState: entity not defined');
						}

						break;

					case 'getRotateSpeed':
						var unitTypeId = self.getValue(text.unitType, vars);
						var unitType = taro.game.cloneAsset('unitTypes', unitTypeId);

						if (unitType && unitType.body && unitType.body.rotationSpeed) {
							returnValue = unitType.body.rotationSpeed;
						}

						break;

					case 'getUnitData':
						var unit = self.getValue(text.unit, vars);
						var data = unit.getPersistentData('unit');

						if (data) {
							returnValue = JSON.stringify(data);
						}

						break;

					case 'getPlayerData':
						var player = self.getValue(text.player, vars);
						var data = player.getPersistentData('player');

						if (data) {
							returnValue = JSON.stringify(data);
						}

						break;

					case 'getPlayerId':
						var player = self.getValue(text.player, vars);

						if (player) {
							returnValue = player.id();
						}

						break;

					case 'getHighScoreOfPlayer':
						var player = self.getValue(text.player, vars);

						returnValue = player._stats.highscore;

						break;

					case 'getEntityId':
						var entity = self.getValue(text.entity, vars);

						if (entity) {
							returnValue = entity.id();
						}

						break;

					case 'getLengthOfString':
						var string = self.getValue(text.string, vars);

						if (string && !isNaN(string.length)) {
							returnValue = string.length;
						}

						break;

					case 'getStringArrayLength':
						var string = self.getValue(text.string, vars);

						// falsy check OK because empty string is not valid array
						if (string) {
							try {
								var array = JSON.parse(string);

								if (Array.isArray(array)) {
									returnValue = array.length;
								}
							} catch (err) {
								if (err instanceof SyntaxError) {
									self._script.errorLog(
										`error parsing JSON within getStringArrayLength:  ${typeof string} ${string} is not a valid JSON string`,
										`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
										true
									);
								}
							}
						}

						break;

					case 'getStringArrayElement':
						var string = self.getValue(text.string, vars);
						var index = self.getValue(text.number, vars);

						// index can be zero so more than a falsy check is necessary
						if (string && index !== undefined) {
							try {
								var array = JSON.parse(string);
								returnValue = array[index];
							} catch (err) {
								if (err instanceof SyntaxError) {
									self._script.errorLog(
										`error parsing JSON within getStringArrayElement:  ${typeof string} ${string} is not a valid JSON string`,
										`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
										true
									);
								}
							}
						}

						break;

					case 'insertStringArrayElement':
						var string = self.getValue(text.string, vars);
						var value = self.getValue(text.value, vars);

						// value can be something that evaluates falsy so more is needed
						if (string && value !== undefined) {
							try {
								var array = JSON.parse(string);

								if (Array.isArray(array)) {
									array.push(value);
									returnValue = JSON.stringify(array);
								}
							} catch (err) {
								if (err instanceof SyntaxError) {
									self._script.errorLog(
										`error parsing JSON within insertStringArrayElement:  ${typeof string} ${string} is not a valid JSON string`,
										`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
										true
									);
								} else {
									self._script.errorLog(
										'error modifying array within insertStringArrayElement',
										`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
										true
									);
								}
							}
						}

						break;

					case 'updateStringArrayElement':
						var string = self.getValue(text.string, vars);
						var index = self.getValue(text.number, vars);
						var value = self.getValue(text.value, vars);

						// value and index can be falsy and valid so more is needed
						if (string && value !== undefined && index !== undefined) {
							try {
								var array = JSON.parse(string);

								if (Array.isArray(array)) {
									array[index] = value;
									returnValue = JSON.stringify(array);
								}
							} catch (err) {
								if (err instanceof SyntaxError) {
									self._script.errorLog(
										`error parsing JSON within updateStringArrayElement:  ${typeof string} ${string} is not a valid JSON string`,
										`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
										true
									);
								} else {
									self._script.errorLog(
										'error modifying array within updateStringArrayElement',
										`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
										true
									);
								}
							}
						}

						break;

					case 'removeStringArrayElement':
						var string = self.getValue(text.string, vars);
						var index = self.getValue(text.number, vars);

						// index can be zero so more than falsy check is necessary
						if (string && index !== undefined) {
							try {
								var array = JSON.parse(string);

								if (Array.isArray(array)) {
									array.splice(index, 1);
									returnValue = JSON.stringify(array);
								}
							} catch (err) {
								if (err instanceof SyntaxError) {
									self._script.errorLog(
										`error parsing JSON within removeStringArrayElement:  ${typeof string} ${string} is not a valid JSON string`,
										`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
										true
									);
								} else {
									self._script.errorLog(
										'error modifying array within removeStringArrayElement',
										`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
										true
									);
								}
							}
						}

						break;

					case 'toLowerCase':
						var string = self.getValue(text.string, vars);

						if (string && !isNaN(string.length)) {
							returnValue = string.toLowerCase();
						}

						break;

					case 'toUpperCase':
						var string = self.getValue(text.string, vars);

						if (string && !isNaN(string.length)) {
							returnValue = string.toUpperCase();
						}

						break;

					case 'substringOf':
						var string = self.getValue(text.string, vars);
						var fromIndex = self.getValue(text.fromIndex, vars);
						var toIndex = self.getValue(text.toIndex, vars);

						if (string && string.length) {
							fromIndex = Math.max(Math.min(fromIndex, string.length - 1), 0);
							toIndex = Math.max(Math.min(toIndex, string.length), 0);

							// This looks like trying to force a start index from [0, +inf], but actually puts it in [-1, +inf]. Why is it subtracted two times? (once before, now the second time here)
							returnValue = string.substring(fromIndex, toIndex);
						} else {
							returnValue = '';
						}

						break;

					case 'stringStartsWith':
						var sourceString = self.getValue(text.sourceString, vars);
						var patternString = self.getValue(text.patternString, vars);

						if (typeof sourceString == 'string' && typeof patternString == 'string') {
							returnValue = sourceString.startsWith(patternString);
						}

						break;

					case 'stringEndsWith':
						var sourceString = self.getValue(text.sourceString, vars);
						var patternString = self.getValue(text.patternString, vars);

						if (typeof sourceString == 'string' && typeof patternString == 'string') {
							returnValue = sourceString.endsWith(patternString);
						}

						break;

					case 'replaceValuesInString':
						var sourceString = self.getValue(text.sourceString, vars);
						var matchString = self.getValue(text.matchString, vars);
						var newString = self.getValue(text.newString, vars);

						if (typeof sourceString == 'string' && typeof matchString == 'string' && typeof newString == 'string') {
							// returnValue = sourceString.split(matchString).join(newString);
							var regex = new RegExp(matchString, 'g');
							returnValue = sourceString.replace(regex, newString);
						}

						break;

					case 'filterString':
						var string = self.getValue(text.string, vars);
						if (taro.chat && taro.chat.filter) {
							returnValue = taro.chat.filter.cleanHacked(string);
						}

						break;

					case 'getMin':
						var num1 = self.getValue(text.num1, vars);
						var num2 = self.getValue(text.num2, vars);

						if (num1 != undefined && num2 != undefined) {
							returnValue = Math.min(num1, num2);
						}

						break;

					case 'getMax':
						var num1 = self.getValue(text.num1, vars);
						var num2 = self.getValue(text.num2, vars);

						if (num1 != undefined && num2 != undefined) {
							returnValue = Math.max(num1, num2);
						}

						break;

					case 'getExponent':
						var base = self.getValue(text.base, vars);
						var power = self.getValue(text.power, vars);

						if (base != undefined && power != undefined) {
							returnValue = Math.pow(base, power);
						}

						break;
					/* Groups */

					case 'allUnits':
						returnValue = taro.$$('unit');

						break;

					case 'allUnitsOfUnitType':
						var type = self.getValue(text.unitType, vars);
						returnValue = _.filter(taro.$$('unit'), (unit) => {
							return unit._stats.type == type;
						});

						break;

					case 'allRegions':
						returnValue = taro.$$('region');

						break;

					case 'allUnitsOwnedByPlayer':
						var player = self.getValue(text.player, vars);

						if (player) {
							var units = [];

							for (var i = 0; i < player._stats.unitIds.length; i++) {
								var unitId = player._stats.unitIds[i];
								units.push(taro.$(unitId));
							}

							returnValue = units;
						}

						break;

					case 'allPlayers':
						returnValue = taro.$$('player');

						break;

					case 'humanPlayers':
						returnValue = taro.$$('player').filter(function (player) {
							return player._stats.controlledBy == 'human';
						});

						break;

					case 'computerPlayers':
						returnValue = taro.$$('player').filter(function (player) {
							return player._stats.controlledBy == 'computer';
						});

						break;

					case 'botPlayers':
						returnValue = taro.$$('player').filter(function (player) {
							return player._stats.isBot;
						});

						break;

					case 'playersOfPlayerType':
						var playerType = self.getValue(text.playerType, vars);
						var players = taro.$$('player').filter((player) => {
							return player._stats.playerTypeId === playerType;
						});

						returnValue = players;
						break;

					case 'allItems':
						returnValue = taro.$$('item');

						break;

					case 'allItemsOfItemType':
						var type = self.getValue(text.itemType, vars);

						returnValue = _.filter(taro.$$('item'), (item) => {
							return item._stats.itemTypeId == type;
						});

						break;

					case 'allProjectiles':
						returnValue = taro.$$('projectile');

						break;

					case 'allProjectilesOfProjectileType':
						var type = self.getValue(text.projectileType, vars);

						returnValue = _.filter(taro.$$('projectile'), (projectile) => {
							return projectile._stats.type == type;
						});

						break;

					/* entity */

					case 'allEntities':
						var taroRegister = taro.register();
						returnValue = _.values(taroRegister).filter(({ _category }) => {
							// uncomment to see on server what is registered with taro AND included in 'all entities in game'
							// console.log('category:  ',_category,'. returning: ',(_category != 'region' && self._entity.script.action.entityCategories.includes(_category)) || !_category);
							return (
								(_category != 'region' && self._entity.script.action.entityCategories.includes(_category)) || !_category
							);
						});

						break;

					case 'entitiesInRegionInFrontOfEntityAtDistance':
						var entity = self.getValue(text.entity, vars);
						var distance = self.getValue(text.distance, vars);
						var width = self.getValue(text.width, vars);
						var height = self.getValue(text.height, vars);

						if (
							entity != undefined &&
							self._entity.script.action.entityCategories.indexOf(entity._category) > -1 &&
							height != undefined &&
							width != undefined &&
							distance != undefined
						) {
							// console.log(entity._translate.x, distance * Math.cos(entity._rotate.z + Math.radians(-90)));
							// console.log(entity._translate.y, distance * Math.sin(entity._rotate.z + Math.radians(-90)));
							var region = {
								x: entity._translate.x + distance * Math.cos(entity._rotate.z + Math.radians(-90)),
								y: entity._translate.y + distance * Math.sin(entity._rotate.z + Math.radians(-90)),
								width: width,
								height: height,
							};

							region.x -= region.width / 2;
							region.y -= region.height / 2;

							if (
								region.x &&
								!isNaN(region.x) &&
								region.y &&
								!isNaN(region.y) &&
								region.width &&
								!isNaN(region.width) &&
								region.height &&
								!isNaN(region.height)
							) {
								returnValue = taro.physics.getBodiesInRegion(region).filter(({ _category }) => {
									return self._entity.script.action.entityCategories.includes(_category) || !_category;
								});
							} else {
								taro.script.errorLog(
									`region ${JSON.stringify(region)} is not a valid region`,
									`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
									true
								);
								returnValue = [];
							}
						}

						break;

					case 'regionInFrontOfEntityAtDistance':
						var entity = self.getValue(text.entity, vars);
						var distance = self.getValue(text.distance, vars);
						var width = self.getValue(text.width, vars);
						var height = self.getValue(text.height, vars);

						if (
							entity != undefined &&
							self._entity.script.action.entityCategories.indexOf(entity._category) > -1 &&
							height != undefined &&
							width != undefined &&
							distance != undefined
						) {
							// console.log(entity._translate.x, distance * Math.cos(entity._rotate.z + Math.radians(-90)));
							// console.log(entity._translate.y, distance * Math.sin(entity._rotate.z + Math.radians(-90)));
							var region = {
								x: entity._translate.x + distance * Math.cos(entity._rotate.z + Math.radians(-90)),
								y: entity._translate.y + distance * Math.sin(entity._rotate.z + Math.radians(-90)),
								width: width,
								height: height,
							};

							region.x -= region.width / 2;
							region.y -= region.height / 2;

							if (
								region.x &&
								!isNaN(region.x) &&
								region.y &&
								!isNaN(region.y) &&
								region.width &&
								!isNaN(region.width) &&
								region.height &&
								!isNaN(region.height)
							) {
								returnValue = region;
							} else {
								taro.script.errorLog(
									`region ${JSON.stringify(region)} is not a valid region`,
									`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
									true
								);
								returnValue = undefined;
							}
						}

						break;

					case 'entitiesInRegion':
						var region = self.getValue(text.region, vars);
						var id = taro.game.lastCastingUnitId;
						var unit = taro.$(id);
						if (region) {
							// region represent some instance of TaroRegion
							if (region._stats) {
								returnValue = taro.physics.getBodiesInRegion(region._stats.default).filter(({ _category }) => {
									return self._entity.script.action.entityCategories.includes(_category) || !_category;
								});
							} else {
								returnValue = taro.physics.getBodiesInRegion(region).filter(({ _category }) => {
									return self._entity.script.action.entityCategories.includes(_category) || !_category;
								});
							}
						} else {
							taro.script.errorLog(
								'region is not a valid region',
								`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
								true
							);
							returnValue = [];
						}

						break;

					case 'getEntityType':
						var entity = self.getValue(text.entity, vars);

						if (entity) {
							returnValue = entity._category || 'wall';
						}

						break;

					case 'stringIsANumber':
						var string = self.getValue(text.string, vars);
						if (string) {
							returnValue = !isNaN(parseFloat(string)) && !isNaN(string - 0);
						} else {
							returnValue = false;
						}
						break;

					case 'getTimeString':
						var seconds = self.getValue(text.seconds, vars);
						returnValue = new Date(parseFloat(seconds) * 1000).toISOString().substr(11, 8);

						break;

					case 'undefinedValue':
						returnValue = undefined;

						break;

					case 'emptyObject':
						returnValue = {};

						break;
					case 'notValue':
						returnValue = !self.getValue(text.boolean, vars);
						break;
					default:
						if (text.function) {
							taro.script.errorLog(
								`warning: function '${text.function}' not found`,
								`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
								true
							);
						} else {
							returnValue = text;
						}

						break;
				}
			}

			//if profiler is enabled, record the time elapsed
			if (taro.profiler.isEnabled && this.profiler[text.function]) {
				var timeElapsed = Date.now() - profileStart;
				this.profiler[text.function].counter++;
				this.profiler[text.function].totalTime += timeElapsed;
				this.profiler[text.function].avgTime =
					(this.profiler[text.function].avgTime * (this.profiler[text.function].counter - 1) + timeElapsed) /
					this.profiler[text.function].counter;
			}
		}

		// For debugging purpose. if type of returnValue is object, it can sometimes cause TypeError: Converting circular structure to JSON
		if (taro.isServer) {
			var output = returnValue;
			if (typeof returnValue == 'object' && returnValue && returnValue._category) {
				output = returnValue._category;
			}
		}

		if (
			returnValue === undefined &&
			text !== undefined &&
			typeof text === 'object' &&
			text.function !== 'undefinedValue'
		) {
			// TODO: improve the error report, for performance, remove it for now
			// self._script.errorLog(`${typeof text === 'object' && !Array.isArray(text) ? JSON.stringify(text) : text} is undefined`, `${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`, true)
		}
		return returnValue;
	},

	populateFunctions: function () {
		var self = this;

		this._functions = {
			/* general */

			/* number */

			calculate: function (text, vars) {
				return self.calculate(text.items, vars);
			},

			getRandomNumberBetween: function (text, vars) {
				var min = parseFloat(self.getValue(text.min, vars));
				var max = parseFloat(self.getValue(text.max, vars));
				var randomNumber = Math.floor(Math.random() * (max - min + 1) + min);
				return randomNumber;
			},

			/* string */

			gameId: function (text, vars) {
				// return taro.server.gameId;
				return taro.game.data.defaultData._id;
			},

			objectToString: function (text, vars) {
				var object = self.getValue(text.object, vars);
				var str = typeof object === 'string' ? object : JSON.stringify(object); // remove opening & ending quotes
				return str;
			},

			lastReceivedPostResponse: function (text, vars) {
				return taro.game.lastReceivedPostResponse;
			},

			lastUpdatedVariableName: function (text, vars) {
				return taro.game.lastUpdatedVariableName;
			},

			subString: function (text, vars) {
				var sourceString = self.getValue(text.sourceString, vars);
				var patternString = self.getValue(text.patternString, vars);

				if (typeof sourceString == 'string' && typeof patternString == 'string') {
					return sourceString.includes(patternString);
				}
			},

			concat: function (text, vars) {
				var stringA = self.getValue(text.textA, vars);
				var stringB = self.getValue(text.textB, vars);

				return `${stringA}${stringB}`;
			},

			/* number */

			elementCount: function (text, vars) {
				var object = self.getValue(text.object, vars);
				if (object) {
					return Object.keys(object).length;
				}
				return undefined;
			},

			/* player */

			getTriggeringPlayer: function (text, vars) {
				if (vars && vars.triggeredBy && vars.triggeredBy.playerId) {
					var id = vars.triggeredBy.playerId;
					return taro.$(id);
				}
			},

			playerTypeOfPlayer: function (text, vars) {
				var player = self.getValue(text.player, vars);
				if (player && player._category == 'player') {
					return player._stats.playerTypeId;
				}
			},

			getOwner: function (text, vars) {
				var entity = self.getValue(text.entity, vars);
				if (entity && entity._category == 'unit') {
					return entity.getOwner();
				}
			},

			localPlayer: function (text, vars) {
				if (taro.isClient) {
					return taro.client.myPlayer;
				}
			},

			playerIsControlledByHuman: function (text, vars) {
				var player = self.getValue(text.player, vars);
				return player && player._stats.controlledBy == 'human';
			},

			isPlayerOnMobile: function (text, vars) {
				var player = self.getValue(text.player, vars);
				return !!(player && player._stats.isMobile);
			},

			/* entity */

			getEntityVariable: function (text, vars) {
				return text.variable;
			},

			getValueOfEntityVariable: function (text, vars) {
				var variableData = self.getValue(text.variable, vars);
				var entity = self.getValue(text.entity, vars);
				if (entity?.variable && variableData?.key) {
					var value = entity.variable.getValue(variableData.key);
					return value;
				}
			},

			getPlayerVariable: function (text, vars) {
				return text.variable;
			},

			getValueOfPlayerVariable: function (text, vars) {
				var variableData = self.getValue(text.variable, vars);
				var player = self.getValue(text.player, vars);

				if (player && variableData?.key) {
					return player.variable.getValue(variableData.key);
				}
			},

			entityBounds: function (text, vars) {
				var entity = self.getValue(text.entity, vars);
				if (entity && self._entity.script.action.entityCategories.indexOf(entity._category) > -1) {
					// for sprite-only items that are carried by units
					return entity.getBounds();
				}
			},

			computerPlayer: function (text, vars) {
				var number = self.getValue(text.number, vars);
				return taro.game.getComputerPlayerByNumber(number);
			},

			getTriggeringEntity: function (text, vars) {
				if (vars && vars.triggeredBy && vars.triggeredBy.entityId) {
					var id = vars.triggeredBy.entityId;
					return taro.$(id);
				}
			},

			/* unit */

			getTriggeringUnit: function (text, vars) {
				if (vars && vars.triggeredBy && vars.triggeredBy.unitId) {
					var id = vars.triggeredBy.unitId;
					return taro.$(id);
				}
			},

			getLastCreatedUnit: function (text, vars) {
				var id = taro.game.lastCreatedUnitId;
				return taro.$(id);
			},

			getUnitTypeOfUnit: function (text, vars) {
				var unit = self.getValue(text.entity, vars);

				if (unit && unit._category == 'unit') {
					return unit._stats.type;
				} else if (typeof unit == 'string') {
					// if unitTypeOfUnit is key of unit
					return unit;
				} else {
					ParameterComponent.prototype.log('getUnitTypeOfUnit: entity not defined');
				}
			},

			getSourceUnitOfProjectile: function (text, vars) {
				var entity = self.getValue(text.entity, vars);
				if (entity && entity._category == 'projectile') {
					var sourceUnitId = entity._stats.sourceUnitId;
					unit = taro.$(sourceUnitId);

					if (unit && unit._category == 'unit') {
						return unit;
					}
				}
			},

			allUnitsInRegion: function (text, vars) {
				// if we have the properties needed to get the units in a region
				var region = self.getValue(text.region, vars);

				if (region) {
					var regionBounds = region._stats ? region._stats.default : region;
					return taro.physics.getBodiesInRegion(regionBounds).filter(({ _category }) => {
						return _category === 'unit';
					});
				} else {
					// the entire map
					return [];
				}
			},

			/* unit type */
			getNumberOfUnitsOfUnitType: function (text, vars) {
				var unitType = self.getValue(text.unitType, vars);
				var units = taro.$$('unit').filter((unit) => {
					// this needs to be optimized
					return unit._stats.type === unitType;
				});

				return units.length;
			},

			/* item */

			getOwnerOfItem: function (text, vars) {
				var entity = self.getValue(text.entity, vars);
				if (entity && entity._category == 'item') {
					var owner = entity.getOwnerUnit();

					if (owner) {
						return owner;
					}
				}
			},

			getTriggeringItem: function (text, vars) {
				if (vars && vars.triggeredBy && vars.triggeredBy.itemId) {
					var id = vars.triggeredBy.itemId;
					return taro.$(id);
				}
			},

			getSourceItemOfProjectile: function (text, vars) {
				var entity = self.getValue(text.entity, vars);
				if (entity && entity._category == 'projectile') {
					var item = entity.getSourceItem();

					if (item) {
						return item;
					}
				}
			},

			getItemCurrentlyHeldByUnit: function (text, vars) {
				var entity = self.getValue(text.entity, vars);
				if (entity && entity._category == 'unit') {
					return entity.getCurrentItem();
				}
			},

			allItemsOwnedByUnit: function (text, vars) {
				var unit = self.getValue(text.entity, vars);
				if (unit && unit._category == 'unit') {
					return taro
						.$$('item') // this needs to be optimized
						.filter(function (item) {
							return item._stats.ownerUnitId == unit.id();
						});
				}
			},

			/* item type */

			getItemTypeOfItem: function (text, vars) {
				var entity = self.getValue(text.entity, vars);
				if (entity && entity._stats) {
					return entity._stats.itemTypeId;
				} else if (typeof entity == 'string') {
					// if itemTypeOfItem is key of unit
					return entity;
				}
			},

			getItemTypeName: function (text, vars) {
				var itemTypeId = self.getValue(text.itemType, vars);
				var itemType = taro.game.cloneAsset('itemTypes', itemTypeId);

				if (itemType) {
					return itemType.name;
				}
			},

			/* projectile */

			getLastTouchedProjectile: function (text, vars) {
				var id = taro.game.lastTouchedProjectileId;
				projectile = taro.$(id);

				if (projectile && projectile._category == 'projectile') {
					return projectile;
				}
			},

			getProjectileType: function (text, vars) {
				// get projectile type from env
				return self.getValue(text.projectileType, vars);
			},

			getProjectileTypeOfProjectile: function (text, vars) {
				// get projectile type of projectile
				var entity = self.getValue(text.entity, vars);
				if (entity && entity._category == 'projectile') {
					return entity._stats.type;
				} else {
					ParameterComponent.prototype.log('entity not defined');
				}
			},

			/* sensor */

			getTriggeringSensor: function (text, vars) {
				if (vars && vars.triggeredBy && vars.triggeredBy.sensorId) {
					var id = vars.triggeredBy.sensorId;
					return taro.$(id);
				}
			},

			getTriggeringProjectile: function (text, vars) {
				if (vars && vars.triggeredBy && vars.triggeredBy.projectileId) {
					var id = vars.triggeredBy.projectileId;
					return taro.$(id);
				}
			},

			/* region */
			getTriggeringRegion: function (text, vars) {
				if (vars && vars.triggeredBy && vars.triggeredBy.region) {
					return vars.triggeredBy.region;
				}
			},

			getRegionByName: function (text, vars) {
				var regionName = self.getValue(text.name, vars);
				if (regionName) {
					return taro.regionManager.getRegionById(regionName);
				}
			},

			regionOverlapsWithRegion: function (text, vars) {
				var regionA = self.getValue(text.regionA, vars);
				var regionB = self.getValue(text.regionB, vars);
				if (!regionA || !regionB) {
					return false;
				}
				if (regionA._category == 'region') {
					regionA = regionA.getBounds();
				}
				if (regionB._category == 'region') {
					regionB = regionB.getBounds();
				}
				if (regionA && regionB) {
					regionA = new TaroRect(regionA.x, regionA.y, regionA.width, regionA.height);
					regionB = new TaroRect(regionB.x, regionB.y, regionB.width, regionB.height);
					return regionA.intersects(regionB);
				}
			},
			/* variable */

			getVariable: function (text, vars) {
				var name = self.getValue(text.variableName, vars);
				return self.getVariable(name);
			},

			getTriggeringVariableName: function (text, vars) {
				if (vars && vars.triggeredBy && vars.triggeredBy.variableName) {
					return vars.triggeredBy.variableName;
				}
			},

			/* attribute */

			getTriggeringAttribute: function (text, vars) {
				if (vars && vars.triggeredBy && vars.triggeredBy.attribute) {
					return vars.triggeredBy.attribute;
				}
			},

			getEntityAttribute: function (text, vars) {
				var entity = self.getValue(text.entity, vars);
				var attributeTypeId = self.getValue(text.attribute, vars);

				if (entity && self._entity.script.action.entityCategories.indexOf(entity._category) !== -1 && attributeTypeId) {
					var attributeType = entity._stats.attributes && entity._stats.attributes[attributeTypeId];
					if (attributeType) {
						var value = parseFloat(attributeType.value);
						return self.getValue(value, vars);
					} else {
						// taro.script.errorLog("attribute "+ attributeTypeId +" doesn't exist in unit "+((unit._stats)?unit._stats.name:''))
					}
				}
			},

			getOwner: function (text, vars, entity) {
				var entity = self.getValue(text.entity, vars);
				if (entity && entity._category == 'unit') {
					return entity.getOwner();
				}
			},

			selectedPlayer: function (text, vars, entity) {
				return this.getSelectedPlayer(text, vars);
			},
			getSelectedPlayer: function (text, vars, entity) {
				if (vars && vars.selectedPlayer) {
					return vars.selectedPlayer;
				}
			},

			selectedUnit: function (text, vars, entity) {
				return this.getSelectedUnit(text, vars);
			},
			getSelectedUnit: function (text, vars, entity) {
				if (vars && vars.selectedUnit) {
					return vars.selectedUnit;
				}
			},

			selectedItem: function (text, vars, entity) {
				return this.getSelectedItem(text, vars);
			},
			getSelectedItem: function (text, vars, entity) {
				if (vars && vars.selectedItem) {
					return vars.selectedItem;
				}
			},

			selectedProjectile: function (text, vars, entity) {
				return this.getSelectedProjectile(text, vars);
			},
			getSelectedProjectile: function (text, vars, entity) {
				if (vars && vars.selectedProjectile) {
					return vars.selectedProjectile;
				}
			},

			selectedEntity: function (text, vars, entity) {
				return this.getSelectedEntity(text, vars);
			},
			getSelectedEntity: function (text, vars, entity) {
				if (vars && vars.selectedEntity) {
					return vars.selectedEntity;
				}
			},

			selectedRegion: function (text, vars, entity) {
				if (vars && vars.selectedRegion) {
					return vars.selectedRegion;
				}
			},

			selectedItemType: function (text, vars, entity) {
				if (vars && vars.selectedItemType) {
					return vars.selectedItemType;
				}
			},

			selectedUnitType: function (text, vars, entity) {
				if (vars && vars.selectedUnitType) {
					return vars.selectedUnitType;
				}
			},

			selectedElement: function (text, vars, entity) {
				if (vars && vars.selectedElement) {
					return vars.selectedElement;
				}
			},

			selectedElementsKey: function (text, vars, entity) {
				if (vars && vars.selectedElementsKey) {
					return vars.selectedElementsKey;
				}
			},

			/* object */

			elementFromObject: function (text, vars) {
				var object = self.getValue(text.object, vars);
				var key = self.getValue(text.key, vars);

				if (object && Object.hasOwn(object, key)) {
					return object[key];
				}
			},

			stringToObject: function (text, vars) {
				var string = self.getValue(text.string, vars);

				if (string) {
					try {
						if (taro.isClient) {
							return JSON.parse(string);
						} else {
							const repairedString = jsonrepair?.jsonrepair(string);
							return JSON.parse(repairedString);
						}
					} catch (err) {
						console.log('stringToObject err', err.message);
						self._script.errorLog(
							`error parsing JSON within stringToObject:  ${typeof string} ${string} is not a valid JSON string`,
							`${self._script._entity._id}/${self._script.currentScriptId}/${self._script.currentActionName}/${self._script.currentActionLineNumber}`,
							true
						);
					}
				}
			},

			getUIElementProperty: function (text, vars) {
				if (taro.isClient) {
					let key = self.getValue(text.key, vars);
					let elementId = self.getValue(text.elementId, vars);

					return document.getElementById(elementId)?.[key];
				}
			},

			getServerReceivedData: function () {
				if (taro.isClient) {
					return taro.client.myPlayer.lastServerReceivedData || {};
				}
			},

			getClientReceivedData: function (text, vars) {
				if (taro.isServer) {
					var player = self.getValue(text.player, vars);
					if (player) {
						return player.lastClientReceivedData || {};
					}
				}
			},

			numberOfInvitesByPlayer: function (text, vars) {
				var player = self.getValue(text.player, vars);
				if (player) {
					return player._stats.invitedUsersCount || 0;
				}
			},
		};
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ParameterComponent;
}
