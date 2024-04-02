var shutdownMessages = [
	{
		checkpoint: 1,
		message: '2 hours',
		timeMS: 120 * 60000,
	},
	{
		checkpoint: 2,
		message: '1 hour',
		timeMS: 60 * 60000,
	},
	{
		checkpoint: 3,
		message: '30 minutes',
		timeMS: 30 * 60000,
	},
	{
		checkpoint: 4,
		message: '15 minutes',
		timeMS: 15 * 60000,
	},
	{
		checkpoint: 5,
		message: '5 minutes',
		timeMS: 5 * 60000,
	},
	{
		checkpoint: 6,
		message: '1 minute',
		timeMS: 1 * 60000,
	},
];

var TimerComponent = TaroEntity.extend({
	classId: 'TimerComponent',
	componentId: 'timer',

	init: function () {
		var self = this;

		if (taro.isServer) {
			self.emptyTimeLimit = self.getTimeLimit();
			self.startedAt = new Date(taro.server.startedOn);
			console.log('initialized timer component', self.startedAt);
			self.now = self.serverEmptySince = self.startedAt;
		}
	},

	getTimeLimit: function () {
		let timeLimitMin = 10; // kill t1/t2 if empty for 10 mins
		// const totalPlayCount = taro.server.totalPlayCount || 0;

		// // add 1 minute for every 2000 total play count
		// let extraMinutes = totalPlayCount / 2000;
		// extraMinutes = +extraMinutes.toFixed(0);

		// timeLimitMin += extraMinutes;

		return timeLimitMin * 60 * 1000;
	},

	getLifeSpan: function () {
		var maxLifeSpan = 6 * 60 * 60 * 1000;
		var lifeSpan = taro.server.lifeSpan;

		if (lifeSpan > maxLifeSpan) {
			lifeSpan = maxLifeSpan;
		}

		return lifeSpan;
	},

	startGameClock: function () {
		var self = this;

		console.log(new Date(), 'gameClock started');
		self.shutdownMessageCheckpoint = -1;

		var everySecond = setInterval(function () {
			self.now = Date.now();

			if (taro.isServer) {
				self.lastTick = self.now;

				var lifeSpan = self.getLifeSpan();

				// if server's lifeSpan is over, kill it (e.g. kill server after 5 hours)
				var age = self.now - self.startedAt;

				var messageToBroadcast = shutdownMessages.find(function (messageDetails) {
					return age > lifeSpan - messageDetails.timeMS && self.shutdownMessageCheckpoint < messageDetails.checkpoint;
				});

				if (messageToBroadcast) {
					var message = `shutting down server in ${messageToBroadcast.message}`;
					self.shutdownMessageCheckpoint = messageToBroadcast.checkpoint;

					taro.chat.sendToRoom('1', message, undefined, undefined);
				}
			}
		}, 1000);
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TimerComponent;
}
