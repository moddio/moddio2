var ControlComponent = IgeEntity.extend({
	classId: 'ControlComponent',
	componentId: 'control',

	init: function (entity, options) {
		// Store the entity that this component has been added to
		this._entity = entity;

		this.lastInputSent = 0;

		// Store any options that were passed to us
		this._options = options;
		this.lastActionAt = undefined;
		this.lastMousePosition = [undefined, undefined];
		this.mouseLocked = false;

		// this.lastCommandSentAt = undefined;
		this.isChatOpen = false;
		this.input = {
			mouse: {
				button1: false,
				button3: false,
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
				ige.input.mapAction(key, ige.input[device][key]);
			}
		}
	},

	keyDown: function (device, key) {
		// check for input modal is open
		if (ige.isClient) {
			this.isChatOpen = ($('#message').is(':focus') && !$('#player-input-field').is(':focus')) ||
				$('#modd-dialogue-modal').hasClass('show') ||
				$('#player-input-modal').hasClass('show') ||
				$('#modd-item-shop-modal').hasClass('show') ||
				$('#custom-modal').hasClass('show');
		}

		this.lastActionAt = Date.now();

		if (this.input[device]) {
			if ((ige.isClient && !this.isChatOpen) || ige.isServer) {
				this.input[device][key] = true;
			}
		}

		var player = ige.game.getPlayerByClientId(this._entity._stats.clientId);
		if (!player) {
			return;
		}

		var unit = player.getSelectedUnit();
		if (unit && unit._category == 'unit') {
			if (ige.isServer || (ige.isClient && !this.isChatOpen)) {
				var unitAbility = null;
				if (unit._stats.isStunned == undefined || unit._stats.isStunned != true) {
					if (unit._stats.controls) {
						if (unit._stats.controls.movementControlScheme == 'ad') {
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
						} else if (unit._stats.controls.movementControlScheme != 'followCursor') { // WASD movement is default
							switch (key) {
								case 'w':
								case 'up':
									unit.ability.moveUp();
									// ige.inputReceived = Date.now();
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
						}
					}

					switch (key) {
						case 'e':
							unit.ability.pickupItem();
							break;

						case 'g':
							unit.ability.dropItem();
							break;

						case 'i':
							if (ige.isClient && $('#open-inventory-button').css('display') !== 'none') {
								$('#open-inventory-button').click();
							}
							break;

						case 'button1':
							unit.ability.startUsingItem();
							break;
					}
				}

				if (!unitAbility && unit._stats.controls && unit._stats.controls.abilities) {
					unitAbility = unit._stats.controls.abilities[key];
				}

				if (unitAbility && unitAbility.keyDown && unit.ability) {
					if (ige.client && ige.client.inputDelay && ige.client.inputDelay > 0) {
						setTimeout(function () {
							unit.ability.cast(unitAbility.keyDown);
						}, ige.client.inputDelay);
					} else {
						// console.log(key, Date.now());
						unit.ability.cast(unitAbility.keyDown);
					}
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
		// }

		if (ige.isClient) {
			if (!this.isChatOpen) {
				ige.network.send('playerKeyDown', { device: device, key: key });

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

		var player = ige.game.getPlayerByClientId(this._entity._stats.clientId);
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
			if (ige.isServer || ige.isClient) {
				var unitAbility = null;

				// if (unit._stats.abilities) {
				// 	unitAbility = unit._stats.abilities[key]
				// }

				if (!unitAbility && unit._stats.controls && unit._stats.controls.abilities) {
					unitAbility = unit._stats.controls.abilities[key];
				}

				if (unitAbility && unitAbility.keyUp && unit.ability) {
					if (ige.client && ige.client.inputDelay && ige.client.inputDelay > 0) {
						setTimeout(function () {
							unit.ability.cast(unitAbility.keyUp);
						}, ige.client.inputDelay);
					} else {
						unit.ability.cast(unitAbility.keyUp);
					}
				}
			}
		}

		if (ige.isClient) {
			if (this.input[device][key]) {
				ige.network.send('playerKeyUp', { device: device, key: key });
			}
		}

		if (this.input[device])
			this.input[device][key] = false;
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the
	 * scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	_behaviour: function (ctx) {
		var self = this;

		if (ige.isClient) {
			for (device in self.input) {
				for (key in self.input[device]) {
					if (ige.input.actionState(key)) {
						if (self.input[device][key] == false) {
							if (ige.isMobile && device == 'mouse') {
								// block
							} else {
								self.keyDown(device, key);
							}
						}
					} else {
						if (self.input[device][key] == true) {
							if (ige.isMobile && device == 'mouse') {
								// block
							} else {
								self.keyUp(device, key);
							}
						}
					}
				}
			}

			// check if sending player input is due (every 100ms)
			if (ige._currentTime - self.lastInputSent > 100) {
				self.sendPlayerInput = true;
				self.lastInputSent = ige._currentTime;
			}

			if (self.newMousePosition && (self.newMousePosition[0] != self.lastMousePosition[0] || self.newMousePosition[1] != self.lastMousePosition[1])) {
				// if we are using mobile controls don't send mouse moves to server here as we will do so from a look touch stick
				if (!ige.isMobile) {
					// absolute mouse position wrt window
					if (ige._mouseAbsoluteTranslation && ige._mouseAbsoluteTranslation[0] && ige._mouseAbsoluteTranslation[1]) {
						var centerOfScreen = {};
						centerOfScreen.innerWidth = window.innerWidth / 2;
						centerOfScreen.innerHeight = window.innerHeight / 2;
						var angle = 0;
						if (centerOfScreen && ige._mouseAbsoluteTranslation[0] != centerOfScreen.innerWidth && centerOfScreen.innerHeight != ige._mouseAbsoluteTranslation[1]) {
							angle = Math.atan2(ige._mouseAbsoluteTranslation[0] - centerOfScreen.innerWidth, centerOfScreen.innerHeight - ige._mouseAbsoluteTranslation[1]);
						}
						// angle = angle % Math.PI;
						angle = parseFloat(angle.toPrecision(5));
						if (self.sendPlayerInput)
							ige.network.send('playerAbsoluteAngle', angle);

						if (ige.client.myPlayer) {
							ige.client.myPlayer.absoluteAngle = angle;
						}
						self.absoluteAngle = angle;
					}
					if (ige.client && ige.client.myPlayer) {
						ige.client.myPlayer.control.input.mouse.x = self.newMousePosition[0];
						ige.client.myPlayer.control.input.mouse.y = self.newMousePosition[1];
					}
					if (self.sendPlayerInput)
						ige.network.send('playerMouseMoved', self.newMousePosition);
				}
				self.lastMousePosition = self.newMousePosition;
			}

			// unit move
			var unit = ige.client.selectedUnit;
			if (ige.physics && ige.game.cspEnabled && unit) {
				var x = unit._translate.x.toFixed(0);
				var y = unit._translate.y.toFixed(0);
				if (self.sendPlayerInput || self.lastPositionSent == undefined || self.lastPositionSent[0] != x || self.lastPositionSent[1] != y) {
					var pos = [x, y];
					ige.network.send('playerUnitMoved', pos);
					// console.log(x, y)
					self.lastPositionSent = pos;
				}
			}

			self.sendPlayerInput = false;
		}
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = ControlComponent;
}
