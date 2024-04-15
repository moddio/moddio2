// FIXME: add more types to the physics part of taro2
const rapierWrapper: PhysicsDistProps = {
	// added by Moe'Thun for fixing memory leak bug
	init: async function (component) {
		let RAPIER = rapier.rapier ?? rapier
		await RAPIER.init();
		component.RAPIER = RAPIER;
		component.rapierWorld = RAPIER.World;
		component.rapierWorld.prototype.destroyBody = component.rapierWorld.prototype.removeRigidBody;
		component.rapierWorld.prototype.isLocked = () => false;
		component.createWorld = function (id, options) {
			component._world = new component.rapierWorld(component._gravity);
			let groundColliderDesc = RAPIER.ColliderDesc.cuboid(10000.0, 5.0, 10000.0);
			component._world.createCollider(groundColliderDesc);
		};

		/**
		 * Gets / sets the gravity vector.
		 * @param x
		 * @param y
		 * @param z
		 * @return {*}
		 */
		component.gravity = function (x, y, z) {

			let gravity = { x: x ? parseFloat(x) : 0, y: y ? parseFloat(y) * 5: 0, z: z ? parseFloat(z) : 0 };
			component._gravity = gravity;
		};

		component.setContinuousPhysics = function (continuousPhysics) {
			this._continuousPhysics = continuousPhysics;
		};
		component._continuousPhysics = false;
		component._sleep = true;
		component._gravity = { x: 0, y: 0, z: 0 };
	},

	contactListener: function (self, beginContactCallback, endContactCallback, preSolve, postSolve) {
		//TODO
	},

	getmxfp: function (body: any) {
		return body.translation();
	},

	queryAABB: function (self, aabb, callback) {
		//TODO
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
		let rigidBodyDesc: any;
		let tempBody: any;
		let param: any;
		let RAPIER = self.RAPIER;
		// Process body definition and create a box2d body for it
		switch (body.type) {
			case 'static':
				rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
				break;

			case 'dynamic':
				rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
				break;

			case 'kinematic':
				rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
				break;
		}
		// Add the parameters of the body to the new body instance
		// TODO
		// for (param in body) {
		// 	if (body.hasOwnProperty(param)) {
		// 		switch (param) {
		// 			case 'type':
		// 			case 'gravitic':
		// 			case 'fixedRotation':
		// 			case 'fixtures':
		// 				// Ignore these for now, we process them
		// 				// below as post-creation attributes
		// 				break;

		// 			default:
		// 				const funcName = `set_${param}`;
		// 				if (typeof tempDef[funcName] === 'function') {
		// 					tempDef[funcName](body[param]);
		// 				} else {
		// 					// tempDef[param] = body[param];
		// 				}
		// 				break;
		// 		}
		// 	}
		// }

		// set rotation
		rigidBodyDesc.setRotation({ w: entity._rotate.z, x: 0.0, y: 0.0, z: 0.0 })
		rigidBodyDesc.setTranslation(entity._translate.x / self._scaleRatio, 300, entity._translate.y / self._scaleRatio);

		// Create the new body
		try {
			tempBody = self._world.createRigidBody(rigidBodyDesc);
		} catch (e) {

		}


		// Now apply any post-creation attributes we need to
		for (param in body) {
			if (body.hasOwnProperty(param)) {
				switch (param) {
					case 'gravitic':
						if (!body.gravitic) {
							tempBody.setGravityScale(0);
						}
						break;

					case 'fixedRotation':
						if (body.fixedRotation) {
							tempBody.lockRotations(true);
						}
						break;

					// TODO
					// case 'fixtures':
					// 	if (body.fixtures && body.fixtures.length) {
					// 		for (i = 0; i < body.fixtures.length; i++) {
					// 			// Grab the fixture definition
					// 			fixtureDef = body.fixtures[i];
					// 			// Create the fixture
					// 			tempFixture = self.createFixture(fixtureDef);
					// 			// console.log(tempFixture.get_density());
					// 			// Check for a shape definition for the fixture
					// 			if (fixtureDef.shape) {
					// 				// Create based on the shape type
					// 				switch (fixtureDef.shape.type) {
					// 					case 'circle':
					// 						tempShape = self.recordLeak(new self.b2CircleShape());
					// 						if (fixtureDef.shape.data && typeof fixtureDef.shape.data.radius !== 'undefined') {
					// 							tempShape.set_m_radius(fixtureDef.shape.data.radius / self._scaleRatio);
					// 						} else {
					// 							tempShape.set_m_radius(entity._bounds2d.x / self._scaleRatio / 2);
					// 						}

					// 						if (fixtureDef.shape.data) {
					// 							finalX = fixtureDef.shape.data.x ?? 0;
					// 							finalY = fixtureDef.shape.data.y ?? 0;
					// 							const pos = self.recordLeak(
					// 								new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio)
					// 							);
					// 							(tempShape as Box2D.b2CircleShape).set_m_p(pos);
					// 							self.destroyB2dObj(pos);
					// 						}
					// 						break;

					// 					case 'rectangle':
					// 						tempShape = self.recordLeak(new self.b2PolygonShape());

					// 						if (fixtureDef.shape.data) {
					// 							finalX = fixtureDef.shape.data.x ?? 0;
					// 							finalY = fixtureDef.shape.data.y ?? 0;
					// 							finalHWidth = fixtureDef.shape.data.halfWidth ?? entity._bounds2d.x / 2;
					// 							finalHHeight = fixtureDef.shape.data.halfHeight ?? entity._bounds2d.y / 2;
					// 						} else {
					// 							finalX = 0;
					// 							finalY = 0;
					// 							finalHWidth = entity._bounds2d.x / 2;
					// 							finalHHeight = entity._bounds2d.y / 2;
					// 						}

					// 						const pos = self.recordLeak(
					// 							new self.b2Vec2(finalX / self._scaleRatio, finalY / self._scaleRatio)
					// 						);
					// 						// Set the polygon as a box
					// 						(tempShape as Box2D.b2PolygonShape).SetAsBox(
					// 							finalHWidth / self._scaleRatio,
					// 							finalHHeight / self._scaleRatio,
					// 							pos,
					// 							0
					// 						);
					// 						self.destroyB2dObj(pos);
					// 						break;
					// 				}
					// 				if (tempShape && fixtureDef.filter) {
					// 					tempFixture.set_shape(tempShape);
					// 					finalFixture = tempBody.CreateFixture(tempFixture);
					// 					self.destroyB2dObj(tempShape);
					// 					self.destroyB2dObj(tempFixture);
					// 					self.metaData[bodyId].taroId = fixtureDef.taroId;
					// 				}
					// 			}

					// 			if (fixtureDef.filter && finalFixture) {
					// 				tempFilterData = self.recordLeak(new self._entity.physics.b2FilterData());

					// 				if (fixtureDef.filter.filterCategoryBits !== undefined) {
					// 					tempFilterData.categoryBits = fixtureDef.filter.filterCategoryBits;
					// 				}
					// 				if (fixtureDef.filter.filterMaskBits !== undefined) {
					// 					tempFilterData.maskBits = fixtureDef.filter.filterMaskBits;
					// 				}
					// 				if (fixtureDef.filter.categoryIndex !== undefined) {
					// 					tempFilterData.categoryIndex = fixtureDef.filter.categoryIndex;
					// 				}

					// 				finalFixture.SetFilterData(tempFilterData);
					// 				self.destroyB2dObj(tempFilterData);
					// 			}

					// 			if (fixtureDef.friction !== undefined && finalFixture) {
					// 				finalFixture.SetFriction(fixtureDef.friction);
					// 			}
					// 			if (fixtureDef.restitution !== undefined && finalFixture) {
					// 				finalFixture.SetRestitutionThreshold(fixtureDef.restitution);
					// 			}
					// 			if (fixtureDef.density !== undefined && finalFixture) {
					// 				finalFixture.SetDensity(fixtureDef.density);
					// 			}
					// 			if (fixtureDef.isSensor !== undefined && finalFixture) {
					// 				finalFixture.SetSensor(fixtureDef.isSensor);
					// 			}
					// 		}
					// 	} else {
					// 		self.log(
					// 			'Box2D body has no fixtures, have you specified fixtures correctly? They are supposed to be an array of fixture anys.',
					// 			'warning'
					// 		);
					// 	}
					// 	break;
				}
			}
		}

		try {
			// Store the entity that is linked to self body
			// self.metaData[bodyId]._entity = entity;
			tempBody.setEnabled(true);
			// Add the body to the world with the passed fixture
			entity.body = tempBody;
			entity.body.setAdditionalMass(body.density ?? 1);
			entity.body._entity = entity;
			entity.body.setLinearDamping(0.7)
			let colliderDesc = RAPIER.ColliderDesc.cuboid(0.2, 0.2, 0.2);

			let collider = self._world.createCollider(colliderDesc, entity.body);
			if (!!body.affectedByGravity) {
				// tempBody.setGravityScale(0)
			}

		} catch (e) {

		}
		return tempBody;
	},

	createJoint: function (self, entityA, entityB, anchorA, anchorB) {
		// TODO;
	},
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = rapierWrapper;
}
