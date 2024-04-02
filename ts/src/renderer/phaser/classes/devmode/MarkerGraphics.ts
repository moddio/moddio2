class MarkerGraphics extends Phaser.GameObjects.Container {
	scene: Phaser.Scene;
	sides: Record<string, Phaser.GameObjects.Graphics>;
	sideLength: number;
	scaleSidesX: number;
	scaleSidesY: number;

	constructor(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap, w: number, palette: boolean) {
		super(scene);
		this.scene = scene;

		scene.add.existing(this);

		const sides = (this.sides = {});
		sides['left'] = scene.add.graphics();
		sides['top'] = scene.add.graphics();
		sides['right'] = scene.add.graphics();
		sides['bottom'] = scene.add.graphics();

		Object.values(sides).forEach((side: Phaser.GameObjects.Graphics) => {
			side.lineStyle(w, 0x000000, 1);
			this.add(side);
		});

		if (taro.game.data.defaultData.dontResize || palette) {
			this.sideLength = map.tileWidth;
		} else {
			this.sideLength = Constants.TILE_SIZE;
		}

		const sideLength = this.sideLength;

		sides['left'].strokeLineShape(new Phaser.Geom.Line(0, 0, 0, sideLength));
		sides['top'].strokeLineShape(new Phaser.Geom.Line(0, 0, sideLength, 0));
		sides['right'].strokeLineShape(new Phaser.Geom.Line(sideLength, 0, sideLength, sideLength));
		sides['bottom'].strokeLineShape(new Phaser.Geom.Line(0, sideLength, sideLength, sideLength));

		this.setVisible(false);
	}

	scaleSides(x: number, y: number) {
		const sides = this.sides;
		sides['left'].setScale(1, y);
		sides['top'].setScale(x, 1);
		sides['right'].setScale(1, y);
		sides['bottom'].setScale(x, 1);
		sides['right'].x = x * this.sideLength - this.sideLength;
		sides['bottom'].y = y * this.sideLength - this.sideLength;

		this.scaleSidesX = x;
		this.scaleSidesY = y;
	}
}
