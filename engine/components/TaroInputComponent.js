var TaroInputComponent = TaroEventingClass.extend({
	classId: 'TaroInputComponent',
	componentId: 'input',

	init: function () {
		// Setup the input objects to hold the current input state

		var self = this;
		this._eventQueue = [];
		this._eventControl = {
			_cancelled: false,
			stopPropagation: function () {
				this._cancelled = true;
			},
		};
		this.lastMousePosition = { x: undefined, y: undefined };
		this.lastEvent = undefined;
		this.tick();

		this.mouse = {
			// Virtual codes
			dblClick: -302,
			down: -301,
			up: -300,
			move: -259,
			wheel: -258,
			wheelUp: -257,
			wheelDown: -256,
			x: -255,
			y: -254,
			button1: -253,
			button2: -252,
			button3: -251,
		};

		this.pad1 = {
			// Virtual codes
			button1: -250,
			button2: -249,
			button3: -248,
			button4: -247,
			button5: -246,
			button6: -245,
			button7: -244,
			button8: -243,
			button9: -242,
			button10: -241,
			button11: -240,
			button12: -239,
			button13: -238,
			button14: -237,
			button15: -236,
			button16: -235,
			button17: -234,
			button18: -233,
			button19: -232,
			button20: -231,
			stick1: -230,
			stick2: -229,
			stick1Up: -228,
			stick1Down: -227,
			stick1Left: -226,
			stick1Right: -225,
			stick2Up: -224,
			stick2Down: -223,
			stick2Left: -222,
			stick2Right: -221,
		};

		this.pad2 = {
			// Virtual codes
			button1: -220,
			button2: -219,
			button3: -218,
			button4: -217,
			button5: -216,
			button6: -215,
			button7: -214,
			button8: -213,
			button9: -212,
			button10: -211,
			button11: -210,
			button12: -209,
			button13: -208,
			button14: -207,
			button15: -206,
			button16: -205,
			button17: -204,
			button18: -203,
			button19: -202,
			button20: -201,
			stick1: -200,
			stick2: -199,
			stick1Up: -198,
			stick1Down: -197,
			stick1Left: -196,
			stick1Right: -195,
			stick2Up: -194,
			stick2Down: -193,
			stick2Left: -192,
			stick2Right: -191,
		};

		// Keycodes from http://www.asciitable.com/
		// and general console.log efforts :)
		this.key = {
			// Virtual codes
			shift: -3,
			ctrl: -2,
			alt: -1,
			// Read codes
			backspace: 8,
			tab: 9,
			enter: 13,
			escape: 27,
			space: 32,
			pageUp: 33,
			pageDown: 34,
			end: 35,
			home: 36,
			left: 37,
			up: 38,
			right: 39,
			down: 40,
			insert: 45,
			del: 46,
			0: 48,
			1: 49,
			2: 50,
			3: 51,
			4: 52,
			5: 53,
			6: 54,
			7: 55,
			8: 56,
			9: 57,
			a: 65,
			b: 66,
			c: 67,
			d: 68,
			e: 69,
			f: 70,
			g: 71,
			h: 72,
			i: 73,
			j: 74,
			k: 75,
			l: 76,
			m: 77,
			n: 78,
			o: 79,
			p: 80,
			q: 81,
			r: 82,
			s: 83,
			t: 84,
			u: 85,
			v: 86,
			w: 87,
			x: 88,
			y: 89,
			z: 90,
		};

		this._controlMap = [];
		this._state = [];
		this.lastMovedAt = 0;

		// Set default values for the mouse position
		this._state[this.mouse.x] = 0;
		this._state[this.mouse.y] = 0;

		// check if any key is currently down.
		// if (taro.isClient) {
		// 	setInterval(function () {

		// 	}, 100);
		// }

		this.editorWidgets = [];
	},
	processInputOnEveryFps: function () {
		var self = this;
		for (var i in self._state) {
			if (self._state[i]) {
				self._updateMouseData(self.lastEvent);
				break;
			}
		}
	},
	debug: function (val) {
		if (val !== undefined) {
			this._debug = val;
			return this;
		}

		return this._debug;
	},

	/**
	 * Sets up the event listeners on the main window and front
	 * buffer DOM objects.
	 * @private
	 */
	setupListeners: function (canvas) {
		this.log('Setting up input event listeners...');
		this._canvas = canvas;

		// Setup the event listeners
		var self = this;

		// Define event functions and keep references for later removal
		this._evRef = {
			mousedown: function (event) {
				event.taroType = 'mouse';
				self._rationalise(event, undefined, true);
				self._mouseDown(event);
			},
			mouseup: function (event) {
				event.taroType = 'mouse';
				self._rationalise(event);
				self._mouseUp(event);
			},
			mousemove: function (event) {
				event.taroType = 'mouse';
				self._rationalise(event);
				self._mouseMove(event);
			},
			mousewheel: function (event) {
				event.taroType = 'mouse';
				self._rationalise(event);
				self._mouseWheel(event);
			},

			touchmove: function (event) {
				event.taroType = 'touch';
				self._rationalise(event, true);
				self._mouseMove(event);
			},
			touchstart: function (event) {
				event.taroType = 'touch';
				self._rationalise(event, true);
				self._mouseDown(event);
			},
			touchend: function (event) {
				event.taroType = 'touch';
				self._rationalise(event, true);
				self._mouseUp(event);
			},

			contextmenu: function (event) {
				event.preventDefault();
				event.taroType = 'mouse';
				self._rationalise(event);
				self._contextMenu(event);
			},

			keydown: function (event) {
				event.taroType = 'key';
				self._rationalise(event);
				self._keyDown(event);
			},
			keyup: function (event) {
				event.taroType = 'key';
				self._rationalise(event);
				self._keyUp(event);
			},
		};

		// Listen for mouse events
		canvas.addEventListener('mousedown', this._evRef.mousedown, false);
		window.addEventListener('mouseup', this._evRef.mouseup, false);

		canvas.addEventListener('mousemove', this._evRef.mousemove, false);
		canvas.addEventListener('wheel', this._evRef.mousewheel, false);

		// Touch events
		canvas.addEventListener('touchmove', this._evRef.touchmove, false);
		canvas.addEventListener('touchstart', this._evRef.touchstart, false);
		canvas.addEventListener('touchend', this._evRef.touchend, false);

		// Kill the context menu on right-click, urgh!
		canvas.addEventListener('contextmenu', this._evRef.contextmenu, false);

		// Listen for keyboard events
		window.addEventListener('keydown', this._evRef.keydown, false);
		window.addEventListener('keyup', this._evRef.keyup, false);
	},

	destroyListeners: function () {
		this.log('Removing input event listeners...');

		// Remove the event listeners
		var canvas = this._canvas;

		// Listen for mouse events
		canvas.removeEventListener('mousedown', this._evRef.mousedown, false);
		canvas.removeEventListener('mouseup', this._evRef.mouseup, false);
		canvas.removeEventListener('mousemove', this._evRef.mousemove, false);
		canvas.removeEventListener('wheel', this._evRef.mousewheel, false);

		// Touch events
		canvas.removeEventListener('touchmove', this._evRef.touchmove, false);
		canvas.removeEventListener('touchstart', this._evRef.touchstart, false);
		canvas.removeEventListener('touchend', this._evRef.touchend, false);

		// Kill the context menu on right-click, urgh!
		canvas.removeEventListener('contextmenu', this._evRef.contextmenu, false);

		// Listen for keyboard events
		window.removeEventListener('keydown', this._evRef.keydown, false);
		window.removeEventListener('keyup', this._evRef.keyup, false);
	},

	/**
	 * Fires an input event that didn't occur on the main canvas, as if it had
	 * occurred on the main canvas, allowing you to pass through events like
	 * mousedown and mouseup that occurred elsewhere on the DOM but might be
	 * useful for the engine to be aware of, such as if you are dragging an entity
	 * and then the mouse goes off-canvas and the button is released.
	 * @param {String} eventName The lowercase name of the event to fire e.g. mousedown.
	 * @param {Object} eventObj The event object that was passed by the DOM.
	 */
	fireManualEvent: function (eventName, eventObj) {
		if (eventName && eventObj) {
			if (this._evRef[eventName]) {
				this._evRef[eventName](eventObj);
			} else {
				this.log(
					`Cannot fire manual event "${eventName}" because no listener exists in the engine for this event type!`,
					'warning'
				);
			}
		} else {
			this.log('Cannot fire manual event because both eventName and eventObj params are required.', 'warning');
		}
	},

	/**
	 * Sets taroX and taroY properties in the event object that
	 * can be relied on to provide the x, y co-ordinates of the
	 * mouse event including the canvas offset.
	 * @param {Event} event The event object.
	 * @param {Boolean} touch If the event was a touch event or
	 * not.
	 * @private
	 */
	_rationalise: function (event, touch, debug) {
		// Check if we want to prevent default behaviour
		if (event.taroType === 'key') {
			if (event.keyCode === 8) {
				// Backspace
				// Check if the event occurred on the body
				var elem = event.srcElement || event.target;

				if (elem.tagName.toLowerCase() === 'body') {
					// The event occurred on our body element so prevent
					// default behaviour. This allows other elements on
					// the page to retain focus such as text boxes etc
					// and allows them to behave normally.
					event.preventDefault();
				}
			}
		}

		if (event.taroType === 'touch') {
			event.preventDefault();
		}

		if (touch) {
			event.button = 0; // Emulate left mouse button

			// Handle touch changed
			if (event.changedTouches && event.changedTouches.length) {
				event.taroPageX = event.changedTouches[0].pageX;
				event.taroPageY = event.changedTouches[0].pageY;
			}
		} else {
			event.taroPageX = event.pageX;
			event.taroPageY = event.pageY;
		}

		event.taroX = event.taroPageX;
		event.taroY = event.taroPageY;

		this.emit('inputEvent', event);
	},

	/**
	 * Emits the "mouseDown" event.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		if (taro.developerMode && taro.developerMode.shouldPreventKeybindings()) {
			return;
		}
		if (this._debug) {
			console.log('Mouse Down', event);
		}
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.taroX - taro._bounds2d.x2;
		var my = event.taroY - taro._bounds2d.y2;
		var self = this;

		if (taro.developerMode) {
			let inside = false;

			if (this.editorWidgets.length === 0) {
				this.editorWidgets = Array.from(document.querySelectorAll('.game-editor-widget')).map((widget) =>
					widget.getBoundingClientRect()
				);
			}

			this.editorWidgets.forEach((widget) => {
				if (
					event.taroX >= widget.left &&
					event.taroX <= widget.right &&
					event.taroY >= widget.top &&
					event.taroY <= widget.bottom
				) {
					inside = true;
					return;
				}
			});

			if (inside) {
				return;
			}
		}

		if ($('#chat-message-input').css('display') === 'block') {
			$('#chat-message-input').css('display', 'none');
		}

		if (event.button === 0) {
			this._state[this.mouse.button1] = true;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = true;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = true;
		}

		this.mouseDown = event;

		if (!self.emit('preMouseDown', [event, mx, my, event.button + 1])) {
			this.queueEvent(this, function () {
				self.emit('mouseDown', [event, mx, my, event.button + 1]);
			});
		}
	},

	/**
	 * Emits the "mouseUp" event.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		if (this._debug) {
			console.log('Mouse Up', event);
		}
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.taroX - taro._bounds2d.x2;
		var my = event.taroY - taro._bounds2d.y2;
		var self = this;

		if (event.button === 0) {
			this._state[this.mouse.button1] = false;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = false;
		}

		if (event.button === 2) {
			this._state[this.mouse.button3] = false;
		}

		this.mouseUp = event;

		if (!self.emit('preMouseUp', [event, mx, my, event.button + 1])) {
			this.queueEvent(this, function () {
				self.emit('mouseUp', [event, mx, my, event.button + 1]);
			});
		}
	},

	_contextMenu: function (event) {
		if (this._debug) {
			console.log('Context Menu', event);
		}
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.taroX - taro._bounds2d.x2;
		var my = event.taroY - taro._bounds2d.y2;
		var self = this;

		if (event.button === 0) {
			this._state[this.mouse.button1] = false;
		}

		if (event.button === 1) {
			this._state[this.mouse.button2] = false;
		}

		// sure we're hiding the context menu when right-click is clicked, but why the hell are we setting button pressed as false again?!
		// if (event.button === 2) {
		// 	this._state[this.mouse.button3] = false;
		// }

		this.contextMenu = event;

		if (!self.emit('preContextMenu', [event, mx, my, event.button + 1])) {
			this.queueEvent(this, function () {
				self.emit('contextMenu', [event, mx, my, event.button + 1]);
			});
		}
	},

	/**
	 * Emits the "mouseMove" event.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		// Update the mouse position within the viewports
		taro._mouseOverVp = this._updateMouseData(event);
		// taro.client.mouseEvent = event;
		// var mx = event.taroX - taro._bounds2d.x2,
		// 	my = event.taroY - taro._bounds2d.y2,
		var self = this;

		// this._state[this.mouse.x] = mx;
		// this._state[this.mouse.y] = my;

		self.mouseMove = event;
		taro.client.mouseMove = event;

		if (!self.emit('preMouseMove', [event, event.taroX, event.taroY, event.button + 1])) {
			this.queueEvent(this, function () {
				self.emit('mouseMove', [event, event.taroX, event.taroY, event.button + 1]);
			});
		}
	},

	/**
	 * Emits the "mouseWheel" event.
	 * @param event
	 * @private
	 */
	_mouseWheel: function (event) {
		// Update the mouse position within the viewports
		this._updateMouseData(event);

		var mx = event.taroX - taro._bounds2d.x2;
		var my = event.taroY - taro._bounds2d.y2;
		var self = this;

		this._state[this.mouse.wheel] = event.wheelDelta;

		if (event.wheelDelta > 0) {
			this._state[this.mouse.wheelUp] = true;
		} else {
			this._state[this.mouse.wheelDown] = true;
		}

		this.mouseWheel = event;

		if (!self.emit('preMouseWheel', [event, mx, my, event.button + 1])) {
			this.queueEvent(this, function () {
				self.emit('mouseWheel', [event, mx, my, event.button + 1]);
			});
		}
	},
	shouldPreventChat: function () {
		if (!taro.isClient || !$('#game-editor').is(':visible')) {
			return false;
		}
		let activeElement = document.activeElement;
		let inputs = ['input', 'select', 'textarea'];

		// if chat is visible, don't prevent chat
		if (!($('#chat-message-input').css('display') === 'none')) {
			return false;
		}
		if (activeElement && inputs.indexOf(activeElement.tagName.toLowerCase()) !== -1) {
			return true;
		}
		return false;
	},
	/**
	 * Emits the "keyDown" event.
	 * @param event
	 * @private
	 */
	_keyDown: function (event) {
		var self = this;
		this._updateMouseData(event);
		if (!this.shouldPreventChat()) {
			this._chatHandler(event);
		}
		if (this._state[event.keyCode] == false) {
			// reset streamed target position & existing force when key is pressed
			if (taro.game.data.defaultData && taro.client.selectedUnit) {
				this.lastMovedAt = taro.currentTime();
			}
		}

		this._state[event.keyCode] = true;

		if (this._debug) {
			console.log('Key Down', event);
		}

		if (!self.emit('preKeyDown', [event, event.keyCode])) {
			this.queueEvent(this, function () {
				self.emit('keyDown', [event, event.keyCode]);
			});
		}
	},
	_chatHandler: function (e) {
		// CHAT IS NOW HANDLED BY EDITOR
		// THIS FUNCTION IS ONLY USED TO FOCUS THE CHAT INPUT
		// CAN BE REMOVED AS WELL
	},
	/**
	 * Emits the "keyUp" event.
	 * @param event
	 * @private
	 */
	_keyUp: function (event) {
		var self = this;

		this._updateMouseData(event);

		if (this._state[event.keyCode] == true) {
			// reset streamed target position & existing force when key is pressed
			if (taro.game.data.defaultData && taro.client.selectedUnit) {
				this.lastMovedAt = taro.currentTime();
			}
		}

		this._state[event.keyCode] = false;

		if (this._debug) {
			console.log('Key Up', event);
		}

		if (!self.emit('preKeyUp', [event, event.keyCode])) {
			this.queueEvent(this, function () {
				self.emit('keyUp', [event, event.keyCode]);
			});
		}
	},

	/**
	 * Loops the mounted viewports and updates their respective mouse
	 * co-ordinates so that mouse events can work out where on a viewport
	 * they occurred.
	 *
	 * @param event
	 * @return {*}
	 * @private
	 */
	_updateMouseData: function (event) {
		if (!event) return;
		this.lastEvent = event;
		// Loop the viewports and check if the mouse is inside
		var resolvedCoordinate = {};
		if (!isNaN(event.taroX) || !isNaN(event.taroY)) {
			this.lastMousePosition.x = event.taroX;
			this.lastMousePosition.y = event.taroY;
			resolvedCoordinate.x = event.taroX;
			resolvedCoordinate.y = event.taroY;
		} else {
			resolvedCoordinate.x = this.lastMousePosition.x;
			resolvedCoordinate.y = this.lastMousePosition.y;
		}

		var arr = taro._children;
		var arrCount = arr.length;
		var vp;
		var vpUpdated;

		// low resolution has half bound as compared to high quality bounds so multiply bound by 2
		if (taro.client.resolutionQuality == 'low') {
			var mx = resolvedCoordinate.x - taro._bounds2d.x2 * 2 - taro._translate.x;
			var my = resolvedCoordinate.y - taro._bounds2d.y2 * 2 - taro._translate.y;
		} else {
			var mx = resolvedCoordinate.x - taro._bounds2d.x2 - taro._translate.x;
			var my = resolvedCoordinate.y - taro._bounds2d.y2 - taro._translate.y;
		}

		taro._mouseAbsoluteTranslation = [event.clientX, event.clientY];
		taro._mousePos.x = mx;
		taro._mousePos.y = my;
		// while (arrCount--) {
		// 	vp = arr[arr.length - (arrCount + 1)];
		// 	// Check if the mouse is inside this viewport's bounds
		// 	// TODO: Update this code to take into account viewport rotation and camera rotation
		// 	if (taro.client.resolutionQuality != 'low' && mx > vp._translate.x - vp._bounds2d.x / 2 && mx < vp._translate.x + vp._bounds2d.x / 2) {
		// 		if (my > vp._translate.y - vp._bounds2d.y / 2 && my < vp._translate.y + vp._bounds2d.y / 2) {
		// 			// Mouse is inside this viewport
		// 			vp._mousePos = new TaroPoint3d(
		// 				Math.floor((mx - vp._translate.x) / vp.camera._scale.x + vp.camera._translate.x),
		// 				Math.floor((my - vp._translate.y) / vp.camera._scale.y + vp.camera._translate.y),
		// 				0
		// 			);
		// 			vpUpdated = vp;

		// 			// Record the viewport that this event occurred on in the
		// 			// event object
		// 			event.taroViewport = vp;
		// 			break;
		// 		}
		// 	} else if (vp.id() === 'vp1' && taro.client.resolutionQuality == 'low') {
		// 		vp._mousePos = new TaroPoint3d(
		// 			Math.floor((mx - vp._translate.x) / vp.camera._scale.x + vp.camera._translate.x),
		// 			Math.floor((my - vp._translate.y) / vp.camera._scale.y + vp.camera._translate.y),
		// 			0
		// 		);

		// 		vpUpdated = vp;

		// 		// Record the viewport that this event occurred on in the
		// 		// event object
		// 		event.taroViewport = vp;
		// 		break;
		// 	}
		// }

		return vpUpdated;
	},

	/**
	 * Defines an action that will be emitted when the specified event type
	 * occurs.
	 * @param actionName
	 * @param eventCode
	 */
	mapAction: function (actionName, eventCode) {
		this._controlMap[actionName] = eventCode;
	},

	/**
	 * Returns the passed action's input state value.
	 * @param actionName
	 */
	actionVal: function (actionName) {
		return this._state[this._controlMap[actionName]];
	},

	/**
	 * Set the passed action's input state value.
	 * @param actionName
	 */
	setActionVal: function (actionName, val) {
		this._state[this._controlMap[actionName]] = val;
	},

	/**
	 * Returns true if the passed action's input is pressed or it's state
	 * is not zero.
	 * @param actionName
	 */
	actionState: function (actionName) {
		var val = this._state[this._controlMap[actionName]];
		return !!val; // "Not not" to convert to boolean true/false
	},

	/**
	 * Returns an input's current value.
	 * @param actionName
	 * @return {*}
	 */
	val: function (inputId) {
		return this._state[inputId];
	},

	/**
	 * Returns an input's current state as a boolean.
	 * @param stateId
	 * @return {Boolean}
	 */
	state: function (inputId) {
		return !!this._state[inputId];
	},

	/**
	 * Stops further event propagation for this tick.
	 * @return {*}
	 */
	stopPropagation: function () {
		this._eventControl._cancelled = true;
		return this;
	},

	/**
	 * Adds an event method to the eventQueue array. The array is
	 * processed during each tick after the scenegraph has been
	 * rendered.
	 * @param context
	 * @param ev
	 */
	queueEvent: function (context, ev, data) {
		if (ev !== undefined) {
			this._eventQueue.push([context, ev, data]);
		}

		return this;
	},

	/**
	 * Release key by key string.
	 * @param key 'a', 'b', 'c' etc...
	 */
	releaseKey: function (key) {
		this.setActionVal(key, false);
	},

	/**
	 * Release mouse button by button string.
	 * @param button 'button1', 'button2' or 'button3"
	 */
	releaseMouseButton: function (button) {
		switch (button) {
			case 'button1':
				this.setActionVal(this.mouse.button1, false);
				break;
			case 'button2':
				this.setActionVal(this.mouse.button1, false);
				break;
			case 'button3':
				this.setActionVal(this.mouse.button1, false);
				break;
		}
	},

	/**
	 * Called by the engine after ALL other tick methods have processed.
	 * Call originates in TaroEngine.js. Allows us to reset any flags etc.
	 */
	tick: function () {
		// If we have an event queue, process it
		var arr = this._eventQueue;
		var arrCount = arr.length;
		var evc = this._eventControl;

		while (arrCount--) {
			arr[arrCount][1].apply(arr[arrCount][0], [evc, arr[arrCount][2]]);
			if (evc._cancelled) {
				// The last event queue method stopped propagation so cancel all further
				// event processing (the last event took control of the input)
				break;
			}
		}
		// Reset all the flags and variables for the next tick
		this._eventQueue = [];
		this._eventControl._cancelled = false;
		this.dblClick = false; // TODO: Add double-click event handling
		this.mouseMove = false;
		this.mouseDown = false;
		this.mouseUp = false;
		this.mouseWheel = false;
	},

	/**
	 * Emit an event by name. Overrides the TaroEventingClass emit method and
	 * checks for propagation stopped by calling taro.input.stopPropagation().
	 * @param {Object} eventName The name of the event to emit.
	 * @param {Object || Array} args The arguments to send to any listening methods.
	 * If you are sending multiple arguments, use an array containing each argument.
	 * @return {Number}
	 */
	emit: function (eventName, args) {
		if (this._eventListeners) {
			// Check if the event has any listeners
			if (this._eventListeners[eventName]) {
				// Fire the listeners for this event
				var eventCount = this._eventListeners[eventName].length;
				var eventCount2 = this._eventListeners[eventName].length - 1;
				var evc = this._eventControl;
				var finalArgs;
				var i;
				var cancelFlag;
				var eventIndex;
				var tempEvt;
				var retVal;

				// If there are some events, ensure that the args is ready to be used
				if (eventCount) {
					finalArgs = [];
					if (typeof args === 'object' && args !== null && args[0] !== null) {
						for (i in args) {
							if (args.hasOwnProperty(i)) {
								finalArgs[i] = args[i];
							}
						}
					} else {
						finalArgs = [args];
					}

					// Loop and emit!
					cancelFlag = false;

					this._eventListeners._processing = true;
					while (eventCount--) {
						if (evc._cancelled) {
							// The stopPropagation() method was called, cancel all other event calls
							break;
						}
						eventIndex = eventCount2 - eventCount;
						tempEvt = this._eventListeners[eventName][eventIndex];

						// If the sendEventName flag is set, overwrite the arguments with the event name
						if (tempEvt.sendEventName) {
							finalArgs = [eventName];
						}

						// Call the callback
						retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);

						// If the retVal === true then store the cancel flag and return to the emitting method
						if (retVal === true || evc._cancelled === true) {
							// The receiver method asked us to send a cancel request back to the emitter
							cancelFlag = true;
						}

						// Check if we should now cancel the event
						if (tempEvt.oneShot) {
							// The event has a oneShot flag so since we have fired the event,
							// lets cancel the listener now
							this.off(eventName, tempEvt);
						}
					}
					this._eventListeners._processing = false;

					// Now process any event removal
					this._processRemovals();

					if (cancelFlag) {
						return 1;
					}
				}
			}
		}
	},
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroInputComponent;
}
