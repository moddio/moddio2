class PhysicsComponent extends TaroEventingClass {
	classId = 'PhysicsComponent';
	componentId = 'physics';
	// core
	_entity: TaroEngine;
	_options: PhysicsOptions;
	_callback: () => void;
	// engine specific
	engine: string;
	simulation: Box2dComponent | RapierComponent;
	// experimental
	// _scaleRatio = 30;
	// avgPhysicsTickDuration = 20.0;

	world: RAPIER.World;
	rigidBody: RAPIER.RigidBody;

	rigidBodies = new Map<string, number>();

	constructor(entity: TaroEngine, options: PhysicsOptions, callback: () => void) {
		super();
		this.engine = options.engine;
		this._entity = entity;
		this._options = options;
		this._callback = callback;
	}

	static log(msg: string, type?: string) {
		console.log(msg, type);
	}

	async load(): Promise<void> {
		this.simulation = new Box2dComponent(this._entity, this._options);
		await this.simulation.load();

		await RAPIER.init();
		this._callback();

		let gravity = { x: 0.0, y: -9.81, z: 0.0 };
		let world = new RAPIER.World(gravity);
		this.world = world;

		let groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0);
		world.createCollider(groundColliderDesc);
	}

	update(dt: number): void {
		this.simulation.update(dt);

		for (const entityId of this.rigidBodies.keys()) {
			const rigidBodyHandle = this.rigidBodies.get(entityId);
			const rigidBody = this.world.getRigidBody(rigidBodyHandle);
			const entity = taro.$(entityId);
			if (entity && rigidBody) {
				if (entity.vector) {
					const { y } = rigidBody.linvel();
					rigidBody.setLinvel({ x: entity.vector.x, y, z: entity.vector.y }, true);
				}
			}
		}

		this.world.step();

		const keys = this.rigidBodies.keys();
		for (const entityId of keys) {
			const rigidBodyHandle = this.rigidBodies.get(entityId);
			const rigidBody = this.world.getRigidBody(rigidBodyHandle);
			const entity = taro.$(entityId);
			if (entity && rigidBody) {
				const pos = rigidBody.translation();
				entity._translate.x = pos.x * 64;
				entity._translate.y = pos.z * 64;
			}
		}
	}

	createBody(entity: TaroEntity, body: b2Body): void {
		this.destroyBody(entity, body);
		if (entity._category === 'sensor') return;

		// this.simulation.createBody(entity, body);

		const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
		const rigidBody = this.world.createRigidBody(rigidBodyDesc);

		const pos = entity._translate;
		rigidBody.setTranslation({ x: pos.x / 64, y: 5, z: pos.y / 64 }, true);

		this.rigidBodies.set(entity.id(), rigidBody.handle);

		const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
		const collider = this.world.createCollider(colliderDesc, rigidBody);
	}

	destroyBody(entity: TaroEntity, body: b2Body): void {
		const entityId = entity.id();

		for (const knownEntityId of this.rigidBodies.keys()) {
			if (entityId === knownEntityId) {
				const rigidBodyHandle = this.rigidBodies.get(knownEntityId);
				if (!isNaN(rigidBodyHandle)) {
					const rigidBody = this.world.getRigidBody(rigidBodyHandle);
					if (rigidBody) {
						this.world.removeRigidBody(rigidBody);
					}
				}
				break;
			}
		}
	}

	// /* CONVERT TO COMMENT BLOCKS */

	// createWorld(): void {
	// 	//@ts-ignore
	// 	this.simulation.createWorld();
	// }

	// gravity(x: number, y: number): void {
	// 	//@ts-ignore
	// 	this.simulation.gravity(x, y);
	// }

	// setContinuousPhysics(continuousPhysics: boolean) {
	// 	//@ts-ignore
	// 	this.simulation.setContinuousPhysics(continuousPhysics);
	// }

	// // b2d unused
	// useWorker(): void {}
	// // b2d get/set
	// mode(val?: number): TaroEngine | number {
	// 	return !isNaN(val) ? this.simulation.mode(val) : this.simulation.mode();
	// }
	// // b2d get/set
	// sleep(val?: number): TaroEngine | number {
	// 	return !isNaN(val) ? this.simulation.sleep(val) : this.simulation.sleep();
	// }
	// // b2d get/set
	// scaleRatio(val?: number): TaroEngine | number {
	// 	return !isNaN(val) ? this.simulation.scaleRatio(val) : this.simulation.scaleRatio();
	// }
	// // b2d get/set
	// tilesizeRatio(val?: number): TaroEngine | number {
	// 	return !isNaN(val) ? this.simulation.tilesizeRatio(val) : this.simulation.tilesizeRatio();
	// }
	// // b2d get
	// world(): b2World {
	// 	return this.simulation.world();
	// }
	// // b2d create fixture from params and fixture def
	// createFixture(params: Record<string, any>): Record<string, any> {
	// 	return this.simulation.createFixture(params);
	// }
	// // b2d create body from definition and assign it to provided entity
	// // b2d destroy body and remove it from entity
	// destroyBody(entity: TaroEntity, body: b2Body): void {
	// 	this.simulation.destroyBody(entity, body);
	// }
	// // b2d unused
	// createJoint(): void {}
	// // b2d unused
	// destroyJoint(): void {}
	// // b2d check rectangle for entities
	// getBodiesInRegion(region: TaroEntity & { width: number; height: number; x: number; y: number }): TaroEntity[] {
	// 	return this.simulation.getBodiesInRegion(region);
	// }
	// // b2d create physics bodies for map walls
	// staticsFromMap(mapLayer: any, callback: () => any): void {
	// 	this.simulation.staticsFromMap(mapLayer, callback);
	// }
	// // b2d destroy all walls
	// destroyWalls(): void {
	// 	this.simulation.destroyWalls();
	// }
	// // b2d assign callbacks for different parts of a contact's lifetime
	// contactListener(beginContact?: () => any, endContact?: () => any, preSolve?: () => any, postSolve?: () => any): void {
	// 	this.simulation.contactListener(beginContact, endContact, preSolve, postSolve);
	// }
	// // b2d get/set - disable collision generation for the world
	// networkDebugMode(val?: boolean): TaroEngine | boolean {
	// 	return val == undefined ? this.simulation.networkDebugMode() : this.simulation.networkDebugMode(val);
	// }
	// // b2d (except planck) enable physics debug draw graphics
	// enableDebug(mountScene?: TaroEntity): void {
	// 	this.simulation.enableDebug(mountScene);
	// }
	// // b2d get/set callback for every physics world step
	// updateCallback(callback?: () => any): TaroEngine | (() => any) {
	// 	return callback ? this.simulation.updateCallback(callback) : this.simulation.updateCallback();
	// }
	// // b2d
	// start(): void {
	// 	this.simulation.start();
	// }
	// // b2d
	// stop(): void {
	// 	this.simulation.stop();
	// }
	// // b2d add physics actions to the engine's queue
	// // b2d core simulation update method
	// // stepped by TaroEngine
	// // b2d destroy physics simulation
	// destroy(): void {
	// 	this.simulation.destroy();
	// }
	// // b2d call engine script triggers on contact begin
	// _triggerContactEvent(entityA: TaroEntity, entityB: TaroEntity): void {
	// 	this.simulation._triggerContactEvent(entityA, entityB);
	// }
	// // b2d call engine script triggers on contact end
	// _triggerLeaveEvent(entityA: TaroEntity, entityB: TaroEntity): void {
	// 	this.simulation._triggerLeaveEvent(entityA, entityB);
	// }
	// // b2d taro callback for beginning of a contact
	// _beginContactCallback(contact: any): void {
	// 	this.simulation._beginContactCallback(contact);
	// }
	// // b2d taro callback for end of a contact
	// _endContactCallback(contact: any): void {
	// 	this.simulation._endContactCallback(contact);
	// }
	// // b2d adds taro contact callbacks via contactListener
	// _enableContactListener(): void {
	// 	this.simulation._enableContactListener();
	// }
}

type PhysicsOptions = {
	engine: string;
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = PhysicsComponent;
}
