var ActionComponent = TaroEntity.extend({
	classId: 'ActionComponent',
	componentId: 'action',

	init: function () {
		this.entityCategories = ['unit', 'item', 'projectile', 'region', 'wall'];
		this.lastAction = undefined;
		this.actionProfiler = {}
	},

	// entity can be either trigger entity, or entity in loop
	run: function (actionList, vars) {
		var self = this;

		if (actionList == undefined || actionList.length <= 0)
			return;

		for (var i = 0; i < actionList.length; i++) {
			var action = actionList[i];
			
			// if action is disabled
			if (!action || action.disabled == true || (taro.isClient && taro.physics && !action.runOnClient)) {
				continue;
			}

			var now = Date.now();		
			var lastActionRunTime = now - this.lastActionRanAt;
			var engineTickDelta = now - taro.now;

			// prevent recursive/infinite action calls consuming CPU
			if (engineTickDelta > 1000 && !taro.engineLagReported) {
				var rollbarData = {
					query: 'engineFreeze',
					engineTickDelta: engineTickDelta,
					masterServer: global.myIp,
					gameTitle: taro.game.data.defaultData.title,
					clientCommands: taro.network.commandCount,
					actionProfiler: this.actionProfiler,
					lastAction: action.type,
					triggerProfiler: taro.trigger.triggerProfiler
				};

				global.rollbar.log("engineStep is taking longer than 1000ms", rollbarData);
				
				var errorMsg = taro.script.errorLog("engineTick is taking longer than 1000ms (took"+engineTickDelta+"ms)");
				console.log(errorMsg, rollbarData);
				taro.engineLagReported = true;
				// taro.server.unpublish(errorMsg); // not publishing yet cuz TwoHouses will get unpub. loggin instead.
			}

			if (this.lastAction) {
				if (this.actionProfiler[this.lastAction]) {
					var count = this.actionProfiler[this.lastAction].count;					
					this.actionProfiler[this.lastAction].count++;					
					this.actionProfiler[this.lastAction].avgTime = ((this.actionProfiler[this.lastAction].avgTime * count) + lastActionRunTime ) / (count + 1)
					this.actionProfiler[this.lastAction].totalTime += lastActionRunTime					 
				} else {
					this.actionProfiler[this.lastAction] = {count: 1, avgTime: lastActionRunTime, totalTime: lastActionRunTime}
				}
			}

			this.lastAction = action.type;
			this.lastActionRanAt = now;			
			

			var params = {};
			var entity = taro.variable.getValue(action.entity, vars);
			taro.script.currentActionName = action.type;
			var invalidParameters = [];

			if (action.params == undefined) {
				for (j in action) {
					// add everything else in action object into param
					if (j != 'type') {
						params[j] = action[j];
					}
				}
			}

			taro.script.recordLast50Action(action.type);
			try {
				switch (action.type) {
					/* Global */

					case 'setVariable': // store variables with formula processed
						var newValue = taro.variable.getValue(action.value, vars);
						params.newValue = newValue;
						if (taro.game.data.variables.hasOwnProperty(action.variableName)) {
							taro.game.data.variables[action.variableName].value = newValue;
							// if variable has default field then it will be returned when variable's value is undefined
							if (
								newValue === undefined &&
                                				action.value &&
                                				action.value.function === 'undefinedValue' &&
                                				taro.game.data.variables[action.variableName].hasOwnProperty('default')
							) {
								taro.game.data.variables[action.variableName].default = undefined;
							}
						}

						// not sure if we want to be doing this on the client
						// causing issues so disabled on client for now
						if (taro.isServer) {
							taro.variable.updateDevConsole({ type: 'setVariable', params: params });
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
						var count = taro.variable.getValue(action.count, vars);
						var repeatActions = taro.variable.getValue(action.actions, vars);

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
						var previousScriptId = taro.script.currentScriptId;
						taro.script.runScript(action.scriptName, vars);
						taro.script.currentScriptId = previousScriptId;
						break;

					case 'condition':
						if (taro.condition.run(action.conditions, vars)) {
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
						var region = taro.variable.getValue(action.region, vars);
						// regionId seems like unnecessary stream data
						var regionId = action.region.variableName;
						if (region) {
							var x = taro.variable.getValue(action.x, vars);
							var y = taro.variable.getValue(action.y, vars);
							var width = taro.variable.getValue(action.width, vars);
							var height = taro.variable.getValue(action.height, vars);
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
						var unit = taro.variable.getValue(action.unit, vars);
						taro.game.lastAttackingUnitId = unit.id();

						break;

					case 'setLastAttackedUnit':
						var unit = taro.variable.getValue(action.unit, vars);
						taro.game.lastAttackedUnitId = unit.id();

						break;

					case 'setLastAttackingItem':
						var item = taro.variable.getValue(action.item, vars);
						taro.game.lastAttackingItemId = item.id();

						break;

					case 'sendPostRequest':
						var obj = taro.variable.getValue(action.string, vars);
						var url = taro.variable.getValue(action.url, vars);
						var proxyUrl = process.env.PROXY_URL || '';
						var requestUrl = `${proxyUrl}${url}`;
						var varName = taro.variable.getValue(action.varName, vars);

						try {
							obj = JSON.parse(obj);
						} catch (err) {
							console.error(err);
							return;
						}

						// ensure we aren't sending more than 30 POST requests within 10 seconds
						taro.server.postReqTimestamps.push(taro.currentTime());
						var oldestReqTimestamp = taro.server.postReqTimestamps[0]
						while (Date.now() - oldestReqTimestamp > 10000 && taro.server.postReqTimestamps.length > 0) {
							oldestReqTimestamp = taro.server.postReqTimestamps.shift();
						}
						if (taro.server.postReqTimestamps.length > 30) {
							taro.server.unpublish('Game server is sending too many POST requests. You cannot send more than 30 req per every 10s.');
						}

						taro.server.request.post({
						    url: requestUrl,
						    form: obj
						}, function optionalCallback (err, httpResponse, body) {
							if (err) {
							    return console.error('upload failed:', err);
							}

							try {
								var res = JSON.parse(body);
								var newValue = res.response;
								params['newValue'] = newValue;

								if (taro.game.data.variables.hasOwnProperty(varName)) {
									taro.game.data.variables[varName].value = newValue;
								}
							} catch (err) {
								console.error('sendPostRequest', taro.game.data.defaultData.title, url, err);
								if (taro.game.data.variables.hasOwnProperty(varName)) {
									taro.game.data.variables[varName].value = 'error';
								}
							}
						});

						break;

						/* Player */

					case 'kickPlayer':
						var player = taro.variable.getValue(action.entity, vars);
						if (player && player._category == 'player') {
							player.streamUpdateData([{ playerJoined: false }]);
						}

						break;

					case 'playEntityAnimation':
						var animationId = taro.variable.getValue(action.animation, vars);
						// console.log('playing unit animation!', animationId);
						var entity = taro.variable.getValue(action.entity, vars);
						if (entity) {
							entity.streamUpdateData([{ anim: animationId }]);
						}

						break;

					case 'setPlayerAttribute':

						var attrId = taro.variable.getValue(action.attribute, vars);
						var player = entity;
						if (player && player._category == 'player' && player._stats.attributes) {
							var attribute = player._stats.attributes[attrId];
							if (attribute != undefined) {
								var decimalPlace = parseInt(attribute.decimalPlaces) || 0;
								var value = parseFloat(taro.variable.getValue(action.value, vars)).toFixed(decimalPlace);
								player.attribute.update(attrId, value, true); // update attribute, and check for attribute becoming 0
							}
						}

						break;

					case 'setPlayerAttributeMax':
						var attrId = taro.variable.getValue(action.attributeType, vars);
						var player = taro.variable.getValue(action.player, vars);
						var maxValue = taro.variable.getValue(action.number, vars);
						if (player && player._category == 'player' && player._stats.attributes && player._stats.attributes[attrId] != undefined) {
							var max = {};
							max[attrId] = maxValue;

							player.streamUpdateData([{ attributesMax: max }]);
						}

						break;
					case 'setPlayerAttributeMin':
						var attrId = taro.variable.getValue(action.attributeType, vars);
						var player = taro.variable.getValue(action.player, vars);
						var minValue = taro.variable.getValue(action.number, vars);
						if (player && player._category == 'player' && player._stats.attributes && player._stats.attributes[attrId] != undefined) {
							var min = {};
							min[attrId] = minValue;

							player.streamUpdateData([{ attributesMin: min }]);
						}

						break;
					case 'setPlayerAttributeRegenerationRate':
						var attrId = taro.variable.getValue(action.attributeType, vars);
						var player = taro.variable.getValue(action.player, vars);
						var regenerateRateValue = taro.variable.getValue(action.number, vars);
						if (player && player._category == 'player' && player._stats.attributes && player._stats.attributes[attrId] != undefined) {
							var regRate = {};
							regRate[attrId] = regenerateRateValue;

							player.streamUpdateData([{ attributesRegenerateRate: regRate }]);
						}

						break;
					case 'setPlayerName':

						var name = taro.variable.getValue(action.name, vars);
						var player = taro.variable.getValue(action.player, vars);

						if (player && player._category == 'player') {
							player.streamUpdateData([{ name: name }]);
						}

						break;

					case 'assignPlayerType':
						var playerTypeId = taro.variable.getValue(action.playerType, vars);

						if (entity && entity._category == 'player') {
							var player = entity;
							player.streamUpdateData([{ playerTypeId: playerTypeId }]);
						}

						break;

					case 'setPlayerVariable':
						var player = taro.variable.getValue(action.player, vars);
						var variable = taro.variable.getValue(action.variable, vars);
						var value = taro.variable.getValue(action.value, vars);

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
								taro.devLog('datatype of value does not match datatype of variable');
							}
						}

						break;
					case 'changeDescriptionOfItem':
						var item = taro.variable.getValue(action.item, vars);
						var description = taro.variable.getValue(action.string, vars);
						if (item && description) {
							item.streamUpdateData([{ description: description }]);
						}
						break;

					case 'changeItemInventoryImage':
						var item = taro.variable.getValue(action.item, vars);
						var url = taro.variable.getValue(action.url, vars);
						if (item && url) {
							item.streamUpdateData([{ inventoryImage: url }]);
						}
						break;

					case 'startAcceptingPlayers':
						taro.clusterClient.setAcceptingPlayerStatus(true);
						break;

					case 'stopAcceptingPlayers':
						taro.clusterClient.setAcceptingPlayerStatus(false);
						break;
					case 'saveUnitData':
						var unit = taro.variable.getValue(action.unit, vars);
						var ownerPlayer = unit.getOwner();
						var userId = ownerPlayer._stats.userId;

						if (unit && ownerPlayer && userId && ownerPlayer.persistentDataLoaded) {
							var data = unit.getPersistentData('unit');
							taro.clusterClient.saveUserData(userId, data, 'unit');
						} else {
							if (!unit.persistentDataLoaded) {
								taro.devLog('Fail saving unit data bcz persisted data not set correctly');
							} else {
								taro.devLog('Fail saving unit data');
							}
						}
						break;
					case 'savePlayerData':
						var player = taro.variable.getValue(action.player, vars);
						var userId = player && player._stats && player._stats.userId;

						if (player && userId && player.persistentDataLoaded) {
							var data = player.getPersistentData('player');
							taro.clusterClient.saveUserData(userId, data, 'player');

							var unit = player.getSelectedUnit();
							var userId = player._stats.userId;

							if (unit && player && userId && unit.persistentDataLoaded) {
								var data = unit.getPersistentData('unit');
								taro.clusterClient.saveUserData(userId, data, 'unit');
							} else {
								if (!unit.persistentDataLoaded) {
									taro.devLog('Fail saving unit data bcz persisted data not set correctly');
								} else {
									taro.devLog('Fail saving unit data');
								}
							}
						} else {
							if (!player.persistentDataLoaded) {
								taro.devLog('Fail saving unit data bcz persisted data not set correctly');
							} else {
								taro.devLog('Fail saving player data');
							}
						}

						break;

					case 'makePlayerSelectUnit':
						var player = taro.variable.getValue(action.player, vars);
						var unit = taro.variable.getValue(action.unit, vars);
						if (player && unit) {
							player.selectUnit(unit.id());
						}

						break;
					
					/* Coins */
					case 'sendCoinsToPlayer':
						var coins = taro.variable.getValue(action.coins, vars);
						var player = taro.variable.getValue(action.player, vars);
						var userId = player && player._stats && player._stats.userId;
						
						if (player && userId && coins && Math.floor(coins) > 0) {
							taro.server.sendCoinsToPlayer(userId, coins);
						}
						break;
					

					// fee is deducted from the owner end
					case 'sendCoinsToPlayer2':
						var coins = taro.variable.getValue(action.coins, vars);
						var player = taro.variable.getValue(action.player, vars);
						var userId = player && player._stats && player._stats.userId;
						
						if (player && userId && coins && Math.floor(coins) > 0) {
							taro.server.sendCoinsToPlayer(userId, coins, true);
						}
						break;
					
						/* UI */
					case 'showUiTextForPlayer':
						if (entity && entity._stats) {
							var text = taro.variable.getValue(action.value, vars);
							taro.gameText.updateText({ target: action.target, value: text, action: 'show' }, entity._stats.clientId);
						}
						break;

					case 'showUiTextForEveryone':
						var text = taro.variable.getValue(action.value, vars);
						taro.gameText.updateText({ target: action.target, value: text, action: 'show' });
						break;

					case 'hideUiTextForPlayer':
						if (entity && entity._stats) {
							var text = taro.variable.getValue(action.value, vars);
							taro.gameText.updateText({ target: action.target, value: text, action: 'hide' }, entity._stats.clientId);
						}
						break;

					case 'hideUiTextForEveryone':
						var text = taro.variable.getValue(action.value, vars);
						taro.gameText.updateText({ target: action.target, value: text, action: 'hide' });
						break;

					case 'updateUiTextForTimeForPlayer':
						var text = taro.variable.getValue(action.value, vars);
						var player = taro.variable.getValue(action.player, vars);
						var time = taro.variable.getValue(action.time, vars);
						// don't send text to AI players. If player is undefined, then send to all players
						if (player == undefined || (player && player._stats && player._stats.controlledBy == 'human')) {
							taro.gameText.updateTextForTime({
								target: action.target,
								value: text,
								action: 'update',
								time
							}, player && player._stats && player._stats.clientId);
						}
						break;

					case 'updateUiTextForPlayer':
						if (entity && entity._stats) {
							var text = taro.variable.getValue(action.value, vars);
							taro.gameText.updateText({ target: action.target, value: text, action: 'update' }, entity._stats.clientId);
						}
						break;

					case 'showGameSuggestionsForPlayer':

						var player = taro.variable.getValue(action.player, vars);
						if (player && player._stats && player._stats.clientId) {
							taro.network.send('gameSuggestion', { type: 'show' }, player._stats.clientId);
						}

						break;

					case 'hideGameSuggestionsForPlayer':

						var player = taro.variable.getValue(action.player, vars);
						if (player && player._stats && player._stats.clientId) {
							taro.network.send('gameSuggestion', { type: 'hide' }, player._stats.clientId);
						}
						break;

					case 'updateUiTextForEveryone':
						var text = taro.variable.getValue(action.value, vars);
						taro.gameText.updateText({ target: action.target, value: text, action: 'update' });
						break;

					case 'showInputModalToPlayer':
						var player = taro.variable.getValue(action.player, vars);
						var inputLabel = taro.variable.getValue(action.inputLabel, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showInputModal',
								fieldLabel: inputLabel,
								isDismissible: false
							}, player._stats.clientId);
						}
						break;
					case 'showDismissibleInputModalToPlayer':
						var player = taro.variable.getValue(action.player, vars);
						var inputLabel = taro.variable.getValue(action.inputLabel, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showInputModal',
								fieldLabel: inputLabel,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'showCustomModalToPlayer':
						var player = taro.variable.getValue(action.player, vars);
						var htmlContent = taro.variable.getValue(action.htmlContent, vars) || '';
						var modalTitle = taro.variable.getValue(action.title, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showCustomModal',
								title: modalTitle,
								content: htmlContent,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'showWebsiteModalToPlayer':
						var player = taro.variable.getValue(action.player, vars);
						var url = taro.variable.getValue(action.string, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showWebsiteModal',
								url: url,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'showSocialShareModalToPlayer':
						var player = taro.variable.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showSocialShareModal',
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'openWebsiteForPlayer':
						var player = taro.variable.getValue(action.player, vars);
						var url = taro.variable.getValue(action.string, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'openWebsite',
								url: url,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;

					case 'showInviteFriendsModal':
						var player = taro.variable.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showFriendsModal'
							}, player._stats.clientId);
						}
						break;

					case 'showMenu':
						var player = taro.variable.getValue(action.player, vars);
						if (player && player._stats) {
							taro.network.send('ui', { command: 'showMenu' }, player._stats.clientId);
						}
						break;

					case 'sendChatMessage':
						var message = taro.variable.getValue(action.message, vars);
						taro.chat.sendToRoom('1', message, undefined, undefined);
						break;

					case 'sendChatMessageToPlayer':
						var player = taro.variable.getValue(action.player, vars);
						if (player && player._category == 'player' && player._stats.clientId) {
							var clientId = player._stats.clientId;
							taro.chat.sendToRoom('1', taro.variable.getValue(action.message, vars), clientId, undefined);
						}

						break;

					case 'banPlayerFromChat':
						var player = taro.variable.getValue(action.player, vars);
						if (player) {
							player.streamUpdateData([{ banChat: true }]);
						}
						break;

					case 'unbanPlayerFromChat':
						var player = taro.variable.getValue(action.player, vars);
						if (player) {
							player.streamUpdateData([{ banChat: false }]);
						}
						break;

					case 'playerCameraSetZoom':
						var player = taro.variable.getValue(action.player, vars);
						var zoom = taro.variable.getValue(action.zoom, vars);
						if (player && player._category == 'player' && zoom != undefined && player._stats.clientId) {
							taro.network.send('camera', { cmd: 'zoom', zoom: zoom }, player._stats.clientId);
						}
						break;

					case 'showUnitInPlayerMinimap':
						var player = taro.variable.getValue(action.player, vars);
						var unit = taro.variable.getValue(action.unit, vars);
						var color = taro.variable.getValue(action.color, vars);

						if (player && unit && unit._category === 'unit' && player._stats && player._stats.clientId) {
							var clientId = player._stats.clientId;

							unit._stats.minimapUnitVisibleToClients[clientId] = color;

							taro.network.send('minimap', {
								type: 'showUnit',
								unitId: unit.id(),
								color: color
							}, player._stats.clientId);
						}

						break;

					case 'hideUnitInPlayerMinimap':
						var player = taro.variable.getValue(action.player, vars);
						var unit = taro.variable.getValue(action.unit, vars);
						var color = taro.variable.getValue(action.color, vars);

						if (player && unit && unit._category === 'unit' && player._stats && player._stats.clientId) {
							var clientId = player._stats.clientId;

							delete unit._stats.minimapUnitVisibleToClients[clientId];

							taro.network.send('minimap', {
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
							var units = taro.variable.getValue(action.unitGroup, vars) || [];
							for (var l = 0; l < units.length; l++) {
								var unit = units[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedUnit: unit }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									taro.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									taro.devLog('return without executing script');
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
							var players = taro.variable.getValue(action.playerGroup, vars) || [];
							for (var l = 0; l < players.length; l++) {
								var player = players[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedPlayer: player }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									taro.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									taro.devLog('return without executing script');
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
							var items = taro.variable.getValue(action.itemGroup, vars) || [];
							for (var l = 0; l < items.length; l++) {
								var item = items[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedItem: item }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									taro.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									taro.devLog('return without executing script');
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
							var projectiles = taro.variable.getValue(action.projectileGroup, vars) || [];
							for (var l = 0; l < projectiles.length; l++) {
								var projectile = projectiles[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedProjectile: projectile }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									taro.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									taro.devLog('return without executing script');
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
							var entities = taro.variable.getValue(action.entityGroup, vars) || [];
							for (var l = 0; l < entities.length; l++) {
								var entity = entities[l];
								// if (['unit', 'item', 'projectile', 'wall'].includes(entity._category)) {
								if (self.entityCategories.indexOf(entity._category) > -1) {
									var brk = self.run(action.actions, Object.assign(vars, { selectedEntity: entity }));

									if (brk == 'break' || vars.break) {
										vars.break = false;
										taro.devLog('break called');
										break;
									} else if (brk == 'continue') {
										continue;
									} else if (brk == 'return') {
										taro.devLog('return without executing script');
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
							var regions = taro.variable.getValue(action.regionGroup, vars) || [];
							for (var l = 0; l < regions.length; l++) {
								var region = regions[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedRegion: region }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									taro.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									taro.devLog('return without executing script');
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
							var unitTypes = taro.variable.getValue(action.unitTypeGroup, vars) || {};

							for (var unitTypeKey in unitTypes) {
								var brk = self.run(action.actions, Object.assign(vars, { selectedUnitType: unitTypeKey }));

								if (brk == 'break' || vars.break) {
									vars.break = false;
									taro.devLog('break called');
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
									taro.devLog('return without executing script');
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
							var itemTypes = taro.variable.getValue(action.itemTypeGroup, vars) || {};

							// sorting items before they are used. which solves issue of getting first item in slot
							itemTypes = Object.keys(itemTypes);
							var itemsArr = _.map(itemTypes, (itemId) => {
								var item = taro.game.getAsset('itemTypes', itemId);
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
										taro.devLog('break called');
										break;
									} else if (brk == 'continue') {
										continue;
									} else if (brk == 'return') {
										taro.devLog('return without executing script');
										return 'return';
									}
								}
							}
						}
						break;

					case 'while':
						var loopCounter = 0;
						while (taro.condition.run(action.conditions, vars)) {
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
								var errorMsg = taro.script.errorLog('infinite loop detected');
								console.log(errorMsg);
								taro.server.unpublish(errorMsg);
							}							
						}
						break;
					case 'for':
						var variables = taro.game.data.variables;
						var variableName = action.variableName;

						if (variables[variableName] !== undefined) {
							if (variables[variableName].dataType !== 'number') {
								throw new Error('`for` action only supports numeric variable');
							}

							var start = taro.variable.getValue(action.start, vars);
							var stop = taro.variable.getValue(action.stop, vars);

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
						taro.server.kill('end game called');
						break;

						/* Unit */

					case 'createUnitAtPosition':
						var player = taro.variable.getValue(action.entity, vars);

						var unitTypeId = taro.variable.getValue(action.unitType, vars);
						var unitTypeData = taro.game.getAsset('unitTypes', unitTypeId);
						var spawnPosition = taro.variable.getValue(action.position, vars);
						var facingAngle = taro.variable.getValue(action.angle, vars) || 0;
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
							taro.game.lastCreatedUnitId = unit.id();
						} else {
							taro.script.errorLog('cannot create unit. parameters are spawnPosition:', spawnPosition, ' player:', !!player, ' unitTypeId:', unitTypeId);
							if (!player) invalidParameters.push('player');
							if (!spawnPosition) invalidParameters.push('spawn position');
							if (!unitTypeId) invalidParameters.push('unit type');
							throw new Error(`cannot create unit. invalid parameter(s) given: ${invalidParameters.toString()}`);
						}

						break;

					case 'changeUnitType':

						var unitTypeId = taro.variable.getValue(action.unitType, vars);
						if (entity && entity._category == 'unit' && unitTypeId != null) {
							entity.streamUpdateData([{ type: unitTypeId }]);
						} else {
							taro.script.errorLog('invalid unit / unitTypeId');
							if (!entity) invalidParameters.push('unit');
							if (!unitTypeId) invalidParameters.push('unit type');
							throw new Error(`cannot change unit type. invalid parameter(s) given: ${invalidParameters.toString()}`);
						}

						break;

					case 'changeUnitSpeed':

						var bonusSpeed = taro.variable.getValue(action.unitSpeed, vars);

						if (entity != undefined && entity._stats != undefined && entity._category != undefined && bonusSpeed != undefined) {
							entity.streamUpdateData([{ bonusSpeed: bonusSpeed }]);
						}

						break;

					case 'changeSensorRadius':
						var sensor = taro.variable.getValue(action.sensor, vars);
						var radius = taro.variable.getValue(action.radius, vars);
						// console.log("changeSensorRadius", sensor.id(), radius)
						if (sensor && sensor._category == 'sensor') {
							if (!isNaN(radius)) {
								sensor.updateRadius(radius);
							}
						}
						break;

					case 'stunUnit':
						var unit = taro.variable.getValue(action.unit, vars);
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
						var unit = taro.variable.getValue(action.unit, vars);
						if (unit && unit._stats) {
							unit.streamUpdateData([{ isStunned: false }]);
						}
						break;

					case 'setEntityVelocityAtAngle':

						var entity = taro.variable.getValue(action.entity, vars);
						var speed = taro.variable.getValue(action.speed, vars) || 0;
						var radians = taro.variable.getValue(action.angle, vars); // entity's facing angle
						if (entity && radians !== undefined && !isNaN(radians) && !isNaN(speed)) {
							radians -= Math.radians(90);
							// console.log("2. setting linear velocity", radians, speed)
							// entity.body.setLinearVelocity(new TaroPoint3d(Math.cos(radians) * speed, Math.sin(radians) * speed, 0));
							// entity.setLinearVelocityLT(Math.cos(radians) * speed, Math.sin(radians) * speed);
							entity.setLinearVelocity(Math.cos(radians) * speed, Math.sin(radians) * speed);
						}

						break;

					case 'setVelocityOfEntityXY':
						// action.forceX
						var entity = taro.variable.getValue(action.entity, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var velocityX = taro.variable.getValue(action.velocity.x, vars);
							if (velocityX == undefined || isNaN(velocityX)) {
								velocityX = 0;
							}

							var velocityY = taro.variable.getValue(action.velocity.y, vars);
							if (velocityY == undefined || isNaN(velocityY)) {
								velocityY = 0;
							}
							entity.setLinearVelocity(velocityX, velocityY);
						} else {
							taro.script.errorLog('invalid entity');
						}

						break;

					case 'setUnitOwner':
						var unit = taro.variable.getValue(action.unit, vars);
						var player = taro.variable.getValue(action.player, vars);
						if (unit && player) {
							unit.setOwnerPlayer(player.id());
						}

						break;

					case 'setUnitNameLabel':
						var unit = taro.variable.getValue(action.unit, vars);
						var name = taro.variable.getValue(action.name, vars);
						if (unit) {
							unit.streamUpdateData([{ name: name }]);
						}

						break;

					case 'setItemName':
						var item = taro.variable.getValue(action.item, vars);
						var name = taro.variable.getValue(action.name, vars);
						if (item) {
							item.streamUpdateData([{ name: name }]);
						}

						break;

					case 'setFadingTextOfUnit':
						var unit = taro.variable.getValue(action.unit, vars);
						var text = taro.variable.getValue(action.text, vars);
						var color = taro.variable.getValue(action.color, vars);

						if (unit && unit._category === 'unit' && text !== undefined) {
							unit.streamUpdateData([
								{ setFadingText: `${text}|-|${color}` }
							]);
						}

						break;
					case 'createFloatingText':
						var position = taro.variable.getValue(action.position, vars);
						var text = taro.variable.getValue(action.text, vars);
						var color = taro.variable.getValue(action.color, vars);
						taro.network.send('createFloatingText', { position: position, text: text, color: color });
						break;

						/* Item */

					case 'startUsingItem':
						if (entity && entity._category == 'item') {
							entity.startUsing();
							entity.streamUpdateData([{ isBeingUsedFromScript: true }]);
						}
						break;

					case 'useItemOnce':
						var item = taro.variable.getValue(action.item, vars);
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
						var item = taro.variable.getValue(action.entity, vars);
						var quantity = taro.variable.getValue(action.quantity, vars);
						if (item && item._category == 'item') {
							item.streamUpdateData([{ quantity: quantity }]);
						}
						break;

					case 'setItemFireRate':
						var item = taro.variable.getValue(action.item, vars);
						var value = taro.variable.getValue(action.number, vars);

						if (item && item._category == 'item') {
							item.streamUpdateData([{ fireRate: value }]);
						}
						break;

					case 'changeInventorySlotColor':
						var item = taro.variable.getValue(action.item, vars);
						var color = taro.variable.getValue(action.string, vars);
						if (item && color) {
							item.streamUpdateData([{ inventorySlotColor: color }]);
						}
						break;

					case 'setItemAmmo':
						var item = taro.variable.getValue(action.item, vars);
						var newAmmo = taro.variable.getValue(action.ammo, vars);

						// because in item stream update quantity value is decremented by 1
						newAmmo++;

						if (item && item._category === 'item' && item._stats.type === 'weapon' && !isNaN(newAmmo)) {
							item.streamUpdateData([{ quantity: newAmmo }]);
						}

					case 'dropItem':
						var entity = taro.variable.getValue(action.entity, vars);

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
						var item = taro.variable.getValue(action.item, vars);
						var position = taro.variable.getValue(action.position, vars);

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
						var player = taro.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							player._stats.lastOpenedShop = action.shop;
							taro.network.send('openShop', { type: action.shop }, player._stats.clientId);
						}
						break;

					case 'closeShopForPlayer':
						var player = taro.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							taro.network.send('ui', { command: 'closeShop' }, player._stats.clientId);
						}
						break;

					case 'openDialogueForPlayer':
						var player = taro.variable.getValue(action.player, vars);
						var primitiveVariables = taro.variable.getAllVariables([
							'string',
							'number',
							'boolean'
						]);

						if (player && player._category === 'player' && player._stats.clientId) {
							player._stats.lastOpenedDialogue = action.dialogue;
							taro.network.send('openDialogue', {
								type: action.dialogue,
								extraData: {
									playerName: player._stats && player._stats.name,
									variables: primitiveVariables,
									dialogueTemplate: _.get(taro, "game.data.ui.dialogueview.htmlData", "")
								}
							}, player._stats.clientId);
						}
						break;

					case 'closeDialogueForPlayer':
						var player = taro.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							taro.network.send('closeDialogue', player._stats.clientId);
						}
						break;

					case 'refillAmmo':
						var item = entity;
						if (item && item._category == 'item') {
							item.refillAmmo();
						}
						break;

					case 'dropItemInInventorySlot':
						var slotIndex = taro.variable.getValue(action.slotIndex, vars);
						var unit = taro.variable.getValue(action.unit, vars);
						if (unit && unit._category == 'unit' && slotIndex != undefined) {
							unit.dropItem(slotIndex - 1);
						}
						break;

						/* particles */
					case 'startItemParticle':
						var item = taro.variable.getValue(action.item, vars);
						var particleTypeId = taro.variable.getValue(action.particleType, vars);
						if (item && item._category == 'item' && item._stats.particles && item._stats.particles[particleTypeId]) {
							taro.network.send('particle', { eid: item.id(), pid: particleTypeId, action: 'start' });
						}
						break;

					case 'stopItemParticle':
						var item = taro.variable.getValue(action.item, vars);
						var particleTypeId = taro.variable.getValue(action.particleType, vars);
						if (item && item._category == 'item' && item._stats.particles && item._stats.particles[particleTypeId]) {
							taro.network.send('particle', { eid: item.id(), pid: particleTypeId, action: 'stop' });
						}
						break;

					case 'emitItemParticle':
						var item = taro.variable.getValue(action.item, vars);
						var particleTypeId = taro.variable.getValue(action.particleType, vars);
						if (item && item._category == 'item' && item._stats.particles && item._stats.particles[particleTypeId]) {
							taro.network.send('particle', { eid: item.id(), pid: particleTypeId, action: 'emitOnce' });
						}
						break;

					case 'startUnitParticle':
						var unit = taro.variable.getValue(action.unit, vars);
						var particleTypeId = taro.variable.getValue(action.particleType, vars);
						if (unit && unit._category == 'unit' && unit._stats.particles && unit._stats.particles[particleTypeId]) {
							taro.network.send('particle', { eid: unit.id(), pid: particleTypeId, action: 'start' });
						}
						break;

					case 'stopUnitParticle':
						var unit = taro.variable.getValue(action.unit, vars);
						var particleTypeId = taro.variable.getValue(action.particleType, vars);
						if (unit && unit._category == 'unit' && unit._stats.particles && unit._stats.particles[particleTypeId]) {
							taro.network.send('particle', { eid: unit.id(), pid: particleTypeId, action: 'stop' });
						}
						break;

					case 'emitUnitParticle':
						var unit = taro.variable.getValue(action.unit, vars);
						var particleTypeId = taro.variable.getValue(action.particleType, vars);
						if (unit && unit._category == 'unit' && unit._stats.particles && unit._stats.particles[particleTypeId]) {
							taro.network.send('particle', { eid: unit.id(), pid: particleTypeId, action: 'emitOnce' });
						}
						break;

					case 'emitParticleOnceAtPosition':
						var position = taro.variable.getValue(action.position, vars);
						var particleTypeId = taro.variable.getValue(action.particleType, vars);
						if (particleTypeId && position) {
							taro.network.send('particle', { pid: particleTypeId, action: 'emitOnce', position: position });
						}
						break;

					case 'rotateUnitClockwise':
						var torque = taro.variable.getValue(action.torque, vars);
						if (entity && entity._category == 'unit' && entity.body && !isNaN(torque)) {
							// entity.body.m_torque = entity._stats.body.rotationSpeed
							entity.body.m_torque = torque;
						} else {
							// taro.script.errorLog( action.type + " - invalid unit")
						}
						break;

						// is deprecated ?
					case 'rotateUnitCounterClockwise':
						var torque = taro.variable.getValue(action.torque, vars);
						if (entity && entity._category == 'unit' && entity.body && !isNaN(torque)) {
							// entity.body.m_torque = -1 * entity._stats.body.rotationSpeed
							entity.body.m_torque = -1 * torque;
						} else {
							// taro.script.errorLog( action.type + " - invalid unit")
						}
						break;

					case 'makeUnitToAlwaysFacePosition':
						if (entity && entity._category == 'unit') {
							var position = taro.variable.getValue(action.position, vars);
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
						var unit = taro.variable.getValue(action.entity, vars);
						var player = taro.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('hideUnitNameLabelFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'showUnitNameLabelToPlayer':
						var unit = taro.variable.getValue(action.entity, vars);
						var player = taro.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('showUnitNameLabelFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'hideUnitFromPlayer':
						var unit = taro.variable.getValue(action.entity, vars);
						var player = taro.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('hideUnitFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'showUnitToPlayer':
						var unit = taro.variable.getValue(action.entity, vars);
						var player = taro.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('showUnitFromPlayer', { unitId: unit.id() }, player._stats.clientId);
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
						var playerTypeId = taro.variable.getValue(action.playerType, vars);
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isNameLabelHidden: true }]);
						}
						break;

					case 'showUnitNameLabel':
						var playerTypeId = taro.variable.getValue(action.playerType, vars);
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isNameLabelHidden: false }]);
						}
						break;

						/* projectile */

					case 'createProjectileAtPosition':
						var projectileTypeId = taro.variable.getValue(action.projectileType, vars);
						var position = taro.variable.getValue(action.position, vars);
						var force = taro.variable.getValue(action.force, vars);
						var unit = taro.variable.getValue(action.unit, vars);
						var angle = taro.variable.getValue(action.angle, vars);
						var error = '';
						var delta = Math.radians(90); // unitsFacingAngle delta
						var facingAngleDelta = 0;
						if (action.angle && action.angle.function == 'angleBetweenPositions') {
							delta = 0;
							facingAngleDelta = Math.radians(90);
						}

						if (projectileTypeId) {
							var projectileData = taro.game.getAsset('projectileTypes', projectileTypeId);

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
								taro.game.lastCreatedProjectileId = projectile._id;
							} else {
								if (!projectileData) {
									taro.script.errorLog('invalid projectile data');
								}
								if (!position || position.x == undefined || position.y == undefined) {
									taro.script.errorLog('invalid position data');
								}
								if (force == undefined) {
									taro.script.errorLog('invalid force value');
								}
								if (angle == undefined) {
									taro.script.errorLog('invalid angle value');
								}
							}
						}
						break;

						/* Camera */
					case 'playerCameraTrackUnit':
						var unit = taro.variable.getValue(action.unit, vars);
						var player = taro.variable.getValue(action.player, vars);
						if (unit && player && player._stats.clientId) {
							player.cameraTrackUnit(unit);
						}
						break;

					case 'changePlayerCameraPanSpeed':
						var panSpeed = taro.variable.getValue(action.panSpeed, vars);
						var player = taro.variable.getValue(action.player, vars);

						if (player && player._stats.clientId) {
							player.changeCameraPanSpeed(panSpeed);
						}
						break;
					case 'positionCamera':
						var position = taro.variable.getValue(action.position, vars);
						var player = taro.variable.getValue(action.player, vars);

						if (position && player && player._stats.clientId) {
							taro.network.send('camera', { cmd: 'positionCamera', position: position }, player._stats.clientId);
						}
						break;

					case 'createItemAtPositionWithQuantity':
						var itemTypeId = taro.variable.getValue(action.itemType, vars);
						var position = taro.variable.getValue(action.position, vars);
						var quantity = taro.variable.getValue(action.quantity, vars);
						var itemData = taro.game.getAsset('itemTypes', itemTypeId);
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
							taro.script.errorLog('invalid item type data');
						}
						break;
						/* depreciated and can be removed */
					case 'createItemWithMaxQuantityAtPosition':
						var itemTypeId = taro.variable.getValue(action.itemType, vars);
						var itemData = taro.game.getAsset('itemTypes', itemTypeId);
						var position = taro.variable.getValue(action.position, vars);
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
							taro.script.errorLog('invalid item type data');
						}
						break;
					case 'spawnItem':

						var itemTypeId = taro.variable.getValue(action.itemType, vars);
						var itemData = taro.game.getAsset('itemTypes', itemTypeId);
						var position = taro.variable.getValue(action.position, vars);

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
							taro.script.errorLog('invalid item type data');
						}
						break;
					case 'giveNewItemToUnit':
						var itemTypeId = taro.variable.getValue(action.itemType, vars);
						var itemData = taro.game.getAsset('itemTypes', itemTypeId);
						var unit = taro.variable.getValue(action.unit, vars);

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
						var itemTypeId = taro.variable.getValue(action.itemType, vars);
						var itemData = taro.game.getAsset('itemTypes', itemTypeId);
						var unit = null;

						if (itemData) {
							if (action.hasOwnProperty('number')) {
								// this is new version of action
								unit = taro.variable.getValue(action.unit, vars);
								quantity = taro.variable.getValue(action.number, vars);
							} else {
								// this is old version of action
								unit = taro.variable.getValue(action.entity, vars);
								quantity = taro.variable.getValue(action.quantity, vars);
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
									taro.script.errorLog('unit doesn\'t exist');
								// else
								//  taro.script.errorLog("giveNewItemToUnit: cannot add item to unit's inventory")
							}
						}
						break;

					case 'makeUnitSelectItemAtSlot':
						var unit = taro.variable.getValue(action.unit, vars);
						var slotIndex = taro.variable.getValue(action.slotIndex, vars);
						slotIndex = slotIndex - 1;
						if (unit) {
							unit.changeItem(slotIndex);
						} else // error log
						{
							if (unit == undefined || unit._category != 'unit')
								taro.script.errorLog('unit doesn\'t exist');
						}

						break;

						/* Ads */

					case 'playAdForEveryone':
						if (!taro.ad.lastPlayedAd || ((Date.now() - taro.ad.lastPlayedAd) >= 60000)) {
							taro.ad.play({ type: 'preroll' });
							taro.ad.lastPlayedAd = Date.now();
						} else {
							taro.ad.prerollEventHandler('video-ad-action-limit-reached');
						}
						break;

					case 'playAdForPlayer':
						if (action.entity) {
							var unit = taro.variable.getValue(action.entity, vars);
							if (unit && unit._stats && unit._stats.clientId) {
								if (!taro.ad.lastPlayedAd || ((Date.now() - taro.ad.lastPlayedAd) >= 60000)) {
									taro.ad.play({ type: 'preroll' }, unit._stats.clientId);
								} else {
									taro.ad.prerollEventHandler('video-ad-action-limit-reached', unit._stats.clientId);
								}
							}
						}
						break;
					case 'makeUnitPickupItem':
						var item = taro.variable.getValue(action.item, vars);
						var unit = taro.variable.getValue(action.unit, vars);
						// pickup ownerLess items
						if (unit && unit._category == 'unit' && item && item._category === 'item' && !item.getOwnerUnit()) {
							unit.pickUpItem(item);
						} else // error log
						{
							if (unit == undefined || unit._category != 'unit')
								taro.script.errorLog('unit doesn\'t exist');
						}

						break;

						/* Sound */
					case 'playSoundAtPosition':
						var position = taro.variable.getValue(action.position, vars);
						var sound = taro.game.data.sound[action.sound];
						// if csp enable dont stream sound
						if (sound && position) {
							taro.network.send('sound', { id: action.sound, position: position });
						}
						break;

						/* Music */

					case 'playMusic':
						var music = taro.game.data.music[action.music];
						// if csp enable dont stream music
						if (music) {
							taro.network.send('sound', { cmd: 'playMusic', id: action.music });
						}

						break;

					case 'stopMusic':
						taro.network.send('sound', { cmd: 'stopMusic' });
						break;

					case 'playSoundForPlayer':
						var sound = taro.game.data.sound[action.sound];
						var player = taro.variable.getValue(action.player, vars);
						if (sound && player && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'playSoundForPlayer',
								sound: action.sound
							}, player._stats.clientId);
						}
						break;
					case 'stopSoundForPlayer':
						var sound = taro.game.data.sound[action.sound];
						var player = taro.variable.getValue(action.player, vars);
						if (sound && player && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'stopSoundForPlayer',
								sound: action.sound
							}, player._stats.clientId);
						}
						break;
					case 'playMusicForPlayer':
						var music = taro.game.data.music[action.music];
						var player = taro.variable.getValue(action.player, vars);

						if (music && player && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'playMusicForPlayer',
								music: action.music
							}, player._stats.clientId);
						}

						break;

					case 'playMusicForPlayerRepeatedly':
						var music = taro.game.data.music[action.music];
						var player = taro.variable.getValue(action.player, vars);
						if (music && player && player._category == 'player' && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'playMusicForPlayerRepeatedly',
								music: action.music
							}, player._stats.clientId);
						}

						break;
					case 'showMenuAndSelectCurrentServer':

						var player = taro.variable.getValue(action.player, vars);
						if (player && player._stats && player._category == 'player' && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showMenuAndSelectCurrentServer'
							}, player._stats.clientId);
						}
						break;
					case 'showMenuAndSelectBestServer':
						var player = taro.variable.getValue(action.player, vars);

						if (player && player._stats && player._category == 'player' && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showMenuAndSelectBestServer'
							}, player._stats.clientId);
						}
						break;

					case 'stopMusicForPlayer':
						var player = taro.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'stopMusicForPlayer'
							}, player._stats.clientId);
						}
						break;

						/* Entity */

					case 'flipEntitySprite':

						// console.log('flipUnitSprite:',action);
						var entity = taro.variable.getValue(action.entity, vars);

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
						var entity = taro.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var forceX = taro.variable.getValue(action.force.x, vars);
							if (forceX == undefined || isNaN(forceX)) {
								forceX = 0;
							}

							var forceY = taro.variable.getValue(action.force.y, vars);
							if (forceY == undefined || isNaN(forceY)) {
								forceY = 0;
							}

							entity.applyForce(forceX, forceY);
						} else {
							taro.script.errorLog('invalid entity');
						}

						break;

						/* Entity */
					case 'applyImpulseOnEntityXY':

						var entity = taro.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var impulseX = taro.variable.getValue(action.impulse.x, vars);
							if (impulseX == undefined || isNaN(impulseX)) {
								impulseX = 0;
							}

							var impulseY = taro.variable.getValue(action.impulse.y, vars);
							if (impulseY == undefined || isNaN(impulseY)) {
								impulseY = 0;
							}

							entity.applyImpulse(impulseX, impulseY);
						} else {
							taro.script.errorLog('invalid entity');
						}

						break;

					case 'applyForceOnEntityXYRelative':

						var entity = taro.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var radians = entity._rotate.z + Math.radians(-90); // entity's facing angle

							var forceX = taro.variable.getValue(action.force.x, vars);
							if (forceX == undefined || isNaN(forceX)) {
								forceX = 0;
							}

							var forceY = taro.variable.getValue(action.force.y, vars);
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
						var entity = taro.variable.getValue(action.entity, vars);
						var angle = taro.variable.getValue(action.angle, vars);
						var force = taro.variable.getValue(action.force, vars);
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
						var entity = taro.variable.getValue(action.entity, vars);
						var angle = taro.variable.getValue(action.angle, vars);
						var force = taro.variable.getValue(action.force, vars);
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
						let entityType = taro.variable.getValue(action.entityType, vars);
						let entityToCreate = taro.variable.getValue(action.entity, vars);
						var position = taro.variable.getValue(action.position, vars);
						var height = taro.variable.getValue(action.height, vars) || 100;
						var width = taro.variable.getValue(action.width, vars) || 100;
						var angle = taro.variable.getValue(action.angle, vars) || 0;

						const entityTypeData = taro.game.data[entityType] && taro.game.data[entityType][entityToCreate];

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

								taro.game.lastCreatedItemId = createdEntity._id;
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
								taro.game.lastCreatedProjectileId = createdEntity._id;
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
									var player = taro.variable.getValue(action.player, vars);
									if (player) {
										createdEntity = player.createUnit(_.cloneDeep(data));
									}
								}
								taro.game.lastCreatedUnitId = createdEntity._id;
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
								if (!taro.game.createdEntities) taro.game.createdEntities = [];
								taro.game.createdEntities.push(createdEntity);
							}
						}
						break;
					case 'setEntityDepth':
						var entity = taro.variable.getValue(action.entity, vars);
						var depth = taro.variable.getValue(action.depth, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && typeof depth === 'number') {
							entity.streamUpdateData([{ depth: depth }]);
						}

						break;

					case 'setEntityLifeSpan':
						var entity = taro.variable.getValue(action.entity, vars);
						var lifespan = taro.variable.getValue(action.lifeSpan, vars);

						if (entity && lifespan != undefined && !isNaN(parseFloat(lifespan))) {
							entity.lifeSpan(lifespan);
						}
						break;
					case 'setEntityAttribute':

						var attrId = taro.variable.getValue(action.attribute, vars);
						var value = taro.variable.getValue(action.value, vars);
						var entity = taro.variable.getValue(action.entity, vars);
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

						var attrId = taro.variable.getValue(action.attribute, vars);
						var entity = taro.variable.getValue(action.entity, vars);
						var minValue = taro.variable.getValue(action.value, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes[attrId] != undefined && !isNaN(minValue)) {
							// entity.attribute.setMin(attrId, minValue);
							var min = {};
							min[attrId] = minValue;

							entity.streamUpdateData([{ attributesMin: min }]);
						}
						break;

					case 'setEntityAttributeMax':

						var attrId = taro.variable.getValue(action.attribute, vars);
						var entity = taro.variable.getValue(action.entity, vars);
						var maxValue = taro.variable.getValue(action.value, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes[attrId] != undefined && !isNaN(maxValue)) {
							// entity.attribute.setMax(attrId, maxValue);
							var max = {};
							max[attrId] = maxValue;

							entity.streamUpdateData([{ attributesMax: max }]);
						}
						break;

					case 'setEntityAttributeRegenerationRate':
						var attrId = taro.variable.getValue(action.attribute, vars);
						var entity = taro.variable.getValue(action.entity, vars);
						var regenerationValue = taro.variable.getValue(action.value, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes[attrId] != undefined && !isNaN(regenerationValue)) {
							// entity.attribute.setRegenerationSpeed(attrId, regenerationValue);

							var regenerationSpeed = {};
							regenerationSpeed[attrId] = regenerationValue;

							entity.streamUpdateData([{ attributesRegenerateRate: regenerationSpeed }]);
						}
						break;

					case 'addAttributeBuffToUnit':

						var attrId = taro.variable.getValue(action.attribute, vars);
						var value = taro.variable.getValue(action.value, vars);
						var entity = taro.variable.getValue(action.entity, vars);
						var time = taro.variable.getValue(action.time, vars);
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

						var attrId = taro.variable.getValue(action.attribute, vars);
						var value = taro.variable.getValue(action.value, vars);
						var entity = taro.variable.getValue(action.entity, vars);
						var time = taro.variable.getValue(action.time, vars);
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
						var unit = taro.variable.getValue(action.unit, vars)
						if(unit && unit._stats && unit._stats.buffs){
							for(let i = 0; i < unit._stats.buffs.length; i++){
								unit._stats.buffs[i].timeLimit = 0;
							}
						}
						break;

					case 'moveEntity':
						var position = taro.variable.getValue(action.position, vars);
						var entity = taro.variable.getValue(action.entity, vars);

						if (position && entity && ['unit', 'item', 'projectile'].includes(entity._category)) {
							entity.teleportTo(position.x, position.y, entity._rotate.z);
						}

						break;
					case 'destroyEntity':
						var entity = taro.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							entity.remove();
						} else {
							taro.script.errorLog('invalid unit');
						}

						break;

					case 'setEntityVariable':
						var entity = taro.variable.getValue(action.entity, vars);
						var variable = taro.variable.getValue(action.variable, vars);
						var value = taro.variable.getValue(action.value, vars);

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
								taro.devLog('datatype of value does not match datatype of variable');
							}
						}

						break;

					case 'rotateEntityToRadians':
					case 'rotateEntityToRadiansLT': // No more LT.
						var entity = taro.variable.getValue(action.entity, vars);
						var radians = taro.variable.getValue(action.radians, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && radians !== undefined && !isNaN(radians)) {
							// hack to rotate entity properly
							entity.rotateTo(0, 0, radians);
						}

						break;

					case 'rotateEntityToFacePosition':
						var entity = taro.variable.getValue(action.entity, vars);
						var position = taro.variable.getValue(action.position, vars);
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
							if (taro.isServer) {
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
							else if (taro.isClient && taro.client.myPlayer && (entity == taro.client.selectedUnit || entity.getOwner() == taro.client.selectedUnit)) {
								if (entity._category === 'item') {
									console.log(newFacingAngle);
								}
								entity.rotateTo(0, 0, newFacingAngle);
								// force timeStream to process rotation right away
								// entity._keyFrames.push([taro.network.stream._streamDataTime, [entity._translate.x, entity._translate.y, newFacingAngle]]);
							}
						}
						break;

					case 'rotateEntityToFacePositionUsingRotationSpeed':
						var entity = taro.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var position = taro.variable.getValue(action.position, vars);
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
								// taro.script.errorLog( action.type + " - invalid position")
							}
						} else {
							// taro.script.errorLog( action.type + " - invalid unit")
						}
						break;

						/* AI */

					case 'setUnitTargetPosition': // deprecated
						var unit = taro.variable.getValue(action.unit, vars);
						var position = taro.variable.getValue(action.position, vars);
						if (unit && unit.ai && position) {
							unit.ai.moveToTargetPosition(position.x, position.y);
						}

						break;
					case 'setUnitTargetUnit': // deprecated
						var unit = taro.variable.getValue(action.unit, vars);
						var targetUnit = taro.variable.getValue(action.targetUnit, vars);
						if (unit && unit.ai && targetUnit) {
							unit.ai.attackUnit(targetUnit);
						}
						break;

					case 'aiMoveToPosition':
						var unit = taro.variable.getValue(action.unit, vars);
						var position = taro.variable.getValue(action.position, vars);
						if (unit && unit.ai && position) {
							unit.ai.moveToTargetPosition(position.x, position.y);
						}
						break;
					case 'aiAttackUnit':
						var unit = taro.variable.getValue(action.unit, vars);
						var targetUnit = taro.variable.getValue(action.targetUnit, vars);
						if (unit && unit.ai && targetUnit) {
							unit.ai.attackUnit(targetUnit);
						}
						break;

					case 'makePlayerTradeWithPlayer':
						var playerA = taro.variable.getValue(action.playerA, vars);
						var playerB = taro.variable.getValue(action.playerB, vars);
						if (playerA && playerB && playerA._category === 'player' && playerB._category === 'player') {
							if (!playerB.isTrading) {
								taro.network.send('trade', { type: 'init', from: playerA.id() }, playerB._stats.clientId);
							} else {
								var message = `${playerB._stats.name}is busy`;
								taro.chat.sendToRoom('1', message, playerA._stats.clientId, undefined);
							}
						}
						break;
					case 'applyTorqueOnEntity':
						var entity = taro.variable.getValue(action.entity, vars);
						var torque = taro.variable.getValue(action.torque, vars);

						if (entity && torque) {
							entity.applyTorque(torque);
						}
						// apply torque on entity here

						break;
					case 'attachEntityToEntity':
						var entity = taro.variable.getValue(action.entity, vars);
						var targetEntity = taro.variable.getValue(action.targetingEntity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && targetEntity && self.entityCategories.indexOf(targetEntity._category) > -1) {
							entity.attachTo(targetEntity);
						}

						break;

					case 'changeScaleOfEntitySprite':
						var entity = taro.variable.getValue(action.entity, vars);
						var scale = taro.variable.getValue(action.scale, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && !isNaN(scale)) {
							entity.streamUpdateData([{ scale: parseFloat(scale).toFixed(2) }]);
						}
						break;

					case 'changeScaleOfEntityBody':
						var entity = taro.variable.getValue(action.entity, vars);
						var scale = taro.variable.getValue(action.scale, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && !isNaN(scale)) {
							entity.streamUpdateData([{ scaleBody: parseFloat(scale).toFixed(2) }]);
						}
						break;

					case 'setEntityState':
						var entity = taro.variable.getValue(action.entity, vars);
						var stateId = action.state;

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							entity.setState(stateId);
						}

						break;
					case 'increaseVariableByNumber':
						var newValue = taro.variable.getValue(action.number, vars);
						if (taro.game.data.variables.hasOwnProperty(action.variable) && !_.isNaN(newValue) && !_.isNil(newValue)) {
							var variable = taro.game.data.variables[action.variable];
							if (variable.value === undefined || isNaN(variable.value)) {
								variable = variable.default || 0;
							}
							variable.value += newValue;
						}
						break;

					case 'decreaseVariableByNumber':
						var newValue = taro.variable.getValue(action.number, vars);
						if (taro.game.data.variables.hasOwnProperty(action.variable) && !_.isNaN(newValue) && !_.isNil(newValue)) {
							var variable = taro.game.data.variables[action.variable];
							if (variable.value === undefined || isNaN(variable.value)) {
								variable = variable.default || 0;
							}
							variable.value -= newValue;
						}
						break;

					case 'loadPlayerDataAndApplyIt':
						var player = taro.variable.getValue(action.player, vars);
						if (player) {
							if (player.persistedData) {
								player.loadPersistentData();
								console.log('player data loaded');

								if (action.unit) {
									var unit = taro.variable.getValue(action.unit, vars);
									if (unit) {
										unit.loadPersistentData();
										console.log('unit data loaded');
									}
								}
							}
						}
						break;

					case 'loadUnitData':
						var unit = taro.variable.getValue(action.unit, vars);
						var owner = unit.getOwner();
						if (unit && owner && owner.persistedData) {
							unit.loadPersistentData();
						}
						break;

					case 'loadUnitDataFromString':
						var unit = taro.variable.getValue(action.unit, vars);
						try {
							var data = JSON.parse(taro.variable.getValue(action.string, vars));
						} catch (err) {
							console.error(err);
							return;
						}
						if (unit && data) {
							unit.loadDataFromString(data);
						}
						break;

					case 'loadPlayerDataFromString':
						var player = taro.variable.getValue(action.player, vars);
						try {
							var data = JSON.parse(taro.variable.getValue(action.string, vars));
						} catch (err) {
							console.error(err);
							return;
						}
						if (player && data) {
							player.loadDataFromString(data);
						}
						break;

					case 'loadPlayerData':
						var player = taro.variable.getValue(action.player, vars);
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
				taro.script.errorLog(e); // send error msg to client
			}
		}
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = ActionComponent; }
