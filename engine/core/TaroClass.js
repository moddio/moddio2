try {
	global.cenv = process.env.ENV || 'staging';
	global.isDev = false;
} catch (e) {}

var TaroClass = (function () {
	var initializing = false;
	var fnTest = /xyz/.test(function () {
		xyz;
	})
		? /\b_super\b/
		: /.*/;

	// The base Class implementation (does nothing)
	var TaroClass = function () {};

	/**
	 * Provides logging capabilities to all TaroClass instances.
	 * @param {String} text The text to log.
	 * @param {String} type The type of log to output, can be 'log',
	 * 'info', 'warning' or 'error'.
	 * @param {Object=} obj An optional object that will be output
	 * before the log text is output.
	 * @example #Log a message
	 *     var entity = new TaroEntity();
	 *
	 *     // Will output:
	 *     //     taro *log* [TaroEntity] : hello
	 *     entity.log('Hello');
	 * @example #Log an info message with an optional parameter
	 *     var entity = new TaroEntity(),
	 *         param = 'moo';
	 *
	 *     // Will output:
	 *     //    moo
	 *     //    taro *log* [TaroEntity] : hello
	 *     entity.log('Hello', 'info', param);
	 * @example #Log a warning message (which will cause a stack trace to be shown)
	 *     var entity = new TaroEntity();
	 *
	 *     // Will output (stack trace is just an example here, real one will be more useful):
	 *     //    Stack: {anonymous}()@<anonymous>:2:8
	 *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
	 *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
	 *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
	 *     //    taro *warning* [TaroEntity] : A test warning
	 *     entity.log('A test warning', 'warning');
	 * @example #Log an error message (which will cause an exception to be raised and a stack trace to be shown)
	 *     var entity = new TaroEntity();
	 *
	 *     // Will output (stack trace is just an example here, real one will be more useful):
	 *     //    Stack: {anonymous}()@<anonymous>:2:8
	 *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
	 *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
	 *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
	 *     //    taro *error* [TaroEntity] : An error message
	 *     entity.log('An error message', 'error');
	 */
	var log = function (text, type, obj) {
		// selective blocking to reduce log noise
		/*
            if (this._classId == 'TaroEntityBox2d') return;
            if (this._classId == 'PhysicsComponent') return;
            if (this._classId == 'Unit') return;
            if (this._classId == 'Item') return;
            if (this._classId == 'ActionComponent') return;
            if (this._classId == 'Player') return;
            if (this._classId == 'ScriptComponent') return;
            if (this._classId == 'TaroTiledComponent') return;
            if (this._classId == 'TaroEntity') return;
            */

		// if (taroConfig.debug._enabled) {
		// 	var indent = '';
		// 	var stack;
		// 	var thisId;

		// 	if (typeof this._id !== 'undefined') {
		// 		thisId = `:${this._id}`;
		// 	} else {
		// 		thisId = '';
		// 	}

		// 	type = type || 'log';

		// 	if (obj !== undefined) {
		// 		console.warn(obj);
		// 	}

		// 	if (type === 'warning' || type === 'error') {
		// 		if (taroConfig.debug._stacks) {
		// 			if (taroConfig.debug._node) {
		// 				if (console.trace) {
		// 					Error.stackTraceLimit = Infinity;
		// 					// console.log("ERROR: ip/port is already being used by other server")
		// 					console.log('ERROR: ', text);
		// 					taro.server.kill('ERROR: ip/port is already being used by other server');
		// 					console.trace();
		// 				} else {
		// 					stack = new Error().stack;
		// 					console.log(color.magenta('Stack:'), color.red(stack));
		// 					console.log('Stack:', stack);
		// 				}
		// 			} else {
		// 				if (typeof printStackTrace === 'function') {
		// 					console.log('Stack:', printStackTrace().join('\n ---- '));
		// 				}
		// 			}
		// 		}
		// 	}

		// 	if (type === 'error') {
		// 		if (typeof taro !== 'undefined') {
		// 			console.log(
		// 				`${indent}taro *${type}* [${this._classId || this.prototype._classId}${thisId}] : ` +
		// 					'Error encountered, stopping engine to prevent console spamming...'
		// 			);
		// 			taro.stop();
		// 		}

		// 		if (taroConfig.debug._throwErrors) {
		// 			throw `${indent}taro *${type}* [${this._classId || this.prototype._classId}${thisId}] : ${text}`;
		// 		} else {
		// 			console.log(`${indent}taro *${type}* [${this._classId || this.prototype._classId}${thisId}] : ${text}`);
		// 		}
		// 	} else {
		// 		console.log(`${indent}taro *${type}* [${this._classId || this.prototype._classId}${thisId}] : ${text}`);
		// 	}
		// }

		return this;
	};

	/**
	 * Returns the class id. Primarily used to help identify
	 * what class an instance was instantiated with and is also
	 * output during the taro.scenegraph() method's console logging
	 * to show what class an object belongs to.
	 * @example #Get the class id of an object
	 *     var entity = new TaroEntity();
	 *
	 *     // Will output "TaroEntity"
	 *     console.log(entity.classId());
	 */
	var classId = function () {
		return this._classId;
	};

	/**
	 * Creates a new instance of the component argument passing
	 * the options argument to the component as it is initialised.
	 * The new component instance is then added to "this" via
	 * a property name that is defined in the component class as
	 * "componentId".
	 * @param {TaroClass} component The class definition of the component.
	 * @param {Object=} options An options parameter to pass to the component
	 * on init.
	 * @example #Add the velocity component to an entity
	 *     var entity = new TaroEntity();
	 *     entity.addComponent(TaroVelocityComponent);
	 *
	 *     // Now that the component is added, we can access
	 *     // the component via it's namespace. Call the
	 *     // "byAngleAndPower" method of the velocity component:
	 *     entity.velocity.byAngleAndPower(Math.radians(20), 0.1);
	 */
	var addComponent = function (component, options, callback) {
		try {
			var newComponent = new component(this, options, callback);
			this[newComponent.componentId] = newComponent;

			// Add the component reference to the class component array
			this._components = this._components || [];
			this._components.push(newComponent);
		} catch (err) {
			console.log(`failed to add component: ${newComponent?.componentId}`, component);
			console.error(err);
		}
		return this;
	};

	/**
	 * Removes a component by it's id.
	 * @param {String} componentId The id of the component to remove.
	 * @example #Remove a component by it's id (namespace)
	 *     var entity = new TaroEntity();
	 *
	 *     // Let's add the velocity component
	 *     entity.addComponent(TaroVelocityComponent);
	 *
	 *     // Now that the component is added, let's remove
	 *     // it via it's id ("velocity")
	 *     entity.removeComponent('velocity');
	 */
	var removeComponent = function (componentId) {
		// If the component has a destroy method, call it
		if (this[componentId] && this[componentId].destroy) {
			this[componentId].destroy();
		}

		// Remove the component from the class component array
		if (this._components) {
			this._components.pull(this[componentId]);
		}

		// Remove the component namespace from the class object
		delete this[componentId];
		return this;
	};

	/**
	 * Copies all properties and methods from the classObj object
	 * to "this". If the overwrite flag is not set or set to false,
	 * only properties and methods that don't already exists in
	 * "this" will be copied. If overwrite is true, they will be
	 * copied regardless.
	 * @param {Function} classObj
	 * @param {Boolean} overwrite
	 * @example #Implement all the methods of an object into another object
	 *     // Create a couple of test entities with ids
	 *     var entity1 = new TaroEntity().id('entity1'),
	 *         entity2 = new TaroEntity().id('entity2');
	 *
	 *     // Let's define an object with a couple of methods
	 *     var obj = {
	 *         newMethod1: function () {
	 *             console.log('method1 called on object: ' + this.id());
	 *         },
	 *
	 *         newMethod2: function () {
	 *             console.log('method2 called on object: ' + this.id());
	 *         }
	 *     };
	 *
	 *     // Now let's implement the methods on our entities
	 *     entity1.implement(obj);
	 *     entity2.implement(obj);
	 *
	 *     // The entities now have the newMethod1 and newMethod2
	 *     // methods as part of their instance so we can call them:
	 *     entity1.newMethod1();
	 *
	 *     // The output to the console is:
	 *     //    method1 called on object: entity1
	 *
	 *     // Now let's call newMethod2 on entity2:
	 *     entity2.newMethod2();
	 *
	 *     // The output to the console is:
	 *     //    method2 called on object: entity2
	 *
	 *     // As you can see, this is a great way to add extra modular
	 *     // functionality to objects / entities at runtime.
	 */
	var implement = function (classObj, overwrite) {
		var i;
		var obj = classObj.prototype || classObj;

		// Copy the class object's properties to (this)
		for (i in obj) {
			// Only copy the property if this doesn't already have it
			if (obj.hasOwnProperty(i) && (overwrite || this[i] === undefined)) {
				this[i] = obj[i];
			}
		}
		return this;
	};

	/**
	 * Gets / sets a key / value pair in the object's data object. Useful for
	 * storing arbitrary game data in the object.
	 * @param {String} key The key under which the data resides.
	 * @param {*=} value The data to set under the specified key.
	 * @example #Set some arbitrary data key value pair
	 *     var entity = new TaroEntity();
	 *     entity.data('playerScore', 100);
	 *     entity.data('playerName', 'iRock');
	 * @example #Get the value of a data key
	 *     console.log(entity.data('playerScore'));
	 *     console.log(entity.data('playerName'));
	 * @return {*}
	 */
	var data = function (key, value) {
		if (key !== undefined) {
			if (value !== undefined) {
				this._data = this._data || {};
				this._data[key] = value;

				return this;
			}

			if (this._data) {
				return this._data[key];
			} else {
				return null;
			}
		}
	};

	/**
	 * Create a new TaroClass that inherits from this class
	 * @name extend
	 * @example #Creating a new class by extending an existing one
	 *     var NewClass = TaroClass.extend({
	 *         // Init is your constructor
	 *         init: function () {
	 *             console.log('I\'m alive!');
	 *         }
	 *     });
	 *
	 * Further reading: [Extending Classes](http://www.isogenicengine.com/documentation/isogenic-game-engine/versions/1-1-0/manual/engine-fundamentals/classes/extending-classes/)
	 * @return {Function}
	 */
	TaroClass.extend = function () {
		var name;
		var prototype;
		// Set prop to the last argument passed
		var prop = arguments[arguments.length - 1];
		var extensionArray = arguments[0];
		var extensionItem;
		var extensionOverwrite;
		var extensionIndex;
		var propertyIndex;
		var propertyObject;

		// Check that the class has been assigned a classId and bug out if not
		if (!prop.classId) {
			console.log(prop);
			throw 'Cannot create a new class without giving the class a classId property!';
		}

		// Check that the classId is not already in use
		if (taroClassStore[prop.classId]) {
			// This classId has already been used, bug out
			throw `Cannot create class with classId "${prop.classId}" because a class with that ID has already been created!`;
		}

		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		prototype = new this();
		initializing = false;

		// Copy the properties over onto the new prototype
		for (name in prop) {
			if (prop.hasOwnProperty(name)) {
				// Copy the property
				prototype[name] = prop[name];
			}
		}

		// try{
		// 	var oinit = prototype.init;
		// 	if(global && global.isDev)
		// 	{
		// 		prototype.init = function(){
		// 			try{
		// 				if(global && global.isServer)
		// 				{
		// 					if(global.classes==undefined)global.classes = {};
		// 					if(global.traces==undefined)global.traces = {};

		// 					if(global.classes[prop.classId]==undefined)
		// 					{
		// 						global.classes[prop.classId] = 0;
		// 						global.traces[prop.classId] = {};
		// 					}
		// 					var str = new Error().stack;
		// 					if(global.traces[prop.classId][str]==undefined)global.traces[prop.classId][str]=0;
		// 					global.traces[prop.classId][str]++;
		// 					global.classes[prop.classId]++;
		// 				}

		// 				oinit.apply(this, arguments);
		// 			}catch(e)
		// 			{

		// 			}
		// 		};
		// 	}
		// }catch(e){}

		// Now implement any other extensions
		if (arguments.length > 1) {
			if (extensionArray && extensionArray.length) {
				for (extensionIndex = 0; extensionIndex < extensionArray.length; extensionIndex++) {
					extensionItem = extensionArray[extensionIndex];
					propertyObject = extensionItem.extension.prototype || extensionItem.extension;
					extensionOverwrite = extensionItem.overwrite;

					// Copy the class object's properties to (this)
					for (propertyIndex in propertyObject) {
						// Only copy the property if this doesn't already have it or
						// the extension is set to overwrite any existing properties
						if (
							propertyObject.hasOwnProperty(propertyIndex) &&
							(extensionOverwrite || prototype[propertyIndex] === undefined)
						) {
							prototype[propertyIndex] = propertyObject[propertyIndex];
						}
					}
				}
			}
		}

		// prototype._superClass = this.prototype;
		// console.log(prop.classId, 'extends', this.prototype._classId);

		// The dummy class constructor
		function TaroClass() {
			if (!initializing && this.init) {
				// Call the class init method
				this.init.apply(this, arguments);
			}
		}

		// Populate our constructed prototype object
		TaroClass.prototype = prototype;

		// Enforce the constructor to be what we expect
		TaroClass.prototype.constructor = TaroClass;

		// And make this class extensible
		TaroClass.extend = arguments.callee;

		// Add log capability
		TaroClass.prototype.log = log;

		// Add data capability
		TaroClass.prototype.data = data;

		// Add class name capability
		TaroClass.prototype.classId = classId; // This is a method that returns _classId
		TaroClass.prototype._classId = prop.classId || 'TaroClass';

		// Add the addComponent method
		TaroClass.prototype.addComponent = addComponent;

		// Add the removeComponent method
		TaroClass.prototype.removeComponent = removeComponent;

		// Add the implement method
		TaroClass.prototype.implement = implement;

		// Add editor settings
		TaroClass.prototype.__taroEditor = prop.editorOptions;

		// Register the class with the class store
		taroClassStore[prop.classId] = TaroClass;

		return TaroClass;
	};

	/**
	 * Test method
	 * @param prop
	 * @return {Function}
	 */
	TaroClass.vanilla = function (prop) {
		var TaroClass = prop.init || function () {};
		var prototype = new this();

		// Copy the properties over onto the new prototype
		for (name in prop) {
			if (prop.hasOwnProperty(name) && name !== 'init') {
				// Copy the property
				prototype[name] = prop[name];
			}
		}

		// Populate our constructed prototype object
		TaroClass.prototype = prototype;

		// Enforce the constructor to be what we expect
		TaroClass.prototype.constructor = TaroClass;

		// And make this class extensible
		TaroClass.extend = this.extend;

		// Add log capability
		TaroClass.prototype.log = log;

		// Add data capability
		TaroClass.prototype.data = data;

		// Add class name capability
		TaroClass.prototype.classId = classId; // This is a method that returns _classId
		TaroClass.prototype._classId = prop.classId || 'TaroClass';

		// Add the addComponent method
		TaroClass.prototype.addComponent = addComponent;

		// Add the removeComponent method
		TaroClass.prototype.removeComponent = removeComponent;

		// Add the implement method
		TaroClass.prototype.implement = implement;

		// Register the class with the class store
		taroClassStore[prop.classId] = TaroClass;

		return TaroClass;
	};

	TaroClass.prototype._classId = 'TaroClass';

	return TaroClass;
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TaroClass;
}
