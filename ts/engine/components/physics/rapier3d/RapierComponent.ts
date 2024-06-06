type RAPIER_API = typeof RAPIER;

class RapierComponent extends TaroEventingClass {
	// TODO: discern 2d/3d in engine and serve sources dynamically
	//		 so we can name these physics
	classId = 'RapierComponent';
	// core
	_entity: TaroEngine;
	_options: PhysicsOptions;
	_callback: () => Promise<void>;
	// engine will always be rapier
	engine = 'RAPIER';
	_world: RAPIER.World;
	// scaleRatio = 30;
	avgPhysicsTickDuration = 0;
	constructor() {
		// core functionality / inherited
		super();
	}

	async load(): Promise<void> {
		await RAPIER.init();
	}

	destroyBody3d(body: RAPIER.RigidBody): void {
		// from docs World.removeRigidBody()

		// This will remove this rigid-body as well as all its attached colliders
		// and joints. Every other bodies touching or attached by joints to this
		// rigid-body will be woken-up.
		this.world.removeRigidBody(body);
	}
	useWorker(...args: any[]): void {}
	mode(...args: any[]): void {}
	sleep(...args: any[]): void {}
	scaleRatio(...args: any[]): void {}
	tilesizeRatio(...args: any[]): void {}
	get world() {
		return this._world;
	}
	set world(val: RAPIER.World) {
		this._world = val;
	}
	createFixture(...args: any[]): void {}
	createBody(...args: any[]): void {}
	destroyBody(...args: any[]): void {}
	createJoint(...args: any[]): void {}
	destroyJoint(...args: any[]): void {}
	getBodiesInRegion(...args: any[]): void {}

	staticsFromMap(): void {
		const floorLayer = taro.game.data.map.layers.find((l) => l.name === 'floor');
		const floorMesh = generateLayerMesh(floorLayer);
		let desc = RAPIER.ColliderDesc.trimesh(Float32Array.from(floorMesh.vertices), Uint32Array.from(floorMesh.indices));
		this.world.createCollider(desc);

		const wallsLayer = taro.game.data.map.layers.find((l) => l.name === 'walls');
		const wallsMesh = generateLayerMesh(wallsLayer);
		desc = RAPIER.ColliderDesc.trimesh(Float32Array.from(wallsMesh.vertices), Uint32Array.from(wallsMesh.indices));
		desc.setTranslation(0, 2, 0);
		this.world.createCollider(desc);

		const treesLayer = taro.game.data.map.layers.find((l) => l.name === 'trees');
		const treesMesh = generateLayerMesh(treesLayer);
		desc = RAPIER.ColliderDesc.trimesh(Float32Array.from(treesMesh.vertices), Uint32Array.from(treesMesh.indices));
		desc.setTranslation(0, 3, 0);
		this.world.createCollider(desc);
	}
	destroyWalls(...args: any[]): void {}
	contactListener(...args: any[]): void {}
	networkDebugMode(...args: any[]): void {}
	enableDebug(...args: any[]): void {}
	updateCallback(...args: any[]): void {}
	start(...args: any[]): void {}
	stop(...args: any[]): void {}
	queueAction(...args: any[]): void {}
	update(...args: any[]): void {}
	destroy(...args: any[]): void {}
	_triggerContactEvent(...args: any[]): void {}
	_triggerLeaveEvent(...args: any[]): void {}
	_beginContactCallback(...args: any[]): void {}
	_endContactCallback(...args: any[]): void {}
	_enableContactListener(...args: any[]): void {}
}

