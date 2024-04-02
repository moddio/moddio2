var GameTextComponent = TaroEntity.extend({
	classId: 'GameTextComponent',
	componentId: 'gameText',

	init: function () {
		var self = this;

		if (taro.isServer) {
			self.latestText = {}; // stores last sent text, so newly joined users can see it
		}
	},

	updateText: function (data, clientId) {
		this.latestText[data.target] = data.value;

		if (taro.isServer) {
			data.value = taro.sanitizer(data.value);
			taro.network.send('updateUiText', data, clientId); // update text for all clients
		}
	},

	updateTextForTime: function (data, clientId) {
		this.latestText[data.target] = data.value;

		if (taro.isServer) {
			data.value = taro.sanitizer(data.value);
			taro.network.send('updateUiTextForTime', data, clientId); // update text for all clients
		}
	},

	sendLatestText: function (clientId) {
		if (taro.isServer) {
			for (i in this.latestText) {
				var data = {
					target: i,
					value: this.latestText[i],
				};
				// taro.log("sendLatestText: " + JSON.stringify(data) + " to "+clientId)
				data.value = taro.sanitizer(data.value);
				taro.network.send('updateUiText', data, clientId);
			}
		}
	},

	alertHighscore: function (clientId) {
		if (taro.isServer) {
			taro.network.send('alertHighscore', {}, clientId);
		}
	},

	// showKillStreakMessage: function(playerName, killStreakCount) {

	// 	var message = "";
	// 	var fontSize = 30;
	// 	$('#kill-streak-message').show();
	// 	switch(killStreakCount)
	// 	{
	// 		case 2:
	// 			message = playerName + "'s got a DOUBLE KILL";
	// 			fontSize = 30;
	// 			break;

	// 		case 3:
	// 			message = playerName + "'s got a TRIPLE KILL";
	// 			fontSize = 35;
	// 			break;

	// 		case 4:
	// 			message = playerName + " is a PLAGUE";
	// 			fontSize = 40;
	// 			break;

	// 		case 5:

	// 		default:
	// 			message = playerName + " is the RAPTURE!!!";
	// 			fontSize = 60;
	// 			break;
	// 	}
	// 	$("#kill-streak-message").css({ fontSize: fontSize }).text(message).delay(5000).fadeOut("slow");;
	// },
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = GameTextComponent;
}
