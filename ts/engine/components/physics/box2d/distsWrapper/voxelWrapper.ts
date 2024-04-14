const voxelWrapper: PhysicsDistProps = {
	init: function (component: any): void {
		console.log(rapier)
		let RAPIER = rapier.rapier ?? rapier
		console.log('rapier=', RAPIER.init().then(()=>{
			// Use the RAPIER module here.
			let gravity = { x: 0.0, y: -9.81, z: 0.0 };
			let world = new RAPIER.World(gravity);

			// Create the ground
			let groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0);
			world.createCollider(groundColliderDesc);

			// Create a dynamic rigid-body.
			let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(0.0, 1.0, 0.0);
			let rigidBody = world.createRigidBody(rigidBodyDesc);

			// Create a cuboid collider attached to the dynamic rigidBody.
			let colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
			let collider = world.createCollider(colliderDesc, rigidBody);

			// Game loop. Replace by your own game loop system.
			let gameLoop = () => {
			  // Ste the simulation forward.
			  world.step();

			  // Get and print the rigid-body's position.
			  let position = rigidBody.translation();
			  console.log("Rigid-body position: ", position.x, position.y, position.z);

			  setTimeout(gameLoop, 16);
			};

			gameLoop();
		}))
		component.voxelPhysics = new voxel();

		component.gravity = component.voxelPhysics.setGravity.bind(component.voxelPhysics);
		component.setContinuousPhysics = function (continuousPhysics) {
			this._continuousPhysics = continuousPhysics;
		};
		component.createWorld = function (id, options) {
			component._world = component.voxelPhysics.world;
		};
	},
	getmxfp: function (body: any, self: any) {
		return body.getPosition();
	},
	queryAABB: function (self: any, aabb: any, callback: (...args: any) => any): void {
		throw new Error('Function not implemented.');
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
			self.voxelPhsics.destroyBody(entity.body);
		}
		let nowPoint = [entity._translate.x / self._scaleRatio, 300, entity._translate.y / self._scaleRatio]
		entity.body = self._world.createBody({
			_aabb: undefined, mass: body.density, friction: body.friction,
			restitution: body.restitution, onCollide: (v) => {
			}
		});
		entity.body.setPosition(nowPoint);
		entity.body.resting = [0, -1, 0];
		entity.body._entity = entity;
		return entity.body;
	},
	createJoint: function (self: any, entityA: any, entityB: any, anchorA: any, anchorB: any): void {
		throw new Error('Function not implemented.');
	},
	contactListener: function (
		self: any,
		beginContactCallback: (contact: any) => any,
		endContactCallback: (contact: any) => any,
		preSolve: (contact: any) => any,
		postSolve: (contact: any) => any
	): void {
		return undefined;
	},
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = voxelWrapper;
}
