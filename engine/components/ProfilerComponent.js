var ProfilerComponent = TaroEventingClass.extend({
	classId: 'ProfilerComponent',
	componentId: 'profiler',

	init: function () {
		this.isEnabled = false;
		this.timeElapsed = {};
		this.tickCount = 0;
		this.avgTotalTime = 0;
		this.avgEngineTickTime = 0;
	},

	start: function () {
		this.timeElapsed = {};
		this.isEnabled = true;
	},

	stop: function () {
		this.isEnabled = false;
	},

	logTimeElapsed: function (path, startTime) {
		if (this.timeElapsed[path] == undefined) {
			this.timeElapsed[path] = {
				count: 0,
				avgTime: 0,
				countSinceLastTick: 0,
				avgTimePerTick: 0,
				tickCount: 0,
				cpu: 0,
				avgCpu: 0,
			};
		}

		var timeElapsed = performance.now() - startTime;
		var element = this.timeElapsed[path];
		this.timeElapsed[path].avgTime = (element.avgTime * element.count + timeElapsed) / (element.count + 1);
		// this.timeElapsed[path].avgTime += timeElapsed;,
		this.timeElapsed[path].count++;
		this.timeElapsed[path].countSinceLastTick++;
	},

	logTick: function (engineTickTime) {
		if (!engineTickTime) return;

		var totalTime = 0;
		for (var path in this.timeElapsed) {
			if (this.timeElapsed[path].countSinceLastTick > 0) {
				var element = this.timeElapsed[path];
				var timeElapsed = element.avgTime * element.countSinceLastTick;
				totalTime += timeElapsed;
				this.timeElapsed[path].avgTimePerTick =
					(element.avgTimePerTick * element.tickCount + timeElapsed) / (element.tickCount + 1);
				this.timeElapsed[path].cpu = (this.timeElapsed[path].avgTimePerTick / engineTickTime) * 100;
				this.timeElapsed[path].avgCpu =
					(element.avgCpu * element.tickCount + this.timeElapsed[path].cpu) / (element.tickCount + 1);
				this.timeElapsed[path].countSinceLastTick = 0;
				this.timeElapsed[path].tickCount++;
			}
		}

		this.avgTotalTime = (this.avgTotalTime * this.tickCount + totalTime) / (this.tickCount + 1);
		this.avgEngineTickTime = (this.avgEngineTickTime * this.tickCount + engineTickTime) / (this.tickCount + 1);

		this.tickCount++;
	},

	getProfile: function () {
		var output = {};
		for (var path in this.timeElapsed) {
			output[path] = {
				avgTime: parseFloat(this.timeElapsed[path].avgTime.toFixed(2)),
				count: this.timeElapsed[path].count,
				cpu: parseFloat(this.timeElapsed[path].avgCpu.toFixed(2)),
			};
		}

		// console.log(output)
		return output;

		// console.log(this.timeElapsed)
		// console.log('CPU usage: ' + this.avgTotalTime.toFixed(2), this.avgEngineTickTime.toFixed(2))
		// this.timeElapsed = {};
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ProfilerComponent;
}
