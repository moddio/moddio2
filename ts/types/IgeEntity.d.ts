declare class IgeEntity extends IgeObject {

	_alive: boolean;
	_destroyed: boolean;
	_deathTime: number;
	_category: string; // TODO more specific values
	_translate: IgePoint3d;
	_rotate: IgePoint3d;
	_scale: IgePoint3d;
	_stats: EntityStats;
	_bounds2d: IgePoint2d;
	_depth: number;
	_layer: number;

	angleToTarget: number;
	tween: TweenComponent;

	_deathCallBack?: () => void;
	_behaviour?: () => void;

	_processTransform (): void

	isHidden (): boolean;
	getOwnerUnit (): IgeEntity | undefined;
	streamUpdateData (queuedData: UpdateData[]);
	transformTexture (x: number, y: number, z: number, type?: boolean);

	flip (flip: FlipMode): void
}
