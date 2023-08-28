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

interface ScriptData {
	name: string;
	triggers: Record<string, {
		type: string;
	}>;
	actions: Record<string, ActionData>;
}

interface ActionData {
    player?: { 
        variableName: string; 
        function: string; 
    };
    disabled?: boolean;
    unitType?: string;
    itemType?: string;
    projectileType?: string;
    actionId?: string;
	type?: string;
	entity?: string;
	entityType?: string;
	position?: {
        function?: string,
        x: number, 
        y: number
    };
	angle?: number;
	width?: number;
	height?: number;
    wasCreated?: boolean;
    wasEdited?: boolean;
    wasDeleted?: boolean;
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
	cloneAsset(arg0: string, unitTypeId: string): any;
	getPlayerByClientId(clientId: string): Player;

	data: {
		scripts: Record<string, ScriptData>;
		defaultData: any;
		map: MapData;
		unitTypes: Record<string, EntityData>;
		projectileTypes: Record<string, EntityData>;
		itemTypes: Record<string, EntityData>;
		particleTypes: Record<string, ParticleData>;
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
