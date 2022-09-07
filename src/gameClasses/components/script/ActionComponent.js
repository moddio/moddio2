var ActionComponent = IgeEntity.extend({
	classId: 'ActionComponent',
	componentId: 'action',

	init: function () {
		this.entityCategories = ['unit', 'item', 'projectile', 'region', 'wall'];
	},

	// entity can be either trigger entity, or entity in loop
	run: function (actionList, vars) {
		var self = this;

		if (actionList == undefined || actionList.length <= 0)
			return;

		for (var i = 0; i < actionList.length; i++) {
			var action = actionList[i];

			// if action is disabled
			if (!action || action.disabled == true || (ige.isClient && ige.physics && !action.runOnClient)) {
				continue;
			}
			var params = {};
			var entity = ige.variable.getValue(action.entity, vars);
			ige.script.currentActionName = action.type;
			var invalidParameters = [];

			if (action.params == undefined) {
				for (j in action) {
					// add everything else in action object into param
					if (j != 'type') {
						params[j] = action[j];
					}
				}
			}

			ige.script.recordLast50Action(action.type);
			try {
				switch (action.type) {
					/* Global */

					case 'setVariable': // store variables with formula processed
						var newValue = ige.variable.getValue(action.value, vars);
						params.newValue = newValue;
						if (ige.game.data.variables.hasOwnProperty(action.variableName)) {
							ige.game.data.variables[action.variableName].value = newValue;
							// if variable has default field then it will be returned when variable's value is undefined
							if (
								newValue === undefined &&
                                				action.value &&
                                				action.value.function === 'undefinedValue' &&
                                				ige.game.data.variables[action.variableName].hasOwnProperty('default')
							) {
								ige.game.data.variables[action.variableName].default = undefined;
							}
						}

						// not sure if we want to be doing this on the client
						// causing issues so disabled on client for now
						if (ige.isServer) {
							ige.variable.updateDevConsole({ type: 'setVariable', params: params });
						} else {
							// console.log('setVariable:', action.variableName, newValue);
						}

						break;

					case 'setTimeOut': // execute actions after timeout

						// const use for creating new instance of variable every time.
						const setTimeOutActions = JSON.parse(JSON.stringify(action.actions));
						// const setTimeoutVars = _.cloneDeep(vars);
						setTimeout(function (actions) {
							self.run(actions, vars);
						}, action.duration, setTimeOutActions);
						break;

					case 'repeat':
					{
						var count = ige.variable.getValue(action.count, vars);
						var repeatActions = ige.variable.getValue(action.actions, vars);

						if (!isNaN(count) && count > 0) {
							for (let i = 0; i < count; i++) {
								returnValue = self.run(repeatActions, vars);

								if (returnValue == 'break' || vars.break) {
									// we dont have to return a value in case of break otherwise
									// control will exit from for loop of actions as well
									// throw BreakException;
									vars.break = false;
									break;
								} else if (returnValue == 'return') {
									throw new Error('return without executing script');
								}
							}
						}
						break;
					}

					case 'runScript':
						var previousScriptId = ige.script.currentScriptId;
						ige.script.runScript(action.scriptName, vars);
						ige.script.currentScriptId = previousScriptId;
						break;

					case 'condition':
						if (ige.condition.run(action.conditions, vars)) {
							var brk = self.run(action.then, vars);
						} else {
							var brk = self.run(action.else, vars);
						}

						if (brk == 'break') {
							return 'break';
						} else if (brk == 'return') {
							return 'return';
						} else if (brk == 'continue') {
							return 'continue';
						}

						break;

					case 'transformRegionDimensions':
						var region = ige.variable.getValue(action.region, vars);
						// regionId seems like unnecessary stream data
						var regionId = action.region.variableName;
						if (region) {
							var x = ige.variable.getValue(action.x, vars);
							var y = ige.variable.getValue(action.y, vars);
							var width = ige.variable.getValue(action.width, vars);
							var height = ige.variable.getValue(action.height, vars);
							// this change makes it so we don't stream data that is unchanged
							var data = [
								{ x: x !== region._stats.default.x ? x : null },
								{ y: y !== region._stats.default.y ? y : null },
								{ width: width !== region._stats.default.width ? width : null },
								{ height: height !== region._stats.default.height ? height : null }
							];
							// there's gotta be a better way to do this, i'm just blind right now
							data = data.filter(obj => obj[Object.keys(obj)[0]] !== null);

							region.streamUpdateData(data);
						}

						break;

					case 'setLastAttackingUnit':
						var unit = ige.variable.getValue(action.unit, vars);
						ige.game.lastAttackingUnitId = unit.id();

						break;

					case 'setLastAttackedUnit':
						var unit = ige.variable.getValue(action.unit, vars);
						ige.game.lastAttackedUnitId = unit.id();

						break;

					case 'setLastAttackingItem':
						var item = ige.variable.getValue(action.item, vars);
						ige.game.lastAttackingItemId = item.id();

						break;

					case 'sendPostRequest':
						var obj = ige.variable.getValue(action.string, vars);
						var url = ige.variable.getValue(action.url, vars);
						var varName = ige.variable.getValue(action.varName, vars);

						try {
							obj = JSON.parse(obj);
						} catch (err) {
							console.error(err);
							return;
						}

						// ensure we aren't sending more than 30 POST requests within 10 seconds
						ige.server.postReqTimestamps.push(ige.currentTime());
						var oldestReqTimestamp = ige.server.postReqTimestamps[0]
						while (Date.now() - oldestReqTimestamp > 10000 && ige.server.postReqTimestamps.length > 0) {
							oldestReqTimestamp = ige.server.postReqTimestamps.shift();
						}
						if (ige.server.postReqTimestamps.length > 30) {
							ige.server.unpublish('Game server is sending too many POST requests. You cannot send more than 30 req per every 10s.');
						}

						ige.server.request.post({
						    url: url,
						    form: obj
						}, function optionalCallback (err, httpResponse, body) {
							if (err) {
							    return console.error('upload failed:', err);
							}

							try {
								var res = JSON.parse(body);
								var newValue = res.response;
								params['newValue'] = newValue;

								if (ige.game.data.variables.hasOwnProperty(varName)) {
									ige.game.data.variables[varName].value = newValue;
								}
							} catch (err) {
								console.error(err)
								if (ige.game.data.variables.hasOwnProperty(varName)) {
									ige.game.data.variables[varName].value = 'error';
								}
							}
						});

						break;

						/* Player */

					case 'kickPlayer':
						var player = ige.variable.getValue(action.entity, vars);
						if (player && player._category == 'player') {
							player.streamUpdateData([{ playerJoined: false }]);
						}

						break;

					case 'playEntityAnimation':
						var animationId = ige.variable.getValue(action.animation, vars);
						// console.log('playing unit animation!', animationId);
						var entity = ige.variable.getValue(action.entity, vars);
						if (entity) {
							entity.streamUpdateData([{ anim: animationId }]);
						}

						break;

					case 'setPlayerAttribute':

						var attrId = ige.variable.getValue(action.attribute, vars);
						var player = entity;
						if (player && player._category == 'player' && player._stats.attributes) {
							var attribute = player._stats.attributes[attrId];
							if (attribute != undefined) {
								var decimalPlace = parseInt(attribute.decimalPlaces) || 0;
								var value = parseFloat(ige.variable.getValue(action.value, vars)).toFixed(decimalPlace);
								player.attribute.update(attrId, value, true); // update attribute, and check for attribute becoming 0
							}
						}

						break;

					case 'setPlayerAttributeMax':
						var attrId = ige.variable.getValue(action.attributeType, vars);
						var player = ige.variable.getValue(action.player, vars);
						var maxValue = ige.variable.getValue(action.number, vars);
						if (player && player._category == 'player' && player._stats.attributes && player._stats.attributes[attrId] != undefined) {
							var max = {};
							max[attrId] = maxValue;

							player.streamUpdateData([{ attributesMax: max }]);
						}

						break;
					case 'setPlayerAttributeMin':
						var attrId = ige.variable.getValue(action.attributeType, vars);
						var player = ige.variable.getValue(action.player, vars);
						var minValue = ige.variable.getValue(action.number, vars);
						if (player && player._category == 'player' && player._stats.attributes && player._stats.attributes[attrId] != undefined) {
							var min = {};
							min[attrId] = minValue;

							player.streamUpdateData([{ attributesMin: min }]);
						}

						break;
					case 'setPlayerAttributeRegenerationRate':
						var attrId = ige.variable.getValue(action.attributeType, vars);
						var player = ige.variable.getValue(action.player, vars);
						var regenerateRateValue = ige.variable.getValue(action.number, vars);
						if (player && player._category == 'player' && player._stats.attributes && player._stats.attributes[attrId] != undefined) {
							var regRate = {};
							regRate[attrId] = regenerateRateValue;

							player.streamUpdateData([{ attributesRegenerateRate: regRate }]);
						}

						break;
					case 'setPlayerName':

						var name = ige.variable.getValue(action.name, vars);
						var player = ige.variable.getValue(action.player, vars);

						if (player && player._category == 'player') {
							player.streamUpdateData([{ name: name }]);
						}

						break;

					case 'assignPlayerType':
						var playerTypeId = ige.variable.getValue(action.playerType, vars);

						if (entity && entity._category == 'player') {
							var player = entity;
							player.streamUpdateData([{ playerTypeId: playerTypeId }]);
						}

						break;

					case 'setPlayerVariable':
						var player = ige.variable.getValue(action.player, vars);
						var variable = ige.variable.getValue(action.variable, vars);
						var value = ige.variable.getValue(action.value, vars);

						if (variable && player && player.variables && player.variables[variable.key]) {
							var isDataTypeSame = false;
							var variableObj = player.variables[variable.key];

							switch (variableObj.dataType) {
								case 'string':
								case 'boolean':
								case 'number': {
									isDataTypeSame = typeof value === variableObj.dataType;
									break;
								}
								case 'position': {
									isDataTypeSame = typeof value === 'object' &&
                                        value.x &&
                                        value.y;
									break;
								}
								case 'item':
								case 'player':
								case 'unit': {
									isDataTypeSame = typeof value === 'object' &&
                                        value._category === variableObj.dataType;
									break;
								}
								default: {
									// figure out how to validate for other types like itemType, unitType, ..., etc.
									isDataTypeSame = true;
									break;
								}
							}

							if (isDataTypeSame) {
								variableObj.value = value;
							} else if (typeof value === 'undefined' && action.value && action.value.function === 'undefinedValue') {
								// dev intentionally set value as undefined
								variableObj.value = undefined;

								// if variable has default field then it will be returned when variable's value is undefined
								if (variableObj.default) {
									variableObj.default = undefined;
								}
							} else {
								ige.devLog('datatype of value does not match datatype of variable');
							}
						}

						break;
					case 'changeDescriptionOfItem':
						var item = ige.variable.getValue(action.item, vars);
						var description = ige.variable.getValue(action.string, vars);
						if (item && description) {
							item.streamUpdateData([{ description: description }]);
						}
						break;

					case 'changeItemInventoryImage':
						var item = ige.variable.getValue(action.item, vars);
						var url = ige.variable.getValue(action.url, vars);
						if (item && url) {
							item.streamUpdateData([{ inventoryImage: url }]);
						}
						break;

					case 'startAcceptingPlayers':
						ige.clusterClient.setAcceptingPlayerStatus(true);
						break;

					case 'stopAcceptingPlayers':
						ige.clusterClient.setAcceptingPlayerStatus(false);
						break;
					case 'saveUnitData':
						var unit = ige.variable.getValue(action.unit, vars);
						var ownerPlayer = unit.getOwner();
						var userId = ownerPlayer._stats.userId;

						if (unit && ownerPlayer && userId && ownerPlayer.persistentDataLoaded) {
							var data = unit.getPersistentData('unit');
							ige.clusterClient.saveUserData(userId, data, 'unit');
						} else {
							if (!unit.persistentDataLoaded) {
								ige.devLog('Fail saving unit data bcz persisted data not set correctly');
							} else {
								ige.devLog('Fail saving unit data');
							}
						}
						break;
					case 'savePlayerData':
						var player = ige.variable.getValue(action.player, vars);
						var userId = player && player._stats && player._stats.userId;

						if (player && userId && player.persistentDataLoaded) {
							var data = player.getPersistentData('player');
							ige.clusterClient.saveUserData(userId, data, 'player');

							var unit = player.getSelectedUnit();
							var userId = player._stats.userId;

							if (unit && player && userId && unit.persistentDataLoaded) {
								var data = unit.getPersistentData('unit');
								ige.clusterClient.saveUserData(userId, data, 'unit');
							} else {
								if (!unit.persistentDataLoaded) {
									ige.devLog('Fail saving unit data bcz persisted data not set correctly');
								} else {
									ige.devLog('Fail saving unit data');
								}
							}
						} else {
							if (!player.persistentDataLoaded) {
								ige.devLog('Fail saving unit data bcz persisted data not set correctly');
							} else {
								ige.devLog('Fail saving player data');
							}
						}

						break;

					case 'makePlayerSelectUnit':
						var player = ige.variable.getValue(action.player, vars);
						var unit = ige.variable.getValue(action.unit, vars);
						if (player && unit) {
							player.selectUnit(unit.id());
						}

						break;

						/* UI */
					case 'showUiTextForPlayer':
						if (entity && entity._stats) {
							var text = ige.variable.getValue(action.value, vars);
							ige.gameText.updateText({ target: action.target, value: text, action: 'show' }, entity._stats.clientId);
						}
						break;

					case 'showUiTextForEveryone':
						var text = ige.variable.getValue(action.value, vars);
						ige.gameText.updateText({ target: action.target, value: text, action: 'show' });
						break;

					case 'hideUiTextForPlayer':
						if (entity && entity._stats) {
							var text = ige.variable.getValue(action.value, vars);
							ige.gameText.updateText({ target: action.target, value: text, action: 'hide' }, entity._stats.clientId);
						}
						break;

					case 'hideUiTextForEveryone':
						var text = ige.variable.getValue(action.value, vars);
						ige.gameText.updateText({ target: action.target, value: text, action: 'hide' });
						break;

					case 'updateUiTextForTimeForPlayer':
						var text = ige.variable.getValue(action.value, vars);
						var player = ige.variable.getValue(action.player, vars);
						var time = ige.variable.getValue(action.time, vars);
						// don't send text to AI players. If player is undefined, then send to all players
						if (player == undefined || (player && player._stats && player._stats.controlledBy == 'human')) {
							ige.gameText.updateTextForTime({
								target: action.target,
								value: text,
								action: 'update',
								time
							}, player && player._stats && player._stats.clientId);
						}
						break;

					case 'updateUiTextForPlayer':
						if (entity && entity._stats) {
							var text = ige.variable.getValue(action.value, vars);
							ige.gameText.updateText({ target: action.target, value: text, action: 'update' }, entity._stats.clientId);
						}
						break;

					case 'showGameSuggestionsForPlayer':

						var player = ige.variable.getValue(action.player, vars);
						if (player && player._stats && player._stats.clientId) {
							ige.network.send('gameSuggestion', { type: 'show' }, player._stats.clientId);
						}

						break;

					case 'hideGameSuggestionsForPlayer':

						var player = ige.variable.getValue(action.player, vars);
						if (player && player._stats && player._stats.clientId) {
							ige.network.send('gameSuggestion', { type: 'hide' }, player._stats.clientId);
						}
						break;

					case 'updateUiTextForEveryone':
						var text = ige.variable.getValue(action.value, vars);
						ige.gameText.updateText({ target: action.target, value: text, action: 'update' });
						break;

					case 'showInputModalToPlayer':
						var player = ige.variable.getValue(action.player, vars);
						var inputLabel = ige.variable.getValue(action.inputLabel, vars);

						if (player && player._stats && player._stats.clientId) {
							ige.network.send('ui', {
								command: 'showInputModal',
								fieldLabel: inputLabel,
								isDismissible: false
							}, player._stats.clientId);
						}
						break;
					case 'showDismissibleInputModalToPlayer':
						var player = ige.variable.getValue(action.player, vars);
						var inputLabel = ige.variable.getValue(action.inputLabel, vars);

						if (player && player._stats && player._stats.clientId) {
							ige.network.send('ui', {
								command: 'showInputModal',
								fieldLabel: inputLabel,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'showCustomModalToPlayer':
						var player = ige.variable.getValue(action.player, vars);
						var htmlContent = ige.variable.getValue(action.htmlContent, vars) || '';
						var modalTitle = ige.variable.getValue(action.title, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							ige.network.send('ui', {
								command: 'showCustomModal',
								title: modalTitle,
								content: htmlContent,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'showWebsiteModalToPlayer':
						var player = ige.variable.getValue(action.player, vars);
						var url = ige.variable.getValue(action.string, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							ige.network.send('ui', {
								command: 'showWebsiteModal',
								url: url,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'showSocialShareModalToPlayer':
						var player = ige.variable.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							ige.network.send('ui', {
								command: 'showSocialShareModal',
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'openWebsiteForPlayer':
						var player = ige.variable.getValue(action.player, vars);
						var url = ige.variable.getValue(action.string, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							ige.network.send('ui', {
								command: 'openWebsite',
								url: url,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;

					case 'showInviteFriendsModal':
						var player = ige.variable.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							ige.network.send('ui', {
								command: 'showFriendsModal'
							}, player._stats.clientId);
						}
						break;

					case 'showMenu':
						var player = ige.variable.getValue(action.player, vars);
						if (player && player._stats) {
							ige.network.send('ui', { command: 'showMenu' }, player._stats.clientId);
						}
						break;

					case 'sendChatMessage':
						var message = ige.variable.getValue(action.message, vars);
						ige.chat.sendToRoom('1', message, undefined, undefined);
						break;

					case 'sendChatMessageToPlayer':
						var player = ige.variable.getValue(action.player, vars);
						if (player && player._category == 'player' && player._stats.clientId) {
							var clientId = player._stats.clientId;
							ige.chat.sendToRoom('1', ige.variable.getValue(action.message, vars), clientId, undefined);
						}

						break;

					case 'banPlayerFromChat':
						var player = ige.variable.getValue(action.player, vars);
						if (player) {
							player.streamUpdateData([{ banChat: true }]);
						}
						break;

					case 'unbanPlayerFromChat':
						var player = ige.variable.getValue(action.player, vars);
						if (player) {
							player.streamUpdateData([{ banChat: false }]);
						}
						break;

					case 'playerCameraSetZoom':
						var player = ige.variable.getValue(action.player, vars);
						var zoom = ige.variable.getValue(action.zoom, vars);
						if (player && player._category == 'player' && zoom != undefined && player._stats.clientId) {
							ige.network.send('camera', { cmd: 'zoom', zoom: zoom }, player._stats.clientId);
						}
						break;

					case 'showUnitInPlayerMinimap':
						var player = ige.variable.getValue(action.player, vars);
						var unit = ige.variable.getValue(action.unit, vars);
						var color = ige.variable.getValue(action.color, vars);

						if (player && unit && unit._category === 'unit' && player._stats && player._stats.clientId) {
							var clientId = player._stats.clientId;

							unit._stats.minimapUnitVisibleToClients[clientId] = color;

							ige.network.send('minimap', {
								type: 'showUnit',
								unitId: unit.id(),
								color: color
							}, player._stats.clientId);
						}

						break;

					case 'hideUnitInPlayerMinimap':
						var player = ige.variable.getValue(action.player, vars);
						var unit = ige.variable.getValue(action.unit, vars);
						var color = ige.variable.getValue(action.color, vars);

						if (player && unit && unit._category === 'unit' && player._stats && player._stats.clientId) {
							var clientId = player._stats.clientId;

							delete unit._stats.minimapUnitVisibleToClients[clientId];

							ige.network.send('minimap', {
								type: 'hideUnit',
								unitId: unit.id()
							}, player._stats.clientId);
						}

						break;

						/* Loops */
					case 'forAllUnits':
						if (action.unitGroup) {
							if (!vars) {
								vars = {};
							}
							var units = ige.variable.getValue(action.unitGroup, vars) || [];
							for (var l = 0; l < units.length; l++) {
								var unit = units[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedUnit: unit }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									ige.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									ige.devLog('return without executing script');
									return 'return';
								}
							}
						}
						break;

					case 'forAllPlayers':
						if (action.playerGroup) {
							if (!vars) {
								vars = {};
							}
							var players = ige.variable.getValue(action.playerGroup, vars) || [];
							for (var l = 0; l < players.length; l++) {
								var player = players[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedPlayer: player }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									ige.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									ige.devLog('return without executing script');
									return 'return';
								}
							}
						}
						break;

					case 'forAllItems':
						if (action.itemGroup) {
							if (!vars) {
								vars = {};
							}
							var items = ige.variable.getValue(action.itemGroup, vars) || [];
							for (var l = 0; l < items.length; l++) {
								var item = items[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedItem: item }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									ige.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									ige.devLog('return without executing script');
									return 'return';
								}
							}
						}
						break;

					case 'forAllProjectiles':
						if (action.projectileGroup) {
							if (!vars) {
								vars = {};
							}
							var projectiles = ige.variable.getValue(action.projectileGroup, vars) || [];
							for (var l = 0; l < projectiles.length; l++) {
								var projectile = projectiles[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedProjectile: projectile }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									ige.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									ige.devLog('return without executing script');
									return 'return';
								}
							}
						}
						break;

					case 'forAllEntities':
						if (action.entityGroup) {
							if (!vars) {
								vars = {};
							}
							var entities = ige.variable.getValue(action.entityGroup, vars) || [];
							for (var l = 0; l < entities.length; l++) {
								var entity = entities[l];
								// if (['unit', 'item', 'projectile', 'wall'].includes(entity._category)) {
								if (self.entityCategories.indexOf(entity._category) > -1) {
									var brk = self.run(action.actions, Object.assign(vars, { selectedEntity: entity }));

									if (brk == 'break' || vars.break) {
										vars.break = false;
										ige.devLog('break called');
										break;
									} else if (brk == 'continue') {
										continue;
									} else if (brk == 'return') {
										ige.devLog('return without executing script');
										return 'return';
									}
								}
							}
						}
						break;

					case 'forAllRegions':
						if (action.regionGroup) {
							if (!vars) {
								vars = {};
							}
							var regions = ige.variable.getValue(action.regionGroup, vars) || [];
							for (var l = 0; l < regions.length; l++) {
								var region = regions[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedRegion: region }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									ige.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									ige.devLog('return without executing script');
									return 'return';
								}
							}
						}
						break;

					case 'forAllUnitTypes':
						if (action.unitTypeGroup) {
							if (!vars) {
								vars = {};
							}

							// unlike other forAll... actions this action expects JSON instead of array
							// because unitTypeGroup variable is being stored as a JSON not an array.
							var unitTypes = ige.variable.getValue(action.unitTypeGroup, vars) || {};

							for (var unitTypeKey in unitTypes) {
								var brk = self.run(action.actions, Object.assign(vars, { selectedUnitType: unitTypeKey }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									ige.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									ige.devLog('return without executing script');
									return 'return';
								}
							}
						}
						break;

					case 'forAllItemTypes':
						if (action.itemTypeGroup) {
							if (!vars) {
								vars = {};
							}

							// unlike other forAll... actions this action expects JSON instead of array
							// because itemTypeGroup variable is being stored as a JSON not an array.
							var itemTypes = ige.variable.getValue(action.itemTypeGroup, vars) || {};

							// sorting items before they are used. which solves issue of getting first item in slot
							itemTypes = Object.keys(itemTypes);
							var itemsArr = _.map(itemTypes, (itemId) => {
								var item = ige.game.getAsset('itemTypes', itemId);
								if (item) {
									return {
										name: item.name,
										itemId: itemId
									};
								}
								return undefined;
							});

							sortedItems = _.orderBy(itemsArr, ['name'], 'asc');

							for (let i = 0; i < sortedItems.length; i++) {
								if (sortedItems[i]) {
									var itemTypeKey = sortedItems[i].itemId;
									var brk = self.run(action.actions, Object.assign(vars, { selectedItemType: itemTypeKey }));

									if (brk == 'break' || vars.break) {
										vars.break = false;
										ige.devLog('break called');
										break;
									} else if (brk == 'continue') {
										continue;
									} else if (brk == 'return') {
										ige.devLog('return without executing script');
										return 'return';
									}
								}
							}
						}
						break;

					case 'while':
						var loopCounter = 0;

						while (ige.condition.run(action.conditions, vars)) {
							var brk = self.run(action.actions, vars);
							if (brk == 'break' || vars.break) {
								// we dont have to return a value in case of break otherwise
								// control will exit from for loop of actions as well
								// return "break";
								vars.break = false;
								break;
							} else if (brk == 'return') {
								throw new Error('return without executing script');
							}

							loopCounter++;
							if (loopCounter > 10000) {
								var errorMsg = ige.script.errorLog('infinite loop detected');
								console.log(errorMsg);
								ige.server.unpublish(errorMsg);
							}
						}
						break;
					case 'for':
						var variables = ige.game.data.variables;
						var variableName = action.variableName;

						if (variables[variableName] !== undefined) {
							if (variables[variableName].dataType !== 'number') {
								throw new Error('`for` action only supports numeric variable');
							}

							var start = ige.variable.getValue(action.start, vars);
							var stop = ige.variable.getValue(action.stop, vars);

							// var incrementBy = stop >= start ? 1 : -1;
							// var checkCondition = function (value) {
							//     if (incrementBy === 1) {
							//         return value <= stop;
							//     }
							//     else {
							//         return value >= stop;
							//     }
							// }

							// checkCondition(variables[variableName].value); // condition
							for (
								variables[variableName].value = start; // initial value
								variables[variableName].value <= stop;
								variables[variableName].value += 1 // post iteration operation
							) {
								var brk = self.run(action.actions, vars);

								if (brk == 'break' || vars.break) {
									// we dont have to return a value in case of break otherwise
									// control will exit from for loop of actions as well
									// throw BreakException;
									vars.break = false;
									break;
								} else if (brk == 'return') {
									throw new Error('return without executing script');
								}
							}
						}

						break;

					case 'break':
						if (!vars) vars = {};
						vars.break = true;
						return 'break';
						break;

					case 'continue':
						return 'continue';
						break;

					case 'return':
						return 'return';
						break;

					case 'endGame':
						ige.server.kill('end game called');
						break;

						/* Unit */

					case 'createUnitAtPosition':
						var player = ige.variable.getValue(action.entity, vars);

						var unitTypeId = ige.variable.getValue(action.unitType, vars);
						var unitTypeData = ige.game.getAsset('unitTypes', unitTypeId);
						var spawnPosition = ige.variable.getValue(action.position, vars);
						var facingAngle = ige.variable.getValue(action.angle, vars) || 0;
						if (player && spawnPosition && unitTypeId && unitTypeData) {
							var data = Object.assign(
								unitTypeData,
								{
									type: unitTypeId,
									defaultData: {
										translate: spawnPosition,
										rotate: facingAngle
									}
								}
							);

							var unit = player.createUnit(data);
							ige.game.lastCreatedUnitId = unit.id();
						} else {
							ige.script.errorLog('cannot create unit. parameters are spawnPosition:', spawnPosition, ' player:', !!player, ' unitTypeId:', unitTypeId);
							if (!player) invalidParameters.push('player');
							if (!spawnPosition) invalidParameters.push('spawn position');
							if (!unitTypeId) invalidParameters.push('unit type');
							throw new Error(`cannot create unit. invalid parameter(s) given: ${invalidParameters.toString()}`);
						}

						break;

					case 'changeUnitType':

						var unitTypeId = ige.variable.getValue(action.unitType, vars);
						if (entity && entity._category == 'unit' && unitTypeId != null) {
							entity.streamUpdateData([{ type: unitTypeId }]);
						} else {
							ige.script.errorLog('invalid unit / unitTypeId');
							if (!entity) invalidParameters.push('unit');
							if (!unitTypeId) invalidParameters.push('unit type');
							throw new Error(`cannot change unit type. invalid parameter(s) given: ${invalidParameters.toString()}`);
						}

						break;

					case 'changeUnitSpeed':

						var bonusSpeed = ige.variable.getValue(action.unitSpeed, vars);

						if (entity != undefined && entity._stats != undefined && entity._category != undefined && bonusSpeed != undefined) {
							entity.streamUpdateData([{ bonusSpeed: bonusSpeed }]);
						}

						break;

					case 'changeSensorRadius':
						var sensor = ige.variable.getValue(action.sensor, vars);
						var radius = ige.variable.getValue(action.radius, vars);
						// console.log("changeSensorRadius", sensor.id(), radius)
						if (sensor && sensor._category == 'sensor') {
							if (!isNaN(radius)) {
								sensor.updateRadius(radius);
							}
						}
						break;

					case 'stunUnit':
						var unit = ige.variable.getValue(action.unit, vars);
						if (unit && unit._stats) {
							unit.ability.stopUsingItem();
							unit.streamUpdateData([{ isStunned: true }]);
							var item = unit.getCurrentItem();
							if (item) {
								item.streamUpdateData([{ stopUsing: false }]);
							}
						}
						break;

					case 'removeStunFromUnit':
						var unit = ige.variable.getValue(action.unit, vars);
						if (unit && unit._stats) {
							unit.streamUpdateData([{ isStunned: false }]);
						}
						break;

					case 'setEntityVelocityAtAngle':

						var entity = ige.variable.getValue(action.entity, vars);
						var speed = ige.variable.getValue(action.speed, vars) || 0;
						var radians = ige.variable.getValue(action.angle, vars); // entity's facing angle
						if (entity && radians !== undefined && !isNaN(radians) && !isNaN(speed)) {
							radians -= Math.radians(90);
							// console.log("2. setting linear velocity", radians, speed)
							// entity.body.setLinearVelocity(new IgePoint3d(Math.cos(radians) * speed, Math.sin(radians) * speed, 0));
							// entity.setLinearVelocityLT(Math.cos(radians) * speed, Math.sin(radians) * speed);
							entity.setLinearVelocity(Math.cos(radians) * speed, Math.sin(radians) * speed);
						}

						break;

					case 'setVelocityOfEntityXY':
						// action.forceX
						var entity = ige.variable.getValue(action.entity, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var velocityX = ige.variable.getValue(action.velocity.x, vars);
							if (velocityX == undefined || isNaN(velocityX)) {
								velocityX = 0;
							}

							var velocityY = ige.variable.getValue(action.velocity.y, vars);
							if (velocityY == undefined || isNaN(velocityY)) {
								velocityY = 0;
							}
							entity.setLinearVelocity(velocityX, velocityY);
						} else {
							ige.script.errorLog('invalid entity');
						}

						break;

					case 'setUnitOwner':
						var unit = ige.variable.getValue(action.unit, vars);
						var player = ige.variable.getValue(action.player, vars);
						if (unit && player) {
							unit.setOwnerPlayer(player.id());
						}

						break;

					case 'setUnitNameLabel':
						var unit = ige.variable.getValue(action.unit, vars);
						var name = ige.variable.getValue(action.name, vars);
						if (unit) {
							unit.streamUpdateData([{ name: name }]);
						}

						break;

					case 'setItemName':
						var item = ige.variable.getValue(action.item, vars);
						var name = ige.variable.getValue(action.name, vars);
						if (item) {
							item.streamUpdateData([{ name: name }]);
						}

						break;

					case 'setFadingTextOfUnit':
						var unit = ige.variable.getValue(action.unit, vars);
						var text = ige.variable.getValue(action.text, vars);
						var color = ige.variable.getValue(action.color, vars);

						if (unit && unit._category === 'unit' && text !== undefined) {
							unit.streamUpdateData([
								{ setFadingText: `${text}|-|${color}` }
							]);
						}

						break;
					case 'createFloatingText':
						var position = ige.variable.getValue(action.position, vars);
						var text = ige.variable.getValue(action.text, vars);
						var color = ige.variable.getValue(action.color, vars);
						ige.network.send('createFloatingText', { position: position, text: text, color: color });
						break;

						/* Item */

					case 'startUsingItem':
						if (entity && entity._category == 'item') {
							entity.startUsing();
							entity.streamUpdateData([{ isBeingUsedFromScript: true }]);
						}
						break;

					case 'useItemOnce':
						var item = ige.variable.getValue(action.item, vars);
						if (item && item._category == 'item') {
							item.use();
						}
						break;

					case 'stopUsingItem':
						if (entity && entity._category == 'item') {
							entity.stopUsing();
							entity.streamUpdateData([{ isBeingUsedFromScript: false }]);
							entity.streamUpdateData([{ stopUsing: false }]);
						}

						break;

					case 'updateItemQuantity':
						var item = ige.variable.getValue(action.entity, vars);
						var quantity = ige.variable.getValue(action.quantity, vars);
						if (item && item._category == 'item') {
							item.streamUpdateData([{ quantity: quantity }]);
						}
						break;

					case 'setItemFireRate':
						var item = ige.variable.getValue(action.item, vars);
						var value = ige.variable.getValue(action.number, vars);

						if (item && item._category == 'item') {
							item.streamUpdateData([{ fireRate: value }]);
						}
						break;

					case 'changeInventorySlotColor':
						var item = ige.variable.getValue(action.item, vars);
						var color = ige.variable.getValue(action.string, vars);
						if (item && color) {
							item.streamUpdateData([{ inventorySlotColor: color }]);
						}
						break;

					case 'setItemAmmo':
						var item = ige.variable.getValue(action.item, vars);
						var newAmmo = ige.variable.getValue(action.ammo, vars);

						// because in item stream update quantity value is decremented by 1
						newAmmo++;

						if (item && item._category === 'item' && item._stats.type === 'weapon' && !isNaN(newAmmo)) {
							item.streamUpdateData([{ quantity: newAmmo }]);
						}

					case 'dropItem':
						var entity = ige.variable.getValue(action.entity, vars);

						if (entity && entity._category === 'unit') {
							var item = entity.getCurrentItem();

							if (entity && item && entity._stats && entity._stats.itemIds) {
								var itemIndex = -1;

								for (itemIndex = 0; itemIndex < entity._stats.itemIds.length; itemIndex++) {
									if (item.id() === entity._stats.itemIds[itemIndex]) {
										break;
									}
								}

								if (itemIndex <= entity._stats.itemIds.length) {
									entity.dropItem(itemIndex);
								}
							}
						}
						break;

					case 'dropItemAtPosition':
						var item = ige.variable.getValue(action.item, vars);
						var position = ige.variable.getValue(action.position, vars);

						if (item) {
							if (item._stats && item._stats.controls && !item._stats.controls.undroppable) {
								var ownerUnit = item.getOwnerUnit();
								var itemIndex = item._stats.slotIndex;
								if (ownerUnit) {
									ownerUnit.dropItem(itemIndex, position);
								}
							} else {
								throw new Error(`unit cannot drop an undroppable item ${item._stats.name}`);
							}
						} else {
							throw new Error('invalid item');
						}
						break;

					case 'castAbility':
						if (entity && entity._category == 'unit' && entity.ability && action.abilityName) {
							entity.ability.cast(action.abilityName);
						}
						// else
						// entity.ability.cast()
						break;
					case 'dropAllItems':
						if (entity && entity._category == 'unit') {
							for (let i = 0; i < entity._stats.itemIds.length; i++) {
								if (entity._stats.itemIds[i]) {
									var item = entity.dropItem(i);
									// slightly push item away from the unit at random angles
									if (item) {
										randomForceX = Math.floor(Math.random() * 101) - 50;
										randomForceY = Math.floor(Math.random() * 101) - 50;
										item.applyForce(randomForceX, randomForceY);
									}
								}
							}
						}
						break;

					case 'openShopForPlayer':
						var player = ige.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							player._stats.lastOpenedShop = action.shop;
							ige.network.send('openShop', { type: action.shop }, player._stats.clientId);
						}
						break;

					case 'closeShopForPlayer':
						var player = ige.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							ige.network.send('ui', { command: 'closeShop' }, player._stats.clientId);
						}
						break;

					case 'openDialogueForPlayer':
						var player = ige.variable.getValue(action.player, vars);
						var primitiveVariables = ige.variable.getAllVariables([
							'string',
							'number',
							'boolean'
						]);

						if (player && player._category === 'player' && player._stats.clientId) {
							player._stats.lastOpenedDialogue = action.dialogue;
							ige.network.send('openDialogue', {
								type: action.dialogue,
								extraData: {
									playerName: player._stats && player._stats.name,
									variables: primitiveVariables,
									dialogueTemplate: _.get(ige, "game.data.ui.dialogueview.htmlData", "")
								}
							}, player._stats.clientId);
						}
						break;

					case 'closeDialogueForPlayer':
						var player = ige.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							ige.network.send('closeDialogue', player._stats.clientId);
						}
						break;

					case 'refillAmmo':
						var item = entity;
						if (item && item._category == 'item') {
							item.refillAmmo();
						}
						break;

					case 'dropItemInInventorySlot':
						var slotIndex = ige.variable.getValue(action.slotIndex, vars);
						var unit = ige.variable.getValue(action.unit, vars);
						if (unit && unit._category == 'unit' && slotIndex != undefined) {
							unit.dropItem(slotIndex - 1);
						}
						break;

						/* particles */
					case 'startItemParticle':
						var item = ige.variable.getValue(action.item, vars);
						var particleTypeId = ige.variable.getValue(action.particleType, vars);
						if (item && item._category == 'item' && item._stats.particles && item._stats.particles[particleTypeId]) {
							ige.network.send('particle', { eid: item.id(), pid: particleTypeId, action: 'start' });
						}
						break;

					case 'stopItemParticle':
						var item = ige.variable.getValue(action.item, vars);
						var particleTypeId = ige.variable.getValue(action.particleType, vars);
						if (item && item._category == 'item' && item._stats.particles && item._stats.particles[particleTypeId]) {
							ige.network.send('particle', { eid: item.id(), pid: particleTypeId, action: 'stop' });
						}
						break;

					case 'emitItemParticle':
						var item = ige.variable.getValue(action.item, vars);
						var particleTypeId = ige.variable.getValue(action.particleType, vars);
						if (item && item._category == 'item' && item._stats.particles && item._stats.particles[particleTypeId]) {
							ige.network.send('particle', { eid: item.id(), pid: particleTypeId, action: 'emitOnce' });
						}
						break;

					case 'startUnitParticle':
						var unit = ige.variable.getValue(action.unit, vars);
						var particleTypeId = ige.variable.getValue(action.particleType, vars);
						if (unit && unit._category == 'unit' && unit._stats.particles && unit._stats.particles[particleTypeId]) {
							ige.network.send('particle', { eid: unit.id(), pid: particleTypeId, action: 'start' });
						}
						break;

					case 'stopUnitParticle':
						var unit = ige.variable.getValue(action.unit, vars);
						var particleTypeId = ige.variable.getValue(action.particleType, vars);
						if (unit && unit._category == 'unit' && unit._stats.particles && unit._stats.particles[particleTypeId]) {
							ige.network.send('particle', { eid: unit.id(), pid: particleTypeId, action: 'stop' });
						}
						break;

					case 'emitUnitParticle':
						var unit = ige.variable.getValue(action.unit, vars);
						var particleTypeId = ige.variable.getValue(action.particleType, vars);
						if (unit && unit._category == 'unit' && unit._stats.particles && unit._stats.particles[particleTypeId]) {
							ige.network.send('particle', { eid: unit.id(), pid: particleTypeId, action: 'emitOnce' });
						}
						break;

					case 'emitParticleOnceAtPosition':
						var position = ige.variable.getValue(action.position, vars);
						var particleTypeId = ige.variable.getValue(action.particleType, vars);
						if (particleTypeId && position) {
							ige.network.send('particle', { pid: particleTypeId, action: 'emitOnce', position: position });
						}
						break;

					case 'rotateUnitClockwise':
						var torque = ige.variable.getValue(action.torque, vars);
						if (entity && entity._category == 'unit' && entity.body && !isNaN(torque)) {
							// entity.body.m_torque = entity._stats.body.rotationSpeed
							entity.body.m_torque = torque;
						} else {
							// ige.script.errorLog( action.type + " - invalid unit")
						}
						break;

						// is deprecated ?
					case 'rotateUnitCounterClockwise':
						var torque = ige.variable.getValue(action.torque, vars);
						if (entity && entity._category == 'unit' && entity.body && !isNaN(torque)) {
							// entity.body.m_torque = -1 * entity._stats.body.rotationSpeed
							entity.body.m_torque = -1 * torque;
						} else {
							// ige.script.errorLog( action.type + " - invalid unit")
						}
						break;

					case 'makeUnitToAlwaysFacePosition':
						if (entity && entity._category == 'unit') {
							var position = ige.variable.getValue(action.position, vars);
							if (!isNaN(position.x) && !isNaN(position.y)) {
								entity.isLookingAt = position;
							}
						}
						break;

					case 'makeUnitToAlwaysFaceMouseCursor':
						if (entity && entity._category == 'unit') {
							entity.isLookingAt = 'mouse';
						}
						break;

					case 'makeUnitInvisible':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([
								{ isInvisible: true },
								{ isNameLabelHidden: true }
							]);
						}
						break;

					case 'makeUnitVisible':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([
								{ isInvisible: false },
								{ isNameLabelHidden: false }
							]);
						}
						break;

					case 'makeUnitInvisibleToFriendlyPlayers':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([
								{ isInvisibleToFriendly: true },
								{ isNameLabelHiddenToFriendly: true }
							]);
						}
						break;
						'';
					case 'makeUnitVisibleToFriendlyPlayers':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([
								{ isInvisibleToFriendly: false },
								{ isNameLabelHiddenToFriendly: false }
							]);
						}
						break;

					case 'hideUnitNameLabelFromPlayer':
						var unit = ige.variable.getValue(action.entity, vars);
						var player = ige.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							ige.network.send('hideUnitNameLabelFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'showUnitNameLabelToPlayer':
						var unit = ige.variable.getValue(action.entity, vars);
						var player = ige.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							ige.network.send('showUnitNameLabelFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'hideUnitFromPlayer':
						var unit = ige.variable.getValue(action.entity, vars);
						var player = ige.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							ige.network.send('hideUnitFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'showUnitToPlayer':
						var unit = ige.variable.getValue(action.entity, vars);
						var player = ige.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							ige.network.send('showUnitFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'makeUnitInvisibleToNeutralPlayers':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([
								{ isInvisibleToNeutral: true },
								{ isNameLabelHiddenToNeutral: true }
							]);
						}
						break;

					case 'makeUnitVisibleToNeutralPlayers':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([
								{ isInvisibleToNeutral: false },
								{ isNameLabelHiddenToNeutral: false }
							]);
						}
						break;

					case 'hideUnitNameLabel':
						var playerTypeId = ige.variable.getValue(action.playerType, vars);
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isNameLabelHidden: true }]);
						}
						break;

					case 'showUnitNameLabel':
						var playerTypeId = ige.variable.getValue(action.playerType, vars);
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isNameLabelHidden: false }]);
						}
						break;

						/* projectile */

					case 'createProjectileAtPosition':
						var projectileTypeId = ige.variable.getValue(action.projectileType, vars);
						var position = ige.variable.getValue(action.position, vars);
						var force = ige.variable.getValue(action.force, vars);
						var unit = ige.variable.getValue(action.unit, vars);
						var angle = ige.variable.getValue(action.angle, vars);
						var error = '';
						var delta = Math.radians(90); // unitsFacingAngle delta
						var facingAngleDelta = 0;
						if (action.angle && action.angle.function == 'angleBetweenPositions') {
							delta = 0;
							facingAngleDelta = Math.radians(90);
						}

						if (projectileTypeId) {
							var projectileData = ige.game.getAsset('projectileTypes', projectileTypeId);

							if (projectileData != undefined && position != undefined && position.x != undefined && position.y != undefined && force != undefined && angle != undefined) {
								var facingAngleInRadians = angle + facingAngleDelta;
								angle = angle - delta;
								var streamMode = 1;
								var unitId = (unit) ? unit.id() : undefined;
								var data = Object.assign(
									projectileData,
									{
										type: projectileTypeId,
										bulletForce: force,
										sourceItemId: undefined,
										sourceUnitId: unitId,
										defaultData: {
											rotate: facingAngleInRadians,
											translate: position,
											velocity: {
												x: Math.cos(angle) * force,
												y: Math.sin(angle) * force
											}
										},
										streamMode: streamMode
									}
								);

								var projectile = new Projectile(data);
								ige.game.lastCreatedProjectileId = projectile._id;
							} else {
								if (!projectileData) {
									ige.script.errorLog('invalid projectile data');
								}
								if (!position || position.x == undefined || position.y == undefined) {
									ige.script.errorLog('invalid position data');
								}
								if (force == undefined) {
									ige.script.errorLog('invalid force value');
								}
								if (angle == undefined) {
									ige.script.errorLog('invalid angle value');
								}
							}
						}
						break;

						/* Camera */
					case 'playerCameraTrackUnit':
						var unit = ige.variable.getValue(action.unit, vars);
						var player = ige.variable.getValue(action.player, vars);
						if (unit && player && player._stats.clientId) {
							player.cameraTrackUnit(unit);
						}
						break;

					case 'changePlayerCameraPanSpeed':
						var panSpeed = ige.variable.getValue(action.panSpeed, vars);
						var player = ige.variable.getValue(action.player, vars);

						if (player && player._stats.clientId) {
							player.changeCameraPanSpeed(panSpeed);
						}
						break;
					case 'positionCamera':
						var position = ige.variable.getValue(action.position, vars);
						var player = ige.variable.getValue(action.player, vars);

						if (position && player && player._stats.clientId) {
							ige.network.send('camera', { cmd: 'positionCamera', position: position }, player._stats.clientId);
						}
						break;

					case 'createItemAtPositionWithQuantity':
						var itemTypeId = ige.variable.getValue(action.itemType, vars);
						var position = ige.variable.getValue(action.position, vars);
						var quantity = ige.variable.getValue(action.quantity, vars);
						var itemData = ige.game.getAsset('itemTypes', itemTypeId);
						if (quantity == -1 || !quantity) {
							quantity = null;
						}

						if (itemData) {
							itemData.itemTypeId = itemTypeId;
							itemData.isHidden = false;
							itemData.stateId = 'dropped';
							itemData.quantity = quantity;
							itemData.initialTransform = {
								position: position,
								facingAngle: Math.random(0, 700) / 100
							};
							var item = new Item(itemData);
						} else {
							ige.script.errorLog('invalid item type data');
						}
						break;
						/* depreciated and can be removed */
					case 'createItemWithMaxQuantityAtPosition':
						var itemTypeId = ige.variable.getValue(action.itemType, vars);
						var itemData = ige.game.getAsset('itemTypes', itemTypeId);
						var position = ige.variable.getValue(action.position, vars);
						var quantity = itemData.maxQuantity;

						if (quantity == -1) {
							quantity = null;
						}

						if (itemData) {
							itemData.itemTypeId = itemTypeId;
							itemData.isHidden = false;
							itemData.stateId = 'dropped';
							itemData.spawnPosition = position;
							itemData.quantity = quantity;
							itemData.defaultData = {
								translate: position,
								rotate: Math.random(0, 700) / 100
							};
							var item = new Item(itemData);
						} else {
							ige.script.errorLog('invalid item type data');
						}
						break;
					case 'spawnItem':

						var itemTypeId = ige.variable.getValue(action.itemType, vars);
						var itemData = ige.game.getAsset('itemTypes', itemTypeId);
						var position = ige.variable.getValue(action.position, vars);

						if (itemData) {
							itemData.itemTypeId = itemTypeId;
							itemData.isHidden = false;
							itemData.stateId = 'dropped';
							itemData.defaultData = {
								translate: position,
								rotate: Math.random(0, 700) / 100
							};
							var item = new Item(itemData);
						} else {
							ige.script.errorLog('invalid item type data');
						}
						break;
					case 'giveNewItemToUnit':
						var itemTypeId = ige.variable.getValue(action.itemType, vars);
						var itemData = ige.game.getAsset('itemTypes', itemTypeId);
						var unit = ige.variable.getValue(action.unit, vars);

						if (itemData && unit && unit._category == 'unit') {
							itemData.itemTypeId = itemTypeId;
							itemData.defaultData = {
								translate: unit._translate,
								rotate: unit._rotate.z
							};
							unit.pickUpItem(itemData);
						}

						break;

					case 'giveNewItemWithQuantityToUnit':
						var itemTypeId = ige.variable.getValue(action.itemType, vars);
						var itemData = ige.game.getAsset('itemTypes', itemTypeId);
						var unit = null;

						if (itemData) {
							if (action.hasOwnProperty('number')) {
								// this is new version of action
								unit = ige.variable.getValue(action.unit, vars);
								quantity = ige.variable.getValue(action.number, vars);
							} else {
								// this is old version of action
								unit = ige.variable.getValue(action.entity, vars);
								quantity = ige.variable.getValue(action.quantity, vars);
							}

							// -1 means infinite quantity
							if (quantity == -1) {
								quantity = null;
							}

							if (action.type === 'giveNewItemToUnit') {
								quantity = itemData.quantity;
							}

							if (unit && unit._category == 'unit') {
								itemData.itemTypeId = itemTypeId;
								itemData.quantity = quantity;
								itemData.defaultData = {
									translate: unit._translate,
									rotate: unit._rotate.z
								};
								unit.pickUpItem(itemData);
							} else // error log
							{
								if (unit == undefined || unit._category != 'unit')
									ige.script.errorLog('unit doesn\'t exist');
								// else
								//  ige.script.errorLog("giveNewItemToUnit: cannot add item to unit's inventory")
							}
						}
						break;

					case 'makeUnitSelectItemAtSlot':
						var unit = ige.variable.getValue(action.unit, vars);
						var slotIndex = ige.variable.getValue(action.slotIndex, vars);
						slotIndex = slotIndex - 1;
						if (unit) {
							unit.changeItem(slotIndex);
						} else // error log
						{
							if (unit == undefined || unit._category != 'unit')
								ige.script.errorLog('unit doesn\'t exist');
						}

						break;

						/* Ads */

					case 'playAdForEveryone':
						if (!ige.ad.lastPlayedAd || ((Date.now() - ige.ad.lastPlayedAd) >= 60000)) {
							ige.ad.play({ type: 'preroll' });
							ige.ad.lastPlayedAd = Date.now();
						}
						break;

					case 'playAdForPlayer':
						if (action.entity) {
							var unit = ige.variable.getValue(action.entity, vars);
							if (unit && unit._stats && unit._stats.clientId) {
								if (!ige.ad.lastPlayedAd || ((Date.now() - ige.ad.lastPlayedAd) >= 60000)) {
									ige.ad.play({ type: 'preroll' }, unit._stats.clientId);
								}
							}
						}
						break;
					case 'makeUnitPickupItem':
						var item = ige.variable.getValue(action.item, vars);
						var unit = ige.variable.getValue(action.unit, vars);
						// pickup ownerLess items
						if (unit && unit._category == 'unit' && item && item._category === 'item' && !item.getOwnerUnit()) {
							unit.pickUpItem(item);
						} else // error log
						{
							if (unit == undefined || unit._category != 'unit')
								ige.script.errorLog('unit doesn\'t exist');
						}

						break;

						/* Sound */
					case 'playSoundAtPosition':
						var position = ige.variable.getValue(action.position, vars);
						var sound = ige.game.data.sound[action.sound];
						// if csp enable dont stream sound
						if (sound && position) {
							ige.network.send('sound', { id: action.sound, position: position });
						}
						break;

						/* Music */

					case 'playMusic':
						var music = ige.game.data.music[action.music];
						// if csp enable dont stream music
						if (music) {
							ige.network.send('sound', { cmd: 'playMusic', id: action.music });
						}

						break;

					case 'stopMusic':
						ige.network.send('sound', { cmd: 'stopMusic' });
						break;

					case 'playSoundForPlayer':
						var sound = ige.game.data.sound[action.sound];
						var player = ige.variable.getValue(action.player, vars);
						if (sound && player && player._stats.clientId) {
							ige.network.send('sound', {
								cmd: 'playSoundForPlayer',
								sound: action.sound
							}, player._stats.clientId);
						}
						break;
					case 'stopSoundForPlayer':
						var sound = ige.game.data.sound[action.sound];
						var player = ige.variable.getValue(action.player, vars);
						if (sound && player && player._stats.clientId) {
							ige.network.send('sound', {
								cmd: 'stopSoundForPlayer',
								sound: action.sound
							}, player._stats.clientId);
						}
						break;
					case 'playMusicForPlayer':
						var music = ige.game.data.music[action.music];
						var player = ige.variable.getValue(action.player, vars);

						if (music && player && player._stats.clientId) {
							ige.network.send('sound', {
								cmd: 'playMusicForPlayer',
								music: action.music
							}, player._stats.clientId);
						}

						break;

					case 'playMusicForPlayerRepeatedly':
						var music = ige.game.data.music[action.music];
						var player = ige.variable.getValue(action.player, vars);
						if (music && player && player._category == 'player' && player._stats.clientId) {
							ige.network.send('sound', {
								cmd: 'playMusicForPlayerRepeatedly',
								music: action.music
							}, player._stats.clientId);
						}

						break;
					case 'showMenuAndSelectCurrentServer':

						var player = ige.variable.getValue(action.player, vars);
						if (player && player._stats && player._category == 'player' && player._stats.clientId) {
							ige.network.send('ui', {
								command: 'showMenuAndSelectCurrentServer'
							}, player._stats.clientId);
						}
						break;
					case 'showMenuAndSelectBestServer':
						var player = ige.variable.getValue(action.player, vars);

						if (player && player._stats && player._category == 'player' && player._stats.clientId) {
							ige.network.send('ui', {
								command: 'showMenuAndSelectBestServer'
							}, player._stats.clientId);
						}
						break;

					case 'stopMusicForPlayer':
						var player = ige.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							ige.network.send('sound', {
								cmd: 'stopMusicForPlayer'
							}, player._stats.clientId);
						}
						break;

						/* Entity */

					case 'flipEntitySprite':

						// console.log('flipUnitSprite:',action);
						var entity = ige.variable.getValue(action.entity, vars);

						var flipCode = 0;
						if (action.flip == 'horizontal') flipCode = 1;
						if (action.flip == 'vertical') flipCode = 2;
						if (action.flip == 'both') flipCode = 3;

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							entity.streamUpdateData([{ flip: flipCode }]);
						}

						break;

					case 'applyForceOnEntityXY':
					case 'applyForceOnEntityXYLT':

						// action.forceX
						var entity = ige.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var forceX = ige.variable.getValue(action.force.x, vars);
							if (forceX == undefined || isNaN(forceX)) {
								forceX = 0;
							}

							var forceY = ige.variable.getValue(action.force.y, vars);
							if (forceY == undefined || isNaN(forceY)) {
								forceY = 0;
							}

							entity.applyForce(forceX, forceY);
						} else {
							ige.script.errorLog('invalid entity');
						}

						break;

						/* Entity */
					case 'applyImpulseOnEntityXY':

						var entity = ige.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var impulseX = ige.variable.getValue(action.impulse.x, vars);
							if (impulseX == undefined || isNaN(impulseX)) {
								impulseX = 0;
							}

							var impulseY = ige.variable.getValue(action.impulse.y, vars);
							if (impulseY == undefined || isNaN(impulseY)) {
								impulseY = 0;
							}

							entity.applyImpulse(impulseX, impulseY);
						} else {
							ige.script.errorLog('invalid entity');
						}

						break;

					case 'applyForceOnEntityXYRelative':

						var entity = ige.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var radians = entity._rotate.z + Math.radians(-90); // entity's facing angle

							var forceX = ige.variable.getValue(action.force.x, vars);
							if (forceX == undefined || isNaN(forceX)) {
								forceX = 0;
							}

							var forceY = ige.variable.getValue(action.force.y, vars);
							if (forceY == undefined || isNaN(forceY)) {
								forceY = 0;
							}

							var force = {
								x: (Math.cos(radians) * forceY) + (Math.cos(radians) * forceX),
								y: (Math.sin(radians) * forceY) + (Math.sin(radians) * forceX)
							};

							// console.log('force angle is', force);

							entity.applyForce(force.x, force.y);
						}

						break;
					case 'applyForceOnEntityAngle':
						var entity = ige.variable.getValue(action.entity, vars);
						var angle = ige.variable.getValue(action.angle, vars);
						var force = ige.variable.getValue(action.force, vars);
						var radians = angle - Math.radians(90); // entity's facing angle

						if (!isNaN(radians) && !isNaN(force) && entity && self.entityCategories.indexOf(entity._category) > -1) {
							force = {
								x: Math.cos(radians) * force,
								y: Math.sin(radians) * force
							};
							entity.applyForce(force.x, force.y);
						}

						break;

					case 'applyForceOnEntityAngleLT':
						var entity = ige.variable.getValue(action.entity, vars);
						var angle = ige.variable.getValue(action.angle, vars);
						var force = ige.variable.getValue(action.force, vars);
						var radians = angle - Math.radians(90); // entity's facing angle

						if (!isNaN(radians) && !isNaN(force) && entity && self.entityCategories.indexOf(entity._category) > -1) {
							force = {
								x: Math.cos(radians) * force,
								y: Math.sin(radians) * force
							};

							// entity.applyForceLT(force.x, force.y);
							entity.applyForce(force.x, force.y);
						}

						break;

					case 'createEntityForPlayerAtPositionWithDimensions':
					case 'createEntityAtPositionWithDimensions':

						let isSandbox = typeof mode === 'string' && mode === 'sandbox';
						let entityType = ige.variable.getValue(action.entityType, vars);
						let entityToCreate = ige.variable.getValue(action.entity, vars);
						var position = ige.variable.getValue(action.position, vars);
						var height = ige.variable.getValue(action.height, vars) || 100;
						var width = ige.variable.getValue(action.width, vars) || 100;
						var angle = ige.variable.getValue(action.angle, vars) || 0;

						const entityTypeData = ige.game.data[entityType] && ige.game.data[entityType][entityToCreate];

						if (entityType && entityToCreate && position && height && width) {
							let data = Object.assign({}, entityTypeData);

							position.x = parseFloat(position.x);
							position.y = parseFloat(position.y);
							angle = parseFloat(angle);
							var angleInRadians = Math.radians(angle);
							height = parseFloat(height);
							width = parseFloat(width);

							let createdEntity = null;

							if (entityType === 'itemTypes') {
								data.itemTypeId = entityToCreate;
								data.isHidden = false;
								data.stateId = 'dropped';
								data.defaultData = {
									translate: position,
									rotate: angleInRadians
								};
								data.height = height;
								data.width = width;
								data.scaleDimensions = true;

								createdEntity = new Item(_.cloneDeep(data));

								ige.game.lastCreatedItemId = createdEntity._id;
							} else if (entityType === 'projectileTypes') {
								data = Object.assign(data, {
									type: entityToCreate,
									bulletForce: force,
									sourceItemId: undefined,
									sourceUnitId: unitId,
									defaultData: {
										translate: position,
										rotate: angleInRadians
									},
									height: height,
									width: width,
									scaleDimensions: true,
									streamMode: 1
								});

								createdEntity = new Projectile(_.cloneDeep(data));
								ige.game.lastCreatedProjectileId = createdEntity._id;
							} else if (entityType === 'unitTypes') {
								data = Object.assign(data, {
									type: entityToCreate,
									defaultData: {
										translate: position,
										rotate: angleInRadians
									},
									height: height,
									width: width,
									scaleDimensions: true
								});

								if (isSandbox) {
									createdEntity = new Unit(data);
								} else {
									var player = ige.variable.getValue(action.player, vars);
									if (player) {
										createdEntity = player.createUnit(_.cloneDeep(data));
									}
								}
								ige.game.lastCreatedUnitId = createdEntity._id;
							}
							createdEntity.scriptValues = {
								index: i,
								x: position.x,
								y: position.y,
								type: entityType,
								player: action.player && action.player.variableName,
								entity: entityToCreate,
								rotation: angle,
								height: height,
								width: width
							};
							if (isSandbox) {
								if (!ige.game.createdEntities) ige.game.createdEntities = [];
								ige.game.createdEntities.push(createdEntity);
							}
						}
						break;
					case 'setEntityDepth':
						var entity = ige.variable.getValue(action.entity, vars);
						var depth = ige.variable.getValue(action.depth, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && typeof depth === 'number') {
							entity.streamUpdateData([{ depth: depth }]);
						}

						break;

					case 'setEntityLifeSpan':
						var entity = ige.variable.getValue(action.entity, vars);
						var lifespan = ige.variable.getValue(action.lifeSpan, vars);

						if (entity && lifespan != undefined && !isNaN(parseFloat(lifespan))) {
							entity.lifeSpan(lifespan);
						}
						break;
					case 'setEntityAttribute':

						var attrId = ige.variable.getValue(action.attribute, vars);
						var value = ige.variable.getValue(action.value, vars);
						var entity = ige.variable.getValue(action.entity, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes && entity._stats.attributes[attrId] != undefined && value != undefined) {
							var isAttributeVisible = false;
							var attribute = entity._stats.attributes[attrId];

							if (entity._category === 'player') {
								isAttributeVisible = !!attribute.isVisible;
							} else {
								isAttributeVisible = attribute.isVisible instanceof Array && attribute.isVisible.length > 0;
							}

							entity.attribute.update(attrId, value, isAttributeVisible); // update attribute, and check for attribute becoming 0
						}
						break;

					case 'setEntityAttributeMin':

						var attrId = ige.variable.getValue(action.attribute, vars);
						var entity = ige.variable.getValue(action.entity, vars);
						var minValue = ige.variable.getValue(action.value, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes[attrId] != undefined && !isNaN(minValue)) {
							// entity.attribute.setMin(attrId, minValue);
							var min = {};
							min[attrId] = minValue;

							entity.streamUpdateData([{ attributesMin: min }]);
						}
						break;

					case 'setEntityAttributeMax':

						var attrId = ige.variable.getValue(action.attribute, vars);
						var entity = ige.variable.getValue(action.entity, vars);
						var maxValue = ige.variable.getValue(action.value, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes[attrId] != undefined && !isNaN(maxValue)) {
							// entity.attribute.setMax(attrId, maxValue);
							var max = {};
							max[attrId] = maxValue;

							entity.streamUpdateData([{ attributesMax: max }]);
						}
						break;

					case 'setEntityAttributeRegenerationRate':
						var attrId = ige.variable.getValue(action.attribute, vars);
						var entity = ige.variable.getValue(action.entity, vars);
						var regenerationValue = ige.variable.getValue(action.value, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes[attrId] != undefined && !isNaN(regenerationValue)) {
							// entity.attribute.setRegenerationSpeed(attrId, regenerationValue);

							var regenerationSpeed = {};
							regenerationSpeed[attrId] = regenerationValue;

							entity.streamUpdateData([{ attributesRegenerateRate: regenerationSpeed }]);
						}
						break;

					case 'addAttributeBuffToUnit':

						var attrId = ige.variable.getValue(action.attribute, vars);
						var value = ige.variable.getValue(action.value, vars);
						var entity = ige.variable.getValue(action.entity, vars);
						var time = ige.variable.getValue(action.time, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes && entity._stats.attributes[attrId] != undefined && value != undefined && entity._stats.buffs) {
							var isAttributeVisible = false;

							/* if (entity._category === 'player') {
                                isAttributeVisible = !!attribute.isVisible;
                            }
                            else {
                                isAttributeVisible = attribute.isVisible instanceof Array && attribute.isVisible.length > 0;
                            } */

							entity.addAttributeBuff(attrId, value, time, false); // update attribute, and check for attribute becoming 0
						}
						break;

					case 'addPercentageAttributeBuffToUnit':

						var attrId = ige.variable.getValue(action.attribute, vars);
						var value = ige.variable.getValue(action.value, vars);
						var entity = ige.variable.getValue(action.entity, vars);
						var time = ige.variable.getValue(action.time, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes && entity._stats.attributes[attrId] != undefined && value != undefined && entity._stats.buffs) {
							var isAttributeVisible = false;

							/* if (entity._category === 'player') {
                                isAttributeVisible = !!attribute.isVisible;
                            }
                            else {
                                isAttributeVisible = attribute.isVisible instanceof Array && attribute.isVisible.length > 0;
                            } */

							entity.addAttributeBuff(attrId, value, time, true); // update attribute, and check for attribute becoming 0
						}
						break;
					
					case 'removeAllAttributeBuffs':
						var unit = ige.variable.getValue(action.unit, vars)
						if(unit && unit._stats && unit._stats.buffs){
							for(let i = 0; i < unit._stats.buffs.length; i++){
								unit._stats.buffs[i].timeLimit = 0;
							}
						}
						break;

					case 'moveEntity':
						var position = ige.variable.getValue(action.position, vars);
						var entity = ige.variable.getValue(action.entity, vars);

						if (position && entity && ['unit', 'item', 'projectile'].includes(entity._category)) {
							entity.teleportTo(position.x, position.y, entity._rotate.z);
						}

						break;
					case 'destroyEntity':
						var entity = ige.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							entity.remove();
						} else {
							ige.script.errorLog('invalid unit');
						}

						break;

					case 'setEntityVariable':
						var entity = ige.variable.getValue(action.entity, vars);
						var variable = ige.variable.getValue(action.variable, vars);
						var value = ige.variable.getValue(action.value, vars);

						if (variable && entity && entity.variables && entity.variables[variable.key]) {
							var isDataTypeSame = false;
							var variableObj = entity.variables[variable.key];

							// variables can not set to undefined via action
							switch (variableObj.dataType) {
								case 'string':
								case 'boolean':
								case 'number': {
									isDataTypeSame = typeof value === variableObj.dataType;
									break;
								}
								case 'position': {
									isDataTypeSame = typeof value === 'object' &&
                                        value.x &&
                                        value.y;
									break;
								}
								case 'item':
								case 'player':
								case 'unit': {
									isDataTypeSame = typeof value === 'object' &&
                                        value._category === variableObj.dataType;
									break;
								}
								default: {
									// figure out how to validate for other types like itemType, unitType, ..., etc.
									isDataTypeSame = true;
									break;
								}
							}

							if (isDataTypeSame) {
								variableObj.value = value;
							} else if (typeof value === 'undefined' && action.value && action.value.function === 'undefinedValue') {
								// dev intentionally set value as undefined
								variableObj.value = undefined;

								// if variable has default field then it will be returned when variable's value is undefined
								if (variableObj.default) {
									variableObj.default = undefined;
								}
							} else {
								ige.devLog('datatype of value does not match datatype of variable');
							}
						}

						break;

					case 'rotateEntityToRadians':
					case 'rotateEntityToRadiansLT': // No more LT.
						var entity = ige.variable.getValue(action.entity, vars);
						var radians = ige.variable.getValue(action.radians, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && radians !== undefined && !isNaN(radians)) {
							// hack to rotate entity properly
							entity.rotateTo(0, 0, radians);
						}

						break;

					case 'rotateEntityToFacePosition':
						var entity = ige.variable.getValue(action.entity, vars);
						var position = ige.variable.getValue(action.position, vars);
						if (!position || !entity) break;

						if (entity._category === 'item' && entity._stats.currentBody && entity._stats.currentBody.jointType === 'weldJoint') {
							break;
						}
						var pos = { // displacement between entity and given position (e.g. mouse cursor)
							x: entity._translate.x - position.x,
							y: entity._translate.y - position.y
						};
						var offset = (Math.PI * 3) / 2;

						var newFacingAngle = Math.atan2(pos.y, pos.x) + offset;

						if (
							self.entityCategories.indexOf(entity._category) > -1 &&
                            position.x != undefined && position.y != undefined
						) {
							if (ige.isServer) {
								var oldFacingAngle = entity._rotate.z;

								// var rotateDiff = (newFacingAngle - (oldFacingAngle % (Math.PI * 2))) % (Math.PI * 2)
								// if (rotateDiff > Math.PI) {
								//     rotateDiff = - (2 * Math.PI) % rotateDiff
								// }
								// else if (rotateDiff < -Math.PI) {
								//     rotateDiff = (2 * Math.PI) % rotateDiff
								// }

								// if (!isNaN(rotateDiff)) {
								//     entity.rotateBy(0, 0, -rotateDiff);
								// }
								entity.rotateTo(0, 0, newFacingAngle);
								// console.log('rotating')
							}
							// &&
							else if (ige.isClient && ige.client.myPlayer && (entity == ige.client.selectedUnit || entity.getOwner() == ige.client.selectedUnit)) {
								if (entity._category === 'item') {
									console.log(newFacingAngle);
								}
								entity.rotateTo(0, 0, newFacingAngle);
								// force timeStream to process rotation right away
								// entity._keyFrames.push([ige.network.stream._streamDataTime, [entity._translate.x, entity._translate.y, newFacingAngle]]);
							}
						}
						break;

					case 'rotateEntityToFacePositionUsingRotationSpeed':
						var entity = ige.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var position = ige.variable.getValue(action.position, vars);
							if (position && position.x != undefined && position.y != undefined) {
								pos = {
									x: entity._translate.x - position.x,
									y: entity._translate.y - position.y
								};

								var rotationSpeed = entity._stats.currentBody.rotationSpeed;
								var ninetyDegreesInRadians = 90 * Math.PI / 180;
								var newFacingAngle = Math.atan2(pos.y, pos.x) - ninetyDegreesInRadians;
								var oldFacingAngle = entity._rotate.z;

								// Prevents the rotation bug that caused units to counter rotate it looked to left
								rotateDiff = (newFacingAngle - (oldFacingAngle % (Math.PI * 2))) % (Math.PI * 2);
								if (rotateDiff > Math.PI) {
									rotateDiff = -(2 * Math.PI) % rotateDiff;
								} else if (rotateDiff < -Math.PI) {
									rotateDiff = (2 * Math.PI) % rotateDiff;
								}

								var degDiff = rotateDiff / 0.05; // 0.0174533 is degree to radian conversion
								var torque = (degDiff > 0) ? Math.min(degDiff, rotationSpeed) : Math.max(degDiff, rotationSpeed * -1);

								entity.applyTorque(torque);
								// entity.body.applyTorque(torque);
							} else {
								// ige.script.errorLog( action.type + " - invalid position")
							}
						} else {
							// ige.script.errorLog( action.type + " - invalid unit")
						}
						break;

						/* AI */

					case 'setUnitTargetPosition': // deprecated
						var unit = ige.variable.getValue(action.unit, vars);
						var position = ige.variable.getValue(action.position, vars);
						if (unit && unit.ai && position) {
							unit.ai.moveToTargetPosition(position.x, position.y);
						}

						break;
					case 'setUnitTargetUnit': // deprecated
						var unit = ige.variable.getValue(action.unit, vars);
						var targetUnit = ige.variable.getValue(action.targetUnit, vars);
						if (unit && unit.ai && targetUnit) {
							unit.ai.attackUnit(targetUnit);
						}
						break;

					case 'aiMoveToPosition':
						var unit = ige.variable.getValue(action.unit, vars);
						var position = ige.variable.getValue(action.position, vars);
						if (unit && unit.ai && position) {
							unit.ai.moveToTargetPosition(position.x, position.y);
						}
						break;
					case 'aiAttackUnit':
						var unit = ige.variable.getValue(action.unit, vars);
						var targetUnit = ige.variable.getValue(action.targetUnit, vars);
						if (unit && unit.ai && targetUnit) {
							unit.ai.attackUnit(targetUnit);
						}
						break;

					case 'makePlayerTradeWithPlayer':
						var playerA = ige.variable.getValue(action.playerA, vars);
						var playerB = ige.variable.getValue(action.playerB, vars);
						if (playerA && playerB && playerA._category === 'player' && playerB._category === 'player') {
							if (!playerB.isTrading) {
								ige.network.send('trade', { type: 'init', from: playerA.id() }, playerB._stats.clientId);
							} else {
								var message = `${playerB._stats.name}is busy`;
								ige.chat.sendToRoom('1', message, playerA._stats.clientId, undefined);
							}
						}
						break;
					case 'applyTorqueOnEntity':
						var entity = ige.variable.getValue(action.entity, vars);
						var torque = ige.variable.getValue(action.torque, vars);

						if (entity && torque) {
							entity.applyTorque(torque);
						}
						// apply torque on entity here

						break;
					case 'attachEntityToEntity':
						var entity = ige.variable.getValue(action.entity, vars);
						var targetEntity = ige.variable.getValue(action.targetingEntity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && targetEntity && self.entityCategories.indexOf(targetEntity._category) > -1) {
							entity.attachTo(targetEntity);
						}

						break;

					case 'changeScaleOfEntitySprite':
						var entity = ige.variable.getValue(action.entity, vars);
						var scale = ige.variable.getValue(action.scale, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && !isNaN(scale)) {
							entity.streamUpdateData([{ scale: parseFloat(scale).toFixed(2) }]);
						}
						break;

					case 'changeScaleOfEntityBody':
						var entity = ige.variable.getValue(action.entity, vars);
						var scale = ige.variable.getValue(action.scale, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && !isNaN(scale)) {
							entity.streamUpdateData([{ scaleBody: parseFloat(scale).toFixed(2) }]);
						}
						break;

					case 'setEntityState':
						var entity = ige.variable.getValue(action.entity, vars);
						var stateId = action.state;

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							entity.setState(stateId);
						}

						break;
					case 'increaseVariableByNumber':
						var newValue = ige.variable.getValue(action.number, vars);
						if (ige.game.data.variables.hasOwnProperty(action.variable) && !_.isNaN(newValue) && !_.isNil(newValue)) {
							var variable = ige.game.data.variables[action.variable];
							if (variable.value === undefined || isNaN(variable.value)) {
								variable = variable.default || 0;
							}
							variable.value += newValue;
						}
						break;

					case 'decreaseVariableByNumber':
						var newValue = ige.variable.getValue(action.number, vars);
						if (ige.game.data.variables.hasOwnProperty(action.variable) && !_.isNaN(newValue) && !_.isNil(newValue)) {
							var variable = ige.game.data.variables[action.variable];
							if (variable.value === undefined || isNaN(variable.value)) {
								variable = variable.default || 0;
							}
							variable.value -= newValue;
						}
						break;

					case 'loadPlayerDataAndApplyIt':
						var player = ige.variable.getValue(action.player, vars);
						if (player) {
							if (player.persistedData) {
								player.loadPersistentData();
								console.log('player data loaded');

								if (action.unit) {
									var unit = ige.variable.getValue(action.unit, vars);
									if (unit) {
										unit.loadPersistentData();
										console.log('unit data loaded');
									}
								}
							}
						}
						break;

					case 'loadUnitData':
						var unit = ige.variable.getValue(action.unit, vars);
						var owner = unit.getOwner();
						if (unit && owner && owner.persistedData) {
							unit.loadPersistentData();
						}
						break;

					case 'loadUnitDataFromString':
						var unit = ige.variable.getValue(action.unit, vars);
						try {
							var data = JSON.parse(ige.variable.getValue(action.string, vars));
						} catch (err) {
							console.error(err);
							return;
						}
						if (unit && data) {
							unit.loadDataFromString(data);
						}
						break;

					case 'loadPlayerDataFromString':
						var player = ige.variable.getValue(action.player, vars);
						try {
							var data = JSON.parse(ige.variable.getValue(action.string, vars));
						} catch (err) {
							console.error(err);
							return;
						}
						if (player && data) {
							player.loadDataFromString(data);
						}
						break;

					case 'loadPlayerData':
						var player = ige.variable.getValue(action.player, vars);
						if (player && player.persistedData) {
							player.loadPersistentData();
						}
						break;

					case 'comment':
						break;
					default:
						// console.log('trying to run', action);
						break;
				}
			} catch (e) {
				console.log(e);
				ige.script.errorLog(e); // send error msg to client
			}
		}
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = ActionComponent; }
