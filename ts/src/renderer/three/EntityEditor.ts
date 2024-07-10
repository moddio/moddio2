namespace Renderer {
	export namespace Three {
		export class EntityEditor {
			activeEntityPlacement: boolean;
			preview: Renderer.Three.AnimatedSprite | Renderer.Three.Model;
			gizmo: EntityGizmo;

			activeEntity: { id: string; player: string; entityType: string, action?: ActionData, is3DObject?: boolean };
			selectedEntity: InitEntity | Region;
			copiedEntity: InitEntity;
			constructor() {
				this.preview = undefined;
				const renderer = Renderer.Three.instance();
				this.activatePlacement(false);

				this.gizmo = new EntityGizmo();
				taro.client.on('add-entities', () => {
					this.selectEntity(null);
					this.activatePlacement(true);
				});
				taro.client.on('cursor', () => {
					this.activatePlacement(false);
				});
				taro.client.on('draw-region', () => {
					this.selectEntity(null);
					this.activatePlacement(false);
				});
				taro.client.on('brush', () => {
					this.selectEntity(null);
					this.activatePlacement(false);
				});
				taro.client.on('empty-tile', () => {
					this.selectEntity(null);
					this.activatePlacement(false);
				});
				taro.client.on('fill', () => {
					this.selectEntity(null);
					this.activatePlacement(false);
				});
				taro.client.on('clear', () => {
					this.selectEntity(null);
				});
				taro.client.on('updateActiveEntity', () => {
					this.activeEntity = inGameEditor.getActiveEntity && inGameEditor.getActiveEntity();
					this.updatePreview();
				});
				const initEntities = renderer.entityManager.initEntities;
				taro.client.on('editInitEntity', (data: ActionData) => {
					let found = false;
					initEntities.forEach((initEntity) => {
						if (initEntity.action.actionId === data.actionId) {
							found = true;
							initEntity.update(data);
						}
					});
					if (!found) {
						renderer.createInitEntity(data);
					}
				});
				taro.client.on('updateInitEntities', () => {
					taro.developerMode.initEntities.forEach((action) => {
						let found = false;
						initEntities.forEach((initEntity) => {
							if (initEntity.action.actionId === action.actionId) {
								found = true;
								initEntity.update(action);
							}
						});
						if (!found) {
							renderer.createInitEntity(action);
						}
					});
				});

				window.addEventListener('keydown', (event) => {

					if (event.key === 'Delete' || event.key === 'Backspace') {
						this.deleteEntity();
					}
					if (event.key === 'c' && event.ctrlKey && this.selectedEntity && this.selectedEntity instanceof InitEntity) {
						const action = this.selectedEntity.action;
						const is3DObject = this.selectedEntity.isObject3D;

						this.selectEntity(null);
						this.activatePlacement(true);
						setTimeout(() => {
							(window as any).selectTool('add-entities');
							this.activeEntity = {
								id: action.entity,
								player: action.player.variableName,
								entityType: action.entityType,
								action: action,
								is3DObject
							}
							this.updatePreview();
						}, 0)

					}
				});
			}

			activatePlacement(active: boolean): void {
				if (active) {
					//show entities list
					this.activeEntityPlacement = true;
					inGameEditor.toggleEntityPlacementWindow && inGameEditor.toggleEntityPlacementWindow(true);
				} else {
					//hide entities list
					this.activeEntityPlacement = false;
					inGameEditor.toggleEntityPlacementWindow && inGameEditor.toggleEntityPlacementWindow(false);
				}
			}

			updatePreview(): void {
				const entityData = this.activeEntity;
				const renderer = Renderer.Three.instance();
				if (this.preview) {
					this.preview.destroy();
				}
				if (!entityData) {
					if (this.preview) {
						this.preview.visible = false;
					}
					return;
				}

				const entity = taro.game.data[entityData.entityType] && taro.game.data[entityData.entityType][entityData.id];
				let height: number;
				let width: number;
				let depth: number;
				let key: string;

				if (entityData.entityType === 'unitTypes') {
					key = `${entity.cellSheet.url}`;
					if (entity.bodies?.default) {
						height = entity.bodies.default.height;
						width = entity.bodies.default.width;
						depth = entity.bodies.default.depth;
					} else {
						console.log('no default body for unit', entityData.id);
						return;
					}
				} else if (entityData.entityType === 'itemTypes') {
					key = `${entity.cellSheet.url}`;
					if (entity.bodies?.dropped) {
						height = entity.bodies.dropped.height;
						width = entity.bodies.dropped.width;
						depth = entity.bodies.dropped.depth;
					} else {
						console.log('no dropped body for item', entityData.id);
						return;
					}
				} else if (entityData.entityType === 'projectileTypes') {
					key = `${entity.cellSheet.url}`;
					if (entity.bodies?.default) {
						height = entity.bodies.default.height;
						width = entity.bodies.default.width;
						depth = entity.bodies.default.depth;
					} else {
						console.log('no default body for projectile', entityData.id);
						return;
					}
				}
				if (entityData.action && entityData.action.scale) {
					height *= entityData.action.scale.y;
					width *= entityData.action.scale.x;
					depth *= entityData.action.scale.z;
				}
				const cols = entity.cellSheet.columnCount || 1;
				const rows = entity.cellSheet.rowCount || 1;
				if (entity.is3DObject) {
					this.preview = new Renderer.Three.Model(key);
					this.preview.setSize(Utils.pixelToWorld(width), Utils.pixelToWorld(depth), Utils.pixelToWorld(height));
					this.preview.setOpacity(0.5);
					if (entityData.action && entityData.action.rotation) {
						this.preview.rotation.set(
							THREE.MathUtils.degToRad(entityData.action.rotation.x),
							THREE.MathUtils.degToRad(entityData.action.rotation.y),
							THREE.MathUtils.degToRad(entityData.action.rotation.z)
						);
					}
					renderer.initEntityLayer.add(this.preview);
				} else {
					const tex = gAssetManager.getTexture(key).clone();
					const frameWidth = tex.image.width / cols;
					const frameHeight = tex.image.height / rows;
					const texture = new TextureSheet(key, tex, frameWidth, frameHeight);

					this.preview = new Renderer.Three.AnimatedSprite(texture) as Renderer.Three.AnimatedSprite;
					this.preview.setBillboard(entity.isBillboard, renderer.camera);
					this.preview.scale.set(Utils.pixelToWorld(width), 1, Utils.pixelToWorld(height));
					this.preview.setOpacity(0.5);
					renderer.initEntityLayer.add(this.preview);
				}
			}

			update(): void {
				if (this.activeEntityPlacement && this.preview) {
					const renderer = Renderer.Three.instance();
					const worldPoint = renderer.raycastFloor(0);
					if (worldPoint) {
						this.preview.position.setX(worldPoint.x);
						this.preview.position.setY(Renderer.Three.getVoxels().calcLayersHeight(0) + 0.1);
						this.preview.position.setZ(worldPoint.z);
					}
					if (this.preview instanceof Renderer.Three.AnimatedSprite) {
						this.preview.setBillboard(this.preview.billboard, renderer.camera);
					}
				}
			}

			selectEntity(entity: InitEntity | Region): void {
				if (entity === null) {
					this.selectedEntity = null;
					this.gizmo.control.detach();
					taro.client.emit('show-transform-modes', false);
					return;
				}
				this.selectedEntity = entity;
				this.gizmo.attach(entity);
				taro.client.emit('show-transform-modes', true);
			}

			deleteEntity(): void {
				if (this.selectedEntity && this.selectedEntity instanceof InitEntity) {
					this.selectedEntity.delete();
				} else if (this.selectedEntity && this.selectedEntity instanceof Region) {
					const data = {
						name: this.selectedEntity.taroEntity._stats.id,
						delete: true,
					};
					const nowData = JSON.stringify(data)
					const nowTransformData = JSON.stringify(this.selectedEntity.stats)
					const renderer = Renderer.Three.instance();

					renderer.voxelEditor.commandController.addCommand({
						func: () => {
							const data = JSON.parse(nowData)
							inGameEditor.updateRegionInReact && !window.isStandalone && inGameEditor.updateRegionInReact(data, 'threejs');
						},
						undo: () => {
							const transformData = JSON.parse(nowTransformData);
							// TODO: no need to show the modal here
							inGameEditor.addNewRegion &&
								inGameEditor.addNewRegion({
									name: '',
									x: transformData.x,
									y: transformData.y,
									width: transformData.width,
									height: transformData.height,
									create: true,
								});
						}
					}, true)
				}
				this.selectEntity(null);
			}
		}
	}
}
