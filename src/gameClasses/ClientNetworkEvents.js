var ClientNetworkEvents = {
	_onClientDisconnect: function (data) {
		var clientId = data.clientId;
		// console.log("diskonnekt", clientId, taro.network.id())
		// if it's me that got disconnected!
		if (clientId == taro.network.id()) {
			$('#disconnect-reason').html(data.reason);
			taro.menuUi.onDisconnectFromServer('clientNetworkEvents #10', data.reason);
		}
		taro.network._io._disconnectReason = data.reason;
	},

	_onUpdateAllEntities: function (data) {
		for (entityId in data) {
			var entity = taro.$(entityId);
			if (taro.client.entityUpdateQueue[entityId] == undefined) {
				taro.client.entityUpdateQueue[entityId] = [];
			}

			if (taro.client.isActiveTab) {
				var stats = data[entityId];

				for (key in stats) {
					if (stats[key] != undefined) {
						// use for mounting offscreen entitys when it starts firing
						if (entity && entity._category === 'item' && stats[key].isBeingUsed != undefined) {
							entity.isBeingUsed = stats[key].isBeingUsed;
						}
						// console.log(entityId, stats[key])
						taro.client.entityUpdateQueue[entityId].push(stats[key]);
					}
				}
			} else {
				// if user's current browser tab isn't this game.

				// merging data
				if (taro.client.inactiveTabEntityStream[entityId] === undefined) {
					taro.client.inactiveTabEntityStream[entityId] = [{}];
				}

				const objectsArr = data[entityId]; //Array of single prop objects for THIS tick

				const packet = Object.assign({}, ...objectsArr); //condense to ONE object

				taro.client.inactiveTabEntityStream[entityId][0] = // merge each packet into the first, overwriting older values
					{
						...taro.client.inactiveTabEntityStream[entityId][0],
						...packet
					};
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

	_onMakePlayerSelectUnit: function (data) {
		if (data.unitId) {
			if (taro.client.entityUpdateQueue[data.unitId] == undefined) {
				taro.client.entityUpdateQueue[data.unitId] = [];
			}
			// in case the unit doesn't exist when player tries to select it, we're pushing the command into entityUpdateQueue
			taro.client.entityUpdateQueue[data.unitId].push({ makePlayerSelectUnit: true });
		}
	},

	_onMakePlayerCameraTrackUnit: function (data) {
		if (data.unitId) {
			if (taro.client.entityUpdateQueue[data.unitId] == undefined) {
				taro.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			taro.client.entityUpdateQueue[data.unitId].push({ makePlayerCameraTrackUnit: true });
		}
	},

	_onChangePlayerCameraPanSpeed: function (data) {
		if (data.panSpeed !== undefined) {
			taro.client.myPlayer.changeCameraPanSpeed(data.panSpeed);
		}
	},

	_onHideUnitFromPlayer: function (data) {
		if (data.unitId) {
			if (taro.client.entityUpdateQueue[data.unitId] == undefined) {
				taro.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			taro.client.entityUpdateQueue[data.unitId].push({ hideUnit: true });
		}
	},
	_onShowUnitFromPlayer: function (data) {
		if (data.unitId) {
			if (taro.client.entityUpdateQueue[data.unitId] == undefined) {
				taro.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			taro.client.entityUpdateQueue[data.unitId].push({ showUnit: true });
		}
	},
	_onHideUnitNameLabelFromPlayer: function (data) {
		if (data.unitId) {
			if (taro.client.entityUpdateQueue[data.unitId] == undefined) {
				taro.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			taro.client.entityUpdateQueue[data.unitId].push({ hideNameLabel: true });
		}
	},
	_onShowUnitNameLabelFromPlayer: function (data) {
		if (data.unitId) {
			if (taro.client.entityUpdateQueue[data.unitId] == undefined) {
				taro.client.entityUpdateQueue[data.unitId] = [];
			}

			// in case the unit doesn't exist when player camera tries to track it, we're pushing the command into entityUpdateQueue
			taro.client.entityUpdateQueue[data.unitId].push({ showNameLabel: true });
		}
	},
	_onOpenShop: function (data) {
		if (data.type) {
			var shopName = taro.game.data.shops[data.type] ? taro.game.data.shops[data.type].name : 'Item shop';
			var shopDescription = taro.game.data.shops[data.type] ? taro.game.data.shops[data.type].description : '';
			$('#modd-item-shop-header').text(shopName);

			if (shopDescription?.length) {
				$('#modd-item-shop-description').text(shopDescription);
			} else {
				$('#modd-item-shop-description').text('');
			}

			taro.shop.openItemShop(data.type);
			$('#modd-item-shop-modal').modal('show');
		}
	},
	_onCreateFloatingText: function (data) {
		taro.client.emit('floating-text', {
			text: data.text,
			x: data.position.x,
			y: data.position.y,
			color: data.color || 'white'
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
		var item = taro.$(data.id);
		if (item) {
			if (item._category == 'item') {
				var ownerUnit = item.getOwnerUnit();
				if (data.type == 'use' && ownerUnit && ownerUnit != taro.client.selectedUnit) {
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
				taro.shop.openModdShop('item');
				break;

			case 'openUnitShop':
				taro.shop.openModdShop('unit');
				break;

			case 'closeShop':
				taro.shop.closeShop();
				break;

			case 'showMenuAndSelectCurrentServer':
			case 'showMenu':
				taro.menuUi.showMenu();
				break;

			case 'showMenuAndSelectBestServer':
				taro.menuUi.showMenu(true);
				break;

			case 'showInputModal':
				taro.playerUi.showInputModal(data);
				break;

			case 'showCustomModal':
				taro.playerUi.showCustomModal(data);
				break;

			case 'openWebsite':
				taro.playerUi.openWebsite(data);
				break;
			case 'showWebsiteModal':
				taro.playerUi.showWebsiteModal(data);
				break;
			case 'showSocialShareModal':
				taro.playerUi.showSocialShareModal(data);
				break;
			case 'showFriendsModal':
				taro.playerUi.showFriendsModal(data);
				break;
			case 'shopResponse':
				taro.shop.purchaseWarning(data.type);
				break;
		}
	},

	_onPlayAd: function (data) {
		taro.ad.play(data);
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
					// taro.chat.xssFilters.inHTMLData(friend.local.username);
					var message = `${friendName} is now playing ${gameName}<a class="text-light ml-2 text-decoration" href="${url}" style="text-decoration: underline;">Join</a>`;
					// add message in chat
					taro.chat.postMessage({
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

	_onTrade: function (msg, clientId) {
		switch (msg.type) {
			case 'init': {
				var player = taro.$(msg.from);
				if (player && player._category === 'player') {
					taro.tradeUi.initiateTradeRequest(player);
				}
				break;
			}

			case 'start': {
				var playerA = taro.$(msg.between.playerA);
				var playerB = taro.$(msg.between.playerB);
				if (playerA && playerA._category === 'player' && playerB && playerB._category === 'player') {
					taro.tradeUi.startTrading(playerA, playerB);
				}
				break;
			}

			case 'offer': {
				var from = taro.$(msg.from);
				var to = taro.$(msg.to);

				if (from && to && from.tradingWith === to.id()) {
					taro.tradeUi.receiveOfferingItems(msg.tradeItems);
				}
				break;
			}

			case 'success': {
				var playerA = taro.$(msg.between.playerA);
				var playerB = taro.$(msg.between.playerB);
				delete playerA.tradingWith;
				delete playerB.tradingWith;
				delete playerA.isTrading;
				delete playerB.isTrading;
				$('#trade-div').hide();
				break;
			}

			case 'cancel': {
				var playerA = taro.$(msg.between.playerA);
				var playerB = taro.$(msg.between.playerB);
				delete playerA.tradingWith;
				delete playerB.tradingWith;
				delete playerA.isTrading;
				delete playerB.isTrading;
				$('#trade-div').hide();
				break;
			}
		}
	},

	// when other players' update tiles, apply the change to my local
	_onEditTile: function (data) {
		taro.client.emit('editTile', data);
	},

	// when other players' update regions, apply the change to my local
	_onEditRegion: function (data) {
		taro.client.emit('editRegion', data);
	},

    _onEditInitEntity: function (data) {
        taro.client.emit('editInitEntity', data);
    },

    _updateClientInitEntities: function (data) {
        taro.developerMode.updateClientInitEntities(data);
    },

	_onUpdateUnit: function(data) {
		taro.developerMode.updateUnit(data);
	},

	_onUpdateItem: function(data) {
		taro.developerMode.updateItem(data);
	},

	_onUpdateProjectile: function(data) {
		taro.developerMode.updateProjectile(data);
	},

	_onErrorLogs: function (logs) {
		var element = document.getElementById('error-log-content');
		for (actionName in logs) {
			var log = logs[actionName];
			element.innerHTML += `<li style='font-size:12px;'>${log}</li>`;
			taro.client.errorLogs.push(log);
			$('#dev-error-button').text(`Errors (${taro.client.errorLogs.length})`);
			$('#server-console').append(`<span class="badge badge-danger">${log}</span><br/>`);
		}

		window.reactApp.showErrorToast(logs[Object.keys(logs)[Object.keys(logs).length - 1]]);
	},

	_onSound: function (data) {
		switch (data.cmd) {
			case 'playMusic':
				var music = taro.game.data.music[data.id];
				if (music) {
					taro.sound.playMusic(music, undefined, undefined, data.id);
				}
				break;
			case 'stopMusicForPlayer':
			case 'stopMusic':
				taro.sound.stopMusic();
				break;
			case 'playMusicForPlayer':
				var music = taro.game.data.music[data.music];
				if (music) {
					taro.sound.playMusic(music, undefined, undefined, data.music);
				}
				break;
			case 'playMusicForPlayerRepeatedly':
				var music = taro.game.data.music[data.music];

				if (music) {
					taro.sound.playMusic(music, undefined, true, data.music);
				}
				break;
			case 'playSoundForPlayer':
				var sound = taro.game.data.sound[data.sound];
				if (sound) {
					var unit = taro.client.myPlayer && taro.client.myPlayer.getSelectedUnit();
					taro.sound.playSound(sound, (unit && unit._translate) || null, data.sound);
				}
				break;
			case 'stopSoundForPlayer':
				taro.sound.stopSound(sound, data.sound);
				break;
			default:
				var soundData = taro.game.data.sound[data.id];
				taro.sound.playSound(soundData, data.position, data.id);
		}
	},

	_onParticle: function (data) {
		if (data.eid && data.pid) {
			var entity = taro.$(data.eid);

			// the particle emitter must be within myPlayer's camera viewing range
			if (entity && entity.particleEmitters[data.pid] && entity._translate.x > taro.client.vp1.camera._translate.x - 1000 && entity._translate.x < taro.client.vp1.camera._translate.x + 1000 && entity._translate.y > taro.client.vp1.camera._translate.y - 1000 && entity._translate.y < taro.client.vp1.camera._translate.y + 1000) {
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
			var entity = taro.client.vp1.camera._trackTranslateTarget;
			var particle = taro.game.data.particleTypes[data.pid];
			if (entity && particle && entity._translate.x > taro.client.vp1.camera._translate.x - 1000 && entity._translate.x < taro.client.vp1.camera._translate.x + 1000 && entity._translate.y > taro.client.vp1.camera._translate.y - 1000 && entity._translate.y < taro.client.vp1.camera._translate.y + 1000) {
				if (particle.dimensions == undefined) {
					particle.dimensions = { width: 5, height: 5 };
				}

				if (particle['z-index'] === undefined) {
					particle['z-index'] = {
						layer: 3,
						depth: 5
					};
				}

				/*new TaroParticleEmitter() // Set the particle entity to generate for each particle
					.layer(particle['z-index'].layer)
					.depth(particle['z-index'].depth)
					.color(particle.color)
					.size(particle.dimensions.height, particle.dimensions.width)
					.particle(Particle)
					.lifeBase(parseFloat(particle.lifeBase)) // Set particle life to 300ms
					.quantityBase(parseFloat(particle.quantityBase)) // Set output to 60 particles a second (1000ms)
					.quantityTimespan(parseFloat(particle.quantityTimespan))
					.deathOpacityBase(parseFloat(particle.deathOpacityBase)) // Set the particle's death opacity to zero so it fades out as it's lifespan runs out
					.velocityVector(new TaroPoint3d(parseFloat(particle.velocityVector.baseVector.x), parseFloat(particle.velocityVector.baseVector.y), 0), new TaroPoint3d(parseFloat(particle.velocityVector.minVector.x), parseFloat(particle.velocityVector.minVector.y), 0), new TaroPoint3d(parseFloat(particle.velocityVector.maxVector.x), parseFloat(particle.velocityVector.maxVector.y), 0))
					.particleMountTarget(taro.client.mainScene) // Mount new particles to the object scene
					.translateTo(parseFloat(data.position.x), parseFloat(data.position.y), 0) // Move the particle emitter to the bottom of the ship
					.mount(taro.client.mainScene)
					.emitOnce();*/
			}
		}
	},

	_onCamera: function (data) {
		// camera zoom change
		if (data.cmd == 'zoom') {
			taro.client.setZoom(data.zoom);
		}
		// track unit
		if (data.cmd == 'track') {
			var unit = taro.$(data.unitId);
			if (unit) {
				taro.client.vp1.camera.trackTranslate(unit, taro.client._trackTranslateSmoothing);
			}
		}

		if (data.cmd === 'positionCamera') {
			taro.client.positionCamera(data.position.x, data.position.y);
		}
	},

	_onGameSuggestion: function (data) {
		if (data && data.type == 'show') {
			$('#more-games').removeClass('slidedown-menu-animation').addClass('slideup-menu-animation');
		} else if (data && data.type == 'hide') {
			$('#more-games').removeClass('slideup-menu-animation').addClass('slidedown-menu-animation');
		}
	},

	_onRenderSocketLogs: function (data) {
		console.warn(data);
	}
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ClientNetworkEvents;
}
