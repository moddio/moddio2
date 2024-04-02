declare var VisibilityPolygon: any;

class VisibilityMask {
	scene: GameScene;
	player: Phaser.Math.Vector2;
	graph: Phaser.GameObjects.Graphics;
	mask: Phaser.Display.Masks.GeometryMask;
	range: number;

	// map data
	width: number;
	height: number;
	tileWidth: number;
	tileHeight: number;
	mapExtents: Phaser.Math.Vector2;
	wallSegments: number[][][];
	walls: Phaser.Geom.Rectangle[];

	// (static) unit data
	unitSegments: number[][][];
	units: Phaser.Geom.Rectangle[];
	unitsPoly: Phaser.Geom.Polygon[];

	// visibility polygon data
	fov: Phaser.Geom.Rectangle;
	segments: number[][][];
	wallsDirty = false;
	unitsDirty = false;

	constructor(scene: GameScene) {
		// console.time('CONSTRUCTOR');
		this.scene = scene;
		this.player = Phaser.Math.Vector2.ZERO;
		this.graph = this.scene.add.graphics();

		// definitely some redundancy here
		const { width, height } = taro.game.data.map;
		const { tileWidth, tileHeight } = taro.scaleMapDetails;

		this.width = width;
		this.height = height;
		this.tileWidth = tileWidth;
		this.tileHeight = tileHeight;
		// vector to store the bottom right boundary of the map
		this.mapExtents = new Phaser.Math.Vector2(
			// x
			this.width * this.tileWidth,
			// y
			this.height * this.tileHeight
		);
		this.getWalls();
		this.getUnits();

		this.mask = new Phaser.Display.Masks.GeometryMask(scene, this.graph);

		taro.client.on('update-walls', () => {
			this.getWalls();
		});

		taro.client.on('update-static-units', () => {
			this.getUnits();
		});
		// console.timeEnd('CONSTRUCTOR');
	}

	unMaskWalls(): void {
		this.walls.forEach((wall) => {
			this.graph.fillRectShape(wall);
		});
	}

	getWalls(): void {
		// console.time('GET WALLS');
		this.wallSegments = [];
		this.walls = [];

		taro.$$('wall').forEach((wall) => {
			this.mapFromTaroRect(wall, this.walls, this.wallSegments);
		});

		this.wallsDirty = true;
		// console.timeEnd('GET WALLS');
	}

	getUnits(): void {
		this.unitSegments = [];
		this.units = [];
		this.unitsPoly = [];

		taro.$$('unit').forEach((unit) => {
			if (unit._stats.currentBody.type !== 'static') {
				return;
			}

			const shape = unit._stats.currentBody.fixtures[0].shape.type;

			if (shape === 'rectangle') {
				this.mapFromTaroRect(unit, this.units, this.unitSegments);
			} else if (shape === 'circle') {
				this.mapFromTaroCircle(unit, this.unitsPoly, this.unitSegments, 12);
			}
		});

		this.unitsDirty = true;
	}

	mapFromTaroRect(entity: TaroEntity, rectArray: Phaser.Geom.Rectangle[], segArray: number[][][]): void {
		const x = entity._translate.x - entity._bounds2d.x2;
		const y = entity._translate.y - entity._bounds2d.y2;
		const w = entity._bounds2d.x;
		const h = entity._bounds2d.y;

		rectArray.push(Phaser.Geom.Rectangle.FromXY(x, y, x + w, y + h));

		segArray.push(
			[
				[x, y],
				[x + w, y],
			],
			[
				[x, y + h],
				[x + w, y + h],
			],
			[
				[x, y],
				[x, y + h],
			],
			[
				[x + w, y],
				[x + w, y + h],
			]
		);
	}

	mapFromTaroCircle(
		entity: TaroEntity,
		polygonArray: Phaser.Geom.Polygon[],
		segArray: number[][][],
		sides: number
	): void {
		const r = entity._bounds2d.x2 * (1 + 1 / sides); // x + x*sides^-1 = x * (1 + 1/sides)
		const x = entity._translate.x;
		const y = entity._translate.y;

		const points = Phaser.Geom.Circle.GetPoints(new Phaser.Geom.Circle(x, y, r), sides);

		polygonArray.push(new Phaser.Geom.Polygon(points));

		let i = 0;

		while (i < sides) {
			if (i + 1 !== sides) {
				segArray.push([
					[points[i].x, points[i].y],
					[points[i + 1].x, points[i + 1].y],
				]);
			}

			segArray.push([
				[points[i].x, points[i].y],
				[points[0].x, points[0].y],
			]);
			i++;
		}
	}

	rebuildSegments(): void {
		if (this.wallsDirty || this.unitsDirty) {
			this.segments = [...this.unitSegments, ...this.wallSegments];
			this.wallsDirty = false;
			this.unitsDirty = false;
		}
	}

	generateFieldOfView(range: number): void {
		this.range = range;
		// TODO: include map data necessary in event emission for constructor
		this.fov = Phaser.Geom.Rectangle.FromXY(
			Math.max(0, this.player.x - range),
			Math.max(0, this.player.y - range),
			Math.min(this.mapExtents.x, this.player.x + range),
			Math.min(this.mapExtents.y, this.player.y + range)
		);
	}

	moveCenter(x: number, y: number): void {
		this.player.set(x, y);
	}

	visibilityPoly(): void {
		// console.time('VISIBILITY POLYGON');
		const data = VisibilityPolygon.computeViewport(
			[this.player.x, this.player.y],
			this.segments,
			[this.fov.left, this.fov.top],
			[this.fov.right, this.fov.bottom]
		);
		const poly: Phaser.Geom.Point[] = [];

		data.forEach((point) => {
			poly.push(new Phaser.Geom.Point(point[0], point[1]));
		});

		this.graph.fillStyle(0xff9999, 0).fillPoints(poly, true);

		// if include walls
		this.walls.forEach((wall) => {
			this.graph.fillRectShape(wall);
		});
		// if include (static) units
		this.units.forEach((unit) => {
			this.graph.fillRectShape(unit);
		});

		// if include (static) units > circles
		this.unitsPoly.forEach((unit) => {
			this.graph.fillPoints(unit.points); // TODO: these can really just be circles
		});

		// console.timeEnd('VISIBILITY POLYGON');
		this.scene.cameras.main.setMask(this.mask, false);
	}

	destroyVisibilityMask(): void {
		this.scene.cameras.main.clearMask(true);
		this.graph.clear();
	}

	update(): void {
		this.graph.clear();
		this.generateFieldOfView(this.range);
		this.rebuildSegments();
		this.visibilityPoly();
	}
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = VisibilityMask;
}
