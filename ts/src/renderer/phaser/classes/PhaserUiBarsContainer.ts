class PhaserUiBarsContainer extends Phaser.GameObjects.Container {
    bars: PhaserUiAttributeBar[] = [];

	constructor(public scene: PhaserScene) {

		super(scene);

        scene.add.existing(this);
	}

    addBar(attribute) {
        const bar = new PhaserUiAttributeBar(this.scene, attribute);
        this.bars.push(bar);
        this.bars.forEach((bar, index) => bar.y = this.scene.sys.game.canvas.height - 24/2 - 20 - (this.bars.length - 1 - index) * 24)
        this.add(bar);
    }

    updateBar(attribute) {
        const bar = this.bars.find(bar => bar.attribute.type === attribute.type);
        if (bar) {
            bar.updateAttribute(attribute);
        } else {
            this.addBar(attribute);
        }
    }
}
