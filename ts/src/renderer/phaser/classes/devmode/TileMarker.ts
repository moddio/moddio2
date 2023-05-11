class TileMarker {
    graphics: Phaser.GameObjects.Graphics;
	preview: Phaser.GameObjects.Container;
	images: Phaser.GameObjects.Image [][];

	active: boolean;
	extrudedKey: string;

	constructor (
		private scene: Phaser.Scene,
		private devModeScene: DevModeScene,
        private map: Phaser.Tilemaps.Tilemap,
		private palette: boolean,
        w: number
	) {
        this.active = true;

        this.graphics = scene.add.graphics();
		this.graphics.lineStyle(w, 0x000000, 1);
		if (taro.game.data.defaultData.dontResize) {
			this.graphics.strokeRect(0, 0, map.tileWidth, map.tileHeight);
		} else {
			this.graphics.strokeRect(0, 0, 64, 64);
		}
		this.graphics.setVisible(false);

		if (!palette) {
			this.preview = scene.add.container();
			this.images = [[],[]];
		}
	}

	addImage (x: number, y: number): Phaser.GameObjects.Image {
		const map = this.map;
		const data = taro.game.data;
		const tileset = data.map.tilesets[0];
		const key = `tiles/${tileset.name}`;
		const extrudedKey = this.extrudedKey = `extruded-${key}`;

		let width = 64;
		let height = 64;
		if (taro.game.data.defaultData.dontResize) {
			width = map.tileWidth;
			height = map.tileHeight;
		}

		const image = this.scene.add.image(x * width, y * height, extrudedKey, 0);
		image.setOrigin(0,0).setTint(0xabcbff).setAlpha(0).setVisible(false);
		image.setDisplaySize(width, height);
		this.preview.add(image);
		return image;
	}

	changeImage (tile: number, i: number, j: number): void {
		if (tile && tile !== 0 && tile !== -1) {
			if (!this.images[i][j])  {
				this.images[i][j] = this.addImage(i, j);
			} 
			this.images[i][j].setTexture(this.extrudedKey, tile - 1).setAlpha(0.75);
			// apply tint to palette tile
			const paletteLayer = this.devModeScene.tileEditor.tilePalette.map.layers[0];
			const row = Math.floor((tile - 1) / paletteLayer.width);
			const paletteTile = paletteLayer?.data[row]?.[tile - 1 - (row * paletteLayer.width)];
			if (paletteTile) paletteTile.tint = 0x87cfff;
		} else if (this.images[i][j]) this.images[i][j].setAlpha(0);
	}

	changePreview (): void {
		const {x, y} = this.devModeScene.tileEditor.area;
		this.graphics.scale = x;
		if (!this.palette) {
			this.hideImages();
			if (x === 2 && y === 2) {
				const previewTarget = this.devModeScene.tileEditor.selectedTileArea;
				for (let i = 0; i < x; i++) {
					for (let j = 0; j < y; j++) {
						this.changeImage(previewTarget[i][j], i, j);
					}
				}
			} else if (x === 1 && y === 1) {
				const previewTarget = this.devModeScene.tileEditor.selectedTile;
				this.changeImage(previewTarget, 0, 0);	
			}
		}
	}

	hideImages (): void {
		for (let i = 0; i < this.images.length; i++) {
			for (let j = 0; j < this.images[0].length; j++) {
				if (this.images[i] && this.images[i][j]) this.images[i][j].setAlpha(0);
			}
		}
	}

	showPreview (value: boolean): void {
		const devModeScene = taro.renderer.scene.getScene('DevMode') as DevModeScene;
		const area = devModeScene.tileEditor.area;
		for (let i = 0; i < area.x; i++) {
			for (let j = 0; j < area.y; j++) {
				if (this.images[i] && this.images[i][j]) this.images[i][j].setVisible(value);
			}
		}
	}
}