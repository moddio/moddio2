interface EntityData {
	cellSheet: {
		columnCount: number;
		rowCount: number;
		url: string;
	},
	animations: Record<string, {
		frames: number[];
		framesPerSecond: number;
		loopCount: number;
		name: string;
	}>
}

interface MapData {
	wasEdited: boolean;
	haveUnsavedChanges: boolean;
	tilewidth: number;
	tileheight: number;
	width: number,
	height: number,
	tilesets: {
		image: string;
		margin: number;
		name: string;
		spacing: number;
		tilecount: number;
		tileheight: number;
		tilewidth: number;
	}[];
	layers: {
		data: number[];
		name: string;
		width: number,
		height: number,
		id: number,
		type: 'tilelayer' | 'objectgroup';
	}[];
}

declare class GameComponent extends TaroEntity {
	lastCreatedUnitId: string;
	getAsset(arg0: string, unitTypeId: string): any;
	getPlayerByClientId(clientId: string): Player;

	data: {
		defaultData: any;
		map: MapData;
		unitTypes: Record<string, EntityData>;
		projectileTypes: Record<string, EntityData>;
		itemTypes: Record<string, EntityData>;
		settings: {
			addStrokeToNameAndAttributes: boolean;
			camera: {
				trackingDelay: number;
				zoom : {
					default:number;
				}
			}
		}
		heightBasedZIndex: boolean;
		texturePack: any;
	};

	entitiesCollidingWithLastRaycast: TaroEntity[];

}
