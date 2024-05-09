declare class Box2dComponent extends TaroEventingClass {
	engine: string;
	totalBodiesCreated: number;
	load(): Promise<void>;
	useWorker(any): any;
	mode(any): any;
	sleep(any): any;
	scaleRatio(any): any;
	tilesizeRatio(any): any;
	world(any): any;
	createFixture(any): any;
	createBody(any): any;
	destroyBody(any): any;
	createJoint(any): any;
	destroyJoint(any): any;
	getBodiesInRegion(any): any;
	staticsFromMap(any): any;
	destroyWalls(any): any;
	contactListener(any): any;
	networkDebugMode(any): any;
	enableDebug(any): any;
	updateCallback(any): any;
	start(any): any;
	stop(any): any;
	queueAction(any): any;
	update(any): any;
	destroy(any): any;
	_triggerContactEvent(any): any;
	_triggerLeaveEvent(any): any;
	_beginContactCallback(any): any;
	_endContactCallback(any): any;
	_enableContactListener(any): any;
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
