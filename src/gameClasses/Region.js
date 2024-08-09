var Region = TaroEntityPhysics.extend({
	classId: 'Region',
	componentId: 'region',

	init: function (data, entityIdFromServer) {
		TaroEntityPhysics.prototype.init.call(this);

		this.id(entityIdFromServer);

		var self = this;
		var regionName = typeof data.id === 'string' ? data.id : null;

		if (data && regionName) {
			self._stats = data;

			self.category('region');

			if (taro.isServer) {
				self.mount(taro.$('baseScene'));
			}

			this._stats.currentBody = {
				type: 'static',
				linearDamping: 1,
				angularDamping: 5,
				allowSleep: false,
				bullet: false,
				fixedRotation: false,
				fixtures: [
					{
						density: 0,
						friction: 0,
						restitution: 0,
						isSensor: true,
						shape: {
							type: 'rectangle',
						},
					},
				],
				collidesWith: { walls: true, units: true, projectiles: true, items: true },
				// Refactor TODO: width & height should've been assigned into "currentBody". not int "default".
				// Region is only one doing this (not unit/item/projectile). I shouldn't have to do below:
				width: self._stats.default.width,
				height: self._stats.default.height,
			};

			var regionDimension = self._stats.default;

			self._translate.x = regionDimension.x + regionDimension.width / 2;
			self._translate.y = regionDimension.y + regionDimension.height / 2;

			self.updateBody({
				translate: { x: self._translate.x, y: self._translate.y },
			});

			if (taro.isServer) {
				// TaroEntity.streamMode(val)
				// 1 is 'automatic' streaming
				self.streamMode(1);
			} else if (taro.isClient) {
				taro.entitiesToRender.trackEntityById[entityIdFromServer] = this;
				taro.client.emit('create-region', this);
			}
		}
		self.addBehaviour('regionBehaviour', self._behaviour);
	},
	updateDimension: function () {
		var regionCordinates = this._stats.default;
		this.translateTo(
			regionCordinates.x + regionCordinates.width / 2,
			regionCordinates.y + regionCordinates.height / 2
			//regionCordinates.z + regionCordinates.depth / 2 || 0
		);
		this.width(regionCordinates.width);
		this.height(regionCordinates.height);
		//this.depth(regionCordinates.depth || 0);

		if (taro.isServer) {
			var shapeData = {};
			var normalizer = 0.45;
			shapeData.width = regionCordinates.width * normalizer;
			shapeData.height = regionCordinates.height * normalizer;
			//shapeData.depth = regionCordinates.depth * normalizer;
			// shapeData.x = regionCordinates.x;
			// shapeData.y = regionCordinates.y;
			this._stats.currentBody.fixtures[0].shape.data = shapeData;
			this.updateBody(this._stats.currentBody);
		} else {
			// isClient
			this.emit('transform');
		}
	},
	show: function () {},
	hide: function () {},

	streamUpdateData: function (queuedData, clientId) {
		TaroEntity.prototype.streamUpdateData.call(this, queuedData, clientId);

		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];

			for (attrName in data) {
				var newValue = data[attrName];
				this._stats.default[attrName] = newValue;
			}
		}

		this.updateDimension();
	},

	_behaviour: function (ctx) {
		if (this._alive === false) {
			this.destroy();
		}

		if (taro.isClient) {
			var processedUpdates = [];
			var updateQueue = taro.client.entityUpdateQueue[this.id()];

			if (updateQueue) {
				for (var key in updateQueue) {
					var value = updateQueue[key];
					// ignore update if the value hasn't changed since the last update. this is to prevent unnecessary updates
					if (this.lastUpdatedData[key] == value) {
						// console.log("ignoring update", this._stats.name, {[key]: value})
						delete taro.client.entityUpdateQueue[this.id()][key];
						continue;
					}

					processedUpdates.push({ [key]: value });
					delete taro.client.entityUpdateQueue[this.id()][key];
				}

				if (processedUpdates.length > 0) {
					this.streamUpdateData(processedUpdates);
				}
			}
		}

		this.processQueue();
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Region;
}
