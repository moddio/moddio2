// Our namespace
var NetIo = {};

/**
 * Define the debug options object.
 * @type {Object}
 * @private
 */
NetIo._debug = {
	node: typeof module !== 'undefined' && typeof module.exports !== 'undefined',
	level: ['log', 'warning', 'error'],
	stacks: false,
	throwErrors: true,
	trace: {
		setup: false,
		enabled: false,
		match: '',
	},
};

/**
 * Define the class system.
 * @type {*}
 */
NetIo.Class =
	typeof TaroClass !== 'undefined'
		? TaroClass
		: (function () {
				var initializing = false;
				var fnTest = /xyz/.test(function () {
					xyz;
				})
					? /\b_super\b/
					: /.*/;

				// The base Class implementation (does nothing)
				var Class = function () {};
				// TODO: Add parameters to all the doc comments below.
				/**
				 * Provides logging capabilities to all Class instances.
				 */
				var log = function (text, type, obj) {
					var indent = '';
					var i;
					var stack;
					if (!NetIo._debug.trace.indentLevel) {
						NetIo._debug.trace.indentLevel = 0;
					}

					for (i = 0; i < NetIo._debug.trace.indentLevel; i++) {
						indent += '  ';
					}

					type = type || 'log';

					if (type === 'error') {
						if (NetIo._debug.stacks) {
							if (NetIo._debug.node) {
								stack = new Error().stack;
								// console.log(color.magenta('Stack:'), color.red(stack));
								console.log('Stack:', stack);
							} else {
								if (typeof printStackTrace === 'function') {
									console.log('Stack:', printStackTrace().join('\n ---- '));
								}
							}
						}

						if (NetIo._debug.throwErrors) {
							throw `${indent}Net.io *${type}* [${this._classId || this.prototype._classId}] : ${text}`;
						} else {
							console.log(`${indent}Net.io *${type}* [${this._classId || this.prototype._classId}] : ${text}`);
						}
					} else {
						console.log(`${indent}Net.io *${type}* [${this._classId || this.prototype._classId}] : ${text}`);
					}

					return this;
				};

				/**
				 * Gets / sets the class id. Primarily used to help identify
				 * what class an instance was instantiated with and is also
				 * output during the taro.scenegraph() method's console logging
				 * to show what class an object belogs to.
				 */
				var classId = function (name) {
					if (typeof name !== 'undefined') {
						if (this._classId) {
							this._classId = name;
						} else {
							this.prototype._classId = name;
						}
						return this;
					}

					return this._classId || this.prototype._classId;
				};

				/**
				 * Creates a new instance of the component argument passing
				 * the options argument to the component as it is initialised.
				 * The new component instance is then added to "this" via
				 * a property name that is defined in the component class as
				 * "componentId".
				 */
				var addComponent = function (component, options, callback) {
					var newComponent = new component(this, options, callback);
					this[newComponent.componentId] = newComponent;
					return this;
				};

				/**
				 * Copies all properties and methods from the classObj object
				 * to "this". If the overwrite flag is not set or set to false,
				 * only properties and methods that don't already exists in
				 * "this" will be copied. If overwrite is true, they will be
				 * copied regardless.
				 */
				var implement = function (classObj, overwrite) {
					var i;
					var obj = classObj.prototype || classObj;

					// Copy the class object's properties to (this)
					for (i in obj) {
						// Only copy the property if this doesn't already have it
						if (obj.hasOwnProperty(i) && (overwrite || this[i] === undefined)) {
							this[i] = obj[i];
						}
					}
					return this;
				};

				/**
				 * Gets / sets a key / value pair in the object's data object. Useful for
				 * storing arbitrary game data in the object.
				 * @param {String} key The key under which the data resides.
				 * @param {*=} value The data to set under the specified key.
				 * @return {*}
				 */
				var data = function (key, value) {
					if (key !== undefined) {
						if (value !== undefined) {
							this._data[key] = value;

							return this;
						}

						return this._data[key];
					}
				};

				// Create a new Class that inherits from this class
				Class.extend = function () {
					var _super = this.prototype;
					var name;
					var prototype;
					// Set prop to the last argument passed
					var prop = arguments[arguments.length - 1];
					var extensionArray = arguments[0];
					var extensionItem;
					var extensionOverwrite;
					var extensionIndex;
					var propertyIndex;
					var propertyObject;

					// Instantiate a base class (but only create the instance,
					// don't run the init constructor)
					initializing = true;
					prototype = new this();
					initializing = false;

					// Copy the properties over onto the new prototype
					for (name in prop) {
						// Check if we're overwriting an existing function
						if (typeof prop[name] === 'function' && typeof _super[name] === 'function' && fnTest.test(prop[name])) {
							// Allow access to original source code
							// so we can edit the engine live
							prototype[`__${name}`] = prop[name];

							// Assign a new method to allow access to the
							// super-class method via this._super() in the
							// new method
							prototype[name] = (function (name, fn) {
								return function () {
									var tmp = this._super;
									var ret;

									// Add a new ._super() method that is the same method
									// but on the super-class
									this._super = _super[name];

									// The method only need to be bound temporarily, so we
									// remove it when we're done executing
									ret = fn[`__${name}`].apply(this, arguments);
									// ret = fn.apply(this, arguments);
									this._super = tmp;

									return ret;
								};
							})(name, prototype);
						} else {
							// The prop is not a method
							prototype[name] = prop[name];
						}
					}

					// Now implement any other extensions
					if (arguments.length > 1) {
						if (extensionArray && extensionArray.length) {
							for (extensionIndex = 0; extensionIndex < extensionArray.length; extensionIndex++) {
								extensionItem = extensionArray[extensionIndex];
								propertyObject = extensionItem.extension.prototype || extensionItem.extension;
								extensionOverwrite = extensionItem.overwrite;

								// Copy the class object's properties to (this)
								for (propertyIndex in propertyObject) {
									// Only copy the property if this doesn't already have it or
									// the extension is set to overwrite any existing properties
									if (
										propertyObject.hasOwnProperty(propertyIndex) &&
										(extensionOverwrite || prototype[propertyIndex] === undefined)
									) {
										prototype[propertyIndex] = propertyObject[propertyIndex];
									}
								}
							}
						}
					}

					// The dummy class constructor
					function Class() {
						this._data = {};
						if (!initializing && this.init) {
							this.init.apply(this, arguments);
						}
					}

					// Populate our constructed prototype object
					Class.prototype = prototype;

					// Enforce the constructor to be what we expect
					Class.prototype.constructor = Class;

					// And make this class extendable
					Class.extend = arguments.callee;

					// Add log capability
					Class.prototype.log = log;

					// Add data capability
					Class.prototype.data = data;

					// Add class name capability
					Class.prototype.classId = classId;
					Class.prototype._classId = prop.classId || 'Class';

					// Add the addComponent method
					Class.prototype.addComponent = addComponent;

					// Add the implement method
					Class.prototype.implement = implement;

					return Class;
				};

				return Class;
			})();

