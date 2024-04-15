type PhysicsDists = {
	PLANCK: PhysicsDistProps;
	BOX2DWASM: PhysicsDistProps;
	BOX2DWEB: PhysicsDistProps;
	BOX2DNINJA: PhysicsDistProps;
	BOX2DTS: PhysicsDistProps;
	NATIVE: PhysicsDistProps;
	BOX2D: PhysicsDistProps;
	RAPIER: PhysicsDistProps;
};

type PhysicsDistsEnum = keyof PhysicsDists;

type PhysicsDistProps = {
	init: (component: any) => void;
	getmxfp: (body: any, self: any) => any;
	queryAABB: (self: any, aabb: any, callback: (...args: any) => any) => void;
	createBody: (self: any, entity: any, body: any, isLossTolerant: boolean) => any;
	createJoint: (self: any, entityA: any, entityB: any, anchorA: any, anchorB: any) => void;
	contactListener: (
		self: any,
		beginContactCallback: (contact: any) => any,
		endContactCallback: (contact: any) => any,
		preSolve: (contact: any) => any,
		postSolve: (contact: any) => any
	) => void;
};

const dists: PhysicsDists & { defaultEngine: PhysicsDistsEnum } = {
	defaultEngine: 'PLANCK',
	/**
	 * NOTE:
	 * use keys as capital letters as obfuscating replaces lowercase keys
	 * which in result cause client unable to load any physic engine.
	 */
	PLANCK: planckWrapper,

	BOX2DWASM: box2dwasmWrapper,

	BOX2DWEB: box2dwebWrapper,

	BOX2DNINJA: box2dninjaWrapper,

	BOX2DTS: box2dtsWrapper,

	NATIVE: nativeWrapper,

	BOX2D: box2dWrapper,

	RAPIER: rapierWrapper,
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = dists;
}
