class PhaserAnimatedEntity extends PhaserEntity {

	protected sprite: Phaser.GameObjects.Sprite & IRenderProps;
	debugGameObject: Phaser.GameObjects.Rectangle & IRenderProps;
	debugGameObjectBlue: Phaser.GameObjects.Rectangle & IRenderProps;
	debugGameObjectRed: Phaser.GameObjects.Rectangle & IRenderProps;
	public attachedParticles: PhaserParticle[] = [];

	protected constructor (
		public scene: GameScene,
		entity: TaroEntity,
		protected key: string
	) {
		super(entity);
		const bounds = entity._bounds2d;

		this.sprite = this.addSprite(key) as Phaser.GameObjects.Sprite & IRenderProps;
		this.sprite.setDisplaySize(bounds.x, bounds.y);
		this.sprite.rotation = entity._rotate.z;

		Object.assign(this.evtListeners, {
			'play-animation': entity.on('play-animation', this.playAnimation, this),
			'transform-debug': entity.on('transform-debug', this.transformDebug, this),
			size: entity.on('size', this.size, this),
			scale: entity.on('scale', this.scale, this),
			flip: entity.on('flip', this.flip, this),
		});
	}

	protected playAnimation (animationId: string): void {
		if (this.scene.anims.exists(`${this.key}/${animationId}`)) {
			this.sprite.play(`${this.key}/${animationId}`);
		}
		else {
			this.sprite.anims.stop();
		}
	}

	protected transform (data: {
		x: number;
		y: number;
		rotation: number
	}): void {
		this.gameObject.setPosition(data.x, data.y);
		this.sprite.rotation = data.rotation;
		this.flip(this.entity._stats.flip);
	}

	protected transformDebug (data: {
		debug: string;
		x: number;
		y: number;
		rotation: number
	}): void {
		if (data.debug === 'green-square') {
			if (!this.debugGameObject) {
				const bounds = this.entity._bounds2d;
				this.debugGameObject = this.scene.add.rectangle(0, 0, bounds.x, bounds.y) as Phaser.GameObjects.Rectangle & IRenderProps;
				this.debugGameObject.setStrokeStyle(2, 0x008000);
			}
			this.debugGameObject.setPosition(data.x, data.y);
			this.debugGameObject.rotation = data.rotation;
		} else if (data.debug === 'blue-square') {
			if (!this.debugGameObjectBlue) {
				const bounds = this.entity._bounds2d;
				this.debugGameObjectBlue = this.scene.add.rectangle(0, 0, bounds.x, bounds.y) as Phaser.GameObjects.Rectangle & IRenderProps;
				this.debugGameObjectBlue.setStrokeStyle(2, 0x0000FF);
			}
			this.debugGameObjectBlue.setPosition(data.x, data.y);
			this.debugGameObjectBlue.rotation = data.rotation;
		} else if (data.debug === 'red-square') {
			if (!this.debugGameObjectRed) {
				const bounds = this.entity._bounds2d;
				this.debugGameObjectRed = this.scene.add.rectangle(0, 0, bounds.x, bounds.y) as Phaser.GameObjects.Rectangle & IRenderProps;
				this.debugGameObjectRed.setStrokeStyle(2, 0xFF0000);
			}
			this.debugGameObjectRed.setPosition(data.x, data.y);
			this.debugGameObjectRed.rotation = data.rotation;
		}
	}

	protected size (
		data: {
			width: number,
			height: number
		}
	): void {
		this.sprite.setSize(data.width, data.height);
		this.sprite.setDisplaySize(data.width, data.height);
	}

	protected scale (data: {
		x: number;
		y: number
	}): void {
		this.sprite.setScale(data.x, data.y);
	}

	protected flip (flip: FlipMode): void {
		this.sprite.setFlip(flip % 2 === 1, flip > 1);
	}

	protected destroy (): void {

		this.sprite = null;
		this.attachedParticles.forEach(particle => particle.stop());
		super.destroy();
	}

	protected useTexturePack(key): boolean {
		if (this.scene.textures.exists('pack-result')) {
			const frame = this.scene.textures.getFrame('pack-result', key);
			if (frame && frame.name === key) {
				if (this.entity._stats.cellSheet.columnCount === 1 && this.entity._stats.cellSheet.rowCount === 1) {
					return true;
				}
			}
		}
		return false;
	}

	protected addSprite(key): Phaser.GameObjects.Sprite {
		if (this.useTexturePack(key)) {
			return this.scene.add.sprite(0, 0, 'pack-result', key);
		}
		return this.scene.add.sprite(0, 0, key);
	}

	protected setTexture(key) {
		if (this.useTexturePack(key)) {
			return this.sprite.setTexture('pack-result', key);
		}
		return this.sprite.setTexture(key);
	}
}
