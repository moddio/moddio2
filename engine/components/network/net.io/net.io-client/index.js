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
		var posthogDistinctId = window.posthogDistinctId || (window.posthog && window.posthog.get_distinct_id ? window.posthog.get_distinct_id() : '');	
		const workerPortQuery = (new URL(window.location.href).searchParams.get('proxy') === 'master') ? '' : `&cfwp=${(parseInt(taro.client.server?.name?.split('.')[1] || 0) + 2000)}`;

		this.wsUrl = `${url}?token=${gsAuthToken}&sid=${taro.client.server.id}${workerPortQuery}&distinctId=${distinctId}&posthogDistinctId=${posthogDistinctId}&ws_port=${taro.client.server.wsPort}`;
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
		return new Promise((resolve) => {
			
			this.reconnectedAt = Date.now();
			this.reconnectedAt = null;
			this.fallbackTimeout = null;
			this.connectionOpenTimeout = null;
			
			// Set the state to connecting
			this._state = 1;
			
			// Create new websocket to the url
			this.wsStartTime = Date.now();
			this.startTimeSinceLoad = performance.now();
			
			this._socket = new WebSocket(this.wsUrl, ['netio1', 'reconnect']);
			
			// Setup event listeners
			this._socket.onopen = function () {
				console.warn('...reconnected at ' + new Date().toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " "));
				self._onOpen.apply(self, arguments);
				
				// resolve if connection is open for about a second
				self.connectionOpenTimeout = setTimeout(() => {
					clearTimeout(self.fallbackTimeout);
					resolve({status: 'open', code: 0, reason: '', state: self._state});
				}, 1000);
			};
			
			this._socket.onmessage = function () {
				self._onData.apply(self, arguments);
			};
			
			this._socket.onclose = function (event) {
				const reason = self._disconnectReason || event.reason;
				const state = self._state;
				self._onClose.apply(self, arguments);
				
				clearTimeout(self.fallbackTimeout);
				clearTimeout(self.connectionOpenTimeout);
				resolve({status: 'closed', code: event.code, reason, state});
			};
			
			this._socket.onerror = function (event) {
				const reason = self._disconnectReason || event?.reason;
				const state = self._state;
				self._onError.apply(self, arguments);
				
				clearTimeout(self.fallbackTimeout);
				clearTimeout(self.connectionOpenTimeout);
				resolve({status: 'error', code: event?.code, reason, state});
			};
			
			// fallback - timeout if none of the above events are triggerred 
			this.fallbackTimeout = setTimeout(() => {
				clearTimeout(self.connectionOpenTimeout);
				resolve({status: 'timeout', code: 0, reason: self._disconnectReason, state: self._state});
			}, 10000);
		});
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

	averageLatency99thPercentile: function (pingLatency) {
		// Sort the array in ascending order
		pingLatency.sort((a, b) => a - b);

		// Calculate the index for the 99th percentile
		const index99Percentile = Math.floor((pingLatency.length - 1) * 0.99);

		// Take the sum of elements up to the 99th percentile index
		let sum99Percentile = 0;
		for (let i = 0; i <= index99Percentile; i++) {
			sum99Percentile += pingLatency[i];
		}

		// Calculate the average of the 99th percentile sum
		const average99thPercentile = sum99Percentile / (index99Percentile + 1);

		return Math.floor(average99thPercentile);
	},

	trackLatency: function () {
		var self = this;
		clearInterval(taro.trackLatencyInterval);
		// track latency every 30 seconds
		taro.trackLatencyInterval = setInterval(function () {
			// track only if document is in focus to avoid tracking inaccurate latencies
			if (window.newrelic && taro.pingLatency?.length && document.hasFocus()) {
				window.newrelic.addPageAction('gsPing', {
					user: window.username,
					game: window.gameSlug,
					container: taro.client.server.name,
					server: taro.client.server.url,
					latency: self.averageLatency99thPercentile(taro.pingLatency),
				});
			}
			taro.pingLatency = [];
		}, 30 * 1000);
	},

	_onOpen: function (event) {
		var url = event.target.url;
		var urlWithoutProtocol = url.split('://')[1];
		var serverDomain = urlWithoutProtocol.split('/')[0];
		var serverName = serverDomain.split(':')[0];
		this._state = 2;

		this.trackLatency();
	},

	_onData: function (data) {
		// Decode packet and emit message event
		this._decode(data);
	},

	_onDecode: function (packet, data) {

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

		var wasClean = event.wasClean;
		var reason = this._disconnectReason || event.reason;
		var code = event.code;
		
		console.warn('disconnected at ' + new Date().toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + ' with code', code, this._state, 'and start reconnecting...');
		console.log('close event', event, { _disconnectReason: this._disconnectReason, state: this._state, reason });
		
		const disconnectData = {
			wsUrl: this.wsUrl,
			wsReadyState: this._socket.readyState,
			wsUserId: userId,
			wsGameSlug: gameSlug,
			wsServerName: taro.client.server.name,
			wsServerUrl: taro.client.server.url,
			wsOnline: navigator.onLine,
			wsDocInFocus: document.hasFocus(),
			wsWasClean: wasClean,
			wsState: this._state,
			wsReason: reason,
			wsCode: code,
			wsWasReconnected: window.wasReconnected,
		};
		
		// if we don't know why we disconnected and the server IS responding(!1)
		if (!reason && this._state !== 1) {
			
			// wait 500ms before attempting reconnection
			return setTimeout(() => {
				window.wasReconnected = true;
				window.reconnectInProgress = true;
				this.reconnect(this.wsUrl)
					.then(({status, reason, code, state}) => {
						console.log('disconnected', disconnectData);
						
						disconnectData.wsReconnectState = state;
						disconnectData.wsReconnectStatus = status;
						disconnectData.wsReconnectReason = reason;
						disconnectData.wsReconnectCode = code;
						
						if (window.newrelic) {
							window.newrelic.addPageAction('gs-websocket-disconnects', disconnectData);
						}
						
						if (window.trackEvent) {
							window.trackEvent('Socket Disconnect', disconnectData);
						}
						
						window.reconnectInProgress = false;
					});
			}, 500);
		}
		
		console.log('disconnected', disconnectData);
		if (!window.reconnectInProgress) {
			if (window.newrelic) {
				window.newrelic.addPageAction('gs-websocket-disconnects', disconnectData);
			}
			
			if (window.trackEvent) {
				window.trackEvent('Socket Disconnect', disconnectData);
			}
		}
		
		// If we are already connected and have an id...
		if (this._state === 3) {
			this._state = 0;
			this.emit('disconnect', { reason, wasClean, code });
		}

		// If we are connected but have no id...
		if (this._state === 2) {
			this._state = 0;
			this.emit('disconnect', { reason, wasClean, code });
		}

		// If we were trying to connect...
		if (this._state === 1) {
			this._state = 0;
			
			function parseJwt (token) {
				var base64Url = token.split('.')[1];
				var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
				var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
					return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
				}).join(''));
				
				return JSON.parse(jsonPayload);
			}
			
			const decodedToken = parseJwt(window.gsAuthToken);
			const bannedReason = 'Restricted IP detected. If you think you were wrongfully banned, please contact a staff member in our Discord: <a href="https://discord.gg/XRe8T7K">https://discord.gg/XRe8T7K</a>.';
			
			const disconnectReason = decodedToken.isBanned ? bannedReason : 'Error trying to contact server. Please refresh this page or visit our homepage.';
			taro.menuUi.onDisconnectFromServer('netio-client index:446', disconnectReason);
			this.emit('error', { reason: 'Cannot establish connection, is server running?' });
		}

		// Remove the last disconnect reason
		delete this._disconnectReason;

		clearInterval(taro.trackLatencyInterval);
	},

	_onError: function () {
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
		// var jsonString = LZUTF8.decompress(data.data, {inputEncoding: "StorageBinaryString"});
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
