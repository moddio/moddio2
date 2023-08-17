class UiScene extends PhaserScene {

    attributes: PhaserAttributeBar[] = [];
	attributesContainer: Phaser.GameObjects.Container;

	constructor() {
		super({ key: 'Ui', active: true  });
	}

	init (): void {

		
	}

    create ()
    {
        //  simple score text for testing
        //const info = this.add.text(100, 100, 'Score: 0', /*{ font: '48px Arial', fill: '#000000' }*/);
        new PhaserUiAttributeBar(this);
    }

	preload (): void {

	}

	update () {
		
	}
}
