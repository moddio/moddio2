var GameComponent = TaroEntity.extend({
	classId: 'GameComponent',
	componentId: 'game',

	init: function () {
		this.highlights = {};
		this.createdEntities = [];
		this.gameOverModalIsShowing = false;
		this.hasStarted = false;
		this.devLogs = {};
	},

	start: function () {
		var self = this;
		GameComponent.prototype.log('Game component started');
		if (taro.isServer) {
			taro.chat.createRoom('lobby', {}, '1');

			// by default, create 5 computer players
			var aiCount = 10;
			// if (global.isDev) {
			// 	var aiCount = 50 // create 50 ai players if dev env
			// }

			for (var i = 1; i <= aiCount; i++) {
				this[`computer${i}`] = this.createPlayer({
					name: `AI ${i}`,
					controlledBy: 'computer',
					unitIds: [], // all units owned by player
					clientId: i,
				});
			}
		} else if (taro.isClient) {
			// determine which attribute will be used for scoreboard
			// var attr = 'points';
			// if (
			// 	taro.game.data.settings &&
			// 	taro.game.data.settings.constants &&
			// 	taro.game.data.settings.constants.currency != undefined
			// ) {
			// 	attr = taro.game.data.settings.constants.currency;
			// }
			// $('.game-currency').html(attr);
		}

		taro.addComponent(ScriptComponent);
		taro.script.load(taro.game.data.scripts);

		taro.script.trigger('gameStart');
		self.hasStarted = true;
		self.isWorld = !!taro.game?.data?.defaultData?.isWorld;
		self.isWorldMap = !!taro.game?.data?.defaultData?.worldId;

		taro.timer.startGameClock();

		taro._physicsTickRate = Math.max(20, Math.min(60, taro.game?.data?.defaultData?.frameRate || 20));
		console.log('physicsTickRate', taro._physicsTickRate);

		if (taro.isClient) {
			// physicsTickRate dictates streaming fps, and renderBuffer is the wait time before next keyframe is sent to client.
			// taro.client.renderBuffer = 1500 / taro._physicsTickRate // 20 fps = 75ms, 60 fps = 25ms
			console.log('renderBuffer', taro.client.renderBuffer);
		} else if (taro.isServer) {
			if (process.env.ENV !== 'standalone') {
				taro.workerComponent && taro.workerComponent.gameStarted();
			}
		}

		taro._gameLoopTickRate = Math.max(20, Math.min(60, taro.game?.data?.defaultData?.engineTickRate || 20));
	},

	// this applies to logged in players only
	createPlayer: function (data, persistedData) {
		/* removing unnecessary purchases keys */
		var purchases = [];
		if (data.purchasables) {
			for (var i = 0; i < data.purchasables.length; i++) {
				var purchasable = data.purchasables[i];
				purchasable = _.pick(purchasable, ['_id', 'image', 'owner', 'target', 'type']);
				purchases.push(purchasable);
			}
		}

		var playerData = {
			controlledBy: data.controlledBy,
			name: data.name,
			coins: data.coins,
			points: data.points || 0,
			clientId: data.clientId,
			purchasables: purchases, // purchasables are currently equipped purchasables of the player for current game
			allPurchasables: data.allPurchasables, // allPurchasables includes equipped and purchased items of the player for current game
			attributes: data.attributes,
			highscore: data.highscore,
			lastPlayed: data.lastPlayed,
			userId: data._id,
			isAdBlockEnabled: data.isAdBlockEnabled,
			unitIds: [], // all units owned by player,
			jointsOn: Date.now(), // use for calculating session,
			totalTime: data.totalTime,
			ipAddress: data.ipAddress,
			email: data.email,
			banChat: data.banChat,
			mutedUsers: data.mutedUsers,
			// isEmailVerified: true,
			// isUserVerified: true,
			isEmailVerified: data.isEmailVerified,
			isUserVerified: data.isUserVerified,
			username: data.name,
			profilePicture: data.profilePicture,
			roleIds: data.roleIds || [],
			isMobile: data.isMobile,
			isHidden: false,
		};

		var player = new Player(playerData);

		if (persistedData) {
			player.persistedData = persistedData;
		}

		if (taro.isServer) {
			// send latest ui information to the client
			taro.gameText.sendLatestText(data.clientId);
			// taro.shopkeeper.updateShopInventory(taro.shopkeeper.inventory, data.clientId) // send latest ui information to the client

			const { isOwner, isInvitedUser, isUserMod, isUserAdmin, isModerationAllowed } = taro.workerComponent
				? taro.workerComponent.getUserPermissions(data)
				: { isOwner: true };

			player._stats.isUserAdmin = isUserAdmin;
			player._stats.isUserMod = isUserMod;
			player._stats.isModerationAllowed = isModerationAllowed;

			// if User/Admin has access to game then show developer logs
			if (isOwner || isInvitedUser || isUserAdmin) {
				GameComponent.prototype.log(`owner/admin/mod connected. _id: ${data._id}`);
				taro.server.developerClientIds.push(data.clientId);
			}
		}

		return player;
	},

	restart: function () {
		// remove all players/units/items/projectiles
		// remove world & map
		// start buliding out world
		// run scripts
		// get existing players to re-join
	},

	kickPlayer: function (playerId, message) {
		// var player = this.getPlayerByClientId(clientId);
		// if (player) {
		// 	player.streamUpdateData([{ playerJoined: false }]);
		// }
		var player = taro.$(playerId);

		if (player) {
			if (player._stats.clientId) {
				var client = taro.server.clients[player._stats.clientId];
				if (client) {
					client.socket.close(message);
				}
			} else {
				// bot players don't have clientId
				player.remove();
			}
		}
	},

	// get client with ip
	getPlayerByIp: function (ip, currentUserId, all = false, guestPlayersOnly = false) {
		var clientIds = [];
		for (let clientId in taro.server.clients) {
			const clientObj = taro.server.clients[clientId];

			if (clientObj.ip === ip) {
				clientIds.push(clientId);
				if (!all) {
					break;
				}
			}
		}

		if (clientIds.length > 0) {
			var method = all ? 'filter' : 'find';
			return taro.$$('player')[method]((player) => {
				// var clientId = player && player._stats && player._stats.clientId;
				// added currentUserId check to confirm it is logged in user and not add-instance bot.
				return (
					player._stats &&
					clientIds.includes(player._stats.clientId) &&
					((all && (!guestPlayersOnly || !player._stats.userId)) ||
						(currentUserId && player._stats.userId != currentUserId))
				);
			});
		}
	},

	getPlayerByUserId: function (userId) {
		return taro.$$('player').find(function (player) {
			return player._stats && player._stats.userId == userId;
		});
	},

	getPlayerByClientId: function (clientId) {
		return taro.$$('player').find(function (player) {
			return player._stats?.clientId == clientId;
		});
	},

	cloneAsset: function (assetType, assetId) {
		try {
			var asset = this.data[assetType][assetId];
			// cloned = JSON.parse(JSON.stringify(asset));
			// cloned = rfdc()(asset);
			var cloned = rfdc()(asset);
			return cloned;
		} catch (e) {
			GameComponent.prototype.log(`getAsset ${assetType} ${assetId} ${e}`);
		}
	},

	getAsset: function (assetType, assetId) {
		try {
			var asset = this.data[assetType][assetId];
			// return JSON.parse(JSON.stringify(asset));
			return asset;
		} catch (e) {
			GameComponent.prototype.log(`getAsset ${assetType} ${assetId} ${e}`);
		}
	},
	secondsToHms: function (seconds) {
		seconds = Number(seconds);
		var h = Math.floor(seconds / 3600);
		var m = Math.floor((seconds % 3600) / 60);
		var s = Math.floor((seconds % 3600) % 60);

		var hDisplay = h > 0 ? `${h}h ` : '';
		var mDisplay = m > 0 ? `${m}m ` : '';
		var sDisplay = s > 0 ? `${s}s` : '';
		return hDisplay + mDisplay + sDisplay;
	},

	// update dev console table w/ latest setValue data
	updateDevConsole: function (data) {
		var self = this;
		// if a developer is connected, send devLog of global variables only
		if (
			taro.isServer &&
			(taro.server.developerClientIds.length ||
				process.env.ENV === 'standalone' ||
				process.env.ENV == 'standalone-remote')
		) {
			// only show 'object' string if env variable is object
			if (typeof data.params.newValue == 'object') {
				if (data.params.newValue?._stats) {
					taro.game.devLogs[data.params.variableName] =
						`object (${data.params.newValue._category}): ${data.params.newValue._stats.name}`;
				} else {
					taro.game.devLogs[data.params.variableName] = 'object';
				}
			} else {
				// otherwise, show the actual value

				taro.game.devLogs[data.params.variableName] = data.params.newValue;
			}
		} else if (taro.isClient) {
			// update GS CPU graphs if data present
			if (data.status && data.status.cpu) {
				// cpu time spent in user code (ms) since last dev console update - may end up being greater than actual elapsed time if multiple CPU cores are performing work for this process
				if (data.status.cpu.user) {
					statsPanels.serverCpuUser?._serverCpuUserPanel?.update(data.status.cpu.user * 0.001, 1000);
				}
				// cpu time spent in system code (ms) since last dev console update
				if (data.status.cpu.system) {
					statsPanels.serverCpuSystem?._serverCpuSystemPanel?.update(data.status.cpu.system * 0.001, 1000);
				}
			}

			var totalAttrsCount = 0;
			for (variableName in data) {
				if (variableName !== 'status') {
					var div = $(`#variables-div div.col-sm-12[name='${variableName}']`);
					var newValue = data[variableName];
					if (div.length) {
						div.find('.setVariable-value').html(taro.clientSanitizer(newValue));
					} else {
						$('#variables-div').append(
							$('<div/>', {
								name: variableName,
								class: 'col-sm-12',
								style: 'font-size: 12px',
							})
								.append(
									$('<td/>', {
										html: variableName,
										style: 'color:yellow; padding-left: 10px',
									})
								)
								.append(
									$('<td/>', {
										class: 'setVariable-value text-left',
										html: taro.clientSanitizer(newValue),
										style: 'padding: 0px 10px 0px 10px',
									})
								)
						);
					}

					totalAttrsCount++;
				}
			}

			if (data.status != {} /*&& taro.physics.simulation && taro.physics.simulation.engine != 'CRASH'*/) {
				// if streaming entity count > 150 warn user
				if (
					data.status &&
					data.status.entityCount &&
					data.status.entityCount.streaming > 150 &&
					!self.streamingWarningShown
				) {
					$('#streaming-entity-warning').show();
					self.streamingWarningShown = true;
				}

				var innerHtml = '';

				innerHtml =
					`${
						'' +
						'<table class="table table-hover text-center" style="border:1px solid #eceeef">' +
						'<tr>' +
						'<th>Entity Count</th>' +
						'<th class="text-center">Server</th>' +
						'<th class="text-center">Client</th>' +
						'<th class="text-center">Server Bandwidth</th>' +
						'</tr>' +
						'<tr>' +
						'<td>Unit</td>' +
						'<td>'
					}${data.status.entityCount.unit}</td>` +
					`<td>${taro.$$('unit').length}</td>` +
					`<td>${data.status.bandwidth.unit}</td>` +
					'</tr>' +
					'<tr>' +
					'<td>Item</td>' +
					`<td>${data.status.entityCount.item}</td>` +
					`<td>${taro.$$('item').length}</td>` +
					`<td>${data.status.bandwidth.item}</td>` +
					'</tr>' +
					'<tr>' +
					'<td>Player</td>' +
					`<td>${data.status.entityCount.player}</td>` +
					`<td>${taro.$$('player').length}</td>` +
					`<td>${data.status.bandwidth.player}</td>` +
					'</tr>' +
					'<tr>' +
					'<td>Projectile</td>' +
					`<td>${data.status.entityCount.projectile}</td>` +
					`<td>${taro.$$('projectile').length}</td>` +
					`<td>${data.status.bandwidth.projectile}</td>` +
					'</tr>' +
					'<tr>' +
					'<td>Region</td>' +
					`<td>${data.status.entityCount.region}</td>` +
					`<td>${taro.$$('region').length}</td>` +
					`<td>${data.status.bandwidth.region}</td>` +
					'</tr>' +
					'<tr>' +
					'<td>Sensor</td>' +
					`<td>${data.status.entityCount.sensor}</td>` +
					`<td>${taro.$$('sensor').length}</td>` +
					`<td>${data.status.bandwidth.sensor}</td>` +
					'</tr>' +
					'<tr>' +
					'<th colspan= >Physics</th>' +
					`<th>${data.status.physics.engine}</th>` +
					`<th>${taro.physics.simulation ? taro.physics.simulation.engine : 'NONE'}</th>` +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Bodies</td>' +
					`<td>${data.status.physics.bodyCount}</td>` +
					`<td>${taro.physics.simulation && taro.physics.simulation._world ? taro.physics.simulation._world.m_bodyCount : ''}</td>` +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Joints</td>' +
					`<td>${data.status.physics.jointCount}</td>` +
					`<td>${taro.physics.simulation && taro.physics.simulation._world ? taro.physics.simulation._world.m_jointCount : ''}</td>` +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Contacts</td>' +
					`<td>${data.status.physics.contactCount}</td>` +
					`<td>${taro.physics.simulation && taro.physics.simulation._world ? taro.physics.simulation._world.m_contactCount : ''}</td>` +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Heap used</td>' +
					`<td>${data.status.heapUsed.toFixed(2)}</td>` +
					`<td>${window.performance.memory ? (window.performance.memory.usedJSHeapSize / 1000000).toFixed(2) : ''}</td>` +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Avg Step Duration(ms)</td>' +
					`<td>${data.status.physics.stepDuration}</td>` +
					`<td>${taro.physics.simulation && taro.physics.simulation._world ? taro.physics.simulation.avgPhysicsTickDuration.toFixed(2) : ''}</td>` +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Physics FPS</td>' +
					`<td>${data.status.physics.stepsPerSecond}</td>` +
					`<td>${taro.physics.simulation ? taro._physicsFPS : ''}</td>` +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<th colspan=3>Etc</th><th>Time Scale</th>' +
					'</tr>' +
					'<tr>' +
					'<td>Current Time</td>' +
					// + '<td>' + data.status.currentTime + '(' + (data.status.currentTime - this.prevServerTime) + ')' + '</td>'
					// + '<td>' + Math.floor(taro._currentTime) + '(' + (Math.floor(taro._currentTime) - this.prevClientTime) + ')' + '</td>'
					`<td>${data.status.currentTime}</td>` +
					`<td>${Math.floor(taro._currentTime)}(${Math.floor(taro._currentTime) - data.status.currentTime})</td>` +
					`<td>${taro.timeScale()}</td>` +
					'</tr>' +
					'<tr>' +
					'<td>Client Count</td>' +
					`<td>${data.status.clientCount}</td>` +
					'<td></td>' +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>entityUpdateQueue size</td>' +
					'<td></td>' +
					`<td>${Object.keys(taro.client.entityUpdateQueue).length}</td>` +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Total players created</td>' +
					`<td>${data.status.etc.totalPlayersCreated}</td>` +
					'<td></td>' +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Total units created</td>' +
					`<td>${data.status.etc.totalUnitsCreated}</td>` +
					'<td></td>' +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Total items created</td>' +
					`<td>${data.status.etc.totalItemsCreated}</td>` +
					'<td></td>' +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Total Bodies Created</td>' +
					`<td>${data.status.physics.totalBodiesCreated}</td>` +
					`<td>${taro.physics.simulation && taro.physics.simulation._world ? taro.physics.simulation.totalBodiesCreated : ''}</td>` +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>CPU Usage</td>' +
					`<td>${data.status.cpuDelta}</td>` +
					'<td></td>' +
					'<td></td>' +
					'</tr>' +
					'<tr>' +
					'<td>Last Snapshot Length</td>' +
					`<td>${data.status.lastSnapshotLength}</td>` +
					'<td></td>' +
					'<td></td>' +
					'</tr>' +
					'</table>';

				taro.script.param.prevServerTime = data.status.currentTime;
				taro.script.param.prevClientTime = Math.floor(taro._currentTime);

				$(taro.client.getCachedElementById('dev-status-content')).html(innerHtml);
				self.secondCount++;
			}
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = GameComponent;
}
