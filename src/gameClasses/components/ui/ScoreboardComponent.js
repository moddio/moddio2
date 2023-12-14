var ScoreboardComponent = TaroEntity.extend({
	classId: 'ScoreboardComponent',
	componentId: 'scoreboard',

	init: function () {
		var self = this;
		self.scoreAttributeId = taro.game.data.settings.scoreAttributeId;
		self._hidden = false;

		self.setUI();
	},

	setUI: function () {
		if (taro.isMobile) {
			$('#scoreboard-header').addClass('small');
			$('#scoreboard').addClass('small');
		} else {
			$('#scoreboard-header').addClass('h5');
			$('#scoreboard').addClass('h6');
			$('#leaderboard')
				.addClass('h3')
				.removeClass('d-none');
		}

		// due to rendering order, on standalone, leaderboard is rendered behind
		// the game div content. setting z-index 1 is enough to pull it forward
		if (window.isStandalone) {
			$('#leaderboard').css('z-index', 1);
		}

		// $(function () {
		// 	$.contextMenu({
		// 		selector: '.scoreboard-user-entry',
		// 		build: function ($trigger) {
		// 			var userData = $trigger.data();
		// 			var myPlayer = taro.client.myPlayer;

		// 			if (!myPlayer || !myPlayer._stats) {
		// 				return;
		// 			}

		// 			var userId = myPlayer._stats.userId;
		// 			var mutedUsers = myPlayer._stats.mutedUsers;
		// 			if (userId === userData.userId) {
		// 				// user cannot perform action on his/her own player
		// 				return;
		// 			}

		// 			taro.scoreboard.selectedUser = userData;

		// 			var index = mutedUsers.indexOf(taro.scoreboard.selectedUser.userId);

		// 			return {
		// 				callback: function (key) {
		// 					switch (key) {
		// 						case 'unmute': {
		// 							mutedUsers.splice(index, 1);
		// 							$.ajax({
		// 								url: `/api/user/toggle-mute/${taro.scoreboard.selectedUser.userId}`,
		// 								type: 'POST',
		// 								success: function (data) {
		// 									console.log(data);											// alert('request sent');
		// 								}
		// 							});
		// 							break;
		// 						}
		// 						case 'mute': {
		// 							mutedUsers.push(taro.scoreboard.selectedUser.userId);
		// 							$.ajax({
		// 								url: `/api/user/toggle-mute/${taro.scoreboard.selectedUser.userId}`,
		// 								type: 'POST',
		// 								success: function (data) {
		// 									console.log(data);											// alert('request sent');
		// 								}
		// 							});
		// 							break;
		// 						}
		// 						case 'addFriend': {
		// 							$.ajax({
		// 								url: `/api/user/request/${taro.scoreboard.selectedUser.userId}`,
		// 								type: 'POST',
		// 								success: function (data) {
		// 									alert('request sent');
		// 								}
		// 							});
		// 							break;
		// 						}
		// 					}
		// 				},
		// 				items: {
		// 					addFriend: {
		// 						name: 'Add Friend'
		// 					},
		// 					separator: { type: 'cm_separator' },
		// 					unmute: {
		// 						name: `Unmute ${taro.scoreboard.selectedUser.userName}`,
		// 						visible: index > -1
		// 					},
		// 					mute: {
		// 						name: `Mute ${taro.scoreboard.selectedUser.userName}`,
		// 						visible: index === -1,
		// 						className: 'context-menu-item context-menu-hover context-menu-danger'
		// 					}
		// 				}
		// 			};
		// 		}
		// 	});
		// });
	},

	convertNumbersToKMB: function (labelValue) {
		if (taro.game.data.settings.prettifyingScoreboard) {
			// Nine Zeroes for Billions
			return Math.abs(Number(labelValue)) >= 1.0e+33

				? `${(Math.abs(Number(labelValue)) / 1.0e+33).toFixed(2)}Dc`
				: Math.abs(Number(labelValue)) >= 1.0e+30

					? `${(Math.abs(Number(labelValue)) / 1.0e+30).toFixed(2)}No`
					: Math.abs(Number(labelValue)) >= 1.0e+27

						? `${(Math.abs(Number(labelValue)) / 1.0e+27).toFixed(2)}Oc`
						: Math.abs(Number(labelValue)) >= 1.0e+24

							? `${(Math.abs(Number(labelValue)) / 1.0e+24).toFixed(2)}Sp`
							: Math.abs(Number(labelValue)) >= 1.0e+21

								? `${(Math.abs(Number(labelValue)) / 1.0e+21).toFixed(2)}Sx`
								: Math.abs(Number(labelValue)) >= 1.0e+18

									? `${(Math.abs(Number(labelValue)) / 1.0e+18).toFixed(2)}Qi`
									: Math.abs(Number(labelValue)) >= 1.0e+15

										? `${(Math.abs(Number(labelValue)) / 1.0e+15).toFixed(2)}Qa`
										: Math.abs(Number(labelValue)) >= 1.0e+12

											? `${(Math.abs(Number(labelValue)) / 1.0e+12).toFixed(2)}T`
											: Math.abs(Number(labelValue)) >= 1.0e+9

												? `${(Math.abs(Number(labelValue)) / 1.0e+9).toFixed(2)}B`
												// Six Zeroes for Millions
												: Math.abs(Number(labelValue)) >= 1.0e+6

													? `${(Math.abs(Number(labelValue)) / 1.0e+6).toFixed(2)}M`
													// Three Zeroes for Thousands
													: Math.abs(Number(labelValue)) >= 1.0e+3

														? `${(Math.abs(Number(labelValue)) / 1.0e+3).toFixed(2)}K`

														: Math.abs(Number(labelValue));
		} else {
			return labelValue;
		}
	},
	update: function () {
		var self = this;
		var DEFAULT_COLOR = 'white';

		var scoreboardElement = taro.client.getCachedElementById('scoreboard');
		var leaderboardToggleElement = taro.client.getCachedElementById('leaderboard-toggle');


		if (taro.isClient) {

			scoreboardElement.innerHTML = ''

			if (self._hidden) {
				if (leaderboardToggleElement) {
					leaderboardToggleElement.innerHTML = 
					`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="leaderboard-arrow">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
				 	</svg>`;
				}
			} else {
				if (leaderboardToggleElement) {
					leaderboardToggleElement.innerHTML =
					`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="leaderboard-arrow">>
						<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
					</svg>`;
				}

				var sortedScores = [];
				var players = taro.$$('player');

				players.forEach(function (player) {
					if (player._stats && (
						// only display human players on scoreboard
						player._stats.controlledBy == 'human'
					)
					) {
						var playerId = player.id();
						var score = 0;
						if (self.scoreAttributeId && player._stats.attributes && player._stats.attributes[self.scoreAttributeId]) {
							var playerAttribute = player._stats.attributes[self.scoreAttributeId];
							score = playerAttribute.value;
							var decimalPlace = parseInt(playerAttribute.decimalPlaces) || 0;
							var score = parseFloat(playerAttribute.value).toFixed(decimalPlace);
						}

						sortedScores.push({
							key: playerId,
							value: score
						});
					}
				});

				sortedScores.sort(function (a, b) {
					return a.value - b.value;
				});

				for (var i = sortedScores.length - 1; i >= 0; i--) {
					var playerId = sortedScores[i].key;
					var player = taro.$(playerId);
					var defaultFontWeight = 500;
					if (player) {
						var color = null; // color to indicate human, animal, or my player on scoreboard
						let playerIsSelf = '';

						var playerType = taro.game.cloneAsset('playerTypes', player._stats.playerTypeId);

						if (playerType && playerType.color) {
							color = playerType.color;
						}

						// highlight myself (player) on leaderboard
						if (player._stats.controlledBy == 'human' && player._stats.clientId == taro.network.id()) {
							defaultFontWeight = 800;
							color = '#99FF00';
							playerIsSelf = 'scoreboard-player-is-myself';
						}

						var readableName = player._stats.name || '';

						readableName = readableName.replace(/</g, '&lt;');
						readableName = readableName.replace(/>/g, '&gt;');

						color = color || DEFAULT_COLOR;

						// using setAttributeNS instead of jQuery attr() because jQuery attr() converts 'onContextMenu' to 'oncontextmenu'
						// playerDiv.get(0).setAttributeNS(null, "onContextMenu", `window.showUserDropdown({ event, userId: '${player._stats.userId}' })`)

						$(scoreboardElement).append(
							$('<div/>', {
								class: `cursor-pointer scoreboard-user-entry scoreboard-player-rank-${i} ${playerIsSelf}`,
								style: `color: ${color};font-weight:${defaultFontWeight}`,
								onContextMenu: `window.showUserDropdown({ event, userId: '${player._stats.userId}' })`
							}).append(
								$('<span/>', {
									class: 'scoreboard-player-name',
									html: `${readableName}`
								})
							).append(
								$('<small/>', {
									class: 'scoreboard-player-score',
									html: `<span> ${self.convertNumbersToKMB(sortedScores[i].value)}</span>`
								})
							)
						);
					}
				}
			}
		}
	},

	hideScores: function () {
		this._hidden = true;
	},

	showScores: function () {
		this._hidden = false;
	},

	toggleScores: function () {
		this._hidden = !this._hidden;
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = ScoreboardComponent;
}
