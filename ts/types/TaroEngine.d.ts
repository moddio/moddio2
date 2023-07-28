declare class TaroEngine extends TaroClass {
	newIdHex(): any;

	tiled: any;
	regionManager: any;
	showRegionList: any;
	unitBeingDragged: any;
	map: any;
	scaleMap(data: any): void;

	_renderFrames: number;
	_tickStart: number;

	_currentTime: number;
	_cullCounter: number;

	env: string;

	isClient: boolean;
	isServer: boolean;

	isMobile: boolean;

	client: Client;
	server: Client;

	network: TaroNetIoComponent;

	input: TaroInputComponent;

	mobileControls: MobileControlsComponent;

	gameLoopTickHasExecuted: boolean;

	game: GameComponent;

	renderer: PhaserRenderer;

	developerMode: DeveloperMode;

	scaleMapDetails: {
		scaleFactor: {
			x: number;
			y: number;
		};
		shouldScaleTilesheet: boolean;
		tileWidth: number;
		tileHeight: number;
		originalTileHeight: number;
		originalTileWidth: number;
	};

	lastTickTime: number;

	entitiesToRender: EntitiesToRender;
	triggersQueued: any[];

	constructor(options: object);

	createFrontBuffer(autoSize: boolean, dontScale?: boolean): void
	engineStep(): void;

	physics: {
		staticsFromMap(walls: any): unknown;
		destroyWalls(): unknown;
		world(): any;
		engine: string;
		_scaleRatio: number;
	};

	$(item: number | string | object): any;
	$$(item: number | string | object): any;

	menuUi: MenuUiComponent;
}
