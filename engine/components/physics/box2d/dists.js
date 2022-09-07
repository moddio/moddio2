var dists = {
	// current: 'box2dts',
	// current: 'planck',
	// current: 'box2dweb',
	// current: 'box2D',
	// current: 'native',
	// current: 'matterjs',
	defaultEngine: 'PLANCK',

	/**
	 * NOTE:
	 * use keys as capital letters as obfuscating replaces lowercase keys
	 * which in result cause client unable to load any physic engine.
	 */

	PLANCK: {
		init: function (component) {
			// component.b2Color = planck.Common.b2Color;
			component.b2Vec2 = planck.Vec2;
			component.b2AABB = planck.AABB; // added by Jaeyun for world collision detection for raycast bullets
			component.b2Math = planck.Math;
			component.b2Shape = planck.Shape;
			component.b2Body = planck.Body;
			component.b2Fixture = planck.Fixture;
			component.b2World = planck.World;
			component.b2PolygonShape = planck.Polygon;
			component.b2CircleShape = planck.Circle;
			// component.b2DebugDraw = planck.DebugDraw; // DebugDraw doesn't exist in planckjs

			component.createWorld = function (id, options) {
				component._world = new component.b2World(this._gravity, this._sleep);
				component._world.setContinuousPhysics(false);
			};

			/**
			 * Gets / sets the gravity vector.
			 * @param x
			 * @param y
			 * @return {*}
			 */
			component.gravity = function (x, y) {
				if (x !== undefined && y !== undefined) {
					this._gravity = new this.b2Vec2(x, y);
					return this._entity;
				}

				return this._gravity;
			};

			component._sleep = true;
			component._gravity = new component.b2Vec2(0, 0);
		},

		getmxfp: function (body) {
			return body.m_xf.p;
		},

		queryAABB: function (self, aabb, callback) {
			self.world().queryAABB(aabb, callback);
		},

		createBody: function (self, entity, body, isLossTolerant) {
			PhysicsComponent.prototype.log(`createBody of ${entity._stats.name}`);

			// immediately destroy body if entity already has box2dBody
			if (!entity) {
				PhysicsComponent.prototype.log('warning: creating body for non-existent entity');
				return;
			}

			// if there's already a body, destroy it first
			if (entity.body) {
				PhysicsComponent.prototype.log('body already exists, destroying body');
				self.destroyBody(entity);
			}

			var tempDef = {};
			var param;
			var tempBod;
			var fixtureDef;
			var finalFixture;
			var tempShape;
			var tempFilterData;
			var i;
			var finalX; var finalY;
			var finalWidth; var finalHeight;

			// Add the parameters of the body to the new body instance
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'type':
						case 'gravitic':
						case 'fixedRotation':
						case 'fixtures':
							// Ignore these for now, we process them
							// below as post-creation attributes
							break;

						default:
							tempDef[param] = body[param];
							break;
					}
				}
			}

			tempDef.type = body.type;

			// set rotation
			tempDef.angle = entity._rotate.z;
			// Set the position
			tempDef.position = new self.b2Vec2(entity._translate.x / self._scaleRatio, entity._translate.y / self._scaleRatio);

			// Create the new body
			tempBod = self._world.createBody(tempDef, undefined, isLossTolerant);

			// Now apply any post-creation attributes we need to
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'gravitic':
							if (!body.gravitic) {
								tempBod.m_nonGravitic = true;
							}
							break;

						case 'fixedRotation':
							if (body.fixedRotation) {
								tempBod.setFixedRotation(true);
							} else if (entity._rotate.z) {
								// rotate body to previous body's angle
								tempBod.setAngle(entity._rotate.z);
							}
							break;

						case 'fixtures':
							if (body.fixtures && body.fixtures.length) {
								for (i = 0; i < body.fixtures.length; i++) {
									// Grab the fixture definition
									fixtureDef = body.fixtures[i];

									// Check for a shape definition for the fixture
									if (fixtureDef.shape) {
										// Create based on the shape type
										switch (fixtureDef.shape.type) {
											case 'circle':
												tempShape = new self.b2CircleShape();
												if (fixtureDef.shape.data && typeof (fixtureDef.shape.data.radius) !== 'undefined') {
													tempShape.m_radius = (fixtureDef.shape.data.radius / self._scaleRatio);
												} else {
													tempShape.m_radius = ((entity._bounds2d.x / self._scaleRatio) / 2);
												}

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;

													tempShape.m_p = (new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio));
												}
												break;

											case 'polygon':
												tempShape = new self.b2PolygonShape();
												tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
												break;

											case 'rectangle':
												tempShape = new self.b2PolygonShape();

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
													finalWidth = fixtureDef.shape.data.width !== undefined ? fixtureDef.shape.data.width : (entity._bounds2d.x / 2);
													finalHeight = fixtureDef.shape.data.height !== undefined ? fixtureDef.shape.data.height : (entity._bounds2d.y / 2);
												} else {
													finalX = 0;
													finalY = 0;
													finalWidth = (entity._bounds2d.x / 2);
													finalHeight = (entity._bounds2d.y / 2);
												}

												// Set the polygon as a box
												tempShape._setAsBox(
													(finalWidth / self._scaleRatio),
													(finalHeight / self._scaleRatio),
													new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio),
													0
												);
												break;
										}

										if (tempShape && fixtureDef.filter) {
											var fd = {};

											fd.friction = fixtureDef.friction;
											fd.restitution = fixtureDef.restitution;
											fd.density = fixtureDef.density;
											fd.isSensor = fixtureDef.isSensor;
											fd.filterGroupIndex = fixtureDef.filter.filterGroupIndex;
											fd.filterCategoryBits = fixtureDef.filter.filterCategoryBits;
											fd.filterMaskBits = fixtureDef.filter.filterMaskBits;

											finalFixture = tempBod.createFixture(tempShape, fd, isLossTolerant);
											finalFixture.igeId = fixtureDef.igeId;
										}
									}
								}
							} else {
								PhysicsComponent.prototype.log('Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture objects.', 'warning');
							}
							break;
					}
				}
			}

			// Store the entity that is linked to self body
			tempBod._entity = entity;

			// Add the body to the world with the passed fixture
			entity.body = tempBod;

			entity.gravitic(!!body.affectedByGravity);
			// rotate body to its previous value
			entity.rotateTo(0, 0, entity._rotate.z);

			PhysicsComponent.prototype.log(`successfully created body for ${entity.id()} ${entity._category} ${entity._stats.name} ${entity._stats.type}`);

			return tempBod;
		},

		createJoint: function (self, entityA, entityB, anchorA, anchorB) {
			// if joint type none do nothing
			var aBody = entityA._stats.currentBody;
			var bBody = entityB._stats.currentBody;

			if (!aBody || aBody.jointType == 'none' || aBody.type == 'none') return;
			// create a joint only if there isn't pre-existing joint
			// console.log("creating joint between "+entityA._stats.name+ " and " + entityB._stats.name)
			if (
				entityA && entityA.body && entityB && entityB.body && // make sure both entities have bodies
				entityA.id() != entityB.id() // im not creating joint to myself!
			) {
				if (aBody.jointType == 'revoluteJoint' && anchorA && anchorB) {
					var localAnchorA = planck.Vec2(anchorA.x / aBody.width, anchorA.y / aBody.height);
					var localAnchorB = planck.Vec2(anchorB.x / bBody.width, anchorB.y / bBody.height);

					// we have to divide the localAnchors by self._tilesizeRatio because the effect of
					// 0,1 on 64x64 tilesize in anchor is equal to
					// 0,0.5 on 32x32 tilesized map or
					// 0,0.25 on 16x16 tilesized map

					localAnchorA.x = localAnchorA.x / self._scaleRatio;
					localAnchorA.y = localAnchorA.y / self._scaleRatio;
					localAnchorB.x = localAnchorB.x / self._scaleRatio;
					localAnchorB.y = localAnchorB.y / self._scaleRatio;

					var joint_def = planck.RevoluteJoint(
						{
							// lowerAngle: aBody.itemAnchor.lowerAngle * 0.0174533, // degree to rad
							// upperAngle: aBody.itemAnchor.upperAngle * 0.0174533, // degree to rad
							// enableLimit: true,
							localAnchorA: localAnchorA,
							localAnchorB: localAnchorB
						},
						entityA.body,
						entityB.body
					);
				} else // weld joint
				{
					var joint_def = planck.WeldJoint(
						{
							frequencyHz: 0, // The mass-spring-damper frequency in Hertz. Rotation only. Disable softness with a value of 0.
							dampingRatio: 0 // The damping ratio. 0 = no damping, 1 = critical damping
						},
						entityA.body,
						entityB.body,
						entityA.body.getWorldCenter()
					);
				}

				var joint = self._world.createJoint(joint_def); // joint between two pieces

				// console.log("joint created "+ aBody.jointType)

				entityA.jointsAttached[entityB.id()] = joint;
				entityB.jointsAttached[entityA.id()] = joint;
			} else {
				// console.log("joint cannot be created: one or more bodies missing")
			}
		},

		contactListener: function (self, beginContactCallback, endContactCallback, preSolve, postSolve) {
			if (beginContactCallback) {
				self._world.on('begin-contact', function (contact, oldManifold) {
					beginContactCallback(contact);
				});
			}

			if (endContactCallback) {
				self._world.on('end-contact', function (contact, oldManifold) {
					endContactCallback(contact);
				});
			}

			if (preSolve) {
				self._world.on('pre-solve', function (contact, oldManifold) {
					preSolve(contact);
				});
			}

			if (postSolve) {
				self._world.on('post-solve', function (contact, oldManifold) {
					postSolve(contact);
				});
			}
		}
	},

	BOX2DWEB: {
		init: function (component) {
			component.b2AABB = box2dweb.Collision.b2AABB; // added by Jaeyun for world collision detection for raycast bullets
			component.b2Color = box2dweb.Common.b2Color;
			component.b2Vec2 = box2dweb.Common.Math.b2Vec2;
			component.b2Math = box2dweb.Common.Math.b2Math;
			component.b2Shape = box2dweb.Collision.Shapes.b2Shape;
			component.b2BodyDef = box2dweb.Dynamics.b2BodyDef;
			component.b2Body = box2dweb.Dynamics.b2Body;
			component.b2Joint = box2dweb.Dynamics.Joints.b2Joint;
			component.b2FixtureDef = box2dweb.Dynamics.b2FixtureDef;
			component.b2Fixture = box2dweb.Dynamics.b2Fixture;
			component.b2World = box2dweb.Dynamics.b2World;
			component.b2MassData = box2dweb.Collision.Shapes.b2MassData;
			component.b2PolygonShape = box2dweb.Collision.Shapes.b2PolygonShape;
			component.b2CircleShape = box2dweb.Collision.Shapes.b2CircleShape;
			component.b2DebugDraw = box2dweb.Dynamics.b2DebugDraw;
			component.b2ContactListener = box2dweb.Dynamics.b2ContactListener;
			component.b2Distance = box2dweb.Collision.b2Distance;
			component.b2FilterData = box2dweb.Dynamics.b2FilterData;
			component.b2DistanceJointDef = box2dweb.Dynamics.Joints.b2DistanceJointDef;

			// aliases for camelcase
			component.b2World.prototype.isLocked = component.b2World.prototype.IsLocked;
			component.b2World.prototype.createBody = component.b2World.prototype.CreateBody;
			component.b2World.prototype.destroyBody = component.b2World.prototype.DestroyBody;
			// component.b2World.prototype.createJoint = component.b2World.prototype.CreateJoint;
			component.b2World.prototype.destroyJoint = component.b2World.prototype.DestroyJoint;
			component.b2World.prototype.createFixture = component.b2World.prototype.CreateFixture;
			component.b2World.prototype.clearForces = component.b2World.prototype.ClearForces;
			component.b2World.prototype.getBodyList = component.b2World.prototype.GetBodyList;
			component.b2World.prototype.getJointList = component.b2World.prototype.GetJointList;
			component.b2World.prototype.getFixtureList = component.b2World.prototype.GetFixtureList;
			component.b2World.prototype.step = component.b2World.prototype.Step;
			component.b2World.prototype.rayCast = component.b2World.prototype.RayCast;

			// signature is backwards!
			/*
			component.b2World.prototype.queryAABB = function(aabb, queryCallback){
				return component.b2World.prototype.QueryAABB(queryCallback,aabb);
			}
			*/

			component.b2Body.prototype.getNext = component.b2Body.prototype.GetNext;
			component.b2Body.prototype.getAngle = component.b2Body.prototype.GetAngle;
			component.b2Body.prototype.setPosition = component.b2Body.prototype.SetPosition;
			component.b2Body.prototype.getPosition = component.b2Body.prototype.GetPosition;
			component.b2Body.prototype.setGravityScale = component.b2Body.prototype.SetGravityScale;
			component.b2Body.prototype.setAngle = component.b2Body.prototype.SetAngle;
			component.b2Body.prototype.setTransform = component.b2Body.prototype.SetTransform;
			component.b2Body.prototype.isAwake = component.b2Body.prototype.IsAwake;
			component.b2Body.prototype.setAwake = component.b2Body.prototype.SetAwake;
			component.b2Body.prototype.setLinearVelocity = component.b2Body.prototype.SetLinearVelocity;
			component.b2Body.prototype.getLinearVelocity = component.b2Body.prototype.GetLinearVelocity;
			component.b2Body.prototype.applyLinearImpulse = component.b2Body.prototype.ApplyImpulse;
			component.b2Body.prototype.applyTorque = component.b2Body.prototype.ApplyTorque;

			component.b2Body.prototype.getWorldCenter = component.b2Body.prototype.GetWorldCenter;
			component.b2Body.prototype.applyForce = component.b2Body.prototype.ApplyForce;
			component.b2Vec2.prototype.set = component.b2Vec2.prototype.Set;
			// component.b2Vec2.prototype.setV = component.b2Vec2.prototype.SetV;

			component.b2Joint.prototype.getNext = component.b2Joint.prototype.GetNext;

			component.createWorld = function (id, options) {
				component._world = new component.b2World(this._gravity, this._sleep);
			};

			/**
			 * Gets / sets the gravity vector.
			 * @param x
			 * @param y
			 * @return {*}
			 */
			component.gravity = function (x, y) {
				if (x !== undefined && y !== undefined) {
					this._gravity = new this.b2Vec2(x, y);
					return this._entity;
				}

				return this._gravity;
			};
			component._sleep = true;
			component._gravity = new component.b2Vec2(0, 0);
		},

		contactListener: function (self, beginContactCallback, endContactCallback, preSolve, postSolve) {
			var contactListener = new self.b2ContactListener();
			if (beginContactCallback !== undefined) {
				contactListener.BeginContact = beginContactCallback;
			}

			if (endContactCallback !== undefined) {
				contactListener.EndContact = endContactCallback;
			}

			if (preSolve !== undefined) {
				contactListener.PreSolve = preSolve;
			}

			if (postSolve !== undefined) {
				contactListener.PostSolve = postSolve;
			}
			self._world.SetContactListener(contactListener);
		},

		getmxfp: function (body) {
			return body.m_xf.position;
		},

		queryAABB: function (self, aabb, callback) {
			self.world().QueryAABB(callback, aabb);
		},

		createBody: function (self, entity, body, isLossTolerant) {
			PhysicsComponent.prototype.log(`createBody of ${entity._stats.name}`);

			// immediately destroy body if entity already has box2dBody
			if (!entity) {
				PhysicsComponent.prototype.log('warning: creating body for non-existent entity');
				return;
			}

			// if there's already a body, destroy it first
			if (entity.body) {
				self.destroyBody(entity);
			}
			var tempDef = new self.b2BodyDef();
			var param;
			var tempBod;
			var fixtureDef;
			var tempFixture;
			var finalFixture;
			var tempShape;
			var tempFilterData;
			var i;
			var finalX; var finalY;
			var finalWidth; var finalHeight;

			// Process body definition and create a box2d body for it
			switch (body.type) {
				case 'static':
					tempDef.type = self.b2Body.b2_staticBody;
					break;

				case 'dynamic':
					tempDef.type = self.b2Body.b2_dynamicBody;
					break;

				case 'kinematic':
					tempDef.type = self.b2Body.b2_kinematicBody;
					break;
			}

			// Add the parameters of the body to the new body instance
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'type':
						case 'gravitic':
						case 'fixedRotation':
						case 'fixtures':
							// Ignore these for now, we process them
							// below as post-creation attributes
							break;

						default:
							tempDef[param] = body[param];
							break;
					}
				}
			}

			// set rotation
			tempDef.angle = entity._rotate.z;
			// Set the position
			tempDef.position = new self.b2Vec2(entity._translate.x / self._scaleRatio, entity._translate.y / self._scaleRatio);

			// Create the new body
			tempBod = self._world.CreateBody(tempDef, isLossTolerant);

			// Now apply any post-creation attributes we need to
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'gravitic':
							if (!body.gravitic) {
								tempBod.m_nonGravitic = true;
							}
							break;

						case 'fixedRotation':
							if (body.fixedRotation) {
								tempBod.SetFixedRotation(true);
							}
							break;

						case 'fixtures':
							if (body.fixtures && body.fixtures.length) {
								for (i = 0; i < body.fixtures.length; i++) {
									// Grab the fixture definition
									fixtureDef = body.fixtures[i];

									// Create the fixture
									tempFixture = self.createFixture(fixtureDef);
									tempFixture.igeId = fixtureDef.igeId;

									// Check for a shape definition for the fixture
									if (fixtureDef.shape) {
										// Create based on the shape type
										switch (fixtureDef.shape.type) {
											case 'circle':
												tempShape = new self.b2CircleShape();
												if (fixtureDef.shape.data && typeof (fixtureDef.shape.data.radius) !== 'undefined') {
													tempShape.SetRadius(fixtureDef.shape.data.radius / self._scaleRatio);
												} else {
													tempShape.SetRadius((entity._bounds2d.x / self._scaleRatio) / 2);
												}

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;

													tempShape.SetLocalPosition(new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio));
												}
												break;

											case 'polygon':
												tempShape = new self.b2PolygonShape();
												tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
												break;

											case 'rectangle':
												tempShape = new self.b2PolygonShape();

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
													finalWidth = fixtureDef.shape.data.width !== undefined ? fixtureDef.shape.data.width : (entity._bounds2d.x / 2);
													finalHeight = fixtureDef.shape.data.height !== undefined ? fixtureDef.shape.data.height : (entity._bounds2d.y / 2);
												} else {
													finalX = 0;
													finalY = 0;
													finalWidth = (entity._bounds2d.x / 2);
													finalHeight = (entity._bounds2d.y / 2);
												}

												// Set the polygon as a box
												tempShape.SetAsOrientedBox(
													(finalWidth / self._scaleRatio),
													(finalHeight / self._scaleRatio),
													new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio),
													0
												);
												break;
										}

										if (tempShape && fixtureDef.filter) {
											tempFixture.shape = tempShape;
											finalFixture = tempBod.CreateFixture(tempFixture, isLossTolerant);
											finalFixture.igeId = tempFixture.igeId;
										}
									}

									if (fixtureDef.filter && finalFixture) {
										tempFilterData = new self._entity.physics.b2FilterData();

										if (fixtureDef.filter.filterCategoryBits !== undefined) {
											tempFilterData.categoryBits = fixtureDef.filter.filterCategoryBits;
										}
										if (fixtureDef.filter.filterMaskBits !== undefined) {
											tempFilterData.maskBits = fixtureDef.filter.filterMaskBits;
										}
										if (fixtureDef.filter.categoryIndex !== undefined) {
											tempFilterData.categoryIndex = fixtureDef.filter.categoryIndex;
										}

										finalFixture.SetFilterData(tempFilterData);
									}

									if (fixtureDef.friction !== undefined && finalFixture) {
										finalFixture.SetFriction(fixtureDef.friction);
									}
									if (fixtureDef.restitution !== undefined && finalFixture) {
										finalFixture.SetRestitution(fixtureDef.restitution);
									}
									if (fixtureDef.density !== undefined && finalFixture) {
										finalFixture.SetDensity(fixtureDef.density);
									}
									if (fixtureDef.isSensor !== undefined && finalFixture) {
										finalFixture.SetSensor(fixtureDef.isSensor);
									}
								}
							} else {
								self.log('Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture objects.', 'warning');
							}
							break;
					}
				}
			}

			// Store the entity that is linked to self body
			tempBod._entity = entity;

			// Add the body to the world with the passed fixture
			entity.body = tempBod;
			// rotate body to its previous value
			// console.log('box2dweb',entity._rotate.z)
			entity.rotateTo(0, 0, entity._rotate.z);
			// Add the body to the world with the passed fixture
			return tempBod;
		},

		createJoint: function (self, entityA, entityB, anchorA, anchorB) {
			// if joint type none do nothing
			var aBody = entityA._stats.currentBody;
			var bBody = entityB._stats.currentBody;

			if (!aBody || aBody.jointType == 'none' || aBody.type == 'none') return;

			// create a joint only if there isn't pre-existing joint
			PhysicsComponent.prototype.log(`creating ${aBody.jointType} joint between ${entityA._stats.name} and ${entityB._stats.name}`);

			if (
				entityA && entityA.body && entityB && entityB.body &&
				entityA.id() != entityB.id() // im not creating joint to myself!
			) {
				if (aBody.jointType == 'revoluteJoint') {
					var joint_def = new box2dweb.Dynamics.Joints.b2RevoluteJointDef();

					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityB.body.GetWorldCenter());

					// joint_def.enableLimit = true;
					// joint_def.lowerAngle = aBody.itemAnchor.lowerAngle * 0.0174533; // degree to rad
					// joint_def.upperAngle = aBody.itemAnchor.upperAngle * 0.0174533; // degree to rad

					joint_def.localAnchorA.Set(anchorA.x / self._scaleRatio, anchorA.y / self._scaleRatio); // item anchor
					joint_def.localAnchorB.Set(anchorB.x / self._scaleRatio, -anchorB.y / self._scaleRatio); // unit anchor
				} else // weld joint
				{
					var joint_def = new box2dweb.Dynamics.Joints.b2WeldJointDef();
					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter(),
						entityB.body.GetWorldCenter()
					);
				}

				var joint = self._world.CreateJoint(joint_def); // joint between two pieces

				// var serverStats = ige.server.getStatus()
				PhysicsComponent.prototype.log('joint created ', aBody.jointType);

				entityA.jointsAttached[entityB.id()] = joint;
				entityB.jointsAttached[entityA.id()] = joint;
			}
		}

	},

	BOX2DNINJA: {
		init: function (component) {
			component.b2AABB = box2dninja.Collision.b2AABB; // added by Jaeyun for world collision detection for raycast bullets
			component.b2Color = box2dninja.Common.b2Color;
			component.b2Vec2 = box2dninja.Common.Math.b2Vec2;
			component.b2Math = box2dninja.Common.Math.b2Math;
			component.b2Shape = box2dninja.Collision.Shapes.b2Shape;
			component.b2BodyDef = box2dninja.Dynamics.b2BodyDef;
			component.b2Body = box2dninja.Dynamics.b2Body;
			component.b2Joint = box2dninja.Dynamics.Joints.b2Joint;
			component.b2FixtureDef = box2dninja.Dynamics.b2FixtureDef;
			component.b2Fixture = box2dninja.Dynamics.b2Fixture;
			component.b2World = box2dninja.Dynamics.b2World;
			component.b2MassData = box2dninja.Collision.Shapes.b2MassData;
			component.b2PolygonShape = box2dninja.Collision.Shapes.b2PolygonShape;
			component.b2CircleShape = box2dninja.Collision.Shapes.b2CircleShape;
			component.b2DebugDraw = box2dninja.Dynamics.b2DebugDraw;
			component.b2ContactListener = box2dninja.Dynamics.b2ContactListener;
			component.b2Distance = box2dninja.Collision.b2Distance;
			component.b2FilterData = box2dninja.Dynamics.b2FilterData;
			component.b2DistanceJointDef = box2dninja.Dynamics.Joints.b2DistanceJointDef;

			// aliases for camelcase
			component.b2World.prototype.isLocked = component.b2World.prototype.IsLocked;
			component.b2World.prototype.createBody = component.b2World.prototype.CreateBody;
			component.b2World.prototype.destroyBody = component.b2World.prototype.DestroyBody;
			// component.b2World.prototype.createJoint = component.b2World.prototype.CreateJoint;
			component.b2World.prototype.destroyJoint = component.b2World.prototype.DestroyJoint;
			component.b2World.prototype.createFixture = component.b2World.prototype.CreateFixture;
			component.b2World.prototype.clearForces = component.b2World.prototype.ClearForces;
			component.b2World.prototype.getBodyList = component.b2World.prototype.GetBodyList;
			component.b2World.prototype.getJointList = component.b2World.prototype.GetJointList;
			component.b2World.prototype.getFixtureList = component.b2World.prototype.GetFixtureList;
			component.b2World.prototype.step = component.b2World.prototype.Step;
			component.b2World.prototype.rayCast = component.b2World.prototype.RayCast;

			// signature is backwards!
			/*
			component.b2World.prototype.queryAABB = function(aabb, queryCallback){
				return component.b2World.prototype.QueryAABB(queryCallback,aabb);
			}
			*/

			component.b2Body.prototype.getNext = component.b2Body.prototype.GetNext;
			component.b2Body.prototype.getAngle = component.b2Body.prototype.GetAngle;
			component.b2Body.prototype.setPosition = component.b2Body.prototype.SetPosition;
			component.b2Body.prototype.getPosition = component.b2Body.prototype.GetPosition;
			component.b2Body.prototype.setGravityScale = component.b2Body.prototype.SetGravityScale;
			component.b2Body.prototype.setAngle = component.b2Body.prototype.SetAngle;
			component.b2Body.prototype.setTransform = component.b2Body.prototype.SetTransform;
			component.b2Body.prototype.isAwake = component.b2Body.prototype.IsAwake;
			component.b2Body.prototype.setAwake = component.b2Body.prototype.SetAwake;
			component.b2Body.prototype.setLinearVelocity = component.b2Body.prototype.SetLinearVelocity;
			component.b2Body.prototype.getLinearVelocity = component.b2Body.prototype.GetLinearVelocity;
			component.b2Body.prototype.applyLinearImpulse = component.b2Body.prototype.ApplyLinearImpulse;
			component.b2Body.prototype.applyTorque = component.b2Body.prototype.ApplyTorque;

			component.b2Body.prototype.getWorldCenter = component.b2Body.prototype.GetWorldCenter;
			component.b2Body.prototype.applyForce = component.b2Body.prototype.ApplyForce;
			component.b2Vec2.prototype.set = component.b2Vec2.prototype.Set;
			// component.b2Vec2.prototype.setV = component.b2Vec2.prototype.SetV;

			component.b2Joint.prototype.getNext = component.b2Joint.prototype.GetNext;

			component.createWorld = function (id, options) {
				component._world = new component.b2World(this._gravity, this._sleep);
			};

			/**
			 * Gets / sets the gravity vector.
			 * @param x
			 * @param y
			 * @return {*}
			 */
			component.gravity = function (x, y) {
				if (x !== undefined && y !== undefined) {
					this._gravity = new this.b2Vec2(x, y);
					return this._entity;
				}

				return this._gravity;
			};
			component._sleep = true;
			component._gravity = new component.b2Vec2(0, 0);
		},

		contactListener: function (self, beginContactCallback, endContactCallback, preSolve, postSolve) {
			var contactListener = new self.b2ContactListener();
			if (beginContactCallback !== undefined) {
				contactListener.BeginContact = beginContactCallback;
			}

			if (endContactCallback !== undefined) {
				contactListener.EndContact = endContactCallback;
			}

			if (preSolve !== undefined) {
				contactListener.PreSolve = preSolve;
			}

			if (postSolve !== undefined) {
				contactListener.PostSolve = postSolve;
			}
			self._world.SetContactListener(contactListener);
		},

		getmxfp: function (body) {
			return body.m_xf.position;
		},

		queryAABB: function (self, aabb, callback) {
			self.world().QueryAABB(callback, aabb);
		},

		createBody: function (self, entity, body) {
			console.log('createBody', entity._category, body);
			PhysicsComponent.prototype.log(`createBody of ${entity._stats.name}`);

			// immediately destroy body if entity already has box2dBody
			if (!entity) {
				PhysicsComponent.prototype.log('warning: creating body for non-existent entity');
				return;
			}

			// if there's already a body, destroy it first
			if (entity.body) {
				self.destroyBody(entity);
			}

			var tempDef = new self.b2BodyDef();
			var param;
			var tempBod;
			var fixtureDef;
			var tempFixture;
			var finalFixture;
			var tempShape;
			var tempFilterData;
			var i;
			var finalX; var finalY;
			var finalWidth; var finalHeight;

			// Process body definition and create a box2d body for it
			switch (body.type) {
				case 'static':
					tempDef.type = self.b2Body.b2_staticBody;
					break;

				case 'dynamic':
					tempDef.type = self.b2Body.b2_dynamicBody;
					break;

				case 'kinematic':
					tempDef.type = self.b2Body.b2_kinematicBody;
					break;
			}

			// Add the parameters of the body to the new body instance
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'type':
						case 'gravitic':
						case 'fixedRotation':
						case 'fixtures':
							// Ignore these for now, we process them
							// below as post-creation attributes
							break;

						default:
							tempDef[param] = body[param];
							break;
					}
				}
			}

			// set rotation
			tempDef.angle = entity._rotate.z;
			// Set the position
			tempDef.position = new self.b2Vec2(entity._translate.x / self._scaleRatio, entity._translate.y / self._scaleRatio);

			// Create the new body
			tempBod = self._world.CreateBody(tempDef);

			// Now apply any post-creation attributes we need to
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'gravitic':
							if (!body.gravitic) {
								tempBod.m_nonGravitic = true;
							}
							break;

						case 'fixedRotation':
							if (body.fixedRotation) {
								tempBod.SetFixedRotation(true);
							}
							break;

						case 'fixtures':
							if (body.fixtures && body.fixtures.length) {
								for (i = 0; i < body.fixtures.length; i++) {
									// Grab the fixture definition
									fixtureDef = body.fixtures[i];

									// Create the fixture
									tempFixture = self.createFixture(fixtureDef);
									tempFixture.igeId = fixtureDef.igeId;

									// Check for a shape definition for the fixture
									if (fixtureDef.shape) {
										// Create based on the shape type
										switch (fixtureDef.shape.type) {
											case 'circle':
												tempShape = new self.b2CircleShape();
												if (fixtureDef.shape.data && typeof (fixtureDef.shape.data.radius) !== 'undefined') {
													tempShape.SetRadius(fixtureDef.shape.data.radius / self._scaleRatio);
												} else {
													tempShape.SetRadius((entity._bounds2d.x / self._scaleRatio) / 2);
												}

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;

													tempShape.SetLocalPosition(new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio));
												}
												break;

											case 'polygon':
												tempShape = new self.b2PolygonShape();
												tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
												break;

											case 'rectangle':
												tempShape = new self.b2PolygonShape();

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
													finalWidth = fixtureDef.shape.data.width !== undefined ? fixtureDef.shape.data.width : (entity._bounds2d.x / 2);
													finalHeight = fixtureDef.shape.data.height !== undefined ? fixtureDef.shape.data.height : (entity._bounds2d.y / 2);
												} else {
													finalX = 0;
													finalY = 0;
													finalWidth = (entity._bounds2d.x / 2);
													finalHeight = (entity._bounds2d.y / 2);
												}

												// Set the polygon as a box
												tempShape.SetAsOrientedBox(
													(finalWidth / self._scaleRatio),
													(finalHeight / self._scaleRatio),
													new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio),
													0
												);
												break;
										}

										if (tempShape && fixtureDef.filter) {
											tempFixture.shape = tempShape;
											finalFixture = tempBod.CreateFixture(tempFixture);
											finalFixture.igeId = tempFixture.igeId;
										}
									}

									if (fixtureDef.filter && finalFixture) {
										tempFilterData = new self._entity.physics.b2FilterData();

										if (fixtureDef.filter.filterCategoryBits !== undefined) {
											tempFilterData.categoryBits = fixtureDef.filter.filterCategoryBits;
										}
										if (fixtureDef.filter.filterMaskBits !== undefined) {
											tempFilterData.maskBits = fixtureDef.filter.filterMaskBits;
										}
										if (fixtureDef.filter.categoryIndex !== undefined) {
											tempFilterData.categoryIndex = fixtureDef.filter.categoryIndex;
										}

										finalFixture.SetFilterData(tempFilterData);
									}

									if (fixtureDef.friction !== undefined && finalFixture) {
										finalFixture.SetFriction(fixtureDef.friction);
									}
									if (fixtureDef.restitution !== undefined && finalFixture) {
										finalFixture.SetRestitution(fixtureDef.restitution);
									}
									if (fixtureDef.density !== undefined && finalFixture) {
										finalFixture.SetDensity(fixtureDef.density);
									}
									if (fixtureDef.isSensor !== undefined && finalFixture) {
										finalFixture.SetSensor(fixtureDef.isSensor);
									}
								}
							} else {
								self.log('Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture objects.', 'warning');
							}
							break;
					}
				}
			}

			// Store the entity that is linked to self body
			tempBod._entity = entity;

			// Add the body to the world with the passed fixture
			entity.body = tempBod;

			// rotate body to its previous value
			// console.log('box2dninja',entity._rotate.z)
			entity.rotateTo(0, 0, entity._rotate.z);

			// Add the body to the world with the passed fixture
			return tempBod;
		},

		createJoint: function (self, entityA, entityB, anchorA, anchorB) {
			// if joint type none do nothing
			var aBody = entityA._stats.currentBody;
			var bBody = entityB._stats.currentBody;

			if (!aBody || aBody.jointType == 'none' || aBody.type == 'none') return;

			// create a joint only if there isn't pre-existing joint
			PhysicsComponent.prototype.log(`creating ${aBody.jointType} joint between ${entityA._stats.name} and ${entityB._stats.name}`);

			if (
				entityA && entityA.body && entityB && entityB.body &&
                entityA.id() != entityB.id() // im not creating joint to myself!
			) {
				if (aBody.jointType == 'revoluteJoint') {
					var joint_def = new box2dninja.Dynamics.Joints.b2RevoluteJointDef();

					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter(),
						entityB.body.GetWorldCenter());

					joint_def.localAnchorA.Set(anchorA.x / self._scaleRatio, anchorA.y / self._scaleRatio); // item anchor
					joint_def.localAnchorB.Set(anchorB.x / self._scaleRatio, -anchorB.y / self._scaleRatio); // unit anchor
				} else // weld joint
				{
					var joint_def = new box2dninja.Dynamics.Joints.b2WeldJointDef();
					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter(),
						entityB.body.GetWorldCenter()
					);
				}

				var joint = self._world.CreateJoint(joint_def); // joint between two pieces

				// var serverStats = ige.server.getStatus()
				PhysicsComponent.prototype.log('joint created ', aBody.jointType);

				entityA.jointsAttached[entityB.id()] = joint;
				entityB.jointsAttached[entityA.id()] = joint;
			}
		}

	},

	BOX2DTS: {
		init: function (component) {
			component.b2AABB = box2dts.b2AABB; // added by Jaeyun for world collision detection for raycast bullets
			component.b2Color = box2dts.b2Color;
			component.b2Vec2 = box2dts.b2Vec2;
			// component.b2Math = box2dts.Common.Math.b2Math;
			component.b2Shape = box2dts.b2Shape;
			component.b2BodyDef = box2dts.b2BodyDef;
			component.b2Body = box2dts.b2Body;
			component.b2Joint = box2dts.b2Joint;
			component.b2FixtureDef = box2dts.b2FixtureDef;
			component.b2Fixture = box2dts.b2Fixture;
			component.b2World = box2dts.b2World;
			component.b2MassData = box2dts.b2MassData;
			component.b2PolygonShape = box2dts.b2PolygonShape;
			component.b2CircleShape = box2dts.b2CircleShape;
			component.b2DebugDraw = box2dts.b2DebugDraw;
			component.b2ContactListener = box2dts.b2ContactListener;
			component.b2Distance = box2dts.b2Distance;
			component.b2FilterData = box2dts.b2FilterData;
			component.b2DistanceJointDef = box2dts.b2DistanceJointDef;
			component.b2Contact = box2dts.b2Contact;

			// aliases for camelcase
			component.b2World.prototype.isLocked = component.b2World.prototype.IsLocked;
			component.b2World.prototype.createBody = component.b2World.prototype.CreateBody;
			component.b2World.prototype.destroyBody = component.b2World.prototype.DestroyBody;
			// component.b2World.prototype.createJoint = component.b2World.prototype.CreateJoint;
			component.b2World.prototype.destroyJoint = component.b2World.prototype.DestroyJoint;
			component.b2World.prototype.createFixture = component.b2World.prototype.CreateFixture;
			component.b2World.prototype.clearForces = component.b2World.prototype.ClearForces;
			component.b2World.prototype.getBodyList = component.b2World.prototype.GetBodyList;
			component.b2World.prototype.getJointList = component.b2World.prototype.GetJointList;
			component.b2World.prototype.getFixtureList = component.b2World.prototype.GetFixtureList;
			component.b2World.prototype.step = component.b2World.prototype.Step;

			// signature is backwards!
			/*
			component.b2World.prototype.queryAABB = function(aabb, queryCallback){
				return component.b2World.prototype.QueryAABB(queryCallback,aabb);
			}
			*/

			component.b2Body.prototype.getNext = component.b2Body.prototype.GetNext;
			component.b2Body.prototype.getAngle = component.b2Body.prototype.GetAngle;
			component.b2Body.prototype.setPosition = component.b2Body.prototype.SetPosition;
			component.b2Body.prototype.getPosition = component.b2Body.prototype.GetPosition;
			component.b2Body.prototype.setGravityScale = component.b2Body.prototype.SetGravityScale;
			component.b2Body.prototype.setAngle = component.b2Body.prototype.SetAngle;
			component.b2Body.prototype.setTransform = component.b2Body.prototype.SetTransform;
			component.b2Body.prototype.isAwake = component.b2Body.prototype.IsAwake;
			component.b2Body.prototype.setAwake = component.b2Body.prototype.SetAwake;
			component.b2Body.prototype.setLinearVelocity = component.b2Body.prototype.SetLinearVelocity;
			component.b2Body.prototype.getLinearVelocity = component.b2Body.prototype.GetLinearVelocity;
			component.b2Body.prototype.applyLinearImpulse = component.b2Body.prototype.ApplyLinearImpulse;
			component.b2Body.prototype.getWorldCenter = component.b2Body.prototype.GetWorldCenter;
			component.b2Body.prototype.applyForce = component.b2Body.prototype.ApplyForce;
			component.b2Body.prototype.applyTorque = component.b2Body.prototype.ApplyTorque;
			component.b2Vec2.prototype.set = component.b2Vec2.prototype.Set;
			// component.b2Vec2.prototype.setV = component.b2Vec2.prototype.SetV;

			component.b2Joint.prototype.getNext = component.b2Joint.prototype.GetNext;

			// Extend the b2Contact class to allow the IGE entity accessor
			// and other helper methods
			component.b2Contact.prototype.igeEntityA = function () {
				var ent = this.m_fixtureA.m_body._entity;

				// commented below as they were causing memory leak
				// ent._box2dOurContactFixture = this.m_fixtureA;
				// ent._box2dTheirContactFixture = component.m_fixtureB;
				return ent;
			};
			component.b2Contact.prototype.igeEntityB = function () {
				var ent = this.m_fixtureB.m_body._entity;

				// commented below as they were causing memory leak
				// ent._box2dOurContactFixture = component.m_fixtureB;
				// ent._box2dTheirContactFixture = this.m_fixtureA;
				return ent;
			};

			component.createWorld = function (id, options) {
				component._world = new component.b2World(this._gravity, this._sleep);
				component._world.SetContinuousPhysics(false);
			};

			/**
             * Gets / sets the gravity vector.
             * @param x
             * @param y
             * @return {*}
             */
			component.gravity = function (x, y) {
				if (x !== undefined && y !== undefined) {
					this._gravity = new this.b2Vec2(x, y);
					return this._entity;
				}

				return this._gravity;
			};
		},

		contactListener: function (self, beginContactCallback, endContactCallback, preSolve, postSolve) {
			var contactListener = new self.b2ContactListener();
			if (beginContactCallback !== undefined) {
				contactListener.BeginContact = beginContactCallback;
			}

			if (endContactCallback !== undefined) {
				contactListener.EndContact = endContactCallback;
			}

			if (preSolve !== undefined) {
				contactListener.PreSolve = preSolve;
			}

			if (postSolve !== undefined) {
				contactListener.PostSolve = postSolve;
			}
			self._world.SetContactListener(contactListener);
		},

		getmxfp: function (body) {
			return body.m_xf.p;
		},

		queryAABB: function (self, aabb, callback) {
			const foundBodies = [];
			var cb = {
				ReportFixture: function (fixture) {
					return callback(fixture);
				}
			};

			self.world().QueryAABB(cb, aabb);
		},

		createBody: function (self, entity, body) {
			PhysicsComponent.prototype.log(`createBody of ${entity._stats.name}`);

			// immediately destroy body if entity already has box2dBody
			if (!entity) {
				PhysicsComponent.prototype.log('warning: creating body for non-existent entity');
				return;
			}

			// if there's already a body, destroy it first
			if (entity.body) {
				PhysicsComponent.prototype.log('body already exists, destroying body');
				self.destroyBody(entity.body);
			}

			var tempDef = new self.b2BodyDef();
			var param;
			var tempBod;
			var fixtureDef;
			var tempFixture;
			var finalFixture;
			var tempShape;
			var tempFilterData;
			var i;
			var finalX; var finalY;
			var finalWidth; var finalHeight;

			// Process body definition and create a box2d body for it
			switch (body.type) {
				case 'static':
					tempDef.type = box2dts.b2BodyType.b2_staticBody;
					break;

				case 'dynamic':
					tempDef.type = box2dts.b2BodyType.b2_dynamicBody;
					break;

				case 'kinematic':
					tempDef.type = box2dts.b2BodyType.b2_kinematicBody;
					break;
			}

			// Add the parameters of the body to the new body instance
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'type':
						case 'gravitic':
						case 'fixedRotation':
						case 'fixtures':
							// Ignore these for now, we process them
							// below as post-creation attributes
							break;

						default:
							tempDef[param] = body[param];
							break;
					}
				}
			}

			// set rotation
			tempDef.angle = entity._rotate.z;
			// Set the position
			tempDef.position = new self.b2Vec2(entity._translate.x / self._scaleRatio, entity._translate.y / self._scaleRatio);

			// Create the new body
			tempBod = self._world.CreateBody(tempDef);

			// Now apply any post-creation attributes we need to
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'gravitic':
							if (!body.gravitic) {
								tempBod.m_nonGravitic = true;
							}
							break;

						case 'fixedRotation':
							if (body.fixedRotation) {
								tempBod.SetFixedRotation(true);
							}
							break;

						case 'fixtures':
							if (body.fixtures && body.fixtures.length) {
								for (i = 0; i < body.fixtures.length; i++) {
									// Grab the fixture definition
									fixtureDef = body.fixtures[i];

									// Create the fixture
									tempFixture = self.createFixture(fixtureDef);
									tempFixture.igeId = fixtureDef.igeId;

									// Check for a shape definition for the fixture
									if (fixtureDef.shape) {
										// Create based on the shape type
										switch (fixtureDef.shape.type) {
											case 'circle':
												tempShape = new self.b2CircleShape();

												/*
												if (fixtureDef.shape.data && typeof(fixtureDef.shape.data.radius) !== 'undefined') {
													tempShape.SetRadius(fixtureDef.shape.data.radius / self._scaleRatio);
												} else {
													tempShape.SetRadius((entity._bounds2d.x / self._scaleRatio) / 2);
												}

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;

													tempShape.SetLocalPosition(new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio));
												}
												*/

												if (fixtureDef.shape.data && typeof (fixtureDef.shape.data.radius) !== 'undefined') {
													// tempShape.SetRadius(fixtureDef.shape.data.radius / self._scaleRatio);
													var p = new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio);
													var r = fixtureDef.shape.data.radius / self._scaleRatio;
													tempShape.Set(p, r);
												} else {
													// var r = ((entity._bounds2d.x / self._scaleRatio) / 2);
												}

												break;

											case 'polygon':
												tempShape = new self.b2PolygonShape();
												tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
												break;

											case 'rectangle':
												tempShape = new self.b2PolygonShape();

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
													finalWidth = fixtureDef.shape.data.width !== undefined ? fixtureDef.shape.data.width : (entity._bounds2d.x / 2);
													finalHeight = fixtureDef.shape.data.height !== undefined ? fixtureDef.shape.data.height : (entity._bounds2d.y / 2);
												} else {
													finalX = 0;
													finalY = 0;
													finalWidth = (entity._bounds2d.x / 2);
													finalHeight = (entity._bounds2d.y / 2);
												}

												// Set the polygon as a box
												/*
												tempShape.SetAsOrientedBox(
													(finalWidth / self._scaleRatio),
													(finalHeight / self._scaleRatio),
													new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio),
													0
												);
												*/

												// review:

												tempShape.SetAsBox(
													(finalWidth / self._scaleRatio),
													(finalHeight / self._scaleRatio)
												);
												break;
										}

										if (tempShape && fixtureDef.filter) {
											tempFixture.shape = tempShape;
											// tempFixture.density = 1; //fixtureDef.density;
											// console.log('fixtureDef',fixtureDef);
											finalFixture = tempBod.CreateFixture(tempFixture);
											finalFixture.igeId = tempFixture.igeId;
										}
									}

									if (fixtureDef.filter && finalFixture) {
										tempFilterData = new box2dts.b2Filter();

										if (fixtureDef.filter.filterCategoryBits !== undefined) {
											tempFilterData.categoryBits = fixtureDef.filter.filterCategoryBits;
										}
										if (fixtureDef.filter.filterMaskBits !== undefined) {
											tempFilterData.maskBits = fixtureDef.filter.filterMaskBits;
										}
										if (fixtureDef.filter.categoryIndex !== undefined) {
											tempFilterData.categoryIndex = fixtureDef.filter.categoryIndex;
										}

										finalFixture.SetFilterData(tempFilterData);
									}

									if (fixtureDef.friction !== undefined && finalFixture) {
										finalFixture.SetFriction(fixtureDef.friction);
									}
									if (fixtureDef.restitution !== undefined && finalFixture) {
										finalFixture.SetRestitution(fixtureDef.restitution);
									}
									if (fixtureDef.density !== undefined && finalFixture) {
										finalFixture.SetDensity(fixtureDef.density);
									}
									if (fixtureDef.isSensor !== undefined && finalFixture) {
										finalFixture.SetSensor(fixtureDef.isSensor);
									}
								}
							} else {
								self.log('Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture objects.', 'warning');
							}
							break;
					}
				}
			}

			// Store the entity that is linked to self body
			tempBod._entity = entity;

			// Add the body to the world with the passed fixture
			entity.body = tempBod;

			// rotate body to its previous value
			// entity.rotateTo(0, 0, entity._rotate.z)

			// Add the body to the world with the passed fixture
			return tempBod;
		},

		createJoint: function (self, entityA, entityB, anchorA, anchorB) {
			// if joint type none do nothing
			var aBody = entityA._stats.currentBody;
			var bBody = entityB._stats.currentBody;

			if (!aBody || aBody.jointType == 'none' || aBody.type == 'none') return;

			// create a joint only if there isn't pre-existing joint
			PhysicsComponent.prototype.log(`creating ${aBody.jointType} joint between ${entityA._stats.name} and ${entityB._stats.name}`);

			if (
				entityA && entityA.body && entityB && entityB.body &&
				entityA.id() != entityB.id() // im not creating joint to myself!
			) {
				if (aBody.jointType == 'revoluteJoint') {
					var joint_def = new box2dts.b2RevoluteJointDef();

					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter(),
						entityB.body.GetWorldCenter());

					joint_def.localAnchorA.Set(anchorA.x / self._scaleRatio, anchorA.y / self._scaleRatio); // item anchor
					joint_def.localAnchorB.Set(anchorB.x / self._scaleRatio, -anchorB.y / self._scaleRatio); // unit anchor
				} else // weld joint
				{
					var joint_def = new box2dts.b2WeldJointDef();
					joint_def.collideConnected = false;
					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter()
					);

					// joint_def.frequencyHz = 40;
					// joint_def.dampingRatio = 40;
				}

				var joint = self._world.CreateJoint(joint_def); // joint between two pieces

				// var serverStats = ige.server.getStatus()
				PhysicsComponent.prototype.log('joint created ', aBody.jointType);

				entityA.jointsAttached[entityB.id()] = joint;
				entityB.jointsAttached[entityA.id()] = joint;
			}
		}

	},

	NATIVE: {
		init: function (component) {
			component.native = require('box2d-native');

			component.b2AABB = component.native.b2AABB; // added by Jaeyun for world collision detection for raycast bullets
			component.b2Color = component.native.b2Color;
			component.b2Vec2 = component.native.b2Vec2;
			// component.b2Math = component.native.Common.Math.b2Math;
			component.b2Shape = component.native.b2Shape;
			component.b2BodyDef = component.native.b2BodyDef;
			component.b2Body = component.native.b2Body;
			component.b2Joint = component.native.b2Joint;
			component.b2FixtureDef = component.native.b2FixtureDef;
			component.b2Fixture = component.native.b2Fixture;
			component.World = component.native.World;
			component.b2World = component.native.b2World;
			component.b2MassData = component.native.b2MassData;
			component.b2PolygonShape = component.native.b2PolygonShape;
			component.b2CircleShape = component.native.b2CircleShape;
			component.b2DebugDraw = component.native.b2DebugDraw;
			component.b2ContactListener = component.native.b2ContactListener;
			component.b2Distance = component.native.b2Distance;
			component.b2FilterData = component.native.b2FilterData;
			component.b2DistanceJointDef = component.native.b2DistanceJointDef;
			component.getPointer = component.native.getPointer;

			// aliases for camelcase
			component.b2World.prototype.isLocked = component.b2World.prototype.IsLocked;
			component.b2World.prototype.createBody = component.b2World.prototype.CreateBody;
			component.b2World.prototype.destroyBody = component.b2World.prototype.DestroyBody;
			// component.b2World.prototype.createJoint = component.b2World.prototype.CreateJoint;
			component.b2World.prototype.destroyJoint = component.b2World.prototype.DestroyJoint;
			component.b2World.prototype.createFixture = component.b2World.prototype.CreateFixture;
			component.b2World.prototype.clearForces = component.b2World.prototype.ClearForces;
			component.b2World.prototype.getBodyList = component.b2World.prototype.GetBodyList;
			component.b2World.prototype.getJointList = component.b2World.prototype.GetJointList;
			component.b2World.prototype.getFixtureList = component.b2World.prototype.GetFixtureList;
			component.b2World.prototype.step = component.b2World.prototype.Step;

			// signature is backwards!
			/*
			component.b2World.prototype.queryAABB = function(aabb, queryCallback){
				return component.b2World.prototype.QueryAABB(queryCallback,aabb);
			}
			*/

			component.b2Body.prototype.getNext = component.b2Body.prototype.GetNext;
			component.b2Body.prototype.getAngle = component.b2Body.prototype.GetAngle;
			component.b2Body.prototype.setPosition = component.b2Body.prototype.SetPosition;
			component.b2Body.prototype.getPosition = component.b2Body.prototype.GetPosition;
			component.b2Body.prototype.setGravityScale = component.b2Body.prototype.SetGravityScale;
			component.b2Body.prototype.setAngle = component.b2Body.prototype.SetAngle;
			component.b2Body.prototype.setTransform = component.b2Body.prototype.SetTransform;
			component.b2Body.prototype.isAwake = component.b2Body.prototype.IsAwake;
			component.b2Body.prototype.setAwake = component.b2Body.prototype.SetAwake;
			component.b2Body.prototype.setLinearVelocity = component.b2Body.prototype.SetLinearVelocity;
			component.b2Body.prototype.getLinearVelocity = component.b2Body.prototype.GetLinearVelocity;
			component.b2Body.prototype.applyLinearImpulse = component.b2Body.prototype.ApplyLinearImpulse;
			component.b2Body.prototype.getWorldCenter = component.b2Body.prototype.GetWorldCenter;
			component.b2Body.prototype.applyForce = component.b2Body.prototype.ApplyForce;
			component.b2Vec2.prototype.set = component.b2Vec2.prototype.Set;
			// component.b2Vec2.prototype.setV = component.b2Vec2.prototype.SetV;

			component.b2Joint.prototype.getNext = component.b2Joint.prototype.GetNext;
		},

		contactListener: function (self, beginContactCallback, endContactCallback, preSolve, postSolve) {
			var contactListener = new self.b2ContactListener();
			if (beginContactCallback !== undefined) {
				contactListener.BeginContact = beginContactCallback;
			}

			if (endContactCallback !== undefined) {
				contactListener.EndContact = endContactCallback;
			}

			if (preSolve !== undefined) {
				contactListener.PreSolve = preSolve;
			}

			if (postSolve !== undefined) {
				contactListener.PostSolve = postSolve;
			}
			self._world.SetContactListener(contactListener);
		},

		getmxfp: function (body) {
			return body.m_xf.p;
		},

		queryAABB: function (self, aabb, callback) {
			var cb = {
				ReportFixture: function (fixture) {
					callback(fixture);
				}
			};

			self.world().QueryAABB(cb, aabb);
		},

		createBody: function (self, entity, body) {
			PhysicsComponent.prototype.log(`createBody of ${entity._stats.name}`);

			// immediately destroy body if entity already has box2dBody
			if (!entity) {
				PhysicsComponent.prototype.log('warning: creating body for non-existent entity');
				return;
			}

			// if there's already a body, destroy it first
			if (entity.body) {
				PhysicsComponent.prototype.log('body already exists, destroying body');
				self.destroyBody(entity);
			}

			var tempDef = new self.b2BodyDef(entity._rotate.z);
			var param;
			var tempBod;
			var fixtureDef;
			var tempFixture;
			var finalFixture;
			var tempShape;
			var tempFilterData;
			var i;
			var finalX; var finalY;
			var finalWidth; var finalHeight;

			// Process body definition and create a box2d body for it
			switch (body.type) {
				case 'static':
					tempDef.type = self.native.b2_staticBody;
					break;

				case 'dynamic':
					tempDef.type = self.native.b2_dynamicBody;
					break;

				case 'kinematic':
					tempDef.type = self.native.b2_kinematicBody;
					break;
			}

			// Add the parameters of the body to the new body instance
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'type':
						case 'gravitic':
						case 'fixedRotation':
						case 'fixtures':
							// Ignore these for now, we process them
							// below as post-creation attributes
							break;

						default:
							tempDef[param] = body[param];
							break;
					}
				}
			}

			// Set the position
			tempDef.position = new self.b2Vec2(entity._translate.x / self._scaleRatio, entity._translate.y / self._scaleRatio);

			// Create the new body
			tempBod = self._world.CreateBody(tempDef);

			// Now apply any post-creation attributes we need to
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'gravitic':
							if (!body.gravitic) {
								tempBod.m_nonGravitic = true;
							}
							break;

						case 'fixedRotation':
							if (body.fixedRotation) {
								tempBod.SetFixedRotation(true);
							}
							break;

						case 'fixtures':
							if (body.fixtures && body.fixtures.length) {
								for (i = 0; i < body.fixtures.length; i++) {
									// Grab the fixture definition
									fixtureDef = body.fixtures[i];

									// Create the fixture
									tempFixture = self.createFixture(fixtureDef);
									tempFixture.igeId = fixtureDef.igeId;

									// Check for a shape definition for the fixture
									if (fixtureDef.shape) {
										// Create based on the shape type
										switch (fixtureDef.shape.type) {
											case 'circle':
												tempShape = new self.b2CircleShape();

												/*
												if (fixtureDef.shape.data && typeof(fixtureDef.shape.data.radius) !== 'undefined') {
													tempShape.SetRadius(fixtureDef.shape.data.radius / self._scaleRatio);
												} else {
													tempShape.SetRadius((entity._bounds2d.x / self._scaleRatio) / 2);
												}

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;

													tempShape.SetLocalPosition(new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio));
												}
												*/

												if (fixtureDef.shape.data && typeof (fixtureDef.shape.data.radius) !== 'undefined') {
													// tempShape.SetRadius(fixtureDef.shape.data.radius / self._scaleRatio);
													var p = new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio);
													var r = fixtureDef.shape.data.radius / self._scaleRatio;
													tempShape.Set(p, r);
												} else {
													// var r = ((entity._bounds2d.x / self._scaleRatio) / 2);
												}

												break;

											case 'polygon':
												tempShape = new self.b2PolygonShape();
												tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
												break;

											case 'rectangle':
												tempShape = new self.b2PolygonShape();

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
													finalWidth = fixtureDef.shape.data.width !== undefined ? fixtureDef.shape.data.width : (entity._bounds2d.x / 2);
													finalHeight = fixtureDef.shape.data.height !== undefined ? fixtureDef.shape.data.height : (entity._bounds2d.y / 2);
												} else {
													finalX = 0;
													finalY = 0;
													finalWidth = (entity._bounds2d.x / 2);
													finalHeight = (entity._bounds2d.y / 2);
												}

												// Set the polygon as a box
												/*
												tempShape.SetAsOrientedBox(
													(finalWidth / self._scaleRatio),
													(finalHeight / self._scaleRatio),
													new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio),
													0
												);
												*/

												// review:

												tempShape.SetAsBox(
													(finalWidth / self._scaleRatio),
													(finalHeight / self._scaleRatio)
												);
												break;
										}

										if (tempShape && fixtureDef.filter) {
											tempFixture.shape = tempShape;
											// tempFixture.density = 1; //fixtureDef.density;
											// console.log('fixtureDef',fixtureDef);
											finalFixture = tempBod.CreateFixture(tempFixture);
											finalFixture.igeId = tempFixture.igeId;
										}
									}

									if (fixtureDef.filter && finalFixture) {
										tempFilterData = new self.native.b2Filter();

										if (fixtureDef.filter.categoryBits !== undefined) {
											tempFilterData.categoryBits = fixtureDef.filter.categoryBits;
										}
										if (fixtureDef.filter.maskBits !== undefined) {
											tempFilterData.maskBits = fixtureDef.filter.maskBits;
										}
										if (fixtureDef.filter.categoryIndex !== undefined) {
											tempFilterData.categoryIndex = fixtureDef.filter.categoryIndex;
										}

										finalFixture.SetFilterData(tempFilterData);
									}

									if (fixtureDef.friction !== undefined && finalFixture) {
										finalFixture.SetFriction(fixtureDef.friction);
									}
									if (fixtureDef.restitution !== undefined && finalFixture) {
										finalFixture.SetRestitution(fixtureDef.restitution);
									}
									if (fixtureDef.density !== undefined && finalFixture) {
										finalFixture.SetDensity(fixtureDef.density);
									}
									if (fixtureDef.isSensor !== undefined && finalFixture) {
										finalFixture.SetSensor(fixtureDef.isSensor);
									}
								}
							} else {
								self.log('Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture objects.', 'warning');
							}
							break;
					}
				}
			}

			// Store the entity that is linked to self body
			tempBod._entity = entity;

			// Add the body to the world with the passed fixture
			entity.body = tempBod;

			// rotate body to its previous value
			entity.rotateTo(0, 0, entity._rotate.z);

			// Add the body to the world with the passed fixture
			return tempBod;
		},

		createJoint: function (self, entityA, entityB, anchorA, anchorB) {
			// if joint type none do nothing
			var aBody = entityA._stats.currentBody;
			var bBody = entityB._stats.currentBody;

			if (!aBody || aBody.jointType == 'none' || aBody.type == 'none') return;

			// create a joint only if there isn't pre-existing joint
			PhysicsComponent.prototype.log(`creating ${aBody.jointType} joint between ${entityA._stats.name} and ${entityB._stats.name}`);

			if (
				entityA && entityA.body && entityB && entityB.body &&
				entityA.id() != entityB.id() // im not creating joint to myself!
			) {
				if (aBody.jointType == 'revoluteJoint') {
					var joint_def = new this.native.b2RevoluteJointDef();

					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter(),
						entityB.body.GetWorldCenter());

					joint_def.localAnchorA.Set(anchorA.x / self._scaleRatio, anchorA.y / self._scaleRatio); // item anchor
					joint_def.localAnchorB.Set(anchorB.x / self._scaleRatio, -anchorB.y / self._scaleRatio); // unit anchor
				} else // weld joint
				{
					var joint_def = new this.native.b2WeldJointDef();

					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter()
					);

					// joint_def.frequencyHz = 1;
					// joint_def.dampingRatio = 0;
				}

				var joint = self._world.CreateJoint(joint_def); // joint between two pieces

				// var serverStats = ige.server.getStatus()
				PhysicsComponent.prototype.log('joint created ', aBody.jointType);

				entityA.jointsAttached[entityB.id()] = joint;
				entityB.jointsAttached[entityA.id()] = joint;
			}
		}

	},

	BOX2D: {
		init: function (component) {
			// component.b2AABB = box2dweb.Collision.b2AABB; // added by Jaeyun for world collision detection for raycast bullets
			// console.log(box2DJS);

			if (typeof box2DJS != 'function') return;
			box2DJS().then(function (box2D) {
				component.b2Color = box2D.b2Color;
				component.b2Vec2 = box2D.b2Vec2;
				component.b2Math = box2D.b2Math;
				component.b2Shape = box2D.b2Shape;
				component.b2BodyDef = box2D.b2BodyDef;
				component.b2Body = box2D.b2Body;
				component.b2Joint = box2D.b2Joint;
				component.b2FixtureDef = box2D.b2FixtureDef;
				component.b2Fixture = box2D.b2Fixture;
				component.b2World = box2D.b2World;
				component.b2MassData = box2D.b2MassData;
				component.b2PolygonShape = box2D.b2PolygonShape;
				component.b2CircleShape = box2D.b2CircleShape;
				component.b2DebugDraw = box2D.b2DebugDraw;
				component.JSContactListener = box2D.JSContactListener;
				component.b2Distance = box2D.b2Distance;
				component.b2FilterData = box2D.b2FilterData;
				component.b2DistanceJointDef = box2D.b2DistanceJointDef;

				// aliases for camelcase
				component.b2World.prototype.isLocked = component.b2World.prototype.IsLocked;
				component.b2World.prototype.createBody = component.b2World.prototype.CreateBody;
				component.b2World.prototype.destroyBody = component.b2World.prototype.DestroyBody;
				// component.b2World.prototype.createJoint = component.b2World.prototype.CreateJoint;
				component.b2World.prototype.destroyJoint = component.b2World.prototype.DestroyJoint;
				component.b2World.prototype.createFixture = component.b2World.prototype.CreateFixture;
				component.b2World.prototype.clearForces = component.b2World.prototype.ClearForces;
				component.b2World.prototype.getBodyList = component.b2World.prototype.GetBodyList;
				component.b2World.prototype.getJointList = component.b2World.prototype.GetJointList;
				component.b2World.prototype.getFixtureList = component.b2World.prototype.GetFixtureList;
				component.b2World.prototype.step = component.b2World.prototype.Step;
				component.b2World.prototype.rayCast = component.b2World.prototype.RayCast;

				// signature is backwards!
				/*
				component.b2World.prototype.queryAABB = function(aabb, queryCallback){
					return component.b2World.prototype.QueryAABB(queryCallback,aabb);
				}
				*/

				component.b2Body.prototype.getNext = component.b2Body.prototype.GetNext;
				component.b2Body.prototype.getAngle = component.b2Body.prototype.GetAngle;
				component.b2Body.prototype.setPosition = component.b2Body.prototype.SetPosition;
				component.b2Body.prototype.getPosition = component.b2Body.prototype.GetPosition;
				component.b2Body.prototype.setGravityScale = component.b2Body.prototype.SetGravityScale;
				component.b2Body.prototype.setAngle = component.b2Body.prototype.SetAngle;
				component.b2Body.prototype.setTransform = component.b2Body.prototype.SetTransform;
				component.b2Body.prototype.isAwake = component.b2Body.prototype.IsAwake;
				component.b2Body.prototype.setAwake = component.b2Body.prototype.SetAwake;
				component.b2Body.prototype.setLinearVelocity = component.b2Body.prototype.SetLinearVelocity;
				component.b2Body.prototype.getLinearVelocity = component.b2Body.prototype.GetLinearVelocity;
				component.b2Body.prototype.applyLinearImpulse = component.b2Body.prototype.ApplyLinearImpulse;
				component.b2Body.prototype.getWorldCenter = component.b2Body.prototype.GetWorldCenter;
				component.b2Body.prototype.applyForce = component.b2Body.prototype.ApplyForce;
				component.b2Vec2.prototype.set = component.b2Vec2.prototype.Set;
				// component.b2Vec2.prototype.setV = component.b2Vec2.prototype.SetV;

				component.b2Joint.prototype.getNext = component.b2Joint.prototype.GetNext;
			});
		},

		contactListener: function (self, beginContactCallback, endContactCallback, preSolve, postSolve) {
			var contactListener = new self.JSContactListener();
			if (beginContactCallback !== undefined) {
				contactListener.BeginContact = beginContactCallback;
			}

			if (endContactCallback !== undefined) {
				contactListener.EndContact = endContactCallback;
			}

			if (preSolve !== undefined) {
				contactListener.PreSolve = preSolve;
			}

			if (postSolve !== undefined) {
				contactListener.PostSolve = postSolve;
			}
			self._world.SetContactListener(contactListener);
		},

		getmxfp: function (body) {
			return body.m_xf.p;
		},

		queryAABB: function (self, aabb, callback) {
			var cb = {
				ReportFixture: function (fixture) {
					callback(fixture);
				}
			};

			self.world().QueryAABB(cb, aabb);
		},

		createBody: function (self, entity, body) {
			PhysicsComponent.prototype.log(`createBody of ${entity._stats.name}`);

			// immediately destroy body if entity already has box2dBody
			if (!entity) {
				PhysicsComponent.prototype.log('warning: creating body for non-existent entity');
				return;
			}

			// if there's already a body, destroy it first
			if (entity.body) {
				PhysicsComponent.prototype.log('body already exists, destroying body');
				self.destroyBody(entity);
			}

			var tempDef = new self.b2BodyDef();
			var param;
			var tempBod;
			var fixtureDef;
			var tempFixture;
			var finalFixture;
			var tempShape;
			var tempFilterData;
			var i;
			var finalX; var finalY;
			var finalWidth; var finalHeight;

			// Process body definition and create a box2d body for it
			box2DJS().then(function (box2D) {
				switch (body.type) {
					case 'static':
						tempDef.type = box2D.b2_staticBody;
						break;

					case 'dynamic':
						tempDef.type = box2D.b2_dynamicBody;
						break;

					case 'kinematic':
						tempDef.type = box2D.b2_kinematicBody;
						break;
				}
			});

			// Add the parameters of the body to the new body instance
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'type':
						case 'gravitic':
						case 'fixedRotation':
						case 'fixtures':
							// Ignore these for now, we process them
							// below as post-creation attributes
							break;

						default:
							tempDef[param] = body[param];
							break;
					}
				}
			}

			// Set the position
			tempDef.position = new self.b2Vec2(entity._translate.x / self._scaleRatio, entity._translate.y / self._scaleRatio);

			// Create the new body
			tempBod = self._world.CreateBody(tempDef);

			// Now apply any post-creation attributes we need to
			for (param in body) {
				if (body.hasOwnProperty(param)) {
					switch (param) {
						case 'gravitic':
							if (!body.gravitic) {
								tempBod.m_nonGravitic = true;
							}
							break;

						case 'fixedRotation':
							if (body.fixedRotation) {
								tempBod.SetFixedRotation(true);
							}
							break;

						case 'fixtures':
							if (body.fixtures && body.fixtures.length) {
								for (i = 0; i < body.fixtures.length; i++) {
									// Grab the fixture definition
									fixtureDef = body.fixtures[i];

									// Create the fixture
									tempFixture = self.createFixture(fixtureDef);
									tempFixture.igeId = fixtureDef.igeId;

									// Check for a shape definition for the fixture
									if (fixtureDef.shape) {
										// Create based on the shape type
										switch (fixtureDef.shape.type) {
											case 'circle':
												tempShape = new self.b2CircleShape();

												/*
												if (fixtureDef.shape.data && typeof(fixtureDef.shape.data.radius) !== 'undefined') {
													tempShape.SetRadius(fixtureDef.shape.data.radius / self._scaleRatio);
												} else {
													tempShape.SetRadius((entity._bounds2d.x / self._scaleRatio) / 2);
												}

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;

													tempShape.SetLocalPosition(new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio));
												}
												*/

												if (fixtureDef.shape.data && typeof (fixtureDef.shape.data.radius) !== 'undefined') {
													// tempShape.SetRadius(fixtureDef.shape.data.radius / self._scaleRatio);
													var p = new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio);
													var r = fixtureDef.shape.data.radius / self._scaleRatio;
													tempShape.Set(p, r);
												} else {
													// var r = ((entity._bounds2d.x / self._scaleRatio) / 2);
												}

												break;

											case 'polygon':
												tempShape = new self.b2PolygonShape();
												tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
												break;

											case 'rectangle':
												tempShape = new self.b2PolygonShape();

												if (fixtureDef.shape.data) {
													finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
													finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
													finalWidth = fixtureDef.shape.data.width !== undefined ? fixtureDef.shape.data.width : (entity._bounds2d.x / 2);
													finalHeight = fixtureDef.shape.data.height !== undefined ? fixtureDef.shape.data.height : (entity._bounds2d.y / 2);
												} else {
													finalX = 0;
													finalY = 0;
													finalWidth = (entity._bounds2d.x / 2);
													finalHeight = (entity._bounds2d.y / 2);
												}

												// Set the polygon as a box
												/*
                                                tempShape.SetAsOrientedBox(
                                                    (finalWidth / self._scaleRatio),
                                                    (finalHeight / self._scaleRatio),
                                                    new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio),
                                                    0
                                                );
                                                */

												// review:

												tempShape.SetAsBox(
													(finalWidth / self._scaleRatio),
													(finalHeight / self._scaleRatio)
												);
												break;
										}

										if (tempShape && fixtureDef.filter) {
											tempFixture.shape = tempShape;
											finalFixture = tempBod.CreateFixture(tempFixture);
											finalFixture.igeId = tempFixture.igeId;
										}
									}

									if (fixtureDef.filter && finalFixture) {
										tempFilterData = new box2dts.b2Filter();

										if (fixtureDef.filter.categoryBits !== undefined) {
											tempFilterData.categoryBits = fixtureDef.filter.categoryBits;
										}
										if (fixtureDef.filter.maskBits !== undefined) {
											tempFilterData.maskBits = fixtureDef.filter.maskBits;
										}
										if (fixtureDef.filter.categoryIndex !== undefined) {
											tempFilterData.categoryIndex = fixtureDef.filter.categoryIndex;
										}

										finalFixture.SetFilterData(tempFilterData);
									}

									if (fixtureDef.friction !== undefined && finalFixture) {
										finalFixture.SetFriction(fixtureDef.friction);
									}
									if (fixtureDef.restitution !== undefined && finalFixture) {
										finalFixture.SetRestitution(fixtureDef.restitution);
									}
									if (fixtureDef.density !== undefined && finalFixture) {
										finalFixture.SetDensity(fixtureDef.density);
									}
									if (fixtureDef.isSensor !== undefined && finalFixture) {
										finalFixture.SetSensor(fixtureDef.isSensor);
									}
								}
							} else {
								self.log('Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture objects.', 'warning');
							}
							break;
					}
				}
			}

			// Store the entity that is linked to self body
			tempBod._entity = entity;

			// Add the body to the world with the passed fixture
			entity.body = tempBod;

			// rotate body to its previous value
			entity.rotateTo(0, 0, entity._rotate.z);

			// Add the body to the world with the passed fixture
			return tempBod;
		},

		createJoint: function (self, entityA, entityB, anchorA, anchorB) {
			// if joint type none do nothing
			var aBody = entityA._stats.currentBody;
			var bBody = entityB._stats.currentBody;

			if (!aBody || aBody.jointType == 'none' || aBody.type == 'none') return;

			// create a joint only if there isn't pre-existing joint
			PhysicsComponent.prototype.log(`creating ${aBody.jointType} joint between ${entityA._stats.name} and ${entityB._stats.name}`);

			if (
				entityA && entityA.body && entityB && entityB.body &&
				entityA.id() != entityB.id() // im not creating joint to myself!
			) {
				// initialize function assumes that the two objects are in a correct position
				if (aBody.jointType == 'distanceJoint') {
					var joint_def = new box2dts.b2DistanceJointDef();

					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter(),
						entityB.body.GetWorldCenter());
				} else if (aBody.jointType == 'revoluteJoint') {
					var joint_def = new box2dts.b2RevoluteJointDef();

					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter(),
						entityB.body.GetWorldCenter());

					// joint_def.enableLimit = true;
					// joint_def.lowerAngle = aBody.itemAnchor.lowerAngle * 0.0174533; // degree to rad
					// joint_def.upperAngle = aBody.itemAnchor.upperAngle * 0.0174533; // degree to rad

					joint_def.localAnchorA.Set(anchorA.x / aBody.width, anchorA.y / aBody.height);
					joint_def.localAnchorB.Set(anchorB.x / bBody.width, anchorB.y / bBody.height);
				} else // weld joint
				{
					var joint_def = new box2dts.b2WeldJointDef();

					joint_def.Initialize(
						entityA.body,
						entityB.body,
						entityA.body.GetWorldCenter()
					);

					// joint_def.frequencyHz = 1;
					// joint_def.dampingRatio = 0;
				}

				var joint = self._world.CreateJoint(joint_def); // joint between two pieces

				// var serverStats = ige.server.getStatus()
				PhysicsComponent.prototype.log('joint created ', aBody.jointType);

				entityA.jointsAttached[entityB.id()] = joint;
				entityB.jointsAttached[entityA.id()] = joint;
			}
		}

	}
};

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = dists;
}
