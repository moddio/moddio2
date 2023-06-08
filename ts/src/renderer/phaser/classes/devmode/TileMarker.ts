class TileMarker {
	graphics: Phaser.GameObjects.Graphics;
	preview: Phaser.GameObjects.Container;
	images: Record<number, Record<number, Phaser.GameObjects.Image>>;

	active: boolean;
	extrudedKey: string;

	constructor(
		private scene: Phaser.Scene,
		private devModeScene: DevModeScene,
		private map: Phaser.Tilemaps.Tilemap,
		private palette: boolean,
		w: number,
		commandController: CommandController,
	) {
		this.active = true;

		this.graphics = scene.add.graphics();
		this.graphics.lineStyle(w, 0x000000, 1);
		if (taro.game.data.defaultData.dontResize) {
			this.graphics.strokeRect(0, 0, map.tileWidth, map.tileHeight);
		} else {
			this.graphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
		}
		this.graphics.setVisible(false);

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
		const extrudedKey = this.extrudedKey = `extruded-${key}`;

		let width = TILE_SIZE;
		let height = TILE_SIZE;
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
		} else if (this.images[i][j]) this.images[i][j].setAlpha(0);
	}

	changePreview(): void {
		const { x, y } = this.devModeScene.tileEditor.brushArea.size;
		this.graphics.scaleX = x;
		this.graphics.scaleY = y;
		if (!this.palette) {
			this.hideImages();
			const previewTarget = this.devModeScene.tileEditor.selectedTileArea;
			const sample = this.devModeScene.tileEditor.brushArea.calcSample(previewTarget, { x, y });
			for (let i = 0; i < x; i++) {
				for (let j = 0; j < y; j++) {
					if (sample[i] && sample[i][j]) {
						this.changeImage(sample[i][j], i, j);
					}
				}
			}
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
