namespace Renderer {
	export namespace Three {
		export class InitEntity extends Node {
			entityEditor: EntityEditor;
			action: ActionData;
			editedAction: ActionData;
			body: (Renderer.Three.AnimatedSprite | Renderer.Three.Model) & { entity: InitEntity };
			defaultWidth: number;
			defaultHeight: number;
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
				this.defaultWidth = entityTypeData.bodies?.default?.width;
				this.defaultHeight = entityTypeData.bodies?.default?.height;
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
					(body.sprite as THREE.Mesh & { entity: InitEntity }).entity = this;
					body.setBillboard(entityTypeData.isBillboard, renderer.camera);
				}
				body.entity = this;
				if (!isNaN(action.angle)) {
					this.rotation.order = 'YXZ';
					this.rotation.y = THREE.MathUtils.degToRad(action.angle);
				}

				if (!isNaN(action.width) && !isNaN(action.height))
					this.scale.set(action.width / this.defaultWidth, 1, action.height / this.defaultHeight);
				if (taro.developerMode.active && taro.developerMode.activeTab === 'map') {
					body.visible = true;
				} else {
					body.visible = false;
				}
				this.add(this.body);
				this.position.set(
					Utils.pixelToWorld(action.position?.x),
					Renderer.Three.getVoxels().calcLayersHeight(0) + 0.1,
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
				}
				if (!isNaN(this.action.angle) && !isNaN(action.angle)) {
					this.action.angle = action.angle;
					this.rotation.y = THREE.MathUtils.degToRad(action.angle);
				}
				if (!isNaN(this.action.width) && !isNaN(action.width)) {
					this.action.width = action.width;
					this.scale.setX(action.width / this.defaultWidth);
				}
				if (!isNaN(this.action.height) && !isNaN(action.height)) {
					this.action.height = action.height;
					this.scale.setZ(action.height / this.defaultHeight);
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
