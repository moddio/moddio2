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

		this.secondaryTouchPosition = { x: NaN, y: NaN };

		var self = this;

		// mouse move listener
		taro.input.on('touchpointermove', function (point) {
			taro.client.myPlayer.control.newMouseState[0] = point.x.toFixed(0);
			taro.client.myPlayer.control.newMouseState[1] = point.y.toFixed(0);

			for (let i = 0; i < taro.client.myPlayer.control.newMouseState.length; i++) {
				taro.client.myPlayer.control.lastMouseState[i] = taro.client.myPlayer.control.newMouseState[i];
			}
		});

		// second touch listener
		taro.input.on('secondarytouchpointermove', function (point) {
			self.secondaryTouchPosition = { x: point.x.toFixed(0), y: point.y.toFixed(0) };
		});

		$(window).on('orientationchange load resize', function () {
			if (taro.mobileControls) {
				// and this unit is our player
				if (taro.client && taro.client.myPlayer && taro.network.id() == taro.client.myPlayer._stats.clientId) {
					var unit = taro.$(taro.client.myPlayer._stats.selectedUnitId);
					if (unit && unit._stats.controls) {
						self.emit('orientationchange', screen.orientation.type);
						if (unit._stats.controls.abilities) {
							// update mobile controls
							taro.mobileControls.configure(unit._stats.controls);
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

	updateButtonPos: function () {
		if (taro.mobileControls) {
			// and this unit is our player
			if (taro.client && taro.client.myPlayer && taro.network.id() == taro.client.myPlayer._stats.clientId) {
				var unit = taro.$(taro.client.myPlayer._stats.selectedUnitId);
				if (unit && unit._stats.controls) {
					if (unit._stats.controls.keybindings) {
						// update mobile controls
						taro.mobileControls.configure(unit._stats.controls);
					}
				}
			}
		}
	},

	configure: function (controls) {
		const keybindings = controls.abilities;
		if (!taro.isMobile || !keybindings) return;

		const abilities = controls.unitAbilities;

		// $("#show-chat").show();
		$('#show-chat').hide(); // completely disable chat on mobile (app review)
		$('#chat-box').hide();

		$('#chat-box').css({ top: '10vh', fontSize: 'x-small' });
		$('#chat-box').css('min-width', '200px');
		$('#chat-history').css('width', '200px');
		$('#dev-console').hide(); // this gets in the way of testing too
		$('#modd-item-shop-modal').css({
			zIndex: 9050,
		});
		taro.scoreboard.hideScores(); // default to collapsed state on mobile

		var self = this;

		this.clearControls();

		Object.keys(keybindings).forEach(function (key) {
			var keybinding = keybindings[key];

			if (keybinding.mobilePosition && !self.controls[key]) {
				// mobile control layout editor is 480x270
				// rescale to 960x540
				var x = keybinding.mobilePosition.x * 2;
				var y = keybinding.mobilePosition.y * 2;

				self.addControl(key, x, y, keybinding, abilities);
			}
		});
	},

	// add a button or stick to the virtual controller
	addControl: function (key, x, y, keybinding, abilities) {
		var self = this;

		var settings = {};

		this.controls[key] = settings;

		switch (key) {
			case 'movementWheel':
			case 'lookWheel':
			case 'lookAndFireWheel':
				{
					if (document.getElementById(key + '_joystick')) break;
					this.createJoystick(key, x, y);
				}
				break;
			default:
				{
					this.generateHTMLButton(key, x, y, keybinding, abilities);
				}
				break;
		}
	},

	generateHTMLButton: function (type, x, y, keybinding, abilities) {
		if (document.getElementById(type + '_button')) {
			return;
		}

		// buttons position
		const [xOnClientScreen, yOnClientScreen] = [(x * window.innerWidth) / 960, (y * window.innerHeight) / 540];

		// create a new button using html
		const htmlButton = document.createElement('button');
		htmlButton.id = type + '_button';

		// setting style for button
		Object.assign(htmlButton.style, {
			position: 'absolute',
			left: `${xOnClientScreen}px`,
			top: `${yOnClientScreen}px`,
			transform: 'translate(-50%, -50%)',
			width: '60px',
			height: '60px',
			fontSize: '16px',
			color: '#fff',
			backgroundColor: '#33333366',
			border: '2px solid #555',
			backdropFilter: 'blur(4px)',
			borderRadius: '8px',
			zIndex: '1000',
			cursor: 'pointer',
		});

		const abilityId = keybinding.keyDown?.abilityId || keybinding.keyUp?.abilityId;
		let ability = null;
		if (abilityId) {
			ability = abilities[abilityId];
		}

		// check if ability is desktop only
		if (ability && ability.visibility == 'desktop') {
			return;
		}

		if (ability && ability.iconUrl) {
			htmlButton.innerHTML = `<img src="${ability.iconUrl}" style="width: 100%; height: 100%; object-fit: cover;"/>`;
		} else {
			htmlButton.textContent = type;
		}

		document.body.appendChild(htmlButton);

		htmlButton.addEventListener('touchstart', function () {
			if (taro.isClient) {
				let timerElement = document.getElementById(type + '_button_timer');
				let button = document.getElementById(type + '_button');

				if (timerElement) return;
				taro.client.emit('key-down', {
					device: 'key',
					key: type.toLowerCase(),
				});

				if (ability && ability.cooldown && !timerElement) {
					let cooldown = ability.cooldown;

					// cooldown logic
					let cooldownCount = 0;

					if (!timerElement) {
						timerElement = document.createElement('h5');
						timerElement.id = type + '_button_timer';
						Object.assign(timerElement.style, {
							right: 0,
							position: 'absolute',
							fontSize: '0.8rem',
						});
						timerElement.innerHTML = cooldown - cooldownCount;
						button.append(timerElement);
					}

					cooldownInterval = setInterval(() => {
						if (cooldownCount >= cooldown) {
							button.disabled = false;
							timerElement.parentNode.removeChild(timerElement);
							clearInterval(cooldownInterval);
						} else {
							console.log(cooldown, cooldownCount);
							button.disabled = true;
							cooldownCount++;
							timerElement.innerHTML = cooldown - cooldownCount;
						}
					}, 1000);
				}
			}
		});

		htmlButton.addEventListener('touchend', function () {
			if (taro.isClient) {
				taro.client.emit('key-up', {
					device: 'key',
					key: type.toLowerCase(),
				});
			}
		});
	},
	createJoystick: function (type, x, y) {
		// building joystick zone
		let joystickZone = document.createElement('div');
		joystickZone.id = type + '_joystick';
		joystickZone.style.width = '50vw';
		joystickZone.style.height = '50vw';
		joystickZone.style.position = 'fixed';

		// placing joystick in the correct zone
		// if x is more than 450, then place the joystick on the right side of the screen
		if (x > 450) {
			joystickZone.style.right = '0';
			joystickZone.style.top = '0';
		} else {
			joystickZone.style.left = '0';
			joystickZone.style.top = '0';
		}

		// append joystick to the gamediv element
		let gameDiv = document.getElementById('default-ingame-ui-container');
		// make first child of gameDiv
		gameDiv.insertBefore(joystickZone, gameDiv.firstChild);

		// calculate joystick position based on x and y coordinates
		const [xPercentage, yPercentage] = [
			((x / window.innerWidth) * 100).toFixed(2),
			((y / window.innerHeight) * 100).toFixed(2),
		];

		// assign joystick to the zone
		var manager = window.nipplejs.create({
			zone: joystickZone,
			mode: 'dynamic',
			position: { left: `${xPercentage}%`, top: `${yPercentage}%` },
			color: 'black',
		});

		switch (type) {
			case 'lookAndFireWheel':
				{
					let usingMouseKeyDown = false;
					let usingMouseKeyUp = false;

					let isFireGunCalled = false;
					let isFiring = false;

					let startFiringGun;

					// handle look wheel inputs and fire
					const handleShoot = (data) => {
						let joystickData = {
							angle: ((data.angle.degree + 180) % 360) - 180,
							power: data.force,
						};
						if (taro.client.myPlayer) {
							this.mouseMovement(joystickData.power, joystickData.angle);

							// when fire stick is moved to the red ring...
							if (joystickData.power > 1 && !usingMouseKeyDown) {
								document.getElementsByClassName('back')[0].style.backgroundColor = 'red';
								document.getElementsByClassName('front')[0].style.backgroundColor = 'red';

								if (!isFireGunCalled) {
									isFireGunCalled = true;
									usingMouseKeyDown = true;
									startFiringGun = setInterval(() => {
										if (isFiring) {
											isFiring = false;
											taro.client.myPlayer.control.keyUp('mouse', 'button1');
											taro.client.myPlayer.control.keyDown('mouse', 'button1');
										} else {
											isFiring = true;
										}
									}, 100);
								}
							} else if (joystickData.power < 1) {
								usingMouseKeyUp = true;
								usingMouseKeyDown = false;
								// otherwise stop firing

								document.getElementsByClassName('back')[0].style.backgroundColor = 'black';
								document.getElementsByClassName('front')[0].style.backgroundColor = 'black';

								clearInterval(startFiringGun);
								isFireGunCalled = false;
								// calling mouse up to trigger end of click
								taro.client.myPlayer.control.keyUp('mouse', 'button1');
							}
						}
					};

					// handle end of shooting
					const endShoot = () => {
						if (taro.client.myPlayer) {
							usingMouseKeyUp = true;
							usingMouseKeyDown = false;

							document.getElementsByClassName('back')[0].style.backgroundColor = 'black';
							document.getElementsByClassName('front')[0].style.backgroundColor = 'black';

							clearInterval(startFiringGun);
							isFireGunCalled = false;
							// calling mouse up to trigger end of click
							taro.client.myPlayer.control.keyUp('mouse', 'button1');
						}
					};

					// listen for joystick movement
					manager.on('move', function (evt, data) {
						if (taro.client.myPlayer) {
							handleShoot(data);
						}
					});

					// listen for end of joystick movement
					manager.on('end', function (evt, data) {
						endShoot();
					});
				}
				break;
			case 'movementWheel':
				{
					let moveStick = {
						isUp: false,
						isDown: false,
						isLeft: false,
						isRight: false,

						upPressed: function () {
							if (this.debug) console.log('UP PRESSED');
							taro.client.myPlayer.control.keyDown('key', 'w');
						},

						downPressed: function () {
							if (this.debug) console.log('DOWN PRESSED');
							taro.client.myPlayer.control.keyDown('key', 's');
						},

						leftPressed: function () {
							if (this.debug) console.log('LEFT PRESSED');
							taro.client.myPlayer.control.keyDown('key', 'a');
						},

						rightPressed: function () {
							if (self.debug) console.log('RIGHT PRESSED');
							taro.client.myPlayer.control.keyDown('key', 'd');
						},

						upReleased: function () {
							if (this.debug) console.log('UP RELEASED');
							taro.client.myPlayer.control.keyUp('key', 'w');
						},

						downReleased: function () {
							if (this.debug) console.log('DOWN RELEASED');
							taro.client.myPlayer.control.keyUp('key', 's');
						},

						leftReleased: function () {
							if (this.debug) console.log('LEFT RELEASED');
							taro.client.myPlayer.control.keyUp('key', 'a');
						},

						rightReleased: function () {
							if (this.debug) console.log('RIGHT RELEASED');
							taro.client.myPlayer.control.keyUp('key', 'd');
						},
					};

					manager.on('move', function (evt, data) {
						let joystickData = {
							angle: data.angle.degree,
							power: data.force,
						};
						if (taro.client.myPlayer) {
							// Endel's joystick angles are in "Maths style" (zero degrees is EAST and positive anticlockwise)
							// Convert into compass style angle (zero degrees NORTH and positive clockwise)
							var compassAngle = (360 - (joystickData.angle - 90)) % 360;

							var tolerance = 12;

							var isUp = compassAngle <= 90 - tolerance || compassAngle >= 270 + tolerance;
							var isDown = compassAngle >= 90 + tolerance && compassAngle <= 270 - tolerance;
							var isLeft = compassAngle <= 360 - tolerance && compassAngle >= 180 + tolerance;
							var isRight = compassAngle >= tolerance && compassAngle <= 180 - tolerance;

							if (joystickData.power > 0.5) {
								if (isUp && moveStick._isUp == false) {
									moveStick.upPressed();
								}
								if (!isUp && moveStick._isUp == true) {
									moveStick.upReleased();
								}
								if (isDown && moveStick._isDown == false) {
									moveStick.downPressed();
								}
								if (!isDown && moveStick._isDown == true) {
									moveStick.downReleased();
								}
								if (isLeft && moveStick._isLeft == false) {
									moveStick.leftPressed();
								}
								if (!isLeft && moveStick._isLeft == true) {
									moveStick.leftReleased();
								}
								if (isRight && moveStick._isRight == false) {
									moveStick.rightPressed();
								}
								if (!isRight && moveStick._isRight == true) {
									moveStick.rightReleased();
								}
								moveStick._isUp = isUp;
								moveStick._isDown = isDown;
								moveStick._isLeft = isLeft;
								moveStick._isRight = isRight;
							} else {
								if (moveStick._isUp) {
									moveStick.upReleased();
								}
								if (moveStick._isLeft) {
									moveStick.leftReleased();
								}
								if (moveStick._isDown) {
									moveStick.downReleased();
								}
								if (moveStick._isRight) {
									moveStick.rightReleased();
								}
								moveStick._isUp = false;
								moveStick._isDown = false;
								moveStick._isLeft = false;
								moveStick._isRight = false;
							}
						}
					});
					manager.on('end', function (evt, data) {
						if (moveStick._isUp) {
							moveStick.upReleased();
						}
						if (moveStick._isLeft) {
							moveStick.leftReleased();
						}
						if (moveStick._isDown) {
							moveStick.downReleased();
						}
						if (moveStick._isRight) {
							moveStick.rightReleased();
						}
						moveStick._isUp = false;
						moveStick._isDown = false;
						moveStick._isLeft = false;
						moveStick._isRight = false;
					});
				}
				break;

			case 'lookWheel':
				{
					// handle look wheel inputs
					const handleLookWheelInputs = (data) => {
						let joystickData = {
							angle: ((data.angle.degree + 180) % 360) - 180,
							power: data.force,
						};

						this.mouseMovement(joystickData.power, joystickData.angle);
					};

					// listen for joystick movement
					manager.on('move', function (evt, data) {
						if (taro.client.myPlayer) {
							handleLookWheelInputs(data);
						}
					});
				}
				break;
		}
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
				var mx = unitTranslate.x + Math.sin((compassAngle / 360) * 2 * Math.PI) * 100000 * power;
				var my = unitTranslate.y - Math.cos((compassAngle / 360) * 2 * Math.PI) * 100000 * power;
			}

			taro.client.myPlayer.control.input.mouse.x = mx;
			taro.client.myPlayer.control.input.mouse.y = my;

			taro.client.myPlayer.absoluteAngle = compassAngle;

			taro.client.myPlayer.control.newMouseState[0] = mx.toFixed(0);
			taro.client.myPlayer.control.newMouseState[1] = my.toFixed(0);
		}
	},

	_behaviour: function () {
		// necessary to prevent the game from crashing when EntitiesToRender.updateAllEntities() tries to call ._behaviour() for all entities that are rendered
	},
});

// client side only
// if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = MobileControlsComponent; }
