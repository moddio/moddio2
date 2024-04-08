var TaroNetIoServer = {
	_idCounter: 0,
	_requests: {},

	/**
	 * Starts the network for the server.
	 * @param {*} data The port to listen on.
	 * @param {Function=} callback A callback method to call once the
	 * network has started.
	 */
	start: function (data, callback) {
		var self = this;

		this.artificialDelay = 0; // simulated lag (ms)

		this._socketById = {};
		this._socketByIp = {};
		this._socketsByRoomId = {};
		this.clientIds = [];

		this.snapshot = [];
		this.sendQueue = {};
		if (typeof data !== 'undefined') {
			this._port = data;
		}

		// Start net.io
		console.log(`Starting net.io listener on port ${this._port}`);
		this._io = new this._netio(this._port, callback);

		// Setup listeners
		this._io.on('connection', function () {
			self._onClientConnect.apply(self, arguments);
		});

		// Setup default commands
		this.define('_taroRequest', function () {
			self._onRequest.apply(self, arguments);
		});
		this.define('_taroResponse', function () {
			self._onResponse.apply(self, arguments);
		});
		// this.define('_taroNetTimeSync', function () {
		// 	self._onTimeSync.apply(self, arguments);
		// });

		this.define('_snapshot', function () {
			self._snapshot(self, arguments);
		});

		// Start network sync
		// this.timeSyncStart();

		return this._entity;
	},

	/**
	 * Sets a network command and optional callback. When a network command
	 * is received by the server, the callback set up for that command will
	 * automatically be called and passed the data from the incoming network
	 * packet.
	 * @param {String} commandName The name of the command to define.
	 * @param {Function=} callback A function to call when the defined network
	 * command is received by the network.
	 * @return {*}
	 */
	define: function (commandName, callback) {
		if (commandName !== undefined) {
			this._networkCommands[commandName] = callback;

			// Record reverse lookups
			var index = this._networkCommandsIndex.length;
			this._networkCommandsIndex[index] = commandName;
			this._networkCommandsLookup[commandName] = index;

			return this._entity;
		} else {
			this.log('Cannot define a network command without a commandName parameter!', 'error');
		}
	},

	/**
	 * Adds a client to a room by id. All clients are added to room id
	 * "taro" by default when they connect to the server.
	 * @param {String} clientId The id of the client to add to the room.
	 * @param {String} roomId The id of the room to add the client to.
	 * @returns {*}
	 */
	clientJoinRoom: function (clientId, roomId) {
		if (clientId !== undefined) {
			if (roomId !== undefined) {
				this._clientRooms[clientId] = this._clientRooms[clientId] || [];
				this._clientRooms[clientId].push(roomId);

				this._socketsByRoomId[roomId] = this._socketsByRoomId[roomId] || {};
				this._socketsByRoomId[roomId][clientId] = this._socketById[clientId];

				if (this.debug()) {
					this.log(`Client ${clientId} joined room ${roomId}`);
				}

				return this._entity;
			}

			this.log('Cannot add client to room because no roomId was provided!', 'warning');
			return this._entity;
		}

		this.log('Cannot add client to room because no clientId was provided!', 'warning');
		return this._entity;
	},

	/**
	 * Removes a client from a room by id. All clients are added to room id
	 * "taro" by default when they connect to the server and you can remove
	 * them from it if your game defines custom rooms etc.
	 * @param {String} clientId The id of the client to remove from the room.
	 * @param {String} roomId The id of the room to remove the client from.
	 * @returns {*}
	 */
	clientLeaveRoom: function (clientId, roomId) {
		if (clientId !== undefined) {
			if (roomId !== undefined) {
				console.log(`removing client ${clientId} from a room ${roomId}`);
				if (this._clientRooms[clientId]) {
					this._clientRooms[clientId].pull(roomId);
					delete this._socketsByRoomId[roomId][clientId];
				}

				return this._entity;
			}

			this.log('Cannot remove client from room because no roomId was provided!', 'warning');
			return this._entity;
		}

		this.log('Cannot remove client from room because no clientId was provided!', 'warning');
		return this._entity;
	},

	/**
	 * Removes a client from all rooms that it is a member of.
	 * @param {String} clientId The client id to remove from all rooms.
	 * @returns {*}
	 */
	clientLeaveAllRooms: function (clientId) {
		if (clientId != undefined) {
			var arr = this._clientRooms[clientId];

			// temp fix. not sure if what im doing is a good thing... LOL
			// maybe this while statement was freezing up the game - Jaeyun Oct 8, 2017
			if (arr != undefined) {
				for (var i = arr.length - 1; i >= 0; i--) {
					console.log(`client ${clientId} is leaving the room ${arr[i]}(${i})`);
					this.clientLeaveRoom(clientId, arr[i]);
				}

				delete this._clientRooms[clientId];
				return this._entity;
			}
		} else {
			this.log('Cannot remove client from room because no clientId was provided!', 'warning');
		}
		return this._entity;
	},

	/**
	 * Gets the array of room ids that the client has joined.
	 * @param clientId
	 * @returns {Array} An array of string ids for each room the client has joined.
	 */
	clientRooms: function (clientId) {
		if (clientId !== undefined) {
			return this._clientRooms[clientId] || [];
		}

		this.log('Cannot get/set the clientRoom id because no clientId was provided!', 'warning');
		return [];
	},

	/**
	 * Returns an associative array of all connected clients
	 * by their ID.
	 * @param {String=} roomId Optional, if provided will only return clients
	 * that have joined room specified by the passed roomId.
	 * @return {Array}
	 */
	clients: function (roomId) {
		if (roomId !== undefined) {
			return this._socketsByRoomId[roomId];
		}

		return this._socketById;
	},

	/**
	 * Returns the socket associated with the specified client id.
	 * @param {String=} clientId
	 * @return {*}
	 */
	socket: function (clientId) {
		return this._socketById[clientId];
	},

	/**
	 * Gets / sets the current flag that determines if client connections
	 * should be allowed to connect (true) or dropped instantly (false).
	 * @param {Boolean} val Set to true to allow connections or false
	 * to drop any incoming connections.
	 * @return {*}
	 */
	acceptConnections: function (val) {
		if (typeof val !== 'undefined') {
			this._acceptConnections = val;
			if (val) {
				console.log('Server now accepting connections!');
				this.log('Server now accepting connections!');
			} else {
				console.log('Server no longer accepting connections!');
				this.log('Server no longer accepting connections!');
			}

			return this._entity;
		}

		return this._acceptConnections;
	},

	/**
	 * Sends clientDisconnect command to client and closes the socket connection
	 * @param {String} clientId
	 * @param {String} reason
	 * @param {String} reasonCode
	 */
	disconnect: function (clientId, reason, reasonCode) {
		if (!clientId) {
			return;
		}

		this.send('clientDisconnect', { reason, clientId }, clientId);

		const socket = this._socketById[clientId];
		if (socket) {
			// store socket's disconnect reason, will be used in _onSocketDisconnect
			const code = null;

			socket._disconnect = {
				reasonCode: reasonCode || socket.getReasonCode(reason),
				reason,
				code,
				at: new Date(),
				source: 'disconnectFn',
			};

			socket.close(reason);
		}
	},

	/**
	 * Sends a message over the network.
	 * @param {String} commandName
	 * @param {Object} data
	 * @param {*=} clientId If specified, sets the recipient socket id or a array of socket ids to send to.
	 * @param {Boolean} skipQueue
	 */
	send: function (commandName, data, clientId, skipQueue = false) {
		var self = this;
		var commandIndex = this._networkCommandsLookup[commandName];
		var ciEncoded;

		// console.log(commandIndex, ciEncoded, commandName, data, clientId);

		if (commandIndex !== undefined) {
			ciEncoded = String.fromCharCode(commandIndex);
			// console.log("taroNetIoServer send(): ",commandName, ciEncoded, data, clientId)
			if (!self.sendQueue[clientId])
				self.sendQueue[clientId] = [];

			if (!clientId)
				clientId = 'undefined';
				
			if (skipQueue) {
				if (global.isDev) {
					setTimeout(function (data, id, ci) {
						self._io.send(
							[ciEncoded, data],
							clientId === 'undefined' ? undefined : clientId
						);
					}, self.artificialDelay, data, clientId, ciEncoded);
				} else {
					// production we don't simulate lag
					self._io.send(
						[ciEncoded, data],
						clientId === 'undefined' ? undefined : clientId
					);
				}

				
			} else {
				self.sendQueue[clientId].push([ciEncoded, data]);
			}
		} else {
			this.log(
				`Cannot send network packet with command "${commandName
				}" because the command has not been defined!`,
				'error'
			);
		}
	},

	add: function (commandName, data, clientId) {
		var commandIndex = this._networkCommandsLookup[commandName];
		var ciEncoded;

		if (commandIndex !== undefined) {
			ciEncoded = String.fromCharCode(commandIndex);

			// to save space transform data of entities are send as a single string
			// <ciEncoded><id><x><y><rot>
			const snapshotData = typeof data === 'string' ? ciEncoded + data : [ciEncoded, data];

			this.snapshot.push(snapshotData);
		} else {
			this.log(
				`Cannot send network packet with command "${commandName}" because the command has not been defined!`,
				'error'
			);
		}
	},

	flush: function (timestamp) {
		var self = this;

		var commandIndex = this._networkCommandsLookup._snapshot;
		var ciEncoded = String.fromCharCode(commandIndex);

		if (commandIndex !== undefined) {
			// send sendQueue
			if (self.sendQueue) {
				for (var clientId in self.sendQueue) {
					// simulate lag for dev environment
					if (global.isDev) {
						setTimeout(
							function (data, id, ci) {
								self._io.send([ci, data], id === 'undefined' ? undefined : id);
							},
							self.artificialDelay,
							self.sendQueue[clientId],
							clientId,
							ciEncoded
						);
					} else {
						// production we don't simulate lag
						self._io.send([ciEncoded, self.sendQueue[clientId]], clientId === 'undefined' ? undefined : clientId);
					}
				}
				self.sendQueue = {};
			}

			// send snapshot
			if (this.snapshot.length == 0) {
				return;
			}

			self.snapshot.push([String.fromCharCode(this._networkCommandsLookup._taroStreamTime), timestamp]);
			if (global.isDev) {
				// generate artificial lag in dev environment
				setTimeout(
					function (data, ci) {
						self._io.send([ci, data]);
					},
					self.artificialDelay,
					self.snapshot,
					ciEncoded
				);
			} else {
				self._io.send([ciEncoded, self.snapshot]);
			}
			taro.server.lastSnapshot = self.snapshot;
			taro.server.lastSnapshotSentAt = taro._currentTime;
			this.snapshot = [];
		} else {
			this.log('_snapshot error @ flush');
		}
	},

	/**
	 * Sends a network request. This is different from a standard
	 * call to send() because the recipient code will be able to
	 * respond by calling taro.network.response(). When the response
	 * is received, the callback method that was passed in the
	 * callback parameter will be fired with the response data.
	 * @param {String} commandName
	 * @param {Object} data
	 * @param {Function} callback
	 */
	request: function (commandName, data, callback) {
		// Build the request object
		var req = {
			id: this.newIdHex(),
			cmd: commandName,
			data: data,
			callback: callback,
			timestamp: new Date().getTime(),
		};

		// Store the request object
		this._requests[req.id] = req;

		// Send the network request packet
		this.send('_taroRequest', {
			id: req.id,
			cmd: commandName,
			data: req.data,
		});
	},

	/**
	 * Sends a response to a network request.
	 * @param {String} requestId
	 * @param {Object} data
	 */
	response: function (requestId, data) {
		// Grab the original request object
		var req = this._requests[requestId];

		if (req) {
			// Send the network response packet
			this.send(
				'_taroResponse',
				{
					id: requestId,
					cmd: req.commandName,
					data: data,
				},
				req.clientId
			);

			// Remove the request as we've now responded!
			delete this._requests[requestId];
		}
	},

	/**
	 * Generates a new 16-character hexadecimal unique ID
	 * @return {String}
	 */
	newIdHex: function () {
		this._idCounter++;
		return (
			this._idCounter +
			(Math.random() * Math.pow(10, 17) +
				Math.random() * Math.pow(10, 17) +
				Math.random() * Math.pow(10, 17) +
				Math.random() * Math.pow(10, 17))
		).toString(16);
	},

	/**
	 * Determines if the origin of a request should be allowed or denied.
	 * @param origin
	 * @return {Boolean}
	 * @private
	 */
	_originIsAllowed: function (origin) {
		// put logic here to detect whether the specified origin is allowed.
		return true;
	},

	/**
	 * Called when the server receives a client connection request. Sets
	 * up event listeners on the socket and sends the client the initial
	 * networking data required to allow network commands to operate
	 * correctly over the connection.
	 * @param {Object} socket The client socket object.
	 * @param {Object} request The socket's originating HTTP request.
	 * @private
	 */
	_onClientConnect: function (socket, request) {
		var self = this;
		var remoteAddress = socket._remoteAddress;
		let clientRejectReason = null;

		taro.network._socketById[socket.id] = socket;
		taro.network._socketByIp[socket._remoteAddress] = socket;
		taro.network._socketById[socket.id].start = socket.start || Date.now();

		if (taro.workerComponent) {
			clientRejectReason = taro.workerComponent.validateClientConnection(socket, request);
		}

		if (clientRejectReason === null) {
			// Check if any listener cancels this
			if (!taro.network.emit('connect', socket)) {
				taro.network.log(`Accepted connection with socket id ${socket.id} ip ${remoteAddress}`);

				taro.network.clientIds.push(socket.id);
				taro.server.socketConnectionCount.connected++;

				// Store a rooms array for this client
				taro.network._clientRooms[socket.id] = taro.network._clientRooms[socket.id] || [];

				if (taro.workerComponent) taro.workerComponent.logClientConnect(socket.id);

				// trigger joinGame command as part of socket connection, no need for client to send joinGame anymore
				// joinGame takes care of disconnecting unauthenticated users, banned ips, duplicate IPs, creates a new player and request user data from gs manager and make sure the user exists on moddio
				const joinGameData = {
					number: Math.floor(Math.random() * 999) + 100,
					_id: socket._token.userId,
					sessionId: socket._token.sessionId,
					isAdBlockEnabled: false,
				};
				const isMobile = !!request.headers['user-agent']?.match(
					/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop|moddioapp/i
				);
				joinGameData.isMobile = isMobile;
				const clientId = socket.id;

				taro.server._onJoinGame(joinGameData, clientId);
			} else {
				var reason = 'cannot connect to socket this.emit("connect", socket)';
				console.log(reason);
				socket.close(reason);
			}

			socket.on('message', function (data) {
				if (taro.workerComponent) {
					const isCommandValid = taro.workerComponent.validateCommand(socket.id, data);
					if (!isCommandValid) {
						return;
					}
				}

				self._onClientMessage.apply(self, [data, socket.id]);
			});

			socket.on('disconnect', function (data) {
				if (self.clientIds.includes(socket.id)) {
					var end = Date.now();
					taro.server.socketConnectionCount.disconnected++;

					if (self._socketById[socket.id]?.start && end - self._socketById[socket.id].start < 3000) {
						taro.server.socketConnectionCount.immediatelyDisconnected++;
					}
				}
			});

			// Send an init message to the client
			socket.send({
				cmd: 'init',
				ncmds: this._networkCommandsLookup,
				ts: taro._timeScale,
				ct: taro._currentTime,
			});
		} else {
			console.log('rejecting connection', clientRejectReason);
			socket.close(clientRejectReason, null, true);
		}
	},

	/**
	 * Called when the server receives a network message from a client.
	 * @param {Object} data The data sent by the client.
	 * @param {String} clientId The client socket id.
	 * @private
	 */
	_onClientMessage: function (data, clientId) {
		var self = this;

		if (this.socket(clientId)?.markedForTracking && taro.workerComponent) {
			var ciDecoded = data[0].charCodeAt(0);
			var commandName = this._networkCommandsIndex[ciDecoded];
			let decoded = _.clone(data);
			decoded[0] = commandName;

			taro.workerComponent.socketMessages[clientId] += JSON.stringify(decoded);
		}

		var socket = taro.network._socketById[clientId];

		// check if the clientId belongs to this socket connection.
		if (socket && socket._token && socket._token.clientId) {
			if (socket._token.clientId !== clientId) {
				console.log('_onClientMessage: clientId validation failed', socket._token.clientId, clientId, data);
				socket.close('Client could not be validated, please refresh the page.');
				return;
			}
		}

		if (typeof data[0] === 'string') {
			if (data[0].charCodeAt(0) != undefined) {
				var ciDecoded = data[0].charCodeAt(0);
				var commandName = this._networkCommandsIndex[ciDecoded];

				if (this._networkCommands[commandName]) {
					this._networkCommands[commandName](data[1], clientId);
				}
				this.emit(commandName, [data[1], clientId]);
			}
		}
	},

	_onRequest: function (data, clientId) {
		// The message is a network request so fire
		// the command event with the request id and
		// the request data
		data.clientId = clientId;
		this._requests[data.id] = data;

		if (this.debug()) {
			console.log('onRequest', data);
			console.log('emitting', data.cmd, [data.id, data.data]);
			this._debugCounter++;
		}

		if (this._networkCommands[data.cmd]) {
			this._networkCommands[data.cmd](data.data, clientId, data.id);
		}

		this.emit(data.cmd, [data.id, data.data, clientId]);
	},

	_onResponse: function (data, clientId) {
		// The message is a network response
		// to a request we sent earlier
		id = data.id;

		// Get the original request object from
		// the request id
		req = this._requests[id];

		if (this.debug()) {
			// console.log('onResponse', data);
			this._debugCounter++;
		}

		if (req) {
			// Fire the request callback!
			req.callback(req.cmd, [data.data, clientId]);

			// Delete the request from memory
			delete this._requests[id];
		}
	},

	/**
	 * Called when a client disconnects from the server.
	 * @param {Object} data Any data sent along with the disconnect.
	 * @param {Object} socket The client socket object.
	 * @private
	 */
	_onSocketDisconnect: function (data, socket) {
		var self = this;

		const _disconnect = self._socketById[socket.id]?._disconnect || {};

		const code = _disconnect.code || data?.code; //https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
		let reasonCode = _disconnect.reasonCode || '';
		let reason = _disconnect.reason || data?.reason.toString();
		let source = _disconnect.source || '';

		if (!reason && !reasonCode) {
			switch (code) {
				case 1001:
					reason = reasonCode = 'Going Away';
					break;
				case 1002:
					reason = reasonCode = 'Protocol error';
					break;
				case 1003:
					reason = reasonCode = 'Unsupported Data';
					break;
				case 1005:
					reason = reasonCode = 'No Status Rcvd';
					break;
				case 1006:
					reason = reasonCode = 'Abnormal Closure';
					break;
				case 1007:
					reason = reasonCode = 'Invalid frame payload data';
					break;
				case 1008:
					reason = reasonCode = 'Policy Violation';
					break;
				case 1009:
					reason = reasonCode = 'Message Too Big';
					break;
				case 1010:
					reason = reasonCode = 'Mandatory Ext.';
					break;
				case 1011:
					reason = reasonCode = 'Internal Error';
					break;
				case 1012:
					reason = reasonCode = 'Service Restart';
					break;
				case 1013:
					reason = reasonCode = 'Try Again Later';
					break;
				case 1014:
					reason = reasonCode = 'Bad Gateway';
					break;
				case 1015:
					reason = reasonCode = 'TLS handshake';
					break;
				default:
					reason = reasonCode = code;
			}
		}

		this.log(`Client disconnected with id ${socket.id}`);
		console.log(
			`Client disconnected with id ${socket.id}, reason: ${reason}, reasonCode: ${reasonCode}, code: ${code}`
		);

		var end = Date.now();

		global.trackServerEvent &&
			global.trackServerEvent(
				{
					eventName: 'Game Session Duration',
					properties: {
						$ip: socket._remoteAddress,
						gameSlug: taro.game && taro.game.data && taro.game.data.defaultData && taro.game.data.defaultData.gameSlug,
						gameId: taro.game && taro.game.data && taro.game.data.defaultData && taro.game.data.defaultData._id,
						playTime: end - self._socketById[socket.id].start,
						code: code,
						reason: reason,
						reasonCode: reasonCode,
						server: process.env.IP,
						tier: process.env.WORKER_TIER || process.env.TIER,
						previousDisconnects: socket._previousDisconnects || [],
						reconnectCount: socket._previousDisconnects?.length || 0,
						source: source,
					},
				},
				socket
			);

		// triggers _onClientDisconnect in ServerNetworkEvents.js
		this.emit('disconnect', {
			clientId: socket.id,
			reason: _disconnect.reason,
		});

		// Remove them from all rooms
		this.clientLeaveAllRooms(socket.id);

		delete taro.server.clients[socket.id];
		delete this._socketById[socket.id];
		delete this._socketByIp[socket._remoteAddress];

		let indexToRemove = this.clientIds.findIndex(function (id) {
			if (id === socket.id) return true;
		});
		if (indexToRemove > -1) {
			this.clientIds.splice(indexToRemove, 1);
		}
	},
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroNetIoServer;
}
