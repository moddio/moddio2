namespace Renderer {
	export namespace Three {
		export class VoxelMarker extends Node {
			lines: MarkerLines;
			preview: THREE.Group;
			meshes: Record<number, Record<number, THREE.Mesh>>;
			commandController: CommandController;
			active: boolean;
			extrudedKey: string;
			private lastPoint: THREE.Vector3 | undefined = undefined;

			constructor(commandController: CommandController) {
				super();

				this.active = true;
				this.commandController = commandController;
				this.lines = new MarkerLines();

				this.preview = new THREE.Group();
				this.meshes = {};
			}

			addMesh(x: number, y: number, z: number): THREE.Mesh {
				const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
				const material = new THREE.MeshBasicMaterial({
					color: 0xff0000,
					opacity: 0.5,
					transparent: true,
				});
				const mesh = new THREE.Mesh(geometry, material);
				mesh.position.set(x, y, z);
				this.preview.add(mesh);
				return mesh;
			}

			removeMeshes() {
				this.preview.clear();
			}

			updatePreview(shouldUpdatePos = true, force = false) {
				const renderer = Renderer.Three.instance();
				const voxels = Renderer.Three.getVoxels();
				if (shouldUpdatePos) {
					const raycaster = new THREE.Raycaster();

					raycaster.setFromCamera(Renderer.Three.getPointer(), renderer.camera.instance);
					const intersect = renderer.raycastFloor();

					if (!force && (!intersect || (this.lastPoint !== undefined && this.lastPoint.equals(intersect.floor())))) {
						return;
					}
					this.lastPoint = intersect.floor().clone();
				}

				this.removeMeshes();
				if (taro.developerMode.activeButton === 'eraser') {
					this.addMesh(
						Math.floor(this.lastPoint.x) + 0.5,
						renderer.voxelEditor.voxels.layerLookupTable[renderer.voxelEditor.currentLayerIndex],
						Math.floor(this.lastPoint.z) + 0.5
					);
					voxels.add(this.preview);
					return;
				}

				const _x = Math.floor(this.lastPoint.x);
				const _y = Math.floor(this.lastPoint.z);
				const selectedTiles = {};
				const tileId = renderer.tmp_tileId;
				selectedTiles[_x] = {};
				selectedTiles[_x][_y] = tileId;
				renderer.voxelEditor.putTiles(
					_x,
					_y,
					selectedTiles,
					'fitContent',
					'rectangle',
					renderer.voxelEditor.currentLayerIndex,
					true,
					false,
					true
				);
			}
		}
	}
}
