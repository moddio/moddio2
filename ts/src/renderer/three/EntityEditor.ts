namespace Renderer {
	export namespace Three {
		export class EntityEditor {
			activeEntityPlacement: boolean;
			preview: Renderer.Three.AnimatedSprite | Renderer.Three.Model;
			gizmo: EntityGizmo;

			activeEntity: { id: string; player: string; entityType: string };
			selectedInitEntity: InitEntity;
			constructor() {
				this.preview = undefined;
				const renderer = Renderer.Three.instance();
				renderer.initEntityLayer.add(this.preview);
				this.activatePlacement(false);

				this.gizmo = new EntityGizmo();
				taro.client.on('add-entities', () => {
					this.selectInitEntity(null);
					this.activatePlacement(true);
				});
				taro.client.on('cursor', () => {
					this.activatePlacement(false);
				});
				taro.client.on('draw-region', () => {
					this.selectInitEntity(null);
					this.activatePlacement(false);
				});
				taro.client.on('brush', () => {
					this.selectInitEntity(null);
					this.activatePlacement(false);
				});
				taro.client.on('empty-tile', () => {
					this.selectInitEntity(null);
					this.activatePlacement(false);
				});
				taro.client.on('fill', () => {
					this.selectInitEntity(null);
					this.activatePlacement(false);
				});
				taro.client.on('clear', () => {
					this.selectInitEntity(null);
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
						this.deleteInitEntity();
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
				let key: string;

				if (entityData.entityType === 'unitTypes') {
					key = `${entity.cellSheet.url}`;
					if (entity.bodies?.default) {
						height = entity.bodies.default.height;
						width = entity.bodies.default.width;
					} else {
						console.log('no default body for unit', entityData.id);
						return;
					}
				} else if (entityData.entityType === 'itemTypes') {
					key = `${entity.cellSheet.url}`;
					if (entity.bodies?.dropped) {
						height = entity.bodies.dropped.height;
						width = entity.bodies.dropped.width;
					} else {
						console.log('no dropped body for item', entityData.id);
						return;
					}
				} else if (entityData.entityType === 'projectileTypes') {
					key = `${entity.cellSheet.url}`;
					if (entity.bodies?.default) {
						height = entity.bodies.default.height;
						width = entity.bodies.default.width;
					} else {
						console.log('no default body for projectile', entityData.id);
						return;
					}
				}
				const cols = entity.cellSheet.columnCount || 1;
				const rows = entity.cellSheet.rowCount || 1;
				if (entity.is3DObject) {
					this.preview = new Renderer.Three.Model(key);
					this.preview.setOpacity(0.5);
					renderer.initEntityLayer.add(this.preview);
				} else {
					const tex = gAssetManager.getTexture(key).clone();
					const frameWidth = tex.image.width / cols;
					const frameHeight = tex.image.height / rows;
					const texture = new TextureSheet(key, tex, frameWidth, frameHeight);

					this.preview = new Renderer.Three.AnimatedSprite(texture) as Renderer.Three.AnimatedSprite;
					this.preview.setBillboard(entity.isBillboard, renderer.camera);
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

			selectInitEntity(initEntity: InitEntity): void {
				if (initEntity === null) {
					this.selectedInitEntity = null;
					this.gizmo.control.detach();
					taro.client.emit('show-transform-modes', false);
					return;
				}
				this.selectedInitEntity = initEntity;
				this.gizmo.attach(initEntity);
				taro.client.emit('show-transform-modes', true);
			}

			rescaleInitEntity(
				width: boolean,
				height: boolean,
				worldPoint: Phaser.Math.Vector2,
				imagePoint: Phaser.Types.Math.Vector2Like,
				selectedEntityImage: EntityImage,
				editedAction: ActionData
			): void {
				const distanceToStart = Phaser.Math.Distance.Between(
					imagePoint.x,
					imagePoint.y,
					selectedEntityImage.startDragX,
					selectedEntityImage.startDragY
				);
				const distanceToCurrent = Phaser.Math.Distance.Between(imagePoint.x, imagePoint.y, worldPoint.x, worldPoint.y);
				if (width) {
					selectedEntityImage.image.scaleX = selectedEntityImage.scaleX * (distanceToCurrent / distanceToStart);
					editedAction.width = Math.floor(selectedEntityImage.image.displayWidth);
				}
				if (height) {
					selectedEntityImage.image.scaleY = selectedEntityImage.scaleY * (distanceToCurrent / distanceToStart);
					editedAction.height = Math.floor(selectedEntityImage.image.displayHeight);
				}
			}

			deleteInitEntity(): void {
				if (this.selectedInitEntity) {
					this.selectedInitEntity.delete();
					this.selectInitEntity(null);
				}
			}
		}
	}
}
