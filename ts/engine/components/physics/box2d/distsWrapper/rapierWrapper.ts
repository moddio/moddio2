const rapierWrapper: PhysicsDistProps = {
	init: async function (component) {
		await RAPIER.init();

		console.log('Rapier 3D version', RAPIER.version(), 'initialized');

		// // Use the RAPIER module here.
		// let gravity = { x: 0.0, y: -9.81, z: 0.0 };
		// let world = new RAPIER.World(gravity);

		// // Create the ground
		// let groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0);
		// world.createCollider(groundColliderDesc);

		// // Create a dynamic rigid-body.
		// let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 1.0, 0.0);
		// let rigidBody = world.createRigidBody(rigidBodyDesc);

		// // Create a cuboid collider attached to the dynamic rigidBody.
		// let colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
		// let collider = world.createCollider(colliderDesc, rigidBody);

		// // Game loop. Replace by your own game loop system.
		// let gameLoop = () => {
		// 	// Ste the simulation forward.
		// 	world.step();

		// 	// Get and print the rigid-body's position.
		// 	let position = rigidBody.translation();
		// 	console.log('Rigid-body position: ', position.x, position.y, position.z);

		// 	setTimeout(gameLoop, 16);
		// };

		// gameLoop();

		component.rigidBodies = new Map();

		component._continuousPhysics = false;
		component._sleep = true;
		component._gravity = { x: 0.0, y: 0, z: 0.0 }; // why is this set on the component?

		component.gravity = function (x, y) {
			console.log('Setting gravity to', x, y);
			component._gravity.x = x;
			component._gravity.z = y;
		};

		component.setContinuousPhysics = function (toggle: boolean) {
			console.log('Setting continuos physics to', toggle);
			component._continuousPhysics = toggle;
		};

		component.createWorld = function (id, options) {
			component._world = new RAPIER.World(component._gravity);
			// component._world.SetContinuousPhysics(this._continuousPhysics);
		};

		component.isLocked = function () {
			return false;
		};

		component.getBodyList = function () {
			return undefined;
		};

		component.step = function () {
			component._world.step();
		};

		component.clearForces = function () {};

		component.getJointList = function () {
			return undefined;
		};
	},

	getmxfp: (body: any, self: any) => {
		console.log('getmxfp not implemented');
	},

	queryAABB: (self: any, aabb: any, callback: (...args: any) => any) => {
		console.log('queryAABB not implemented');
	},

	createBody: (self: any, entity: any, body: any, isLossTolerant: boolean) => {
		console.log('createBody called');

		PhysicsComponent.prototype.log(`createBody of ${entity._stats.name}`);
		if (!entity) {
			PhysicsComponent.prototype.log('warning: creating body for non-existent entity');
			return;
		}
		let ownerEntity = undefined;
		if (body.fixtures[0].isSensor) {
			ownerEntity = taro.$(entity.ownerUnitId);
			if (ownerEntity && ownerEntity.sensor && ownerEntity.sensor.getRadius() <= 0) {
				return;
			}
		}

		const linearDamping = body.linearDamping ?? 0;
		const angularDamping = body.angularDamping ?? 0;

		const createDynamicRigidBodyDesc = () => {
			return RAPIER.RigidBodyDesc.dynamic().setLinearDamping(linearDamping).setAngularDamping(angularDamping);
		};

		const rigidBodyDesc = taro.isServer
			? createDynamicRigidBodyDesc()
			: entity._stats.controls?.clientPredictedMovement
				? createDynamicRigidBodyDesc()
				: RAPIER.RigidBodyDesc.kinematicPositionBased();

		const rigidBody = self._world.createRigidBody(rigidBodyDesc);

		rigidBody.setGravityScale(10, true);

		const pos = entity._translate;
		rigidBody.setTranslation({ x: pos.x / 64, y: 1, z: pos.y / 64 }, true);

		self.rigidBodies.set(entity.id(), rigidBody.handle);

		let halfWidth = 0;
		let halfHeight = 0;
		let density = 1.0;
		let friction = 0.5;
		let restitution = 0;

		if (body.fixtures?.length) {
			const fixture = body.fixtures[0];

			halfWidth =
				((entity._stats?.width ?? 0) / 2 || fixture.shape?.data?.halfWidth) ?? entity?._stats?.currentBody?.width / 2;
			halfHeight =
				((entity._stats?.height ?? 0) / 2 || fixture.shape?.data?.halfHeight) ??
				entity?._stats?.currentBody?.height / 2;

			density = fixture.density ?? density;
			friction = fixture.friction ?? friction;
			restitution = fixture.restitution ?? restitution;
		}

		halfWidth = halfWidth / 64;
		halfHeight = halfHeight / 64;

		const colliderDesc = RAPIER.ColliderDesc.cuboid(halfWidth, 0.5, halfHeight)
			.setDensity(density)
			.setFriction(friction)
			.setRestitution(restitution)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
		self._world.createCollider(colliderDesc, rigidBody);

		// Store the entity that is linked to self body
		// self.metaData[bodyId]._entity = entity;
		// tempBod.SetEnabled(true);
		// Add the body to the world with the passed fixture
		// entity.body = tempBod;
		// entity.gravitic(!!body.affectedByGravity);
		// rotate body to its previous value
		entity.rotateTo(0, 0, entity._rotate.z);
		// Add the body to the world with the passed fixture
		// self.destroyB2dObj(tempDef);
		// self.freeLeaked();
		// return tempBod;
		return undefined;
	},

	createJoint: (self: any, entityA: any, entityB: any, anchorA: any, anchorB: any) => {
		console.log('createJoint not implemented');
	},

	contactListener: (
		self: any,
		beginContactCallback: (contact: any) => any,
		endContactCallback: (contact: any) => any,
		preSolve: (contact: any) => any,
		postSolve: (contact: any) => any
	) => {
		console.log('contactListener not implemented');
	},
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = rapierWrapper;
}
