class PhaserUiBarsContainer extends Phaser.GameObjects.Container {
    bars: PhaserUiAttributeBar[] = [];

    barWidth = 240;
    barHeight = 24;
    barInterval = 24;
    barRadius = 3;

	constructor(public scene: PhaserScene) {

		super(scene);

        scene.add.existing(this);
	}

    addBar(attribute) {
        const bar = new PhaserUiAttributeBar(this.scene, this, attribute);
        this.bars.push(bar);
        this.bars.forEach((bar, index) => bar.y = this.scene.sys.game.canvas.height - this.barHeight/2 - 20 - (this.bars.length - 1 - index) * this.barInterval)
        this.add(bar);
    }

    updateBar(attribute) {
        const bar = this.bars.find(bar => bar.attribute.type === attribute.type);
        if (bar) {
            bar.updateAttribute(attribute);
            this.bars.forEach((bar, index) => bar.y = this.scene.sys.game.canvas.height - this.barHeight/2 - 20 - (this.bars.length - 1 - index) * this.barInterval)
        } else {
            this.addBar(attribute);
        }
    }
}
