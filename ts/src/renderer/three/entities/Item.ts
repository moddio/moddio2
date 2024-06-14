namespace Renderer {
	export namespace Three {
		export class Item extends Entity {
			ownerUnitId: string | undefined;
			ownerUnit: Unit | undefined;
			body: AnimatedSprite | Model;

			constructor(
				public taroId: string,
				public ownerId: string,
				public taroEntity: TaroEntityPhysics
			) {
				super(taroEntity);

				if (taroEntity._stats.is3DObject) {
					const name = taroEntity._stats.cellSheet.url;
					this.body = new Model(name);
				} else {
					const key = taroEntity._stats.cellSheet.url;
					const cols = taroEntity._stats.cellSheet.columnCount || 1;
					const rows = taroEntity._stats.cellSheet.rowCount || 1;
					const tex = gAssetManager.getTexture(key).clone();
					const frameWidth = tex.image.width / cols;
					const frameHeight = tex.image.height / rows;
					const spriteSheet = new TextureSheet(key, tex, frameWidth, frameHeight);
					this.body = new AnimatedSprite(spriteSheet);
				}
				this.add(this.body);

				this.ownerUnitId = taroEntity._stats.ownerUnitId;
			}

			static create(taroEntity: TaroEntityPhysics) {
				const entity = new Item(taroEntity._id, taroEntity._stats.ownerId, taroEntity);

				if (entity.body instanceof AnimatedSprite) {
					taroEntity.on('depth', (depth) => (entity.body as AnimatedSprite).setDepth(depth));
					taroEntity.on('flip', (flip) => (entity.body as AnimatedSprite).setFlip(flip % 2 === 1, flip > 1));
					taroEntity.on('billboard', (isBillboard) =>
						(entity.body as AnimatedSprite).setBillboard(isBillboard, Three.instance().camera)
					);
				}

				taroEntity.on(
					'transform',
					(data: { x: number; y: number; rotation: number }) => {
						const renderer = Renderer.Three.instance();
						if (entity.body instanceof AnimatedSprite && entity.body.sprite === undefined) {
							const mesh = renderer.instancedMeshesData[entity.body.tex_source_uuid].mesh;
							// if (
							// 	JSON.stringify(renderer.instancedMeshesData[entity.body.tex_source_uuid].positions[entity.body.idx]) !==
							// 	JSON.stringify([Utils.pixelToWorld(data.x), Utils.pixelToWorld(data.y)])
							// ) {
							renderer.instancedMeshesData[entity.body.tex_source_uuid].positions[entity.body.idx] = [
								Utils.pixelToWorld(data.x),
								Utils.pixelToWorld(data.y),
							];
							const dummy = new THREE.Object3D();
							dummy.position.x = Utils.pixelToWorld(data.x);
							dummy.position.z = Utils.pixelToWorld(data.y);
							dummy.updateMatrix();
							if (entity.body.idx > mesh.count) {
								mesh.count = entity.body.idx;
							}
							mesh.setMatrixAt(entity.body.idx, dummy.matrix);
							mesh.position.set(0, 0, 0);
							mesh.parent.position.set(0, 0, 0);
							mesh.parent.parent.position.set(0, 0, 0);
							// }
						} else {
							entity.position.x = Utils.pixelToWorld(data.x);
							entity.position.z = Utils.pixelToWorld(data.y);
							if (entity.ownerUnit) {
								const parent = entity.ownerUnit;
								entity.position.y = parent.position.y;

								const anchoredOffset = entity.taroEntity?.anchoredOffset;
								if (anchoredOffset) {
									let x = Utils.pixelToWorld(anchoredOffset.x);
									let y = Utils.pixelToWorld(anchoredOffset.y);

									// This should be a local/world coordinates flag on the entity body.
									if (entity.taroEntity?._stats.type == 'weapon') {
										entity.position.x += x;
										entity.position.z += y;
									} else {
										if (entity.body instanceof AnimatedSprite) {
											if (entity.body.sprite !== undefined) {
												entity.body.sprite.position.x = x;
												entity.body.sprite.position.z = y;
											}
										}
									}
								}
							} else if (
								entity.body instanceof AnimatedSprite &&
								entity.body.sprite &&
								(entity.body.sprite.position.x != 0 || entity.body.sprite.position.z != 0)
							) {
								entity.body.sprite.position.x = 0;
								entity.body.sprite.position.z = 0;
							}

							if (entity.body instanceof AnimatedSprite) {
								entity.body.setRotationY(-data.rotation);
								const flip = taroEntity._stats.flip;
								entity.body.setFlip(flip % 2 === 1, flip > 1);
							} else {
								entity.body.rotation.y = -data.rotation;
							}
						}
					},
					this
				);

				taroEntity.on(
					'size',
					(data: { width: number; height: number }) => {
						const width = Utils.pixelToWorld(data.width || 0);
						const height = Utils.pixelToWorld(data.height || 0);
						const depth = Utils.pixelToWorld(entity.taroEntity._stats?.currentBody?.depth || 0);
						entity.setScale(width, height, depth);
					},
					this
				);

				taroEntity.on('play-animation', (id) => {
					if (entity.body instanceof AnimatedSprite) {
						const key = `${taroEntity._stats.cellSheet.url}/${id}/${taroEntity._stats.id}`;
						entity.body.play(key);
					} else {
						const anim = entity.taroEntity._stats.animations[id];
						if (anim) {
							const name = anim.threeAnimationKey || '';
							const loopCount = anim.loopCount || 0;
							entity.body.play(name, loopCount);
						}
					}
				});

				taroEntity.on('update-texture', (data) => {
					if (!(entity.body instanceof AnimatedSprite)) return;

					const key = taroEntity._stats.cellSheet.url;
					const cols = taroEntity._stats.cellSheet.columnCount || 1;
					const rows = taroEntity._stats.cellSheet.rowCount || 1;
					const tex = gAssetManager.getTexture(key);

					const replaceTexture = (spriteSheet: TextureSheet) => {
						(entity.body as AnimatedSprite).setTextureSheet(spriteSheet);
						const bounds = taroEntity._bounds2d;
						entity.setScale(Utils.pixelToWorld(bounds.x), Utils.pixelToWorld(bounds.y), 1);
					};

					if (tex) {
						const frameWidth = tex.image.width / cols;
						const frameHeight = tex.image.height / rows;
						const sheet = new TextureSheet(key, tex.clone(), frameWidth, frameHeight);
						replaceTexture(sheet);
					} else {
						const animationMgr = AnimationManager.instance();
						gAssetManager.load([{ name: key, type: 'texture', src: Utils.patchAssetUrl(key) }], null, () => {
							animationMgr.createAnimationsFromTaroData(key, taroEntity._stats as unknown as EntityData);
							const frameWidth = tex.image.width / cols;
							const frameHeight = tex.image.height / rows;
							const sheet = new TextureSheet(key, tex.clone(), frameWidth, frameHeight);
							replaceTexture(sheet);
						});
					}
				});

				taroEntity.on('setOwnerUnit', (unitId: string) => {
					entity.ownerUnitId = unitId;
				});

				return entity;
			}

			update(dt: number) {
				if (this.body instanceof AnimatedSprite) {
					this.body.update(dt);
				}
			}

			setScale(sx: number, sy: number, sz: number) {
				if (this.body instanceof AnimatedSprite) {
					this.body.setScale(sx, sy);
				} else {
					this.body.setSize(sx, sz, sy);
				}
			}
		}
	}
}
