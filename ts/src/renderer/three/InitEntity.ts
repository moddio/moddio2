namespace Renderer {
	export namespace Three {
		export class InitEntity extends Node {
			entityEditor: EntityEditor;
			action: ActionData;
			editedAction: ActionData;
			body: (Renderer.Three.AnimatedSprite | Renderer.Three.Model) & { entity: InitEntity };
			defaultWidth: number;
			defaultHeight: number;
			defaultDepth: number;
			isBillboard = false;

			constructor(action: ActionData, type?: 'unit' | 'item' | 'projectile') {
				super();
				this.action = action;
				let key: string;
				let cols: number;
				let rows: number;
				let entityTypeData: Record<string, any>;

				for (let typeName of ['unit', 'item', 'projectile'].values()) {
					const iterTypes = `${typeName}Types`;
					const iterType = `${typeName}Type`;
					if (action.entityType === iterTypes || type === typeName) {
						entityTypeData = taro.game.data[iterTypes] && taro.game.data[iterTypes][action.entity ?? action[iterType]];
						if (!entityTypeData) return;
						key = `${entityTypeData.cellSheet.url}`;
						cols = entityTypeData.cellSheet.columnCount || 1;
						rows = entityTypeData.cellSheet.rowCount || 1;
					}
				}
				const defaultWidth = (this.defaultWidth = entityTypeData.bodies?.default?.width);
				const defaultHeight = (this.defaultHeight = entityTypeData.bodies?.default?.height);
				const defaultDepth = (this.defaultDepth = entityTypeData.bodies?.default?.depth);
				this.isBillboard = entityTypeData?.isBillboard ?? false;
				const renderer = Renderer.Three.instance();
				let body: (Renderer.Three.AnimatedSprite | Renderer.Three.Model) & { entity: InitEntity };
				if (entityTypeData.is3DObject) {
					body = this.body = new Renderer.Three.Model(key) as Renderer.Three.Model & {
						entity: InitEntity;
					};
				} else {
					const tex = gAssetManager.getTexture(key).clone();
					const frameWidth = tex.image.width / cols;
					const frameHeight = tex.image.height / rows;
					const texture = new TextureSheet(key, tex, frameWidth, frameHeight);
					body = this.body = new Renderer.Three.AnimatedSprite(texture) as Renderer.Three.AnimatedSprite & {
						entity: InitEntity;
					};
					(body.sprite as THREE.InstancedMesh & { entity: InitEntity }).entity = this;
					body.setBillboard(entityTypeData.isBillboard, renderer.camera);
				}
				body.entity = this;
				this.rotation.order = 'YXZ';
				if (taro.is3D()) {
					if (!isNaN(action.rotation?.x) && !isNaN(action.rotation?.y) && !isNaN(action.rotation?.z)) {
						this.rotation.set(
							THREE.MathUtils.degToRad(action.rotation.x),
							THREE.MathUtils.degToRad(action.rotation.y),
							THREE.MathUtils.degToRad(action.rotation.z)
						);
					} else if (!isNaN(action.angle)) {
						this.rotation.y = THREE.MathUtils.degToRad(action.angle);
					}
					if (!isNaN(action.scale?.x) && !isNaN(action.scale?.y) && !isNaN(action.scale?.z)) {
						if (body instanceof AnimatedSprite) {
							this.setSize(
								Utils.pixelToWorld(defaultWidth * action.scale.x),
								1,
								Utils.pixelToWorld(defaultHeight * action.scale.y)
							);
						} else if (body instanceof Model) {
							this.setSize(
								Utils.pixelToWorld(defaultWidth * action.scale.x),
								Utils.pixelToWorld(defaultDepth * action.scale.z),
								Utils.pixelToWorld(defaultHeight * action.scale.y)
							);
						}
					} else if (!isNaN(action.width) && !isNaN(action.height)) {
						if (body instanceof AnimatedSprite) {
							this.setSize(Utils.pixelToWorld(action.width), 1, Utils.pixelToWorld(action.height));
						} else if (body instanceof Model) {
							this.setSize(
								Utils.pixelToWorld(action.width),
								Utils.pixelToWorld(defaultDepth),
								Utils.pixelToWorld(action.height)
							);
						}
					}
				} else {
					if (!isNaN(action.angle)) {
						this.rotation.y = THREE.MathUtils.degToRad(action.angle);
					}
					if (!isNaN(action.width) && !isNaN(action.height)) {
						this.setSize(Utils.pixelToWorld(action.width), 1, Utils.pixelToWorld(action.height));
					}
				}

				if (taro.developerMode.active && taro.developerMode.activeTab === 'map') {
					body.visible = true;
				} else {
					body.visible = false;
				}
				this.add(this.body);
				this.position.set(
					Utils.pixelToWorld(action.position?.x),
					action.position?.z
						? Utils.pixelToWorld(action.position?.z)
						: Renderer.Three.getVoxels().calcLayersHeight(0) + 0.1,
					Utils.pixelToWorld(action.position?.y)
				);
				renderer.initEntityLayer.add(this);
				renderer.entityManager.initEntities.push(this);
			}

			edit(action: ActionData): void {
				if (!this.action.wasEdited || !action.wasEdited) {
					this.action.wasEdited = true;
					action.wasEdited = true;
				}
				taro.network.send<any>('editInitEntity', action);
			}

			setSize(x: number, y: number, z: number) {
				if (this.body instanceof AnimatedSprite) {
					this.scale.set(x, 1, z);
				} else if (this.body instanceof Model) {
					this.scale.x = this.body.originalScale.x * (x / this.body.originalSize.x);
					this.scale.y = this.body.originalScale.y * (y / this.body.originalSize.y);
					this.scale.z = this.body.originalScale.z * (z / this.body.originalSize.z);
				}
			}

			update(action: ActionData): void {
				//update action in editor
				if (inGameEditor && inGameEditor.updateAction) {
					inGameEditor.updateAction(action);
				}
				if (action.wasEdited) this.action.wasEdited = true;
				if (
					this.action.position &&
					!isNaN(this.action.position.x) &&
					!isNaN(this.action.position.y) &&
					action.position &&
					!isNaN(action.position.x) &&
					!isNaN(action.position.y)
				) {
					this.action.position = action.position;
					this.position.x = Utils.pixelToWorld(action.position.x);
					this.position.z = Utils.pixelToWorld(action.position.y);
					if (!isNaN(action.position.z)) {
						this.position.y = Utils.pixelToWorld(action.position.z);
					}
				}
				if (taro.is3D()) {
					if (
						!isNaN(action.rotation?.x) &&
						!isNaN(action.rotation?.y) &&
						!isNaN(action.rotation?.z) &&
						(this.action.rotation === undefined ||
							(!isNaN(this.action.rotation?.x) && !isNaN(this.action.rotation?.y) && !isNaN(this.action.rotation?.z)) ||
							(!isNaN(this.action.angle) && !isNaN(action.angle)))
					) {
						if (!isNaN(action.angle)) {
							this.action.angle = action.angle;
							this.action.rotation = { x: 0, y: action.angle, z: 0 };
						}
						if (action.rotation) {
							this.action.rotation = action.rotation;
						}

						this.rotation.set(
							THREE.MathUtils.degToRad(this.action.rotation.x),
							THREE.MathUtils.degToRad(this.action.rotation.y),
							THREE.MathUtils.degToRad(this.action.rotation.z)
						);
					}
					if (
						!isNaN(action.scale?.x) &&
						!isNaN(action.scale?.y) &&
						!isNaN(action.scale?.z) &&
						(this.action.scale === undefined ||
							(!isNaN(this.action.scale?.x) && !isNaN(this.action.scale?.y) && !isNaN(this.action.scale?.z)) ||
							(!isNaN(this.action.width) && !isNaN(action.width)) ||
							(!isNaN(this.action.height) && !isNaN(action.height)))
					) {
						if (!isNaN(action.width)) {
							this.action.width = action.width;
							this.action.scale.x = action.width;
						}
						if (!isNaN(action.height)) {
							this.action.height = action.height;
							this.action.scale.z = action.height;
						}
						if (action.scale) {
							this.action.scale = action.scale;
						}
						if (isNaN(this.action.scale.x)) {
							this.action.scale.x = 0;
						}
						if (isNaN(this.action.scale.y)) {
							this.action.scale.y = 0;
						}
						if (isNaN(this.action.scale.z)) {
							this.action.scale.z = 0;
						}
						this.setSize(this.action.scale.x, this.action.scale.z, this.action.scale.y);
					}
					if (!isNaN(this.action.width) && !isNaN(action.width)) {
						this.action.width = action.width;
						this.setSize(
							Utils.pixelToWorld(action.width),
							Utils.pixelToWorld(this.defaultDepth),
							Utils.pixelToWorld(this.action.height)
						);
					}
					if (!isNaN(this.action.height) && !isNaN(action.height)) {
						this.action.height = action.height;
						this.setSize(
							Utils.pixelToWorld(this.action.width),
							Utils.pixelToWorld(this.defaultDepth),
							Utils.pixelToWorld(action.height)
						);
					}
				} else {
					if (!isNaN(this.action.angle) && !isNaN(action.angle)) {
						this.action.angle = action.angle;
						this.rotation.y = THREE.MathUtils.degToRad(action.angle);
					}
					if (!isNaN(this.action.width) && !isNaN(action.width)) {
						this.action.width = action.width;
						this.scale.setX(Utils.pixelToWorld(action.width));
					}
					if (!isNaN(this.action.height) && !isNaN(action.height)) {
						this.action.height = action.height;
						this.scale.setZ(Utils.pixelToWorld(action.height));
					}
				}
				if (action.wasDeleted) {
					const renderer = Renderer.Three.instance();
					renderer.entityManager.destroyInitEntity(this);
					this.action.wasDeleted = true;
				}
			}

			hide(): void {
				this.visible = false;
			}

			delete(): void {
				let editedAction: ActionData = { actionId: this.action.actionId, wasDeleted: true };
				this.edit(editedAction);
				const renderer = Renderer.Three.instance();
				renderer.entityManager.destroyInitEntity(this);
			}
		}
	}
}
