class PhaserAnimatedEntity extends PhaserEntity {
	public attachedParticles: PhaserParticle[] = [];
	protected sprite: Phaser.GameObjects.Sprite & IRenderProps;

	protected constructor(
		public scene: GameScene,
		entity: TaroEntity,
		protected key: string
	) {
		super(entity);
		const bounds = entity._bounds2d;
		this.sprite = this.addSprite(key) as Phaser.GameObjects.Sprite & IRenderProps;
		this.sprite.setDisplaySize(bounds.x, bounds.y);
		this.sprite.rotation = entity._rotate.z;
		// Listen for the animationcomplete event
		this.sprite.on(
			'animationcomplete',
			(animation: { key: string }) => {
				if (!(animation.key as string).endsWith('default')) {
					this.sprite.play(`${this.key}/default/${this.entity._stats.id}`);
				}
			},
			this
		);
		Object.assign(this.evtListeners, {
			'play-animation': entity.on('play-animation', this.playAnimation, this),
			size: entity.on('size', this.size, this),
			scale: entity.on('scale', this.scale, this),
			flip: entity.on('flip', this.flip, this),
		});
	}

	protected playAnimation(animationId: string): void {
		if (this.scene.anims.exists(`${this.key}/${animationId}/${this.entity._stats.id}`)) {
			this.sprite.play(`${this.key}/${animationId}/${this.entity._stats.id}`);
		} else {
			this.sprite.anims.stop();
		}
	}

	protected transform(data: { x: number; y: number; rotation: number }): void {
		this.gameObject.setPosition(data.x, data.y);
		this.sprite.rotation = data.rotation;
		this.flip(this.entity._stats.flip);
	}

	protected size(data: { width: number; height: number }): void {
		this.sprite.setSize(data.width, data.height);
		this.sprite.setDisplaySize(data.width, data.height);
	}

	protected scale(data: { x: number; y: number }): void {
		this.sprite.setScale(data.x, data.y);
	}

	protected flip(flip: FlipMode): void {
		this.sprite.setFlip(flip % 2 === 1, flip > 1);
	}

	protected destroy(): void {
		this.sprite = null;
		this.attachedParticles.forEach((attachedParticle) => {
			attachedParticle.stop();
			attachedParticle.scene.particles.splice(
				attachedParticle.scene.particles.findIndex((particle) => {
					return particle === attachedParticle;
				})
			);
		});
		super.destroy();
	}

	protected useTexturePack(key: string): boolean {
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

	protected addSprite(key: string): Phaser.GameObjects.Sprite {
		if (this.useTexturePack(key)) {
			return this.scene.add.sprite(0, 0, 'pack-result', key);
		}
		return this.scene.add.sprite(0, 0, key);
	}

	protected setTexture(key: string) {
		if (this.useTexturePack(key)) {
			return this.sprite.setTexture('pack-result', key);
		}
		return this.sprite.setTexture(key);
	}
}
