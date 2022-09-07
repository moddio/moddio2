class PhaserRegion extends PhaserEntity {

	protected gameObject: Phaser.GameObjects.Graphics & Hidden;
	protected entity: Region;

	constructor (
		private scene: GameScene,
		entity: Region
	) {
		super(entity);

		const gameObject = scene.add.graphics();

		this.gameObject = gameObject as Phaser.GameObjects.Graphics & Hidden;
		this.gameObject.visible = false;
		scene.renderedEntities.push(this.gameObject);
		// we don't get depth/layer info from taro,
		// so it can go in 'debris' layer for now
		scene.entityLayers[EntityLayer.DEBRIS].add(this.gameObject);

		this.transform();
	}

	protected transform (): void {
		const graphics = this.gameObject;
		const stats = this.entity._stats.default;

		graphics.setPosition(stats.x, stats.y);

		graphics.clear();
		graphics.fillStyle(
			Number(`0x${stats.inside.substring(1)}`),
			// between 0 and 1 or we default
			(stats.alpha && stats.alpha >= 0 && stats.alpha <= 1) ? stats.alpha : 0.4
		);
		graphics.fillRect(
			0,
			0,
			stats.width,
			stats.height
		);
	}

	protected destroy (): void {
		this.scene.renderedEntities = this.scene.renderedEntities.filter(item => item !== this.gameObject);
		super.destroy();
	}
}
