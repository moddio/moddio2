class PhaserItem extends PhaserAnimatedEntity {

	protected gameObject: Phaser.GameObjects.Sprite & Hidden;
	protected entity: Item;

	constructor (
		scene: GameScene,
		entity: Item
	) {
		super(scene, entity, `item/${entity._stats.itemTypeId}`);

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