NetIo.EventingClass =
	typeof TaroEventingClass !== 'undefined'
		? TaroEventingClass
		: NetIo.Class.extend({
				/**
				 * Add an event listener method for an event.
				 * @param {String || Array} eventName The name of the event to listen for (string), or an array of events to listen for.
				 * @param {Function} call The method to call when the event listener is triggered.
				 * @param {Object=} context The context in which the call to the listening method will be made (sets the 'this' variable in the method to the object passed as this parameter).
				 * @param {Boolean=} oneShot If set, will instruct the listener to only listen to the event being fired once and will not fire again.
				 * @param {Boolean=} sendEventName If set, will instruct the emitter to send the event name as the argument instead of any emitted arguments.
				 * @return {Object}
				 */
				on: function (eventName, call, context, oneShot, sendEventName) {
					// Check that we have an event listener object
					this._eventListeners = this._eventListeners || {};

					if (typeof call == 'function') {
						if (typeof eventName == 'string') {
							// Check if this event already has an array of listeners
							this._eventListeners[eventName] = this._eventListeners[eventName] || [];

							// Compose the new listener
							var newListener = {
								call: call,
								context: context,
								oneShot: oneShot,
								sendEventName: sendEventName,
							};

							// Check if we already have this listener in the list
							var addListener = true;

							// TO-DO - Could this do with using indexOf? Would that work? Would be faster?
							for (var i in this._eventListeners[eventName]) {
								if (this._eventListeners[eventName][i] == newListener) {
									addListener = false;
									break;
								}
							}

							// Add this new listener
							if (addListener) {
								this._eventListeners[eventName].push(newListener);
							}

							return newListener;
						} else {
							// The eventName is an array of names, creating a group of events
							// that must be fired to fire this event callback
							if (eventName.length) {
								// Loop the event array
								var multiEvent = [];
								multiEvent[0] = 0; // This will hold our event count total
								multiEvent[1] = 0; // This will hold our number of events fired
								multiEvent[2] = []; // This will hold the list of already-fired event names

								// Define the multi event callback
								multiEvent[3] = this.bind(function (firedEventName) {
									if (multiEvent[2].indexOf(firedEventName) == -1) {
										multiEvent[2].push(firedEventName);
										multiEvent[1]++;

										if (multiEvent[0] == multiEvent[1]) {
											call.apply(context || this);
										}
									}
								});

								for (var eventIndex in eventName) {
									var eventData = eventName[eventIndex];
									var eventObj = eventData[0];
									var eventNameArray = eventData[1];

									multiEvent[0] += eventNameArray.length;

									for (var singleEventIndex in eventNameArray) {
										// Get the event name
										var singleEventName = eventNameArray[singleEventIndex];

										// Register each event against the event object with a callback
										eventObj.on(singleEventName, multiEvent[3], null, true, true);
									}
								}
							}
						}
					} else {
						if (typeof eventName != 'string') {
							eventName = '*Multi-Event*';
						}
						this.log(
							`Cannot register event listener for event "${eventName}" because the passed callback is not a function!`,
							'error'
						);
					}
				},

				/**
				 * Emit an event by name.
				 * @param {Object} eventName The name of the event to listen for.
				 * @param {Object || Array} args The arguments to send to any listening methods. If you are sending multiple arguments, use an array containing each argument.
				 * @return {Number}
				 */
				emit: function (eventName, args) {
					if (this._eventListeners) {
						// Check if the event has any listeners
						if (this._eventListeners[eventName]) {
							// Fire the listeners for this event
							var eventCount = this._eventListeners[eventName].length;
							var eventCount2 = this._eventListeners[eventName].length - 1;

							// If there are some events, ensure that the args is ready to be used
							if (eventCount) {
								var finalArgs = [];
								if (typeof args == 'object' && args != null && args[0] != null) {
									for (var i in args) {
										finalArgs[i] = args[i];
									}
								} else {
									finalArgs = [args];
								}

								// Loop and emit!
								var cancelFlag = false;
								var eventIndex;

								while (eventCount--) {
									eventIndex = eventCount2 - eventCount;
									var tempEvt = this._eventListeners[eventName][eventIndex];

									// If the sendEventName flag is set, overwrite the arguments with the event name
									if (tempEvt.sendEventName) {
										finalArgs = [eventName];
									}

									// Call the callback
									var retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);

									// If the retVal === true then store the cancel flag and return to the emitting method
									// TO-DO - Make this a constant that can be named
									if (retVal === true) {
										// The receiver method asked us to send a cancel request back to the emitter
										cancelFlag = true;
									}

									// Check if we should now cancel the event
									if (tempEvt.oneShot) {
										// The event has a oneShot flag so since we have fired the event,
										// lets cancel the listener now
										this.off(eventName, tempEvt);
									}
								}

								if (cancelFlag) {
									return 1;
								}
							}
						}
					}
				},

				/**
				 * Remove an event listener.
				 * @param {Boolean} eventName The name of the event you originally registered to listen for.
				 * @param {Object} evtListener The event listener object to cancel.
				 * @return {Boolean}
				 */
				off: function (eventName, evtListener) {
					if (this._eventListeners) {
						if (this._eventListeners[eventName]) {
							// Find this listener in the list
							var evtListIndex = this._eventListeners[eventName].indexOf(evtListener);
							if (evtListIndex > -1) {
								// Remove the listener from the event listender list
								this._eventListeners[eventName].splice(evtListIndex, 1);
								return true;
							}
							this.log(`Failed to cancel event listener for event named "${eventName}" !`, 'info', evtListener);
						} else {
							this.log('Failed to cancel event listener!');
						}
					}

					return false;
				},

				/**
				 * Returns an object containing the current event listeners.
				 * @return {Object}
				 */
				eventList: function () {
					return this._eventListeners;
				},
			});

