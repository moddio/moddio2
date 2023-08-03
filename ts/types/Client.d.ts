declare class Client extends TaroEventingClass {

	myPlayer: TaroEntity;
	selectedUnit: TaroEntity;
	entityUpdateQueue: Record<string, UpdateData[]>;

	rendererLoaded: JQueryDeferred<void>;

	isZooming: boolean;
	developerClientIds: any;
	zoom: number;
	resolutionCoefficient: number;

	constructor(options?: object);
}
