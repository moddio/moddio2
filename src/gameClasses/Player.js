var Player = TaroEntity.extend({
	classId: 'Player',
	componentId: 'player',

	init: function (data, entityIdFromServer) {
		TaroEntity.prototype.init.call(this);
		this.id(entityIdFromServer);
		var self = this;


		var playerData = taro.game.getAsset('playerTypes', data.playerTypeId);
		this._stats = _.merge(playerData, data);

		// dont save variables in _stats as _stats is stringified and synced
		// and some variables of type unit, item, projectile may contain circular json objects
		if (self._stats.variables) {
			self.variables = self._stats.variables;
			delete self._stats.variables;
		}

		self.lastCustomInput = '';

		Player.prototype.log(`player created ${this.id()}`);

		this.category('player');
		this.mount(taro.$('baseScene'));

		self.addComponent(AttributeComponent);

		if (taro.isServer) {
			this.streamMode(2);
			// self._stats.unitId = self.getCurrentUnit().id()
			self.addComponent(ControlComponent);
			taro.server.totalPlayersCreated++;
		} else if (taro.isClient) {
			// if this player is "me"
			if (self._stats.clientId == taro.network.id()) {
				self.addComponent(ControlComponent);

				// mouse move listener
				taro.input.on('pointermove', function (point) {
					if (taro.client.myPlayer) {
						self.control.newMousePosition = [
							point.x.toFixed(0),
							point.y.toFixed(0)
						];
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
			self.redrawUnits(function (unit) {
				return unit && unit.getOwner() && unit.getOwner().id() === self.id();
			}, ['texture', 'nameLabel']);

			taro.entitiesToRender.trackEntityById[entityIdFromServer] = this;
		}
	},

	// move to UI
	joinGame: function () {
		var self = this;

		if (self._stats.playerJoined != true) {
			// notify GS manager that a user has joined, do not notify if player joins again after pausing the game
			if (self._stats.userId) {
				taro.clusterClient.userJoined(self._stats.userId);
			}

			if (taro.script) // do not send trigger for neutral player
			{
				taro.script.trigger('playerJoinsGame', { playerId: self.id() });
			}

			if (self._stats.controlledBy == 'human' && !self._stats.isBot) {
				var clientId = self._stats.clientId;
				var client = taro.server.clients[clientId];
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
						{ mapData: taro.game.data.map }
					];
				} else {
					var playerJoinStreamData = [
						{ streamedOn: Date.now() },
						{ playerJoined: true },
						{ dataLoadTime: dataLoadTime },
						{ processedJoinGame: processedJoinGame },
						{ receivedJoinGame: receivedJoinGame }
					];
				}

				// console.log(`Player.joinGame(): sending ACK to client ${self._stats.clientId} ${self._stats.name} (time elapsed: ${Date.now() - client.lastEventAt})`, playerJoinStreamData);

				self.streamUpdateData(playerJoinStreamData);
				taro.clusterClient && taro.clusterClient.playerJoined(self._stats.userId);
			}

		} else {
			console.log(`player joined again (menu closed?) ${self._stats.clientId} (${self._stats.name})`);
			self.streamUpdateData([{ playerJoinedAgain: true }]);
		}
	},

	createUnit: function (data) {
		var self = this;

		if (taro.isServer) {
			var data = Object.assign(
				data,
				{
					clientId: self._stats.clientId,
					name: self._stats.name
				});

			var unit = new Unit(data);
			unit.setOwnerPlayer(self.id());

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
	disownUnit: function (unit) {
		var index = this._stats.unitIds.indexOf(unit.id());
		if (index !== -1) {
			this._stats.unitIds.splice(index, 1);
			if (this._stats.selectedUnitId === unit.id()) {
				var unit = taro.$(unit.id());
				/*if (unit) {
					unit.ability.stopMovingX();
					unit.ability.stopMovingY();
					unit.ability.stopUsingItem();
				}*/
				//this.selectUnit(null);
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
			if (unit && unit._category == 'unit' && unit.getOwner() == this || unitId === null) {
				self._stats.selectedUnitId = unitId;
				taro.network.send('makePlayerSelectUnit', { unitId: unitId }, self._stats.clientId);
			} else {
				// someone's attempting exploit by trying to assign a unit to a player that's not the unit's owner
				var client = taro.server.clients[self._stats.clientId];
				var logData = {
					query: 'exploitSelectUnit',
					gameTitle: taro.game.data.defaultData.title,
					playerName: this._stats.name,
					ip: client.ip,
					userId: client.userId
				};
				global.rollbar.log("selectUnit exploit", logData);
			}
		}

		if (taro.isClient) {

			if (self._stats.clientId == taro.network.id() && unit && unit._category == 'unit') {
				self._stats.selectedUnitId = unitId;

				if (unit.inventory) {
					unit.inventory.createInventorySlots();
				}
				if (unit.unitUi) {
					unit.unitUi.updateAllAttributeBars();
				}

				if (unit && unit.inventory) {
					unit.inventory.updateBackpackButton();
				}

				unit.renderMobileControl();
				taro.client.selectedUnit = unit;
				taro.client.eventLog.push([taro._currentTime, `my unit selected ${unitId}`]);
			} else if (unitId === null) {
				self._stats.selectedUnitId = null;
				taro.client.selectedUnit = null;
			}
		}
	},

	cameraTrackUnit: function (unit) {
		if (unit) {
			// self._stats.selectedUnitId = unit.id()
			if (taro.isServer && this._stats.clientId) {
				taro.network.send(
					'makePlayerCameraTrackUnit',
					{ unitId: unit.id() },
					this._stats.clientId
				);

			} else if (
				taro.isClient &&
				this._stats.clientId == taro.network.id()
				&& unit
				&& unit._category == 'unit'
			) {
				taro.client.myPlayer.cameraTrackedUnit = unit._id;
				unit.emit('follow');
			}
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
						unit.ability.cast(ability);
					}
				}
			}
		}
	},

	updatePlayerType: function (data) {
		var self = this;

		// pass old attributes' values to new attributes (given that attributes have same ID)
		if (self._stats.attributes != undefined) {
			var oldAttributes = JSON.parse(JSON.stringify(self._stats.attributes));
			for (attrId in data.attributes) {
				if (oldAttributes[attrId] != undefined) {
					data.attributes[attrId].value = oldAttributes[attrId].value;
					data.attributes[attrId].max = oldAttributes[attrId].max;
				}
			}
		}

		self._stats.attributes = data.attributes;

		if (data.variables) {
			var variables = {};
			for (var key in data.variables) {
				if (self.variables && self.variables[key]) {
					variables[key] = self.variables[key] == undefined ? data.variables[key] : self.variables[key];
				} else {
					variables[key] = data.variables[key];
				}
			}
			self.variables = variables;
		}
		if (self._stats.variables) {
			delete self._stats.variables;
		}

		if (taro.isClient) {
			var isMyPlayerUpdated = self._stats.clientId == taro.network.id();
			// show name label can be false for assignedPlyerType so updateNameLabel accordingly
			self.redrawUnits(function (unit) {
				var owner = unit.getOwner();

				return owner && owner.id() === self.id();
			}, ['nameLabel', 'texture']);

			// update attr bars of all units
			self.redrawUnits(function (unit) {
				var ownerPlayer = unit.getOwner();

				return isMyPlayerUpdated || ownerPlayer && ownerPlayer.id() === self.id();
			}, ['attributeBars']);

			if (isMyPlayerUpdated) {
				// update UI
				taro.playerUi.updatePlayerAttributesDiv(self._stats.attributes);
			}

			if (taro.scoreboard) {
				taro.scoreboard.update();
			}
		}
	},

	getUnitCount: function () {
		var units = this._stats.unitIds;
		if (units)
			return Object.keys(units).length;
		return 0;
	},

	// if any player feels hostile towards another, then it's a hostile relationship
	isHostileTo: function (player) {
		if (player == undefined) {
			return false;
		}

		var myPlayerType = taro.game.getAsset('playerTypes', this._stats.playerTypeId);
		if (myPlayerType && myPlayerType.relationships) {
			if (myPlayerType.relationships[player._stats.playerTypeId] == 'hostile')
				return true;
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

	isDeveloper: function() {
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
		let isModerator = self._stats?.roleIds && roles.find(role => role?.permissions?.moderator && self._stats?.roleIds.includes(role._id.toString()));

		return isModerator;
	},

	remove: function () {
		// AI players cannot be removed
		if (this._stats.controlledBy == 'human') // do not send trigger for neutral player
		{

			if (taro.isServer) {
				const i = taro.server.developerClientIds.indexOf(this._stats.clientId);
				if (i != -1) taro.server.developerClientIds.splice(i, 1);
			}

			taro.script.trigger('playerLeavesGame', { playerId: this.id() });
			// session is in second
			if (this.variables && this.variables.progression != undefined && this.variables.progression.value != undefined) {
				taro.clusterClient && taro.clusterClient.emit('log-progression', this.variables.progression.value);
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
		this.redrawUnits(function (unit) {
			var owner = unit.getOwner();
			return owner != undefined && owner.id() == playerId;
		}, ['texture', 'nameLabel']);

		// make the items visible/invisible that belongs to any unit of this player
		taro.$$('item')
			.forEach(function (item) {
				var ownerUnit = item.getOwnerUnit();
				var ownerPlayer = ownerUnit && ownerUnit.getOwner();
				var belongsToCurrentPlayer = ownerPlayer && ownerPlayer.id() === playerId;

				if (belongsToCurrentPlayer) {
					item.updateTexture();
				}
			});
	},

	// update player's stats in the server side first, then update client side as well.
	streamUpdateData: function (queuedData) {
		var self = this;
		var oldStats = JSON.parse(JSON.stringify(self._stats));
		TaroEntity.prototype.streamUpdateData.call(this, queuedData);

		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];
				// if player's type changed, then update all of its base stats (speed, stamina, etc..)
				if (attrName === 'playerTypeId') {
					self._stats[attrName] = newValue;
					var playerTypeData = taro.game.getAsset('playerTypes', newValue);
					if (playerTypeData) {
						playerTypeData.playerTypeId = newValue;

						if (taro.isClient) {
							// change color of label of all units that belongs to updating player
							self.redrawUnits(function (unit) {
								// dont update color if unitType of my unit is changed on my screen as it will be always Lime
								var isMyPlayerUpdated = self._stats.clientId === taro.network.id();
								// update color of all units that belongs to player whose playerType just changed
								var ownerPlayer = unit.getOwner();
								var unitBelongsToUpdatingPlayer = ownerPlayer && ownerPlayer.id() === self.id();

								return !isMyPlayerUpdated && unitBelongsToUpdatingPlayer;
							}, ['nameLabel']);
						}

						self.updatePlayerType(playerTypeData);
					}
				}

				if (taro.isServer) {
					if (attrName === 'name' && oldStats.name !== newValue) {
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
					if (attrName === 'name') {
						self._stats[attrName] = newValue;
						// update here
						if (typeof refreshUserName == 'function') {
							refreshUserName(newValue);
						}
					} else if (attrName === 'purchasables') {
						// update client purchasables if streamed from server to make sure equip/unequip skin works
						self._stats[attrName] = newValue;
					} else if (attrName === 'equiped') {
						self._stats[attrName] = newValue;
						var unit = self.getSelectedUnit();
						if (unit) {
							unit.equipSkin();
						}
					} else if (attrName === 'unEquiped') {
						self._stats[attrName] = newValue;
						var unit = self.getSelectedUnit();
						if (unit) {
							unit.unEquipSkin(null, false, newValue);
						}
					}

					if (self._stats.clientId == taro.network.id()) {
						if (attrName === 'mapData') {
							self._stats[attrName] = newValue;
							taro.developerMode.updateClientMap(data);
						}
						if (attrName === 'attributes') {
							taro.playerUi.updatePlayerAttributesDiv(self._stats.attributes);
						}
						if (attrName === 'coins') {
							self._stats[attrName] = newValue;
							taro.playerUi.updatePlayerCoin(newValue);
						}
						if (attrName === 'roleIds') {
							self._stats[attrName] = newValue;
						}
						if (attrName === 'playerJoinedAgain') {
							self.hideMenu();
						}
						if (attrName === 'banChat') {
							self._stats[attrName] = newValue;
							self.setChatMute(newValue);
						}
						if (attrName === 'playerJoined') {
							self._stats[attrName] = newValue;
							// console.log('received player.playerJoined');
							taro.client.eventLog.push([taro._currentTime, 'playerJoined received']);
							// render name labels of all other units
							self.redrawUnits(['nameLabel']);

							self._stats.receivedJoinGame = data.receivedJoinGame;
							taro.client.eventLog.push([taro._currentTime - taro.client.playerJoinedAt, '\'playerJoined\' received from server']);
							self._stats.processedJoinGame = data.processedJoinGame;
							var streamingDiff = `${Date.now() - data.streamedOn}ms`;

							window.joinGameSent.end = Date.now();
							window.joinGameSent.completed = window.joinGameSent.end - window.joinGameSent.start;

							console.log(
								`JoinGame took ${window.joinGameSent.completed}ms to join player` +
								`, client to gs: ${self._stats.receivedJoinGame - window.joinGameSent.start}ms` +
								`, gs loading player data: ${self._stats.totalTime}ms` +
								`, gs processed request for: ${self._stats.processedJoinGame}ms` +
								`, gs to client: ${streamingDiff
								}, client sent on: ${window.joinGameSent.start
								}, server sent back on: ${data.streamedOn}`
							);

							if (window.joinGameSent.completed > 7000) {
								$.post('/api/log', {
									event: 'rollbar',
									text: `${Date.now()}:- JoinGame took ${window.joinGameSent.completed}ms to join player` +
										`, client to gs: ${self._stats.receivedJoinGame - window.joinGameSent.start}ms` +
										`, gs loading player data: ${self._stats.totalTime}ms` +
										`, gs processed request for: ${self._stats.processedJoinGame}ms` +
										`, gs to client: ${streamingDiff
										}, client sent on: ${window.joinGameSent.start
										}, server sent back on: ${data.streamedOn}`
								});
							}
							if (self._stats.processedJoinGame > 7000) {
								$.post('/api/log', {
									event: 'rollbar',
									text: `${Date.now()}JoinGame took ${window.joinGameSent.completed}ms to create player` +
										`, client to gs: ${self._stats.receivedJoinGame - window.joinGameSent.start}ms` +
										`, gs loading player data: ${self._stats.totalTime}ms` +
										`, gs processed request for: ${self._stats.processedJoinGame}ms` +
										`, gs to client: ${streamingDiff
										}, client sent on: ${window.joinGameSent.start
										}, server sent back on: ${data.streamedOn}`
								});
							}

							self.hideMenu();
							clearTimeout(window.errorLogTimer);
						}
					}

					if (attrName === 'banChat' && (taro.game.data.isDeveloper || (taro.client.myPlayer && taro.client.myPlayer._stats.isUserMod))) {
						self._stats[attrName] = newValue;
						taro.menuUi.kickPlayerFromGame();
					}
				}
			}
		}
	},
	setChatMute: function (value) {
		if (taro.env == 'local') // don't mute users in dev env
			return;

		if (value) {
			$('#message').attr('disabled', true);
			$('#message').attr('placeholder', 'You are muted');
		} else {
			$('#message').attr('disabled', false);
			$('#message').attr('placeholder', 'message');
		}
	},

	redrawUnits: function (filterFn, properties) {
		if (filterFn instanceof Array) {
			properties = filterFn;
			filterFn = null;
		}

		taro.$$('unit')
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
		var scoreId = taro.game.data.settings.scoreAttributeId;
		try {
			// comparing player highscore with current highscore. if current highscore is greter then request it to update server
			if (scoreId && self._stats && self._stats.attributes && self._stats.attributes[scoreId] && (self._stats.highscore < self._stats.newHighscore || self._stats.highscore < self._stats.attributes[scoreId].value)) {
				var score = Math.max(self._stats.newHighscore || 0, self._stats.attributes[taro.game.data.settings.scoreAttributeId].value || 0);

				if (score > self._stats.highscore) {
					// highscore updated
					taro.clusterClient && taro.clusterClient.updatePlayerHighscore({
						userId: self._stats.userId,
						gameId: taro.game.data.defaultData._id,
						highscore: score,
					});
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

	loadPersistentData: function () {
		var self = this;

		var persistData = _.cloneDeep(self.persistedData);
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

			if ((typeof (userId) !== 'undefined' && typeof (sessionId) !== 'undefined') || window.isStandalone) {

				if ((taro.game.data.isGameDeveloper && ['1', '4', '5'].includes(taro.game.data.defaultData.tier)) || window.isStandalone) {
					// dont show dev menu by default
					// if (!taro.isMobile) {
					// 	$("#dev-console").show() // if user has access of this game, show dev console
					// }
					// $('#game-suggestions-card').removeClass('d-xl-block');
					// $("#invite-players-card").show();
					// $('#toggle-dev-panels').show();
					// for edge case handling
					if(window.isStandalone) {
						$('#toggle-dev-panels').click();
					}
				} else {
					if (taro.game.data.isDeveloper) {
						$('#toggle-dev-panels').show();
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
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = Player;
}
