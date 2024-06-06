interface EntityData {
	scripts?: any;
	cellSheet: {
		columnCount: number;
		rowCount: number;
		url: string;
	};
	animations: Record<
		string,
		{
			frames: number[];
			framesPerSecond: number;
			loopCount: number;
			name: string;
		}
	>;
	controls: {
		mouseBehaviour: any;
		abilities: Record<string, ControlAbility>;
		unitAbilities: Record<string, UnitAbility>;
	};
	id: string;

	is3DObject?: boolean;
}

interface UnitAbility {
	name: string;
	castDuration: number;
	cooldown: number;
	cost: {
		unitAttributes: Record<string, number>;
		playerAttributes: Record<string, number>;
	};
	visibility: 'always' | 'mobile' | 'desktop' | 'none';
	iconUrl: string;
}

interface ScriptData {
	name: string;
	triggers: Record<
		string,
		{
			type: string;
		}
	>;
	actions: Record<string, ActionData>;
	deleted?: boolean;
}

interface ScriptChangesData {
	scriptData: Record<string, ScriptData>;
	action: string;
	clientId: string;
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
		function?: string;
		x: number;
		y: number;
	};
	angle?: number;
	width?: number;
	height?: number;
	wasCreated?: boolean;
	wasEdited?: boolean;
	wasDeleted?: boolean;
}

interface VariableData {
	dataType?: string;
	newKey?: string;
	value?: any;
	delete?: boolean;
}

interface MapData {
	wasEdited: boolean;
	haveUnsavedChanges: boolean;
	tilewidth: number;
	tileheight: number;
	originalTileWidth: number;
	originalTileHeight: number;
	width: number;
	height: number;
	tilesets: {
		image: string;
		margin: number;
		name: string;
		spacing: number;
		tilecount: number;
		tileheight: number;
		tilewidth: number;
		type?: 'top' | 'side';
	}[];
	layers: LayerData[];
}

type LayerData = {
	id: number;
	name: string;
	type: 'tilelayer' | 'objectgroup';
	width: number;
	height: number;
	data: number[];
	y: number;
	x: number;
	opacity: number;
};

declare class GameComponent extends TaroEntity {
	lastCreatedUnitId: string;
	cloneAsset(arg0: string, unitTypeId: string): any;
	getPlayerByClientId(clientId: string): Player;

	data: {
		variables: Record<string, VariableData>;
		scripts: Record<string, ScriptData>;
		defaultData: any;
		map: MapData;
		unitTypes: Record<string, EntityData>;
		projectileTypes: Record<string, EntityData>;
		itemTypes: Record<string, EntityData>;
		particleTypes: Record<string, ParticleData>;
		abilities: Record<string, UnitAbility>;
		// TODO: add type of value for shop & dialogue Record.
		shops: Record<string, any>;
		dialogues: Record<string, any>;
		settings: {
			addStrokeToNameAndAttributes: boolean;
			camera: {
				useBounds: boolean;
				trackingDelay: number;
				zoom: {
					default: number;
				};
				deadzone: {
					width: number;
					height: number;
				};
				projectionMode: 'orthographic' | 'perspective';
				defaultPitch: number;
			};
			skybox: {
				left: string;
				right: string;
				top: string;
				bottom: string;
				front: string;
				back: string;
			};
		};
		heightBasedZIndex: boolean;
		texturePack: any;
	};

	entitiesCollidingWithLastRaycast: TaroEntity[];
}
