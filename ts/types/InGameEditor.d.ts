declare class InGameEditor extends TaroClass {
	getActiveEntity(): {
		id: string;
		player: string;
		entityType: string;
	};
	addOrUpdateRegion(data: RegionData): void;
	addNewRegion(data: RegionData): void;
	updateRegionInReact(data: RegionData, format?: string): void;
	mapWasEdited(): void;
	showClearLayerConfirmation(data: TileData<'clear'>): void;
	saveMap(): void;
	openMapConfiguration(): void;
	showRegionList(data: RegionData[]): void;
	showRepublishToInitEntitiesWarning(): void;
	toggleEntityPlacementWindow(boolean): void;
	updateAction(data: ActionData): void;
	showScriptForEntity(actionId: string): void;
	updateEntity(data: EditEntityData): void;
	editGlobalScripts(data: ScriptChangesData);
}
