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

	_deathCallBack?: () => void;
	_behaviour?: () => void;
	anchoredOffset: any;

	_processTransform(): void;

	isHidden(): boolean;
	getOwnerUnit(): TaroEntity | undefined;
	streamUpdateData(queuedData: UpdateData[]);
	transformTexture(x: number, y: number, z: number, type?: boolean);

	flip(flip: FlipMode): void;

	// raycast
	point: any;
	raycastFraction: number;
}
