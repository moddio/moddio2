var ScoreboardComponent = TaroEntity.extend({
	classId: 'ScoreboardComponent',
	componentId: 'scoreboard',

	init: function () {
		var self = this;
		self.scoreAttributeId = taro.game.data.settings.scoreAttributeId;
		self.isUpdateQueued = false;
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

	queueUpdate: function() {
		this.isUpdateQueued = true;
	},

	convertNumbersToKMB: function (labelValue) {
		if (taro.game.data.settings.prettifyingScoreboard) {
		    const prefixes = [
		        'Cn', 'Vi', 'Nd', 'Od', 'Spd', 'Sxd', 'Qid', 'Qad', 'Tr', 'Do', 'Un', 'De', 'No', 'Oc', 'Sp', 'Sx', 'Qi', 'Qa', 'T', 'B', 'M', 'K'
		    ];
		
		    let absValue = Math.abs(Number(labelValue));
		    let returnValue = labelValue;
		    
		    if (absValue >= 1000) {
		        for (let i = 0; i < prefixes.length; i++) {
		            let factor = Math.pow(10, (3 * (prefixes.length - i)));
		
		            if (absValue >= factor) {
		                returnValue = `${(absValue / factor).toFixed(2)}${prefixes[i]}`;
		                break;
		            }
		        }
		    }

			return returnValue;
		} else {
			return labelValue;
		}
	},
	update: function () {
		var self = this;
		var DEFAULT_COLOR = 'white';

		var scoreboardElement = taro.client.getCachedElementById('scoreboard');
		var leaderboardToggleElement = taro.client.getCachedElementById('leaderboard-toggle');


		if (taro.isClient && scoreboardElement && leaderboardToggleElement) {

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
								id: `scoreboard-player-rank-${i}`,
								class: `cursor-pointer scoreboard-user-entry ${playerIsSelf}`,
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

		this.isUpdateQueued = false;
	},

	hideScores: function () {
		this._hidden = true;
	},

	showScores: function () {
		this._hidden = false;
	},

	toggleScores: function () {
		this._hidden = !this._hidden;
		this.update();
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = ScoreboardComponent;
}
