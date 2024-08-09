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
		this.lastMouseState = [undefined, undefined, 0, Math.PI * 0.5];
		this.newMouseState = [undefined, undefined, 0, Math.PI * 0.5];
		this.mouseLocked = false;

		// this.lastCommandSentAt = undefined;
		this._isPlayerInputingText = false;
		// TODO(nick): We probably want to use the data in TaroInputComponent at
		// some point, a lot of code is duplicated here.
		this.input = {
			mouse: {
				button1: false,
				button3: false,
				wheelUp: false,
				wheelDown: false,
				x: undefined,
				y: undefined,
				yaw: 0,
				pitch: Math.PI * 0.5,
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
				escape: false,
			},
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
				if (unitAbility) this.keyDownAbility(unit, unitAbility.keyDown, data.key);
				taro.network.send('playerKeyDown', { device: data.device, key: data.key });
			});
			taro.client.on('key-up', (data) => {
				const unit = this._entity.getSelectedUnit();
				const unitAbility = unit._stats.controls.abilities[data.key];
				this.keyUpAbility(unit, unitAbility, data.key);
				taro.network.send('playerKeyUp', { device: data.device, key: data.key });
			});

			window.addEventListener('blur', this.onInactiveTab.bind(this));
		}
	},

	onInactiveTab: function () {
		this.releaseAllKeys();

		const player = this._entity;
		if (!player) return;

		const unit = player.getSelectedUnit();
		if (!unit) return;

		unit.ability.stopMovingX();
		unit.ability.stopMovingY();
	},

	mouseMove(x, y, yaw, pitch) {
		// Same conditional logic as line 155
		{
			var player = this._entity;
			if (!player) return;

			var unit = player.getSelectedUnit();
			if (unit && unit._category == 'unit') {
				if (taro.isServer || (taro.isClient && !this._isPlayerInputingText)) {
					if (unit._stats.controls && !unit._stats.aiEnabled) {
						const isRelativeMovement = ['wasdRelativeToUnit'].includes(unit._stats.controls.movementControlScheme);
						if (isRelativeMovement) {
							unit.ability.moveRelativeToAngle(-yaw);
						}
					}
				}
			}
		}
	},

	keyDown: function (device, key) {
		if (
			taro.developerMode.shouldPreventKeybindings() ||
			(taro.isClient && this._entity._stats.clientId === taro.network.id() && taro.client.isPressingPhaserButton)
		) {
			return;
		}

		const lastLeft = this.input.key.a || this.input.key.left;
		const lastRight = this.input.key.d || this.input.key.right;
		const lastUp = this.input.key.w || this.input.key.up;
		const lastDown = this.input.key.s || this.input.key.down;

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
				// execute movement command if AI is disabled
				if (unit._stats.controls && !unit._stats.aiEnabled) {
					const canMoveHorizontal = ['wasd', 'ad', 'wasdRelativeToUnit'].includes(
						unit._stats.controls.movementControlScheme
					);
					const canMoveVertical = ['wasd', 'wasdRelativeToUnit'].includes(unit._stats.controls.movementControlScheme);
					const left = canMoveHorizontal && (this.input.key.a || this.input.key.left);
					const right = canMoveHorizontal && (this.input.key.d || this.input.key.right);
					const up = canMoveVertical && (this.input.key.w || this.input.key.up);
					const down = canMoveVertical && (this.input.key.s || this.input.key.down);
					unit.ability.move(left, right, up, down);

					if (left && right && !lastLeft) unit.ability.moveLeft();
					else if (left && right && !lastRight) unit.ability.moveRight();

					if (up && down && !lastUp) unit.ability.moveUp();
					else if (up && down && !lastDown) unit.ability.moveDown();
				}

				if (!unitAbility && unit._stats.controls && unit._stats.controls.abilities) {
					unitAbility = unit._stats.controls.abilities[key];
				}

				if (unitAbility && unitAbility.keyDown && unit.ability) {
					this.keyDownAbility(unit, unitAbility.keyDown, key);
				} else if (
					key == '1' ||
					key == '2' ||
					key == '3' ||
					key == '4' ||
					key == '5' ||
					key == '6' ||
					key == '7' ||
					key == '8' ||
					key == '9'
				) {
					var index = parseInt(key) - 1;
					if (index < unit._stats.inventorySize && !unit._stats.isHidden) {
						unit.changeItem(index);
					}
				}
			}
		}

		if (taro.isClient) {
			if (!this._isPlayerInputingText) {
				taro.network.send('playerKeyDown', { device: device, key: key });

				// this.lastCommandSentAt = Date.now();
				if (
					key == '1' ||
					key == '2' ||
					key == '3' ||
					key == '4' ||
					key == '5' ||
					key == '6' ||
					key == '7' ||
					key == '8' ||
					key == '9'
				) {
					var index = parseInt(key) - 1;
					if (unit && index < unit._stats.inventorySize && !unit._stats.isHidden) {
						unit._stats.currentItemIndex = index;
						unit.inventory.highlightSlot(index + 1);
					}
				}
			}
		}
	},

	keyUp: function (device, key) {
		var player = this._entity;
		if (!player) return;

		var unit = player.getSelectedUnit();
		if (unit) {
			// traverse through abilities, and see if any of them is being casted by the owner
			switch (key) {
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

				this.keyUpAbility(unit, unitAbility, key);
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

		if (unit) {
			const canMoveHorizontal = ['wasd', 'ad', 'wasdRelativeToUnit'].includes(
				unit._stats.controls.movementControlScheme
			);
			const canMoveVertical = ['wasd', 'wasdRelativeToUnit'].includes(unit._stats.controls.movementControlScheme);
			const left = canMoveHorizontal && (this.input.key.a || this.input.key.left);
			const right = canMoveHorizontal && (this.input.key.d || this.input.key.right);
			const up = canMoveVertical && (this.input.key.w || this.input.key.up);
			const down = canMoveVertical && (this.input.key.s || this.input.key.down);
			unit.ability.move(left, right, up, down);
		}
	},

	keyDownAbility: function (unit, keyDown, key) {
		if (taro.client && taro.client.inputDelay && taro.client.inputDelay > 0) {
			setTimeout(function () {
				unit.ability.cast(keyDown, key);
			}, taro.client.inputDelay);
		} else {
			unit.ability.queueCast(keyDown, key);
		}

		if (taro.isClient && this._entity._stats.clientId === taro.network.id() && keyDown.abilityId) {
			taro.client.emit('start-press-key', key);
		}
	},

	keyUpAbility: function (unit, unitAbility, key) {
		if (unitAbility && unitAbility.keyUp && unit.ability) {
			if (taro.client && taro.client.inputDelay && taro.client.inputDelay > 0) {
				setTimeout(function () {
					unit.ability.cast(unitAbility.keyUp, key);
				}, taro.client.inputDelay);
			} else {
				unit.ability.queueCast(unitAbility.keyUp, key);
			}
		}

		if (taro.isClient && this._entity._stats.clientId === taro.network.id() && unitAbility?.keyDown?.abilityId) {
			taro.client.emit('stop-press-key', key);
		}
	},

	releaseAllKeys: function () {
		const pressedKeys = Object.entries(this.input.key).filter((element) => element[1] === true);
		const pressedMouseButtons = Object.entries(this.input.mouse).filter((element) => element[1] === true);
		pressedKeys.forEach((key) => {
			this.keyUp('key', key[0]);
			if (taro.input) taro.input.releaseKey(key[0]);
		});
		pressedMouseButtons.forEach((key) => {
			this.keyUp('mouse', key[0]);
			if (taro.input) taro.input.releaseMouseButton(key[0]);
		});
	},

	// check for input modal is open
	updatePlayerInputStatus: function () {
		if (taro.isClient) {
			this._isPlayerInputingText =
				($(taro.client.getCachedElementById('message')).is(':focus') &&
					!$(taro.client.getCachedElementById('player-input-field')).is(':focus')) ||
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
				var now = Date.now();

				// check if sending player input is due (every 100ms)
				if (now - self.lastInputSent > 100) {
					self.sendMobileInput = true;
					self.sendMouseMovement = true;
					self.lastInputSent = now;

					// if my unit has cspMode == 2 (client-authoritative), send its position to the server every 66ms
					if (taro.game.data.defaultData.clientPhysicsEngine && unit._stats.controls?.cspMode == 2) {
						// if the current tab just became active, wait at least 2 seconds before sending my unit's position to the server
						if (now - self.tabBecameActiveAt < 1000) {
							return;
						}
						const velocity = unit.getLinearVelocity();
						taro.network.send('playerUnitMoved', [
							parseFloat(unit._translate.x).toFixed(2),
							parseFloat(unit._translate.y).toFixed(2),
							parseFloat(unit._rotate.z).toFixed(4),
							velocity.x.toFixed(2),
							velocity.y.toFixed(2),
						]);
					}
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

				// if mouse has moved
				if (
					self.newMouseState &&
					(self.newMouseState[0] != self.lastMouseState[0] || self.newMouseState[1] != self.lastMouseState[1])
				) {
					// if we are using mobile controls don't send mouse moves to server here as we will do so from a look touch stick
					if (!taro.isMobile) {
						// absolute mouse position wrt window
						if (
							taro._mouseAbsoluteTranslation &&
							taro._mouseAbsoluteTranslation[0] &&
							taro._mouseAbsoluteTranslation[1]
						) {
							var centerOfScreen = {};
							centerOfScreen.innerWidth = window.innerWidth / 2;
							centerOfScreen.innerHeight = window.innerHeight / 2;
							var angle = 0;
							if (
								centerOfScreen &&
								taro._mouseAbsoluteTranslation[0] != centerOfScreen.innerWidth &&
								centerOfScreen.innerHeight != taro._mouseAbsoluteTranslation[1]
							) {
								angle = Math.atan2(
									taro._mouseAbsoluteTranslation[0] - centerOfScreen.innerWidth,
									centerOfScreen.innerHeight - taro._mouseAbsoluteTranslation[1]
								);
							}
							// angle = angle % Math.PI;
							angle = parseFloat(angle.toPrecision(5));
							if (self.sendMouseMovement) taro.network.send('playerAbsoluteAngle', angle);

							if (taro.client.myPlayer) {
								taro.client.myPlayer.absoluteAngle = angle;
							}
							self.absoluteAngle = angle;
						}
						if (taro.client && taro.client.myPlayer) {
							taro.client.myPlayer.control.input.mouse.x = self.newMouseState[0];
							taro.client.myPlayer.control.input.mouse.y = self.newMouseState[1];
						}
					}

					if (self.sendMouseMovement) {
						taro.network.send('playerMouseMoved', self.newMouseState);

						for (let i = 0; i < self.newMouseState.length; i++) {
							self.lastMouseState[i] = self.newMouseState[i];
						}
					}
				}

				self.mouseMove(self.newMouseState[0], self.newMouseState[1], self.newMouseState[2], self.newMouseState[3]);

				self.sendMouseMovement = false;
			}
		}

		// unit rotation for human player. this runs on client-side only
		if (unit && !unit._stats.aiEnabled) {
			unit.updateAngleToTarget();
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = ControlComponent;
}