function generateLayerMesh(map: LayerData) {
	const segments = [];
	for (let y = 0; y < map.height; y++) {
		for (let x = 0; x < map.width; x++) {
			const tileId = map.data[y * map.width + x];
			const isSolid = tileId > 0;

			const isTopSolid = y > 0 && map.data[(y - 1) * map.width + x] > 0;
			const isBottomSolid = y < map.height - 1 && map.data[(y + 1) * map.width + x] > 0;
			const isLeftSolid = x > 0 && map.data[y * map.width + x - 1] > 0;
			const isRightSolid = x < map.width - 1 && map.data[y * map.width + x + 1] > 0;

			// Clockwise order
			if (isSolid) {
				if (!isTopSolid) {
					segments.push([x, y, x + 1, y]);
				}
				if (!isBottomSolid) {
					segments.push([x + 1, y + 1, x, y + 1]);
				}
				if (!isLeftSolid) {
					segments.push([x, y + 1, x, y]);
				}
				if (!isRightSolid) {
					segments.push([x + 1, y, x + 1, y + 1]);
				}
			}
		}
	}

	const contours = [];
	while (segments.length) {
		const contour = [];
		let start = segments.shift();
		contour.push(start[0], start[1], start[2], start[3]);

		let last = start;
		while (segments.length) {
			let next = segments.find((s) => s[0] === last[2] && s[1] === last[3]);
			if (next) {
				const isCollinear =
					(last[0] === last[2] && last[2] === next[2]) || (last[1] === last[3] && last[3] === next[3]);

				if (isCollinear) {
					contour[contour.length - 2] = next[2];
					contour[contour.length - 1] = next[3];
				} else {
					contour.push(next[0], next[1], next[2], next[3]);
				}

				last = next;
				segments.splice(segments.indexOf(next), 1);
			} else {
				break;
			}
		}

		// Fix if first and last are collinear
		const isCollinear =
			(contour[0] === contour[2] && contour[0] === contour[contour.length - 4]) ||
			(contour[1] === contour[3] && contour[1] === contour[contour.length - 3]);
		if (isCollinear) {
			contour.pop();
			contour.pop();
			contour[0] = contour[contour.length - 2];
			contour[1] = contour[contour.length - 1];
		}

		contours.push(contour);
	}

	const outer = [];
	const inner = [];
	for (let i = 0; i < contours.length; i++) {
		const contour = contours[i];
		const ring = [];

		let sum = 0;
		for (let j = 0; j < contour.length; j += 2) {
			ring.push(contour[j], 0, contour[j + 1]);

			const x1 = contour[j];
			const y1 = contour[j + 1];
			const x2 = contour[(j + 2) % contour.length];
			const y2 = contour[(j + 3) % contour.length];
			sum += (x2 - x1) * (y2 + y1);
		}
		let cw = sum < 0;

		cw ? outer.push(ring) : inner.push(ring);
	}

	// for (let i = 0; i < outer.length; i++) {
	// 	const geometry = new THREE.BufferGeometry();
	// 	geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(outer[i]), 3));
	// 	let lineSegments = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xffff00 }));
	// 	lineSegments.position.set(0, 5, 0);
	// 	Renderer.Three.instance().scene.add(lineSegments);
	// }

	// for (let i = 0; i < inner.length; i++) {
	// 	const geometry = new THREE.BufferGeometry();
	// 	geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(inner[i]), 3));
	// 	let lineSegments = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x00ffff }));
	// 	lineSegments.position.set(0, 5, 0);
	// 	Renderer.Three.instance().scene.add(lineSegments);
	// }

	const shapes = [];

	for (const outerRing of outer) {
		const shape = { ring: outerRing, holes: [] };

		for (const innerRing of inner) {
			const pointX = innerRing[0];
			const pointY = innerRing[2];

			if (Utils.isPointInPolygon(outerRing, pointX, pointY, 3)) {
				shape.holes.push(innerRing);
			}
		}

		shapes.push(shape);
	}

	const verts = [];
	const indices = [];

	for (const shape of shapes) {
		const ring = shape.ring;
		const holes = shape.holes;

		const vertices = [];
		for (let i = 0; i < ring.length; i += 6) {
			vertices.push(ring[i], ring[i + 2]);
		}

		const numRingVertices = vertices.length / 2;

		const holeIndices = [];
		for (const hole of holes) {
			holeIndices.push(vertices.length / 2);
			for (let i = 0; i < hole.length; i += 6) {
				vertices.push(hole[i], hole[i + 2]);
			}
		}

		const triangulatedVertsIndices = Earcut.triangulate(vertices, holeIndices);

		const triangulatedVerts3D = [] as number[];

		for (let i = 0; i < vertices.length; i += 2) {
			triangulatedVerts3D.push(vertices[i], 0.5, vertices[i + 1]);
		}

		// Duplicate top face vertices
		for (let i = 0; i < vertices.length; i += 2) {
			triangulatedVerts3D.push(vertices[i], -0.5, vertices[i + 1]);
		}

		triangulatedVertsIndices.push(...triangulatedVertsIndices.map((v) => v + vertices.length / 2));

		// Generate side faces
		for (let i = 0; i < numRingVertices; i++) {
			const nextIdx = (i + 1) % numRingVertices;
			const a = i;
			const b = i + vertices.length / 2;
			const c = nextIdx + vertices.length / 2;
			const d = nextIdx;
			triangulatedVertsIndices.push(a, b, c, c, d, a);
		}

		for (const holeStartIdx of holeIndices) {
			for (let i = holeStartIdx; i < holeStartIdx + numRingVertices; i++) {
				const nextIdx = ((i + 1) % numRingVertices) + holeStartIdx;
				const a = i;
				const b = i + vertices.length / 2;
				const c = nextIdx + vertices.length / 2;
				const d = nextIdx;
				triangulatedVertsIndices.push(a, b, c, c, d, a);
			}
		}

		indices.push(...triangulatedVertsIndices.map((v) => v + verts.length / 3));
		verts.push(...triangulatedVerts3D);
	}

	return { vertices: verts, indices: indices };
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = RapierComponent;
}
