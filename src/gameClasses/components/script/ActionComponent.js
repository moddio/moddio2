var ActionComponent = TaroEntity.extend({
	classId: 'ActionComponent',
	componentId: 'action',

	init: function (scriptComponent, entity) {
		this._entity = entity;
		this._script = scriptComponent;
		this.entityCategories = ['unit', 'item', 'projectile', 'region', 'wall'];
		this.lastProgressTrackedValue = null;
	},

	/**
	 * Calculates the total number of actions within a nested action object, including disabled actions.

	 * This function is recursive and will traverse through all nested 'actions', 'then', and 'else' fields

	 * to count the total number of actions. The count includes the top-level action object itself.
	 *
	 * Example:
	 * {
	 *   actions: [{
	 *     actions: [{function: "sendChatMessage", message: "hello"}, {function: "sendChatMessage", message: "world"}]
	 *   }]
	 * }
	 * In the above example, the total count would be 3 (1 for the top-level 'actions' array and 1 for each 'sendChatMessage' action).
	 *
	 * @param {object} obj - The action object to count actions within.
	 * @param {number} _length - The initial count of actions. Typically starts at 0 when called externally.
	 * @param {*} self - Reference to the instance of the class containing this method. Used for recursive calls.
	 * @param {number} mode - Determines which parts of the action object to count:
	 *                    1: Only count actions within 'then' fields.
	 *                    2: Only count actions within 'else' fields.
	 *                    3: Count actions within both 'then' and 'else' fields.

	 * @returns {number} The total count of actions within the provided action object.

	 */
	getNestedActionsLength: (obj, _length, self, mode = 3) => {
		let length = _length;
		if (obj.actions !== undefined) {
			for (let i = 0; i < obj.actions.length; i++) {
				length += 1;
				length = self.getNestedActionsLength(obj.actions[i], length, self);
			}
		} else {
			if (obj.then !== undefined && (mode === 1 || mode === 3)) {
				for (let i = 0; i < obj.then.length; i++) {
					length += 1;
					length = self.getNestedActionsLength(obj.then, length, self);
				}
			}

			if (obj.else !== undefined && (mode === 2 || mode === 3)) {
				for (let i = 0; i < obj.else.length; i++) {
					length += 1;
					length = self.getNestedActionsLength(obj.else, length, self);
				}
			}
		}
		return length;
	},

	// entity can be either trigger entity, or entity in loop
	// add actionLineNumber to track the action call stack for error report
	/**
	 *
	 * @param {*} actionList
	 * @param {*} vars
	 * @param {*} path
	 * @param {number} actionLineNumber action line number which showed in the ScriptModal's actions' left, include the disabled action
	 * @returns
	 */
	run: function (actionList, vars, path, actionLineNumber) {
		var self = this;

		self._script.currentActionLineNumber = actionLineNumber;

		if (actionList == undefined || actionList.length <= 0) return;

		for (var i = 0; i < actionList.length; i++) {
			var action = actionList[i];
			self._script.currentActionLineNumber++;
			if (
				!action ||
				action.disabled == true || // if action is disabled or
				(taro.isClient && action.runMode == 0) || // don't run on client if runMode is 'server authoritative'
				(taro.isServer && action.runMode == 1) || // don't run on server if runMode is 'client only'
				(taro.isClient && !action.runOnClient && !action.runMode) // backward compatibility for older versions
			) {
				continue;
			}

			var actionPath = `${path}/${i}`;

			if (taro.profiler.isEnabled) {
				var startTime = performance.now();
				// var actionPath = path + "/" + i + "("+action.type+")";
			}

			// assign runMode engine-widely, so functions like item.use() can reference to what the current runMode is
			// for item.use(), if runMode == 0, then it will stream quantity change to its owner player
			taro.runMode = action.runMode ? 1 : 0;

			if (taro.isServer) {
				var now = Date.now();
				var engineTickDelta = now - taro.now;

				// prevent recursive/infinite action calls consuming CPU
				if (engineTickDelta > 1000 && !taro.engineLagReported) {
					if (taro.workerComponent) {
						taro.workerComponent.logEngineFreeze({
							query: 'engineFreeze',
							engineTickDelta: engineTickDelta,
							masterServer: global.myIp,
							gameInfo: taro.gameInfo,
							// triggerProfiler: taro.triggerProfiler
						});
					}

					taro.engineLagReported = true;
					// taro.server.unpublish(errorMsg); // not publishing yet cuz TwoHouses will get unpub. loggin instead.
				}

				if (taro.status) {
					taro.status.logAction(actionPath);
				}
			}

			var params = {};
			var entity = self._script.param.getValue(action.entity, vars);
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

					case 'sendPlayerToMap':
						if (taro.isServer) {
							var player = self._script.param.getValue(action.player, vars);
							var gameId = self._script.param.getValue(action.gameId, vars);

							if (player && player._stats && player._stats.clientId) {
								taro.workerComponent.sendPlayerToMap(gameId, [player._stats.userId || 'guest']).then((res) => {
									console.log('user switched map', res);
									if (res && res.gameSlug) {
										// ask client to reload game
										taro.network.send(
											'sendPlayerToMap',
											{
												type: 'sendPlayerToMap',
												gameSlug: res.gameSlug,
												gameId: res.gameId,
												autoJoinToken: res.autoJoinTokens[player._stats.userId || 'guest'],
											},
											player._stats.clientId
										);
									}
								});
							}
						}

						break;

					case 'sendPlayerToGame':
						if (taro.isServer) {
							var player = self._script.param.getValue(action.player, vars);
							var gameId = self._script.param.getValue(action.gameId, vars);

							if (player && player._stats && player._stats.clientId) {
								taro.workerComponent.sendPlayerToGame(gameId).then((res) => {
									if (res && res.gameSlug) {
										// ask client to reload game
										taro.network.send(
											'sendPlayerToGame',
											{
												type: 'sendPlayerToGame',
												gameSlug: res.gameSlug,
												gameId: res.gameId,
											},
											player._stats.clientId
										);
									}
								});
							}
						}

					case 'sendPlayerGroupToMap':
						if (taro.isServer) {
							var gameId = self._script.param.getValue(action.gameId, vars);
							var players = self._script.param.getValue(action.playerGroup, vars) || [];
							let userIds = [];
							for (var l = 0; l < players.length; l++) {
								var player = players[l];
								if (
									player &&
									player._stats &&
									player._stats.clientId &&
									!userIds.includes(player._stats.userId || 'guest')
								) {
									userIds.push(player._stats.userId || 'guest');
								}
							}

							taro.workerComponent.sendPlayerToMap(gameId, userIds).then((res) => {
								console.log('user switched map', userIds, res);
								if (res && res.gameSlug) {
									for (var l = 0; l < players.length; l++) {
										var player = players[l];
										// ask client to reload game
										taro.network.send(
											'sendPlayerToMap',
											{
												type: 'sendPlayerToMap',
												gameSlug: res.gameSlug,
												gameId: res.gameId,
												autoJoinToken: res.autoJoinTokens[player._stats.userId || 'guest'],
												serverId: res.serverId,
											},
											player._stats.clientId
										);
									}
								}
							});
						}

						break;

					case 'sendPlayerToSpawningMap':
						if (taro.isServer) {
							var player = self._script.param.getValue(action.player, vars);

							if (player && player._stats && player._stats.clientId) {
								taro.workerComponent.sendPlayerToMap('lastSpawned', [player._stats.userId || 'guest']).then((res) => {
									console.log('user switched spawning map', res);
									if (res && res.gameSlug) {
										// ask client to reload game
										taro.network.send(
											'sendPlayerToMap',
											{
												type: 'sendPlayerToMap',
												gameSlug: res.gameSlug,
												gameId: res.gameId,
												autoJoinToken: res.autoJoinTokens[player._stats.userId || 'guest'],
											},
											player._stats.clientId
										);
									}
								});
							}
						}

						break;

					case 'addPlayerToPlayerGroup':
						var player = self._script.param.getValue(action.player, vars);
						var playerGroupName = action.playerGroup && action.playerGroup.variableName;

						if (player?._stats?.clientId && taro.game.data.variables.hasOwnProperty(playerGroupName)) {
							taro.game.data.variables[playerGroupName].value = taro.game.data.variables[playerGroupName].value || [];
							taro.game.data.variables[playerGroupName].value.push(player);
							taro.game.lastUpdatedVariableName = playerGroupName;
						}

						break;

					case 'removePlayerFromPlayerGroup':
						var player = self._script.param.getValue(action.player, vars);
						var playerGroupName = action.playerGroup && action.playerGroup.variableName;

						var playerGroupLength = taro.game.data.variables[playerGroupName]?.value?.length;
						if (playerGroupLength) {
							for (let i = 0; i < playerGroupLength; i++) {
								if (taro.game.data.variables[playerGroupName].value[i]?._stats?.clientId == player?._stats?.clientId) {
									taro.game.data.variables[playerGroupName].value.splice(i, 1);
								}
							}
						}

						break;

					case 'addUnitToUnitGroup':
						var unit = self._script.param.getValue(action.unit, vars);
						var unitGroupName = action.unitGroup && action.unitGroup.variableName;

						if (unit?.id() && taro.game.data.variables.hasOwnProperty(unitGroupName)) {
							taro.game.data.variables[unitGroupName].value = taro.game.data.variables[unitGroupName].value || [];
							taro.game.data.variables[unitGroupName].value.push(unit);
							taro.game.lastUpdatedVariableName = unitGroupName;
						}

						break;

					case 'removeUnitFromUnitGroup':
						var unit = self._script.param.getValue(action.unit, vars);
						var unitGroupName = action.unitGroup && action.unitGroup.variableName;

						var unitGroupLength = taro.game.data.variables[unitGroupName]?.value?.length;
						if (unitGroupLength) {
							for (let i = 0; i < unitGroupLength; i++) {
								if (taro.game.data.variables[unitGroupName].value[i]?.id() == unit?.id()) {
									taro.game.data.variables[unitGroupName].value.splice(i, 1);
								}
							}
						}

						break;

					case 'setVariable': // store variables with formula processed
						var newValue = self._script.param.getValue(action.value, vars);
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
						var duration = self._script.param.getValue(action.duration, vars);

						setTimeout(
							function (actions, currentScriptId) {
								let previousScriptId = currentScriptId;
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								self._script.currentScriptId = currentScriptId;
								self.run(actions, vars, actionPath, self._script.currentActionLineNumber);
								self._script.currentScriptId = previousScriptId;
								self._script.currentActionLineNumber = previousAcionBlockIdx;
							},
							duration,
							setTimeOutActions,
							self._script.currentScriptId
						);
						break;

					case 'repeat': {
						var count = self._script.param.getValue(action.count, vars);
						var repeatActions = self._script.param.getValue(action.actions, vars);

						if (!isNaN(count) && count > 0) {
							for (let i = 0; i < count; i++) {
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								returnValue = self.run(repeatActions, vars, actionPath, self._script.currentActionLineNumber);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(repeatActions, 0, self);
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

					case 'repeatWithDelay': {
						var count = self._script.param.getValue(action.count, vars);
						var repeatActions = self._script.param.getValue(action.actions, vars);
						var delay = self._script.param.getValue(action.number, vars);

						const runWithDelay = (i) => {
							let previousAcionBlockIdx = self._script.currentActionLineNumber;
							returnValue = self.run(repeatActions, vars, actionPath, self._script.currentActionLineNumber);
							self._script.currentActionLineNumber =
								previousAcionBlockIdx + self.getNestedActionsLength(repeatActions, 0, self);

							if (returnValue == 'break' || vars.break) {
								vars.break = false;
							} else if (returnValue == 'return') {
								throw new Error('return without executing script');
							}

							// Continue to the next iteration if not reached the count
							if (i < count - 1) {
								setTimeout(() => runWithDelay(i + 1), delay);
							}
						};

						if (!isNaN(count) && count > 0) {
							// Start the loop immediately with the first iteration
							runWithDelay(0);
						}

						break;
					}

					case 'runScript':
						var previousScriptId = self._script.currentScriptId;
						var previousAcionBlockIdx = self._script.currentActionLineNumber;

						const scriptParams = { ...vars, triggeredFrom: vars.isWorldScript ? 'world' : 'map' };
						self._script.runScript(action.scriptName, scriptParams);

						self._script.currentScriptId = previousScriptId;
						self._script.currentActionLineNumber = previousAcionBlockIdx;
						break;

					case 'runEntityScript':
						var previousScriptId = self._script.currentScriptId;
						var previousAcionBlockIdx = self._script.currentActionLineNumber;

						var entity = self._script.param.getValue(action.entity, vars);
						if (entity) {
							const scriptParams = { ...vars, triggeredFrom: vars.isWorldScript ? 'world' : 'map' };
							entity.script.runScript(action.scriptName, scriptParams);

							self._script.currentScriptId = previousScriptId;
							self._script.currentActionLineNumber = previousAcionBlockIdx;
						}
						break;

					case 'runScriptOnClient':
						if (taro.isServer) {
							var previousScriptId = self._script.currentScriptId;
							var previousAcionBlockIdx = self._script.currentActionLineNumber;

							const localScriptParams = { ...vars, triggeredFrom: vars.isWorldScript ? 'world' : 'map' };
							const localPlayer = self._script.param.getValue(action.player, vars);
							localPlayer.streamUpdateData(
								[{ script: { name: action.scriptName, params: localScriptParams } }],
								localPlayer._stats.clientId
							);

							self._script.currentScriptId = previousScriptId;
							self._script.currentActionLineNumber = previousAcionBlockIdx;
						}
						break;

					case 'runEntityScriptOnClient':
						if (taro.isServer) {
							var previousScriptId = self._script.currentScriptId;
							var previousAcionBlockIdx = self._script.currentActionLineNumber;

							var entity = self._script.param.getValue(action.entity, vars);
							if (entity) {
								const localScriptParams = { ...vars, triggeredFrom: vars.isWorldScript ? 'world' : 'map' };
								const localPlayer = self._script.param.getValue(action.player, vars);
								localPlayer.streamUpdateData(
									[{ script: { name: action.scriptName, entityId: entity.id(), params: localScriptParams } }],
									localPlayer._stats.clientId
								);

								self._script.currentScriptId = previousScriptId;
								self._script.currentActionLineNumber = previousAcionBlockIdx;

								self._script.currentScriptId = previousScriptId;
								self._script.currentActionLineNumber = previousAcionBlockIdx;
							}
						}
						break;

					case 'condition':
						if (self._script.condition.run(action.conditions, vars, `${actionPath}/condition`)) {
							let previousAcionBlockIdx = self._script.currentActionLineNumber;
							var brk = self.run(action.then, vars, `${actionPath}/then`, self._script.currentActionLineNumber);
							self._script.currentActionLineNumber =
								previousAcionBlockIdx + self.getNestedActionsLength(action, 0, self);
						} else {
							let previousAcionBlockIdx = self._script.currentActionLineNumber;
							var brk = self.run(
								action.else,
								vars,
								`${actionPath}/else`,
								self._script.currentActionLineNumber + self.getNestedActionsLength(action, 0, self, 1)
							);
							self._script.currentActionLineNumber =
								previousAcionBlockIdx + self.getNestedActionsLength(action, 0, self);
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
						var region = self._script.param.getValue(action.region, vars);
						// regionId seems like unnecessary stream data
						var regionId = action.region.variableName;
						if (region) {
							var x = self._script.param.getValue(action.x, vars);
							var y = self._script.param.getValue(action.y, vars);
							var width = self._script.param.getValue(action.width, vars);
							var height = self._script.param.getValue(action.height, vars);
							// this change makes it so we don't stream data that is unchanged
							var data = [
								{ x: x !== region._stats.default.x ? x : null },
								{ y: y !== region._stats.default.y ? y : null },
								{ width: width !== region._stats.default.width ? width : null },
								{ height: height !== region._stats.default.height ? height : null },
							];
							// there's gotta be a better way to do this, i'm just blind right now
							data = data.filter((obj) => obj[Object.keys(obj)[0]] !== null);

							region.streamUpdateData(data);
						}

						break;

					case 'changeRegionColor':
						var region = self._script.param.getValue(action.region, vars);
						if (region) {
							const insideColor = self._script.param.getValue(action.inside, vars);
							const alpha = self._script.param.getValue(action.alpha, vars);
							var data = [{ inside: insideColor }, { alpha: alpha }];
							data = data.filter((obj) => obj[Object.keys(obj)[0]] !== null);
							region.streamUpdateData(data);
						}

						break;

					case 'setLastAttackingUnit':
						var unit = self._script.param.getValue(action.unit, vars);
						taro.game.lastAttackingUnitId = unit.id();

						break;

					case 'setLastAttackedUnit':
						var unit = self._script.param.getValue(action.unit, vars);
						taro.game.lastAttackedUnitId = unit.id();

						break;

					case 'setLastAttackingItem':
						var item = self._script.param.getValue(action.item, vars);
						taro.game.lastAttackingItemId = item.id();

						break;

					case 'sendPostRequest':
						var obj = self._script.param.getValue(action.string, vars);
						var url = self._script.param.getValue(action.url, vars);
						var proxyUrl = process.env.PROXY_URL || '';
						var requestUrl = `${proxyUrl}${url}`;
						var varName = self._script.param.getValue(action.varName, vars);

						// console.log("sendPostRequest obj", obj)

						try {
							obj = JSON.parse(obj);
						} catch (err) {
							throw new Error(err);
						}

						// ensure we aren't sending more than 30 POST requests within 10 seconds
						taro.server.postReqTimestamps.push(taro.currentTime());
						var oldestReqTimestamp = taro.server.postReqTimestamps[0];
						while (taro.currentTime() - oldestReqTimestamp > 10000 && taro.server.postReqTimestamps.length > 0) {
							oldestReqTimestamp = taro.server.postReqTimestamps.shift();
						}
						if (taro.server.postReqTimestamps.length > 30) {
							taro.server.unpublish(
								'Game server is sending too many POST requests. You cannot send more than 30 req per every 10s.'
							);
						}

						taro.server.request.post(
							{
								url: requestUrl,
								form: obj,
							},
							function optionalCallback(err, httpResponse, body) {
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
							}
						);

						break;

					case 'requestPost':
						var data = self._script.param.getValue(action.data, vars) || {};
						var url = self._script.param.getValue(action.url, vars);
						var varName = self._script.param.getValue(action.varName, vars);
						var proxyUrl = process.env.PROXY_URL || '';
						var requestUrl = `${proxyUrl}${url}`;

						// ensure we aren't sending more than 30 POST requests within 10 seconds
						taro.server.postReqTimestamps.push(taro.currentTime());
						var oldestReqTimestamp = taro.server.postReqTimestamps[0];
						while (taro.currentTime() - oldestReqTimestamp > 10000 && taro.server.postReqTimestamps.length > 0) {
							oldestReqTimestamp = taro.server.postReqTimestamps.shift();
						}
						if (taro.server.postReqTimestamps.length > 30) {
							taro.server.unpublishQueued = true;
							throw new Error(
								'Game server is sending too many POST requests. You cannot send more than 30 req per every 10s.'
							);
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
									var vars = {};
									if (['unit', 'item', 'projectile'].includes(self._entity._category)) {
										var key = `${self._entity._category}Id`;
										vars = { [key]: self._entity.id() };
									}

									self._entity.script.trigger('onPostResponse', vars);
								} catch (e) {
									// don't throw new Error here, because it's inside callback and it won't get caught
									self._script.errorLog(e, path);
								}
							});
						})(varName);

						break;

					case 'sendSecurePostRequest':
						var data = self._script.param.getValue(action.data, vars) || {};
						var apiCredentials = self._script.param.getValue(action.apiCredentials, vars);
						var varName = self._script.param.getValue(action.varName, vars);

						// use closure to store globalVariableName
						(function (targetVarName, actionsOnSuccess, actionsOnFailure, currentScriptId) {
							taro.workerComponent.sendSecurePostRequest({ apiCredentials, data }).then(({ data, err }) => {
								// try+catch must be redeclared inside callback otherwise an error will crash the process
								try {
									if (data && !err) {
										// onSuccess callback
										if (taro.game.data.variables.hasOwnProperty(targetVarName)) {
											taro.game.data.variables[targetVarName].value = data;
										}

										taro.game.lastReceivedPostResponse = data;
										taro.game.lastUpdatedVariableName = targetVarName;

										let previousScriptId = self._script.currentScriptId;
										let previousAcionBlockIdx = self._script.currentActionLineNumber;
										self._script.currentScriptId = currentScriptId;
										self.run(actionsOnSuccess, vars, actionPath, self._script.currentActionLineNumber);
										self._script.currentScriptId = previousScriptId;
										self._script.currentActionLineNumber = previousAcionBlockIdx;
									} else {
										// onFailure callback
										// don't throw new Error here, because it's inside callback and it won't get caught
										self._script.errorLog(err, path);

										let previousScriptId = self._script.currentScriptId;
										let previousAcionBlockIdx = self._script.currentActionLineNumber;
										self._script.currentScriptId = currentScriptId;
										self.run(actionsOnFailure, vars, actionPath, self._script.currentActionLineNumber);
										self._script.currentScriptId = previousScriptId;
										self._script.currentActionLineNumber = previousAcionBlockIdx;
									}
								} catch (e) {
									// onFailure callback
									// don't throw new Error here, because it's inside callback and it won't get caught
									self._script.errorLog(e, path);

									let previousScriptId = self._script.currentScriptId;
									let previousAcionBlockIdx = self._script.currentActionLineNumber;
									self._script.currentScriptId = currentScriptId;
									self.run(actionsOnFailure, vars, actionPath, self._script.currentActionLineNumber);
									self._script.currentScriptId = previousScriptId;
									self._script.currentActionLineNumber = previousAcionBlockIdx;
								}
							});
						})(varName, action.onSuccess, action.onFailure, self._script.currentScriptId);

						break;

					/* Player */

					case 'kickPlayer':
						var player = self._script.param.getValue(action.entity, vars);
						var message = self._script.param.getValue(action.message, vars);
						if (player && player._category == 'player') {
							taro.game.kickPlayer(player.id(), message);
						}

						break;

					case 'playEntityAnimation':
						var animationId = self._script.param.getValue(action.animation, vars);
						// console.log('playing unit animation!', animationId);
						var entity = self._script.param.getValue(action.entity, vars);
						if (entity) {
							entity.applyAnimationById(animationId);
						}

						break;

					case 'setPlayerAttribute':
						var attrId = self._script.param.getValue(action.attribute, vars);
						var player = self._script.param.getValue(action.entity, vars);

						if (player && player._category == 'player' && player._stats.attributes) {
							var attribute = player._stats.attributes[attrId];
							if (attribute != undefined) {
								var playerType = taro.game.getAsset('playerTypes', player._stats.playerTypeId);
								const isWorldPlayerAttribute = playerType && playerType.isWorld;

								const canBeUpdatedByMap = attribute.canBeUpdatedByMap;
								if (taro.game.isWorldMap && !vars.isWorldScript && isWorldPlayerAttribute && !canBeUpdatedByMap) {
									self._script.errorLog(
										`can not update world player attribute from map (attribute: ${attribute.name})`
									);
									console.log(
										`can not update world player attribute from map (attribute: ${attribute.name})`,
										path,
										attrId
									);
									break;
								}

								var decimalPlace = parseInt(attribute.decimalPlaces) || 0;
								var value = parseFloat(self._script.param.getValue(action.value, vars)).toFixed(decimalPlace);
								player.attribute.update(attrId, value); // update attribute, and check for attribute becoming 0

								// track guided tutorial progress
								var parentGameId = taro?.game?.data?.defaultData?.parentGameId;
								if (parentGameId == '646d39f8d9317a8253b8a143' && attribute.name == 'progress') {
									// for tracking user progress in tutorials
									var client = taro.server.clients[player._stats.clientId];
									var socket = client.socket;

									if (value !== this.lastProgressTrackedValue) {
										global.trackServerEvent &&
											global.trackServerEvent(
												{
													eventName: 'Tutorial Progress Updated',
													properties: {
														$ip: socket._remoteAddress,
														gameSlug: taro?.game?.data?.defaultData?.gameSlug,
														gameId: taro?.game?.data?.defaultData?._id,
														parentGameId: parentGameId,
														worldId: taro?.game?.data?.defaultData?.worldId,
														progress: value,
														tutorialVersion: 'v2',
													},
												},
												socket
											);
									}

									this.lastProgressTrackedValue = newValue;
								}
							}
						}

						break;

					case 'setPlayerAttributeMax':
						var attrId = self._script.param.getValue(action.attributeType, vars);
						var player = self._script.param.getValue(action.player, vars);
						var maxValue = self._script.param.getValue(action.number, vars);
						if (
							player &&
							player._category == 'player' &&
							player._stats.attributes &&
							player._stats.attributes[attrId] != undefined
						) {
							player.attribute.update(attrId, null, null, maxValue);
						}

						break;
					case 'setPlayerAttributeMin':
						var attrId = self._script.param.getValue(action.attributeType, vars);
						var player = self._script.param.getValue(action.player, vars);
						var minValue = self._script.param.getValue(action.number, vars);
						if (
							player &&
							player._category == 'player' &&
							player._stats.attributes &&
							player._stats.attributes[attrId] != undefined
						) {
							player.attribute.update(attrId, null, minValue, null);
						}

						break;
					case 'setPlayerAttributeRegenerationRate':
						var attrId = self._script.param.getValue(action.attributeType, vars);
						var player = self._script.param.getValue(action.player, vars);
						var regenerateRateValue = self._script.param.getValue(action.number, vars);
						if (
							player &&
							player._category == 'player' &&
							player._stats.attributes &&
							player._stats.attributes[attrId] != undefined
						) {
							var regRate = {};
							regRate[attrId] = regenerateRateValue;

							player.streamUpdateData([{ attributesRegenerateRate: regRate }]);
						}

						break;
					case 'setPlayerName':
						var name = self._script.param.getValue(action.name, vars);
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._category == 'player') {
							player.streamUpdateData([{ name: name }]);
						}

						break;

					case 'assignPlayerType':
						var playerTypeId = self._script.param.getValue(action.playerType, vars);

						// map scripts not allowed to assign player type
						if (taro.game.isWorldMap && !vars.isWorldScript) {
							self._script.errorLog('can not update player type from map');
							console.log('can not update player type from map', path, playerTypeId);
							break;
						}

						if (entity && entity._category == 'player') {
							var player = entity;
							player.streamUpdateData([{ playerTypeId: playerTypeId }]);
						}

						break;

					case 'setPlayerVariable':
						var player = self._script.param.getValue(action.player, vars);
						var variable = self._script.param.getValue(action.variable, vars);
						var value = self._script.param.getValue(action.value, vars);

						if (variable) {
							var variableId = variable.key;

							var playerType = taro.game.getAsset('playerTypes', player._stats.playerTypeId);
							const isWorldPlayerVariable = playerType && playerType.isWorld;

							const canBeUpdatedByMap = playerType?.variables?.[variableId]?.canBeUpdatedByMap;

							if (taro.game.isWorldMap && !vars.isWorldScript && isWorldPlayerVariable && !canBeUpdatedByMap) {
								self._script.errorLog(`can not update world player variable from map (variable: ${variableId})`);
								console.log(
									`can not update world player variable from map (variable: ${variableId})`,
									path,
									variableId
								);
								break;
							}

							player.variable.update(variableId, value);
						}

						break;

					case 'changeDescriptionOfItem':
						var item = self._script.param.getValue(action.item, vars);
						var description = self._script.param.getValue(action.string, vars);
						if (item && description) {
							item.streamUpdateData([{ description: description }]);
						}
						break;

					case 'changeItemInventoryImage':
						var item = self._script.param.getValue(action.item, vars);
						var url = self._script.param.getValue(action.url, vars);
						if (item && url) {
							item.streamUpdateData([{ inventoryImage: url }]);
						}
						break;

					case 'startAcceptingPlayers':
						taro.workerComponent.setAcceptingPlayerStatus(true);
						break;

					case 'stopAcceptingPlayers':
						taro.workerComponent.setAcceptingPlayerStatus(false);
						break;
					case 'saveUnitData':
						var unit = self._script.param.getValue(action.unit, vars);
						var ownerPlayer = unit.getOwner();
						var userId = ownerPlayer._stats.userId || ownerPlayer._stats.guestUserId;
						var isGuestUser = !!(!player._stats.userId && player._stats.guestUserId);

						if (unit && ownerPlayer && userId && ownerPlayer.persistentDataLoaded) {
							if (taro.game.isWorldMap && !vars.isWorldScript) {
								self._script.errorLog('can not save unit data from map');
								console.log('can not save unit data from map', path);
								break;
							}

							var data = unit.getPersistentData('unit');
							taro.workerComponent.saveUserData(userId, data, 'unit', 'saveUnitData', isGuestUser);
						} else {
							if (unit && !unit.persistentDataLoaded) {
								throw new Error('Fail saving unit data bcz persisted data not set correctly');
							} else {
								throw new Error('Fail saving unit data');
							}
						}
						break;
					case 'savePlayerData':
						var player = self._script.param.getValue(action.player, vars);
						var userId = player && player._stats && (player._stats.userId || player._stats.guestUserId);
						var isGuestUser = !!(!player._stats.userId && player._stats.guestUserId);

						if (player && userId && player.persistentDataLoaded) {
							if (taro.game.isWorldMap && !vars.isWorldScript) {
								self._script.errorLog('can not save player data from map');
								console.log('can not save player data from map', path);
								break;
							}

							var data = player.getPersistentData('player');

							const persistedData = { player: data };

							var unit = player.getSelectedUnit();

							if (unit && player && userId && unit.persistentDataLoaded) {
								var data = unit.getPersistentData('unit');
								persistedData.unit = data;

								// save unit and player data both
								taro.workerComponent.saveUserData(userId, persistedData, null, 'savePlayerData', isGuestUser);
							} else {
								// save player data only
								taro.workerComponent.saveUserData(
									userId,
									persistedData.player,
									'player',
									'savePlayerData',
									isGuestUser
								);

								if (unit && !unit.persistentDataLoaded) {
									throw new Error('Fail saving unit data bcz persisted data not loaded correctly');
								} else {
									throw new Error('Fail saving unit data');
								}
							}
						} else {
							if (player && !player.persistentDataLoaded) {
								throw new Error('Fail saving unit data bcz persisted data not loaded correctly');
							} else {
								throw new Error('Fail saving player data');
							}
						}

						break;

					case 'makePlayerSelectUnit':
						var player = self._script.param.getValue(action.player, vars);
						var unit = self._script.param.getValue(action.unit, vars);

						// only computer player can be forced to say stuff
						if (player && unit) {
							player.selectUnit(unit.id());
						}

						break;

					/* Coins */
					// fee is deducted from the player to whom sending the coins
					case 'sendCoinsToPlayer':
						var coins = self._script.param.getValue(action.coins, vars);
						var player = self._script.param.getValue(action.player, vars);
						var userId = player && player._stats && player._stats.userId;

						if (player && userId && coins && Math.floor(coins) > 0) {
							taro.server.sendCoinsToPlayer(userId, coins);
						}
						break;

					// fee is deducted from the owner end
					case 'sendCoinsToPlayer2':
						var coins = self._script.param.getValue(action.coins, vars);
						var player = self._script.param.getValue(action.player, vars);
						var userId = player && player._stats && player._stats.userId;

						if (player && userId && coins && Math.floor(coins) > 0) {
							// only difference is the addition *10/9
							taro.server.sendCoinsToPlayer(userId, coins, true);
						}
						break;

					/* UI */
					case 'showUiTextForPlayer':
						if (entity && entity._stats) {
							var text = self._script.param.getValue(action.value, vars);
							taro.gameText.updateText({ target: action.target, value: text, action: 'show' }, entity._stats.clientId);
						}
						break;

					case 'showUiTextForEveryone':
						var text = self._script.param.getValue(action.value, vars);
						taro.gameText.updateText({ target: action.target, value: text, action: 'show' });
						break;

					case 'hideUiTextForPlayer':
						if (entity && entity._stats) {
							var text = self._script.param.getValue(action.value, vars);
							taro.gameText.updateText({ target: action.target, value: text, action: 'hide' }, entity._stats.clientId);
						}
						break;

					case 'hideUiTextForEveryone':
						var text = self._script.param.getValue(action.value, vars);
						taro.gameText.updateText({ target: action.target, value: text, action: 'hide' });
						break;

					case 'updateUiTextForTimeForPlayer':
						var text = self._script.param.getValue(action.value, vars);
						var player = self._script.param.getValue(action.player, vars);
						var time = self._script.param.getValue(action.time, vars);
						// don't send text to AI players. If player is undefined, then send to all players
						if (player == undefined || (player && player._stats && player._stats.controlledBy == 'human')) {
							taro.gameText.updateTextForTime(
								{
									target: action.target,
									value: text,
									action: 'update',
									time,
								},
								player && player._stats && player._stats.clientId
							);
						}
						break;

					case 'updateUiTextForPlayer':
						if (entity && entity._stats) {
							var text = self._script.param.getValue(action.value, vars);
							taro.gameText.updateText(
								{ target: action.target, value: text, action: 'update' },
								entity._stats.clientId
							);
						}
						break;

					case 'appendRealtimeCSSForPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var text = self._script.param.getValue(action.value, vars);
						if (player && player._stats && player._stats.controlledBy == 'human' && player._stats.clientId) {
							taro.network.send('updateUiRealtimeCSS', { action: 'append', style: text }, player._stats.clientId);
							player.realtimeCSS += `\n${text}`;
						}
						break;

					case 'updateRealtimeCSSForPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var text = self._script.param.getValue(action.value, vars);
						if (player && player._stats && player._stats.controlledBy == 'human' && player._stats.clientId) {
							taro.network.send('updateUiRealtimeCSS', { action: 'update', style: text }, player._stats.clientId);
							player.realtimeCSS = text;
						}
						break;

					case 'showGameSuggestionsForPlayer':
						var player = self._script.param.getValue(action.player, vars);
						if (player && player._stats && player._stats.clientId) {
							taro.network.send('gameSuggestion', { type: 'show' }, player._stats.clientId);
						}

						break;

					case 'hideGameSuggestionsForPlayer':
						var player = self._script.param.getValue(action.player, vars);
						if (player && player._stats && player._stats.clientId) {
							taro.network.send('gameSuggestion', { type: 'hide' }, player._stats.clientId);
						}
						break;

					case 'updateUiTextForEveryone':
						var text = self._script.param.getValue(action.value, vars);
						taro.gameText.updateText({ target: action.target, value: text, action: 'update' });
						break;

					case 'showInputModalToPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var inputLabel = self._script.param.getValue(action.inputLabel, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send(
								'ui',
								{
									command: 'showInputModal',
									fieldLabel: inputLabel,
									isDismissible: false,
								},
								player._stats.clientId
							);
						}
						break;
					case 'showDismissibleInputModalToPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var inputLabel = self._script.param.getValue(action.inputLabel, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send(
								'ui',
								{
									command: 'showInputModal',
									fieldLabel: inputLabel,
									isDismissible: true,
								},
								player._stats.clientId
							);
						}
						break;
					case 'showCustomModalToPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var htmlContent = self._script.param.getValue(action.htmlContent, vars) || '';
						var modalTitle = self._script.param.getValue(action.title, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							taro.network.send(
								'ui',
								{
									command: 'showCustomModal',
									title: modalTitle,
									content: htmlContent,
									isDismissible: true,
								},
								player._stats.clientId
							);
						}
						break;
					case 'showWebsiteModalToPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var url = self._script.param.getValue(action.string, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							taro.network.send(
								'ui',
								{
									command: 'showWebsiteModal',
									url: url,
									isDismissible: true,
								},
								player._stats.clientId
							);
						}
						break;
					case 'showSocialShareModalToPlayer':
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send(
								'ui',
								{
									command: 'showSocialShareModal',
									isDismissible: true,
								},
								player._stats.clientId
							);
						}
						break;
					case 'openWebsiteForPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var url = self._script.param.getValue(action.string, vars) || '';

						if (player && player._stats && player._stats.clientId) {
							taro.network.send(
								'ui',
								{
									command: 'openWebsite',
									url: url,
									isDismissible: true,
								},
								player._stats.clientId
							);
						}
						break;

					case 'showInviteFriendsModal':
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							taro.network.send(
								'ui',
								{
									command: 'showFriendsModal',
								},
								player._stats.clientId
							);
						}
						break;

					case 'showMenu':
						var player = self._script.param.getValue(action.player, vars);
						if (player && player._stats) {
							taro.network.send('ui', { command: 'showMenu' }, player._stats.clientId);
						}
						break;

					case 'makePlayerSendChatMessage':
						var player = self._script.param.getValue(action.player, vars);
						var message = self._script.param.getValue(action.message, vars);
						if (player && player._stats && player._stats.clientId && player._stats.controlledBy == 'computer') {
							taro.chat.sendToRoom('1', message, undefined, player._stats.clientId);
						}

						break;

					case 'sendChatMessage':
						var message = self._script.param.getValue(action.message, vars);
						taro.chat.sendToRoom('1', message, undefined, undefined);
						break;

					case 'removeQuestForPlayer':
						var player = self._script.param.getValue(action.player, vars);
						player?.quest.init(player);
						var questId = self._script.param.getValue(action.questId, vars);
						var gameId = taro.game.data.defaultData._id;
						if (
							player.quests.active[gameId][questId] !== undefined ||
							player.quests.completed[gameId].includes(questId) === true
						) {
							player.quest.removeQuest(questId);

							taro.game.lastTriggeringQuestId = questId;
							var triggeredBy = {};
							if (selectedUnit && selectedUnit.script) {
								triggeredBy.unitId = selectedUnit.id();
								selectedUnit.script.trigger('questRemoved', triggeredBy);
							}
							triggeredBy.playerId = player.id();
							taro.script.trigger('questRemoved', triggeredBy);
							// console.log('addQuest', JSON.stringify(player.quests));
						}

						break;

					case 'addQuestToPlayer':
						var player = self._script.param.getValue(action.player, vars);
						player?.quest.init(player);
						var questId = self._script.param.getValue(action.questId, vars);
						var name = self._script.param.getValue(action.name, vars);
						var gameId = taro.game.data.defaultData._id;
						var goal = self._script.param.getValue(action.goal, vars);
						var description = self._script.param.getValue(action.description, vars);
						if (
							player.quests.active[gameId][questId] === undefined &&
							player.quests.completed[gameId].includes(questId) === false
						) {
							player.quest.addQuest(questId, { name, description, goal, progress: 0 });
							taro.game.lastTriggeringQuestId = questId;
							var triggeredBy = {};
							if (selectedUnit && selectedUnit.script) {
								triggeredBy.unitId = selectedUnit.id();
								selectedUnit.script.trigger('questAdded', triggeredBy);
							}
							triggeredBy.playerId = player.id();
							taro.script.trigger('questAdded', triggeredBy);
							// console.log('addQuest', JSON.stringify(player.quests));
						}
						break;

					case 'completeQuest':
						var player = self._script.param.getValue(action.player, vars);
						player?.quest.init(player);
						var questId = self._script.param.getValue(action.questId, vars);
						var gameId = taro.game.data.defaultData._id;
						var newObj = player.quests;
						if (newObj.active[gameId] && newObj['active'][gameId][questId]) {
							var selectedUnit = player.getSelectedUnit();
							var triggeredBy = {};
							taro.game.lastTriggeringQuestId = questId;
							player.quest.completeQuest(questId);
							if (selectedUnit && selectedUnit.script) {
								triggeredBy.unitId = selectedUnit.id();
								selectedUnit.script.trigger('questCompleted', triggeredBy);
							}
							triggeredBy.playerId = player.id();
							taro.script.trigger('questCompleted', triggeredBy);
						}
						// console.log('completeQuest', JSON.stringify(player.quests));
						break;

					case 'setQuestProgress':
						var player = self._script.param.getValue(action.player, vars);
						player?.quest.init(player);
						var questId = self._script.param.getValue(action.questId, vars);
						var progress = self._script.param.getValue(action.progress, vars);

						var gameId = taro.game.data.defaultData._id;
						const quests = player.quests;
						if (quests.active[gameId] !== undefined && quests.active[gameId][questId] !== undefined) {
							if (quests.active[gameId][questId].progress !== progress) {
								var oldProgress = quests.active[gameId][questId].progress;
								player.quest.setProgress(questId, Math.min(progress, quests.active[gameId][questId].goal));
								var selectedUnit = player.getSelectedUnit();
								var triggeredBy = {};
								taro.game.lastTriggeringQuestId = questId;
								triggeredBy.playerId = player.id();
								taro.script.trigger('questProgressUpdated', triggeredBy);
								if (
									oldProgress !== quests.active[gameId][questId].goal &&
									progress === quests.active[gameId][questId].goal
								) {
									var selectedUnit = player.getSelectedUnit();
									var triggeredBy = {};
									taro.game.lastTriggeringQuestId = questId;
									if (selectedUnit && selectedUnit.script) {
										triggeredBy.unitId = selectedUnit.id();
										selectedUnit.script.trigger('questProgressCompleted', triggeredBy);
									}
									triggeredBy.playerId = player.id();
									taro.script.trigger('questProgressCompleted', triggeredBy);
								}
							}
						}
						// console.log('setQuestProgress', JSON.stringify(player.quests));
						break;

					case 'sendChatMessageToPlayer':
						var player = self._script.param.getValue(action.player, vars);
						if (player && player._category == 'player' && player._stats.clientId) {
							var clientId = player._stats.clientId;
							taro.chat.sendToRoom('1', self._script.param.getValue(action.message, vars), clientId, undefined);
						}

						break;

					case 'addChatFilter':
						let words = self._script.param.getValue(action.words, vars);
						if (words) {
							words = words.match(/(?=\S)[^,]+?(?=\s*(,|$))/g);
							taro.chat.filter?.addWords(...words);
						}
						break;

					case 'banPlayerFromChat':
						var player = self._script.param.getValue(action.player, vars);
						taro.server.updateTempMute({
							player,
							banChat: true,
						});
						break;

					case 'unbanPlayerFromChat':
						var player = self._script.param.getValue(action.player, vars);
						taro.server.updateTempMute({
							player,
							banChat: false,
						});

						break;

					case 'playerCameraSetZoom':
						var player = self._script.param.getValue(action.player, vars);
						var zoom = self._script.param.getValue(action.zoom, vars);
						if (player && player._category == 'player' && zoom != undefined && player._stats.clientId) {
							if (taro.isServer) {
								taro.network.send('camera', { cmd: 'zoom', zoom: zoom }, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.client.setZoom(zoom);
							}
						}
						break;

					case 'showUnitInPlayerMinimap':
						var player = self._script.param.getValue(action.player, vars);
						var unit = self._script.param.getValue(action.unit, vars);
						var color = self._script.param.getValue(action.color, vars);

						if (unit?._category === 'unit' && player?._stats?.clientId && typeof color == 'string') {
							var clientId = player._stats.clientId;

							unit._stats.minimapUnitVisibleToClients[clientId] = color;

							taro.network.send(
								'minimap',
								{
									type: 'showUnit',
									unitId: unit.id(),
									color: color,
								},
								player._stats.clientId
							);
						}

						break;

					case 'hideUnitInPlayerMinimap':
						var player = self._script.param.getValue(action.player, vars);
						var unit = self._script.param.getValue(action.unit, vars);
						var color = self._script.param.getValue(action.color, vars);

						if (player && unit && unit._category === 'unit' && player._stats && player._stats.clientId) {
							var clientId = player._stats.clientId;

							delete unit._stats.minimapUnitVisibleToClients[clientId];

							taro.network.send(
								'minimap',
								{
									type: 'hideUnit',
									unitId: unit.id(),
								},
								player._stats.clientId
							);
						}

						break;

					/* Loops */
					case 'forAllUnits':
						if (action.unitGroup) {
							if (!vars) {
								vars = {};
							}
							var units = self._script.param.getValue(action.unitGroup, vars) || [];
							for (var l = 0; l < units.length; l++) {
								var unit = units[l];
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								var brk = self.run(
									action.actions,
									Object.assign(vars, { selectedUnit: unit }),
									actionPath,
									self._script.currentActionLineNumber
								);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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
							var players = self._script.param.getValue(action.playerGroup, vars) || [];
							for (var l = 0; l < players.length; l++) {
								var player = players[l];
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								var brk = self.run(
									action.actions,
									Object.assign(vars, { selectedPlayer: player }),
									actionPath,
									self._script.currentActionLineNumber
								);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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
							var items = self._script.param.getValue(action.itemGroup, vars) || [];
							for (var l = 0; l < items.length; l++) {
								var item = items[l];
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								var brk = self.run(
									action.actions,
									Object.assign(vars, { selectedItem: item }),
									actionPath,
									self._script.currentActionLineNumber
								);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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
							var projectiles = self._script.param.getValue(action.projectileGroup, vars) || [];
							for (var l = 0; l < projectiles.length; l++) {
								var projectile = projectiles[l];
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								var brk = self.run(
									action.actions,
									Object.assign(vars, { selectedProjectile: projectile }),
									actionPath,
									self._script.currentActionLineNumber
								);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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
							var entities = self._script.param.getValue(action.entityGroup, vars) || [];
							for (var l = 0; l < entities.length; l++) {
								var entity = entities[l];
								// if (['unit', 'item', 'projectile', 'wall'].includes(entity._category)) {
								if (self.entityCategories.indexOf(entity._category) > -1) {
									let previousAcionBlockIdx = self._script.currentActionLineNumber;
									var brk = self.run(
										action.actions,
										Object.assign(vars, { selectedEntity: entity }),
										actionPath,
										self._script.currentActionLineNumber
									);
									self._script.currentActionLineNumber =
										previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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
							var regions = self._script.param.getValue(action.regionGroup, vars) || [];
							for (var l = 0; l < regions.length; l++) {
								var region = regions[l];
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								var brk = self.run(
									action.actions,
									Object.assign(vars, { selectedRegion: region }),
									actionPath,
									self._script.currentActionLineNumber
								);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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
							var unitTypes = self._script.param.getValue(action.unitTypeGroup, vars) || {};

							for (var unitTypeKey in unitTypes) {
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								var brk = self.run(
									action.actions,
									Object.assign(vars, { selectedUnitType: unitTypeKey }),
									actionPath,
									self._script.currentActionLineNumber
								);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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
							var itemTypes = self._script.param.getValue(action.itemTypeGroup, vars) || {};

							// sorting items before they are used. which solves issue of getting first item in slot
							itemTypes = Object.keys(itemTypes);
							var itemsArr = _.map(itemTypes, (itemId) => {
								var item = taro.game.cloneAsset('itemTypes', itemId);
								if (item) {
									return {
										name: item.name,
										itemId: itemId,
									};
								}
								return undefined;
							});

							sortedItems = _.orderBy(itemsArr, ['name'], 'asc');

							for (let i = 0; i < sortedItems.length; i++) {
								if (sortedItems[i]) {
									var itemTypeKey = sortedItems[i].itemId;
									let previousAcionBlockIdx = self._script.currentActionLineNumber;
									var brk = self.run(
										action.actions,
										Object.assign(vars, { selectedItemType: itemTypeKey }),
										actionPath,
										self._script.currentActionLineNumber
									);
									self._script.currentActionLineNumber =
										previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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

					case 'forAllElementsInObject':
						if (action.object) {
							if (!vars) {
								vars = {};
							}
							var object = self._script.param.getValue(action.object, vars) || {};
							for (var key in object) {
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								var brk = self.run(
									action.actions,
									Object.assign(vars, { selectedElement: object[key], selectedElementsKey: key }),
									actionPath,
									self._script.currentActionLineNumber
								);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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

					case 'while':
						var loopCounter = 0;

						while (self._script.condition.run(action.conditions, vars, actionPath)) {
							let previousAcionBlockIdx = self._script.currentActionLineNumber;
							var brk = self.run(action.actions, vars, actionPath, self._script.currentActionLineNumber);
							self._script.currentActionLineNumber =
								previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);
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
								throw new Error('infinite loop detected'); // break infinite loop
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

							var start = self._script.param.getValue(action.start, vars);
							var stop = self._script.param.getValue(action.stop, vars);

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
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								var brk = self.run(action.actions, vars, actionPath, self._script.currentActionLineNumber);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

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

					case 'forIn':
						var variables = taro.game.data.variables;
						var variableNameMain = action.variableNameMain;
						var variableNameSource = action.variableNameSource;

						if (variables[variableNameMain] !== undefined || variables[variableNameSource] !== undefined) {
							if (
								!(
									(variables[variableNameMain].dataType === 'number' &&
										variables[variableNameSource].dataType === 'string') ||
									(variables[variableNameMain].dataType === 'string' &&
										variables[variableNameSource].dataType === 'object')
								)
							) {
								throw new Error('`for in` action only supports number-string and string-object');
							}

							var variableValue = variables[variableNameSource].value
								? variables[variableNameSource].value
								: variables[variableNameSource].default;
							if (variables[variableNameSource].dataType === 'string') {
								if (variableValue.at(0) === '[' && variableValue.at(-1) === ']') {
									variableValue = JSON.parse(variableValue);
								}
							}

							for (variables[variableNameMain].value in variableValue) {
								let previousAcionBlockIdx = self._script.currentActionLineNumber;
								var brk = self.run(action.actions, vars, actionPath, self._script.currentActionLineNumber);
								self._script.currentActionLineNumber =
									previousAcionBlockIdx + self.getNestedActionsLength(action.actions, 0, self);

								if (brk == 'break' || vars.break) {
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

					case 'continue':
						return 'continue';

					case 'return':
						return 'return';

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
						var player = self._script.param.getValue(action.entity, vars);

						var unitTypeId = self._script.param.getValue(action.unitType, vars);
						var unitTypeData = taro.game.cloneAsset('unitTypes', unitTypeId);

						var spawnPosition = self._script.param.getValue(action.position, vars);
						var facingAngle = self._script.param.getValue(action.angle, vars) || 0;
						if (player && spawnPosition && unitTypeId && unitTypeData) {
							var data = Object.assign(unitTypeData, {
								type: unitTypeId,
								defaultData: {
									translate: spawnPosition,
									rotate: facingAngle,
								},
								isHidden: false,
							});

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
						var unitTypeId = self._script.param.getValue(action.unitType, vars);
						if (entity && entity._category == 'unit' && unitTypeId != null) {
							entity.streamUpdateData([{ type: unitTypeId }]);
						} else {
							if (!entity) invalidParameters.push('unit');
							if (!unitTypeId) invalidParameters.push('unit type');
							throw new Error(`cannot change unit type. invalid parameter(s) given: ${invalidParameters.toString()}`);
						}

						break;

					case 'changeUnitSpeed':
						var bonusSpeed = self._script.param.getValue(action.unitSpeed, vars);

						if (
							entity != undefined &&
							entity._stats != undefined &&
							entity._category != undefined &&
							bonusSpeed != undefined
						) {
							entity.streamUpdateData([{ bonusSpeed: bonusSpeed }]);
						}

						break;

					case 'changeSensorRadius':
						if (action.sensor.unit) {
							var unit = self._script.param.getValue(action.sensor.unit, vars);
							if (unit.sensor === undefined) {
								unit.sensor = new Sensor(unit, unit._stats.ai.sensorRadius);
							}
						}
						var sensor = self._script.param.getValue(action.sensor, vars);
						var radius = self._script.param.getValue(action.radius, vars);
						// console.log("changeSensorRadius", sensor.id(), radius)
						if (sensor && sensor._category == 'sensor') {
							if (!isNaN(radius)) {
								sensor.updateRadius(radius);
							}
						}
						break;

					case 'setMaxAttackRange':
						var unit = self._script.param.getValue(action.unit, vars);
						var value = self._script.param.getValue(action.number, vars);
						if (unit) {
							if (!isNaN(value)) {
								unit._stats.ai.maxAttackRange = value;
								unit.ai.maxAttackRange = value;
							}
						}
						break;

					case 'setLetGoDistance':
						var unit = self._script.param.getValue(action.unit, vars);
						var value = self._script.param.getValue(action.number, vars);
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
						var unit = self._script.param.getValue(action.unit, vars);
						var value = self._script.param.getValue(action.number, vars);
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
						var entity = self._script.param.getValue(action.entity, vars);
						var speed = self._script.param.getValue(action.speed, vars) || 0;
						var radians = self._script.param.getValue(action.angle, vars); // entity's facing angle
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
						var entity = self._script.param.getValue(action.entity, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var velocityX = self._script.param.getValue(action.velocity.x, vars);
							if (velocityX == undefined || isNaN(velocityX)) {
								velocityX = 0;
							}

							var velocityY = self._script.param.getValue(action.velocity.y, vars);
							if (velocityY == undefined || isNaN(velocityY)) {
								velocityY = 0;
							}

							entity.setLinearVelocity(velocityX, velocityY);
						} else {
							throw new Error('invalid entity');
						}

						break;

					case 'setUnitOwner':
						var unit = self._script.param.getValue(action.unit, vars);
						var player = self._script.param.getValue(action.player, vars);
						if (unit && player) {
							unit.setOwnerPlayer(player.id());
						}

						break;

					case 'setUnitNameLabel':
						var unit = self._script.param.getValue(action.unit, vars);
						var name = self._script.param.getValue(action.name, vars);
						if (unit) {
							unit.streamUpdateData([{ name: name }]);
						}

						break;

					// PAUSED

					// case 'setUnitNameLabelColor':
					// 	var unit = self._script.param.getValue(action.unit, vars);
					// 	var color = self._script.param.getValue(action.color, vars);

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
						var unit = self._script.param.getValue(action.unit, vars);
						var color = self._script.param.getValue(action.color, vars);
						var player = self._script.param.getValue(action.player, vars);

						try {
							if (unit && player && typeof color === 'string' && Colors.isValidColor(color)) {
								unit.setNameLabelColor(color, player);
							} else {
								throw new Error(`Is '${color}' a valid hex code or extended color string? Correct unit, player?`);
							}
						} catch (err) {
							self._script.errorLog(err, path);
						}

						break;

					case 'setItemName':
						var item = self._script.param.getValue(action.item, vars);
						var name = self._script.param.getValue(action.name, vars);
						if (item) {
							item.streamUpdateData([{ name: name }]);
						}

						break;

					case 'setFadingTextOfUnit':
						var unit = self._script.param.getValue(action.unit, vars);
						var text = self._script.param.getValue(action.text, vars);
						var color = self._script.param.getValue(action.color, vars);

						if (text == undefined) {
							text = 'undefined';
						}

						if (unit && unit._category === 'unit') {
							unit.streamUpdateData([{ setFadingText: `${text}|-|${color}` }]);
						}

						break;

					case 'createFloatingText':
						var position = self._script.param.getValue(action.position, vars);
						var text = self._script.param.getValue(action.text, vars);
						var color = self._script.param.getValue(action.color, vars);

						if (text == undefined) {
							text = 'undefined';
						}

						if (taro.isServer) {
							taro.network.send('createFloatingText', { position: position, text: text, color: color });
						} else if (taro.isClient) {
							taro.client.emit('floating-text', {
								text: text,
								x: position.x,
								y: position.y,
								color: color || 'white',
							});
						}
						break;

					case 'createDynamicFloatingText':
						var position = self._script.param.getValue(action.position, vars);
						var text = self._script.param.getValue(action.text, vars);
						var color = self._script.param.getValue(action.color, vars);
						var duration = self._script.param.getValue(action.duration, vars) || 0;

						if (text == undefined) {
							text = 'undefined';
						}

						if (taro.isServer) {
							taro.network.send('createDynamicFloatingText', { position, text, color, duration });
						} else if (taro.isClient) {
							taro.client.emit('dynamic-floating-text', {
								text,
								x: position.x,
								y: position.y,
								color: color || 'white',
								duration,
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
						var item = self._script.param.getValue(action.item, vars);
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
						var item = self._script.param.getValue(action.entity, vars);
						var quantity = self._script.param.getValue(action.quantity, vars);
						if (item && item._category == 'item') {
							item.updateQuantity(quantity);
						}
						break;

					case 'setItemFireRate':
						var item = self._script.param.getValue(action.item, vars);
						var value = self._script.param.getValue(action.number, vars);

						if (item && item._category == 'item') {
							item.streamUpdateData([{ fireRate: value }]);
						}
						break;

					case 'changeInventorySlotColor':
						var item = self._script.param.getValue(action.item, vars);
						var color = self._script.param.getValue(action.string, vars);
						if (item && color) {
							item.streamUpdateData([{ inventorySlotColor: color }]);
						}
						break;

					case 'setItemAmmo':
						var item = self._script.param.getValue(action.item, vars);
						var newAmmo = self._script.param.getValue(action.ammo, vars);

						// because in item stream update quantity value is decremented by 1
						newAmmo++;

						if (item && item._category === 'item' && item._stats.type === 'weapon' && !isNaN(newAmmo)) {
							item.streamUpdateData([{ quantity: newAmmo }]);
						}

					case 'dropItem':
						var entity = self._script.param.getValue(action.entity, vars);

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
						var item = self._script.param.getValue(action.item, vars);
						var position = self._script.param.getValue(action.position, vars);

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
						var unit = self._script.param.getValue(action.entity);
						var ability = self._script.param.getValue(action.ability);

						unit.ability.startCasting(ability);

						break;

					case 'stopCastingAbility':
						var unit = self._script.param.getValue(action.entity);
						var ability = self._script.param.getValue(action.ability);

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
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							player._stats.lastOpenedShop = action.shop;
							taro.network.send('openShop', { type: action.shop }, player._stats.clientId);
						}
						break;

					case 'closeShopForPlayer':
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							taro.network.send('ui', { command: 'closeShop' }, player._stats.clientId);
						}
						break;

					case 'openDialogueForPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var primitiveVariables = self._script.param.getAllVariables(['string', 'number', 'boolean']);
						var dialogueId = self._script.param.getValue(action.dialogue, vars);

						if (dialogueId != undefined && player && player._category === 'player' && player._stats.clientId) {
							// filter out primitive variables using typeof
							primitiveVariables = Object.entries(primitiveVariables).reduce((acc, [key, value]) => {
								if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
									acc[key] = value;
								}
								return acc;
							}, {});

							player._stats.lastOpenedDialogue = action.dialogue;
							taro.network.send(
								'openDialogue',
								{
									dialogueId: dialogueId,
									extraData: {
										playerName: player._stats && player._stats.name,
										variables: primitiveVariables,
										dialogueTemplate: _.get(taro, 'game.data.ui.dialogueview.htmlData', ''),
									},
								},
								player._stats.clientId
							);
						}
						break;

					case 'closeDialogueForPlayer':
						var player = self._script.param.getValue(action.player, vars);

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
						var slotIndex = self._script.param.getValue(action.slotIndex, vars);
						var unit = self._script.param.getValue(action.unit, vars);
						if (unit && unit._category == 'unit' && slotIndex != undefined) {
							unit.dropItem(slotIndex - 1);
						}
						break;

					/* particles
					 *
					 * these actions should only run on local machine
					 */

					case 'startEmittingParticles':
						if (taro.isClient) {
							console.log(action);
							var particleTypeId = self._script.param.getValue(action.particleEmitter, vars);
							var entity = self._script.param.getValue(action.particleEmitter.entity, vars);
							if (particleTypeId && entity) {
								taro.client.emit('start-emitting-particles', { particleTypeId, entityId: entity.id() });
							}
						}
						break;

					case 'stopEmittingParticles':
						if (taro.isClient) {
							var particleTypeId = self._script.param.getValue(action.particleEmitter, vars);
							var entity = self._script.param.getValue(action.particleEmitter.entity, vars);

							if (particleTypeId && entity) {
								taro.client.emit('stop-emitting-particles', { particleTypeId, entityId: entity.id() });
							}
						}
						break;

					case 'rotateUnitClockwise':
						var torque = self._script.param.getValue(action.torque, vars);
						if (entity && entity._category == 'unit' && entity.body && !isNaN(torque)) {
							// entity.body.m_torque = entity._stats.body.rotationSpeed
							entity.body.m_torque = torque;
						} else {
							// throw new Error( action.type + " - invalid unit")
						}
						break;

					// is deprecated ?
					case 'rotateUnitCounterClockwise':
						var torque = self._script.param.getValue(action.torque, vars);
						if (entity && entity._category == 'unit' && entity.body && !isNaN(torque)) {
							// entity.body.m_torque = -1 * entity._stats.body.rotationSpeed
							entity.body.m_torque = -1 * torque;
						} else {
							// throw new Error( action.type + " - invalid unit")
						}
						break;

					case 'makeUnitToAlwaysFacePosition':
						if (entity && entity._category == 'unit') {
							var position = self._script.param.getValue(action.position, vars);
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
							entity.streamUpdateData([{ isInvisible: true }, { isNameLabelHidden: true }]);
						}
						break;

					case 'makeUnitVisible':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isInvisible: false }, { isNameLabelHidden: false }]);
						}
						break;

					case 'makeUnitInvisibleToFriendlyPlayers':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isInvisibleToFriendly: true }, { isNameLabelHiddenToFriendly: true }]);
						}
						break;
					case 'makeUnitVisibleToFriendlyPlayers':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isInvisibleToFriendly: false }, { isNameLabelHiddenToFriendly: false }]);
						}
						break;

					case 'hideUnitNameLabelFromPlayer':
						var unit = self._script.param.getValue(action.entity, vars);
						var player = self._script.param.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('hideUnitNameLabelFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'showUnitNameLabelToPlayer':
						var unit = self._script.param.getValue(action.entity, vars);
						var player = self._script.param.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('showUnitNameLabelFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'hideUnitFromPlayer': // deprecated
						var unit = self._script.param.getValue(action.entity, vars);
						var player = self._script.param.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('hideUnitFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;
					case 'showUnitToPlayer': // deprecated
						var unit = self._script.param.getValue(action.entity, vars);
						var player = self._script.param.getValue(action.player, vars);
						if (unit && player && player._stats && unit._stats) {
							taro.network.send('showUnitFromPlayer', { unitId: unit.id() }, player._stats.clientId);
						}
						break;

					case 'hideEntity':
						var entity = self._script.param.getValue(action.entity, vars);
						if (entity && entity._stats) {
							entity.hide();
						}
						break;

					case 'showEntity':
						var entity = self._script.param.getValue(action.entity, vars);
						if (entity && entity._stats) {
							entity.show();
						}
						break;

					case 'makeUnitInvisibleToNeutralPlayers':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isInvisibleToNeutral: true }, { isNameLabelHiddenToNeutral: true }]);
						}
						break;

					case 'makeUnitVisibleToNeutralPlayers':
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isInvisibleToNeutral: false }, { isNameLabelHiddenToNeutral: false }]);
						}
						break;

					case 'hideUnitNameLabel':
						var playerTypeId = self._script.param.getValue(action.playerType, vars);
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isNameLabelHidden: true }]);
						}
						break;

					case 'showUnitNameLabel':
						var playerTypeId = self._script.param.getValue(action.playerType, vars);
						if (entity && entity._category == 'unit') {
							entity.streamUpdateData([{ isNameLabelHidden: false }]);
						}
						break;

					/* projectile */
					case 'createProjectileAtPosition':
						var projectileTypeId = self._script.param.getValue(action.projectileType, vars);
						var position = self._script.param.getValue(action.position, vars);
						var force = self._script.param.getValue(action.force, vars);
						var unit = self._script.param.getValue(action.unit, vars);
						var angle = self._script.param.getValue(action.angle, vars);
						var error = '';
						var delta = Math.radians(90); // unitsFacingAngle delta
						var facingAngleDelta = 0;
						if (action.angle && action.angle.function == 'angleBetweenPositions') {
							delta = 0;
							facingAngleDelta = Math.radians(90);
						}

						if (projectileTypeId) {
							var projectileData = taro.game.cloneAsset('projectileTypes', projectileTypeId);

							if (
								projectileData != undefined &&
								position != undefined &&
								position.x != undefined &&
								position.y != undefined &&
								force != undefined &&
								angle != undefined
							) {
								var facingAngleInRadians = angle + facingAngleDelta;
								angle = angle - delta;
								var unitId = unit ? unit.id() : undefined;
								var data = Object.assign(projectileData, {
									type: projectileTypeId,
									bulletForce: force,
									sourceItemId: undefined,
									sourceUnitId: unitId,
									defaultData: {
										rotate: facingAngleInRadians,
										translate: position,
										velocity: {
											x: Math.cos(angle) * force,
											y: Math.sin(angle) * force,
										},
									},
									streamMode: 1,
								});

								var projectile = new Projectile(data);
								taro.game.lastCreatedProjectileId = projectile._id;
								taro.script.trigger('entityCreatedGlobal', { entityId: projectile.id() });
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
						var unit = self._script.param.getValue(action.unit, vars);
						var player = self._script.param.getValue(action.player, vars);
						if (unit && player && player._stats.clientId) {
							player.cameraTrackUnit(unit.id());
						}
						break;

					case 'playerCameraSetPitch':
						var player = self._script.param.getValue(action.player, vars);
						var angle = self._script.param.getValue(action.angle, vars);
						if (player && player._stats.clientId) {
							player.setCameraPitch(angle);
						}
						break;

					case 'playerCameraStopTracking':
						var player = self._script.param.getValue(action.player, vars);
						if (player && player._stats.clientId) {
							player.cameraStopTracking();
						}
						break;

					case 'changePlayerCameraPanSpeed':
						var panSpeed = self._script.param.getValue(action.panSpeed, vars);
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._stats.clientId) {
							player.changeCameraPanSpeed(panSpeed);
						}
						break;

					case 'positionCamera':
						var position = self._script.param.getValue(action.position, vars);
						var player = self._script.param.getValue(action.player, vars);

						if (position && player && player._stats.clientId) {
							if (taro.isServer) {
								taro.network.send('camera', { cmd: 'positionCamera', position: position }, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.client.emit('stop-follow');
								taro.client.emit('camera-position', [position.x, position.y]);
							}
						}
						break;

					case 'setCameraDeadzone':
						var width = self._script.param.getValue(action.width, vars);
						var height = self._script.param.getValue(action.height, vars);

						if (taro.isClient && !isNaN(width) && !isNaN(height)) {
							taro.client.emit('camera-deadzone', [width, height]);
						}
						break;

					case 'createItemAtPositionWithQuantity':
						var itemTypeId = self._script.param.getValue(action.itemType, vars);
						var position = self._script.param.getValue(action.position, vars);
						var quantity = self._script.param.getValue(action.quantity, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
						if (quantity == -1 || !quantity) {
							quantity = null;
						}

						if (taro.game.isWorldMap && !vars.isWorldScript) {
							let itemAttributes = [];
							itemAttributes = itemAttributes.concat(Object.keys(itemData?.bonus?.consume?.unitAttribute || {}) || []);
							itemAttributes = itemAttributes.concat(
								Object.keys(itemData?.bonus?.consume?.playerAttribute || {}) || []
							);
							itemAttributes = itemAttributes.concat(Object.keys(itemData?.bonus?.passive?.unitAttribute || {}) || []);
							itemAttributes = itemAttributes.concat(
								Object.keys(itemData?.bonus?.passive?.playerAttribute || {}) || []
							);

							let itemGivesBonuses = false;
							for (const itemAttribute of itemAttributes) {
								var attributeData = taro.game.getAsset('attributeTypes', itemAttribute);
								if (attributeData.isWorld) {
									itemGivesBonuses = true;
									break;
								}
							}

							if (itemGivesBonuses) {
								self._script.errorLog(
									`can not create item that gives world attribute bonuses from map (item: ${itemData?.name})`
								);
								console.log(
									`can not create item that gives world attribute bonuses from map (item: ${itemData?.name})`,
									path,
									itemTypeId
								);
								break;
							}
						}

						if (itemData) {
							itemData.itemTypeId = itemTypeId;
							itemData.isHidden = false;
							itemData.stateId = 'dropped';
							itemData.quantity = quantity;
							itemData.initialTransform = {
								position: position,
								facingAngle: Math.random(0, 700) / 100,
							};
							var item = new Item(itemData);
							taro.game.lastCreatedItemId = item._id;
							taro.script.trigger('entityCreatedGlobal', { entityId: item.id() });
							item.script.trigger('entityCreated');
						} else {
							throw new Error('invalid item type data');
						}
						break;
					/* depreciated and can be removed */
					case 'createItemWithMaxQuantityAtPosition':
						var itemTypeId = self._script.param.getValue(action.itemType, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
						var position = self._script.param.getValue(action.position, vars);
						var quantity = itemData.maxQuantity;

						if (quantity == -1) {
							quantity = null;
						}

						if (taro.game.isWorldMap && !vars.isWorldScript) {
							let itemAttributes = [];
							itemAttributes = itemAttributes.concat(Object.keys(itemData?.bonus?.consume?.unitAttribute || {}) || []);
							itemAttributes = itemAttributes.concat(
								Object.keys(itemData?.bonus?.consume?.playerAttribute || {}) || []
							);
							itemAttributes = itemAttributes.concat(Object.keys(itemData?.bonus?.passive?.unitAttribute || {}) || []);
							itemAttributes = itemAttributes.concat(
								Object.keys(itemData?.bonus?.passive?.playerAttribute || {}) || []
							);

							let itemGivesBonuses = false;
							for (const itemAttribute of itemAttributes) {
								var attributeData = taro.game.getAsset('attributeTypes', itemAttribute);
								if (attributeData.isWorld) {
									itemGivesBonuses = true;
									break;
								}
							}

							if (itemGivesBonuses) {
								self._script.errorLog(
									`can not create item that gives world attribute bonuses from map (item: ${itemData?.name})`
								);
								console.log(
									`can not create item that gives world attribute bonuses from map (item: ${itemData?.name})`,
									path,
									itemTypeId
								);
								break;
							}
						}

						if (itemData) {
							itemData.itemTypeId = itemTypeId;
							itemData.isHidden = false;
							itemData.stateId = 'dropped';
							itemData.spawnPosition = position;
							itemData.quantity = quantity;
							itemData.defaultData = {
								translate: position,
								rotate: Math.random(0, 700) / 100,
							};
							var item = new Item(itemData);
							taro.game.lastCreatedItemId = item._id;
							taro.script.trigger('entityCreatedGlobal', { entityId: item.id() });
							item.script.trigger('entityCreated');
						} else {
							throw new Error('invalid item type data');
						}
						break;

					case 'spawnItem':
						var itemTypeId = self._script.param.getValue(action.itemType, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
						var position = self._script.param.getValue(action.position, vars);

						if (taro.game.isWorldMap && !vars.isWorldScript) {
							let itemAttributes = [];
							itemAttributes = itemAttributes.concat(Object.keys(itemData?.bonus?.consume?.unitAttribute || {}) || []);
							itemAttributes = itemAttributes.concat(
								Object.keys(itemData?.bonus?.consume?.playerAttribute || {}) || []
							);
							itemAttributes = itemAttributes.concat(Object.keys(itemData?.bonus?.passive?.unitAttribute || {}) || []);
							itemAttributes = itemAttributes.concat(
								Object.keys(itemData?.bonus?.passive?.playerAttribute || {}) || []
							);

							let itemGivesBonuses = false;
							for (const itemAttribute of itemAttributes) {
								var attributeData = taro.game.getAsset('attributeTypes', itemAttribute);
								if (attributeData.isWorld) {
									itemGivesBonuses = true;
									break;
								}
							}

							if (itemGivesBonuses) {
								self._script.errorLog(
									`can not create item that gives world attribute bonuses from map (item: ${itemData?.name})`
								);
								console.log(
									`can not create item that gives world attribute bonuses from map (item: ${itemData?.name})`,
									path,
									itemTypeId
								);
								break;
							}
						}

						if (itemData) {
							itemData.itemTypeId = itemTypeId;
							itemData.isHidden = false;
							itemData.stateId = 'dropped';
							itemData.defaultData = {
								translate: position,
								rotate: Math.random(0, 700) / 100,
							};
							var item = new Item(itemData);
							taro.game.lastCreatedItemId = item._id;
							taro.script.trigger('entityCreatedGlobal', { entityId: item.id() });
							item.script.trigger('entityCreated');
						} else {
							throw new Error('invalid item type data');
						}
						break;

					case 'giveNewItemToUnit':
						var itemTypeId = self._script.param.getValue(action.itemType, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
						var unit = self._script.param.getValue(action.unit, vars);

						if (itemData && unit && unit._category == 'unit') {
							itemData.itemTypeId = itemTypeId;
							itemData.defaultData = {
								translate: unit._translate,
								rotate: unit._rotate.z,
							};
							unit.pickUpItem(itemData);
						}

						break;

					case 'giveNewItemWithQuantityToUnit':
						var itemTypeId = self._script.param.getValue(action.itemType, vars);
						var itemData = taro.game.cloneAsset('itemTypes', itemTypeId);
						var unit = null;

						if (itemData) {
							if (action.hasOwnProperty('number')) {
								// this is new version of action
								unit = self._script.param.getValue(action.unit, vars);
								quantity = self._script.param.getValue(action.number, vars);
							} else {
								// this is old version of action
								unit = self._script.param.getValue(action.entity, vars);
								quantity = self._script.param.getValue(action.quantity, vars);
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
									rotate: unit._rotate.z,
								};
								unit.pickUpItem(itemData);
							} // error log
							else {
								if (unit == undefined || unit._category != 'unit') throw new Error("unit doesn't exist");
								// else
								//  throw new Error("giveNewItemToUnit: cannot add item to unit's inventory")
							}
						}
						break;

					case 'makeUnitSelectItemAtSlot':
						var unit = self._script.param.getValue(action.unit, vars);
						var slotIndex = self._script.param.getValue(action.slotIndex, vars);
						slotIndex = slotIndex - 1;
						if (unit) {
							unit.changeItem(slotIndex);
						} // error log
						else {
							if (unit == undefined || unit._category != 'unit') throw new Error("unit doesn't exist");
						}

						break;

					case 'setOwnerUnitOfProjectile':
						var unit = self._script.param.getValue(action.unit, vars);
						var projectile = self._script.param.getValue(action.projectile, vars);
						if (projectile && unit) {
							projectile.setSourceUnit(unit);
						}

						break;

					case 'setSourceItemOfProjectile':
						var item = self._script.param.getValue(action.item, vars);
						var projectile = self._script.param.getValue(action.projectile, vars);
						if (projectile && item) {
							projectile.setSourceItem(item);
						}

						break;

					/* Ads */

					case 'playAdForEveryone':
						if (taro.game.data.defaultData.tier && parseInt(taro.game.data.defaultData.tier) !== 1) {
							if (!taro.ad.lastPlayedAd || Date.now() - taro.ad.lastPlayedAd >= 60000) {
								taro.ad.play({ type: 'preroll' });
								taro.ad.lastPlayedAd = Date.now();
							} else {
								taro.ad.prerollEventHandler('video-ad-action-limit-reached');
							}
						}
						break;

					case 'playAdForPlayer':
						if (action.entity && taro.game.data.defaultData.tier && parseInt(taro.game.data.defaultData.tier) !== 1) {
							var unit = self._script.param.getValue(action.entity, vars);
							if (unit && unit._stats && unit._stats.clientId) {
								if (!taro.ad.lastPlayedAd || Date.now() - taro.ad.lastPlayedAd >= 60000) {
									taro.ad.play({ type: 'preroll' }, unit._stats.clientId);
								} else {
									taro.ad.prerollEventHandler('video-ad-action-limit-reached', unit._stats.clientId);
								}
							}
						}
						break;
					case 'makeUnitPickupItem':
						var item = self._script.param.getValue(action.item, vars);
						var unit = self._script.param.getValue(action.unit, vars);
						// pickup ownerLess items
						if (unit && unit._category == 'unit' && item && item._category === 'item' && !item.getOwnerUnit()) {
							unit.pickUpItem(item);
						} // error log
						else {
							if (unit == undefined || unit._category != 'unit') throw new Error("unit doesn't exist");
						}

						break;

					/* Sound */

					case 'playSoundAtPosition':
						var position = self._script.param.getValue(action.position, vars);
						var sound = taro.game.data.sound[action.sound];
						// if csp enable dont stream sound
						if (sound && position) {
							if (taro.isServer) {
								taro.network.send('sound', { id: action.sound, position: position });
							} else {
								taro.sound.run({ id: action.sound, position: position });
							}
						}
						break;

					case 'playSoundForPlayer':
						var sound = taro.game.data.sound[action.sound];
						var player = self._script.param.getValue(action.player, vars);
						if (sound && player && player._stats.clientId) {
							if (taro.isServer) {
								taro.network.send(
									'sound',
									{
										cmd: 'playSoundForPlayer',
										sound: action.sound,
									},
									player._stats.clientId
								);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.sound.run({ cmd: 'playSoundForPlayer', sound: action.sound });
							}
						}
						break;

					case 'stopSoundForPlayer':
						var sound = taro.game.data.sound[action.sound];
						var player = self._script.param.getValue(action.player, vars);
						if (sound && player && player._stats.clientId) {
							if (taro.isServer) {
								taro.network.send(
									'sound',
									{
										cmd: 'stopSoundForPlayer',
										sound: action.sound,
									},
									player._stats.clientId
								);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.sound.run({ cmd: 'stopSoundForPlayer', sound: action.sound });
							}
						}
						break;

					/* Music */

					case 'playMusic':
						var music = taro.game.data.music[action.music];
						// if csp enable dont stream music
						if (music) {
							if (taro.isServer) {
								taro.network.send('sound', { cmd: 'playMusic', id: action.music });
							} else {
								taro.sound.run({ cmd: 'playMusic', id: action.music });
							}
						}

						break;

					case 'stopMusic':
						if (taro.isServer) {
							taro.network.send('sound', { cmd: 'stopMusic' });
						} else {
							taro.sound.run({ cmd: 'stopMusic' });
						}
						break;

					case 'playMusicForPlayer':
						var music = taro.game.data.music[action.music];
						var player = self._script.param.getValue(action.player, vars);

						if (music && player && player._stats.clientId) {
							if (taro.isServer) {
								taro.network.send(
									'sound',
									{
										cmd: 'playMusicForPlayer',
										music: action.music,
									},
									player._stats.clientId
								);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.sound.run({ cmd: 'playMusicForPlayer', music: action.music });
							}
						}

						break;

					case 'stopMusicForPlayer':
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._category === 'player' && player._stats.clientId) {
							if (taro.isServer) {
								taro.network.send(
									'sound',
									{
										cmd: 'stopMusicForPlayer',
									},
									player._stats.clientId
								);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.sound.run({ cmd: 'stopMusicForPlayer' });
							}
						}
						break;

					case 'playMusicForPlayerAtTime':
						var music = taro.game.data.music[action.music];
						var time = self._script.param.getValue(action.time, vars);
						var player = self._script.param.getValue(action.player, vars);

						if (music && player && time && player._stats.clientId) {
							if (taro.isServer) {
								taro.network.send(
									'sound',
									{
										cmd: 'playMusicForPlayerAtTime',
										music: action.music,
										time: action.time,
									},
									player._stats.clientId
								);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.sound.run({ cmd: 'playMusicForPlayerAtTime', music: action.music, time: time });
							}
						}

						break;

					case 'playMusicForPlayerRepeatedly':
						var music = taro.game.data.music[action.music];
						var player = self._script.param.getValue(action.player, vars);
						if (music && player && player._category == 'player' && player._stats.clientId) {
							if (taro.isServer) {
								taro.network.send(
									'sound',
									{
										cmd: 'playMusicForPlayerRepeatedly',
										music: action.music,
									},
									player._stats.clientId
								);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.sound.run({ cmd: 'playMusicForPlayerRepeatedly', music: action.music });
							}
						}

						break;

					case 'showMenuAndSelectCurrentServer':
						var player = self._script.param.getValue(action.player, vars);
						if (player && player._stats && player._category == 'player' && player._stats.clientId) {
							taro.network.send(
								'ui',
								{
									command: 'showMenuAndSelectCurrentServer',
								},
								player._stats.clientId
							);
						}
						break;
					case 'showMenuAndSelectBestServer':
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._stats && player._category == 'player' && player._stats.clientId) {
							taro.network.send(
								'ui',
								{
									command: 'showMenuAndSelectBestServer',
								},
								player._stats.clientId
							);
						}
						break;

					/* Entity */

					case 'flipEntitySprite':
						// console.log('flipUnitSprite:',action);
						var entity = self._script.param.getValue(action.entity, vars);

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
						var entity = self._script.param.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var forceX = self._script.param.getValue(action.force.x, vars);
							if (forceX == undefined || isNaN(forceX)) {
								forceX = 0;
							}

							var forceY = self._script.param.getValue(action.force.y, vars);
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
						var entity = self._script.param.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var impulseX = self._script.param.getValue(action.impulse.x, vars);
							if (impulseX == undefined || isNaN(impulseX)) {
								impulseX = 0;
							}

							var impulseY = self._script.param.getValue(action.impulse.y, vars);
							if (impulseY == undefined || isNaN(impulseY)) {
								impulseY = 0;
							}
							entity.applyImpulse(impulseX, impulseY);
						} else {
							throw new Error('invalid entity');
						}

						break;

					case 'applyImpulseOnEntityAngle':
						var entity = self._script.param.getValue(action.entity, vars);
						var angle = self._script.param.getValue(action.angle, vars);
						var impulse = self._script.param.getValue(action.impulse, vars);
						var radians = angle - Math.radians(90); // entity's facing angle
						if (!isNaN(radians) && !isNaN(impulse) && entity && self.entityCategories.indexOf(entity._category) > -1) {
							impulse = {
								x: Math.cos(radians) * impulse,
								y: Math.sin(radians) * impulse,
							};
							entity.applyImpulse(impulse.x, impulse.y);
						}

						break;

					case 'applyForceOnEntityXYRelative':
						var entity = self._script.param.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var radians = entity._rotate.z + Math.radians(-90); // entity's facing angle

							var forceX = self._script.param.getValue(action.force.x, vars);
							if (forceX == undefined || isNaN(forceX)) {
								forceX = 0;
							}

							var forceY = self._script.param.getValue(action.force.y, vars);
							if (forceY == undefined || isNaN(forceY)) {
								forceY = 0;
							}

							var force = {
								x: Math.cos(radians) * forceY + Math.cos(radians) * forceX,
								y: Math.sin(radians) * forceY + Math.sin(radians) * forceX,
							};

							// console.log('force angle is', force);

							entity.applyForce(force.x, force.y);
						}

						break;
					case 'applyForceOnEntityAngle':
						var entity = self._script.param.getValue(action.entity, vars);
						var angle = self._script.param.getValue(action.angle, vars);
						var force = self._script.param.getValue(action.force, vars);
						var radians = angle - Math.radians(90); // entity's facing angle

						if (!isNaN(radians) && !isNaN(force) && entity && self.entityCategories.indexOf(entity._category) > -1) {
							force = {
								x: Math.cos(radians) * force,
								y: Math.sin(radians) * force,
							};
							entity.applyForce(force.x, force.y);
						}

						break;

					case 'applyForceOnEntityAngleLT':
						var entity = self._script.param.getValue(action.entity, vars);
						var angle = self._script.param.getValue(action.angle, vars);
						var force = self._script.param.getValue(action.force, vars);
						var radians = angle - Math.radians(90); // entity's facing angle

						if (!isNaN(radians) && !isNaN(force) && entity && self.entityCategories.indexOf(entity._category) > -1) {
							force = {
								x: Math.cos(radians) * force,
								y: Math.sin(radians) * force,
							};

							// entity.applyForceLT(force.x, force.y);
							entity.applyForce(force.x, force.y);
						}

						break;

					case 'createEntityForPlayerAtPositionWithDimensions':
					case 'createEntityAtPositionWithDimensions':
						let entityType = self._script.param.getValue(action.entityType, vars);
						let entityToCreate = self._script.param.getValue(action.entity, vars);
						var position = self._script.param.getValue(action.position, vars);
						const defaultDepth = position.z;
						var rotation = self._script.param.getValue(action.rotation, vars);
						var scale = self._script.param.getValue(action.scale, vars);
						var height = self._script.param.getValue(action.height, vars) || 100;
						var width = self._script.param.getValue(action.width, vars) || 100;
						var depth = self._script.param.getValue(action.depth, vars) || 0;
						var angle = self._script.param.getValue(action.angle, vars) || 0;

						const entityTypeData = taro.game.data[entityType] && taro.game.data[entityType][entityToCreate];

						if (entityType && entityToCreate && position && height && width) {
							let data = Object.assign({}, entityTypeData);

							position.x = parseFloat(position.x);
							position.y = parseFloat(position.y);

							if (taro.is3D()) {
								if (!isNaN(rotation?.y)) {
									angle = parseFloat(360 - (rotation.y % 360));
								} else {
									angle = parseFloat(360 - (angle % 360));
								}
								if (!isNaN(scale?.x)) {
									if (entityType === 'itemTypes') {
										width = parseFloat(scale.x * entityTypeData.bodies.dropped?.width);
									} else {
										width = parseFloat(scale.x * entityTypeData.bodies.default?.width);
									}
								} else {
									width = parseFloat(width);
								}
								if (!isNaN(scale?.y)) {
									if (entityType === 'itemTypes') {
										height = parseFloat(scale.y * entityTypeData.bodies.dropped?.height);
									} else {
										height = parseFloat(scale.y * entityTypeData.bodies.default?.height);
									}
								} else {
									height = parseFloat(height);
								}
							} else {
								angle = parseFloat(angle);
								height = parseFloat(height);
								width = parseFloat(width);
							}

							var angleInRadians = Math.radians(angle);

							let createdEntity = null;

							if (entityType === 'itemTypes') {
								if (taro.game.isWorldMap && !vars.isWorldScript) {
									let itemAttributes = [];
									itemAttributes = itemAttributes.concat(Object.keys(data?.bonus?.consume?.unitAttribute || {}) || []);
									itemAttributes = itemAttributes.concat(
										Object.keys(data?.bonus?.consume?.playerAttribute || {}) || []
									);
									itemAttributes = itemAttributes.concat(Object.keys(data?.bonus?.passive?.unitAttribute || {}) || []);
									itemAttributes = itemAttributes.concat(
										Object.keys(data?.bonus?.passive?.playerAttribute || {}) || []
									);

									let itemGivesBonuses = false;
									for (const itemAttribute of itemAttributes) {
										var attributeData = taro.game.getAsset('attributeTypes', itemAttribute);
										if (attributeData.isWorld) {
											itemGivesBonuses = true;
											break;
										}
									}

									if (itemGivesBonuses) {
										self._script.errorLog(
											`can not create item that gives world attribute bonuses from map (item: ${itemData?.name})`
										);
										console.log(
											`can not create item that gives world attribute bonuses from map (item: ${itemData?.name})`,
											path
										);
										break;
									}
								}

								data.itemTypeId = entityToCreate;
								data.isHidden = false;
								data.stateId = 'dropped';
								data.defaultData = {
									translate: position,
									rotate: angleInRadians,
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
										rotate: angleInRadians,
									},
									height: height,
									width: width,
									scaleDimensions: true,
									streamMode: 1,
								});

								createdEntity = new Projectile(rfdc()(data));
								taro.game.lastCreatedProjectileId = createdEntity._id;
							} else if (entityType === 'unitTypes') {
								data = Object.assign(data, {
									type: entityToCreate,
									defaultData: {
										translate: position,
										rotate: angleInRadians,
									},
									height: height,
									width: width,
									depth: depth,
									scaleDimensions: true,
								});

								var player = self._script.param.getValue(action.player, vars);

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
								width: width,
							};
							if (defaultDepth) {
								//FIXME: should remove tmpDefault and find somewhere else to store the defaultDepth
								createdEntity.tmpDefaultDepth = defaultDepth;
							}
							taro.script.trigger('entityCreatedGlobal', { entityId: createdEntity.id() });
							createdEntity.script.trigger('entityCreated', { thisEntityId: createdEntity.id() });
						}
						break;
					case 'setEntityDepth':
						var entity = self._script.param.getValue(action.entity, vars);
						var depth = self._script.param.getValue(action.depth, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1 && typeof depth === 'number') {
							const isWorldEntity = entity._stats.isWorld;
							if (taro.game.isWorldMap && !vars.isWorldScript && isWorldEntity) {
								self._script.errorLog(`can not update world entity from map (entity: ${entity._stats.name})`);
								console.log(`can not update world entity from map (entity: ${entity._stats.name})`, path);
								break;
							}

							entity.streamUpdateData([{ depth: depth }]);
						}

						break;

					case 'setEntityOpacity':
						var entity = self._script.param.getValue(action.entity, vars);
						var opacity = self._script.param.getValue(action.opacity, vars);
						var duration = self._script.param.getValue(action.duration, vars);

						if (entity && typeof opacity === 'number' && typeof duration === 'number') {
							if (opacity < 0) {
								opacity = 0;
							} else if (opacity > 1) {
								opacity = 1;
							}

							if (taro.isServer) {
								entity.streamUpdateData([{ setOpacity: `${opacity}|-|${duration}` }]);
							} else if (taro.isClient) {
								entity.opacity(opacity, duration);
							}
						}
						break;

					case 'setEntityLifeSpan':
						var entity = self._script.param.getValue(action.entity, vars);
						var lifespan = self._script.param.getValue(action.lifeSpan, vars);

						if (entity && lifespan != undefined && !isNaN(parseFloat(lifespan))) {
							const isWorldEntity = entity._stats.isWorld;
							if (taro.game.isWorldMap && !vars.isWorldScript && isWorldEntity) {
								self._script.errorLog(`can not update world entity from map (entity: ${entity._stats.name})`);
								console.log(`can not update world entity from map (entity: ${entity._stats.name})`, path);
								break;
							}

							entity.lifeSpan(lifespan);
						}
						break;

					case 'setEntityAttribute':
						var attrId = self._script.param.getValue(action.attribute, vars);
						var value = self._script.param.getValue(action.value, vars);
						var entity = self._script.param.getValue(action.entity, vars);

						if (
							entity &&
							self.entityCategories.indexOf(entity._category) > -1 &&
							entity._stats.attributes &&
							entity._stats.attributes[attrId] != undefined &&
							value != undefined
						) {
							// not sure we need this code
							var isAttributeVisible = false;
							var attribute = entity._stats.attributes[attrId];

							const isWorldEntity = entity._stats.isWorld;
							const canBeUpdatedByMap = attribute.canBeUpdatedByMap;
							if (taro.game.isWorldMap && !vars.isWorldScript && isWorldEntity && !canBeUpdatedByMap) {
								self._script.errorLog(
									`can not update world entity's attribute from map (entity: ${entity._stats.name}, attribute: ${attribute.name})`
								);
								console.log(
									`can not update world entity's attribute from map (entity: ${entity._stats.name}, attribute: ${attribute.name})`,
									path,
									attrId
								);
								break;
							}

							if (entity._category === 'player') {
								isAttributeVisible = !!attribute.isVisible;
							} else {
								isAttributeVisible = attribute.isVisible instanceof Array && attribute.isVisible.length > 0;
							}

							entity.attribute.update(attrId, value); // update attribute, and check for attribute becoming 0
						}
						break;

					case 'setEntityAttributeMin':
						var attrId = self._script.param.getValue(action.attribute, vars);
						var entity = self._script.param.getValue(action.entity, vars);
						var minValue = self._script.param.getValue(action.value, vars);

						if (
							entity &&
							self.entityCategories.indexOf(entity._category) > -1 &&
							entity._stats.attributes[attrId] != undefined &&
							!isNaN(minValue)
						) {
							var attribute = entity._stats.attributes[attrId];
							const isWorldEntity = entity._stats.isWorld;
							const canBeUpdatedByMap = attribute.canBeUpdatedByMap;
							if (taro.game.isWorldMap && !vars.isWorldScript && isWorldEntity && !canBeUpdatedByMap) {
								self._script.errorLog(
									`can not update world entity's attribute from map (entity: ${entity._stats.name}, attribute: ${attribute.name})`
								);
								console.log(
									`can not update world entity's attribute from map (entity: ${entity._stats.name}, attribute: ${attribute.name})`,
									path,
									attrId
								);
								break;
							}

							entity.attribute.update(attrId, null, minValue, null);
						}
						break;

					case 'setEntityAttributeMax':
						var attrId = self._script.param.getValue(action.attribute, vars);
						var entity = self._script.param.getValue(action.entity, vars);
						var maxValue = self._script.param.getValue(action.value, vars);

						if (
							entity &&
							self.entityCategories.indexOf(entity._category) > -1 &&
							entity._stats.attributes[attrId] != undefined &&
							!isNaN(maxValue)
						) {
							var attribute = entity._stats.attributes[attrId];
							const isWorldEntity = entity._stats.isWorld;
							const canBeUpdatedByMap = attribute.canBeUpdatedByMap;
							if (taro.game.isWorldMap && !vars.isWorldScript && isWorldEntity && !canBeUpdatedByMap) {
								self._script.errorLog(
									`can not update world entity's attribute from map (entity: ${entity._stats.name}, attribute: ${attribute.name})`
								);
								console.log(
									`can not update world entity's attribute from map (entity: ${entity._stats.name}, attribute: ${attribute.name})`,
									path,
									attrId
								);
								break;
							}

							entity.attribute.update(attrId, null, null, maxValue);
						}
						break;

					case 'setEntityAttributeRegenerationRate':
						var attrId = self._script.param.getValue(action.attribute, vars);
						var entity = self._script.param.getValue(action.entity, vars);
						var regenerationValue = self._script.param.getValue(action.value, vars);

						if (
							entity &&
							self.entityCategories.indexOf(entity._category) > -1 &&
							entity._stats.attributes[attrId] != undefined &&
							!isNaN(regenerationValue)
						) {
							// entity.attribute.setRegenerationSpeed(attrId, regenerationValue);

							var attribute = entity._stats.attributes[attrId];
							const isWorldEntity = entity._stats.isWorld;
							const canBeUpdatedByMap = attribute.canBeUpdatedByMap;
							if (taro.game.isWorldMap && !vars.isWorldScript && isWorldEntity && !canBeUpdatedByMap) {
								self._script.errorLog(
									`can not update world entity's attribute from map (entity: ${entity._stats.name}, attribute: ${attribute.name})`
								);
								console.log(
									`can not update world entity's attribute from map (entity: ${entity._stats.name}, attribute: ${attribute.name})`,
									path,
									attrId
								);
								break;
							}

							var regenerationSpeed = {};
							regenerationSpeed[attrId] = regenerationValue;

							entity.streamUpdateData([{ attributesRegenerateRate: regenerationSpeed }]);
						}
						break;

					case 'addAttributeBuffToUnit':
						var attrId = self._script.param.getValue(action.attribute, vars);
						var value = self._script.param.getValue(action.value, vars);
						var entity = self._script.param.getValue(action.entity, vars);
						var time = self._script.param.getValue(action.time, vars);
						if (
							entity &&
							self.entityCategories.indexOf(entity._category) > -1 &&
							entity._stats.attributes &&
							entity._stats.attributes[attrId] != undefined &&
							value != undefined &&
							entity._stats.buffs
						) {
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
						var attrId = self._script.param.getValue(action.attribute, vars);
						var value = self._script.param.getValue(action.value, vars);
						var entity = self._script.param.getValue(action.entity, vars);
						var time = self._script.param.getValue(action.time, vars);
						if (
							entity &&
							self.entityCategories.indexOf(entity._category) > -1 &&
							entity._stats.attributes &&
							entity._stats.attributes[attrId] != undefined &&
							value != undefined &&
							entity._stats.buffs
						) {
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
						var unit = self._script.param.getValue(action.unit, vars);
						if (unit && unit._stats && unit._stats.buffs) {
							for (let i = 0; i < unit._stats.buffs.length; i++) {
								unit._stats.buffs[i].timeLimit = 0;
							}
						}
						break;

					case 'moveEntity':
						var position = self._script.param.getValue(action.position, vars);
						var entity = self._script.param.getValue(action.entity, vars);

						if (position && entity && ['unit', 'item', 'projectile'].includes(entity._category)) {
							entity.teleportTo(position.x, position.y, entity._rotate.z);
						}
						// if we ever decide to allow region to be moved using moveEntity, this is how you do it
						// else if (entity._category == 'region' && !isNaN(position.x) && !isNaN(position.y)) {
						// 	entity.streamUpdateData([{ x: position.x }, { y: position.y }]);
						// }

						break;

					case 'teleportEntity':
						var position = self._script.param.getValue(action.position, vars);
						var entity = self._script.param.getValue(action.entity, vars);

						if (position && entity && ['unit', 'item', 'projectile'].includes(entity._category)) {
							entity.teleportTo(position.x, position.y, entity._rotate.z, true);
						}

						break;

					case 'destroyEntity':
						var entity = self._script.param.getValue(action.entity, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							entity.remove();
						} else {
							self._script.errorLog(`invalid unit, ${JSON.stringify(action.entity)}`);
							throw new Error('invalid unit');
						}

						break;

					case 'resetEntity':
						var entity = self._script.param.getValue(action.entity, vars);
						if (entity && ['unit', 'item', 'projectile'].includes(entity._category)) {
							if (entity._category === 'unit') entity.resetUnitType();
							else if (entity._category === 'item') entity.resetItemType();
							else if (entity._category === 'projectile') entity.resetProjectileType();
						} else {
							self._script.errorLog(`invalid unit, ${JSON.stringify(action.entity)}`);
							throw new Error('invalid unit');
						}

						break;

					case 'setEntityVariable':
						var entity = self._script.param.getValue(action.entity, vars);
						var variable = self._script.param.getValue(action.variable, vars);
						var value = self._script.param.getValue(action.value, vars);

						if (variable && entity?.variables) {
							var variableId = variable.key;

							const isWorldEntityVariable = entity._stats.isWorld;
							const canBeUpdatedByMap = entity?.variables?.[variableId]?.canBeUpdatedByMap;

							if (taro.game.isWorldMap && !vars.isWorldScript && isWorldEntityVariable && !canBeUpdatedByMap) {
								self._script.errorLog(
									`can not update world entity variable from map (entity: ${entity._stats.name}, variable: ${variable.key})`
								);
								console.log(
									`can not update world entity variable from map (entity: ${entity._stats.name}, variable: ${variable.key})`,
									path,
									variableId
								);
								break;
							}

							entity.variable.update(variableId, value);
						}

						break;

					case 'rotateEntityToRadians':
					case 'rotateEntityToRadiansLT': // No more LT.
						var entity = self._script.param.getValue(action.entity, vars);
						var radians = self._script.param.getValue(action.radians, vars);
						if (
							entity &&
							self.entityCategories.indexOf(entity._category) > -1 &&
							radians !== undefined &&
							!isNaN(radians)
						) {
							// hack to rotate entity properly
							if (taro.isClient) {
								entity.rotateTo(0, 0, radians);
								entity.nextKeyFrame[1][2] = radians;
								entity.isTransforming(true);
							} else {
								entity.streamUpdateData([{ rotate: radians }]);
							}
						}

						break;

					case 'rotateEntityToFacePosition':
						var entity = self._script.param.getValue(action.entity, vars);
						var position = self._script.param.getValue(action.position, vars);
						if (!position || !entity) break;

						if (
							entity._category === 'item' &&
							entity._stats.currentBody &&
							entity._stats.currentBody.jointType === 'weldJoint'
						) {
							break;
						}
						var pos = {
							// displacement between entity and given position (e.g. mouse cursor)
							x: entity._translate.x - position.x,
							y: entity._translate.y - position.y,
						};
						var offset = (Math.PI * 3) / 2;

						var newFacingAngle = Math.atan2(pos.y, pos.x) + offset;

						if (
							self.entityCategories.indexOf(entity._category) > -1 &&
							position.x != undefined &&
							position.y != undefined
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
							else if (
								taro.isClient &&
								taro.client.myPlayer &&
								(entity == taro.client.selectedUnit || entity.getOwner() == taro.client.selectedUnit)
							) {
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
						var entity = self._script.param.getValue(action.entity, vars);

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							var position = self._script.param.getValue(action.position, vars);
							if (position && position.x != undefined && position.y != undefined) {
								pos = {
									x: entity._translate.x - position.x,
									y: entity._translate.y - position.y,
								};

								var rotationSpeed = entity._stats.currentBody.rotationSpeed;
								var ninetyDegreesInRadians = (90 * Math.PI) / 180;
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
								var torque = degDiff > 0 ? Math.min(degDiff, rotationSpeed) : Math.max(degDiff, rotationSpeed * -1);

								entity.applyTorque(torque);
								// entity.body.applyTorque(torque);
							} else {
								throw new Error(`${action.type} - invalid position`);
							}
						} else {
							self._script.errorLog(`invalid unit, ${action.type}`, path);
							throw new Error(`${action.type} - invalid unit`);
						}
						break;

					/* AI */

					case 'addBotPlayer':
						var name = self._script.param.getValue(action.name, vars) || '';
						// bot players meant to be indistinguishable from 'human' players. hence we're not tempering with controlledBy variable
						var player = taro.game.createPlayer({
							controlledBy: 'human',
							name: name,
						});
						player._stats.isBot = true;
						player.joinGame();
						break;

					case 'enableAI':
						var unit = self._script.param.getValue(action.unit, vars);
						if (unit && unit.ai) {
							unit.ai.enable();
						}
						break;

					case 'disableAI':
						var unit = self._script.param.getValue(action.unit, vars);
						if (unit && unit.ai) {
							unit.ai.disable();
						}
						break;

					case 'setUnitTargetPosition': // deprecated
						var unit = self._script.param.getValue(action.unit, vars);
						var position = self._script.param.getValue(action.position, vars);
						if (unit && unit.ai && position) {
							unit.ai.moveToTargetPosition(position.x, position.y);
						}

						break;
					case 'setUnitTargetUnit': // deprecated
						var unit = self._script.param.getValue(action.unit, vars);
						var targetUnit = self._script.param.getValue(action.targetUnit, vars);
						if (unit && unit.ai && targetUnit) {
							unit.ai.attackUnit(targetUnit);
						}
						break;

					case 'aiMoveToPosition':
						var unit = self._script.param.getValue(action.unit, vars);
						var position = self._script.param.getValue(action.position, vars);
						if (unit && unit.ai && position) {
							unit.ai.moveToTargetPosition(position.x, position.y);
						}
						break;
					case 'aiAttackUnit':
						var unit = self._script.param.getValue(action.unit, vars);
						var targetUnit = self._script.param.getValue(action.targetUnit, vars);
						if (unit && unit.ai && targetUnit) {
							unit.ai.attackUnit(targetUnit);
						}
						break;

					case 'aiGoIdle':
						var unit = self._script.param.getValue(action.unit, vars);
						if (unit && unit.ai) {
							unit.ai.goIdle();
						}
						break;

					case 'makePlayerTradeWithPlayer':
						var playerA = self._script.param.getValue(action.playerA, vars);
						var playerB = self._script.param.getValue(action.playerB, vars);
						if (playerA && playerB && playerA._category === 'player' && playerB._category === 'player') {
							if (!playerA.isTrading && playerA.id() !== playerB.id()) {
								if (!playerB.isTrading) {
									taro.network.send('trade', { type: 'init', from: playerA.id() }, playerB._stats.clientId);
								} else {
									var message = `${playerB._stats.name}is busy`;
									taro.chat.sendToRoom('1', message, playerA._stats.clientId, undefined);
								}
							}
						}
						break;
					case 'applyTorqueOnEntity':
						var entity = self._script.param.getValue(action.entity, vars);
						var torque = self._script.param.getValue(action.torque, vars);

						if (entity && torque) {
							entity.applyTorque(torque);
						}
						// apply torque on entity here

						break;
					case 'attachEntityToEntity':
						var entity = self._script.param.getValue(action.entity, vars);
						var targetEntity = self._script.param.getValue(action.targetingEntity, vars);

						if (
							entity &&
							self.entityCategories.indexOf(entity._category) > -1 &&
							targetEntity &&
							self.entityCategories.indexOf(targetEntity._category) > -1
						) {
							entity.attachTo(targetEntity);
						}

						break;

					case 'changeScaleOfEntitySprite':
						var entity = self._script.param.getValue(action.entity, vars);
						var scale = self._script.param.getValue(action.scale, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && !isNaN(scale)) {
							entity.streamUpdateData([{ scale: parseFloat(scale).toFixed(2) }]);
						}
						break;

					case 'changeScaleOfEntityBody':
						var entity = self._script.param.getValue(action.entity, vars);
						var scale = self._script.param.getValue(action.scale, vars);
						if (entity && self.entityCategories.indexOf(entity._category) > -1 && !isNaN(scale)) {
							entity.streamUpdateData([{ scaleBody: parseFloat(scale).toFixed(2) }]);
						}
						break;

					case 'setEntityState':
						var entity = self._script.param.getValue(action.entity, vars);
						var stateId = action.state;

						if (entity && self.entityCategories.indexOf(entity._category) > -1) {
							entity.setState(stateId);
						}

						break;
					case 'increaseVariableByNumber':
						var newValue = self._script.param.getValue(action.number, vars);
						if (taro.game.data.variables.hasOwnProperty(action.variable) && !_.isNaN(newValue) && !_.isNil(newValue)) {
							var variable = taro.game.data.variables[action.variable];
							if (variable.value === undefined || isNaN(variable.value)) {
								variable = variable.default || 0;
							}
							variable.value += newValue;
						}
						break;

					case 'decreaseVariableByNumber':
						var newValue = self._script.param.getValue(action.number, vars);
						if (taro.game.data.variables.hasOwnProperty(action.variable) && !_.isNaN(newValue) && !_.isNil(newValue)) {
							var variable = taro.game.data.variables[action.variable];
							if (variable.value === undefined || isNaN(variable.value)) {
								variable = variable.default || 0;
							}
							variable.value -= newValue;
						}
						break;

					case 'loadPlayerDataAndApplyIt':
						var player = self._script.param.getValue(action.player, vars);
						if (player) {
							if (player.persistedData) {
								player.loadPersistentData();
								console.log('player data loaded');

								if (action.unit) {
									var unit = self._script.param.getValue(action.unit, vars);
									if (unit) {
										unit.loadPersistentData();
										console.log('unit data loaded');
									}
								}
							}
						}
						break;

					case 'loadUnitData':
						var unit = self._script.param.getValue(action.unit, vars);
						var owner = unit.getOwner();
						if (unit && owner && owner.persistedData) {
							unit.loadPersistentData();
						}
						break;

					case 'loadUnitDataFromString':
						var unit = self._script.param.getValue(action.unit, vars);
						var data = JSON.parse(self._script.param.getValue(action.string, vars));
						if (unit && data) {
							unit.loadDataFromString(data);
						}
						break;

					case 'loadPlayerDataFromString':
						var player = self._script.param.getValue(action.player, vars);
						var data = JSON.parse(self._script.param.getValue(action.string, vars));
						if (player && data) {
							player.loadDataFromString(data);
						}
						break;

					case 'loadPlayerData':
						var player = self._script.param.getValue(action.player, vars);
						if (player && player.persistedData) {
							player.loadPersistentData();
						}
						break;

					case 'changeLayerOpacity':
						var tileLayer = self._script.param.getValue(action.layer, vars);
						var opacity = self._script.param.getValue(action.opacity, vars);

						if (taro.game.data.map.layers[tileLayer].type !== 'tilelayer') {
							break;
						} else if (tileLayer > taro.game.data.map.layers.length || tileLayer < 0) {
							break;
						} else {
							taro.developerMode.changeLayerOpacity(
								{
									layer: tileLayer,
									opacity: opacity,
								},
								'server'
							);
						}

					case 'editMapTile':
						var tileGid = self._script.param.getValue(action.gid, vars);
						var tileLayer = self._script.param.getValue(action.layer, vars);
						var tileX = self._script.param.getValue(action.x, vars);
						var tileY = self._script.param.getValue(action.y, vars);
						if (
							Number.isInteger(tileGid) &&
							Number.isInteger(tileLayer) &&
							Number.isInteger(tileX) &&
							Number.isInteger(tileY)
						) {
							if (tileGid < 0 || tileGid > taro.game.data.map.tilesets[0].tilecount) {
								break;
							} else if (taro.game.data.map.layers[tileLayer].type !== 'tilelayer') {
								break;
							} else if (tileLayer > taro.game.data.map.layers.length || tileLayer < 0) {
								break;
							} else if (tileX < 0 || tileX >= taro.game.data.map.width) {
								break;
							} else if (tileY < 0 || tileY >= taro.game.data.map.height) {
								break;
							} else {
								const obj = {};
								obj[tileX] = {};
								obj[tileX][tileY] = tileGid;
								taro.developerMode.editTile(
									{
										edit: {
											selectedTiles: [obj],
											size: 'fitContent',
											shape: 'rectangle',
											layer: [tileLayer],
											x: tileX,
											y: tileY,
										},
									},
									'server'
								);
							}
						}
						break;

					case 'editMapTiles':
						var tileGid = self._script.param.getValue(action.gid, vars);
						var tileLayer = self._script.param.getValue(action.layer, vars);
						var tileX = self._script.param.getValue(action.x, vars);
						var tileY = self._script.param.getValue(action.y, vars);
						var width = self._script.param.getValue(action.width, vars);
						var height = self._script.param.getValue(action.height, vars);
						if (
							Number.isInteger(tileGid) &&
							Number.isInteger(tileLayer) &&
							Number.isInteger(tileX) &&
							Number.isInteger(tileY) &&
							Number.isInteger(width) &&
							Number.isInteger(height)
						) {
							if (tileGid < 0 || tileGid > taro.game.data.map.tilesets[0].tilecount) {
								break;
							} else if (taro.game.data.map.layers[tileLayer].type !== 'tilelayer') {
								break;
							} else if (tileLayer > taro.game.data.map.layers.length || tileLayer < 0) {
								break;
							} else if (tileX < 0 || tileX >= taro.game.data.map.width) {
								break;
							} else if (tileY < 0 || tileY >= taro.game.data.map.height) {
								break;
							} else {
								taro.developerMode.editTile(
									{
										edit: {
											selectedTiles: [{ 0: { 0: tileGid } }],
											size: { x: width, y: height },
											shape: 'rectangle',
											layer: [tileLayer],
											x: tileX,
											y: tileY,
										},
									},
									'server'
								);
							}
						}
						break;

					case 'loadMapFromString':
						//WON'T CHANGE CONNECTED PLAYERS MAP
						//needs to be run before players join
						var data = self._script.param.getValue(action.string, vars);
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
						var key = self._script.param.getValue(action.key, vars);
						var value = self._script.param.getValue(action.value, vars);
						var object = self._script.param.getValue(action.object, vars);
						if (object && key && value) {
							object[key] = value;
						}

						break;

					case 'addNumberElement':
						var key = self._script.param.getValue(action.key, vars);
						var value = self._script.param.getValue(action.value, vars);
						var object = self._script.param.getValue(action.object, vars);

						if (object && key && (value || value === 0)) {
							object[key] = parseFloat(value);
						}

						break;

					case 'addObjectElement':
						var key = self._script.param.getValue(action.key, vars);
						var value = self._script.param.getValue(action.value, vars);
						var object = self._script.param.getValue(action.object, vars);

						if (object && key && value) {
							object[key] = value;
						}

						break;

					case 'removeElement':
						var object = self._script.param.getValue(action.object, vars);
						var key = self._script.param.getValue(action.key, vars);
						if (object && key) {
							delete object[key];
						}

						break;

					case 'openBackpackForPlayer':
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							const data = {
								command: 'updateBackpack',
								action: 'open',
							};
							if (taro.isServer) {
								taro.network.send('ui', data, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.playerUi.updateBackpack(data);
							}
						}
						break;

					case 'closeBackpackForPlayer':
						var player = self._script.param.getValue(action.player, vars);

						if (player && player._stats && player._stats.clientId) {
							const data = {
								command: 'updateBackpack',
								action: 'close',
							};
							if (taro.isServer) {
								taro.network.send('ui', data, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.playerUi.updateBackpack(data);
							}
						}
						break;

					case 'showUiElementForPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var elementId = self._script.param.getValue(action.elementId, vars);

						if (player && player._stats && player._stats.clientId && elementId) {
							const data = {
								command: 'updateUiElement',
								elementId: elementId,
								action: 'show',
							};
							if (taro.isServer) {
								taro.network.send('ui', data, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.playerUi.updateUiElement(data);
							}
						}

						break;

					case 'hideUiElementForPlayer':
						var player = self._script.param.getValue(action.player, vars);
						var elementId = self._script.param.getValue(action.elementId, vars);

						if (player && player._stats && player._stats.clientId && elementId) {
							const data = {
								command: 'updateUiElement',
								elementId: elementId,
								action: 'hide',
							};
							if (taro.isServer) {
								taro.network.send('ui', data, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.playerUi.updateUiElement(data);
							}
						}

						break;

					case 'setUIElementHtml':
						var elementId = self._script.param.getValue(action.elementId, vars);
						const sanitizerFunction = taro.isClient ? taro.clientSanitizer : taro.sanitizer;
						var htmlStr = sanitizerFunction(self._script.param.getValue(action.htmlStr, vars));
						var player = self._script.param.getValue(action.player, vars);

						if (elementId && player && player._stats && player._stats.clientId) {
							const data = {
								command: 'updateUiElement',
								elementId: elementId,
								action: 'setHtml',
								htmlStr: htmlStr || '',
							};
							if (taro.isServer) {
								taro.network.send('ui', data, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.playerUi.updateUiElement(data);
							}
						}
						break;

					case 'addClassToUIElement':
						var elementId = self._script.param.getValue(action.elementId, vars);
						var className = self._script.param.getValue(action.className, vars);
						var player = self._script.param.getValue(action.player, vars);

						if (elementId && player && player._stats && player._stats.clientId) {
							const data = {
								command: 'updateUiElement',
								elementId: elementId,
								action: 'addClass',
								className: className || '',
							};
							if (taro.isServer) {
								taro.network.send('ui', data, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.playerUi.updateUiElement(data);
							}
						}
						break;

					case 'removeClassFromUIElement':
						var elementId = self._script.param.getValue(action.elementId, vars);
						var className = self._script.param.getValue(action.className, vars);
						var player = self._script.param.getValue(action.player, vars);

						if (elementId && player && player._stats && player._stats.clientId) {
							const data = {
								command: 'updateUiElement',
								elementId: elementId,
								action: 'removeClass',
								className: className || '',
							};
							if (taro.isServer) {
								taro.network.send('ui', data, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.playerUi.updateUiElement(data);
							}
						}
						break;

					case 'purchaseItemFromShop':
						var player = self._script.param.getValue(action.player, vars);
						var shopId = action.shop;
						var entityId = action.itemType;

						if (entityId && player && shopId && taro.game.data?.defaultData?.tier !== '1') {
							player._stats.lastOpenedShop = action.shop;
							taro.network.send(
								'ui',
								{
									command: 'shopPurchase',
									shopId,
									entityId,
									action: 'openEntityPurchaseModal',
								},
								player._stats.clientId
							);
						}
						break;

					case 'openSkinShop':
						var player = self._script.param.getValue(action.player, vars);
						if (player && taro.game.data.defaultData.tier >= '2') {
							taro.network.send(
								'ui',
								{
									command: 'skinShop',
									action: 'openSkinShop',
								},
								player._stats.clientId
							);
						}
						break;

					case 'openSkinSubmissionPage':
						var player = self._script.param.getValue(action.player, vars);
						if (player && taro.game.data.defaultData.tier >= '2') {
							taro.network.send(
								'ui',
								{
									command: 'skinShop',
									action: 'openSkinSubmissionPage',
								},
								player._stats.clientId
							);
						}
						break;

					case 'setUIElementProperty': {
						let player = self._script.param.getValue(action.player, vars);
						let elementId = self._script.param.getValue(action.elementId, vars);
						let value = self._script.param.getValue(action.value, vars);
						let key = self._script.param.getValue(action.key, vars);
						const sanitizerFunction = taro.isClient ? taro.clientSanitizer : taro.sanitizer;

						if (typeof key === 'string') {
							const data = {
								command: 'updateUiElement',
								elementId,
								action: 'setUIElementProperty',
								value: typeof value === 'string' ? sanitizerFunction(value) : '',
								key,
							};
							if (taro.isServer) {
								taro.network.send('ui', data, player._stats.clientId);
							} else if (player._stats.clientId === taro.network.id()) {
								taro.playerUi.updateUiElement(data);
							}
						}
						break;
					}

					case 'sendDataFromServerToClient': {
						if (taro.isServer) {
							const player = self._script.param.getValue(action.client, vars);
							const data = self._script.param.getValue(action.data, vars);

							if (player && player._stats.clientId) {
								const clientId = player._stats.clientId;
								taro.network.send(
									'sendDataFromServer',
									{
										data,
									},
									clientId
								);
							}
						}
						break;
					}

					case 'sendDataFromClientToServer': {
						if (taro.isClient) {
							const player = self._script.param.getValue(action.player, vars);
							const data = self._script.param.getValue(action.data, vars);

							if (player && player._stats.clientId === taro.network.id()) {
								taro.network.send('sendDataFromClient', {
									data,
								});
							}
						}
						break;
					}

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
				// console.log(e);
				self._script.errorLog(e, path); // send error msg to client
			}
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ActionComponent;
}
