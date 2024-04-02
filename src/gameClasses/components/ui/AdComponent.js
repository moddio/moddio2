var AdComponent = TaroEntity.extend({
	classId: 'AdComponent',
	componentId: 'ad',

	init: function () {
		if (taro.isClient && window.adsAllowed) {
			$('body').append(
				$('<div/>', {
					id: 'preroll',
					style: 'z-index:40000; display: none',
					class: 'absolute-center',
				})
			);
			this.initAdPlayer();
		}
		this.lastPlayedAd = null;
		this.token = null;
	},

	initAdPlayer: function () {
		var self = this;
		if (taro.isClient) {
			window.aiptag.cmd.player.push(function () {
				window.aiptag.adplayer = new aipPlayer({
					AD_WIDTH: 960,
					AD_HEIGHT: 540,
					AD_FULLSCREEN: false,
					AD_CENTERPLAYER: false,
					LOADING_TEXT: 'loading advertisement',
					PREROLL_ELEM: function () {
						return document.getElementById('preroll');
					},
					AIP_COMPLETE: function (type) {
						self.prerollEventHandler(type);
					},
					AIP_REMOVE: function () {
						// hide ad container, no actions needed
					},
				});
			});
		}
	},

	playAd: async function (data, clientId) {
		var socket = taro.network._socketById[clientId];
		const distinctId = socket?._token?.distinctId;

		// initialize user ad play stats
		if (!taro.server.userAdStats[distinctId]) {
			taro.server.userAdStats[distinctId] = {
				adEnabled: true,
				adFailAttempts: [],
			};
		}

		// check if ads are enabled for the user
		if (taro.server.userAdStats[distinctId].adEnabled === false) {
			// ads are disabled for this user
			return;
		}

		data.token = await taro.workerComponent?.signToken(
			{
				clientId,
				type: 'creditAdRewardToken',
				createdAt: Date.now(),
			},
			{
				expiresIn: taro.server.AD_REWARD_JWT_EXPIRES_IN.toString(),
			}
		);

		taro.network.send('playAd', data, clientId);
	},

	play: function (data, clientId) {
		var self = this;
		if (taro.isServer) {
			if (clientId) {
				// play ad for specific client
				this.playAd(data, clientId);
			} else {
				// play ad for all clients
				for (const cId in taro.server.clients) {
					this.playAd(data, cId);
				}
			}
		} else if (taro.isClient) {
			this.token = data.token;

			// are we running on mobile
			// if (taro.isMobile) {
			// 	// on mobile
			// 	var eventData = { msg: 'showad' };
			//
			// 	if (window.msgQueue) {
			// 		// running inside modd cordova wrapper
			// 		window.msgQueue.push(eventData);
			// 	} else {
			// 		// on mobile web AIP ads not working well
			// 		console.log('adplay req mobile web');
			// 	}
			//
			// 	sendMessageToReactNative(eventData);
			// } else {
			// on desktop
			if (typeof isInY8IFrame !== 'undefined' && isInY8IFrame) {
				self.prerollEventHandler('video-ad-skip-in-iframe');
				return;
			}

			// if user is not in the play tab, don't play ad
			if (typeof window?.inGameEditor?.getCurrentTab === 'function' && window.inGameEditor.getCurrentTab() !== 'play') {
				return;
			}

			// if game tab is not focussed, don't play ad - won't work even if the devtools are focussed.
			if (document.hasFocus() === false) {
				return;
			}

			//check if the adslib is loaded correctly or blocked by adblockers etc.
			if (!window.isAdBlockEnabled && typeof window.aiptag.adplayer !== 'undefined') {
				// showing ad
				try {
					window.aiptag.cmd.player.push(function () {
						window.aiptag.adplayer.startPreRoll();
					});
				} catch (e) {
					console.log('AIP startPreRoll failed', e.message);
					self.prerollEventHandler('video-ad-error');
				}
			} else {
				//Adlib didn't load this could be due to an adblocker, timeout etc.
				//Please add your script here that starts the content, this usually is the same script as added in AIP_COMPLETE.
				self.prerollEventHandler('video-ad-blocked');
			}
			// }
		}
	},

	playCallback: async function (data, clientId) {
		var player = taro.game.getPlayerByClientId(clientId);
		var socket = taro.network._socketById[clientId];
		const distinctId = socket?._token?.distinctId;

		if (player && socket) {
			const token = data.token;
			if (token && data.status && clientId) {
				try {
					const isUsedToken = taro.server.usedAdRewardJwts[token];
					if (isUsedToken) {
						console.log('creditAdRewardToOwner - Token has been used already', token);
						return;
					}

					const decodedToken = taro.workerComponent ? await taro.workerComponent.verifyToken(token) : {};
					const { type, clientId: decodedClientId, createdAt } = decodedToken;

					if (decodedClientId === clientId) {
						// store token for current client
						taro.server.usedAdRewardJwts[token] = createdAt;

						// remove expired tokens
						const filteredUsedAdRewardJwts = {};
						const usedTokenEntries = Object.entries(taro.server.usedAdRewardJwts).filter(
							([token, tokenCreatedAt]) => Date.now() - tokenCreatedAt < taro.server.AD_REWARD_JWT_EXPIRES_IN
						);
						for (const [key, value] of usedTokenEntries) {
							if (typeof value === 'number') {
								filteredUsedAdRewardJwts[key] = value;
							}
						}
						taro.server.usedAdRewardJwts = filteredUsedAdRewardJwts;

						if (type === 'creditAdRewardToken') {
							// Ad reward goes to game owner
							taro.server.creditAdRewardToOwner(data.status, clientId);
						}

						if (taro.script) {
							// do not send trigger for neutral player
							if (data.status === 'completed') {
								taro.script.trigger('adPlayCompleted', { playerId: player.id() });
							} else if (data.status === 'skipped') {
								taro.script.trigger('adPlaySkipped', { playerId: player.id() });
							} else if (data.status === 'blocked') {
								taro.script.trigger('adPlayBlocked', { playerId: player.id() });
								taro.server.userAdStats[distinctId].adFailAttempts.push(taro.currentTime());
							} else if (data.status === 'failed') {
								taro.script.trigger('adPlayFailed', { playerId: player.id() });
								taro.server.userAdStats[distinctId].adFailAttempts.push(taro.currentTime());
							}
						}

						// remove old failure records that didn't happen in the last one hour
						let oldestSaveTimestamp = taro.server.userAdStats[distinctId].adFailAttempts[0];
						while (
							taro.currentTime() - oldestSaveTimestamp > 60 * 60 * 1000 &&
							taro.server.userAdStats[distinctId].adFailAttempts.length > 0
						) {
							oldestSaveTimestamp = taro.server.userAdStats[distinctId].adFailAttempts.shift();
						}

						if (socket?._token?.distinctId && taro.server.userAdStats[distinctId]?.adFailAttempts.length > 10) {
							// disable Ads for this user, no further ads will be served to this user
							taro.server.userAdStats[distinctId] = {
								adEnabled: false,
								adFailAttempts: [],
							};

							// send failure threshold limit reached to MP
							global.trackServerEvent &&
								global.trackServerEvent(
									{
										eventName: 'Ad Watch',
										properties: {
											$ip: socket._remoteAddress,
											gameSlug:
												taro.game &&
												taro.game.data &&
												taro.game.data.defaultData &&
												taro.game.data.defaultData.gameSlug,
											gameId:
												taro.game && taro.game.data && taro.game.data.defaultData && taro.game.data.defaultData._id,
											gameCreator:
												taro.game && taro.game.data && taro.game.data.defaultData && taro.game.data.defaultData.owner,
											status: 'failure-threshold-limit-reached',
											type: 'failure-threshold-limit-reached',
										},
										target: 'mixpanel',
									},
									socket
								);

							// add a server log
							taro.server.addServerLog(
								'ad play failed',
								`ad watch failure limit reached for user ${player._stats.name}`
							);
						} else if (socket?._token?.distinctId) {
							global.trackServerEvent &&
								global.trackServerEvent(
									{
										eventName: 'Ad Watch',
										properties: {
											distinct_id: distinctId,
											$ip: socket._remoteAddress,
											gameSlug:
												taro.game &&
												taro.game.data &&
												taro.game.data.defaultData &&
												taro.game.data.defaultData.gameSlug,
											gameId:
												taro.game && taro.game.data && taro.game.data.defaultData && taro.game.data.defaultData._id,
											gameCreator:
												taro.game && taro.game.data && taro.game.data.defaultData && taro.game.data.defaultData.owner,
											status: data.status,
											type: data.type,
										},
										target: 'mixpanel',
									},
									socket
								);
						}
					}
				} catch (e) {
					console.log('playCallback - invalid token', e.message, data.token);
				}
			}
		}
	},

	prerollEventSender: function (data, clientId = null) {
		if (taro.isServer) {
			if (clientId) {
				this.playCallback(data, clientId);
			} else {
				for (const cId in taro.server.clients) {
					this.playCallback(data, cId);
				}
			}
		} else {
			taro.network.send('playAdCallback', data);
		}
	},

	// clientId only required if called from server side
	prerollEventHandler: function (type, clientId = null) {
		const token = this.token;
		switch (type) {
			case 'video-ad-completed':
				// ad watch completed
				// credit coins to creator
				this.prerollEventSender({ status: 'completed', type, token }, clientId);
				break;
			case 'video-ad-skipped':
				// ad watch started and skipped after a few seconds
				this.prerollEventSender({ status: 'skipped', type, token }, clientId);
				break;
			case 'video-ad-blocked':
				// ad didn't load or errored
				this.prerollEventSender({ status: 'blocked', type, token }, clientId);
				break;
			case 'video-ad-close':
			case 'video-ad-empty':
			case 'video-ad-error':
			case 'video-ad-timeout':
			case 'video-ad-removed':
			case 'video-ad-skip-in-iframe':
			case 'video-ad-action-limit-reached':
				// ad didn't load or errored
				this.prerollEventSender({ status: 'failed', type, token }, clientId);
				break;
			case 'video-ad-clicked':
			case 'video-ad-loaded':
			case 'video-ad-paused':
			case 'video-ad-unpaused':
			case 'video-ad-resumed':
			case 'video-ad-started':
				// intermediate states, for now AIP doesn't trigger these states, maybe we need to add custom event listeners for AIP
				break;
		}
	},

	showRewardAd: function () {
		if (window.cpmStarRAd) {
			if (window.cpmStarRAd.isLoaded()) {
				window.cpmStarRAd.show();
			} else {
				window.cpmStarRAd.load();
			}
		} else {
			console.log('window.cpmStarRAd is not defined', window.cpmStarRAd);
		}
	},

	showAnchorTag: function () {
		if (noAds) {
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = AdComponent;
}
