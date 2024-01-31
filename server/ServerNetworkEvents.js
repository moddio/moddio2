var ServerNetworkEvents = {

	/**
	 * Is called when the network tells us a new client has connected
	 * to the server. This is the point we can return true to reject
	 * the client connection if we wanted to.
	 * @param data The data object that contains any data sent from the client.
	 * @param clientId The client id of the client that sent the message.
	 * @private
	 */

	_onClientConnect: function (socket) {
		// Tell the client to track their player entity
		// Don't reject the client connection

		var clientId = socket.id;
		console.log('3. _onClientConnect ' + clientId + ' (ip: ' + socket._remoteAddress + ') client count: ' + Object.keys(taro.server.clients).length, '(ServerNetworkEvents.js)');

		taro.server.clients[clientId] = {
			id: clientId,
			socket: socket,
			ip: socket._remoteAddress
		};

		taro.server.clients[clientId].lastEventAt = Date.now();
		taro.server.testerId = clientId;
	},

	_onClientDisconnect: function ({clientId, reason}) {
		var self = this;

		if (!reason) {
			// socket already disconnected, why sending clientDisconnect command then?
			taro.network.send('clientDisconnect', { reason: 'Player disconnected', clientId: clientId }, clientId);
		}

		// remove client from streamData
		for (entityId in taro.network.stream._streamClientCreated) {
			delete taro.network.stream._streamClientCreated[entityId][clientId];
		}

		var client = taro.server.clients[clientId];
		var player = taro.game.getPlayerByClientId(clientId);

		if (client && client._id) {
			taro.devLog('BE(out): clientDisconnect: ' + clientId + ' ' + client._id);

			if (player) {
				console.log('_onclientDisconnect' + clientId + ' (' + player._stats.name + ')' + (Date.now() - client.lastEventAt));
				player.updatePlayerHighscore();

				if (player._stats.userId) {
					taro.clusterClient.saveLastPlayedTime(player._stats.userId);
				}
			}
		}

		if (player) {
			player.remove();
		}
	},

	_onJoinGame: function (data, clientId) {
		var existing_names = taro.$$('player').filter(player => player._stats.controlledBy === 'human').map(player => player._stats.username.substring('user'.length))

		if (existing_names.includes(data.number)) {
			do {
				data.number = (Math.floor(Math.random() * 999) + 100);
			} while (existing_names.includes(data.number));
		}
					
		if (taro.clusterClient) { // this is used for hosted version of moddio
			let clientData = taro.clusterClient.authenticateClient(data, clientId) // will return data if user is authenticated. otherwise, will return undefined

			if (clientData) {
				let playerId = clientData?._id;
				if (clientData && playerId) { // authenticate logged-in player
					taro.clusterClient.authenticatePlayer(playerId, clientId, data)
				} else { // authenticate guest player
					taro.clusterClient.authenticateGuest(clientId, data)
				}
			} else {
				// client authentication failed
			}
		} else { // this is for the standalone version of moddio
			var player = taro.game.createPlayer({
				controlledBy: 'human',
				name: 'user' + data.number,
				coins: 0,
				points: 0,
				clientId: clientId,
				isAdBlockEnabled: data.isAdBlockEnabled,
				isMobile: data.isMobile
			});

			player.joinGame(data);
		}
	},

	_onPing: function(data, clientId) {
		taro.network.send('ping', data, clientId)
	},

	_onBuySkin: function (skinHandle, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player) {
			var unit = player.getSelectedUnit();
			if (
				unit &&
				taro.game.data.skins &&
				taro.game.data.skins[skinHandle] &&
				unit._stats.points >= taro.game.data.skins[skinHandle].price &&
				unit._stats.skin != skinHandle
			) {
				unit._stats.points -= taro.game.data.skins[skinHandle].price;
				unit._stats.skin = skinHandle;
				unit.updateTexture(skinHandle);

				taro.network.send('buySkin', skinHandle, clientId);
				unit.streamUpdateData([
					{ skin: unit._stats.skin },
					{ points: unit._stats.points }
				]);
			}
		}
	},

	_onTrade: function (msg, clientId) {
		switch (msg.type) {
			case 'start': {
				var requestedBy = taro.$(msg.requestedBy);
				var acceptedBy = taro.$(msg.acceptedBy);
				if (requestedBy && acceptedBy && requestedBy._category === 'player' && acceptedBy._category === 'player') {
					var tradeBetween = { playerA: requestedBy.id(), playerB: acceptedBy.id() };
					taro.network.send('trade', { type: 'start', between: tradeBetween }, requestedBy._stats.clientId);
					requestedBy.tradingWith = acceptedBy.id();
					requestedBy.isTrading = true;
					acceptedBy.tradingWith = requestedBy.id();
					acceptedBy.isTrading = true;
				}
				break;
			}
			case 'offer': {
				var from = taro.$(msg.from);
				var to = taro.$(msg.to);
				if (from && to && from._category === 'player' && from._category === 'player' && from.tradingWith === to.id()) {
					taro.network.send('trade', {
						type: 'offer',
						from: msg.from,
						to: msg.to,
						tradeItems: msg.tradeItems
					}, to._stats.clientId);
				}
				break;
			}
			case 'accept': {
				var acceptedBy = taro.$(msg.acceptedBy);
				var acceptedFor = taro.$(msg.acceptedFor);

				if (acceptedBy && acceptedFor) {
					if (!acceptedBy.acceptTrading) {
						taro.chat.sendToRoom('1', 'Trading has been accepted by ' + acceptedBy._stats.name, acceptedFor._stats.clientId);
					}
					if (acceptedBy.tradingWith === acceptedFor.id()) {
						acceptedBy.acceptTrading = true;
					}
					if (acceptedBy.acceptTrading && acceptedFor.acceptTrading) {
						var unitA = acceptedBy.getSelectedUnit();
						var unitB = acceptedFor.getSelectedUnit();
						var unitAInventorySize = unitA.inventory.getTotalInventorySize();
						var unitBInventorySize = unitB.inventory.getTotalInventorySize();
						var unitAItems = unitA._stats.itemIds.slice(unitAInventorySize, unitAInventorySize + 5);
						var unitBItems = unitB._stats.itemIds.slice(unitBInventorySize, unitBInventorySize + 5);
						var isTradingSuccessful = false;

						for (var i = 0; i < unitAItems.length; i++) {
							if (unitAItems[i]) {
								var item = taro.$(unitAItems[i]);
								unitA.dropItem(item._stats.slotIndex);
								isTradingSuccessful = unitB.pickUpItem(item);

								if (!isTradingSuccessful) {
									unitA.pickUpItem(item);
									break;
								}
							}
						}

						for (var i = 0; i < unitBItems.length; i++) {
							if (unitBItems[i]) {
								var item = taro.$(unitBItems[i]);
								unitB.dropItem(item._stats.slotIndex);
								isTradingSuccessful = unitA.pickUpItem(item);

								if (!isTradingSuccessful) {
									unitB.pickUpItem(item);
									break;
								}
							}
						}
						var tradeBetween = {
							playerA: msg.acceptedBy,
							playerB: msg.acceptedFor
						};

						if (!isTradingSuccessful) {
							taro.network.send('trade', { type: 'error', between: tradeBetween }, acceptedFor._stats.clientId);

							taro.network.send('trade', { type: 'error', between: tradeBetween }, acceptedBy._stats.clientId);
							return;
						}

						unitA.streamUpdateData([{ itemIds: unitA._stats.itemIds }]);
						unitB.streamUpdateData([{ itemIds: unitB._stats.itemIds }]);



						taro.network.send('trade', { type: 'success', between: tradeBetween }, acceptedFor._stats.clientId);

						taro.network.send('trade', { type: 'success', between: tradeBetween }, acceptedBy._stats.clientId);
						if (acceptedBy) {
							delete acceptedBy.isTrading;
							delete acceptedBy.tradingWith;
							delete acceptedBy.acceptTrading;
						}
						if (acceptedFor) {
							delete acceptedFor.isTrading;
							delete acceptedFor.tradingWith;
							delete acceptedFor.acceptTrading;
						}
					}
				}

				break;
			}
			case 'cancel': {
				var playerA = taro.$(msg.cancleBy);
				var playerB = taro.$(msg.cancleTo);
				if (playerA) {
					delete playerA.isTrading;
					delete playerA.tradingWith;
					delete playerA.acceptTrading;
				}
				if (playerB) {
					delete playerB.isTrading;
					delete playerB.tradingWith;
					delete playerB.acceptTrading;
				}

				var tradeBetween = { playerA: msg.cancleBy, playerB: msg.cancleTo };
				taro.network.send('trade', { type: 'cancel', between: tradeBetween }, playerB._stats.clientId);
				taro.chat.sendToRoom('1', 'Trading has been cancel by ' + playerA._stats.name, playerB._stats.clientId);

				var unitA = playerA.getSelectedUnit();
				if (unitA) {
					var unitAInventorySize = unitA.inventory.getTotalInventorySize();
					for (var i = unitAInventorySize; i < unitAInventorySize + 5; i++) {
						var offeringItemId = unitA._stats.itemIds[i];
						var item = offeringItemId && taro.$(offeringItemId);
						if (item && item._category === 'item') {
							var availSlot = unitA.inventory.getFirstAvailableSlotForItem(item);
							unitA._stats.itemIds[availSlot] = unitA._stats.itemIds[i];
							unitA._stats.itemIds[i] = undefined;
						}
					}
					// revert items for A unit
					unitA.streamUpdateData([{ itemIds: unitA._stats.itemIds }]);
				}

				var unitB = playerB.getSelectedUnit();
				if (unitB) {
					var unitBInventorySize = unitB.inventory.getTotalInventorySize();
					for (var i = unitBInventorySize; i < unitBInventorySize + 5; i++) {
						var offeringItemId = unitB._stats.itemIds[i];
						var item = offeringItemId && taro.$(offeringItemId);
						if (item && item._category === 'item') {
							var availSlot = unitB.inventory.getFirstAvailableSlotForItem(item);
							unitB._stats.itemIds[availSlot] = unitB._stats.itemIds[i];
							unitB._stats.itemIds[i] = undefined;
						}
					}
					// revert items for B unit
					unitB.streamUpdateData([{ itemIds: unitB._stats.itemIds }]);
				}
				break;
			}
		}
	},

	_onEditTile: function(data, clientId) {
		taro.developerMode.editTile(data, clientId);
	},

	_onEditRegion: function(data, clientId) {
		taro.developerMode.editRegion(data, clientId);
	},

	_onEditVariable: function(data, clientId) {
		taro.developerMode.editVariable(data, clientId);
	},

	_onEditInitEntity: function(data, clientId) {
		taro.developerMode.editInitEntity(data, clientId);
	},

	_onEditGlobalScripts: function(data, clientId) {
		taro.developerMode.editGlobalScripts(data, clientId);
	},

	_onRequestInitEntities: function(data, clientId) {
		taro.developerMode.requestInitEntities(data, clientId);
	},

	_onEditEntity: function(data, clientId) {
		taro.developerMode.editEntity(data, clientId);
	},

	_onBuyItem: function (data, clientId) {
		const {id, token} = data;
		taro.devLog('player ' + clientId + ' wants to purchase item' + id);

		var player = taro.game.getPlayerByClientId(clientId);
		if (player) {
			var unit = player.getSelectedUnit();
			if (unit) {
				unit.buyItem(id, token);
			}
		}
	},

	_onBuyUnit: function (id, clientId) {
		taro.devLog('player ' + clientId + ' wants to purchase item' + id);
		var player = taro.game.getPlayerByClientId(clientId);
		if (player) {
			var unit = player.getSelectedUnit();
			if (unit) {
				unit.buyUnit(id);
			}
		}
	},

	_onEquipSkin: function (equipPurchasable, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player) {
			var unit = player.getSelectedUnit();
			if (unit) {
				unit.equipSkin(equipPurchasable);
			}
		}
	},

	_onSwapInventory: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player) {
			var unit = player.getSelectedUnit();
			if (unit && unit._stats) {
				var itemIds = rfdc()(unit._stats.itemIds);
				var fromItem = taro.$(itemIds[data.from]);
				var toItem = taro.$(itemIds[data.to]);

				// both FROM & TO slots have items
				if (
					(fromItem && fromItem._stats) &&
					(toItem && toItem._stats)
				) {
					// merge
					// if (fromItem._stats.itemTypeId == toItem._stats.itemTypeId) {
					// 	var qtyToBeAdded = Math.min(toItem._stats.maxQuantity - toItem._stats.quantity, fromItem._stats.quantity)
					// 	if (qtyToBeAdded > 0) {
					// 		if (toItem)
					// 			toItem.updateQuantity(toItem._stats.quantity + qtyToBeAdded);
					// 		if (fromItem)
					// 			fromItem.updateQuantity(fromItem._stats.quantity - qtyToBeAdded);
					// 	}
					// 	return;
					// }

					// swap
					if (
						(
							fromItem._stats.controls == undefined ||
							fromItem._stats.controls.permittedInventorySlots == undefined ||
							fromItem._stats.controls.permittedInventorySlots.length == 0 ||
							fromItem._stats.controls.permittedInventorySlots.includes(data.to + 1) ||
							(data.to + 1 > unit._stats.inventorySize && (fromItem._stats.controls.backpackAllowed == true || fromItem._stats.controls.backpackAllowed == undefined || fromItem._stats.controls.backpackAllowed == null)) // any item can be moved into backpack slots if the backpackAllowed property is true
						) &&
						(
							toItem._stats.controls == undefined ||
							toItem._stats.controls.permittedInventorySlots == undefined ||
							toItem._stats.controls.permittedInventorySlots.length == 0 ||
							toItem._stats.controls.permittedInventorySlots.includes(data.from + 1) ||
							(data.from + 1 > unit._stats.inventorySize && (toItem._stats.controls.backpackAllowed == true || toItem._stats.controls.backpackAllowed == undefined || toItem._stats.controls.backpackAllowed == null)) // any item can be moved into backpack slots if the backpackAllowed property is true
						)
					) {
						fromItem.streamUpdateData([{ slotIndex: parseInt(data.to) }]);
						toItem.streamUpdateData([{ slotIndex: parseInt(data.from) }]);

						if (fromItem._stats.bonus && fromItem._stats.bonus.passive && fromItem._stats.bonus.passive.isDisabledInBackpack == true) {
							if (data.from + 1 <= unit._stats.inventorySize && data.to + 1 > unit._stats.inventorySize) {
								unit.updateStats(fromItem.id(), true);
							}
							else if (data.to + 1 <= unit._stats.inventorySize && data.from + 1 > unit._stats.inventorySize) {
								unit.updateStats(fromItem.id());
							}
						}

						if (toItem._stats.bonus && toItem._stats.bonus.passive && toItem._stats.bonus.passive.isDisabledInBackpack == true) {
							if (data.to + 1 <= unit._stats.inventorySize && data.from + 1 > unit._stats.inventorySize) {
								unit.updateStats(toItem.id(), true);
							}
							else if (data.from + 1 <= unit._stats.inventorySize && data.to + 1 > unit._stats.inventorySize) {
								unit.updateStats(toItem.id());
							}
						}

						var temp = itemIds[data.from];
						itemIds[data.from] = itemIds[data.to];
						itemIds[data.to] = temp;
					}
				}

				// TO slot doesn't have item
				if (
					fromItem != undefined &&
					toItem == undefined &&
					data.to < unit.inventory.getTotalInventorySize() &&
					(
						fromItem._stats.controls == undefined ||
						fromItem._stats.controls.permittedInventorySlots == undefined ||
						fromItem._stats.controls.permittedInventorySlots.length == 0 ||
						fromItem._stats.controls.permittedInventorySlots.includes(data.to + 1) ||
						(data.to + 1 > unit._stats.inventorySize && (fromItem._stats.controls.backpackAllowed == true || fromItem._stats.controls.backpackAllowed == undefined || fromItem._stats.controls.backpackAllowed == null)) // any item can be moved into backpack slots if the backpackAllowed property is true
					)
				) {
					fromItem.streamUpdateData([{ slotIndex: parseInt(data.to) }]);

					if (fromItem._stats.bonus && fromItem._stats.bonus.passive && fromItem._stats.bonus.passive.isDisabledInBackpack == true) {
						if (data.from + 1 <= unit._stats.inventorySize && data.to + 1 > unit._stats.inventorySize){
							unit.updateStats(fromItem.id(), true);
						}
						else if (data.to + 1 <= unit._stats.inventorySize && data.from + 1 > unit._stats.inventorySize) {
							unit.updateStats(fromItem.id());
						}
					}

					itemIds[data.to] = itemIds[data.from];
					itemIds[data.from] = undefined;
				}

				unit.streamUpdateData([{ itemIds: itemIds }]);
				unit.changeItem(unit._stats.currentItemIndex);
			}
		}
	},

	_onRunProfiler: function ({ run }, modClientId) {
		var modPlayer = taro.game.getPlayerByClientId(modClientId);

		if (modPlayer && modPlayer.isDeveloper()) {
			if (run) {
				taro.profiler.start();
			} else {
				taro.profiler.stop();
			}

		}
	},

	_onKick: function (kickedClientId, modClientId) {
		var modPlayer = taro.game.getPlayerByClientId(modClientId);
		var kickedPlayer = taro.game.getPlayerByClientId(kickedClientId);

		if (modPlayer && modPlayer.isDeveloper() && kickedPlayer) {
			taro.game.kickPlayer(kickedPlayer.id(), 'You were kicked by ' + modPlayer._stats?.name);
		}
	},

	_onBanUser: function ({ userId, kickuserId }, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);

		if (!player) {
			return;
		}

		var isUserDeveloper = player.isDeveloper();

		if (isUserDeveloper) {
			var kickedPlayer = taro.$$('player').find(function (player) {
				if (player._stats && player._stats.clientId === kickuserId) return true;
			});
			kickedPlayer.streamUpdateData([{ playerJoined: false }]);
			taro.clusterClient.banUser({
				userId: userId
			});
		}
	},
	_onBanIp: function ({ gameId, kickuserId }, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);

		if (!player) {
			return;
		}

		var isUserDeveloper = player.isDeveloper();

		if (isUserDeveloper) {
			var kickedPlayer = taro.$$('player').find(function (player) {
				return player._stats && player._stats.clientId === kickuserId;
			});
			let ipaddress = null;
			let userId = null;
			for (let clientId in taro.server.clients) {
				if (clientId === kickuserId) {
					ipaddress = taro.server.clients[clientId].ip;
					userId = taro.server.clients[clientId]._id;
				}
			}

			kickedPlayer.streamUpdateData([{ playerJoined: false }]);

			if (ipaddress) {
				taro.clusterClient.banIp({
					ipaddress: ipaddress,
					gameId: gameId,
					userId: userId
				});
			}
		}
	},
	_onBanChat: function ({ gameId, kickuserId }, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);

		if (!player) {
			return;
		}

		var isUserDeveloper = player.isDeveloper();

		if (isUserDeveloper) {
			var banPlayer = taro.$$('player').find(function (player) {
				if (player._stats && player._stats.clientId === kickuserId) return true;
			});
			// kickedPlayer.streamUpdateData([{ playerJoined: false }]);

			taro.clusterClient.banChat({
				userId: banPlayer._stats.userId,
				gameId: gameId,
				status: !banPlayer._stats.banChat
			});

			banPlayer.streamUpdateData([{ banChat: !banPlayer._stats.banChat }]);
		}
	},
	_onUnEquipSkin: function (unEquipedId, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);

		if (!player) {
			return;
		}

		var unit = player.getSelectedUnit();
		if (unit) {
			unit.unEquipSkin(unEquipedId);
		}
	},

	_onPlayerMouseMoved: function (position, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player) {
			var unit = player.getSelectedUnit();
			if (unit) {
				player.control.input.mouse.x = position[0];
				player.control.input.mouse.y = position[1];
			}
		}
	},

	_onPlayerUnitMoved: function (position, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player) {
			var unit = player.getSelectedUnit();
			if (unit) {
				unit.clientStreamedPosition = position;
			}
		}
	},

	_onPlayerCustomInput: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player && data && data.status === 'submitted') {
			player.lastCustomInput = data.inputText;
			taro.script.trigger('playerCustomInput', { playerId: player.id() });
		}
	},
	_onPlayerAbsoluteAngle: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player) {
			player.absoluteAngle = data;
		}
	},
	_onPlayerDialogueSubmit: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);

		if (player) {
			var selectedOption = null;

			for (var dialogId in taro.game.data.dialogues) {
				var dialog = taro.game.data.dialogues[dialogId];

				if (dialogId === data.dialogue) {
					for (var optionId in dialog.options) {
						var option = dialog.options[optionId];

						if (optionId === data.option) {
							selectedOption = option;
							break;
						}
					}
				}
			}

			if (selectedOption) {
				taro.game.lastPlayerSelectingDialogueOption = player.id();
				if (selectedOption.scriptName) {
					taro.script.runScript(selectedOption.scriptName, {});
				}
				if (selectedOption.followUpDialogue) {
					taro.network.send('openDialogue', {
						dialogueId: selectedOption.followUpDialogue,
						extraData: {
							playerName: player._stats.name,
							dialogueTemplate: _.get(taro, 'game.data.ui.dialogueview.htmlData', '')
						}
					}, player._stats.clientId);
				}
			}
		}
	},
	_onHtmlUiClick: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player) {
			player.lastHtmlUiClickData = data;
			taro.script.trigger('htmlUiClick', { playerId: player.id() });
		}
	},

	_onPlayerKeyDown: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player != undefined) {
			player.control.keyDown(data.device, data.key);
		}
	},

	_onPlayerKeyUp: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		if (player != undefined) {
			player.control.keyUp(data.device, data.key);
		}
	},

	_onPlayerSelectUnit: function (data, clientId) {
		var unit = taro.$(data.unitId);
		var player = taro.game.getPlayerByClientId(clientId);
		if (player && unit) {
			player.selectUnit(data.unitId);
		}
	},

	_onRecordSocketMsgs: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);

		if (!player?._stats.isUserAdmin) {
			return;
		}

		if (taro.clusterClient) {
			taro.clusterClient.recordLogs(data);
		}
	},

	_onGetSocketMsgs: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);

		if (!player?._stats.isUserAdmin) {
			return;
		}

		data = {...data, requester: clientId };

		if (taro.clusterClient) {
			taro.clusterClient.sendLogs(data);
		}
	},

	_onStopRecordSocketMsgs: function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);

		if (!player?._stats.isUserAdmin) {
			return;
		}

		if (taro.clusterClient) {
			taro.clusterClient.stopRecordLogs(data);
		}
	},

	_onPlayAdCallback: function (data, clientId) {
		taro.ad.playCallback(data, clientId);
	},

	_onSomeBullshit: function () {
		//bullshit
	}
};

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = ServerNetworkEvents; }
