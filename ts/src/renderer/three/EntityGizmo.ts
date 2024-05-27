namespace Renderer {
	export namespace Three {
		export class EntityGizmo {
			currentCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
			control: TransformControls;
			dimension: '2d' | '3d' = '3d';
			prev_rotation: number;
			constructor() {
				this.init();
			}

			init() {
				const renderer = Three.instance();
				const currentCamera = (this.currentCamera = renderer.camera.instance);
				const orbit = renderer.camera.controls;
				const control = (this.control = new TransformControls(currentCamera, renderer.renderer.domElement));

				control.addEventListener('dragging-changed', function (event) {
					if (event.value) {
						this.prev_rotation = control.object.rotation.y;
					}
					orbit.enabled = !event.value;
					if (!event.value) {
						// drag ended
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
											x: Utils.worldToPixel(control.object.scale.x),
											y: Utils.worldToPixel(control.object.scale.z),
											z: Utils.worldToPixel(0),
											function: 'vector3',
										};
									} else if (control.object.body instanceof Model) {
										editedAction['scale'] = {
											x: Utils.worldToPixel(control.object.body.getSize().x / control.object.defaultWidth),
											y: Utils.worldToPixel(control.object.body.getSize().z / control.object.defaultDepth),
											z: Utils.worldToPixel(control.object.body.getSize().y / control.object.defaultHeight),
											function: 'vector3',
										};
									}
								} else {
									editedAction['width'] = Utils.worldToPixel(control.object.scale.x);
									editedAction['height'] = Utils.worldToPixel(control.object.scale.z);
								}
								break;
						}
						if (editedAction && renderer.entityEditor.selectedEntity instanceof InitEntity) {
							renderer.entityEditor.selectedEntity.edit(editedAction);
						} else if (editedAction && renderer.entityEditor.selectedEntity instanceof Region) {
							if (editedAction['position']) {
								editedAction['position'].x -= Utils.worldToPixel(control.object.scale.x) / 2;
								editedAction['position'].y -= Utils.worldToPixel(control.object.scale.z) / 2;
								editedAction['position'].z -= Utils.worldToPixel(control.object.scale.y) / 2;
							}
							inGameEditor.updateRegionInReact &&
								inGameEditor.updateRegionInReact(editedAction as RegionData, 'threejs');
						}
					}
				});

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
