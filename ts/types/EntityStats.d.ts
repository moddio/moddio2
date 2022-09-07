declare interface EntityStats {

	name: string;
	currentBody: {
		jointType: string;
		width: number;
		height: number;
	}
	cellSheet: {
		columnCount: number;
		rowCount: number;
		url: string;
	}
	stateId: string;
	states: Record<string, {
		animation: string;
	}>;
	animations: Record<string, {
		frames: number[];
		framesPerSecond: number;
		loopCount: number;
		name: string;
	}>;
	default?: {
		x: number,
		y: number,
		width: number,
		height: number,
		inside?: string,
		alpha?: number,
	}
	type: string;
	id: string;
	itemTypeId?: string;
	flip: FlipMode;
	controls: {
		abilities: Record<string, ControlAbility>
	}
}