NetIo.Socket = NetIo.EventingClass.extend({
	classId: 'Socket',

	init: function (connection) {
		var self = this;

		this._socket = connection;
		this._socket.on('message', function (message) {
			self.emit('message', [self._decode(message)]);
		});

		this._socket.on('close', function (code, reason) {
			// first step in the propagation of the disconnect event.
			// store socket's disconnect reason, if not set already
			self._disconnect = {
				reasonCode: self._disconnect?.reasonCode || self.getReasonCode(reason.toString()),
				reason: self._disconnect?.reason || reason.toString(),
				code: self._disconnect?.code || code,
				at: self._disconnect?.at || new Date(),
				source: self._disconnect?.source || 'closeEvent',
			};

			self.emit('disconnect', {
				socket: self._socket,
				reason,
				code,
			});
		});

		this._socket.on('error', function (error) {
			console.log(`Net.io socket error: ${error}`);
		});
	},

	/**
	 * Encodes the passed JSON data and sends it.
	 * @param data
	 */
	send: function (data) {
		try {
			this._socket.send(this._encode(data), function ack(error) {
				// If error is not defined, the send has been completed, otherwise the error
				// object will indicate what failed.
			});
		} catch (err) {
			console.log('err occured in netio-server/index.js send()');
		}
	},

	/**
	 * Sends pre-encoded data without encoding it.
	 * @param data
	 * @private
	 */
	_send: function (data) {
		try {
			this._socket.send(data, function ack(error) {
				// If error is not defined, the send has been completed, otherwise the error
				// object will indicate what failed.
			});
		} catch (err) {
			console.log('err occured in netio-server/index.js _send()');
		}
	},

	getReasonCode: function (reason) {
		let reasonCode = reason;
		if (reason) {
			reason = reason.toString();
			if (reason.startsWith('You were kicked by')) {
				reasonCode = 'Kicked by Mod';
			} else if (reason.startsWith('Duplicate IP detected')) {
				reasonCode = 'Duplicate IP detected';
			} else if (reason.startsWith('Server has closed connection.')) {
				reasonCode = 'Server closed connection.';
			} else if (reason.startsWith('Security token could not be validated')) {
				reasonCode = 'Invalid security token';
			} else if (reason.startsWith('Lost connection to the server, and grace period for reconnect')) {
				reasonCode = 'Reconnect grace period over';
			} else if (reason.startsWith('server lifespan expired')) {
				reasonCode = 'Server lifespan expired';
			}
		}
		return reasonCode;
	},

	/**
	 * Closes the socket.
	 * @param reason
	 * @param code
	 * @param terminateInstantly
	 */
	close: function (reason, code, terminateInstantly = false) {
		this.send({
			_netioCmd: 'close',
			data: reason,
		});

		if (terminateInstantly) {
			this._socket.terminate();
		}

		// to trace unexpected close events.
		// console.trace();
		console.log('socket.close (code:', code, '):', reason);
		// for backward compatibility
		// if reason is valid numeric code and code is falsey
		// use reason as code
		if (!isNaN(parseInt(reason)) && !code) {
			code = reason;
		}

		// store socket's disconnect reason, if not set already
		this._disconnect = {
			reasonCode: this._disconnect?.reasonCode || this.getReasonCode(reason),
			reason: this._disconnect?.reason || reason,
			code: this._disconnect?.code || code,
			at: this._disconnect?.at || new Date(),
			source: this._disconnect?.source || 'closeFn',
		};

		this._socket.close(code);
	},
});

