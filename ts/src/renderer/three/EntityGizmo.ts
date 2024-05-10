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
						const initEntity: InitEntity = control.object;
						const editedAction = { actionId: initEntity.action.actionId };
						switch (control.mode) {
							case 'translate':
								editedAction['position'] = {
									x: Renderer.Three.Utils.worldToPixel(control.object.position.x),
									y: Renderer.Three.Utils.worldToPixel(control.object.position.z),
									function: 'xyCoordinate',
								};
								break;
							case 'rotate':
								control.object.rotation.order = 'YXZ';
								const heading = control.object.rotation.y;
								const radians = heading > 0 ? heading : 2 * Math.PI + heading;
								const degrees = THREE.MathUtils.radToDeg(radians);
								editedAction['angle'] = degrees;
								break;
							case 'scale':
								editedAction['width'] = control.object.scale.x * initEntity.defaultWidth;
								editedAction['height'] = control.object.scale.z * initEntity.defaultHeight;
								break;
						}
						if (editedAction) {
							renderer.entityEditor.selectedInitEntity.edit(editedAction);
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
					// TODO: make it 3d when taro action will support 3d
					this.dimension = '2d';
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
