/**
 * Adds stream capabilities to the network system.
 */
var TaroStreamComponent = TaroEventingClass.extend({
	classId: 'TaroStreamComponent',
	componentId: 'stream',

	/**
	 * @constructor
	 * @param entity
	 * @param options
	 */
	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		var self = this;

		// Set the stream data section designator character
		this._sectionDesignator = '¬';

		/* CEXCLUDE */
		if (taro.isServer) {
			// Define the network stream command
			this._entity.define('_taroStreamCreate');
			this._entity.define('_taroStreamCreateSnapshot');
			this._entity.define('_taroStreamDestroy');
			this._entity.define('_taroStreamData');
			this._entity.define('_taroStreamTime');

			// Define the object that will hold the stream data queue
			this._queuedData = {};

			// keep track of which clients have received which entities' stream
			this._streamClientCreated = {};
		}
		/* CEXCLUDE */

		if (taro.isClient) {
			// Define the network stream command
			this._entity.define('_taroStreamCreate', function () {
				self._onStreamCreate.apply(self, arguments);
			});
			this._entity.define('_taroStreamDestroy', function () {
				self._onStreamDestroy.apply(self, arguments);
			});
			this._entity.define('_taroStreamData', function () {
				self._onStreamData.apply(self, arguments);
			});
			this._entity.define('_taroStreamTime', function () {
				self._onStreamTime.apply(self, arguments);
			});
			this._entity.define('_taroStreamCreateSnapshot', function () {
				self._onStreamCreateSnapshot.apply(self, arguments);
			});
		}
	},

	/* CEXCLUDE */
	/**
	 * Starts the stream of world updates to connected clients.
	 */
	start: function () {
		TaroStreamComponent.prototype.log('Starting delta stream...');
		return this._entity;
	},

	/**
	 * update entity-attributes (unit, player, and projectiles)
	 */
	_sendQueuedStreamData: function () {
		var data = {};
		var entities = taro.$('baseScene')._children;

		var sendData = false;
		for (var i = 0; i < entities.length; i++) {
			var entity = entities[i];
			var queuedStreamData = entity.getQueuedStreamData();

			// commented out due to wasteful use of bandwidth
			// if (queuedStreamData.streamedOn) {
			// 	queuedStreamData.actualStreamedOn = Date.now();
			// }

			if (entity && Object.keys(queuedStreamData).length > 0) {
				data[entity.id()] = queuedStreamData;
				entity._streamDataQueued = {};
				sendData = true;
			}
		}

		if (sendData) {
			taro.network.send('streamUpdateData', data);
		}

		// we don't want to keep force-syncing entity streams to rejoined clients
		taro.server.rejoiningIdleClients = [];

		data = null;
		entity = null;
		entities = null;
	},

	/**
	 * Stops the stream of world updates to connected clients.
	 */
	stop: function () {
		// this._stopTimeSync(); // was this removed ???

		TaroStreamComponent.prototype.log('Stopping delta stream...');
		clearInterval(this._streamTimer);

		return this._entity;
	},

	/**
	 * Queues stream data to be sent during the next stream data interval.
	 * @param {String} id The id of the entity that this data belongs to.
	 * @param {String} data The data queued for delivery to the client.
	 * @param {String} clientId The client id this data is queued for.
	 * @return {*}
	 */
	queue: function (id, data) {
		// dont overwrite data if data.length is more than 10bytes
		// not this is temporary fix for case when entity teleports to some location
		// during that we have to make sure that client receives queued data for teleportation and
		// will have to stop that data getting overwritten due to some other section data
		// the reason is because teleportation data consists a byte the tells client to stop smooth animation
		// if that data gets overwritten by some other data that client will see a smooth transition from
		// entity's current location to final location
		// if (this._entity._streamMode == 1 || this._entity._streamMode == undefined) {
		this._entity.add('_taroStreamData', data);
		// }
		// if (!this._queuedData[id] || this._queuedData[id][0].length <= 20) {
		// }
		return this._entity;
	},
	createQueue: function (commandName, data, clientId) {
		// dont overwrite data if data.length is more than 10bytes
		// not this is temporary fix for case when entity teleports to some location
		// during that we have to make sure that client receives queued data for teleportation and
		// will have to stop that data getting overwritten due to some other section data
		// the reason is because teleportation data consists a byte the tells client to stop smooth animation
		// if that data gets overwritten by some other data that client will see a smooth transition from
		// entity's current location to final location
		this._entity.add(commandName, data, clientId);
		// if (!this._queuedData[id] || this._queuedData[id][0].length <= 20) {
		// }
		return this._entity;
	},

	/**
	 * Asks the server to send the data packets for all the queued stream
	 * data to the specified clients.
	 * @private
	 */
	_sendQueue: function (timeStamp) {
		// console.log(serverTime)
		// Send the stream data
		this._entity.flush(timeStamp);
		// }
	},
	/* CEXCLUDE */

	/**
	 * Handles receiving the start time of the stream data.
	 * @param data
	 * @private
	 */
	_onStreamTime: function (data) {
		this._streamDataTime = data;
	},
	_onStreamCreateSnapshot: function (data) {
		console.log(data);
	},

	_onStreamCreate: function (data) {
		var classId = data[0];
		var entityId = data[1];
		var parentId = data[2];
		var transformData = data[3];
		var createData = data[4];
		var parent = taro.$(parentId);
		var classConstructor;
		var ntransdata;
		var entity;

		if (transformData) {
			var ntransdata = [
				parseInt(transformData[0], 16),
				parseInt(transformData[1], 16),
				parseInt(transformData[2], 16) / 1000,
			]; // x, y, rotation
		}

		// Check the required class exists
		if (parent) {
			// Check that the entity doesn't already exist
			if (!taro.$(entityId)) {
				classConstructor = taroClassStore[classId];

				if (classConstructor) {
					createData.defaultData = {
						translate: {
							x: ntransdata[0],
							y: ntransdata[1],
						},
						rotate: ntransdata[2],
					};

					entity = new classConstructor(createData, entityId);

					entity.bypassSmoothing = true;
					entity.streamSectionData('transform', ntransdata);

					// Set the just created flag which will stop the renderer
					// from handling this entity until after the first stream
					// data has been received for it
					if (entity._streamEmitCreated) {
						entity.emit('streamCreated');
					}
					// entity.bypassSmoothing = false;
					// TaroStreamComponent.prototype.log(entity)
					// Since we just created an entity through receiving stream
					// data, inform any interested listeners
					this.emit('entityCreated', entity);

					delete entity.bypassSmoothing;
				} else {
					taro.network.stop();
					taro.stop();

					TaroStreamComponent.prototype.log(
						`Network stream cannot create entity with class ${classId} because the class has not been defined! The engine will now stop.`,
						'error'
					);
				}
			}
		} else {
			TaroStreamComponent.prototype.log(
				`Cannot properly handle network streamed entity with id ${entityId} because it's parent with id ${parentId} does not exist on the scenegraph!`,
				'warning'
			);
		}
	},

	_onStreamDestroy: function (data) {
		var entity = taro.$(data[1]);
		var self = this;

		if (entity) {
			// Calculate how much time we have left before the entity
			// should be removed from the simulation given the render
			// latency setting and the current time
			entity.destroy();
			self.emit('entityDestroyed', entity);
		}
	},
});

function arr2hex(byteArray) {
	return Array.from(byteArray, function (byte) {
		return `0${(byte & 0xff).toString(16)}`.slice(-2);
	}).join('');
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroStreamComponent;
}
