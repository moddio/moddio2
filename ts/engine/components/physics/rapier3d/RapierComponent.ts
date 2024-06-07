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
	rigidBody: RAPIER.RigidBody;
	rigidBodies = new Map<string, number>();
	// scaleRatio = 30;
	avgPhysicsTickDuration = 0;
	constructor() {
		// core functionality / inherited
		super();
	}

	get world() {
		return this._world;
	}
	set world(val: RAPIER.World) {
		this._world = val;
	}

	async load(): Promise<void> {
		await RAPIER.init();

		let gravity = { x: 0.0, y: -9.81, z: 0.0 };
		this.world = new RAPIER.World(gravity);

		// TODO: Environment physics should go elsewhere
		let groundColliderDesc = RAPIER.ColliderDesc.cuboid(1000.0, 0.1, 1000.0);
		groundColliderDesc.setTranslation(0.0, -0.5, 0.0);
		this.world.createCollider(groundColliderDesc);
	}

	createBody(entity: TaroEntity, body: b2Body): void {
		this.destroyBody(entity.id());
		if (entity._category === 'sensor') return;

		const rigidBodyDesc = taro.isServer
			? RAPIER.RigidBodyDesc.dynamic()
			: entity.isClientPredicted()
				? RAPIER.RigidBodyDesc.dynamic()
				: RAPIER.RigidBodyDesc.kinematicPositionBased();
		const rigidBody = this.world.createRigidBody(rigidBodyDesc);
		rigidBody.setGravityScale(10, true);

		const pos = entity._translate;
		rigidBody.setTranslation({ x: pos.x / 64, y: 5, z: pos.y / 64 }, true);

		this.rigidBodies.set(entity.id(), rigidBody.handle);

		const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5).setActiveEvents(
			RAPIER.ActiveEvents.COLLISION_EVENTS
		);
		this.world.createCollider(colliderDesc, rigidBody);
	}

	// from docs World.removeRigidBody()

	// This will remove this rigid-body as well as all its attached colliders
	// and joints. Every other bodies touching or attached by joints to this
	// rigid-body will be woken-up.
	destroyBody(entityId: string): void {
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

	update(_dt: number): void {
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
						rigidBody.setLinvel({ x: x, y: y, z: z }, true);
					}
				} else {
					const x = entity.serverPosition.x / 64;
					const y = entity.serverPosition.z / 64;
					const z = entity.serverPosition.y / 64;
					rigidBody.setTranslation({ x, y, z }, true);
				}

				if (taro.isClient) {
					const q = entity.serverQuaternion;
					rigidBody.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
				}
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

				entity.lastPhysicsRotation.x = entity.physicsRotation.x;
				entity.lastPhysicsRotation.y = entity.physicsRotation.y;
				entity.lastPhysicsRotation.z = entity.physicsRotation.z;
				entity.lastPhysicsRotation.w = entity.physicsRotation.w;

				const pos = rigidBody.translation();
				entity._translate.x = pos.x * 64;
				entity._translate.y = pos.z * 64;
				entity._translate.z = pos.y * 64;

				entity.physicsPosition.x = entity._translate.x;
				entity.physicsPosition.y = entity._translate.y;
				entity.physicsPosition.z = entity._translate.z;

				const rot = rigidBody.rotation();
				entity.physicsRotation.x = rot.x;
				entity.physicsRotation.y = rot.y;
				entity.physicsRotation.z = rot.z;
				entity.physicsRotation.w = rot.w;

				const vel = rigidBody.linvel();
				entity.velocity.x = vel.x;
				entity.velocity.y = vel.z;
				entity.velocity.z = vel.y;
			}
		}
	}

	useWorker(...args: any[]): void {}
	mode(...args: any[]): void {}
	sleep(...args: any[]): void {}
	scaleRatio(...args: any[]): void {}
	tilesizeRatio(...args: any[]): void {}
	createFixture(...args: any[]): void {}
	createJoint(...args: any[]): void {}
	destroyJoint(...args: any[]): void {}
	getBodiesInRegion(...args: any[]): void {}
	destroyWalls(...args: any[]): void {}
	contactListener(...args: any[]): void {}
	networkDebugMode(...args: any[]): void {}
	enableDebug(...args: any[]): void {}
	updateCallback(...args: any[]): void {}
	start(...args: any[]): void {}
	stop(...args: any[]): void {}
	queueAction(...args: any[]): void {}
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
