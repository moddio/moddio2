/**
 * MobileControlsComponent
 * Virtual game controls for use on mobile devices
 */
var MobileControlsComponent = IgeEntity.extend({
	classId: 'MobileControlsComponent',
	componentId: 'mobileControls',

	init: function (entity) {
		IgeEntity.prototype.init.call(this);

		// Store the entity that this component has been added to
		this._entity = entity;

		this.debug = false;

		this.controls = {};

		$(window).on('orientationchange load resize', function () {
			if (ige.mobileControls) {
				// and this unit is our player
				if (ige.client && ige.client.myPlayer && ige.network.id() == ige.client.myPlayer._stats.clientId) {
					var unit = ige.$(ige.client.myPlayer._stats.selectedUnitId);
					if (unit && unit._stats.controls) {
						var unitAbilities = unit._stats.controls.abilities;
						if (unitAbilities) {
							// update mobile controls
							ige.mobileControls.configure(unitAbilities);
						}
					}
				}
			}
		});

		this.id();
		ige.entitiesToRender.trackEntityById[this.id()] = this;
		this.addBehaviour('mobileControl', this._behaviour);
	},

	clearControls: function () {

		for (var key in this.controls) {
			delete this.controls[key];
		}

		this.emit('clear-controls');
	},

	configure: function (abilities) {
		if (!ige.isMobile || !abilities) return;

		// $("#show-chat").show();
		$('#show-chat').hide(); // completely disable chat on mobile (app review)
		$('#chat-box').hide();

		$('#chat-box').css({ top: '10vh', fontSize: 'x-small' });
		$('#chat-box').css('min-width', '200px');
		$('#chat-history').css('width', '200px');
		$('#dev-console').hide(); // this gets in the way of testing too
		$('#modd-item-shop-modal').css({
			zIndex: 9050
		});
		ige.scoreboard.hideScores(); // default to collapsed state on mobile

		var self = this;

		this.clearControls();

		Object.keys(abilities).forEach(function (key) {
			var ability = abilities[key];

			if (ability.mobilePosition && !self.controls[key]) {
				// mobile control layout editor is 480x270
				// rescale to 960x540
				var x = ability.mobilePosition.x * 2;
				var y = ability.mobilePosition.y * 2;

				self.addControl(key, x, y, 75, 64, ability);
			}
		});
	},

	upPressed: function () {
		if (this.debug) console.log('UP PRESSED');
		var unit = ige.client.myPlayer.getSelectedUnit();
		unit.ability.moveUp();
		if (ige.isClient) {
			ige.network.send('playerKeyDown', { device: 'key', key: 'w' });
		}
	},

	downPressed: function () {
		if (this.debug) console.log('DOWN PRESSED');
		var unit = ige.client.myPlayer.getSelectedUnit();
		unit.ability.moveDown();
		if (ige.isClient) {
			ige.network.send('playerKeyDown', { device: 'key', key: 's' });
		}
	},

	leftPressed: function () {
		if (this.debug) console.log('LEFT PRESSED');
		var unit = ige.client.myPlayer.getSelectedUnit();
		unit.ability.moveLeft();
		if (ige.isClient) {
			ige.network.send('playerKeyDown', { device: 'key', key: 'a' });
		}
	},

	rightPressed: function () {
		if (self.debug) console.log('RIGHT PRESSED');
		var unit = ige.client.myPlayer.getSelectedUnit();
		unit.ability.moveRight();
		if (ige.isClient) {
			ige.network.send('playerKeyDown', { device: 'key', key: 'd' });
		}
	},

	upReleased: function () {
		if (this.debug) console.log('UP RELEASED');
		var unit = ige.client.myPlayer.getSelectedUnit();
		if (unit.direction.y == -1) unit.ability.stopMovingY();
		if (ige.isClient) {
			ige.network.send('playerKeyUp', { device: 'key', key: 'w' });
		}
	},

	downReleased: function () {
		if (this.debug) console.log('DOWN RELEASED');
		var unit = ige.client.myPlayer.getSelectedUnit();
		if (unit.direction.y == 1) unit.ability.stopMovingY();
		if (ige.isClient) {
			ige.network.send('playerKeyUp', { device: 'key', key: 's' });
		}
	},

	leftReleased: function () {
		if (this.debug) console.log('LEFT RELEASED');
		var unit = ige.client.myPlayer.getSelectedUnit();
		if (unit.direction.x == -1) unit.ability.stopMovingX();
		if (ige.isClient) {
			ige.network.send('playerKeyUp', { device: 'key', key: 'a' });
		}
	},

	rightReleased: function () {
		if (this.debug) console.log('RIGHT RELEASED');
		var unit = ige.client.myPlayer.getSelectedUnit();
		if (unit.direction.x == 1) unit.ability.stopMovingX();
		if (ige.isClient) {
			ige.network.send('playerKeyUp', { device: 'key', key: 'd' });
		}
	},

	// add a button or stick to the virtual controller
	addControl: function (key, x, y, w, h, ability) {
		w = w || 128;
		h = h || 128;

		var self = this;

		var settings = {};

		this.controls[key] = settings;

		switch (key) {

			case 'movementWheel': {

				let moveStick = {
					_isUp: false,
					_isDown: false,
					_isLeft: false,
					_isRight: false
				};

				Object.assign(settings, {
					onChange: (data) => {
						if (ige.client.myPlayer) {
							// Endel's joystick angles are in "Maths style" (zero degrees is EAST and positive anticlockwise)
							// Convert into compass style angle (zero degrees NORTH and positive clockwise)
							var compassAngle = (360 - (data.angle - 90)) % 360;

							var tolerance = 12;

							var isUp = (compassAngle <= 90 - tolerance) || (compassAngle >= 270 + tolerance);
							var isDown = (compassAngle >= 90 + tolerance) && (compassAngle <= 270 - tolerance);
							var isLeft = (compassAngle <= 360 - tolerance) && (compassAngle >= 180 + tolerance);
							var isRight = (compassAngle >= tolerance) && (compassAngle <= 180 - tolerance);

							if (data.power > 0.5) {
								if (isUp && moveStick._isUp == false) {
									self.upPressed();
								}
								if (!isUp && moveStick._isUp == true) {
									self.upReleased();
								}
								if (isDown && moveStick._isDown == false) {
									self.downPressed();
								}
								if (!isDown && moveStick._isDown == true) {
									self.downReleased();
								}
								if (isLeft && moveStick._isLeft == false) {
									self.leftPressed();
								}
								if (!isLeft && moveStick._isLeft == true) {
									self.leftReleased();
								}
								if (isRight && moveStick._isRight == false) {
									self.rightPressed();
								}
								if (!isRight && moveStick._isRight == true) {
									self.rightReleased();
								}
								moveStick._isUp = isUp;
								moveStick._isDown = isDown;
								moveStick._isLeft = isLeft;
								moveStick._isRight = isRight;
							} else {
								if (moveStick._isUp) {
									self.upReleased();
								}
								if (moveStick._isLeft) {
									self.leftPressed();
								}
								if (moveStick._isDown) {
									self.downReleased();
								}
								if (moveStick._isRight) {
									self.rightReleased();
								}
								moveStick._isUp = false;
								moveStick._isDown = false;
								moveStick._isLeft = false;
								moveStick._isRight = false;
							}
						}
					},
					onEnd: () => {
						if (moveStick._isUp) {
							self.upReleased();
						}
						if (moveStick._isLeft) {
							self.leftReleased();
						}
						if (moveStick._isDown) {
							self.downReleased();
						}
						if (moveStick._isRight) {
							self.rightReleased();
						}
						moveStick._isUp = false;
						moveStick._isDown = false;
						moveStick._isLeft = false;
						moveStick._isRight = false;
					}
				});
			}
				break;

			case 'lookWheel': {

				Object.assign(settings, {
					onChange: (data) => {
						if (ige.client.myPlayer) {
							// Endel's joystick angles are in "Maths style" (zero degrees is EAST and positive anticlockwise)
							// Convert into compass style angle (zero degrees NORTH and positive clockwise)
							var compassAngle = -(data.angle - 90);

							// simulate mouse movement 10 units away from player (scaled by joystick "power") character but at the angle
							var unitTranslate = ige.client.myPlayer.getSelectedUnit()._translate;
							var mx = unitTranslate.x + Math.sin(compassAngle / 360 * 2 * Math.PI) * 10 * data.power;
							var my = unitTranslate.y - Math.cos(compassAngle / 360 * 2 * Math.PI) * 10 * data.power;

							ige.client.myPlayer.control.input.mouse.x = mx;
							ige.client.myPlayer.control.input.mouse.y = my;

							ige.client.myPlayer.absoluteAngle = compassAngle;
							ige.network.send('playerMouseMoved', [mx, my]);
							ige.network.send('playerAbsoluteAngle', compassAngle);
						}
					}
				});
			}
				break;

			case 'lookAndFireWheel': {

				Object.assign(settings, {
					redFireZone: true,
					onChange: (data) => {
						if (ige.client.myPlayer) {
							// Endel's joystick angles are in "Maths style" (zero degrees is EAST and positive anticlockwise)
							// Convert into compass style angle (zero degrees NORTH and positive clockwise)
							var compassAngle = -(data.angle - 90);

							// simulate mouse movement 10 units away from player (scaled by joystick "power") character but at the angle
							var unitTranslate = ige.client.myPlayer.getSelectedUnit()._translate;
							var mx = unitTranslate.x + Math.sin(compassAngle / 360 * 2 * Math.PI) * 10 * data.power;
							var my = unitTranslate.y - Math.cos(compassAngle / 360 * 2 * Math.PI) * 10 * data.power;

							ige.client.myPlayer.control.input.mouse.x = mx;
							ige.client.myPlayer.control.input.mouse.y = my;

							ige.client.myPlayer.absoluteAngle = compassAngle;
							ige.network.send('playerMouseMoved', [mx, my]);
							ige.network.send('playerAbsoluteAngle', compassAngle);

							// when fire stick is moved to the red ring...
							if (data.power > 0.75) {
								// start firing
								ige.client.myPlayer.control.keyDown('mouse', 'button1');
							} else {
								// otherwise stop firing
								ige.client.myPlayer.control.keyUp('mouse', 'button1');
							}
						}
					},
					onEnd: () => {
						// if the player lets go of the fire stick perform a keyup on mouse button1 to stop firing
						if (ige.client.myPlayer) {
							ige.client.myPlayer.control.keyUp('mouse', 'button1');
						}
					}
				});
			}
				break;

			default: {

				Object.assign(settings, {
					onStart: () => {
						if (key) {
							ige.network.send('playerKeyDown', {
								device: 'key', key: key.toLowerCase()
							});
						}
					},
					onEnd: () => {
						if (key) {
							ige.network.send('playerKeyUp', {
								device: 'key', key: key.toLowerCase()
							});
						}
					}
				});
			}
				break;
		}

		this.emit('add-control', [
			key, x, y, w, h, settings
		]);
	},

	setVisible: function (value) {
		this.emit('visible', value);
	}
});

// client side only
// if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = MobileControlsComponent; }
