type RAPIER_API = typeof RAPIER;

class Physics3dComponent extends TaroEventingClass {
	// TODO: discern 2d/3d in engine and serve sources dynamically
	//		 so we can name these physics
	classId = 'Physics3dComponent';
	componentId = 'physics3d';
	// core
	_entity: TaroEngine;
	_options: PhysicsOptions;
	_callback: () => Promise<void>;
	// engine will always be rapier
	engine = 'RAPIER';
	world: RAPIER.World;
	//
	constructor(entity: TaroEngine, options: PhysicsOptions, callback: () => Promise<void>) {
		// core functionality / inherited
		super();
		this._entity = entity;
		this._options = options;
		this._callback = callback;

		this._init();
	}

	private async _init(): Promise<void> {
		await RAPIER.init();
		// decide whether to init with Vector3.Zero or default earth gravity
		this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
		this._callback();
	}
}

type PhysicsOptions = {};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Physics3dComponent;
}
