// FIXME: add more types to the physics part of taro2

const planckWrapper: PhysicsDistProps = {
	init: function (component) {
		// component.b2Color = planck.Common.b2Color;
		component.b2Vec2 = planck.Vec2;
		component.b2Vec2.prototype.get_x = function () {
			return this.x;
		};
		component.b2Vec2.prototype.get_y = function () {
			return this.y;
		};
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
			component._world.setContinuousPhysics(this._continuousPhysics);
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

		var tempDef: any = {};
		var param;
		var tempBod;
		var fixtureDef;
		var finalFixture;
		var tempShape;
		var tempFilterData;
		var i;
		var finalX;
		var finalY;
		var finalHWidth;
		var finalHHeight;

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
											if (fixtureDef.shape.data && typeof fixtureDef.shape.data.radius !== 'undefined') {
												tempShape.m_radius = fixtureDef.shape.data.radius / self._scaleRatio;
											} else {
												tempShape.m_radius = entity._bounds2d.x / self._scaleRatio / 2;
											}

											if (fixtureDef.shape.data) {
												finalX = fixtureDef.shape.data.x ?? 0;
												finalY = fixtureDef.shape.data.y ?? 0;

												tempShape.m_p = new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio);
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
											tempShape._setAsBox(
												finalHWidth / self._scaleRatio,
												finalHHeight / self._scaleRatio,
												new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio),
												0
											);
											break;
									}

									if (tempShape && fixtureDef.filter) {
										var fd: any = {};

										fd.friction = fixtureDef.friction;
										fd.restitution = fixtureDef.restitution;
										fd.density = fixtureDef.density;
										fd.isSensor = fixtureDef.isSensor;
										fd.filterGroupIndex = fixtureDef.filter.filterGroupIndex;
										fd.filterCategoryBits = fixtureDef.filter.filterCategoryBits;
										fd.filterMaskBits = fixtureDef.filter.filterMaskBits;

										finalFixture = tempBod.createFixture(tempShape, fd, isLossTolerant);
										finalFixture.taroId = fixtureDef.taroId;
									}
								}
							}
						} else {
							PhysicsComponent.prototype.log(
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
		entity.rotateTo(0, 0, entity._rotate.z);

		PhysicsComponent.prototype.log(
			`successfully created body for ${entity.id()} ${entity._category} ${entity._stats.name} ${entity._stats.type}`
		);

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
			entityA &&
			entityA.body &&
			entityB &&
			entityB.body && // make sure both entities have bodies
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
						localAnchorB: localAnchorB,
					},
					entityA.body,
					entityB.body
				);
			} // weld joint
			else {
				var joint_def = planck.WeldJoint(
					{
						frequencyHz: 0, // The mass-spring-damper frequency in Hertz. Rotation only. Disable softness with a value of 0.
						dampingRatio: 0, // The damping ratio. 0 = no damping, 1 = critical damping
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
	},
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = planckWrapper;
}
