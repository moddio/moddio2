var ProfilerComponent = TaroEventingClass.extend({
	classId: 'ProfilerComponent',
	componentId: 'profiler',

	init: function () {
		this.timeElapsed = {}		
	},

	logTimeElapsed: function(name, startTime) {
		if (this.timeElapsed[name] == undefined) {
			this.timeElapsed[name] = {
				count: 0,
				avgTimeElapsed: 0
			}
		}
		
		var timeElapsed = performance.now() - startTime;
		var element = this.timeElapsed[name];
		// this.timeElapsed[name].avgTimeElapsed = ((element.avgTimeElapsed * element.count) + timeElapsed) / (element.count + 1);
		this.timeElapsed[name].avgTimeElapsed += timeElapsed;
		this.timeElapsed[name].count++;
	},

	printResults: function() {
		var output = []
		for (var i in this.timeElapsed) {
			output.push(i)
			output.push(this.timeElapsed[i].avgTimeElapsed.toFixed(2))
			output.push(this.timeElapsed[i].count)
		}
		console.log(output.join(', '))

		this.timeElapsed = {};
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = ProfilerComponent; }
