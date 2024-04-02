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

				window.addEventListener('mousemove', (evt: MouseEvent) => {
					this.pointer.set((evt.clientX / window.innerWidth) * 2 - 1, -(evt.clientY / window.innerHeight) * 2 + 1);
				});

				window.addEventListener('mousedown', (event: MouseEvent) => {
					if (Utils.isRightButton(event.buttons)) {
						const raycaster = new THREE.Raycaster();
						raycaster.setFromCamera(this.pointer, this.camera.instance);

						const intersects = raycaster.intersectObjects(this.entityManager.entities);
						if (intersects.length > 0) {
							const closest = intersects[0].object as THREE.Mesh;
							const unit = this.entityManager.entities.find((e) => e.sprite === closest);

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
				const p = this.camera.target.position;
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
					e.visible = visible;
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

				const createEntity = (taroEntity: TaroEntityPhysics, type: 'unit' | 'item' | 'projectile') => {
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
					});
				};

				taro.client.on('create-unit', (u: TaroEntityPhysics) => createEntity(u, 'unit'), this);
				taro.client.on('create-item', (i: TaroEntityPhysics) => createEntity(i, 'item'), this);
				taro.client.on('create-projectile', (p: TaroEntityPhysics) => createEntity(p, 'projectile'), this);

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

				taro.client.on('create-particle', (particle: Particle) => {
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

				taro.client.on('start-particle', (data: { particleTypeId: string; entityId: string }) => {
					const emitter = this.particles.emitters.find(({ particleTypeId, target }) => {
						return particleTypeId === data.particleTypeId && target.taroId === data.entityId;
					});

					this.particles.startEmitter(emitter);
				});

				taro.client.on('stop-particle', (data: { particleTypeId: string; entityId: string }) => {
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

				if (this.camera.target) {
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
