namespace Renderer {
	export namespace Three {
		export class EntityEditor {
			activeEntityPlacement: boolean;
			preview: Renderer.Three.AnimatedSprite | Renderer.Three.Model;
			gizmo: EntityGizmo;
			entityGroup: THREE.Group[];
			activeEntity: { id: string; player: string; entityType: string, action?: ActionData, is3DObject?: boolean };
			selectedEntities: (InitEntity | Region | THREE.Group)[];
			selectedGroup: THREE.Group;
			selectedEntitiesMinMaxCenterPos: { min: THREE.Vector2, max: THREE.Vector2, center: THREE.Vector2 } = { min: new THREE.Vector2(9999, 9999), max: new THREE.Vector2(-9999, -9999), center: new THREE.Vector2(0, 0) }
			copiedEntity: InitEntity;
			static TAG = "selectedGroup"
			constructor() {
				this.preview = undefined;
				this.entityGroup = [];
				this.selectedEntities = [];
				this.selectedGroup = new THREE.Group();
				(this.selectedGroup as any).tag = Three.EntityEditor.TAG;
				const renderer = Renderer.Three.instance();
				renderer.initEntityLayer.add(this.selectedGroup);
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
							initEntity.updateAction(data);
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
								initEntity.updateAction(action);
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
					if (event.key === 'c' && event.ctrlKey && this.selectedEntities && this.selectedEntities instanceof InitEntity) {
						const action = this.selectedEntities.action;
						const is3DObject = this.selectedEntities.isObject3D;

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
					height *= entityData.action.scale.z;
					width *= entityData.action.scale.x;
					depth *= entityData.action.scale.y;
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

			resetMinMax() {
				this.selectedEntitiesMinMaxCenterPos.max.set(-9999, -9999)
				this.selectedEntitiesMinMaxCenterPos.min.set(9999, 9999)
			}

			calcMinMaxPosition() {
				this.resetMinMax();
				this.selectedEntities.forEach((e) => {
					console.log(e)
					let nowPos = new THREE.Vector2(e.position.x, e.position.z);
					if ((e.parent as any).tag === Three.EntityEditor.TAG) {
						nowPos.add(this.selectedEntitiesMinMaxCenterPos.center);
					}
					this.selectedEntitiesMinMaxCenterPos.min.min(nowPos)
					this.selectedEntitiesMinMaxCenterPos.max.max(nowPos)
				})
				const positions = this.selectedEntitiesMinMaxCenterPos;
				const prevCenterPos = positions.center.clone();
				positions.center.set((positions.min.x + positions.max.x) / 2, (positions.min.y + positions.max.y) / 2)
				const offsetPos = prevCenterPos.sub(positions.center)
				this.selectedEntities.forEach((e) => {
					if ((e.parent as any).tag === Three.EntityEditor.TAG) {
						e.position.setX(e.position.x + offsetPos.x)
						e.position.setZ(e.position.z + offsetPos.y)
					} else {
						e.position.setX(e.position.x - positions.center.x)
						e.position.setZ(e.position.z - positions.center.y)
						this.selectedGroup.add(e)
					}
				})
				return positions
			}

			update(): void {
				const renderer = Renderer.Three.instance();
				if (this.activeEntityPlacement && this.preview) {
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
				renderer.initEntityLayer.children.forEach((e: any) => {
					console.log(e);
					e.update?.();
				})
			}

			getLastSelectedEntity() {
				return this.selectedEntities[
					this.selectedEntities.length - 1
				]
			}

			selectEntity(entity: InitEntity | Region, mode: 'addOrRemove' | 'select' = 'select'): void {
				const renderer = Renderer.Three.instance();
				if (entity === null) {
					this.selectedEntities = [];
					this.gizmo.control.detach();
					taro.client.emit('show-transform-modes', false);
					return;
				}
				switch (mode) {
					case 'select':
						{
							if ((entity.parent as any).tag !== Three.EntityEditor.TAG) {
								this.selectedEntities = [entity];
								this.gizmo.attach(entity);
								taro.client.emit('show-transform-modes', true);
							} else {
								this.selectedEntities = entity.parent.children as any;
								this.selectedGroup = entity.parent as any;
								this.gizmo.attach(entity.parent)
							}
							break;
						}
					case 'addOrRemove': {
						if (this.selectedEntities.find((e) => e.uuid === entity.uuid) === undefined) {
							this.selectedEntities.push(entity);
							const minMaxPos = this.calcMinMaxPosition()
							this.selectedGroup.position.set(minMaxPos.center.x, 0.51, minMaxPos.center.y);
							this.gizmo.attach(this.selectedGroup);
						} else {
							this.selectedEntities = this.selectedEntities.filter((e) => e.uuid !== entity.uuid)
							this.selectedGroup.remove(entity);
							renderer.initEntityLayer.add(entity);
							const minMaxPos = this.calcMinMaxPosition();
							entity.position.set(entity.position.x + this.selectedGroup.position.x, entity.position.y, entity.position.z + this.selectedGroup.position.z);
							this.selectedGroup.position.set(minMaxPos.center.x, 0.51, minMaxPos.center.y);
							this.gizmo.attach(this.selectedGroup);
						}

						break;
					}
				}

			}

			deleteEntity(): void {
				if (this.selectedEntities && this.selectedEntities instanceof InitEntity) {
					this.selectedEntities.delete();
				} else if (this.selectedEntities && this.selectedEntities instanceof Region) {
					const data = {
						name: this.selectedEntities.taroEntity._stats.id,
						delete: true,
					};
					const nowData = JSON.stringify(data)
					const nowTransformData = JSON.stringify(this.selectedEntities.stats)
					const renderer = Renderer.Three.instance();

					renderer.voxelEditor.commandController.addCommand({
						func: () => {
							const data = JSON.parse(nowData)
							inGameEditor.updateRegionInReact && !window.isStandalone && inGameEditor.updateRegionInReact(data, 'threejs');
						},
						undo: () => {
							const data = JSON.parse(nowData)
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
