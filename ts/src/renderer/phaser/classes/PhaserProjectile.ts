class PhaserProjectile extends PhaserAnimatedEntity {

	protected gameObject: Phaser.GameObjects.Sprite & Hidden;
	protected entity: Projectile;

	constructor (
		scene: GameScene,
		entity: Projectile
	) {
		super(scene, entity, `projectile/${entity._stats.type}`);

		this.sprite.visible = false;
		this.scene.renderedEntities.push(this.sprite);
		this.gameObject = this.sprite;

		const { x, y } = entity._translate;
		this.gameObject.setPosition(x, y);
	}

	protected destroy (): void {
		this.scene.renderedEntities = this.scene.renderedEntities.filter(item => item !== this.sprite);
		super.destroy();
	}
}
