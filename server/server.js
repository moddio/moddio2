const express = require('express');
const helmet = require('helmet');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const cluster = require('cluster');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const currency = require('currency.js');

// global imports
_ = require('lodash');
rfdc = require('rfdc');
jsonrepair = require('jsonrepair');

const Console = console.constructor;
// redirect global console object to log file

function logfile(file) {
	var con = new Console(fs.createWriteStream(file));
	Object.keys(Console.prototype).forEach(function (name) {
		console[name] = function () {
			con[name].apply(con, arguments);
		};
	});
}

module.exports = logfile;

Error.stackTraceLimit = Infinity; // debug console.trace() to infinite lines

// override console.log and error to print additional data
console.basicLog = console.log;
if (process.env.ENV != 'dev' && process.env.ENV != 'standalone') {
	console.log = function () {
		const log = [];

		log.push(new Date());
		log.push(cluster.isPrimary ? 'master' : 'worker');

		if (taro?.server?.httpsPort) {
			log.push(taro?.server?.httpsPort);
		}

		if (taro?.game?.data?.defaultData?.gameSlug) {
			log.push(taro?.game?.data?.defaultData?.gameSlug);
		}

		log.push(...arguments);

		console.basicLog(...log);
	};
}

console.basicError = console.error;
console.error = function () {
	const log = [];

	log.push(new Date());
	log.push(cluster.isPrimary ? 'master' : 'worker');

	if (taro?.server?.httpsPort) {
		log.push(taro?.server?.httpsPort);
	}

	if (taro?.game?.data?.defaultData?.gameSlug) {
		log.push(taro?.game?.data?.defaultData?.gameSlug);
	}

	log.push(...arguments);

	console.basicError(...log);
};

global.coinHelper = {
	value: (x) => currency(x).value,
	add: (x, y) => currency(x).add(y).value,
	subtract: (x, y) => currency(x).subtract(y).value,
	multiply: (x, y) => currency(x).multiply(y).value,
	divide: (x, y) => currency(x).divide(y).value,
};

process.on('exit', function () {
	console.log('process exit called.');
	taro.workerComponent && taro.workerComponent.preKillServerHandler('crashed', 'crash');
	taro.workerComponent && taro.workerComponent.sendRollbarCrashData(global.lastRollbarUuid);
	console.trace();
});

