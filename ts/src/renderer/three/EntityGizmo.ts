namespace Renderer {
	export namespace Three {
		export class EntityGizmo {
			currentCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
			control: TransformControls;
			dimension: '2d' | '3d' = '3d';
			prev_rotation: number;
			undoAction: Record<string, any> = {};
			constructor() {
				this.init();
			}

			generateEditedAction() {
				const renderer = Three.instance();
				const control = this.control;
				const editedEntity = control.object;
				let editedAction = {};
				if (editedEntity instanceof Region) {
					editedAction = { name: editedEntity.taroEntity._stats.id };
				} else if (editedEntity instanceof InitEntity) {
					editedAction = { actionId: editedEntity.action.actionId };
				}
				switch (control.mode) {
					case 'translate':
						if (taro.is3D()) {
							editedAction['position'] = {
								x: Renderer.Three.Utils.worldToPixel(control.object.position.x),
								y: Renderer.Three.Utils.worldToPixel(control.object.position.z),
								z: Renderer.Three.Utils.worldToPixel(control.object.position.y),
								function: 'vector3',
							};
						} else {
							editedAction['position'] = {
								x: Renderer.Three.Utils.worldToPixel(control.object.position.x),
								y: Renderer.Three.Utils.worldToPixel(control.object.position.z),
								function: 'xyCoordinate',
							};
						}
						break;
					case 'rotate':
						control.object.rotation.order = 'YXZ';
						if (taro.is3D()) {
							const headingX = control.object.rotation.x;
							const headingY = control.object.rotation.y;
							const headingZ = control.object.rotation.z;
							const radiansX = headingX > 0 ? headingX : 2 * Math.PI + headingX;
							const radiansY = headingY > 0 ? headingY : 2 * Math.PI + headingY;
							const radiansZ = headingZ > 0 ? headingZ : 2 * Math.PI + headingZ;
							const degreesX = THREE.MathUtils.radToDeg(radiansX);
							const degreesY = THREE.MathUtils.radToDeg(radiansY);
							const degreesZ = THREE.MathUtils.radToDeg(radiansZ);
							editedAction['rotation'] = {
								x: degreesX,
								y: degreesY,
								z: degreesZ,
								function: 'vector3',
							};
						} else {
							const heading = control.object.rotation.y;
							const radians = heading > 0 ? heading : 2 * Math.PI + heading;
							const degrees = THREE.MathUtils.radToDeg(radians);
							editedAction['angle'] = degrees;
						}
						break;
					case 'scale':
						if (taro.is3D()) {
							if (control.object.body instanceof AnimatedSprite) {
								editedAction['scale'] = {
									x: Utils.worldToPixel(control.object.scale.x) / control.object.defaultWidth,
									y: Utils.worldToPixel(control.object.scale.z) / control.object.defaultHeight,
									z: 0,
									function: 'vector3',
								};
							} else if (control.object.body instanceof Model) {
								console.log(control.object.body.getSize())
								editedAction['scale'] = {
									x: Utils.worldToPixel(control.object.body.getSize().x / control.object.defaultWidth),
									y: Utils.worldToPixel(control.object.body.getSize().z / control.object.defaultHeight),
									z: Utils.worldToPixel(control.object.body.getSize().y / control.object.defaultDepth),
									function: 'vector3',
								};
							}
						} else {
							editedAction['width'] = Utils.worldToPixel(control.object.scale.x);
							editedAction['height'] = Utils.worldToPixel(control.object.scale.z);
						}
						break;
				}
				if (editedAction && renderer.entityEditor.selectedEntity instanceof Region) {
					editedAction['position'] = {
						x: Renderer.Three.Utils.worldToPixel(control.object.position.x),
						y: Renderer.Three.Utils.worldToPixel(control.object.position.z),
						function: 'xyCoordinate',
					};
					editedAction['width'] = Utils.worldToPixel(control.object.scale.x);
					editedAction['height'] = Utils.worldToPixel(control.object.scale.z);
					if (editedAction['position']) {
						editedAction['position'].x -= Utils.worldToPixel(control.object.scale.x) / 2;
						editedAction['position'].y -= Utils.worldToPixel(control.object.scale.z) / 2;
						editedAction['position'].z -= Utils.worldToPixel(control.object.scale.y) / 2;
					}
				}
				return editedAction;
			}

			init() {
				const renderer = Three.instance();
				const currentCamera = (this.currentCamera = renderer.camera.instance);
				const orbit = renderer.camera.controls;
				const control = (this.control = new TransformControls(currentCamera, renderer.renderer.domElement));
				this.undoAction = {};
				control.addEventListener(
					'dragging-changed',
					function (event) {
						if (event.value) {
							this.prev_rotation = control.object.rotation.y;
						}
						orbit.enabled = !event.value;
						if (!event.value) {
							// drag ended
							const editedAction = this.generateEditedAction();
							if (editedAction && renderer.entityEditor.selectedEntity instanceof InitEntity) {
								const nowAction = JSON.stringify(editedAction);
								const nowUndoAction = JSON.stringify(this.undoAction);
								const nowEntity = renderer.entityEditor.selectedEntity;
								renderer.voxelEditor.commandController.addCommand(
									{
										func: () => {
											const action = JSON.parse(nowAction);
											let nowId = action.actionId;
											for (let i = 0; i <= renderer.voxelEditor.commandController.nowInsertIndex + 1; i++) {
												let command = renderer.voxelEditor.commandController.commands[i];
												if (command && command.cache?.oldId === nowId) {
													nowId = command.cache?.newId;
												}
											}
											action.actionId = nowId;
											(nowEntity as InitEntity).edit(action);
										},
										undo: () => {
											const action = JSON.parse(nowUndoAction);
											let nowId = action.actionId;
											for (let i = 0; i <= renderer.voxelEditor.commandController.nowInsertIndex + 1; i++) {
												let command = renderer.voxelEditor.commandController.commands[i];
												if (command && command.cache?.oldId === nowId) {
													nowId = command.cache?.newId;
												}
											}
											action.actionId = nowId;
											(nowEntity as InitEntity).edit(action);
										},
									},
									true,
									true
								);
								this.undoAction = {};
							} else if (editedAction && renderer.entityEditor.selectedEntity instanceof Region) {
								const nowUndoAction = JSON.parse(JSON.stringify(this.undoAction));
								renderer.voxelEditor.commandController.addCommand(
									{
										func: () => {
											inGameEditor.updateRegionInReact && !window.isStandalone;
											inGameEditor.updateRegionInReact(editedAction as RegionData, 'threejs');
										},
										undo: () => {
											inGameEditor.updateRegionInReact && !window.isStandalone;
											inGameEditor.updateRegionInReact(nowUndoAction as RegionData, 'threejs');
										},
									},
									true,
									true
								);

								this.undoAction = {};
							}
						} else {
							if (this.undoAction === undefined) {
								this.undoAction = {};
							}
							if (this.undoAction.name === undefined && this.undoAction.actionId === undefined) {
								this.undoAction = this.generateEditedAction();
							}
						}
					}.bind(this)
				);

				renderer.scene.add(control);

				taro.client.on('gizmo-mode', (mode: 'translate' | 'rotate' | 'scale') => {
					const initEntity: InitEntity = control.object;
					if (initEntity?.isBillboard && mode === 'rotate') {
						return;
					}
					control.setMode(mode);
					this.updateForDimension();
				});

				window.addEventListener('keyup', function (event) {
					switch (event.key) {
						case 'Shift':
							control.setTranslationSnap(null);
							control.setRotationSnap(null);
							control.setScaleSnap(null);
							break;
					}
				});
			}

			attach(entity: Node) {
				if (entity instanceof AnimatedSprite) {
					this.dimension = '2d';
					this.updateForDimension();
				} else {
					this.dimension = '3d';
					this.updateForDimension();
				}
				this.control.attach(entity);
			}

			updateForDimension() {
				const control = this.control;
				if (this.dimension === '2d') {
					switch (control.mode) {
						case 'translate':
							control.showX = true;
							control.showY = false;
							control.showZ = true;
							break;
						case 'rotate':
							control.showX = false;
							control.showY = true;
							control.showZ = false;
							break;
						case 'scale':
							control.showX = true;
							control.showY = false;
							control.showZ = true;
							break;
					}
				} else {
					control.showX = true;
					control.showY = true;
					control.showZ = true;
				}
			}
		}
	}
}
