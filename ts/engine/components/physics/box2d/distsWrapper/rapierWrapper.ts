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
			// component._world = new RAPIER.World(component._gravity);
			// component._world.SetContinuousPhysics(this._continuousPhysics);
		};
	},

	getBodyPosition: (body: any, self: any) => {
		console.log('getBodyPosition not implemented');
	},

	queryAABB: (self: any, aabb: any, callback: (...args: any) => any) => {
		console.log('queryAABB not implemented');
	},

	createBody: (self: any, entity: any, body: any, isLossTolerant: boolean) => {
		console.log('createBody not implemented');
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
