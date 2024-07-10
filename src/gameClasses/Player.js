var Player = TaroEntity.extend({
	classId: 'Player',
	componentId: 'player',

	init: function (data, entityIdFromServer) {
		TaroEntity.prototype.init.call(this);
		this.id(entityIdFromServer);
		var self = this;

		var playerData = taro.game.cloneAsset('playerTypes', data.playerTypeId);
		this._stats = _.merge(playerData, data);

		// dont save variables in _stats as _stats is stringified and synced
		// and some variables of type unit, item, projectile may contain circular json objects
		self.variables = {};
		self.quests = { active: {}, completed: {} };
		if (self._stats.variables) {
			self.variables = self._stats.variables;
			delete self._stats.variables;
		}

		self.lastCustomInput = '';

		self.realtimeCSS = '';
		self.lastHtmlUiClickData = {};

		Player.prototype.log(`player created ${this.id()}`);

		this.category('player');
		this.mount(taro.$('baseScene'));

		self.addComponent(AttributeComponent);
		self.addComponent(VariableComponent);
		self.addComponent(QuestComponent);

		if (taro.isServer) {
			this.streamMode(1);
			// self._stats.unitId = self.getCurrentUnit().id()
			self.addComponent(ControlComponent);
			taro.server.totalPlayersCreated++;
		} else if (taro.isClient) {
			// if this player is "me"
			if (self._stats.clientId == taro.network.id()) {
				taro.client.playerJoinedAt = taro._currentTime;
				taro.client.eventLog.push([taro._currentTime - taro.client.playerJoinedAt, 'My player created']);

				// old comment => 'declare my player'
				taro.client.myPlayer = self;

				if (typeof startVideoChat == 'function') {
					// the elephant is back
					startVideoChat(self.id());
				}

				self.redrawUnits(['nameLabel']);

				self.addComponent(ControlComponent);

				// mouse move listener
				taro.input.on('pointermove', function (point) {
					if (taro.client.myPlayer && !taro.isMobile) {
						self.control.input.mouse.x = point.x.toFixed(0);
						self.control.input.mouse.y = point.y.toFixed(0);

						// Check if it exists, only three.js renderer sends this currently
						self.control.input.mouse.yaw = point.yaw ?? 0;
						self.control.input.mouse.pitch = point.pitch ?? Math.PI * 0.5;

						self.control.newMouseState[0] = point.x.toFixed(0);
						self.control.newMouseState[1] = point.y.toFixed(0);
						self.control.newMouseState[2] = self.control.input.mouse.yaw;
						self.control.newMouseState[3] = self.control.input.mouse.pitch;
					}
				});

				this.setChatMute(this._stats.banChat);
			}

			// apply skin to the selected unit if the unit already exists on the client side
			if (this._stats && this._stats.selectedUnitId) {
				const unit = taro.$(this._stats.selectedUnitId);
				if (unit) {
					unit.equipSkin();
				}
			}

			// redraw name labels and textures of all units owned by this player
			self.redrawUnits(
				function (unit) {
					return unit && unit.getOwner() && unit.getOwner().id() === self.id();
				},
				['texture', 'nameLabel']
			);

			taro.entitiesToRender.trackEntityById[entityIdFromServer] = this;
		}
	},

	// move to UI
	// idle boolean is passed from worker
	joinGame: function (idle = false) {
		var self = this;
		if (self._stats.playerJoined != true || idle) {
			// do not send trigger for neutral player (old comment)
			// idle added for idle mode
			// checking if taro.script exists because AI players are created right before ScriptComponent init
			if (taro.script && !idle) {
				taro.script.trigger('playerJoinsGame', { playerId: self.id() });
			}

			if (self._stats.controlledBy == 'human' && !self._stats.isBot) {
				var clientId = self._stats.clientId;
				var client = taro.server.clients[clientId];

				if (client) {
					var receivedJoinGame = client.receivedJoinGame;
					var processedJoinGame = Date.now() - receivedJoinGame;
					var dataLoadTime = self._stats.totalTime;
					client.lastEventAt = Date.now();

					if (taro.game.data.map.wasEdited) {
						var playerJoinStreamData = [
							{ streamedOn: Date.now() },
							{ playerJoined: true },
							{ dataLoadTime: dataLoadTime },
							{ processedJoinGame: processedJoinGame },
							{ receivedJoinGame: receivedJoinGame },
							{ mapData: taro.game.data.map },
						];
					} else {
						var playerJoinStreamData = [
							{ streamedOn: Date.now() },
							{ playerJoined: true },
							{ dataLoadTime: dataLoadTime },
							{ processedJoinGame: processedJoinGame },
							{ receivedJoinGame: receivedJoinGame },
						];
					}

					// Adding script data and default variables to the player join stream data for developer clients
					if (taro.server.developerClientIds.includes(clientId)) {
						playerJoinStreamData.push({ scriptData: taro.game.data.scripts });
						playerJoinStreamData.push({ variableData: taro.defaultVariables });
					}

					self.streamUpdateData(playerJoinStreamData);
				}
			}

			if (self._stats.userId || self._stats.guestUserId) {
				taro.workerComponent &&
					taro.workerComponent.playerJoined(clientId, self._stats.userId, self._stats.guestUserId);
			}
		} else {
			console.log(`player joined again (menu closed?) ${self._stats.clientId} (${self._stats.name})`);
			self.streamUpdateData([{ playerJoinedAgain: true }]);
		}
	},

	createUnit: function (data) {
		var self = this;

		if (taro.isServer) {
			var data = Object.assign(data, {
				clientId: self._stats.clientId,
				name: self._stats.name,
				playerId: self.id(),
			});

			var unit = new Unit(data);
			unit.setOwnerPlayer(self.id());

			taro.script.trigger('entityCreatedGlobal', { entityId: unit.id() });
			unit.script.trigger('entityCreated');

			// setOwner will add unitId to unitIds
			// self._stats.unitIds.push(unit.id())

			Player.prototype.log(`created unit ${unit.id()} for ${self._stats.name} (${self._stats.clientId})`);
			return unit;
		}
	},

	ownUnit: function (unit) {
		if (this._stats.unitIds.indexOf(unit.id()) == -1 && unit.id() != 'taro') {
			this._stats.unitIds.push(unit.id());
		}

		// if player has only 1 unit, then select that unit
		if (this._stats.unitIds.length === 1) {
			this.selectFirstAvailableUnit();
		}
	},

	// remove unit from the array of units owned by this player
	disownUnit: function (unit, deselectUnit) {
		var index = this._stats.unitIds.indexOf(unit.id());
		if (index !== -1) {
			this._stats.unitIds.splice(index, 1);
			if (deselectUnit && this._stats.selectedUnitId === unit.id()) {
				this.selectUnit(null);
			}
		}
	},

	// make player select a unit and do the following:
	// 1. camera track (if this is the only unit)
	// 2. update inventory
	// 3. update attribute bars
	selectUnit: function (unitId) {
		var self = this;

		var unit = taro.$(unitId);
		if (taro.isServer && self._stats.clientId) {
			if (unit && unit._category == 'unit' && unit.getOwner() == this) {
				self._stats.selectedUnitId = unitId;
				self.streamUpdateData([{ selectedUnitId: unitId }]);
				unit.streamUpdateData([{ itemIds: unit._stats.itemIds }], self._stats.clientId); // send item inventory data for the newly selected unit
			} else if (unitId === null) {
				self.control.releaseAllKeys();
				self._stats.selectedUnitId = null;
				self.streamUpdateData([{ selectedUnitId: null }]);
			}
		}

		if (taro.isClient) {
			if (self._stats.clientId == taro.network.id() && unit && unit._category == 'unit') {
				self.control.releaseAllKeys();
				self._stats.selectedUnitId = unitId;

				if (unit.inventory) {
					unit.inventory.createInventorySlots();
				}
				if (unit.unitUi) {
					unit.unitUi.updateAllAttributeBars();
				}

				// abilities
				if (!taro.isMobile) {
					const abilitiesData = taro.game.data.unitTypes[unit._stats.type].controls.unitAbilities;
					taro.client.emit('create-ability-bar', {
						keybindings: taro.game.data.unitTypes[unit._stats.type].controls.abilities,
						abilities: abilitiesData,
					});
				}

				unit.renderMobileControl();

				taro.client.selectedUnit = unit;
				taro.client.eventLog.push([taro._currentTime, `my unit selected ${unitId}`]);
			} else if (self._stats.clientId == taro.network.id() && unitId === null) {
				taro.client.selectedUnit = null;
				self._stats.selectedUnitId = null;
				self.control.releaseAllKeys();
			}
		}
	},

	cameraTrackUnit: function (unitId) {
		this._stats.cameraTrackedUnitId = unitId;

		// self._stats.selectedUnitId = unit.id()
		if (taro.isServer) {
			if (this._stats.clientId) {
				this.streamUpdateData([{ cameraTrackedUnitId: unitId }], this._stats.clientId);
				// taro.network.send(
				// 	'makePlayerCameraTrackUnit',
				// 	{ unitId: unit.id() },
				// 	this._stats.clientId
				// );
			}
		} else if (taro.isClient) {
			var unit = taro.$(unitId);
			if (unit) {
				unit.emit('follow');
			}
		}
	},

	setCameraPitch: function (angle) {
		if (taro.isServer) {
			if (this._stats.clientId) {
				this.streamUpdateData([{ cameraPitch: angle }], this._stats.clientId);
			}
		} else if (taro.isClient) {
			taro.client.emit('camera-pitch', angle);
		}
	},

	cameraStopTracking: function () {
		this._stats.cameraTrackedUnitId = undefined;
		if (taro.isServer) {
			if (this._stats.clientId) {
				this.streamUpdateData([{ cameraTrackedUnitId: 'no_unit' }], this._stats.clientId);
			}
		} else if (taro.isClient) {
			taro.client.emit('stop-follow');
		}
	},

	changeCameraPanSpeed: function (panSpeed) {
		var self = this;

		if (taro.isServer && self._stats.clientId) {
			taro.network.send('changePlayerCameraPanSpeed', { panSpeed: panSpeed }, self._stats.clientId);
		} else if (taro.isClient && self._stats.clientId == taro.network.id() && panSpeed !== undefined) {
			taro.client.vp1.camera.trackTranslateSmoothing(panSpeed);
		}
	},

	// get selectedUnits' 0th index unit
	selectFirstAvailableUnit: function () {
		if (this._stats.unitIds) {
			var unit = taro.$(this._stats.unitIds[0]);
			if (unit) {
				this.selectUnit(unit.id());
			}
		}
	},

	getSelectedUnit: function () {
		return taro.$(this._stats.selectedUnitId);
	},

	getUnits: function (clientId) {
		var self = this;
		return taro
			.$$('unit')
			.filter(function (unit) {
				return unit._stats && unit._stats.ownerId == self.id();
			})
			.reduce(function (partialUnits, unit) {
				partialUnits[unit._id] = unit;
				return partialUnits;
			}, {});
	},

	castAbility: function (command) {
		var self = this;
		var units = taro.game.getUnitsByClientId(this._stats.clientId);
		for (i in units) {
			var unit = units[i];
			if (unit) {
				var unitType = taro.game.getAsset('unitTypes', unit._stats.type);
				if (unitType && unitType.abilities) {
					var ability = unitType.abilities[command];
					if (ability) {
						unit.ability.queueCast(ability);
					}
				}
			}
		}
	},

	updatePlayerType: function (data) {
		var self = this;

		if (taro.isServer) {
			// update all units that are targeting this player's unit to act appropriately based on new relationship dynamics
			// for example, this player's unit may not be the enemy anymore and
			// if AI unit was attacking his player's unit, then it should stop.

			// iterate through all units owned by this player
			self._stats.unitIds.forEach(function (unitId) {
				var unit = taro.$(unitId);
				// iterate through all units in the game that's currently targeting this unit, and update their behaviour accordingly
				// based on new relationship dynamics
				taro.$$('unit').forEach(function (unit) {
					if (unit._stats.ownerId != self.id() && unit.ai.targetUnitId == unitId) {
						if (self.isHostileTo(unit.getOwner()) == false) {
							unit.ai.targetUnitId = undefined;
						}
					}
				});
			});
		}

		// pass old attributes' values to new attributes (given that attributes have same ID)
		if (self._stats.attributes != undefined) {
			var oldAttributes = rfdc()(self._stats.attributes);
			for (attrId in data.attributes) {
				if (oldAttributes[attrId] != undefined) {
					data.attributes[attrId].value = oldAttributes[attrId].value;
					data.attributes[attrId].max = oldAttributes[attrId].max;
				}
			}
		}

		self._stats.attributes = data.attributes;

		if (data.variables) {
			var oldVariables = rfdc()(self.variables);
		}
		// update variables and pass old variables' values to new variables (given that variables have same ID)
		self.variables = {};
		if (data.variables) {
			Object.keys(data.variables).forEach(function (variableId) {
				if (!self.variables[variableId] && !oldVariables[variableId]) {
					self.variables[variableId] = data.variables[variableId];
				} else {
					// If the variable already exists, update its value with the old one
					if (oldVariables[variableId] !== undefined) {
						self.variables[variableId] = oldVariables[variableId];
						self.variables[variableId].value = oldVariables[variableId].value;
					}
				}

				// if the value is undefined, update it with the default value
				if (self.variables[variableId].value === undefined) {
					self.variables[variableId].value = self.variables[variableId].default;
				}
			});
		}

		if (taro.isClient) {
			var isMyPlayerUpdated = self._stats.clientId == taro.network.id();
			// show name label can be false for assignedPlyerType so updateNameLabel accordingly
			self.redrawUnits(
				function (unit) {
					var owner = unit.getOwner();

					return owner && owner.id() === self.id();
				},
				['nameLabel', 'texture']
			);

			// update attr bars of all units
			self.redrawUnits(
				function (unit) {
					var ownerPlayer = unit.getOwner();

					return isMyPlayerUpdated || (ownerPlayer && ownerPlayer.id() === self.id());
				},
				['attributeBars']
			);

			if (isMyPlayerUpdated) {
				// update UI
				taro.playerUi.updatePlayerAttributesDiv(self._stats.attributes);
			}

			if (taro.scoreboard) {
				taro.scoreboard.queueUpdate();
			}
		}
	},

	getUnitCount: function () {
		var units = this._stats.unitIds;
		if (units) return Object.keys(units).length;
		return 0;
	},

	// if any player feels hostile towards another, then it's a hostile relationship
	isHostileTo: function (player) {
		if (player == undefined) {
			return false;
		}

		var myPlayerType = taro.game.getAsset('playerTypes', this._stats.playerTypeId);
		if (myPlayerType && myPlayerType.relationships) {
			if (myPlayerType.relationships[player._stats.playerTypeId] == 'hostile') return true;
		}
		return false;
	},

	// if both players are friendly to each other, then it's a friendly relationship
	isFriendlyTo: function (player) {
		if (player == undefined) {
			return false;
		}

		var myPlayerType = taro.game.getAsset('playerTypes', this._stats.playerTypeId);
		if (myPlayerType && myPlayerType.relationships) {
			if (myPlayerType.relationships[player._stats.playerTypeId] == 'friendly') {
				return true;
			}
		}
		return false;
	},

	// if both players are non-hostile but not friendly, then it's a neutral relationship
	isNeutralTo: function (player) {
		return this.isHostileTo(player) == false && this.isFriendlyTo(player) == false;
	},

	isDeveloper: function () {
		var self = this;
		if (!self._stats) {
			return false;
		}

		if (self._stats.userId == taro.game.data.defaultData.owner) {
			return true;
		}

		if (self._stats.isUserAdmin || self._stats.isUserMod) {
			return true;
		}

		let roles = taro.game.data.roles || [];

		let isModerator =
			self._stats?.roleIds &&
			roles.find((role) => role?.permissions?.moderator && self._stats?.roleIds.includes(role._id.toString()));

		return isModerator;
	},

	remove: function () {
		// AI players cannot be removed
		if (this._stats.controlledBy == 'human') {
			// do not send trigger for neutral player
			if (taro.isServer) {
				const i = taro.server.developerClientIds.indexOf(this._stats.clientId);
				if (i != -1) taro.server.developerClientIds.splice(i, 1);
			}

			taro.script.trigger('playerLeavesGame', { playerId: this.id() });

			// session is in second
			if (this.variables && this.variables.progression != undefined && this.variables.progression.value != undefined) {
				taro.workerComponent && taro.workerComponent.emit('log-progression', this.variables.progression.value);
			}
			this.streamDestroy();
			this.destroy();
		}
	},

	updateVisibility: function (playerId) {
		var player = taro.$(playerId);

		if (!player) {
			return;
		}

		// make hostile-invisible units invisible and friendly & neutral units visible (and its item)
		this.redrawUnits(
			function (unit) {
				var owner = unit.getOwner();
				return owner != undefined && owner.id() == playerId;
			},
			['texture', 'nameLabel']
		);

		// make the items visible/invisible that belongs to any unit of this player
		taro.$$('item').forEach(function (item) {
			var ownerUnit = item.getOwnerUnit();
			var ownerPlayer = ownerUnit && ownerUnit.getOwner();
			var belongsToCurrentPlayer = ownerPlayer && ownerPlayer.id() === playerId;

			if (belongsToCurrentPlayer) {
				item.updateTexture();
			}
		});
	},

	// update player's stats in the server side first, then update client side as well.
	streamUpdateData: function (queuedData, clientId) {
		var self = this;
		var oldStatsName = self._stats.name;
		TaroEntity.prototype.streamUpdateData.call(this, queuedData, clientId);

		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];
				// if player's type changed, then update all of its base stats (speed, stamina, etc..)
				if (attrName === 'playerTypeId') {
					self._stats[attrName] = newValue;
					var playerTypeData = taro.game.cloneAsset('playerTypes', newValue);
					if (playerTypeData) {
						playerTypeData.playerTypeId = newValue;

						if (taro.isClient) {
							// change color of label of all units that belongs to updating player
							self.redrawUnits(
								function (unit) {
									// dont update color if unitType of my unit is changed on my screen as it will be always Lime
									var isMyPlayerUpdated = self._stats.clientId === taro.network.id();
									// update color of all units that belongs to player whose playerType just changed
									var ownerPlayer = unit.getOwner();
									var unitBelongsToUpdatingPlayer = ownerPlayer && ownerPlayer.id() === self.id();

									return !isMyPlayerUpdated && unitBelongsToUpdatingPlayer;
								},
								['nameLabel']
							);
						}

						self.updatePlayerType(playerTypeData);
					}
				}

				if (taro.isServer) {
					if (attrName === 'name' && oldStatsName !== newValue) {
						self._stats[attrName] = newValue;
						// update all units
						self._stats.unitIds.forEach(function (unitId) {
							var unit = taro.$(unitId);
							unit.streamUpdateData([{ name: newValue }]);
						});
					} else if (attrName === 'playerJoined' && newValue == false) {
						// player's been kicked/removed
						self._stats[attrName] = newValue;
						self.remove();
					}
				}

				if (taro.isClient) {
					switch (attrName) {
						case 'name':
							self._stats[attrName] = newValue;
							// update here
							if (typeof refreshUserName === 'function') {
								refreshUserName(newValue);
							}
							break;

						case 'purchasables':
							// update client purchasables if streamed from server to make sure equip/unequip skin works
							self._stats[attrName] = newValue;
							break;

						case 'equiped':
							self._stats[attrName] = newValue;
							var unit = self.getSelectedUnit();
							if (unit) {
								unit.equipSkin();
							}
							break;

						case 'unEquiped':
							self._stats[attrName] = newValue;
							var unit = self.getSelectedUnit();
							if (unit) {
								unit.unEquipSkin(null, false, newValue);
							}
							break;

						case 'selectedUnitId':
							self._stats[attrName] = newValue;
							// this unit was queued to be selected by a player
							if (taro.isClient) {
								self.selectUnit(newValue);
							}
							break;
						default:
							// Handle the case when attrName does not match any of the above cases.
							break;
					}

					if (self._stats.clientId == taro.network.id()) {
						switch (attrName) {
							case 'cameraTrackedUnitId':
								if (newValue === 'no_unit') {
									// this unit was queued to be stop tracked by a player's camera
									self.cameraStopTracking();
								} else {
									// this unit was queued to be tracked by a player's camera
									self.cameraTrackUnit(newValue);
								}
								break;

							case 'cameraPitch':
								self.setCameraPitch(newValue);
								break;

							case 'scriptData':
								taro.developerMode.serverScriptData = newValue;
								taro.developerMode.savedScriptData = newValue;
								break;

							case 'variableData':
								taro.developerMode.serverVariableData = newValue;
								window.inGameEditor?.compareAndUpdateVariablesData &&
									window.inGameEditor.compareAndUpdateVariablesData(newValue);
								break;

							case 'mapData':
								self._stats[attrName] = newValue;
								taro.developerMode.updateClientMap(data);
								break;

							case 'attributes':
								taro.playerUi.updatePlayerAttributeValues(self._stats.attributes);
								break;

							case 'coins':
								const isCoinsChanged = self._stats[attrName] !== newValue;
								self._stats[attrName] = newValue;
								if (isCoinsChanged) {
									taro.playerUi.updatePlayerCoin(newValue);
								}
								break;

							case 'roleIds':
								self._stats[attrName] = newValue;
								break;

							case 'playerJoinedAgain':
								self.hideMenu();
								break;

							case 'banChat':
								self._stats[attrName] = newValue;
								self.setChatMute(newValue);
								break;

							case 'playerJoined':
								self._stats[attrName] = newValue;
								// console.log('received player.playerJoined');
								taro.client.eventLog.push([taro._currentTime, 'playerJoined received']);
								// render name labels of all other units
								self.redrawUnits(['nameLabel']);

								self._stats.receivedJoinGame = data.receivedJoinGame;
								taro.client.eventLog.push([
									taro._currentTime - taro.client.playerJoinedAt,
									"'playerJoined' received from server",
								]);
								self._stats.processedJoinGame = data.processedJoinGame;
								var streamingDiff = `${Date.now() - data.streamedOn}ms`;

								window.joinGameSent.end = Date.now();
								window.joinGameSent.completed = window.joinGameSent.end - window.joinGameSent.start;

								taro.script.trigger('playerJoinsGame', { playerId: self.id() });

								console.log(
									`JoinGame took ${window.joinGameSent.completed}ms to join player` +
										`, client to gs: ${self._stats.receivedJoinGame - window.joinGameSent.start}ms` +
										`, gs loading player data: ${self._stats.totalTime}ms` +
										`, gs processed request for: ${self._stats.processedJoinGame}ms` +
										`, gs to client: ${streamingDiff}, client sent on: ${window.joinGameSent.start}, server sent back on: ${data.streamedOn}`
								);

								if (window.joinGameSent.completed > 7000) {
									$.post(`${window.BASE_URL}/api/log`, {
										event: 'rollbar',
										text:
											`${Date.now()}:- JoinGame took ${window.joinGameSent.completed}ms to join player` +
											`, client to gs: ${self._stats.receivedJoinGame - window.joinGameSent.start}ms` +
											`, gs loading player data: ${self._stats.totalTime}ms` +
											`, gs processed request for: ${self._stats.processedJoinGame}ms` +
											`, gs to client: ${streamingDiff}, client sent on: ${window.joinGameSent.start}, server sent back on: ${data.streamedOn}`,
									});
								}
								if (self._stats.processedJoinGame > 7000) {
									$.post(`${window.BASE_URL}/api/log`, {
										event: 'rollbar',
										text:
											`${Date.now()}JoinGame took ${window.joinGameSent.completed}ms to create player` +
											`, client to gs: ${self._stats.receivedJoinGame - window.joinGameSent.start}ms` +
											`, gs loading player data: ${self._stats.totalTime}ms` +
											`, gs processed request for: ${self._stats.processedJoinGame}ms` +
											`, gs to client: ${streamingDiff}, client sent on: ${window.joinGameSent.start}, server sent back on: ${data.streamedOn}`,
									});
								}

								self.hideMenu();
								clearTimeout(window.errorLogTimer);
								break;

							default:
								// Handle the case when attrName does not match any of the above cases.
								break;
						}
					}

					if (
						attrName === 'banChat' &&
						(taro.game.data.isDeveloper || (taro.client.myPlayer && taro.client.myPlayer._stats.isUserMod))
					) {
						self._stats[attrName] = newValue;
						taro.menuUi.kickPlayerFromGame();
					}
				}
			}
		}
	},
	setChatMute: function (value) {
		if (taro.env == 'local')
			// don't mute users in dev env
			return;

		window.setTempChatMute && window.setTempChatMute(value);
	},

	redrawUnits: function (filterFn, properties) {
		if (filterFn instanceof Array) {
			properties = filterFn;
			filterFn = null;
		}

		taro
			.$$('unit')
			.filter(function (unit) {
				return filterFn ? filterFn(unit) : true;
			})
			.forEach(function (unit) {
				properties.forEach(function (property) {
					switch (property) {
						case 'nameLabel': {
							unit.updateNameLabel();
							break;
						}
						case 'texture': {
							unit.updateTexture();
							break;
						}
						case 'attributeBars': {
							unit.redrawAttributeBars();
							break;
						}
					}
				});
			});
	},

	updatePlayerHighscore: function () {
		var self = this;
		var scoreId = taro.game.data.settings.persistentScoreAttributeId;
		try {
			// comparing player highscore with current highscore. if current highscore is greter then request it to update server
			if (
				scoreId &&
				self._stats &&
				self._stats.attributes &&
				self._stats.attributes[scoreId] &&
				(self._stats.highscore < self._stats.newHighscore ||
					self._stats.highscore < self._stats.attributes[scoreId].value)
			) {
				var score = Math.max(self._stats.newHighscore || 0, self._stats.attributes[scoreId].value || 0);

				if (score > self._stats.highscore) {
					// highscore updated
					taro.workerComponent &&
						taro.workerComponent.updatePlayerHighscore({
							userId: self._stats.userId,
							gameId: taro.game.data.defaultData._id,
							highscore: score,
						});
					// trigger
					taro.script.trigger('playerGetsNewHighscore', { playerId: this.id() });
				}
			}
		} catch (e) {
			Player.prototype.log(e);
		}
	},

	tick: function (ctx) {
		// if entity (unit/item/player/projectile) has attribute, run regenerate
		if (taro.isServer) {
			if (this.attribute) {
				this.attribute.regenerate();
			}
		}

		TaroEntity.prototype.tick.call(this, ctx);
	},

	_behaviour: function () {
		if (taro.isClient) {
			var processedUpdates = [];
			var updateQueue = taro.client.entityUpdateQueue[this.id()];

			if (updateQueue) {
				for (var key in updateQueue) {
					var value = updateQueue[key];

					processedUpdates.push({ [key]: value });
					delete taro.client.entityUpdateQueue[this.id()][key];

					// remove queue object for this entity is there's no queue remaining in order to prevent memory leak
					if (Object.keys(taro.client.entityUpdateQueue[this.id()]).length == 0) {
						delete taro.client.entityUpdateQueue[this.id()];
					}
				}

				if (processedUpdates.length > 0) {
					this.streamUpdateData(processedUpdates);
				}
			}
		}
	},

	loadPersistentData: function () {
		var self = this;

		var persistData = rfdc()(self.persistedData);
		if (persistData && persistData.data && persistData.data.player) {
			TaroEntity.prototype.loadPersistentData.call(this, persistData.data.player);
		}
		console.log('load persisted data is now true');
		self.persistentDataLoaded = true;
	},

	loadDataFromString: function (data) {
		var self = this;

		var persistData = data;
		if (persistData) {
			TaroEntity.prototype.loadPersistentData.call(this, persistData);
		}
		self.persistentDataLoaded = true;
	},

	hideMenu: function () {
		if (taro.isClient) {
			// UI related changes like hiding menu, etc...
			$('#play-game-button').removeAttr('disabled');
			var html = '<i class="fa fa-gamepad pr-2 py-3" aria-hidden="true"></i>Continue';
			$('#play-game-button .content').html(html);

			$('#modd-shop-div').addClass('d-flex');
			taro.client.eventLog.push([taro._currentTime - taro.client.playerJoinedAt, 'hide menu called']);
			taro.menuUi.hideMenu(); // if player's already joined the game, then just hide menu when "play game" button is clicked
			if (!taro.client.guestmode) {
				$('.open-menu-button').show();
			}

			window.reactApp && window.reactApp.playerJoinedGame && window.reactApp.playerJoinedGame();
			window && window.playerJoinedGame && window.playerJoinedGame();
			window.playerJoinedTheGame = true;

			if ((typeof userId !== 'undefined' && typeof sessionId !== 'undefined') || window.isStandalone) {
				if (
					(taro.game.data.isGameDeveloper && ['1', '4', '5'].includes(taro.game.data.defaultData.tier)) ||
					window.isStandalone
				) {
					if (window.isStandalone) {
						taro.developerMode.enter();
						loadEditor();
						$('#game-editor').show();
						$('#kick-player').hide();
						// $('#toggle-dev-panels').click();
					}
				} else {
					if (taro.game.data.isDeveloper) {
						// $('#toggle-dev-panels').show();
					}
				}
				if (taro.game.data.isDeveloper) {
					$('#kick-player').show();
				}
				if (taro.client.myPlayer && taro.client.myPlayer._stats.isUserMod) {
					$('#kick-player').show();
				}
			}
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Player;
}
