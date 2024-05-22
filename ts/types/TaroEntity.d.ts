declare class TaroEntity extends TaroObject {
	isTransforming(bool?: boolean): boolean;
	phaserEntity: PhaserEntity;
	nextKeyFrame: { x: number; y: number; rotation: number };
	lastUpdatedData: any;
	script: any;
	getAnchoredOffset(rotate: number): any;

	_alive: boolean;
	_destroyed: boolean;
	_deathTime: number;
	_category: string; // TODO more specific values
	_translate: TaroPoint3d;
	_rotate: TaroPoint3d;
	_scale: TaroPoint3d;
	_stats: EntityStats;
	_bounds2d: TaroPoint2d;
	_depth: number;
	_layer: number;
	_id: string;
	_bornTime: number;
	angleToTarget: number;
	tween: TweenComponent;

	lastServerPosition: TaroPoint3d;
	lastServerRotation: TaroPoint3d;

	serverPosition: TaroPoint3d;
	serverRotation: TaroPoint3d;

	lastPhysicsPosition: TaroPoint3d;
	physicsPosition: TaroPoint3d;

	_deathCallBack?: () => void;
	_behaviour?: () => void;
	anchoredOffset: any;

	_processTransform(): void;

	getOwnerUnit(): TaroEntity | undefined;
	streamUpdateData(queuedData: UpdateData[]);
	emitTransformOnClient(x: number, y: number, z: number, rotate: number, type?: boolean);

	flip(flip: FlipMode): void;

	// raycast
	point: any;
	raycastFraction: number;

	isClientPredicted(): boolean;
}
