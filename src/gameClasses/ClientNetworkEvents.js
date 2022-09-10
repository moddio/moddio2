var ClientNetworkEvents = {
	_onClientDisconnect: function (data) {
		var clientId = data.clientId;
		// console.log("diskonnekt", clientId, ige.network.id())
		// if it's me that got disconnected!
		if (clientId == ige.network.id()) {
			$('#disconnect-reason').html(data.reason);
			ige.menuUi.onDisconnectFromServer('clientNetworkEvents #10', data.reason);
		}
	},

	_onUpdateAllEntities: function (data) {
		for (entityId in data) {
			var entity = ige.$(entityId);
			if (ige.client.entityUpdateQueue[entityId] == undefined) {
				ige.client.entityUpdateQueue[entityId] = [];
			}

			if (ige.client.isActiveTab) {
				var stats = data[entityId];

				for (key in stats) {
					if (stats[key] != undefined) {
						// use for mounting offscreen entitys when it starts firing
						if (entity && entity._category === 'item' && stats[key].isBeingUsed != undefined) {
							entity.isBeingUsed = stats[key].isBeingUsed;
						}
						// console.log(entityId, stats[key])
						ige.client.entityUpdateQueue[entityId].push(stats[key]);
					}
				}
			} else {
				// if user's current browser tab isn't this game.

				// merging data
				if (ige.client.inactiveTabEntityStream[entityId] === undefined) {
					ige.client.inactiveTabEntityStream[entityId] = [{}];
				}

				const objectsArr = data[entityId]; //Array of single prop objects for THIS tick

				const packet = Object.assign({}, ...objectsArr); //condense to ONE object

				ige.client.inactiveTabEntityStream[entityId][0] = // merge each packet into the first, overwriting older values
					{
						...ige.client.inactiveTabEntityStream[entityId][0],
						...packet
					};
			}
		}
	},

	_onTeleport: function (data) {
		var entity = ige.$(data.entityId);
		if (entity && data.position) {
			// console.log("teleporting",data.entityId , " to", data.position)
			entity.teleportTo(data.position[0], data.position[1]);
		}
	},

	_onMakePlayerSelectUnit: function (data) {
		if (data.unitId) {
			if (ige.client.entityUpdateQueue[data.unitId] == undefined) {
				ige.client.entityUpdateQueue[data.unitId] = [];
			}
			// in case the unit doesn't exist when player tries to select it, we're pushing the command into entityUpdateQueue
			ige.client.entityUpdateQueue[data.unitId].push({ makePlayerSelectUnit: true });
		}
	},

	_onMakePlayerCameraTrackUnit: function (data) {
		if (data.unitId) {
			if (ige.client.entityUpdateQueue[data.unitId] == undefined) {
				ige.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			ige.client.entityUpdateQueue[data.unitId].push({ makePlayerCameraTrackUnit: true });
		}
	},

	_onChangePlayerCameraPanSpeed: function (data) {
		if (data.panSpeed !== undefined) {
			ige.client.myPlayer.changeCameraPanSpeed(data.panSpeed);
		}
	},

	_onHideUnitFromPlayer: function (data) {
		if (data.unitId) {
			if (ige.client.entityUpdateQueue[data.unitId] == undefined) {
				ige.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			ige.client.entityUpdateQueue[data.unitId].push({ hideUnit: true });
		}
	},
	_onShowUnitFromPlayer: function (data) {
		if (data.unitId) {
			if (ige.client.entityUpdateQueue[data.unitId] == undefined) {
				ige.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			ige.client.entityUpdateQueue[data.unitId].push({ showUnit: true });
		}
	},
	_onHideUnitNameLabelFromPlayer: function (data) {
		if (data.unitId) {
			if (ige.client.entityUpdateQueue[data.unitId] == undefined) {
				ige.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			ige.client.entityUpdateQueue[data.unitId].push({ hideNameLabel: true });
		}
	},
	_onShowUnitNameLabelFromPlayer: function (data) {
		if (data.unitId) {
			if (ige.client.entityUpdateQueue[data.unitId] == undefined) {
				ige.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			ige.client.entityUpdateQueue[data.unitId].push({ showNameLabel: true });
		}
	},
	_onOpenShop: function (data) {
		if (data.type) {
			var shopName = ige.game.data.shops[data.type] ? ige.game.data.shops[data.type].name : 'Item shop';
			$('#modd-item-shop-header').text(shopName);
			ige.shop.openItemShop(data.type);
			$('#modd-item-shop-modal').modal('show');
			var player = ige.client.myPlayer;
			if (typeof countAdImpression === 'function' && player && !player._stats.isAdBlockEnabled) {
				countAdImpression(gameId, 'shop');
			}
		}
	},
	_onCreateFloatingText: function (data) {
		ige.client.emit('floating-text', {
			text: data.text,
			x: data.position.x,
			y: data.position.y,
			color: data.color || 'white'
		});
	},

	_onOpenDialogue: function (data) {
		if (data.type) {
			ige.playerUi.openDialogueModal(data.type, data.extraData);
		}
	},

	_onCloseDialogue: function (data) {
		ige.playerUi.closeDialogueModal();
	},

	_onUpdateEntityAttribute: function (data) {
		var entityId = data.e;
		var attrId = data.a;
		var value = data.x;
		var property = data.p;

		var entity = ige.$(entityId);
		if (entity && entity._stats && entity._stats.attributes && entity._stats.attributes[attrId]) {
			entity._stats.attributes[attrId][property] = value;
		}
	},

	_onUpdateUiTextForTime: function (data) {
		$(`.ui-text-${data.target}`).show();
		$(`.ui-text-${data.target}`).html(data.value);

		if (data.time && data.time > 0) {
			if (this.textTimer) {
				clearTimeout(this.textTimer);
			}

			var that = this;
			this.textTimerData = {
				target: data.target
			};

			this.textTimer = setTimeout(function () {
				$(`.ui-text-${that.textTimerData.target}`).hide();
			}, data.time);
		}
	},

	_onUpdateUiText: function (data) {
		// console.log("updating UI text", data)

		if (data.action == 'show') {
			$(`.ui-text-${data.target}`).show();
		} else if (data.action == 'hide') {
			$(`.ui-text-${data.target}`).hide();
		} else {
			$(`.ui-text-${data.target}`).html(data.value);
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
		var item = ige.$(data.id);
		if (item) {
			if (item._category == 'item') {
				var ownerUnit = item.getOwnerUnit();
				if (data.type == 'use' && ownerUnit && ownerUnit != ige.client.selectedUnit) {
					item.use();
				} else if (data.type == 'stop') {
					item.stopUsing();
				} else if (data.type == 'reload') {
					item.reload();
				}
			} else {
				if (data.type == 'hit') {
					item.effect.start('bulletHit');
				}
			}
		}
	},

	_onUi: function (data) {
		switch (data.command) {
			case 'openItemShop':
				ige.shop.openModdShop('item');
				break;

			case 'openUnitShop':
				ige.shop.openModdShop('unit');
				break;

			case 'closeShop':
				ige.shop.closeShop();
				break;

			case 'showMenuAndSelectCurrentServer':
			case 'showMenu':
				ige.menuUi.showMenu();
				break;

			case 'showMenuAndSelectBestServer':
				ige.menuUi.showMenu(true);
				break;

			case 'showInputModal':
				ige.playerUi.showInputModal(data);
				break;

			case 'showCustomModal':
				ige.playerUi.showCustomModal(data);
				break;

			case 'openWebsite':
				ige.playerUi.openWebsite(data);
				break;
			case 'showWebsiteModal':
				ige.playerUi.showWebsiteModal(data);
				break;
			case 'showSocialShareModal':
				ige.playerUi.showSocialShareModal(data);
				break;
			case 'showFriendsModal':
				ige.playerUi.showFriendsModal(data);
				break;
			case 'shopResponse':
				ige.shop.purchaseWarning(data.type);
				break;
		}
	},

	_onPlayAd: function (data) {
		var player = ige.client.myPlayer;
		if (typeof countAdImpression === 'function' && player && !player._stats.isAdBlockEnabled) {
			countAdImpression(gameId, 'video');
		}
		ige.ad.play(data);
	},

	_onVideoChat: function (data) {
		if (data.command) {
			switch (data.command) {
				case 'joinGroup':
					switchRoom(data.groupId);
					break;
				case 'leaveGroup':
					switchRoom(myID);
					break;
			}
		}
		console.log('videoChat', data);
	},

	_onUserJoinedGame: function (data) {
		var user = data.user;
		var server = data.server;
		var game = data.game;
		var gameName = data.gameName;
		var gameSlug = data.gameSlug;
		var friend = null;

		if (typeof allFriends != 'undefined') {
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
					// ige.chat.xssFilters.inHTMLData(friend.local.username);
					var message = `${friendName} is now playing ${gameName}<a class="text-light ml-2 text-decoration" href="${url}" style="text-decoration: underline;">Join</a>`;
					// add message in chat
					ige.chat.postMessage({
						text: message,
						isHtml: true
					});

					// update game link in friend list
					if (gameLink) {
						friend.currentServers = [
							{
								id: server,
								gameSlug: gameSlug,
								gameName: gameName
							}
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
		$(`.btn-buy-skin[name='${skinHandle}']`).html('Purchased');
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
	// 			ige.client.tradeOffers[parseInt(data.originSlotNumber) - 12] = data.originSlotItem
	// 		}

	// 		if (parseInt(data.destinationSlotNumber) > 12) {
	// 			ige.client.tradeOffers[parseInt(data.destinationSlotNumber) - 12] = data.destinationSlotItem
	// 		}

	// 		$("#trade-message").html($("#trader-name").html() + " changed item")

	// 		ige.client.updateTradeOffer()

	// 	}
	// 	else if (data.cmd == 'noRoom') {
	// 		$("#trade-message").html("No room in inventory")
	// 	}
	// 	else if (data.cmd == 'accept') {
	// 		$("#trade-message").html($("#trader-name").html() + " accepted")
	// 	}
	// 	else if (data.cmd == 'close') // cancels both trade & trade-request
	// 	{
	// 		ige.game.closeTrade()
	// 	}
	// },

	_onDevLogs: function (data) {
		ige.variable.updateDevConsole(data);
	},

	_onTrade: function (msg, clientId) {
		switch (msg.type) {
			case 'init': {
				var player = ige.$(msg.from);
				if (player && player._category === 'player') {
					ige.tradeUi.initiateTradeRequest(player);
				}
				break;
			}

			case 'start': {
				var playerA = ige.$(msg.between.playerA);
				var playerB = ige.$(msg.between.playerB);
				if (playerA && playerA._category === 'player' && playerB && playerB._category === 'player') {
					ige.tradeUi.startTrading(playerA, playerB);
				}
				break;
			}

			case 'offer': {
				var from = ige.$(msg.from);
				var to = ige.$(msg.to);

				if (from && to && from.tradingWith === to.id()) {
					ige.tradeUi.receiveOfferingItems(msg.tradeItems);
				}
				break;
			}

			case 'success': {
				var playerA = ige.$(msg.between.playerA);
				var playerB = ige.$(msg.between.playerB);
				delete playerA.tradingWith;
				delete playerB.tradingWith;
				delete playerA.isTrading;
				delete playerB.isTrading;
				$('#trade-div').hide();
				break;
			}

			case 'cancel': {
				var playerA = ige.$(msg.between.playerA);
				var playerB = ige.$(msg.between.playerB);
				delete playerA.tradingWith;
				delete playerB.tradingWith;
				delete playerA.isTrading;
				delete playerB.isTrading;
				$('#trade-div').hide();
				break;
			}
		}
	},

	_onErrorLogs: function (logs) {
		var element = document.getElementById('error-log-content');
		for (actionName in logs) {
			var log = logs[actionName];
			element.innerHTML += `<li style='font-size:12px;'>${log}</li>`;
			ige.client.errorLogs.push(log);
			$('#dev-error-button').text(`Errors (${ige.client.errorLogs.length})`);
		}
	},

	_onSound: function (data) {
		switch (data.cmd) {
			case 'playMusic':
				var music = ige.game.data.music[data.id];
				if (music) {
					ige.sound.playMusic(music, undefined, undefined, data.id);
				}
				break;
			case 'stopMusicForPlayer':
			case 'stopMusic':
				ige.sound.stopMusic();
				break;
			case 'playMusicForPlayer':
				var music = ige.game.data.music[data.music];
				if (music) {
					ige.sound.playMusic(music, undefined, undefined, data.music);
				}
				break;
			case 'playMusicForPlayerRepeatedly':
				var music = ige.game.data.music[data.music];

				if (music) {
					ige.sound.playMusic(music, undefined, true, data.music);
				}
				break;
			case 'playSoundForPlayer':
				var sound = ige.game.data.sound[data.sound];
				if (sound) {
					var unit = ige.client.myPlayer && ige.client.myPlayer.getSelectedUnit();
					ige.sound.playSound(sound, (unit && unit._translate) || null, data.sound);
				}
				break;
			case 'stopSoundForPlayer':
				ige.sound.stopSound(sound, data.sound);
				break;
			default:
				var soundData = ige.game.data.sound[data.id];
				ige.sound.playSound(soundData, data.position, data.id);
		}
	},

	_onParticle: function (data) {
		if (data.eid && data.pid) {
			var entity = ige.$(data.eid);

			// the particle emitter must be within myPlayer's camera viewing range
			if (entity && entity.particleEmitters[data.pid] && entity._translate.x > ige.client.vp1.camera._translate.x - 1000 && entity._translate.x < ige.client.vp1.camera._translate.x + 1000 && entity._translate.y > ige.client.vp1.camera._translate.y - 1000 && entity._translate.y < ige.client.vp1.camera._translate.y + 1000) {
				var particleEmitter = entity.effect.particleEmitters[data.pid];

				if (data.action == 'start') {
					particleEmitter.start();
				} else if (data.action == 'stop') {
					particleEmitter.stop();
				} else if (data.action == 'emitOnce') {
					particleEmitter.emitOnce();
				}
			}
		} else if (data.pid && data.position) {
			// my unit
			var entity = ige.client.vp1.camera._trackTranslateTarget;
			var particle = ige.game.data.particleTypes[data.pid];
			if (entity && particle && entity._translate.x > ige.client.vp1.camera._translate.x - 1000 && entity._translate.x < ige.client.vp1.camera._translate.x + 1000 && entity._translate.y > ige.client.vp1.camera._translate.y - 1000 && entity._translate.y < ige.client.vp1.camera._translate.y + 1000) {
				if (particle.dimensions == undefined) {
					particle.dimensions = { width: 5, height: 5 };
				}

				if (particle['z-index'] === undefined) {
					particle['z-index'] = {
						layer: 3,
						depth: 5
					};
				}

				new IgeParticleEmitter() // Set the particle entity to generate for each particle
					.layer(particle['z-index'].layer)
					.depth(particle['z-index'].depth)
					.color(particle.color)
					.size(particle.dimensions.height, particle.dimensions.width)
					.particle(Particle)
					.lifeBase(parseFloat(particle.lifeBase)) // Set particle life to 300ms
					.quantityBase(parseFloat(particle.quantityBase)) // Set output to 60 particles a second (1000ms)
					.quantityTimespan(parseFloat(particle.quantityTimespan))
					.deathOpacityBase(parseFloat(particle.deathOpacityBase)) // Set the particle's death opacity to zero so it fades out as it's lifespan runs out
					.velocityVector(new IgePoint3d(parseFloat(particle.velocityVector.baseVector.x), parseFloat(particle.velocityVector.baseVector.y), 0), new IgePoint3d(parseFloat(particle.velocityVector.minVector.x), parseFloat(particle.velocityVector.minVector.y), 0), new IgePoint3d(parseFloat(particle.velocityVector.maxVector.x), parseFloat(particle.velocityVector.maxVector.y), 0))
					.particleMountTarget(ige.client.mainScene) // Mount new particles to the object scene
					.translateTo(parseFloat(data.position.x), parseFloat(data.position.y), 0) // Move the particle emitter to the bottom of the ship
					.mount(ige.client.mainScene)
					.emitOnce();
			}
		}
	},

	_onCamera: function (data) {
		// camera zoom change
		if (data.cmd == 'zoom') {
			ige.client.setZoom(data.zoom);
		}
		// track unit
		if (data.cmd == 'track') {
			var unit = ige.$(data.unitId);
			if (unit) {
				ige.client.vp1.camera.trackTranslate(unit, ige.client._trackTranslateSmoothing);
			}
		}

		if (data.cmd === 'positionCamera') {
			ige.client.positionCamera(data.position.x, data.position.y);
		}
	},

	_onGameSuggestion: function (data) {
		if (data && data.type == 'show') {
			$('#more-games').removeClass('slidedown-menu-animation').addClass('slideup-menu-animation');
		} else if (data && data.type == 'hide') {
			$('#more-games').removeClass('slideup-menu-animation').addClass('slidedown-menu-animation');
		}
	}
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ClientNetworkEvents;
}
