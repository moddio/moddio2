type Shape = 'circle' | 'rectangle' | 'diamond';

interface Vector2D {
	x: number;
	y: number;
}

class TileShape {
	shape: Shape;
	size: Vector2D;
	sample: Record<number, Record<number, number>> = {};

	constructor(size: Vector2D = { x: 1, y: 1 }, shape: Shape = 'rectangle') {
		this.shape = shape;
		this.size = size;
	}

	/**
	 * calc the sample to print
	 * @param selectedTileArea selectedTiles
	 * @param size brush's size
	 * @param temp if true, it won't change this.sample, but only return it instead.
	 * @returns sample to print
	 */
	calcSample(
		selectedTileArea: Record<number, Record<number, number>>,
		size: Vector2D | 'fitContent',
		shape?: Shape,
		temp = false
	): { sample: Record<number, Record<number, number>>; xLength: number; yLength: number; minX: number; minY: number } {
		const xArray = Object.keys(selectedTileArea);
		const yArray = Object.values(selectedTileArea)
			.map((object) => Object.keys(object))
			.flat()
			.sort((a, b) => parseInt(a) - parseInt(b));
		const minX = parseInt(xArray[0]);
		const minY = parseInt(yArray[0]);
		const maxX = parseInt(xArray[xArray.length - 1]);
		const maxY = parseInt(yArray[yArray.length - 1]);
		const xLength = maxX - minX + 1;
		const yLength = maxY - minY + 1;
		let tempSample: Record<number, Record<number, number>> = {};
		if (size === 'fitContent') {
			size = {
				x: xLength,
				y: yLength,
			};
		}
		switch (shape || this.shape) {
			case 'rectangle': {
				tempSample = TileShape.calcRect(minX, xLength, minY, yLength, selectedTileArea, size);
				break;
			}
			case 'diamond': {
				tempSample = TileShape.calcDiamond(minX, xLength, minY, yLength, selectedTileArea, size);
				break;
			}
			case 'circle': {
				tempSample = TileShape.calcCircle(minX, xLength, minY, yLength, selectedTileArea, size);
				break;
			}
		}
		if (!temp) {
			this.sample = tempSample;
		}
		return { sample: tempSample, xLength, yLength, minX, minY };
	}

	static calcCircle(
		minX: number,
		xLength: number,
		minY: number,
		yLength: number,
		selectedTileArea: Record<number, Record<number, number>>,
		size: Vector2D
	) {
		const circleGenerator = Combinator.circle(Math.floor(Math.max(size.x, size.y) / 2) + 1);
		let maxLoop = Constants.MAX_LOOP;
		const newSample: Record<number, Record<number, number>> = {};
		while (maxLoop > 0) {
			const circleValue = circleGenerator.next();
			if (circleValue.done) {
				break;
			}
			const vec2d = circleValue.value as Vector2D;
			if (
				selectedTileArea[minX + (vec2d.x % xLength)] &&
				selectedTileArea[minX + (vec2d.x % xLength)][minY + (vec2d.y % yLength)] !== undefined
			) {
				if (!newSample[vec2d.x]) {
					newSample[vec2d.x] = {};
				}
				newSample[vec2d.x][vec2d.y] = selectedTileArea[minX + (vec2d.x % xLength)][minY + (vec2d.y % yLength)];
			}
			maxLoop -= 1;
		}
		return newSample;
	}

	static calcDiamond(
		minX: number,
		xLength: number,
		minY: number,
		yLength: number,
		selectedTileArea: Record<number, Record<number, number>>,
		size: Vector2D
	) {
		const diamondGenerator = Combinator.diamond(Math.floor(Math.max(size.x, size.y) / 2) + 1);
		let maxLoop = Constants.MAX_LOOP;
		const newSample: Record<number, Record<number, number>> = {};
		while (maxLoop > 0) {
			const diamondValue = diamondGenerator.next();
			if (diamondValue.done) {
				break;
			}
			const vec2d = diamondValue.value as Vector2D;
			if (
				selectedTileArea[minX + (vec2d.x % xLength)] &&
				selectedTileArea[minX + (vec2d.x % xLength)][minY + (vec2d.y % yLength)] !== undefined
			) {
				if (!newSample[vec2d.x]) {
					newSample[vec2d.x] = {};
				}
				newSample[vec2d.x][vec2d.y] = selectedTileArea[minX + (vec2d.x % xLength)][minY + (vec2d.y % yLength)];
			}
			maxLoop -= 1;
		}
		return newSample;
	}

	static calcRect(
		minX: number,
		xLength: number,
		minY: number,
		yLength: number,
		selectedTileArea: Record<number, Record<number, number>>,
		size: Vector2D
	) {
		const rectGenerator = Combinator.rect(size.x, size.y);
		let maxLoop = Constants.MAX_LOOP;
		const newSample: Record<number, Record<number, number>> = {};
		while (maxLoop > 0) {
			const rectValue = rectGenerator.next();
			if (rectValue.done) {
				break;
			}
			const vec2d = rectValue.value as Vector2D;

			if (
				selectedTileArea[minX + (vec2d.x % xLength)] &&
				selectedTileArea[minX + (vec2d.x % xLength)][minY + (vec2d.y % yLength)] !== undefined
			) {
				if (!newSample[vec2d.x]) {
					newSample[vec2d.x] = {};
				}
				newSample[vec2d.x][vec2d.y] = selectedTileArea[minX + (vec2d.x % xLength)][minY + (vec2d.y % yLength)];
			}
			maxLoop -= 1;
		}
		return newSample;
	}
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = TileShape;
}
