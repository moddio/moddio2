/**
 * The client-side chat component. Handles all client-side
 * chat methods and events.
 */
var TaroChatClient = {
	/**
	 * Asks the serve to let us join the room specified.
	 * @param {String} roomId The room id of the room to join.
	 */
	joinRoom: function (roomId) {
		taro.network.send('taroChatJoinRoom', roomId);
	},

	sendToRoom: function (roomId, message, to) {
		if (roomId !== undefined && message !== undefined) {
			msg = {
				roomId: roomId,
				text: message,
				to: to,
			};

			taro.network.send('taroChatMsg', msg);
		}
	},

	_onMessageFromServer: function (data) {
		var self = taro.chat;

		// message from a player
		if (data && data.from) {
			var player = taro.game.getPlayerByClientId(data.from);

			var isPlayerMuted =
				taro.client.myPlayer &&
				taro.client.myPlayer._stats &&
				taro.client.myPlayer._stats.mutedUsers &&
				taro.client.myPlayer._stats.mutedUsers.indexOf(player._stats.userId) > -1;

			// ignore messages from players I muted
			if (player && isPlayerMuted) {
				return;
			}
		}

		var isChatHidden = false;

		// display message if it's either system message, or if chat is visible
		if (player == undefined || !isChatHidden) {
			taro.chat.postMessage(data);

			if (player) {
				var selectedUnit = player.getSelectedUnit();

				if (selectedUnit) {
					selectedUnit.emit('render-chat-bubble', data.text);
				}
			}
		}
	},

	_onJoinedRoom: function (data) {
		var self = taro.chat;

		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('joinedRoom', [data])) {
			if (data.joined === true) {
				// console.log('Server says we have joined room:', data.roomId);
			} else {
				// console.log('Server says we failed to join room:', data.roomId);
			}
		}
	},

	_onLeftRoom: function (data) {
		var self = taro.chat;

		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('leftRoom', [data])) {
			console.log('We have left room:', data);
		}
	},

	_onServerSentRoomList: function (data) {
		var self = taro.chat;

		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('roomList', [data])) {
			console.log('Server sent room list:', data);
		}
	},

	_onServerSentRoomUserList: function (data) {
		var self = taro.chat;

		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('roomUserList', [data])) {
			console.log('Server sent room user list:', data);
		}
	},

	_onRoomCreated: function (data) {
		var self = taro.chat;

		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('roomCreated', [data])) {
			console.log('Server told us room was created:', data);
		}
	},

	_onRoomRemoved: function (data) {
		var self = taro.chat;

		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('roomRemoved', [data])) {
			console.log('Server told us room was removed:', data);
		}
	},
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroChatClient;
}
