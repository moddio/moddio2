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

		// const map = [
		// 	1, 1, 1, 1,
		// 	1, 0, 0, 1,
		// 	1, 0, 0, 1,
		// 	1, 1, 1, 1,
		// ];

		const map = {
			width: 4,
			height: 4,
			data: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1],
		};

		const verts = new Map<string, number>();
		for (let y = 0; y < map.height; y++) {
			for (let x = 0; x < map.width; x++) {
				const tileId = map.data[y * map.width + x];
				const isSolid = tileId > 0;

				if (isSolid) {
					const topLeft = getKeyFromPos(x, y, 0);
					const topRight = getKeyFromPos(x + 1, y, 0);
					const bottomLeft = getKeyFromPos(x, y + 1, 0);
					const bottomRight = getKeyFromPos(x + 1, y + 1, 0);

					verts.set(topLeft, (verts.get(topLeft) ?? 0) + 1);
					verts.set(topRight, (verts.get(topRight) ?? 0) + 1);
					verts.set(bottomLeft, (verts.get(bottomLeft) ?? 0) + 1);
					verts.set(bottomRight, (verts.get(bottomRight) ?? 0) + 1);
				}
			}
		}

		const outer = [];
		const inner = [];
		for (const [k, v] of verts.entries()) {
			const [x, y, z] = k.split('.').map((v) => +v);
			if (v === 1) outer.push(x, y);
			else if (v === 3) inner.push(x, y);
		}

		console.log(outer, inner);

		console.log(Earcut.triangulate(outer));

		const voxels: Map<string, VoxelCell>[] = [];

		let layerIdx = 0;
		let voxelData = generateVoxelsFromLayerData(floorLayer, 0);
		let prunedVoxels = pruneCells(voxelData, voxels[layerIdx]);
		let voxelVerts = buildMeshDataFromCells(prunedVoxels);
		let layerColliderDesc = RAPIER.ColliderDesc.trimesh(
			Float32Array.from(voxelVerts.positions),
			Uint32Array.from(voxelVerts.indices)
		);
		world.createCollider(layerColliderDesc);

		layerIdx = 2;
		voxelData = generateVoxelsFromLayerData(wallsLayer, 0);
		prunedVoxels = pruneCells(voxelData, voxels[layerIdx]);
		voxelVerts = buildMeshDataFromCells(prunedVoxels);
		layerColliderDesc = RAPIER.ColliderDesc.trimesh(
			Float32Array.from(voxelVerts.positions),
			Uint32Array.from(voxelVerts.indices)
		);
		layerColliderDesc.setTranslation(0, layerIdx, 0);
		world.createCollider(layerColliderDesc);

		layerIdx = 3;
		voxelData = generateVoxelsFromLayerData(treesLayer, 0);
		prunedVoxels = pruneCells(voxelData, voxels[layerIdx]);
		voxelVerts = buildMeshDataFromCells(prunedVoxels);
		layerColliderDesc = RAPIER.ColliderDesc.trimesh(
			Float32Array.from(voxelVerts.positions),
			Uint32Array.from(voxelVerts.indices)
		);
		layerColliderDesc.setTranslation(0, layerIdx, 0);
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

function getKeyFromPos(x: number, y: number, z: number) {
	return `${x}.${y}.${z}`;
}

function getNeighboringKeys(x: number, y: number, z: number) {
	const k1 = getKeyFromPos(x + 1, y, z);
	const k2 = getKeyFromPos(x - 1, y, z);
	const k3 = getKeyFromPos(x, y + 1, z);
	const k4 = getKeyFromPos(x, y - 1, z);
	const k5 = getKeyFromPos(x, y, z + 1);
	const k6 = getKeyFromPos(x, y, z - 1);
	return [k1, k2, k3, k4, k5, k6];
}

function updateCellSides(curCell: VoxelCell, cells: Map<string, VoxelCell>) {
	let visible = false;
	const neighborKeys = getNeighboringKeys(curCell.position[0], curCell.position[1], curCell.position[2]);
	for (let i = 0; i < 6; ++i) {
		const hasNeighbor = cells.has(neighborKeys[i]);

		curCell.hiddenFaces[i] = hasNeighbor;

		if (!hasNeighbor) {
			visible = true;
		}
	}
	return visible;
}

function generateVoxelsFromLayerData(data: LayerData, height: number, flat = false) {
	const voxels = new Map<string, VoxelCell>();
	const allFacesVisible = [false, false, false, false, false, false];
	const onlyBottomFaceVisible = [true, true, true, false, true, true];
	const hiddenFaces = flat ? onlyBottomFaceVisible : allFacesVisible;

	const yOffset = 0.001;

	for (let z = 0; z < data.height; z++) {
		for (let x = 0; x < data.width; x++) {
			let tileId = data.data[z * data.width + x];
			if (tileId <= 0) continue;
			tileId -= 1;

			const pos = { x: x + 0.5, y: height + yOffset * height, z: z + 0.5 };

			voxels.set(getKeyFromPos(pos.x, pos.y, pos.z), {
				position: [pos.x, pos.y, pos.z],
				type: tileId,
				visible: true,
				hiddenFaces: [...hiddenFaces],
				isPreview: false,
			});
		}
	}
	return voxels;
}

function pruneCells(cells: Map<string, VoxelCell>, prevCells?: Map<string, VoxelCell>) {
	const prunedVoxels = prevCells ?? new Map<string, VoxelCell>();
	for (let k of cells.keys()) {
		const curCell = cells.get(k);

		if (prevCells && curCell.type < 0) {
			let pos = curCell.position;
			prevCells.delete(k);
			getNeighboringKeys(pos[0], pos[1], pos[2]).forEach((neighborKey) => {
				let neighbor = prevCells.get(neighborKey);
				if (neighbor !== undefined) {
					updateCellSides(neighbor, prevCells);
				}
			});
		} else {
			let visible = updateCellSides(curCell, cells) && (prevCells === undefined || updateCellSides(curCell, prevCells));
			if (visible) {
				prunedVoxels.set(k, curCell);
			}
		}
	}
	return prunedVoxels;
}

function buildMeshDataFromCells(cells: Map<string, VoxelCell>) {
	const px = [0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5];
	const nx = [-0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5];
	const py = [-0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5];
	const ny = [-0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5];
	const pz = [-0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5];
	const nz = [0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5];

	const faceVertices = [px, nx, py, ny, pz, nz];

	const meshes = {
		positions: [],
		indices: [],
	};

	for (let c of cells.keys()) {
		const curCell = cells.get(c);

		for (let i = 0; i < faceVertices.length; ++i) {
			if (curCell.hiddenFaces[i]) {
				continue;
			}

			const targetData = meshes;

			const bi = targetData.positions.length / 3;
			const localPositions = [...faceVertices[i]];
			for (let j = 0; j < 3; ++j) {
				for (let v = 0; v < 4; ++v) {
					localPositions[v * 3 + j] += curCell.position[j];
				}
			}
			targetData.positions.push(...localPositions);

			const localIndices = [0, 2, 1, 2, 3, 1];
			for (let j = 0; j < localIndices.length; ++j) {
				localIndices[j] += bi;
			}
			targetData.indices.push(...localIndices);
		}
	}

	return meshes;
}
