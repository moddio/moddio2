declare class Client extends IgeEventingClass {

	myPlayer: IgeEntity;
	selectedUnit: IgeEntity;
	entityUpdateQueue: Record<string, UpdateData[]>;

	rendererLoaded: JQueryDeferred<void>;

	isZooming: boolean;

	constructor(options?: object);
}
