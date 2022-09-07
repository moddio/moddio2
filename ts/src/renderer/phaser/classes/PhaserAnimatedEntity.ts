class PhaserAnimatedEntity extends PhaserEntity {

	protected sprite: Phaser.GameObjects.Sprite & Hidden;

	protected constructor (
		public scene: GameScene,
		entity: IgeEntity,
		protected key: string
	) {
		super(entity);
		const bounds = entity._bounds2d;
		const sprite = scene.add.sprite(0, 0, key);
		this.sprite = sprite as Phaser.GameObjects.Sprite & Hidden;

		sprite.setDisplaySize(bounds.x, bounds.y);
		sprite.rotation = entity._rotate.z;

		Object.assign(this.evtListeners, {
			'play-animation': entity.on('play-animation', this.playAnimation, this),
			size: entity.on('size', this.size, this),
			scale: entity.on('scale', this.scale, this)
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
	}

	protected size (
		data: {
			width: number,
			height: number
		}
	): void {
		this.sprite.setDisplaySize(data.width, data.height);
	}

	protected scale (data: {
		x: number;
		y: number
	}): void {
		this.sprite.setScale(data.x, data.y);
	}

	protected destroy (): void {

		this.sprite = null;

		super.destroy();
	}
}
