namespace Renderer {
	export namespace Three {
		export class Unit extends Entity {
			cameraConfig = {
				pointerLock: false,
				pitchRange: { min: -90, max: 90 },
				offset: { x: 0, y: 0, z: 0 },
			};

			body: AnimatedSprite | Model;

			hud = new THREE.Group();

			private label = new Label({ text: '', color: 'white', bold: false, renderOnTop: true });
			private attributes = new Attributes();
			private chat: ChatBubble;

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

				this.label.visible = false;

				this.body.attach(this.hud);
				this.hud.add(this.label);
				this.hud.add(this.attributes);
			}

			static create(taroEntity: TaroEntityPhysics) {
				const renderer = Three.instance();
				const entity = new Unit(taroEntity._id, taroEntity._stats.ownerId, taroEntity);
				entity.setHudScale(1 / renderer.camera.lastAuthoritativeZoom);

				if (taroEntity._stats.cameraPointerLock) {
					entity.cameraConfig.pointerLock = taroEntity._stats.cameraPointerLock;
				}

				if (taroEntity._stats.cameraPitchRange) {
					entity.cameraConfig.pitchRange = taroEntity._stats.cameraPitchRange;
				}

				if (taroEntity._stats.cameraOffset) {
					// From editor XZY to Three.js XYZ
					entity.cameraConfig.offset.x = taroEntity._stats.cameraOffset.x;
					entity.cameraConfig.offset.y = taroEntity._stats.cameraOffset.z;
					entity.cameraConfig.offset.z = taroEntity._stats.cameraOffset.y;
				}

				taroEntity.on('show-label', () => (entity.label.visible = true));
				taroEntity.on('hide-label', () => (entity.label.visible = false));
				taroEntity.on('render-attributes', (data) => (entity as Unit).renderAttributes(data));
				taroEntity.on('update-attribute', (data) => (entity as Unit).attributes.update(data));
				taroEntity.on('render-chat-bubble', (text) => (entity as Unit).renderChat(text));

				if (entity.body instanceof AnimatedSprite) {
					taroEntity.on('depth', (depth) => (entity.body as AnimatedSprite).setDepth(depth));
					taroEntity.on('flip', (flip) => (entity.body as AnimatedSprite).setFlip(flip % 2 === 1, flip > 1));
					taroEntity.on('billboard', (isBillboard) =>
						(entity.body as AnimatedSprite).setBillboard(isBillboard, renderer.camera)
					);
				}

				taroEntity.on(
					'transform',
					(data: { x: number; y: number; rotation: number }) => {
						entity.position.x = Utils.pixelToWorld(data.x);
						entity.position.z = Utils.pixelToWorld(data.y);

						if (entity.body instanceof AnimatedSprite) {
							entity.body.setRotationY(-data.rotation);
							const flip = taroEntity._stats.flip;
							entity.body.setFlip(flip % 2 === 1, flip > 1);
						} else {
							entity.body.rotation.y = -data.rotation;
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

				taroEntity.on('update-label', (data) => {
					entity.label.visible = true;
					entity.label.update({ text: data.text, color: data.color, bold: data.bold });
					entity.updateLabelOffset();
				});

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
					const tex = gAssetManager.getTextureWithoutPlaceholder(key);

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
							const tex = gAssetManager.getTexture(key);
							animationMgr.createAnimationsFromTaroData(key, taroEntity._stats as unknown as EntityData);
							const frameWidth = tex.image.width / cols;
							const frameHeight = tex.image.height / rows;
							const sheet = new TextureSheet(key, tex.clone(), frameWidth, frameHeight);
							replaceTexture(sheet);
						});
					}
				});

				taroEntity.on('fading-text', (data: { text: string; color?: string }) => {
					let unitHeightPx = 0;
					if (entity.body instanceof AnimatedSprite) {
						unitHeightPx = entity.body.getSizeInPixels().height;
					} else {
						unitHeightPx = Utils.worldToPixel(entity.body.getSize().y);
					}
					const offsetInPixels = -25 - unitHeightPx * 0.5;
					const text = new FloatingText(0, 0, 0, data.text || '', data.color || '#ffffff', 0, -offsetInPixels);
					entity.add(text);
				});

				taroEntity.on('set-opacity', (data: { opacity: number; time?: number }) => {
					entity.body.setOpacity(data.opacity, data.time);
				});

				return entity;
			}

			update(dt: number) {
				this.body.update(dt);
			}

			renderChat(text: string): void {
				if (this.chat) {
					this.chat.update({ text });
				} else {
					this.chat = new ChatBubble({ text });
					const labelCenter = this.label.getCenter();
					const labelOffset = this.label.height * labelCenter.y;
					const chatOffset = (labelOffset + this.label.height) / this.chat.height;
					this.chat.setCenter(0.5, 1 + chatOffset);
					this.hud.add(this.chat);
				}
			}

			// NOTE: This whole function seems off to me. What should it being
			// exactly? Clearly it's not a render function. Dive a little deeper
			// into this when you have time.
			renderAttributes(data) {
				this.attributes.clear();
				this.attributes.addAttributes(data);
			}

			setScale(sx: number, sy: number, sz: number) {
				if (this.body instanceof AnimatedSprite) {
					this.body.setScale(sx, sy);
				} else {
					this.body.setSize(sx, sz, sy);
				}

				this.updateAttributesOffset();
				this.updateLabelOffset();
			}

			showHud(visible: boolean) {
				if (visible != this.hud.visible) {
					const fadeAnimation = (from: number, to: number, onComplete = () => {}) => {
						new TWEEN.Tween({ opacity: from })
							.to({ opacity: to }, 100)
							.onUpdate(({ opacity }) => {
								this.label.setOpacity(opacity);
								this.attributes.setOpacity(opacity);
							})
							.onComplete(onComplete)
							.start();
					};

					if (visible) {
						this.hud.visible = true;
						fadeAnimation(0, 1);
					} else {
						fadeAnimation(1, 0, () => (this.hud.visible = false));
					}
				}
			}

			setHudScale(scale: number) {
				this.hud.scale.setScalar(scale);
				this.updateAttributesOffset();
				this.updateLabelOffset();
			}

			private getBodyHeightInPixels() {
				let unitHeightPx = 0;
				if (this.body instanceof AnimatedSprite) {
					unitHeightPx = this.body.getSizeInPixels().height;
				} else {
					unitHeightPx = Utils.worldToPixel(this.body.getSize().y);
				}
				return unitHeightPx;
			}

			private updateAttributesOffset() {
				const halfHeight = this.getBodyHeightInPixels() * 0.5;
				const spacing = halfHeight + 16;
				const scaling = 1 / this.hud.scale.y;
				this.attributes.setMargin(spacing * scaling);
			}

			private updateLabelOffset() {
				const halfHeight = this.getBodyHeightInPixels() * 0.5;
				let topOfTopBars = halfHeight + this.attributes.topBarsHeight;
				const scaling = 1 / this.hud.scale.y;
				if (this.attributes.topBarsHeight > 0) topOfTopBars += 16 * scaling;
				this.label.setCenterY(1);
				this.label.setOffsetY(16 * scaling + topOfTopBars);
			}
		}
	}
}
