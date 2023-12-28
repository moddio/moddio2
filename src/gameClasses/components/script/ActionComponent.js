var ActionComponent = TaroEntity.extend({
	classId: 'ActionComponent',
	componentId: 'action',

	init: function (scriptComponent, entity) {
		this._entity = entity;
		this._script = scriptComponent;
		this.entityCategories = ['unit', 'item', 'projectile', 'region', 'wall'];
		this.lastProgressTrackedValue = null;
	},

	// entity can be either trigger entity, or entity in loop
	run: function (actionList, vars, path) {
		var self = this;


		if (actionList == undefined || actionList.length <= 0)
			return;

		for (var i = 0; i < actionList.length; i++) {
			var action = actionList[i];
			if (!action || action.disabled == true || // if action is disabled or
				(taro.isClient && action.runMode == 0) || // don't run on client if runMode is 'server authoritative'
				(taro.isServer && action.runMode == 1) || // don't run on server if runMode is 'client only'
				(taro.isClient && (!action.runOnClient && !action.runMode)) // backward compatibility for older versions
			) {
				continue;
			}

			if (taro.profiler.isEnabled) {
				var startTime = performance.now();
				// var actionPath = path + "/" + i + "("+action.type+")";
				var actionPath = `${path}/${i}`;
			}

			// assign runMode engine-widely, so functions like item.use() can reference to what the current runMode is
			// for item.use(), if runMode == 0, then it will stream quantity change to its owner player
			taro.runMode = (action.runMode) ? 1 : 0;

			if (taro.isServer) {

				var now = Date.now();
				var lastActionRunTime = now - taro.lastActionRanAt;
				var engineTickDelta = now - taro.now;

				// prevent recursive/infinite action calls consuming CPU
				if (engineTickDelta > 1000 && !taro.engineLagReported) {
					var rollbarData = {
						query: 'engineFreeze',
						engineTickDelta: engineTickDelta,
						masterServer: global.myIp,
						gameInfo: taro.gameInfo,
						clientCommands: taro.network.commandCount,
						actionProfiler: taro.actionProfiler,
						lastAction: action.type,
						triggerProfiler: taro.triggerProfiler
					};

					global.rollbar.log('engineStep is taking longer than 1000ms', rollbarData);

					var errorMsg = taro.script.errorLog(`engineTick is taking longer than 1000ms (took ${engineTickDelta} ms)`, path);
					console.log(errorMsg, rollbarData);
					taro.engineLagReported = true;
					// taro.server.unpublish(errorMsg); // not publishing yet cuz TwoHouses will get unpub. loggin instead.
				}

				if (taro.lastAction) {
					if (taro.actionProfiler[taro.lastAction]) {
						var count = taro.actionProfiler[taro.lastAction].count;
						taro.actionProfiler[taro.lastAction].count++;
						taro.actionProfiler[taro.lastAction].avgTime = ((taro.actionProfiler[taro.lastAction].avgTime * count) + lastActionRunTime) / (count + 1)
						taro.actionProfiler[taro.lastAction].totalTime += lastActionRunTime;
					} else {
						taro.actionProfiler[taro.lastAction] = { count: 1, avgTime: lastActionRunTime, totalTime: lastActionRunTime };
					}
				}

				taro.lastAction = action.type;
				taro.lastActionRanAt = now;
			}

			var params = {};
			var entity = self._script.variable.getValue(action.entity, vars);
			self._script.currentActionName = action.type;
			var invalidParameters = [];

			if (action.params == undefined) {
				for (j in action) {
					// add everything else in action object into param
					if (j != 'type') {
						params[j] = action[j];
					}
				}
			}
			self._script.recordLast50Action(action.type);
			try {
				switch (action.type) {
					/* Global */

					case 'setVariable': // store variables with formula processed
						var newValue = self._script.variable.getValue(action.value, vars);
						params.newValue = newValue;
						if (taro.game.data.variables.hasOwnProperty(action.variableName)) {
							taro.game.lastUpdatedVariableName = action.variableName;
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
							taro.game.updateDevConsole({ type: 'setVariable', params: params });
						} else {
							// console.log('setVariable:', action.variableName, newValue);
						}

						break;

					case 'setTimeOut': // execute actions after timeout

						// const use for creating new instance of variable every time.
						const setTimeOutActions = rfdc()(action.actions);
						// const setTimeoutVars = rfdc()(vars);
						var duration = self._script.variable.getValue(action.duration, vars);
						setTimeout(function (actions, currentScriptId) {
							let previousScriptId = currentScriptId;
							self._script.currentScriptId = currentScriptId;
							self.run(actions, vars, actionPath);
							self._script.currentScriptId = previousScriptId;
						}, duration, setTimeOutActions, self._script.currentScriptId);
						break;

					case 'repeat':
						{
							var count = self._script.variable.getValue(action.count, vars);
							var repeatActions = self._script.variable.getValue(action.actions, vars);

							if (!isNaN(count) && count > 0) {
								for (let i = 0; i < count; i++) {
									returnValue = self.run(repeatActions, vars, actionPath);

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
						let previousScriptId = self._script.currentScriptId;
						self._script.runScript(action.scriptName, vars);
						self._script.currentScriptId = previousScriptId;
						break;

					case 'condition':
						if (self._script.condition.run(action.conditions, vars, actionPath + '/condition')) {
							var brk = self.run(action.then, vars, actionPath + '/then');
						} else {
							var brk = self.run(action.else, vars, actionPath + '/else');
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
						var region = self._script.variable.getValue(action.region, vars);
						// regionId seems like unnecessary stream data
						var regionId = action.region.variableName;
						if (region) {
							var x = self._script.variable.getValue(action.x, vars);
							var y = self._script.variable.getValue(action.y, vars);
							var width = self._script.variable.getValue(action.width, vars);
							var height = self._script.variable.getValue(action.height, vars);
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

					case 'changeRegionColor':
						var region = self._script.variable.getValue(action.region, vars);
						if (region) {
							const insideColor = self._script.variable.getValue(action.inside, vars);
							const alpha = self._script.variable.getValue(action.alpha, vars);
							var data = [
								{ inside: insideColor },
								{ alpha: alpha }
							];
							data = data.filter(obj => obj[Object.keys(obj)[0]] !== null);
							region.streamUpdateData(data);
						}

						break;

					case 'setLastAttackingUnit':
						var unit = self._script.variable.getValue(action.unit, vars);
						taro.game.lastAttackingUnitId = unit.id();

						break;

					case 'setLastAttackedUnit':
						var unit = self._script.variable.getValue(action.unit, vars);
						taro.game.lastAttackedUnitId = unit.id();

						break;

					case 'setLastAttackingItem':
						var item = self._script.variable.getValue(action.item, vars);
						taro.game.lastAttackingItemId = item.id();

						break;

					case 'sendPostRequest':
						var obj = self._script.variable.getValue(action.string, vars);
						var url = self._script.variable.getValue(action.url, vars);
						var proxyUrl = process.env.PROXY_URL || '';
						var requestUrl = `${proxyUrl}${url}`;
						var varName = self._script.variable.getValue(action.varName, vars);

						// console.log("sendPostRequest obj", obj)

						try {
							obj = JSON.parse(obj);
						} catch (err) {
							throw new Error(err);
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
						}, function optionalCallback(err, httpResponse, body) {
							if (err) {
								// don't throw new Error here, because it's inside callback and it won't get caught
								self._script.errorLog(err, path);
							}

							try {
								var res = JSON.parse(body);

								// console.log("res JSON", res)

								var newValue = res.response;
								params['newValue'] = newValue;

								if (taro.game.data.variables.hasOwnProperty(varName)) {
									taro.game.data.variables[varName].value = newValue;
								}
							} catch (err) {
								// don't throw new Error here, because it's inside callback and it won't get caught
								self._script.errorLog(err, path);
							}
						});

						break;


					case 'requestPost':
						var data = self._script.variable.getValue(action.data, vars) || {};
						var url = self._script.variable.getValue(action.url, vars);
						var varName = self._script.variable.getValue(action.varName, vars);
						var proxyUrl = process.env.PROXY_URL || '';
						var requestUrl = `${proxyUrl}${url}`;

						// ensure we aren't sending more than 30 POST requests within 10 seconds
						taro.server.postReqTimestamps.push(taro.currentTime());
						var oldestReqTimestamp = taro.server.postReqTimestamps[0]
						while (Date.now() - oldestReqTimestamp > 10000 && taro.server.postReqTimestamps.length > 0) {
							oldestReqTimestamp = taro.server.postReqTimestamps.shift();
						}
						if (taro.server.postReqTimestamps.length > 30) {
							taro.server.unpublishQueued = true;
							throw new Error('Game server is sending too many POST requests. You cannot send more than 30 req per every 10s.');
						}

						data.url = requestUrl;

						// console.log("requestPost data", data);

						// use closure to store globalVariableName
						(function (targetVarName) {
							taro.server.request.post(data, function optionalCallback(err, httpResponse, body) {
								// try+catch must be redeclared inside callback otherwise an error will crash the process
								try {

									// console.log("body", body)
									if (err) {
										// don't throw new Error here, because it's inside callback and it won't get caught
										self._script.errorLog(err, path);
									}

									if (taro.game.data.variables.hasOwnProperty(targetVarName)) {
										taro.game.data.variables[targetVarName].value = body;
									}

									taro.game.lastReceivedPostResponse = body;
									taro.game.lastUpdatedVariableName = targetVarName;

									// if sendPostRequest was called from a unit/item/projectile, then pass the triggering entity's id onPostResponse
									var vars = {}
									if (["unit", "item", "projectile"].includes(self._entity._category)) {
										var key = self._entity._category + 'Id';
										vars = { [key]: self._entity.id() }
									}

									self._entity.script.trigger('onPostResponse', vars);
								} catch (e) {
									// don't throw new Error here, because it's inside callback and it won't get caught
									self._script.errorLog(e, path);
								}

							})
						})(varName);

						break;

					/* Player */

					case 'kickPlayer':
						var player = self._script.variable.getValue(action.entity, vars);
						var message = self._script.variable.getValue(action.message, vars);
						if (player && player._category == 'player') {
							taro.game.kickPlayer(player.id(), message);
						}

						break;

					case 'playEntityAnimation':
						var animationId = self._script.variable.getValue(action.animation, vars);
						// console.log('playing unit animation!', animationId);
						var entity = self._script.variable.getValue(action.entity, vars);
						if (entity) {
							entity.applyAnimationById(animationId);
						}

						break;

					case 'setPlayerAttribute':
						var attrId = self._script.variable.getValue(action.attribute, vars);
						var player = self._script.variable.getValue(action.entity, vars);
						if (player && player._category == 'player' && player._stats.attributes) {
							var attribute = player._stats.attributes[attrId];
							if (attribute != undefined) {
								var decimalPlace = parseInt(attribute.decimalPlaces) || 0;
								var value = parseFloat(self._script.variable.getValue(action.value, vars)).toFixed(decimalPlace);
								player.attribute.update(attrId, value); // update attribute, and check for attribute becoming 0

								// track guided tutorial progress
								var parentGameId = taro?.game?.data?.defaultData?.parentGameId;
								if (parentGameId == '646d39f8d9317a8253b8a143' && attribute.name == 'progress') {
									// for tracking user progress in tutorials
									var client = taro.server.clients[player._stats.clientId];
									var socket = client.socket;

									if (value !== this.lastProgressTrackedValue) {
										global.trackServerEvent && global.trackServerEvent({
											eventName: 'Tutorial Progress Updated',
											properties: {
												'$ip': socket._remoteAddress,
												'gameSlug': taro?.game?.data?.defaultData?.gameSlug,
												'gameId': taro?.game?.data?.defaultData?._id,
												'parentGameId': parentGameId,
												'progress': value,
												'tutorialVersion': 'v2'
											}
										}, socket);
									}

									this.lastProgressTrackedValue = newValue;
								}
							}
						}

						break;

					case 'setPlayerAttributeMax':
						var attrId = self._script.variable.getValue(action.attributeType, vars);
						var player = self._script.variable.getValue(action.player, vars);
						var maxValue = self._script.variable.getValue(action.number, vars);
						if (player && player._category == 'player' && player._stats.attributes && player._stats.attributes[attrId] != undefined) {

							player.attribute.update(attrId, null, null, maxValue);
						}

						break;
					case 'setPlayerAttributeMin':
						var attrId = self._script.variable.getValue(action.attributeType, vars);
						var player = self._script.variable.getValue(action.player, vars);
						var minValue = self._script.variable.getValue(action.number, vars);
						if (player && player._category == 'player' && player._stats.attributes && player._stats.attributes[attrId] != undefined) {

							player.attribute.update(attrId, null, minValue, null);
						}

						break;
					case 'setPlayerAttributeRegenerationRate':
						var attrId = self._script.variable.getValue(action.attributeType, vars);
						var player = self._script.variable.getValue(action.player, vars);
						var regenerateRateValue = self._script.variable.getValue(action.number, vars);
						if (player && player._category == 'player' && player._stats.attributes && player._stats.attributes[attrId] != undefined) {
							var regRate = {};
							regRate[attrId] = regenerateRateValue;

							player.streamUpdateData([{ attributesRegenerateRate: regRate }]);
						}

						break;
					case 'setPlayerName':

						var name = self._script.variable.getValue(action.name, vars);
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._category == 'player') {
							player.streamUpdateData([{ name: name }]);
						}

						break;

					case 'assignPlayerType':
						var playerTypeId = self._script.variable.getValue(action.playerType, vars);

						if (entity && entity._category == 'player') {
							var player = entity;
							player.streamUpdateData([{ playerTypeId: playerTypeId }]);
						}

						break;

					case 'setPlayerVariable':
						var player = self._script.variable.getValue(action.player, vars);
						var variable = self._script.variable.getValue(action.variable, vars);
						var value = self._script.variable.getValue(action.value, vars);

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
								throw new Error('datatype of value does not match datatype of variable');
							}
						}

						break;
					case 'changeDescriptionOfItem':
						var item = self._script.variable.getValue(action.item, vars);
						var description = self._script.variable.getValue(action.string, vars);
						if (item && description) {
							item.streamUpdateData([{ description: description }]);
						}
						break;

					case 'changeItemInventoryImage':
						var item = self._script.variable.getValue(action.item, vars);
						var url = self._script.variable.getValue(action.url, vars);
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
						var unit = self._script.variable.getValue(action.unit, vars);
						var ownerPlayer = unit.getOwner();
						var userId = ownerPlayer._stats.userId;

						if (unit && ownerPlayer && userId && ownerPlayer.persistentDataLoaded) {
							var data = unit.getPersistentData('unit');
							taro.clusterClient.saveUserData(userId, data, 'unit');
						} else {
							if (!unit.persistentDataLoaded) {
								throw new Error('Fail saving unit data bcz persisted data not set correctly');
							} else {
								throw new Error('Fail saving unit data');
							}
						}
						break;
					case 'savePlayerData':
						var player = self._script.variable.getValue(action.player, vars);
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
									throw new Error('Fail saving unit data bcz persisted data not set correctly');
								} else {
									throw new Error('Fail saving unit data');
								}
							}
						} else {
							if (player && !player.persistentDataLoaded) {
								throw new Error('Fail saving unit data bcz persisted data not set correctly');
							} else {
								throw new Error('Fail saving player data');
							}
						}

						break;

					case 'makePlayerSelectUnit':
						var player = self._script.variable.getValue(action.player, vars);
						var unit = self._script.variable.getValue(action.unit, vars);

						// only computer player can be forced to say stuff
						if (player && unit) {
							player.selectUnit(unit.id());
						}

						break;

					/* Coins */
					// fee is deducted from the player to whom sending the coins
					case 'sendCoinsToPlayer':
						var coins = self._script.variable.getValue(action.coins, vars);
						var player = self._script.variable.getValue(action.player, vars);
						var userId = player && player._stats && player._stats.userId;

						if (player && userId && coins && Math.floor(coins) > 0) {
							taro.server.sendCoinsToPlayer(userId, coins);
						}
						break;

					// fee is deducted from the owner end
					case 'sendCoinsToPlayer2':
						var coins = self._script.variable.getValue(action.coins, vars);
						var player = self._script.variable.getValue(action.player, vars);
						var userId = player && player._stats && player._stats.userId;

						if (player && userId && coins && Math.floor(coins) > 0) {
							// only difference is the addition *10/9
							taro.server.sendCoinsToPlayer(userId, coins, true);
						}
						break;

					/* UI */
					case 'showUiTextForPlayer':
						if (entity && entity._stats) {
							var text = self._script.variable.getValue(action.value, vars);
							taro.gameText.updateText({ target: action.target, value: text, action: 'show' }, entity._stats.clientId);
						}
						break;

					case 'showUiTextForEveryone':
						var text = self._script.variable.getValue(action.value, vars);
						taro.gameText.updateText({ target: action.target, value: text, action: 'show' });
						break;

					case 'hideUiTextForPlayer':
						if (entity && entity._stats) {
							var text = self._script.variable.getValue(action.value, vars);
							taro.gameText.updateText({ target: action.target, value: text, action: 'hide' }, entity._stats.clientId);
						}
						break;

					case 'hideUiTextForEveryone':
						var text = self._script.variable.getValue(action.value, vars);
						taro.gameText.updateText({ target: action.target, value: text, action: 'hide' });
						break;

					case 'updateUiTextForTimeForPlayer':
						var text = self._script.variable.getValue(action.value, vars);
						var player = self._script.variable.getValue(action.player, vars);
						var time = self._script.variable.getValue(action.time, vars);
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
							var text = self._script.variable.getValue(action.value, vars);
							taro.gameText.updateText({ target: action.target, value: text, action: 'update' }, entity._stats.clientId);
						}
						break;

					case 'appendRealtimeCSSForPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						var text = self._script.variable.getValue(action.value, vars);
						if (player && player._stats && player._stats.controlledBy == 'human') {
							taro.network.send('updateUiRealtimeCSS', { action: 'append', style: text });
							player.realtimeCSS += '\n' + text;
						}
						break;
					
					case 'updateRealtimeCSSForPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						var text = self._script.variable.getValue(action.value, vars);
						if (player && player._stats && player._stats.controlledBy == 'human') {
							taro.network.send('updateUiRealtimeCSS', { action: 'update', style: text });
							player.realtimeCSS = text;
						}
						break;

					case 'showGameSuggestionsForPlayer':

						var player = self._script.variable.getValue(action.player, vars);
						if (player && player._stats && player._stats.clientId) {
							taro.network.send('gameSuggestion', { type: 'show' }, player._stats.clientId);
						}

						break;

					case 'hideGameSuggestionsForPlayer':

						var player = self._script.variable.getValue(action.player, vars);
						if (player && player._stats && player._stats.clientId) {
							taro.network.send('gameSuggestion', { type: 'hide' }, player._stats.clientId);
						}
						break;

					case 'updateUiTextForEveryone':
						var text = self._script.variable.getValue(action.value, vars);
						taro.gameText.updateText({ target: action.target, value: text, action: 'update' });
						break;

					case 'showInputModalToPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						var inputLabel = self._script.variable.getValue(action.inputLabel, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showInputModal',
								fieldLabel: inputLabel,
								isDismissible: false
							}, player._stats.clientId);
						}
						break;
					case 'showDismissibleInputModalToPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						var inputLabel = self._script.variable.getValue(action.inputLabel, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showInputModal',
								fieldLabel: inputLabel,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'showCustomModalToPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						var htmlContent = self._script.variable.getValue(action.htmlContent, vars) || '';
						var modalTitle = self._script.variable.getValue(action.title, vars) || '';

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
						var player = self._script.variable.getValue(action.player, vars);
						var url = self._script.variable.getValue(action.string, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showWebsiteModal',
								url: url,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'showSocialShareModalToPlayer':
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showSocialShareModal',
								isDismissible: true
							}, player._stats.clientId);
						}
						break;
					case 'openWebsiteForPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						var url = self._script.variable.getValue(action.string, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'openWebsite',
								url: url,
								isDismissible: true
							}, player._stats.clientId);
						}
						break;

					case 'showInviteFriendsModal':
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showFriendsModal'
							}, player._stats.clientId);
						}
						break;

					case 'showMenu':
						var player = self._script.variable.getValue(action.player, vars);
						if (player && player._stats) {
							taro.network.send('ui', { command: 'showMenu' }, player._stats.clientId);
						}
						break;

					case 'makePlayerSendChatMessage':
						var player = self._script.variable.getValue(action.player, vars);
						var message = self._script.variable.getValue(action.message, vars);
						if (player && player._stats && player._stats.clientId && player._stats.controlledBy == 'computer') {
							taro.chat.sendToRoom('1', message, undefined, player._stats.clientId);
						}

						break;

					case 'sendChatMessage':
						var message = self._script.variable.getValue(action.message, vars);
						taro.chat.sendToRoom('1', message, undefined, undefined);
						break;

					case 'sendChatMessageToPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						if (player && player._category == 'player' && player._stats.clientId) {
							var clientId = player._stats.clientId;
							taro.chat.sendToRoom('1', self._script.variable.getValue(action.message, vars), clientId, undefined);
						}

						break;

					case 'addChatFilter':
						let words = self._script.variable.getValue(action.words, vars);
						if (words) {
							words = words.match(/(?=\S)[^,]+?(?=\s*(,|$))/g);
							taro.chat.filter?.addWords(...words);
						}
						break;

					case 'banPlayerFromChat':
						var player = self._script.variable.getValue(action.player, vars);
						taro.server.updateTempMute({
							player,
							banChat: true
						});
						break;

					case 'unbanPlayerFromChat':
						var player = self._script.variable.getValue(action.player, vars);
						taro.server.updateTempMute({
							player,
							banChat: false
						});

						break;

					case 'playerCameraSetZoom':
						var player = self._script.variable.getValue(action.player, vars);
						var zoom = self._script.variable.getValue(action.zoom, vars);
						if (player && player._category == 'player' && zoom != undefined && player._stats.clientId) {
							taro.network.send('camera', { cmd: 'zoom', zoom: zoom }, player._stats.clientId);
						}
						break;

					case 'showUnitInPlayerMinimap':
						var player = self._script.variable.getValue(action.player, vars);
						var unit = self._script.variable.getValue(action.unit, vars);
						var color = self._script.variable.getValue(action.color, vars);

						if (unit?._category === 'unit' && player?._stats?.clientId && typeof color == 'string') {
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
						var player = self._script.variable.getValue(action.player, vars);
						var unit = self._script.variable.getValue(action.unit, vars);
						var color = self._script.variable.getValue(action.color, vars);

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
							var units = self._script.variable.getValue(action.unitGroup, vars) || [];
							for (var l = 0; l < units.length; l++) {
								var unit = units[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedUnit: unit }), actionPath);

								if (brk == 'break' || vars.break) {
									vars.break = false;
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
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
							var players = self._script.variable.getValue(action.playerGroup, vars) || [];
							for (var l = 0; l < players.length; l++) {
								var player = players[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedPlayer: player }), actionPath);

								if (brk == 'break' || vars.break) {
									vars.break = false;
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
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
							var items = self._script.variable.getValue(action.itemGroup, vars) || [];
							for (var l = 0; l < items.length; l++) {
								var item = items[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedItem: item }), actionPath);

								if (brk == 'break' || vars.break) {
									vars.break = false;
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
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
							var projectiles = self._script.variable.getValue(action.projectileGroup, vars) || [];
							for (var l = 0; l < projectiles.length; l++) {
								var projectile = projectiles[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedProjectile: projectile }), actionPath);

								if (brk == 'break' || vars.break) {
									vars.break = false;
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
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
							var entities = self._script.variable.getValue(action.entityGroup, vars) || [];
							for (var l = 0; l < entities.length; l++) {
								var entity = entities[l];
								// if (['unit', 'item', 'projectile', 'wall'].includes(entity._category)) {
								if (self.entityCategories.indexOf(entity._category) > -1) {
									var brk = self.run(action.actions, Object.assign(vars, { selectedEntity: entity }), actionPath);

									if (brk == 'break' || vars.break) {
										vars.break = false;
										break;
									} else if (brk == 'continue') {
										continue;
									} else if (brk == 'return') {
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
							var regions = self._script.variable.getValue(action.regionGroup, vars) || [];
							for (var l = 0; l < regions.length; l++) {
								var region = regions[l];
								var brk = self.run(action.actions, Object.assign(vars, { selectedRegion: region }), actionPath);

								if (brk == 'break' || vars.break) {
									vars.break = false;
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
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
							var unitTypes = self._script.variable.getValue(action.unitTypeGroup, vars) || {};

							for (var unitTypeKey in unitTypes) {
								var brk = self.run(action.actions, Object.assign(vars, { selectedUnitType: unitTypeKey }), actionPath);

								if (brk == 'break' || vars.break) {
									vars.break = false;
									break;
								} else if (brk == 'continue') {
									continue;
								} else if (brk == 'return') {
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
							var itemTypes = self._script.variable.getValue(action.itemTypeGroup, vars) || {};

							// sorting items before they are used. which solves issue of getting first item in slot
							itemTypes = Object.keys(itemTypes);
							var itemsArr = _.map(itemTypes, (itemId) => {
								var item = taro.game.cloneAsset('itemTypes', itemId);
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
									var brk = self.run(action.actions, Object.assign(vars, { selectedItemType: itemTypeKey }), actionPath);

									if (brk == 'break' || vars.break) {
										vars.break = false;
										break;
									} else if (brk == 'continue') {
										continue;
									} else if (brk == 'return') {
										return 'return';
									}
								}
							}
						}
						break;

					case 'while':
						var loopCounter = 0;

						while (self._script.condition.run(action.conditions, vars, actionPath)) {
							var brk = self.run(action.actions, vars, actionPath);
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

								taro.server.unpublishQueued = true;
								throw new Error("infinite loop detected"); // break infinite loop
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

							var start = self._script.variable.getValue(action.start, vars);
							var stop = self._script.variable.getValue(action.stop, vars);

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
								var brk = self.run(action.actions, vars, actionPath);

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

					case 'startMovingUnitUp':
						if (entity && entity._category === 'unit' && entity.ability) {
							entity.ability.moveUp();
						}
						break;

					case 'startMovingUnitDown':
						if (entity && entity._category === 'unit' && entity.ability) {
							entity.ability.moveDown();
						}
						break;

					case 'startMovingUnitLeft':
						if (entity && entity._category === 'unit' && entity.ability) {
							entity.ability.moveLeft();
						}
						break;

					case 'startMovingUnitRight':
						if (entity && entity._category === 'unit' && entity.ability) {
							entity.ability.moveRight();
						}
						break;

					case 'stopMovingUnitX':
						if (entity && entity._category === 'unit' && entity.ability) {
							entity.ability.stopMovingX();
						}
						break;

					case 'stopMovingUnitY':
						if (entity && entity._category === 'unit' && entity.ability) {
							entity.ability.stopMovingY();
						}
						break;

					case 'stopMovingUnit':
						if (entity && entity._category === 'unit' && entity.ability) {
							entity.ability.stopMovingX();
							entity.ability.stopMovingY();
						}
						break;

					case 'createUnitAtPosition':
						var player = self._script.variable.getValue(action.entity, vars);

						var unitTypeId = self._script.variable.getValue(action.unitType, vars);
						var unitTypeData = taro.game.cloneAsset('unitTypes', unitTypeId);

						var spawnPosition = self._script.variable.getValue(action.position, vars);
						var facingAngle = self._script.variable.getValue(action.angle, vars) || 0;
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
							if (!player) invalidParameters.push('player');
							if (!spawnPosition) invalidParameters.push('spawn position');
							if (!unitTypeId) invalidParameters.push('unit type');
							throw new Error(`cannot create unit. invalid parameter(s) given: ${invalidParameters.toString()}`);
						}

						break;

					case 'changeUnitType':

						var unitTypeId = self._script.variable.getValue(action.unitType, vars);
						if (entity && entity._category == 'unit' && unitTypeId != null) {
							entity.streamUpdateData([{ type: unitTypeId }]);
						} else {
							if (!entity) invalidParameters.push('unit');
							if (!unitTypeId) invalidParameters.push('unit type');
							throw new Error(`cannot change unit type. invalid parameter(s) given: ${invalidParameters.toString()}`);
						}

						break;

					case 'changeUnitSpeed':

						var bonusSpeed = self._script.variable.getValue(action.unitSpeed, vars);

						if (entity != undefined && entity._stats != undefined && entity._category != undefined && bonusSpeed != undefined) {
							entity.streamUpdateData([{ bonusSpeed: bonusSpeed }]);
						}

						break;

					case 'changeSensorRadius':
						var sensor = self._script.variable.getValue(action.sensor, vars);
						var radius = self._script.variable.getValue(action.radius, vars);
						// console.log("changeSensorRadius", sensor.id(), radius)
						if (sensor && sensor._category == 'sensor') {
							if (!isNaN(radius)) {
								sensor.updateRadius(radius);
							}
						}
						break;

					case 'setMaxAttackRange':
						var unit = self._script.variable.getValue(action.unit, vars);
						var value = self._script.variable.getValue(action.number, vars);
						if (unit) {
							if (!isNaN(value)) {
								unit._stats.ai.maxAttackRange = value;
								unit.ai.maxAttackRange = value;
							}
						}
						break;

					case 'setLetGoDistance':
						var unit = self._script.variable.getValue(action.unit, vars);
						var value = self._script.variable.getValue(action.number, vars);
						if (unit) {
							if (!isNaN(value)) {
								unit._stats.ai.letGoDistance = value;
								unit.ai.letGoDistance = value;
							} else {
								unit._stats.ai.letGoDistance = undefined;
								unit.ai.letGoDistance = undefined;
							}
						}
						break;

					case 'setMaxTravelDistance':
						var unit = self._script.variable.getValue(action.unit, vars);
						var value = self._script.variable.getValue(action.number, vars);
						if (unit) {
							if (!isNaN(value)) {
								unit._stats.ai.maxTravelDistance = value;
								unit.ai.maxTravelDistance = value;
							} else {
								unit._stats.ai.maxTravelDistance = undefined;
								unit.ai.maxTravelDistance = undefined;
							}
						}
						break;

					case 'setEntityVelocityAtAngle':

						var entity = self._script.variable.getValue(action.entity, vars);
						var speed = self._script.variable.getValue(action.speed, vars) || 0;
						var radians = self._script.variable.getValue(action.angle, vars); // entity's facing angle
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
						var entity = self._script.variable.getValue(action.entity, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var velocityX = self._script.variable.getValue(action.velocity.x, vars);
							if (velocityX == undefined || isNaN(velocityX)) {
								velocityX = 0;
							}

							var velocityY = self._script.variable.getValue(action.velocity.y, vars);
							if (velocityY == undefined || isNaN(velocityY)) {
								velocityY = 0;
							}

							entity.setLinearVelocity(velocityX, velocityY);
						} else {
							throw new Error(`invalid entity`);
						}

						break;

					case 'setUnitOwner':
						var unit = self._script.variable.getValue(action.unit, vars);
						var player = self._script.variable.getValue(action.player, vars);
						if (unit && player) {
							unit.setOwnerPlayer(player.id());
						}

						break;

					case 'setUnitNameLabel':
						var unit = self._script.variable.getValue(action.unit, vars);
						var name = self._script.variable.getValue(action.name, vars);
						if (unit) {
							unit.streamUpdateData([{ name: name }]);
						}

						break;

					// PAUSED

					// case 'setUnitNameLabelColor':
					// 	var unit = self._script.variable.getValue(action.unit, vars);
					// 	var color = self._script.variable.getValue(action.color, vars);

					// 	try {
					// 		if (
					// 			unit &&
					// 			typeof color === 'string' &&
					// 			Colors.isValidColor(color)
					// 		) {
					// 			unit.setNameLabelColor(color);
					// 		} else {
					// 			throw new Error(`Is '${color}' a valid hex code or extended color string? Correct unit?`);
					// 		}
					// 	} catch (err) {
					// 		self._script.errorLog(err, path);
					// 	}

					// 	break;

					case 'setUnitNameLabelColorForPlayer':
						var unit = self._script.variable.getValue(action.unit, vars);
						var color = self._script.variable.getValue(action.color, vars);
						var player = self._script.variable.getValue(action.player, vars);

						try {
							if (
								unit &&
								player &&
								typeof color === 'string' &&
								Colors.isValidColor(color)
							) {
								unit.setNameLabelColor(color, player);
							} else {
								throw new Error(`Is '${color}' a valid hex code or extended color string? Correct unit, player?`);
							}
						} catch (err) {
							self._script.errorLog(err, path);
						}

						break;

					case 'setItemName':
						var item = self._script.variable.getValue(action.item, vars);
						var name = self._script.variable.getValue(action.name, vars);
						if (item) {
							item.streamUpdateData([{ name: name }]);
						}

						break;

					case 'setFadingTextOfUnit':
						var unit = self._script.variable.getValue(action.unit, vars);
						var text = self._script.variable.getValue(action.text, vars);
						var color = self._script.variable.getValue(action.color, vars);

						if (unit && unit._category === 'unit' && text !== undefined) {
							unit.streamUpdateData([
								{ setFadingText: `${text}|-|${color}` }
							]);
						}

						break;

					case 'createFloatingText':
						var position = self._script.variable.getValue(action.position, vars);
						var text = self._script.variable.getValue(action.text, vars);
						var color = self._script.variable.getValue(action.color, vars);
						if (taro.isServer) {
							taro.network.send('createFloatingText', { position: position, text: text, color: color });
						} else if (taro.isClient) {
							taro.client.emit('floating-text', {
								text: text,
								x: position.x,
								y: position.y,
								color: color || 'white'
							});
						}
						break;

					/* Item */

					case 'startUsingItem':
						if (entity && entity._category == 'item') {
							entity.startUsing();
						}
						break;

					case 'useItemOnce':
						var item = self._script.variable.getValue(action.item, vars);
						if (item && item._category == 'item') {
							// item.use();
							item.streamUpdateData([{ useQueued: true }]);
						}
						break;

					case 'stopUsingItem':
						if (entity && entity._category == 'item') {
							entity.stopUsing();
						}

						break;

					case 'updateItemQuantity':
						var item = self._script.variable.getValue(action.entity, vars);
						var quantity = self._script.variable.getValue(action.quantity, vars);
						if (item && item._category == 'item') {
							item.streamUpdateData([{ quantity: quantity }]);
						}
						break;

					case 'setItemFireRate':
						var item = self._script.variable.getValue(action.item, vars);
						var value = self._script.variable.getValue(action.number, vars);

						if (item && item._category == 'item') {
							item.streamUpdateData([{ fireRate: value }]);
						}
						break;

					case 'changeInventorySlotColor':
						var item = self._script.variable.getValue(action.item, vars);
						var color = self._script.variable.getValue(action.string, vars);
						if (item && color) {
							item.streamUpdateData([{ inventorySlotColor: color }]);
						}
						break;

					case 'setItemAmmo':
						var item = self._script.variable.getValue(action.item, vars);
						var newAmmo = self._script.variable.getValue(action.ammo, vars);

						// because in item stream update quantity value is decremented by 1
						newAmmo++;

						if (item && item._category === 'item' && item._stats.type === 'weapon' && !isNaN(newAmmo)) {
							item.streamUpdateData([{ quantity: newAmmo }]);
						}

					case 'dropItem':
						var entity = self._script.variable.getValue(action.entity, vars);

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
						var item = self._script.variable.getValue(action.item, vars);
						var position = self._script.variable.getValue(action.position, vars);

						if (item) {
							if (item._stats && item._stats.controls && !item._stats.controls.undroppable) {
								var ownerUnit = item.getOwnerUnit();
								var itemIndex = item._stats.slotIndex;
								if (ownerUnit) {
									ownerUnit.dropItem(itemIndex, position);
								}
							} else {
								// throw new Error(`unit cannot drop an undroppable item ${item._stats.name}`);
							}
						} else {
							// throw new Error('invalid item');
						}
						break;

					// very old
					case 'castAbility':
						if (entity && entity._category == 'unit' && entity.ability && action.abilityName) {
							entity.ability.cast(action.abilityName);
						}
						// else
						// entity.ability.cast()
						break;

					case 'startCastingAbility':
						var unit = self._script.variable.getValue(action.entity);
						var ability = self._script.variable.getValue(action.ability);

						unit.ability.startCasting('ability');

						break;

					case 'stopCastingAbility':
						var unit = self._script.variable.getValue(action.entity);
						var ability = self._script.variable.getValue(action.ability);

						unit.ability.stopCasting(ability);

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
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							player._stats.lastOpenedShop = action.shop;
							taro.network.send('openShop', { type: action.shop }, player._stats.clientId);
						}
						break;

					case 'closeShopForPlayer':
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							taro.network.send('ui', { command: 'closeShop' }, player._stats.clientId);
						}
						break;

					case 'openDialogueForPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						var primitiveVariables = self._script.variable.getAllVariables([
							'string',
							'number',
							'boolean'
						]);
						var dialogueId = self._script.variable.getValue(action.dialogue, vars);

						if (dialogueId != undefined && player && player._category === 'player' && player._stats.clientId) {
							player._stats.lastOpenedDialogue = action.dialogue;
							taro.network.send('openDialogue', {
								dialogueId: dialogueId,
								extraData: {
									playerName: player._stats && player._stats.name,
									variables: primitiveVariables,
									dialogueTemplate: _.get(taro, "game.data.ui.dialogueview.htmlData", "")
								}
							}, player._stats.clientId);
						}
						break;

					case 'closeDialogueForPlayer':
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							taro.network.send('closeDialogue', {}, player._stats.clientId);
						}
						break;

					case 'refillAmmo':
						var item = entity;
						if (item && item._category == 'item') {
							item.refillAmmo();
						}
						break;

					case 'dropItemInInventorySlot':
						var slotIndex = self._script.variable.getValue(action.slotIndex, vars);
						var unit = self._script.variable.getValue(action.unit, vars);
						if (unit && unit._category == 'unit' && slotIndex != undefined) {
							unit.dropItem(slotIndex - 1);
						}
						break;

					/* particles */

					case 'emitParticlesAtPosition':
						var position = self._script.variable.getValue(action.position, vars);
						var particleTypeId = self._script.variable.getValue(action.particleType, vars);
						var angle = self._script.variable.getValue(action.angle, vars);
						if (particleTypeId && position) {
							taro.network.send('particle', { particleId: particleTypeId, position: position, angle: angle || 0 });
						}
						break;

					case 'emitParticlesFromEntity':
						var particleTypeId = self._script.variable.getValue(action.particleType, vars);
						var angle = self._script.variable.getValue(action.angle, vars);
						var entity = self._script.variable.getValue(action.entity, vars);
						if (particleTypeId && entity) {
							taro.network.send('particle', { particleId: particleTypeId, position: { x: 0, y: 0 }, angle: angle || 0, entityId: entity.id() });
						}
						break;

					case 'rotateUnitClockwise':
						var torque = self._script.variable.getValue(action.torque, vars);
						if (entity && entity._category == 'unit' && entity.body && !isNaN(torque)) {
							// entity.body.m_torque = entity._stats.body.rotationSpeed
							entity.body.m_torque = torque;
						} else {
							// throw new Error( action.type + " - invalid unit")
						}
						break;

					// is deprecated ?
					case 'rotateUnitCounterClockwise':
						var torque = self._script.variable.getValue(action.torque, vars);
						if (entity && entity._category == 'unit' && entity.body && !isNaN(torque)) {
							// entity.body.m_torque = -1 * entity._stats.body.rotationSpeed
							entity.body.m_torque = -1 * torque;
						} else {
							// throw new Error( action.type + " - invalid unit")
						}
						break;

					case 'makeUnitToAlwaysFacePosition':
						if (entity && entity._category == 'unit') {
							var position = self._script.variable.getValue(action.position, vars);
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
						var unit = self._script.variable.getValue(action.entity, vars);
						var player = self._script.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('hideUnitNameLabelFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'showUnitNameLabelToPlayer':
						var unit = self._script.variable.getValue(action.entity, vars);
						var player = self._script.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('showUnitNameLabelFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'hideUnitFromPlayer':
						var unit = self._script.variable.getValue(action.entity, vars);
						var player = self._script.variable.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('hideUnitFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'showUnitToPlayer':
						var unit = self._script.variable.getValue(action.entity, vars);
						var player = self._script.variable.getValue(action.player, vars);
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
						var playerTypeId = self._script.variable.getValue(action.playerType, vars);
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isNameLabelHidden: true }]);
						}
						break;

					case 'showUnitNameLabel':
						var playerTypeId = self._script.variable.getValue(action.playerType, vars);
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isNameLabelHidden: false }]);
						}
						break;

					/* projectile */
					case 'createProjectileAtPosition':
						var projectileTypeId = self._script.variable.getValue(action.projectileType, vars);
						var position = self._script.variable.getValue(action.position, vars);
						var force = self._script.variable.getValue(action.force, vars);
						var unit = self._script.variable.getValue(action.unit, vars);
						var angle = self._script.variable.getValue(action.angle, vars);
						var error = '';
						var delta = Math.radians(90); // unitsFacingAngle delta
						var facingAngleDelta = 0;
						if (action.angle && action.angle.function == 'angleBetweenPositions') {
							delta = 0;
							facingAngleDelta = Math.radians(90);
						}

						if (projectileTypeId) {
							var projectileData = taro.game.cloneAsset('projectileTypes', projectileTypeId);

							if (projectileData != undefined && position != undefined && position.x != undefined && position.y != undefined && force != undefined && angle != undefined) {
								var facingAngleInRadians = angle + facingAngleDelta;
								angle = angle - delta;
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
										streamMode: 1
									}
								);

								var projectile = new Projectile(data);
								taro.game.lastCreatedProjectileId = projectile._id;
								projectile.script.trigger('entityCreated');
							} else {
								if (!projectileData) {
									throw new Error('invalid projectile data');
								}
								if (!position || position.x == undefined || position.y == undefined) {
									throw new Error('invalid position data');
								}
								if (force == undefined) {
									throw new Error('invalid force value');
								}
								if (angle == undefined) {
									throw new Error('invalid angle value');
								}
							}
						}
						break;

					/* Camera */
					case 'playerCameraTrackUnit':
						var unit = self._script.variable.getValue(action.unit, vars);
						var player = self._script.variable.getValue(action.player, vars);
						if (unit && player && player._stats.clientId) {
							player.cameraTrackUnit(unit.id());
						}
						break;

					case 'playerCameraStopTracking':
						var player = self._script.variable.getValue(action.player, vars);
						if (player && player._stats.clientId) {
							player.cameraStopTracking();
						}
						break;

					case 'changePlayerCameraPanSpeed':
						var panSpeed = self._script.variable.getValue(action.panSpeed, vars);
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._stats.clientId) {
							player.changeCameraPanSpeed(panSpeed);
						}
						break;
					case 'positionCamera':
						var position = self._script.variable.getValue(action.position, vars);
						var player = self._script.variable.getValue(action.player, vars);

						if (position && player && player._stats.clientId) {
							taro.network.send('camera', { cmd: 'positionCamera', position: position }, player._stats.clientId);
						}
						break;

					case 'createItemAtPositionWithQuantity':
						var itemTypeId = self._script.variable.getValue(action.itemType, vars);
						var position = self._script.variable.getValue(action.position, vars);
						var quantity = self._script.variable.getValue(action.quantity, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
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
							taro.game.lastCreatedItemId = item._id;
							item.script.trigger("entityCreated");
						} else {
							throw new Error('invalid item type data');
						}
						break;
					/* depreciated and can be removed */
					case 'createItemWithMaxQuantityAtPosition':
						var itemTypeId = self._script.variable.getValue(action.itemType, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
						var position = self._script.variable.getValue(action.position, vars);
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
							taro.game.lastCreatedItemId = item._id;
							item.script.trigger("entityCreated");
						} else {
							throw new Error('invalid item type data');
						}
						break;

					case 'spawnItem':

						var itemTypeId = self._script.variable.getValue(action.itemType, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
						var position = self._script.variable.getValue(action.position, vars);

						if (itemData) {
							itemData.itemTypeId = itemTypeId;
							itemData.isHidden = false;
							itemData.stateId = 'dropped';
							itemData.defaultData = {
								translate: position,
								rotate: Math.random(0, 700) / 100
							};
							var item = new Item(itemData);
							taro.game.lastCreatedItemId = item._id;
							item.script.trigger("entityCreated");
						} else {
							throw new Error('invalid item type data');
						}
						break;

					case 'giveNewItemToUnit':
						var itemTypeId = self._script.variable.getValue(action.itemType, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
						var unit = self._script.variable.getValue(action.unit, vars);

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
						var itemTypeId = self._script.variable.getValue(action.itemType, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
						var unit = null;

						if (itemData) {
							if (action.hasOwnProperty('number')) {
								// this is new version of action
								unit = self._script.variable.getValue(action.unit, vars);
								quantity = self._script.variable.getValue(action.number, vars);
							} else {
								// this is old version of action
								unit = self._script.variable.getValue(action.entity, vars);
								quantity = self._script.variable.getValue(action.quantity, vars);
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
									throw new Error('unit doesn\'t exist');
								// else
								//  throw new Error("giveNewItemToUnit: cannot add item to unit's inventory")
							}
						}
						break;

					case 'makeUnitSelectItemAtSlot':
						var unit = self._script.variable.getValue(action.unit, vars);
						var slotIndex = self._script.variable.getValue(action.slotIndex, vars);
						slotIndex = slotIndex - 1;
						if (unit) {
							unit.changeItem(slotIndex);
						} else // error log
						{
							if (unit == undefined || unit._category != 'unit')
								throw new Error('unit doesn\'t exist');
						}

						break;

					case 'setOwnerUnitOfProjectile':
						var unit = self._script.variable.getValue(action.unit, vars);
						var projectile = self._script.variable.getValue(action.projectile, vars);
						if (projectile && unit) {
							projectile.setSourceUnit(unit);
						}

						break;

					case 'setSourceItemOfProjectile':
						var item = self._script.variable.getValue(action.item, vars);
						var projectile = self._script.variable.getValue(action.projectile, vars);
						if (projectile && item) {
							projectile.setSourceItem(item);
						}

						break;

					/* Ads */

					case 'playAdForEveryone':
						if (taro.game.data.defaultData.tier && parseInt(taro.game.data.defaultData.tier) !== 1) {
							if (!taro.ad.lastPlayedAd || ((Date.now() - taro.ad.lastPlayedAd) >= 60000)) {
								taro.ad.play({ type: 'preroll' });
								taro.ad.lastPlayedAd = Date.now();
							} else {
								taro.ad.prerollEventHandler('video-ad-action-limit-reached');
							}
						}
						break;

					case 'playAdForPlayer':
						if (action.entity && taro.game.data.defaultData.tier && parseInt(taro.game.data.defaultData.tier) !== 1) {
							var unit = self._script.variable.getValue(action.entity, vars);
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
						var item = self._script.variable.getValue(action.item, vars);
						var unit = self._script.variable.getValue(action.unit, vars);
						// pickup ownerLess items
						if (unit && unit._category == 'unit' && item && item._category === 'item' && !item.getOwnerUnit()) {
							unit.pickUpItem(item);
						} else // error log
						{
							if (unit == undefined || unit._category != 'unit')
								throw new Error('unit doesn\'t exist');
						}

						break;

					/* Sound */
					case 'playSoundAtPosition':
						var position = self._script.variable.getValue(action.position, vars);
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
						var player = self._script.variable.getValue(action.player, vars);
						if (sound && player && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'playSoundForPlayer',
								sound: action.sound
							}, player._stats.clientId);
						}
						break;
					case 'stopSoundForPlayer':
						var sound = taro.game.data.sound[action.sound];
						var player = self._script.variable.getValue(action.player, vars);
						if (sound && player && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'stopSoundForPlayer',
								sound: action.sound
							}, player._stats.clientId);
						}
						break;
					case 'playMusicForPlayer':
						var music = taro.game.data.music[action.music];
						var player = self._script.variable.getValue(action.player, vars);

						if (music && player && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'playMusicForPlayer',
								music: action.music
							}, player._stats.clientId);
						}

						break;

					case 'playMusicForPlayerRepeatedly':
						var music = taro.game.data.music[action.music];
						var player = self._script.variable.getValue(action.player, vars);
						if (music && player && player._category == 'player' && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'playMusicForPlayerRepeatedly',
								music: action.music
							}, player._stats.clientId);
						}

						break;
					case 'showMenuAndSelectCurrentServer':

						var player = self._script.variable.getValue(action.player, vars);
						if (player && player._stats && player._category == 'player' && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showMenuAndSelectCurrentServer'
							}, player._stats.clientId);
						}
						break;
					case 'showMenuAndSelectBestServer':
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._stats && player._category == 'player' && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'showMenuAndSelectBestServer'
							}, player._stats.clientId);
						}
						break;

					case 'stopMusicForPlayer':
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							taro.network.send('sound', {
								cmd: 'stopMusicForPlayer'
							}, player._stats.clientId);
						}
						break;

					/* Entity */

					case 'flipEntitySprite':

						// console.log('flipUnitSprite:',action);
						var entity = self._script.variable.getValue(action.entity, vars);

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
						var entity = self._script.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var forceX = self._script.variable.getValue(action.force.x, vars);
							if (forceX == undefined || isNaN(forceX)) {
								forceX = 0;
							}

							var forceY = self._script.variable.getValue(action.force.y, vars);
							if (forceY == undefined || isNaN(forceY)) {
								forceY = 0;
							}

							entity.applyForce(forceX, forceY);
						} else {
							throw new Error('invalid entity');
						}

						break;

					/* Entity */
					case 'applyImpulseOnEntityXY':

						var entity = self._script.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var impulseX = self._script.variable.getValue(action.impulse.x, vars);
							if (impulseX == undefined || isNaN(impulseX)) {
								impulseX = 0;
							}

							var impulseY = self._script.variable.getValue(action.impulse.y, vars);
							if (impulseY == undefined || isNaN(impulseY)) {
								impulseY = 0;
							}

							entity.applyImpulse(impulseX, impulseY);
						} else {
							throw new Error('invalid entity');
						}

						break;

					case 'applyForceOnEntityXYRelative':

						var entity = self._script.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var radians = entity._rotate.z + Math.radians(-90); // entity's facing angle

							var forceX = self._script.variable.getValue(action.force.x, vars);
							if (forceX == undefined || isNaN(forceX)) {
								forceX = 0;
							}

							var forceY = self._script.variable.getValue(action.force.y, vars);
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
						var entity = self._script.variable.getValue(action.entity, vars);
						var angle = self._script.variable.getValue(action.angle, vars);
						var force = self._script.variable.getValue(action.force, vars);
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
						var entity = self._script.variable.getValue(action.entity, vars);
						var angle = self._script.variable.getValue(action.angle, vars);
						var force = self._script.variable.getValue(action.force, vars);
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

						let entityType = self._script.variable.getValue(action.entityType, vars);
						let entityToCreate = self._script.variable.getValue(action.entity, vars);
						var position = self._script.variable.getValue(action.position, vars);
						var height = self._script.variable.getValue(action.height, vars) || 100;
						var width = self._script.variable.getValue(action.width, vars) || 100;
						var angle = self._script.variable.getValue(action.angle, vars) || 0;

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

								createdEntity = new Item(rfdc()(data));
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

								createdEntity = new Projectile(rfdc()(data));
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

								var player = self._script.variable.getValue(action.player, vars);

								if (player) {
									createdEntity = player.createUnit(rfdc()(data));
								} else {
									throw new Error("failed to create new unit because player doesn't exist");
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

							createdEntity.script.trigger("entityCreated", { thisEntityId: createdEntity.id() });

						}
						break;
					case 'setEntityDepth':
						var entity = self._script.variable.getValue(action.entity, vars);
						var depth = self._script.variable.getValue(action.depth, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && typeof depth === 'number') {
							entity.streamUpdateData([{ depth: depth }]);
						}

						break;

					case 'setEntityLifeSpan':
						var entity = self._script.variable.getValue(action.entity, vars);
						var lifespan = self._script.variable.getValue(action.lifeSpan, vars);

						if (entity && lifespan != undefined && !isNaN(parseFloat(lifespan))) {
							entity.lifeSpan(lifespan);
						}
						break;
					case 'setEntityAttribute':

						var attrId = self._script.variable.getValue(action.attribute, vars);
						var value = self._script.variable.getValue(action.value, vars);
						var entity = self._script.variable.getValue(action.entity, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes && entity._stats.attributes[attrId] != undefined && value != undefined) {

							// not sure we need this code
							var isAttributeVisible = false;
							var attribute = entity._stats.attributes[attrId];

							if (entity._category === 'player') {
								isAttributeVisible = !!attribute.isVisible;
							} else {
								isAttributeVisible = attribute.isVisible instanceof Array && attribute.isVisible.length > 0;
							}

							entity.attribute.update(attrId, value); // update attribute, and check for attribute becoming 0
						}
						break;

					case 'setEntityAttributeMin':

						var attrId = self._script.variable.getValue(action.attribute, vars);
						var entity = self._script.variable.getValue(action.entity, vars);
						var minValue = self._script.variable.getValue(action.value, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes[attrId] != undefined && !isNaN(minValue)) {

							entity.attribute.update(attrId, null, minValue, null);
						}
						break;

					case 'setEntityAttributeMax':

						var attrId = self._script.variable.getValue(action.attribute, vars);
						var entity = self._script.variable.getValue(action.entity, vars);
						var maxValue = self._script.variable.getValue(action.value, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes[attrId] != undefined && !isNaN(maxValue)) {

							entity.attribute.update(attrId, null, null, maxValue);
						}
						break;

					case 'setEntityAttributeRegenerationRate':
						var attrId = self._script.variable.getValue(action.attribute, vars);
						var entity = self._script.variable.getValue(action.entity, vars);
						var regenerationValue = self._script.variable.getValue(action.value, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && entity._stats.attributes[attrId] != undefined && !isNaN(regenerationValue)) {
							// entity.attribute.setRegenerationSpeed(attrId, regenerationValue);

							var regenerationSpeed = {};
							regenerationSpeed[attrId] = regenerationValue;

							entity.streamUpdateData([{ attributesRegenerateRate: regenerationSpeed }]);
						}
						break;

					case 'addAttributeBuffToUnit':

						var attrId = self._script.variable.getValue(action.attribute, vars);
						var value = self._script.variable.getValue(action.value, vars);
						var entity = self._script.variable.getValue(action.entity, vars);
						var time = self._script.variable.getValue(action.time, vars);
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

						var attrId = self._script.variable.getValue(action.attribute, vars);
						var value = self._script.variable.getValue(action.value, vars);
						var entity = self._script.variable.getValue(action.entity, vars);
						var time = self._script.variable.getValue(action.time, vars);
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
						var unit = self._script.variable.getValue(action.unit, vars)
						if (unit && unit._stats && unit._stats.buffs) {
							for (let i = 0; i < unit._stats.buffs.length; i++) {
								unit._stats.buffs[i].timeLimit = 0;
							}
						}
						break;

					case 'moveEntity':
						var position = self._script.variable.getValue(action.position, vars);
						var entity = self._script.variable.getValue(action.entity, vars);

						if (position && entity && ['unit', 'item', 'projectile'].includes(entity._category)) {
							entity.teleportTo(position.x, position.y, entity._rotate.z);
						}
						// if we ever decide to allow region to be moved using moveEntity, this is how you do it
						// else if (entity._category == 'region' && !isNaN(position.x) && !isNaN(position.y)) {
						// 	entity.streamUpdateData([{ x: position.x }, { y: position.y }]);
						// }

						break;

					case 'teleportEntity':
						var position = self._script.variable.getValue(action.position, vars);
						var entity = self._script.variable.getValue(action.entity, vars);

						if (position && entity && ['unit', 'item', 'projectile'].includes(entity._category)) {
							entity.teleportTo(position.x, position.y, entity._rotate.z, true);
						}

						break;

					case 'destroyEntity':
						var entity = self._script.variable.getValue(action.entity, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							entity.remove();
						} else {
							throw new Error('invalid unit');
						}

						break;

					case 'setEntityVariable':
						var entity = self._script.variable.getValue(action.entity, vars);
						var variable = self._script.variable.getValue(action.variable, vars);
						var value = self._script.variable.getValue(action.value, vars);

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
								throw new Error('datatype of value does not match datatype of variable');
							}
						}

						break;

					case 'rotateEntityToRadians':
					case 'rotateEntityToRadiansLT': // No more LT.
						var entity = self._script.variable.getValue(action.entity, vars);
						var radians = self._script.variable.getValue(action.radians, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && radians !== undefined && !isNaN(radians)) {
							// hack to rotate entity properly
							if (taro.isClient) {
								entity.rotateTo(0, 0, radians);
							} else {
								entity.streamUpdateData([{ rotate: radians }]);
							}
						}

						break;

					case 'rotateEntityToFacePosition':
						var entity = self._script.variable.getValue(action.entity, vars);
						var position = self._script.variable.getValue(action.position, vars);
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
								entity.streamUpdateData([{ rotate: newFacingAngle }]);
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
						var entity = self._script.variable.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var position = self._script.variable.getValue(action.position, vars);
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
								throw new Error(action.type + " - invalid position")
							}
						} else {
							throw new Error(action.type + " - invalid unit")
						}
						break;

					/* AI */

					case 'addBotPlayer':
						var name = self._script.variable.getValue(action.name, vars) || "";
						// bot players meant to be indistinguishable from 'human' players. hence we're not tempering with controlledBy variable
						var player = taro.game.createPlayer({
							controlledBy: "human",
							name: name
						});
						player._stats.isBot = true;
						player.joinGame();
						break;



					case 'enableAI':
						var unit = self._script.variable.getValue(action.unit, vars);
						if (unit && unit.ai) {
							unit.ai.enable();
						}
						break;

					case 'disableAI':
						var unit = self._script.variable.getValue(action.unit, vars);
						if (unit && unit.ai) {
							unit.ai.disable();
						}
						break;

					case 'setUnitTargetPosition': // deprecated
						var unit = self._script.variable.getValue(action.unit, vars);
						var position = self._script.variable.getValue(action.position, vars);
						if (unit && unit.ai && position) {
							unit.ai.moveToTargetPosition(position.x, position.y);
						}

						break;
					case 'setUnitTargetUnit': // deprecated
						var unit = self._script.variable.getValue(action.unit, vars);
						var targetUnit = self._script.variable.getValue(action.targetUnit, vars);
						if (unit && unit.ai && targetUnit) {
							unit.ai.attackUnit(targetUnit);
						}
						break;

					case 'aiMoveToPosition':
						var unit = self._script.variable.getValue(action.unit, vars);
						var position = self._script.variable.getValue(action.position, vars);
						if (unit && unit.ai && position) {
							unit.ai.moveToTargetPosition(position.x, position.y);
						}
						break;
					case 'aiAttackUnit':
						var unit = self._script.variable.getValue(action.unit, vars);
						var targetUnit = self._script.variable.getValue(action.targetUnit, vars);
						if (unit && unit.ai && targetUnit) {
							unit.ai.attackUnit(targetUnit);
						}
						break;

					case 'aiGoIdle':
						var unit = self._script.variable.getValue(action.unit, vars);
						if (unit && unit.ai) {
							unit.ai.goIdle();
						}
						break;


					case 'makePlayerTradeWithPlayer':
						var playerA = self._script.variable.getValue(action.playerA, vars);
						var playerB = self._script.variable.getValue(action.playerB, vars);
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
						var entity = self._script.variable.getValue(action.entity, vars);
						var torque = self._script.variable.getValue(action.torque, vars);

						if (entity && torque) {
							entity.applyTorque(torque);
						}
						// apply torque on entity here

						break;
					case 'attachEntityToEntity':
						var entity = self._script.variable.getValue(action.entity, vars);
						var targetEntity = self._script.variable.getValue(action.targetingEntity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && targetEntity && self.entityCategories.indexOf(targetEntity._category) > -1) {
							entity.attachTo(targetEntity);
						}

						break;

					case 'changeScaleOfEntitySprite':
						var entity = self._script.variable.getValue(action.entity, vars);
						var scale = self._script.variable.getValue(action.scale, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && !isNaN(scale)) {
							entity.streamUpdateData([{ scale: parseFloat(scale).toFixed(2) }]);
						}
						break;

					case 'changeScaleOfEntityBody':
						var entity = self._script.variable.getValue(action.entity, vars);
						var scale = self._script.variable.getValue(action.scale, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && !isNaN(scale)) {
							entity.streamUpdateData([{ scaleBody: parseFloat(scale).toFixed(2) }]);
						}
						break;

					case 'setEntityState':
						var entity = self._script.variable.getValue(action.entity, vars);
						var stateId = action.state;

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							entity.setState(stateId);
						}

						break;
					case 'increaseVariableByNumber':
						var newValue = self._script.variable.getValue(action.number, vars);
						if (taro.game.data.variables.hasOwnProperty(action.variable) && !_.isNaN(newValue) && !_.isNil(newValue)) {
							var variable = taro.game.data.variables[action.variable];
							if (variable.value === undefined || isNaN(variable.value)) {
								variable = variable.default || 0;
							}
							variable.value += newValue;
						}
						break;

					case 'decreaseVariableByNumber':
						var newValue = self._script.variable.getValue(action.number, vars);
						if (taro.game.data.variables.hasOwnProperty(action.variable) && !_.isNaN(newValue) && !_.isNil(newValue)) {
							var variable = taro.game.data.variables[action.variable];
							if (variable.value === undefined || isNaN(variable.value)) {
								variable = variable.default || 0;
							}
							variable.value -= newValue;
						}
						break;

					case 'loadPlayerDataAndApplyIt':
						var player = self._script.variable.getValue(action.player, vars);
						if (player) {
							if (player.persistedData) {
								player.loadPersistentData();
								console.log('player data loaded');

								if (action.unit) {
									var unit = self._script.variable.getValue(action.unit, vars);
									if (unit) {
										unit.loadPersistentData();
										console.log('unit data loaded');
									}
								}
							}
						}
						break;

					case 'loadUnitData':
						var unit = self._script.variable.getValue(action.unit, vars);
						var owner = unit.getOwner();
						if (unit && owner && owner.persistedData) {
							unit.loadPersistentData();
						}
						break;

					case 'loadUnitDataFromString':
						var unit = self._script.variable.getValue(action.unit, vars);
						var data = JSON.parse(self._script.variable.getValue(action.string, vars));
						if (unit && data) {
							unit.loadDataFromString(data);
						}
						break;

					case 'loadPlayerDataFromString':
						var player = self._script.variable.getValue(action.player, vars);
						var data = JSON.parse(self._script.variable.getValue(action.string, vars));
						if (player && data) {
							player.loadDataFromString(data);
						}
						break;

					case 'loadPlayerData':
						var player = self._script.variable.getValue(action.player, vars);
						if (player && player.persistedData) {
							player.loadPersistentData();
						}
						break;

					case 'editMapTile':
						var tileGid = self._script.variable.getValue(action.gid, vars);
						var tileLayer = self._script.variable.getValue(action.layer, vars);
						var tileX = self._script.variable.getValue(action.x, vars);
						var tileY = self._script.variable.getValue(action.y, vars);
						if (Number.isInteger(tileGid) && Number.isInteger(tileLayer) && Number.isInteger(tileX) && Number.isInteger(tileY)) {
							if (tileGid < 0 || tileGid > taro.game.data.map.tilesets[0].tilecount) {
								break;
							} else if (tileLayer > 3 || tileLayer < 0) {
								break;
							} else if (tileX < 0 || tileX >= taro.game.data.map.width) {
								break;
							} else if (tileY < 0 || tileY >= taro.game.data.map.height) {
								break;
							} else {
								const obj = {};
								obj[tileX] = {};
								obj[tileX][tileY] = tileGid;
								taro.developerMode.editTile({
									edit: {
										selectedTiles: [obj],
										size: 'fitContent',
										shape: 'rectangle',
										layer: [tileLayer],
										x: tileX,
										y: tileY,
									},
								}, 'server');
							}

						}
						break;

					case 'editMapTiles':
						var tileGid = self._script.variable.getValue(action.gid, vars);
						var tileLayer = self._script.variable.getValue(action.layer, vars);
						var tileX = self._script.variable.getValue(action.x, vars);
						var tileY = self._script.variable.getValue(action.y, vars);
						var width = self._script.variable.getValue(action.width, vars);
						var height = self._script.variable.getValue(action.height, vars);
						if (
							Number.isInteger(tileGid)
							&& Number.isInteger(tileLayer)
							&& Number.isInteger(tileX)
							&& Number.isInteger(tileY)
							&& Number.isInteger(width)
							&& Number.isInteger(height)
						) {
							if (tileGid < 0 || tileGid > taro.game.data.map.tilesets[0].tilecount) {
								break;
							} else if (tileLayer > 3 || tileLayer < 0) {
								break;
							} else if (tileX < 0 || tileX >= taro.game.data.map.width) {
								break;
							} else if (tileY < 0 || tileY >= taro.game.data.map.height) {
								break;
							} else {
								taro.developerMode.editTile({
									edit: {
										selectedTiles: [{ 0: { 0: tileGid } }],
										size: { x: width, y: height },
										shape: 'rectangle',
										layer: [tileLayer],
										x: tileX,
										y: tileY,
									},
								}, 'server');
							}

						}
						break;

					case 'loadMapFromString':
						//WON'T CHANGE CONNECTED PLAYERS MAP
						//needs to be run before players join
						var data = self._script.variable.getValue(action.string, vars);
						var players = taro.$$('player').filter((player) => {
							return player._stats.playerTypeId !== undefined;
						});
						try {
							JSON.parse(data);
						} catch (e) {
							break;
						}
						if (data && players.length <= 0) {
							taro.map.data = JSON.parse(data);
							taro.game.data.map = JSON.parse(data);
							var gameMap = taro.game.data.map;
							gameMap.wasEdited = true;

							taro.physics.destroyWalls();
							var map = taro.scaleMap(rfdc()(gameMap));
							taro.tiled.loadJson(map, function (layerArray, layersById) {
								taro.physics.staticsFromMap(layersById.walls);
							});
						}
						break;

					case 'addStringElement':
						var key = self._script.variable.getValue(action.key, vars);
						var value = self._script.variable.getValue(action.value, vars);
						var object = self._script.variable.getValue(action.object, vars);

						if (object && key && value) {
							object[key] = value;
						}

						break;

					case 'addObjectElement':
						var key = self._script.variable.getValue(action.key, vars);
						var value = self._script.variable.getValue(action.value, vars);
						var object = self._script.variable.getValue(action.object, vars);

						if (object && key && value) {
							object[key] = value;
						}

						break;

					case 'removeElement':
						var object = self._script.variable.getValue(action.object, vars);
						var key = self._script.variable.getValue(action.key, vars);
						if (object && key) {
							delete object[key];
						}

						break;

					case 'openBackpackForPlayer':
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'updateBackpack',
								action: 'open'
							}, player._stats.clientId);
						}
						break;

					case 'closeBackpackForPlayer':
						var player = self._script.variable.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'updateBackpack',
								action: 'close'
							}, player._stats.clientId);
						}
						break;

					case 'showUiElementForPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						var elementId = self._script.variable.getValue(action.elementId, vars);

						if (player && player._stats && player._stats.clientId && elementId) {
							taro.network.send('ui', {
								command: 'updateUiElement',
								elementId: elementId,
								action: 'show'
							}, player._stats.clientId);
						}

						break;

					case 'hideUiElementForPlayer':
						var player = self._script.variable.getValue(action.player, vars);
						var elementId = self._script.variable.getValue(action.elementId, vars);

						if (player && player._stats && player._stats.clientId && elementId) {
							taro.network.send('ui', {
								command: 'updateUiElement',
								elementId: elementId,
								action: 'hide'
							}, player._stats.clientId);
						}

						break;

					case 'setUIElementHtml':
						var elementId = self._script.variable.getValue(action.elementId, vars);
						var htmlStr = taro.sanitizer(self._script.variable.getValue(action.htmlStr, vars));
						var player = self._script.variable.getValue(action.player, vars);

						if (elementId && player && player._stats && player._stats.clientId) {
							taro.network.send('ui', {
								command: 'updateUiElement',
								elementId: elementId,
								action: 'setHtml',
								htmlStr: htmlStr || ''
							}, player._stats.clientId);
						}
						break;

					case 'comment':
						break;
					default:
						// console.log('trying to run', action);
						break;
				}

				taro.network.resume();

				if (taro.profiler.isEnabled) {
					taro.profiler.logTimeElapsed(actionPath, startTime);
				}

			} catch (e) {
				console.log(e);
				self._script.errorLog(e, path); // send error msg to client
			}
		}


	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = ActionComponent; }
