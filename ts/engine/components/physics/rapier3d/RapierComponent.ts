type RAPIER_API = typeof RAPIER;

class RapierComponent extends TaroEventingClass {
	// TODO: discern 2d/3d in engine and serve sources dynamically
	//		 so we can name these physics
	classId = 'RapierComponent';
	// core
	_entity: TaroEngine;
	_options: PhysicsOptions;
	_callback: () => Promise<void>;
	// engine will always be rapier
	engine = 'RAPIER';
	world3d: RAPIER.World;
	// scaleRatio = 30;
	//
	constructor() {
		// core functionality / inherited
		super();
	}

	async load(): Promise<void> {
		await RAPIER.init();
		// decide whether to init with Vector3.Zero or default earth gravity
		this.world3d = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
	}

	destroyBody3d(body: RAPIER.RigidBody): void {
		// from docs World.removeRigidBody()

		// This will remove this rigid-body as well as all its attached colliders
		// and joints. Every other bodies touching or attached by joints to this
		// rigid-body will be woken-up.
		this.world3d.removeRigidBody(body);
	}
	useWorker(...args: any[]): void {}
	mode(...args: any[]): void {}
	sleep(...args: any[]): void {}
	scaleRatio(...args: any[]): void {}
	tilesizeRatio(...args: any[]): void {}
	world(...args: any[]): void {}
	createFixture(...args: any[]): void {}
	createBody(...args: any[]): void {}
	destroyBody(...args: any[]): void {}
	createJoint(...args: any[]): void {}
	destroyJoint(...args: any[]): void {}
	getBodiesInRegion(...args: any[]): void {}
	staticsFromMap(...args: any[]): void {}
	destroyWalls(...args: any[]): void {}
	contactListener(...args: any[]): void {}
	networkDebugMode(...args: any[]): void {}
	enableDebug(...args: any[]): void {}
	updateCallback(...args: any[]): void {}
	start(...args: any[]): void {}
	stop(...args: any[]): void {}
	queueAction(...args: any[]): void {}
	update(...args: any[]): void {}
	destroy(...args: any[]): void {}
	_triggerContactEvent(...args: any[]): void {}
	_triggerLeaveEvent(...args: any[]): void {}
	_beginContactCallback(...args: any[]): void {}
	_endContactCallback(...args: any[]): void {}
	_enableContactListener(...args: any[]): void {}
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = RapierComponent;
}
