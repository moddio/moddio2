/**
 * The base engine class definition.
 */
var IgeEngine = IgeEntity.extend({
	classId: 'IgeEngine',

	init: function (options) {
		// Deal with some debug settings first
		IgeEngine.prototype.log('initializing IGE engine');
		if (igeConfig.debug) {
			if (!igeConfig.debug._enabled) {
				// Debug is not enabled so ensure that
				// timing debugs are disabled
				igeConfig.debug._timing = false;
			}
		}

		this._alwaysInView = true;

		this._id = 'ige';
		this.basePath = '';
		// Determine the environment we are executing in
		this.isServer = (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined');
		this.isClient = !this.isServer;

		this.isMobile = this.isClient && (function () {  // cache value
			// https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
			var isMobile = {
				Android: function () {
					return navigator.userAgent.match(/Android/i);
				},
				BlackBerry: function () {
					return navigator.userAgent.match(/BlackBerry/i);
				},
				iOS: function () {
					return navigator.userAgent.match(/iPhone|iPad|iPod/i);
				},
				Opera: function () {
					return navigator.userAgent.match(/Opera Mini/i);
				},
				Windows: function () {
					return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
				},
				any: function () {
					return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
				}
			};
			return isMobile.any() != null;
		})();

		this.banIpsList = [];

		// Assign ourselves to the global variable
		ige = this;

		IgeEntity.prototype.init.call(this);

		// Check if we are running client-side
		if (this.isClient) {
			// Enable cocoonJS support because we are running client-side
			this.addComponent(IgeCocoonJsComponent);
		}

		// Create storage
		this._textureStore = [];

		// Set the initial id as the current time in milliseconds. This ensures that under successive
		// restarts of the engine, new ids will still always be created compared to earlier runs -
		// which is important when storing persistent data with ids etc
		this._idCounter = new Date().getTime();

		// use small numbers on the serverside for ids
		if (this.isServer) {
			// this._idCounter = 0
			this.sanitizer = require('sanitizer').sanitize;
			this.emptyTimeLimit = 10 * 60 * 1000; // in ms - kill t1/t2 if empty for 10 mins
			this.lastCheckedAt = Date.now();
		}

		// Setup components
		this.addComponent(IgeInputComponent);
		this.addComponent(IgeTweenComponent);
		this.addComponent(IgeTimeComponent);

		if (this.isClient) {
			// Enable UI element (virtual DOM) support
			this.addComponent(IgeUiManagerComponent);
			this.delayedStreamCount = 0;
		}

		// Set some defaults
		this._renderModes = [
			'2d',
			'three'
		];

		this._requireScriptTotal = 0;
		this._requireScriptLoading = 0;
		this._loadingPreText = undefined; // The text to put in front of the loading percent on the loading progress screen
		this._enableUpdates = true;
		this._enableRenders = true;
		this._debugEvents = {}; // Holds debug event booleans for named events
		this._renderContext = ige.isServer ? '2d' : 'webgl2'; // The rendering context, default is 2d
		this._renderMode = this._renderModes[this._renderContext]; // Integer representation of the render context
		this._tickTime = 'NA'; // The time the tick took to process
		this._updateTime = 'NA'; // The time the tick update section took to process

		this._tickDelta = 0; // The time between the last tick and the current one
		this._lastTimeStamp = new Date().getTime();

		this._fpsRate = 60; // Sets the frames per second to execute engine tick's at
		this._physicsTickRate = 20; // phyiscs tick rate
		this._gameLoopTickRate = 20; // "frameTick", input, and streaming

		this._lastPhysicsTickAt = 0;
		this._lastGameLoopTickAt = 0;
		this._physicsTickRemainder = 0;
		this._gameLoopTickRemainder = 0;
		this.gameLoopTickHasExecuted = true;
		this.physicsTickHasExecuted = true;

		this._aSecondAgo = 0;

		this._state = 0; // Currently stopped
		this._textureImageStore = {};
		this._texturesLoading = 0; // Holds a count of currently loading textures
		this._texturesTotal = 0; // Holds total number of textures loading / loaded
		this._dependencyQueue = []; // Holds an array of functions that must all return true for the engine to start
		this._drawCount = 0; // Holds the number of draws since the last frame (calls to drawImage)
		this._dps = 0; // Number of draws that occurred last tick
		this._dpf = 0;
		this._frames = 0; // Number of frames looped through since last second tick
		this._fps = 0; // Number of frames per second
		this._frameAlternator = false; // Is set to the boolean not of itself each frame
		this._viewportDepth = false;
		this._mousePos = new IgePoint3d(0, 0, 0);
		this._currentViewport = null; // Set in IgeViewport.js tick(), holds the current rendering viewport
		this._currentCamera = null; // Set in IgeViewport.js tick(), holds the current rendering viewport's camera
		this._currentTime = Date.now(); // The current engine time
		this._globalSmoothing = false; // Determines the default smoothing setting for new textures
		this._register = {
			ige: this
		}; // Holds a reference to every item in the scenegraph by it's ID
		this._categoryRegister = {}; // Holds reference to every item with a category
		this._groupRegister = {}; // Holds reference to every item with a group
		this._timeSpentInUpdate = {}; // An object holding time-spent-in-update (total time spent in this object's update method)
		this._timeSpentLastUpdate = {}; // An object holding time-spent-last-update (time spent in this object's update method last tick)
		this._timeSpentInTick = {}; // An object holding time-spent-in-tick (total time spent in this object's tick method)
		this._timeSpentLastTick = {}; // An object holding time-spent-last-tick (time spent in this object's tick method last tick)
		this._timeScale = 1; // The default time scaling factor to speed up or slow down engine time
		this._globalScale = new IgePoint3d(1, 1, 1);
		this._graphInstances = []; // Holds an array of instances of graph classes
		this._spawnQueue = []; // Holds an array of entities that are yet to be born
		this._cullCounter = 0;

		// Set the context to a dummy context to start
		// with in case we are in "headless" mode and
		// a replacement context never gets assigned
		this._ctx = IgeDummyContext;
		this.dependencyTimeout(30000); // Wait 30 seconds to load all dependencies then timeout

		// Start a timer to record every second of execution
		setInterval(this._secondTick, 1000);

		this.snapshots = [];
		this.entityCreateSnapshot = {};
		this.prevSnapshot = undefined;
		this.tempSnapshot = [0, {}];
		this.nextSnapshot = [0, {}];
		this.renderTime = 0;
		this.timeDiscrepancy = 0; // engine timestamp discrepancy between client-side & sever-side

		this.remainderFromLastStep = 0;

		this.lagOccurenceCount = 0;
		this.lastLagOccurenceAt = 0;
	},

	getLifeSpan: function () {
		var maxLifeSpan = 6 * 60 * 60 * 1000;
		var lifeSpan = ige.server.lifeSpan;

		if (lifeSpan > maxLifeSpan) {
			lifeSpan = maxLifeSpan;
		}

		return lifeSpan;
	},

	getIdleTimeoutMs: function () {
		var defaultValue = 10; // kill t1/t2 if empty for 10 mins
		var idleTimeoutHours = ige.server.tier == '0' ? ige.game.data.defaultData.privateServerIdleTimeout : 0;
		var timeoutMins = idleTimeoutHours ? idleTimeoutHours * 60 : defaultValue;

		return timeoutMins * 60 * 1000;
	},

	/**
	 * Returns an object from the engine's object register by
	 * the object's id. If the item passed is not a string id
	 * then the item is returned as is. If no item is passed
	 * the engine itself is returned.
	 * @param {String || Object} item The id of the item to return,
	 * or if an object, returns the object as-is.
	 */
	$: function (item) {
		if (typeof (item) === 'number' && !isNaN(item)) {
			item = item.toString();
		}

		if (typeof (item) === 'string') {
			return this._register[item];
		} else if (typeof (item) === 'object') {
			return item;
		}

		return undefined;
		// return this;
	},

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed category name.
	 * @param {String} categoryName The name of the category to return
	 * all objects for.
	 */
	$$: function (categoryName) {
		var returnArray = this._categoryRegister[categoryName] || new IgeArray();

		return returnArray.filter(({ _isBeingRemoved }) => {
			return _isBeingRemoved != true;
		});
	},

	/**
	 * Returns an array of all objects that have been assigned
	 * the passed group name.
	 * @param {String} groupName The name of the group to return
	 * all objects for.
	 */
	$$$: function (groupName) {
		return this._groupRegister[groupName] || new IgeArray();
	},

	/**
	 * Register an object with the engine object register. The
	 * register allows you to access an object by it's id with
	 * a call to ige.$(objectId).
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	register: function (obj) {
		if (obj !== undefined) {
			if (!this._register[obj.id()]) {
				this._register[obj.id()] = obj;
				obj._registered = true;

				return this;
			} else {
				obj._registered = false;

				IgeEngine.prototype.log(`Cannot add object id "${obj.id()}" to scenegraph because there is already another object in the graph with the same ID!`, 'error');
				return false;
			}
		}

		return this._register;
	},

	/**
	 * Un-register an object with the engine object register. The
	 * object will no longer be accessible via ige.$().
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	unRegister: function (obj) {
		if (obj !== undefined) {
			// Check if the object is registered in the ID lookup
			if (this._register[obj.id()]) {
				delete this._register[obj.id()];
				obj._registered = false;
			}
		}

		return this;
	},

	/**
	 * Register an object with the engine category register. The
	 * register allows you to access an object by it's category with
	 * a call to ige.$$(categoryName).
	 * @param {Object} obj The object to register.
	 * @return {*}
	 */
	categoryRegister: function (obj) {
		if (obj !== undefined) {
			this._categoryRegister[obj._category] = this._categoryRegister[obj._category] || new IgeArray();
			this._categoryRegister[obj._category].push(obj);
			obj._categoryRegistered = true;
		}

		return this._register;
	},

	/**
	 * Un-register an object with the engine category register. The
	 * object will no longer be accessible via ige.$$().
	 * @param {Object} obj The object to un-register.
	 * @return {*}
	 */
	categoryUnRegister: function (obj) {
		if (obj !== undefined) {
			if (this._categoryRegister[obj._category]) {
				this._categoryRegister[obj._category].pull(obj);
				obj._categoryRegistered = false;
			}
		}

		return this;
	},

	/**
	 * Register an object with the engine group register. The
	 * register allows you to access an object by it's groups with
	 * a call to ige.$$$(groupName).
	 * @param {Object} obj The object to register.
	 * @param {String} groupName The name of the group to register
	 * the object in.
	 * @return {*}
	 */
	groupRegister: function (obj, groupName) {
		if (obj !== undefined) {
			this._groupRegister[groupName] = this._groupRegister[groupName] || new IgeArray();
			this._groupRegister[groupName].push(obj);
			obj._groupRegistered = true;
		}

		return this._register;
	},

	/**
	 * Un-register an object with the engine group register. The
	 * object will no longer be accessible via ige.$$$().
	 * @param {Object} obj The object to un-register.
	 * @param {String} groupName The name of the group to un-register
	 * the object from.
	 * @return {*}
	 */
	groupUnRegister: function (obj, groupName) {
		if (obj !== undefined) {
			if (groupName !== undefined) {
				if (this._groupRegister[groupName]) {
					this._groupRegister[groupName].pull(obj);

					if (!obj.groupCount()) {
						obj._groupRegister = false;
					}
				}
			} else {
				// Call the removeAllGroups() method which will loop
				// all the groups that the object belongs to and
				// automatically un-register them
				obj.removeAllGroups();
			}
		}

		return this;
	},

	sync: function (method, attrArr) {
		if (typeof (attrArr) === 'string') {
			attrArr = [attrArr];
		}

		this._syncArr = this._syncArr || [];
		this._syncArr.push({ method: method, attrArr: attrArr });

		if (this._syncArr.length === 1) {
			// Start sync waterfall
			this._syncIndex = 0;
			this._processSync();
		}
	},

	_processSync: function () {
		var syncEntry;

		if (ige._syncIndex < ige._syncArr.length) {
			syncEntry = ige._syncArr[ige._syncIndex];

			// Add the callback to the last attribute
			syncEntry.attrArr.push(function () {
				ige._syncIndex++;
				setTimeout(ige._processSync, 1);
			});

			// Call the method
			syncEntry.method.apply(ige, syncEntry.attrArr);
		} else {
			// Reached end of sync cycle
			delete ige._syncArr;
			delete ige._syncIndex;

			ige.emit('syncComplete');
		}
	},

	/**
	 * Load a js script file into memory via a path or url.
	 * @param {String} url The file's path or url.
	 * @param {Function=} callback Optional callback when script loads.
	 */
	requireScript: function (url, callback) {
		if (url !== undefined) {
			var self = this;

			// Add to the load counter
			self._requireScriptTotal++;
			self._requireScriptLoading++;

			// Create the script element
			var elem = document.createElement('script');
			elem.addEventListener('load', function () {
				self._requireScriptLoaded(this);

				if (callback) {
					setTimeout(function () {
						callback();
					}, 100);
				}
			});

			// For compatibility with CocoonJS
			document.body.appendChild(elem);

			// Set the source to load the url
			elem.src = url;

			IgeEngine.prototype.log(`Loading script from: ${url}`);
			this.emit('requireScriptLoading', url);
		}
	},

	/**
	 * Called when a js script has been loaded via the requireScript
	 * method.
	 * @param {Element} elem The script element added to the DOM.
	 * @private
	 */
	_requireScriptLoaded: function (elem) {
		this._requireScriptLoading--;

		this.emit('requireScriptLoaded', elem.src);

		if (this._requireScriptLoading === 0) {
			// All scripts have loaded, fire the engine event
			this.emit('allRequireScriptsLoaded');
		}
	},

	/**
	 * Load a css style file into memory via a path or url.
	 * @param {String} url The file's path or url.
	 */
	requireStylesheet: function (url) {
		if (url !== undefined) {
			var self = this;

			// Load the engine stylesheet
			var css = document.createElement('link');
			css.rel = 'stylesheet';
			css.type = 'text/css';
			css.media = 'all';
			css.href = url;

			document.getElementsByTagName('head')[0].appendChild(css);

			IgeEngine.prototype.log(`Load css stylesheet from: ${url}`);
		}
	},

	/**
	 * Adds a scenegraph class into memory.
	 * @param {String} className The name of the scenegraph class.
	 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
	 * @returns {*}
	 */
	addGraph: function (className, options) {
		if (className !== undefined) {
			var classObj = this.getClass(className);
			var classInstance;

			if (classObj) {
				IgeEngine.prototype.log(`Loading SceneGraph data class: ${className}`);
				classInstance = this.newClassInstance(className);

				// Make sure the graph class implements the required methods "addGraph" and "removeGraph"
				if (typeof (classInstance.addGraph) === 'function' && typeof (classInstance.removeGraph) === 'function') {
					// Call the class's graph() method passing the options in
					classInstance.addGraph(options);

					// Add the graph instance to the holding array
					this._graphInstances[className] = classInstance;
				} else {
					IgeEngine.prototype.log(`Could not load graph for class name "${className}" because the class does not implement both the require methods "addGraph()" and "removeGraph()".`, 'error');
				}
			} else {
				IgeEngine.prototype.log(`Cannot load graph for class name "${className}" because the class could not be found. Have you included it in your server/clientConfig.js file?`, 'error');
			}
		}

		return this;
	},

	/**
	 * Removes a scenegraph class into memory.
	 * @param {String} className The name of the scenegraph class.
	 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
	 * @returns {*}
	 */
	removeGraph: function (className, options) {
		if (className !== undefined) {
			var classInstance = this._graphInstances[className];

			if (classInstance) {
				IgeEngine.prototype.log(`Removing SceneGraph data class: ${className}`);

				// Call the class's graph() method passing the options in
				classInstance.removeGraph(options);

				// Now remove the graph instance from the graph instance array
				delete this._graphInstances[className];
			} else {
				IgeEngine.prototype.log(`Cannot remove graph for class name "${className}" because the class instance could not be found. Did you add it via ige.addGraph() ?`, 'error');
			}
		}

		return this;
	},

	/**
	 * Allows the update() methods of the entire scenegraph to
	 * be temporarily enabled or disabled. Useful for debugging.
	 * @param {Boolean=} val If false, will disable all update() calls.
	 * @returns {*}
	 */
	enableUpdates: function (val) {
		if (val !== undefined) {
			this._enableUpdates = val;
			return this;
		}

		return this._enableUpdates;
	},

	/**
	 * Allows the tick() methods of the entire scenegraph to
	 * be temporarily enabled or disabled. Useful for debugging.
	 * @param {Boolean=} val If false, will disable all tick() calls.
	 * @returns {*}
	 */
	enableRenders: function (val) {
		if (val !== undefined) {
			this._enableRenders = val;
			return this;
		}

		return this._enableRenders;
	},

	/**
	 * Enables or disables the engine's debug mode. Enabled by default.
	 * @param {Boolean=} val If true, will enable debug mode.
	 * @returns {*}
	 */
	debugEnabled: function (val) {
		if (val !== undefined) {
			if (igeConfig.debug) {
				igeConfig.debug._enabled = val;
			}
			return this;
		}

		return igeConfig.debug._enabled;
	},

	/**
	 * Enables or disables the engine's debug timing system. The
	 * timing system will time all update and rendering code down
	 * the scenegraph and is useful for tracking long-running code
	 * but comes with a small performance penalty when enabled.
	 * Enabled by default.
	 * @param {Boolean=} val If true, will enable debug timing mode.
	 * @returns {*}
	 */
	debugTiming: function (val) {
		if (val !== undefined) {
			if (igeConfig.debug) {
				igeConfig.debug._timing = val;
			}
			return this;
		}

		return igeConfig.debug._timing;
	},

	debug: function (eventName) {
		if (this._debugEvents[eventName] === true || this._debugEvents[eventName] === ige._frames) {
			debugger;
		}
	},

	debugEventOn: function (eventName) {
		this._debugEvents[eventName] = true;
	},

	debugEventOff: function (eventName) {
		this._debugEvents[eventName] = false;
	},

	triggerDebugEventFrame: function (eventName) {
		this._debugEvents[eventName] = ige._frames;
	},

	/**
	 * Sets the opacity of every object on the scenegraph to
	 * zero *except* the one specified by the given id argument.
	 * @param {String} id The id of the object not to hide.
	 */
	hideAllExcept: function (id) {
		var i;
		var arr = this._register;

		for (i in arr) {
			if (i !== id) {
				arr[i].opacity(0);
			}
		}
	},

	/**
	 * Calls the show() method for every object on the scenegraph.
	 */
	showAll: function () {
		var i;
		var arr = this._register;

		for (i in arr) {
			arr[i].show();
		}
	},

	/**
	 * Sets the frame rate at which new engine steps are fired.
	 * Setting this rate will override the default requestAnimFrame()
	 * method as defined in IgeBase.js and on the client-side, will
	 * stop usage of any available requestAnimationFrame() method
	 * and will use a setTimeout()-based version instead.
	 * @param {Number} fpsRate
	 */
	setFps: function (fpsRate) {
		var self = this;
		this._fpsRate = fpsRate;
		fpsRate = 60;
		console.log('Tick rate at ', fpsRate);

		if (fpsRate !== undefined) {
			// Override the default requestAnimFrame handler and set
			// our own method up so that we can control the frame rate
			if (this.isServer) {
				// Server-side implementation
				requestAnimFrame = function (callback, element) {
					setTimeout(function () {
						callback(new Date().getTime());
					}, 1000 / fpsRate);
				};
			} else {
				// Client-side implementation
				window.requestAnimFrame = function (callback, element) {
					if (typeof mode === 'string' && mode === 'sandbox') {
						fpsRate = 20;
					}
					setTimeout(function () {
						callback(new Date().getTime());
					}, 1000 / fpsRate); // client will always run at 60 fps.
				};
			}
		}
	},

	showStats: function () {
		IgeEngine.prototype.log('showStats has been removed from the ige in favour of the new editor component, please remove this call from your code.');
	},

	/**
	 * Defines a class in the engine's class repository.
	 * @param {String} id The unique class ID or name.
	 * @param {Object} obj The class definition.
	 */
	defineClass: function (id, obj) {
		igeClassStore[id] = obj;
	},

	/**
	 * Retrieves a class by it's ID that was defined with
	 * a call to defineClass().
	 * @param {String} id The ID of the class to retrieve.
	 * @return {Object} The class definition.
	 */
	getClass: function (id) {
		return igeClassStore[id];
	},

	/**
	 * Returns true if the class specified has been defined.
	 * @param {String} id The ID of the class to check for.
	 * @returns {*}
	 */
	classDefined: function (id) {
		return Boolean(igeClassStore[id]);
	},

	/**
	 * Generates a new instance of a class defined with a call
	 * to the defineClass() method. Passes the options
	 * parameter to the new class during it's constructor call.
	 * @param id
	 * @param options
	 * @return {*}
	 */
	newClassInstance: function (id, options) {
		return new igeClassStore[id](options);
	},

	/**
	 * Checks if all engine start dependencies have been satisfied.
	 * @return {Boolean}
	 */
	dependencyCheck: function () {
		var arr = this._dependencyQueue;
		var arrCount = arr.length;

		while (arrCount--) {
			if (!this._dependencyQueue[arrCount]()) {
				return false;
			}
		}

		return true;
	},

	/**
	 * Gets / sets the flag that determines if viewports should be sorted by depth
	 * like regular entities, before they are processed for rendering each frame.
	 * Depth-sorting viewports increases processing requirements so if you do not
	 * need to stack viewports in a particular order, keep this flag false.
	 * @param {Boolean} val
	 * @return {Boolean}
	 */
	viewportDepth: function (val) {
		if (val !== undefined) {
			this._viewportDepth = val;
			return this;
		}

		return this._viewportDepth;
	},

	/**
	 * Sets the number of milliseconds before the engine gives up waiting for dependencies
	 * to be satisfied and cancels the startup procedure.
	 * @param val
	 */
	dependencyTimeout: function (val) {
		this._dependencyCheckTimeout = val;
	},

	/**
	 * Updates the loading screen DOM elements to show the update progress.
	 */
	updateProgress: function () {
		// Check for a loading progress bar DOM element
		if (typeof (document) !== 'undefined' && document.getElementById) {
			var elem = document.getElementById('loadingProgressBar');
			var textElem = document.getElementById('loadingText');

			if (elem) {
				// Calculate the width from progress
				var totalWidth = parseInt(elem.parentNode.offsetWidth);
				var currentWidth = Math.floor((totalWidth / this._texturesTotal) * (this._texturesTotal - this._texturesLoading));

				// Set the current bar width
				elem.style.width = `${currentWidth}px`;

				if (textElem) {
					if (this._loadingPreText === undefined) {
						// Fill the text to use
						this._loadingPreText = textElem.innerHTML;
					}
					textElem.innerHTML = `${this._loadingPreText} ${Math.floor((100 / this._texturesTotal) * (this._texturesTotal - this._texturesLoading))}%`;
				}
			}
		}
	},

	/**
	 * Adds one to the number of textures currently loading.
	 */
	textureLoadStart: function (url, textureObj) {
		this._texturesLoading++;
		this._texturesTotal++;

		this.updateProgress();

		this.emit('textureLoadStart', textureObj);
	},

	/**
	 * Subtracts one from the number of textures currently loading and if no more need
	 * to load, it will also call the _allTexturesLoaded() method.
	 */
	textureLoadEnd: function (url, textureObj) {
		var self = this;

		if (!textureObj._destroyed) {
			// Add the texture to the _textureStore array
			this._textureStore.push(textureObj);
		}

		// Decrement the overall loading number
		this._texturesLoading--;
		console.log('texture load remaining', this._texturesLoading);
		this.updateProgress();

		this.emit('textureLoadEnd', textureObj);

		// If we've finished...
		if (this._texturesLoading === 0) {
			// All textures have finished loading
			this.updateProgress();

			setTimeout(function () {
				console.log('all textures loaded (why is this being called twice?)');
				self._allTexturesLoaded();
			}, 100);
		}
	},

	/**
	 * Returns a texture from the texture store by it's url.
	 * @param {String} url
	 * @return {IgeTexture}
	 */
	textureFromUrl: function (url) {
		var arr = this._textureStore;
		var arrCount = arr.length;
		var item;

		while (arrCount--) {
			item = arr[arrCount];
			if (item._url === url) {
				return item;
			}
		}
	},

	/**
	 * Checks if all textures have finished loading and returns true if so.
	 * @return {Boolean}
	 */
	texturesLoaded: function () {
		return ige._texturesLoading === 0;
	},

	/**
	 * Emits the "texturesLoaded" event.
	 * @private
	 */
	_allTexturesLoaded: function () {
		if (!this._loggedATL) {
			this._loggedATL = true;
			IgeEngine.prototype.log('All textures have loaded');
		}

		// Fire off an event about this
		this.emit('texturesLoaded');
	},

	/**
	 * Gets / sets the default smoothing value for all new
	 * IgeTexture class instances. If set to true, all newly
	 * created textures will have smoothing enabled by default.
	 * @param val
	 * @return {*}
	 */
	globalSmoothing: function (val) {
		if (val !== undefined) {
			this._globalSmoothing = val;
			return this;
		}

		return this._globalSmoothing;
	},

	/**
	 * Generates a new unique ID
	 * @return {String}
	 */
	newId: function () {
		this._idCounter++;
		return String(this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17)));
	},

	/**
	 * Generates a new 8-character hexadecimal unique ID
	 * @return {String}
	 */
	newIdHex: function () {
		this._idCounter++;
		// return 'e' + this._idCounter;
		return (this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17))).toString(16).slice(0, 8);
	},

	/**
	 * Generates a new 16-character hexadecimal ID based on
	 * the passed string. Will always generate the same ID
	 * for the same string.
	 * @param {String} str A string to generate the ID from.
	 * @return {String}
	 */
	newIdFromString: function (str) {
		if (str !== undefined) {
			var id;
			var val = 0;
			var count = str.length;
			var i;

			for (i = 0; i < count; i++) {
				val += str.charCodeAt(i) * Math.pow(10, 17);
			}

			id = (val).toString(16);

			// Check if the ID is already in use
			while (ige.$(id)) {
				val += Math.pow(10, 17);
				id = (val).toString(16);
			}

			return id;
		}
	},

	/**
	 * Starts the engine.
	 * @param callback
	 */
	start: function (callback) {
		if (!ige._state) {
			// Check if we are able to start based upon any registered dependencies
			if (ige.dependencyCheck()) {
				// Start the engine
				IgeEngine.prototype.log('Starting engine...');
				ige._state = 1;

				// Check if we have a DOM, that there is an igeLoading element
				// and if so, remove it from the DOM now
				if (this.isClient) {
					if (document.getElementsByClassName && document.getElementsByClassName('igeLoading')) {
						var arr = document.getElementsByClassName('igeLoading');
						var arrCount = arr.length;

						while (arrCount--) {
							arr[arrCount].parentNode.removeChild(arr[arrCount]);
						}
					}
				}

				if (ige.isServer) {
					this.emptyTimeLimit = this.getIdleTimeoutMs();
					requestAnimFrame(ige.engineStep);
				}

				IgeEngine.prototype.log('Engine started');

				// Fire the callback method if there was one
				if (typeof (callback) === 'function') {
					callback(true);
				}
			} else {
				// Get the current timestamp
				var curTime = new Date().getTime();

				// Record when we first started checking for dependencies
				if (!ige._dependencyCheckStart) {
					ige._dependencyCheckStart = curTime;
				}

				// Check if we have timed out
				if (curTime - ige._dependencyCheckStart > this._dependencyCheckTimeout) {
					IgeEngine.prototype.log(`Engine start failed because the dependency check timed out after ${this._dependencyCheckTimeout / 1000} seconds`, 'error');
					if (typeof (callback) === 'function') {
						callback(false);
					}
				} else {
					// Start a timer to keep checking dependencies
					setTimeout(function () {
						ige.start(callback);
					}, 200);
				}
			}
		}
	},

	/**
	 * Stops the engine.
	 * @return {Boolean}
	 */
	stop: function () {
		// If we are running, stop the engine
		if (this._state) {
			console.trace();
			IgeEngine.prototype.log('Stopping engine...');
			this._state = 0;

			return true;
		} else {
			return false;
		}
	},

	/**
	 * Gets / sets the _autoSize property. If set to true, the engine will listen
	 * for any change in screen size and resize the front-buffer (canvas) element
	 * to match the new screen size.
	 * @param val
	 * @return {Boolean}
	 */
	autoSize: function (val) {
		if (val !== undefined) {
			this._autoSize = val;
			return this;
		}

		return this._autoSize;
	},

	pixelRatioScaling: function (val) {
		if (val !== undefined) {
			this._pixelRatioScaling = val;
			return this;
		}

		return this._pixelRatioScaling;
	},

	/**
	 * Gets / sets the rendering context that will be used when getting the
	 * context from canvas elements.
	 * @param {String=} contextId The context such as '2d'. Defaults to '2d'.
	 * @return {*}
	 */
	renderContext: function (contextId) {
		if (contextId !== undefined) {
			this._renderContext = contextId;
			this._renderMode = this._renderModes[contextId];

			IgeEngine.prototype.log(`Rendering mode set to: ${contextId}`);

			return this;
		}

		return this._renderContext;
	},

	/**
	 * Opens a new window to the specified url. When running in a
	 * native wrapper, will load the url in place of any existing
	 * page being displayed in the native web view.
	 * @param url
	 */
	openUrl: function (url) {
		if (url !== undefined) {
			if (ige.cocoonJs && ige.cocoonJs.detected) {
				// Open URL via CocoonJS webview
				ige.cocoonJs.openUrl(url);
			} else {
				// Open via standard JS open window
				window.open(url);
			}
		}
	},

	/**
	 * Loads the specified URL as an HTML overlay on top of the
	 * front buffer in an iFrame. If running in a native wrapper,
	 * will load the url in place of any existing page being
	 * displayed in the native web view.
	 *
	 * When the overlay is in use, no mouse or touch events will
	 * be fired on the front buffer. Once you are finished with the
	 * overlay, call hideOverlay() to re-enable interaction with
	 * the front buffer.
	 * @param {String=} url
	 */
	showWebView: function (url) {
		if (ige.cocoonJs && ige.cocoonJs.detected) {
			// Open URL via CocoonJS webview
			ige.cocoonJs.showWebView(url);
		} else {
			// Load the iFrame url
			var overlay = document.getElementById('igeOverlay');

			if (!overlay) {
				// No overlay was found, create one
				overlay = document.createElement('iframe');

				// Setup overlay styles
				overlay.id = 'igeOverlay';
				overlay.style.position = 'absolute';
				overlay.style.border = 'none';
				overlay.style.left = '0px';
				overlay.style.top = '0px';
				overlay.style.width = '100%';
				overlay.style.height = '100%';

				// Append overlay to body
				document.body.appendChild(overlay);
			}

			// If we have a url, set it now
			if (url !== undefined) {
				overlay.src = url;
			}

			// Show the overlay
			overlay.style.display = 'block';
		}

		return this;
	},

	/**
	 * Hides the web view overlay.
	 * @return {*}
	 */
	hideWebView: function () {
		if (ige.cocoonJs && ige.cocoonJs.detected) {
			// Hide the cocoonJS webview
			ige.cocoonJs.hideWebView();
		} else {
			var overlay = document.getElementById('igeOverlay');
			if (overlay) {
				overlay.style.display = 'none';
			}
		}

		return this;
	},

	/**
	 * Evaluates javascript sent from another frame.
	 * @param js
	 */
	layerCall: function (js) {
		if (js !== undefined) {
			eval(js);
		}
	},

	/**
	 * Returns the mouse position relative to the main front buffer. Mouse
	 * position is set by the ige.input component (IgeInputComponent)
	 * @return {IgePoint3d}
	 */
	mousePos: function () {
		return this._mousePos.clone();
	},

	/**
	 * Walks the scenegraph and returns an array of all entities that the mouse
	 * is currently over, ordered by their draw order from drawn last (above other
	 * entities) to first (underneath other entities).
	 */
	mouseOverList: function (obj, entArr) {
		var arr;
		var arrCount;
		var mp;
		var mouseTriggerPoly;
		var first = false;

		if (!obj) {
			obj = ige;
			entArr = [];
			first = true;
		}

		if (obj === ige) {
			// Loop viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					if (arr[arrCount]._scene) {
						if (arr[arrCount]._scene._shouldRender) {
							this.mouseOverList(arr[arrCount]._scene, entArr);
						}
					}
				}
			}
		} else {
			// Check if the mouse is over this entity
			mp = this.mousePosWorld();

			if (mp && obj.aabb) {
				// Trigger mode is against the AABB
				mouseTriggerPoly = obj.aabb(); // this.localAabb();

				// Check if the current mouse position is inside this aabb
				if (mouseTriggerPoly.xyInside(mp.x, mp.y)) {
					entArr.push(obj);
				}
			}

			// Check if the entity has children
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					this.mouseOverList(arr[arrCount], entArr);
				}
			}
		}

		if (first) {
			entArr.reverse();
		}

		return entArr;
	},

	/**
	 * Handles the screen resize event.
	 * @param event
	 * @private
	 */
	_resizeEvent: function (event) {
		if (ige.isClient) return;
		if (ige._autoSize) {
			var arr = ige._children;
			var arrCount = arr.length;

			// Loop any mounted children and check if
			// they should also get resized
			while (arrCount--) {
				arr[arrCount]._resizeEvent(event);
			}
		}
	},
	scaleMap: function (map) {
		// return map;
		var gameMap = _.cloneDeep(map);
		// ige.game.data.defaultData.dontResize ||
		if (ige.game.data.defaultData.dontResize) {
			ige.scaleMapDetails = {
				scaleFactor: { x: 1, y: 1 },
				shouldScaleTilesheet: false,
				tileWidth: gameMap.tilewidth,
				tileHeight: gameMap.tileheight,
				originalTileHeight: gameMap.tileheight,
				originalTileWidth: gameMap.tilewidth
			};
		} else {
			gameMap.originalTileWidth = gameMap.tilewidth;
			gameMap.originalTileHeight = gameMap.tileheight;
			ige.scaleMapDetails = {
				scaleFactor: {
					x: 64 / gameMap.originalTileWidth,
					y: 64 / gameMap.originalTileHeight
				},
				originalTileHeight: gameMap.originalTileHeight,
				originalTileWidth: gameMap.originalTileWidth,
				tileWidth: 64,
				tileHeight: 64,
				shouldScaleTilesheet: false
			};
			// if (ige.isClient) {
			// 	ige.scaleMapDetails.tileWidth = gameMap.tilewidth;
			// 	ige.scaleMapDetails.tileHeight = gameMap.tileheight;
			// } else {
			// 	gameMap.tilewidth = 64;
			// 	gameMap.tileheight = 64;
			// }

			if (ige.scaleMapDetails.scaleFactor.x !== 1 || ige.scaleMapDetails.scaleFactor.y !== 1) {
				ige.scaleMapDetails.shouldScaleTilesheet = true;
			}
		}
		return gameMap;
	},

	/**
	 * Adds a new watch expression to the watch list which will be
	 * displayed in the stats overlay during a call to _statsTick().
	 * @param {*} evalStringOrObject The expression to evaluate and
	 * display the result of in the stats overlay, or an object that
	 * contains a "value" property.
	 * @returns {Integer} The index of the new watch expression you
	 * just added to the watch array.
	 */
	watchStart: function (evalStringOrObject) {
		this._watch = this._watch || [];
		this._watch.push(evalStringOrObject);

		return this._watch.length - 1;
	},

	/**
	 * Removes a watch expression by it's array index.
	 * @param {Number} index The index of the watch expression to
	 * remove from the watch array.
	 */
	watchStop: function (index) {
		this._watch = this._watch || [];
		this._watch.splice(index, 1);
	},

	/**
	 * Sets a trace up on the setter of the passed object's
	 * specified property. When the property is set by any
	 * code the debugger line is activated and code execution
	 * will be paused allowing you to step through code or
	 * examine the call stack to see where the property set
	 * originated.
	 * @param {Object} obj The object whose property you want
	 * to trace.
	 * @param {String} propName The name of the property you
	 * want to put the trace on.
	 * @param {Number} sampleCount The number of times you
	 * want the trace to break with the debugger line before
	 * automatically switching off the trace.
	 * @param {Function=} callbackEvaluator Optional callback
	 * that if returns true, will fire debugger. Method is passed
	 * the setter value as first argument.
	 */
	traceSet: function (obj, propName, sampleCount, callbackEvaluator) {
		obj.___igeTraceCurrentVal = obj.___igeTraceCurrentVal || {};
		obj.___igeTraceCurrentVal[propName] = obj[propName];
		obj.___igeTraceMax = sampleCount || 1;
		obj.___igeTraceCount = 0;

		Object.defineProperty(obj, propName, {
			get: function () {
				return obj.___igeTraceCurrentVal[propName];
			},
			set: function (val) {
				if (callbackEvaluator) {
					if (callbackEvaluator(val)) {
						debugger;
					}
				} else {
					debugger;
				}

				obj.___igeTraceCurrentVal[propName] = val;
				obj.___igeTraceCount++;

				if (obj.___igeTraceCount === obj.___igeTraceMax) {
					// Maximum amount of trace samples reached, turn off
					// the trace system
					ige.traceSetOff(obj, propName);
				}
			}
		});
	},

	/**
	 * Turns off a trace that was created by calling traceSet.
	 * @param {Object} object The object whose property you want
	 * to disable a trace against.
	 * @param {String} propName The name of the property you
	 * want to disable the trace for.
	 */
	traceSetOff: function (object, propName) {
		Object.defineProperty(object, propName, { set: function (val) {
			this.___igeTraceCurrentVal[propName] = val;
		} });
	},

	/**
	 * Finds the first Ige* based class that the passed object
	 * has been derived from.
	 * @param obj
	 * @return {*}
	 */
	findBaseClass: function (obj) {
		if (obj && obj._classId) {
			if (obj._classId.substr(0, 3) === 'Ige') {
				return obj._classId;
			} else {
				if (obj.__proto__._classId) {
					return this.findBaseClass(obj.__proto__);
				} else {
					return '';
				}
			}
		} else {
			return '';
		}
	},

	/**
	 * Returns an array of all classes the passed object derives from
	 * in order from current to base.
	 * @param obj
	 * @param arr
	 * @return {*}
	 */
	getClassDerivedList: function (obj, arr) {
		if (!arr) {
			arr = [];
		} else {
			if (obj._classId) {
				arr.push(obj._classId);
			}
		}

		if (obj.__proto__._classId) {
			this.getClassDerivedList(obj.__proto__, arr);
		}

		return arr;
	},

	spawnQueue: function (ent) {
		if (ent !== undefined) {
			this._spawnQueue.push(ent);
			return this;
		}

		return this._spawnQueue;
	},

	/**
	 * Is called every second and does things like calculate the current FPS.
	 * @private
	 */
	_secondTick: function () {
		var self = ige;

		// Store frames per second
		self._renderFPS = self._renderFrames;
		self._physicsFPS = self._physicsFrames;

		// Store draws per second
		self._dps = self._dpf * self._renderFPS;

		if (ige.isClient)
			$('#updatefps').html(self._renderFPS);

		// Zero out counters
		self._renderFrames = 0;
		self._physicsFrames = 0;
		self._drawCount = 0;
	},

	/**
	 * Gets / sets the current time scalar value. The engine's internal
	 * time is multiplied by this value and it's default is 1. You can set it to
	 * 0.5 to slow down time by half or 1.5 to speed up time by half. Negative
	 * values will reverse time but not all engine systems handle this well
	 * at the moment.
	 * @param {Number=} val The time scale value.
	 * @returns {*}
	 */
	timeScale: function (val) {
		if (val !== undefined) {
			this._timeScale = val;
			return this;
		}

		return this._timeScale;
	},

	/**
	 * Increments the engine's internal time by the passed number of milliseconds.
	 * @param {Number} val The number of milliseconds to increment time by.
	 * @param {Number=} lastVal The last internal time value, used to calculate
	 * delta internally in the method.
	 * @returns {Number}
	 */
	 incrementTime: function () {
		const now = new Date().getTime();
		
		if (!this._pause) {

			this._currentTime = (now + this.timeDiscrepancy) * this._timeScale;
			this.renderTime = this._currentTime;
		}
		
		this._lastTimeStamp = now;
		return this._currentTime;
	},

	/**
	 * Get the current time from the engine.
	 * @return {Number} The current time.
	 */
	currentTime: function () {
		return this._currentTime;
	},

	/**
	 * Gets / sets the pause flag. If set to true then the engine's
	 * internal time will no longer increment and will instead stay static.
	 * @param val
	 * @returns {*}
	 */
	pause: function (val) {
		if (val !== undefined) {
			this._pause = val;
			return this;
		}

		return this._pause;
	},

	/**
	 * Gets / sets the option to determine if the engine should
	 * schedule it's own ticks or if you want to manually advance
	 * the engine by calling tick when you wish to.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	useManualTicks: function (val) {
		if (val !== undefined) {
			this._useManualTicks = val;
			return this;
		}

		return this._useManualTicks;
	},

	/**
	 * Schedules a manual tick.
	 */
	manualTick: function () {
		if (this._manualFrameAlternator !== this._frameAlternator) {
			this._manualFrameAlternator = this._frameAlternator;
			requestAnimFrame(this.engineStep);
		}
	},

	/**
	 * Gets / sets the option to determine if the engine should
	 * render on every tick or wait for a manualRender() call.
	 * @param {Boolean=} val True to enable manual rendering, false
	 * to disable.
	 * @return {*}
	 */
	useManualRender: function (val) {
		if (val !== undefined) {
			this._useManualRender = val;
			return this;
		}

		return this._useManualRender;
	},

	/**
	 * Manually render a frame on demand. This is used in conjunction
	 * with the ige.useManualRender(true) call which will cause the
	 * engine to only render new graphics frames from the scenegraph
	 * once this method is called. You must call this method every time
	 * you wish to update the graphical output on screen.
	 *
	 * Calling this method multiple times during a single engine tick
	 * will NOT make it draw more than one frame, therefore it is safe
	 * to call multiple times if required by different sections of game
	 * logic without incurring extra rendering cost.
	 */
	manualRender: function () {
		this._manualRender = true;
	},

	// snapshot mechanism, UnderConstruction
	updateCreateEntitySnapshot: function () {
		var allEntities = ige.$('baseScene')._children;
		if (allEntities) {
			for (var i = 0; i < allEntities.length; i++) {
				var entity = allEntities[i];
				ige.entityCreateSnapshot[entity._id] = [
					entity.classId(),
					entity.id(),
					entity._parent.id(),
					entity._streamSectionData,
					entity.streamCreateData()
				];
			}
		}
	},
	sendEntityCreateSnapshot: function (clientId) {
		this.updateCreateEntitySnapshot();
		for (var entityId in ige.entityCreateSnapshot) {
			if (!ige.network.stream._streamClientCreated) ige.network.stream._streamClientCreated = {};
			if (!ige.network.stream._streamClientCreated[entityId]) ige.network.stream._streamClientCreated[entityId] = {};
			ige.network.stream._streamClientCreated[entityId][clientId] = true;
		}
		ige.network.send('_igeStreamCreateSnapshot', ige.entityCreateSnapshot, clientId);
	},

	/**
	 * Called each frame to traverse and render the scenegraph.
	 */
	engineStep: function (timeStamp, ctx) {
		if (ige.isClient) {
			if (statsPanels.ms) {
				statsPanels.ms.begin();
				statsPanels.fps.begin();
			}
		}
		/* TODO:
			Make the scenegraph process simplified. Walk the scenegraph once and grab the order in a flat array
			then process updates and ticks. This will also allow a layered rendering system that can render the
			first x number of entities then stop, allowing a step through of the renderer in realtime.
		 */
		var et;
		var updateStart;
		var self = ige;
		var unbornQueue;
		var unbornCount;
		var unbornIndex;
		var unbornEntity;

		self.incrementTime();
		timeStamp = Math.floor(self._currentTime);

		if (self._state) {
			// Call the input system tick to reset any flags etc
			self.input.tick();

			// Check if we were passed a context to work with
			if (ctx === undefined) {
				ctx = self._ctx;
			}

			// Alternate the boolean frame alternator flag
			self._frameAlternator = !self._frameAlternator;

			// If the engine is not in manual tick mode...
			if (!ige._useManualTicks) {
				// Schedule a new frame
				if (ige.isServer) {
					requestAnimFrame(self.engineStep);
				}
			} else {
				self._manualFrameAlternator = !self._frameAlternator;
			}

			// Get the current time in milliseconds
			self._tickStart = timeStamp;

			if (!self.lastTick) {
				// This is the first time we've run so set some
				// default values and set the delta to zero
				self.lastTick = 0;
				self._tickDelta = 0;
			} else {
				// Calculate the frame delta
				self._tickDelta = self._tickStart - self.lastTick;
				// console.log("wtf tick", self._tickStart, self.lastTick, self._tickDelta)
			}
			ige.now = Date.now();

			timeElapsed = ige.now - ige._lastGameLoopTickAt;
			if (timeElapsed >= (1000 / ige._gameLoopTickRate) - ige._gameLoopTickRemainder) {
				ige._lastGameLoopTickAt = ige.now;
				ige._gameLoopTickRemainder = Math.min(timeElapsed - ((1000 / ige._gameLoopTickRate) - ige._gameLoopTickRemainder), (1000 / ige._gameLoopTickRate));
				ige.gameLoopTickHasExecuted = true;
			}

			var timeElapsed = ige.now - ige._lastPhysicsTickAt;			
			if (// physics update should execute as soon as gameloop has executed in order to stream the accurate, latest translation data computed from physics update
				ige.physics && (
					ige.gameLoopTickHasExecuted || // don't ask. - Jaeyun
					timeElapsed >= (1000 / ige._physicsTickRate) - ige._physicsTickRemainder
				)
			) {
				ige._lastPhysicsTickAt = ige.now;
				ige._physicsTickRemainder = Math.min(timeElapsed - ((1000 / ige._physicsTickRate) - ige._physicsTickRemainder), (1000 / ige._physicsTickRate));
				ige.physics.update(timeElapsed);
				ige.physicsTickHasExecuted = true;
			}

			if (ige.isServer) {
				if (ige.gameLoopTickHasExecuted)
					ige.trigger.fire('frameTick');
			} else if (ige.isClient) {
				if (ige.client.myPlayer) {
					ige.client.myPlayer.control._behaviour();
				}

				let oldestSnapshot = ige.snapshots[0];
				while (ige.snapshots.length >= 2 && oldestSnapshot != undefined && ige._currentTime > oldestSnapshot[0]) {	
					ige.prevSnapshot = ige.nextSnapshot
					ige.nextSnapshot = ige.snapshots[ige.snapshots.length-1];

					// rubberband currentTime to the latest time received from server - 40ms
					oldestSnapshot = ige.snapshots.shift();
				}

				return;
			}

			ige.updateCount = 0;
			ige.tickCount = 0;
			ige.updateTransform = 0;
			ige.inViewCount = 0;
			ige.totalChildren = 0;
			ige.totalOrphans = 0;

			// Update the scenegraph
			if (self._enableUpdates) {
				// ige.updateCount = {}
				// ige.tickCount = {}

				if (igeConfig.debug._timing) {
					updateStart = Date.now();
					self.updateSceneGraph(ctx);
					ige._updateTime = Date.now() - updateStart;
				} else {
					self.updateSceneGraph(ctx);
				}
			}

			if (!ige.gameLoopTickHasExecuted) {
				return;
			}

			// Check for unborn entities that should be born now
			unbornQueue = ige._spawnQueue;
			unbornCount = unbornQueue.length;
			for (unbornIndex = unbornCount - 1; unbornIndex >= 0; unbornIndex--) {
				unbornEntity = unbornQueue[unbornIndex];

				if (ige._currentTime >= unbornEntity._bornTime) {
					// Now birth this entity
					unbornEntity.mount(ige.$(unbornEntity._birthMount));
					unbornQueue.splice(unbornIndex, 1);
				}
			}

			// Render the scenegraph
			if (self._enableRenders) {
				if (!self._useManualRender) {
					if (igeConfig.debug._timing) {
						renderStart = Date.now();
						self.renderSceneGraph(ctx);
					} else {
						self.renderSceneGraph(ctx);
					}
				} else {
					if (self._manualRender) {
						if (igeConfig.debug._timing) {
							renderStart = Date.now();
							self.renderSceneGraph(ctx);
						} else {
							self.renderSceneGraph(ctx);
						}
						self._manualRender = false;
					}
				}
			}

			// console.log(ige.updateCount, ige.tickCount, ige.updateTransform,"inView", ige.inViewCount);
			// Record the lastTick value so we can
			// calculate delta on the next tick
			self.lastTick = self._tickStart;
			self._dpf = self._drawCount;
			self._drawCount = 0;

			if (ige.isServer) {
				if (self.now - self.lastCheckedAt > 1000) {
					self.lastCheckedAt = self.now;

					// kill tier 1 servers that has been empty for over 15 minutes
					var playerCount = ige.$$('player').filter(function (player) {
						return player._stats.controlledBy == 'human';
					}).length;

					if (playerCount <= 0) {
						if (!self.serverEmptySince) {
							self.serverEmptySince = self.now;
						}

						const serverTier = ige.server.tier;
						const gameTier = ige.game && ige.game.data && ige.game.data.defaultData && ige.game.data.defaultData.tier;
						// gameTier and serverTier could be different in some cases since Tier 4 games are now being hosted on Tier 2 servers.
						// Kill T1 and T2 servers if it's been empty for 10+ mins. Also, do not kill T2 servers if they are hosting a T4 game
						if ((serverTier === '1' || serverTier === '2') && gameTier !== '4' && self.now - self.serverEmptySince > self.emptyTimeLimit) {
							ige.server.kill('game\'s been empty for too long (10 min)');
						}
					} else {
						self.serverEmptySince = null;
					}

					var lifeSpan = self.getLifeSpan();

					// if server's lifeSpan is over, kill it (e.g. kill server after 5 hours)
					var age = self.now - ige.server.gameStartedAt;

					var shouldLog = ige.server.logTriggers && ige.server.logTriggers.timerLogs;
					if (shouldLog) {
						console.log(self.now, ige.server.gameStartedAt, age, lifeSpan, age > lifeSpan);
					}
					if (age > lifeSpan) {
						console.log({
							lifeSpan,
							age,
							now: self.now,
							startedAt: ige.server.gameStartedAt
						});
						ige.server.kill(`server lifespan expired ${lifeSpan}`);
					}
				}
			}

			/// / for debugging
			// if (ige.$$("unit")[0]) {

			// 	var x = ige.$$("unit")[0]._translate.x
			// 	// for debugging
			// 	if (!ige.lastSnapshotTimeStamp) {
			// 		ige.lastSnapshotTimeStamp = timeStamp
			// 	}

			// 	if (!ige.lastX) {
			// 		ige.lastX = x
			// 	}

			// 	var timeElapsed = timeStamp - ige.lastSnapshotTimeStamp
			// 	var distanceTravelled = x - ige.lastX;
			// 	if (x) {
			// 		console.log("unit speed", (distanceTravelled / timeElapsed * 100).toFixed(0), " (", distanceTravelled, "/", timeElapsed, ")")
			// 	}

			// 	ige.lastX = x
			// 	ige.lastSnapshotTimeStamp = timeStamp;

			// }

			ige.network.stream._sendQueue(timeStamp);
			ige.network.stream.updateEntityAttributes();
			if (ige.count == undefined || ige.now - ige.lastSent < 30) {
				// console.log(ige.count, ige.now - ige.lastSent)
				ige.count = 0;
			}
			ige.lastSent = ige.now;
			ige.count++;
		}

		ige.gameLoopTickHasExecuted = false;
		ige.physicsTickHasExecuted = false;

		et = new Date().getTime();
		ige._tickTime = et - ige.now;
		// console.log(ige._tickTime, ige._tickTime, 1000/self._fpsRate)

		// slow engineTick restart only works on two houses (Braains.io)
		if (ige.server && ige.server.gameId == '5a7fd59b1014dc000eeec3dd')
			// restart server if physics engine is running slow as this will cause laggy experience for the players
			if (ige._tickTime > 1000 / self._fpsRate) {
				self.lagOccurenceCount++;
				self.lastLagOccurenceAt = et;
				if (self.lagOccurenceCount > 50) {
					console.log('engineTick is taking too long! (', ige._tickTime, 'ms. It should be under', 1000 / self._fpsRate, `(${self.lagOccurenceCount}/100)`);
				}
				if (self.lagOccurenceCount > 100) {
					ige.server.kill('engineTick has been consistently running slow. killing the server. (this causes lag)');
				}
			} else {
				self.lagOccurenceCount = 0;
			}

		// // reset lagOccurenceCount if no lag occured for 3s.
		// if (et - self.lastLagOccurenceAt > 3000) {

		// }

		if (ige.isClient) {
			if (statsPanels.ms) {
				statsPanels.fps.end();
				statsPanels.ms.end();
			}
		}
	},

	updateSceneGraph: function (ctx) {
		// ige cancel
		// if (ige.isClient) {
		// 	return;
		// }
		var arr = this._children;
		var arrCount; var us; var ud;
		var tickDelta = ige._tickDelta;

		// Process any behaviours assigned to the engine
		this._processUpdateBehaviours();

		if (arr) {
			arrCount = arr.length;

			// Loop our viewports and call their update methods
			if (igeConfig.debug._timing) {
				while (arrCount--) {
					us = new Date().getTime();
					arr[arrCount].update(ctx, tickDelta);
					ud = new Date().getTime() - us;

					if (arr[arrCount]) {
						if (!ige._timeSpentInUpdate[arr[arrCount].id()]) {
							ige._timeSpentInUpdate[arr[arrCount].id()] = 0;
						}

						if (!ige._timeSpentLastUpdate[arr[arrCount].id()]) {
							ige._timeSpentLastUpdate[arr[arrCount].id()] = {};
						}

						ige._timeSpentInUpdate[arr[arrCount].id()] += ud;
						ige._timeSpentLastUpdate[arr[arrCount].id()].ms = ud;
					}
				}
			} else {
				while (arrCount--) {
					arr[arrCount].update(ctx, tickDelta);
				}
			}
		}
	},

	renderSceneGraph: function (ctx) {
		var ts, td;

		// Process any behaviours assigned to the engine
		this._processTickBehaviours(ctx);
		if (ige.isServer) {
			if (this._viewportDepth) {
				if (igeConfig.debug._timing) {
					ts = new Date().getTime();
					this.depthSortChildren();
					td = new Date().getTime() - ts;

					if (!ige._timeSpentLastTick[this.id()]) {
						ige._timeSpentLastTick[this.id()] = {};
					}

					ige._timeSpentLastTick[this.id()].depthSortChildren = td;
				} else {
					this.depthSortChildren();
				}
			}

			ctx.save();
			ctx.translate(this._bounds2d.x2, this._bounds2d.y2);
			// ctx.scale(this._globalScale.x, this._globalScale.y);

			// Process the current engine tick for all child objects
			var arr = this._children;
			var arrCount;

			if (arr) {
				arrCount = arr.length;

				// Loop our viewports and call their tick methods
				if (igeConfig.debug._timing) {
					while (arrCount--) {
						ctx.save();
						ts = new Date().getTime();
						arr[arrCount].tick(ctx);
						td = new Date().getTime() - ts;
						if (arr[arrCount]) {
							if (!ige._timeSpentInTick[arr[arrCount].id()]) {
								ige._timeSpentInTick[arr[arrCount].id()] = 0;
							}

							if (!ige._timeSpentLastTick[arr[arrCount].id()]) {
								ige._timeSpentLastTick[arr[arrCount].id()] = {};
							}

							ige._timeSpentInTick[arr[arrCount].id()] += td;
							ige._timeSpentLastTick[arr[arrCount].id()].ms = td;
						}
						ctx.restore();
					}
				} else {
					while (arrCount--) {
						ctx.save();
						arr[arrCount].tick(ctx);
						ctx.restore();
					}
				}
			}

			ctx.restore();
		}
		// Depth-sort the viewports
	},

	fps: function () {
		return this._renderFPS;
	},

	dpf: function () {
		return this._dpf;
	},

	dps: function () {
		return this._dps;
	},

	analyseTiming: function () {
		if (!igeConfig.debug._timing) {
			IgeEngine.prototype.log('Cannot analyse timing because the igeConfig.debug._timing flag is not enabled so no timing data has been recorded!', 'warning');
		}
	},

	saveSceneGraph: function (item) {
		var arr, arrCount, i;

		if (!item) {
			item = this.getSceneGraphData();
		}

		if (item.obj.stringify) {
			item.str = item.obj.stringify();
		} else {
			IgeEngine.prototype.log(`Class ${item.classId} has no stringify() method! For object: ${item.id}`, item.obj);
		}
		arr = item.items;

		if (arr) {
			arrCount = arr.length;

			for (i = 0; i < arrCount; i++) {
				this.saveSceneGraph(arr[i]);
			}
		}

		return item;
	},

	/**
	 * Walks the scene graph and outputs a console map of the graph.
	 */
	sceneGraph: function (obj, currentDepth, lastDepth) {
		var depthSpace = '';
		var di;
		var timingString;
		var arr;
		var arrCount;

		if (currentDepth === undefined) {
			currentDepth = 0;
		}

		if (!obj) {
			// Set the obj to the main ige instance
			obj = ige;
		}

		for (di = 0; di < currentDepth; di++) {
			depthSpace += '----';
		}

		if (igeConfig.debug._timing) {
			timingString = '';

			timingString += `T: ${ige._timeSpentInTick[obj.id()]}`;
			if (ige._timeSpentLastTick[obj.id()]) {
				if (typeof (ige._timeSpentLastTick[obj.id()].ms) === 'number') {
					timingString += ` | LastTick: ${ige._timeSpentLastTick[obj.id()].ms}`;
				}

				if (typeof (ige._timeSpentLastTick[obj.id()].depthSortChildren) === 'number') {
					timingString += ` | ChildDepthSort: ${ige._timeSpentLastTick[obj.id()].depthSortChildren}`;
				}
			}

			IgeEngine.prototype.log(`${depthSpace + obj.id()} (${obj._classId}) : ${obj._inView} Timing(${timingString})`);
		} else {
			IgeEngine.prototype.log(`${depthSpace + obj.id()} (${obj._classId}) : ${obj._inView}`);
		}

		currentDepth++;

		if (obj === ige) {
			// Loop the viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					if (arr[arrCount]._scene) {
						if (arr[arrCount]._scene._shouldRender) {
							if (igeConfig.debug._timing) {
								timingString = '';

								timingString += `T: ${ige._timeSpentInTick[arr[arrCount].id()]}`;
								if (ige._timeSpentLastTick[arr[arrCount].id()]) {
									if (typeof (ige._timeSpentLastTick[arr[arrCount].id()].ms) === 'number') {
										timingString += ` | LastTick: ${ige._timeSpentLastTick[arr[arrCount].id()].ms}`;
									}

									if (typeof (ige._timeSpentLastTick[arr[arrCount].id()].depthSortChildren) === 'number') {
										timingString += ` | ChildDepthSort: ${ige._timeSpentLastTick[arr[arrCount].id()].depthSortChildren}`;
									}
								}

								IgeEngine.prototype.log(`${depthSpace}----${arr[arrCount].id()} (${arr[arrCount]._classId}) : ${arr[arrCount]._inView} Timing(${timingString})`);
							} else {
								IgeEngine.prototype.log(`${depthSpace}----${arr[arrCount].id()} (${arr[arrCount]._classId}) : ${arr[arrCount]._inView}`);
							}
							this.sceneGraph(arr[arrCount]._scene, currentDepth + 1);
						}
					}
				}
			}
		} else {
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					this.sceneGraph(arr[arrCount], currentDepth);
				}
			}
		}
	},

	/**
	 * Walks the scenegraph and returns a data object of the graph.
	 */
	getSceneGraphData: function (obj, noRef) {
		var item; var items = []; var tempItem; var tempItem2; var tempCam;
		var arr; var arrCount;

		if (!obj) {
			// Set the obj to the main ige instance
			obj = ige;
		}

		item = {
			text: `[${obj._classId}] ${obj.id()}`,
			id: obj.id(),
			classId: obj.classId()
		};

		if (!noRef) {
			item.parent = obj._parent;
			item.obj = obj;
		} else {
			if (obj._parent) {
				item.parentId = obj._parent.id();
			} else {
				item.parentId = 'sceneGraph';
			}
		}

		if (obj === ige) {
			// Loop the viewports
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					tempItem = {
						text: `[${arr[arrCount]._classId}] ${arr[arrCount].id()}`,
						id: arr[arrCount].id(),
						classId: arr[arrCount].classId()
					};

					if (!noRef) {
						tempItem.parent = arr[arrCount]._parent;
						tempItem.obj = arr[arrCount];
					} else {
						if (arr[arrCount]._parent) {
							tempItem.parentId = arr[arrCount]._parent.id();
						}
					}

					if (arr[arrCount].camera) {
						// Add the viewport camera as an object on the scenegraph
						tempCam = {
							text: `[IgeCamera] ${arr[arrCount].id()}`,
							id: arr[arrCount].camera.id(),
							classId: arr[arrCount].camera.classId()
						};

						if (!noRef) {
							tempCam.parent = arr[arrCount];
							tempCam.obj = arr[arrCount].camera;
						} else {
							tempCam.parentId = arr[arrCount].id();
						}

						if (arr[arrCount]._scene) {
							tempItem2 = this.getSceneGraphData(arr[arrCount]._scene, noRef);
							tempItem.items = [tempCam, tempItem2];
						}
					} else {
						if (arr[arrCount]._scene) {
							tempItem2 = this.getSceneGraphData(arr[arrCount]._scene, noRef);
							tempItem.items = [tempItem2];
						}
					}

					items.push(tempItem);
				}
			}
		} else {
			arr = obj._children;

			if (arr) {
				arrCount = arr.length;

				// Loop our children
				while (arrCount--) {
					tempItem = this.getSceneGraphData(arr[arrCount], noRef);
					items.push(tempItem);
				}
			}
		}

		if (items.length > 0) {
			item.items = items;
		}

		return item;
	},

	_childMounted: function (child) {
		if (child.IgeViewport) {
			// The first mounted viewport gets set as the current
			// one before any rendering is done
			if (!ige._currentViewport) {
				ige._currentViewport = child;
				ige._currentCamera = child.camera;
			}
		}

		IgeEntity.prototype._childMounted.call(this, child);
	},

	destroy: function () {
		// Stop the engine and kill any timers
		this.stop();

		if (this.isClient) {
			// Stop listening for input events
			if (this.input) {
				this.input.destroyListeners();
			}
		}

		// Call class destroy() super method
		IgeEntity.prototype.destroy.call(this);

		IgeEngine.prototype.log('Engine destroy complete.');
	},

	devLog: function () {
		// return;
		// if (ige.env == 'local') {
		// 	var scriptInfo = '';
		// 	if (ige.script) {
		// 		var script = ige.game.data.scripts[ige.script.currentScriptId];
		// 		scriptInfo = `Script '${(script) ? script.name : ''}' in Action '${ige.script.currentActionName}' : `;
		// 	}
		// 	var info = scriptInfo + (new Error()).stack.split('\n')[2];

		// 	Array.prototype.push.call(arguments, `     --- ${info}`);
		// 	console.log.apply(console, arguments);
		// }
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = IgeEngine;
}
