/// <reference types="@types/google.analytics" />

namespace Renderer {
	export enum Mode {
		Normal,
		Development,
	}

	export namespace Three {
		export function instance() {
			return Renderer.instance();
		}

		class Renderer {
			private static _instance: Renderer;

			renderer: THREE.WebGLRenderer;
			camera: Camera;
			scene: THREE.Scene;
			mode = Mode.Normal;

			private clock = new THREE.Clock();
			private pointer = new THREE.Vector2();
			private initLoadingManager = new THREE.LoadingManager();
			private entityManager = new EntityManager();

			private sky: Sky;
			private voxels: Voxels;
			private particles: Particles;

			private raycastIntervalSeconds = 0.1;
			private timeSinceLastRaycast = 0;

			private regionDrawStart: { x: number; y: number } = { x: 0, y: 0 };

			private constructor() {
				// For JS interop; in case someone uses new Renderer.ThreeRenderer()
				if (!Renderer._instance) {
					Renderer._instance = this;
				} else {
					return Renderer._instance;
				}

				const { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } = window.MeshBVHLib;

				//@ts-ignore
				THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
				//@ts-ignore
				THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
				THREE.Mesh.prototype.raycast = acceleratedRaycast;

				const renderer = new THREE.WebGLRenderer();
				renderer.setSize(window.innerWidth, window.innerHeight);
				document.querySelector('#game-div')?.appendChild(renderer.domElement);
				this.renderer = renderer;

				this.camera = new Camera(window.innerWidth, window.innerHeight, this.renderer.domElement);
				this.camera.setElevationAngle(taro.game.data.settings.camera.defaultPitch);
				if (taro.game.data.settings.camera.projectionMode !== 'orthographic') {
					this.camera.setProjection(taro.game.data.settings.camera.projectionMode);
				}

				this.scene = new THREE.Scene();
				this.scene.background = new THREE.Color(taro.game.data.defaultData.mapBackgroundColor);

				window.addEventListener('resize', () => {
					this.camera.resize(window.innerWidth, window.innerHeight);
					renderer.setSize(window.innerWidth, window.innerHeight);
					renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
					renderer.render(this.scene, this.camera.instance);

					taro.client.emit('scale', { ratio: this.camera.zoom });
					taro.client.emit('update-abilities-position');
					this.entityManager.scaleGui(1 / this.camera.zoom);
				});

				let line: THREE.LineSegments;
				let width;
				let height;

				window.addEventListener('mousemove', (evt: MouseEvent) => {
					this.pointer.set((evt.clientX / window.innerWidth) * 2 - 1, -(evt.clientY / window.innerHeight) * 2 + 1);
					if (!Utils.isLeftButton(evt.buttons)) return;
					if (taro.developerMode.regionTool) {
						const worldPoint = this.camera.getWorldPoint(this.pointer);
						width = worldPoint.x - this.regionDrawStart.x;
						height = worldPoint.z - this.regionDrawStart.y;
						line.position.set(this.regionDrawStart.x + width / 2, 2, this.regionDrawStart.y + height / 2);
						line.scale.set(width, 1, height);
					}
				});

				window.addEventListener('mousedown', (event: MouseEvent) => {
					const developerMode = taro.developerMode;
					if (developerMode.regionTool) {
						const worldPoint = this.camera.getWorldPoint(this.pointer);
						this.regionDrawStart = {
							x: worldPoint.x,
							y: worldPoint.z,
						};

						const geometry = new THREE.BoxGeometry(1, 3, 1);
						const edges = new THREE.EdgesGeometry(geometry);
						line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x036ffc }));
						line.position.set(this.regionDrawStart.x + width / 2, 2, this.regionDrawStart.y + height / 2);
						line.scale.set(width, 1, height);
						line.visible = true;
						this.scene.add(line);
					} else if (
						developerMode.active &&
						developerMode.activeTab === 'map' &&
						developerMode.activeButton === 'cursor' &&
						Utils.isLeftButton(event.buttons)
					) {
						const raycaster = new THREE.Raycaster();
						raycaster.setFromCamera(this.pointer, this.camera.instance);

						const intersects = raycaster.intersectObjects(this.entityManager.entities);
						if (intersects?.length > 0) {
							const closest = intersects[0].object as THREE.Mesh;
							const region = this.entityManager.entities.find(
								(e) => e instanceof Region && e.mesh === closest
							) as Region;
							if (region) {
								/*const ownerPlayer = taro.$(unit.ownerId);
								if (ownerPlayer?._stats?.controlledBy === 'human') {
									if (typeof showUserDropdown !== 'undefined') {
										showUserDropdown({ ownerId: unit.ownerId, unitId: unit.taroId, pointer: { event } });
									}
								}*/
								const regionData = {
									name: region.taroEntity._stats.id,
									x: region.stats.x,
									y: region.stats.y,
									width: region.stats.width,
									height: region.stats.height,
									alpha: region.stats.alpha,
									inside: region.stats.inside,
								};
								inGameEditor.addNewRegion && inGameEditor.addNewRegion(regionData);
							}
						}
						/*gameObjects = gameObjects.filter((gameObject) => gameObject.phaserRegion);
						gameObjects.forEach((gameObject) => {
							this.devModeScene.regionEditor.addClickedList({
								name: gameObject.phaserRegion.entity._stats.id,
								x: gameObject.phaserRegion.stats.x,
								y: gameObject.phaserRegion.stats.y,
								width: gameObject.phaserRegion.stats.width,
								height: gameObject.phaserRegion.stats.height,
								alpha: gameObject.phaserRegion.stats.alpha,
								inside: gameObject.phaserRegion.stats.inside,
							});
						});
						if (gameObjects.length > 0) {
							this.devModeScene.regionEditor.showClickedList();
						}*/
					}
					if (Utils.isRightButton(event.buttons)) {
						const raycaster = new THREE.Raycaster();
						raycaster.setFromCamera(this.pointer, this.camera.instance);

						const intersects = raycaster.intersectObjects(this.entityManager.entities);
						if (intersects.length > 0) {
							const closest = intersects[0].object as THREE.Mesh;
							const unit = this.entityManager.entities.find((e) => e instanceof Unit && e.sprite === closest);

							if (unit) {
								const ownerPlayer = taro.$(unit.ownerId);
								if (ownerPlayer?._stats?.controlledBy === 'human') {
									if (typeof showUserDropdown !== 'undefined') {
										showUserDropdown({ ownerId: unit.ownerId, unitId: unit.taroId, pointer: { event } });
									}
								}
							}
						}
					}
				});

