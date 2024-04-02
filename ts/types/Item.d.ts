declare class Item extends TaroEntityPhysics {
	script: any;

	constructor(data: any);
	anchoredOffset: OffsetData;

	getAnchoredOffset(rotate: number): OffsetData;
}
