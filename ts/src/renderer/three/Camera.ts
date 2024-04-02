namespace Renderer {
	export namespace Three {
		export class Camera {
			instance: THREE.PerspectiveCamera | THREE.OrthographicCamera;
			target: THREE.Object3D | null = null;
			controls: OrbitControls;
			zoom = 1;
			zoomHeight = 700;
			isPerspective = false;

			orthographicState: { target: THREE.Vector3; position: THREE.Vector3 };
			perspectiveState: { target: THREE.Vector3; position: THREE.Vector3; zoom: number };

			isDevelopmentMode = false;

			private orthographicCamera: THREE.OrthographicCamera;
			private perspectiveCamera: THREE.PerspectiveCamera;
			private fovInitial: number;
			private viewportHeightInitial: number;

			private debugInfo: HTMLDivElement;

			private onChangeCbs = [];

			private offset = new THREE.Vector3();
			private originalDistance = 1;
			private originalHalfWidth;

			private originalZoom = 1;
			private elevationAngle = 0;
			private azimuthAngle = 0;

			private tempVec3 = new THREE.Vector3();
			private tempVec2 = new THREE.Vector2();
			private raycaster = new THREE.Raycaster();

			constructor(
				private viewportWidth: number,
				private viewportHeight: number,
				canvas: HTMLCanvasElement
			) {
				// Public API

				// DONE
				// camera.setProjection(string)
				// camera.setElevationAngle(number)
				// camera.getElevationAngle()
				// camera.setAzimuthAngle(number)
				// camera.setOffset(x, y, z)
				// camera.setElevationRange(min, max)
				// camera.setZoom(number)

				// TODO
				// camera.setTarget(object3d | null, moveInstantOrLerp)
				// camera.setPointerLock(bool)
				// camera.setFollowSpeed(number)
				// camera.update(dt <--)

				const persCamera = new THREE.PerspectiveCamera(75, viewportWidth / viewportHeight, 0.1, 15000);
				this.perspectiveCamera = persCamera;
				this.fovInitial = Math.tan(((Math.PI / 180) * this.perspectiveCamera.fov) / 2);
				this.viewportHeightInitial = viewportHeight;

				const halfWidth = Utils.pixelToWorld(viewportWidth / 2);
				const halfHeight = Utils.pixelToWorld(viewportHeight / 2);
				this.originalHalfWidth = halfWidth;
				const orthoCamera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, -2000, 15000);
				this.orthographicCamera = orthoCamera;

				const yFovDeg = this.perspectiveCamera.fov * (Math.PI / 180);
				const distance = this.orthographicCamera.top / Math.tan(yFovDeg * 0.5) / this.orthographicCamera.zoom;
				this.perspectiveCamera.position.y = distance;
				this.orthographicCamera.position.y = distance;
				this.originalDistance = distance;

				this.perspectiveCamera.position.add(this.offset);
				this.orthographicCamera.position.add(this.offset);

				this.instance = orthoCamera;

				this.controls = new OrbitControls(this.instance, canvas);
				this.controls.enableRotate = false;
				this.controls.enableZoom = false;
				this.controls.mouseButtons = { LEFT: '', MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
				this.controls.minDistance = 0.01;
				this.controls.maxDistance = 1000;
				this.controls.minZoom = 1 / (1000 / distance);
				this.controls.maxZoom = 1 / (0.01 / distance);
				this.controls.enablePan = false;
				this.controls.screenSpacePanning = false;
				this.controls.update();

				this.controls.mouseButtons = {
					LEFT: THREE.MOUSE.PAN,
					MIDDLE: THREE.MOUSE.DOLLY,
					RIGHT: THREE.MOUSE.ROTATE,
				};

				this.controls.addEventListener('change', () => {
					for (const cb of this.onChangeCbs) {
						cb();
					}
				});

				this.orthographicState = {
					target: new THREE.Vector3(),
					position: new THREE.Vector3(),
				};
				this.perspectiveState = {
					target: new THREE.Vector3(),
					position: new THREE.Vector3(),
					zoom: this.controls.zoom,
				};

				window.addEventListener('keypress', (evt) => {
					if (evt.key === ',') {
						this.isPerspective = false;
						this.instance = this.orthographicCamera;
						this.controls.object = this.orthographicCamera;
						this.zoom = this.originalZoom;

						this.setElevationAngle(90);
						this.setAzimuthAngle(0);

						const yFovDeg = this.perspectiveCamera.fov * (Math.PI / 180);
						const distance = this.orthographicCamera.top / Math.tan(yFovDeg * 0.5);
						this.setDistance(distance);
					} else if (evt.key === '.') {
						this.isPerspective = !this.isPerspective;

						if (this.isPerspective) {
							this.switchToPerspectiveCamera();
						} else {
							this.switchToOrthographicCamera();
						}
					} else if (evt.key === '/') {
						this.controls.enableRotate = !this.controls.enableRotate;
						this.controls.enableZoom = !this.controls.enableZoom;
					}
				});

				const info = document.createElement('div');
				canvas.parentElement.appendChild(info);
				info.style.position = 'absolute';
				info.style.zIndex = '999';
				info.style.left = '0';
				info.style.top = '0';
				info.style.padding = '10px';
				info.style.margin = '5px';
				info.style.color = 'white';
				info.style.background = 'black';
				info.style.opacity = '0.75';
				info.style.marginTop = '40px';
				this.debugInfo = info;

				//@ts-ignore
				this.raycaster.firstHitOnly = true;
			}

			setProjection(projection: typeof taro.game.data.settings.camera.projectionMode) {
				if (projection === 'orthographic') this.switchToOrthographicCamera();
				else if (projection === 'perspective') this.switchToPerspectiveCamera();
			}

			setElevationAngle(deg: number) {
				this.elevationAngle = deg;

				const spherical = new THREE.Spherical();
				spherical.radius = this.controls.getDistance();
				spherical.theta = this.controls.getAzimuthalAngle();

				const rad = deg * (Math.PI / 180);
				spherical.phi = Math.PI * 0.5 - rad;

				spherical.makeSafe();

				this.perspectiveCamera.position.setFromSpherical(spherical).add(this.controls.target).add(this.offset);
				this.orthographicCamera.position.setFromSpherical(spherical).add(this.controls.target).add(this.offset);

				this.controls.update();
			}

			getElevationAngle() {
				return Math.PI / 2 - this.controls.getPolarAngle();
			}

			getAzimuthAngle() {
				return this.controls.getAzimuthalAngle();
			}

			setAzimuthAngle(deg: number) {
				this.azimuthAngle = deg;

				const spherical = new THREE.Spherical();
				spherical.radius = this.controls.getDistance();
				spherical.phi = this.controls.getPolarAngle();

				const rad = deg * (Math.PI / 180);
				spherical.theta = rad;

				this.perspectiveCamera.position.setFromSpherical(spherical).add(this.controls.target).add(this.offset);
				this.orthographicCamera.position.setFromSpherical(spherical).add(this.controls.target).add(this.offset);

				this.controls.update();
			}

			setDistance(distance: number) {
				// Make sure the target is up to date
				this.controls.update();

				const newPos = new THREE.Vector3()
					.subVectors(this.controls.object.position, this.controls.target)
					.normalize()
					.multiplyScalar(distance)
					.add(this.controls.target);

				this.perspectiveCamera.position.copy(newPos).add(this.offset);
				this.orthographicCamera.position.copy(newPos).add(this.offset);

				if (this.instance instanceof THREE.OrthographicCamera) {
					this.orthographicCamera.zoom = this.zoom;
					this.orthographicCamera.lookAt(this.controls.target);
					this.orthographicCamera.updateProjectionMatrix();
				}

				this.controls.update();
			}

			setOffset(x: number, y: number, z: number) {
				this.offset.set(x, y, z);
			}

			setElevationRange(min: number, max: number) {
				const minRad = min * (Math.PI / 180);
				const maxRad = max * (Math.PI / 180);
				this.controls.maxPolarAngle = Math.PI * 0.5 - minRad;
				this.controls.minPolarAngle = Math.PI * 0.5 - maxRad;
				this.controls.update();
			}

			update() {
				if (this.controls.enableRotate) {
					const azimuthAngle = this.controls.getAzimuthalAngle() * (180 / Math.PI);
					const elevationAngle = this.getElevationAngle() * (180 / Math.PI);
					this.debugInfo.style.display = 'block';
					this.debugInfo.innerHTML = `lookYaw: ${Utils.round(azimuthAngle, 2)} </br>lookPitch: ${Utils.round(elevationAngle, 2)}</br>`;
				} else if (this.debugInfo.style.display !== 'none') {
					this.debugInfo.style.display = 'none';
				}

				if (this.controls.enableZoom) {
					const distance = this.controls.getDistance();
					this.zoom = this.isPerspective
						? this.originalDistance / distance
						: Math.abs(this.originalHalfWidth / this.orthographicCamera.left) * this.orthographicCamera.zoom;
					const editorZoom = Utils.round(Math.max(window.innerWidth, window.innerHeight) / this.zoom / 2.15, 2);
					this.debugInfo.innerHTML += `zoom: ${editorZoom}</br>`;
				}

				if (this.target && !this.isDevelopmentMode) {
					const targetWorldPos = new THREE.Vector3();
					this.target.getWorldPosition(targetWorldPos);
					this.setPosition(targetWorldPos.x, targetWorldPos.y, targetWorldPos.z, true);
				}

				this.controls.update();
			}

			resize(width: number, height: number) {
				this.viewportWidth = width;
				this.viewportHeight = height;

				this.perspectiveCamera.aspect = width / height;
				this.perspectiveCamera.fov =
					(360 / Math.PI) * Math.atan(this.fovInitial * (height / this.viewportHeightInitial));
				this.perspectiveCamera.updateProjectionMatrix();

				const halfWidth = Utils.pixelToWorld(width / 2);
				const halfHeight = Utils.pixelToWorld(height / 2);
				this.originalHalfWidth = halfWidth;
				this.orthographicCamera.left = -halfWidth;
				this.orthographicCamera.right = halfWidth;
				this.orthographicCamera.top = halfHeight;
				this.orthographicCamera.bottom = -halfHeight;
				this.orthographicCamera.updateProjectionMatrix();

				this.setZoom(Math.max(this.viewportWidth, this.viewportHeight) / this.zoomHeight);
			}

			setZoom(ratio: number) {
				this.zoom = ratio;
				this.originalZoom = ratio;
				this.setDistance(this.originalDistance / ratio);
			}

			setZoomByHeight(height: number) {
				this.zoomHeight = height;
				this.setZoom(Math.max(this.viewportWidth, this.viewportHeight) / height);
			}

			follow(target: THREE.Object3D, moveInstant = true) {
				this.target = target;

				if (moveInstant) {
					const targetWorldPos = new THREE.Vector3();
					target.getWorldPosition(targetWorldPos);
					this.setPosition(targetWorldPos.x, targetWorldPos.y, targetWorldPos.z);
				}
			}

			unfollow() {
				this.target = null;
			}

			getWorldPoint(p: THREE.Vector2) {
				let target = this.controls.target;
				if (this.target) {
					const targetWorldPos = new THREE.Vector3();
					this.target.getWorldPosition(targetWorldPos);
					target = targetWorldPos;
				}

				// Mouse to world pos code from:
				// https://github.com/WestLangley/three.js/blob/e3cd05d80baf7b1594352a1d7e464c6d188b0080/examples/jsm/controls/OrbitControls.js
				if (this.isPerspective) {
					const pointer = new THREE.Vector3(p.x, p.y, 0.5);
					pointer.unproject(this.instance);
					pointer.sub(this.instance.position).normalize();
					const dist =
						target.clone().sub(this.perspectiveCamera.position).dot(this.perspectiveCamera.up) /
						pointer.dot(this.perspectiveCamera.up);
					return this.instance.position.clone().add(pointer.multiplyScalar(dist));
				} else {
					const pointer = new THREE.Vector3(
						p.x,
						p.y,
						(this.orthographicCamera.near + this.orthographicCamera.far) /
							(this.orthographicCamera.near - this.orthographicCamera.far)
					);
					pointer.unproject(this.orthographicCamera);
					pointer.y -= target.y;
					const v = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orthographicCamera.quaternion);
					const dist = -pointer.dot(this.orthographicCamera.up) / v.dot(this.orthographicCamera.up);
					const result = pointer.clone().add(v.multiplyScalar(dist));
					return result;
				}
			}

			setPosition(x: number, y: number, z: number, lerp = false) {
				const oldTarget = this.controls.target.clone();
				const diff = new THREE.Vector3(x, y, z).sub(oldTarget);
				const t = lerp ? (taro?.game?.data?.settings?.camera?.trackingDelay || 3) / taro.fps() : 1;
				this.controls.target.lerp(this.controls.target.clone().add(this.offset).add(diff), t);
				this.orthographicCamera.position.lerp(this.orthographicCamera.position.clone().add(this.offset).add(diff), t);
				this.perspectiveCamera.position.lerp(this.perspectiveCamera.position.clone().add(this.offset).add(diff), t);
			}

			setPosition2D(x: number, z: number, lerp = false) {
				const oldTarget = this.controls.target.clone();
				const diff = new THREE.Vector3(x, oldTarget.y, z).sub(oldTarget);
				const t = lerp ? (taro?.game?.data?.settings?.camera?.trackingDelay || 3) / taro.fps() : 1;
				this.controls.target.lerp(this.controls.target.clone().add(this.offset).add(diff), t);
				this.orthographicCamera.position.lerp(this.orthographicCamera.position.clone().add(this.offset).add(diff), t);
				this.perspectiveCamera.position.lerp(this.perspectiveCamera.position.clone().add(this.offset).add(diff), t);
			}

			onChange(cb: () => void) {
				this.onChangeCbs.push(cb);
			}

			setDevelopmentMode(state: boolean) {
				this.isDevelopmentMode = state;

				if (this.isDevelopmentMode) {
					this.controls.enablePan = true;
					this.controls.enableRotate = true;
					this.controls.enableZoom = true;
				} else {
					this.controls.enablePan = false;
					this.controls.enableRotate = false;
					this.controls.enableZoom = false;

					this.setElevationAngle(this.elevationAngle);
					this.setAzimuthAngle(this.azimuthAngle);
					this.setZoom(this.originalZoom);

					if (this.target) {
						const targetWorldPos = new THREE.Vector3();
						this.target.getWorldPosition(targetWorldPos);
						this.setPosition(targetWorldPos.x, targetWorldPos.y, targetWorldPos.z);
					}
				}
			}

			isVisible(unit: Unit, objects: THREE.Object3D) {
				unit.getWorldPosition(this.tempVec3);

				const entityScreenPosition = this.tempVec3.clone().project(this.instance);
				this.tempVec2.x = entityScreenPosition.x;
				this.tempVec2.y = entityScreenPosition.y;

				const dist = this.tempVec3.distanceTo(this.instance.position);
				this.raycaster.setFromCamera(this.tempVec2, this.instance);
				this.raycaster.far = dist;
				this.raycaster.near = this.instance.near;

				const intersects = this.raycaster.intersectObject(objects);
				return intersects.length === 0;
			}

			private switchToOrthographicCamera() {
				this.isPerspective = false;
				this.orthographicCamera.position.copy(this.perspectiveCamera.position).add(this.offset);
				this.orthographicCamera.quaternion.copy(this.perspectiveCamera.quaternion);

				this.orthographicCamera.zoom = this.zoom;
				this.orthographicCamera.lookAt(this.controls.target);
				this.orthographicCamera.updateProjectionMatrix();
				this.instance = this.orthographicCamera;
				this.controls.object = this.orthographicCamera;
				this.instance.lookAt(this.controls.target);
				this.controls.update();
			}

			private switchToPerspectiveCamera() {
				this.isPerspective = true;
				this.perspectiveCamera.position.copy(this.orthographicCamera.position).add(this.offset);
				this.perspectiveCamera.quaternion.copy(this.orthographicCamera.quaternion);

				const yFovDeg = this.perspectiveCamera.fov * (Math.PI / 180);
				const distance = this.orthographicCamera.top / Math.tan(yFovDeg * 0.5) / this.orthographicCamera.zoom;
				const newPos = new THREE.Vector3()
					.subVectors(this.perspectiveCamera.position, this.controls.target)
					.normalize()
					.multiplyScalar(distance)
					.add(this.controls.target);

				this.perspectiveCamera.position.copy(newPos);
				this.perspectiveCamera.updateProjectionMatrix();
				this.instance = this.perspectiveCamera;
				this.controls.object = this.perspectiveCamera;
				this.instance.lookAt(this.controls.target);
				this.controls.update();
			}
		}
	}
}
