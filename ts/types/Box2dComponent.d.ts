declare class Box2dComponent extends TaroEventingClass {
	constructor(entity: TaroEngine, options: PhysicsOptions);
	engine: string;
	totalBodiesCreated: number;
	load(): Promise<void>;
	useWorker(...args: any[]): any;
	mode(...args: any[]): any;
	sleep(...args: any[]): any;
	scaleRatio(...args: any[]): any;
	tilesizeRatio(...args: any[]): any;
	world(...args: any[]): any;
	createFixture(...args: any[]): any;
	createBody(...args: any[]): any;
	destroyBody(...args: any[]): any;
	createJoint(...args: any[]): any;
	destroyJoint(...args: any[]): any;
	getBodiesInRegion(...args: any[]): any;
	staticsFromMap(...args: any[]): any;
	destroyWalls(...args: any[]): any;
	contactListener(...args: any[]): any;
	networkDebugMode(...args: any[]): any;
	enableDebug(...args: any[]): any;
	updateCallback(...args: any[]): any;
	start(...args: any[]): any;
	stop(...args: any[]): any;
	queueAction(...args: any[]): any;
	update(...args: any[]): any;
	destroy(...args: any[]): any;
	_triggerContactEvent(...args: any[]): any;
	_triggerLeaveEvent(...args: any[]): any;
	_beginContactCallback(...args: any[]): any;
	_endContactCallback(...args: any[]): any;
	_enableContactListener(...args: any[]): any;
}

declare type b2World = {
	QueryAABB: (any) => any;
	rayCast: (any) => any;
};

declare type b2Body = {
	type: string;
	linearDamping: number;
	angularDamping: number;
	allowSleep: boolean;
	bullet: boolean;
	fixedRotation: boolean;
	affectedByGravity: boolean;
	fixtures: b2Fixture[];
	defaultData: {
		translate: {
			x: number;
			y: number;
			z: number;
		};
		rotate: {
			x: number;
			y: number;
			z: number;
		};
	};
};

declare type b2Fixture = {
	density: number;
	friction: number;
	restitution: number;
	isSensor: boolean;
	filter: {
		filterGroupIndex: number;
		filterCategoryBits: number;
		filterMaskBits: number;
	};
	shape: {
		type: string;
		data: {
			halfWidth?: number;
			halfHeight?: number;
			x?: number;
			y?: number;
		};
	};
	taroId: string;
};