NetIo.Server = NetIo.EventingClass.extend({
	classId: 'NetIo.Server',

	init: function (port, callback) {
		this._idCounter = 0;

		this._websocket = require('ws');
		this._fs = require('fs');
		this._http = require('http');
		this._https = require('https');
		this._msgpack = require('msgpack-lite');
		const { compressToUTF16 } = require('lz-string');
		const LZUTF8 = require('lzutf8');

		this._compress = compressToUTF16;
		// this._compress = LZUTF8.compress;
		this.COMPRESSION_THRESHOLD = 10000;

		this._sockets = [];
		this._socketsById = {};

		// idle game
		this._userIds = {};
		this._idleTimeoutsByUserId = {};

		if (port !== undefined) {
			this.start(port, callback);
		}
	},

	start: function (port, callback) {
		var self = this;
		this._port = port;

		// Cloudflare SSL flexible mode only encrypt traffic between browser and cloudflare. All the https/wss traffic is diverted to http/ws from Cloudflare to server hence https proxy server is not needed.
		// Https/wss server is not being used currently on production
		var secure = false; // to turn on/off https

		if (process.env.ENV == 'local' || process.env.ENV == 'standalone' || process.env.ENV == 'standalone-remote') {
			secure = false;
			console.log('***');
			console.log('*** running in ENV local - turning https off ***');
			console.log('***');
		}

		// http - local, standalone, standalone-remote env
		this._httpServer = this._http.createServer(function (request, response) {
			response.writeHead(404);
			response.end();
		});

		this._socketServerHttp = new this._websocket.Server({
			server: this._httpServer,
			maxPayload: 200 * 1024, // 100 KB - The maximum allowed message size
			verifyClient: async function (info, done) {
				// Custom logic to determine whether to accept or reject the connection
				const acceptConnection =
					taro.workerComponent && process.env.ENV != 'standalone'
						? await taro.workerComponent.verifyConnectionRequest(info)
						: true;
				done(acceptConnection, acceptConnection ? 200 : 403, acceptConnection ? '' : 'Connection not accepted');
			},
		});

		// Setup listener
		this._socketServerHttp.on('connection', function (ws, request) {
			console.log('connection event');
			self.socketConnection(ws, request);
		});

		this._httpServer.on('error', function (err) {
			switch (err.code) {
				// TODO: Add all the error codes and human readable error here!
				case 'EADDRINUSE':
					self.log(
						`Cannot start server on port ${self._port} because the port is already in use by another application!`,
						'error'
					);
					break;
				default:
					self.log(`Cannot start server, error code: ${err.code}`);
					break;
			}

			console.log('websocket error', err);
		});

		this._httpServer.listen(this._port, function (err) {
			self.log(`Server is listening on port ${self._port}`);
			if (!secure) {
				if (typeof callback === 'function') {
					callback();
				}
			}
		});

		if (secure) {
			// https - production/staging env

			console.log(`https port ${taro.server.httpsPort}`);
			self._portSecure = taro.server.httpsPort;

			var privateKey = this._fs.readFileSync(`${__dirname}/../../../../../../sslcert/modd_ssl.key`, 'utf8');
			var certificate = this._fs.readFileSync(`${__dirname}/../../../../../../sslcert/modd_ssl.crt`, 'utf8');

			var options = { key: privateKey, cert: certificate };
			this._httpsServer = this._https.createServer(options, function (request, response) {
				// if (request.url === '/heapdump') {
				// 	// Handle heapdump request
				// 	if (request.method === 'GET') {
				// 		const fs = require('fs');
				// 		const path = require('path');
				// 		const heapdump = require('heapdump');
				//
				// 		// Generate a unique filename for the heap dump
				// 		const _filename = `worker_heapdump_${Date.now()}.heapsnapshot`;
				//
				// 		// Start recording the heap dump
				// 		heapdump.writeSnapshot(path.join(__dirname, _filename), (err, filename) => {
				// 			if (err) {
				// 				console.error('Error while generating heap dump:', err);
				// 				response.writeHead(500);
				// 				response.end('Error while generating heap dump');
				// 			} else {
				// 				// Send the heap dump file as a response
				// 				response.setHeader('Content-disposition', `attachment; filename=${_filename}`);
				// 				response.setHeader('Content-type', 'application/octet-stream');
				//
				// 				const fileStream = fs.createReadStream(filename);
				//
				// 				fileStream.on('end', () => {
				// 					// Delete the heap dump file after it's downloaded
				// 					fs.unlink(filename, (err) => {
				// 						if (err) {
				// 							console.error('Error while deleting heap dump:', err);
				// 						}
				// 					});
				// 				});
				//
				// 				fileStream.pipe(response);
				// 			}
				// 		});
				// 	} else {
				// 		response.writeHead(405);
				// 		response.end('Method Not Allowed');
				// 	}
				// } else {
				// 	response.writeHead(404);
				// 	response.end();
				// }
				response.writeHead(404);
				response.end();
			});
			this._socketServerHttps = new this._websocket.Server({
				server: this._httpsServer,
				maxPayload: 100 * 1024, // 100 KB - The maximum allowed message size
			});
			// this._socketServerHttps = new this._websocket.WebSocketServer({
			// 	server: this._httpsServer
			// });
			// Setup listener
			this._socketServerHttps.on('connection', function (ws, request) {
				self.socketConnection(ws, request);
			});
			this._httpsServer.on('error', function (err) {
				var message = '';

				global.trackServerError(`NETIO error: ${error.code}`, {
					error: err,
				});

				switch (err.code) {
					// TODO: Add all the error codes and human readable error here!
					case 'EADDRINUSE':
						message = `Cannot start secure server on port ${self._portSecure} because the port is already in use by another application!`;
						break;
					default:
						message = `Cannot start secure server, error code: ${err.code}`;
						break;
				}

				self.log(message, 'error');
				console.log('websocket error', err);
			});

			this._httpsServer.listen(self._portSecure, function (err) {
				if (err) {
					console.log(err);
				}

				self.log(`secure server is listening on port ${self._portSecure}`);
				console.log(`secure server is listening on port ${self._portSecure}`);
				if (typeof callback === 'function') {
					callback();
				}
			});
		}
	},

	socketConnection: async function (ws, request) {
		var self = this;
		var socket = new NetIo.Socket(ws);
		// Give the socket encode/decode methods
		socket._encode = self._encode;
		socket._decode = self._decode;
		socket._remoteAddress =
			(request.headers['x-forwarded-for'] && request.headers['x-forwarded-for'].split(',').shift()) ||
			ws._socket.remoteAddress;
		console.log('Client connecting from', request.headers['x-forwarded-for'], socket._remoteAddress);

		const reqUrl = new URL(`https://www.modd.io${request.url}`);
		const searchParams = reqUrl.searchParams;
		const token = searchParams.get('token');

		try {
			let decodedToken;
			if (process.env.ENV !== 'standalone' && taro.workerComponent) {
				decodedToken = taro.workerComponent ? await taro.workerComponent.verifyToken(token) : {};
			} else {
				// no token validation required for standalone server
				decodedToken = {
					userId: '',
					sessionId: '',
					createdAt: Date.now(),
					gameSlug: taro.game && taro.game.data && taro.game.data.defaultData && taro.game.data.defaultData.gameSlug,
				};
			}

			// extracting user from token and adding it in _token.
			socket._token = {
				userId: decodedToken.userId,
				sessionId: decodedToken.sessionId,
				distinctId: searchParams.get('distinctId'),
				posthogDistinctId: searchParams.get('posthogDistinctId'),
				token,
				tokenCreatedAt: decodedToken.createdAt,
			};

			// make socket id assignment a variable
			let assignedId = self.newIdHex();

			// if the token has been used already, close the connection.
			const isUsedToken = taro.server.usedConnectionJwts[token];

			if (isUsedToken) {
				if (request.headers['sec-websocket-protocol'].split(', ')[1] == 'reconnect') {
					// TODO: this will match sockets for users that are still in the game
					let matchedTokens = Object.entries(this._socketsById).filter(([id, oldSocket]) => {
						// TODO: check whether _sockets still has a reference? It should not because of the disconnect listener just below
						return oldSocket._token.token == socket._token.token;
					});

					if (matchedTokens.length === 0) {
						console.log('Reconnect failed, grace period over', token);
						socket.close(
							'Lost connection to the server, and grace period for reconnect is over.<br/>Please refresh your browser to join again'
						);
						return;
					}
					// else if matchedTokens.length > 1?
					const oldSocket = matchedTokens[0][1];
					assignedId = oldSocket.id;
					clearTimeout(oldSocket.gracePeriod);
					console.log('grace period cancelled');
					matchedTokens = [];

					// store previous disconnects and send to MP for analytics
					socket._previousDisconnects = oldSocket._previousDisconnects || [];
					socket._previousDisconnects.push(oldSocket._disconnect);

					// persist original start time, so we can track correct session duration
					socket.start = oldSocket.start || socket.start;
				} else {
					// A token is required to connect with socket server
					socket.close('Security token could not be validated, please refresh the page.');
					console.log('Used token', token);
					return;
				}
			}

			// store token for current client
			taro.server.usedConnectionJwts[token] = socket._token.tokenCreatedAt;

			// remove expired tokens
			const filteredUsedConnectionJwts = {};
			const usedTokenEntries = Object.entries(taro.server.usedConnectionJwts).filter(
				([token, tokenCreatedAt]) => Date.now() - tokenCreatedAt < taro.server.CONNECTION_JWT_EXPIRES_IN
			);
			for (const [key, value] of usedTokenEntries) {
				if (typeof value === 'number') {
					filteredUsedConnectionJwts[key] = value;
				}
			}

			// if not guest user && idle game && we have this userId stored already
			if (decodedToken.userId !== '' && taro.game.data.settings.isIdleGame) {
				if (self._userIds[decodedToken.userId]) {
					assignedId = self._userIds[decodedToken.userId];
					clearTimeout(self._idleTimeoutsByUserId[socket._token.userId]);
					taro.server.rejoiningIdleClients.push(assignedId);
					delete taro.server._idleDisconnectedClientIds[assignedId];
					// leave this log for now
					console.log('[net.io-server/index.js] idle game reconnect | client: ', assignedId);
					delete taro.server.clients[assignedId];
					// if idle game but new userId
				} else {
					self._userIds[decodedToken.userId] = assignedId;
				}
			}

			taro.server.usedConnectionJwts = filteredUsedConnectionJwts;

			// Give the socket a unique ID
			socket.id = assignedId;
			// Add the socket to the internal lookups
			self._sockets.push(socket);

			self._socketsById[socket.id] = socket;

			// store socket.id as clientId in _token data to validate socket messages later
			socket._token.clientId = socket.id;
		} catch (e) {
			// A token is required to connect with socket server
			socket.close('Security token could not be validated, please refresh the page.');
			console.log('Unauthorized request', e.message, token);
			return;
		}

		console.log('Client ', socket.id, ' connected');
		// Register a listener so that if the socket disconnects,
		// we can remove it from the active socket lookups
		socket.on('disconnect', function (data) {
			var index = self._sockets.indexOf(socket);
			if (index > -1) {
				// Remove the socket from the array
				self._sockets.splice(index, 1);
			}

			if (self._socketsById[socket.id]) {
				if (socket._disconnect?.reason) {
					// if a disconnect reason is provided, disconnect socket immediately as no reconnects are expected
					delete self._socketsById[socket.id];

					// moved from .on('disconnect') in TaroNetIoServer.js:~588
					// data contains {WebSocket socket, <Buffer > reason, Number code}
					taro.network._onSocketDisconnect(data, socket);
					// idle game; not guest
				} else if (socket._token.userId !== '' && taro.game.data.settings.isIdleGame) {
					delete self._socketsById[socket.id];
					// leave this log for now
					console.log('[net.io-server/index.js] idle game disconnect | client: ', socket.id);
					// store disconnected clients
					taro.server._idleDisconnectedClientIds[socket.id] = socket._token.userId;
					// replace hard number with `taro.game.data.settings.idleGameTimeout`
					self._idleTimeoutsByUserId[socket._token.userId] = setTimeout(() => {
						// let disconnect logic continue
						taro.network._onSocketDisconnect(data, socket);
						delete taro.server._idleDisconnectedClientIds[socket.id];
						// remove this user from idle userIds object
						delete self._userIds[socket._token.userId];
					}, taro.game.data.settings.idleGameTimeLimit);
				} else {
					self._socketsById[socket.id].gracePeriod = setTimeout(() => {
						delete self._socketsById[socket.id];

						// moved from .on('disconnect') in TaroNetIoServer.js:~588
						// data contains {WebSocket socket, <Buffer > reason, Number code}
						taro.network._onSocketDisconnect(data, socket);
					}, 5000);
				}
			}
		});
		// Tell the client their new ID - triggers this._io.on('connect', ...) on client
		try {
			socket.send({
				_netioCmd: 'id',
				data: socket.id,
			});
		} catch (err) {
			console.log('err while sending client its socket.id!');
		}

		// add socket message listeners, send 'init' message to client
		self.emit('connection', [socket, request]);
	},

	/**
	 * Sends a message. If the client id is not specified
	 * the message will be sent to all connected clients.
	 *
	 * @param {Object} data The JSON data to send.
	 * @param {*=} clientId The id of the client to send to, or an array of id's to send to.
	 */
	send: function (data, clientId) {
		// console.log('net-io send', data, clientId)
		var recipientArray, arr, arrCount, encodedData, item;

		// Pre-encode the data and then use _send to send raw
		// instead of encoding for every socket

		encodedData = this._encode(data);
		// console.log(clientId, data, JSON.stringify(data).length)
		// if client is specified, use _send(). otherwise, broadcast stream
		if (clientId !== undefined) {
			if (typeof clientId === 'string') {
				if (this._socketsById[clientId]) {
					// There is only one recipient
					recipientArray = [this._socketsById[clientId]];
				} else {
					this.log(`net.io Warning, client with ID ${clientId} not found in socket list!`);
					recipientArray = [];
				}
			} else {
				// There is an array of recipients
				recipientArray = [];
				arr = clientId;
				arrCount = arr.length;

				while (arrCount--) {
					item = this._socketsById[arr[arrCount]];

					if (item !== undefined) {
						recipientArray.push(item);
					}
				}
			}
		} else {
			recipientArray = this._sockets.clone();
		}

		arr = recipientArray;
		arrCount = arr.length;

		while (arrCount--) {
			if (arr[arrCount]) {
				arr[arrCount]._send(encodedData);
			}
		}
	},

	/**
	 * Generates a new 16-character hexadecimal unique ID
	 * @return {String}
	 */
	newIdHex: function () {
		this._idCounter++;
		// return 'c' + this._idCounter;
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
		// TODO: Allow origins to be specified on startup and checked against here!
		// put logic here to detect whether the specified origin is allowed.
		return true;
	},

	/**
	 * Encodes the passed JSON data into a data packet.
	 * @param data
	 * @return {*}
	 * @private
	 */
	_encode: function (data) {
		try {
			// var json = JSON.stringify(data);
			var json = JSON.stringify(data);
			// var obj = JSON.parse(json);
			// var jsonLength = json.length;
			// var timeStart = '';
			// if(jsonLength > 100000){
			//     timeStart = Date.now();
			// }

			json = taro.network._io._compress(json, { outputEncoding: 'StorageBinaryString' });

			// NOTE: make sure than COMPRESSION_THRESHOLD is same on both client and server
			// LOGIC:
			//     1. if json string has less than COMPRESSION_THRESHOLD chars (e.g. 9999)
			//        only then apply compression on it which will reduce the length of
			//        resulting string to anything less than original length (e.g. 9998)
			//     2. if json string has more than COMPRESSION_THRESHOLD chars (10001)
			//        then compression will not be applied to it and send the stringified form only
			//        as we have found that compressing large string take toll on CPU

			// if (json.length < taro.network._io.COMPRESSION_THRESHOLD) {
			//     json = taro.network._io._compress(json);
			// }

			// if (json.length > taro.network._io.COMPRESSION_THRESHOLD) {
			// console.log(json.length)
			// }
			// if(jsonLength > 100000){
			//     console.log(Date.now() - timeStart, jsonLength)
			// }

			return json;
			// return taro.network._io._msgpack.encode(obj);
		} catch (e) {
			console.log(e);
		}
	},

	/**
	 * Decodes a data packet back into JSON data.
	 * @param data
	 * @return {*}
	 * @private
	 */
	_decode: function (data) {
		try {
			var response = JSON.parse(data);

			if (typeof response == 'object') {
				// It is JSON
				return JSON.parse(data);
			} else {
				// It is not JSON
				return null;
			}
		} catch (e) {
			console.log('Warning: client sending malicious JSON data ', e.message, data);
		}
	},
});

NetIo.Server.version = '1.0.0';

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = NetIo;
}