				window.addEventListener('mouseup', () => {
					if (taro.developerMode.regionTool) {
						taro.developerMode.regionTool = false;
						this.camera.controls.enablePan = true;
						this.camera.controls.enableRotate = true;
						this.camera.controls.enableZoom = true;
						line?.geometry.dispose();
						this.scene.remove(line);
						line = null;

						taro.mapEditorUI.highlightToolsButton('cursor');
						let x = this.regionDrawStart.x;
						let y = this.regionDrawStart.y;
						if (width < 0) {
							x = this.regionDrawStart.x + width;
							width *= -1;
						}
						if (height < 0) {
							y = this.regionDrawStart.y + height;
							height *= -1;
						}

						inGameEditor.addNewRegion &&
							inGameEditor.addNewRegion({
								name: '',
								x: Math.trunc(Utils.worldToPixel(x)),
								y: Math.trunc(Utils.worldToPixel(y)),
								width: Math.trunc(Utils.worldToPixel(width)),
								height: Math.trunc(Utils.worldToPixel(height)),
							});

						this.regionDrawStart = null;
					}
				});

				this.forceLoadUnusedCSSFonts();

				this.initLoadingManager.onLoad = () => {
					this.init();
					taro.input.setupListeners(this.renderer.domElement);
					taro.client.rendererLoaded.resolve();
					requestAnimationFrame(this.render.bind(this));
				};

				this.loadTextures();

