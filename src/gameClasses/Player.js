var Player = IgeEntity.extend({
	classId: 'Player',
	componentId: 'player',

	init: function (data, entityIdFromServer) {
		IgeEntity.prototype.init.call(this);
		this.id(entityIdFromServer);
		var self = this;

		this._stats = data;

		// dont save variables in _stats as _stats is stringified and synced
		// and some variables of type unit, item, projectile may contain circular json objects
		if (self._stats.variables) {
			self.variables = self._stats.variables;
			delete self._stats.variables;
		}

		self.previousAttributes = {};
		self.lastCustomInput = '';

		Player.prototype.log(`player created ${this.id()}`);

		this.category('player');
		this.mount(ige.$('baseScene'));

		self.addComponent(AttributeComponent);

		if (ige.isServer) {
			this.streamMode(2);
			// self._stats.unitId = self.getCurrentUnit().id()
			self.addComponent(ControlComponent);

			ige.server.totalPlayersCreated++;
		} else if (ige.isClient) {
			// if this player is "me"
			if (self._stats.clientId == ige.network.id()) {
				self.addComponent(ControlComponent);

				// mouse move listener
				ige.input.on('pointermove', function (point) {
					if (ige.client.myPlayer) {
						self.control.newMousePosition = [
							point.x,
							point.y
						];
					}
				});

				this.setChatMute(this._stats.banChat);
			}

			// redraw name labels and textures of all units owned by this player
			self.redrawUnits(function (unit) {
				return unit && unit.getOwner() && unit.getOwner().id() === self.id();
			}, ['texture', 'nameLabel']);

			ige.entitiesToRender.trackEntityById[entityIdFromServer] = this;
		}
	},

	// move to UI
	joinGame: function () {
		var self = this;
		
		if (self._stats.playerJoined != true) {
			// notify GS manager that a user has joined, do not notify if player joins again after pausing the game
			if (self._stats.userId) {
				ige.clusterClient.userJoined(self._stats.userId);
			}
			
			if (self._stats.controlledBy == 'human' && ige.script) // do not send trigger for neutral player
			{
				ige.trigger.fire('playerJoinsGame', { playerId: self.id() });
			}

			var clientId = self._stats.clientId;
			var client = ige.server.clients[clientId];
			var receivedJoinGame = client.receivedJoinGame;
			var processedJoinGame = Date.now() - receivedJoinGame;
			var dataLoadTime = self._stats.totalTime;
			client.lastEventAt = Date.now();

			var playerJoinStreamData = [
				{ streamedOn: Date.now() },
				{ playerJoined: true },
				{ dataLoadTime: dataLoadTime },
				{ processedJoinGame: processedJoinGame },
				{ receivedJoinGame: receivedJoinGame }
			];

			console.log(`Player.joinGame(): sending ACK to client ${self._stats.clientId} ${self._stats.name} (time elapsed: ${Date.now() - client.lastEventAt})`, playerJoinStreamData);

			self.streamUpdateData(playerJoinStreamData);
			ige.clusterClient && ige.clusterClient.playerJoined(self._stats.userId);
		} else {
			console.log(`player joined again (menu closed?) ${self._stats.clientId} (${self._stats.name})`);
			self.streamUpdateData([{ playerJoinedAgain: true }]);
		}
	},

	createUnit: function (data) {
		var self = this;

		if (ige.isServer) {
			var data = Object.assign(
				data,
				{
					clientId: self._stats.clientId,
					name: self._stats.name
				});

			var unit = new Unit(data);
			unit.setOwnerPlayer(self.id());

			// setOwner will add unitId to unitIds
			// self._stats.unitIds.push(unit.id())

			Player.prototype.log(`created unit ${unit.id()} for ${self._stats.name} (${self._stats.clientId})`);
			return unit;
		}
	},

	ownUnit: function (unit) {
		if (this._stats.unitIds.indexOf(unit.id()) == -1 && unit.id() != 'ige') {
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
		}
	},

	// make player select a unit and do the following:
	// 1. camera track (if this is the only unit)
	// 2. update inventory
	// 3. update attribute bars
	selectUnit: function (unitId) {
		var self = this;
		self._stats.selectedUnitId = unitId;

		if (ige.isServer && self._stats.clientId) {
			ige.network.send('makePlayerSelectUnit', { unitId: unitId }, self._stats.clientId);
		}

		if (ige.isClient) {
			var unit = ige.$(unitId);

			if (self._stats.clientId == ige.network.id() && unit && unit._category == 'unit') {

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
				ige.client.selectedUnit = unit;
				ige.client.eventLog.push([ige._currentTime, `my unit selected ${unitId}`]);
			}
		}
	},

	cameraTrackUnit: function (unit) {
		if (unit) {
			// self._stats.selectedUnitId = unit.id()
			if (ige.isServer && this._stats.clientId) {
				ige.network.send(
					'makePlayerCameraTrackUnit',
					{ unitId: unit.id() },
					this._stats.clientId
				);

			} else if (
				ige.isClient &&
				this._stats.clientId == ige.network.id()
				&& unit
				&& unit._category == 'unit'
			) {
				ige.client.myPlayer.currentFollowUnit = unit._id;

				unit.emit('follow');
			}
		}
	},

	changeCameraPanSpeed: function (panSpeed) {
		var self = this;

		if (ige.isServer && self._stats.clientId) {
			ige.network.send('changePlayerCameraPanSpeed', { panSpeed: panSpeed }, self._stats.clientId);
		} else if (ige.isClient && self._stats.clientId == ige.network.id() && panSpeed !== undefined) {
			ige.client.vp1.camera.trackTranslateSmoothing(panSpeed);
		}
	},

	// get selectedUnits' 0th index unit
	selectFirstAvailableUnit: function () {
		if (this._stats.unitIds) {
			var unit = ige.$(this._stats.unitIds[0]);
			if (unit) {
				this.selectUnit(unit.id());
			}
		}
	},

	getSelectedUnit: function () {

		return ige.$(this._stats.selectedUnitId);
	},

	castAbility: function (command) {
		var self = this;
		var units = ige.game.getUnitsByClientId(this._stats.clientId);
		for (i in units) {
			var unit = units[i];
			if (unit) {
				var unitType = ige.game.getAsset('unitTypes', unit._stats.type);
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

		if (ige.isClient) {
			var isMyPlayerUpdated = self._stats.clientId == ige.network.id();
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
				ige.playerUi.updatePlayerAttributesDiv(self._stats.attributes);
			}

			if (ige.scoreboard) {
				ige.scoreboard.update();
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

		var myPlayerType = ige.game.getAsset('playerTypes', this._stats.playerTypeId);
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

		var myPlayerType = ige.game.getAsset('playerTypes', this._stats.playerTypeId);
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

	remove: function () {
		if (this._stats.controlledBy == 'human' && ige.script) // do not send trigger for neutral player
		{
			ige.trigger.fire('playerLeavesGame', { playerId: this.id() });
		}

		// session is in second
		ige.clusterClient && ige.clusterClient.emit('log-session-duration', (Date.now() - this._stats.jointsOn) / 1000);
		if (this.variables && this.variables.progression != undefined && this.variables.progression.value != undefined) {
			ige.clusterClient && ige.clusterClient.emit('log-progression', this.variables.progression.value);
		}
		this.streamDestroy();
		this.destroy();
	},

	updateVisibility: function (playerId) {
		var player = ige.$(playerId);

		if (!player) {
			return;
		}

		// make hostile-invisible units invisible and friendly & neutral units visible (and its item)
		this.redrawUnits(function (unit) {
			var owner = unit.getOwner();
			return owner != undefined && owner.id() == playerId;
		}, ['texture', 'nameLabel']);

		// make the items visible/invisible that belongs to any unit of this player
		ige.$$('item')
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
		IgeEntity.prototype.streamUpdateData.call(this, queuedData);

		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];
				// if player's type changed, then update all of its base stats (speed, stamina, etc..)
				if (attrName === 'playerTypeId') {
					var playerTypeData = ige.game.getAsset('playerTypes', newValue);
					if (playerTypeData) {
						playerTypeData.playerTypeId = newValue;

						if (ige.isClient) {
							// change color of label of all units that belongs to updating player
							self.redrawUnits(function (unit) {
								// dont update color if unitType of my unit is changed on my screen as it will be always Lime
								var isMyPlayerUpdated = self._stats.clientId === ige.network.id();
								// update color of all units that belongs to player whose playerType just changed
								var ownerPlayer = unit.getOwner();
								var unitBelongsToUpdatingPlayer = ownerPlayer && ownerPlayer.id() === self.id();

								return !isMyPlayerUpdated && unitBelongsToUpdatingPlayer;
							}, ['nameLabel']);
						}

						self.updatePlayerType(playerTypeData);
					}
				}

				if (ige.isServer) {
					if (attrName === 'name' && oldStats.name !== newValue) {
						// update all units
						self._stats.unitIds.forEach(function (unitId) {
							var unit = ige.$(unitId);
							unit.streamUpdateData([{ name: newValue }]);
						});
					} else if (attrName === 'playerJoined' && newValue == false) {
						// player's been kicked/removed
						self.remove();
					}
				}
				if (ige.isClient) {
					if (attrName === 'name') {
						// update here
						if (typeof refreshUserName == 'function') {
							refreshUserName(newValue);
						}
					}
					if (attrName === 'equiped') {
						var unit = self.getSelectedUnit();
						if (unit) {
							unit.equipSkin();
						}
					} else if (attrName === 'unEquiped') {
						var unit = self.getSelectedUnit();
						if (unit) {
							unit.unEquipSkin(null, false, newValue);
						}
					}

					if (self._stats.clientId == ige.network.id()) {
						if (attrName === 'attributes') {
							ige.playerUi.updatePlayerAttributesDiv(self._stats.attributes);
						}
						if (attrName === 'coins') {
							ige.playerUi.updatePlayerCoin(newValue);
						}
						if (attrName === 'playerJoinedAgain') {
							self.hideMenu();
						}
						if (attrName === 'banChat') {
							self.setChatMute(newValue);
						}
						if (attrName === 'playerJoined') {
							console.log('received player.playerJoined');
							ige.client.eventLog.push([ige._currentTime, 'playerJoined received']);
							// render name labels of all other units
							self.redrawUnits(['nameLabel']);

							self._stats.receivedJoinGame = data.receivedJoinGame;
							ige.client.eventLog.push([ige._currentTime - ige.client.eventLogStartTime, '\'playerJoined\' received from server']);
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

					if (attrName === 'banChat' && (ige.game.data.isDeveloper || (ige.client.myPlayer && ige.client.myPlayer._stats.isUserMod))) {
						ige.menuUi.kickPlayerFromGame();
					}
				}
			}
		}
	},
	setChatMute: function (value) {
		if (ige.env == 'local') // don't mute users in dev env
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

		ige.$$('unit')
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
		var scoreId = ige.game.data.settings.scoreAttributeId;
		try {
			// comparing player highscore with current highscore. if current highscore is greter then request it to update server
			if (scoreId && self._stats && self._stats.attributes && self._stats.attributes[scoreId] && (self._stats.highscore < self._stats.newHighscore || self._stats.highscore < self._stats.attributes[scoreId].value)) {
				var score = Math.max(self._stats.newHighscore || 0, self._stats.attributes[ige.game.data.settings.scoreAttributeId].value || 0);

				if (score > self._stats.highscore) {
					// highscore updated
					ige.clusterClient && ige.clusterClient.updatePlayerHighscore({
						userId: self._stats.userId,
						gameId: ige.game.data.defaultData._id,
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
		if (ige.isServer) {
			if (this.attribute) {
				this.attribute.regenerate();
			}
		}

		IgeEntity.prototype.tick.call(this, ctx);
	},

	loadPersistentData: function () {
		var self = this;

		var persistData = _.cloneDeep(self.persistedData);
		if (persistData && persistData.data && persistData.data.player) {
			IgeEntity.prototype.loadPersistentData.call(this, persistData.data.player);
		}
		console.log('load persisted data is now true');
		self.persistentDataLoaded = true;
	},

	loadDataFromString: function (data) {
		var self = this;

		var persistData = data;
		if (persistData) {
			IgeEntity.prototype.loadPersistentData.call(this, persistData);
		}
		self.persistentDataLoaded = true;
	},

	hideMenu: function () {
		if (ige.isClient) {
			// UI related changes like hiding menu, etc...
			$('#play-game-button').removeAttr('disabled');
			var html = '<i class="fa fa-gamepad pr-2 py-3" aria-hidden="true"></i>Continue';
			$('#play-game-button .content').html(html);

			$('#modd-shop-div').addClass('d-flex');
			ige.client.eventLog.push([ige._currentTime - ige.client.eventLogStartTime, 'hide menu called']);
			ige.menuUi.hideMenu(); // if player's already joined the game, then just hide menu when "play game" button is clicked

			if (!ige.client.guestmode) {
				$('.open-menu-button').show();
			}

			if (typeof (userId) !== 'undefined' && typeof (sessionId) !== 'undefined') {
				if (ige.game.data.isDeveloper) {
					// dont show dev menu by default
					// if (!ige.isMobile) {
					// 	$("#dev-console").show() // if user has access of this game, show dev console
					// }
					// $('#game-suggestions-card').removeClass('d-xl-block');
					// $("#invite-players-card").show();
					$('#toggle-dev-panels').show();
					$('#kick-player').show();
				}
				if (ige.client.myPlayer && ige.client.myPlayer._stats.isUserMod) {
					$('#kick-player').show();
				}
			}
		}
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = Player;
}