var Server = TaroClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;

		self.gameServerPort = process.env.PORT || 2001;
		self.buildNumber = 466;
		self.request = require('request');
		self.status = 'stopped';
		self.totalUnitsCreated = 0;
		self.totalWallsCreated = 0;
		self.totalItemsCreated = 0;
		self.totalPlayersCreated = 0;
		self.totalProjectilesCreated = 0;
		self.postReqTimestamps = [];
		self.saveDataTimestamps = [];
		self.startedAt = new Date();
		self.lastSnapshot = [];
		self.CONNECTION_JWT_EXPIRES_IN = 5 * 60 * 60 * 1000; // token expires in 5 hours
		self.usedConnectionJwts = {}; // these jwts used for gs connection verification, stored in memory to prevent a token being used multiple times
		self.COIN_JWT_EXPIRES_IN = 15 * 1000; // token expires in 15 seconds
		self.usedCoinJwts = {}; // these jwts used for coin transaction, stored in memory to prevent a token being used multiple times
		self.usedAdRewardJwts = {};
		self.AD_REWARD_JWT_EXPIRES_IN = 5 * 60 * 1000; // token expires in 5 minutes
		self.logTriggers = {};
		self.developerClientIds = [];
		self.userAdStats = {};

		taro.env = process.env.ENV || 'production';

		self.tier = (cluster.isPrimary ? process.env.TIER : process.env.WORKER_TIER || process.env.TIER) || 2;

		self.region = process.env.REGION || 'apocalypse';
		self.isScriptLogOn = process.env.SCRIPTLOG == 'on';
		self.gameLoaded = false;
		self.coinUpdate = {};

		self.rejoiningIdleClients = [];
		self._idleDisconnectedClientIds = {};

		self.socketConnectionCount = {
			connected: 0,
			disconnected: 0,
			immediatelyDisconnected: 0,
		};

		self.serverStartTime = new Date(); // record start time

		self.bandwidthUsage = {
			unit: 0,
			item: 0,
			player: 0,
			projectile: 0,
			region: 0,
			sensor: 0,
		};

		self.serverStartTime = new Date(); // record start time
		global.isDev =
			taro.env == 'dev' || taro.env == 'local' || taro.env === 'standalone' || taro.env === 'standalone-remote';
		global.myIp = process.env.IP;

		console.log('environment', taro.env);
		console.log('isDev =', global.isDev);

		self.internalPingCount = 0;

		taro.debugEnabled(global.isDev);

		var rateLimiterOptions = {
			points: 20, // 6 points
			duration: 60, // Per second
		};
		taro.rateLimiter = new RateLimiterMemory(rateLimiterOptions);

		self.keysToRemoveBeforeSend = [
			'abilities',
			'animations',
			'bodies',
			'body',
			'cellSheet',
			'defaultData.rotation',
			'defaultData.translate',
			'buffTypes',
			'bonus',
			'bulletStartPosition',
			'canBePurchasedBy',
			'carriedBy',
			'damage',
			'description',
			'handle',
			'hits',
			'inventoryImage',
			'isGun',
			'isStackable',
			'maxQuantity',
			'texture',
			'sound',
			'states',
			'frames',
			'inventorySize',
			'particles',
			'price',
			'skin',
			'variables',
			'canBuyItem',
			'canBePurchasedBy',
			'inventoryImage',
			'isPurchasable',
			'oldState',
			'raycastCollidesWith',
			'effects',
			'defaultProjectile',
			'currentBody',
			'penetration',
			'bulletDistance',
			'bulletType',
			'ammoSize',
			'ammo',
			'ammoTotal',
			'reloadRate',
			'recoilForce',
			'fireRate',
			'knockbackForce',
			'canBeUsedBy',
			'spawnChance',
			'consumeBonus',
			'isConsumedImmediately',
			'lifeSpan',
			'removeWhenEmpty',
			'spawnPosition',
			'baseSpeed',
			'bonusSpeed',
			'flip',
			'fadingTextQueue',
			'points',
			'highscore',
			'jointsOn',
			'totalTime',
			'email',
			'isEmailVerified',
			'isUserAdmin',
			'isUserMod',
			'newHighscore',
			'streamedOn',
			'controls',
		];

		// for debugging reasons
		global.isServer = taro.isServer;

		if (cluster.isPrimary) {
			if (process.env.ENV === 'standalone') {
				if (process.env.LOAD_CC === 'true') {
					taro.addComponent(WorkerComponent); // backend component will retrieve "start" command from BE
				}

				self.ip = '127.0.0.1';
				self.startWebServer();
				self.start();
				self.startGame();
			} else if (typeof MasterComponent != 'undefined') {
				taro.addComponent(MasterServerComponent);
				taro.addComponent(MasterComponent);
			}

			// Include ProxyComponent to master cluster
			if (typeof ProxyComponent !== 'undefined') {
				taro.addComponent(ProxyComponent);
			}
			if (typeof HttpComponent != 'undefined') {
				taro.addComponent(HttpComponent);
			}
		} else {
			if (typeof WorkerComponent != 'undefined') {
				taro.addComponent(WorkerComponent); // backend component will retrieve "start" command from BE
			}
			self.start();
		}
	},

	// start server
	start: function () {
		var self = this;

		if (self.gameLoaded) {
			console.log('Warning: Game already loaded in this server!!');
			return;
		}

		// Add the server-side game methods / event handlers
		this.implement(ServerNetworkEvents);
		taro.addComponent(TaroNetIoComponent);
	},

	startWebServer: function () {
		const app = express();
		const port = process.env.PORT || 80;

		app.use(bodyParser.urlencoded({ extended: false }));
		// parse application/json
		app.use(bodyParser.json());

		app.set('view engine', 'ejs');
		app.set('views', path.resolve('src'));
		app.use('/engine', express.static(path.resolve('./engine/')));

		// Frameguard protects the site from clickjacking
		app.use(helmet.frameguard({ action: 'DENY' }));

		const FILES_TO_CACHE = ['stats.js', 'dat.gui.min.js', 'msgpack.min.js'];
		const SECONDS_IN_A_WEEK = 7 * 24 * 60 * 60;
		app.get('/src/game.json', (req, res, next) => {
			res.send(global.gameJson);
		});
		app.use(
			'/src',
			express.static(path.resolve('./src/'), {
				setHeaders: (res, path, stat) => {
					let shouldCache = FILES_TO_CACHE.some((filename) => path.endsWith(filename));

					// cache minified file
					shouldCache = shouldCache || path.endsWith('.min.js');

					if (shouldCache) {
						res.set('Cache-Control', `public, max-age=${SECONDS_IN_A_WEEK}`);
					}
				},
			})
		);

		app.use('/assets', express.static(path.resolve('./assets/'), { cacheControl: 7 * 24 * 60 * 60 * 1000 }));

		// dependencies (e.g. Phaser)
		app.use('/node_modules', express.static(path.resolve('./node_modules/')));

		if (global.isDev) {
			// needed for source maps
			app.use('/ts', express.static(path.resolve('./ts/')));
		}

		app.get('/', (req, res) => {
			const token = Math.random().toString(36).substring(2, 14); // random token for standalone
			const guestUserToken = Math.random().toString(36).substring(2, 14); // random token for standalone
			if (taro.game === undefined) {
				console.error('please select one game.json first');
				res.send('please select one game.json first');
				return;
			}
			const videoChatEnabled =
				taro.game.data && taro.game.data.defaultData && taro.game.data.defaultData.enableVideoChat
					? taro.game.data.defaultData.enableVideoChat
					: false;
			const game = {
				_id: global.standaloneGame.defaultData._id,
				title: global.standaloneGame.defaultData.title,
				tier: global.standaloneGame.defaultData.tier,
				gameSlug: global.standaloneGame.defaultData.gameSlug,
				videoChatEnabled: videoChatEnabled,
			};

			const options = {
				isAuthenticated: false,
				env: process.env.ENV,
				gameId: game._id,
				user: {},
				isOpenedFromIframe: false,
				gameSlug: game.gameSlug,
				referAccessDenied: true,
				ads: false,
				showSideBar: false,
				gameDetails: {
					name: game.title,
					tier: game.tier,
					gameSlug: game.gameSlug,
					videoChatEnabled: game.videoChatEnabled,
				},
				highScores: null,
				hostedGames: null,
				currentUserScore: null,
				err: undefined,
				selectedServer: null,
				servers: [
					{
						ip: '127.0.0.1',
						port: 2001,
						playerCount: 0,
						maxPlayers: 32,
						acceptingPlayers: true,
					},
				],
				createdBy: '',
				menudiv: false,
				gameTitle: game.title,
				currentUserPresentInHighscore: false,
				discordLink: null,
				facebookLink: null,
				twitterLink: null,
				youtubeLink: null,
				androidLink: null,
				iosLink: null,
				share: {
					url: '',
				},
				domain: req.get('host'),
				version: Math.floor(Math.random() * 10000000 + 1),
				constants: {
					appName: 'Modd.io   ',
					appUrl: 'http://www.modd.io/',
					noAds: true,
					assetsProvider: '',
				},
				purchasables: null,
				timers: {
					smallChest: 0,
					bigChest: 0,
				},
				analyticsUrl: '/',
				token,
				guestUserToken,
			};

			return res.render('index.ejs', options);
		});
		app.listen(port, () => console.log(`Express listening on port ${port}!`));
	},

	// run a specific game in this server
	startGame: function (gameJson, additionalData) {
		console.log('taro.server.startGame()');
		var self = this;

		if (self.gameLoaded) {
			console.log('Warning: Game already loaded in this server!!');
			return;
		}

		this.socket = {};

		this.duplicateIpCount = {};

		self.maxPlayers = self.maxPlayers || 32;
		this.maxPlayersAllowed = self.maxPlayers || 32;

		console.log('maxPlayersAllowed', this.maxPlayersAllowed);

		// Define an object to hold references to our player entities
		this.clients = {};

		// Add the networking component
		taro.network.debug(self.isDebugging);
		// Start the network server
		taro.network.start(self.port, function (data) {
			var promise;

			if (gameJson) {
				promise = Promise.resolve(gameJson);
			} else if (taro.server.gameId && taro.env !== 'standalone' && taro.workerComponent) {
				promise = taro.workerComponent.loadGameJSON();
			} else {
				const inquirer = require('inquirer');
				const jsonPath = `${__dirname}/../src/`;
				promise = new Promise(function (resolve, reject) {
					fs.readdir(jsonPath, async (err, files) => {
						if (err) {
							console.error('Error reading directory:', err);
							return;
						}

						const jsonFiles = files.filter((file) => file.endsWith('.json'));

						const readGameFileSync = (fileName) => {
							taro.gameName = fileName;
							return fs.readFileSync(jsonPath + fileName);
						};

						const loadGameFile = async () => {
							return new Promise((resolveGame) => {
								let envGameFile = process.env.GAME ?? '';

								if (!envGameFile.includes('.json')) {
									envGameFile += '.json';
								}

								if (jsonFiles.includes(envGameFile)) {
									resolveGame(readGameFileSync(envGameFile));
									return 'test';
								}

								if (jsonFiles.length === 1) {
									const fileName = jsonFiles[0];
									resolveGame(readGameFileSync(fileName));
									return;
								}

								const choices = jsonFiles.map((file) => ({ name: file, value: file }));
								inquirer
									.prompt([
										{
											type: 'list',
											name: 'selectedFile',
											message: 'Select a JSON file:',
											choices: choices,
										},
									])
									.then((answers) => {
										resolveGame(readGameFileSync(answers.selectedFile));
									});
							});
						};

						var game = await loadGameFile();
						global.gameJson = game;
						game = JSON.parse(game);
						game.defaultData = game;

						var data = { data: {} };
						for (let [key, value] of Object.entries(game)) {
							data.data[key] = value;
						}
						for (let [key, value] of Object.entries(game.data)) {
							data.data[key] = value;
						}
						if (game && game.data && game.data.defaultData && game.data.defaultData._id) {
							self.gameId = game.data.defaultData._id;
						}
						resolve(data);
					});
				});
			}

			taro.mergeGameJson = mergeGameJson;
			taro.tierFeaturesToggle = tierFeaturesToggle;

			promise
				.then((game) => {
					if (game?.gameJson && game?.worldJson) {
						game = taro.mergeGameJson(game?.worldJson, game?.gameJson);
					} else {
						game = game?.gameJson ? game.gameJson : game;
					}

					taro.addComponent(GameTextComponent);
					taro.addComponent(GameComponent);
					taro.addComponent(ProfilerComponent);

					self.gameStartedAt = new Date();

					taro.defaultVariables = rfdc()(game.data.variables);
					taro.game.data = game.data;

					if (additionalData) {
						taro.game.data = {
							...taro.game.data,
							...additionalData,
						};
					}

					taro.gameInfo = {
						title: taro.game.data.defaultData.title,
						_id: taro.game.data.defaultData._id,
						tier: taro.game.data.defaultData.tier,
						ownerId: taro.game.data.defaultData.owner?._id || taro.game.data.defaultData.owner,
						ownerName: taro.game.data.defaultData.owner?.local?.username,
						physicsEngine: taro.game.data.defaultData.physicsEngine,
						gameSlug: taro.game.data.defaultData.gameSlug,
					};

					global.standaloneGame = game.data;
					var baseTilesize = 64;

					// I'm assuming that both tilewidth and tileheight have same value
					// tilesize ratio is ratio of base tile size over tilesize of current map
					var tilesizeRatio = baseTilesize / game.data.map.tilewidth;

					// Add physics and setup physics world
					// use callback here is bc the box2dwasm needs time to init
					const loadRest = () => {
						if (taro.physics.gravity) {
							taro.physics.sleep(true);
							taro.physics.tilesizeRatio(tilesizeRatio);
							if (game.data.settings) {
								var gravity = game.data.settings.gravity;
								if (gravity) {
									// console.log('setting gravity', gravity);
									taro.physics.gravity(gravity.x, gravity.y);
								}
							}
							taro.physics.setContinuousPhysics(!!game?.data?.settings?.continuousPhysics);
							taro.physics.createWorld();
							taro.physics.start();
							taro.raycaster = new Raycaster();
							taro.developerMode = new DeveloperMode();

							// console.log("game data", game)
							// mapComponent needs to be inside TaroStreamComponent, because debris' are created and streaming is enabled which requires TaroStreamComponent
							console.log('initializing components');

							taro.network.on('connect', self._onClientConnect);
							taro.network.on('disconnect', self._onClientDisconnect);
							// Networking has started so start the game engine
							taro.start(function (success) {
								// Check if the engine started successfully
								if (success) {
									console.log('TaroNetIoComponent started successfully');

									self.defineNetworkEvents();
									// console.log("game data", taro.game.data.settings)

									// Add the network stream component
									taro.network.addComponent(TaroStreamComponent).stream.start(); // Start the stream

									// Accept incoming network connections
									taro.network.acceptConnections(true);

									taro.addGraph('TaroBaseScene');

									taro.addComponent(MapComponent);
									taro.addComponent(ShopComponent);
									taro.addComponent(TaroChatComponent);
									taro.addComponent(ItemComponent);
									taro.addComponent(TimerComponent);

									taro.addComponent(AdComponent);
									taro.addComponent(SoundComponent);
									taro.addComponent(RegionManager);

									taro.addComponent(StatusComponent);

									if (taro.game.data.defaultData.enableVideoChat) {
										taro.addComponent(VideoChatComponent);
									}

									let map = taro.scaleMap(rfdc()(taro.game.data.map));
									taro.map.load(map);

									taro.game.start();

									setInterval(function () {
										var copyCount = Object.assign({}, self.socketConnectionCount);
										self.socketConnectionCount = {
											connected: 0,
											disconnected: 0,
											immediatelyDisconnected: 0,
										};

										taro.workerComponent && taro.workerComponent.recordSocketConnections(copyCount);
									}, 900000);
								}
							});
						}
					};

					taro.addComponent(PhysicsComponent, undefined, loadRest);
				})
				.catch((err) => {
					console.log('got error while loading game json', err);
					taro.workerComponent && taro.workerComponent.kill('got error while loading game json');
				});
		});
	},

	defineNetworkEvents: function () {
		var self = this;

		console.log('server.js: defineNetworkEvents');
		taro.network.define('joinGame', self._onJoinGame);
		taro.network.define('gameOver', self._onGameOver);
		taro.network.define('ping', self._onPing);
		taro.network.define('sendPlayerToMap', self._onSomeBullshit);
		taro.network.define('sendPlayerToGame', self._onSomeBullshit);

		taro.network.define('playerUnitMoved', self._onPlayerUnitMoved);
		taro.network.define('playerKeyDown', self._onPlayerKeyDown);
		taro.network.define('playerKeyUp', self._onPlayerKeyUp);
		taro.network.define('playerMouseMoved', self._onPlayerMouseMoved);
		taro.network.define('playerCustomInput', self._onPlayerCustomInput);
		taro.network.define('sendDataFromClient', self._onSendDataFromClient);
		taro.network.define('playerAbsoluteAngle', self._onPlayerAbsoluteAngle);
		taro.network.define('playerDialogueSubmit', self._onPlayerDialogueSubmit);
		taro.network.define('htmlUiClick', self._onHtmlUiClick);
		taro.network.define('playerClickTradeOption', self._onPlayerClickTradeOption);
		taro.network.define('dropItemToCanvas', self._onDropItemToCanvas);

		taro.network.define('buyItem', self._onBuyItem);
		taro.network.define('buyUnit', self._onBuyUnit);
		taro.network.define('buySkin', self._onBuySkin);

		taro.network.define('equipSkin', self._onEquipSkin);
		taro.network.define('unEquipSkin', self._onUnEquipSkin);

		taro.network.define('swapInventory', self._onSwapInventory);

		taro.network.define('playAdCallback', self._onPlayAdCallback);

		// bullshit that's necessary for sending data to client
		taro.network.define('makePlayerCameraTrackUnit', self._onSomeBullshit);
		taro.network.define('changePlayerCameraPanSpeed', self._onSomeBullshit);
		taro.network.define('sendDataFromServer', self._onSomeBullshit);

		taro.network.define('hideUnitFromPlayer', self._onSomeBullshit);
		taro.network.define('showUnitFromPlayer', self._onSomeBullshit);
		taro.network.define('hideUnitNameLabelFromPlayer', self._onSomeBullshit);
		taro.network.define('showUnitNameLabelFromPlayer', self._onSomeBullshit);

		taro.network.define('createPlayer', self._onSomeBullshit);
		taro.network.define('updateUiText', self._onSomeBullshit);
		taro.network.define('updateUiTextForTime', self._onSomeBullshit);
		taro.network.define('updateUiRealtimeCSS', self._onSomeBullshit);
		taro.network.define('alertHighscore', self._onSomeBullshit);
		taro.network.define('addShopItem', self._onSomeBullshit);
		taro.network.define('removeShopItem', self._onSomeBullshit);
		taro.network.define('gameState', self._onSomeBullshit);

		// taro.network.define('updateEntity', self._onSomeBullshit);
		taro.network.define('updateEntityAttribute', self._onSomeBullshit);
		taro.network.define('streamUpdateData', self._onSomeBullshit);
		taro.network.define('itemHold', self._onSomeBullshit);
		taro.network.define('item', self._onSomeBullshit);
		taro.network.define('clientConnect', self._onSomeBullshit);
		taro.network.define('clientDisconnect', self._onSomeBullshit);
		taro.network.define('killStreakMessage', self._onSomeBullshit);
		taro.network.define('insertItem', self._onSomeBullshit);
		taro.network.define('playAd', self._onSomeBullshit);
		taro.network.define('ui', self._onSomeBullshit);
		taro.network.define('updateShopInventory', self._onSomeBullshit);
		taro.network.define('errorLogs', self._onSomeBullshit);
		taro.network.define('devLogs', self._onSomeBullshit);
		taro.network.define('profile', self._onSomeBullshit);
		taro.network.define('sound', self._onSomeBullshit);
		taro.network.define('particle', self._onSomeBullshit);
		taro.network.define('camera', self._onSomeBullshit);
		taro.network.define('videoChat', self._onSomeBullshit);

		taro.network.define('gameSuggestion', self._onSomeBullshit);
		taro.network.define('minimap', self._onSomeBullshit);

		taro.network.define('createFloatingText', self._onSomeBullshit);
		taro.network.define('createDynamicFloatingText', self._onSomeBullshit);

		taro.network.define('openShop', self._onSomeBullshit);
		taro.network.define('openDialogue', self._onSomeBullshit);
		taro.network.define('closeDialogue', self._onSomeBullshit);
		taro.network.define('userJoinedGame', self._onSomeBullshit);

		taro.network.define('runProfiler', self._onRunProfiler);
		taro.network.define('kick', self._onKick);
		taro.network.define('ban-user', self._onBanUser);
		taro.network.define('ban-ip', self._onBanIp);
		taro.network.define('ban-chat', self._onBanChat);

		taro.network.define('trade', self._onTrade);
		taro.network.define('editTile', self._onEditTile);
		taro.network.define('changeLayerOpacity', self._onChangeLayerOpacity);
		taro.network.define('editRegion', self._onEditRegion);
		taro.network.define('editVariable', self._onEditVariable);
		taro.network.define('editInitEntity', self._onEditInitEntity);
		taro.network.define('editGlobalScripts', self._onEditGlobalScripts);
		taro.network.define('updateClientInitEntities', self._onRequestInitEntities);
		taro.network.define('editEntity', self._onEditEntity);
		taro.network.define('updateUnit', self._onUpdateUnit);
		taro.network.define('updateItem', this._onUpdateItem);
		taro.network.define('updateProjectile', this._onUpdateProjectile);
		taro.network.define('updateShop', this._onUpdateShop);
		taro.network.define('updateDialogue', this._onUpdateDialogue);
		taro.network.define('updateDevelopersData', this._onUpdateDevelopersData);

		taro.network.define('recordSocketMsgs', this._onRecordSocketMsgs);
		taro.network.define('getSocketMsgs', this._onGetSocketMsgs);
		taro.network.define('stopRecordSocketMsgs', this._onStopRecordSocketMsgs);
		taro.network.define('renderSocketLogs', this._onSomeBullshit);
	},

	unpublish: function (msg) {
		console.log('unpublishing...');
		if (taro.workerComponent) {
			taro.workerComponent.unpublish(msg);
		}

		process.exit(0);
	},

	saveLastPlayedTime: function (data) {
		console.log('temp', data);
	},

	kill: function (log) {
		if (taro.workerComponent && taro.workerComponent.markedAsKilled) {
			return;
		}

		// send a message to master cluster
		if (taro.env != 'dev' && process && process.send) {
			process.send({ chat: 'kill server called' });
		}
		// taro.workerComponent.disconnect();

		taro.workerComponent && taro.workerComponent.kill(log);
	},

	// get client with _id from BE
	getClientByUserId: function (_id) {
		var self = this;

		for (i in taro.server.clients) {
			if (taro.server.clients[i]._id == _id || taro.server.clients[i].guestUserId == _id) {
				return taro.server.clients[i];
			}
		}
	},

	sendCoinsToPlayer: function (userId, coins, deductFeeFromOwnerBalance = false) {
		coins = Math.floor(coins);
		if (userId && coins) {
			taro.workerComponent &&
				taro.workerComponent.sendCoinsToPlayer({
					creatorId: taro.game.data.defaultData.owner,
					userId,
					coins,
					game: taro.game.data.defaultData._id,
					deductFeeFromOwnerBalance,
				});
		}
	},

	sendCoinsToPlayerCallback: function (body) {
		if (body) {
			if (body.status === 'success') {
				if (body.message && body.message.userId && body.message.creatorId) {
					const { updatedCoinsCreator, updatedCoinsPlayer, creatorId, userId } = body.message;

					var creator = taro.$$('player').find(function (player) {
						return player && player._stats && player._stats.userId == creatorId;
					});

					if (creator) {
						creator.streamUpdateData([{ coins: updatedCoinsCreator }]);
					}

					var player = taro.$$('player').find(function (player) {
						return player && player._stats && player._stats.userId == userId;
					});

					if (player) {
						taro.script.trigger('sendCoinsSuccess', { playerId: player.id() });
						player.streamUpdateData([{ coins: updatedCoinsPlayer }]);
					}
				}
			}
			if (body.status === 'error') {
				console.log('error in sending coins');

				if (!body.reason || !body.message) {
					return;
				}

				const reason = body.reason;

				const { creatorId, userId } = body.message;

				let player = taro.$$('player').find(function (player) {
					return player && player._stats && player._stats.userId == userId;
				});

				if (!player) {
					return;
				}

				switch (reason) {
					case 'insufficient creator coins':
						taro.script.trigger('coinSendFailureDueToInsufficientCoins', { playerId: player.id() });
						break;
					case 'daily coin transfer limit exceeded':
						taro.script.trigger('coinSendFailureDueToDailyLimit', { playerId: player.id() });
						break;
					default:
						break;
				}
			}
		}
	},

	consumeCoinFromUser: function (player, coins, boughtItemId) {
		var self = this;
		coins = Math.floor(coins);
		if (player && coins && taro.tierFeaturesToggle[taro.game.data.defaultData.tier || '1'].coinItemPurchase) {
			if (taro.game.data.defaultData.owner != player._stats.userId) {
				if (!self.coinUpdate[player._stats.clientId]) {
					self.coinUpdate[player._stats.clientId] = {
						creatorId: taro.game.data.defaultData.owner,
						userId: player._stats.userId,
						coins: coins,
						game: taro.game.data.defaultData._id,
						boughtItems: [],
					};
				} else {
					self.coinUpdate[player._stats.clientId].coins = global.coinHelper.add(
						self.coinUpdate[player._stats.clientId].coins,
						coins
					);
				}
				if (self.coinUpdate[player._stats.clientId].boughtItems) {
					self.coinUpdate[player._stats.clientId].boughtItems.push({
						itemId: boughtItemId,
						date: new Date(),
						userId: player._stats.userId,
					});
				}
			} else {
				// console.log('You are the owner');
			}
		}

		if (Object.keys(self.coinUpdate || {}).length > 0) {
			taro.workerComponent && taro.workerComponent.consumeCoinFromUser(self.coinUpdate);
			self.coinUpdate = {};
		}
	},

	postConsumeCoinsForUsersCallback: function (body) {
		var self = this;
		if (body) {
			if (body.status === 'success') {
				if (body.message && body.message.length > 0) {
					body.message.forEach(function (updatedCoinsValue) {
						var foundPlayer = taro.$$('player').find(function (player) {
							return player && player._stats && player._stats.clientId == updatedCoinsValue.clientId;
						});
						if (foundPlayer) {
							foundPlayer.streamUpdateData([{ coins: updatedCoinsValue.coinsLeft }]);
						}
					});
				}
			}
			if (body.status === 'error') {
				console.log('error in buying item');
			}
		}
	},

	creditAdRewardToOwner: function (status, clientId) {
		if (status && clientId) {
			try {
				var player = taro.game.getPlayerByClientId(clientId);

				taro.workerComponent &&
					taro.workerComponent.creditAdRewardToOwner({
						creatorId: taro.game.data.defaultData.owner,
						game: taro.game.data.defaultData._id,
						userId: player._stats.userId,
						clientId,
						status: status,
					});
			} catch (e) {
				console.log('creditAdRewardToOwner', e.message);
			}
		}
	},

	creditAdRewardToOwnerCallback: function (body) {
		if (body) {
			if (body.status === 'success') {
				if (body.message && body.message.userId && body.message.creatorId) {
					const { updatedCoinsCreator, creatorId } = body.message;

					var creator = taro.$$('player').find(function (player) {
						return player && player._stats && player._stats.userId == creatorId;
					});
					if (creator) {
						creator.streamUpdateData([{ coins: updatedCoinsCreator }]);
					}
				}
			}
			if (body.status === 'error') {
				console.log('error in crediting ad-reward coins');
			}
		}
	},

	updateTempMute: function ({ player, banChat }) {
		if (player && player._stats.banChat !== banChat) {
			player.streamUpdateData([{ banChat: banChat }]);

			if (player._stats.userId && taro.workerComponent) {
				taro.workerComponent.updateTempMute({
					banChat: banChat,
					userId: player._stats.userId,
				});
			}
		}
	},

	addServerLog: function (type, reason) {
		taro.workerComponent &&
			taro.workerComponent.addServerLog({
				type,
				reason,
			});
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Server;
}
