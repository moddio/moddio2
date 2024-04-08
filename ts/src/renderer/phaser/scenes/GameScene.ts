class GameScene extends PhaserScene {
	private zoomSize: number;
	heightRenderer: HeightRenderComponent;

	entityLayers: Phaser.GameObjects.Layer[] = [];
	renderedEntities: TGameObject[] = [];
	particles: PhaserParticle[] = [];
	unitsList: PhaserUnit[] = [];
	projectilesList: PhaserProjectile[] = [];
	itemList: PhaserItem[] = [];
	public tilemapLayers: Phaser.Tilemaps.TilemapLayer[];

	public tilemap: Phaser.Tilemaps.Tilemap;
	tileset: Phaser.Tilemaps.Tileset;
	cameraTarget: Phaser.GameObjects.Container & IRenderProps;
	filter: Phaser.Textures.FilterMode;
	resolutionCoef: number;
	trackingDelay: number;
	useBounds: boolean;
	cameraDeadzone: { width: number; height: number };
	visibility: VisibilityMask;

	constructor() {
		super({ key: 'Game' });
	}

	init(): void {
		if (taro.isMobile) {
			this.scene.launch('MobileControls');
		}

		this.resolutionCoef = 1;
		this.useBounds = taro?.game?.data?.settings?.camera?.useBounds;
		this.cameraDeadzone = taro?.game?.data?.settings?.camera?.deadzone;

		const camera = this.cameras.main;
		camera.setBackgroundColor(taro.game.data.defaultData.mapBackgroundColor);

		// set camera bounds
		if (this.useBounds) {
			if (taro.game.data.defaultData.dontResize) {
				camera.setBounds(
					0,
					0,
					taro.game.data.map.width * taro.game.data.map.tilewidth,
					taro.game.data.map.height * taro.game.data.map.tileheight,
					true
				);
			} else {
				camera.setBounds(0, 0, taro.game.data.map.width * 64, taro.game.data.map.height * 64, true);
			}
		}

		//set camera deadzone
		if (this.cameraDeadzone) {
			camera.setDeadzone(this.cameraDeadzone.width, this.cameraDeadzone.height);
		}

		// set camera tracking delay
		this.trackingDelay = taro?.game?.data?.settings?.camera?.trackingDelay || 3;
		if (this.trackingDelay > 60) {
			this.trackingDelay = 60;
		}

		let resized = false;

		this.scale.on(Phaser.Scale.Events.RESIZE, () => {
			if (!taro.isMobile) {
				if (resized) {
					resized = false;
				} else {
					resized = true;
					this.game.scale.setGameSize(window.innerWidth, window.innerHeight);
				}
			}
			if (this.zoomSize) {
				camera.zoom = this.calculateZoom();
				taro.client.emit('scale', { ratio: camera.zoom * this.resolutionCoef });
			}
			taro.client.emit('update-abilities-position');
		});

		taro.client.on('zoom', (height: number) => {
			if (this.zoomSize === height * 2.15) {
				return;
			}

			this.setZoomSize(height);
			const ratio = this.calculateZoom();

			camera.zoomTo(ratio, 1000, Phaser.Math.Easing.Quadratic.Out, true);

			taro.client.emit('scale', { ratio: ratio * this.resolutionCoef });
		});

		taro.client.on('set-resolution', (resolution) => {
			this.setResolution(resolution, true);
		});

		taro.client.on('change-filter', (data: { filter: renderingFilter }) => {
			this.changeTextureFilter(data.filter);
		});

		taro.client.on('updateMap', () => {
			this.updateMap();
		});

		taro.client.on('create-unit', (unit: Unit) => {
			new PhaserUnit(this, unit);
		});

		taro.client.on('create-item', (item: Item) => {
			new PhaserItem(this, item);
		});

		taro.client.on('create-projectile', (projectile: Projectile) => {
			new PhaserProjectile(this, projectile);
		});

		taro.client.on('create-region', (region: Region) => {
			new PhaserRegion(this, region);
		});

		taro.client.on('create-ray', (data: any) => {
			new PhaserRay(this, data.start, data.end, data.config);
		});

		taro.client.on('create-particle-emitter', (particle: Particle) => {
			this.particles.push(new PhaserParticle(this, particle));
		});

		taro.client.on('start-emitting-particles', ({ particleTypeId, entityId }) => {
			const emitter = this.particles.find(({ particleId, target }) => {
				return particleId === particleTypeId && target === entityId;
			});

			emitter.start();
		});

		taro.client.on('stop-emitting-particles', ({ particleTypeId, entityId }) => {
			const emitter = this.particles.find(({ particleId, target }) => {
				return particleId === particleTypeId && target === entityId;
			});

			emitter.stop();
		});

		taro.client.on('floating-text', (data: { text: string; x: number; y: number; color: string }) => {
			new PhaserFloatingText(this, data);
		});

		taro.client.on('stop-follow', () => {
			camera.stopFollow();
		});

		taro.client.on('camera-position', (x: number, y: number) => {
			if (!taro.developerMode.active || taro.developerMode.activeTab === 'play') {
				x -= camera.width / 2;
				y -= camera.height / 2;
				camera.setScroll(x, y);
			}
		});

		taro.client.on('camera-deadzone', (width: number, heigth: number) => {
			camera.setDeadzone(width, heigth);
		});

		taro.client.on('camera-instant-move', (x: number, y: number) => {
			if (!taro.developerMode.active || taro.developerMode.activeTab === 'play') {
				camera.centerOn(x, y);
			}
		});

		// visibility mask graphics update
		taro.client.on('update-visibility-mask', (data: { enabled: boolean; range: number }) => {
			if (!this.visibility && data.enabled) {
				this.visibility = new VisibilityMask(this);
				this.visibility.generateFieldOfView(data.range);
			} else if (data.enabled) {
				this.visibility.generateFieldOfView(data.range);
			} else if (this.visibility && !data.enabled) {
				this.visibility.destroyVisibilityMask();
				delete this.visibility;
			}
		});

		// visibility mask position update
		taro.client.on('unit-position', (x: number, y: number) => {
			this.visibility?.moveCenter(x, y);
		});
	}

	preload(): void {
		const data = taro.game.data;

		if (data.texturePack) {
			// todo: multiatlas
			this.load.atlas({
				key: 'pack-result',
				atlasURL: data.texturePack.atlasURL,
				textureURL: data.texturePack.textureURL,
				// baseURL: "cache.modd.io"
			});
		}

		for (let type in data.unitTypes) {
			this.loadEntity(`unit/${data.unitTypes[type].cellSheet.url}`, data.unitTypes[type]);
		}

		for (let type in data.projectileTypes) {
			this.loadEntity(`projectile/${data.projectileTypes[type].cellSheet.url}`, data.projectileTypes[type]);
		}

		for (let type in data.itemTypes) {
			this.loadEntity(`item/${data.itemTypes[type].cellSheet.url}`, data.itemTypes[type]);
		}

		for (let type in data.particleTypes) {
			this.load.image(`particle/${data.particleTypes[type].url}`, this.patchAssetUrl(data.particleTypes[type].url));
		}

		data.map.tilesets.forEach((tileset) => {
			const key = `tiles/${tileset.name}`;
			this.load.once(`filecomplete-image-${key}`, () => {
				const texture = this.textures.get(key);
				const canvas = this.extrude(tileset, texture.getSourceImage() as HTMLImageElement);
				if (canvas) {
					this.textures.remove(texture);
					this.textures.addCanvas(`extruded-${key}`, canvas);
				} else {
					if (window.toastErrorMessage) {
						window.toastErrorMessage(
							`Tileset "${tileset.name}" image doesn't match the specified parameters. ` +
								'Double check your margin, spacing, tilewidth and tileheight.'
						);
					} else {
						// WAITING TILL EDITOR IS LOADED
						setTimeout(() => {
							if (window.toastErrorMessage) {
								window.toastErrorMessage(
									`Tileset "${tileset.name}" image doesn't match the specified parameters. ` +
										'Double check your margin, spacing, tilewidth and tileheight.'
								);
							} else {
								// IF editor is not loaded, show alert
								alert(
									`Tileset "${tileset.name}" image doesn't match the specified parameters. ` +
										'Double check your margin, spacing, tilewidth and tileheight.'
								);
							}
						}, 5000);
					}

					console.warn(
						`Tileset "${tileset.name}" image doesn't match the specified parameters. ` +
							'Double check your margin, spacing, tilewidth and tileheight.'
					);
					this.scene.stop();
					return;
				}
				const extrudedTexture = this.textures.get(`extruded-${key}`);
				Phaser.Textures.Parsers.SpriteSheet(
					extrudedTexture,
					0,
					0,
					0,
					extrudedTexture.source[0].width,
					extrudedTexture.source[0].height,
					{
						frameWidth: tileset.tilewidth,
						frameHeight: tileset.tileheight,
						margin: (tileset.margin || 0) + 2,
						spacing: (tileset.spacing || 0) + 4,
					}
				);
			});
			this.load.image(key, this.patchAssetUrl(tileset.image));
		});

		//to be sure every layer of map have correct number of tiles
		const tilesPerLayer = data.map.height * data.map.width;
		data.map.layers.forEach((layer) => {
			if (layer.data) {
				const length = layer.data.length;
				layer.width = data.map.width;
				layer.height = data.map.height;
				if (length < tilesPerLayer) {
					for (let i = length + 1; i < tilesPerLayer; i++) {
						layer.data[i] = 0;
					}
				}
			}
		});

		//to be sure every map not contain null or -1 tiles
		data.map.layers.forEach((layer) => {
			if (layer && layer.data) {
				layer.data.forEach((tile, index) => {
					if (tile === -1 || tile === null) {
						layer.data[index] = 0;
					}
				});
			}
		});

		this.load.tilemapTiledJSON('map', this.patchMapData(data.map));
		BitmapFontManager.preload(this);
	}

	loadEntity(key: string, data: EntityData): void {
		const cellSheet = data.cellSheet;

		if (!cellSheet) {
			// skip if no cell sheet data
			return;
		}

		if (cellSheet.columnCount != 1 || cellSheet.rowCount != 1) {
			this.load.once(`filecomplete-image-${key}`, () => {
				// create spritesheet,
				// even if it has only one sprite
				const texture = this.textures.get(key);
				const width = texture.source[0].width;
				const height = texture.source[0].height;
				Phaser.Textures.Parsers.SpriteSheet(texture, 0, 0, 0, width, height, {
					frameWidth: width / cellSheet.columnCount,
					frameHeight: height / cellSheet.rowCount,
				});

				// add animations
				for (let animationsKey in data.animations) {
					const animation = data.animations[animationsKey];
					const frames = animation.frames;
					const animationFrames: number[] = [];

					for (let i = 0; i < frames.length; i++) {
						// correction for 0-based indexing
						animationFrames.push(frames[i] - 1);
					}

					if (animationFrames.length === 0) {
						// avoid crash by giving it frame 0 if no frame data provided
						animationFrames.push(0);
					}

					if (this.anims.exists(`${key}/${animationsKey}/${data.id}`)) {
						this.anims.remove(`${key}/${animationsKey}/${data.id}`);
					}
					this.anims.create({
						key: `${key}/${animationsKey}/${data.id}`,
						frames: this.anims.generateFrameNumbers(key, {
							frames: animationFrames,
						}),
						frameRate: animation.framesPerSecond || 15,
						repeat: animation.loopCount - 1, // correction for loop/repeat values
					});
				}
			});
		}

		this.load.image(key, this.patchAssetUrl(cellSheet.url));
	}

	create(): void {
		this.events.once('render', () => {
			this.scene.launch('DevMode');
			taro.client.rendererLoaded.resolve();
			document.dispatchEvent(new Event('taro rendered'));
		});

		BitmapFontManager.create(this);

		const map = (this.tilemap = this.make.tilemap({ key: 'map' }));

		const data = taro.game.data;
		const scaleFactor = taro.scaleMapDetails.scaleFactor;

		data.map.tilesets.forEach((tileset) => {
			const key = `tiles/${tileset.name}`;
			const extrudedKey = `extruded-${key}`;
			if (this.textures.exists(extrudedKey)) {
				this.tileset = map.addTilesetImage(
					tileset.name,
					extrudedKey,
					tileset.tilewidth,
					tileset.tileheight,
					(tileset.margin || 0) + 2,
					(tileset.spacing || 0) + 4
				);
			} else {
				this.tileset = map.addTilesetImage(tileset.name, key);
			}
		});

		//this.loadMap();

		const entityLayers = this.entityLayers;
		this.tilemapLayers = [];
		data.map.layers.forEach((layer) => {
			if (layer.type === 'tilelayer' && layer.data) {
				const tileLayer = map.createLayer(layer.name, map.tilesets, layer.x, layer.y);
				tileLayer.name = layer.name;
				tileLayer.setScale(scaleFactor.x, scaleFactor.y);
				tileLayer.alpha = layer.opacity;
				this.tilemapLayers.push(tileLayer);
			} else {
				const tileLayer = map.createBlankLayer(layer.name, map.tilesets, 0, 0, map.width, map.height);
				tileLayer.name = layer.name;
				tileLayer.setScale(scaleFactor.x, scaleFactor.y);
				this.tilemapLayers.push(tileLayer);
			}

			entityLayers.push(this.add.layer());
		});
		const layerNames = data.map.layers.map((layer) => layer.name);
		map.layers.sort((a, b) => layerNames.indexOf(a.name) - layerNames.indexOf(b.name));

		const camera = this.cameras.main;
		camera.centerOn(
			((map.width * map.tileWidth) / 2) * scaleFactor.x,
			((map.height * map.tileHeight) / 2) * scaleFactor.y
		);

		if (data.defaultData.heightBasedZIndex) {
			this.heightRenderer = new HeightRenderComponent(this, map.height * map.tileHeight);
		}

		//get filter from game data
		this.changeTextureFilter(taro.game.data.defaultData.renderingFilter);
	}

	private changeTextureFilter(filter: renderingFilter) {
		if (filter === 'pixelArt') {
			this.filter = Phaser.Textures.FilterMode.NEAREST;
		} else {
			this.filter = Phaser.Textures.FilterMode.LINEAR;
		}
		//apply filter to each texture
		Object.values(this.textures.list).forEach((val) => {
			val.setFilter(this.filter);
		});
	}

	private setZoomSize(height: number): void {
		// backward compatible game scaling on average 16:9 screen
		this.zoomSize = height * 2.15;
	}

	private calculateZoom(): number {
		const { width, height } = this.scale;
		return Math.max(width, height) / this.zoomSize;
	}

	private updateMap(): void {
		const map = this.tilemap;
		const data = taro.game.data;

		data.map.layers.forEach((layer, layerIdx) => {
			if (layer.type !== 'tilelayer') {
				return;
			}
			this.tilemapLayers[layerIdx].alpha = layer.opacity;
			layer.data.forEach((tile, index) => {
				const x = index % layer.width;
				const y = Math.floor(index / layer.width);
				if (tile === 0 || tile === null) tile = -1;
				map.putTileAt(tile, x, y, false, layerIdx);
			});
		});
	}

	private patchMapData(map: GameComponent['data']['map']): typeof map {
		/**
		 * map data gets patched in place
		 * to not make a copy of a huge object
		 **/

		const tilecount = map.tilesets[0].tilecount;

		map.layers.forEach((layer) => {
			if (layer.type !== 'tilelayer') {
				return;
			}

			for (let i = 0; i < layer.data.length; i++) {
				const value = layer.data[i];

				if (value > tilecount) {
					console.warn(`map data error: layer[${layer.name}], index[${i}], value[${value}].`);

					layer.data[i] = 0;
				}
			}
		});

		return map;
	}

	private extrude(
		tileset: ArrayElement<GameComponent['data']['map']['tilesets']>,
		sourceImage: HTMLImageElement,
		extrusion = 2,
		color = '#ffffff00'
	): HTMLCanvasElement {
		const { tilewidth, tileheight, margin = 0, spacing = 0 } = tileset;
		const { width, height } = sourceImage;

		const cols = (width - 2 * margin + spacing) / (tilewidth + spacing);
		const rows = (height - 2 * margin + spacing) / (tileheight + spacing);

		if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
			console.warn(
				'Non-integer number of rows or cols found while extruding. ' +
					`Tileset "${tileset.name}" image doesn't match the specified parameters. ` +
					'Double check your margin, spacing, tilewidth and tileheight.'
			);
			return null;
		}

		const newWidth = 2 * margin + (cols - 1) * spacing + cols * (tilewidth + 2 * extrusion);
		const newHeight = 2 * margin + (rows - 1) * spacing + rows * (tileheight + 2 * extrusion);

		const canvas = document.createElement('canvas');
		canvas.width = newWidth;
		canvas.height = newHeight;

		const ctx = canvas.getContext('2d');
		ctx.imageSmoothingEnabled = false;
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, newWidth, newHeight);

		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				let srcX = margin + col * (tilewidth + spacing);
				let srcY = margin + row * (tileheight + spacing);
				let destX = margin + col * (tilewidth + spacing + 2 * extrusion);
				let destY = margin + row * (tileheight + spacing + 2 * extrusion);
				const tw = tilewidth;
				const th = tileheight;

				// Copy the tile.
				ctx.drawImage(sourceImage, srcX, srcY, tw, th, destX + extrusion, destY + extrusion, tw, th);

				// Extrude the top row.
				ctx.drawImage(sourceImage, srcX, srcY, tw, 1, destX + extrusion, destY, tw, extrusion);

				// Extrude the bottom row.
				ctx.drawImage(
					sourceImage,
					srcX,
					srcY + th - 1,
					tw,
					1,
					destX + extrusion,
					destY + extrusion + th,
					tw,
					extrusion
				);

				// Extrude left column.
				ctx.drawImage(sourceImage, srcX, srcY, 1, th, destX, destY + extrusion, extrusion, th);

				// Extrude the right column.
				ctx.drawImage(
					sourceImage,
					srcX + tw - 1,
					srcY,
					1,
					th,
					destX + extrusion + tw,
					destY + extrusion,
					extrusion,
					th
				);

				// Extrude the top left corner.
				ctx.drawImage(sourceImage, srcX, srcY, 1, 1, destX, destY, extrusion, extrusion);

				// Extrude the top right corner.
				ctx.drawImage(sourceImage, srcX + tw - 1, srcY, 1, 1, destX + extrusion + tw, destY, extrusion, extrusion);

				// Extrude the bottom left corner.
				ctx.drawImage(sourceImage, srcX, srcY + th - 1, 1, 1, destX, destY + extrusion + th, extrusion, extrusion);

				// Extrude the bottom right corner.
				ctx.drawImage(
					sourceImage,
					srcX + tw - 1,
					srcY + th - 1,
					1,
					1,
					destX + extrusion + tw,
					destY + extrusion + th,
					extrusion,
					extrusion
				);
			}
		}

		return canvas;
	}

	findUnit(unitId: string): PhaserUnit {
		return this.unitsList.find((unit) => {
			return unit.entity._id === unitId;
		});
	}

	findEntity(entityId: string): PhaserUnit | PhaserProjectile | PhaserItem {
		return [...this.unitsList, ...this.itemList, ...this.projectilesList].find((entity) => {
			return entity.entity._id === entityId;
		});
	}

	setResolution(resolution: number, setResolutionCoef: boolean): void {
		if (setResolutionCoef) {
			this.resolutionCoef = resolution;
		}

		const width = !taro.isMobile ? window.innerWidth : window.outerWidth * window.devicePixelRatio;
		const height = !taro.isMobile ? window.innerHeight : window.outerHeight * window.devicePixelRatio;

		if (taro.developerMode.activeTab !== 'map') {
			this.scale.setGameSize(width / resolution, height / resolution);
		}
	}

	update(): void {
		this.visibility?.update();

		//cause black screen and camera jittering when change tab
		/*let trackingDelay = this.trackingDelay / taro.fps();
		this.cameras.main.setLerp(trackingDelay, trackingDelay);*/
		const worldPoint = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
		if (!taro.isMobile) {
			taro.input.emit('pointermove', [
				{
					x: worldPoint.x,
					y: worldPoint.y,
				},
			]);
		}

		this.renderedEntities.forEach((element) => {
			element.setVisible(false);
		});
		this.particles.forEach((particle) => {
			particle.setVisible(false);
		});

		if (!taro.developerMode.active || (taro.developerMode.active && taro.developerMode.activeTab !== 'map')) {
			var visibleEntities = this.cameras.main.cull(this.renderedEntities);
			this.particles.forEach((particle) => {
				particle.setVisible(true);
			});
			visibleEntities.forEach((element) => {
				if (!element.hidden) {
					element.setVisible(true);

					if (element.dynamic) {
						// dynamic is only assigned through an hbz-index-only event
						this.heightRenderer.adjustDepth(element as TGameObject & Phaser.GameObjects.Components.Size);
					}
				}
			});
		}

		taro.client.emit('tick');
	}
}

type renderingFilter = 'pixelArt' | 'smooth';

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = GameScene;
}