				taro.client.on('enterMapTab', () => {
					if (this.mode == Mode.Normal) {
						this.mode = Mode.Development;
						this.onDevelopmentMode();
					}
				});
				taro.client.on('leaveMapTab', () => {
					if (this.mode == Mode.Development) {
						this.mode = Mode.Normal;
						this.onNormalMode();
					}
				});
				taro.client.on('update-region-name', (data: { name: string; newName: string }) => {
					const region = this.entityManager.entities.find((e) => e instanceof Region && e.name === data.name) as Region;
					if (region) {
						region.name = data.newName;
						region.updateLabel(data.newName);
					}
				});
			}

			static instance() {
				if (!this._instance) {
					this._instance = new Renderer();
				}

				return this._instance;
			}

			getViewportBounds() {
				const halfWidth = (window.innerWidth * 0.5) / this.camera.zoom;
				const halfHeight = (window.innerHeight * 0.5) / this.camera.zoom;
				const p = this.camera.instance.position;
				return {
					x: Utils.worldToPixel(p.x) - halfWidth,
					y: Utils.worldToPixel(p.z) - halfHeight,
					width: halfWidth * 2,
					height: halfHeight * 2,
				};
			}

			getCameraWidth(): number {
				return window.innerWidth;
			}

			getCameraHeight(): number {
				return window.innerHeight;
			}

			setVisible(visible: boolean) {
				this.particles.visible = visible;
				this.entityManager.entities.forEach((e) => {
					if (e instanceof Region) {
						e.label.visible = !visible;
						if (e.devModeOnly) {
							e.gameObject.visible = !visible;
						}
					} else {
						e.visible = visible;
					}
				});
			}

			private onDevelopmentMode() {
				this.camera.setDevelopmentMode(true);
				this.setVisible(false);
			}

			private onNormalMode() {
				this.camera.setDevelopmentMode(false);
				this.setVisible(true);
			}

			private loadTextures() {
				const textureRepository = TextureRepository.instance();
				textureRepository.setFilter(taro.game.data.defaultData.renderingFilter);
				textureRepository.setLoadingManager(this.initLoadingManager);

				const data = taro.game.data;

				data.map.tilesets.forEach((tileset) => {
					const key = tileset.image;
					textureRepository.loadFromUrl(key, Utils.patchAssetUrl(key));
				});

				const entityTypes = [
					...Object.values(data.unitTypes),
					...Object.values(data.projectileTypes),
					...Object.values(data.itemTypes),
				];

				for (const type of entityTypes) {
					const cellSheet = type.cellSheet;
					if (!cellSheet) continue;
					const key = cellSheet.url;
					textureRepository.loadFromUrl(key, Utils.patchAssetUrl(key), () => {
						AnimatedSprite.createAnimations(type);
					});
				}

				for (const type of Object.values(data.particleTypes)) {
					const key = type.url;
					textureRepository.loadFromUrl(`particle/${key}`, Utils.patchAssetUrl(key));
				}

				const urls = taro.game.data.settings.skybox;
				textureRepository.loadFromUrl('left', urls.left);
				textureRepository.loadFromUrl('right', urls.right);
				textureRepository.loadFromUrl('top', urls.top);
				textureRepository.loadFromUrl('bottom', urls.bottom);
				textureRepository.loadFromUrl('front', urls.front);
				textureRepository.loadFromUrl('back', urls.back);

				textureRepository.setLoadingManager(THREE.DefaultLoadingManager);
			}

			private forceLoadUnusedCSSFonts() {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				ctx.font = 'normal 4px Verdana';
				ctx.fillText('text', 0, 8);
				ctx.font = 'bold 4px Verdana';
				ctx.fillText('text', 0, 8);
			}

			private init() {
				this.sky = new Sky();
				this.scene.add(this.sky);

				this.voxels = Voxels.create(taro.game.data.map.layers);
				this.scene.add(this.voxels);

				this.particles = new Particles();
				this.scene.add(this.particles);

				const entitiesLayer = new THREE.Group();
				entitiesLayer.position.y = 0.51;
				this.scene.add(entitiesLayer);

				const createEntity = (taroEntity: TaroEntityPhysics, type: 'unit' | 'item' | 'projectile' | 'region') => {
					const entity = this.entityManager.create(taroEntity, type);
					entitiesLayer.add(entity);
					taroEntity.on('destroy', () => {
						this.entityManager.destroy(entity);
						this.particles.destroyEmittersWithTarget(entity);
					});

					taroEntity.on('follow', () => {
						this.camera.follow(entity);

						const offset = entity.cameraConfig.offset;
						this.camera.setOffset(offset.x, offset.y, offset.z);

						if (entity.cameraConfig.pointerLock) {
							const { min, max } = entity.cameraConfig.pitchRange;
							this.camera.setElevationRange(min, max);
						}

						this.camera.setPointerLock(entity.cameraConfig.pointerLock);
					});
				};

				taro.client.on('create-unit', (u: TaroEntityPhysics) => createEntity(u, 'unit'), this);
				taro.client.on('create-item', (i: TaroEntityPhysics) => createEntity(i, 'item'), this);
				taro.client.on('create-projectile', (p: TaroEntityPhysics) => createEntity(p, 'projectile'), this);
				taro.client.on('create-region', (r: TaroEntityPhysics) => createEntity(r, 'region'), this);

				taro.client.on('zoom', (height: number) => {
					if (this.camera.zoomHeight === height * 2.15) return;
					this.camera.setZoomByHeight(height * 2.15);
					taro.client.emit('scale', { ratio: this.camera.zoom });
					this.entityManager.scaleGui(1 / this.camera.zoom);
				});

				taro.client.on('stop-follow', () => this.camera.unfollow());
				taro.client.on('camera-pitch', (deg: number) => this.camera.setElevationAngle(deg));

				taro.client.on('camera-position', (x: number, y: number) => {
					if (!taro.developerMode.active || taro.developerMode.activeTab === 'play') {
						this.camera.setPosition2D(Utils.pixelToWorld(x), Utils.pixelToWorld(y), true);
					}
				});

				taro.client.on('camera-instant-move', (x: number, y: number) => {
					if (!taro.developerMode.active || taro.developerMode.activeTab === 'play') {
						this.camera.setPosition2D(Utils.pixelToWorld(x), Utils.pixelToWorld(y));
					}
				});

				taro.client.on('create-particle-emitter', (particle: Particle) => {
					const emitter = this.particles.createEmitter(particle);
					emitter.position.y += entitiesLayer.position.y;

					if (particle.entityId) {
						const entity = this.entityManager.entities.find((entity) => entity.taroId == particle.entityId);
						if (entity) {
							emitter.target = entity;
						}
					}

					this.particles.emit(emitter);
				});

				taro.client.on('start-emitting-particles', (data: { particleTypeId: string; entityId: string }) => {
					const emitter = this.particles.emitters.find(({ particleTypeId, target }) => {
						return particleTypeId === data.particleTypeId && target.taroId === data.entityId;
					});

					this.particles.startEmitter(emitter);
				});

				taro.client.on('stop-emitting-particles', (data: { particleTypeId: string; entityId: string }) => {
					const emitter = this.particles.emitters.find(({ particleTypeId, target }) => {
						return particleTypeId === data.particleTypeId && target.taroId === data.entityId;
					});

					this.particles.stopEmitter(emitter);
				});

				taro.client.on('floating-text', (config: FloatingTextConfig) => {
					const zOffset = this.camera.target ? this.camera.target.position.y : 0;
					entitiesLayer.add(FloatingText.create(config, zOffset));
				});

				taro.client.on('dynamic-floating-text', (config: DynamicFloatingTextConfig) => {
					const zOffset = this.camera.target ? this.camera.target.position.y : 0;
					const dynamicText = DynamicFloatingText.create(config, zOffset);
					entitiesLayer.add(dynamicText);
				});
			}

			private render() {
				requestAnimationFrame(this.render.bind(this));
				taro.client.emit('tick');

				if (this.camera.target && !taro.isMobile) {
					const worldPos = this.camera.getWorldPoint(this.pointer);
					const x = Utils.worldToPixel(worldPos.x + 0.5);
					const y = Utils.worldToPixel(worldPos.z + 0.5);
					const yaw = this.camera.getAzimuthAngle();
					const pitch = this.camera.getElevationAngle();
					taro.input.emit('pointermove', [{ x, y, yaw, pitch }]);
				}

				// TODO: Is this the proper way to get deltaTime or should I get it from the
				// engine somewhere? Also it feels a little weird that the renderer triggers
				// the engine update. It should be the other way around.
				let dt = this.clock.getDelta();
				const time = this.clock.elapsedTime;
				if (dt <= 0) dt = 1 / 60;
				else if (dt >= 0.25) dt = 0.25;

				this.entityManager.update(dt);
				this.particles.update(dt, time, this.camera.instance);
				this.camera.update();

				if (this.camera.target) {
					this.sky.position.copy(this.camera.target.position);
				}

				this.timeSinceLastRaycast += dt;
				if (this.timeSinceLastRaycast > this.raycastIntervalSeconds) {
					this.timeSinceLastRaycast = 0;
					this.checkForHiddenEntities();
				}

				TWEEN.update();
				this.renderer.render(this.scene, this.camera.instance);
			}

			private checkForHiddenEntities() {
				for (const unit of this.entityManager.units) {
					// TODO(nick): Need a way to to identify avatar units from NPC's
					if (unit.hasVisibleLabel()) {
						unit.setHidden(!this.camera.isVisible(unit, this.voxels));
					}
				}
			}
		}
	}
}
