/**
 * MobileControlsComponent
 * Virtual game controls for use on mobile devices
 */
var MobileControlsComponent = TaroEntity.extend({
	classId: 'MobileControlsComponent',
	componentId: 'mobileControls',

	init: function (entity) {
		TaroEntity.prototype.init.call(this);

		// Store the entity that this component has been added to
		this._entity = entity;

		this.debug = false;

		this.controls = {};

		// mouse move listener
		taro.input.on('touchpointermove', function (point) {
			taro.client.myPlayer.control.newMousePosition[0] = point.x;
			taro.client.myPlayer.control.newMousePosition[1] = point.y;
		});

		$(window).on('orientationchange load resize', function () {
			if (taro.mobileControls) {
				// and this unit is our player
				if (taro.client && taro.client.myPlayer && taro.network.id() == taro.client.myPlayer._stats.clientId) {
					var unit = taro.$(taro.client.myPlayer._stats.selectedUnitId);
					if (unit && unit._stats.controls) {
						var unitAbilities = unit._stats.controls.abilities;
						if (unitAbilities) {
							// update mobile controls
							taro.mobileControls.configure(unitAbilities);
						}
					}
				}
			}
		});

		this.id();
		taro.entitiesToRender.trackEntityById[this.id()] = this;
		this.addBehaviour('mobileControl', this._behaviour);
	},

	clearControls: function () {

		for (var key in this.controls) {
			delete this.controls[key];
		}

		this.emit('clear-controls');
	},

	configure: function (abilities) {
		if (!taro.isMobile || !abilities) return;

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
		taro.scoreboard.hideScores(); // default to collapsed state on mobile

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
		var unit = taro.client.myPlayer.getSelectedUnit();
		if (unit) unit.ability.moveUp();
		if (taro.isClient) {
			taro.network.send('playerKeyDown', { device: 'key', key: 'w' });
		}
	},

	downPressed: function () {
		if (this.debug) console.log('DOWN PRESSED');
		var unit = taro.client.myPlayer.getSelectedUnit();
		if (unit) unit.ability.moveDown();
		if (taro.isClient) {
			taro.network.send('playerKeyDown', { device: 'key', key: 's' });
		}
	},

	leftPressed: function () {
		if (this.debug) console.log('LEFT PRESSED');
		var unit = taro.client.myPlayer.getSelectedUnit();
		if (unit) unit.ability.moveLeft();
		if (taro.isClient) {
			taro.network.send('playerKeyDown', { device: 'key', key: 'a' });
		}
	},

	rightPressed: function () {
		if (self.debug) console.log('RIGHT PRESSED');
		var unit = taro.client.myPlayer.getSelectedUnit();
		if (unit) unit.ability.moveRight();
		if (taro.isClient) {
			taro.network.send('playerKeyDown', { device: 'key', key: 'd' });
		}
	},

	upReleased: function () {
		if (this.debug) console.log('UP RELEASED');
		var unit = taro.client.myPlayer.getSelectedUnit();
		if (unit && unit.direction.y == -1) unit.ability.stopMovingY();
		if (taro.isClient) {
			taro.network.send('playerKeyUp', { device: 'key', key: 'w' });
		}
	},

	downReleased: function () {
		if (this.debug) console.log('DOWN RELEASED');
		var unit = taro.client.myPlayer.getSelectedUnit();
		if (unit && unit.direction.y == 1) unit.ability.stopMovingY();
		if (taro.isClient) {
			taro.network.send('playerKeyUp', { device: 'key', key: 's' });
		}
	},

	leftReleased: function () {
		if (this.debug) console.log('LEFT RELEASED');
		var unit = taro.client.myPlayer.getSelectedUnit();
		if (unit && unit.direction.x == -1) unit.ability.stopMovingX();
		if (taro.isClient) {
			taro.network.send('playerKeyUp', { device: 'key', key: 'a' });
		}
	},

	rightReleased: function () {
		if (this.debug) console.log('RIGHT RELEASED');
		var unit = taro.client.myPlayer.getSelectedUnit();
		if (unit && unit.direction.x == 1) unit.ability.stopMovingX();
		if (taro.isClient) {
			taro.network.send('playerKeyUp', { device: 'key', key: 'd' });
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
						if (taro.client.myPlayer) {
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
						if (taro.client.myPlayer) {
                            this.mouseMovement(data.power, data.angle);
						}
					}
				});
			}
				break;

			case 'lookAndFireWheel': {

				Object.assign(settings, {
					redFireZone: true,
					onChange: (data) => {
						if (taro.client.myPlayer) {
                            this.mouseMovement(data.power, data.angle);

							// when fire stick is moved to the red ring...
							if (data.power > 1) {
								// start firing
								taro.client.myPlayer.control.keyDown('mouse', 'button1');
							} else {
								// otherwise stop firing
								taro.client.myPlayer.control.keyUp('mouse', 'button1');
							}
						}
					},
					onEnd: () => {
						// if the player lets go of the fire stick perform a keyup on mouse button1 to stop firing
						if (taro.client.myPlayer) {
							taro.client.myPlayer.control.keyUp('mouse', 'button1');
						}
					}
				});
			}
				break;

			default: {

				Object.assign(settings, {
					onStart: () => {
						if (key) {
							taro.network.send('playerKeyDown', {
								device: 'key', key: key.toLowerCase()
							});
						}
					},
					onEnd: () => {
						if (key) {
							taro.network.send('playerKeyUp', {
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
	},

    mouseMovement: function (power, angle) {
        // simulate mouse movement 100000 units away from player (scaled by joystick "power") character but at the angle
        if (power > 0) {
            // Endel's joystick angles are in "Maths style" (zero degrees is EAST and positive anticlockwise)
            // Convert into compass style angle (zero degrees NORTH and positive clockwise)
            var compassAngle = -(angle - 90);

            var unit = taro.client.myPlayer.getSelectedUnit();
            if (unit) {
                var unitTranslate = unit._translate;
                var mx = unitTranslate.x + Math.sin(compassAngle / 360 * 2 * Math.PI) * 100000 * power;
                var my = unitTranslate.y - Math.cos(compassAngle / 360 * 2 * Math.PI) * 100000 * power;
            }

            taro.client.myPlayer.control.input.mouse.x = mx;
            taro.client.myPlayer.control.input.mouse.y = my;

            taro.client.myPlayer.absoluteAngle = compassAngle;
            taro.network.send('playerMouseMoved', [mx, my]);
            taro.network.send('playerAbsoluteAngle', compassAngle);
        }
    },

	_behaviour: function () {
		// necessary to prevent the game from crashing when EntitiesToRender.updateAllEntities() tries to call ._behaviour() for all entities that are rendered
	}



});

// client side only
// if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = MobileControlsComponent; }
