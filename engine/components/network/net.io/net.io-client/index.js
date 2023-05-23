// Our namespace
var NetIo = {};

/**
 * Define the debug options object.
 * @type {Object}
 * @private
 */
NetIo._debug = {
	_enabled: true,
	_node: typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined',
	_level: ['log', 'warning', 'error'],
	_stacks: false,
	_throwErrors: true,
	_trace: {
		setup: false,
		enabled: false,
		match: ''
	},
	enabled: function (val) {
		if (val !== undefined) {
			this._enabled = val;
			return this;
		}

		return this._enabled;
	}
};

/**
 * Define the class system.
 * @type {*}
 */
NetIo.Class = TaroClass;

NetIo.EventingClass = TaroEventingClass;

NetIo.Client = NetIo.EventingClass.extend({
	classId: 'NetIo.Client',

	init: function (url, options) {
		this.log('Net.io client starting...');

		this._options = options || {};
		this._socket = null;
		this._state = 0;
		this._debug = false;
		this._connectionAttempts = 0;

		this._sentBytesSinceLastUpdate = 0;
		this._sentBytesTotal = 0;
		this._receivedBytesSinceLastUpdate = 0;
		this._receivedBytesTotal = 0;
		this._started = new Date();
		this._lastSentUpdated = new Date();
		this._lastReceiveUpdated = new Date();
		this._receiveRate = 0;
		this._sendRate = 0;
		this.wsUrl = '';
		this.wsStartTime = null;
		this.startTimeSinceLoad = null;
		this.pingInterval = null;
		this.reconnectedAt = null;

		// this.COMPRESSION_THRESHOLD = 30000;

		// Set some default options
		if (this._options.connectionRetry === undefined) { this._options.connectionRetry = true; }
		if (this._options.connectionRetryMax === undefined) { this._options.connectionRetryMax = 10; }
		if (this._options.reconnect === undefined) { this._options.reconnect = true; }

		// If we were passed a url, connect to it
		if (url !== undefined) {
			this.connect(url);
		}
	},

	/**
	 * Gets / sets the debug flag. If set to true, net.io
	 * will output debug data about every network event as
	 * it occurs to the console.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	debug: function (val) {
		if (val !== undefined) {
			this._debug = val;
			return this;
		}

		return this._debug;
	},

	connect: function (url) {
		this.log(`Connecting to server at ${url}`);
		var self = this;

		// Set the state to connecting
		this._state = 1;

		/*
		// Replace http:// with ws://
		if (window.location.protocol == 'https:'){
				url = url.replace('http://', 'wss://');
		} else {
				url = url.replace('http://', 'ws://');
		}
		*/

		// Create new websocket to the url

		var distinctId = window.distinctId || '';
		var posthogDistinctId = window.posthog && window.posthog.get_distinct_id ? window.posthog.get_distinct_id() : '';		
		
		this.wsUrl = `${url}?token=${gsAuthToken}&sid=${taro.client.server.id}&distinctId=${distinctId}&posthogDistinctId=${posthogDistinctId}`;
		this.wsStartTime = Date.now();
		this.startTimeSinceLoad = performance.now();

		this._socket = new WebSocket(this.wsUrl, 'netio1');

		// Setup event listeners
		this._socket.onopen = function () {
			self._onOpen.apply(self, arguments);
		};
		this._socket.onmessage = function () {
			self._onData.apply(self, arguments);
		};
		this._socket.onclose = function () {
			self._onClose.apply(self, arguments);
		};
		this._socket.onerror = function () {
			self._onError.apply(self, arguments);
		};
	},

	reconnect: function() {
		var self = this;
		this.reconnectedAt = Date.now();
		this.trackLatency('gs-websocket-connect', 'onreconnect');
		this.reconnectedAt = null;

		// Set the state to connecting
		this._state = 1;

		// Create new websocket to the url
		this.wsStartTime = Date.now();
		this.startTimeSinceLoad = performance.now();

		this._socket = new WebSocket(this.wsUrl, ['netio1', 'reconnect']);

		// Setup event listeners
		this._socket.onopen = function () {
			self._onOpen.apply(self, arguments);
		};
		this._socket.onmessage = function () {
			self._onData.apply(self, arguments);
		};
		this._socket.onclose = function () {
			self._onClose.apply(self, arguments);
		};
		this._socket.onerror = function () {
			self._onError.apply(self, arguments);
		};
	},

	disconnect: function (reason) {
		console.log('disconnected with reason', reason);
		// console.trace();

		this._socket.close(1000, reason);
		// this.emit('_taroStreamDestroy');
	},

	send: function (data) {
		if (this._socket.readyState == 1) {
			var str = this._encode(data);
			this._socket.send(str);

			// how many UTF8 characters did we send (assume 1 byte per char and mostly ascii)
			var sentBytes = str.length;
			this._sentBytesSinceLastUpdate += sentBytes;
			this._sentBytesTotal += sentBytes;

			// all time average
			var now = new Date();
			var elapsedSinceStarted = (now - this._started) * 0.001;
			this._averageSendRate = this._sentBytesTotal / elapsedSinceStarted;

			// average in last second
			var elapsed = (now - this._lastSentUpdated) * 0.001;
			if (elapsed >= 1) {
				this._sendRate = this._sentBytesSinceLastUpdate / elapsed;
				this._lastSentUpdated = now;
				this._sentBytesSinceLastUpdate = 0;
				// plot against 2x all time average
				if (statsPanels.sent) {
					statsPanels.sent._sentPanel.update(this._sendRate, this._averageSendRate * 2);
				}
			}
		} else {
			// testing commenting this out.
			// this.disconnect();
		}
	},

	trackLatency: function (actionName, actionEvent, data) {
		var self = this;

		if (actionName === 'gs-websocket-ping') {
			const endTime = Date.now();
			if (window.newrelic) {
				window.newrelic.addPageAction(actionName, {
					wsUrl: this.wsUrl,
					wsAction: actionEvent,
					wsState: this._socket.readyState,
					wsUserId: userId,
					wsGameSlug: gameSlug,
					wsServerName: taro.client.server.name,
					wsServerUrl: taro.client.server.url,
					wsLatency: endTime - data.clientSentAt,
					wsStartTime: data.clientSentAt,
					wsEndTime: endTime
				});
			}
		} else {
			const endTimeSinceLoad = performance.now();
			if (window.newrelic) {
				window.newrelic.addPageAction(actionName, {
					wsUrl: this.wsUrl,
					wsAction: actionEvent,
					wsState: this._socket.readyState,
					wsUserId: userId,
					wsGameSlug: gameSlug,
					wsServerName: taro.client.server.name,
					wsServerUrl: taro.client.server.url,
					wsLatency: endTimeSinceLoad - this.startTimeSinceLoad,
					wsStartTimeSinceLoad: this.startTimeSinceLoad,
					wsEndTimeSinceLoad: endTimeSinceLoad,
					wsStartTime: this.wsStartTime,
					wsEndTime: Date.now(),
					reconnectedAt: this.reconnectedAt
				});
			}

			if (this.pingInterval) {
				clearInterval(this.pingInterval);
			}

			if (actionEvent === 'onopen') {
				// start ping interval
				const pingIntervalTimeout = 10000; // every 10s

				this.pingInterval = setInterval(() => {
					self._socket.send(JSON.stringify({
						type: 'ping',
						sentAt: Date.now()
					}));
				}, pingIntervalTimeout);
			}
		}
	},

	_onOpen: function (event) {
		this.trackLatency('gs-websocket-connect', 'onopen');

		var url = event.target.url;
		var urlWithoutProtocol = url.split('://')[1];
		var serverDomain = urlWithoutProtocol.split('/')[0];
		var serverName = serverDomain.split(':')[0];

		// $.ajax({
		// 	url: '/socket-error-count',
		// 	dataType: 'json',
		// 	type: 'POST',
		// 	data: {
		// 		status: true,
		// 		server: serverName,
		// 		tier: window.tier
		// 	}
		// });

		this._state = 2;
	},

	_onData: function (data) {
		// Decode packet and emit message event
		this._decode(data);
	},

	_onDecode: function (packet, data) {

		if (packet && packet.type === 'pong') {
			const latency = Date.now() - packet.clientSentAt;
			this.trackLatency('gs-websocket-ping', 'pong', packet);
			return;
		}

		// how many UTF8 characters did we receive (assume 1 byte per char and mostly ascii)
		// var receivedBytes = data.data.size;
		var receivedBytes = (data.data && data.data.length) || 0;
		this._receivedBytesSinceLastUpdate += receivedBytes;
		this._receivedBytesTotal += receivedBytes;

		// all time average
		var now = new Date();
		var elapsedSinceStarted = (now - this._started) * 0.001;
		this._averageReceiveRate = this._receivedBytesTotal / elapsedSinceStarted;

		// average in last second
		var elapsed = (now - this._lastReceiveUpdated) * 0.001;
		if (elapsed >= 1) {
			this._receiveRate = this._receivedBytesSinceLastUpdate / elapsed;
			this._lastReceiveUpdated = now;
			this._receivedBytesSinceLastUpdate = 0;
			// plot against 2x all time average
			if (statsPanels.received) {
				statsPanels.received._receivedPanel.update(this._receiveRate, this._averageReceiveRate * 2);
			}

			var bandwidthUsed = (this._receivedBytesTotal + this._sentBytesTotal) / 1024;
			if (statsPanels.bandwidth) {
				statsPanels.bandwidth._bandwidthPanel.update(bandwidthUsed, bandwidthUsed * 2);
			}
		}

		// Output debug if required
		if (this._debug) {
			console.log('Incoming data (event, decoded data):', data, packet);
		}

		if (packet._netioCmd) {
			// The packet is a netio command
			switch (packet._netioCmd) {
				case 'id':
					// Store the new id in the socket
					this.id = packet.data;

					// Now we have an id, set the state to connected
					this._state = 3;

					// Emit the connect event
					this.emit('connect', this.id);
					break;

				case 'close':
					// The server told us our connection has been closed
					// so store the reason the server gave us!
					this._disconnectReason = packet.data;
					break;
			}
		} else {
			// The packet is normal data
			this.emit('message', [packet]);
		}
	},

	_onClose: function (event) {
		this.trackLatency('gs-websocket-connect', 'onclose');

		var wasClean = event.wasClean;
		var reason = event.reason;
		var code = event.code;

		console.log('close event', event, { state: this._state, reason: this._disconnectReason });

		// if we don't know why we disconnected and the server IS responding(!1)
		if (!this._disconnectReason && this._state !== 1) {
			// wait 500ms before attempting reconnection
			return setTimeout(() => {
				this.reconnect(this.wsUrl);
			}, 500);
		}


		if (code === 1006) {
			var url = event.target.url;
			var urlWithoutProtocol = url.split('://')[1];
			var serverDomain = urlWithoutProtocol.split('/')[0];

			// $.ajax({
			// 	url: '/socket-error-count',
			// 	dataType: 'json',
			// 	type: 'POST',
			// 	data: {
			// 		status: false,
			// 		server: serverDomain,
			// 		tier: window.tier
			// 	}
			// });
		}
		// if (code === 1006) {
		// 	console.log('experienced issue 1006');
		// 	var baseUrl = location.host + location.pathname;
		// 	var queryString = '?serverId=' + window.connectedServer.id + '&joinGame=true&redirected=' + location.protocol;

		// 	if (baseUrl[baseUrl.length - 1] === '/') {
		// 		baseUrl += queryString;
		// 	}
		// 	else {
		// 		baseUrl += '/' + queryString;
		// 	}

		// 	if (location.protocol === 'https:') {
		// 		var newUrl = 'http://' + baseUrl;
		// 		console.log('redirecting from https to http', newUrl);

		// 		// was already redirected from http version
		// 		// if (location.search.indexOf('redirected=http:') > -1) {
		// 		// }
		// 		// Rollbar.critical("socket error 1006 over https", { data: { code: code, reason: reason, wasClean: wasClean } });

		// 		location.href = newUrl;
		// 	}
		// 	else if (location.protocol === 'http:') {
		// 		var newUrl = 'https://' + baseUrl;
		// 		console.log('redirecting from http to https', newUrl);

		// 		// was already redirected from https version
		// 		// if (location.search.indexOf('redirected=https:') > -1) {
		// 		// 	Rollbar.critical("socket error 1006 over http", { data: { code: code, reason: reason, wasClean: wasClean } });
		// 		// }

		// 		// Rollbar.critical("socket error 1006 over http", { data: { code: code, reason: reason, wasClean: wasClean } });
		// 		if (location.hostname !== 'localhost') {
		// 			location.href = newUrl;
		// 		}
		// 	}
		// }
		// console.log(this._state, 'this._state with code 1006');

		// If we are already connected and have an id...
		if (this._state === 3) {
			this._state = 0;
			this.emit('disconnect', { reason: this._disconnectReason, wasClean: wasClean, code: code });
		}

		// If we are connected but have no id...
		if (this._state === 2) {
			this._state = 0;
			this.emit('disconnect', { reason: this._disconnectReason, wasClean: wasClean, code: code });
		}

		// If we were trying to connect...
		if (this._state === 1) {
			this._state = 0;
			taro.menuUi.onDisconnectFromServer('netio-client index:446','Error trying to contact server. Please refresh this page or visit our homepage.');
			this.emit('error', { reason: 'Cannot establish connection, is server running?' });
		}

		// Remove the last disconnect reason
		delete this._disconnectReason;
	},

	_onError: function () {
		this.trackLatency('gs-websocket-connect', 'onerror');

		this.log('An error occurred with the net.io socket!', 'error', arguments);
		console.log('An error occurred with the net.io socket!', 'error', arguments);
		this.emit('error', arguments);
	},

	_encode: function (data) {
		return JSON.stringify(data);
	},

	_decode: function (data) {
		var self = this;

		var jsonString = LZString.decompressFromUTF16(data.data);
		// var jsonString = data.data;

		// NOTE: make sure than COMPRESSION_THRESHOLD is same on both client and server
		// LOGIC:
		//     1. if json string has less than COMPRESSION_THRESHOLD chars (e.g. 9998)
		//        then it was compressed on server side so decompress it
		//        (because we are comparing with COMPRESSION_THRESHOLD before compressing it)
		//     2. if json string has more than COMPRESSION_THRESHOLD chars (10001)
		//        then it was not compressed on server side so don't run decompression on it
		//        and just parse the data as is

		// var jsonString = data.data.length > self.COMPRESSION_THRESHOLD
		// 	? data.data
		// 	: LZString.decompressFromUTF16(data.data);

		self._onDecode(JSON.parse(jsonString), data);
		// self._onDecode(JSON.parse(data.data), data);
		// var blob = data.data;
		// var fileReader = new FileReader();
		// fileReader.onload = function () {
		// 	arrayBuffer = this.result;
		// 	var uint8Array = new Uint8Array(arrayBuffer);
		// 	//console.log(uint8Array);
		// 	var packet = msgpack.decode(uint8Array);
		// 	//console.log(packet);
		// 	self._onDecode(packet, data);
		// };
		// fileReader.readAsArrayBuffer(blob);
	}
});
