class TileMarker {
	graphics: MarkerGraphics;
	preview: Phaser.GameObjects.Container;
	images: Record<number, Record<number, Phaser.GameObjects.Image>>;
	commandController: CommandController;
	active: boolean;
	extrudedKey: string;

	constructor(
		private scene: Phaser.Scene,
		private devModeScene: DevModeScene,
		private map: Phaser.Tilemaps.Tilemap,
		private palette: boolean,
		w: number,
		commandController: CommandController
	) {
		this.active = true;
		this.commandController = commandController;
		this.graphics = new MarkerGraphics(scene, map, w, palette);

		if (!palette) {
			this.preview = scene.add.container();
			this.images = {};
		}
	}

	addImage(x: number, y: number): Phaser.GameObjects.Image {
		const map = this.map;
		const data = taro.game.data;
		const tileset = data.map.tilesets[0];
		const key = `tiles/${tileset.name}`;
		const extrudedKey = (this.extrudedKey = `extruded-${key}`);

		let width = Constants.TILE_SIZE;
		let height = Constants.TILE_SIZE;
		if (taro.game.data.defaultData.dontResize) {
			width = map.tileWidth;
			height = map.tileHeight;
		}

		const image = this.scene.add.image(x * width, y * height, extrudedKey, 0);
		image.setOrigin(0, 0).setTint(0xabcbff).setAlpha(0).setVisible(false);
		image.setDisplaySize(width, height);
		this.preview.add(image);
		return image;
	}

	changeImage(tile: number, i: number, j: number): void {
		if (tile && tile !== 0 && tile !== -1) {
			if (!this.images[i]) {
				this.images[i] = {};
			}
			this.images[i][j] = this.addImage(i, j);
			this.images[i][j].setTexture(this.extrudedKey, tile - 1).setAlpha(0.75);
		} else if (this.images[i] && this.images[i][j]) this.images[i][j].setAlpha(0);
	}

	changePreview(): void {
		if (!this.palette) {
			const { x, y } = this.devModeScene.devModeTools.isForceTo1x1()
				? { x: 1, y: 1 }
				: this.devModeScene.tileEditor.brushArea.size;
			this.graphics.scaleSides(x, y);
			this.hideImages();
			const previewTarget = this.devModeScene.tileEditor.selectedTileArea;
			const sample = this.devModeScene.tileEditor.brushArea.calcSample(previewTarget, { x, y }).sample;
			for (let i = 0; i < x; i++) {
				for (let j = 0; j < y; j++) {
					if (sample[i] && sample[i][j] !== undefined) {
						this.changeImage(sample[i][j], i, j);
					}
				}
			}
			Object.values(previewTarget).map((obj) => {
				Object.values(obj).map((tile) => {
					// apply tint to palette tile
					const paletteLayer = this.devModeScene.tilePalette.map.layers[0];
					const row = Math.floor((tile - 1) / paletteLayer.width);
					const paletteTile = paletteLayer?.data[row]?.[tile - 1 - row * paletteLayer.width];
					if (paletteTile) paletteTile.tint = 0x87cfff;
				});
			});
		}
	}

	hideImages(): void {
		Object.values(this.images).forEach((v) => {
			Object.values(v).forEach((img) => {
				img.setAlpha(0);
			});
		});
	}

	showPreview(value: boolean): void {
		const devModeScene = taro.renderer.scene.getScene('DevMode') as DevModeScene;
		const area = devModeScene.tileEditor.brushArea;
		for (let i = 0; i < area.size.x; i++) {
			for (let j = 0; j < area.size.y; j++) {
				if (this.images[i] && this.images[i][j]) this.images[i][j].setVisible(value);
			}
		}
	}
}
