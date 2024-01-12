var SoundComponent = TaroEntity.extend({
	classId: 'SoundComponent',
	componentId: 'sound',

	init: function () {
		var self = this;

		self.musicFiles = [];
		self.preLoadedSounds = {};
		self.preLoadedMusic = {};
		if (taro.isClient) {
			var soundSetting = self.getItem('sound');
			var musicSetting = self.getItem('music');
			if (soundSetting == undefined || soundSetting == 'on') {
				self.setItem('sound', 'on');
				self.toggleButton('sound', 'on');
			} else if (soundSetting == 'off') {
				self.toggleButton('sound', 'off');
			}

			if (musicSetting == undefined || musicSetting == 'on') {
				self.setItem('music', 'on');
				self.toggleButton('music', 'on');
			} else if (musicSetting == 'off') {
				self.toggleButton('music', 'off');
				if (self.musicCurrentlyPlaying) {
					self.stopMusic();
				}
			}

			$('#sound-on').on('click', function () {
				self.toggleButton('sound', 'on');
				self.setItem('sound', 'on');
			});

			$('#sound-off').on('click', function () {
				self.toggleButton('sound', 'off');
				self.setItem('sound', 'off');
			});

			$('#music-on').on('click', function () {
				self.toggleButton('music', 'on');
				self.setItem('music', 'on');
				if (self.musicCurrentlyPlaying) {
					self.startMusic();
				}
			});

			$('#music-off').on('click', function () {
				self.toggleButton('music', 'off');
				self.setItem('music', 'off');
				if (self.musicCurrentlyPlaying) {
					self.stopMusic();
				}
			});
		}
	},

	setItem: function (key, value) {
		if (USE_LOCAL_STORAGE) {
			return localStorage.setItem(key, value);
		}

		return storage[key] = value;
	},

	getItem: function (key) {
		if (USE_LOCAL_STORAGE) {
			return localStorage.getItem(key);
		}

		return storage[key];
	},

	toggleButton: function (type, mode) {
		if (mode == 'on') {
			$(`#${type}-on`)
				.removeClass('btn-light')
				.addClass('btn-success');
			$(`#${type}-off`)
				.removeClass('btn-success')
				.addClass('btn-light');
		} else {
			$(`#${type}-off`)
				.removeClass('btn-light')
				.addClass('btn-success');
			$(`#${type}-on`)
				.removeClass('btn-success')
				.addClass('btn-light');
		}
	},

	preLoadSound: function () {
		var self = this;
		for (var soundKey in taro.game.data.sound) {
			var sound = taro.game.data.sound[soundKey];
			self.preLoadedSounds[soundKey] = document.createElement('audio');
			self.preLoadedSounds[soundKey].src = sound.file;
			if (sound.volume) {
				self.preLoadedSounds[soundKey].volume = sound.volume / 100;
			}
			self.preLoadedSounds[soundKey].load();
		}
	},

	preLoadMusic: function () {
		var self = this;
		for (var musicKey in taro.game.data.music) {
			var music = taro.game.data.music[musicKey];
			self.preLoadedMusic[musicKey] = document.createElement('audio');
			self.preLoadedMusic[musicKey].src = music.file;
			if (music.volume) {
				self.preLoadedMusic[musicKey].volume = music.volume / 100;
			}
			self.preLoadedMusic[musicKey].load();
		}
	},

	getVolume: function (position, volume = 0) {
		var self = this;
		var settingsVolume = parseFloat(self.getItem('sound-volume'));
		settingsVolume = isNaN(settingsVolume) ? 1 : settingsVolume / 100;

		var distanceSoundShouldHeard = 500;
		if (taro.game.data.settings && taro.game.data.settings.camera && taro.game.data.settings.camera.zoom && taro.game.data.settings.camera.zoom.default) {
			distanceSoundShouldHeard = taro.game.data.settings.camera.zoom.default * 1.5;
		}
		var vpBound = taro.renderer.getViewportBounds();
		var myPosition = { x: vpBound.x + vpBound.width / 2, y: vpBound.y + vpBound.height / 2 };
		var xDistance = position.x - myPosition.x;
		var yDistance = position.y - myPosition.y;
		var distance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);

		if (distance < distanceSoundShouldHeard) {
			if (!volume) volume = 55;
			volume = (Math.max(0, distanceSoundShouldHeard - distance) / distanceSoundShouldHeard) * (volume / 100); // 55% of actual volume
			return Math.min(volume * settingsVolume, 1);
		} else {
			// we don't want to hear sounds that are outside distanceSoundShouldHeard
			return 0;
		}
	},

	playSound: function (sound, position, key, shouldRepeat = false, soundVolume) {
		var self = this;
		if (taro.isClient) {
			var soundSetting = self.getItem('sound');

			if (soundSetting == 'on') {
				// adjust volume based on distance between my unit and sound source
				var volume = position === null ? sound.volume / 100 : 0;
				if (position) {
					volume = this.getVolume(position, sound.volume);
					if (soundVolume) {
						volume = volume * (soundVolume / 100);
					}
				} else {
					var settingsVolume = parseFloat(self.getItem('sound-volume'));
					settingsVolume = isNaN(settingsVolume) ? 1 : settingsVolume / 100;
					volume = settingsVolume * volume;
					if (soundVolume) {
						volume = volume * (soundVolume / 100);
					}
				}

				if (sound && sound.file) {
					if (self.preLoadedSounds[key] && self.preLoadedSounds[key].src == sound.file) {
						// if audio is currently playing then stop it first and replay audio
						if (!self.preLoadedSounds[key].paused) {
							self.preLoadedSounds[key].pause();
							self.preLoadedSounds[key].currentTime = 0;
						}
						self.preLoadedSounds[key].volume = volume;
						self.preLoadedSounds[key].loop = shouldRepeat;
						self.preLoadedSounds[key].play().catch(function (e) {
							console.log(e);
						});
						if (shouldRepeat) {
							return self.preLoadedSounds[key];
						}
					} else {
						var element = document.createElement('audio');
						element.src = sound.file; // pick random item from array
						element.volume = volume;
						element.loop = shouldRepeat;
						element.play().catch(function (e) {
							console.log(e);
						});
						element.addEventListener(
							'ended',
							function () {
								this.remove();
							},
							false
						);
						if (shouldRepeat) {
							return element;
						}
					}
				}
			}
		}
	},

	playMusic: function (music, startAt, shouldRepeat, key) {
		var self = this;
		var playMusic;
		if (taro.isClient) {
			var musicSetting = self.getItem('music');
			var settingsVolume = parseFloat(self.getItem('music-volume'));
			settingsVolume = isNaN(settingsVolume) ? 1 : settingsVolume / 100;

			var volume = music.volume === undefined ? 1 : Math.min(music.volume / 100, 1);
			var originalVolume = volume;
			volume = settingsVolume * volume;

			if (music && music.file) {
				if (self.preLoadedMusic[key] && self.preLoadedMusic[key].src === music.file) {
					if (!self.preLoadedMusic[key].pause) {
						self.preLoadedMusic[key].pause();
						self.preLoadedMusic[key].currentTime = 0;
					}
					self.preLoadedMusic[key].loop = shouldRepeat;
					self.preLoadedMusic[key].volume = volume;
					playMusic = self.preLoadedMusic[key];
				} else {
					var element = document.createElement('audio');
					element.src = music.file; // pick random item from array
					element.volume = volume;
					element.loop = shouldRepeat;
					playMusic = element;
				}
				self.preLoadedMusic[key].originalVolume = originalVolume;
				if (self.musicCurrentlyPlaying) {
					self.stopMusic();
				}
				self.musicCurrentlyPlaying = playMusic;

				// start at
				if (playMusic && startAt != undefined) {
					playMusic.currentTime = startAt;
				}

				if (musicSetting == 'on') {
					playMusic.play().catch(function (e) {
						console.log(e);
					});
				}
				if (element) {
					element.addEventListener(
						'ended',
						function () {
							this.remove();
						},
						false
					);
				}
			}
		}
	},
	startMusic: function () {
		if (taro.isClient) {
			if (this.musicCurrentlyPlaying) {
				this.musicCurrentlyPlaying.play().catch(function (e) {
					console.log(e);
				});
				this.musicCurrentlyPlaying.currentTime = 0;
			}
		}
	},

	updateMusicVolume: function (volume) {
		if (taro.isClient) {
			if (this.musicCurrentlyPlaying) {
				var originalVolume = this.musicCurrentlyPlaying.originalVolume;
				this.musicCurrentlyPlaying.volume = Math.min(originalVolume * (volume / 100), 1);
			}
		}
	},

	stopMusic: function () {
		if (taro.isClient) {
			if (this.musicCurrentlyPlaying) {
				this.musicCurrentlyPlaying.pause();
				this.musicCurrentlyPlaying.currentTime = 0;
			}
		}
	},
	stopSound: function (sound, key) {
		if (this.preLoadedSounds[key]) {
			this.preLoadedSounds[key].pause();
			this.preLoadedSounds[key].currentTime = 0;
		}
	}
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = SoundComponent;
}
