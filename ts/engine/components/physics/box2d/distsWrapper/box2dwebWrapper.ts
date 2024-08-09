// FIXME: add more types to the physics part of taro2

const box2dwebWrapper: PhysicsDistProps = {
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
		component.b2Vec2.prototype.get_x = function () {
			return this.x;
		};
		component.b2Vec2.prototype.get_y = function () {
			return this.y;
		};
		// component.b2Vec2.prototype.setV = component.b2Vec2.prototype.SetV;

		component.b2Joint.prototype.getNext = component.b2Joint.prototype.GetNext;

		component.createWorld = function (id, options) {
			component._world = new component.b2World(this._gravity, this._sleep);
			component._world.SetContinuousPhysics(this._continuousPhysics);
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

		component.setContinuousPhysics = function (continuousPhysics) {
			this._continuousPhysics = continuousPhysics;
		};
		component._continuousPhysics = false;
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

	getBodyPosition: function (body) {
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
		var finalX;
		var finalY;
		var finalHWidth;
		var finalHHeight;

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
								tempFixture.taroId = fixtureDef.taroId;

								// Check for a shape definition for the fixture
								if (fixtureDef.shape) {
									// Create based on the shape type
									switch (fixtureDef.shape.type) {
										case 'circle':
											tempShape = new self.b2CircleShape();
											if (fixtureDef.shape.data && typeof fixtureDef.shape.data.radius !== 'undefined') {
												tempShape.SetRadius(fixtureDef.shape.data.radius / self._scaleRatio);
											} else {
												tempShape.SetRadius(entity._bounds2d.x / self._scaleRatio / 2);
											}

											if (fixtureDef.shape.data) {
												finalX = fixtureDef.shape.data.x ?? 0;
												finalY = fixtureDef.shape.data.y ?? 0;

												tempShape.SetLocalPosition(
													new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio)
												);
											}
											break;

										case 'polygon':
											tempShape = new self.b2PolygonShape();
											tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());
											break;

										case 'rectangle':
											tempShape = new self.b2PolygonShape();

											if (fixtureDef.shape.data) {
												finalX = fixtureDef.shape.data.x ?? 0;
												finalY = fixtureDef.shape.data.y ?? 0;
												finalHWidth = fixtureDef.shape.data.halfWidth ?? entity._bounds2d.x / 2;
												finalHHeight = fixtureDef.shape.data.halfHeight ?? entity._bounds2d.y / 2;
											} else {
												finalX = 0;
												finalY = 0;
												finalHWidth = entity._bounds2d.x / 2;
												finalHHeight = entity._bounds2d.y / 2;
											}

											// Set the polygon as a box
											tempShape.SetAsOrientedBox(
												finalHWidth / self._scaleRatio,
												finalHHeight / self._scaleRatio,
												new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio),
												0
											);
											break;
									}

									if (tempShape && fixtureDef.filter) {
										tempFixture.shape = tempShape;
										finalFixture = tempBod.CreateFixture(tempFixture, isLossTolerant);
										finalFixture.taroId = tempFixture.taroId;
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
							self.log(
								'Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture anys.',
								'warning'
							);
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
		PhysicsComponent.prototype.log(
			`creating ${aBody.jointType} joint between ${entityA._stats.name} and ${entityB._stats.name}`
		);

		if (
			entityA &&
			entityA.body &&
			entityB &&
			entityB.body &&
			entityA.id() != entityB.id() // im not creating joint to myself!
		) {
			if (aBody.jointType == 'revoluteJoint') {
				var joint_def = new box2dweb.Dynamics.Joints.b2RevoluteJointDef();

				joint_def.Initialize(entityA.body, entityB.body, entityB.body.GetWorldCenter());

				// joint_def.enableLimit = true;
				// joint_def.lowerAngle = aBody.itemAnchor.lowerAngle * 0.0174533; // degree to rad
				// joint_def.upperAngle = aBody.itemAnchor.upperAngle * 0.0174533; // degree to rad

				joint_def.localAnchorA.Set(anchorA.x / self._scaleRatio, anchorA.y / self._scaleRatio); // item anchor
				joint_def.localAnchorB.Set(anchorB.x / self._scaleRatio, -anchorB.y / self._scaleRatio); // unit anchor
			} // weld joint
			else {
				var joint_def = new box2dweb.Dynamics.Joints.b2WeldJointDef();
				joint_def.Initialize(entityA.body, entityB.body, entityA.body.GetWorldCenter(), entityB.body.GetWorldCenter());
			}

			var joint = self._world.CreateJoint(joint_def); // joint between two pieces

			// var serverStats = taro.status.getSummary()
			PhysicsComponent.prototype.log('joint created ', aBody.jointType);

			entityA.jointsAttached[entityB.id()] = joint;
			entityB.jointsAttached[entityA.id()] = joint;
		}
	},
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = box2dwebWrapper;
}
