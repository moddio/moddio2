class RegionEditor {

	gameScene: GameScene;
	devModeScene: DevModeScene;
	devModeTools: DevModeTools;

	regionDrawGraphics: Phaser.GameObjects.Graphics;
	regionDrawStart: {x: number, y: number};
	regionTool: boolean;

	clickedList: RegionData[];

	constructor (
		gameScene: GameScene, devModeScene: DevModeScene, devModeTools: DevModeTools
	) {
		this.gameScene = gameScene;
		this.devModeScene = devModeScene;
		this.devModeTools = devModeTools;

		gameScene.input.on('pointerdown', (pointer) => {
			if (this.regionTool) {
				const worldPoint = this.gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
				this.regionDrawStart = {
					x: worldPoint.x,
					y: worldPoint.y,
				};
			}
		}, this);

		const graphics = this.regionDrawGraphics = gameScene.add.graphics();
		let width;
		let height;

		gameScene.input.on('pointermove', (pointer) => {
			if (!pointer.leftButtonDown()) return;
			else if (this.regionTool) {
				const worldPoint = gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
				width = worldPoint.x - this.regionDrawStart.x;
				height = worldPoint.y - this.regionDrawStart.y;
				graphics.clear();
				graphics.lineStyle(	2, 0x036ffc, 1);
				graphics.strokeRect( this.regionDrawStart.x, this.regionDrawStart.y , width, height);
			}
		}, this);

		gameScene.input.on('pointerup', (pointer) => {
			if (!pointer.leftButtonReleased()) return;
			const worldPoint = gameScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
			if (this.regionTool && this.regionDrawStart && this.regionDrawStart.x !== worldPoint.x && this.regionDrawStart.y !== worldPoint.y) {
				graphics.clear();
				this.regionTool = false;
				this.devModeTools.highlightModeButton(0);
				let x = this.regionDrawStart.x;
				let y = this.regionDrawStart.y;
				if (width < 0) {
					x = this.regionDrawStart.x + width;
					width *= -1;
				}
				if (height < 0) {
					y = this.regionDrawStart.y + height;
					height *= -1;
				}
				taro.network.send('editRegion', {x: Math.trunc(x),
					y: Math.trunc(y),
					width: Math.trunc(width),
					height: Math.trunc(height)});

				this.regionDrawStart = null;
			}
		}, this);

		this.clickedList = [];
	}

	edit (data: RegionData): void {
		if (data.newName && data.name !== data.newName) {
			const region = taro.regionManager.getRegionById(data.name);
			if (region) region._stats.id = data.newName;
			this.devModeScene.regions.forEach(region => {
				if (region.name === data.name) {
					region.name = data.newName;
					region.updateLabel();
				}
			});
		} else if (data.showModal) {
			inGameEditor.addNewRegion && inGameEditor.addNewRegion({name: data.name, x: data.x, y: data.y, width: data.width, height: data.height, userId: data.userId});
		}

		inGameEditor.updateRegionInReact && inGameEditor.updateRegionInReact(data);
	}

	cancelDrawRegion(): void {
		if (this.regionTool) {
			this.regionDrawGraphics.clear();
			this.regionTool = false;
			this.devModeTools.highlightModeButton(0);
			this.regionDrawStart = null;
		}
	}

	addClickedList(regionData: RegionData): void {
		this.clickedList.push(regionData);
	}

	showClickedList(): void {
		if (!this.devModeScene.pointerInsideWidgets()) {
			if (this.clickedList.length === 1) {
				inGameEditor.addNewRegion && inGameEditor.addNewRegion(this.clickedList[0]);
			} else if ( this.clickedList.length > 1 ) {
				inGameEditor.showRegionList && inGameEditor.showRegionList(this.clickedList);
			}
		}
		
		this.clickedList = [];
	}

	showRegions(): void {
		this.devModeScene.regions.forEach(region => {
			region.show();
		});
	}

	hideRegions(): void {
		this.devModeScene.regions.forEach(region => {
			region.hide();
		});
	}
}
