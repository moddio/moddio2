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
	//
	constructor(entity: TaroEngine, options: PhysicsOptions, callback: () => Promise<void>) {
		// core functionality / inherited
		super();
		this._entity = entity;
		this._options = options;
		this._callback = callback;

		//
		try {
			rapier.init();
		} catch (e) {
			console.error(e);
		}
	}
}

type PhysicsOptions = {};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Physics3dComponent;
}
