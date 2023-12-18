/**
 * The engine's box2d component class.
 */

var PhysicsComponent = TaroEventingClass.extend({
	classId: 'PhysicsComponent',
	componentId: 'physics',

	init: async function (entity, options) {
		// Check that the engine has not already started
		// as this will mess everything up if it has
		if (taro._state != 0) {
			console.log('Cannot add box2d physics component to the taro instance once the engine has started!', 'error');
		}

		this._entity = entity;
		this._options = options;
		this._mode = 0;
		this._actionQueue = [];
		this.physicsTickDuration = 0;
		this.avgPhysicsTickDuration = 0;
		this.totalBodiesCreated = 0;
		this.lastSecondAt = Date.now();
		this.totalDisplacement = 0;
		this.totalTimeElapsed = 0;
		this.exponent = 2;
		this.divisor = 80;

		this.walls = [];
		this.nullPtr = undefined;
		this.getPointer = undefined;
		this.engine = dists.defaultEngine;

		if (taro.game && taro.game.data && taro.game.data.defaultData) {
			if (taro.isServer) {
				this.engine = taro.game.data.defaultData.physicsEngine;
			} else if (taro.isClient) {
				this.engine = taro.game.data.defaultData.clientPhysicsEngine;
			}

		}

		this.engine = this.engine.toUpperCase();
		const box2dwebScaleRatio = 30;
		this._scaleRatio = this.engine === 'BOX2DWASM' ? 60 : box2dwebScaleRatio;
		this._scaleRatioToBox2dWeb = this._scaleRatio / box2dwebScaleRatio;
		// this.engine = 'crash';
		console.log('Physics engine: ', this.engine);

		if (this.engine) {
			try {
				dists[this.engine].init(this);
			} catch (err) {
				console.log(err, "error: ")
			}

		} else {
			if (taro.isClient) {
				// alert('no physics engine selected');
			}
		}
	},

	useWorker: function (val) {
		if (typeof (Worker) !== 'undefined') {
			if (val !== undefined) {
				this._useWorker = val;
				return this._entity;
			}

			return this._useWorker;
		} else {
			PhysicsComponent.prototype.log('Web workers were not detected on this browser. Cannot access useWorker() method.', 'warning');
		}
	},

	/**
	 * Gets / sets the world interval mode. In mode 0 (zero) the
	 * box2d simulation is synced to the framerate of the engine's
	 * renderer. In mode 1 the box2d simulation is stepped at a constant
	 * speed regardless of the engine's renderer. This must be set *before*
	 * calling the start() method in order for the setting to take effect.
	 * @param {Integer} val The mode, either 0 or 1.
	 * @returns {*}
	 */
	mode: function (val) {
		if (val !== undefined) {
			this._mode = val;
			return this._entity;
		}

		return this._mode;
	},

	/**
	 * Gets / sets if the world should allow sleep or not.
	 * @param {Boolean} val
	 * @return {*}
	 */
	sleep: function (val) {
		if (val !== undefined) {
			this._sleep = val;
			return this._entity;
		}

		return this._sleep;
	},

	/**
	 * Gets / sets the current engine to box2d scaling ratio.
	 * @param val
	 * @return {*}
	 */
	scaleRatio: function (val) {
		if (val !== undefined) {
			this._scaleRatio = val;
			return this._entity;
		}

		return this._scaleRatio;
	},

	/**
	 * Gets / sets the current engine to box2d tilesize ratio, tilesize ratio is used while defining
	 * anchors for joints (see revolute joint for planckjs engine).
	 * @param val
	 * @return {*}
	 */
	tilesizeRatio: function (val) {
		if (val !== undefined) {
			this._tilesizeRatio = val;
			return this._entity;
		}

		return this._tilesizeRatio;
	},

	/**
	 * Gets the current Box2d world object.
	 * @return {b2World}
	 */
	world: function () {
		return this._world;
	},

	createFixture: function (params) {
		var tempDef = new this.b2FixtureDef();
		var param;

		for (param in params) {
			if (params.hasOwnProperty(param)) {
				if (param !== 'shape' && param !== 'filter') {
					tempDef[param] = params[param];
				}
			}
		}

		return tempDef;
	},

	/**
	 * Creates a Box2d body and attaches it to an taro entity
	 * based on the supplied body definition.
	 * @param {TaroEntity} entity
	 * @param {Object} body
	 * @return {b2Body}
	 */
	createBody: function (entity, body, isLossTolerant) {
		this.totalBodiesCreated++;

		return dists[this.engine].createBody(this, entity, body, isLossTolerant);
	},

	destroyBody: function (entity, body) {
		// immediately destroy body if entity already has box2dBody
		if (body || (entity && entity.body)) {
			body = body || entity.body;
			destroyBody = this._world.destroyBody;
			var isBodyDestroyed = destroyBody.apply(this._world, [body]);
			if (this.engine === 'BOX2DWASM') {
				this.freeFromCache(body);
			}
			// clear references to prevent memory leak
			if (this.engine === 'BOX2DWEB') {
				this._world.m_contactSolver.m_constraints = [];
				this._world.m_island.m_bodies = [];
				this._world.m_island.m_contacts = [];
				this._world.m_island.m_joints = [];
				this._world.m_contactManager.m_broadPhase.m_pairBuffer = []; // clear Dynamic Tree
				this._world.m_contactManager.m_broadPhase.m_tree.m_freeList = null; // clear Dynamic Tree

				for (var i = 0; i < box2dweb.Dynamics.b2World.s_queue.length; i++) {
					if (box2dweb.Dynamics.b2World.s_queue[i]._entity._id == entity._id) {
						// box2dweb.Dynamics.b2World.s_queue[i].m_prev.m_next = box2dweb.Dynamics.b2World.s_queue[i].m_next
						// box2dweb.Dynamics.b2World.s_queue[i].m_next.m_prev = box2dweb.Dynamics.b2World.s_queue[i].m_prev
						box2dweb.Dynamics.b2World.s_queue.splice(i, 1);
					}
				}

				for (var i = 0; i < this._world.m_contactManager.m_contactFactory.m_registers.length; i++) {
					for (var j = 0; j < this._world.m_contactManager.m_contactFactory.m_registers[i].length; j++) {
						delete this._world.m_contactManager.m_contactFactory.m_registers[i][j].pool;
					}
				}
			}

			if (isBodyDestroyed || this.engine === 'BOX2DWASM') {
				entity.body = null;
				entity._box2dOurContactFixture = null;
				entity._box2dTheirContactFixture = null;
			}
		} else {
			PhysicsComponent.prototype.log('failed to destroy body - body doesn\'t exist.');
		}
	},

	// move entityA to entityB's position and create joint
	createJoint: function (entityA, entityB, anchorA, anchorB) {
		// taro.devLog("joint created", entityA._category, entityA._translate.x, entityA._translate.y, entityB._category, entityB._translate.x, entityB._translate.y)
		// dists[this.engine].createJoint(this, entityA, entityB, anchorA, anchorB);
	},

	destroyJoint: function (entityA, entityB) {
		if (entityA && entityA.body && entityB && entityB.body) {
			var joint = entityA.jointsAttached[entityB.id()];
			if (joint) {
				this._world.destroyJoint(joint);
				// console.log("joint destroyed")
				delete entityA.jointsAttached[entityB.id()];
				delete entityB.jointsAttached[entityA.id()];
			}
		} else {
			PhysicsComponent.prototype.log('joint cannot be destroyed: one or more bodies missing');
		}
	},

	// get entities within a region
	getBodiesInRegion: function (region) {
		var self = this;

		if (taro.physics.engine === 'crash') {
			var collider = new self.crash.Box(new self.crash.Vector(region.x + (region.width / 2), region.y + (region.height / 2)), region.width, region.height);
			return taro.physics.crash.search(collider);
		} else {
			var aabb = new self.b2AABB();

			aabb.lowerBound.set(region.x / self._scaleRatio, region.y / self._scaleRatio);
			aabb.upperBound.set((region.x + region.width) / self._scaleRatio, (region.y + region.height) / self._scaleRatio);

			var entities = [];
			if (self.engine === 'BOX2DWASM') {

				const callback = Object.assign(new self.JSQueryCallback(), {
					ReportFixture: (fixture_p) => {
						const fixture = self.wrapPointer(fixture_p, self.b2Fixture);
						entityId = fixture.GetBody().GetFixtureList().taroId;
						var entity = taro.$(entityId);
						if (entity) {
							// taro.devLog("found", entity._category, entity._translate.x, entity._translate.y)
							var entity = taro.$(entityId);
							entities.push(taro.$(entityId));
						}
						return true;
					}
				});
				dists[this.engine].queryAABB(self, aabb, callback);
			} else {
				function getBodyCallback(fixture) {
					if (fixture && fixture.m_body && fixture.m_body.m_fixtureList) {
						entityId = fixture.m_body.m_fixtureList.taroId;
						var entity = taro.$(entityId);
						if (entity) {
							// taro.devLog("found", entity._category, entity._translate.x, entity._translate.y)
							var entity = taro.$(entityId);
							entities.push(taro.$(entityId));
						}
					}
					return true;
				}

				dists[this.engine].queryAABB(self, aabb, getBodyCallback);
			}
			// Query the world for overlapping shapes.


			return entities;
		}
	},

	/**
	 * Produces static box2d bodies from passed map data.
	 * @param {TaroTileMap2d} mapLayer
	 * @param {Function=} callback Returns true or false depending
	 * on if the passed map data should be included as part of the
	 * box2d static object data. This allows you to control what
	 * parts of the map data are to be considered for box2d static
	 * objects and which parts are to be ignored. If not passed then
	 * any tile with any map data is considered part of the static
	 * object data.
	 */
	staticsFromMap: function (mapLayer, callback) {
		if (mapLayer == undefined) {
			taro.server.unpublish('PhysicsComponent#51');
		}

		if (mapLayer.map) {
			var tileWidth = taro.scaleMapDetails.tileWidth || mapLayer.tileWidth();
			var tileHeight = taro.scaleMapDetails.tileHeight || mapLayer.tileHeight();
			var posX; var posY;
			var rectArray; var rectCount; var rect;

			// Get the array of rectangle bounds based on
			// the map's data
			rectArray = mapLayer.scanRects(callback);
			rectCount = rectArray.length;

			while (rectCount--) {
				rect = rectArray[rectCount];

				posX = (tileWidth * (rect.width / 2));
				posY = (tileHeight * (rect.height / 2));

				if (this.engine == 'CRASH') {
					var defaultData = {
						translate: {
							x: rect.x * tileWidth,
							y: rect.y * tileHeight
						}
					};
				} else {
					var defaultData = {
						translate: {
							x: rect.x * tileWidth + posX,
							y: rect.y * tileHeight + posY
						}
					};
				}

				var wall = new TaroEntityPhysics(defaultData)
					.width(rect.width * tileWidth)
					.height(rect.height * tileHeight)
					.drawBounds(false)
					.drawBoundsData(false)
					.category('wall');

				this.walls.push(wall);

				// walls must be created immediately, because there isn't actionQueue for walls
				taro.physics.createBody(wall, {
					type: 'static',
					linearDamping: 0,
					angularDamping: 0,
					allowSleep: true,
					fixtures: [{
						friction: 0.1,
						restitution: 0,
						shape: {
							type: 'rectangle'
						},
						filter: {
							filterCategoryBits: 0x0001, // i am
							filterMaskBits: 0x0002 /*| 0x0004*/ | 0x0008 | 0x0010 | 0x0020 // i collide with everything except with each other (walls)
						},
						taroId: wall.id()
					}]
				});
				if (taro.isServer) {
					taro.server.totalWallsCreated++;
				}
			}
		} else {
			PhysicsComponent.prototype.log('Cannot extract box2d static bodies from map data because passed map does not have a .map property!', 'error');
		}
	},

	destroyWalls: function () {
		this.walls.forEach(wall => {
			this.destroyBody(wall);
		});
	},

	/**
	 * Creates a contact listener with the specified callbacks. When
	 * contacts begin and end inside the box2d simulation the specified
	 * callbacks are fired.
	 * @param {Function} beginContactCallback The method to call when the contact listener detects contact has started.
	 * @param {Function} endContactCallback The method to call when the contact listener detects contact has ended.
	 * @param {Function} preSolve
	 * @param {Function} postSolve
	 */
	contactListener: function (beginContactCallback, endContactCallback, preSolve, postSolve) {
		dists[this.engine].contactListener(this, beginContactCallback, endContactCallback, preSolve, postSolve);
	},

	/**
	 * If enabled, sets the physics world into network debug mode which
	 * will stop the world from generating collisions but still allow us
	 * to see shape outlines as they are attached to bodies. Useful when
	 * your physics system is server-side but seeing client-side shape
	 * data is useful for debugging collisions.
	 * @param {Boolean} val
	 */
	networkDebugMode: function (val) {
		if (val !== undefined) {
			this._networkDebugMode = val;

			if (val === true) {
				// We are enabled so disable all physics contacts
				this.contactListener(
					// Begin contact
					function (contact) { },
					// End contact
					function (contact) { },
					// Pre-solve
					function (contact) {
						// Cancel the contact
						contact.SetEnabled(false);
					},
					// Post-solve
					function (contact) { }
				);
			} else {
				// Re-enable contacts
				this.contactListener();
			}

			return this._entity;
		}

		return this._networkDebugMode;
	},

	/**
	 * Creates a debug entity that outputs the bounds of each box2d
	 * body during standard engine ticks.
	 * @param {TaroEntity} mountScene
	 */
	enableDebug: function (mountScene) {
		if (this.engine == 'PLANCK' || this.engine == 'CRASH') return; // planck doesn't support debugdraw
		if (mountScene) {
			// Define the debug drawing instance
			var debugDraw = new this.b2DebugDraw();
			this._box2dDebug = true;

			debugDraw.SetSprite(taro._ctx);
			debugDraw.SetDrawScale(this._scaleRatio);
			debugDraw.SetFillAlpha(0.3);
			debugDraw.SetLineThickness(1.0);
			debugDraw.SetFlags(
				this.b2DebugDraw.e_controllerBit |
				this.b2DebugDraw.e_jointBit |
				this.b2DebugDraw.e_pairBit |
				this.b2DebugDraw.e_shapeBit
				// | this.b2DebugDraw.e_aabbBit
				// | this.b2DebugDraw.e_centerOfMassBit
			);

			// Set the debug draw for the world
			this._world.SetDebugDraw(debugDraw);

			// Create the debug painter entity and mount
			// it to the passed scene
			new taroClassStore.TaroBox2dDebugPainter(this._entity)
				.depth(40000) // Set a really high depth
				.drawBounds(false)
				.mount(mountScene);
		} else {
			PhysicsComponent.prototype.log('Cannot enable box2d debug drawing because the passed argument is not an object on the scenegraph.', 'error');
		}
	},

	// *
	//  * Instantly move a body to an absolute position subverting the physics simulation
	//  * @param body

	// moveBody: function(body, x, y)
	// {
	// 	body.SetTransform(b2Vec2(x,y),body.GetAngle())
	// },

	/**
	 * Gets / sets the callback method that will be called after
	 * every physics world step.
	 * @param method
	 * @return {*}
	 */
	updateCallback: function (method) {
		if (method !== undefined) {
			this._updateCallback = method;
			return this._entity;
		}

		return this._updateCallback;
	},

	start: function () {
		var self = this;

		if (!this._active) {
			this._active = true;

			if (!this._networkDebugMode) {
				if (this._mode === 0) {
					// Add the box2d behaviour to the taro
					// console.log('starting box2d', this._entity.id(), this._entity._category);
					this._entity.addBehaviour('box2dStep', this._behaviour);
				} else {
					// this._intervalTimer = setInterval(this._behaviour, 1000 / 60);
					console.log('b2d start');
					// this._intervalTimer = setInterval(this._behaviour, taro._tickDelta);
				}
			}
		}

		if (taro.isServer || (taro.isClient && taro.physics)) {
			self._enableContactListener();
		}
	},

	stop: function () {
		if (this._active) {
			this._active = false;

			if (this._mode === 0) {
				// Add the box2d behaviour to the taro
				this._entity.removeBehaviour('box2dStep');
				if (taro.isClient) {
					clearInterval(this._intervalTimer);
				}
			} else {
				// clearInterval(this._intervalTimer);
			}
		}
	},

	queueAction: function (action) {
		// PhysicsComponent.prototype.log("queueAction: "+action.type);
		this._actionQueue.push(action);
	},

	update: function (timeElapsedSinceLastStep) {
		var self = this;
		var tempBod;
		var entity;
		let now = Date.now();

		if (self && self._active && self._world) {
			var queueSize = 0;
			if (!self._world.isLocked()) {
				while (self._actionQueue.length > 0) {
					var action = self._actionQueue.shift();
					queueSize++;
					if (queueSize > 1000) {
						taro.devLog(`PhysicsComponent.js _behaviour queue looped over 1000 times. Currently processing action: ${action.type}`);
					}

					// console.log(action.type, "entity:", action.entity != null, (action.entity != null)?action.entity._category + " " + action.entity._stats.name:"null", " entityA:",  action.entityA != null, (action.entityA != null)?action.entityA._category + " " +action.entityA._stats.name:"null", " entityB:",  action.entityB != null, (action.entityB != null)?action.entityB._category + " " +action.entityB._stats.name:"null")
					switch (action.type) {
						case 'createBody':
							self.createBody(action.entity, action.def);
							break;

						case 'destroyBody':
							self.destroyBody(action.entity);
							break;

						case 'createJoint':
							self.createJoint(action.entityA, action.entityB, action.anchorA, action.anchorB);
							break;

						case 'destroyJoint':
							self.destroyJoint(action.entityA, action.entityB);
							break;
					}
				}
			}

			let timeStart = now;

			// Loop the physics objects and move the entities they are assigned to
			if (self.engine == 'crash') { // crash's engine step happens in dist.js
				self._world.step(timeElapsedSinceLastStep);
			} else {
				var tempBod = self._world.getBodyList();

				// iterate through every physics body
				while (tempBod && typeof tempBod.getNext === 'function' && (!self.getPointer || self.getPointer(tempBod) !== self.getPointer(self.nullPtr))) {
					// Check if the body is awake && not static
					if (tempBod.m_type !== 'static' && tempBod.isAwake() && (!tempBod.GetType || tempBod.GetType() !== 0)) {
						entity = tempBod._entity;

						if (entity) {

							var mxfp = dists[taro.physics.engine].getmxfp(tempBod);
							var x = mxfp.x * taro.physics._scaleRatio;
							var y = mxfp.y * taro.physics._scaleRatio;

							// make projectile auto-rotate toward its path. ideal for arrows or rockets that should point toward its direction
							// if (entity._category == 'projectile' &&
							// 	entity._stats.currentBody && !entity._stats.currentBody.fixedRotation &&
							// 	tempBod.m_linearVelocity.y != 0 && tempBod.m_linearVelocity.x != 0
							// ) {
							// 	var angle = Math.atan2(tempBod.m_linearVelocity.y, tempBod.m_linearVelocity.x) + Math.PI / 2;
							// } else {
							var angle = tempBod.getAngle();
							// }

							var tileWidth = taro.scaleMapDetails.tileWidth;
							var tileHeight = taro.scaleMapDetails.tileHeight;

							var skipBoundaryCheck = entity._stats && entity._stats.confinedWithinMapBoundaries === false;
							var padding = tileWidth / 2;

							// keep entities within the boundaries
							if (
								(entity._category === 'unit' || entity._category === 'item' || entity._category === 'projectile') &&
								!skipBoundaryCheck &&
								(
									x < padding || x > (taro.map.data.width * tileWidth) - padding ||
									y < padding || y > (taro.map.data.height * tileHeight) - padding
								)
							) {
								// fire 'touchesWall' trigger when unit goes out of bounds for the first time
								if (!entity.isOutOfBounds) {
									if (entity._category === 'unit' || entity._category === 'item' || entity._category === 'projectile') {
										entity.script.trigger('entityTouchesWall');
									}

									if (entity._category === 'unit') {
										// console.log("unitTouchesWall", entity.id());
										taro.script.trigger('unitTouchesWall', { unitId: entity.id() });
									} else if (entity._category === 'item') {
										taro.script.trigger('itemTouchesWall', { itemId: entity.id() });
									} else if (entity._category === 'projectile') {
										taro.script.trigger('projectileTouchesWall', { projectileId: entity.id() });
									}

									entity.isOutOfBounds = true;
								}

								x = Math.max(Math.min(x, (taro.map.data.width * tileWidth) - padding), padding);
								y = Math.max(Math.min(y, (taro.map.data.height * tileHeight) - padding), padding);
							} else {
								if (entity.isOutOfBounds) {
									entity.isOutOfBounds = false;
								}
							}
							
							// entity just has teleported

							if (entity.teleportDestination != undefined && entity.isTeleporting) {
								entity.nextKeyFrame[1] = entity.teleportDestination;
								x = entity.teleportDestination[0];
								y = entity.teleportDestination[1];
								angle = entity.teleportDestination[2];
								entity.teleportDestination = undefined;
							} else {
								if (taro.isServer) {
									entity.translateTo(x, y, 0);
									entity.rotateTo(0, 0, angle);
									
									this.lastX = x;
								} else if (taro.isClient) {

									// if CSP is enabled, client-side physics will dictate:
									// my unit's position and projectiles that are NOT server-streamed.
									if (
										(taro.game.cspEnabled && entity == taro.client.selectedUnit) ||
										(entity._category == 'projectile' && !entity._stats.streamMode)
									) {
										// CSP reconciliation
										if (entity == taro.client.selectedUnit && (
											!entity.isTeleporting &&
											entity.reconRemaining && 
												!isNaN(entity.reconRemaining.x) && 
												!isNaN(entity.reconRemaining.y)
											)
										) {

											var xRemaining = entity.reconRemaining.x
											var yRemaining = entity.reconRemaining.y

											
											// if the current reconcilie distance is greater than my unit's body dimention, 
											// instantly move unit (teleport) to the last streamed position. Otherwise, gradually reconcile
											if (Math.abs(xRemaining) > entity._stats.currentBody.width * 1.5 || 
												Math.abs(yRemaining) > entity._stats.currentBody.height * 1.5
											) {
												x = taro.client.myUnitStreamedPosition.x
												y = taro.client.myUnitStreamedPosition.y
												
												// x += xRemaining;
												// y += yRemaining;
												
												entity.reconRemaining = undefined;
												// taro.client.sendNextPingAt = taro.now + 200;
												// console.log("instant reconciliation to ", x, y, taro.client.myUnitPositionWhenPingSent)
												// entity._translate = {x: x, y: y}
											} else {
												entity.reconRemaining.x = xRemaining/(taro._physicsTickRate/15);
												entity.reconRemaining.y = yRemaining/(taro._physicsTickRate/15);

												x += entity.reconRemaining.x
												y += entity.reconRemaining.y
											}
										} 

										entity.nextKeyFrame = [taro._currentTime + taro.client.renderBuffer, [x, y, angle]];
									} else { // update server-streamed entities' body position
										x = entity.nextKeyFrame[1][0];
										y = entity.nextKeyFrame[1][1];
										angle = entity.nextKeyFrame[1][2];
									}
									
									entity.isTransforming(true);
								}
							}

							if (!isNaN(x) && !isNaN(y)) {
								entity.body.setPosition({ x: x / entity._b2dRef._scaleRatio, y: y / entity._b2dRef._scaleRatio });
								entity.body.setAngle(angle);
							}

							if (tempBod.asleep) {
								// The tempBod was asleep last frame, fire an awake event
								tempBod.asleep = false;
								taro.physics.emit('afterAwake', entity);
							}
						} else {
							if (!tempBod.asleep) {
								// The tempBod was awake last frame, fire an asleep event
								tempBod.asleep = true;
								taro.physics.emit('afterAsleep', entity);
							}
						}
					}

					tempBod = tempBod.getNext();
				}


				taro._physicsFrames++;

				// Clear forces because we have ended our physics simulation frame
				self._world.clearForces();

				// Call the world step; frame-rate, velocity iterations, position iterations
				self._world.step(timeElapsedSinceLastStep / 1000, 8, 3); 
				if (self.ctx) {
					self.ctx.clear();
					self._world.DebugDraw();
				}

				
				
				// get stats for dev panel
				var timeEnd = Date.now();
				self.physicsTickDuration += timeEnd - timeStart;
				if (timeEnd - self.lastSecondAt > 1000) {
					self.lastSecondAt = timeEnd;
					self.avgPhysicsTickDuration = self.physicsTickDuration / taro._fpsRate;
					self.totalDisplacement = 0;
					self.totalTimeElapsed = 0;
					self.physicsTickDuration = 0;
				}
			}

			if (typeof (self._updateCallback) === 'function') {
				self._updateCallback();
			}
		}
	},

	destroy: function () {
		// Stop processing box2d steps
		this._entity.removeBehaviour('box2dStep');
		if (taro.isClient) {
			clearInterval(this._intervalTimer);
		}
		// Destroy all box2d world bodies
	},

	_triggerContactEvent: function (entityA, entityB) {
		var triggeredBy = {}

		if (!['unit', 'projectile', 'item'].includes(entityA._category)) {
			return;
		}

		switch (entityA._category) {
			case 'unit':
				triggeredBy.unitId = entityA.id();
				taro.game.lastTouchingUnitId = entityA.id();
				break;
			case 'item':
				triggeredBy.itemId = entityA.id();
				break;
			case 'projectile':
				triggeredBy.projectileId = entityA.id();
				break;
		}

		switch (entityB._category) {
			case 'unit':
				taro.game.lastTouchedUnitId = entityB.id();
				taro.script.trigger(entityA._category + 'TouchesUnit', triggeredBy); // handle unitA touching unitB
				triggeredBy.unitId = entityB.id();
				entityA.script.trigger("entityTouchesUnit", triggeredBy);
				break;

			case 'item':
				triggeredBy.itemId = triggeredBy.itemId || entityB.id();
				taro.script.trigger(entityA._category + 'TouchesItem', triggeredBy);
				triggeredBy.itemId = entityB.id();
				taro.game.lastTouchedItemId = entityB.id();
				entityA.script.trigger("entityTouchesItem", triggeredBy);
				break;
			case 'projectile':
				triggeredBy.projectileId = triggeredBy.projectileId || entityB.id();
				triggeredBy.collidingEntity = entityA.id();

				// built-in damaging system. it's important that this runs prior to trigger events
				// this projectile may be destroyed before inflicting damage
				if (entityA._category == 'unit') {
					entityA.inflictDamage(entityB._stats.damageData);
				}

				taro.script.trigger(entityA._category + 'TouchesProjectile', triggeredBy);
				triggeredBy.projectileId = entityB.id();
				entityA.script.trigger("entityTouchesProjectile", triggeredBy);
				break;

			case 'region':
				var region = taro.script.variable.getValue({
					function: 'getVariable',
					variableName: entityB._stats.id
				});
				triggeredBy.region = region;
				entityA.script.trigger("entityEntersRegion", triggeredBy);
				taro.script.trigger(entityA._category + 'EntersRegion', triggeredBy);
				break;

			case 'sensor':
				triggeredBy.sensorId = entityB.id();
				var sensoringUnit = entityB.getOwnerUnit();
				if (sensoringUnit && sensoringUnit.script) {
					sensoringUnit.script.trigger(entityA._category + 'EntersSensor', triggeredBy);

					if (entityA._category == 'unit' && sensoringUnit.ai) {
						sensoringUnit.ai.registerSensorDetection(entityA);
					}

					entityA.script.trigger("thisEntityEntersUnitsSensor");
					entityB.script.trigger("thisUnitsSensorActivated");
				}

				break;

			case undefined:
			case 'wall':
				taro.script.trigger(entityA._category + 'TouchesWall', triggeredBy);
				entityA.script.trigger("entityTouchesWall");
				break;
		}
	},

	_triggerLeaveEvent: function (entityA, entityB) {
		var triggeredBy = {};

		if (!['unit', 'projectile', 'item'].includes(entityA._category)) {
			return;
		};

		switch (entityA._category) {
			case 'unit':
				triggeredBy.unitId = entityA.id();
				break;
			case 'item':
				triggeredBy.itemId = entityA.id();
				break;
			case 'projectile':
				triggeredBy.projectileId = entityA.id();
				break;
		};

		switch (entityB._category) {
			case 'region':
				var region = taro.script.variable.getValue({
					function: 'getVariable',
					variableName: entityB._stats.id
				});
				triggeredBy.region = region;
				entityA.script.trigger("entityLeavesRegion", triggeredBy);
				taro.script.trigger(entityA._category + 'LeavesRegion', triggeredBy);
				break;

			case 'sensor':
				triggeredBy.sensorId = entityB.id();
				var sensoringUnit = entityB.getOwnerUnit();
				if (sensoringUnit && sensoringUnit.script) {
					sensoringUnit.script.trigger(entityA._category + 'LeavesSensor', triggeredBy);
				};
				break;

			case undefined:
		};
	},

	// Listen for when contact's begin
	_beginContactCallback: function (contact) {
		if (taro.physics.engine === 'BOX2DWASM') {
			const nowContact = taro.physics.wrapPointer(contact, taro.physics.b2Contact);
			var entityA = nowContact.GetFixtureA().GetBody()._entity;
			var entityB = nowContact.GetFixtureB().GetBody()._entity;
			if (!entityA || !entityB)
				return;

			taro.physics._triggerContactEvent(entityA, entityB);
			taro.physics._triggerContactEvent(entityB, entityA);
		} else {
			var entityA = contact.m_fixtureA.m_body._entity;
			var entityB = contact.m_fixtureB.m_body._entity;

			if (!entityA || !entityB)
				return;

			taro.physics._triggerContactEvent(entityA, entityB);
			taro.physics._triggerContactEvent(entityB, entityA);
		}

	},

	_endContactCallback: function (contact) {
		if (taro.physics.engine === 'BOX2DWASM') {
			const nowContact = taro.physics.wrapPointer(contact, taro.physics.b2Contact);
			var entityA = nowContact.GetFixtureA().GetBody()._entity;
			var entityB = nowContact.GetFixtureB().GetBody()._entity;

			if (!entityA || !entityB)
				return;

			taro.physics._triggerLeaveEvent(entityA, entityB);
			taro.physics._triggerLeaveEvent(entityB, entityA);
		} else {
			var entityA = contact.m_fixtureA.m_body._entity;
			var entityB = contact.m_fixtureB.m_body._entity;

			if (!entityA || !entityB)
				return;

			taro.physics._triggerLeaveEvent(entityA, entityB);
			taro.physics._triggerLeaveEvent(entityB, entityA);
		}
	},

	_enableContactListener: function () {
		// Set the contact listener methods to detect when
		// contacts (collisions) begin and end
		taro.physics.contactListener(this._beginContactCallback, this._endContactCallback);
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = PhysicsComponent; }
