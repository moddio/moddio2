var ControlComponent = TaroEntity.extend({
	classId: 'ControlComponent',
	componentId: 'control',

	init: function (entity, options) {
		// Store the entity that this component has been added to
		this._entity = entity;

		this.lastInputSent = 0;
		this.sendMobileInput = true;

		// Store any options that were passed to us
		this._options = options;
		this.lastActionAt = Date.now();
		this.lastMousePosition = [undefined, undefined];
		this.mouseLocked = false;

		// this.lastCommandSentAt = undefined;
		this._isPlayerInputingText = false;
		this.input = {
			mouse: {
				button1: false,
				button3: false,
				wheelUp: false,
				wheelDown: false,
				x: undefined,
				y: undefined
			},
			key: {
				left: false,
				right: false,
				up: false,
				down: false,

				'`': false,
				1: false,
				2: false,
				3: false,
				4: false,
				5: false,
				6: false,
				7: false,
				8: false,
				9: false,

				a: false,
				b: false,
				c: false,
				d: false,
				e: false,
				f: false,
				g: false,
				h: false,
				i: false,
				j: false,
				k: false,
				l: false,
				m: false,
				n: false,
				o: false,
				p: false,
				q: false,
				r: false,
				s: false,
				t: false,
				u: false,
				v: false,
				w: false,
				x: false,
				y: false,
				z: false,

				enter: false,
				space: false,
				escape: false
			}
		};

		for (device in this.input) {
			for (key in this.input[device]) {
				taro.input.mapAction(key, taro.input[device][key]);
			}
		}

		if (taro.isClient) {
			taro.client.on('key-down', (data) => {
				const unit = this._entity.getSelectedUnit();
				const unitAbility = unit._stats.controls.abilities[data.key];
				this.keyDownAbility(unit, unitAbility.keyDown);
				taro.network.send('playerKeyDown', { device: data.device, key: data.key });
			});
			taro.client.on('key-up', (data) => { 
				const unit = this._entity.getSelectedUnit();
				const unitAbility = unit._stats.controls.abilities[data.key];
				this.keyUpAbility(unit, unitAbility);
				taro.network.send('playerKeyUp', { device: data.device, key: data.key });
			});
		}
	},  

	keyDown: function (device, key) {
		if(taro.developerMode.shouldPreventKeybindings() || (taro.isClient && this._entity._stats.clientId === taro.network.id() && taro.client.isPressingAbility)) {
			return;
		}

		this.lastActionAt = Date.now();

		if (this.input[device]) {
			if ((taro.isClient && !this._isPlayerInputingText) || taro.isServer) {
				this.input[device][key] = true;
			}
		}

		var player = this._entity;
		if (!player) {
			return;
		}

		var unit = player.getSelectedUnit();

		if (unit && unit._category == 'unit') {
			if (taro.isServer || (taro.isClient && !this._isPlayerInputingText)) {
				var unitAbility = null;
				// execute movement command is AI is disabled
				if (unit._stats.controls && !unit._stats.aiEnabled){
					if (unit._stats.controls.movementControlScheme == 'wasd') {
						switch (key) {
							case 'w':
							case 'up':
								unit.ability.moveUp();
								// taro.inputReceived = Date.now();
								break;

							case 'a':
							case 'left':
								unit.ability.moveLeft();
								break;

							case 's':
							case 'down':
								unit.ability.moveDown();
								break;

							case 'd':
							case 'right':
								unit.ability.moveRight();
								break;
						}
					} else if (unit._stats.controls.movementControlScheme == 'ad') {
						switch (key) {
							case 'a':
							case 'left':
								unit.ability.moveLeft();
								break;

							case 'd':
							case 'right':
								unit.ability.moveRight();
								break;
						}
					} else if (unit._stats.controls.movementControlScheme == 'azerty') {
						switch (key) {
							case 'z':
							case 'up':
								unit.ability.moveUp();
								// taro.inputReceived = Date.now();
								break;

							case 'q':
							case 'left':
								unit.ability.moveLeft();
								break;

							case 's':
							case 'down':
								unit.ability.moveDown();
								break;

							case 'd':
							case 'right':
								unit.ability.moveRight();
								break;
						}
				}

				if (!unitAbility && unit._stats.controls && unit._stats.controls.abilities) {
					unitAbility = unit._stats.controls.abilities[key];
				}

				if (unitAbility && unitAbility.keyDown && unit.ability) {
					this.keyDownAbility(unit, unitAbility.keyDown);
				} else if (
					key == '1' || key == '2' || key == '3' || key == '4' ||
					key == '5' || key == '6' || key == '7' || key == '8' || key == '9'
				) {
					var index = parseInt(key) - 1;
					if (index < unit._stats.inventorySize) {
						unit.changeItem(index);
					}
				}
			}
		}

		if (taro.isClient) {
			if (!this._isPlayerInputingText) {
				taro.network.send('playerKeyDown', { device: device, key: key });

				// this.lastCommandSentAt = Date.now();
				if (key == '1' || key == '2' || key == '3' || key == '4' ||
					key == '5' || key == '6' || key == '7' || key == '8' || key == '9'
				) {
					var index = parseInt(key) - 1;
					if (unit && index < unit._stats.inventorySize) {
						unit._stats.currentItemIndex = index;
						unit.inventory.highlightSlot(index + 1);
					}
				}
			}
		}
	},

	keyUp: function (device, key) {
		this.lastActionAt = Date.now();

		var player = this._entity;
		if (!player) return;

		var unit = player.getSelectedUnit();
		// for (i in units) {
		// 	var unit = units[i]
		if (unit) {
			// traverse through abilities, and see if any of them is being casted by the owner
			switch (key) {
				case 'w':
				case 'up':
					if (unit.direction.y == -1)
						unit.ability.stopMovingY();
					break;

				case 'a':
				case 'left':
					if (unit.direction.x == -1)
						unit.ability.stopMovingX();
					break;

				case 's':
				case 'down':
					if (unit.direction.y == 1)
						unit.ability.stopMovingY();
					break;

				case 'd':
				case 'right':
					if (unit.direction.x == 1)
						unit.ability.stopMovingX();
					break;

				case 'button1':
					if (unit.ability != undefined) {
						unit.ability.stopUsingItem();
					}
					break;
			}

			// traverse through abilities, and see if any of them is being casted by the owner
			if ((taro.isServer || taro.isClient) && !taro.developerMode.shouldPreventKeybindings()) {
				var unitAbility = null;

				if (!unitAbility && unit._stats.controls && unit._stats.controls.abilities) {
					unitAbility = unit._stats.controls.abilities[key];
				}

				this.keyUpAbility(unit, unitAbility);
			}
		}

		if (taro.isClient) {
			if (this.input[device][key]) {
				taro.network.send('playerKeyUp', { device: device, key: key });
			}
		}

		if (this.input[device]) {
			this.input[device][key] = false;
		}
	},

	keyDownAbility: function (unit, keyDown) {
		if (taro.client && taro.client.inputDelay && taro.client.inputDelay > 0) {
			setTimeout(function () {
				unit.ability.cast(keyDown);
			}, taro.client.inputDelay);
		} else {
			unit.ability.cast(keyDown);
		}

		if (taro.isClient && this._entity._stats.clientId === taro.network.id() && keyDown.abilityId) {
			taro.client.emit('start-press-key', keyDown.abilityId);
		}
	},

	keyUpAbility: function (unit, unitAbility) {
		if (unitAbility && unitAbility.keyUp && unit.ability) {
			if (taro.client && taro.client.inputDelay && taro.client.inputDelay > 0) {
				setTimeout(function () {
					unit.ability.cast(unitAbility.keyUp);
				}, taro.client.inputDelay);
			} else {
				unit.ability.cast(unitAbility.keyUp);
			}
		}

		if (taro.isClient && this._entity._stats.clientId === taro.network.id() && unitAbility?.keyDown?.abilityId) {
			taro.client.emit('stop-press-key', unitAbility.keyDown.abilityId);
		}
	},

	releaseAllKeys: function () {
		const pressedKeys = Object.entries(this.input.key).filter((element) => element[1] === true);
		const pressedMouseButtons = Object.entries(this.input.mouse).filter((element) => element[1] === true);
		pressedKeys.forEach((key) => this.keyUp('key', key[0]));
		pressedMouseButtons.forEach((key) => this.keyUp('mouse', key[0]));
	},

	// check for input modal is open
	updatePlayerInputStatus: function () {
		if (taro.isClient) {
			this._isPlayerInputingText = ($(taro.client.getCachedElementById('message')).is(':focus') && !$(taro.client.getCachedElementById('player-input-field')).is(':focus')) ||
				$(taro.client.getCachedElementById('modd-dialogue-modal')).hasClass('show') ||
				$(taro.client.getCachedElementById('player-input-modal')).hasClass('show') ||
				$(taro.client.getCachedElementById('modd-item-shop-modal')).hasClass('show') ||
				$(taro.client.getCachedElementById('custom-modal')).hasClass('show');
		}
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the
	 * scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	_behaviour: function (ctx) {
		var self = this;

		var player = this._entity;
		if (!player) return;
		var unit = player.getSelectedUnit();

		if (taro.isClient) {
			if (unit) {
				// check if sending player input is due (every 100ms)
				if (taro._currentTime - self.lastInputSent > 100) {
					self.sendMobileInput = true;
					self.sendPlayerInput = true;
					self.lastInputSent = taro._currentTime;
				}

				for (device in self.input) {
					for (key in self.input[device]) {
						if (taro.input.actionState(key)) {
							if (self.input[device][key] == false) {
								if (taro.isMobile && self.sendMobileInput && device == 'mouse') {
									// tap on mobile will be detected as right click for now, so old games with joysticks will not have problems
									self.keyDown('mouse', 'button3');
									self.sendMobileInput = false;
								} else if (!taro.isMobile) {
									self.keyDown(device, key);
									if (key === 'wheelUp' || key === 'wheelDown') {
										taro.input._state[taro.input._controlMap[key]] = false;
										self.input[device][key] = false;
									}
								}
							}
						} else {
							if (self.input[device][key] == true) {
								if (taro.isMobile && self.sendMobileInput && device == 'mouse') {
									// tap on mobile will be detected as right click for now, so old games with joysticks will not have problems
									self.keyUp('mouse', 'button3');
									self.sendMobileInput = false;
								} else if (!taro.isMobile) {
									self.keyUp(device, key);
								}
							}
						}
					}
				}

				if (self.newMousePosition && (self.newMousePosition[0] != self.lastMousePosition[0] || self.newMousePosition[1] != self.lastMousePosition[1])) {
					// if we are using mobile controls don't send mouse moves to server here as we will do so from a look touch stick
					if (!taro.isMobile) {
						// absolute mouse position wrt window
						if (taro._mouseAbsoluteTranslation && taro._mouseAbsoluteTranslation[0] && taro._mouseAbsoluteTranslation[1]) {
							var centerOfScreen = {};
							centerOfScreen.innerWidth = window.innerWidth / 2;
							centerOfScreen.innerHeight = window.innerHeight / 2;
							var angle = 0;
							if (centerOfScreen && taro._mouseAbsoluteTranslation[0] != centerOfScreen.innerWidth && centerOfScreen.innerHeight != taro._mouseAbsoluteTranslation[1]) {
								angle = Math.atan2(taro._mouseAbsoluteTranslation[0] - centerOfScreen.innerWidth, centerOfScreen.innerHeight - taro._mouseAbsoluteTranslation[1]);
							}
							// angle = angle % Math.PI;
							angle = parseFloat(angle.toPrecision(5));
							if (self.sendPlayerInput)
								taro.network.send('playerAbsoluteAngle', angle);

							if (taro.client.myPlayer) {
								taro.client.myPlayer.absoluteAngle = angle;
							}
							self.absoluteAngle = angle;
						}
						if (taro.client && taro.client.myPlayer) {
							taro.client.myPlayer.control.input.mouse.x = self.newMousePosition[0];
							taro.client.myPlayer.control.input.mouse.y = self.newMousePosition[1];
						}
					}
					if (self.sendPlayerInput) {
						//console.log('SEND MOUSE POS', self.newMousePosition[0], self.newMousePosition[1]);
						taro.network.send('playerMouseMoved', self.newMousePosition);
						self.lastMousePosition = self.newMousePosition;
					}
				}

				// send unit position to server (client-authoritative movement)
				// if (taro.physics && taro.game.cspEnabled && !unit._stats.aiEnabled && !unit.isTeleporting) {
				// 	var x = unit._translate.x.toFixed(0);
				// 	var y = unit._translate.y.toFixed(0);
				// 	if (self.sendPlayerInput && (self.lastPositionSent == undefined || self.lastPositionSent[0] != x || self.lastPositionSent[1] != y)) {
				// 		var pos = [x, y];
				// 		taro.network.send('playerUnitMoved', pos);
				// 		self.lastPositionSent = pos;
				// 	}
				// }

				self.sendPlayerInput = false;
			}
		}

		// unit rotation for human player. this runs on client-side only
		if (unit && !unit._stats.aiEnabled) {
			unit.updateAngleToTarget();
		}
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = ControlComponent;
}
