/**
 * The server-side chat component. Handles all server-side
 * chat methods and events.
 */
var TaroChatServer = {
	/**
	 * Creates a new room with the specified room name and options.
	 * @param roomName The display name of the room.
	 * @param options An object containing options key/values.
	 * @param {String=} roomId If specified, becomes the new room's ID.
	 * @return {String} The new room's ID.
	 */
	createRoom: function (roomName, options, roomId) {
		var self = taro.chat;
		var newRoomId = roomId || taro.newIdHex();

		self._rooms[roomId] = {
			id: newRoomId,
			name: roomName,
			options: options,
			users: [],
		};

		// Inform all users that the room was created
		taro.network.send('taroChatRoomCreated', roomId);

		return roomId;
	},

	/**
	 * Removes an existing room with the specified id.
	 * @param roomId
	 * @return {Boolean}
	 */
	removeRoom: function (roomId) {
		var self = taro.chat;

		if (self._rooms[roomId]) {
			// Inform all users that the room was removed
			taro.network.send('taroChatRoomRemoved', roomId);

			delete self._rooms[roomId];
			return true;
		} else {
			return false;
		}
	},

	/**
	 * Sends a message to a room.
	 * @param {String} roomId The ID of the room to send the message to.
	 * @param {String} message The text body of the message to send.
	 * @param {String=} to The id of the user to send the message to.
	 * @param {String} from The id of the user that sent the message.
	 */
	sendToRoom: function (roomId, message, to, from, additionalOpts = {}) {
		if (!to && !from) {
			taro.devLog('sending chatt message inside sendChatRoom', message);
		}

		taro.devLog(`chat - sendToRoom: ${message}`);

		var self = taro.chat;
		var sender = taro.game.getPlayerByClientId(from);
		var gameData = taro.game.data && taro.game.data.defaultData;
		var msg = {
			roomId: roomId,
			text: message,
			from: from,
			to: to,
			bmToAll: additionalOpts?.isBroadcastMessageToAllGames,
		};

		// send the system message (from the action 'sendChatMessage')
		if (sender == undefined) {
			taro.network.send('taroChatMsg', msg, to);
			return;
		} else if (sender && sender._stats) {
			// prevent sending messages from banned/unverified users
			if (!global.isDev && (sender._stats.banChat || !sender._stats.userId)) {
				return;
			} else if (this.isSpamming(from, message)) {
				// mute spammers
				sender._stats.banChat = true;
				(msg.text = 'You have been muted for spamming.'), taro.network.send('taroChatMsg', msg);
				taro.workerComponent.banChat({
					gameId: gameData._id,
					userId: sender._stats.userId,
				});
				return;
			} else if (/(https?:\/\/[^\s]+)/g.test(message)) {
				return;
			}

			taro.game.lastChatMessageSentByPlayer = message;
			taro.queueTrigger('playerSendsChatMessage', {
				playerId: sender.id(),
			});
		}

		// do not show command messages that start with '/'. e.g. /ban user
		if (message != undefined && message[0] == '/') {
			return;
		}

		if (self._rooms[roomId]) {
			var room = self._rooms[roomId];

			if (message !== undefined) {
				// if (msg.text && msg.text.length > 80) {
				// 	msg.text = msg.text.substr(0, 80);
				// }

				if (to) {
					// Send message to individual user
					if (room.users.indexOf(to) > -1) {
						taro.network.send('taroChatMsg', msg, to);

						// console.log('Sending to one user...', msg, to);
					} else {
						self.log(`Cannot send to user because specified user is not in room: ${to}`);
					}
				} else {
					// Send this message to all users in the room
					// console.log('Sending to all users...', msg);
					taro.network.send('taroChatMsg', msg);
				}
			} else {
				self.log('Cannot send message to room with blank message!');
			}
		} else {
			self.log(`Cannot send message to room with id "${roomId}" because it does not exist!`);
		}
	},

	// added by Jaeyun to prevent spammers
	isSpamming: function (from, message) {
		now = new Date();

		// if this is the user's first message. init
		if (this.lastMessageSentAt[from] == undefined) {
			this.lastMessageSentAt[from] = now;
			this.sentMessages[from] = [];
			return false;
		}

		// console.log("anti spam", now - this.lastMessageSentAt[from]);

		// prevent user from sending messages every second
		// 1500
		this.lastMessageSentAt[from] = now;

		this.sentMessages[from].push({
			time: new Date(),
			message: message,
		});
		var returnValue = false;
		if (this.sentMessages[from].length > 4) {
			var timeElapsed = 0;
			var charCount = 0;
			timeElapsed = now - this.sentMessages[from][0].time;
			for (i in this.sentMessages[from]) {
				charCount += this.sentMessages[from][i].message.length;
			}

			// sending 4 or more separate messages in 2 seconds
			if (timeElapsed <= 2000) {
				returnValue = true;
			}

			// sending more than 80 characters in 4 seconds
			if (timeElapsed <= 4000 && charCount > 80) {
				returnValue = true;
			}

			// maintain last 4 message in array
			this.sentMessages[from].shift();
		}
		return returnValue;
	},

	_onMessageFromClient: function (msg, clientId) {
		var self = taro.chat;
		var room;

		// prevent non-string or non-unicode (e.g. emoji) from being broadcasted as it can disconnect all connected clients
		if (typeof msg.text != 'string' || self.regexUnicode.test(msg.text) == true) {
			return;
		}

		// msg.text = self.validator.blacklist(msg.text, self.regex);
		// msg.text = self.validator.whitelist(msg.text, self.regex)
		// msg.text = self.sanitizer.sanitize(msg.text);
		// msg.text = self.validator.escape(msg.text);
		// msg.text = self.filter.clean(msg.text);

		// no filter on standalone
		//
		if (process.env.ENV != 'standalone') {
			msg.text = self.filter.cleanHacked(msg.text); // https://github.com/web-mech/badwords/issues/93
		}
		//

		if (msg == undefined || msg.text == undefined) return;

		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('messageFromClient', [msg, clientId])) {
			var player = taro.game.getPlayerByClientId(clientId);
			if (player) {
				var playerName = player._stats && self.xssFilters.inHTMLData(player._stats.name);
				taro.devLog(`Message from client: (${playerName}): ${msg.text}`);

				player.lastMessageSent = msg.text;
				taro.queueTrigger('playerSendsMessage', {
					playerId: player.id(),
				});
			}

			if ((msg.roomId && typeof msg.roomId == 'string') || typeof msg.roomId == 'number') {
				room = self._rooms[msg.roomId];
				if (room) {
					if (room.users.indexOf(clientId) > -1) {
						var text = msg.text;
						if (text) {
							// console.log('Sending message to room...');
							self.sendToRoom(msg.roomId, msg.text, msg.to, clientId);
						} else {
							// console.log('Cannot send message because message text is empty!', msg);
						}
					} else {
						// The user is not in the room specified
						taro.devLog('User tried to send message to room they are not joined in!', msg);
					}
				} else {
					// Room id specified does not exist
					taro.devLog("User tried to send message to room that doesn't exist!", msg);
				}
			} else {
				// No room id in the message
				taro.devLog("User tried to send message to room but didn't specify room id!", msg);
			}
		}
	},

	_onJoinRoomRequestFromClient: function (roomId, clientId) {
		var self = taro.chat;

		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('clientJoinRoomRequest', [roomId, clientId])) {
			var room = self._rooms[roomId];

			self.log(`Client wants to join room: (${clientId})`, roomId);

			// Check the room exists
			if (room) {
				// Check that the user isn't already part of the room user list
				if (!room.users[clientId]) {
					// Add the user to the room
					room.users.push(clientId);
					taro.network.send('taroChatJoinRoom', { roomId: roomId, joined: true }, clientId);
					// console.log('User "' + clientId + '" joined room ' + roomId);
				} else {
					// User is already in the room!
				}
			} else {
				// Room does not exist!
			}
		}
	},

	_onLeaveRoomRequestFromClient: function (roomId, clientId) {
		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('clientLeaveRoomRequest', [roomId, clientId])) {
			console.log(`Client wants to leave room: (${clientId})`, roomId);
		}
	},

	_onClientWantsRoomList: function (data, clientId) {
		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('clientRoomListRequest', [data, clientId])) {
			console.log(`Client wants the room list: (${clientId})`, data);
		}
	},

	_onClientWantsRoomUserList: function (roomId, clientId) {
		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (!self.emit('clientRoomUserListRequest', [roomId, clientId])) {
			console.log(`Client wants the room user list: (${clientId})`, roomId);
		}
	},
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroChatServer;
}
