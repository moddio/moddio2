var ClientNetworkEvents = {
	_onClientDisconnect: function (data) {
		var clientId = data.clientId;
		// if it's me that got disconnected!
		if (clientId == taro.network.id()) {
			$("#disconnect-reason").html(data.reason);
			taro.menuUi.onDisconnectFromServer("clientNetworkEvents #10", data.reason);
			taro.network._io._disconnectReason = data.reason;
		}
	},

	_onStreamUpdateData: function (data) {
		for (entityId in data) {

			if (taro.client.entityUpdateQueue[entityId] == undefined) {
				taro.client.entityUpdateQueue[entityId] = {};
			}

			var stats = data[entityId];

			for (key in stats) {
				var value = stats[key];
				taro.client.entityUpdateQueue[entityId][key] = value; // overwrite the value if the same key already exists
			}
		}
	},

	_onTeleport: function (data) {
		var entity = taro.$(data.entityId);
		if (entity && data.position) {
			// console.log("teleporting",data.entityId , " to", data.position)
			entity.teleportTo(data.position[0], data.position[1], data.position[2]);
		}
	},

	// entity update data was sent to specific clients
	_streamUpdateDataToClients: function(data) {
		if (data.entityId) {
			var entity = taro.$(data.entityId)
			if (entity) {
				entity.queueStreamUpdateData(data.entityId, data.key, data.value)	
			}
		}
	},

	_onChangePlayerCameraPanSpeed: function (data) {
		if (data.panSpeed !== undefined) {
			taro.client.myPlayer.changeCameraPanSpeed(data.panSpeed);
		}
	},

	_onHideUnitFromPlayer: function (data) {
		if (data.unitId) {
			taro.client.queueStreamUpdateData(data.unitId, "hideUnit", true);
		}
	},
	_onShowUnitFromPlayer: function (data) {
		if (data.unitId) {
			taro.client.queueStreamUpdateData(data.unitId, "showUnit", true);
		}
	},
	_onHideUnitNameLabelFromPlayer: function (data) {
		if (data.unitId) {
			taro.client.queueStreamUpdateData(data.unitId, "hideNameLabel", true);
		}
	},
	_onShowUnitNameLabelFromPlayer: function (data) {
		if (data.unitId) {
			taro.client.queueStreamUpdateData(data.unitId, "showNameLabel", true);
		}
	},
	_onOpenShop: function (data) {
		if (data.type) {
			var shopName = taro.game.data.shops[data.type] ? taro.game.data.shops[data.type].name : "Item shop";
			var shopDescription = taro.game.data.shops[data.type] ? taro.clientSanitizer(taro.game.data.shops[data.type].description) : "";
			var shopClass = taro.game.data.shops[data.type] ? (taro.game.data.shops[data.type].shopClass || '') : "";
			$("#modd-item-shop-header").text(shopName);

			if (shopDescription?.length) {
				$("#modd-item-shop-description").text(shopDescription);
			} else {
				$("#modd-item-shop-description").text("");
			}

			taro.shop.openItemShop(data.type);

			// remove all previous class and add shopClass
			$("#modd-item-shop-modal").removeClass().addClass(`modal ${shopClass}`);

			$("#modd-item-shop-modal").modal("show");
			if (taro.client.myPlayer?.control) {
				taro.client.myPlayer.control.updatePlayerInputStatus();
			}
		}
	},
	_onCreateFloatingText: function (data) {
		taro.client.emit("floating-text", {
			text: data.text,
			x: data.position.x,
			y: data.position.y,
			color: data.color || "white",
		});
	},

	_onOpenDialogue: function (data) {
		if (data.dialogueId) {
			taro.playerUi.openDialogueModal(data.dialogueId, data.extraData);
		}
	},

	_onCloseDialogue: function (data) {
		taro.playerUi.closeDialogueModal();
	},

	_onUpdateEntityAttribute: function (data) {
		var entityId = data.e;
		var attrId = data.a;
		var value = data.x;
		var property = data.p;

		var entity = taro.$(entityId);
		if (entity && entity._stats && entity._stats.attributes && entity._stats.attributes[attrId]) {
			entity._stats.attributes[attrId][property] = value;
		}
	},

	_onUpdateUiTextForTime: function (data) {
		$(`.ui-text-${data.target}`).show();
		$(`.ui-text-${data.target}`).html(taro.clientSanitizer(data.value));

		if (data.time && data.time > 0) {
			if (this.textTimer) {
				clearTimeout(this.textTimer);
			}

			var that = this;
			this.textTimerData = {
				target: data.target,
			};

			this.textTimer = setTimeout(function () {
				$(`.ui-text-${that.textTimerData.target}`).hide();
			}, data.time);
		}
	},

	_onUpdateUiText: function (data) {
		if (!data.target) {
			return;
		}
		const key = `ui-text-${data.target}-id`

		if (!taro.uiTextElementsObj[key]) {
			taro.uiTextElementsObj[key] = document.getElementById(key);
		}
		if (!taro.uiTextElementsObj[key]) {
			return;
		}

		if (data.action == "show") {
			// $(`.ui-text-${data.target}`).show();
			taro.uiTextElementsObj[key].style.display = "block";
		} else if (data.action == "hide") {
			taro.uiTextElementsObj[key].style.display = "none";
		} else {
			taro.uiTextElementsObj[key].innerHTML = data.value;
		}
	},

	_onUpdateUIRealtimeCSS: function (data) {
		const key = 'realtime-css';
		if (!taro.uiTextElementsObj[key]) {
			taro.uiTextElementsObj[key] = document.getElementById(key);
		}
		if (!taro.uiTextElementsObj[key]) {
			return;
		}
		
		let sanitizedStyle = taro.clientSanitizer(data.style);
		if (data.action == 'update') {
			taro.uiTextElementsObj[key].innerText = sanitizedStyle;
		} else if (data.action == 'append') {
			taro.uiTextElementsObj[key].innerText += '\t' + sanitizedStyle;
		}
	},

	_onAlertHighscore: function (data) {
		// $('.highscore-text').html('You set a new personal highscore!').show();
		// setTimeout(function () {
		// 	$('.highscore-text').hide()
		// }, 5000);
	},

	// _onStartParticle: function(data)
	_onItem: function (data) {
		var item = taro.$(data.id);
		if (item) {
			if (item._category == "item") {
				var ownerUnit = item.getOwnerUnit();
				if (data.type == "use" && ownerUnit && ownerUnit != taro.client.selectedUnit) {
					item.use();
				} else if (data.type == "stop") {
					item.stopUsing();
				} else if (data.type == "reload") {
					item.reload();
				}
			} else {
				if (data.type == "hit") {
					item.effect.start("bulletHit");
				}
			}
		}
	},

	_onUi: function (data) {
		switch (data.command) {
			case "openItemShop":
				taro.shop.openModdShop("item");
				break;

			case "openUnitShop":
				taro.shop.openModdShop("unit");
				break;

			case "closeShop":
				taro.shop.closeShop();
				break;

			case "showMenuAndSelectCurrentServer":
			case "showMenu":
				taro.menuUi.showMenu();
				break;

			case "showMenuAndSelectBestServer":
				taro.menuUi.showMenu(true);
				break;

			case "showInputModal":
				taro.playerUi.showInputModal(data);
				break;

			case "showCustomModal":
				taro.playerUi.showCustomModal(data);
				break;
			
			case "updateBackpack":
				taro.playerUi.updateBackpack(data);
				break;

			case "updateUiElement":
				taro.playerUi.updateUiElement(data);
				break;

			case "openWebsite":
				taro.playerUi.openWebsite(data);
				break;
			case "showWebsiteModal":
				taro.playerUi.showWebsiteModal(data);
				break;
			case "showSocialShareModal":
				taro.playerUi.showSocialShareModal(data);
				break;
			case "showFriendsModal":
				taro.playerUi.showFriendsModal(data);
				break;
			case "shopResponse":
				taro.shop.purchaseWarning(data.type);
				break;
		}
	},

	// when client receives a ping response back from the server
	_onPing: function(data) {
		const now = Date.now();
		const latency = now - data.sentAt;

		// start reconciliation based on discrepancy between 
		// where my unit when ping was sent and where unit is when ping is received
		if (taro.client.selectedUnit && 
			taro.client.myUnitPositionWhenPingSent && 
			taro.client.myUnitStreamedPosition && !taro.client.selectedUnit.isTeleporting
		) {
			// console.log(latency, taro.client.myUnitPositionWhenPingSent.x, taro.client.myUnitStreamedPosition.x, taro.client.myUnitPositionWhenPingSent.x - taro.client.myUnitStreamedPosition.x);
			taro.client.selectedUnit.reconRemaining = {
				x: taro.client.myUnitStreamedPosition.x - taro.client.myUnitPositionWhenPingSent.x,
				y: taro.client.myUnitStreamedPosition.y - taro.client.myUnitPositionWhenPingSent.y
			}

			// console.log("reconRemaining", taro.client.selectedUnit.reconRemaining);
		}

		taro.client.isWaitingForPong = false;
		taro.client.sendNextPingAt = taro.now + 50 // allow some time to reconcile before sending another ping

		if (!taro.pingElement) {
			taro.pingElement = document.getElementById('updateping');
		}

		if (taro.pingElement) {
			taro.pingElement.innerHTML = Math.floor(latency);
		}

	},

	_onPlayAd: function (data) {
		taro.ad.play(data);
	},

	_onVideoChat: function (data) {
		if (data.command) {
			switch (data.command) {
				case "joinGroup":
					switchRoom(data.groupId);
					break;
				case "leaveGroup":
					switchRoom(myID);
					break;
			}
		}
		console.log("videoChat", data);
	},

	_onUserJoinedGame: function (data) {
		var user = data.user;
		var server = data.server;
		var game = data.game;
		var gameName = data.gameName;
		var gameSlug = data.gameSlug;
		var friend = null;

		if (typeof allFriends != "undefined") {
			for (var i in allFriends) {
				var friendObj = allFriends[i];

				if (friendObj._id === user) {
					friend = friendObj;
					break;
				}
			}

			if (friend && friend.local) {
				var gameLink = $(`.${friend._id}-game-list`);
				var url = `/play/${gameSlug}?server=${server}&joinGame=true`;

				if (server) {
					var friendName = friend.local.username;
					// causing error player disconnect
					// taro.chat.xssFilters.inHTMLData(friend.local.username);
					var message = `${friendName} is now playing ${gameName}<a class="text-light ml-2 text-decoration" href="${url}" style="text-decoration: underline;">Join</a>`;
					// add message in chat
					taro.chat.postMessage({
						text: message,
						isHtml: true,
					});

					// update game link in friend list
					if (gameLink) {
						friend.currentServers = [
							{
								id: server,
								gameSlug: gameSlug,
								gameName: gameName,
							},
						];
					}
				} else {
					// user left the server so all we have is userId so clear the game-list text
					friend.currentServers = [];
				}

				// sort the friend array
				allFriends.sort(function (a, b) {
					return b.currentServers.length - a.currentServers.length;
				});

				renderAllFriendsPanel();
				renderFriendTabInGame();
			}
		}
	},

	_onBuySkin: function (skinHandle) {
		$(`.btn-buy-skin[name='${skinHandle}']`).html("Purchased");
	},

	// _onTradeRequest: function (data) {
	// 	$("#trader-name").html(data.name)

	// 	if (data.initatedByMe) {
	// 		$("#trade-request-message").html("requesting " + data.name + " to trade")
	// 		$("#accept-trade-request-button").hide()
	// 	}
	// 	else {
	// 		$("#trade-request-message").html(data.name + " wants to trade")
	// 		$("#accept-trade-request-button").show()
	// 	}

	// 	$("#trade-request-div").show();
	// },

	// _onTrade: function (data) {
	// 	$("#trade-message").html("");

	// 	if (data.cmd == 'start') {
	// 		$("#trade-request-div").hide();
	// 		$("#trade-div").show();
	// 	}
	// 	else if (data.cmd == 'offer') {
	// 		if (parseInt(data.originSlotNumber) > 12) {
	// 			taro.client.tradeOffers[parseInt(data.originSlotNumber) - 12] = data.originSlotItem
	// 		}

	// 		if (parseInt(data.destinationSlotNumber) > 12) {
	// 			taro.client.tradeOffers[parseInt(data.destinationSlotNumber) - 12] = data.destinationSlotItem
	// 		}

	// 		$("#trade-message").html($("#trader-name").html() + " changed item")

	// 		taro.client.updateTradeOffer()

	// 	}
	// 	else if (data.cmd == 'noRoom') {
	// 		$("#trade-message").html("No room in inventory")
	// 	}
	// 	else if (data.cmd == 'accept') {
	// 		$("#trade-message").html($("#trader-name").html() + " accepted")
	// 	}
	// 	else if (data.cmd == 'close') // cancels both trade & trade-request
	// 	{
	// 		taro.game.closeTrade()
	// 	}
	// },

	_onDevLogs: function (data) {
		taro.game.updateDevConsole(data);
	},

	_onProfile: function (data) {
		window.reactApp.profiler(data)
	},

	_onTrade: function (msg, clientId) {
		switch (msg.type) {
			case "init": {
				var player = taro.$(msg.from);
				if (player && player._category === "player") {
					taro.tradeUi.initiateTradeRequest(player);
				}
				break;
			}

			case "start": {
				var playerA = taro.$(msg.between.playerA);
				var playerB = taro.$(msg.between.playerB);
				if (playerA && playerA._category === "player" && playerB && playerB._category === "player") {
					taro.tradeUi.startTrading(playerA, playerB);
				}
				break;
			}

			case "offer": {
				var from = taro.$(msg.from);
				var to = taro.$(msg.to);

				if (from && to && from.tradingWith === to.id()) {
					taro.tradeUi.receiveOfferingItems(msg.tradeItems);
				}
				break;
			}

			case "success": {
				var playerA = taro.$(msg.between.playerA);
				var playerB = taro.$(msg.between.playerB);
				delete playerA.tradingWith;
				delete playerB.tradingWith;
				delete playerA.isTrading;
				delete playerB.isTrading;
				$("#trade-div").hide();
				break;
			}

			case "cancel": {
				var playerA = taro.$(msg.between.playerA);
				var playerB = taro.$(msg.between.playerB);
				delete playerA.tradingWith;
				delete playerB.tradingWith;
				delete playerA.isTrading;
				delete playerB.isTrading;
				$("#trade-div").hide();
				break;
			}
		}
	},

	// when other players' update tiles, apply the change to my local
	_onEditTile: function (data) {
		taro.client.emit("editTile", data);
	},

	// when other players' update regions, apply the change to my local
	_onEditRegion: function (data) {
		taro.client.emit("editRegion", data);
	},

	// when other players' update variables, apply the change to my local
	_onEditVariable: function (data) {
		taro.client.emit("editVariable", data);
	},

	_onEditInitEntity: function (data) {
		taro.client.emit("editInitEntity", data);
	},

	_onEditGlobalScripts: function (data) {
		taro.client.emit("editGlobalScripts", data);
	},

	_updateClientInitEntities: function (data) {
		taro.developerMode.updateClientInitEntities(data);
	},

	_onUpdateUnit: function (data) {
		taro.developerMode.updateUnit(data);
	},

	_onUpdateItem: function (data) {
		taro.developerMode.updateItem(data);
	},

	_onUpdateProjectile: function (data) {
		taro.developerMode.updateProjectile(data);
	},

	_onErrorLogs: function (logs) {
		var element = document.getElementById("error-log-content");
		for (actionName in logs) {
			var log = logs[actionName];
			element.innerHTML += `<li style='font-size:12px;'>${log}</li>`;
			taro.client.errorLogs.push({...log, path: actionName});
			$("#dev-error-button").text(`Errors (${taro.client.errorLogs.length})`);	
			
			if (window.addToLogs && typeof log.message === 'string') {
				window.addToLogs({...log, path: actionName})
			}
		}

		window.reactApp.showErrorToast(logs[Object.keys(logs)[Object.keys(logs).length - 1]]);
	},

	_onSound: function (data) {
		switch (data.cmd) {
			case "playMusic":
				var music = taro.game.data.music[data.id];
				if (music) {
					taro.sound.playMusic(music, undefined, undefined, data.id);
				}
				break;
			case "stopMusicForPlayer":
			case "stopMusic":
				taro.sound.stopMusic();
				break;
			case "playMusicForPlayer":
				var music = taro.game.data.music[data.music];
				if (music) {
					taro.sound.playMusic(music, undefined, undefined, data.music);
				}
				break;
			case "playMusicForPlayerRepeatedly":
				var music = taro.game.data.music[data.music];

				if (music) {
					taro.sound.playMusic(music, undefined, true, data.music);
				}
				break;
			case "playSoundForPlayer":
				var sound = taro.game.data.sound[data.sound];
				var volume = taro.game.data.sound[data.volume];

				if (sound) {
					var unit = taro.client.myPlayer && taro.client.myPlayer.getSelectedUnit();
					if (volume) {
						taro.sound.playSound(sound, (unit && unit._translate) || null, data.sound, volume);
					} else {
						taro.sound.playSound(sound, (unit && unit._translate) || null, data.sound, 100);
					}
				}
				break;
			case "stopSoundForPlayer":
				taro.sound.stopSound(sound, data.sound);
				break;
			default:
				var soundData = taro.game.data.sound[data.id];
				taro.sound.playSound(soundData, data.position, data.id);
		}
	},

	_onParticle: function (data) {
		if (taro.client.isActiveTab) {
			var particleData = taro.game.data.particleTypes[data.particleId];
			if (particleData) {

				if (data.entityId) {
					var entity = taro.$(data.entityId)
					taro.client.queueStreamUpdateData(data.entityId, "particle", data)
				} else {
					taro.client.emit("create-particle", data);
				}
			}
		}
	},

	_onCamera: function (data) {
		// camera zoom change
		if (data.cmd == "zoom") {
			taro.client.setZoom(data.zoom);
		}
		// track unit
		if (data.cmd == "track") {
			var unit = taro.$(data.unitId);
			if (unit) {
				taro.client.vp1.camera.trackTranslate(unit, taro.client._trackTranslateSmoothing);
			}
		}

		if (data.cmd === "positionCamera") {
			taro.client.positionCamera(data.position.x, data.position.y);
		}
	},

	_onGameSuggestion: function (data) {
		if (data && data.type == "show") {
			$("#more-games").removeClass("slidedown-menu-animation").addClass("slideup-menu-animation");
		} else if (data && data.type == "hide") {
			$("#more-games").removeClass("slideup-menu-animation").addClass("slidedown-menu-animation");
		}
	},

	_onRenderSocketLogs: function (data) {
		console.warn(data);
	},
};

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = ClientNetworkEvents;
}
