declare class Client extends TaroEventingClass {
	getCachedElementById: any;

	myPlayer: TaroEntity;
	selectedUnit: TaroEntity;
	entityUpdateQueue: Record<string, UpdateData[]>;

	rendererLoaded: JQueryDeferred<void>;

	isZooming: boolean;
	developerClientIds: any;
	zoom: number;
	isPressingPhaserButton: boolean;

	constructor(options?: object);
}
