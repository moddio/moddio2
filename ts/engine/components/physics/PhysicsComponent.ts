class PhysicsComponent extends TaroEventingClass {
	classId = 'PhysicsComponent';
	componentId = 'physics';
	_entity: TaroEngine;
	_options: PhysicsOptions;
	_callback: () => void;
	engine: string;
	simulation: Box2dComponent | RapierComponent;

	world: RAPIER.World;
	rigidBody: RAPIER.RigidBody;
	rigidBodies = new Map<string, number>();

	constructor(entity: TaroEngine, options: PhysicsOptions, callback: () => void) {
		super();
		this.engine = options.engine;
		this._entity = entity;
		this._options = options;
		this._callback = callback;
	}

	static log(msg: string, type?: string) {
		console.log(msg, type);
	}

	async load(): Promise<void> {
		this.simulation = new Box2dComponent(this._entity, this._options);
		await this.simulation.load();

		await RAPIER.init();
		this._callback();

		let gravity = { x: 0.0, y: -9.81, z: 0.0 };
		let world = new RAPIER.World(gravity);
		this.world = world;

		let groundColliderDesc = RAPIER.ColliderDesc.cuboid(1000.0, 0.1, 1000.0);
		groundColliderDesc.setTranslation(0.0, -0.5, 0.0);
		world.createCollider(groundColliderDesc);

		const floorLayer = taro.game.data.map.layers.find((l) => l.name === 'floor');
		const wallsLayer = taro.game.data.map.layers.find((l) => l.name === 'walls');
		const treesLayer = taro.game.data.map.layers.find((l) => l.name === 'trees');

		// Brutce force method

		const generateLayerSegments = (map: LayerData) => {
			const segments = [];
			for (let y = 0; y < map.height; y++) {
				for (let x = 0; x < map.width; x++) {
					const tileId = map.data[y * map.width + x];
					const isSolid = tileId > 0;

					const isTopSolid = y > 0 && map.data[(y - 1) * map.width + x] > 0;
					const isBottomSolid = y < map.height - 1 && map.data[(y + 1) * map.width + x] > 0;
					const isLeftSolid = x > 0 && map.data[y * map.width + x - 1] > 0;
					const isRightSolid = x < map.width - 1 && map.data[y * map.width + x + 1] > 0;

					if (isSolid) {
						// Clockwise order

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

			// Ignore inner rings (holes) for now
			// TODO: Hole support

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

					if (isPointInPolygon(outerRing, pointX, pointY, 3)) {
						shape.holes.push(innerRing);
					}
				}

				shapes.push(shape);
			}

			// console.log(shapes);

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
		};

		// For testing
		// const mapMesh = generateLayerSegments(map as LayerData);
		// let geometry = new THREE.BufferGeometry();
		// geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(mapMesh.vertices), 3));
		// geometry.setIndex(mapMesh.indices);
		// const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
		// let mesh = new THREE.Mesh(geometry, material);
		// mesh.position.set(0, 3, 0);
		// Renderer.Three.instance().scene.add(mesh);

		console.time('COLLISION MESH GENERATION');

		console.time('FLOOR');
		const floorMesh = generateLayerSegments(floorLayer);
		console.timeEnd('FLOOR');

		console.time('WALLS');
		const wallsMesh = generateLayerSegments(wallsLayer);
		console.timeEnd('WALLS');

		console.time('TREES');
		const treesMesh = generateLayerSegments(treesLayer);
		console.timeEnd('TREES');

		console.timeEnd('COLLISION MESH GENERATION');

		//

		let layerColliderDesc = RAPIER.ColliderDesc.trimesh(
			Float32Array.from(floorMesh.vertices),
			Uint32Array.from(floorMesh.indices)
		);
		world.createCollider(layerColliderDesc);

		layerColliderDesc = RAPIER.ColliderDesc.trimesh(
			Float32Array.from(wallsMesh.vertices),
			Uint32Array.from(wallsMesh.indices)
		);
		layerColliderDesc.setTranslation(0, 2, 0);
		world.createCollider(layerColliderDesc);

		layerColliderDesc = RAPIER.ColliderDesc.trimesh(
			Float32Array.from(treesMesh.vertices),
			Uint32Array.from(treesMesh.indices)
		);
		layerColliderDesc.setTranslation(0, 3, 0);
		world.createCollider(layerColliderDesc);
	}

	update(dt: number): void {
		this.simulation.update(dt);

		for (const entityId of this.rigidBodies.keys()) {
			const rigidBodyHandle = this.rigidBodies.get(entityId);
			const rigidBody = this.world.getRigidBody(rigidBodyHandle);
			const entity = taro.$(entityId);
			if (entity && rigidBody) {
				if (taro.isServer || (taro.isClient && entity.isClientPredicted())) {
					if (entity.velocity) {
						const x = entity.velocity.x;
						const y = entity.velocity.z;
						const z = entity.velocity.y;
						rigidBody.setLinvel({ x, y, z }, true);
					}
				} else {
					const x = entity.serverPosition.x / 64;
					const y = entity.serverPosition.z / 64;
					const z = entity.serverPosition.y / 64;
					rigidBody.setTranslation({ x, y, z }, true);
				}

				const rot = entity.serverRotation;
				const q = Utils.quaternionFromEuler(rot.x, -rot.z, rot.y, 'XYZ');
				rigidBody.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
			}
		}

		this.world.step();

		const keys = this.rigidBodies.keys();
		for (const entityId of keys) {
			const rigidBodyHandle = this.rigidBodies.get(entityId);
			const rigidBody = this.world.getRigidBody(rigidBodyHandle);
			const entity = taro.$(entityId);
			if (entity && rigidBody) {
				entity.lastPhysicsPosition.x = entity.physicsPosition.x;
				entity.lastPhysicsPosition.y = entity.physicsPosition.y;
				entity.lastPhysicsPosition.z = entity.physicsPosition.z;

				const pos = rigidBody.translation();
				entity._translate.x = pos.x * 64;
				entity._translate.y = pos.z * 64;
				entity._translate.z = pos.y * 64;

				entity.physicsPosition.x = entity._translate.x;
				entity.physicsPosition.y = entity._translate.y;
				entity.physicsPosition.z = entity._translate.z;

				const vel = rigidBody.linvel();
				entity.velocity.x = vel.x;
				entity.velocity.y = vel.z;
				entity.velocity.z = vel.y;
			}
		}
	}

	createBody(entity: TaroEntity, body: b2Body): void {
		this.destroyBody(entity, body);
		if (entity._category === 'sensor') return;

		// this.simulation.createBody(entity, body);

		const rigidBodyDesc = taro.isServer
			? RAPIER.RigidBodyDesc.dynamic()
			: entity.isClientPredicted()
				? RAPIER.RigidBodyDesc.dynamic()
				: RAPIER.RigidBodyDesc.kinematicPositionBased();
		rigidBodyDesc.gravityScale = 10.0;
		const rigidBody = this.world.createRigidBody(rigidBodyDesc);

		const pos = entity._translate;
		rigidBody.setTranslation({ x: pos.x / 64, y: 5, z: pos.y / 64 }, true);

		this.rigidBodies.set(entity.id(), rigidBody.handle);

		const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
		const collider = this.world.createCollider(colliderDesc, rigidBody);
	}

	destroyBody(entity: TaroEntity, body: b2Body): void {
		const entityId = entity.id();

		for (const knownEntityId of this.rigidBodies.keys()) {
			if (entityId === knownEntityId) {
				const rigidBodyHandle = this.rigidBodies.get(knownEntityId);
				if (!isNaN(rigidBodyHandle)) {
					const rigidBody = this.world.getRigidBody(rigidBodyHandle);
					if (rigidBody) {
						this.world.removeRigidBody(rigidBody);
					}
				}
				break;
			}
		}
	}

	// /* CONVERT TO COMMENT BLOCKS */

	// createWorld(): void {
	// 	//@ts-ignore
	// 	this.simulation.createWorld();
	// }

	// gravity(x: number, y: number): void {
	// 	//@ts-ignore
	// 	this.simulation.gravity(x, y);
	// }

	// setContinuousPhysics(continuousPhysics: boolean) {
	// 	//@ts-ignore
	// 	this.simulation.setContinuousPhysics(continuousPhysics);
	// }

	// // b2d unused
	// useWorker(): void {}
	// // b2d get/set
	// mode(val?: number): TaroEngine | number {
	// 	return !isNaN(val) ? this.simulation.mode(val) : this.simulation.mode();
	// }
	// // b2d get/set
	// sleep(val?: number): TaroEngine | number {
	// 	return !isNaN(val) ? this.simulation.sleep(val) : this.simulation.sleep();
	// }
	// // b2d get/set
	// scaleRatio(val?: number): TaroEngine | number {
	// 	return !isNaN(val) ? this.simulation.scaleRatio(val) : this.simulation.scaleRatio();
	// }
	// // b2d get/set
	// tilesizeRatio(val?: number): TaroEngine | number {
	// 	return !isNaN(val) ? this.simulation.tilesizeRatio(val) : this.simulation.tilesizeRatio();
	// }
	// // b2d get
	// world(): b2World {
	// 	return this.simulation.world();
	// }
	// // b2d create fixture from params and fixture def
	// createFixture(params: Record<string, any>): Record<string, any> {
	// 	return this.simulation.createFixture(params);
	// }
	// // b2d create body from definition and assign it to provided entity
	// // b2d destroy body and remove it from entity
	// destroyBody(entity: TaroEntity, body: b2Body): void {
	// 	this.simulation.destroyBody(entity, body);
	// }
	// // b2d unused
	// createJoint(): void {}
	// // b2d unused
	// destroyJoint(): void {}
	// // b2d check rectangle for entities
	// getBodiesInRegion(region: TaroEntity & { width: number; height: number; x: number; y: number }): TaroEntity[] {
	// 	return this.simulation.getBodiesInRegion(region);
	// }
	// // b2d create physics bodies for map walls
	// staticsFromMap(mapLayer: any, callback: () => any): void {
	// 	this.simulation.staticsFromMap(mapLayer, callback);
	// }
	// // b2d destroy all walls
	// destroyWalls(): void {
	// 	this.simulation.destroyWalls();
	// }
	// // b2d assign callbacks for different parts of a contact's lifetime
	// contactListener(beginContact?: () => any, endContact?: () => any, preSolve?: () => any, postSolve?: () => any): void {
	// 	this.simulation.contactListener(beginContact, endContact, preSolve, postSolve);
	// }
	// // b2d get/set - disable collision generation for the world
	// networkDebugMode(val?: boolean): TaroEngine | boolean {
	// 	return val == undefined ? this.simulation.networkDebugMode() : this.simulation.networkDebugMode(val);
	// }
	// // b2d (except planck) enable physics debug draw graphics
	// enableDebug(mountScene?: TaroEntity): void {
	// 	this.simulation.enableDebug(mountScene);
	// }
	// // b2d get/set callback for every physics world step
	// updateCallback(callback?: () => any): TaroEngine | (() => any) {
	// 	return callback ? this.simulation.updateCallback(callback) : this.simulation.updateCallback();
	// }
	// // b2d
	// start(): void {
	// 	this.simulation.start();
	// }
	// // b2d
	// stop(): void {
	// 	this.simulation.stop();
	// }
	// // b2d add physics actions to the engine's queue
	// // b2d core simulation update method
	// // stepped by TaroEngine
	// // b2d destroy physics simulation
	// destroy(): void {
	// 	this.simulation.destroy();
	// }
	// // b2d call engine script triggers on contact begin
	// _triggerContactEvent(entityA: TaroEntity, entityB: TaroEntity): void {
	// 	this.simulation._triggerContactEvent(entityA, entityB);
	// }
	// // b2d call engine script triggers on contact end
	// _triggerLeaveEvent(entityA: TaroEntity, entityB: TaroEntity): void {
	// 	this.simulation._triggerLeaveEvent(entityA, entityB);
	// }
	// // b2d taro callback for beginning of a contact
	// _beginContactCallback(contact: any): void {
	// 	this.simulation._beginContactCallback(contact);
	// }
	// // b2d taro callback for end of a contact
	// _endContactCallback(contact: any): void {
	// 	this.simulation._endContactCallback(contact);
	// }
	// // b2d adds taro contact callbacks via contactListener
	// _enableContactListener(): void {
	// 	this.simulation._enableContactListener();
	// }
}

type PhysicsOptions = {
	engine: string;
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = PhysicsComponent;
}

type LayerData = {
	id: number;
	name: string;
	type: 'tilelayer' | 'objectgroup';
	width: number;
	height: number;
	data: number[];
};

type VoxelCell = {
	position: number[];
	type: number;
	visible: boolean;
	hiddenFaces: boolean[];
	isPreview: boolean;
};

function isPointInPolygon(coords: number[], x: number, y: number, stride = 2) {
	let c = false;
	for (let i = 0, len = coords.length / stride, j = len - 1; i < coords.length / stride; j = i++) {
		if (
			((coords[i * stride + stride - 1] <= y && y < coords[j * stride + stride - 1]) ||
				(coords[j * stride + stride - 1] <= y && y < coords[i * stride + stride - 1])) &&
			x <
				((coords[j * stride] - coords[i * stride]) * (y - coords[i * stride + stride - 1])) /
					(coords[j * stride + stride - 1] - coords[i * stride + stride - 1]) +
					coords[i * stride]
		) {
			c = !c;
		}
	}
	return c;
}
