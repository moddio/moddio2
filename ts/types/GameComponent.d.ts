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

declare class GameComponent extends IgeEntity {

	data: {
		map: {
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
				type: 'tilelayer' | 'objectgroup';
			}[];
		};
		unitTypes: Record<string, EntityData>;
		projectileTypes: Record<string, EntityData>;
		itemTypes: Record<string, EntityData>;
		settings: {
			addStrokeToNameAndAttributes: boolean;
			camera: {
				zoom : {
					default:number;
				}
			}
		}
	};

}
