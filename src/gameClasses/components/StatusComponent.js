var StatusComponent = TaroEntity.extend({
	classId: 'StatusComponent',
	componentId: 'status',

	init: function () {
		TaroEntity.prototype.init.call(this);

		this.isEnabled = false;
		this.actionCounter = {};
		this.lastUpdateSent = 0;
		this.mount(taro.$('baseScene'));
	},

	logAction: function (path) {
		this.actionCounter[path] = (this.actionCounter[path] || 0) + 1;
	},

	getTop10Actions: function () {
		return Object.entries(this.actionCounter)
			.sort(([, countA], [, countB]) => countB - countA)
			.slice(0, 10)
			.map(([path, count]) => ({ path, count }));
	},

	getSummary: function () {
		var self = this;

		var cpuDelta = null;
		if (taro._lastCpuUsage) {
			// console.log('before',taro._lastCpuUsage);
			cpuDelta = process.cpuUsage(taro._lastCpuUsage);
			taro._lastCpuUsage = process.cpuUsage();
		} else {
			taro._lastCpuUsage = cpuDelta = process.cpuUsage();
		}

		if (taro.physics && taro.physics.engine != 'CRASH') {
			// console.log('taro stream',taro.stream);

			var jointCount = 0;
			var jointList = taro.physics._world && taro.physics._world.getJointList();
			let getPointer = taro.physics.getPointer;
			while (jointList && (!getPointer || getPointer(jointList) !== getPointer(taro.physics.nullPtr))) {
				jointCount++;
				jointList = jointList.getNext();
			}
			var returnData = {
				clientCount: Object.keys(taro.network._socketById).length,
				entityCount: {
					player: taro.$$('player').filter(function (player) {
						return player._stats.controlledBy == 'human';
					}).length,
					unit: taro.$$('unit').length,
					item: taro.$$('item').length,
					projectile: taro.$$('projectile').length,
					sensor: taro.$$('sensor').length,
					region: taro.$$('region').length,
				},
				bandwidth: self.bandwidthUsage,
				heapUsed: process.memoryUsage().heapUsed / 1024 / 1024,
				currentTime: taro._currentTime,
				physics: {
					engine: taro.physics.engine,
					bodyCount: taro.physics._world?.m_bodyCount || taro.physics._world?.GetBodyCount?.() || 0,
					contactCount: taro.physics._world?.m_contactCount || taro.physics._world?.GetContactCount?.() || 0,
					jointCount: taro.physics._world?.m_jointCount || taro.physics._world?.GetJointCount?.() || 0,
					stepDuration: taro.physics.avgPhysicsTickDuration.toFixed(2),
					stepsPerSecond: taro._physicsFPS,
					totalBodiesCreated: taro.physics.totalBodiesCreated,
				},
				etc: {
					totalPlayersCreated: taro.server.totalPlayersCreated,
					totalUnitsCreated: taro.server.totalUnitsCreated,
					totalItemsCreated: taro.server.totalItemsCreated,
					totalProjectilesCreated: taro.server.totalProjectilesCreated,
					totalWallsCreated: taro.server.totalWallsCreated,
				},
				cpu: cpuDelta,
				lastSnapshotLength: JSON.stringify(taro.server.lastSnapshot).length,
				top10MostCalledActions: this.getTop10Actions(),
			};

			self.bandwidthUsage = {
				unit: 0,
				item: 0,
				player: 0,
				projectile: 0,
				region: 0,
				sensor: 0,
			};

			return returnData;
		}
	},

	update: function () {
		var self = this;

		if (taro._currentTime - this.lastUpdateSent > 1000) {
			if (taro.isServer && taro.server.developerClientIds.length) {
				const sendErrors = Object.keys(taro.script.errorLogs).length;
				taro.server.developerClientIds.forEach((id) => {
					taro.game.devLogs.status = self.getSummary();
					taro.network.send('devLogs', taro.game.devLogs, id);

					if (taro.profiler.isEnabled) {
						taro.network.send('profile', taro.profiler.getProfile(), id);
					}

					if (sendErrors) {
						taro.network.send('errorLogs', taro.script.errorLogs, id);
					}
				});
				if (sendErrors) {
					taro.script.errorLogs = {};
				}
			}
			this.actionCounter = {};

			this.lastUpdateSent = taro._currentTime;
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = StatusComponent;
}
