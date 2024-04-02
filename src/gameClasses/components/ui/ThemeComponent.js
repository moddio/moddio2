var ThemeComponent = TaroEntity.extend({
	classId: 'ThemeComponent',
	componentId: 'theme',

	init: function () {
		var self = this;
		self.applyTheme(taro.client.server);
	},

	applyTheme: function (server) {
		if (taro.game.data.settings.images && taro.game.data.settings.images.logo) {
			$('.game-title').html(
				$('<img/>', {
					src: taro.game.data.settings.images.logo,
					height: '75px',
				})
			);
		} else {
			$('.game-title').html(server ? server.gameName : '');
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ThemeComponent;
}
