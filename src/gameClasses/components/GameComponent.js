var GameComponent = IgeEntity.extend({
	classId: 'GameComponent',
	componentId: 'game',

	init: function () {
		var self = this;

		this.units = {};
		this.players = {};
		this.items = {};
		this.food = {};
		this.joints = {};
		this.highlights = {};
		this.createdEntities = [];
		this.gameOverModalIsShowing = false;
		this.isGameStarted = false;
	},

	start: function () {
		var self = this;
		GameComponent.prototype.log('Game component started');
		if (ige.isServer) {
			ige.chat.createRoom('lobby', {}, '1');

			// by default, create 5 computer players
			var aiCount = 10;
			// if (global.isDev) {
			// 	var aiCount = 50 // create 50 ai players if dev env
			// }

			for (var i = 1; i <= aiCount; i++) {
				this[`computer${i}`] = this.createPlayer({
					name: `AI ${i}`,
					controlledBy: 'computer',
					unitIds: [] // all units owned by player
				});

				// GameComponent.prototype.log("computerPlayer created " + this['computer' + i].id())
				// if (global.isDev) {
				// 	ige.trigger.fire("playerJoinsGame", { playerId: this['computer'+i].id() })
				// }
			}
			ige.trigger.fire('gameStart');
		} else if (ige.isClient) {
			// determine which attribute will be used for scoreboard
			var attr = 'points';
			if (
				ige.game.data.settings &&
        ige.game.data.settings.constants &&
        ige.game.data.settings.constants.currency != undefined
			) {
				attr = ige.game.data.settings.constants.currency;
			}
			$('.game-currency').html(attr);
		}

		self.isGameStarted = true;
		ige.timer.startGameClock();
	},

	createPlayer: function (data, persistedData) {
		var self = this;

		/* removing unnecessary purchases keys */
		var purchases = [];
		if (data.purchasables) {
			for (var i = 0; i < data.purchasables.length; i++) {
				var purchasable = data.purchasables[i];
				purchasable = _.pick(purchasable, ['_id', 'image', 'owner', 'target']);
				purchases.push(purchasable);
			}
		}

		var playerData = {
			controlledBy: data.controlledBy,
			name: data.name,
			coins: data.coins,
			points: data.points || 0,
			clientId: data.clientId,
			purchasables: purchases,
			attributes: data.attributes,
			highscore: data.highscore,
			lastPlayed: data.lastPlayed,
			userId: data._id,
			isAdBlockEnabled: data.isAdBlockEnabled,
			unitIds: [], // all units owned by player,
			jointsOn: Date.now(), // use for calculating session,
			totalTime: data.totalTime,
			// ipAddress: data.ipAddress,
			email: data.email,
			isEmailVerified: data.isEmailVerified,
			banChat: data.banChat,
			mutedUsers: data.mutedUsers,
			isUserVerified: data.isUserVerified
		};

		var player = new Player(playerData);

		if (ige.isServer) {
			var logInfo = {
				name: playerData.name,
				clientId: playerData.clientId
			};

			if (playerData.userId) {
				logInfo.userId = playerData.userId;
			}

			// console.log(playerData.clientId + ': creating player for ', logInfo)
		}

		if (persistedData) {
			player.persistedData = persistedData;
		}

		if (ige.isServer) {
			ige.gameText.sendLatestText(data.clientId); // send latest ui information to the client
			// ige.shopkeeper.updateShopInventory(ige.shopkeeper.inventory, data.clientId) // send latest ui information to the client

			var isOwner = ige.server.owner == data._id;
			var isInvitedUser = false;
			if (ige.game.data.defaultData && ige.game.data.defaultData.invitedUsers) {
				isInvitedUser = ige.game.data.defaultData.invitedUsers.includes(
					data._id
				);
			}
			var isUserAdmin = false;
			var isUserMod = false;
			if (data.permissions) {
				isUserAdmin = data.permissions.includes('admin');
				isUserMod = data.permissions.includes('mod');
			}
			player._stats.isUserAdmin = isUserAdmin;
			player._stats.isUserMod = isUserMod;
			// if User/Admin has access to game then show developer logs
			if (isOwner || isInvitedUser || isUserAdmin) {
				GameComponent.prototype.log(`owner connected. _id: ${data._id}`);
				ige.server.developerClientId = data.clientId;
			}
		}

		return player;
	},

	// get client with ip
	getPlayerByIp: function (ip, currentUserId, all = false) {
		var clientIds = [];
		for (let clientId in ige.server.clients) {
			const clientObj = ige.server.clients[clientId];

			if (clientObj.ip === ip) {
				clientIds.push(clientId);
				if (!all) {
					break;
				}
			}
		}

		if (clientIds.length > 0) {
			var method = all ? 'filter' : 'find';
			return ige.$$('player')[method](player => {
				// var clientId = player && player._stats && player._stats.clientId;
				// added currentUserId check to confirm it is logged in user and not add-instance bot.
				return (
					player._stats &&
          clientIds.includes(player._stats.clientId) &&
          (all || (currentUserId && player._stats.userId != currentUserId))
				);
			});
		}
	},

	// not in use;
	getUnitsByClientId: function (clientId) {
		return ige
			.$$('unit')
			.filter(function (unit) {
				return unit._stats && unit._stats.clientId == clientId;
			})
			.reduce(function (partialUnits, unit) {
				partialUnits[unit._id] = unit;
				return partialUnits;
			}, {});
	},

	getPlayerByUserId: function (userId) {
		return ige.$$('player').find(function (player) {
			return player._stats && player._stats.userId == userId;
		});
	},

	getPlayerByClientId: function (clientId) {
		return ige.$$('player').find(function (player) {
			return player._stats && player._stats.controlledBy != 'computer' && player._stats.clientId == clientId;
		});
	},

	getAsset: function (assetType, assetId) {
		try {
			var asset = this.data[assetType][assetId];
			return JSON.parse(JSON.stringify(asset));
		} catch (e) {
			GameComponent.prototype.log(
				`getAsset ${assetType} ${assetId} ${e}`
			);
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
	}
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = GameComponent;
}
