declare class IgeEngine extends IgeClass {

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

	network: IgeNetIoComponent;

	input: IgeInputComponent;

	mobileControls: MobileControlsComponent;

	gameLoopTickHasExecuted: boolean;

	game: GameComponent;

	renderer: PhaserRenderer;

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

	constructor(options: object);

	createFrontBuffer (autoSize: boolean, dontScale?: boolean): void
	engineStep (): void;

	$ (item: number | string | object): any;
}
