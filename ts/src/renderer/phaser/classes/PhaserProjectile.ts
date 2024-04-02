class PhaserProjectile extends PhaserAnimatedEntity {
	public gameObject: Phaser.GameObjects.Sprite & IRenderProps;

	constructor(scene: GameScene, entity: Projectile) {
		super(scene, entity, `projectile/${entity._stats.cellSheet.url}`);
		this.sprite.visible = false;
		this.scene.renderedEntities.push(this.sprite);
		this.gameObject = this.sprite;

		const { x, y } = entity._translate;
		this.gameObject.setPosition(x, y);

		scene.projectilesList.push(this);

		Object.assign(this.evtListeners, {
			'update-texture': entity.on('update-texture', this.updateTexture, this),
		});
	}

	protected updateTexture(data) {
		if (data === 'basic_texture_change') {
			this.sprite.anims.stop();
			this.key = `projectile/${this.entity._stats.cellSheet.url}`;
			if (!this.scene.textures.exists(this.key)) {
				this.scene.loadEntity(this.key, this.entity._stats);
				this.scene.load.on(
					`filecomplete-image-${this.key}`,
					function cnsl() {
						if (this && this.sprite) {
							this.sprite.setTexture(this.key);
							this.sprite.texture.setFilter(this.scene.filter);
							const bounds = this.entity._bounds2d;
							this.sprite.setDisplaySize(bounds.x, bounds.y);
						}
					},
					this
				);
				this.scene.load.start();
			} else {
				this.sprite.setTexture(this.key);
				const bounds = this.entity._bounds2d;
				this.sprite.setDisplaySize(bounds.x, bounds.y);
			}
		}
	}

	protected destroy(): void {
		this.scene.renderedEntities = this.scene.renderedEntities.filter((item) => item !== this.sprite);
		this.scene.projectilesList = this.scene.projectilesList.filter((item) => item.entity.id() !== this.entity.id());
		super.destroy();
	}
}
